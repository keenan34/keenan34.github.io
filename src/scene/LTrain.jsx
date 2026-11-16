import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

// The elevated 'L': steel pillars and track over the street, with one boxy CTA car
// gliding back and forth.
const STEEL = "#475569";
const Y = 3.4;   // track height
const Z = 2.5;   // over the middle of the street

function Car() {
  return (
    <group>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[2.6, 1.1, 1]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Blue-and-red CTA stripe. */}
      <mesh position={[0, 0.45, 0.51]}>
        <boxGeometry args={[2.6, 0.12, 0.02]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      <mesh position={[0, 0.33, 0.51]}>
        <boxGeometry args={[2.6, 0.06, 0.02]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      {/* Lit windows on both sides. */}
      {[-0.85, -0.3, 0.25, 0.8].map((x) => [0.51, -0.51].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.85, z]}>
          <boxGeometry args={[0.4, 0.32, 0.02]} />
          <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      )))}
      {/* Headlights. */}
      {[-1.31, 1.31].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]}>
          <boxGeometry args={[0.04, 0.16, 0.5]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff7cc" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function LTrain({ paused }) {
  const car = useRef();
  const t = useRef(0);

  useFrame((_, dt) => {
    if (paused) return;
    t.current += dt;
    // Ease into each end of the run like a train pulling into a station.
    car.current.position.x = Math.sin(t.current * 0.35) * 3.6;
  });

  return (
    <group position={[0, 0, Z]}>
      {[-5, -1.7, 1.7, 5].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-0.45, 0.45].map((z) => (
            <mesh key={z} position={[0, Y / 2, z]}>
              <boxGeometry args={[0.18, Y, 0.18]} />
              <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, Y - 0.15, 0]}>
            <boxGeometry args={[0.24, 0.2, 1.2]} />
            <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Girders and rails. */}
      {[-0.5, 0.5].map((z) => (
        <mesh key={z} position={[0, Y, z]}>
          <boxGeometry args={[12, 0.28, 0.14]} />
          <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, Y + 0.16, 0]}>
        <boxGeometry args={[12, 0.06, 1]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <group ref={car} position={[0, Y + 0.2, 0]}>
        <Car />
      </group>
    </group>
  );
}
