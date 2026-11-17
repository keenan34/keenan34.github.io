import { Canvas } from "@react-three/fiber";
import { Float, Environment, Lightformer } from "@react-three/drei";
import { useRef } from "react";
import CameraRig from "./CameraRig.jsx";
import CityGrid from "./CityGrid.jsx";
import Island from "./Island.jsx";
import Tower from "./Tower.jsx";
import LTrain from "./LTrain.jsx";
import Bean from "./Bean.jsx";
import Streetlamp from "./Streetlamp.jsx";
import ChicagoProps from "./ChicagoProps.jsx";
import { LabelProjector } from "./labels.jsx";

export default function Scene({ view, onOpen, onClose, paused }) {
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
      dpr={[1, 1.5]}
      frameloop={paused ? "demand" : "always"}
      gl={{ antialias: true, alpha: true }}
      aria-label="An interactive miniature Chicago block. Click the glowing landmarks to explore."
    >
      <CameraRig view={view} />

      {/* Dusk: cool sky fill, warm low sun from one side, cyan rim from the other. */}
      <hemisphereLight args={["#6b7bb5", "#2a1830", 1.1]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-14, 10, 6]} intensity={2.4} color="#ff9a5a" />
      <directionalLight position={[10, 8, -12]} intensity={1.1} color="#38bdf8" />

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
          <Island />
          <Tower />
          <ChicagoProps paused={paused} onAbout={() => onOpen("about")} />
          <Bean onOpen={() => onOpen("about")} />
          <LTrain paused={paused} onOpen={() => onOpen("projects")} />
          <Streetlamp position={[-4.2, 0, 0.6]} />
          <Streetlamp position={[1.8, 0, 0.6]} />
        </group>
      </Float>
      {/* The rest of the city, below the block and outside the float. */}
      <CityGrid paused={paused} />
      <LabelProjector />

    </Canvas>
  );
}
