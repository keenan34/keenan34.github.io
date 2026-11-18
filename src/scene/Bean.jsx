import { CubeCamera } from "@react-three/drei";
import { beanPosition } from "./riverfront.js";
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
      const underside = Math.max(0, -v.y);
      v.y *= 0.85;
      // Push the underside up into an arch near the middle.
      v.y += 1.22 * underside ** 2 * Math.exp(-(v.x ** 2) * 2.6);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
}

export default function Bean({ onOpen, night }) {
  const geometry = useBeanGeometry();
  const reflectionSky = useMemo(() => new THREE.Color(), []);
  reflectionSky.setRGB(0.6 - night * 0.43, 0.74 - night * 0.51, 0.84 - night * 0.48);
  return (
    <Hotspot id="about" labelOffset={[0, 2.6, 0]} onOpen={onOpen} position={beanPosition}>
      <mesh receiveShadow position={[0, 0.055, 0]}>
        <cylinderGeometry args={[1.82, 1.88, 0.12, 48]} />
        <meshStandardMaterial color="#928d80" roughness={0.6} />
      </mesh>
      <CubeCamera frames={1} resolution={128} position={[0, 0.74, 0]} envMap={reflectionSky}>
        {reflection => <mesh geometry={geometry} castShadow>
          <meshStandardMaterial color="#f1f5f9" metalness={1} roughness={0.075} envMap={reflection} envMapIntensity={1.3} />
        </mesh>}
      </CubeCamera>
    </Hotspot>
  );
}
