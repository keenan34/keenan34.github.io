import { phaseWeights } from "../scene/timeOfDay.js";

// The sky behind the transparent canvas: three looks that cross-fade with the time
// of day (CSS gradients can't transition, their layers' opacity can).
//  - Day: crisp overcast Chicago, gray-blue with soft clouds drifting by.
//  - Dusk: deep blue overhead through violet to an orange horizon glow.
//  - Night: blue-black film tones with a faint warm light-pollution glow.
const LAYERS = {
  day: "linear-gradient(180deg, #7f93a8 0%, #a9b7c5 45%, #cdd5dc 100%)",
  dusk: "linear-gradient(180deg, #16204a 0%, #3b2d63 32%, #8a4a76 58%, #e07a4f 84%, #f3a65e 100%)",
  night: "radial-gradient(125% 95% at 50% 80%, #2b1f22 0%, #141a2b 38%, #0d1424 60%, #05070d 100%)",
};

export default function Sky({ night }) {
  const w = phaseWeights(night);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Object.entries(LAYERS).map(([key, bg]) => (
        <div key={key} className="absolute inset-0 transition-opacity duration-[2000ms]" style={{ background: bg, opacity: w[key] }} />
      ))}
      {/* Overcast cloud banks, only by day. */}
      <div className="sky-clouds absolute -inset-x-1/2 top-0 h-3/5 blur-2xl transition-opacity duration-[2000ms]" style={{ opacity: w.day * 0.55 }} />
    </div>
  );
}
