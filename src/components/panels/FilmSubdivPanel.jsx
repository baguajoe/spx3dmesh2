import React, { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { createMultiresStack, subdivideLevel, setMultiresLevel } from '../../mesh/MultiresSystem.js';
import { catmullClarkSubdivide as subdivideGeometry } from '../../mesh/SubdivisionSurface.js';
const C={bg:'#06060f',panel:'#0d1117',border:'#21262d',teal:'#00ffc8',orange:'#FF6600',text:'#e0e0e0',dim:'#8b949e',font:'JetBrains Mono,monospace'};
function Slider({label,value,min,max,step=1,onChange,unit=''}){return(<div style={{marginBottom:5}}><div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.dim,marginBottom:1}}><span>{label}</span><span style={{color:C.teal,fontWeight:700}}>{Math.round(value)}{unit}</span></div><input type='range' min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{width:'100%',accentColor:C.teal,cursor:'pointer',height:3}}/></div>);}
function Section({title,color=C.teal,children,defaultOpen=true}){const [open,setOpen]=useState(defaultOpen);return(<div style={{marginBottom:6}}><div onClick={()=>setOpen(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 8px',background:'#0a0f1a',borderRadius:4,cursor:'pointer',borderLeft:`2px solid ${color}`,marginBottom:open?5:0}}><span style={{color,fontSize:9}}>{open?'▾':'▸'}</span><span style={{fontSize:9,fontWeight:700,color:C.text,letterSpacing:1}}>{title}</span></div>{open&&<div style={{paddingLeft:8}}>{children}</div>}</div>);}
export default function FilmSubdivPanel({meshRef,sceneRef,open=true,onClose}){
  const [levels,setLevels]=useState([]);
  const [currentLevel,setCurrentLevelState]=useState(0);
  const [subdivLevels,setSubdivLevels]=useState(1);
  const [adaptiveThresh,setAdaptiveThresh]=useState(0.05);
  const [preserveCreases,setPreserveCreases]=useState(true);
  const [polyCount,setPolyCount]=useState(0);
  const stackRef=useRef(null);
  const getStats=useCallback(()=>{const mesh=meshRef?.current;if(!mesh||!mesh.geometry)return;const idx=mesh.geometry.index;const tris=idx?idx.count/3:mesh.geometry.attributes.position.count/3;setPolyCount(Math.round(tris));},[meshRef]);
  const initStack=useCallback(()=>{const mesh=meshRef?.current;if(!mesh)return;stackRef.current=createMultiresStack(mesh);setLevels([{verts:mesh.geometry.attributes.position.count}]);setCurrentLevelState(0);getStats();},[meshRef,getStats]);
  const addLevel=useCallback(()=>{if(!stackRef.current){initStack();return;}try{subdivideLevel(stackRef.current);const lvls=stackRef.current.levels.map(l=>({verts:l.vertices}));setLevels(lvls);setCurrentLevelState(stackRef.current.currentLevel);getStats();}catch(e){console.error('Subdivide failed:',e);}},[stackRef,initStack,getStats]);
  const goToLevel=useCallback((lvl)=>{if(!stackRef.current)return;setMultiresLevel(stackRef.current,lvl);setCurrentLevelState(lvl);getStats();},[stackRef,getStats]);
  const applySubdiv=useCallback(()=>{const mesh=meshRef?.current;if(!mesh||!mesh.geometry)return;try{let geo=mesh.geometry;for(let i=0;i<subdivLevels;i++){geo=subdivideGeometry(geo,1);}geo.computeVertexNormals();mesh.geometry.dispose();mesh.geometry=geo;getStats();}catch(e){console.error('Apply subdiv failed:',e);}},[meshRef,subdivLevels,getStats]);
  const flatShade=useCallback(()=>{const mesh=meshRef?.current;if(!mesh||!mesh.geometry)return;delete mesh.geometry.attributes.normal;mesh.geometry.computeVertexNormals();if(mesh.material){mesh.material.flatShading=true;mesh.material.needsUpdate=true;}},[meshRef]);
  const smoothShade=useCallback(()=>{const mesh=meshRef?.current;if(!mesh||!mesh.geometry)return;mesh.geometry.computeVertexNormals();if(mesh.material){mesh.material.flatShading=false;mesh.material.needsUpdate=true;}},[meshRef]);
  if(!open)return null;
  return(<div style={{width:250,background:C.panel,borderRadius:6,border:`1px solid ${C.border}`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:600}}>
    <div style={{background:'linear-gradient(90deg,#0a1520,#0d1117)',borderBottom:`1px solid ${C.border}`,padding:'8px 12px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
      <div style={{width:6,height:6,borderRadius:'50%',background:'#44aaff',boxShadow:'0 0 6px #44aaff'}}/><span style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#44aaff'}}>SUBDIVISION</span>
      {onClose&&<span onClick={onClose} style={{marginLeft:'auto',cursor:'pointer',color:C.dim}}>×</span>}
    </div>
    <div style={{flex:1,overflowY:'auto',padding:'10px 12px'}}>
      <div style={{background:C.bg,borderRadius:4,padding:'6px 10px',marginBottom:8,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:9,color:C.dim,letterSpacing:1}}>POLY COUNT</div>
        <div style={{fontSize:16,fontWeight:700,color:polyCount>500000?C.orange:C.teal}}>{polyCount.toLocaleString()}</div>
      </div>
      <Section title='MULTIRES LEVELS' color='#44aaff'>
        {levels.length===0&&<div style={{fontSize:9,color:C.dim,marginBottom:6}}>No levels — init stack first</div>}
        <div style={{display:'flex',flexDirection:'column',gap:3,marginBottom:6}}>
          {levels.map((l,i)=><div key={i} onClick={()=>goToLevel(i)} style={{display:'flex',justifyContent:'space-between',padding:'4px 8px',borderRadius:4,cursor:'pointer',border:`1px solid ${currentLevel===i?'#44aaff':C.border}`,background:currentLevel===i?'rgba(68,170,255,0.1)':C.bg}}><span style={{fontSize:9,fontWeight:700,color:currentLevel===i?'#44aaff':C.dim}}>Level {i}</span><span style={{fontSize:9,color:C.dim}}>{l.verts.toLocaleString()} verts</span></div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
          <button onClick={initStack} style={{padding:'6px 0',background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,color:C.dim,fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer'}}>INIT</button>
          <button onClick={addLevel} style={{padding:'6px 0',background:'rgba(68,170,255,0.1)',border:'1px solid #44aaff',borderRadius:4,color:'#44aaff',fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer'}}>+ LEVEL</button>
        </div>
      </Section>
      <Section title='APPLY SUBDIVISION' color={C.teal}>
        <Slider label='LEVELS' value={subdivLevels} min={1} max={4} step={1} onChange={setSubdivLevels}/>
        <button onClick={applySubdiv} style={{width:'100%',padding:'7px 0',marginTop:4,background:'rgba(0,255,200,0.1)',border:`1px solid ${C.teal}`,borderRadius:4,color:C.teal,fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer',letterSpacing:1}}>SUBDIVIDE MESH</button>
        <button onClick={getStats} style={{width:'100%',padding:'5px 0',marginTop:4,background:'transparent',border:`1px solid ${C.border}`,borderRadius:4,color:C.dim,fontFamily:C.font,fontSize:9,cursor:'pointer'}}>REFRESH STATS</button>
      </Section>
      <Section title='SHADING' color={C.orange} defaultOpen={false}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          <button onClick={flatShade} style={{padding:'6px 0',background:'rgba(255,102,0,0.1)',border:`1px solid ${C.orange}`,borderRadius:4,color:C.orange,fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer'}}>FLAT</button>
          <button onClick={smoothShade} style={{padding:'6px 0',background:'rgba(0,255,200,0.1)',border:`1px solid ${C.teal}`,borderRadius:4,color:C.teal,fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer'}}>SMOOTH</button>
        </div>
      </Section>
    </div>
  </div>);
}