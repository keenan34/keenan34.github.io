import { phaseWeights } from "../scene/timeOfDay.js";

// The flat sky behind the canvas, seen while the 3D sky loads or without WebGL: three looks that cross-fade with the time
// of day (CSS gradients can't transition, their layers' opacity can).
//  - Day: crisp overcast Chicago, gray-blue with soft clouds drifting by.
//  - Dusk: deep blue overhead through violet to an orange horizon glow.
//  - Night: blue-black film tones with a faint warm light-pollution glow.
const LAYERS = {
  day: "radial-gradient(ellipse at 73% 52%, #f3e6cc, #b6c6c7 50%, #9bafb9 100%)",
  dusk: "radial-gradient(ellipse at 74% 58%, #6d6661, #293746 46%, #142231 78%, #101a28)",
  night: "radial-gradient(ellipse at 72% 55%, #283139, #101e2c 48%, #091321 78%, #070f1a)",
};

export default function Sky({ night }) {
  const w = phaseWeights(night);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Object.entries(LAYERS).map(([key, bg]) => (
        <div key={key} className="absolute inset-0 transition-opacity duration-[2000ms]" style={{ background: bg, opacity: w[key] }} />
      ))}
    </div>
  );
}
