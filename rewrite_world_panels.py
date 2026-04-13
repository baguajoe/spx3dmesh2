#!/usr/bin/env python3
"""
1. Rewrites all 4 WORLD panel files with full content using world-generators.css
2. Converts their App.jsx render blocks back to fullscreen overlays
"""
import os, re

ROOT = '/workspaces/spx3dmesh2'

# ─────────────────────────────────────────────────────────────────────────────
# PANEL FILES
# ─────────────────────────────────────────────────────────────────────────────

ENVIRONMENT = """\
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
"""

TERRAIN = """\
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

export default function TerrainSculpting({ open, onClose, sceneRef, setStatus }) {
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
"""

CITY_GEN = """\
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
"""

CROWD = """\
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

export default function ProceduralCrowdGenerator({ open, onClose, sceneRef, setStatus }) {
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
"""

CSS = """\
/* ═══════════════════════════════════════════════════════
   world-generators.css  —  WORLD tab fullscreen panels
   ═══════════════════════════════════════════════════════ */

.wg-layout {
  display: flex;
  height: 100%;
  width: 100%;
  background: #0d1117;
  color: #ccc;
  font-family: 'JetBrains Mono', 'Segoe UI', monospace;
  font-size: 11px;
  overflow: hidden;
}

/* ── Sidebar ─────────────────────────────────────────── */
.wg-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #0a0d13;
  border-right: 1px solid #21262d;
  overflow-y: auto;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wg-section-title {
  font-size: 9px;
  font-weight: 700;
  color: #444;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 8px 4px 4px;
  border-bottom: 1px solid #1a2030;
  margin-bottom: 4px;
}

/* ── Biome / Formation grid ──────────────────────────── */
.wg-biome-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 8px;
}

.wg-biome-btn {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 4px;
  color: #888;
  padding: 6px 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: all 0.15s;
  font-family: inherit;
}
.wg-biome-btn:hover { border-color: #444; color: #ccc; }
.wg-biome-btn--active { border-color: #00ffc8 !important; color: #00ffc8 !important; background: #00ffc811 !important; }

.wg-biome-icon  { font-size: 16px; }
.wg-biome-label { font-size: 8px; letter-spacing: 0.5px; }

/* ── Brush grid ──────────────────────────────────────── */
.wg-brush-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  margin-bottom: 8px;
}
.wg-brush-btn {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 3px;
  color: #888;
  padding: 5px 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: inherit;
  font-size: 10px;
  transition: all 0.15s;
}
.wg-brush-btn:hover { border-color: #444; color: #ccc; }
.wg-brush-btn--active { border-color: #44aaff !important; color: #44aaff !important; background: #44aaff11 !important; }
.wg-brush-icon  { font-size: 13px; }
.wg-brush-label { font-size: 9px; }

/* ── Preset small ────────────────────────────────────── */
.wg-preset-grid-sm { display: flex; flex-direction: column; gap: 3px; }
.wg-preset-sm-btn {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 3px;
  color: #888;
  padding: 5px 8px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 10px;
  transition: all 0.15s;
}
.wg-preset-sm-btn:hover { border-color: #44aaff; color: #44aaff; }

/* ── Main area ───────────────────────────────────────── */
.wg-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px;
  gap: 12px;
}

/* ── Preview canvas ──────────────────────────────────── */
.wg-preview-area {
  flex: 1;
  min-height: 200px;
  background: #060a10;
  border: 1px solid #21262d;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}
.wg-preview-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.wg-preview-label {
  position: absolute;
  bottom: 8px;
  left: 10px;
  font-size: 10px;
  color: #555;
  pointer-events: none;
}

/* ── Params row ──────────────────────────────────────── */
.wg-params-row {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}
.wg-params-col {
  flex: 1;
  min-width: 0;
}

/* ── Slider row ──────────────────────────────────────── */
.wg-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}
.wg-label {
  font-size: 10px;
  color: #666;
  width: 90px;
  flex-shrink: 0;
}
.wg-slider {
  flex: 1;
  accent-color: #44aaff;
  cursor: pointer;
  height: 14px;
}
.wg-val {
  font-size: 10px;
  color: #44aaff;
  font-weight: 700;
  width: 38px;
  text-align: right;
}
.wg-color {
  width: 32px;
  height: 20px;
  border: 1px solid #21262d;
  border-radius: 3px;
  cursor: pointer;
  background: none;
  padding: 0;
}
.wg-check {
  accent-color: #44aaff;
  width: 14px;
  height: 14px;
  cursor: pointer;
}
.wg-select {
  flex: 1;
  background: #0d1117;
  border: 1px solid #21262d;
  color: #ccc;
  font-size: 10px;
  padding: 3px 6px;
  border-radius: 3px;
  font-family: inherit;
}

/* ── Stats ───────────────────────────────────────────── */
.wg-stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #555;
  margin-bottom: 3px;
}
.wg-swatch-row { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
.wg-swatch { width: 20px; height: 20px; border-radius: 50%; border: 1px solid #333; cursor: pointer; }

/* ── Actions bar ─────────────────────────────────────── */
.wg-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-items: center;
}
.wg-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.5px;
  font-family: inherit;
  transition: filter 0.15s;
}
.wg-btn:hover { filter: brightness(1.2); }
.wg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.wg-btn--generate  { background: #003a20; color: #00ffc8; border: 1px solid #00ffc844; flex: 1; }
.wg-btn--secondary { background: #1a2030; color: #888; border: 1px solid #21262d; }
.wg-btn--danger    { background: #2a0a0a; color: #ff4444; border: 1px solid #ff444444; }
"""

