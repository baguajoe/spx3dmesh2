import React, { useState, useRef, useEffect } from 'react';

const BIOMES = [
  { id:'forest',   label:'Forest',   icon:'🌲', color:'#2d6b1e' },
  { id:'desert',   label:'Desert',   icon:'🏜️', color:'#c2955a' },
  { id:'arctic',   label:'Arctic',   icon:'🏔️', color:'#aaccee' },
  { id:'jungle',   label:'Jungle',   icon:'🌴', color:'#1a5a20' },
  { id:'beach',    label:'Beach',    icon:'🏖️', color:'#f4d090' },
  { id:'volcanic', label:'Volcanic', icon:'🌋', color:'#cc3300' },
  { id:'savanna',  label:'Savanna',  icon:'🦁', color:'#c8a044' },
  { id:'swamp',    label:'Swamp',    icon:'🐊', color:'#3a5a30' },
];

const Slider = ({ label, value, min, max, step=0.01, onChange }) => (
  <div className="wg-row">
    <span className="wg-label">{label}</span>
    <input className="wg-slider" type="range" min={min} max={max} step={step}
      value={value} onChange={e => onChange(parseFloat(e.target.value))} />
    <span className="wg-val">{typeof value === 'number' ? value.toFixed(2) : value}</span>
  </div>
);

