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

  const stops = [...tour.querySelectorAll(".stop")].map((el) => {
    const [lng, lat, zoom, pitch, bearing] = el.dataset.cam.split(",").map(Number);
    return { el, place: el.dataset.place, lng, lat, zoom, pitch, bearing };
  });
  const placeLabel = tour.querySelector(".tour-place span");

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
      .catch(() => {});
  }, { rootMargin: "800px 0px" });
  io.observe(tour);

  function lightPreset() {
    const theme = root.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    return theme === "dark" ? "night" : "dusk";
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
        interactive: false, attributionControl: true, antialias: true,
      });
    } catch (e) { return; }

    let failed = false;
    map.on("error", (e) => {
      // A bad or restricted token fails before the style loads: fall back to the list.
      if (!map.isStyleLoaded()) { failed = true; root.classList.remove("tour-on"); map.remove(); }
      console.warn("[tour]", e.error && e.error.message);
    });
    map.on("style.load", () => {
      if (failed) return;
      root.classList.add("tour-on");
      update();
    });

    // Keep the map's light in step with the site's theme toggle.
    new MutationObserver(() => {
      if (map.isStyleLoaded()) map.setConfigProperty("basemap", "lightPreset", lightPreset());
    }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    let ticking = false;
    const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", () => { map.resize(); queue(); });

    function update() {
      ticking = false;
      if (!root.classList.contains("tour-on")) return;
      const mid = innerHeight / 2;
      const centers = stops.map((s) => {
        const r = s.el.getBoundingClientRect();
        return r.top + Math.min(r.height, innerHeight) / 2;
      });

      // Find the pair of stops either side of the viewport's middle.
      let i = 0;
      while (i < stops.length - 2 && centers[i + 1] <= mid) i++;
      const a = stops[i], b = stops[i + 1];
      const span = centers[i + 1] - centers[i] || 1;
      let t = clamp((mid - centers[i]) / span, 0, 1);
      // Hold on each landmark for the first and last part of the scroll between stops.
      t = smooth(clamp((t - 0.2) / 0.6, 0, 1));

      // Fly-to feel: rise higher the further apart two stops are, then come back down.
      const dx = (b.lng - a.lng) * Math.cos(a.lat * Math.PI / 180), dy = b.lat - a.lat;
      const dip = clamp(Math.log2(Math.hypot(dx, dy) / 0.004), 0, 3);
      map.jumpTo({
        center: [lerp(a.lng, b.lng, t), lerp(a.lat, b.lat, t)],
        zoom: lerp(a.zoom, b.zoom, t) - dip * Math.sin(Math.PI * t),
        pitch: lerp(a.pitch, b.pitch, t),
        bearing: a.bearing + angle(b.bearing - a.bearing) * t,
      });

      const active = t < 0.5 ? a : b;
      if (placeLabel.textContent !== active.place) placeLabel.textContent = active.place;
      stops.forEach((s) => s.el.classList.toggle("is-active", s === active));
    }
  }

  function lerp(x, y, t) { return x + (y - x) * t; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function angle(d) { return ((d + 540) % 360) - 180; }
})();
