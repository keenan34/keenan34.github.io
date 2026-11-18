import { useMemo } from "react";
import * as THREE from "three";
import River from "./River.jsx";
import RiverBridge from "./RiverBridge.jsx";
import Streetlamp from "./Streetlamp.jsx";
import RiverEntrance from "./RiverEntrance.jsx";
import { channel, farBank, halfWidth, lamps, nearBank, ribbon } from "./riverfront.js";

function Stone({ start, end, inner, outer, height, depth, color }) {
  const geometry = useMemo(() => ribbon(start, end, inner, outer, height, depth),
    [start, end, inner, outer, height, depth]);
  return <mesh geometry={geometry} receiveShadow>
    <meshStandardMaterial attach="material-0" color={color} roughness={0.9} />
    <meshStandardMaterial attach="material-1" color={color} roughness={0.94} />
  </mesh>;
}

const lowerStep = x => farBank(x) + 0.42;
const upperStep = x => farBank(x) + 0.22;

// The block is squared off, like the original diorama: straight front and back edges.
const BACK = -8.6, FRONT = 12.6, LEFT = -8.3, RIGHT = 8.3;
const back = () => BACK, front = () => FRONT;

export default function Island({ paused, night }) {
  const cx = (LEFT + RIGHT) / 2, cz = (BACK + FRONT) / 2, w = RIGHT - LEFT, d = FRONT - BACK;
  return (
    <group>
      <Stone start={LEFT} end={RIGHT} inner={back} outer={farBank} height={0.1} depth={0.76} color="#5f636b" />
      <Stone start={LEFT} end={RIGHT} inner={farBank} outer={lowerStep} height={-0.22} depth={0.42} color="#7c818a" />
      <Stone start={LEFT} end={RIGHT} inner={farBank} outer={upperStep} height={-0.06} depth={0.22} color="#7d838c" />
      <Stone start={LEFT} end={RIGHT} inner={nearBank} outer={front} height={0.13} depth={0.81} color="#7d838c" />
      {/* Soil and bedrock under everything, as on the original block. */}
      <mesh position={[cx, -1.66, cz]} receiveShadow>
        <boxGeometry args={[w, 2, d]} />
        <meshStandardMaterial color="#3b2a24" roughness={1} />
      </mesh>
      <mesh position={[cx, -2.91, cz]}>
        <boxGeometry args={[w - 0.6, 0.5, d - 0.6]} />
        <meshStandardMaterial color="#2a1e1a" roughness={1} />
      </mesh>
      {/* The river's west end, walled off where the block ends. */}
      <mesh position={[LEFT + 0.12, -0.15, channel(LEFT)]} castShadow receiveShadow>
        <boxGeometry args={[0.24, 0.5, 2 * halfWidth(LEFT) + 0.3]} />
        <meshStandardMaterial color="#7c818a" roughness={0.9} />
      </mesh>
      <River paused={paused} night={night} />
      <RiverEntrance paused={paused} night={night} />
      <group position={[-0.9, -0.06, channel(-0.9)]} scale={[1.12, 1.3, halfWidth(-0.9) / 0.83]}>
        <RiverBridge />
      </group>
      {lamps.map(([x, z]) => <Streetlamp key={x} position={[x, 0.13, z]} />)}
    </group>
  );
}
