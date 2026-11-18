import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useRef } from "react";
import CameraRig from "./CameraRig.jsx";
import RiverfrontBlocks from "./RiverfrontBlocks.jsx";
import Weather from "./Weather.jsx";
import SkyWorld from "./SkyWorld.jsx";
import { maxDpr, mobile } from "./device.js";
import CityGrid from "./CityGrid.jsx";
import DistantSkyline from "./DistantSkyline.jsx";

import { useTimeOfDay } from "./timeOfDay.js";
import * as THREE from "three";

// Light rigs for the three looks; the scene blends day → dusk → night.
const RIGS = {
  day:   { sky: "#e3eaf3", ground: "#70757e", hemi: 1.9, amb: 0.5,  sun: "#fff6ea", sunI: 2.3, sunPos: [-10, 16, 8], rim: "#d6e6ff", rimI: 0.6 },
  dusk:  { sky: "#8a9db9", ground: "#3c2232", hemi: 1.3, amb: 0.3,  sun: "#ff8a4a", sunI: 3.0, sunPos: [-16, 6, 6],  rim: "#a5c8da", rimI: 0.9 },
  night: { sky: "#6b7bb5", ground: "#2a1830", hemi: 0.48, amb: 0.09, sun: "#ff9a5a", sunI: 0.85, sunPos: [-14, 10, 6], rim: "#9fc8dc", rimI: 0.8 },
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

import ChicagoProps from "./ChicagoProps.jsx";
import ParkProps from "./ParkProps.jsx";
import { LabelProjector } from "./LabelProjector.jsx";

export default function Scene({ view, onOpen, onClose, paused }) {
  const night = useTimeOfDay();
  const L = rig(night);
  // A click on empty space goes back to the overview, but not the end of a drag.
  const down = useRef([0, 0]);
  const missed = (e) => {
    const [x, y] = down.current;
    if (view && Math.hypot(e.clientX - x, e.clientY - y) < 6) onClose();
  };

  return (
    <Canvas
      // Orthographic from the first frame, so the camera controls bind to this camera.
      shadows={!mobile}
      orthographic
      camera={{ position: [20, 18, 20], zoom: 35, near: 0.1, far: 400 }}
      onPointerDown={(e) => (down.current = [e.clientX, e.clientY])}
      onPointerMissed={missed}
      className="!absolute inset-0"
      // Match Retina phone displays so fine geometry isn't enlarged from a low-res buffer.
      dpr={[1, maxDpr]}
      frameloop={paused ? "demand" : "always"}
      gl={{ antialias: !mobile, alpha: true, powerPreference: "high-performance" }}
      aria-label="An interactive Chicago riverfront. Click the glowing landmarks to explore."
    >
      <CameraRig view={view} />
      <SkyWorld night={night} sunPos={L.sunPos} />

      {/* Dusk: cool sky fill, warm low sun from one side, cyan rim from the other. */}
      <hemisphereLight key={L.sky + L.ground} args={[L.sky, L.ground, L.hemi]} />
      <ambientLight intensity={L.amb} />
      <directionalLight castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-normalBias={0.035} position={L.sunPos} intensity={L.sunI} color={L.sun} />
      <directionalLight position={[10, 8, -12]} intensity={L.rimI} color={L.rim} />

      {/* Reflections for the chrome Bean, built from light panels so nothing is fetched. */}
      <Environment resolution={128} environmentIntensity={0.7 - night * 0.52}>
        <color attach="background" args={["#3a4a78"]} />
        <Lightformer form="rect" intensity={3} color="#ffcb86" position={[-6, -1, 5]} scale={[12, 1.4, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#a8cbd9" position={[6, 3, -5]} scale={[12, 5, 1]} />
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="ring" intensity={3} color="#fde68a" position={[5, 1, 5]} scale={3} />
      </Environment>

      <group>
          <Island paused={paused} night={night} />
          <RiverfrontBlocks night={night} />
          <Tower />
          <ParkProps />
          <ChicagoProps paused={paused} onAbout={() => onOpen("about")} />
          <Bean night={night} onOpen={() => onOpen("about")} />
          <LTrain paused={paused} docked={view === "projects"} onOpen={() => onOpen("projects")} />
      </group>

      <CityGrid paused={paused} />
      <DistantSkyline />
      <Weather paused={paused} />
      <LabelProjector />

    </Canvas>
  );
}
