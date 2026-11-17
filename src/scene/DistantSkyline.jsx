import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sky } from "./timeOfDay.js";
import Glow from "./Glow.jsx";

// The rest of downtown, far behind the block: dark, hazy silhouettes standing on the
// grid. They sit on an arc opposite every camera angle the visitor can rotate to, so
// they're always behind the diorama. Their shader fades them into the sky with height,
// like an out-of-focus background, with rare dim windows at night.
const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uNight;
  uniform vec3 uHaze;
  varying vec3 vWorld;
  varying vec3 vNormal;
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 body = mix(vec3(0.30, 0.33, 0.37), vec3(0.028, 0.034, 0.055), uNight);
    // A hint of form: tops and the sun-facing side a touch lighter.
    body *= 0.85 + 0.25 * max(vNormal.y, 0.0) + 0.1 * max(-vNormal.x, 0.0);
    // Rare dim windows on the facades, only at night.
    vec2 g = vec2(vWorld.x + vWorld.z, vWorld.y) * vec2(2.4, 2.8);
    vec2 f = abs(fract(g) - 0.5);
    float win = step(f.x, 0.22) * step(f.y, 0.2) * step(0.955, hash2(floor(g))) * (1.0 - abs(vNormal.y));
    body += vec3(1.0, 0.75, 0.45) * win * 0.3 * uNight;
    // Out of focus: mostly haze already, dissolving further as the towers rise.
    // (The camera is orthographic, so distance can only read through haze.)
    float haze = 0.35 + smoothstep(-4.0, 12.0, vWorld.y) * 0.4;
    // Bases dissolve into the city haze, so they rise out of it with no hard edge.
    float alpha = smoothstep(-8.5, -1.0, vWorld.y) * 0.9;
    gl_FragColor = vec4(mix(body, uHaze, haze), alpha);
  }
`;

const HAZE_DAY = new THREE.Color("#a8b5c3");
const HAZE_DUSK = new THREE.Color("#4a3560");
const HAZE_NIGHT = new THREE.Color("#1a2236");

// Seeded so the skyline is the same on every visit.
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function useTowers() {
  return useMemo(() => {
    const rnd = seeded(42);
    const towers = [];
    const count = 13;
    for (let i = 0; i < count; i++) {
      // A tight cluster straight behind the block from the default view (225°,
      // measured from +z toward +x): a backdrop that peeks out around the towers.
      const a = THREE.MathUtils.degToRad(200 + (50 * i) / (count - 1) + (rnd() - 0.5) * 4);
      const R = 19 + rnd() * 6;
      const h = 9 + Math.pow(rnd(), 1.4) * 9;
      const w = 0.9 + rnd() * 0.9;
      const kind = rnd() < 0.2 ? "stepped" : rnd() < 0.25 ? "tapered" : "box";
      towers.push({ x: Math.sin(a) * R, z: Math.cos(a) * R, h, w, kind });
    }
    return towers;
  }, []);
}

export default function DistantSkyline() {
  const towers = useTowers();
  const material = useMemo(
    () => new THREE.ShaderMaterial({
      uniforms: { uNight: { value: sky.night }, uHaze: { value: new THREE.Color() } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    }),
    [],
  );

  useFrame(() => {
    const n = sky.night;
    material.uniforms.uNight.value = n;
    const haze = material.uniforms.uHaze.value;
    if (n < 0.5) haze.copy(HAZE_DAY).lerp(HAZE_DUSK, n * 2);
    else haze.copy(HAZE_DUSK).lerp(HAZE_NIGHT, (n - 0.5) * 2);
  });

  const tallest = [...towers].sort((a, b) => b.h - a.h).slice(0, 2);
  const base = -9;

  return (
    <group>
      {towers.map((t, i) => (
        <group key={i} position={[t.x, base, t.z]}>
          {t.kind === "tapered" ? (
            <mesh position={[0, t.h / 2, 0]} rotation={[0, Math.PI / 4, 0]} material={material}>
              <cylinderGeometry args={[t.w * 0.45, t.w * 0.72, t.h, 4]} />
            </mesh>
          ) : (
            <mesh position={[0, t.h / 2, 0]} material={material}>
              <boxGeometry args={[t.w, t.h, t.w]} />
            </mesh>
          )}
          {t.kind === "stepped" && (
            <mesh position={[0, t.h + t.h * 0.18, 0]} material={material}>
              <boxGeometry args={[t.w * 0.6, t.h * 0.36, t.w * 0.6]} />
            </mesh>
          )}
        </group>
      ))}
      {/* Slow red aircraft beacons on the two tallest. */}
      {tallest.map((t, i) => (
        <Glow key={i} position={[t.x, base + t.h * (t.kind === "stepped" ? 1.36 : 1) + 0.2, t.z]} color="#ff3b4a" size={0.6} opacity={0.6} />
      ))}
    </group>
  );
}