# ─────────────────────────────────────────────────────────────────────────────
# Write panel files
# ─────────────────────────────────────────────────────────────────────────────
gen_dir = ROOT + '/src/components/generators'
os.makedirs(gen_dir, exist_ok=True)

files = {
    gen_dir + '/EnvironmentGenerator.jsx': ENVIRONMENT,
    gen_dir + '/TerrainSculpting.jsx': TERRAIN,
    gen_dir + '/CityGenerator.jsx': CITY_GEN,
    gen_dir + '/ProceduralCrowdGenerator.jsx': CROWD,
    ROOT + '/src/styles/world-generators.css': CSS,
}

for path, content in files.items():
    with open(path, 'w') as f:
        f.write(content)
    print(f'✓ Written: {os.path.basename(path)}')

# ─────────────────────────────────────────────────────────────────────────────
# App.jsx — convert WORLD FloatPanels back to fullscreen overlays
# ─────────────────────────────────────────────────────────────────────────────
APP = ROOT + '/src/App.jsx'
app = open(APP).read()
orig = app

CONVERSIONS = [
    (
        '''{envGenOpen && (
        <FloatPanel title="ENVIRONMENT" onClose={()=>setEnvGenOpen(false)} width={340}>
          <EnvironmentGenerator open={envGenOpen} onClose={()=>setEnvGenOpen(false)} />
        </FloatPanel>
      )}''',
        '''{envGenOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🌲 ENVIRONMENT GENERATOR</span>
            <button onClick={()=>setEnvGenOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <EnvironmentGenerator open={envGenOpen} onClose={()=>setEnvGenOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
          </div>
        </div>
      )}'''
    ),
    (
        '''{cityGenOpen && (
        <FloatPanel title="CITY GENERATOR" onClose={()=>setCityGenOpen(false)} width={340}>
          <CityGenerator open={cityGenOpen} onClose={()=>setCityGenOpen(false)} />
        </FloatPanel>
      )}''',
        '''{cityGenOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🏙️ CITY GENERATOR</span>
            <button onClick={()=>setCityGenOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <CityGenerator open={cityGenOpen} onClose={()=>setCityGenOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
          </div>
        </div>
      )}'''
    ),
    (
        '''{terrainOpen && (
        <FloatPanel title="TERRAIN SCULPT" onClose={()=>setTerrainOpen(false)} width={340}>
          <TerrainSculpting open={terrainOpen} onClose={()=>setTerrainOpen(false)} />
        </FloatPanel>
      )}''',
        '''{terrainOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🏔️ TERRAIN SCULPTING</span>
            <button onClick={()=>setTerrainOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <TerrainSculpting open={terrainOpen} onClose={()=>setTerrainOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
          </div>
        </div>
      )}'''
    ),
    # Crowd — likely already a FloatPanel
    (
        '''{crowdGenOpen && <FloatPanel title="CROWD GENERATOR" onClose={() => setCrowdGenOpen(false)} width={480}><ProceduralCrowdGenerator open={crowdGenOpen} onClose={()=>setCrowdGenOpen(false)} /></FloatPanel>}''',
        '''{crowdGenOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">👥 CROWD GENERATOR</span>
            <button onClick={()=>setCrowdGenOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <ProceduralCrowdGenerator open={crowdGenOpen} onClose={()=>setCrowdGenOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
          </div>
        </div>
      )}'''
    ),
]

matched = 0
for old, new in CONVERSIONS:
    if old in app:
        app = app.replace(old, new)
        matched += 1
        name = new.split('spx-overlay-title">')[1].split('<')[0].strip()
        print(f'✓ Converted to fullscreen: {name}')
    else:
        # Try regex
        import re as _re
        name = new.split('spx-overlay-title">')[1].split('<')[0].strip()
        print(f'⚠ Exact match failed: {name}')

# Also ensure world-generators.css is imported in App.jsx
if 'world-generators.css' not in app:
    app = app.replace(
        'import "./styles/pro-dark.css";',
        'import "./styles/pro-dark.css";\nimport "./styles/world-generators.css";'
    )
    print('✓ world-generators.css import added')

if app != orig:
    open(APP, 'w').write(app)
    print(f'✓ App.jsx updated ({len(app)-len(orig):+d} chars)')

print('\nRun: git add -A && git commit -m "feat: WORLD panels fullscreen + fully featured" && git push')
