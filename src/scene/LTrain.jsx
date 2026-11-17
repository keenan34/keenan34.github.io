import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Hotspot from "./Hotspot.jsx";
import Station from "./Station.jsx";
import { ctaLogo } from "./ctaArt.js";
import Glow from "./Glow.jsx";

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
      g.font = "700 26px Archivo, 'Helvetica Neue', Arial, sans-serif";
      g.textAlign = "center";
      // Center the capitals by their actual ink, so the space above and below match.
      g.textBaseline = "alphabetic";
      const m = g.measureText(text);
      const y = (48 + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      g.fillStyle = "#ffb020";
      g.fillText(text, 128, y);
      texture.needsUpdate = true;
    };
    draw();
    document.fonts?.ready.then(draw);
  }, [texture, text]);
  return texture;
}

function Car({ windows }) {
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
      {[-0.85, -0.3, 0.25].map((x, i) => [0.51, -0.51].map((z, j) => (
        <mesh key={`${x}${z}`} position={[x, 0.85, z]}>
          <boxGeometry args={[0.4, 0.32, 0.02]} />
          <meshStandardMaterial ref={(m) => (windows.current[i * 2 + j] = m)} color="#fde68a" emissive="#fde68a" emissiveIntensity={1.4} toneMapped={false} />
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
        <mesh key={side} position={[0, 1.38, side * 0.4]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[1.6, 0.3]} />
          <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      ))}
      {/* Sign housing, sitting on the roof (the body tops out at y 1.2). */}
      <mesh position={[0, 1.38, 0]}>
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
      {[-1.36, 1.36].map((x) => <Glow key={x} position={[x, 0.45, 0]} color="#fff3c4" size={0.7} opacity={0.8} />)}
    </group>
  );
}

// One loop of the run: [from x, to x, seconds]. Each leg eases in and out, so the
// car pulls out gently, slows into Wellington, dwells, and accelerates away.
const STATION_X = -2.6;
const LEGS = [
  [-4.3, 4.3, 7],
  [4.3, 4.3, 1.2],
  [4.3, STATION_X, 6],
  [STATION_X, STATION_X, 3],   // the 3-second station stop
  [STATION_X, -4.3, 2.5],
  [-4.3, -4.3, 1.2],
];
const LOOP = LEGS.reduce((n, l) => n + l[2], 0);
// Where the loop picks up after a Projects visit: the moment the dwell ends, so the
// car pulls straight out of the station.
const DEPART = LEGS.slice(0, 4).reduce((n, l) => n + l[2], 0);
const smoother = (p) => p * p * p * (p * (p * 6 - 15) + 10);

function trainAt(time) {
  let t = time % LOOP;
  for (let i = 0; i < LEGS.length; i++) {
    const [a, b, d] = LEGS[i];
    if (t < d) return { x: a + (b - a) * smoother(t / d), dwelling: i === 3 };
    t -= d;
  }
  return { x: LEGS[0][0], dwelling: false };
}

// `docked` (Projects is open): the car brakes into Wellington from wherever it is and
// waits there. When Projects closes, the loop resumes from the end of the station stop.
export default function LTrain({ paused, docked, onOpen }) {
  const car = useRef();
  const windows = useRef([]);
  const t = useRef(0);
  const held = useRef(false);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (docked) {
      // With animation paused there are no frames to brake over, so just arrive.
      if (paused) { car.current.position.x = STATION_X; invalidate(); }
    } else if (t.current > 0) {
      t.current = DEPART;
    }
  }, [docked]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    if (paused) return;
    let dwelling;
    if (docked) {
      // Ease in like a train braking, then hold.
      const x = car.current.position.x;
      car.current.position.x = x + (STATION_X - x) * (1 - Math.exp(-dt * 2.2));
      dwelling = Math.abs(STATION_X - x) < 0.05;
    } else {
      if (held.current) return;
      t.current += dt;
      const at = trainAt(t.current);
      car.current.position.x = at.x;
      dwelling = at.dwelling;
    }
    // Doors open at the platform: the cabin glows a little warmer.
    const target = dwelling ? 2.4 : 1.4;
    windows.current.forEach((m) => m && (m.emissiveIntensity += (target - m.emissiveIntensity) * Math.min(1, dt * 4)));
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
      <Station y={Y} onOpen={onOpen} />
      <group ref={car} position={[0, Y + 0.2, 0]}>
        <Hotspot id="projects" labelOffset={[0, 2, 0]} onOpen={onOpen} onHoverChange={(on) => (held.current = on)}>
          <Car windows={windows} />
        </Hotspot>
      </group>
    </group>
  );
}
