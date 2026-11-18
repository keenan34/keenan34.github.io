import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { farBank, nearBank, ribbon } from "./riverfront.js";
import { sky } from "./timeOfDay.js";

// Millennium Park and Michigan Avenue details that fill the block's open ground:
// the Crown Fountain lawn on the front plaza, the Water Tower in the back corner,
// and green verges along the river.
const GRASS = "#3b5a35";

function Strip({ start, end, inner, outer, y, color }) {
  const geometry = useMemo(() => ribbon(start, end, inner, outer, y, 0.03), [start, end, inner, outer, y]);
  return <mesh geometry={geometry} receiveShadow>
    <meshStandardMaterial attach="material-0" color={color} roughness={1} />
    <meshStandardMaterial attach="material-1" color={color} roughness={1} />
  </mesh>;
}

// Two glass-block towers facing each other across a shallow black-granite pool.
// Their faces glow softly after dark, as the real screens do.
function CrownFountain({ position }) {
  const glass = useRef([]);
  useFrame(() => {
    glass.current.forEach((m) => m && (m.emissiveIntensity = 0.1 + 0.9 * sky.night));
  });
  return <group position={position}>
    <mesh position={[0, 0.012, 0]} receiveShadow>
      <boxGeometry args={[3.4, 0.03, 0.9]} />
      <meshStandardMaterial color="#1d2328" roughness={0.15} metalness={0.3} />
    </mesh>
    {[-1.45, 1.45].map((x, i) => (
      <mesh key={x} position={[x, 0.75, 0]} castShadow>
        <boxGeometry args={[0.36, 1.5, 0.6]} />
        <meshStandardMaterial ref={(m) => (glass.current[i] = m)} color="#cfe1e6" emissive="#bfe6ff"
          transparent opacity={0.85} roughness={0.2} />
      </mesh>
    ))}
  </group>;
}

function Bench({ position, yaw = 0 }) {
  return <group position={position} rotation-y={yaw}>
    <mesh position={[0, 0.12, 0]} castShadow><boxGeometry args={[0.6, 0.04, 0.18]} /><meshStandardMaterial color="#6b4a32" /></mesh>
    <mesh position={[0, 0.22, -0.08]}><boxGeometry args={[0.6, 0.16, 0.03]} /><meshStandardMaterial color="#6b4a32" /></mesh>
    {[-0.24, 0.24].map((x) => (
      <mesh key={x} position={[x, 0.06, 0]}><boxGeometry args={[0.04, 0.12, 0.16]} /><meshStandardMaterial color="#2b2f33" /></mesh>
    ))}
  </group>;
}

// The 1869 Water Tower: a pale limestone castle with a slim octagonal shaft.
function WaterTower({ position }) {
  const lamps = useRef([]);
  useFrame(() => lamps.current.forEach((m) => m && (m.emissiveIntensity = 0.05 + 0.6 * sky.night)));
  const stone = <meshStandardMaterial color="#d9cfb4" roughness={0.85} flatShading />;
  return <group position={position}>
    <mesh position={[0, 0.35, 0]} castShadow receiveShadow><boxGeometry args={[1.3, 0.7, 1.3]} />{stone}</mesh>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
      <mesh key={x + "" + z} position={[x * 0.62, 0.55, z * 0.62]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 1.1, 8]} />{stone}
      </mesh>
    ))}
    <mesh position={[0, 1.35, 0]} castShadow><cylinderGeometry args={[0.32, 0.4, 1.3, 8]} />{stone}</mesh>
    <mesh position={[0, 2.08, 0]}><cylinderGeometry args={[0.24, 0.3, 0.2, 8]} />{stone}</mesh>
    <mesh position={[0, 2.35, 0]}><coneGeometry args={[0.2, 0.36, 8]} />{stone}</mesh>
    {/* Warm uplights washing the base after dark. */}
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 0.66, 0.03, Math.sin(i * Math.PI / 2) * 0.66]}>
        <boxGeometry args={[0.08, 0.04, 0.08]} />
        <meshStandardMaterial ref={(m) => (lamps.current[i] = m)} color="#ffd9a0" emissive="#ffc070" toneMapped={false} />
      </mesh>
    ))}
  </group>;
}

export default function ParkProps() {
  // The lawn fills the open plaza in front of the river, leaving a path to the Bean.
  const lawnInner = (x) => nearBank(x) + 0.95;
  const lawnOuter = () => 12.1;
  return <group>
    <Strip start={-7.8} end={0.6} inner={lawnInner} outer={lawnOuter} y={0.145} color={GRASS} />
    {/* Grass verges: near bank by the river, planters along the far bank's top step. */}
    <Strip start={-8} end={1.2} inner={(x) => nearBank(x) + 0.42} outer={(x) => nearBank(x) + 0.7} y={0.145} color={GRASS} />
    <Strip start={-8} end={7.6} inner={(x) => farBank(x) - 0.62} outer={(x) => farBank(x) - 0.42} y={0.115} color="#3f5f39" />
    <CrownFountain position={[-3.6, 0.15, 10.9]} />
    <Bench position={[-6.4, 0.15, 11.8]} />
    <Bench position={[-0.9, 0.15, 11.8]} />
    <Bench position={[-6.6, 0.15, 8.6]} yaw={Math.PI} />
    <WaterTower position={[7.0, 0.1, -7.1]} />
  </group>;
}
