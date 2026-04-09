import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

function Slider({label,value,min=0,max=1,step=0.01,onChange}) {
  return <div style={{marginBottom:5}}>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#888'}}>
      <span>{label}</span><span style={{color:'#00ffc8',fontWeight:600}}>{step<0.1?value.toFixed(2):Math.round(value)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{width:'100%',accentColor:'#00ffc8',cursor:'pointer'}}/>
  </div>;
}
function ColorRow({label,value,onChange}) {
  return <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
    <span style={{fontSize:10,color:'#888',flex:1}}>{label}</span>
    <input type="color" value={value} onChange={e=>onChange(e.target.value)} style={{width:32,height:22,border:'none',cursor:'pointer',borderRadius:3}}/>
  </div>;
}
function Section({title,children,defaultOpen=true}) {
  const [open,setOpen]=useState(defaultOpen);
  return <div style={{marginBottom:6,border:'1px solid #21262d',borderRadius:5,overflow:'hidden'}}>
    <div onClick={()=>setOpen(o=>!o)} style={{padding:'5px 8px',cursor:'pointer',background:'#0d1117',display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:600,color:'#00ffc8',userSelect:'none'}}>
      <span>{title}</span><span style={{fontSize:9,opacity:0.7}}>{open?'▲':'▼'}</span>
    </div>
    {open&&<div style={{padding:'6px 8px',background:'#06060f'}}>{children}</div>}
  </div>;
}
function Badges({items,active,onSelect}) {
  return <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:6}}>
    {items.map(item=><button key={item} onClick={()=>onSelect(item)} style={{padding:'2px 7px',fontSize:9,borderRadius:4,cursor:'pointer',background:active===item?'#00ffc8':'#1a1f2c',color:active===item?'#06060f':'#ccc',border:`1px solid ${active===item?'#00ffc8':'#21262d'}`}}>{item}</button>)}
  </div>;
}

const PRESETS = {
  'Human Male':  {headW:0.50,headH:0.55,jawW:0.44,jawH:0.22,noseL:0.38,noseW:0.28,lipW:0.38,eyeSize:0.14,eyeSpacing:0.42,browH:0.12,earSize:0.18,skinColor:'#e8b88a'},
  'Human Female':{headW:0.46,headH:0.52,jawW:0.38,jawH:0.18,noseL:0.30,noseW:0.22,lipW:0.40,eyeSize:0.16,eyeSpacing:0.40,browH:0.10,earSize:0.16,skinColor:'#f0c8a0'},
  'Elf':         {headW:0.44,headH:0.58,jawW:0.34,jawH:0.16,noseL:0.28,noseW:0.18,lipW:0.34,eyeSize:0.18,eyeSpacing:0.38,browH:0.08,earSize:0.28,skinColor:'#d4e8c8'},
  'Orc':         {headW:0.60,headH:0.56,jawW:0.56,jawH:0.30,noseL:0.44,noseW:0.40,lipW:0.50,eyeSize:0.12,eyeSpacing:0.46,browH:0.18,earSize:0.20,skinColor:'#4a7a3a'},
  'Alien':       {headW:0.55,headH:0.70,jawW:0.30,jawH:0.14,noseL:0.20,noseW:0.16,lipW:0.28,eyeSize:0.22,eyeSpacing:0.35,browH:0.05,earSize:0.10,skinColor:'#3a6a4a'},
  'Robot':       {headW:0.54,headH:0.54,jawW:0.50,jawH:0.24,noseL:0.16,noseW:0.20,lipW:0.36,eyeSize:0.20,eyeSpacing:0.44,browH:0.06,earSize:0.14,skinColor:'#556677'},
};

function buildFace(scene, p, meshesRef) {
  meshesRef.current.forEach(m=>{scene.remove(m);m.geometry?.dispose();m.material?.dispose();});
  meshesRef.current=[];
  const ms=[];
  if(!scene.getObjectByName('face_amb')){
    const a=new THREE.AmbientLight(0xffffff,0.6);a.name='face_amb';scene.add(a);ms.push(a);
    const d=new THREE.DirectionalLight(0xffeedd,1.2);d.name='face_dir';d.position.set(5,8,8);d.castShadow=true;scene.add(d);ms.push(d);
  }
  const skin=new THREE.Color(p.skinColor);
  const mat=(c=skin,r=0.6,me=0.1)=>new THREE.MeshPhysicalMaterial({color:c,roughness:r,metalness:me});
  const add=(geo,x,y,z,m=mat())=>{const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);mesh.castShadow=true;scene.add(mesh);ms.push(mesh);return mesh;};
  const s=2.5;
  const hW=p.headW*s, hH=p.headH*s;
  // Cranium
  add(new THREE.SphereGeometry(hW*0.5,24,18),0,hH*0.25,0);
  // Jaw
  add(new THREE.BoxGeometry(p.jawW*s,p.jawH*s,hW*0.7),0,-hH*0.28,0);
  // Cheeks
  for(const sx of[-1,1]) add(new THREE.SphereGeometry(p.headW*s*0.22,10,8),sx*p.headW*s*0.32,-hH*0.05,hW*0.38);
  // Eyes
  for(const sx of[-1,1]){
    const ex=sx*p.eyeSpacing*s*0.35;
    add(new THREE.SphereGeometry(p.eyeSize*s*0.55,10,8),ex,hH*0.08,hW*0.44,mat(0xffffff,0.1));
    add(new THREE.SphereGeometry(p.eyeSize*s*0.38,10,8),ex,hH*0.08,hW*0.49,mat(0x3355aa,0.05,0.1));
    add(new THREE.SphereGeometry(p.eyeSize*s*0.22,10,8),ex,hH*0.08,hW*0.51,mat(0x111111,0.0));
    add(new THREE.BoxGeometry(p.eyeSize*s*1.2,p.browH*s*0.5,0.1),ex,hH*0.19,hW*0.44,mat(new THREE.Color('#5a3a1a'),0.8));
  }
  // Nose
  add(new THREE.ConeGeometry(p.noseW*s*0.35,p.noseL*s*0.8,6),0,-hH*0.05,hW*0.46,mat(skin));
  // Lips
  add(new THREE.BoxGeometry(p.lipW*s,0.08,0.08),0,-hH*0.19,hW*0.46,mat(new THREE.Color('#cc7766'),0.4));
  add(new THREE.BoxGeometry(p.lipW*s*0.9,0.07,0.08),0,-hH*0.24,hW*0.46,mat(new THREE.Color('#bb6655'),0.4));
  // Ears
  for(const sx of[-1,1]) add(new THREE.SphereGeometry(p.earSize*s*0.45,8,6),sx*(hW*0.52),hH*0.02,0,mat(skin));
  // Neck
  add(new THREE.CylinderGeometry(hW*0.22,hW*0.28,hH*0.55,10),0,-hH*0.52,0);
  meshesRef.current=ms;
  return ms.filter(m=>m.isMesh).length;
}

