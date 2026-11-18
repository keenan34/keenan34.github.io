import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { carriageFinish } from "./carriageFinish.js";
import { trackZ, trackYaw } from "./riverfront.js";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Hotspot from "./Hotspot.jsx";
import Station from "./Station.jsx";
import { ctaLogo } from "./ctaArt.js";
import Glow from "./Glow.jsx";

// The elevated 'L': steel pillars and track over the street, with two stainless-steel cars
// gliding back and forth. The car is the Projects landmark: it carries a CTA-style
// "PROJECTS" destination sign and stops while it's hovered so it's easy to click.
const STEEL = "#475569";
const Y = 3.4;   // track height
// Short chords follow the same centerline as the moving car.
const railSegments = Array.from({ length: 14 }, (_, i) => {
  const a = -7 + i, b = a + 1, dz = trackZ(b) - trackZ(a);
  return { x: a + 0.5, z: (trackZ(a) + trackZ(b)) / 2, yaw: -Math.atan2(dz, 1), length: Math.hypot(1, dz) };
});
function alignCar(car, x) {
  car.position.set(x, Y + 0.2, trackZ(x));
  car.rotation.y = trackYaw(x);
}

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

function Car({ windows, trailing = false }) {
  const sign = useHeadsign("PROJECTS");
  const shell = useMemo(() => new RoundedBoxGeometry(2.6, 0.91, 0.98, 3, 0.115), []);
  const [sideMap, litWindows] = useMemo(carriageFinish, []);
  useEffect(() => () => { sideMap.dispose(); litWindows.dispose(); }, [sideMap, litWindows]);
  return (
    <group>
      <mesh geometry={shell} position={[0,0.72,0]} castShadow>
        <meshStandardMaterial color="#c2cbcc" roughness={0.29} metalness={0.72} />
      </mesh>
      <mesh position={[0,0.24,0]}>
        <boxGeometry args={[2.18,0.18,0.69]} /><meshStandardMaterial color="#394046" />
      </mesh>
      {[-0.93,-0.66,0.66,0.93].map(x => [-0.41,0.41].map(z => (
        <mesh key={x+":"+z} position={[x,0.135,z]} rotation-x={Math.PI/2}>
          <cylinderGeometry args={[0.14,0.14,0.085,16]} />
          <meshStandardMaterial color="#484e51" metalness={0.65} roughness={0.5} />
        </mesh>
      )))}
      {[-1,1].map((side,i) => (
        <mesh key={side} position={[0,0.72,side*0.491]} rotation-y={side>0?0:Math.PI}>
          <planeGeometry args={[2.39,0.7]} />
          <meshStandardMaterial ref={m => { windows.current[(trailing?2:0)+i]=m; }}
            map={sideMap} emissiveMap={litWindows} emissive="#efc792" emissiveIntensity={1.4}
            metalness={0.38} roughness={0.43} />
        </mesh>
      ))}
      {[-1,1].map(end => <group key={end} position={[end*1.301,0.85,0]} rotation-y={end*Math.PI/2}>
        <mesh><planeGeometry args={[0.68,0.3]} /><meshStandardMaterial color="#28383f" metalness={0.48} roughness={0.21} /></mesh>
        <mesh position={[0,0,0.004]}><planeGeometry args={[0.035,0.3]} /><meshStandardMaterial color="#97a0a2" /></mesh>
      </group>)}
      {[1, -1].map((side) => (
        <mesh key={`logo${side}`} position={[0.52, 0.51, side * 0.494]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <circleGeometry args={[0.09, 32]} />
          <meshStandardMaterial map={ctaLogo()} emissiveMap={ctaLogo()} emissive="#ffffff" emissiveIntensity={0.35} />
        </mesh>
      ))}
      {[1, -1].map((side) => (
        <mesh key={`end${side}`} position={[side * 1.302, 0.61, 0]} rotation={[0, side * Math.PI / 2, 0]}>
          <circleGeometry args={[0.09, 32]} />
          <meshStandardMaterial map={ctaLogo()} emissiveMap={ctaLogo()} emissive="#ffffff" emissiveIntensity={0.35} />
        </mesh>
      ))}
      {/* Destination sign along the roofline, on both sides. */}
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, 1.19, side * 0.49]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[1.6, 0.22]} />
          <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      ))}
      {/* Sign housing, sitting on the roof (the body tops out at y 1.2). */}
      <mesh position={[0, 1.19, 0]}>
        <boxGeometry args={[1.66, 0.26, 0.97]} />
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
  [-2.95, 4.3, 7],
  [4.3, 4.3, 1.2],
  [4.3, STATION_X, 6],
  [STATION_X, STATION_X, 3],   // the 3-second station stop
  [STATION_X, -2.95, 2.5],
  [-2.95, -2.95, 1.2],
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
  const trailer = useRef();
  const moveTrain = (x) => {
    alignCar(car.current, x);
    alignCar(trailer.current, x - 2.7);
  };
  const windows = useRef([]);
  const t = useRef(0);
  const held = useRef(false);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (docked) {
      // With animation paused there are no frames to brake over, so just arrive.
      if (paused) { moveTrain(STATION_X); invalidate(); }
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
      moveTrain(x + (STATION_X - x) * (1 - Math.exp(-dt * 2.2)));
      dwelling = Math.abs(STATION_X - x) < 0.05;
    } else {
      if (held.current) return;
      t.current += dt;
      const at = trainAt(t.current);
      moveTrain(at.x);
      dwelling = at.dwelling;
    }
    // Doors open at the platform: the cabin glows a little warmer.
    const target = dwelling ? 2.4 : 1.4;
    windows.current.forEach((m) => m && (m.emissiveIntensity += (target - m.emissiveIntensity) * Math.min(1, dt * 4)));
  });

  return (
    <group>
      {[-6.6, -3.4, -0.2, 3, 5.6, 6.9].map((x) => (
        <group key={x} position={[x, 0, trackZ(x)]} rotation-y={trackYaw(x)}>
          {[-0.45, 0.45].map((z) => (
            <mesh key={z} position={[0, Y / 2, z]}>
              <boxGeometry args={[0.18, Y, 0.18]} />
              <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.6} />
            </mesh>
          ))}
          {[-1,1].map(side => <mesh key={side} position={[0,Y-0.5,side*0.26]} rotation-x={side*0.64}>
            <boxGeometry args={[0.13,0.8,0.1]} /><meshStandardMaterial color={STEEL} metalness={0.4} />
          </mesh>)}
          <mesh position={[0, Y - 0.15, 0]}>
            <boxGeometry args={[0.24, 0.2, 1.2]} />
            <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {railSegments.map(({x,z,yaw,length}) => (
        <group key={x} position={[x,Y,z]} rotation-y={yaw}>
          <mesh castShadow><boxGeometry args={[length+0.04,0.22,1.24]} /><meshStandardMaterial color="#56433b" roughness={0.72} /></mesh>
          {[-0.41,0.41].map(offset => <mesh key={offset} position={[0,0.15,offset]}>
            <boxGeometry args={[length+0.04,0.08,0.075]} /><meshStandardMaterial color="#a7a099" metalness={0.65} roughness={0.4} />
          </mesh>)}
        </group>
      ))}
      <group position-z={trackZ(STATION_X)}><Station y={Y} onOpen={onOpen} /></group>
      <group ref={trailer} position={[STATION_X-2.7,Y+0.2,trackZ(STATION_X-2.7)]}
        onClick={e => { e.stopPropagation(); onOpen(); }}
        onPointerOver={() => { held.current = true; document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { held.current = false; document.body.style.cursor = ""; }}>
        <Car windows={windows} trailing />
      </group>
      <group ref={car} position={[STATION_X, Y + 0.2, trackZ(STATION_X)]}>
        <Hotspot id="projects" labelOffset={[0, 2, 0]} onOpen={onOpen} onHoverChange={(on) => (held.current = on)}>
          <Car windows={windows} />
        </Hotspot>
      </group>
    </group>
  );
}
