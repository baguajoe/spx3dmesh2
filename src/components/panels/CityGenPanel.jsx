import React, { useState, useRef, useCallback } from 'react';
import { generateCity, disposeCity } from '../../mesh/CityGenerator.js';
import { generateDetailedBuilding, BUILDING_STYLES } from '../../mesh/BuildingGenerator.js';

const C={bg:'#06060f',panel:'#0d1117',border:'#21262d',teal:'#00ffc8',orange:'#FF6600',text:'#e0e0e0',dim:'#8b949e',font:'JetBrains Mono,monospace'};

function Knob({label,value,min,max,step=1,onChange,color=C.teal,unit=''}) {
  const pct=Math.min(1,Math.max(0,(value-min)/(max-min)));
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:52}}>
      <div style={{width:42,height:42,borderRadius:'50%',background:`conic-gradient(${color} 0% ${pct*100}%, #1a2030 ${pct*100}% 100%)`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'ns-resize',border:'2px solid #1a2030'}}
        onMouseDown={e=>{const sy=e.clientY,sv=value;const mv=ev=>{const d=(sy-ev.clientY)/80*(max-min);onChange(Math.min(max,Math.max(min,step<1?parseFloat((sv+d).toFixed(2)):Math.round(sv+d))));};const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);};document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);}}>
        <div style={{width:28,height:28,borderRadius:'50%',background:C.panel,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{fontSize:7,fontWeight:700,color,fontFamily:C.font}}>{step<1?value.toFixed(1):Math.round(value)}{unit}</span>
        </div>
      </div>
      <span style={{fontSize:7,color:C.dim,letterSpacing:0.3,textTransform:'uppercase',textAlign:'center',fontFamily:C.font}}>{label}</span>
    </div>
  );
}

