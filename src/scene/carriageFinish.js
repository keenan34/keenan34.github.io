import * as THREE from "three";

// One painted side per carriage. The second texture emits only through the glass.
export function carriageFinish() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;
  const emission = canvas.cloneNode();
  const g = canvas.getContext("2d");
  const light = emission.getContext("2d");
  light.fillStyle = "#000";
  light.fillRect(0, 0, 1024, 320);
  const steel = g.createLinearGradient(0, 0, 0, 320);
  [[0,"#99a6ac"],[.18,"#e0e1dc"],[.48,"#bdc2c0"],[.69,"#a1abae"],[.83,"#d6d6cf"],[1,"#828b91"]].forEach(([p,c]) => steel.addColorStop(p,c));
  g.fillStyle = steel;
  g.fillRect(0,0,1024,320);
  for (let y=208; y<311; y+=10) {
    g.fillStyle="#748086"; g.fillRect(0,y,1024,2);
    g.fillStyle="#dce0db"; g.fillRect(0,y+2,1024,2);
  }
  g.fillStyle="#284a77"; g.fillRect(0,174,1024,11);
  g.fillStyle="#a64440"; g.fillRect(0,188,1024,5);

  function window(x,y,w,h) {
    g.fillStyle="#283034"; g.beginPath(); g.roundRect(x-3,y-3,w+6,h+6,7); g.fill();
    const cabin=g.createLinearGradient(0,y,0,y+h);
    cabin.addColorStop(0,"#867a66"); cabin.addColorStop(.22,"#ffe6b4"); cabin.addColorStop(1,"#907751");
    for (const ctx of [g,light]) {
      ctx.fillStyle=cabin; ctx.beginPath(); ctx.roundRect(x,y,w,h,5); ctx.fill();
      ctx.fillStyle="#645847"; ctx.fillRect(x+w*.57,y+2,2,h-4);
      ctx.fillStyle="#685c50"; ctx.fillRect(x+5,y+h*.76,w*.34,h*.22);
    }
  }
  for (const x of [14,245,349,453,557,661,920]) window(x,57,87,95);
  for (const x of [117,777]) {
    g.fillStyle="#404b50"; g.fillRect(x,31,113,269);
    g.fillStyle="#9da7a8"; g.fillRect(x+4,35,105,261);
    g.fillStyle="#41494b"; g.fillRect(x+55,36,3,259);
    window(x+10,61,38,86); window(x+65,61,38,86);
  }
  return [canvas,emission].map(source => {
    const map=new THREE.CanvasTexture(source);
    map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=4;
    return map;
  });
}
