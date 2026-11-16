import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { registerAnchor, setHover } from "./labels.jsx";

// Wraps a landmark: grows on hover, opens a panel on click, and anchors its
// floating label (drawn by LabelLayer) at labelOffset.
export default function Hotspot({ id, labelOffset = [0, 2, 0], onOpen, onHoverChange, children, ...props }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((_, dt) => {
    const target = hovered ? 1.12 : 1;
    const s = ref.current.scale.x + (target - ref.current.scale.x) * Math.min(1, dt * 10);
    ref.current.scale.setScalar(s);
  });

  const hover = (on) => {
    setHovered(on);
    setHover(id, on);
    onHoverChange?.(on);
    document.body.style.cursor = on ? "pointer" : "";
  };

  return (
    <group {...props}>
      <group
        ref={ref}
        onPointerOver={(e) => { e.stopPropagation(); hover(true); }}
        onPointerOut={() => hover(false)}
        onClick={(e) => { e.stopPropagation(); hover(false); onOpen(); }}
      >
        {children}
      </group>
      <object3D ref={registerAnchor(id)} position={labelOffset} />
    </group>
  );
}
