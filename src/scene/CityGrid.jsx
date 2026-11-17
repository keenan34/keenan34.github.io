import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// The rest of Chicago, far below the floating block: a night street grid drawn in one
// shader. Streets glow sodium-amber, every 4th is a brighter arterial (the mile roads),
// two diagonals cut across like Milwaukee and Ogden, cars crawl along the lanes, and
// directly under the diorama is the empty, outlined lot it was lifted out of.
// The plane fades to transparent at its edges so it dissolves into the CSS sky.
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

  const float C = 14.0;          // one block (12) plus its street (2)
  const float HOLE = 6.2;        // half-size of the lifted lot
  const vec3 SODIUM = vec3(1.0, 0.62, 0.29);
  const vec3 BLOCK = vec3(0.045, 0.06, 0.115);

  float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  // Glow of a street centred at distance d, with a bright core and a soft halo.
  float streetGlow(float d, float strength) {
    return (exp(-d * d * 5.0) * 0.12 + smoothstep(0.08, 0.0, d) * 0.5) * strength;
  }

  // Cars on one street: headlights one way in one lane, taillights the other way.
  vec3 traffic(float along, float lateral, float id) {
    float speed = mix(1.6, 3.8, hash(id + 3.1));
    float dir = hash(id + 9.7) > 0.5 ? 1.0 : -1.0;
    float L = mix(7.0, 12.0, hash(id + 5.3));
    vec3 col = vec3(0.0);
    // Lane 1: white headlights.
    float m1 = fract((along - dir * uTime * speed) / L + hash(id)) - 0.5;
    float c1 = exp(-pow(m1 * L, 2.0) * 10.0) * exp(-pow(lateral - 0.32, 2.0) * 90.0);
    col += vec3(1.0, 0.96, 0.85) * c1 * 1.4;
    // Lane 2: red taillights, opposite direction.
    float m2 = fract((along + dir * uTime * speed * 0.8) / L + hash(id + 1.7)) - 0.5;
    float c2 = exp(-pow(m2 * L, 2.0) * 10.0) * exp(-pow(lateral + 0.32, 2.0) * 90.0);
    col += vec3(1.0, 0.18, 0.12) * c2 * 1.2;
    return col;
  }

  void main() {
    vec2 p = vXZ;
    float r = length(p);

    // Streets sit halfway between block centres.
    float sx = p.x / C - 0.5, sz = p.y / C - 0.5;
    float nx = floor(sx + 0.5), nz = floor(sz + 0.5);
    float latX = (sx - nx) * C, latZ = (sz - nz) * C;   // signed offset from each street
    float dX = abs(latX), dZ = abs(latZ);
    float artX = mod(nx, 4.0) == 0.0 ? 1.9 : 1.0;
    float artZ = mod(nz, 4.0) == 0.0 ? 1.9 : 1.0;

    vec3 col = BLOCK;
    float light = streetGlow(dX, artX) + streetGlow(dZ, artZ);
    light += exp(-(dX * dX + dZ * dZ) * 2.5) * 0.45;     // intersections

    // Alleys down the middle of each block, much dimmer.
    float ax = abs(fract(p.x / C + 0.5) - 0.5) * C;
    light += exp(-ax * ax * 40.0) * 0.06;

    // Diagonal avenues.
    float milwaukee = abs(p.x + p.y * 0.75 - 38.0) / 1.25;
    float ogden = abs(p.x - p.y * 0.9 + 46.0) / 1.345;
    light += streetGlow(milwaukee, 1.6) + streetGlow(ogden, 1.6);

    col += SODIUM * light;

    // Sparse pinpoint lights on the rooftops.
    vec2 w = p * 2.2;
    float pin = smoothstep(0.14, 0.04, length(fract(w) - 0.5));
    float inBlock = step(1.2, min(dX, dZ));
    col += vec3(1.0, 0.8, 0.5) * step(0.975, hash2(floor(w))) * pin * 0.45 * inBlock;

    // Traffic on the street lines.
    col += traffic(p.y, latX, nx) * smoothstep(0.7, 0.3, dX);
    col += traffic(p.x, latZ, nz + 101.0) * smoothstep(0.7, 0.3, dZ);

    // The lot the block was lifted from: dark, empty, with a thin glowing outline.
    float edge = max(abs(p.x), abs(p.y));
    if (edge < HOLE) col = vec3(0.012, 0.016, 0.032);
    col += vec3(1.0, 0.85, 0.62) * exp(-pow(edge - HOLE, 2.0) * 70.0) * 0.75;

    float alpha = smoothstep(62.0, 18.0, r) * 0.95;
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