export default function FaceGeneratorPanel({sceneRef,setStatus,onGenerate}) {
  const scene=sceneRef?.current;
  const meshesRef=useRef([]);
  const [activePreset,setActivePreset]=useState('Human Male');
  const [headW,setHeadW]=useState(0.50);
  const [headH,setHeadH]=useState(0.55);
  const [jawW,setJawW]=useState(0.44);
  const [jawH,setJawH]=useState(0.22);
  const [noseL,setNoseL]=useState(0.38);
  const [noseW,setNoseW]=useState(0.28);
  const [lipW,setLipW]=useState(0.38);
  const [eyeSize,setEyeSize]=useState(0.14);
  const [eyeSpacing,setEyeSpacing]=useState(0.42);
  const [browH,setBrowH]=useState(0.12);
  const [earSize,setEarSize]=useState(0.18);
  const [skinColor,setSkinColor]=useState('#e8b88a');

  function getParams(){return{headW,headH,jawW,jawH,noseL,noseW,lipW,eyeSize,eyeSpacing,browH,earSize,skinColor};}

  function applyPreset(name){
    const p=PRESETS[name];if(!p)return;setActivePreset(name);
    setHeadW(p.headW);setHeadH(p.headH);setJawW(p.jawW);setJawH(p.jawH);
    setNoseL(p.noseL);setNoseW(p.noseW);setLipW(p.lipW);setEyeSize(p.eyeSize);
    setEyeSpacing(p.eyeSpacing);setBrowH(p.browH);setEarSize(p.earSize);setSkinColor(p.skinColor);
  }

  function generate(){
    if(!scene){setStatus?.('No scene');return;}
    const n=buildFace(scene,getParams(),meshesRef);
    setStatus?.(`✓ ${activePreset} face — ${n} parts`);
    onGenerate?.(getParams());
  }

  function clear(){meshesRef.current.forEach(m=>{scene?.remove(m);m.geometry?.dispose();m.material?.dispose();});meshesRef.current=[];setStatus?.('Cleared');}

  useEffect(()=>{applyPreset('Human Male');},[]);

  const P={fontFamily:'JetBrains Mono,monospace',color:'#e0e0e0',fontSize:12,userSelect:'none',width:'100%'};
  return (
    <div style={P}>
      <Section title="😶 Presets"><Badges items={Object.keys(PRESETS)} active={activePreset} onSelect={applyPreset}/></Section>
      <Section title="💀 Head Shape">
        <Slider label="Head Width"  value={headW} onChange={setHeadW}/>
        <Slider label="Head Height" value={headH} onChange={setHeadH}/>
        <Slider label="Jaw Width"   value={jawW}  onChange={setJawW}/>
        <Slider label="Jaw Height"  value={jawH}  onChange={setJawH}/>
      </Section>
      <Section title="👁 Eyes">
        <Slider label="Eye Size"    value={eyeSize}    onChange={setEyeSize}/>
        <Slider label="Eye Spacing" value={eyeSpacing} onChange={setEyeSpacing}/>
        <Slider label="Brow Height" value={browH}      onChange={setBrowH}/>
      </Section>
      <Section title="👃 Nose & Mouth">
        <Slider label="Nose Length" value={noseL} onChange={setNoseL}/>
        <Slider label="Nose Width"  value={noseW} onChange={setNoseW}/>
        <Slider label="Lip Width"   value={lipW}  onChange={setLipW}/>
        <Slider label="Ear Size"    value={earSize} onChange={setEarSize}/>
      </Section>
      <Section title="🎨 Skin"><ColorRow label="Skin Color" value={skinColor} onChange={setSkinColor}/></Section>
      <div style={{display:'flex',gap:6,marginTop:8}}>
        <button onClick={generate} style={{flex:1,background:'#00ffc8',color:'#06060f',border:'none',borderRadius:4,padding:'7px 0',cursor:'pointer',fontWeight:700,fontSize:12}}>⚡ Generate Face</button>
      </div>
      <button onClick={clear} style={{width:'100%',marginTop:6,background:'#1a1f2c',color:'#ff4444',border:'1px solid #ff4444',borderRadius:4,padding:'5px 0',cursor:'pointer',fontSize:11}}>🗑 Clear</button>
    </div>
  );
}
