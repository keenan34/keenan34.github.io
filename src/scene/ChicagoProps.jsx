import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Glow from "./Glow.jsx";
import { sky, mix } from "./timeOfDay.js";

// Small pieces that say "Chicago" at a glance: the Hancock Center, the city flag,
// a Bears flag, a Vienna Beef hot dog cart and a Divvy bike dock.

const BEARS_NAVY = "#0b162a", BEARS_ORANGE = "#c83803";

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function star6(g, cx, cy, r) {
  g.beginPath();
  for (let i = 0; i < 12; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

// ---------- John Hancock Center: tapered, black, X-braced, two antennas ----------
function Hancock({ position }) {
  const h = 7.6;
  const map = useMemo(
    () =>
      canvasTexture(64, 384, (g, w, H) => {
        g.fillStyle = "#0e1015";
        g.fillRect(0, 0, w, H);
        let s = 11;
        const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
        for (let y = 2; y < H; y += 6) {
          for (let x = 3; x < w; x += 8) {
            const v = rnd();
            g.fillStyle = v > 0.55 ? "#e8b765" : "#1d222d";
            g.fillRect(x, y, 4, 2);
          }
        }
        // Five stacked X braces and the horizontal ties between them.
        g.strokeStyle = "#9aa3b2";
        g.lineWidth = 3;
        const bay = H / 5;
        for (let i = 0; i < 5; i++) {
          const y0 = i * bay, y1 = y0 + bay;
          g.beginPath();
          g.moveTo(0, y0); g.lineTo(w, y1);
          g.moveTo(w, y0); g.lineTo(0, y1);
          g.moveTo(0, y0); g.lineTo(w, y0);
          g.stroke();
        }
      }),
    [],
  );
  map.wrapS = THREE.RepeatWrapping;
  map.repeat.set(4, 1);
  const facade = useRef();
  useFrame(() => {
    if (facade.current) facade.current.emissiveIntensity = mix(0.3, 1.25, sky.night);
  });

  return (
    <group position={position}>
      {/* A four-sided frustum: a cylinder with 4 segments, turned to square up. */}
      <mesh position={[0, h / 2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.72, 1.15, h, 4, 1]} />
        <meshStandardMaterial ref={facade} map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={1.25} roughness={0.4} metalness={0.5} flatShading />
      </mesh>
      <mesh position={[0, h + 0.08, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.74, 0.74, 0.16, 4, 1]} />
        <meshStandardMaterial color="#0b0c10" />
      </mesh>
      {[[-0.25, 1.9], [0.25, 1.7]].map(([x, ah]) => (
        <group key={x} position={[x, h + 0.16, 0]}>
          <mesh position={[0, ah / 2, 0]}>
            <cylinderGeometry args={[0.03, 0.05, ah, 8]} />
            <meshStandardMaterial color="#e5e7eb" />
          </mesh>
          <mesh position={[0, ah + 0.03, 0]}>
            <sphereGeometry args={[0.06, 10, 10]} />
            <meshStandardMaterial color="#ef3340" emissive="#ef3340" emissiveIntensity={5} toneMapped={false} />
          </mesh>
          <Glow position={[0, ah + 0.03, 0]} color="#ff3b4a" size={0.7} />
        </group>
      ))}
    </group>
  );
}

// ---------- The Chicago flag on a pole ----------
// The flag waves: each vertex swings out of plane by more the farther it is from the
// pole, with the wave travelling outward.
const FLAG_W = 1.05, FLAG_H = 0.7;

function drawChicago(g, w, h) {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#41b6e6";
  g.fillRect(0, h * 0.17, w, h * 0.13);
  g.fillRect(0, h * 0.7, w, h * 0.13);
  g.fillStyle = "#e4002b";
  [0.2, 0.4, 0.6, 0.8].forEach((x) => star6(g, w * x, h / 2, h * 0.11));
}

// White field with navy and orange bands, and the bear head (public/bears-logo.webp)
// in the middle once it has loaded.
function drawBears(g, w, h, logo) {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.fillStyle = BEARS_NAVY;
  g.fillRect(0, 0, w, h * 0.12);
  g.fillRect(0, h * 0.88, w, h * 0.12);
  g.fillStyle = BEARS_ORANGE;
  g.fillRect(0, h * 0.12, w, h * 0.04);
  g.fillRect(0, h * 0.84, w, h * 0.04);
  if (logo) {
    const size = h * 0.62;
    g.drawImage(logo, (w - size) / 2, (h - size) / 2, size, size);
  }
}

function Flag({ position, draw, logo, scale = 1, paused, onOpen }) {
  const cloth = useRef();
  const base = useRef(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (paused) return;
    t.current += dt;
    const g = cloth.current.geometry;
    const p = g.attributes.position;
    base.current ??= Float32Array.from(p.array);
    const b = base.current;
    for (let i = 0; i < p.count; i++) {
      const u = (b[i * 3] + FLAG_W / 2) / FLAG_W;
      const v = b[i * 3 + 1] / FLAG_H;
      p.array[i * 3 + 2] = Math.sin(u * 6 - t.current * 2.2 + v * 1.2) * 0.06 * u;
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
  });
  const point = (on) => (document.body.style.cursor = on ? "pointer" : "");
  const map = useMemo(() => canvasTexture(300, 200, draw), [draw]);
  // Redraw with the image once it arrives.
  useEffect(() => {
    if (!logo) return;
    const img = new Image();
    img.onload = () => {
      draw(map.image.getContext("2d"), map.image.width, map.image.height, img);
      map.needsUpdate = true;
    };
    img.src = logo;
  }, [logo, draw, map]);
  const handlers = onOpen && {
    onClick: (e) => { e.stopPropagation(); point(false); onOpen(); },
    onPointerOver: (e) => { e.stopPropagation(); point(true); },
    onPointerOut: () => point(false),
  };
  return (
    <group position={position} scale={scale} {...handlers}>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 3.2, 8]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh ref={cloth} position={[0.56, 2.75, 0]}>
        <planeGeometry args={[FLAG_W, FLAG_H, 24, 14]} />
        <meshStandardMaterial map={map} side={THREE.DoubleSide} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

// ---------- Vienna Beef hot dog cart ----------
function HotDogCart({ position }) {
  return (
    <group position={position} rotation={[0, 0.3, 0]}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.9, 0.45, 0.5]} />
        <meshStandardMaterial color="#d6d3d1" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.5, 0.26]}>
        <boxGeometry args={[0.8, 0.14, 0.02]} />
        <meshStandardMaterial color="#c8102e" />
      </mesh>
      <mesh position={[0, 0.38, 0.26]}>
        <boxGeometry args={[0.8, 0.07, 0.02]} />
        <meshStandardMaterial color="#ffc72c" emissive="#ffc72c" emissiveIntensity={0.3} />
      </mesh>
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.12, 0.27]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.05, 14]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
      <mesh position={[0.05, 1.1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
      {/* Red and yellow striped umbrella. */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[0.05, 1.55, 0]} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
          <coneGeometry args={[0.6, 0.28, 2, 1, true, 0, Math.PI / 4]} />
          <meshStandardMaterial color={i % 2 ? "#ffc72c" : "#c8102e"} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Divvy bike dock ----------
function DivvyBike({ x }) {
  const blue = "#3db7e4";
  return (
    <group position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {[-0.22, 0.22].map((z) => (
        <mesh key={z} position={[z, 0.18, 0]}>
          <torusGeometry args={[0.15, 0.025, 6, 18]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.46, 0.06, 0.06]} />
        <meshStandardMaterial color={blue} />
      </mesh>
      <mesh position={[0.2, 0.42, 0]}>
        <boxGeometry args={[0.14, 0.12, 0.16]} />
        <meshStandardMaterial color={blue} />
      </mesh>
    </group>
  );
}

function DivvyDock({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[1.9, 0.06, 0.45]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {[-0.66, -0.22, 0.22, 0.66].map((x) => <DivvyBike key={x} x={x} />)}
      <mesh position={[-1.05, 0.45, 0]}>
        <boxGeometry args={[0.12, 0.9, 0.25]} />
        <meshStandardMaterial color="#3db7e4" emissive="#3db7e4" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

export default function ChicagoProps({ paused, onAbout }) {
  return (
    <group>
      <Hancock position={[-4.8, 0.1, -2.1]} />
      <Flag position={[5.4, 0.22, -4.6]} draw={drawChicago} paused={paused} onOpen={onAbout} />
      {/* Flying beside the city flag, a little lower. */}
      <Flag position={[4.2, 0.22, -4.75]} draw={drawBears} logo="./bears-logo.webp" scale={0.85} paused={paused} />
      <HotDogCart position={[-2.2, 0.16, -0.25]} />
      <DivvyDock position={[3.8, 0.16, -0.3]} />
    </group>
  );
}
