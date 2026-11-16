import { Canvas, useThree } from "@react-three/fiber";
import { OrthographicCamera, OrbitControls, Float, Environment, Lightformer } from "@react-three/drei";
import { useEffect } from "react";
import Island from "./Island.jsx";
import Tower from "./Tower.jsx";
import LTrain from "./LTrain.jsx";
import Marquee from "./Marquee.jsx";
import Bean from "./Bean.jsx";
import Booth from "./Booth.jsx";
import Streetlamp from "./Streetlamp.jsx";
import ChicagoProps from "./ChicagoProps.jsx";
import { LabelProjector } from "./labels.jsx";

// The block is 12 units across and the tower about 11.5 tall; fit both on screen.
function FitZoom() {
  const { camera, size } = useThree();
  useEffect(() => {
    // Phones are narrow, so the block gets most of the width there.
    const across = size.width < 640 ? 14 : 25;
    camera.zoom = Math.max(16, Math.min(size.width, size.height * 1.2) / across);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

export default function Scene({ onOpen, paused }) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.5]}
      frameloop={paused ? "demand" : "always"}
      gl={{ antialias: true }}
      aria-label="An interactive miniature Chicago block. Click the glowing landmarks to explore."
    >
      <color attach="background" args={["#0b0f19"]} />
      <fog attach="fog" args={["#0b0f19", 40, 80]} />
      <OrthographicCamera makeDefault position={[20, 18, 20]} zoom={35} near={0.1} far={200} />
      <FitZoom />
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        minAzimuthAngle={-Math.PI / 12}
        maxAzimuthAngle={Math.PI / 2 + Math.PI / 12}
        minZoom={14}
        maxZoom={90}
        enableDamping
        target={[0, 3.6, 0]}
      />

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
          <ChicagoProps />
          <Marquee onOpen={() => onOpen("projects")} />
          <Booth onOpen={() => onOpen("chat")} paused={paused} />
          <Bean onOpen={() => onOpen("about")} />
          <LTrain paused={paused} />
          <Streetlamp position={[-4.2, 0, 0.6]} />
          <Streetlamp position={[1.8, 0, 0.6]} />
        </group>
      </Float>
      <LabelProjector />

    </Canvas>
  );
}
