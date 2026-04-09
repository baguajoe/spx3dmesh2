import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import "../../styles/world-generators.css";

const FORMATIONS = ["Random","Grid","Circle","March","Street","Concert","Stadium"];

const SKIN_TONES = [
  "#FDBCB4","#F1C27D","#E0AC69","#C68642","#8D5524",
  "#4A2C0A","#FFCBA4","#F4A460","#DEB887","#A0522D",
  "#FFE0BD","#FFCD94","#EAC086","#C49A6C","#7D4427",
];

const STYLES = ["casual","formal","sporty","dress","jacket"];

function buildPerson(scene, ox, oz, scale, skinTone) {
  const ms = [];
  const skin = new THREE.Color(skinTone);
  const style = STYLES[Math.floor(Math.random()*STYLES.length)];
  const isFemale = Math.random() > 0.5;
  const h1=Math.floor(Math.random()*360), h2=(h1+30+Math.floor(Math.random()*180))%360;
  const topColor    = new THREE.Color(`hsl(${h1},${40+Math.floor(Math.random()*40)}%,${30+Math.floor(Math.random()*30)}%)`);
  const bottomColor = new THREE.Color(`hsl(${h2},${30+Math.floor(Math.random()*30)}%,${25+Math.floor(Math.random()*25)}%)`);
  const shoeColor   = new THREE.Color(`hsl(${Math.floor(Math.random()*40)},20%,${15+Math.floor(Math.random()*20)}%)`);
  const hairColors  = ["#1a0a00","#2c1503","#5a3310","#8B4513","#C19A6B","#F4C2A1","#E8E8E8","#111111","#333333","#8a0000","#2a2a5a"];
  const hairColor   = new THREE.Color(hairColors[Math.floor(Math.random()*hairColors.length)]);
  const s = scale;

  const add = (geo, x, y, z, color, r=0.75, me=0.0) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color,roughness:r,metalness:me}));
    m.position.set(ox+x,y,oz+z); m.castShadow=true; scene.add(m); ms.push(m); return m;
  };

  add(new THREE.BoxGeometry(0.12*s,0.07*s,0.20*s), -0.095*s, 0.04*s, 0.02*s, shoeColor, 0.9);
  add(new THREE.BoxGeometry(0.12*s,0.07*s,0.20*s),  0.095*s, 0.04*s, 0.02*s, shoeColor, 0.9);

  if (isFemale&&style==="dress") {
    add(new THREE.CylinderGeometry(0.22*s,0.28*s,0.55*s,10), 0, 0.55*s, 0, topColor);
  } else {
    add(new THREE.CylinderGeometry(0.075*s,0.068*s,0.44*s,8), -0.095*s, 0.62*s, 0, bottomColor);
    add(new THREE.CylinderGeometry(0.068*s,0.062*s,0.42*s,8), -0.095*s, 0.20*s, 0, bottomColor);
    add(new THREE.CylinderGeometry(0.075*s,0.068*s,0.44*s,8),  0.095*s, 0.62*s, 0, bottomColor);
    add(new THREE.CylinderGeometry(0.068*s,0.062*s,0.42*s,8),  0.095*s, 0.20*s, 0, bottomColor);
  }

  add(new THREE.BoxGeometry(0.30*s,0.20*s,0.20*s), 0, 0.93*s, 0, bottomColor);
  const torsoW=isFemale?0.28*s:0.32*s;
  add(new THREE.BoxGeometry(torsoW,0.46*s,0.22*s), 0, 1.22*s, 0, topColor);

  if (style==="jacket"||style==="formal") {
    const jacketColor=new THREE.Color(`hsl(${Math.floor(Math.random()*30)+200},20%,${20+Math.floor(Math.random()*20)}%)`);
    add(new THREE.BoxGeometry(torsoW*1.08,0.46*s,0.24*s), 0, 1.22*s, 0, jacketColor, 0.6);
    add(new THREE.BoxGeometry(0.06*s,0.25*s,0.04*s), -0.08*s, 1.28*s, 0.12*s, new THREE.Color(0xffffff), 0.5);
    add(new THREE.BoxGeometry(0.06*s,0.25*s,0.04*s),  0.08*s, 1.28*s, 0.12*s, new THREE.Color(0xffffff), 0.5);
  }

  const armColor=(style==="jacket"||style==="formal")?new THREE.Color(`hsl(${Math.floor(Math.random()*30)+200},20%,25%)`):topColor;
  add(new THREE.CylinderGeometry(0.055*s,0.05*s,0.38*s,7), -0.215*s, 1.18*s, 0, armColor);
  add(new THREE.CylinderGeometry(0.05*s,0.045*s,0.34*s,7), -0.215*s, 0.80*s, 0, skin);
  add(new THREE.CylinderGeometry(0.055*s,0.05*s,0.38*s,7),  0.215*s, 1.18*s, 0, armColor);
  add(new THREE.CylinderGeometry(0.05*s,0.045*s,0.34*s,7),  0.215*s, 0.80*s, 0, skin);
  add(new THREE.SphereGeometry(0.055*s,7,6), -0.215*s, 0.62*s, 0, skin);
  add(new THREE.SphereGeometry(0.055*s,7,6),  0.215*s, 0.62*s, 0, skin);
  add(new THREE.CylinderGeometry(0.056*s,0.062*s,0.13*s,8), 0, 1.56*s, 0, skin);

  const headScale=0.9+Math.random()*0.2;
  add(new THREE.SphereGeometry(0.13*s*headScale,12,10), 0, 1.73*s, 0, skin);
  add(new THREE.SphereGeometry(0.022*s,6,5), -0.048*s, 1.76*s, 0.125*s, new THREE.Color(0x111111));
  add(new THREE.SphereGeometry(0.022*s,6,5),  0.048*s, 1.76*s, 0.125*s, new THREE.Color(0x111111));
  add(new THREE.SphereGeometry(0.018*s,5,4), 0, 1.72*s, 0.128*s, skin, 0.9);
  add(new THREE.BoxGeometry(0.055*s,0.012*s,0.01*s), 0, 1.665*s, 0.128*s, new THREE.Color(0x8a3020));

  const hairStyle=Math.floor(Math.random()*3);
  if (hairStyle===0) add(new THREE.SphereGeometry(0.135*s*headScale,12,7,0,Math.PI*2,0,Math.PI*0.5), 0, 1.83*s, 0, hairColor);
  else if (hairStyle===1) add(new THREE.SphereGeometry(0.138*s*headScale,12,8,0,Math.PI*2,0,Math.PI*0.65), 0, 1.80*s, -0.01*s, hairColor);
  else add(new THREE.SphereGeometry(0.136*s*headScale,12,8,0,Math.PI*2,0,Math.PI*0.75), 0, 1.78*s, 0, hairColor);

  if (style==="sporty"&&Math.random()>0.5) {
    add(new THREE.CylinderGeometry(0.145*s*headScale,0.145*s*headScale,0.06*s,12), 0, 1.86*s, 0, topColor, 0.8);
    add(new THREE.BoxGeometry(0.14*s,0.04*s,0.08*s), 0, 1.83*s, 0.15*s, topColor, 0.8);
  }
  if (style==="formal"&&Math.random()>0.6) {
    add(new THREE.BoxGeometry(0.04*s,0.28*s,0.02*s), 0, 1.15*s, 0.12*s, new THREE.Color(`hsl(${Math.floor(Math.random()*360)},70%,40%)`));
  }

  return ms;
}