export default function EnvironmentGenerator({ open, onClose, sceneRef, setStatus }) {
  const [biome, setBiome]           = useState('forest');
  const [timeOfDay, setTimeOfDay]   = useState(0.6);
  const [fogDensity, setFogDensity] = useState(0.015);
  const [fogColor, setFogColor]     = useState('#2d5a27');
  const [ambientInt, setAmbientInt] = useState(0.6);
  const [sunInt, setSunInt]         = useState(1.2);
  const [sunAngle, setSunAngle]     = useState(45);
  const [windStr, setWindStr]       = useState(0.3);
  const [windDir, setWindDir]       = useState(0);
  const [treeCount, setTreeCount]   = useState(25);
  const [treeScale, setTreeScale]   = useState(1.0);
  const [treeVariation, setTreeVariation] = useState(0.3);
  const [rockCount, setRockCount]   = useState(8);
  const [rockScale, setRockScale]   = useState(1.0);
  const [waterLevel, setWaterLevel] = useState(0.0);
  const [waterOpacity, setWaterOpacity] = useState(0.8);
  const [snowCover, setSnowCover]   = useState(0.0);
  const [grassDensity, setGrassDensity] = useState(0.7);
  const [groundRoughness, setGroundRoughness] = useState(0.5);
  const [skyHaze, setSkyHaze]       = useState(0.2);
  const [cloudCover, setCloudCover] = useState(0.3);
  const [rainIntensity, setRainIntensity] = useState(0.0);
  const [groundColor, setGroundColor] = useState('#2d4a1e');
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef(null);

  const handleGenerate = () => {
    setGenerating(true);
    setStatus?.('Generating ' + biome + ' environment...');
    setTimeout(() => {
      console.log('[Env] generate', { biome, timeOfDay, fogDensity, ambientInt, sunInt, sunAngle,
        windStr, windDir, treeCount, treeScale, treeVariation, rockCount, rockScale,
        waterLevel, waterOpacity, snowCover, grassDensity, groundRoughness, skyHaze,
        cloudCover, rainIntensity });
      setGenerating(false);
      setStatus?.('✓ ' + biome + ' environment generated');
    }, 800);
  };

  if (!open) return null;

  const activeBiome = BIOMES.find(b => b.id === biome);

  return (
    <div className="wg-layout">
      <div className="wg-sidebar">
        <div className="wg-section-title">BIOME</div>
        <div className="wg-biome-grid">
          {BIOMES.map(b => (
            <button key={b.id} className={"wg-biome-btn" + (biome === b.id ? " wg-biome-btn--active" : "")}
              style={biome === b.id ? { borderColor: b.color, background: b.color + '22' } : {}}
              onClick={() => setBiome(b.id)}>
              <span className="wg-biome-icon">{b.icon}</span>
              <span className="wg-biome-label">{b.label}</span>
            </button>
          ))}
        </div>

        <div className="wg-section-title">ATMOSPHERE</div>
        <Slider label="Time of Day"  value={timeOfDay}    min={0} max={1}   onChange={setTimeOfDay} />
        <Slider label="Sun Angle"    value={sunAngle}     min={0} max={90}  step={1} onChange={setSunAngle} />
        <Slider label="Sun Intensity" value={sunInt}      min={0} max={3}   onChange={setSunInt} />
        <Slider label="Ambient"      value={ambientInt}   min={0} max={2}   onChange={setAmbientInt} />
        <Slider label="Sky Haze"     value={skyHaze}      min={0} max={1}   onChange={setSkyHaze} />
        <Slider label="Cloud Cover"  value={cloudCover}   min={0} max={1}   onChange={setCloudCover} />
        <Slider label="Fog Density"  value={fogDensity}   min={0} max={0.1} step={0.001} onChange={setFogDensity} />
        <Slider label="Rain"         value={rainIntensity} min={0} max={1}  onChange={setRainIntensity} />

        <div className="wg-section-title">WIND</div>
        <Slider label="Strength"  value={windStr} min={0} max={3}   onChange={setWindStr} />
        <Slider label="Direction" value={windDir} min={0} max={360} step={1} onChange={setWindDir} />
      </div>

      <div className="wg-main">
        <div className="wg-preview-area">
          <canvas ref={canvasRef} className="wg-preview-canvas" />
          <div className="wg-preview-label">{activeBiome?.icon} {activeBiome?.label} — Time: {(timeOfDay * 24).toFixed(1)}h</div>
        </div>

        <div className="wg-params-row">
          <div className="wg-params-col">
            <div className="wg-section-title">VEGETATION</div>
            <Slider label="Tree Count"      value={treeCount}     min={0} max={200} step={1} onChange={setTreeCount} />
            <Slider label="Tree Scale"      value={treeScale}     min={0.1} max={5} onChange={setTreeScale} />
            <Slider label="Tree Variation"  value={treeVariation} min={0} max={1}   onChange={setTreeVariation} />
            <Slider label="Grass Density"   value={grassDensity}  min={0} max={1}   onChange={setGrassDensity} />
          </div>
          <div className="wg-params-col">
            <div className="wg-section-title">TERRAIN</div>
            <Slider label="Rock Count"      value={rockCount}     min={0} max={50}  step={1} onChange={setRockCount} />
            <Slider label="Rock Scale"      value={rockScale}     min={0.1} max={5} onChange={setRockScale} />
            <Slider label="Ground Rough."   value={groundRoughness} min={0} max={1} onChange={setGroundRoughness} />
            <div className="wg-row">
              <span className="wg-label">Ground Color</span>
              <input type="color" value={groundColor} onChange={e => setGroundColor(e.target.value)} className="wg-color" />
            </div>
          </div>
          <div className="wg-params-col">
            <div className="wg-section-title">WATER / SNOW</div>
            <Slider label="Water Level"   value={waterLevel}   min={-2} max={2}  onChange={setWaterLevel} />
            <Slider label="Water Opacity" value={waterOpacity} min={0}  max={1}  onChange={setWaterOpacity} />
            <Slider label="Snow Cover"    value={snowCover}    min={0}  max={1}  onChange={setSnowCover} />
          </div>
        </div>

        <div className="wg-actions">
          <button className="wg-btn wg-btn--generate" onClick={handleGenerate} disabled={generating}>
            {generating ? '⏳ GENERATING...' : '▶ GENERATE ENVIRONMENT'}
          </button>
          <button className="wg-btn wg-btn--secondary" onClick={() => console.log('[Env] randomize')}>🎲 RANDOMIZE</button>
          <button className="wg-btn wg-btn--secondary" onClick={() => console.log('[Env] export')}>⬇ EXPORT</button>
          <button className="wg-btn wg-btn--danger" onClick={() => console.log('[Env] clear')}>✕ CLEAR</button>
        </div>
      </div>
    </div>
  );
}
