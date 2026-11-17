import { Canvas } from "@react-three/fiber";
import { Float, Environment, Lightformer } from "@react-three/drei";
import { useRef } from "react";
import CameraRig from "./CameraRig.jsx";
import CityGrid from "./CityGrid.jsx";
import Weather from "./Weather.jsx";
import DistantSkyline from "./DistantSkyline.jsx";
import { useTimeOfDay } from "./timeOfDay.js";
import * as THREE from "three";

// Light rigs for the three looks; the scene blends day → dusk → night.
const RIGS = {
  day:   { sky: "#e3eaf3", ground: "#70757e", hemi: 1.9, amb: 0.5,  sun: "#fff6ea", sunI: 2.3, sunPos: [-10, 16, 8], rim: "#d6e6ff", rimI: 0.6 },
  dusk:  { sky: "#9a83c0", ground: "#3c2232", hemi: 1.3, amb: 0.3,  sun: "#ff8a4a", sunI: 3.0, sunPos: [-16, 6, 6],  rim: "#a78bfa", rimI: 0.9 },
  night: { sky: "#6b7bb5", ground: "#2a1830", hemi: 1.1, amb: 0.25, sun: "#ff9a5a", sunI: 2.4, sunPos: [-14, 10, 6], rim: "#38bdf8", rimI: 1.1 },
};
const c = new THREE.Color();
function rig(night) {
  const [a, b, t] = night < 0.5 ? [RIGS.day, RIGS.dusk, night * 2] : [RIGS.dusk, RIGS.night, (night - 0.5) * 2];
  const col = (k) => "#" + c.set(a[k]).lerp(new THREE.Color(b[k]), t).getHexString();
  const num = (k) => a[k] + (b[k] - a[k]) * t;
  return {
    sky: col("sky"), ground: col("ground"), hemi: num("hemi"), amb: num("amb"),
    sun: col("sun"), sunI: num("sunI"), sunPos: a.sunPos.map((v, i) => v + (b.sunPos[i] - v) * t),
    rim: col("rim"), rimI: num("rimI"),
  };
}
import Island from "./Island.jsx";
import Tower from "./Tower.jsx";
import LTrain from "./LTrain.jsx";
import Bean from "./Bean.jsx";
import Streetlamp from "./Streetlamp.jsx";
import ChicagoProps from "./ChicagoProps.jsx";
import { LabelProjector } from "./labels.jsx";

export default function Scene({ view, onOpen, onClose, paused }) {
  const L = rig(useTimeOfDay());
  // A click on empty space goes back to the overview, but not the end of a drag.
  const down = useRef([0, 0]);
  const missed = (e) => {
    const [x, y] = down.current;
    if (view && Math.hypot(e.clientX - x, e.clientY - y) < 6) onClose();
  };

  return (
    <Canvas
      // Orthographic from the first frame, so the camera controls bind to this camera.
      orthographic
      camera={{ position: [20, 18, 20], zoom: 35, near: 0.1, far: 200 }}
      onPointerDown={(e) => (down.current = [e.clientX, e.clientY])}
      onPointerMissed={missed}
      className="!absolute inset-0"
      // Match Retina phone displays so fine geometry isn't enlarged from a low-res buffer.
      dpr={[1, 3]}
      frameloop={paused ? "demand" : "always"}
      gl={{ antialias: true, alpha: true }}
      aria-label="An interactive miniature Chicago block. Click the glowing landmarks to explore."
    >
      <CameraRig view={view} />

      {/* Dusk: cool sky fill, warm low sun from one side, cyan rim from the other. */}
      <hemisphereLight key={L.sky + L.ground} args={[L.sky, L.ground, L.hemi]} />
      <ambientLight intensity={L.amb} />
      <directionalLight position={L.sunPos} intensity={L.sunI} color={L.sun} />
      <directionalLight position={[10, 8, -12]} intensity={L.rimI} color={L.rim} />

      {/* Reflections for the chrome Bean, built from light panels so nothing is fetched. */}
      <Environment resolution={256}>
        <color attach="background" args={["#3a4a78"]} />
        <Lightformer form="rect" intensity={6} color="#fb923c" position={[-6, 2, 5]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={5} color="#38bdf8" position={[6, 3, -5]} scale={[12, 5, 1]} />
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="ring" intensity={3} color="#fde68a" position={[5, 1, 5]} scale={3} />
      </Environment>

      <Float speed={paused ? 0 : 1.2} rotationIntensity={0.08} floatIntensity={0.35}>
        <group position={[0, 0, 0]}>
          <Island paused={paused} />
          <Tower />
          <ChicagoProps paused={paused} onAbout={() => onOpen("about")} />
          <Bean onOpen={() => onOpen("about")} />
          <LTrain paused={paused} docked={view === "projects"} onOpen={() => onOpen("projects")} />
          <Streetlamp position={[-4.2, 0, 0.6]} />
          <Streetlamp position={[1.8, 0, 0.6]} />
        </group>
      </Float>
      {/* The rest of the city, below the block and outside the float. */}
      <CityGrid paused={paused} />
      <DistantSkyline />
      <Weather paused={paused} />
      <LabelProjector />

    </Canvas>
  );
}