function getPositions(formation, count, spread) {
  const pos=[], sp=spread*2+2;
  if(formation==="Grid"){const cols=Math.ceil(Math.sqrt(count));for(let i=0;i<count;i++)pos.push([(i%cols-cols/2)*sp,Math.floor(i/cols)*sp-cols/2*sp]);}
  else if(formation==="Circle"){for(let i=0;i<count;i++){const a=i/count*Math.PI*2,r=sp*count*0.12;pos.push([Math.cos(a)*r,Math.sin(a)*r]);}}
  else if(formation==="March"){const c=Math.max(2,Math.floor(Math.sqrt(count)*0.6));for(let i=0;i<count;i++)pos.push([(i%c-c/2)*sp*0.8,Math.floor(i/c)*sp]);}
  else if(formation==="Concert"){for(let i=0;i<count;i++){const a=(Math.random()-0.5)*Math.PI*1.2,r=sp*(1+Math.random())*count*0.08;pos.push([Math.cos(a)*r,Math.sin(a)*r*0.5]);}}
  else if(formation==="Stadium"){let p=0;const ri=Math.ceil(Math.sqrt(count/8));for(let r=1;r<=ri&&p<count;r++){const n=Math.min(Math.round(8*r),count-p);for(let i=0;i<n;i++){const a=i/n*Math.PI*2;pos.push([Math.cos(a)*r*sp*1.5,Math.sin(a)*r*sp]);p++;}}}
  else if(formation==="Street"){const side=Math.ceil(count/2);for(let i=0;i<count;i++)pos.push([(i<side?-1:1)*sp*1.2,(i%side-side/2)*sp*0.9]);}
  else{for(let i=0;i<count;i++)pos.push([(Math.random()-0.5)*sp*count*0.18,(Math.random()-0.5)*sp*count*0.18]);}
  return pos;
}

