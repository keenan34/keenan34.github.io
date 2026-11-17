import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sky } from "./timeOfDay.js";

// Gentle Chicago weather around the block: snow December–March, light rain otherwise.
// `?weather=snow|rain|none` forces it. Kept sparse and small so it never competes with
// the diorama; at night the particles are additive, so they catch the city's light.
const forced = new URLSearchParams(location.search).get("weather");
const month = new Date().getMonth();
const KIND = forced ?? (month === 11 || month <= 2 ? "snow" : "rain");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// The volume the weather fills, around and above the block.
const X = 18, Y0 = -9, Y1 = 22;

function softDot() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

const rand = (a, b) => a + Math.random() * (b - a);

function Snow({ paused }) {
  const N = 1200;
  const { geometry, material, phase, speed } = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const phase = new Float32Array(N), speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos.set([rand(-X, X), rand(Y0, Y1), rand(-X, X)], i * 3);
      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = rand(0.5, 1.1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const material = new THREE.PointsMaterial({
      map: softDot(), size: 4, sizeAttenuation: false, transparent: true,
      depthWrite: false, color: "#fff4e6",
    });
    return { geometry, material, phase, speed };
  }, []);
  const t = useRef(0);

  useFrame((_, dt) => {
    const night = sky.night;
    material.blending = night > 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending;
    material.opacity = 0.5 + night * 0.35;
    material.color.set(night > 0.5 ? "#ffe9cc" : "#ffffff");
    if (paused) return;
    t.current += dt;
    const p = geometry.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3] += Math.sin(t.current * 0.6 + phase[i]) * 0.25 * dt;
      p[i * 3 + 1] -= speed[i] * dt;
      if (p[i * 3 + 1] < Y0) p[i * 3 + 1] = Y1;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

function Rain({ paused }) {
  const N = 900, LEN = 0.55, WIND = -0.12;
  const { geometry, material, speed } = useMemo(() => {
    const pos = new Float32Array(N * 6);
    const speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = rand(-X, X), y = rand(Y0, Y1), z = rand(-X, X);
      pos.set([x, y, z, x - WIND * LEN, y + LEN, z], i * 6);
      speed[i] = rand(11, 16);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const material = new THREE.LineBasicMaterial({ color: "#c9d6ee", transparent: true, depthWrite: false });
    return { geometry, material, speed };
  }, []);

  useFrame((_, dt) => {
    const night = sky.night;
    material.blending = night > 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending;
    material.opacity = 0.16 + night * 0.12;
    material.color.set(night > 0.5 ? "#ffd9b0" : "#c9d6ee");
    if (paused) return;
    const p = geometry.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const dy = speed[i] * dt;
      let y = p[i * 6 + 1] - dy;
      let x = p[i * 6] + WIND * dy;
      if (y < Y0) { y = Y1; x = rand(-X, X); }
      p[i * 6] = x; p[i * 6 + 1] = y;
      p[i * 6 + 3] = x - WIND * LEN; p[i * 6 + 4] = y + LEN;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}

export default function Weather({ paused }) {
  if (reduced || KIND === "none") return null;
  return KIND === "snow" ? <Snow paused={paused} /> : <Rain paused={paused} />;
}
