import { useMemo } from "react";
import * as THREE from "three";

// The Sears (Willis) Tower: nine square tubes bundled 3×3 that step back at 50, 66,
// 90 and 108 floors, black glass with lit windows, and the two white antennas.
export const TOWER = { x: -1.6, z: -3.4, base: 0.1 };
export const FLOOR = 0.085;   // 108 floors ≈ 9.2 units
const T = 1;                  // tube width

// Floors per tube, back row first (−z) to front row (+z), left (−x) to right (+x).
const FLOORS = [
  [66, 108, 90],
  [90, 108, 90],
  [50, 66, 50],
];

// A 16-floor, 4-bay window tile with a fixed pseudo-random lit pattern.
function windowTile(seed) {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#101218";
  g.fillRect(0, 0, 32, 64);
  let s = seed;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 4; x++) {
      const v = rnd();
      g.fillStyle = v > 0.93 ? "#fff6d6" : v > 0.55 ? "#e8b765" : "#1f2430";
      g.fillRect(x * 8 + 2, y * 4 + 1, 4, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

function useTubeMaterials() {
  return useMemo(() => {
    const roof = new THREE.MeshStandardMaterial({ color: "#1c1f26", roughness: 0.6, metalness: 0.4 });
    const tiles = [windowTile(7), windowTile(23), windowTile(61)];
    return FLOORS.map((row, r) =>
      row.map((floors, c) => {
        const map = tiles[(r * 3 + c) % tiles.length].clone();
        map.repeat.set(1, floors / 16);
        map.needsUpdate = true;
        const side = new THREE.MeshStandardMaterial({
          color: "#ffffff",
          map,
          emissiveMap: map,
          emissive: "#ffffff",
          emissiveIntensity: 0.85,
          roughness: 0.35,
          metalness: 0.5,
        });
        // Box face order: +x, −x, +y, −y, +z, −z.
        return [side, side, roof, roof, side, side];
      }),
    );
  }, []);
}

function Antenna({ position, height }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.06, height, 8]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, height + 0.04, 0]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color="#ef3340" emissive="#ef3340" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function Tower() {
  const materials = useTubeMaterials();
  const top = 108 * FLOOR;

  return (
    <group position={[TOWER.x, TOWER.base, TOWER.z]}>
      {/* Lobby podium with a lit ground floor. */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[3.5, 0.6, 3.5]} />
        <meshStandardMaterial color="#15171d" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.25, 1.755]}>
        <boxGeometry args={[3.2, 0.32, 0.02]} />
        <meshStandardMaterial color="#ffd38a" emissive="#ffc46b" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>

      {FLOORS.map((row, r) =>
        row.map((floors, c) => {
          const h = floors * FLOOR;
          return (
            <group key={`${r}${c}`} position={[(c - 1) * T, 0, (r - 1) * T]}>
              <mesh position={[0, h / 2, 0]} material={materials[r][c]}>
                <boxGeometry args={[T, h, T]} />
              </mesh>
              {/* Dark mechanical band at each setback. */}
              <mesh position={[0, h - 0.06, 0]}>
                <boxGeometry args={[T + 0.02, 0.12, T + 0.02]} />
                <meshStandardMaterial color="#0b0c10" roughness={0.7} />
              </mesh>
            </group>
          );
        }),
      )}

      {/* The twin antennas on the two 108-floor tubes. */}
      <Antenna position={[0.1, top, -0.9]} height={2.3} />
      <Antenna position={[0.1, top, 0.1]} height={2.0} />
    </group>
  );
}
