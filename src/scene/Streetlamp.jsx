import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import Glow from "./Glow.jsx";
import { sky } from "./timeOfDay.js";

// A cast-iron street lamp with a warm glow that actually lights the sidewalk.
export default function Streetlamp({ position }) {
  // Lamps switch on through dusk.
  const bulb = useRef(), light = useRef();
  useFrame(() => {
    const on = Math.min(1, Math.max(0, (sky.night - 0.2) / 0.5));
    if (bulb.current) bulb.current.emissiveIntensity = 0.3 + on * 4.7;
    if (light.current) light.current.intensity = on * 6;
  });
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 2.4, 8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial ref={bulb} color="#fff1c1" emissive="#ffcf7a" emissiveIntensity={5} toneMapped={false} />
      </mesh>
      <Glow position={[0, 2.5, 0]} color="#ffbf66" size={1.5} opacity={0.85} day={0} />
      <pointLight ref={light} position={[0, 2.4, 0]} color="#ffb257" intensity={6} distance={5} decay={2} />
    </group>
  );
}
