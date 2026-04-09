import React, { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { createBrushSettings, getFalloff, BRUSH_TYPES } from '../../mesh/SculptEngine.js';
import { BRUSHES } from '../../mesh/SculptBrushes.js';
const C={bg:'#06060f',panel:'#0d1117',border:'#21262d',teal:'#00ffc8',orange:'#FF6600',text:'#e0e0e0',dim:'#8b949e',font:'JetBrains Mono,monospace'};
function Slider({label,value,min,max,step=0.01,onChange,unit=''}){return(<div style={{marginBottom:5}}><div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.dim,marginBottom:1}}><span>{label}</span><span style={{color:C.teal,fontWeight:700}}>{step<0.1?Number(value).toFixed(2):Math.round(value)}{unit}</span></div><input type='range' min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{width:'100%',accentColor:C.teal,cursor:'pointer',height:3}}/></div>);}
function Toggle({label,value,onChange}){return(<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}><span style={{fontSize:9,color:C.dim}}>{label}</span><div onClick={()=>onChange(!value)} style={{width:32,height:16,borderRadius:8,cursor:'pointer',position:'relative',background:value?C.teal:C.border,transition:'background 0.2s'}}><div style={{position:'absolute',top:2,left:value?16:2,width:12,height:12,borderRadius:'50%',background:value?C.bg:'#555',transition:'left 0.2s'}}/></div></div>);}
function Section({title,color=C.teal,children,defaultOpen=true}){const [open,setOpen]=useState(defaultOpen);return(<div style={{marginBottom:6}}><div onClick={()=>setOpen(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 8px',background:'#0a0f1a',borderRadius:4,cursor:'pointer',borderLeft:`2px solid ${color}`,marginBottom:open?5:0}}><span style={{color,fontSize:9}}>{open?'▾':'▸'}</span><span style={{fontSize:9,fontWeight:700,color:C.text,letterSpacing:1}}>{title}</span></div>{open&&<div style={{paddingLeft:8}}>{children}</div>}</div>);}
const FALLOFFS=['smooth','linear','sharp','sphere','root','constant','cubic','sine','spike'];
const BRUSH_LIST=Object.entries({...BRUSH_TYPES,...Object.fromEntries(Object.entries(BRUSHES).map(([k,v])=>[k,k]))});
export default function FilmSculptPanel({meshRef,sceneRef,open=true,onClose}){
  const [brushType,setBrushType]=useState('draw');
  const [radius,setRadius]=useState(0.3);
  const [strength,setStrength]=useState(0.5);
  const [falloff,setFalloff]=useState('smooth');
  const [symmetry,setSymmetry]=useState(false);
  const [symmetryAxis,setSymmetryAxis]=useState('x');
  const [lazyMouse,setLazyMouse]=useState(false);
  const [lazyRadius,setLazyRadius]=useState(0.1);
  const [accumulate,setAccumulate]=useState(false);
  const [backfaceCull,setBackfaceCull]=useState(true);
  const [dynTopo,setDynTopo]=useState(false);
  const [dynTopoThresh,setDynTopoThresh]=useState(0.05);
  const [smoothIterations,setSmoothIterations]=useState(1);
  const getBrush=useCallback(()=>createBrushSettings({type:brushType,radius,strength,falloff,symmetry,symmetryAxis,lazyMouse,lazyRadius,accumulate,backfaceCull}),[brushType,radius,strength,falloff,symmetry,symmetryAxis,lazyMouse,lazyRadius,accumulate,backfaceCull]);
  const smoothMesh=useCallback(()=>{
    const mesh=meshRef?.current; if(!mesh||!mesh.geometry) return;
    const pos=mesh.geometry.attributes.position;
    for(let iter=0;iter<smoothIterations;iter++){
      const orig=new Float32Array(pos.array);
      const idx=mesh.geometry.index?Array.from(mesh.geometry.index.array):null;
      if(!idx) continue;
      const neighbors=new Map();
      for(let i=0;i<idx.length;i+=3){const [a,b,c]=[idx[i],idx[i+1],idx[i+2]];[[a,b],[a,c],[b,a],[b,c],[c,a],[c,b]].forEach(([x,y])=>{if(!neighbors.has(x))neighbors.set(x,[]);neighbors.get(x).push(y);});}
      for(let i=0;i<pos.count;i++){const nb=neighbors.get(i)||[];if(!nb.length)continue;let sx=0,sy=0,sz=0;nb.forEach(j=>{sx+=orig[j*3];sy+=orig[j*3+1];sz+=orig[j*3+2];});const n=nb.length;pos.setXYZ(i,(orig[i*3]+sx/n)/2,(orig[i*3+1]+sy/n)/2,(orig[i*3+2]+sz/n)/2);}
    }
    pos.needsUpdate=true; mesh.geometry.computeVertexNormals();
  },[meshRef,smoothIterations]);
  const recomputeNormals=useCallback(()=>{const mesh=meshRef?.current;if(!mesh||!mesh.geometry)return;mesh.geometry.computeVertexNormals();mesh.geometry.attributes.normal.needsUpdate=true;},[meshRef]);
  if(!open)return null;
  return(<div style={{width:250,background:C.panel,borderRadius:6,border:`1px solid ${C.border}`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:680}}>
    <div style={{background:'linear-gradient(90deg,#0a1520,#0d1117)',borderBottom:`1px solid ${C.border}`,padding:'8px 12px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
      <div style={{width:6,height:6,borderRadius:'50%',background:'#ff8844',boxShadow:'0 0 6px #ff8844'}}/><span style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#ff8844'}}>FILM SCULPT</span>
      {onClose&&<span onClick={onClose} style={{marginLeft:'auto',cursor:'pointer',color:C.dim}}>×</span>}
    </div>
    <div style={{flex:1,overflowY:'auto',padding:'10px 12px'}}>
      <Section title='BRUSH TYPE' color='#ff8844'>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:3,marginBottom:6}}>
          {['draw','flatten','smooth','pinch','inflate','crease','grab','nudge','rotate','scrape','fill','trim','mask','elastic','clay'].map(b=><div key={b} onClick={()=>setBrushType(b)} style={{padding:'4px 6px',borderRadius:4,cursor:'pointer',fontSize:8,fontWeight:700,textAlign:'center',border:`1px solid ${brushType===b?'#ff8844':C.border}`,background:brushType===b?'rgba(255,136,68,0.15)':C.bg,color:brushType===b?'#ff8844':C.dim,letterSpacing:0.5}}>{b.toUpperCase()}</div>)}
        </div>
      </Section>
      <Section title='BRUSH SETTINGS' color={C.teal}>
        <Slider label='RADIUS'   value={radius}   min={0.01} max={2}  step={0.01} onChange={setRadius}/>
        <Slider label='STRENGTH' value={strength} min={0.01} max={1}  step={0.01} onChange={setStrength}/>
        <div style={{fontSize:9,color:C.dim,marginBottom:4,letterSpacing:1}}>FALLOFF</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:6}}>{FALLOFFS.map(f=><div key={f} onClick={()=>setFalloff(f)} style={{padding:'2px 6px',borderRadius:3,cursor:'pointer',fontSize:8,fontWeight:700,border:`1px solid ${falloff===f?C.teal:C.border}`,background:falloff===f?'rgba(0,255,200,0.1)':C.bg,color:falloff===f?C.teal:C.dim}}>{f}</div>)}</div>
      </Section>
      <Section title='SYMMETRY' color='#88aaff' defaultOpen={false}>
        <Toggle label='SYMMETRY' value={symmetry} onChange={setSymmetry}/>
        <div style={{display:'flex',gap:4}}>{['x','y','z'].map(ax=><div key={ax} onClick={()=>setSymmetryAxis(ax)} style={{flex:1,padding:'4px',textAlign:'center',borderRadius:4,cursor:'pointer',fontSize:10,fontWeight:700,border:`1px solid ${symmetryAxis===ax?'#88aaff':C.border}`,color:symmetryAxis===ax?'#88aaff':C.dim,background:symmetryAxis===ax?'rgba(136,170,255,0.1)':C.bg}}>{ax.toUpperCase()}</div>)}</div>
      </Section>
      <Section title='LAZY MOUSE' color='#aaffcc' defaultOpen={false}>
        <Toggle label='LAZY MOUSE' value={lazyMouse} onChange={setLazyMouse}/>
        <Slider label='LAZY RADIUS' value={lazyRadius} min={0.01} max={0.5} onChange={setLazyRadius}/>
        <Toggle label='ACCUMULATE' value={accumulate} onChange={setAccumulate}/>
        <Toggle label='BACKFACE CULL' value={backfaceCull} onChange={setBackfaceCull}/>
      </Section>
      <Section title='DYNAMIC TOPOLOGY' color='#ffcc44' defaultOpen={false}>
        <Toggle label='DYNAMIC TOPO' value={dynTopo} onChange={setDynTopo}/>
        <Slider label='DETAIL THRESHOLD' value={dynTopoThresh} min={0.01} max={0.2} step={0.005} onChange={setDynTopoThresh}/>
      </Section>
      <Section title='MESH OPS' color={C.orange} defaultOpen={false}>
        <Slider label='SMOOTH ITERATIONS' value={smoothIterations} min={1} max={10} step={1} onChange={setSmoothIterations}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginTop:4}}>
          <button onClick={smoothMesh} style={{padding:'6px 0',background:'rgba(0,255,200,0.1)',border:`1px solid ${C.teal}`,borderRadius:4,color:C.teal,fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer'}}>SMOOTH</button>
          <button onClick={recomputeNormals} style={{padding:'6px 0',background:'rgba(255,102,0,0.1)',border:`1px solid ${C.orange}`,borderRadius:4,color:C.orange,fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer'}}>NORMALS</button>
        </div>
      </Section>
    </div>
  </div>);
}