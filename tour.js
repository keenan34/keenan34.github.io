// Chicago fly-through: a pre-rendered Google Earth Studio flight, scrubbed by scroll.
// Each stop carries data-t, the moment (in seconds) the flight rests on its landmark.
// Wide screens get the 16:9 render, phones a portrait crop of it. With reduced motion
// the stage shows each stop's still frame; without JS the stops are a plain list.
(() => {
  const root = document.documentElement;
  const tour = document.querySelector(".tour");
  if (!tour) return;

  const video = tour.querySelector(".flight");
  const still = tour.querySelector(".flight-still");
  const placeLabel = tour.querySelector(".tour-place span");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canPlay = !!video.canPlayType && video.canPlayType('video/mp4; codecs="avc1.64001f"') !== "";

  const stops = [...tour.querySelectorAll(".stop")].map((el, i) => ({
    el, i, place: el.dataset.place, t: Number(el.dataset.t),
  }));

  // Phones keep cards in the lower part of the screen and use the portrait render.
  const narrow = () => innerWidth <= 820;
  let kind = "";
  function useKind() {
    const next = narrow() ? "tall" : "wide";
    if (next === kind) return;
    kind = next;
    still.src = `assets/flight/stills/${kind}-${active ? active.i : 0}.webp`;
    if (motion) {
      video.src = `assets/flight/flight-${kind}.mp4`;
      video.load();
      // iOS only buffers a muted inline video once it has started playing.
      video.play().then(() => video.pause()).catch(() => {});
    }
  }

  // Which stop is in view, and how far the scroll has carried us toward the next one.
  function target() {
    const focus = innerHeight * (narrow() ? 0.72 : 0.5);
    const centers = stops.map((s) => {
      const r = s.el.getBoundingClientRect();
      return r.top + Math.min(r.height, innerHeight) / 2;
    });
    let i = 0;
    while (i < stops.length - 2 && centers[i + 1] <= focus) i++;
    const a = stops[i], b = stops[i + 1];
    let p = clamp((focus - centers[i]) / (centers[i + 1] - centers[i] || 1), 0, 1);
    // Rest on each landmark for the first and last stretch of scroll between stops.
    p = smooth(clamp((p - 0.2) / 0.6, 0, 1));
    return { time: lerp(a.t, b.t, p), active: p < 0.5 ? a : b };
  }

  function buffered(t) {
    const b = video.buffered;
    for (let i = 0; i < b.length; i++) if (t >= b.start(i) - 0.05 && t <= b.end(i) + 0.05) return true;
    return false;
  }

  let motion = canPlay && !reduced;
  let active = null, time = null, raf = 0, last = 0;

  // The flight time eases toward the scroll target every frame, so wheel notches
  // become a glide. Seeks are only issued once the previous one has landed.
  function frame(now) {
    raf = 0;
    const goal = target();
    if (goal.active !== active) {
      active = goal.active;
      placeLabel.textContent = active.place;
      stops.forEach((s) => s.el.classList.toggle("is-active", s === active));
      still.src = `assets/flight/stills/${kind}-${active.i}.webp`;
    }
    if (!motion) return;

    const dt = last ? Math.min(now - last, 64) : 16;
    last = now;
    if (time === null) time = goal.time;
    time += (goal.time - time) * (1 - Math.exp(-dt / 120));

    const ready = video.readyState >= 2 && buffered(time);
    root.classList.toggle("flight-ready", ready);
    if (ready && !video.seeking && Math.abs(video.currentTime - time) > 1 / 30) video.currentTime = time;

    if (Math.abs(goal.time - time) > 0.005 || !ready) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  root.classList.add("tour-on");
  useKind();
  video.addEventListener("progress", kick);
  video.addEventListener("seeked", kick);
  video.addEventListener("loadeddata", kick);
  video.addEventListener("error", () => { motion = false; root.classList.remove("flight-ready"); });
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", () => { useKind(); kick(); });
  kick();

  function lerp(x, y, t) { return x + (y - x) * t; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }
})();
