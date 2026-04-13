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
const STYLES = ['Downtown','Suburban','Industrial','Futuristic','Medieval','Cyberpunk'];

export default function CityGenerator({ open, onClose }) {
  const [style, setStyle]       = useState('Downtown');
  const [blocks, setBlocks]     = useState(20);
  const [density, setDensity]   = useState(0.7);
  const [height, setHeight]     = useState(0.5);
  const [roads, setRoads]       = useState(0.3);

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:300}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#44aaff'}}/>
        <span className="spx-float-panel__title">CITY GENERATOR</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="STYLE">
          <select className="spx-fp-select" value={style} onChange={e=>setStyle(e.target.value)}>
            {STYLES.map(s=><option key={s}>{s}</option>)}
          </select>
        </Section>
        <Section title="LAYOUT">
          <Row label="Blocks"   value={blocks}   min={4}   max={100} step={1}  onChange={setBlocks}/>
          <Row label="Density"  value={density}  min={0.1} max={1}             onChange={setDensity}/>
          <Row label="Height"   value={height}   min={0.1} max={1}             onChange={setHeight}/>
          <Row label="Roads"    value={roads}    min={0.1} max={0.8}           onChange={setRoads}/>
        </Section>
        <div className="spx-fp-actions">
          <button className="spx-fp-btn spx-fp-btn--bake"
            onClick={()=>console.log('[City] generate',{style,blocks,density,height,roads})}>GENERATE</button>
          <button className="spx-fp-btn spx-fp-btn--reset">CLEAR</button>
        </div>
      </div>
    </div>
  );
}