export default function CityGenPanel({sceneRef,open=true,onClose}) {
  const [mode,setMode]=useState('city');
  const [gridSize,setGridSize]=useState(6);
  const [blockSize,setBlockSize]=useState(4);
  const [density,setDensity]=useState(0.75);
  const [seed,setSeed]=useState(42);
  const [addRoads,setAddRoads]=useState(true);
  const [status,setStatus]=useState('Configure and generate');
  const [buildStyle,setBuildStyle]=useState(0);
  const [floors,setFloors]=useState(20);
  const [bWidth,setBWidth]=useState(4);
  const [bDepth,setBDepth]=useState(3);
  const cityRef=useRef(null);

  const generateCityFn=useCallback(()=>{
    const scene=sceneRef?.current; if(!scene) return;
    if(cityRef.current) disposeCity(scene,cityRef.current);
    setStatus('Generating...');
    setTimeout(()=>{
      try {
        const city=generateCity(scene,{gridSize,blockSize,density,seed,addRoads});
        cityRef.current=city;
        let count=0; city.traverse(o=>{if(o.isMesh)count++;});
        setStatus(`City generated — ${count} meshes`);
      } catch(e){setStatus('Error: '+e.message);}
    },10);
  },[sceneRef,gridSize,blockSize,density,seed,addRoads]);

  const generateBuildingFn=useCallback(()=>{
    const scene=sceneRef?.current; if(!scene) return;
    const style=BUILDING_STYLES[buildStyle];
    try {
      const b=generateDetailedBuilding({style:style.style,floors,width:bWidth,depth:bDepth,seed,addWindows:true});
      scene.add(b);
      setStatus(`${style.label} generated — ${floors} floors`);
    } catch(e){setStatus('Error: '+e.message);}
  },[sceneRef,buildStyle,floors,bWidth,bDepth,seed]);

  const clearCity=useCallback(()=>{
    const scene=sceneRef?.current; if(!scene) return;
    if(cityRef.current){disposeCity(scene,cityRef.current);cityRef.current=null;}
    setStatus('Cleared');
  },[sceneRef]);

  if(!open) return null;
  return (
    <div style={{width:320,background:C.panel,borderRadius:8,border:`1px solid ${C.border}`,fontFamily:C.font,color:C.text,boxShadow:'0 16px 48px rgba(0,0,0,0.8)',display:'flex',flexDirection:'column',maxHeight:680}}>
      <div style={{background:'linear-gradient(135deg,#0a1020,#0d1117)',borderBottom:`1px solid ${C.border}`,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:'#44aaff',boxShadow:'0 0 10px #44aaff'}}/>
        <span style={{fontSize:12,fontWeight:700,letterSpacing:3,color:'#44aaff'}}>CITY GENERATOR</span>
        {onClose&&<span onClick={onClose} style={{marginLeft:'auto',cursor:'pointer',color:C.dim,fontSize:14}}>×</span>}
      </div>
      <div style={{padding:'5px 14px',fontSize:9,color:C.dim,borderBottom:`1px solid ${C.border}`}}>{status}</div>
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px'}}>
        <div style={{display:'flex',gap:4,marginBottom:12,padding:'3px',background:'#0a0f1a',borderRadius:6}}>
          {['city','building'].map(m=>(
            <div key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'5px 0',textAlign:'center',borderRadius:4,cursor:'pointer',fontSize:9,fontWeight:700,letterSpacing:1,background:mode===m?'#1a2535':'transparent',color:mode===m?C.teal:C.dim,border:`1px solid ${mode===m?C.teal:'transparent'}`}}>{m==='city'?'FULL CITY':'SINGLE BUILDING'}</div>
          ))}
        </div>
        {mode==='city'?(
          <>
            <div style={{fontSize:9,fontWeight:700,color:C.dim,letterSpacing:2,marginBottom:10}}>CITY PARAMETERS</div>
            <div style={{display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:8,marginBottom:14}}>
              <Knob label="Grid"    value={gridSize}  min={2}  max={16} step={1}   onChange={setGridSize}  color='#44aaff'/>
              <Knob label="Block"   value={blockSize} min={2}  max={10} step={0.5} onChange={setBlockSize} color='#88ccff'/>
              <Knob label="Density" value={density}   min={0}  max={1}  step={0.05}onChange={setDensity}   color={C.teal}/>
              <Knob label="Seed"    value={seed}      min={0}  max={999}step={1}   onChange={setSeed}      color='#ffaa44'/>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'8px 10px',background:'#0a0f1a',borderRadius:5,border:`1px solid ${C.border}`}}>
              <span style={{fontSize:9,color:C.dim}}>ROADS</span>
              <div onClick={()=>setAddRoads(v=>!v)} style={{width:32,height:16,borderRadius:8,cursor:'pointer',position:'relative',background:addRoads?C.teal:C.border}}>
                <div style={{position:'absolute',top:2,left:addRoads?16:2,width:12,height:12,borderRadius:'50%',background:addRoads?C.bg:'#555',transition:'left 0.15s'}}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              <button onClick={generateCityFn} style={{padding:'9px 0',background:'rgba(68,170,255,0.1)',border:'1px solid #44aaff',borderRadius:5,color:'#44aaff',fontFamily:C.font,fontSize:10,fontWeight:700,cursor:'pointer',letterSpacing:1}}>🏙 GENERATE</button>
              <button onClick={clearCity} style={{padding:'9px 0',background:C.bg,border:`1px solid ${C.border}`,borderRadius:5,color:C.dim,fontFamily:C.font,fontSize:10,cursor:'pointer'}}>✕ CLEAR</button>
            </div>
          </>
        ):(
          <>
            <div style={{fontSize:9,fontWeight:700,color:C.dim,letterSpacing:2,marginBottom:8}}>BUILDING STYLE</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:3,marginBottom:12}}>
              {BUILDING_STYLES.map((s,i)=>(
                <div key={s.label} onClick={()=>setBuildStyle(i)} style={{padding:'6px 8px',borderRadius:5,cursor:'pointer',fontSize:9,fontWeight:700,border:`1px solid ${buildStyle===i?C.teal:C.border}`,color:buildStyle===i?C.teal:C.dim,background:buildStyle===i?'rgba(0,255,200,0.08)':C.bg}}>{s.label}</div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'space-around',gap:8,marginBottom:12}}>
              <Knob label="Floors" value={floors} min={2}  max={80} step={1}   onChange={setFloors} color='#44aaff'/>
              <Knob label="Width"  value={bWidth} min={1}  max={20} step={0.5} onChange={setBWidth} color={C.teal}/>
              <Knob label="Depth"  value={bDepth} min={1}  max={20} step={0.5} onChange={setBDepth} color='#88ccff'/>
              <Knob label="Seed"   value={seed}   min={0}  max={999}step={1}   onChange={setSeed}   color='#ffaa44'/>
            </div>
            <button onClick={generateBuildingFn} style={{width:'100%',padding:'9px 0',background:'rgba(68,170,255,0.1)',border:'1px solid #44aaff',borderRadius:5,color:'#44aaff',fontFamily:C.font,fontSize:10,fontWeight:700,cursor:'pointer',letterSpacing:1}}>🏗 GENERATE BUILDING</button>
          </>
        )}
      </div>
    </div>
  );
}
