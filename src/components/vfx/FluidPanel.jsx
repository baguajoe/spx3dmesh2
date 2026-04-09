import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";

const S = {
  root:{ background:"#06060f", color:"#e0e0e0", fontFamily:"JetBrains Mono,monospace", padding:12, height:"100%", overflowY:"auto", fontSize:12 },
  h2:{ color:"#00ffc8", fontSize:13, marginBottom:10, letterSpacing:1 },
  sec:{ background:"#0d1117", border:"1px solid #21262d", borderRadius:6, padding:10, marginBottom:8 },
  lbl:{ fontSize:10, color:"#8b949e", display:"block", marginBottom:3 },
  inp:{ width:"100%", accentColor:"#00ffc8", cursor:"pointer", marginBottom:8 },
  btn:{ background:"#00ffc8", color:"#06060f", border:"none", borderRadius:4, padding:"7px 14px", fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:700, cursor:"pointer", marginRight:6, marginBottom:6 },
  btnO:{ background:"#FF6600", color:"#fff", border:"none", borderRadius:4, padding:"7px 14px", fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:700, cursor:"pointer", marginRight:6, marginBottom:6 },
  badge:(a,v)=>({ padding:"3px 8px", fontSize:9, borderRadius:4, cursor:"pointer", fontWeight:600, marginRight:3, marginBottom:3, background:a===v?"#00ffc8":"#21262d", color:a===v?"#06060f":"#8b949e", border:`1px solid ${a===v?"#00ffc8":"#30363d"}` }),
};

const FLUID_TYPES = ["Water","Lava","Blood","Slime","Oil","Acid"];
const FLUID_COLORS = { Water:"#1a4a8a", Lava:"#cc3300", Blood:"#880022", Slime:"#2a7a1a", Oil:"#111122", Acid:"#aacc00" };

