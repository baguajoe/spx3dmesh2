import React, { useState, useRef } from 'react';

const BRUSHES = [
  { id:'raise',   label:'Raise',   icon:'▲' },
  { id:'lower',   label:'Lower',   icon:'▼' },
  { id:'flatten', label:'Flatten', icon:'━' },
  { id:'smooth',  label:'Smooth',  icon:'◎' },
  { id:'paint',   label:'Paint',   icon:'🖌' },
  { id:'noise',   label:'Noise',   icon:'≋' },
  { id:'erode',   label:'Erode',   icon:'〰' },
  { id:'plateau', label:'Plateau', icon:'⊓' },
];

const PRESETS = [
  { id:'mountains', label:'Mountains', icon:'🏔️' },
  { id:'valley',    label:'Valley',    icon:'🏞️' },
  { id:'highlands', label:'Highlands', icon:'🌄' },
  { id:'dunes',     label:'Dunes',     icon:'🏜️' },
  { id:'crater',    label:'Crater',    icon:'🌑' },
  { id:'islands',   label:'Islands',   icon:'🏝️' },
  { id:'canyon',    label:'Canyon',    icon:'🗺️' },
  { id:'tundra',    label:'Tundra',    icon:'❄️' },
];

const Slider = ({ label, value, min, max, step=0.01, onChange }) => (
  <div className="wg-row">
    <span className="wg-label">{label}</span>
    <input className="wg-slider" type="range" min={min} max={max} step={step}
      value={value} onChange={e => onChange(parseFloat(e.target.value))} />
    <span className="wg-val">{typeof value === 'number' ? value.toFixed(2) : value}</span>
  </div>
);

