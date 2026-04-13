import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';

const FORMATIONS = [
  { id:'random',   label:'Random',   icon:'⁂' },
  { id:'circle',   label:'Circle',   icon:'◯' },
  { id:'grid',     label:'Grid',     icon:'⊞' },
  { id:'line',     label:'Line',     icon:'━' },
  { id:'vshape',   label:'V-Shape',  icon:'∨' },
  { id:'cluster',  label:'Cluster',  icon:'⬡' },
  { id:'march',    label:'March',    icon:'→' },
  { id:'stadium',  label:'Stadium',  icon:'🏟️' },
];

const SKIN_TONES = ['#FDBCB4','#F1C27D','#E0AC69','#C68642','#8D5524','#4A2C0A'];

const Slider = ({ label, value, min, max, step=0.01, onChange }) => (
  <div className="wg-row">
    <span className="wg-label">{label}</span>
    <input className="wg-slider" type="range" min={min} max={max} step={step}
      value={value} onChange={e => onChange(parseFloat(e.target.value))} />
    <span className="wg-val">{typeof value === 'number' ? (step < 1 ? value.toFixed(2) : Math.round(value)) : value}</span>
  </div>
);

export default function ProceduralCrowdGenerator({ open, onClose, sceneRef, setStatus, rendererRef}) {
  const [formation, setFormation]     = useState('random');
  const [count, setCount]             = useState(50);
  const [spread, setSpread]           = useState(10);
  const [spacing, setSpacing]         = useState(1.2);
  const [diversity, setDiversity]     = useState(0.8);
  const [heightVariation, setHeightVariation] = useState(0.2);
  const [weightVariation, setWeightVariation] = useState(0.2);
  const [animSpeed, setAnimSpeed]     = useState(1.0);
  const [idleVariation, setIdleVariation] = useState(0.5);
  const [walkSpeed, setWalkSpeed]     = useState(1.0);
  const [clothingVar, setClothingVar] = useState(0.8);
  const [skinToneVar, setSkinToneVar] = useState(0.9);
  const [genderRatio, setGenderRatio] = useState(0.5);
  const [ageRange, setAgeRange]       = useState([20, 60]);
  const [animate, setAnimate]         = useState(true);
  const [shadows, setShadows]         = useState(true);
  const [lod, setLod]                 = useState(true);
  const [generating, setGenerating]   = useState(false);
  const canvasRef = useRef(null);

  // Mirror main renderer into preview canvas
  const mirrorRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const src = rendererRef?.current?.domElement;
      const dst = canvasRef.current;
      if (src && dst && dst.offsetWidth > 0) {
        dst.width  = dst.offsetWidth;
        dst.height = dst.offsetHeight;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      mirrorRef.current = requestAnimationFrame(tick);
    };
    mirrorRef.current = requestAnimationFrame(tick);
    return () => { if (mirrorRef.current) cancelAnimationFrame(mirrorRef.current); };
  }, [open, rendererRef]);


  if (!open) return null;

  return (
    <div className="wg-layout">
      <div className="wg-sidebar">
        <div className="wg-section-title">FORMATION</div>
        <div className="wg-biome-grid">
          {FORMATIONS.map(f => (
            <button key={f.id}
              className={"wg-biome-btn" + (formation === f.id ? " wg-biome-btn--active" : "")}
              onClick={() => setFormation(f.id)}>
              <span className="wg-biome-icon">{f.icon}</span>
              <span className="wg-biome-label">{f.label}</span>
            </button>
          ))}
        </div>

        <div className="wg-section-title">CROWD SIZE</div>
        <Slider label="Count"   value={count}   min={1}   max={500} step={1} onChange={setCount} />
        <Slider label="Spread"  value={spread}  min={1}   max={50}  onChange={setSpread} />
        <Slider label="Spacing" value={spacing} min={0.5} max={5}   onChange={setSpacing} />

        <div className="wg-section-title">OPTIONS</div>
        <div className="wg-row"><span className="wg-label">Animate</span><input type="checkbox" checked={animate} onChange={e=>setAnimate(e.target.checked)} className="wg-check"/></div>
        <div className="wg-row"><span className="wg-label">Shadows</span><input type="checkbox" checked={shadows} onChange={e=>setShadows(e.target.checked)} className="wg-check"/></div>
        <div className="wg-row"><span className="wg-label">Auto LOD</span><input type="checkbox" checked={lod} onChange={e=>setLod(e.target.checked)} className="wg-check"/></div>
      </div>

      <div className="wg-main">
        <div className="wg-preview-area">
          <canvas ref={canvasRef} className="wg-preview-canvas" />
          <div className="wg-preview-label">👥 {count} people — {formation} formation — {animate ? 'animated' : 'static'}</div>
        </div>

        <div className="wg-params-row">
          <div className="wg-params-col">
            <div className="wg-section-title">DIVERSITY</div>
            <Slider label="Overall"       value={diversity}      min={0} max={1} onChange={setDiversity} />
            <Slider label="Height Var."   value={heightVariation} min={0} max={1} onChange={setHeightVariation} />
            <Slider label="Weight Var."   value={weightVariation} min={0} max={1} onChange={setWeightVariation} />
            <Slider label="Gender Ratio"  value={genderRatio}    min={0} max={1} onChange={setGenderRatio} />
            <Slider label="Clothing Var." value={clothingVar}    min={0} max={1} onChange={setClothingVar} />
            <Slider label="Skin Tone Var." value={skinToneVar}   min={0} max={1} onChange={setSkinToneVar} />
          </div>
          <div className="wg-params-col">
            <div className="wg-section-title">ANIMATION</div>
            <Slider label="Anim Speed"    value={animSpeed}      min={0.1} max={3} onChange={setAnimSpeed} />
            <Slider label="Idle Variation" value={idleVariation} min={0}   max={1} onChange={setIdleVariation} />
            <Slider label="Walk Speed"    value={walkSpeed}      min={0.1} max={5} onChange={setWalkSpeed} />
          </div>
          <div className="wg-params-col">
            <div className="wg-section-title">SKIN TONES</div>
            <div className="wg-swatch-row">
              {SKIN_TONES.map(t => (
                <div key={t} className="wg-swatch" style={{background:t}} title={t} />
              ))}
            </div>
            <div className="wg-section-title" style={{marginTop:12}}>PERFORMANCE</div>
            <div className="wg-stat-row"><span>Estimated tris:</span><span>{(count * 2400).toLocaleString()}</span></div>
            <div className="wg-stat-row"><span>Draw calls:</span><span>{lod ? Math.ceil(count/10) : count}</span></div>
          </div>
        </div>

        <div className="wg-actions">
          <button className="wg-btn wg-btn--generate"
            onClick={() => { setGenerating(true); setTimeout(() => { setGenerating(false); setStatus?.('✓ ' + count + ' crowd members generated'); }, 1200); }}
            disabled={generating}>
            {generating ? '⏳ GENERATING...' : '▶ GENERATE CROWD'}
          </button>
          <button className="wg-btn wg-btn--secondary" onClick={() => setStatus?.('Crowd randomized')}>🎲 RANDOMIZE</button>
          <button className="wg-btn wg-btn--secondary" onClick={() => setStatus?.('Crowd exported')}>⬇ EXPORT GLB</button>
          <button className="wg-btn wg-btn--danger" onClick={() => setStatus?.('Crowd cleared')}>✕ CLEAR</button>
        </div>
      </div>
    </div>
  );
}
