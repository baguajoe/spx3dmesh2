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
const STYLES_2D = ['Photo','Cartoon','Paint','Sketch','Stylized','Anime','Cel-Shade',
  'Watercolor','Oil Paint','Pencil','Comic','Neon','Pixel','Impressionist','Flat Design',
  'Cyberpunk','Film Noir','Retro','Pop Art','Minimalist'];

export default function SPX3DTo2DPanel({ open, onClose }) {
  const [style, setStyle]       = useState('Photo');
  const [resolution, setResolution] = useState('1920x1080');
  const [quality, setQuality]   = useState(0.9);
  const [samples, setSamples]   = useState(64);

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:300}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#ff6600'}}/>
        <span className="spx-float-panel__title">3D → 2D STYLE</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="OUTPUT STYLE">
          <select className="spx-fp-select" value={style} onChange={e=>setStyle(e.target.value)}>
            {STYLES_2D.map(s=><option key={s}>{s}</option>)}
          </select>
        </Section>
        <Section title="RENDER">
          <div className="spx-fp-row">
            <span className="spx-fp-label">Resolution</span>
            <select className="spx-fp-select" value={resolution} onChange={e=>setResolution(e.target.value)}>
              {['1280x720','1920x1080','2560x1440','3840x2160','4096x4096'].map(r=>(
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <Row label="Quality" value={quality} min={0.1} max={1}   onChange={setQuality}/>
          <Row label="Samples" value={samples} min={8}   max={512} step={8} onChange={setSamples}/>
        </Section>
        <div className="spx-fp-actions">
          <button className="spx-fp-btn spx-fp-btn--bake"
            onClick={()=>console.log('[3D→2D] convert',{style,resolution,quality,samples})}>CONVERT</button>
          <button className="spx-fp-btn spx-fp-btn--reset">EXPORT</button>
        </div>
      </div>
    </div>
  );
}