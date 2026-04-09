import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { createCrowdSystem, stepCrowd, setCrowdBehavior, disposeCrowd } from '../../mesh/CrowdSystem.js';

const C={bg:'#06060f',panel:'#0d1117',border:'#21262d',teal:'#00ffc8',orange:'#FF6600',text:'#e0e0e0',dim:'#8b949e',font:'JetBrains Mono,monospace'};

function Knob({label,value,min,max,step=1,onChange,color=C.teal,unit=''}) {
  const pct=Math.min(1,Math.max(0,(value-min)/(max-min)));
  return (
    <div className="spnl-knob">
      <div className="spnl-knob-ring-wrap" style={{width:44,height:44,borderRadius:'50%',
        background:`conic-gradient(${color} 0% ${pct*100}%, #1a2030 ${pct*100}% 100%)`,
        display:'flex',alignItems:'center',justifyContent:'center',cursor:'ns-resize',border:'2px solid #1a2030'}}
        onMouseDown={e=>{
          const sy=e.clientY,sv=value;
          const mv=ev=>{const d=(sy-ev.clientY)/80*(max-min);onChange(Math.min(max,Math.max(min,step<1?parseFloat((sv+d).toFixed(2)):Math.round(sv+d))));};
          const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);};
          document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
        }}>
        <div className="spnl-knob-inner">
          <span className="spnl-knob-val" style={{color}}>{step<1?value.toFixed(1):Math.round(value)}{unit}</span>
        </div>
      </div>
      <span className="spnl-knob-label">{label}</span>
    </div>
  );
}

const BEHAVIORS = [
  {id:'flock',  label:'Flock',  icon:'🐦', desc:'Boids — separation, alignment, cohesion', color:'#44aaff'},
  {id:'march',  label:'March',  icon:'🚶', desc:'All agents move to target point',          color:'#44ff88'},
  {id:'scatter',label:'Scatter',icon:'💨', desc:'Agents spread apart rapidly',              color:'#ffaa44'},
  {id:'panic',  label:'Panic',  icon:'😱', desc:'Flee from panic origin point',             color:'#ff4444'},
  {id:'idle',   label:'Idle',   icon:'🧍', desc:'Milling around — subtle random motion',    color:'#aaaaaa'},
];

