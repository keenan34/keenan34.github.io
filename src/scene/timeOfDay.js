import { useEffect, useState } from "react";

// The scene follows the visitor's local clock: day, dusk (and a softer dawn), night.
// `night` runs 0 (day) → 0.5 (dusk) → 1 (night) and ramps through the dusk and dawn
// windows, so the look never jumps. `?time=day|dusk|night` forces a look.
const forced = { day: 0, dusk: 0.5, night: 1 }[new URLSearchParams(location.search).get("time")];

const smooth = (t) => t * t * (3 - 2 * t);

function nightAt(date) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 8 && h < 16.5) return 0;                       // day
  if (h >= 16.5 && h < 19.5) return smooth((h - 16.5) / 3); // sunset into night
  if (h >= 6 && h < 8) return 1 - smooth((h - 6) / 2);      // dawn
  return 1;                                                // night
}

// Module-level value so scene components can read it every frame without re-rendering.
export const sky = { night: forced ?? nightAt(new Date()) };

export function useTimeOfDay() {
  const [night, setNight] = useState(sky.night);
  useEffect(() => {
    if (forced !== undefined) return;
    const id = setInterval(() => {
      sky.night = nightAt(new Date());
      setNight(sky.night);
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return night;
}

// Weights for the day / dusk / night looks; they always sum to 1.
export function phaseWeights(night) {
  return {
    day: Math.max(0, 1 - night * 2),
    dusk: Math.max(0, 1 - Math.abs(night - 0.5) * 2),
    night: Math.max(0, night * 2 - 1),
  };
}

export const mix = (a, b, t) => a + (b - a) * t;
