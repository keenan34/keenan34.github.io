import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import RiverBridge from "./RiverBridge.jsx";

// The channel occupies z=4.25..5.55, between the train street and grassy bank.
export default function River({ paused }) {
  const water = useRef();
  const time = useRef(0);
  useFrame((_, delta) => {
    if (paused || !water.current) return;
    time.current += Math.min(delta, 0.05);
    const positions = water.current.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i);
      positions.setZ(i, 0.012 * Math.sin(x * 3.5 + time.current * 0.8) +
        0.008 * Math.cos(y * 9 + x * 1.4 - time.current * 0.6));
    }
    positions.needsUpdate = true;
    water.current.computeVertexNormals();
  });
  return (
    <group>
      <RiverBridge x={-3.5} />
      <RiverBridge x={3.5} />
      <mesh position={[0, -0.045, 4.9]} rotation-x={-Math.PI / 2}>
        <planeGeometry ref={water} args={[11.96, 1.3, 64, 12]} />
        <meshStandardMaterial color="#07966c" roughness={0.24} metalness={0.35}
          emissive="#03543d" emissiveIntensity={0.12} />
      </mesh>
      {[4.15, 5.65].map((z) => (
        <group key={z}>
          <mesh position={[0, 0.025, z]}>
            <boxGeometry args={[11.98, 0.25, 0.2]} />
            <meshStandardMaterial color="#788684" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.165, z]}>
            <boxGeometry args={[11.98, 0.06, 0.26]} />
            <meshStandardMaterial color="#b3b7aa" roughness={0.8} />
          </mesh>
          {Array.from({ length: 15 }, (_, i) => (
            <mesh key={i} position={[-5.6 + i * 0.8, 0.198, z]}>
              <boxGeometry args={[0.012, 0.003, 0.26]} />
              <meshStandardMaterial color="#6f7973" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.025, 5.9]}>
        <boxGeometry args={[11.98, 0.25, 0.18]} />
        <meshStandardMaterial color="#527448" roughness={1} />
      </mesh>
    </group>
  );
}
