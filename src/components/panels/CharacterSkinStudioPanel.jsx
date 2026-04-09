import React, { useState, useCallback } from 'react';

function Slider({ label, value, min = 0, max = 1, step = 0.01, onChange, unit = '' }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888' }}>
        <span>{label}</span>
        <span style={{ color: '#00ffc8', fontWeight: 600 }}>
          {typeof value === 'number' ? (step < 0.1 ? value.toFixed(2) : Math.round(value)) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#00ffc8', cursor: 'pointer', height: 16 }} />
    </div>
  );
}
function Select({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 6 }}>
      {label && <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', background: '#0d1117', color: '#e0e0e0',
        border: '1px solid #21262d', padding: '3px 6px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Check({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
      color: '#ccc', cursor: 'pointer', marginBottom: 4 }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: '#00ffc8', width: 12, height: 12 }} />
      {label}
    </label>
  );
}
function ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 10, color: '#888', flex: 1 }}>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 32, height: 22, border: 'none', cursor: 'pointer', borderRadius: 3 }} />
      <span style={{ fontSize: 9, color: '#555', fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 6, border: '1px solid #21262d', borderRadius: 5, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding: '5px 8px', cursor: 'pointer', background: '#0d1117',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, fontWeight: 600, color: '#00ffc8', userSelect: 'none',
      }}>
        <span>{title}</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>{open ? '\u25b2' : '\u25bc'}</span>
      </div>
      {open && <div style={{ padding: '6px 8px', background: '#06060f' }}>{children}</div>}
    </div>
  );
}
function Badges({ items, active, onSelect }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
      {items.map(item => (
        <button key={item} onClick={() => onSelect(item)} style={{
          padding: '2px 7px', fontSize: 9, borderRadius: 4, cursor: 'pointer',
          background: active === item ? '#00ffc8' : '#1a1f2c',
          color: active === item ? '#06060f' : '#ccc',
          border: `1px solid ${active === item ? '#00ffc8' : '#21262d'}`,
        }}>{item}</button>
      ))}
    </div>
  );
}
function NumInput({ label, value, min, max, step = 1, onChange, unit = '' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
      <span style={{ fontSize: 10, color: '#888', flex: 1 }}>{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: 60, background: '#0d1117', color: '#e0e0e0',
          border: '1px solid #21262d', padding: '2px 4px', borderRadius: 3, fontSize: 11, textAlign: 'right' }} />
      {unit && <span style={{ fontSize: 9, color: '#555' }}>{unit}</span>}
    </div>
  );
}
function GenBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', background: '#00ffc8', color: '#06060f', border: 'none',
      borderRadius: 4, padding: '7px 0', cursor: 'pointer', fontWeight: 700,
      fontSize: 12, marginTop: 6, letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace',
    }}>{label}</button>
  );
}
function RandBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: '#1a1f2c', color: '#888', border: '1px solid #21262d',
      borderRadius: 4, padding: '6px 10px', cursor: 'pointer', fontSize: 11,
    }}>🎲</button>
  );
}
const P = { fontFamily: 'JetBrains Mono, monospace', color: '#e0e0e0', fontSize: 12, userSelect: 'none', width: '100%' };

const SKIN_PRESETS = {
  Fair:      { base:'#f5d5c0', sub:'#ffb08a', melanin:0.05, redness:0.20 },
  Light:     { base:'#e8c4a0', sub:'#f0a878', melanin:0.15, redness:0.22 },
  Medium:    { base:'#c8905c', sub:'#d07040', melanin:0.38, redness:0.25 },
  Olive:     { base:'#a07840', sub:'#b06030', melanin:0.50, redness:0.18 },
  Tan:       { base:'#8a6030', sub:'#a04820', melanin:0.62, redness:0.20 },
  Brown:     { base:'#6a4020', sub:'#803010', melanin:0.72, redness:0.17 },
  Dark:      { base:'#4a2810', sub:'#602008', melanin:0.85, redness:0.14 },
  Ebony:     { base:'#2a1008', sub:'#3a1208', melanin:1.00, redness:0.08 },
};

