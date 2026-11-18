import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { anchors, elements } from "./labels.jsx";

// Lives inside the <Canvas>: projects each anchor to screen space every frame.
const v = new THREE.Vector3();
export function LabelProjector() {
  useFrame(({ camera, size }) => {
    for (const [id, obj] of anchors) {
      const el = elements.get(id);
      if (!el) continue;
      v.setFromMatrixPosition(obj.matrixWorld).project(camera);
      const x = (v.x + 1) / 2 * size.width;
      const y = (1 - v.y) / 2 * size.height;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      el.style.opacity = "1";
    }
  });
  return null;
}
