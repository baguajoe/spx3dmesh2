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
const FORMATIONS = ['Random','Circle','Grid','Line','V-Shape','Cluster'];

export default function ProceduralCrowdGenerator({ open, onClose }) {
  const [count, setCount]         = useState(50);
  const [spread, setSpread]       = useState(10);
  const [diversity, setDiversity] = useState(0.8);
  const [spacing, setSpacing]     = useState(1.2);
  const [formation, setFormation] = useState('Random');
  const [animate, setAnimate]     = useState(true);

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:300}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#44aaff'}}/>
        <span className="spx-float-panel__title">CROWD GENERATOR</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="FORMATION">
          <select className="spx-fp-select" value={formation} onChange={e=>setFormation(e.target.value)}>
            {FORMATIONS.map(f=><option key={f}>{f}</option>)}
          </select>
        </Section>
        <Section title="PARAMETERS">
          <Row label="Count"     value={count}     min={1}   max={500} step={1}  onChange={setCount}/>
          <Row label="Spread"    value={spread}    min={1}   max={50}            onChange={setSpread}/>
          <Row label="Diversity" value={diversity} min={0}   max={1}             onChange={setDiversity}/>
          <Row label="Spacing"   value={spacing}   min={0.5} max={5}             onChange={setSpacing}/>
        </Section>
        <Section title="OPTIONS">
          <label className="spx-fp-row" style={{cursor:'pointer'}}>
            <span className="spx-fp-label">Animate</span>
            <input type="checkbox" checked={animate} onChange={e=>setAnimate(e.target.checked)}
              style={{accentColor:'#44aaff'}}/>
          </label>
        </Section>
        <div className="spx-fp-actions">
          <button className="spx-fp-btn spx-fp-btn--bake"
            onClick={()=>console.log('[Crowd] generate',{count,spread,diversity,spacing,formation,animate})}>GENERATE</button>
          <button className="spx-fp-btn spx-fp-btn--reset"
            onClick={()=>console.log('[Crowd] clear')}>CLEAR</button>
        </div>
      </div>
    </div>
  );
}