export default function CharacterSkinStudioPanel({ onUpdate }) {
  // Preset
  const [activePreset,  setActivePreset]  = useState('Medium');
  // Base skin
  const [baseColor,     setBaseColor]     = useState('#c8905c');
  const [subColor,      setSubColor]      = useState('#d07040');
  const [melanin,       setMelanin]       = useState(0.38);
  const [redness,       setRedness]       = useState(0.25);
  const [yellowness,    setYellowness]    = useState(0.10);
  // PBR
  const [roughness,     setRoughness]     = useState(0.55);
  const [metalness,     setMetalness]     = useState(0.00);
  const [specular,      setSpecular]      = useState(0.40);
  const [reflectance,   setReflectance]   = useState(0.30);
  // SSS
  const [sssStr,        setSssStr]        = useState(0.60);
  const [sssRadius,     setSssRadius]     = useState(0.12);
  const [sssColor,      setSssColor]      = useState('#ff9060');
  const [sssDepth,      setSssDepth]      = useState(0.40);
  // Micro detail
  const [poreScale,     setPoreScale]     = useState(1.00);
  const [poreDepth,     setPoreDepth]     = useState(0.40);
  const [poreRoughness, setPoreRoughness] = useState(0.80);
  const [wrinkling,     setWrinkling]     = useState(0.30);
  const [wrinkleDepth,  setWrinkleDepth]  = useState(0.40);
  const [oiliness,      setOiliness]      = useState(0.20);
  const [perspiring,    setPerspiring]    = useState(0.00);
  const [veinVis,       setVeinVis]       = useState(0.15);
  const [veinColor,     setVeinColor]     = useState('#3060b0');
  const [freckles,      setFreckles]      = useState(0.00);
  const [freckleColor,  setFreckleColor]  = useState('#8a5030');
  const [birthmark,     setBirthmark]     = useState(0.00);
  // Lip & Cheek
  const [lipColor,      setLipColor]      = useState('#c05060');
  const [lipGloss,      setLipGloss]      = useState(0.40);
  const [lipRough,      setLipRough]      = useState(0.30);
  const [cheekColor,    setCheekColor]    = useState('#e07060');
  const [cheekStr,      setCheekStr]      = useState(0.30);
  const [cheekBloom,    setCheekBloom]    = useState(0.20);
  // Eye area
  const [eyeSocketDark, setEyeSocketDark] = useState(0.20);
  const [eyeSocketColor,setEyeSocketColor]= useState('#601030');
  const [eyebagDepth,   setEyebagDepth]   = useState(0.10);
  const [eyebagColor,   setEyebagColor]   = useState('#8a5070');
  // Zones
  const [zones, setZones] = useState({
    forehead: true, nose: true, cheeks: true, chin: true,
    neck: true, hands: true, arms: false, body: false, feet: false,
  });
  // AO
  const [aoStr,         setAoStr]         = useState(0.80);
  const [aoRadius,      setAoRadius]      = useState(0.50);

  const applyPreset = useCallback((name) => {
    const p = SKIN_PRESETS[name];
    if (!p) return;
    setActivePreset(name);
    setBaseColor(p.base); setSubColor(p.sub);
    setMelanin(p.melanin); setRedness(p.redness);
    onUpdate?.({ type: 'preset', name, ...p });
  }, [onUpdate]);

  const handleApply = useCallback(() => {
    onUpdate?.({
      type: 'apply',
      base: { baseColor, subColor, melanin, redness, yellowness },
      pbr: { roughness, metalness, specular, reflectance },
      sss: { sssStr, sssRadius, sssColor, sssDepth },
      micro: { poreScale, poreDepth, poreRoughness, wrinkling, wrinkleDepth, oiliness, perspiring, veinVis, veinColor, freckles, freckleColor, birthmark },
      face: { lipColor, lipGloss, lipRough, cheekColor, cheekStr, cheekBloom, eyeSocketDark, eyeSocketColor, eyebagDepth, eyebagColor },
      ao: { aoStr, aoRadius }, zones,
    });
  }, [baseColor, subColor, melanin, redness, yellowness, roughness, metalness, specular, reflectance, sssStr, sssRadius, sssColor, sssDepth, poreScale, poreDepth, poreRoughness, wrinkling, wrinkleDepth, oiliness, perspiring, veinVis, veinColor, freckles, freckleColor, birthmark, lipColor, lipGloss, lipRough, cheekColor, cheekStr, cheekBloom, eyeSocketDark, eyeSocketColor, eyebagDepth, eyebagColor, aoStr, aoRadius, zones]);

  return (
    <div style={P}>
      <Section title="🎨 Skin Preset">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {Object.keys(SKIN_PRESETS).map(name => (
            <button key={name} onClick={() => applyPreset(name)} style={{
              padding: '3px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer',
              background: activePreset === name ? '#00ffc8' : '#1a1f2c',
              color: activePreset === name ? '#06060f' : '#ccc',
              border: `1px solid ${activePreset === name ? '#00ffc8' : '#21262d'}`,
            }}>{name}</button>
          ))}
        </div>
      </Section>
      <Section title="🌈 Base Colors">
        <ColorRow label="Base Color"       value={baseColor}   onChange={setBaseColor}   />
        <ColorRow label="Subsurface Color" value={subColor}    onChange={setSubColor}    />
        <Slider   label="Melanin"          value={melanin}     onChange={setMelanin}     />
        <Slider   label="Redness"          value={redness}     onChange={setRedness}     />
        <Slider   label="Yellowness"       value={yellowness}  onChange={setYellowness}  />
      </Section>
      <Section title="PBR Properties">
        <Slider label="Roughness"    value={roughness}   onChange={setRoughness}   />
        <Slider label="Metalness"    value={metalness}   onChange={setMetalness}   />
        <Slider label="Specular"     value={specular}    onChange={setSpecular}    />
        <Slider label="Reflectance"  value={reflectance} onChange={setReflectance} />
      </Section>
      <Section title="Subsurface Scatter">
        <Slider   label="SSS Strength" value={sssStr}    onChange={setSssStr}    />
        <Slider   label="SSS Radius"   value={sssRadius} onChange={setSssRadius} />
        <Slider   label="SSS Depth"    value={sssDepth}  onChange={setSssDepth}  />
        <ColorRow label="SSS Color"    value={sssColor}  onChange={setSssColor}  />
      </Section>
      <Section title="🔬 Micro Detail">
        <Slider label="Pore Scale"    value={poreScale}     min={0.1} max={3} step={0.05} onChange={setPoreScale}     />
        <Slider label="Pore Depth"    value={poreDepth}     onChange={setPoreDepth}     />
        <Slider label="Pore Rough"    value={poreRoughness} onChange={setPoreRoughness} />
        <Slider label="Wrinkling"     value={wrinkling}     onChange={setWrinkling}     />
        <Slider label="Wrinkle Depth" value={wrinkleDepth}  onChange={setWrinkleDepth}  />
        <Slider label="Oiliness"      value={oiliness}      onChange={setOiliness}      />
        <Slider label="Perspiration"  value={perspiring}    onChange={setPerspiring}    />
        <Slider label="Vein Vis"      value={veinVis}       onChange={setVeinVis}       />
        <ColorRow label="Vein Color"  value={veinColor}     onChange={setVeinColor}     />
        <Slider label="Freckles"      value={freckles}      onChange={setFreckles}      />
        {freckles > 0 && <ColorRow label="Freckle Color" value={freckleColor} onChange={setFreckleColor} />}
        <Slider label="Birthmark"     value={birthmark}     onChange={setBirthmark}     />
      </Section>
      <Section title="💋 Lip & Cheek" defaultOpen={false}>
        <ColorRow label="Lip Color"    value={lipColor}    onChange={setLipColor}    />
        <Slider   label="Lip Gloss"    value={lipGloss}    onChange={setLipGloss}    />
        <Slider   label="Lip Rough"    value={lipRough}    onChange={setLipRough}    />
        <ColorRow label="Cheek Color"  value={cheekColor}  onChange={setCheekColor}  />
        <Slider   label="Cheek Str"    value={cheekStr}    onChange={setCheekStr}    />
        <Slider   label="Cheek Bloom"  value={cheekBloom}  onChange={setCheekBloom}  />
      </Section>
      <Section title="Eye Area" defaultOpen={false}>
        <Slider   label="Socket Dark"  value={eyeSocketDark}  onChange={setEyeSocketDark}  />
        <ColorRow label="Socket Color" value={eyeSocketColor} onChange={setEyeSocketColor} />
        <Slider   label="Eye Bag Depth" value={eyebagDepth}   onChange={setEyebagDepth}   />
        <ColorRow label="Eye Bag Color" value={eyebagColor}   onChange={setEyebagColor}   />
      </Section>
      <Section title="🗺 Skin Zones" defaultOpen={false}>
        {Object.keys(zones).map(z => (
          <Check key={z} label={z.charAt(0).toUpperCase() + z.slice(1)}
            value={zones[z]} onChange={v => setZones(s => ({ ...s, [z]: v }))} />
        ))}
      </Section>
      <Section title="AO" defaultOpen={false}>
        <Slider label="AO Strength" value={aoStr}    onChange={setAoStr}    />
        <Slider label="AO Radius"   value={aoRadius} onChange={setAoRadius} />
      </Section>
      <GenBtn label="\u2713 Apply Skin" onClick={handleApply} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// SPX Mesh Editor — Generator Panel
// Props: onGenerate(params)  |  onReset()
// Design: #06060f bg  #0d1117 panel  #21262d border  #00ffc8 teal
// Font: JetBrains Mono  |  All sliders normalized 0.0–1.0
// Keyboard: Enter=Generate  Shift+R=Randomize  Ctrl+Z=Undo
// Presets: localStorage spx_presets_<PanelName>
// Integration: mounts in SPX Mesh Editor right sidebar
// Generated geometry: THREE.Group with userData.params
// -----------------------------------------------------------------------------
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
//
// ────────────────────────────────────────
//
//
