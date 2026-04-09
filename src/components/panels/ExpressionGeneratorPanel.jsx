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

const BASE_EXPRESSIONS = ['Neutral','Happy','Sad','Angry','Surprised','Fearful','Disgusted',
  'Contempt','Confused','Bored','Excited','Loving','Smug','Shy','Pain','Focused'];
const EXPRESSION_TARGETS = ['jawOpen','jawLeft','jawRight','jawForward',
  'mouthSmile_L','mouthSmile_R','mouthFrown_L','mouthFrown_R',
  'mouthOpen','mouthPucker','mouthFunnel','mouthShrugLower','mouthShrugUpper',
  'mouthPress_L','mouthPress_R','mouthLowerDown_L','mouthLowerDown_R',
  'mouthUpperUp_L','mouthUpperUp_R','mouthDimple_L','mouthDimple_R',
  'mouthStretch_L','mouthStretch_R','mouthRollLower','mouthRollUpper',
  'cheekPuff','cheekSquint_L','cheekSquint_R',
  'noseSneer_L','noseSneer_R',
  'eyeWide_L','eyeWide_R','eyeBlink_L','eyeBlink_R',
  'eyeSquint_L','eyeSquint_R','eyeLookUp_L','eyeLookUp_R',
  'eyeLookDown_L','eyeLookDown_R','eyeLookIn_L','eyeLookIn_R',
  'eyeLookOut_L','eyeLookOut_R',
  'browDown_L','browDown_R','browInnerUp','browOuterUp_L','browOuterUp_R',
  'tongueOut'];

const PRESET_EXPRESSIONS = {
  Happy:     { mouthSmile_L:0.7, mouthSmile_R:0.7, cheekSquint_L:0.4, cheekSquint_R:0.4, browInnerUp:0.1 },
  Sad:       { mouthFrown_L:0.6, mouthFrown_R:0.6, browInnerUp:0.7, browDown_L:0.2, browDown_R:0.2, eyeSquint_L:0.2, eyeSquint_R:0.2 },
  Angry:     { browDown_L:0.8, browDown_R:0.8, noseSneer_L:0.5, noseSneer_R:0.5, mouthPress_L:0.4, mouthPress_R:0.4 },
  Surprised: { jawOpen:0.6, eyeWide_L:0.9, eyeWide_R:0.9, browOuterUp_L:0.8, browOuterUp_R:0.8, browInnerUp:0.8 },
  Fearful:   { jawOpen:0.3, eyeWide_L:0.7, eyeWide_R:0.7, browInnerUp:0.9, mouthStretch_L:0.4, mouthStretch_R:0.4 },
  Disgusted: { noseSneer_L:0.8, noseSneer_R:0.8, mouthShrugUpper:0.5, mouthLowerDown_L:0.3, mouthLowerDown_R:0.3 },
  Contempt:  { mouthSmile_L:0.4, mouthDimple_L:0.3, cheekSquint_L:0.2 },
  Smug:      { mouthSmile_L:0.3, mouthSmile_R:0.1, eyeSquint_L:0.2, browDown_L:0.1 },
};

