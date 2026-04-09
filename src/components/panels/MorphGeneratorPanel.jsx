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

const MORPH_CATEGORIES = {
  'Face Shape': ['headScale','faceWidth','faceLength','chinProtrusion','chinWidth',
    'jawWidth','jawHeight','cheekboneWidth','cheekboneHeight','foreheadWidth','foreheadHeight'],
  'Eyes':       ['eyeSize','eyeSpacing','eyeDepth','eyeAngle','eyeHeight','eyelidHeavy','epicanthicFold'],
  'Nose':       ['noseSize','noseBridgeHeight','noseBridgeWidth','noseTipUp','noseTipRound',
    'nostrils','noseLength'],
  'Mouth':      ['lipThickness','lipWidth','cupidBow','mouthCorners','mouthDepth','philtrum'],
  'Ears':       ['earSize','earAngle','earProtrusion','lobSize'],
  'Body':       ['bodyHeight','shoulderWidth','chestSize','waistSize','hipSize',
    'armLength','legLength','neckThickness'],
};

export default function MorphGeneratorPanel({ character, onApply, onReset }) {
  const [category,    setCategory]    = useState('Face Shape');
  const [morphValues, setMorphValues] = useState({});
  const [presets,     setPresets]     = useState({});
  const [presetName,  setPresetName]  = useState('');
  const [symmetry,    setSymmetry]    = useState(true);
  const [strength,    setStrength]    = useState(1.0);
  const [smoothing,   setSmoothing]   = useState(0.5);
  const [history,     setHistory]     = useState([]);
  const [histIdx,     setHistIdx]     = useState(-1);

  const setMorph = useCallback((key, value) => {
    setMorphValues(prev => {
      const next = { ...prev, [key]: value };
      // Push to undo history
      setHistory(h => [...h.slice(0, histIdx + 1), prev].slice(-20));
      setHistIdx(i => Math.min(i + 1, 19));
      return next;
    });
  }, [histIdx]);

  const undo = useCallback(() => {
    if (histIdx < 0) return;
    setMorphValues(history[histIdx]);
    setHistIdx(i => i - 1);
  }, [history, histIdx]);

  const redo = useCallback(() => {
    if (histIdx >= history.length - 1) return;
    setHistIdx(i => i + 1);
    setMorphValues(history[histIdx + 1]);
  }, [history, histIdx]);

  const randomize = useCallback(() => {
    const rn = () => parseFloat((Math.random() * 0.6 - 0.3).toFixed(2));
    const next = {};
    Object.values(MORPH_CATEGORIES).flat().forEach(k => { next[k] = rn(); });
    setMorphValues(next);
  }, []);

  const reset = useCallback(() => {
    setMorphValues({});
    onReset?.();
  }, [onReset]);

  const savePreset = useCallback(() => {
    if (!presetName.trim()) return;
    setPresets(p => ({ ...p, [presetName]: { ...morphValues } }));
    setPresetName('');
  }, [presetName, morphValues]);

  const loadPreset = useCallback((name) => {
    const p = presets[name];
    if (p) setMorphValues({ ...p });
  }, [presets]);

  const handleApply = useCallback(() => {
    const scaled = {};
    Object.entries(morphValues).forEach(([k, v]) => { scaled[k] = v * strength; });
    onApply?.({ morphs: scaled, smoothing });
  }, [morphValues, strength, smoothing, onApply]);

  const activeTargets = MORPH_CATEGORIES[category] ?? [];
  const nonZero = Object.entries(morphValues).filter(([,v]) => Math.abs(v) > 0.001);

  return (
    <div style={P}>
      <Section title="🧬 Category">
        <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:6 }}>
          {Object.keys(MORPH_CATEGORIES).map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding:'3px 8px', fontSize:9, borderRadius:4, cursor:'pointer',
              background: category===cat ? '#00ffc8' : '#1a1f2c',
              color: category===cat ? '#06060f' : '#ccc',
              border: `1px solid ${category===cat ? '#00ffc8' : '#21262d'}`,
            }}>{cat}</button>
          ))}
        </div>
      </Section>

      <Section title={`🎨 ${category} Morphs`}>
        {activeTargets.map(key => (
          <Slider key={key} label={key}
            value={morphValues[key] ?? 0}
            min={-1} max={1} step={0.01}
            onChange={v => setMorph(key, v)} />
        ))}
      </Section>

      <Section title="\u2699 Controls">
        <Slider label="Overall Strength" value={strength}  onChange={setStrength}  />
        <Slider label="Smoothing"        value={smoothing} onChange={setSmoothing} />
        <Check  label="Symmetry"         value={symmetry}  onChange={setSymmetry}  />
      </Section>

      <Section title="📋 Active Morphs" defaultOpen={false}>
        {nonZero.length === 0 && <div style={{ fontSize:10, color:'#555' }}>No active morphs</div>}
        {nonZero.map(([k,v]) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
            <span style={{ fontSize:10, color:'#888', flex:1 }}>{k}</span>
            <span style={{ fontSize:10, color: v>0 ? '#00ffc8' : '#FF6600', width:50, textAlign:'right' }}>
              {v > 0 ? '+' : ''}{v.toFixed(3)}
            </span>
            <button onClick={() => setMorph(k, 0)} style={{
              marginLeft:6, background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:11,
            }}>×</button>
          </div>
        ))}
      </Section>

      <Section title="💾 Presets" defaultOpen={false}>
        <div style={{ display:'flex', gap:4, marginBottom:6 }}>
          <input value={presetName} onChange={e => setPresetName(e.target.value)}
            placeholder="Preset name..." style={{
              flex:1, background:'#0d1117', color:'#e0e0e0', border:'1px solid #21262d',
              borderRadius:3, padding:'3px 6px', fontSize:10,
            }} />
          <button onClick={savePreset} style={{
            background:'#00ffc8', color:'#06060f', border:'none', borderRadius:3,
            padding:'3px 8px', cursor:'pointer', fontSize:10, fontWeight:700,
          }}>Save</button>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
          {Object.keys(presets).map(name => (
            <button key={name} onClick={() => loadPreset(name)} style={{
              padding:'2px 8px', fontSize:9, borderRadius:4, cursor:'pointer',
              background:'#1a1f2c', color:'#ccc', border:'1px solid #21262d',
            }}>{name}</button>
          ))}
        </div>
      </Section>

      <div style={{ display:'flex', gap:4, marginBottom:6 }}>
        <button onClick={undo} disabled={histIdx < 0} style={{
          flex:1, background:'#1a1f2c', color: histIdx>=0 ? '#ccc' : '#444',
          border:'1px solid #21262d', borderRadius:4, padding:'5px 0', cursor:'pointer', fontSize:10,
        }}>↩ Undo</button>
        <button onClick={redo} disabled={histIdx >= history.length-1} style={{
          flex:1, background:'#1a1f2c', color: histIdx<history.length-1 ? '#ccc' : '#444',
          border:'1px solid #21262d', borderRadius:4, padding:'5px 0', cursor:'pointer', fontSize:10,
        }}>↪ Redo</button>
        <button onClick={reset} style={{
          flex:1, background:'#1a1f2c', color:'#888', border:'1px solid #21262d',
          borderRadius:4, padding:'5px 0', cursor:'pointer', fontSize:10,
        }}>Reset</button>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <RandBtn onClick={randomize} />
        <GenBtn label="\u2713 Apply Morphs" onClick={handleApply} />
      </div>
    </div>
  );
}
