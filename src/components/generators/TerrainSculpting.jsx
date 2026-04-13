import React, { useState } from 'react';


const Section = ({ title, children }) => (
  <div className="spx-fp-section">
    <div className="spx-fp-section-title">{title}</div>
    {children}
  </div>
);

const Row = ({ label, value, min=0, max=1, step=0.01, onChange }) => (
  <div className="spx-fp-row">
    <span className="spx-fp-label">{label}</span>
    <input type="range" min={min} max={max} step={step}
      value={value} onChange={e => onChange(parseFloat(e.target.value))}
      className="spx-fp-slider" />
    <span className="spx-fp-val">{typeof value === 'number' ? value.toFixed(2) : value}</span>
  </div>
);
const BRUSHES = ['Raise','Lower','Flatten','Smooth','Paint','Noise'];
const PRESETS = ['Plateau','Valley','Highlands','Dunes','Crater','Islands'];

export default function TerrainSculpting({ open, onClose }) {
  const [brush, setBrush]       = useState('Raise');
  const [radius, setRadius]     = useState(0.5);
  const [strength, setStrength] = useState(0.5);
  const [scale, setScale]       = useState(1.0);
  const [roughness, setRoughness] = useState(0.5);
  const [resolution, setResolution] = useState(128);

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:300}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#44aaff'}}/>
        <span className="spx-float-panel__title">TERRAIN SCULPT</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="BRUSH">
          <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
            {BRUSHES.map(b=>(
              <button key={b}
                className={"spx-fp-btn" + (brush===b?" spx-fp-btn--bake":"")}
                style={{flex:'0 0 auto',padding:'4px 8px',fontSize:10}}
                onClick={()=>setBrush(b)}>{b}</button>
            ))}
          </div>
          <Row label="Radius"   value={radius}   min={0.05} max={2}   onChange={setRadius}/>
          <Row label="Strength" value={strength} min={0}    max={1}   onChange={setStrength}/>
        </Section>
        <Section title="TERRAIN">
          <Row label="Scale"      value={scale}      min={0.1} max={10}  onChange={setScale}/>
          <Row label="Roughness"  value={roughness}  min={0}   max={1}   onChange={setRoughness}/>
          <Row label="Resolution" value={resolution} min={32}  max={512} step={32} onChange={setResolution}/>
        </Section>
        <Section title="PRESETS">
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {PRESETS.map(p=>(
              <button key={p} className="spx-fp-btn" style={{flex:'0 0 auto',padding:'4px 8px',fontSize:10}}
                onClick={()=>console.log('[Terrain] preset',p)}>{p}</button>
            ))}
          </div>
        </Section>
        <div className="spx-fp-actions">
          <button className="spx-fp-btn spx-fp-btn--bake"
            onClick={()=>console.log('[Terrain] generate',{scale,roughness,resolution})}>GENERATE</button>
          <button className="spx-fp-btn spx-fp-btn--reset"
            onClick={()=>console.log('[Terrain] erode')}>ERODE</button>
        </div>
      </div>
    </div>
  );
}