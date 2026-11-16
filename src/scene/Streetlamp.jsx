import Glow from "./Glow.jsx";

// A cast-iron street lamp with a warm glow that actually lights the sidewalk.
export default function Streetlamp({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 2.4, 8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#fff1c1" emissive="#ffcf7a" emissiveIntensity={5} toneMapped={false} />
      </mesh>
      <Glow position={[0, 2.5, 0]} color="#ffbf66" size={1.5} opacity={0.85} />
      <pointLight position={[0, 2.4, 0]} color="#ffb257" intensity={6} distance={5} decay={2} />
    </group>
  );
}
