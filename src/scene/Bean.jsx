import { useMemo } from "react";
import * as THREE from "three";
import Hotspot from "./Hotspot.jsx";

// A miniature Cloud Gate: a squashed chrome blob with the arch ("omphalos") pressed
// into its underside, sitting on a little granite plaza.
function useBeanGeometry() {
  return useMemo(() => {
    const g = new THREE.SphereGeometry(1, 64, 32);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      // Kidney-ish footprint: wider in x, a little pinched in the middle.
      v.x *= 1.55;
      v.z *= 0.95 - 0.12 * Math.exp(-(v.x * v.x) * 1.2);
      v.y *= 0.72;
      // Push the underside up into an arch near the middle.
      if (v.y < 0) v.y *= 1 - 0.75 * Math.exp(-(v.x * v.x) * 1.4);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
}

export default function Bean({ onOpen }) {
  const geometry = useBeanGeometry();
  return (
    <Hotspot id="about" labelOffset={[0, 2.6, 0]} onOpen={onOpen} position={[3.6, 0.1, -3.2]}>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[4, 0.12, 3.4]} />
        <meshStandardMaterial color="#4b5563" roughness={0.6} />
      </mesh>
      <mesh geometry={geometry} position={[0, 0.82, 0]}>
        <meshStandardMaterial color="#f1f5f9" metalness={1} roughness={0.05} envMapIntensity={3} />
      </mesh>
    </Hotspot>
  );
}
