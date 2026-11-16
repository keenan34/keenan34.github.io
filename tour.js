// Chicago fly-through: a sticky 3D map whose camera is driven by scroll position.
// Every stop carries data-cam="lng,lat,zoom,pitch,bearing". Without a token,
// WebGL or motion, the stops render as the ordinary project list.
(() => {
  const MAPBOX_VERSION = "3.35.0";
  const root = document.documentElement;
  const tour = document.querySelector(".tour");
  const token = window.MAPBOX_TOKEN;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasWebGL = (() => {
    try { return !!document.createElement("canvas").getContext("webgl2"); } catch (e) { return false; }
  })();
  if (!tour || !token || reduced || !hasWebGL) return;

  // Switch to the tour layout straight away, so the page never jumps from the
  // list to the tall tour once Mapbox arrives. A failure switches back.
  root.classList.add("tour-on");
  const fallBack = () => root.classList.remove("tour-on", "map-ready");

  const stops = [...tour.querySelectorAll(".stop")].map((el) => {
    const [lng, lat, zoom, pitch, bearing] = el.dataset.cam.split(",").map(Number);
    return { el, place: el.dataset.place, lng, lat, zoom, pitch, bearing };
  });
  const placeLabel = tour.querySelector(".tour-place span");
  const sizer = tour.querySelector(".stop:not(.featured):not(:first-child)");

  function load(src, tag) {
    return new Promise((resolve, reject) => {
      const node = document.createElement(tag);
      if (tag === "link") { node.rel = "stylesheet"; node.href = src; } else { node.src = src; }
      node.onload = resolve; node.onerror = reject;
      document.head.appendChild(node);
    });
  }

  // Load Mapbox only when the Work section gets close, so the hero stays fast.
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const base = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl`;
    Promise.all([load(base + ".css", "link"), load(base + ".js", "script")])
      .then(start)
      .catch(fallBack);
  }, { rootMargin: "1200px 0px" });
  io.observe(tour);

  function lightPreset() {
    const theme = root.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    return theme === "dark" ? "night" : "dusk";
  }

  // Where the camera should be for the current scroll position.
  function target() {
    const mid = innerHeight / 2;
    const centers = stops.map((s) => {
      const r = s.el.getBoundingClientRect();
      return r.top + Math.min(r.height, innerHeight) / 2;
    });

    let i = 0;
    while (i < stops.length - 2 && centers[i + 1] <= mid) i++;
    const a = stops[i], b = stops[i + 1];
    let t = clamp((mid - centers[i]) / (centers[i + 1] - centers[i] || 1), 0, 1);
    // Rest on each landmark for the first and last stretch of scroll between stops.
    t = smooth(clamp((t - 0.2) / 0.6, 0, 1));

    // Climb to a cruising height that depends on the distance, then descend.
    // Never climb below the higher of the two ends, so a hop that starts
    // zoomed out just descends instead of pulling back first.
    const dx = (b.lng - a.lng) * Math.cos(a.lat * Math.PI / 180), dy = b.lat - a.lat;
    const climb = clamp(Math.log2(Math.hypot(dx, dy) / 0.004), 0, 6);
    const cruise = Math.min(a.zoom, b.zoom, Math.max(a.zoom, b.zoom) - climb);
    const zoom = t < 0.5
      ? lerp(a.zoom, cruise, smooth(t * 2))
      : lerp(cruise, b.zoom, smooth(t * 2 - 1));

    return {
      lng: lerp(a.lng, b.lng, t), lat: lerp(a.lat, b.lat, t), zoom,
      pitch: lerp(a.pitch, b.pitch, t),
      bearing: a.bearing + angle(b.bearing - a.bearing) * t,
      active: t < 0.5 ? a : b,
    };
  }

  function start() {
    const first = stops[0];
    mapboxgl.accessToken = token;
    let map;
    try {
      map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/standard",
        config: { basemap: { lightPreset: lightPreset(), showPointOfInterestLabels: false } },
        center: [first.lng, first.lat], zoom: first.zoom, pitch: first.pitch, bearing: first.bearing,
        interactive: false, attributionControl: true,
      });
    } catch (e) { fallBack(); return; }

    let failed = false;
    map.on("error", (e) => {
      // A bad or blocked token fails before the style loads: fall back to the list.
      if (!map.isStyleLoaded()) { failed = true; fallBack(); map.remove(); }
      console.warn("[tour]", e.error && e.error.message);
    });

    // The camera eases toward the scroll target every frame instead of
    // jumping, so mouse-wheel notches turn into a glide.
    let cam = null, raf = 0, last = 0;
    function frame(now) {
      raf = 0;
      const goal = target();
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      if (!cam) cam = { ...goal };
      const k = 1 - Math.exp(-dt / 110);
      cam.lng += (goal.lng - cam.lng) * k;
      cam.lat += (goal.lat - cam.lat) * k;
      cam.zoom += (goal.zoom - cam.zoom) * k;
      cam.pitch += (goal.pitch - cam.pitch) * k;
      cam.bearing += angle(goal.bearing - cam.bearing) * k;

      const cardRight = sizer && innerWidth > 820 ? sizer.getBoundingClientRect().right + 24 : 0;
      map.jumpTo({
        center: [cam.lng, cam.lat], zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing,
        // Aim each landmark at the open space beside the cards.
        padding: { left: Math.min(cardRight, innerWidth * 0.6), right: 0, top: 0, bottom: 0 },
      });

      if (placeLabel.textContent !== goal.active.place) placeLabel.textContent = goal.active.place;
      stops.forEach((s) => s.el.classList.toggle("is-active", s === goal.active));

      const settling = Math.abs(goal.zoom - cam.zoom) > 0.002 ||
        Math.abs(goal.lng - cam.lng) > 1e-6 || Math.abs(goal.lat - cam.lat) > 1e-6 ||
        Math.abs(goal.pitch - cam.pitch) > 0.02 || Math.abs(angle(goal.bearing - cam.bearing)) > 0.02;
      if (settling) raf = requestAnimationFrame(frame); else last = 0;
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    map.on("style.load", () => {
      if (failed) return;
      map.resize();
      cam = null;
      kick();
      root.classList.add("map-ready");
    });

    addEventListener("scroll", kick, { passive: true });
    addEventListener("resize", () => { map.resize(); kick(); });

    // Keep the map's light in step with the site's theme toggle.
    new MutationObserver(() => {
      if (map.isStyleLoaded()) map.setConfigProperty("basemap", "lightPreset", lightPreset());
    }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }

  function lerp(x, y, t) { return x + (y - x) * t; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function angle(d) { return ((d + 540) % 360) - 180; }
})();
