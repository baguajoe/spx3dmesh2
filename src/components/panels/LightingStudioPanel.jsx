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
  btnSm: { background:"#1a1a2e", color:"#00ffc8", border:"1px solid #00ffc8", borderRadius:4, padding:"3px 10px", fontFamily:"JetBrains Mono,monospace", fontSize:10, cursor:"pointer", marginLeft:6 },
  section: { background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:6, padding:12, marginBottom:12 },
  stat: { fontSize:11, color:"#00ffc8", marginBottom:4 },
  lightRow: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid #0d0d1a" },
};

const LIGHT_TYPES = ["Directional","Point","Spot","Hemisphere","Rect Area","Ambient"];
const PRESETS_L = ["Studio 3-Point","HDRI Outdoor Day","Night Scene","Sunset Golden Hour","Horror Dark","Sci-Fi Neon","Cinematic Dramatic","Overcast Soft"];
const SHADOW_MAPS = ["Basic","PCF","PCFSoft","VSM"];

export default function LightingStudioPanel({ scene, renderer }){
  const [lights, setLights] = useState([]);
  const [type, setType] = useState("Directional");
  const [color, setColor] = useState("#ffffff");
  const [intensity, setIntensity] = useState(1);
  const [castShadow, setCastShadow] = useState(true);
  const [posX, setPosX] = useState(10);
  const [posY, setPosY] = useState(20);
  const [posZ, setPosZ] = useState(10);
  const [preset, setPreset] = useState("Studio 3-Point");
  const [shadowMap, setShadowMap] = useState("PCFSoft");
  const [status, setStatus] = useState("");
  const lightRefs = useRef({});
  const helperRefs = useRef({});
  const nextId = useRef(0);

  function applyRendererShadow(sm){
    if(!renderer) return;
    renderer.shadowMap.enabled=true;
    const types={"Basic":THREE.BasicShadowMap,"PCF":THREE.PCFShadowMap,"PCFSoft":THREE.PCFSoftShadowMap,"VSM":THREE.VSMShadowMap};
    renderer.shadowMap.type=types[sm]||THREE.PCFSoftShadowMap;
    renderer.shadowMap.needsUpdate=true;
  }

  function addLight(){
    if(!scene){ setStatus("No scene"); return; }
    applyRendererShadow(shadowMap);
    const id=nextId.current++;
    const col=new THREE.Color(color);
    let light;
    switch(type){
      case "Point": light=new THREE.PointLight(col,intensity,50); break;
      case "Spot": light=new THREE.SpotLight(col,intensity,80,Math.PI/4,0.2); break;
      case "Hemisphere": light=new THREE.HemisphereLight(col,0x333344,intensity); break;
      case "Ambient": light=new THREE.AmbientLight(col,intensity); break;
      default: light=new THREE.DirectionalLight(col,intensity);
    }
    light.position.set(posX,posY,posZ);
    if(castShadow && light.shadow) light.castShadow=true;
    scene.add(light);
    lightRefs.current[id]=light;
    // Helper
    let helper=null;
    if(type==="Directional"){ helper=new THREE.DirectionalLightHelper(light,3); scene.add(helper); helperRefs.current[id]=helper; }
    else if(type==="Point"){ helper=new THREE.PointLightHelper(light,1); scene.add(helper); helperRefs.current[id]=helper; }
    else if(type==="Spot"){ helper=new THREE.SpotLightHelper(light); scene.add(helper); helperRefs.current[id]=helper; }
    const entry={id,type,color,intensity,castShadow,pos:[posX,posY,posZ]};
    setLights(prev=>[...prev,entry]);
    setStatus(`✓ ${type} light #${id} added`);
  }

  function removeLight(id){
    const l=lightRefs.current[id]; if(l){ scene.remove(l); }
    const h=helperRefs.current[id]; if(h){ scene.remove(h); }
    delete lightRefs.current[id]; delete helperRefs.current[id];
    setLights(prev=>prev.filter(l=>l.id!==id));
  }

  function clearAll(){
    lights.forEach(l=>removeLight(l.id));
    setLights([]); setStatus("All lights cleared");
  }

  function applyPreset(p){
    clearAll();
    setTimeout(()=>{
      const configs = {
        "Studio 3-Point": [
          {type:"Directional",color:"#fff8ee",intensity:1.2,pos:[10,20,10]},
          {type:"Point",color:"#aaccff",intensity:0.5,pos:[-10,10,-5]},
          {type:"Point",color:"#ffeedd",intensity:0.3,pos:[0,5,15]},
        ],
        "HDRI Outdoor Day": [
          {type:"Hemisphere",color:"#87ceeb",intensity:0.8,pos:[0,1,0]},
          {type:"Directional",color:"#fff8dd",intensity:1.5,pos:[50,80,30]},
        ],
        "Night Scene": [
          {type:"Ambient",color:"#111133",intensity:0.3,pos:[0,0,0]},
          {type:"Point",color:"#4466ff",intensity:0.8,pos:[5,8,5]},
          {type:"Point",color:"#FF6600",intensity:0.4,pos:[-8,3,-3]},
        ],
        "Sunset Golden Hour": [
          {type:"Directional",color:"#ff8820",intensity:1.4,pos:[-30,5,10]},
          {type:"Hemisphere",color:"#ffddaa",intensity:0.6,pos:[0,1,0]},
        ],
        "Horror Dark": [
          {type:"Ambient",color:"#050508",intensity:0.2,pos:[0,0,0]},
          {type:"Point",color:"#300000",intensity:0.6,pos:[0,3,0]},
          {type:"Spot",color:"#ff2200",intensity:0.3,pos:[0,10,0]},
        ],
        "Sci-Fi Neon": [
          {type:"Ambient",color:"#000022",intensity:0.3,pos:[0,0,0]},
          {type:"Point",color:"#00ffc8",intensity:1,pos:[5,5,5]},
          {type:"Point",color:"#FF6600",intensity:0.8,pos:[-5,3,-5]},
          {type:"Spot",color:"#8800ff",intensity:0.6,pos:[0,15,0]},
        ],
        "Cinematic Dramatic": [
          {type:"Directional",color:"#fff5ee",intensity:2,pos:[15,25,5]},
          {type:"Ambient",color:"#111118",intensity:0.2,pos:[0,0,0]},
        ],
        "Overcast Soft": [
          {type:"Hemisphere",color:"#ccddee",intensity:1,pos:[0,1,0]},
          {type:"Ambient",color:"#aabbcc",intensity:0.4,pos:[0,0,0]},
        ],
      };
      const cfg=configs[p]||configs["Studio 3-Point"];
      cfg.forEach(c=>{
        setType(c.type); setColor(c.color); setIntensity(c.intensity);
        setPosX(c.pos[0]); setPosY(c.pos[1]); setPosZ(c.pos[2]);
        setCastShadow(true);
        // Direct add
        const id=nextId.current++;
        const col=new THREE.Color(c.color);
        let light;
        switch(c.type){
          case "Point": light=new THREE.PointLight(col,c.intensity,50); break;
          case "Spot": light=new THREE.SpotLight(col,c.intensity,80,Math.PI/4,0.2); break;
          case "Hemisphere": light=new THREE.HemisphereLight(col,0x333344,c.intensity); break;
          case "Ambient": light=new THREE.AmbientLight(col,c.intensity); break;
          default: light=new THREE.DirectionalLight(col,c.intensity);
        }
        light.position.set(...c.pos);
        if(light.shadow) light.castShadow=true;
        scene.add(light);
        lightRefs.current[id]=light;
        setLights(prev=>[...prev,{id,type:c.type,color:c.color,intensity:c.intensity,castShadow:true,pos:c.pos}]);
      });
      setStatus(`✓ ${p} preset applied`);
    },0);
  }

  function exportSetup(){
    const data=lights.map(l=>({...l}));
    const b=new Blob([JSON.stringify({preset,shadowMap,lights:data},null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="lighting.json"; a.click();
  }

  return (
    <div style={S.root}>
      <div style={S.h2}>💡 LIGHTING STUDIO</div>
      <div style={S.section}>
        <label style={S.label}>Preset</label>
        <select style={S.select} value={preset} onChange={e=>{setPreset(e.target.value); applyPreset(e.target.value);}}>
          {PRESETS_L.map(p=><option key={p}>{p}</option>)}
        </select>
        <label style={S.label}>Shadow Map Type</label>
        <select style={S.select} value={shadowMap} onChange={e=>{setShadowMap(e.target.value); applyRendererShadow(e.target.value);}}>
          {SHADOW_MAPS.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={S.section}>
        <label style={S.label}>Light Type</label>
        <select style={S.select} value={type} onChange={e=>setType(e.target.value)}>
          {LIGHT_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <label style={S.label}>Color</label>
        <input style={{...S.input,padding:2,height:32}} type="color" value={color} onChange={e=>setColor(e.target.value)}/>
        <label style={S.label}>Intensity: {intensity.toFixed(2)}</label>
        <input style={S.input} type="range" min={0} max={5} step={0.05} value={intensity} onChange={e=>setIntensity(+e.target.value)}/>
        <label style={S.label}>Position X:{posX} Y:{posY} Z:{posZ}</label>
        <input style={S.input} type="range" min={-50} max={50} value={posX} onChange={e=>setPosX(+e.target.value)}/>
        <input style={S.input} type="range" min={0} max={100} value={posY} onChange={e=>setPosY(+e.target.value)}/>
        <input style={S.input} type="range" min={-50} max={50} value={posZ} onChange={e=>setPosZ(+e.target.value)}/>
        <label style={{...S.label,cursor:"pointer"}}><input type="checkbox" checked={castShadow} onChange={e=>setCastShadow(e.target.checked)}/> Cast Shadow</label>
        <button style={S.btn} onClick={addLight}>+ Add Light</button>
      </div>
      {lights.length>0 && (
        <div style={S.section}>
          <div style={S.label}>Active Lights ({lights.length})</div>
          {lights.map(l=>(
            <div key={l.id} style={S.lightRow}>
              <span style={{fontSize:10}}>#{l.id} {l.type} <span style={{color:l.color}}>■</span> {l.intensity.toFixed(1)}</span>
              <button style={S.btnSm} onClick={()=>removeLight(l.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
      <button style={S.btnO} onClick={clearAll}>🗑 Clear All</button>
      <button style={S.btn} onClick={exportSetup}>💾 Export</button>
      {status && <div style={{...S.stat,marginTop:8}}>{status}</div>}
    </div>
  );
}