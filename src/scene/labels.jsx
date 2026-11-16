import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Floating landmark labels as plain DOM, positioned every frame from a 3D anchor.
// (drei's <Html> loses a label to a mount race under React 19, so this replaces it.)
const anchors = new Map();   // id -> Object3D inside the scene
const elements = new Map();  // id -> label <span> in the page

export const registerAnchor = (id) => (obj) => (obj ? anchors.set(id, obj) : anchors.delete(id));
export const setHover = (id, on) => { const el = elements.get(id); if (el) el.dataset.hover = on ? "1" : "0"; };

const LABELS = [
  ["projects", "Projects"],
  ["about", "About"],
  ["chat", "Talk to AI"],
];

// Lives outside the <Canvas>, on top of it.
export function LabelLayer() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {LABELS.map(([id, text]) => (
        <span
          key={id}
          ref={(el) => (el ? elements.set(id, el) : elements.delete(id))}
          data-hover="0"
          className="absolute left-0 top-0 whitespace-nowrap rounded-full border border-sky-400/40 bg-slate-900/70 px-3 py-1 font-display text-sm font-bold uppercase tracking-wider text-sky-100 opacity-0 backdrop-blur-md transition-[background-color,border-color,color,box-shadow] data-[hover=1]:border-flag-blue data-[hover=1]:bg-flag-blue/25 data-[hover=1]:text-white data-[hover=1]:shadow-[0_0_18px_rgba(125,211,252,0.6)]"
        >
          [ {text} ]
        </span>
      ))}
    </div>
  );
}

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
