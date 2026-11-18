import * as THREE from "three";

// All shoreline pieces sample the same channel so steps, water and bridges meet.
export const channel = (x) => 3.35 + 0.055 * (x + 3) ** 2;
export const halfWidth = (x) => 2.1 + 0.18 * Math.cos(x * 0.4);
export const farBank = (x) => channel(x) - halfWidth(x);
export const nearBank = (x) => channel(x) + halfWidth(x);
export const lamps = [
  [-5.4, farBank(-5.4) - 0.22], [0.7, farBank(0.7) - 0.22],
  [5.8, farBank(5.8) - 0.22], [2, nearBank(2) + 0.22],
  [6.9, nearBank(6.9) + 0.22],
];
export const beanPosition = [4, 0.14, nearBank(4) + 1.95];
export const trackZ = (x) => 0.48 + 0.075 * Math.max(0, x) ** 2;
export const trackYaw = (x) => -Math.atan(0.15 * Math.max(0, x));

// Build a solid ribbon with a shallow vertical edge and a level walking surface.
export function ribbon(start, end, inner, outer, height, depth) {
  const shape = new THREE.Shape();
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const x = start + (end - start) * i / segments;
    if (i === 0) shape.moveTo(x, -inner(x));
    else shape.lineTo(x, -inner(x));
  }
  for (let i = segments; i >= 0; i--) {
    const x = start + (end - start) * i / segments;
    shape.lineTo(x, -outer(x));
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, height - depth, 0);
  return geometry;
}
