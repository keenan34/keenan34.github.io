import { ctaLogo, ctaNameplate, ctaArrivalBoard } from "./ctaArt.js";
import Glow from "./Glow.jsx";

// An 'L' platform on the far side of the tracks: deck with the blue edge strip,
// a canopy, a CTA roundel, the station nameplate and an LED arrival board.
// Coordinates are local to the track group (track centered at z = 0, deck at y).
const STEEL = "#475569";

export default function Station({ x = -2.6, y, onOpen }) {
  const zDeck = -0.98;
  const len = 4.4;
  const point = (on) => (document.body.style.cursor = on ? "pointer" : "");

  // The whole station is part of the Projects landmark, like the train.
  return (
    <group
      position={[x, 0, 0]}
      onClick={(e) => { e.stopPropagation(); point(false); onOpen?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); point(true); }}
      onPointerOut={() => point(false)}
    >
      {/* Deck and its supports down to the lot. */}
      <mesh position={[0, y + 0.14, zDeck]}>
        <boxGeometry args={[len, 0.12, 0.72]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} />
      </mesh>
      <mesh position={[0, y + 0.205, zDeck + 0.32]}>
        <boxGeometry args={[len, 0.02, 0.08]} />
        <meshStandardMaterial color="#00a1de" emissive="#00a1de" emissiveIntensity={0.35} />
      </mesh>
      {[-1.8, 1.8].map((px) => (
        <mesh key={px} position={[px, y / 2, zDeck]}>
          <boxGeometry args={[0.16, y, 0.16]} />
          <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.6} />
        </mesh>
      ))}

      {/* Canopy: back posts and a roof sloping toward the track. */}
      {[-1.9, 0, 1.9].map((px) => (
        <mesh key={px} position={[px, y + 1.15, zDeck - 0.28]}>
          <boxGeometry args={[0.08, 1.9, 0.08]} />
          <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, y + 2.12, zDeck + 0.02]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[len + 0.2, 0.06, 0.95]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Station nameplate on the canopy edge. */}
      <mesh position={[-1.05, y + 1.92, zDeck + 0.48]}>
        <planeGeometry args={[1.7, 0.27]} />
        <meshStandardMaterial map={ctaNameplate()} emissiveMap={ctaNameplate()} emissive="#ffffff" emissiveIntensity={0.6} />
      </mesh>

      {/* CTA roundel on the middle post. */}
      <mesh position={[0, y + 1.25, zDeck - 0.23]}>
        <circleGeometry args={[0.24, 40]} />
        <meshStandardMaterial map={ctaLogo()} emissiveMap={ctaLogo()} emissive="#ffffff" emissiveIntensity={0.4} />
      </mesh>

      {/* LED arrival board, mounted on the canopy edge so the passing train never hides it. */}
      <group position={[0.9, y + 2.72, zDeck + 0.3]}>
        {[-0.85, 0.85].map((hx) => (
          <mesh key={hx} position={[hx, -0.5, -0.05]}>
            <boxGeometry args={[0.05, 0.3, 0.05]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        ))}
        <mesh>
          <boxGeometry args={[2.36, 0.98, 0.1]} />
          <meshStandardMaterial color="#0b0b0b" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.052]}>
          <planeGeometry args={[2.24, 0.91]} />
          <meshStandardMaterial map={ctaArrivalBoard()} emissiveMap={ctaArrivalBoard()} emissive="#ffffff" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        <Glow position={[0, 0, -0.2]} color="#ffd9a0" size={3.4} opacity={0.32} />
      </group>
    </group>
  );
}
