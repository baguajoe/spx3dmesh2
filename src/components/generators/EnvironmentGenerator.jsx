import React, { useState } from 'react';
import '../../styles/spx-float-panel.css';


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
export default function EnvironmentGenerator({ open, onClose }) {
  const [preset, setPreset] = useState('forest');
  const [fogDensity, setFogDensity] = useState(0.015);
  const [treeCount, setTreeCount] = useState(25);
  const [rockCount, setRockCount] = useState(8);
  const [ambientInt, setAmbientInt] = useState(0.6);
  const [sunInt, setSunInt] = useState(1.2);

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:300}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#44aaff'}}/>
        <span className="spx-float-panel__title">ENVIRONMENT</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="PRESET">
          <select className="spx-fp-select" value={preset} onChange={e=>setPreset(e.target.value)}>
            {['Forest','Desert','Arctic','Jungle','Beach','Volcanic','Savanna','Swamp'].map(p=>(
              <option key={p} value={p.toLowerCase()}>{p}</option>
            ))}
          </select>
        </Section>
        <Section title="ATMOSPHERE">
          <Row label="Fog Density" value={fogDensity} min={0} max={0.1} step={0.001} onChange={setFogDensity}/>
          <Row label="Ambient"     value={ambientInt} min={0} max={2}               onChange={setAmbientInt}/>
          <Row label="Sun Int."    value={sunInt}     min={0} max={3}               onChange={setSunInt}/>
        </Section>
        <Section title="SCENE">
          <Row label="Trees"  value={treeCount} min={0} max={100} step={1} onChange={setTreeCount}/>
          <Row label="Rocks"  value={rockCount} min={0} max={50}  step={1} onChange={setRockCount}/>
        </Section>
        <div className="spx-fp-actions">
          <button className="spx-fp-btn spx-fp-btn--bake"
            onClick={()=>console.log('[Env] generate',{preset,fogDensity,treeCount,rockCount,ambientInt,sunInt})}>
            GENERATE
          </button>
        </div>
      </div>
    </div>
  );
}