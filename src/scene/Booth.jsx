import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Hotspot from "./Hotspot.jsx";

// Neon broadcast booth for the AI twin, on the tower's first setback roof: a light-blue glowing kiosk under a
// radio mast, with red six-pointed Chicago stars pulsing on its sign.
function useStarShape() {
  return useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 12; i++) {
      const r = i % 2 === 0 ? 1 : 0.45;
      const a = (i / 12) * Math.PI * 2 + Math.PI / 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }, []);
}

export default function Booth({ onOpen, paused }) {
  const star = useStarShape();
  const glow = useRef([]);
  const t = useRef(0);

  useFrame((_, dt) => {
    if (!paused) t.current += dt;
    const pulse = 2.2 + Math.sin(t.current * 3) * 1.2;
    glow.current.forEach((m) => m && (m.emissiveIntensity = pulse));
  });
  const keep = (i) => (m) => (glow.current[i] = m);

  return (
    <Hotspot id="chat" labelOffset={[-0.4, 2.3, 1.4]} onOpen={onOpen} position={[-0.6, 0.1 + 50 * 0.085, -2.4]} scale={0.62}>
      {/* Kiosk. */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.4, 1.2, 1.1]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0, 0.7, 0.56]}>
        <boxGeometry args={[1.2, 0.7, 0.02]} />
        <meshStandardMaterial ref={keep(0)} color="#7dd3fc" emissive="#7dd3fc" toneMapped={false} />
      </mesh>
      {/* Sign with red stars. */}
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[1.7, 0.5, 0.12]} />
        <meshStandardMaterial color="#e0f2fe" emissive="#7dd3fc" emissiveIntensity={0.6} />
      </mesh>
      {[-0.55, 0, 0.55].map((x, i) => (
        <mesh key={x} position={[x, 1.55, 0.07]} scale={0.17}>
          <extrudeGeometry args={[star, { depth: 0.2, bevelEnabled: false }]} />
          <meshStandardMaterial ref={keep(i + 1)} color="#ef3340" emissive="#ef3340" toneMapped={false} />
        </mesh>
      ))}
      {/* Radio mast with a blinking tip. */}
      <mesh position={[0.5, 2.4, -0.3]}>
        <cylinderGeometry args={[0.03, 0.05, 1.6, 6]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
      <mesh position={[0.5, 3.25, -0.3]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial ref={keep(4)} color="#ef3340" emissive="#ef3340" toneMapped={false} />
      </mesh>
    </Hotspot>
  );
}
