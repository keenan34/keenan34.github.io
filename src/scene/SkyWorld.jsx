import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { phaseWeights } from "./timeOfDay.js";

// The sky around the floating block: a dome whose horizon glow turns with the camera.
// It lives in world space, so orbiting the map sweeps the sky past.
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;

// Zenith, horizon and sun-glow colors for each look.
const PALETTE = {
  day:   ["#8ea5b8", "#dfe2da", "#fff1d6"],
  dusk:  ["#17243a", "#c97a5a", "#ff8a4a"],
  night: ["#040a15", "#1a2534", "#4a3a3c"],
};
function blend(w) {
  return [0, 1, 2].map((i) => {
    const c = new THREE.Color(0, 0, 0);
    for (const k in w) c.add(new THREE.Color(PALETTE[k][i]).multiplyScalar(w[k]));
    return c;
  });
}

const domeVertex = `
  varying vec3 dir;
  varying float screenY;
  void main() {
    dir = normalize((modelMatrix * vec4(position, 1.)).xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    screenY = gl_Position.y / gl_Position.w;
  }
`;
// An orthographic camera sends every ray the same way, so height in the sky comes from
// the screen, shifted by the camera's pitch; the sun glow follows its heading.
const domeFragment = `
  uniform vec3 zenith, horizon, glow, sun;
  uniform float pitch;
  varying vec3 dir;
  varying float screenY;
  void main() {
    vec3 d = normalize(dir);
    float h = screenY * .5 + .5 - .42 + (pitch + .45) * 1.4;
    vec3 col = mix(horizon, zenith, smoothstep(0., .6, h));
    float s = max(dot(normalize(vec3(d.x, 0., d.z)), normalize(vec3(sun.x, 0., sun.z))), 0.);
    col += glow * pow(s, 6.) * (1. - smoothstep(-.05, .45, h)) * .55;
    gl_FragColor = vec4(col, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const fwd = new THREE.Vector3();

export default function SkyWorld({ night, sunPos }) {
  const dome = useRef(), lean = useRef(0);
  const w = phaseWeights(night);
  const [zenith, horizon, glow] = blend(w);
  const sun = new THREE.Vector3(...sunPos).normalize();
  const domeU = useMemo(() => ({ zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, glow: { value: new THREE.Color() }, sun: { value: new THREE.Vector3() }, pitch: { value: 0 } }), []);

  useFrame(({ camera, pointer }, dt) => {
    dome.current.position.copy(camera.position);
    // The horizon leans a little toward the cursor, so the sky answers even without a drag.
    if (finePointer && !reduced) lean.current += (pointer.y * -0.03 - lean.current) * (1 - Math.exp(-dt * 2.5));
    const u = dome.current.material.uniforms;
    u.pitch.value = camera.getWorldDirection(fwd).y + lean.current;
    u.zenith.value.copy(zenith);
    u.horizon.value.copy(horizon);
    u.glow.value.copy(glow);
    u.sun.value.copy(sun);
  });

  return (
    <mesh ref={dome} renderOrder={-2} frustumCulled={false}>
      <sphereGeometry args={[150, 32, 16]} />
      <shaderMaterial uniforms={domeU} vertexShader={domeVertex} fragmentShader={domeFragment} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}
