import React, { useState, useEffect, useCallback } from 'react';
import { applyVolumetricFog, createVolumetricSettings } from '../../mesh/VolumetricSystem.js';
import '../../styles/panel-components.css';
import '../../styles/render-panels.css';

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

function ColorRow({ label, value, onChange }) {
  return (
    <div className="rpnl-color-row">
      <span className="rpnl-color-label">{label}</span>
      <input type="color" value={value} onChange={e=>onChange(e.target.value)} className="rpnl-color-input"/>
      <span className="rpnl-color-hex">{value}</span>
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

const FOG_PRESETS = [
  { label:'Clear',      enabled:false, type:'exp2', color:'#aabbcc', density:0.0  },
  { label:'Light Haze', enabled:true,  type:'exp2', color:'#c8d4e0', density:0.005 },
  { label:'Morning',    enabled:true,  type:'exp2', color:'#e8d8c0', density:0.015 },
  { label:'Dense Fog',  enabled:true,  type:'exp2', color:'#aaaaaa', density:0.04  },
  { label:'Night Fog',  enabled:true,  type:'exp2', color:'#202830', density:0.02  },
  { label:'Dust',       enabled:true,  type:'exp2', color:'#c8a870', density:0.025 },
  { label:'Smoke',      enabled:true,  type:'exp',  color:'#404040', density:0.03  },
];

const FOG_TYPES = ['exp', 'exp2', 'linear'];

export default function FilmVolumetricsPanel({ sceneRef, open=true, onClose }) {
  const [fogEnabled,       setFogEnabled]       = useState(false);
  const [fogType,          setFogType]          = useState('exp2');
  const [fogColor,         setFogColor]         = useState('#aabbcc');
  const [fogDensity,       setFogDensity]       = useState(0.02);
  const [fogNear,          setFogNear]          = useState(1);
  const [fogFar,           setFogFar]           = useState(100);
  const [godRays,          setGodRays]          = useState(false);
  const [godRayIntensity,  setGodRayIntensity]  = useState(0.5);
  const [heightFog,        setHeightFog]        = useState(false);
  const [heightStart,      setHeightStart]      = useState(0);
  const [heightEnd,        setHeightEnd]        = useState(5);

  const apply = useCallback(() => {
    const scene = sceneRef?.current; if (!scene) return;
    const settings = createVolumetricSettings({ enabled:fogEnabled, type:fogType, color:fogColor, density:fogDensity, near:fogNear, far:fogFar, godrays:godRays, godrayIntensity:godRayIntensity, heightFog, heightStart, heightEnd });
    try { applyVolumetricFog(scene, settings); } catch(e) { console.warn(e); }
  }, [fogEnabled, fogType, fogColor, fogDensity, fogNear, fogFar, godRays, godRayIntensity, heightFog, heightStart, heightEnd, sceneRef]);

  useEffect(() => { apply(); }, [fogEnabled, fogColor, fogDensity, fogType]);

  const loadPreset = p => { setFogEnabled(p.enabled); setFogType(p.type); setFogColor(p.color); setFogDensity(p.density); };

  if (!open) return null;

  return (
    <div className="spx-float-panel fvol-panel">
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fvol-dot"/>
        <span className="spx-float-panel__title fvol-title">VOLUMETRICS</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="FOG PRESETS" accent="blue">
          <div className="fvol-preset-grid">
            {FOG_PRESETS.map(p => (
              <button key={p.label} className="fvol-preset-card" onClick={()=>loadPreset(p)}>{p.label}</button>
            ))}
          </div>
        </Section>

        <Section title="ATMOSPHERIC FOG">
          <Toggle label="ENABLE FOG" value={fogEnabled} onChange={setFogEnabled}/>
          <div className="fvol-fog-types">
            {FOG_TYPES.map(t => (
              <button key={t} className={`fvol-fog-type${fogType===t?' fvol-fog-type--active':''}`} onClick={()=>setFogType(t)}>{t.toUpperCase()}</button>
            ))}
          </div>
          <ColorRow label="FOG COLOR" value={fogColor} onChange={setFogColor}/>
          <Slider label="DENSITY" value={fogDensity} min={0} max={0.1} step={0.001} onChange={setFogDensity}/>
          <Slider label="NEAR"    value={fogNear}    min={0} max={50}  step={0.5}   onChange={setFogNear}/>
          <Slider label="FAR"     value={fogFar}     min={10} max={500} step={1}    onChange={setFogFar}/>
        </Section>

        <Section title="HEIGHT FOG" defaultOpen={false}>
          <Toggle label="HEIGHT FOG" value={heightFog} onChange={setHeightFog}/>
          <Slider label="START HEIGHT" value={heightStart} min={-10} max={20} step={0.1} onChange={setHeightStart}/>
          <Slider label="END HEIGHT"   value={heightEnd}   min={0}   max={30} step={0.1} onChange={setHeightEnd}/>
        </Section>

        <Section title="GOD RAYS" accent="orange" defaultOpen={false}>
          <Toggle label="GOD RAYS" value={godRays} onChange={setGodRays}/>
          <Slider label="INTENSITY" value={godRayIntensity} min={0} max={1} step={0.01} onChange={setGodRayIntensity}/>
        </Section>

        <button className="fvol-apply-btn" onClick={apply}>APPLY TO SCENE</button>
      </div>
    </div>
  );
}
