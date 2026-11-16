// Chicago fly-through: one continuous Kling AI flight, played a hop at a time.
// Each stop carries data-t, the moment (in seconds) the flight rests on its landmark.
// Scrolling a new card into view plays the flight from the previous landmark to
// this one at normal speed, then holds. Scrolling back jumps straight to that
// landmark. Wide screens get the 3:2 render, phones a 4:5 crop. With reduced
// motion the stage shows each stop's still; without JS the stops are a plain list.
(() => {
  const root = document.documentElement;
  const tour = document.querySelector(".tour");
  if (!tour) return;

  const video = tour.querySelector(".flight");
  const still = tour.querySelector(".flight-still");
  const placeLabel = tour.querySelector(".tour-place span");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = !reduced && !!video.canPlayType && video.canPlayType('video/mp4; codecs="avc1.64001f"') !== "";

  const stops = [...tour.querySelectorAll(".stop")].map((el, i) => ({
    el, i, place: el.dataset.place, t: Number(el.dataset.t),
  }));

  // Phones keep cards in the lower part of the screen and use the portrait render.
  const narrow = () => innerWidth <= 820;
  let kind = "";
  let active = stops[0];
  let target = null;   // the landmark time the current hop is playing toward

  const stillFor = (i) => `assets/clips/stills/${kind}-${i}.webp`;

  function useKind() {
    const next = narrow() ? "tall" : "wide";
    if (next === kind) return;
    kind = next;
    still.src = stillFor(active.i);
    if (!motion) return;
    root.classList.remove("flight-ready");
    video.src = `assets/clips/flight-${kind}.mp4`;
    video.load();
    video.addEventListener("loadeddata", () => jump(active), { once: true });
  }

  // The stop whose card sits closest to the focus line.
  function current() {
    const focus = innerHeight * (narrow() ? 0.72 : 0.5);
    let best = stops[0], dist = Infinity;
    for (const s of stops) {
      const r = s.el.getBoundingClientRect();
      const d = Math.abs(r.top + Math.min(r.height, innerHeight) / 2 - focus);
      if (d < dist) { dist = d; best = s; }
    }
    return best;
  }

  // Show a landmark without flying there; its still covers the seek.
  function jump(stop) {
    target = null;
    still.src = stillFor(stop.i);
    if (!motion || video.readyState < 1) return;
    video.pause();
    if (Math.abs(video.currentTime - stop.t) < 0.02) { root.classList.add("flight-ready"); return; }
    root.classList.remove("flight-ready");
    video.currentTime = stop.t;
    video.addEventListener("seeked", () => { if (active === stop) root.classList.add("flight-ready"); }, { once: true });
  }

  // Fly from the previous landmark to this one at normal speed, then hold.
  function fly(stop) {
    if (!motion || video.readyState < 2) { jump(stop); return; }
    const from = stops[stop.i - 1];
    const midHop = target !== null && video.currentTime < stop.t;
    if (!midHop && Math.abs(video.currentTime - from.t) > 0.25) video.currentTime = from.t;
    target = stop.t;
    still.src = stillFor(stop.i);
    root.classList.add("flight-ready");
    video.play().catch(() => jump(stop));
    requestAnimationFrame(watch);
  }

  function watch() {
    if (target === null) return;
    if (video.currentTime >= target - 0.02 || video.ended) {
      video.pause();
      video.currentTime = target;
      target = null;
      return;
    }
    requestAnimationFrame(watch);
  }

  function update() {
    const next = current();
    if (next === active) return;
    const prev = active;
    active = next;
    placeLabel.textContent = next.place;
    stops.forEach((s) => s.el.classList.toggle("is-active", s === next));
    if (next.i === prev.i + 1) fly(next);
    else jump(next);
  }

  let queued = false;
  addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  addEventListener("resize", () => { useKind(); update(); });

  root.classList.add("tour-on");
  stops[0].el.classList.add("is-active");
  useKind();
  update();
})();
