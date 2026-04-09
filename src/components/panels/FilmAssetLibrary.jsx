import React, { useState, useCallback } from 'react';
import * as THREE from 'three';

const C = { bg:'#06060f', panel:'#0d1117', border:'#21262d', teal:'#00ffc8', orange:'#FF6600', text:'#e0e0e0', dim:'#8b949e', font:'JetBrains Mono,monospace' };

const MESHES = {
  Primitives: [
    { id:'sphere', label:'Sphere HD', icon:'◉', build:()=>new THREE.SphereGeometry(1,64,64) },
    { id:'box', label:'Box', icon:'⬜', build:()=>new THREE.BoxGeometry(1,1,1,4,4,4) },
    { id:'cylinder', label:'Cylinder', icon:'⬭', build:()=>new THREE.CylinderGeometry(0.5,0.5,2,32,8) },
    { id:'cone', label:'Cone', icon:'△', build:()=>new THREE.ConeGeometry(0.5,2,32,8) },
    { id:'torus', label:'Torus', icon:'⭕', build:()=>new THREE.TorusGeometry(1,0.3,32,128) },
    { id:'knot', label:'Torus Knot', icon:'✿', build:()=>new THREE.TorusKnotGeometry(1,0.3,200,32) },
    { id:'capsule', label:'Capsule', icon:'💊', build:()=>new THREE.CapsuleGeometry(0.5,1,16,32) },
    { id:'ico', label:'Icosphere', icon:'⬡', build:()=>new THREE.IcosahedronGeometry(1,4) },
    { id:'plane', label:'Plane', icon:'▭', build:()=>new THREE.PlaneGeometry(4,4,32,32) },
    { id:'octa', label:'Octahedron', icon:'◈', build:()=>new THREE.OctahedronGeometry(1,0) },
  ],
  Architecture: [
    { id:'wall', label:'Wall', icon:'▮', build:()=>new THREE.BoxGeometry(4,3,0.2,8,8,1) },
    { id:'floor', label:'Floor', icon:'▬', build:()=>new THREE.BoxGeometry(8,0.1,8,16,1,16) },
    { id:'column', label:'Column', icon:'|', build:()=>new THREE.CylinderGeometry(0.15,0.2,4,16,8) },
    { id:'dome', label:'Dome', icon:'⌢', build:()=>new THREE.SphereGeometry(2,32,16,0,Math.PI*2,0,Math.PI/2) },
  ],
  Organic: [
    { id:'rock_a', label:'Rock A', icon:'🪨', build:()=>{ const g=new THREE.IcosahedronGeometry(1,2); const p=g.attributes.position; for(let i=0;i<p.count;i++){p.setXYZ(i,p.getX(i)*(0.7+Math.random()*0.6),p.getY(i)*(0.5+Math.random()*0.7),p.getZ(i)*(0.7+Math.random()*0.6));} g.computeVertexNormals(); return g; }},
    { id:'rock_b', label:'Rock B', icon:'🗿', build:()=>{ const g=new THREE.DodecahedronGeometry(1,1); const p=g.attributes.position; for(let i=0;i<p.count;i++){p.setXYZ(i,p.getX(i)*(0.6+Math.random()*0.8),p.getY(i)*(0.4+Math.random()*0.6),p.getZ(i)*(0.6+Math.random()*0.8));} g.computeVertexNormals(); return g; }},
    { id:'boulder', label:'Boulder', icon:'⬬', build:()=>new THREE.SphereGeometry(1.2,8,6) },
    { id:'ground', label:'Ground', icon:'⬤', build:()=>new THREE.PlaneGeometry(6,6,24,24) },
  ],
  'Film Props': [
    { id:'gem', label:'Gem', icon:'💎', build:()=>new THREE.OctahedronGeometry(0.6,0) },
    { id:'orb', label:'Orb', icon:'🔮', build:()=>new THREE.SphereGeometry(0.5,32,32) },
    { id:'disc', label:'Disc', icon:'⊙', build:()=>new THREE.CylinderGeometry(1,1,0.05,64,1) },
    { id:'ring', label:'Ring', icon:'◯', build:()=>new THREE.TorusGeometry(0.8,0.05,16,64) },
    { id:'shard', label:'Shard', icon:'◈', build:()=>new THREE.TetrahedronGeometry(0.8,0) },
  ],
};

const MATS = {
  Chrome:   { color:'#d0d0d0', roughness:0.05, metalness:1.0, clearcoat:1.0 },
  Gold:     { color:'#ffcc44', roughness:0.1,  metalness:1.0 },
  Marble:   { color:'#f5f0ee', roughness:0.15, metalness:0.0, clearcoat:0.8 },
  Concrete: { color:'#7a7a72', roughness:0.95, metalness:0.0 },
  Glass:    { color:'#ccddff', roughness:0.0,  metalness:0.0, transmission:1.0, ior:1.5, thickness:0.5, transparent:true, opacity:1.0 },
  Obsidian: { color:'#1a1520', roughness:0.02, metalness:0.3, clearcoat:1.0 },
  Copper:   { color:'#c87941', roughness:0.25, metalness:0.9 },
  Emissive: { color:'#00ffc8', roughness:0.5,  metalness:0.0, emissive:'#00ffc8', emissiveIntensity:1.5 },
  Rubber:   { color:'#1a1a1a', roughness:1.0,  metalness:0.0 },
  Wood:     { color:'#8b5a2b', roughness:0.85, metalness:0.0 },
};

