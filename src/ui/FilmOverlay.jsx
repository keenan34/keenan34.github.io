// The film finish over the scene: fine monochrome grain (an SVG turbulence tile that
// jumps a few times a second, like film running through a gate) and a soft vignette.
// It sits under the labels, HUD and drawers so text stays crisp, and holds still
// when animation is paused.
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>
    <filter id='g'>
      <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix type='saturate' values='0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(#g)'/>
  </svg>`,
)}")`;

export default function FilmOverlay({ paused }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="film-grain absolute -inset-[10%] opacity-[0.075] mix-blend-overlay"
        style={{ backgroundImage: GRAIN, animationPlayState: paused ? "paused" : "running" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
}
