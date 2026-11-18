import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { farBank, nearBank } from "./riverfront.js";

const sites = [
  ...[-7,-5.9,-3.6,2.2,4.4,6.6,7.5].map(x => [x,farBank(x)-0.55]),
  ...[-1.9,0,1.3,5.8,7.3].map(x => [x,nearBank(x)+0.65]),
];

const branchCount = sites.length * (1 + 11 * (1 + 4));
const leafCount = sites.length * 11 * 4 * 24;

function growTrees(wood, foliage) {
  let seed=9741;
  const random=() => ((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  let branch = 0, leaf = 0;
  const color = new THREE.Color();
  const up=new THREE.Vector3(0,1,0);
  const transform=new THREE.Object3D();
  function limb(a,b,radius) {
    const direction=b.clone().sub(a);
    transform.position.copy(a).lerp(b,.5);
    transform.scale.set(radius,direction.length(),radius);
    transform.quaternion.setFromUnitVectors(up,direction.normalize());
    transform.updateMatrix();
    wood.setMatrixAt(branch++, transform.matrix);
  }
  for(const [x,z] of sites) {
    const size=.82+random()*.42;
    const base=new THREE.Vector3(x,.13,z);
    const fork=base.clone().add(new THREE.Vector3((random()-.5)*.15,size*.8,(random()-.5)*.15));
    limb(base,fork,.065*size);
    const phase=random()*Math.PI*2;
    for(let i=0;i<11;i++) {
      const angle=phase+i*2.4;
      const spread=(.2+.48*(1-i/12))*size;
      const joint=fork.clone().add(new THREE.Vector3(Math.cos(angle)*spread,.32*size+i*.05*size,Math.sin(angle)*spread));
      limb(fork,joint,.028*size);
      for(let j=0;j<4;j++) {
        const yaw=angle+(random()-.5)*2.5;
        const tip=joint.clone().add(new THREE.Vector3(.27*Math.cos(yaw),.21+random()*.18,.27*Math.sin(yaw)).multiplyScalar(size));
        limb(joint,tip,.012*size);
        for(let k=0;k<24;k++) {
          const a=random()*Math.PI*2, v=random()*2-1, r=.28*Math.cbrt(random())*size;
          const radial=r*Math.sqrt(1-v*v);
          transform.position.set(tip.x+Math.cos(a)*radial,tip.y+r*v,tip.z+Math.sin(a)*radial);
          transform.rotation.set(random()*2,random()*Math.PI*2,random()*2);
          transform.scale.setScalar((.068+random()*.055)*size);
          transform.updateMatrix();
          color.setHSL(.19+random()*.048,.32+random()*.18,.18+random()*.16,THREE.SRGBColorSpace);
          foliage.setColorAt(leaf, color);
          foliage.setMatrixAt(leaf++, transform.matrix);
        }
      }
    }
  }
}

export default function RiverwalkTrees() {
  const wood=useRef(), foliage=useRef();
  const blade=useMemo(()=>{
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute([0,0,0,-.32,.48,0,0,.46,.13,.32,.48,0,0,1,0],3));
    g.setIndex([0,2,1,0,3,2,1,2,4,2,3,4]);
    g.computeVertexNormals();
    return g;
  },[]);
  useLayoutEffect(()=>{
    growTrees(wood.current, foliage.current);
    for(const mesh of [wood.current,foliage.current]) {
      mesh.instanceMatrix.needsUpdate=true;
      mesh.computeBoundingSphere();
    }
    foliage.current.instanceColor.needsUpdate=true;
  },[]);
  return <>
    <instancedMesh ref={wood} args={[undefined,undefined,branchCount]} castShadow>
      <cylinderGeometry args={[.62,1,1,6]} /><meshStandardMaterial color="#645242" roughness={1} />
    </instancedMesh>
    <instancedMesh ref={foliage} args={[blade,undefined,leafCount]} castShadow receiveShadow>
      <meshStandardMaterial side={THREE.DoubleSide} roughness={.86} />
    </instancedMesh>
  </>;
}
