import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import {
  createFluidSettings, emitFluid, stepSPH,
  buildFluidMesh, updateFluidMesh, getFluidStats, createPyroEmitter, stepPyro
} from '../../mesh/FluidSystem.js';
import '../../styles/panel-components.css';
import '../../styles/fx-panels.css';

function ValueKnob({ label, value, min, max, step=0.01, onChange, unit='', color='#00ffc8' }) {
  const pct = Math.min(1, Math.max(0, (value-min)/(max-min)));
  const gradient = `conic-gradient(${color} 0% ${pct*100}%, #1a2030 ${pct*100}% 100%)`;
  const display = value>=100 ? Math.round(value) : value>=1 ? value.toFixed(1) : value.toFixed(3);

  const handleMouseDown = e => {
    const startY=e.clientY, startV=value;
    const move = ev => {
      const delta=(startY-ev.clientY)/80*(max-min);
      onChange(Math.min(max, Math.max(min, parseFloat((startV+delta).toFixed(4)))));
    };
    const up = () => { document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); };
    document.addEventListener('mousemove',move);
    document.addEventListener('mouseup',up);
  };

  return (
    <div className="fx-knob-wrap">
      <div className="fx-knob-ring" style={{background:gradient}} onMouseDown={handleMouseDown}>
        <div className="fx-knob-inner">
          <span className="fx-knob-val" style={{color}}>{display}{unit}</span>
        </div>
      </div>
      <span className="fx-knob-label">{label}</span>
    </div>
  );
}

const FLUID_PRESETS = [
  { label:'Water',   color:'#2288ff', smoothRadius:0.4, restDensity:1000,  stiffness:200,  viscosity:0.01,  gravity:-9.8, tension:0.07 },
  { label:'Honey',   color:'#ffaa00', smoothRadius:0.5, restDensity:1400,  stiffness:150,  viscosity:0.08,  gravity:-9.8, tension:0.04 },
  { label:'Lava',    color:'#ff4400', smoothRadius:0.6, restDensity:2800,  stiffness:300,  viscosity:0.12,  gravity:-9.8, tension:0.02 },
  { label:'Mercury', color:'#aabbcc', smoothRadius:0.3, restDensity:13600, stiffness:800,  viscosity:0.001, gravity:-9.8, tension:0.48 },
  { label:'Oil',     color:'#336622', smoothRadius:0.45,restDensity:870,   stiffness:180,  viscosity:0.05,  gravity:-9.8, tension:0.03 },
  { label:'Blood',   color:'#880000', smoothRadius:0.4, restDensity:1060,  stiffness:220,  viscosity:0.04,  gravity:-9.8, tension:0.06 },
  { label:'Smoke',   color:'#444444', smoothRadius:0.8, restDensity:1.2,   stiffness:10,   viscosity:0.001, gravity:0.2,  tension:0 },
  { label:'Fire',    color:'#ff6600', smoothRadius:0.7, restDensity:0.8,   stiffness:8,    viscosity:0.0005,gravity:0.5,  tension:0 },
];

const MAX_PARTICLE_OPTIONS = [500, 1000, 2000, 4000];

