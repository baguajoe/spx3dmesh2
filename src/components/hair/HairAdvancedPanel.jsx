import React, { useState, useCallback, useRef, useEffect } from 'react';

function Slider({ label, value, min=0, max=1, step=0.01, onChange, unit='' }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#888' }}>
        <span>{label}</span>
        <span style={{ color:'#00ffc8', fontWeight:600 }}>
          {typeof value==='number' ? (step<0.1 ? value.toFixed(2) : Math.round(value)) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:'100%', accentColor:'#00ffc8', cursor:'pointer', height:16 }} />
    </div>
  );
}
function Select({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom:6 }}>
      {label && <div style={{ fontSize:10, color:'#888', marginBottom:2 }}>{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width:'100%', background:'#0d1117', color:'#e0e0e0',
        border:'1px solid #21262d', padding:'3px 6px', borderRadius:4, fontSize:11, cursor:'pointer',
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Check({ label, value, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:11,
      color:'#ccc', cursor:'pointer', marginBottom:4 }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ accentColor:'#00ffc8', width:12, height:12 }} />
      {label}
    </label>
  );
}
function ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
      <span style={{ fontSize:10, color:'#888', flex:1 }}>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width:32, height:22, border:'none', cursor:'pointer', borderRadius:3 }} />
      <span style={{ fontSize:9, color:'#555', fontFamily:'monospace' }}>{value}</span>
    </div>
  );
}
function Section({ title, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom:6, border:'1px solid #21262d', borderRadius:5, overflow:'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding:'5px 8px', cursor:'pointer', background:'#0d1117',
        display:'flex', justifyContent:'space-between',
        fontSize:11, fontWeight:600, color:'#00ffc8', userSelect:'none',
      }}>
        <span>{title}</span>
        <span style={{ fontSize:9, opacity:0.7 }}>{open ? '\u25b2' : '\u25bc'}</span>
      </div>
      {open && <div style={{ padding:'6px 8px', background:'#06060f' }}>{children}</div>}
    </div>
  );
}
function Badges({ items, active, onSelect }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:6 }}>
      {items.map(item => (
        <button key={item} onClick={() => onSelect(item)} style={{
          padding:'2px 7px', fontSize:9, borderRadius:4, cursor:'pointer',
          background: active===item ? '#00ffc8' : '#1a1f2c',
          color: active===item ? '#06060f' : '#ccc',
          border: `1px solid ${active===item ? '#00ffc8' : '#21262d'}`,
        }}>{item}</button>
      ))}
    </div>
  );
}
function GenBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', background:'#00ffc8', color:'#06060f', border:'none',
      borderRadius:4, padding:'7px 0', cursor:'pointer', fontWeight:700,
      fontSize:12, marginTop:6, letterSpacing:0.5, fontFamily:'JetBrains Mono, monospace',
    }}>{label}</button>
  );
}
function RandBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background:'#1a1f2c', color:'#888', border:'1px solid #21262d',
      borderRadius:4, padding:'6px 10px', cursor:'pointer', fontSize:11,
    }}>🎲</button>
  );
}
const P = { fontFamily:'JetBrains Mono, monospace', color:'#e0e0e0', fontSize:12, userSelect:'none', width:'100%' };

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
    <div style={P}>
      <Section title="🔧 Groom Tools">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:3, marginBottom:6 }}>
          {GROOM_TOOLS.map(tool => (
            <button key={tool} onClick={() => handleToolChange(tool)} style={{
              padding:'4px 0', fontSize:9, borderRadius:4, cursor:'pointer',
              background: activeTool===tool ? '#00ffc8' : '#1a1f2c',
              color: activeTool===tool ? '#06060f' : '#ccc',
              border: `1px solid ${activeTool===tool ? '#00ffc8' : '#21262d'}`,
            }}>{tool}</button>
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
          <div key={layer.type} style={{
            display:'flex', alignItems:'center', gap:4, marginBottom:4, padding:'3px 6px',
            background: activeLayer===layer.type ? '#0d1117' : 'transparent',
            borderRadius:3, cursor:'pointer', border:`1px solid ${activeLayer===layer.type?'#21262d':'transparent'}`
          }} onClick={() => setActiveLayer(layer.type)}>
            <button onClick={e => { e.stopPropagation(); updateLayer(layer.type,'visible',!layer.visible); }} style={{
              background:'none', border:'none', color: layer.visible ? '#00ffc8' : '#444', cursor:'pointer', fontSize:11, padding:0,
            }}>{layer.visible ? '👁' : '🕶'}</button>
            <button onClick={e => { e.stopPropagation(); updateLayer(layer.type,'locked',!layer.locked); }} style={{
              background:'none', border:'none', color: layer.locked ? '#FF6600' : '#555', cursor:'pointer', fontSize:11, padding:0,
            }}>{layer.locked ? '🔒' : '🔓'}</button>
            <span style={{ flex:1, fontSize:10, color: activeLayer===layer.type ? '#e0e0e0' : '#888' }}>{layer.type}</span>
            <span style={{ fontSize:9, color:'#555' }}>{Math.round(layer.density*100)}%</span>
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

      <div style={{ display:'flex', gap:4, marginTop:4 }}>
        <button onClick={() => { setUndoStack(s => s.slice(0,-1)); onUpdate?.({ type:'undo' }); }}
          disabled={undoStack.length===0} style={{
          flex:1, background:'#1a1f2c', color: undoStack.length>0?'#ccc':'#444',
          border:'1px solid #21262d', borderRadius:4, padding:'5px 0', cursor:'pointer', fontSize:10,
        }}>↩ Undo ({undoStack.length})</button>
        <button onClick={() => onUpdate?.({ type:'rebuild' })} style={{
          flex:1, background:'#1a1f2c', color:'#888', border:'1px solid #21262d',
          borderRadius:4, padding:'5px 0', cursor:'pointer', fontSize:10,
        }}>Rebuild</button>
        <button onClick={() => onUpdate?.({ type:'export' })} style={{
          flex:1, background:'#1a1f2c', color:'#888', border:'1px solid #21262d',
          borderRadius:4, padding:'5px 0', cursor:'pointer', fontSize:10,
        }}>Export</button>
      </div>
    </div>
  );
}