export default function CrowdPanel({sceneRef, open=true, onClose}) {
  const [count,setCount]       = useState(100);
  const [bounds,setBounds]     = useState(20);
  const [speed,setSpeed]       = useState(1.0);
  const [separation,setSep]    = useState(1.5);
  const [alignment,setAlign]   = useState(1.0);
  const [cohesion,setCohesion] = useState(0.8);
  const [behavior,setBehavior] = useState('flock');
  const [running,setRunning]   = useState(false);
  const [status,setStatus]     = useState('Configure and spawn crowd');
  const [agentCount,setAgentCount] = useState(0);

  const systemRef = useRef(null);
  const rafRef    = useRef(null);

  const spawnCrowd = useCallback(() => {
    const scene = sceneRef?.current; if (!scene) return;
    if (systemRef.current) disposeCrowd(systemRef.current);
    systemRef.current = createCrowdSystem(scene, {count, bounds, behavior});
    systemRef.current.speed = speed;
    systemRef.current.separationWeight = separation;
    systemRef.current.alignmentWeight = alignment;
    systemRef.current.cohesionWeight = cohesion;
    setAgentCount(count);
    setStatus(`${count} agents spawned`);
  }, [sceneRef, count, bounds, behavior, speed, separation, alignment, cohesion]);

  const startSim = useCallback(() => {
    if (!systemRef.current) { spawnCrowd(); }
    setRunning(true);
    const tick = () => {
      if (!systemRef.current) return;
      systemRef.current.speed = speed;
      systemRef.current.separationWeight = separation;
      systemRef.current.alignmentWeight = alignment;
      systemRef.current.cohesionWeight = cohesion;
      stepCrowd(systemRef.current, 1/60);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [spawnCrowd, speed, separation, alignment, cohesion]);

  const stopSim = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setRunning(false);
  }, []);

  const changeBehavior = useCallback((b) => {
    setBehavior(b);
    if (systemRef.current) setCrowdBehavior(systemRef.current, b);
  }, []);

  const setPanic = useCallback(() => {
    changeBehavior('panic');
    if (systemRef.current) {
      systemRef.current.panicPoint = new THREE.Vector3(0,0,0);
    }
  }, [changeBehavior]);

  const clearCrowd = useCallback(() => {
    stopSim();
    if (systemRef.current) { disposeCrowd(systemRef.current); systemRef.current = null; }
    setAgentCount(0); setStatus('Cleared');
  }, [stopSim]);

  useEffect(() => () => { stopSim(); if(systemRef.current) disposeCrowd(systemRef.current); }, []);
  if (!open) return null;

  return (
    <div className="spnl-panel-container-lg" style={{
      fontFamily:C.font,color:C.text,boxShadow:'0 16px 48px rgba(0,0,0,0.8)',
      display:'flex',flexDirection:'column',maxHeight:700,overflow:'hidden'}}>

      <div className="spnl-panel-hdr" style={{
        padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div className="spnl-hdr-dot spnl-hdr-dot--green"/>
        <span className="spnl-hdr-title spnl-hdr-title--green">CROWD SIM</span>
        <div className="spnl-row spnl-ml-auto">
          {agentCount>0&&<span className={`spnl-agent-count${running?' spnl-agent-count--on':''}`}>{agentCount} agents</span>}
          {onClose&&<span onClick={onClose} className="spnl-close">×</span>}
        </div>
      </div>

      <div className="spnl-status-bar">{status}</div>

      <div className="spnl-panel-scroll">

        {/* Behavior selector */}
        <div className="spnl-mb">
          <div className="spnl-section-label">BEHAVIOR</div>
          <div className="spnl-col">
            {BEHAVIORS.map(b=>(
              <div key={b.id} onClick={()=>changeBehavior(b.id)} style={{
                padding:'8px 12px',borderRadius:6,cursor:'pointer',
                border:`1px solid ${behavior===b.id?b.color:C.border}`,
                background:behavior===b.id?`${b.color}12`:C.bg,
                display:'flex',alignItems:'center',gap:10,transition:'all 0.1s'
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=b.color;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=behavior===b.id?b.color:C.border;}}
              >
                <span className="spnl-icon-md">{b.icon}</span>
                <div>
                  <div className="spnl-behavior-label" style={{color:behavior===b.id?b.color:'#e0e0e0'}}>{b.label}</div>
                  <div className="spnl-dim">{b.desc}</div>
                </div>
                {behavior===b.id&&<div className="spnl-behavior-dot" style={{background:b.color}}/>}
              </div>
            ))}
          </div>
        </div>

        {/* Knobs */}
        <div className="spnl-mb">
          <div className="spnl-section-label">PARAMETERS</div>
          <div className="spnl-row spnl-row--around">
            <Knob label="Agents"  value={count}      min={10}  max={500} step={10}  onChange={setCount}     color='#88ffaa'/>
            <Knob label="Bounds"  value={bounds}     min={5}   max={60}  step={1}   onChange={setBounds}    color='#44aaff'/>
            <Knob label="Speed"   value={speed}      min={0.1} max={5}   step={0.1} onChange={setSpeed}     color={C.teal}/>
            <Knob label="Separate"value={separation} min={0}   max={5}   step={0.1} onChange={setSep}       color={C.orange}/>
            <Knob label="Align"   value={alignment}  min={0}   max={3}   step={0.1} onChange={setAlign}     color='#ffaa44'/>
            <Knob label="Cohesion"value={cohesion}   min={0}   max={3}   step={0.1} onChange={setCohesion}  color='#ff88ff'/>
          </div>
        </div>

        {/* Count selector */}
        <div style={{display:'flex',gap:3,marginBottom:14}}>
          {[50,100,200,300,500].map(n=>(
            <div key={n} onClick={()=>setCount(n)} style={{
              flex:1,padding:'5px 0',textAlign:'center',borderRadius:4,cursor:'pointer',
              fontSize:9,fontWeight:700,
              border:`1px solid ${count===n?C.teal:C.border}`,
              color:count===n?C.teal:C.dim,
              background:count===n?'rgba(0,255,200,0.08)':C.bg
            }}>{n}</div>
          ))}
        </div>

        {/* Controls */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
          <button onClick={spawnCrowd} style={{padding:'8px 0',background:'rgba(136,255,170,0.1)',border:'1px solid #88ffaa',borderRadius:5,color:'#88ffaa',fontFamily:C.font,fontSize:10,fontWeight:700,cursor:'pointer',letterSpacing:1}}>👥 SPAWN</button>
          {!running
            ?<button onClick={startSim} style={{padding:'8px 0',background:'rgba(0,255,200,0.1)',border:`1px solid ${C.teal}`,borderRadius:5,color:C.teal,fontFamily:C.font,fontSize:10,fontWeight:700,cursor:'pointer'}}>▶ SIMULATE</button>
            :<button onClick={stopSim}  style={{padding:'8px 0',background:'rgba(255,102,0,0.1)',border:`1px solid ${C.orange}`,borderRadius:5,color:C.orange,fontFamily:C.font,fontSize:10,fontWeight:700,cursor:'pointer'}}>■ STOP</button>
          }
        </div>
        <div className="spnl-grid-2">
          <button onClick={setPanic} style={{padding:'7px 0',background:'rgba(255,68,0,0.08)',border:'1px solid #ff4444',borderRadius:5,color:'#ff4444',fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer'}}>😱 TRIGGER PANIC</button>
          <button onClick={clearCrowd} style={{padding:'7px 0',background:C.bg,border:`1px solid ${C.border}`,borderRadius:5,color:C.dim,fontFamily:C.font,fontSize:9,cursor:'pointer'}}>✕ CLEAR</button>
        </div>

      </div>
    </div>
  );
}
