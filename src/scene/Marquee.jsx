import { useEffect, useMemo } from "react";
import * as THREE from "three";
import Hotspot from "./Hotspot.jsx";

// A Chicago Theatre-style vertical marquee bolted to the tavern's corner. The letters
// are drawn into a canvas texture so no font file has to be fetched by three.js.
function useLetterTexture(word) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128 * word.length;
    return new THREE.CanvasTexture(canvas);
  }, [word]);

  useEffect(() => {
    const draw = () => {
      const c = texture.image;
      const g = c.getContext("2d");
      g.fillStyle = "#7f1d1d";
      g.fillRect(0, 0, c.width, c.height);
      g.font = "900 104px 'Big Shoulders Display', 'Arial Narrow', sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.shadowColor = "#fff3b0";
      g.shadowBlur = 18;
      g.fillStyle = "#fffbe6";
      [...word].forEach((ch, i) => g.fillText(ch, 64, 128 * i + 70));
      texture.needsUpdate = true;
    };
    draw();
    document.fonts?.ready.then(draw);
  }, [texture, word]);

  return texture;
}

export default function Marquee({ onOpen }) {
  const word = "PROJECTS";
  const map = useLetterTexture(word);
  const h = 4.2;

  return (
    <Hotspot id="projects" labelOffset={[0.9, h * 0.32, 1.6]} onOpen={onOpen} position={[1.15, 0.6, -1.2]}>
      {/* Bracket. */}
      <mesh position={[-0.35, 2.6, 0]}>
        <boxGeometry args={[0.5, 0.15, 0.15]} />
        <meshStandardMaterial color="#27272a" metalness={0.6} />
      </mesh>
      {/* Sign body with the lettered face on both sides. */}
      <mesh position={[0.2, h / 2 + 0.4, 0]}>
        <boxGeometry args={[0.18, h, 0.75]} />
        <meshStandardMaterial color="#7f1d1d" />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[0.2 + side * 0.1, h / 2 + 0.4, 0]} rotation={[0, side * Math.PI / 2, 0]}>
          <planeGeometry args={[0.7, h]} />
          <meshStandardMaterial map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
      ))}
      {/* Chaser bulbs down the edges. */}
      {Array.from({ length: 12 }, (_, i) => [-0.4, 0.4].map((z) => (
        <mesh key={`${i}${z}`} position={[0.2, 0.55 + i * (h / 11.5), z]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={4} toneMapped={false} />
        </mesh>
      )))}
      {/* Crown. */}
      <mesh position={[0.2, h + 0.6, 0]}>
        <coneGeometry args={[0.45, 0.6, 4]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </Hotspot>
  );
}