function buildMat(key) {
  const p = MATS[key]||MATS.Concrete;
  return new THREE.MeshPhysicalMaterial({
    color:new THREE.Color(p.color), roughness:p.roughness??0.5, metalness:p.metalness??0,
    clearcoat:p.clearcoat??0, transmission:p.transmission??0, ior:p.ior??1.5,
    thickness:p.thickness??0, transparent:p.transparent??false, opacity:p.opacity??1,
    emissive:p.emissive?new THREE.Color(p.emissive):new THREE.Color(0x000000),
    emissiveIntensity:p.emissiveIntensity??0, envMapIntensity:1.2,
  });
}

export default function FilmAssetLibrary({ sceneRef, open=true, onClose }) {
  const [cat, setCat] = useState('Primitives');
  const [mat, setMat] = useState('Concrete');
  const [last, setLast] = useState('');
  const [search, setSearch] = useState('');

  const add = useCallback((item) => {
    const scene = sceneRef?.current; if(!scene) return;
    try {
      const geo = item.build();
      const mesh = new THREE.Mesh(geo, buildMat(mat));
      mesh.name = item.label+'_'+Date.now();
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.position.set((Math.random()-0.5)*2,0,(Math.random()-0.5)*2);
      scene.add(mesh); setLast(item.label);
    } catch(e){ console.error(e); }
  }, [sceneRef, mat]);

  const items = (MESHES[cat]||[]).filter(i=>!search||i.label.toLowerCase().includes(search.toLowerCase()));

  if(!open) return null;
  return (
    <div style={{width:260,background:C.panel,borderRadius:6,border:`1px solid ${C.border}`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:640}}>
      <div style={{background:'linear-gradient(90deg,#0a1520,#0d1117)',borderBottom:`1px solid ${C.border}`,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:6,height:6,borderRadius:'50%',background:C.orange,boxShadow:`0 0 6px ${C.orange}`}}/>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:2,color:C.orange}}>ASSET LIBRARY</span>
        {onClose&&<span onClick={onClose} style={{marginLeft:'auto',cursor:'pointer',color:C.dim,fontSize:14}}>×</span>}
      </div>
      <div style={{padding:'6px 10px',borderBottom:`1px solid ${C.border}`}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='search...' style={{width:'100%',background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:'4px 8px',color:C.text,fontFamily:C.font,fontSize:10,boxSizing:'border-box'}}/>
      </div>
      <div style={{display:'flex',gap:3,padding:'6px 8px',flexWrap:'wrap',borderBottom:`1px solid ${C.border}`}}>
        {Object.keys(MESHES).map(k=><div key={k} onClick={()=>setCat(k)} style={{padding:'3px 7px',borderRadius:3,cursor:'pointer',fontSize:9,fontWeight:700,background:cat===k?C.orange:'transparent',color:cat===k?'#fff':C.dim,border:`1px solid ${cat===k?C.orange:C.border}`}}>{k}</div>)}
      </div>
      <div style={{padding:'5px 10px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:3,flexWrap:'wrap'}}>
        {Object.keys(MATS).map(m=><div key={m} onClick={()=>setMat(m)} style={{padding:'2px 6px',borderRadius:3,cursor:'pointer',fontSize:8,fontWeight:700,background:mat===m?'rgba(0,255,200,0.15)':C.bg,color:mat===m?C.teal:C.dim,border:`1px solid ${mat===m?C.teal:C.border}`}}>{m}</div>)}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'8px 10px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
          {items.map(item=><div key={item.id} onClick={()=>add(item)} style={{padding:'8px 6px',borderRadius:5,cursor:'pointer',border:`1px solid ${last===item.label?C.teal:C.border}`,background:last===item.label?'rgba(0,255,200,0.08)':C.bg,textAlign:'center'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal}} onMouseLeave={e=>{e.currentTarget.style.borderColor=last===item.label?C.teal:C.border}}><div style={{fontSize:18,marginBottom:3}}>{item.icon}</div><div style={{fontSize:8,color:C.dim,fontWeight:700}}>{item.label}</div></div>)}
        </div>
      </div>
      {last&&<div style={{padding:'5px 12px',borderTop:`1px solid ${C.border}`,fontSize:9,color:C.teal,fontWeight:700}}>✓ ADDED: {last.toUpperCase()}</div>}
    </div>
  );
}