export default function FluidPanel({ sceneRef, setStatus, open, onClose }) {
  const meshesRef = useRef([]);
  const fluidRef = useRef(null);
  const frameRef = useRef(null);
  const t = useRef(0);
  const [fluidType, setFluidType] = useState("Water");
  const [waveHeight, setWaveHeight] = useState(0.4);
  const [waveSpeed, setWaveSpeed] = useState(0.5);
  const [turbulence, setTurbulence] = useState(0.2);
  const [poolW, setPoolW] = useState(10);
  const [poolD, setPoolD] = useState(10);
  const [depth, setDepth] = useState(2);
  const [running, setRunning] = useState(true);

  function clearScene() {
    const scene = sceneRef?.current; if(!scene) return;
    cancelAnimationFrame(frameRef.current);
    meshesRef.current.forEach(m=>{ scene.remove(m); m.geometry?.dispose(); m.material?.dispose(); });
    meshesRef.current=[]; fluidRef.current=null;
  }

  function build() {
    const scene = sceneRef?.current; if(!scene){ setStatus?.("No scene"); return; }
    clearScene();
    const ms=[];
    const col=new THREE.Color(FLUID_COLORS[fluidType]||"#1a4a8a");
    if(!scene.getObjectByName("fl_amb")){
      const a=new THREE.AmbientLight(0xffffff,0.6); a.name="fl_amb"; scene.add(a); ms.push(a);
      const d=new THREE.DirectionalLight(0xaaccff,1.2); d.name="fl_dir"; d.position.set(10,20,5); d.castShadow=true; scene.add(d); ms.push(d);
    }
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0x111811,roughness:0.95}));
    ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground); ms.push(ground);
    const wallMat=new THREE.MeshStandardMaterial({color:0x334455,roughness:0.7,metalness:0.2});
    [[poolW,depth+0.5,0.4,0,(depth+0.5)/2,poolD/2+0.2],[poolW,depth+0.5,0.4,0,(depth+0.5)/2,-poolD/2-0.2],[0.4,depth+0.5,poolD,poolW/2+0.2,(depth+0.5)/2,0],[0.4,depth+0.5,poolD,-poolW/2-0.2,(depth+0.5)/2,0]].forEach(([w,h,d,x,y,z])=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMat); m.position.set(x,y,z); scene.add(m); ms.push(m);
    });
    const floor=new THREE.Mesh(new THREE.BoxGeometry(poolW+0.8,0.3,poolD+0.8),wallMat); floor.position.y=-0.15; scene.add(floor); ms.push(floor);
    const geo=new THREE.PlaneGeometry(poolW-0.4,poolD-0.4,24,24); geo.rotateX(-Math.PI/2);
    const fluid=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:col,transparent:true,opacity:0.82,roughness:fluidType==="Lava"?0.9:0.1,metalness:fluidType==="Oil"?0.8:0.1,emissive:fluidType==="Lava"?new THREE.Color(0x441100):new THREE.Color(0),emissiveIntensity:fluidType==="Lava"?0.4:0}));
    fluid.position.y=depth*0.75; scene.add(fluid); ms.push(fluid); fluidRef.current=fluid;
    meshesRef.current=ms;
    setStatus?.(`✓ ${fluidType} pool ${poolW}×${poolD}m`);
    cancelAnimationFrame(frameRef.current);
    function animate(){
      frameRef.current=requestAnimationFrame(animate);
      if(!running||!fluidRef.current) return;
      t.current+=0.016;
      const pos=fluidRef.current.geometry.attributes.position;
      const spd=waveSpeed*2+0.5, ht=waveHeight*0.6, trb=turbulence*0.3;
      for(let i=0;i<pos.count;i++){
        const x=pos.getX(i),z=pos.getZ(i);
        pos.setY(i,Math.sin(x*0.8+t.current*spd)*ht+Math.sin(z*0.6+t.current*spd*0.7)*ht*0.6+(Math.random()-0.5)*trb);
      }
      pos.needsUpdate=true; fluidRef.current.geometry.computeVertexNormals();
    }
    animate();
  }

  useEffect(()=>{ if(open) build(); return ()=>cancelAnimationFrame(frameRef.current); },[open]);
  useEffect(()=>{ if(open&&sceneRef?.current) build(); },[fluidType,poolW,poolD,depth]);

  return (
    <div style={{...S.root,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:10}}>
        <div style={S.h2}>💧 FLUID SIMULATOR</div>
        {onClose&&<button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"1px solid #21262d",borderRadius:3,color:"#8b949e",cursor:"pointer",padding:"3px 10px",fontSize:10}}>✕</button>}
      </div>
      <div style={S.sec}>
        <div style={S.lbl}>Fluid Type</div>
        <div style={{display:"flex",flexWrap:"wrap",marginBottom:4}}>
          {FLUID_TYPES.map(f=><button key={f} style={S.badge(fluidType,f)} onClick={()=>setFluidType(f)}>{f}</button>)}
        </div>
      </div>
      <div style={S.sec}>
        <label style={S.lbl}>Wave Height: {waveHeight.toFixed(2)}</label>
        <input style={S.inp} type="range" min={0} max={1} step={0.01} value={waveHeight} onChange={e=>setWaveHeight(+e.target.value)}/>
        <label style={S.lbl}>Wave Speed: {waveSpeed.toFixed(2)}</label>
        <input style={S.inp} type="range" min={0} max={1} step={0.01} value={waveSpeed} onChange={e=>setWaveSpeed(+e.target.value)}/>
        <label style={S.lbl}>Turbulence: {turbulence.toFixed(2)}</label>
        <input style={S.inp} type="range" min={0} max={1} step={0.01} value={turbulence} onChange={e=>setTurbulence(+e.target.value)}/>
        <label style={S.lbl}>Pool Width: {poolW}m</label>
        <input style={S.inp} type="range" min={3} max={30} value={poolW} onChange={e=>setPoolW(+e.target.value)}/>
        <label style={S.lbl}>Pool Depth: {poolD}m</label>
        <input style={S.inp} type="range" min={3} max={30} value={poolD} onChange={e=>setPoolD(+e.target.value)}/>
        <label style={S.lbl}>Fluid Level: {depth}m</label>
        <input style={S.inp} type="range" min={0.5} max={8} step={0.1} value={depth} onChange={e=>setDepth(+e.target.value)}/>
      </div>
      <button style={S.btn} onClick={build}>⚡ Build</button>
      <button style={S.btn} onClick={()=>setRunning(r=>!r)}>{running?"⏸ Pause":"▶ Resume"}</button>
      <button style={S.btnO} onClick={()=>{clearScene();setStatus?.("Cleared");}}>🗑 Clear</button>
    </div>
  );
}