export default function TerrainSculpting({ open, onClose, sceneRef, setStatus, rendererRef}) {
  const [activeBrush, setActiveBrush]   = useState('raise');
  const [brushRadius, setBrushRadius]   = useState(0.5);
  const [brushStrength, setBrushStrength] = useState(0.5);
  const [brushFalloff, setBrushFalloff] = useState(0.7);
  const [symmetryX, setSymmetryX]       = useState(false);
  const [symmetryZ, setSymmetryZ]       = useState(false);

  const [scale, setScale]               = useState(1.0);
  const [roughness, setRoughness]       = useState(0.5);
  const [resolution, setResolution]     = useState(128);
  const [heightScale, setHeightScale]   = useState(1.0);
  const [noiseOctaves, setNoiseOctaves] = useState(6);
  const [noiseLacunarity, setNoiseLacunarity] = useState(2.0);
  const [noisePersistence, setNoisePersistence] = useState(0.5);
  const [erosionStrength, setErosionStrength] = useState(0.3);
  const [erosionIterations, setErosionIterations] = useState(50);
  const [seaLevel, setSeaLevel]         = useState(0.0);
  const [snowLine, setSnowLine]         = useState(0.8);
  const [rockColor, setRockColor]       = useState('#666655');
  const [grassColor, setGrassColor]     = useState('#4a7a3a');
  const [sandColor, setSandColor]       = useState('#c8b870');
  const [snowColor, setSnowColor]       = useState('#eeeeff');
  const [generating, setGenerating]     = useState(false);
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
        <div className="wg-section-title">SCULPT BRUSH</div>
        <div className="wg-brush-grid">
          {BRUSHES.map(b => (
            <button key={b.id}
              className={"wg-brush-btn" + (activeBrush === b.id ? " wg-brush-btn--active" : "")}
              onClick={() => setActiveBrush(b.id)}>
              <span className="wg-brush-icon">{b.icon}</span>
              <span className="wg-brush-label">{b.label}</span>
            </button>
          ))}
        </div>

        <div className="wg-section-title">BRUSH SETTINGS</div>
        <Slider label="Radius"   value={brushRadius}   min={0.05} max={2}  onChange={setBrushRadius} />
        <Slider label="Strength" value={brushStrength} min={0}    max={1}  onChange={setBrushStrength} />
        <Slider label="Falloff"  value={brushFalloff}  min={0}    max={1}  onChange={setBrushFalloff} />
        <div className="wg-row">
          <span className="wg-label">Symmetry X</span>
          <input type="checkbox" checked={symmetryX} onChange={e => setSymmetryX(e.target.checked)} className="wg-check" />
        </div>
        <div className="wg-row">
          <span className="wg-label">Symmetry Z</span>
          <input type="checkbox" checked={symmetryZ} onChange={e => setSymmetryZ(e.target.checked)} className="wg-check" />
        </div>

        <div className="wg-section-title">PRESETS</div>
        <div className="wg-preset-grid-sm">
          {PRESETS.map(p => (
            <button key={p.id} className="wg-preset-sm-btn"
              onClick={() => { setStatus?.('Applied preset: ' + p.label); console.log('[Terrain] preset', p.id); }}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="wg-main">
        <div className="wg-preview-area">
          <canvas ref={canvasRef} className="wg-preview-canvas" />
          <div className="wg-preview-label">Terrain — {resolution}×{resolution} — Scale {scale.toFixed(1)}x</div>
        </div>

        <div className="wg-params-row">
          <div className="wg-params-col">
            <div className="wg-section-title">GENERATION</div>
            <Slider label="Resolution"   value={resolution}   min={32} max={512} step={32} onChange={setResolution} />
            <Slider label="Scale"        value={scale}        min={0.1} max={20} onChange={setScale} />
            <Slider label="Height Scale" value={heightScale}  min={0.1} max={5}  onChange={setHeightScale} />
            <Slider label="Roughness"    value={roughness}    min={0}   max={1}  onChange={setRoughness} />
          </div>
          <div className="wg-params-col">
            <div className="wg-section-title">NOISE</div>
            <Slider label="Octaves"      value={noiseOctaves}      min={1} max={12} step={1} onChange={setNoiseOctaves} />
            <Slider label="Lacunarity"   value={noiseLacunarity}   min={1} max={4}  onChange={setNoiseLacunarity} />
            <Slider label="Persistence"  value={noisePersistence}  min={0} max={1}  onChange={setNoisePersistence} />
          </div>
          <div className="wg-params-col">
            <div className="wg-section-title">EROSION</div>
            <Slider label="Strength"   value={erosionStrength}   min={0}  max={1}   onChange={setErosionStrength} />
            <Slider label="Iterations" value={erosionIterations} min={0}  max={200} step={1} onChange={setErosionIterations} />
            <Slider label="Sea Level"  value={seaLevel}          min={-1} max={1}   onChange={setSeaLevel} />
            <Slider label="Snow Line"  value={snowLine}          min={0}  max={1}   onChange={setSnowLine} />
          </div>
          <div className="wg-params-col">
            <div className="wg-section-title">COLORS</div>
            <div className="wg-row"><span className="wg-label">Rock</span><input type="color" value={rockColor} onChange={e=>setRockColor(e.target.value)} className="wg-color"/></div>
            <div className="wg-row"><span className="wg-label">Grass</span><input type="color" value={grassColor} onChange={e=>setGrassColor(e.target.value)} className="wg-color"/></div>
            <div className="wg-row"><span className="wg-label">Sand</span><input type="color" value={sandColor} onChange={e=>setSandColor(e.target.value)} className="wg-color"/></div>
            <div className="wg-row"><span className="wg-label">Snow</span><input type="color" value={snowColor} onChange={e=>setSnowColor(e.target.value)} className="wg-color"/></div>
          </div>
        </div>

        <div className="wg-actions">
          <button className="wg-btn wg-btn--generate"
            onClick={() => { setGenerating(true); setTimeout(() => { setGenerating(false); setStatus?.('✓ Terrain generated'); }, 800); }}
            disabled={generating}>
            {generating ? '⏳ GENERATING...' : '▶ GENERATE TERRAIN'}
          </button>
          <button className="wg-btn wg-btn--secondary" onClick={() => setStatus?.('Erode applied')}>💧 ERODE</button>
          <button className="wg-btn wg-btn--secondary" onClick={() => setStatus?.('Smooth applied')}>◎ SMOOTH</button>
          <button className="wg-btn wg-btn--secondary" onClick={() => console.log('[Terrain] export')}>⬇ EXPORT</button>
          <button className="wg-btn wg-btn--danger" onClick={() => setStatus?.('Terrain cleared')}>✕ CLEAR</button>
        </div>
      </div>
    </div>
  );
}
