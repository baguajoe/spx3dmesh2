import React, { useState, useRef } from "react";
import * as THREE from "three";

const S = {
  root: { background:"#06060f", color:"#e0e0e0", fontFamily:"JetBrains Mono,monospace", padding:16, height:"100%", overflowY:"auto" },
  h2: { color:"#00ffc8", fontSize:14, marginBottom:12, letterSpacing:1 },
  label: { fontSize:11, color:"#aaa", display:"block", marginBottom:4 },
  input: { width:"100%", background:"#0d0d1a", border:"1px solid #1a1a2e", color:"#e0e0e0", padding:"4px 8px", borderRadius:4, fontFamily:"JetBrains Mono,monospace", fontSize:11, marginBottom:10, boxSizing:"border-box" },
  select: { width:"100%", background:"#0d0d1a", border:"1px solid #1a1a2e", color:"#e0e0e0", padding:"4px 8px", borderRadius:4, fontFamily:"JetBrains Mono,monospace", fontSize:11, marginBottom:10, boxSizing:"border-box" },
  btn: { background:"#00ffc8", color:"#06060f", border:"none", borderRadius:4, padding:"7px 16px", fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:700, cursor:"pointer", marginRight:8, marginBottom:8 },
  btnO: { background:"#FF6600", color:"#fff", border:"none", borderRadius:4, padding:"7px 16px", fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:700, cursor:"pointer", marginRight:8, marginBottom:8 },
  section: { background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:6, padding:12, marginBottom:12 },
  stat: { fontSize:11, color:"#00ffc8", marginBottom:4 },
};

const ARCHETYPES = ["Office Tower","Apartment Block","Industrial Warehouse","Gothic Cathedral","Modern House","Pyramid","Pagoda","Brutalist Complex","Victorian Mansion","Futuristic Hub"];
const MATERIALS_B = ["Concrete","Glass Curtain","Brick","Stone","Metal Panels","Wood","Marble","Carbon Fiber"];
const ROOF_TYPES = ["Flat","Sloped Gable","Hip","Pyramid","Dome","Green Roof","Penthouse","Sawtooth"];

function buildFloor(scene, x, z, w, d, y, col){
  const geo = new THREE.BoxGeometry(w, 3.2, d);
  const mat = new THREE.MeshStandardMaterial({color:col, roughness:0.6, metalness:0.1});
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y+1.6, z);
  m.castShadow=true; m.receiveShadow=true;
  scene.add(m);
  // Window strip
  const wGeo = new THREE.BoxGeometry(w*0.9, 1.6, 0.05);
  const wMat = new THREE.MeshStandardMaterial({color:0x88aacc, transparent:true, opacity:0.65, roughness:0.05, metalness:0.3});
  const win = new THREE.Mesh(wGeo, wMat);
  win.position.set(0, 0.3, d/2+0.03);
  m.add(win);
  const win2 = win.clone(); win2.position.z = -d/2-0.03; m.add(win2);
  return m;
}

function addRoof(scene, x, z, w, d, topY, roofType, col){
  if(roofType==="Flat"){
    const geo=new THREE.BoxGeometry(w,0.4,d);
    const m=new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:0x333344}));
    m.position.set(x,topY+0.2,z); scene.add(m); return m;
  }
  if(roofType==="Pyramid"){
    const geo=new THREE.ConeGeometry(Math.max(w,d)*0.6,w*0.5,4);
    const m=new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:col}));
    m.position.set(x,topY+w*0.25,z); m.rotation.y=Math.PI/4; scene.add(m); return m;
  }
  if(roofType==="Dome"){
    const geo=new THREE.SphereGeometry(Math.max(w,d)*0.55,16,8,0,Math.PI*2,0,Math.PI/2);
    const m=new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:0x8899aa,roughness:0.3}));
    m.position.set(x,topY,z); scene.add(m); return m;
  }
  // Default sloped
  const geo=new THREE.CylinderGeometry(0, Math.max(w,d)*0.7, w*0.4, 4);
  const m=new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:0x884422}));
  m.position.set(x,topY+w*0.2,z); m.rotation.y=Math.PI/4; scene.add(m); return m;
}

