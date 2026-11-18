import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { farBank, nearBank } from "./riverfront.js";

// Where the river comes in: a lock gate in the spirit of the Chicago Harbor Lock, with
// stone piers, a steel gantry, a control house and red/green navigation lights.
export const GATE_X = 8;
const steel = "#3f4a4f";

function Lattice({ length }) {
  // Two chords with diagonal bracing between them.
  const bays = 7, h = 0.42, step = length / bays;
  const bars = [];
  for (let i = 0; i < bays; i++) {
    const z = -length / 2 + step * (i + 0.5);
    const ang = Math.atan2(h, step) * (i % 2 ? 1 : -1);
    bars.push(<mesh key={i} position={[0, 0, z]} rotation-x={ang}><boxGeometry args={[0.05, 0.05, Math.hypot(h, step)]} /><meshStandardMaterial color={steel} metalness={0.4} roughness={0.6} /></mesh>);
  }
  return <group>
    {[h / 2, -h / 2].map((y) => <mesh key={y} position-y={y} castShadow><boxGeometry args={[0.09, 0.08, length]} /><meshStandardMaterial color={steel} metalness={0.4} roughness={0.6} /></mesh>)}
    {bars}
  </group>;
}

function NavLight({ color, position, night }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    // Slow flash, as on a harbor light.
    const on = 0.55 + 0.45 * Math.max(0, Math.sin(clock.elapsedTime * 2.2));
    ref.current.emissiveIntensity = (0.6 + 3 * night) * on;
  });
  return <mesh position={position}><sphereGeometry args={[0.08, 12, 8]} /><meshStandardMaterial ref={ref} color={color} emissive={color} toneMapped={false} /></mesh>;
}

export default function RiverEntrance({ night, paused }) {
  const z0 = farBank(GATE_X), z1 = nearBank(GATE_X), mid = (z0 + z1) / 2, span = z1 - z0;
  const foam = useRef();
  useFrame(({ clock }) => {
    if (paused) return;
    foam.current.material.opacity = 0.55 + 0.2 * Math.sin(clock.elapsedTime * 3);
  });
  const pierZ = useMemo(() => [z0 - 0.35, z1 + 0.35], [z0, z1]);
  return (
    <group position={[GATE_X, 0, 0]}>
      {/* Lock wall the water wells up from, and its stone piers. */}
      <mesh position={[0.2, -0.45, mid]} receiveShadow><boxGeometry args={[0.4, 0.5, span + 1.2]} /><meshStandardMaterial color="#6f747d" roughness={0.92} /></mesh>
      {pierZ.map((z) => (
        <mesh key={z} position={[0.05, 0.9, z]} castShadow receiveShadow><boxGeometry args={[0.62, 2.1, 0.62]} /><meshStandardMaterial color="#7c818a" roughness={0.9} /></mesh>
      ))}
      {pierZ.map((z) => (
        <mesh key={"cap" + z} position={[0.05, 2.0, z]}><boxGeometry args={[0.74, 0.1, 0.74]} /><meshStandardMaterial color="#8a8f99" /></mesh>
      ))}
      <group position={[0.05, 1.68, mid]}><Lattice length={span + 0.7} /></group>
      {/* Control house on the near pier. */}
      <group position={[0.05, 2.05, pierZ[1]]}>
        <mesh position-y={0.24} castShadow><boxGeometry args={[0.5, 0.48, 0.5]} /><meshStandardMaterial color="#d8d1c2" roughness={0.8} /></mesh>
        <mesh position={[-0.255, 0.28, 0]}><planeGeometry args={[0.3, 0.16]} /><meshStandardMaterial color="#2c3a44" emissive="#ffc47a" emissiveIntensity={night * 1.4} side={THREE.DoubleSide} /></mesh>
        <mesh position-y={0.52}><boxGeometry args={[0.6, 0.06, 0.6]} /><meshStandardMaterial color={steel} /></mesh>
      </group>
      <NavLight color="#ff3b2f" position={[0.38, 1.5, pierZ[0]]} night={night} />
      <NavLight color="#2dff7a" position={[0.38, 1.5, pierZ[1]]} night={night} />
      {/* Water boiling up where it enters. */}
      <mesh ref={foam} rotation-x={-Math.PI / 2} position={[-0.25, -0.33, mid]}>
        <planeGeometry args={[0.5, span]} />
        <meshBasicMaterial color="#e8f1ee" transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  );
}
