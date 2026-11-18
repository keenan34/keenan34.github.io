import { useMemo } from "react";
import * as THREE from "three";
import RiverwalkTrees from "./RiverwalkTrees.jsx";

// Footprints leave sight lines between the two landmark towers and the station.
const blocks = [
  [-6.8,-2.2,1.5,1.7,3.5], [-6.2,-5.1,1.8,1.6,5.1],
  [-4.2,-5.8,1.6,1.45,4.3], [0.9,-5.8,1.45,1.4,6.4],
  [1.2,-2.5,1.35,1.5,3.2], [3.1,-3.4,1.4,1.6,4.8],
  [6.4,-3.4,1.45,1.65,3.3], [6.7,0,1.5,1.7,2.6],
];
function facade(index, floors) {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = floors * 14;
  const ctx = canvas.getContext("2d");
  const stone = ["#a49a81", "#746f65", "#8c8d83", "#717d79"][index % 4];
  ctx.fillStyle = stone;
  ctx.fillRect(0,0,96,canvas.height);
  for (let floor = 0; floor < floors; floor++) {
    ctx.fillStyle = "#514e49";
    ctx.fillRect(0,floor*14,96,2);
    for (let bay = 0; bay < 6; bay++) {
      const lit = (Math.sin(index * 80 + floor * 58.5 + bay * 19.2) * 43758.54 % 1) > 0.3;
      ctx.fillStyle = lit ? "#ffd897" : "#263740";
      ctx.fillRect(bay*16+4, floor*14+4, 9, 8);
      ctx.fillStyle = stone;
      ctx.fillRect(bay*16+8, floor*14+4, 1, 8);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  // Keep only occupied windows in the emission map.
  const glow = document.createElement("canvas");
  glow.width = canvas.width;
  glow.height = canvas.height;
  const g = glow.getContext("2d");
  g.drawImage(canvas,0,0);
  const pixels = g.getImageData(0,0,glow.width,glow.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (pixels.data[i] !== 255) pixels.data.fill(0,i,i+3);
  }
  g.putImageData(pixels,0,0);
  const emission = new THREE.CanvasTexture(glow);
  emission.colorSpace = THREE.SRGBColorSpace;
  return [texture, emission];
}

function Building({ block, index, night }) {
  const [x,z,w,d,h] = block;
  const [map, emission] = useMemo(() => facade(index, Math.round(h * 3)), [index,h]);
  return <group position={[x,0.1,z]}>
    <mesh position={[0,h/2,0]} castShadow receiveShadow>
      <boxGeometry args={[w,h,d]} />
      <meshStandardMaterial map={map} emissiveMap={emission} emissive="#ffd49a" emissiveIntensity={night*1.8} />
    </mesh>
    <mesh position={[0,h,0]}><boxGeometry args={[w+0.08,0.14,d+0.08]} /><meshStandardMaterial color="#b0a792" /></mesh>
    <mesh position={[0,h+0.16,0]}><boxGeometry args={[w*0.68,0.22,d*0.67]} /><meshStandardMaterial color="#817d72" /></mesh>
  </group>;
}

export default function RiverfrontBlocks({ night }) {
  return <>{blocks.map((block,index) => <Building key={index} block={block} index={index} night={night} />)}<RiverwalkTrees /></>;
}
