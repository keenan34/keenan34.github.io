import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { farBank, nearBank, lamps, ribbon } from "./riverfront.js";

const vertexShader = `
  varying vec3 world;
  void main() {
    world = (modelMatrix * vec4(position, 1.)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.);
  }
`;
const fragmentShader = `
  uniform float time, night;
  uniform vec2 lamps[5];
  varying vec3 world;
  void main() {
    vec2 p = world.xz;
    float drift = sin(p.x * 2.1 + p.y * 1.4 + time * .3);
    float wave = sin(p.y * 32. + drift * 3. + time) + 0.5 * sin(p.x * 3. - p.y * 41. - time * .8)
               + 0.6 * sin(p.x * 9. + time * 1.6);
    vec3 water = mix(vec3(.026,.23,.17), vec3(.004,.071,.052), night);
    water += vec3(.006,.018,.013) * (0.5 + 0.5 * sin(p.y * 11. + wave));
    vec2 sight = normalize(vec2(viewMatrix[0][2], viewMatrix[2][2]));
    for (int i = 0; i < 5; i++) {
      vec2 d = p - lamps[i];
      float along = dot(d, sight);
      float crosswise = abs(dot(d, vec2(-sight.y,sight.x)) + .09 * wave);
      float shaft = exp(-crosswise * (7. - min(abs(along),3.))) * exp(-abs(along)*.8);
      float ripple = smoothstep(-.2,1.1,wave);
      water += vec3(1.0,.65,.26) * shaft * ripple * (.08 + 2.8 * night);
    }
    // White water where it wells in under the lock.
    float foam = smoothstep(7.2, 7.9, p.x);
    water = mix(water, vec3(.85,.92,.9) * (1. - .45 * night), foam * smoothstep(-.3, 1.2, wave) * .7);
    gl_FragColor = vec4(water, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default function River({ paused, night }) {
  const material = useRef();
  const geometry = useMemo(() => ribbon(-8.3, 8.3, farBank, nearBank, -0.36, 0.015), []);
  const uniforms = useMemo(() => ({
    time: { value: 0 }, night: { value: night },
    lamps: { value: lamps.map(([x,z]) => new THREE.Vector2(x,z)) },
  }), []);
  useFrame((_, dt) => {
    material.current.uniforms.night.value = night;
    if (!paused) material.current.uniforms.time.value += Math.min(dt, 0.06);
  });
  return <mesh geometry={geometry}><shaderMaterial ref={material} uniforms={uniforms}
    vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} /></mesh>;
}
