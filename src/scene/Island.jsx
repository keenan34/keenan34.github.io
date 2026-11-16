// The floating chunk of city: a soil base, concrete back lot, sidewalk, asphalt
// street with lane dashes, and a slice of the dyed-green Chicago River in front.
const W = 12;

export default function Island() {
  return (
    <group>
      {/* Soil and bedrock under everything. */}
      <mesh position={[0, -1.1, 0]}>
        <boxGeometry args={[W, 2, W]} />
        <meshStandardMaterial color="#3b2a24" roughness={1} />
      </mesh>
      <mesh position={[0, -2.35, 0]}>
        <boxGeometry args={[W - 0.6, 0.5, W - 0.6]} />
        <meshStandardMaterial color="#2a1e1a" roughness={1} />
      </mesh>

      {/* Back lot and plaza. */}
      <mesh position={[0, 0.05, -3.5]}>
        <boxGeometry args={[W, 0.1, 5]} />
        <meshStandardMaterial color="#6b6f78" roughness={0.9} />
      </mesh>
      {/* Sidewalk. */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[W, 0.16, 2]} />
        <meshStandardMaterial color="#8a8f99" roughness={0.85} />
      </mesh>
      {/* Street. */}
      <mesh position={[0, 0.02, 2.5]}>
        <boxGeometry args={[W, 0.04, 3]} />
        <meshStandardMaterial color="#26282e" roughness={0.95} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-5 + i * 2, 0.05, 2.5]}>
          <boxGeometry args={[0.9, 0.02, 0.12]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.25} />
        </mesh>
      ))}

      {/* River wall and the emerald water, dyed like St. Patrick's Day. Both sit on
          top of the soil and stop just short of its edges: faces that line up exactly
          with the soil's flicker (z-fighting). */}
      <mesh position={[0, 0.05, 4.1]}>
        <boxGeometry args={[W - 0.02, 0.1, 0.2]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.05, 5.1]}>
        <boxGeometry args={[W - 0.02, 0.08, 1.78]} />
        <meshPhysicalMaterial
          color="#10b981"
          emissive="#059669"
          emissiveIntensity={0.6}
          roughness={0.08}
          metalness={0.1}
          clearcoat={1}
        />
      </mesh>
    </group>
  );
}
