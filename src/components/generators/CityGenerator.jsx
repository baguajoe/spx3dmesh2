import React, { useState, useRef } from 'react';

const STYLES = [
  { id:'downtown',   label:'Downtown',   icon:'🏙️' },
  { id:'suburban',   label:'Suburban',   icon:'🏘️' },
  { id:'industrial', label:'Industrial', icon:'🏭' },
  { id:'futuristic', label:'Futuristic', icon:'🚀' },
  { id:'medieval',   label:'Medieval',   icon:'🏰' },
  { id:'cyberpunk',  label:'Cyberpunk',  icon:'🌃' },
  { id:'ancient',    label:'Ancient',    icon:'🏛️' },
  { id:'coastal',    label:'Coastal',    icon:'⚓' },
];

const Slider = ({ label, value, min, max, step=0.01, onChange }) => (
  <div className="wg-row">
    <span className="wg-label">{label}</span>
    <input className="wg-slider" type="range" min={min} max={max} step={step}
      value={value} onChange={e => onChange(parseFloat(e.target.value))} />
    <span className="wg-val">{typeof value === 'number' ? value.toFixed(2) : value}</span>
  </div>
);

export default function CityGenerator({ open, onClose, sceneRef, setStatus }) {
  const [style, setStyle]               = useState('downtown');
  const [blocks, setBlocks]             = useState(20);
  const [density, setDensity]           = useState(0.7);
  const [avgHeight, setAvgHeight]       = useState(5);
  const [heightVariation, setHeightVariation] = useState(0.6);
  const [roadWidth, setRoadWidth]       = useState(0.3);
  const [roadGrid, setRoadGrid]         = useState(0.8);
  const [lotSize, setLotSize]           = useState(1.0);
  const [buildingVariation, setBuildingVariation] = useState(0.5);
  const [windowDensity, setWindowDensity] = useState(0.7);
  const [roofStyle, setRoofStyle]       = useState('flat');
  const [landmarks, setLandmarks]       = useState(3);
  const [parks, setParks]               = useState(2);
  const [waterways, setWaterways]       = useState(false);
  const [bridges, setBridges]           = useState(false);
  const [nightMode, setNightMode]       = useState(false);
  const [wallColor, setWallColor]       = useState('#888877');
  const [roofColor, setRoofColor]       = useState('#555544');
  const [roadColor, setRoadColor]       = useState('#333333');
  const [generating, setGenerating]     = useState(false);
  const canvasRef = useRef(null);

  if (!open) return null;

  return (
    <div className="wg-layout">
      <div className="wg-sidebar">
        <div className="wg-section-title">CITY STYLE</div>
        <div className="wg-biome-grid">
          {STYLES.map(s => (
            <button key={s.id}
              className={"wg-biome-btn" + (style === s.id ? " wg-biome-btn--active" : "")}
              onClick={() => setStyle(s.id)}>
              <span className="wg-biome-icon">{s.icon}</span>
              <span className="wg-biome-label">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="wg-section-title">LAYOUT</div>
        <Slider label="City Blocks"   value={blocks}    min={4}   max={100} step={1} onChange={setBlocks} />
        <Slider label="Density"       value={density}   min={0.1} max={1}   onChange={setDensity} />
        <Slider label="Road Width"    value={roadWidth} min={0.1} max={0.8} onChange={setRoadWidth} />
        <Slider label="Road Grid"     value={roadGrid}  min={0}   max={1}   onChange={setRoadGrid} />
        <Slider label="Lot Size"      value={lotSize}   min={0.5} max={3}   onChange={setLotSize} />

        <div className="wg-section-title">EXTRAS</div>
        <Slider label="Landmarks" value={landmarks} min={0} max={10} step={1} onChange={setLandmarks} />
        <Slider label="Parks"     value={parks}     min={0} max={10} step={1} onChange={setParks} />
        <div className="wg-row"><span className="wg-label">Waterways</span><input type="checkbox" checked={waterways} onChange={e=>setWaterways(e.target.checked)} className="wg-check"/></div>
        <div className="wg-row"><span className="wg-label">Bridges</span><input type="checkbox" checked={bridges} onChange={e=>setBridges(e.target.checked)} className="wg-check"/></div>
        <div className="wg-row"><span className="wg-label">Night Mode</span><input type="checkbox" checked={nightMode} onChange={e=>setNightMode(e.target.checked)} className="wg-check"/></div>
      </div>

      <div className="wg-main">
        <div className="wg-preview-area">
          <canvas ref={canvasRef} className="wg-preview-canvas" />
          <div className="wg-preview-label">{STYLES.find(s=>s.id===style)?.icon} {style} — {blocks} blocks — density {density.toFixed(1)}</div>
        </div>

        <div className="wg-params-row">
          <div className="wg-params-col">
            <div className="wg-section-title">BUILDINGS</div>
            <Slider label="Avg Height"    value={avgHeight}        min={1}   max={50}  step={0.5} onChange={setAvgHeight} />
            <Slider label="Height Var."   value={heightVariation}  min={0}   max={1}   onChange={setHeightVariation} />
            <Slider label="Variation"     value={buildingVariation} min={0}  max={1}   onChange={setBuildingVariation} />
            <Slider label="Window Density" value={windowDensity}   min={0}   max={1}   onChange={setWindowDensity} />
            <div className="wg-row">
              <span className="wg-label">Roof Style</span>
              <select className="wg-select" value={roofStyle} onChange={e=>setRoofStyle(e.target.value)}>
                {['flat','peaked','dome','modern','glass'].map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="wg-params-col">
            <div className="wg-section-title">COLORS</div>
            <div className="wg-row"><span className="wg-label">Walls</span><input type="color" value={wallColor} onChange={e=>setWallColor(e.target.value)} className="wg-color"/></div>
            <div className="wg-row"><span className="wg-label">Roofs</span><input type="color" value={roofColor} onChange={e=>setRoofColor(e.target.value)} className="wg-color"/></div>
            <div className="wg-row"><span className="wg-label">Roads</span><input type="color" value={roadColor} onChange={e=>setRoadColor(e.target.value)} className="wg-color"/></div>
          </div>
        </div>

        <div className="wg-actions">
          <button className="wg-btn wg-btn--generate"
            onClick={() => { setGenerating(true); setTimeout(() => { setGenerating(false); setStatus?.('✓ City generated'); }, 1000); }}
            disabled={generating}>
            {generating ? '⏳ GENERATING...' : '▶ GENERATE CITY'}
          </button>
          <button className="wg-btn wg-btn--secondary" onClick={() => setStatus?.('City randomized')}>🎲 RANDOMIZE</button>
          <button className="wg-btn wg-btn--secondary" onClick={() => console.log('[City] export')}>⬇ EXPORT GLB</button>
          <button className="wg-btn wg-btn--danger" onClick={() => setStatus?.('City cleared')}>✕ CLEAR</button>
        </div>
      </div>
    </div>
  );
}
