import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { createCloth, stepCloth, applyClothToMesh } from '../../mesh/ClothSystem.js';
import '../../styles/panel-components.css';
import '../../styles/fx-panels.css';

function Slider({ label, value, min, max, step=0.01, onChange, unit='' }) {
  return (
    <div className="spx-slider-wrap">
      <div className="spx-slider-header">
        <span>{label}</span>
        <span className="spx-slider-header__val">{step<0.1?Number(value).toFixed(2):Math.round(value)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        className="spx-slider-input" onChange={e=>onChange(parseFloat(e.target.value))}/>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="rpnl-toggle-row">
      <span className="rpnl-toggle-label">{label}</span>
      <div className={`rpnl-toggle${value?' rpnl-toggle--on':' rpnl-toggle--off'}`} onClick={()=>onChange(!value)}>
        <div className={`rpnl-toggle__dot${value?' rpnl-toggle__dot--on':' rpnl-toggle__dot--off'}`}/>
      </div>
    </div>
  );
}

function Section({ title, children, defaultOpen=true, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spx-section">
      <div className={`spx-section__hdr${accent?` spx-section__hdr--${accent}`:''}`} onClick={()=>setOpen(v=>!v)}>
        <span className={`spx-section__arrow${accent?` spx-section__arrow--${accent}`:''}`}>{open?'▾':'▸'}</span>
        <span className="spx-section__title">{title}</span>
      </div>
      {open && <div className="spx-section__body">{children}</div>}
    </div>
  );
}

const FABRIC_PRESETS = [
  { label:'Silk',    stiffness:0.98, shearStiff:0.9,  bendStiff:0.1,  damping:0.998, gravity:-9.8, mass:0.3 },
  { label:'Cotton',  stiffness:0.95, shearStiff:0.8,  bendStiff:0.3,  damping:0.99,  gravity:-9.8, mass:0.8 },
  { label:'Denim',   stiffness:0.99, shearStiff:0.95, bendStiff:0.7,  damping:0.98,  gravity:-9.8, mass:1.5 },
  { label:'Leather', stiffness:0.99, shearStiff:0.99, bendStiff:0.9,  damping:0.97,  gravity:-9.8, mass:2.5 },
  { label:'Chiffon', stiffness:0.9,  shearStiff:0.7,  bendStiff:0.05, damping:0.999, gravity:-9.8, mass:0.2 },
  { label:'Wool',    stiffness:0.93, shearStiff:0.75, bendStiff:0.4,  damping:0.99,  gravity:-9.8, mass:1.2 },
];

export default function ClothSimPanel({ meshRef, sceneRef, open=true, onClose }) {
  const [simulating,    setSimulating]    = useState(false);
  const [stiffness,     setStiffness]     = useState(0.95);
  const [shearStiff,    setShearStiff]    = useState(0.8);
  const [bendStiff,     setBendStiff]     = useState(0.3);
  const [damping,       setDamping]       = useState(0.99);
  const [gravity,       setGravity]       = useState(-9.8);
  const [mass,          setMass]          = useState(0.8);
  const [windX,         setWindX]         = useState(0);
  const [windY,         setWindY]         = useState(0);
  const [windZ,         setWindZ]         = useState(0);
  const [tearing,       setTearing]       = useState(false);
  const [selfCollision, setSelfCollision] = useState(false);
  const [iterations,    setIterations]    = useState(12);
  const [pinTop,        setPinTop]        = useState(true);
  const [status,        setStatus]        = useState('IDLE');

  const clothRef = useRef(null);
  const rafRef   = useRef(null);

  const initCloth = useCallback(() => {
    const mesh = meshRef?.current; if (!mesh) { setStatus('No mesh selected'); return; }
    try {
      const cloth = createCloth(mesh, { mass, stiffness, shearStiff, bendStiff, damping, gravity, iterations, windForce: new THREE.Vector3(windX, windY, windZ), tearing, selfCollision });
      if (!cloth) { setStatus('Cloth init failed'); return; }
      if (pinTop && cloth.particles.length > 0) {
        let maxY = -Infinity;
        cloth.particles.forEach(p => { if (p.position.y > maxY) maxY = p.position.y; });
        cloth.particles.forEach(p => { if (Math.abs(p.position.y - maxY) < 0.05) { p.pinned=true; p.invMass=0; } });
      }
      clothRef.current = cloth;
      setStatus('READY — ' + cloth.particles.length + ' particles');
    } catch(e) { setStatus('Error: ' + e.message); console.error(e); }
  }, [meshRef, mass, stiffness, shearStiff, bendStiff, damping, gravity, iterations, windX, windY, windZ, tearing, selfCollision, pinTop]);

  const startSim = useCallback(() => {
    if (!clothRef.current) { initCloth(); setTimeout(startSim, 100); return; }
    setSimulating(true); setStatus('SIMULATING');
    const tick = () => {
      if (!clothRef.current) { setSimulating(false); return; }
      try {
        clothRef.current.windForce.set(windX, windY, windZ);
        stepCloth(clothRef.current, 1/60);
        if (meshRef?.current) applyClothToMesh(clothRef.current, meshRef.current);
      } catch(e) { console.error(e); }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [clothRef, initCloth, meshRef, windX, windY, windZ]);

  const stopSim  = useCallback(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); setSimulating(false); setStatus('STOPPED'); }, []);
  const resetSim = useCallback(() => { stopSim(); clothRef.current=null; setStatus('IDLE'); }, [stopSim]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const loadPreset = p => { setStiffness(p.stiffness); setShearStiff(p.shearStiff); setBendStiff(p.bendStiff); setDamping(p.damping); setGravity(p.gravity); setMass(p.mass); };

  if (!open) return null;

  return (
    <div className="fx-panel fx-panel--cloth">
      <div className="fx-header">
        <div className="fx-header__dot fx-header__dot--cloth"/>
        <span className="fx-header__title fx-header__title--cloth">CLOTH SIM</span>
      </div>
      <div className={`fx-status${simulating?' fx-status--active':''}`}>{status}</div>

      <div className="fx-body">
        <Section title="FABRIC PRESETS" accent="green">
          <div className="fx-preset-grid fx-preset-grid--2">
            {FABRIC_PRESETS.map(p => (
              <button key={p.label} className="fx-preset-card" onClick={()=>loadPreset(p)}>{p.label}</button>
            ))}
          </div>
        </Section>

        <Section title="PHYSICS">
          <Slider label="MASS"       value={mass}       min={0.1} max={5}  step={0.1}  onChange={setMass}       unit="kg"/>
          <Slider label="STIFFNESS"  value={stiffness}  min={0.5} max={1}  step={0.01} onChange={setStiffness}/>
          <Slider label="SHEAR"      value={shearStiff} min={0.1} max={1}  step={0.01} onChange={setShearStiff}/>
          <Slider label="BEND"       value={bendStiff}  min={0}   max={1}  step={0.01} onChange={setBendStiff}/>
          <Slider label="DAMPING"    value={damping}    min={0.9} max={1}  step={0.001}onChange={setDamping}/>
          <Slider label="GRAVITY"    value={gravity}    min={-20} max={0}  step={0.1}  onChange={setGravity}/>
          <Slider label="ITERATIONS" value={iterations} min={4}   max={32} step={1}    onChange={setIterations}/>
        </Section>

        <Section title="WIND" accent="orange" defaultOpen={false}>
          <Slider label="WIND X" value={windX} min={-10} max={10} step={0.1} onChange={setWindX}/>
          <Slider label="WIND Y" value={windY} min={-10} max={10} step={0.1} onChange={setWindY}/>
          <Slider label="WIND Z" value={windZ} min={-10} max={10} step={0.1} onChange={setWindZ}/>
        </Section>

        <Section title="OPTIONS" defaultOpen={false}>
          <Toggle label="PIN TOP ROW"    value={pinTop}        onChange={setPinTop}/>
          <Toggle label="TEARING"        value={tearing}       onChange={setTearing}/>
          <Toggle label="SELF COLLISION" value={selfCollision} onChange={setSelfCollision}/>
        </Section>

        <div className="fx-ctrl-grid fx-ctrl-grid--3" style={{marginTop:8}}>
          <button className="fx-btn fx-btn--sm fx-btn--muted" onClick={initCloth}>INIT</button>
          {!simulating
            ? <button className="fx-btn fx-btn--sm fx-btn--play"  onClick={startSim}>▶ PLAY</button>
            : <button className="fx-btn fx-btn--sm fx-btn--stop"  onClick={stopSim}>■ STOP</button>
          }
          <button className="fx-btn fx-btn--sm fx-btn--muted" onClick={resetSim}>↺ RESET</button>
        </div>
      </div>
    </div>
  );
}
