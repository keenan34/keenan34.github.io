import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Hotspot from "./Hotspot.jsx";
import Station from "./Station.jsx";
import { ctaLogo } from "./ctaArt.js";

// The elevated 'L': steel pillars and track over the street, with one boxy CTA car
// gliding back and forth. The car is the Projects landmark: it carries a CTA-style
// "PROJECTS" destination sign and stops while it's hovered so it's easy to click.
const STEEL = "#475569";
const Y = 3.4;   // track height
const Z = 2.5;   // over the middle of the street

// Orange-on-black LED destination sign, drawn once into a canvas texture.
function useHeadsign(text) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 48;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => {
    const draw = () => {
      const g = texture.image.getContext("2d");
      g.fillStyle = "#0b0b0b";
      g.fillRect(0, 0, 256, 48);
      g.font = "700 34px 'Big Shoulders Display', 'Arial Narrow', sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#ffb020";
      g.fillText(text, 128, 26);
      texture.needsUpdate = true;
    };
    draw();
    document.fonts?.ready.then(draw);
  }, [texture, text]);
  return texture;
}

function Car() {
  const sign = useHeadsign("PROJECTS");
  return (
    <group>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[2.6, 1.1, 1]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Blue-and-red CTA stripe. */}
      {[0.51, -0.51].map((z) => (
        <group key={z}>
          <mesh position={[0, 0.45, z]}>
            <boxGeometry args={[2.6, 0.12, 0.02]} />
            <meshStandardMaterial color="#1d4ed8" />
          </mesh>
          <mesh position={[0, 0.33, z]}>
            <boxGeometry args={[2.6, 0.06, 0.02]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
        </group>
      ))}
      {/* Lit windows on both sides, with the CTA roundel at the front. */}
      {[-0.85, -0.3, 0.25].map((x) => [0.51, -0.51].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.85, z]}>
          <boxGeometry args={[0.4, 0.32, 0.02]} />
          <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      )))}
      {[1, -1].map((side) => (
        <mesh key={`logo${side}`} position={[0.82, 0.78, side * 0.512]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <circleGeometry args={[0.24, 40]} />
          <meshStandardMaterial map={ctaLogo()} emissiveMap={ctaLogo()} emissive="#ffffff" emissiveIntensity={0.35} />
        </mesh>
      ))}
      {[1, -1].map((side) => (
        <mesh key={`end${side}`} position={[side * 1.302, 0.88, 0]} rotation={[0, side * Math.PI / 2, 0]}>
          <circleGeometry args={[0.2, 40]} />
          <meshStandardMaterial map={ctaLogo()} emissiveMap={ctaLogo()} emissive="#ffffff" emissiveIntensity={0.35} />
        </mesh>
      ))}
      {/* Destination sign along the roofline, on both sides. */}
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, 1.25, side * 0.4]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[1.6, 0.3]} />
          <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[1.66, 0.34, 0.78]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {/* Headlights. */}
      {[-1.31, 1.31].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]}>
          <boxGeometry args={[0.04, 0.16, 0.5]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff7cc" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function LTrain({ paused, onOpen }) {
  const car = useRef();
  const t = useRef(0);
  const held = useRef(false);

  useFrame((_, dt) => {
    if (paused || held.current) return;
    t.current += dt;
    // Ease into each end of the run like a train pulling into a station.
    car.current.position.x = Math.sin(t.current * 0.35) * 3.6;
  });

  return (
    <group position={[0, 0, Z]}>
      {[-5, -1.7, 1.7, 5].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-0.45, 0.45].map((z) => (
            <mesh key={z} position={[0, Y / 2, z]}>
              <boxGeometry args={[0.18, Y, 0.18]} />
              <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, Y - 0.15, 0]}>
            <boxGeometry args={[0.24, 0.2, 1.2]} />
            <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Girders and rails. */}
      {[-0.5, 0.5].map((z) => (
        <mesh key={z} position={[0, Y, z]}>
          <boxGeometry args={[12, 0.28, 0.14]} />
          <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, Y + 0.16, 0]}>
        <boxGeometry args={[12, 0.06, 1]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <Station y={Y} />
      <group ref={car} position={[0, Y + 0.2, 0]}>
        <Hotspot id="projects" labelOffset={[0, 2, 0]} onOpen={onOpen} onHoverChange={(on) => (held.current = on)}>
          <Car />
        </Hotspot>
      </group>
    </group>
  );
}