export default function ProceduralCrowdGenerator({ sceneRef, setStatus }) {
  const mountRef    = useRef(null);
  const rendererRef = useRef(null);
  const scene3Ref   = useRef(null);
  const cameraRef   = useRef(null);
  const frameRef    = useRef(null);
  const meshesRef   = useRef([]);

  const [formation, setFormation] = useState("Random");
  const [npcCount,  setNpcCount]  = useState(20);
  const [spread,    setSpread]    = useState(1.5);
  const [bodyScale, setBodyScale] = useState(1.0);

  useEffect(() => {
    const mount=mountRef.current; if(!mount) return;
    const W=mount.clientWidth||780, H=340;
    const scene=new THREE.Scene(); scene.background=new THREE.Color(0x08080f);
    scene3Ref.current=scene;
    const camera=new THREE.PerspectiveCamera(50,W/H,0.1,500);
    camera.position.set(0,8,18); camera.lookAt(0,1,0); cameraRef.current=camera;
    const renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(W,H); renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement); rendererRef.current=renderer;

    scene.add(new THREE.AmbientLight(0xffeedd,0.5));
    const sun=new THREE.DirectionalLight(0xffffff,1.4); sun.position.set(15,25,10); sun.castShadow=true;
    sun.shadow.mapSize.width=2048; sun.shadow.mapSize.height=2048;
    sun.shadow.camera.near=0.5; sun.shadow.camera.far=200;
    sun.shadow.camera.left=-50; sun.shadow.camera.right=50;
    sun.shadow.camera.top=50; sun.shadow.camera.bottom=-50;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x4488bb,0x224422,0.4));

    const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x1a2a18,roughness:0.9}));
    ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
    scene.add(new THREE.GridHelper(80,40,0x1a2a1a,0x111811));
    scene.fog=new THREE.Fog(0x08080f,40,120);

    let angle=0;
    function animate(){
      frameRef.current=requestAnimationFrame(animate);
      angle+=0.003;
      camera.position.set(Math.sin(angle)*22,7+Math.sin(angle*0.3)*1.5,Math.cos(angle)*22);
      camera.lookAt(0,1,0);
      renderer.render(scene,camera);
    }
    animate();
    generate(scene);
    return ()=>{ cancelAnimationFrame(frameRef.current); renderer.dispose(); if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement); };
  },[]);

  function generate(sc) {
    const scene=sc||scene3Ref.current; if(!scene) return;
    for(let i=0;i<Math.floor(Math.random()*100)+1;i++) Math.random();
    meshesRef.current.forEach(m=>{scene.remove(m);m.geometry?.dispose();m.material?.dispose();});
    meshesRef.current=[];
    const positions=getPositions(formation,npcCount,spread);
    const all=[];
    positions.forEach(([x,z])=>{
      const tone=SKIN_TONES[Math.floor(Math.random()*SKIN_TONES.length)];
      const ms=buildPerson(scene,x,z,bodyScale,tone);
      all.push(...ms);
    });
    meshesRef.current=all;
    setStatus?.(`✓ ${positions.length} people generated`);
  }

  function clear(){
    const scene=scene3Ref.current; if(!scene) return;
    meshesRef.current.forEach(m=>{scene.remove(m);m.geometry?.dispose();m.material?.dispose();});
    meshesRef.current=[];
  }

  return (
    <div className="gen-root--stack">
      <div className="gen-crowd-title">👥 CROWD GENERATOR</div>
      <div ref={mountRef} className="gen-crowd-viewport"/>
      <div className="gen-sec-box">
        <div className="gen-sec-label gen-sec-label--pb">Formation</div>
        <div className="gen-formation-row">
          {FORMATIONS.map(f => (
            <button key={f} className={`gen-formation-badge${formation===f?' gen-formation-badge--active':''}`} onClick={()=>setFormation(f)}>{f}</button>
          ))}
        </div>
        <label className="gen-sec-box-label">NPC Count: {npcCount}</label>
        <input className="gen-sec-box-slider" type="range" min={1} max={150} value={npcCount} onChange={e=>setNpcCount(+e.target.value)}/>
        <label className="gen-sec-box-label">Spread: {spread.toFixed(1)}</label>
        <input className="gen-sec-box-slider" type="range" min={0.5} max={5} step={0.1} value={spread} onChange={e=>setSpread(+e.target.value)}/>
        <label className="gen-sec-box-label">Body Scale: {bodyScale.toFixed(2)}</label>
        <input className="gen-sec-box-slider" type="range" min={0.5} max={2} step={0.05} value={bodyScale} onChange={e=>setBodyScale(+e.target.value)}/>
      </div>
      <button className="gen-crowd-btn" onClick={()=>generate()}>⚡ Generate</button>
      <button className="gen-crowd-btn gen-crowd-btn--clear" onClick={clear}>🗑 Clear</button>
    </div>
  );
}
