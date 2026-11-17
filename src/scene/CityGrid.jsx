import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// The rest of Chicago, far below the floating block, as a 1990s night photo taken
// from a plane: streets read as strings of individual lamps, mostly sodium orange
// with some side streets on blue-green mercury vapor, each lamp with a soft halo and
// a faint red film halation along the street. Blocks are dark with subtle tone
// variation and rare lit windows; cars drift along as faint streaks. Directly under
// the diorama is the empty, outlined lot it was lifted out of.
//
// Every width is anti-aliased in screen space (fwidth), so nothing shimmers or
// stair-steps at any zoom. Distance adds haze, then the plane fades into the CSS sky.
const vertexShader = /* glsl */ `
  varying vec2 vXZ;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vXZ = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vXZ;

  const float C = 14.0;                       // one block (12) plus its street (2)
  const float HOLE = 6.2;                     // half-size of the lifted lot
  const vec3 SODIUM = vec3(1.0, 0.67, 0.36);
  const vec3 SODIUM_HOT = vec3(1.0, 0.58, 0.28);
  const vec3 MERCURY = vec3(0.66, 0.90, 0.81);
  const vec3 HALATION = vec3(1.0, 0.32, 0.18);
  const vec3 BLOCK = vec3(0.030, 0.038, 0.068);
  const vec3 HAZE = vec3(0.060, 0.072, 0.115);

  float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1, 0)), u.x),
               mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), u.x), u.y);
  }

  // A street's lamps: two staggered rows at the curbs. Each lamp is a soft core whose
  // width never drops below a pixel (with its energy kept), plus a gentle halo.
  vec3 lampRow(float lat, float along, float S, float phase, vec3 tint, float k, float px) {
    vec3 c = vec3(0.0);
    for (int i = 0; i < 2; i++) {
      float side = i == 0 ? 1.0 : -1.0;
      float a = (fract(along / S + phase + 0.5 * float(i)) - 0.5) * S;
      float l = lat - side * 0.72;
      float d2 = a * a + l * l;
      float sig = max(0.06, 0.7 * px);
      float core = exp(-d2 / (2.0 * sig * sig)) * (0.06 * 0.06) / (sig * sig);
      float halo = exp(-d2 / (2.0 * 0.34 * 0.34)) * 0.16;
      c += tint * (core * 2.4 + halo) * k;
    }
    // Faint wash of light on the pavement and red film halation along the street.
    c += tint * exp(-lat * lat / (2.0 * 0.75 * 0.75)) * 0.035 * k;
    c += HALATION * exp(-lat * lat / (2.0 * 1.6 * 1.6)) * 0.02 * k;
    return c;
  }

  // Slow, soft head/taillight streaks, one lane each way.
  vec3 traffic(float along, float lat, float id, float px) {
    float speed = mix(0.7, 1.8, hash(id + 3.1));
    float dir = hash(id + 9.7) > 0.5 ? 1.0 : -1.0;
    float L = mix(9.0, 16.0, hash(id + 5.3));
    float w = max(0.05, 0.7 * px);
    vec3 col = vec3(0.0);
    float m1 = (fract((along - dir * uTime * speed) / L + hash(id)) - 0.5) * L;
    col += vec3(1.0, 0.95, 0.85) * exp(-m1 * m1 / 0.05) * exp(-pow(lat - 0.3, 2.0) / (2.0 * w * w)) * 0.55;
    float m2 = (fract((along + dir * uTime * speed * 0.8) / L + hash(id + 1.7)) - 0.5) * L;
    col += vec3(1.0, 0.16, 0.10) * exp(-m2 * m2 / 0.05) * exp(-pow(lat + 0.3, 2.0) / (2.0 * w * w)) * 0.45;
    return col;
  }

  void main() {
    vec2 p = vXZ;
    float px = length(fwidth(p));             // world units per screen pixel
    float r = length(p);

    // Streets sit halfway between block centres.
    float sx = p.x / C - 0.5, sz = p.y / C - 0.5;
    float nx = floor(sx + 0.5), nz = floor(sz + 0.5);
    float latX = (sx - nx) * C, latZ = (sz - nz) * C;
    float dX = abs(latX), dZ = abs(latZ);
    bool artX = mod(nx, 4.0) == 0.0, artZ = mod(nz, 4.0) == 0.0;

    // Blocks: dark, with gentle block-to-block and within-block tone variation.
    vec2 cell = floor(p / C + 0.5);
    vec3 col = BLOCK * (0.8 + 0.4 * hash2(cell)) * (0.85 + 0.3 * noise(p * 0.35));

    // Rare clusters of tiny lit windows.
    float inBlock = smoothstep(1.1, 1.5, min(dX, dZ));
    vec2 w = p * 3.0;
    float dot_ = 1.0 - smoothstep(0.06, 0.06 + 3.0 * px, length(fract(w) - 0.5) / 3.0);
    float cluster = smoothstep(0.62, 0.8, noise(p * 0.22 + 7.0));
    col += vec3(1.0, 0.78, 0.5) * dot_ * step(0.93, hash2(floor(w))) * cluster * inBlock * 0.22;

    // Streetlights. Arterials (every 4th street, the mile roads) are denser and warmer;
    // about a third of side streets are mercury vapor.
    vec3 lights = vec3(0.0);
    vec3 tX = artX ? SODIUM_HOT : (hash(nx + 0.37) < 0.42 ? MERCURY : SODIUM);
    vec3 tZ = artZ ? SODIUM_HOT : (hash(nz + 4.11) < 0.42 ? MERCURY : SODIUM);
    lights += lampRow(latX, p.y, artX ? 1.0 : 1.35, hash(nx), tX, artX ? 1.35 : 1.0, px) * smoothstep(2.2, 1.2, dX);
    lights += lampRow(latZ, p.x, artZ ? 1.0 : 1.35, hash(nz + 9.0), tZ, artZ ? 1.35 : 1.0, px) * smoothstep(2.2, 1.2, dZ);
    lights += SODIUM * exp(-(dX * dX + dZ * dZ) / 1.2) * 0.09;   // intersections

    // Milwaukee and Ogden, cutting diagonally across the grid.
    vec2 dm = normalize(vec2(1.0, 0.75)), dog = normalize(vec2(1.0, -0.9));
    float latM = dot(p, dm) - 38.0 / length(vec2(1.0, 0.75));
    float latO = dot(p, dog) + 46.0 / length(vec2(1.0, -0.9));
    lights += lampRow(latM, dot(p, vec2(-dm.y, dm.x)), 1.1, 0.0, SODIUM_HOT, 1.2, px) * smoothstep(2.2, 1.2, abs(latM));
    lights += lampRow(latO, dot(p, vec2(-dog.y, dog.x)), 1.1, 0.3, SODIUM_HOT, 1.2, px) * smoothstep(2.2, 1.2, abs(latO));

    // Traffic.
    lights += traffic(p.y, latX, nx, px) * smoothstep(1.0, 0.5, dX);
    lights += traffic(p.x, latZ, nz + 101.0, px) * smoothstep(1.0, 0.5, dZ);

    // The lot the block was lifted from: dark, empty, finely outlined.
    float edge = max(abs(p.x), abs(p.y));
    if (edge < HOLE) { col = vec3(0.010, 0.012, 0.022); lights *= 0.0; }
    float ow = max(0.04, 0.9 * px);
    lights += vec3(1.0, 0.86, 0.66) * exp(-pow(edge - HOLE, 2.0) / (2.0 * ow * ow)) * 1.1 * (0.04 / ow);
    lights += vec3(1.0, 0.7, 0.45) * exp(-pow(edge - HOLE, 2.0) / (2.0 * 0.35 * 0.35)) * 0.06;

    // Soft highlight roll-off, like film, then haze with distance.
    col += 1.0 - exp(-lights * 1.4);
    col = mix(col, HAZE, smoothstep(14.0, 58.0, r) * 0.65);

    // A hair of dither so the dark gradients don't band.
    col += (hash2(gl_FragCoord.xy) - 0.5) / 255.0;

    float alpha = smoothstep(64.0, 22.0, r) * 0.96;
    gl_FragColor = vec4(col, alpha);
  }
`;

export default function CityGrid({ paused }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useFrame((_, dt) => {
    if (!paused) material.uniforms.uTime.value += dt;
  });

  return (
    <mesh position={[0, -9, 0]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[200, 200]} />
    </mesh>
  );
}