export default function BuildingSimulatorPanel({ scene }){
  const [archetype, setArchetype] = useState("Office Tower");
  const [floors, setFloors] = useState(12);
  const [width, setWidth] = useState(14);
  const [depth, setDepth] = useState(14);
  const [material, setMaterial] = useState("Glass Curtain");
  const [roofType, setRoofType] = useState("Flat");
  const [color, setColor] = useState("#667799");
  const [setback, setSetback] = useState(false);
  const [status, setStatus] = useState("");
  const [stats, setStats] = useState(null);
  const meshes = useRef([]);

  const MAT_COLORS = { "Concrete":0x888888, "Glass Curtain":0x336699, "Brick":0x884433, "Stone":0x667755, "Metal Panels":0x556677, "Wood":0x7a5c3a, "Marble":0xeeeedd, "Carbon Fiber":0x111122 };

  function clearBuilding(){ meshes.current.forEach(m=>{ scene.remove(m); m.geometry?.dispose(); m.material?.dispose(); }); meshes.current=[]; setStats(null); setStatus(""); }

  function build(){
    if(!scene){ setStatus("No scene"); return; }
    clearBuilding();
    setStatus("Constructing building…");
    const col = MAT_COLORS[material] || parseInt(color.replace("#",""),16);
    const ms = [];
    // Ground
    const groundGeo = new THREE.PlaneGeometry(width+20, depth+20);
    groundGeo.rotateX(-Math.PI/2);
    const gm = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({color:0x111122}));
    gm.receiveShadow=true; scene.add(gm); ms.push(gm);

    let currentW = width, currentD = depth;
    for(let f=0; f<floors; f++){
      if(setback && f>0 && f%4===0){ currentW*=0.88; currentD*=0.88; }
      const fm = buildFloor(scene, 0, 0, currentW, currentD, f*3.2, col);
      ms.push(fm);
    }
    const topY = floors*3.2;
    const rm = addRoof(scene, 0, 0, currentW, currentD, topY, roofType, col);
    ms.push(rm);

    // Lobby entrance
    const lobGeo=new THREE.BoxGeometry(currentW*0.4, 4, 2);
    const lob=new THREE.Mesh(lobGeo, new THREE.MeshStandardMaterial({color:0x8899bb,roughness:0.05,metalness:0.5}));
    lob.position.set(0, 2, currentD/2+1); scene.add(lob); ms.push(lob);

    // Lights
    const amb=new THREE.AmbientLight(0xffffff,0.7); scene.add(amb); ms.push(amb);
    const dir=new THREE.DirectionalLight(0xffeedd,1.1); dir.position.set(30,60,20); dir.castShadow=true; scene.add(dir); ms.push(dir);

    meshes.current=ms;
    const totalHeight = topY;
    setStats({ archetype, floors, width: currentW.toFixed(1), depth: currentD.toFixed(1), height: totalHeight.toFixed(1), material, roofType });
    setStatus(`✓ ${floors}-floor ${archetype} built — ${totalHeight.toFixed(0)}m tall`);
  }

  return (
    <div style={S.root}>
      <div style={S.h2}>🏗 BUILDING SIMULATOR</div>
      <div style={S.section}>
        <label style={S.label}>Archetype</label>
        <select style={S.select} value={archetype} onChange={e=>setArchetype(e.target.value)}>
          {ARCHETYPES.map(a=><option key={a}>{a}</option>)}
        </select>
        <label style={S.label}>Floors: {floors}</label>
        <input style={S.input} type="range" min={1} max={100} value={floors} onChange={e=>setFloors(+e.target.value)}/>
        <label style={S.label}>Width: {width}m</label>
        <input style={S.input} type="range" min={4} max={60} value={width} onChange={e=>setWidth(+e.target.value)}/>
        <label style={S.label}>Depth: {depth}m</label>
        <input style={S.input} type="range" min={4} max={60} value={depth} onChange={e=>setDepth(+e.target.value)}/>
        <label style={S.label}>Facade Material</label>
        <select style={S.select} value={material} onChange={e=>setMaterial(e.target.value)}>
          {MATERIALS_B.map(m=><option key={m}>{m}</option>)}
        </select>
        <label style={S.label}>Roof Type</label>
        <select style={S.select} value={roofType} onChange={e=>setRoofType(e.target.value)}>
          {ROOF_TYPES.map(r=><option key={r}>{r}</option>)}
        </select>
        <label style={S.label}>Accent Color</label>
        <input style={{...S.input,padding:2,height:32}} type="color" value={color} onChange={e=>setColor(e.target.value)}/>
        <label style={{...S.label,cursor:"pointer"}}><input type="checkbox" checked={setback} onChange={e=>setSetback(e.target.checked)}/> Setback per 4 Floors</label>
      </div>
      <button style={S.btn} onClick={build}>⚡ Build</button>
      <button style={S.btnO} onClick={clearBuilding}>🗑 Clear</button>
      {status && <div style={{...S.stat,marginTop:8}}>{status}</div>}
      {stats && (
        <div style={S.section}>
          <div style={S.stat}>Type: {stats.archetype}</div>
          <div style={S.stat}>Floors: {stats.floors} | Height: {stats.height}m</div>
          <div style={S.stat}>Footprint: {stats.width}×{stats.depth}m</div>
          <div style={S.stat}>Material: {stats.material} | Roof: {stats.roofType}</div>
        </div>
      )}
    </div>
  );
}