export default function FluidPanel({ sceneRef, open=true, onClose }) {
  const [mode,         setMode]         = useState('sph');
  const [activePreset, setPreset]       = useState(0);
  const [simulating,   setSim]          = useState(false);
  const [stats,        setStats]        = useState('');
  const [smoothRadius, setSmoothRadius] = useState(0.4);
  const [restDensity,  setRestDensity]  = useState(1000);
  const [stiffness,    setStiffness]    = useState(200);
  const [viscosity,    setViscosity]    = useState(0.01);
  const [gravity,      setGravity]      = useState(-9.8);
  const [emitRate,     setEmitRate]     = useState(20);
  const [maxParts,     setMaxParts]     = useState(2000);
  const [fluidColor,   setFluidColor]   = useState('#2288ff');
  const [pyroTemp,     setPyroTemp]     = useState(1200);
  const [pyroBuoyancy, setPyroBuoyancy] = useState(0.5);
  const [pyroTurb,     setPyroTurb]     = useState(0.3);

  const fluidRef  = useRef(null);
  const meshRef   = useRef(null);
  const rafRef    = useRef(null);
  const pyroRef   = useRef(null);
  const frameRef  = useRef(0);

  const initFluid = useCallback(() => {
    const scene = sceneRef?.current; if (!scene) return;
    if (meshRef.current) { scene.remove(meshRef.current); meshRef.current.geometry.dispose(); meshRef.current.material.dispose(); }
    fluidRef.current = createFluidSettings({ smoothRadius, restDensity, stiffness, viscosity, gravity, maxParticles: maxParts });
    fluidRef.current.enabled = true;
    const pts = buildFluidMesh(fluidRef.current);
    pts.material.color.set(fluidColor);
    scene.add(pts);
    meshRef.current = pts;
    setStats('SPH initialized');
  }, [sceneRef, smoothRadius, restDensity, stiffness, viscosity, gravity, maxParts, fluidColor]);

  const initPyro = useCallback(() => {
    const scene = sceneRef?.current; if (!scene) return;
    pyroRef.current = createPyroEmitter(new THREE.Vector3(0,0,0), { temperature:pyroTemp, buoyancy:pyroBuoyancy, turbulence:pyroTurb });
    setStats('Pyro initialized');
  }, [sceneRef, pyroTemp, pyroBuoyancy, pyroTurb]);

  const startSim = useCallback(() => {
    if (mode==='sph') { if (!fluidRef.current) initFluid(); }
    else { if (!pyroRef.current) initPyro(); }
    setSim(true);
    const tick = () => {
      frameRef.current++;
      if (mode==='sph' && fluidRef.current) {
        if (frameRef.current%3===0) emitFluid(fluidRef.current, new THREE.Vector3((Math.random()-0.5)*0.5, 2, (Math.random()-0.5)*0.5), emitRate);
        stepSPH(fluidRef.current, 1/60);
        if (meshRef.current) updateFluidMesh(meshRef.current, fluidRef.current);
        if (frameRef.current%30===0) { const s=getFluidStats(fluidRef.current); setStats(`${s.activeParticles}/${s.maxParticles} particles`); }
      } else if (mode==='pyro' && pyroRef.current) {
        stepPyro(pyroRef.current, 1/60);
        if (frameRef.current%30===0) setStats(`${pyroRef.current.particles?.filter?.(p=>p.active)?.length||0} pyro particles`);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [mode, initFluid, initPyro, emitRate]);

  const stopSim = useCallback(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); setSim(false); }, []);

  const clearSim = useCallback(() => {
    stopSim();
    const scene = sceneRef?.current;
    if (scene && meshRef.current) { scene.remove(meshRef.current); meshRef.current=null; }
    fluidRef.current=null; pyroRef.current=null; setStats(''); frameRef.current=0;
  }, [stopSim, sceneRef]);

  const loadPreset = i => {
    const p = FLUID_PRESETS[i];
    setPreset(i); setFluidColor(p.color);
    setSmoothRadius(p.smoothRadius); setRestDensity(p.restDensity);
    setStiffness(p.stiffness); setViscosity(p.viscosity); setGravity(p.gravity);
    if (p.label==='Smoke'||p.label==='Fire') setMode('pyro'); else setMode('sph');
  };

  useEffect(() => () => { stopSim(); }, []);
  if (!open) return null;

  return (
    <div className="fx-panel fx-panel--fluid">
      <div className="fx-header">
        <div className="fx-header__dot fx-header__dot--fluid"/>
        <span className="fx-header__title fx-header__title--fluid">FLUID SIM</span>
        <div className="fx-header__right">
          {stats && <span className={`fx-header__stats${simulating?' fx-header__stats--active':''}`}>{stats}</span>}
          {onClose && <button className="fx-header__close" onClick={onClose}>×</button>}
        </div>
      </div>

      <div className="fx-body">
        <div className="fx-mode-bar">
          {['sph','pyro'].map(m => (
            <button key={m} className={`fx-mode-btn${mode===m?' fx-mode-btn--active':''}`} onClick={()=>setMode(m)}>
              {m==='sph' ? 'SPH LIQUID' : 'PYRO SMOKE/FIRE'}
            </button>
          ))}
        </div>

        <div className="fx-mb12">
          <div className="fx-sec-label">FLUID TYPE</div>
          <div className="fx-preset-grid fx-preset-grid--4">
            {FLUID_PRESETS.map((p,i) => (
              <div
                key={p.label}
                className="fx-fluid-preset"
                style={{ borderColor: activePreset===i ? p.color : undefined, background: activePreset===i ? `${p.color}18` : undefined }}
                onClick={() => loadPreset(i)}
                onMouseEnter={e => { e.currentTarget.style.borderColor=p.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=activePreset===i?p.color:''; }}
              >
                <div className="fx-fluid-preset__dot" style={{ background:p.color, boxShadow:`0 0 6px ${p.color}88` }}/>
                <div className="fx-fluid-preset__label" style={{ color: activePreset===i ? p.color : undefined }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>

        {mode==='sph' ? (
          <>
            <div className="fx-sec-label fx-mb10">PARAMETERS</div>
            <div className="fx-knob-row">
              <ValueKnob label="Smooth R"  value={smoothRadius} min={0.1}  max={1.5}   step={0.01}  onChange={setSmoothRadius} color="#44aaff"/>
              <ValueKnob label="Density"   value={restDensity}  min={0.5}  max={15000} step={10}    onChange={setRestDensity}  color="#88ccff"/>
              <ValueKnob label="Stiffness" value={stiffness}    min={1}    max={2000}  step={1}     onChange={setStiffness}    color="#00ffc8"/>
              <ValueKnob label="Viscosity" value={viscosity}    min={0}    max={0.5}   step={0.001} onChange={setViscosity}    color="#aaffaa"/>
              <ValueKnob label="Gravity"   value={gravity}      min={-20}  max={2}     step={0.1}   onChange={setGravity}      color="#FF6600"/>
              <ValueKnob label="Emit/s"    value={emitRate}     min={1}    max={100}   step={1}     onChange={setEmitRate}     color="#ffdd44"/>
            </div>

            <div className="fx-color-bar">
              <span className="fx-color-bar__label">COLOR</span>
              <input type="color" value={fluidColor} onChange={e=>setFluidColor(e.target.value)} className="fx-color-bar__input"/>
              <span className="fx-color-bar__hex">{fluidColor}</span>
              <div className="fx-color-bar__right">
                <span className="fx-color-bar__label">MAX</span>
                {MAX_PARTICLE_OPTIONS.map(n => (
                  <button key={n} className={`fx-max-chip${maxParts===n?' fx-max-chip--active':''}`} onClick={()=>setMaxParts(n)}>
                    {n>=1000?`${n/1000}K`:n}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="fx-sec-label fx-mb10">PYRO PARAMETERS</div>
            <div className="fx-knob-row">
              <ValueKnob label="Temp °K"    value={pyroTemp}     min={300} max={3000} step={10}   onChange={setPyroTemp}     color="#ff4400"/>
              <ValueKnob label="Buoyancy"   value={pyroBuoyancy} min={0}   max={2}    step={0.05} onChange={setPyroBuoyancy} color="#ffaa00"/>
              <ValueKnob label="Turbulence" value={pyroTurb}     min={0}   max={1}    step={0.01} onChange={setPyroTurb}     color="#ff8844"/>
            </div>
          </>
        )}

        <div className="fx-ctrl-grid fx-ctrl-grid--3">
          {!simulating
            ? <button className="fx-btn fx-btn--play-bl" onClick={startSim}>▶ SIMULATE</button>
            : <button className="fx-btn fx-btn--stop"    onClick={stopSim}>■ STOP</button>
          }
          <button className="fx-btn fx-btn--muted" onClick={mode==='sph'?initFluid:initPyro}>↺ RESET</button>
          <button className="fx-btn fx-btn--muted" onClick={clearSim}>✕ CLEAR</button>
        </div>
      </div>
    </div>
  );
}
