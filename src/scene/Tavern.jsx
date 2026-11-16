// A two-story Chicago red-brick corner tavern with glowing windows, a bar-front
// awning, and a wooden water tower on the roof.
const BRICK = "#9a3b2e";
const TRIM = "#d6c7a1";
const GLOW = "#ffcf7a";

function Window({ position, w = 0.7, h = 0.9 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[w + 0.16, h + 0.16, 0.06]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>
      <mesh>
        <boxGeometry args={[w, h, 0.06]} />
        <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

function WaterTower({ position }) {
  return (
    <group position={position}>
      {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.6, z]}>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 6]} />
          <meshStandardMaterial color="#3f3f46" />
        </mesh>
      ))}
      <mesh position={[0, 1.65, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 1.1, 16]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
      </mesh>
      {[1.25, 1.65, 2.05].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.81, 0.03, 6, 24]} />
          <meshStandardMaterial color="#27272a" metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[0.9, 0.6, 16]} />
        <meshStandardMaterial color="#5b3a1e" roughness={0.9} />
      </mesh>
    </group>
  );
}

export default function Tavern() {
  return (
    <group position={[-1.6, 0.1, -3.4]}>
      {/* Body. */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[5, 4.4, 4]} />
        <meshStandardMaterial color={BRICK} roughness={0.85} />
      </mesh>
      {/* Cornice and floor band. */}
      <mesh position={[0, 4.5, 0]}>
        <boxGeometry args={[5.3, 0.3, 4.3]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>
      <mesh position={[0, 2.2, 2.02]}>
        <boxGeometry args={[5, 0.18, 0.08]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>
      {/* Roof. */}
      <mesh position={[0, 4.68, 0]}>
        <boxGeometry args={[5.1, 0.06, 4.1]} />
        <meshStandardMaterial color="#1f2937" roughness={1} />
      </mesh>

      {/* Front: second-floor windows, ground-floor bar window, door, awning. */}
      {[-1.6, 0, 1.6].map((x) => <Window key={x} position={[x, 3.3, 2.04]} />)}
      <Window position={[-1, 1.2, 2.04]} w={2.2} h={1.2} />
      <mesh position={[1.3, 0.85, 2.04]}>
        <boxGeometry args={[0.8, 1.5, 0.08]} />
        <meshStandardMaterial color="#3f1d14" />
      </mesh>
      <mesh position={[-0.2, 2.0, 2.4]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[4, 0.06, 0.9]} />
        <meshStandardMaterial color="#14532d" />
      </mesh>

      {/* Side windows, facing the plaza. */}
      <group rotation={[0, Math.PI / 2, 0]} position={[2.5, 0, 0]}>
        {[-1, 1].map((x) => <Window key={`s3-${x}`} position={[x, 3.3, 0.04]} />)}
        {[-1, 1].map((x) => <Window key={`s1-${x}`} position={[x, 1.3, 0.04]} />)}
      </group>

      <WaterTower position={[-1.2, 4.7, -0.9]} />
    </group>
  );
}
