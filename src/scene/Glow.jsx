import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sky } from "./timeOfDay.js";

// A soft additive halo that always faces the camera: cheap "bloom" for single lights
// (antenna beacons, street lamps, headlights, the arrival board).
let texture;
function glowTexture() {
  if (!texture) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    texture = new THREE.CanvasTexture(c);
  }
  return texture;
}

// Halos fade by day (`day` is how much is left at noon), so lamps don't blaze at 2 PM.
export default function Glow({ position, color = "#ffcf7a", size = 0.8, opacity = 0.9, day = 0.15 }) {
  const mat = useRef();
  useFrame(() => {
    if (mat.current) mat.current.opacity = opacity * (day + (1 - day) * sky.night);
  });
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial
        ref={mat}
        map={glowTexture()}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