export default function ExpressionGeneratorPanel({ character, onApply, onBake }) {
  const [baseExpr,    setBaseExpr]    = useState('Neutral');
  const [blendTarget, setBlendTarget] = useState('Happy');
  const [blendWeight, setBlendWeight] = useState(0.0);
  const [intensity,   setIntensity]   = useState(1.0);
  const [symmetry,    setSymmetry]    = useState(true);
  const [smoothing,   setSmoothing]   = useState(0.3);
  const [seed,        setSeed]        = useState(1);

  // Per-target overrides
  const [overrides, setOverrides] = useState({});
  const [showTargets, setShowTargets] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Mouth');

  // Animation
  const [animating,    setAnimating]    = useState(false);
  const [animSpeed,    setAnimSpeed]    = useState(0.5);
  const [animAmplitude,setAnimAmplitude]= useState(0.3);
  const [animMode,     setAnimMode]     = useState('Blink');
  const animRef = useRef(null);

  const CATEGORIES = {
    Mouth: EXPRESSION_TARGETS.filter(t => t.startsWith('mouth') || t.startsWith('jaw') || t.startsWith('tongue')),
    Eyes:  EXPRESSION_TARGETS.filter(t => t.startsWith('eye')),
    Brows: EXPRESSION_TARGETS.filter(t => t.startsWith('brow')),
    Nose:  EXPRESSION_TARGETS.filter(t => t.startsWith('nose') || t.startsWith('cheek')),
  };

  const getBlendedValues = useCallback(() => {
    const base   = PRESET_EXPRESSIONS[baseExpr]  ?? {};
    const target = PRESET_EXPRESSIONS[blendTarget] ?? {};
    const result = {};
    const allKeys = [...new Set([...Object.keys(base), ...Object.keys(target)])];
    allKeys.forEach(k => {
      const bv = (base[k] ?? 0);
      const tv = (target[k] ?? 0);
      result[k] = (bv + (tv - bv) * blendWeight) * intensity;
    });
    // Apply overrides
    Object.entries(overrides).forEach(([k, v]) => { result[k] = v * intensity; });
    // Symmetry: copy _L to _R
    if (symmetry) {
      Object.keys(result).forEach(k => {
        if (k.endsWith('_L')) result[k.replace('_L','_R')] = result[k];
      });
    }
    return result;
  }, [baseExpr, blendTarget, blendWeight, intensity, overrides, symmetry]);

  const handleApply = useCallback(() => {
    onApply?.({ expression: getBlendedValues(), smoothing, intensity });
  }, [getBlendedValues, smoothing, intensity, onApply]);

  const handleRandom = useCallback(() => {
    const presets = Object.keys(PRESET_EXPRESSIONS);
    const pick = () => presets[Math.floor(Math.random() * presets.length)];
    setBaseExpr(pick());
    setBlendTarget(pick());
    setBlendWeight(parseFloat((Math.random()).toFixed(2)));
    setIntensity(parseFloat((0.5 + Math.random() * 0.5).toFixed(2)));
    setSeed(Math.floor(Math.random() * 9999));
  }, []);

  const startAnimation = useCallback(() => {
    setAnimating(true);
    let t = 0;
    animRef.current = setInterval(() => {
      t += 0.05 * animSpeed;
      if (animMode === 'Blink') {
        const blink = Math.max(0, Math.sin(t * 3) > 0.95 ? 1 : 0);
        onApply?.({ expression: { eyeBlink_L: blink, eyeBlink_R: blink }, smoothing: 0.1 });
      } else if (animMode === 'Breathe') {
        const v = (Math.sin(t) + 1) * 0.5 * animAmplitude;
        onApply?.({ expression: { jawOpen: v * 0.15, mouthOpen: v * 0.1 }, smoothing: 0.5 });
      } else if (animMode === 'Talk') {
        const v = Math.abs(Math.sin(t * 4)) * animAmplitude;
        onApply?.({ expression: { jawOpen: v, mouthOpen: v * 0.8 }, smoothing: 0.15 });
      }
    }, 33);
  }, [animMode, animSpeed, animAmplitude, onApply]);

  const stopAnimation = useCallback(() => {
    setAnimating(false);
    if (animRef.current) clearInterval(animRef.current);
  }, []);

  useEffect(() => () => { if (animRef.current) clearInterval(animRef.current); }, []);

  const currentValues = getBlendedValues();

  return (
    <div style={P}>
      <Section title="😄 Base Expression">
        <Badges items={BASE_EXPRESSIONS.slice(0,8)} active={baseExpr} onSelect={setBaseExpr} />
        <Badges items={BASE_EXPRESSIONS.slice(8)}   active={baseExpr} onSelect={setBaseExpr} />
      </Section>

      <Section title="🔀 Blend">
        <Select label="Blend Target" value={blendTarget} options={Object.keys(PRESET_EXPRESSIONS)} onChange={setBlendTarget} />
        <Slider label="Blend Weight" value={blendWeight} onChange={setBlendWeight} />
      </Section>

      <Section title="\u2699 Controls">
        <Slider label="Intensity"  value={intensity}  onChange={setIntensity}  />
        <Slider label="Smoothing"  value={smoothing}  onChange={setSmoothing}  />
        <Check  label="Symmetry (mirror L→R)" value={symmetry} onChange={setSymmetry} />
      </Section>

      <Section title="📊 Live Values" defaultOpen={false}>
        <div style={{ fontSize:9, color:'#555', marginBottom:4 }}>Active morph targets (non-zero):</div>
        {Object.entries(currentValues).filter(([,v]) => v > 0.01).map(([k,v]) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:2 }}>
            <span style={{ color:'#888' }}>{k}</span>
            <span style={{ color:'#00ffc8' }}>{v.toFixed(3)}</span>
          </div>
        ))}
        {Object.keys(currentValues).filter(k => currentValues[k] > 0.01).length === 0 && (
          <div style={{ fontSize:10, color:'#555' }}>Neutral (all zero)</div>
        )}
      </Section>

      <Section title="🎨 Per-Target Override" defaultOpen={false}>
        <div style={{ display:'flex', gap:4, marginBottom:6 }}>
          {Object.keys(CATEGORIES).map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              flex:1, padding:'3px 0', fontSize:9, borderRadius:3, cursor:'pointer',
              background: activeCategory===cat ? '#00ffc8' : '#1a1f2c',
              color: activeCategory===cat ? '#06060f' : '#888',
              border:`1px solid ${activeCategory===cat ? '#00ffc8' : '#21262d'}`,
            }}>{cat}</button>
          ))}
        </div>
        {CATEGORIES[activeCategory]?.map(target => (
          <Slider key={target} label={target}
            value={overrides[target] ?? currentValues[target] ?? 0}
            onChange={v => setOverrides(o => ({ ...o, [target]: v }))} />
        ))}
        <button onClick={() => setOverrides({})} style={{
          width:'100%', background:'#1a1f2c', color:'#888', border:'1px solid #21262d',
          borderRadius:3, padding:'4px 0', cursor:'pointer', fontSize:10, marginTop:4,
        }}>Clear Overrides</button>
      </Section>

      <Section title="\u25B6 Animation" defaultOpen={false}>
        <Select label="Anim Mode"  value={animMode}      options={['Blink','Breathe','Talk']} onChange={setAnimMode} />
        <Slider label="Speed"      value={animSpeed}      onChange={setAnimSpeed}      />
        <Slider label="Amplitude"  value={animAmplitude}  onChange={setAnimAmplitude}  />
        <div style={{ display:'flex', gap:6, marginTop:4 }}>
          <button onClick={animating ? stopAnimation : startAnimation} style={{
            flex:1, background: animating ? '#FF6600' : '#00ffc8', color:'#06060f',
            border:'none', borderRadius:4, padding:'5px 0', cursor:'pointer', fontWeight:700, fontSize:11,
          }}>{animating ? '\u23F9 Stop' : '\u25B6 Play'}</button>
          <button onClick={() => onBake?.(currentValues)} style={{
            flex:1, background:'#1a1f2c', color:'#ccc', border:'1px solid #21262d',
            borderRadius:4, padding:'5px 0', cursor:'pointer', fontSize:11,
          }}>Bake</button>
        </div>
      </Section>

      <div style={{ display:'flex', gap:6 }}>
        <RandBtn onClick={handleRandom} />
        <GenBtn label="\u2713 Apply Expression" onClick={handleApply} />
      </div>
    </div>
  );
}
