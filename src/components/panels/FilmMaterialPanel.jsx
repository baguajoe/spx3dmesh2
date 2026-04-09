import React, { useState, useCallback } from 'react';
import * as THREE from 'three';
const C = { bg:'#06060f', panel:'#0d1117', border:'#21262d', teal:'#00ffc8', orange:'#FF6600', text:'#e0e0e0', dim:'#8b949e', font:'JetBrains Mono,monospace' };
function Slider({label,value,min,max,step=0.01,onChange,unit=''}){return(<div style={{marginBottom:5}}><div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.dim,marginBottom:1}}><span>{label}</span><span style={{color:C.teal,fontWeight:700}}>{step<0.1?Number(value).toFixed(2):Math.round(value)}{unit}</span></div><input type='range' min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{width:'100%',accentColor:C.teal,cursor:'pointer',height:3}}/></div>);}
function ColorRow({label,value,onChange}){return(<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}><span style={{fontSize:9,color:C.dim,flex:1}}>{label}</span><input type='color' value={value} onChange={e=>onChange(e.target.value)} style={{width:28,height:20,border:'none',background:'none',cursor:'pointer'}}/><span style={{fontSize:9,color:C.dim,width:52}}>{value}</span></div>);}
function Section({title,color=C.teal,children,defaultOpen=true}){const [open,setOpen]=useState(defaultOpen);return(<div style={{marginBottom:6}}><div onClick={()=>setOpen(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 8px',background:'#0a0f1a',borderRadius:4,cursor:'pointer',borderLeft:`2px solid ${color}`,marginBottom:open?5:0}}><span style={{color,fontSize:9}}>{open?'▾':'▸'}</span><span style={{fontSize:9,fontWeight:700,color:C.text,letterSpacing:1}}>{title}</span></div>{open&&<div style={{paddingLeft:8}}>{children}</div>}</div>);}
const PRESETS=[
  {label:'Chrome',  color:'#c8c8c8',r:0.05,m:1.0,cc:1.0,ccr:0.05,tr:0.0,sh:0.0},
  {label:'Gold',    color:'#ffcc44',r:0.1, m:1.0,cc:0.5,ccr:0.1, tr:0.0,sh:0.0},
  {label:'Glass',   color:'#cce8ff',r:0.0, m:0.0,cc:0.0,ccr:0.0, tr:1.0,sh:0.0},
  {label:'Marble',  color:'#f5f0ee',r:0.2, m:0.0,cc:0.8,ccr:0.1, tr:0.0,sh:0.0},
  {label:'Skin',    color:'#f0c090',r:0.7, m:0.0,cc:0.0,ccr:0.3, tr:0.0,sh:0.4},
  {label:'Obsidian',color:'#1a1520',r:0.02,m:0.3,cc:1.0,ccr:0.0, tr:0.0,sh:0.0},
  {label:'Copper',  color:'#c87941',r:0.25,m:0.9,cc:0.3,ccr:0.2, tr:0.0,sh:0.0},
  {label:'Ice',     color:'#cce8ff',r:0.05,m:0.0,cc:0.0,ccr:0.0, tr:0.8,sh:0.0},
  {label:'Concrete',color:'#7a7a72',r:0.95,m:0.0,cc:0.0,ccr:0.5, tr:0.0,sh:0.0},
  {label:'Rubber',  color:'#1a1a1a',r:1.0, m:0.0,cc:0.0,ccr:0.5, tr:0.0,sh:0.0},
];
export default function FilmMaterialPanel({sceneRef,open=true,onClose}){
  const [color,setColor]=useState('#c8c8c8');
  const [roughness,setRoughness]=useState(0.05);
  const [metalness,setMetalness]=useState(1.0);
  const [clearcoat,setClearcoat]=useState(1.0);
  const [ccr,setCcr]=useState(0.05);
  const [transmission,setTransmission]=useState(0.0);
  const [ior,setIor]=useState(1.5);
  const [thickness,setThickness]=useState(0.5);
  const [sheen,setSheen]=useState(0.0);
  const [sheenColor,setSheenColor]=useState('#ffffff');
  const [anisotropy,setAnisotropy]=useState(0.0);
  const [iridescence,setIridescence]=useState(0.0);
  const [emissive,setEmissive]=useState('#000000');
  const [emissiveInt,setEmissiveInt]=useState(0.0);
  const [envInt,setEnvInt]=useState(1.2);
  const [opacity,setOpacity]=useState(1.0);
  const buildMat=useCallback(()=>new THREE.MeshPhysicalMaterial({color:new THREE.Color(color),roughness,metalness,clearcoat,clearcoatRoughness:ccr,transmission,ior,thickness,sheen,sheenColor:new THREE.Color(sheenColor),anisotropy,iridescence,emissive:new THREE.Color(emissive),emissiveIntensity:emissiveInt,envMapIntensity:envInt,transparent:transmission>0||opacity<1,opacity,side:THREE.FrontSide}),[color,roughness,metalness,clearcoat,ccr,transmission,ior,thickness,sheen,sheenColor,anisotropy,iridescence,emissive,emissiveInt,envInt,opacity]);
  const applyAll=useCallback(()=>{const s=sceneRef?.current;if(!s)return;const m=buildMat();s.traverse(o=>{if(o.isMesh&&!o.userData.isHelper){o.material=m.clone();o.material.needsUpdate=true;}});},[buildMat,sceneRef]);
  const load=p=>{setColor(p.color);setRoughness(p.r);setMetalness(p.m);setClearcoat(p.cc);setCcr(p.ccr);setTransmission(p.tr);setSheen(p.sh);};
  if(!open)return null;
  return(<div style={{width:250,background:C.panel,borderRadius:6,border:`1px solid ${C.border}`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:680}}>
    <div style={{background:'linear-gradient(90deg,#0a1520,#0d1117)',borderBottom:`1px solid ${C.border}`,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
      <div style={{width:6,height:6,borderRadius:'50%',background:'#aa88ff',boxShadow:'0 0 6px #aa88ff'}}/><span style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#aa88ff'}}>FILM MATERIAL</span>
      {onClose&&<span onClick={onClose} style={{marginLeft:'auto',cursor:'pointer',color:C.dim}}>×</span>}
    </div>
    <div style={{flex:1,overflowY:'auto',padding:'10px 12px'}}>
      <Section title='QUICK PRESETS' color='#aa88ff'>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:6}}>
          {PRESETS.map(p=><div key={p.label} onClick={()=>load(p)} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 6px',borderRadius:4,cursor:'pointer',border:`1px solid ${C.border}`,background:C.bg}} onMouseEnter={e=>e.currentTarget.style.borderColor='#aa88ff'} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}><div style={{width:12,height:12,borderRadius:2,background:p.color,flexShrink:0}}/><span style={{fontSize:8,fontWeight:700,color:C.dim}}>{p.label}</span></div>)}
        </div>
      </Section>
      <Section title='BASE PBR' color={C.teal}>
        <ColorRow label='COLOR' value={color} onChange={setColor}/>
        <Slider label='ROUGHNESS' value={roughness} min={0} max={1} onChange={setRoughness}/>
        <Slider label='METALNESS' value={metalness} min={0} max={1} onChange={setMetalness}/>
        <Slider label='OPACITY' value={opacity} min={0} max={1} onChange={setOpacity}/>
        <Slider label='ENV MAP' value={envInt} min={0} max={3} step={0.05} onChange={setEnvInt}/>
      </Section>
      <Section title='CLEARCOAT' color='#88ccff' defaultOpen={false}>
        <Slider label='CLEARCOAT' value={clearcoat} min={0} max={1} onChange={setClearcoat}/>
        <Slider label='CC ROUGHNESS' value={ccr} min={0} max={1} onChange={setCcr}/>
      </Section>
      <Section title='TRANSMISSION / GLASS' color='#aaffee' defaultOpen={false}>
        <Slider label='TRANSMISSION' value={transmission} min={0} max={1} onChange={setTransmission}/>
        <Slider label='IOR' value={ior} min={1} max={3} step={0.01} onChange={setIor}/>
        <Slider label='THICKNESS' value={thickness} min={0} max={5} step={0.05} onChange={setThickness}/>
      </Section>
      <Section title='SHEEN / SKIN' color='#ffaacc' defaultOpen={false}>
        <Slider label='SHEEN' value={sheen} min={0} max={1} onChange={setSheen}/>
        <ColorRow label='SHEEN COLOR' value={sheenColor} onChange={setSheenColor}/>
      </Section>
      <Section title='ADVANCED' color={C.dim} defaultOpen={false}>
        <Slider label='ANISOTROPY' value={anisotropy} min={0} max={1} onChange={setAnisotropy}/>
        <Slider label='IRIDESCENCE' value={iridescence} min={0} max={1} onChange={setIridescence}/>
      </Section>
      <Section title='EMISSIVE' color={C.orange} defaultOpen={false}>
        <ColorRow label='EMISSIVE' value={emissive} onChange={setEmissive}/>
        <Slider label='INTENSITY' value={emissiveInt} min={0} max={5} step={0.05} onChange={setEmissiveInt}/>
      </Section>
      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:6,marginTop:8}}>
        <button onClick={applyAll} style={{padding:'7px 0',background:'rgba(255,102,0,0.1)',border:`1px solid ${C.orange}`,borderRadius:4,color:C.orange,fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer',letterSpacing:1}}>APPLY TO ALL MESHES</button>
      </div>
    </div>
  </div>);
}