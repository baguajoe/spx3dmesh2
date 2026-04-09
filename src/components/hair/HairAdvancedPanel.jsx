import React, { useState, useCallback, useRef, useEffect } from 'react';

function Slider({ label, value, min=0, max=1, step=0.01, onChange, unit='' }) {
  return (
    <div className="ha-slider-wrap">
      <div className="ha-slider-row">
        <span>{label}</span>
        <span className="ha-slider-val">
          {typeof value==='number' ? (step<0.1 ? value.toFixed(2) : Math.round(value)) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="ha-slider" />
    </div>
  );
}
function Select({ label, value, options, onChange }) {
  return (
    <div className="ha-select-wrap">
      {label && <div className="ha-select-label">{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} className="ha-select">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Check({ label, value, onChange }) {
  return (
    <label className="ha-check">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="ha-check__input" />
      {label}
    </label>
  );
}
function ColorRow({ label, value, onChange }) {
  return (
    <div className="ha-color-row">
      <span className="ha-color-label">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="ha-color-input" />
      <span className="ha-color-hex">{value}</span>
    </div>
  );
}
function Section({ title, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ha-section">
      <div className="ha-section__header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span className="ha-section__arrow">{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="ha-section__body">{children}</div>}
    </div>
  );
}
function Badges({ items, active, onSelect }) {
  return (
    <div className="ha-badges">
      {items.map(item => (
        <button key={item} onClick={() => onSelect(item)}
          className={`ha-badge${active===item?' ha-badge--active':''}`}>{item}</button>
      ))}
    </div>
  );
}
function GenBtn({ label, onClick }) {
  return <button onClick={onClick} className="ha-gen-btn">{label}</button>;
}
function RandBtn({ onClick }) {
  return <button onClick={onClick} className="ha-rand-btn">🎲</button>;
}


const GROOM_TOOLS   = ['Comb','Push','Pull','Smooth','Twist','Cut','Grow','Relax','Puff','Flatten'];
const LAYER_TYPES   = ['Base','Mid','Top','Flyaway','Vellus','Highlight','Lowlight','Streak','Undercoat'];

export default function HairAdvancedPanel({ character, hairSystem, onUpdate }) {
  // Active tool
  const [activeTool,    setActiveTool]    = useState('Comb');
  const [brushRadius,   setBrushRadius]   = useState(0.08);
  const [brushStr,      setBrushStr]      = useState(0.50);
  const [brushFalloff,  setBrushFalloff]  = useState(0.60);
  const [brushSmooth,   setBrushSmooth]   = useState(0.30);
  const [xMirror,       setXMirror]       = useState(true);
  const [screenProj,    setScreenProj]    = useState(false);
  // Strand selection
  const [selMode,       setSelMode]       = useState('All');
  const [selDensity,    setSelDensity]    = useState(1.00);
  const [selByLength,   setSelByLength]   = useState(false);
  const [selLenMin,     setSelLenMin]     = useState(0.00);
  const [selLenMax,     setSelLenMax]     = useState(1.00);
  const [selByAngle,    setSelByAngle]    = useState(false);
  const [selAngleMax,   setSelAngleMax]   = useState(0.50);
  // Layers
  const [activeLayer,   setActiveLayer]   = useState('Base');
  const [layerOpacity,  setLayerOpacity]  = useState(1.00);
  const [layerDensity,  setLayerDensity]  = useState(1.00);
  const [layerLocked,   setLayerLocked]   = useState(false);
  const [layerVisible,  setLayerVisible]  = useState(true);
  const [layers, setLayers] = useState(
    LAYER_TYPES.map(t => ({ type: t, opacity:1, density: t==='Base'?1:t==='Flyaway'?0.15:0.5, locked:false, visible:true }))
  );
  // Guide curves
  const [guideCount,    setGuideCount]    = useState(24);
  const [guideSegs,     setGuideSegs]     = useState(8);
  const [showGuides,    setShowGuides]    = useState(true);
  const [guideColor,    setGuideColor]    = useState('#00ffc8');
  // Clumping
  const [clumpEnabled,  setClumpEnabled]  = useState(false);
  const [clumpStr,      setClumpStr]      = useState(0.40);
  const [clumpCount,    setClumpCount]    = useState(0.30);
  const [clumpTip,      setClumpTip]      = useState(0.60);
  // Noise
  const [noiseEnabled,  setNoiseEnabled]  = useState(false);
  const [noiseStr,      setNoiseStr]      = useState(0.20);
  const [noiseScale,    setNoiseScale]    = useState(0.50);
  const [noiseFreq,     setNoiseFreq]     = useState(1.00);
  // History
  const [undoStack,     setUndoStack]     = useState([]);

  const pushUndo = useCallback((action) => {
    setUndoStack(s => [...s.slice(-19), action]);
  }, []);

  const handleToolChange = useCallback((tool) => {
    setActiveTool(tool);
    onUpdate?.({ type:'toolChange', tool });
  }, [onUpdate]);

  const handleBrushStroke = useCallback((params) => {
    pushUndo({ type: 'stroke', tool: activeTool, params });
    onUpdate?.({ type:'stroke', tool:activeTool, brushRadius, brushStr, brushFalloff, xMirror, ...params });
  }, [activeTool, brushRadius, brushStr, brushFalloff, xMirror, pushUndo, onUpdate]);

  const updateLayer = useCallback((layerType, prop, value) => {
    setLayers(ls => ls.map(l => l.type===layerType ? { ...l, [prop]:value } : l));
    onUpdate?.({ type:'layerUpdate', layer:layerType, prop, value });
  }, [onUpdate]);

  return (
    <div className="ha-root">
      <Section title="🔧 Groom Tools">
        <div className="ha-tool-grid">
          {GROOM_TOOLS.map(tool => (
            <button key={tool} onClick={() => handleToolChange(tool)}
              className={`ha-tool-btn${activeTool===tool?' ha-tool-btn--active':''}`}>{tool}</button>
          ))}
        </div>
        <Slider label="Brush Radius"   value={brushRadius}  min={0.01} max={0.3} step={0.005} onChange={setBrushRadius}  />
        <Slider label="Brush Strength" value={brushStr}     onChange={setBrushStr}     />
        <Slider label="Falloff"        value={brushFalloff} onChange={setBrushFalloff} />
        <Slider label="Smooth"         value={brushSmooth}  onChange={setBrushSmooth}  />
        <Check  label="X Mirror"       value={xMirror}      onChange={setXMirror}      />
        <Check  label="Screen Projection" value={screenProj} onChange={setScreenProj} />
      </Section>

      <Section title="🧵 Layers">
        {layers.map(layer => (
          <div key={layer.type}
            className={`ha-layer-row${activeLayer===layer.type?' ha-layer-row--active':''}`}
            onClick={() => setActiveLayer(layer.type)}>
            <button onClick={e => { e.stopPropagation(); updateLayer(layer.type,'visible',!layer.visible); }}
              className={`ha-layer-vis${layer.visible?' ha-layer-vis--on':' ha-layer-vis--off'}`}>
              {layer.visible ? '👁' : '🕶'}</button>
            <button onClick={e => { e.stopPropagation(); updateLayer(layer.type,'locked',!layer.locked); }}
              className={`ha-layer-lock${layer.locked?' ha-layer-lock--on':' ha-layer-lock--off'}`}>
              {layer.locked ? '🔒' : '🔓'}</button>
            <span className={`ha-layer-name${activeLayer===layer.type?' ha-layer-name--active':''}`}>{layer.type}</span>
            <span className="ha-layer-density">{Math.round(layer.density*100)}%</span>
          </div>
        ))}
        {activeLayer && <>
          <Slider label="Layer Opacity" value={layers.find(l=>l.type===activeLayer)?.opacity??1}
            onChange={v => updateLayer(activeLayer,'opacity',v)} />
          <Slider label="Layer Density" value={layers.find(l=>l.type===activeLayer)?.density??1}
            onChange={v => updateLayer(activeLayer,'density',v)} />
        </>}
      </Section>

      <Section title="📏 Guide Curves" defaultOpen={false}>
        <Slider label="Guide Count"  value={guideCount} min={4} max={100} step={1} onChange={setGuideCount} />
        <Slider label="Segments"     value={guideSegs}  min={2} max={20}  step={1} onChange={setGuideSegs}  />
        <Check  label="Show Guides"  value={showGuides} onChange={setShowGuides} />
        {showGuides && <ColorRow label="Guide Color" value={guideColor} onChange={setGuideColor} />}
      </Section>

      <Section title="🧷 Clumping" defaultOpen={false}>
        <Check  label="Enable Clumping" value={clumpEnabled} onChange={setClumpEnabled} />
        {clumpEnabled && <>
          <Slider label="Strength"    value={clumpStr}   onChange={setClumpStr}   />
          <Slider label="Clump Count" value={clumpCount} onChange={setClumpCount} />
          <Slider label="Tip Weight"  value={clumpTip}   onChange={setClumpTip}   />
        </>}
      </Section>

      <Section title="🌀 Noise" defaultOpen={false}>
        <Check  label="Enable Noise" value={noiseEnabled} onChange={setNoiseEnabled} />
        {noiseEnabled && <>
          <Slider label="Strength"   value={noiseStr}   onChange={setNoiseStr}   />
          <Slider label="Scale"      value={noiseScale} onChange={setNoiseScale} />
          <Slider label="Frequency"  value={noiseFreq}  onChange={setNoiseFreq}  />
        </>}
      </Section>

      <div className="ha-footer">
        <button onClick={() => { setUndoStack(s => s.slice(0,-1)); onUpdate?.({ type:'undo' }); }}
          disabled={undoStack.length===0} className="ha-footer-btn">↩ Undo ({undoStack.length})</button>
        <button onClick={() => onUpdate?.({ type:'rebuild' })} className="ha-footer-btn">Rebuild</button>
        <button onClick={() => onUpdate?.({ type:'export' })} className="ha-footer-btn">Export</button>
      </div>
    </div>
  );
}
