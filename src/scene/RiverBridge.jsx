const STEEL = "#793f35";

function Beam({ from, to, thickness = 0.045 }) {
  const dy = to[1] - from[1], dz = to[2] - from[2];
  return (
    <mesh position={from.map((v, i) => (v + to[i]) / 2)} rotation-x={Math.atan2(-dy, dz)}>
      <boxGeometry args={[thickness, thickness, Math.hypot(dy, dz)]} />
      <meshStandardMaterial color={STEEL} roughness={0.65} metalness={0.45} />
    </mesh>
  );
}

// A miniature double-leaf Chicago bascule bridge, shown closed for street traffic.
export default function RiverBridge() {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[0, 0.25, side * 0.48]}>
            <boxGeometry args={[0.98, 0.12, 0.94]} />
            <meshStandardMaterial color="#4a4a47" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.315, side * 0.48]}>
            <boxGeometry args={[0.025, 0.008, 0.55]} />
            <meshStandardMaterial color="#e4c47c" />
          </mesh>
          <mesh position={[0, 0.08, side * 0.83]}>
            <boxGeometry args={[1.08, 0.32, 0.22]} />
            <meshStandardMaterial color="#aaa28e" roughness={0.95} />
          </mesh>
          {[0.34, 0.7].map((height) => (
            <Beam key={height} from={[side * 0.51, height, -0.92]} to={[side * 0.51, height, 0.92]} thickness={0.065} />
          ))}
          {Array.from({ length: 4 }, (_, i) => {
            const z = -0.92 + i * 0.46;
            return (
              <group key={i}>
                <Beam from={[side * 0.51, 0.34, z]} to={[side * 0.51, 0.7, z + 0.46]} />
                <Beam from={[side * 0.51, 0.7, z]} to={[side * 0.51, 0.34, z + 0.46]} />
              </group>
            );
          })}
          {/* Limestone bridgehouses with copper-toned pyramidal roofs. */}
          <group position={[side * 0.76, 0, side * 0.84]}>
            <mesh position={[0, 0.38, 0]}>
              <boxGeometry args={[0.34, 0.67, 0.34]} />
              <meshStandardMaterial color="#c4b89d" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.82, 0]} rotation-y={Math.PI / 4}>
              <coneGeometry args={[0.31, 0.25, 4]} />
              <meshStandardMaterial color="#486b60" roughness={0.65} metalness={0.3} />
            </mesh>
            {[-1, 1].map((face) => (
              <mesh key={face} position={[0, 0.56, face * 0.172]}>
                <planeGeometry args={[0.18, 0.19]} />
                <meshStandardMaterial color="#e7bb72" emissive="#e7bb72" emissiveIntensity={0.5} side={2} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}
