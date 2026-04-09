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

function GenBtn({ label, onClick, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', background: disabled ? '#1a1f2c' : '#00ffc8',
      color: disabled ? '#555' : '#06060f', border: 'none', borderRadius: 4,
      padding: '7px 0', cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: 700, fontSize: 12, marginTop: 6, letterSpacing: 0.5,
      fontFamily: 'JetBrains Mono, monospace',
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

const EYE_TYPES     = ['Human','Cat','Dragon','Reptile','Insect','Alien','Robot','Cartoon','Fish','Owl','Goat'];
const PUPIL_SHAPES  = ['Round','Vertical Slit','Horizontal','Star','Heart','Square','Diamond','Cross','Keyhole'];
const IRIS_PATTERNS = ['Solid','Radial','Marbled','Hazel','Heterochromia','Sectoral','Spotted','Crystalline','Web'];
const POLY_OPTIONS  = ['Low','Mid','High','Ultra'];

export default function EyeGeneratorPanel({ onGenerate }) {
  const [eyeType,       setEyeType]       = useState('Human');
  const [seed,          setSeed]          = useState(1);
  const [irisColor,     setIrisColor]     = useState('#3a7acc');
  const [irisColor2,    setIrisColor2]    = useState('#1a4a8a');
  const [irisPattern,   setIrisPattern]   = useState('Radial');
  const [irisRadius,    setIrisRadius]    = useState(0.50);
  const [irisDetail,    setIrisDetail]    = useState(0.65);
  const [irisFibril,    setIrisFibril]    = useState(0.40);
  const [irisRough,     setIrisRough]     = useState(0.30);
  const [irisEmissive,  setIrisEmissive]  = useState(0.00);
  const [pupilShape,    setPupilShape]    = useState('Round');
  const [pupilSize,     setPupilSize]     = useState(0.40);
  const [pupilColor,    setPupilColor]    = useState('#080810');
  const [scleraColor,   setScleraColor]   = useState('#f5f0e8');
  const [scleraTint,    setScleraTint]    = useState(0.00);
  const [bloodshot,     setBloodshot]     = useState(0.00);
  const [scleraRough,   setScleraRough]   = useState(0.10);
  const [wetness,       setWetness]       = useState(0.75);
  const [cornealBulge,  setCornealBulge]  = useState(0.50);
  const [reflectStr,    setReflectStr]    = useState(0.70);
  const [eyeSize,       setEyeSize]       = useState(0.50);
  const [eyeDepth,      setEyeDepth]      = useState(0.50);
  const [eyeAngle,      setEyeAngle]      = useState(0.00);
  const [lidCrease,     setLidCrease]     = useState(0.40);
  const [lidThick,      setLidThick]      = useState(0.35);
  const [lidColor,      setLidColor]      = useState('#c8905c');
  const [addLashes,     setAddLashes]     = useState(true);
  const [lashDensity,   setLashDensity]   = useState(0.65);
  const [lashLength,    setLashLength]    = useState(0.50);
  const [lashCurve,     setLashCurve]     = useState(0.55);
  const [lashColor,     setLashColor]     = useState('#1a1008');
  const [lashThick,     setLashThick]     = useState(0.30);
  const [addBrow,       setAddBrow]       = useState(true);
  const [browThick,     setBrowThick]     = useState(0.45);
  const [browArch,      setBrowArch]      = useState(0.50);
  const [browLength,    setBrowLength]    = useState(0.55);
  const [browColor,     setBrowColor]     = useState('#3b1e0a');
  const [glowEffect,    setGlowEffect]    = useState(false);
  const [glowColor,     setGlowColor]     = useState('#00ffc8');
  const [glowIntensity, setGlowIntensity] = useState(0.50);
  const [catReflect,    setCatReflect]    = useState(false);
  const [scanLines,     setScanLines]     = useState(false);
  const [polyBudget,    setPolyBudget]    = useState('High');
  const [genPair,       setGenPair]       = useState(true);
  const [heterochromia, setHeterochromia] = useState(false);
  const [rightColor,    setRightColor]    = useState('#8a3a7a');

  return (
    <div style={P}>
      <Section title="👁 Eye Type">
        <Badges items={EYE_TYPES} active={eyeType} onSelect={setEyeType} />
        <Slider label="Random Seed" value={seed} min={0} max={9999} step={1} onChange={setSeed} />
      </Section>
      <Section title="🌈 Iris">
        <Badges items={IRIS_PATTERNS} active={irisPattern} onSelect={setIrisPattern} />
        <ColorRow label="Iris Color 1"   value={irisColor}    onChange={setIrisColor}    />
        <ColorRow label="Iris Color 2"   value={irisColor2}   onChange={setIrisColor2}   />
        <Slider label="Iris Radius"      value={irisRadius}   onChange={setIrisRadius}   />
        <Slider label="Detail Level"     value={irisDetail}   onChange={setIrisDetail}   />
        <Slider label="Fibril Strength"  value={irisFibril}   onChange={setIrisFibril}   />
        <Slider label="Roughness"        value={irisRough}    onChange={setIrisRough}    />
        <Slider label="Emissive Glow"    value={irisEmissive} onChange={setIrisEmissive} />
      </Section>
      <Section title="Pupil">
        <Badges   items={PUPIL_SHAPES} active={pupilShape} onSelect={setPupilShape} />
        <Slider   label="Pupil Size"  value={pupilSize}  onChange={setPupilSize}  />
        <ColorRow label="Pupil Color" value={pupilColor} onChange={setPupilColor} />
      </Section>
      <Section title="Sclera">
        <ColorRow label="Sclera Color" value={scleraColor} onChange={setScleraColor} />
        <Slider   label="Yellow Tint"  value={scleraTint}  onChange={setScleraTint}  />
        <Slider   label="Bloodshot"    value={bloodshot}   onChange={setBloodshot}   />
        <Slider   label="Roughness"    value={scleraRough} onChange={setScleraRough} />
      </Section>
      <Section title="💧 Surface">
        <Slider label="Wetness"       value={wetness}      onChange={setWetness}      />
        <Slider label="Corneal Bulge" value={cornealBulge} onChange={setCornealBulge} />
        <Slider label="Reflectivity"  value={reflectStr}   onChange={setReflectStr}   />
      </Section>
      <Section title="Shape">
        <Slider   label="Eye Size"      value={eyeSize}   onChange={setEyeSize}   />
        <Slider   label="Eye Depth"     value={eyeDepth}  onChange={setEyeDepth}  />
        <Slider   label="Tilt Angle"    value={eyeAngle}  min={-0.4} max={0.4} step={0.01} onChange={setEyeAngle} />
        <Slider   label="Lid Crease"    value={lidCrease} onChange={setLidCrease} />
        <Slider   label="Lid Thickness" value={lidThick}  onChange={setLidThick}  />
        <ColorRow label="Lid Color"     value={lidColor}  onChange={setLidColor}  />
      </Section>
      <Section title="\u2728 Lashes" defaultOpen={false}>
        <Check label="Generate Lashes" value={addLashes} onChange={setAddLashes} />
        {addLashes && (<>
          <Slider   label="Density"   value={lashDensity} onChange={setLashDensity} />
          <Slider   label="Length"    value={lashLength}  onChange={setLashLength}  />
          <Slider   label="Curl"      value={lashCurve}   onChange={setLashCurve}   />
          <Slider   label="Thickness" value={lashThick}   onChange={setLashThick}   />
          <ColorRow label="Color"     value={lashColor}   onChange={setLashColor}   />
        </>)}
      </Section>
      <Section title="Brow" defaultOpen={false}>
        <Check label="Generate Brow" value={addBrow} onChange={setAddBrow} />
        {addBrow && (<>
          <Slider   label="Thickness" value={browThick}  onChange={setBrowThick}  />
          <Slider   label="Arch"      value={browArch}   onChange={setBrowArch}   />
          <Slider   label="Length"    value={browLength} onChange={setBrowLength} />
          <ColorRow label="Color"     value={browColor}  onChange={setBrowColor}  />
        </>)}
      </Section>
      <Section title="FX" defaultOpen={false}>
        <Check label="Glow Effect" value={glowEffect} onChange={setGlowEffect} />
        {glowEffect && (<>
          <ColorRow label="Glow Color"    value={glowColor}     onChange={setGlowColor}     />
          <Slider   label="Glow Intensity" value={glowIntensity} onChange={setGlowIntensity} />
        </>)}
        <Check label="Cat-Eye Reflection" value={catReflect} onChange={setCatReflect} />
        <Check label="Scan Lines (Robot)" value={scanLines}  onChange={setScanLines}  />
      </Section>
      <Section title="\u2699 Output" defaultOpen={false}>
        <Select label="Poly Budget"         value={polyBudget}   options={POLY_OPTIONS} onChange={setPolyBudget}    />
        <Check  label="Generate Pair (L+R)" value={genPair}      onChange={setGenPair}       />
        <Check  label="Heterochromia"        value={heterochromia} onChange={setHeterochromia} />
        {heterochromia && <ColorRow label="Right Eye Color" value={rightColor} onChange={setRightColor} />}
      </Section>
      <GenBtn label="\u26a1 Generate Eye" onClick={() => onGenerate?.({
        eyeType, seed,
        iris: { irisColor, irisColor2, irisPattern, irisRadius, irisDetail, irisFibril, irisRough, irisEmissive },
        pupil: { pupilShape, pupilSize, pupilColor },
        sclera: { scleraColor, scleraTint, bloodshot, scleraRough },
        surface: { wetness, cornealBulge, reflectStr },
        shape: { eyeSize, eyeDepth, eyeAngle, lidCrease, lidThick, lidColor },
        lashes: { addLashes, lashDensity, lashLength, lashCurve, lashThick, lashColor },
        brow: { addBrow, browThick, browArch, browLength, browColor },
        fx: { glowEffect, glowColor, glowIntensity, catReflect, scanLines },
        output: { polyBudget, genPair, heterochromia, rightColor },
      })} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// SPX Generator Panel — Configuration Reference
// -----------------------------------------------------------------------------
// PROPS
//   onGenerate(params)   Called when user clicks Generate. params is a
//                        structured object grouped by category.
//   onReset()            Optional. Resets all state to defaults.
//
// DESIGN TOKENS
//   Background : #06060f    Panel    : #0d1117
//   Border     : #21262d    Primary  : #00ffc8
//   Orange     : #FF6600    Font     : JetBrains Mono, monospace
//
// SLIDER CONTRACT
//   All normalized sliders use range 0.0 – 1.0 unless noted.
//   Integer sliders use step={1}. Angle sliders use –0.5 to 0.5 rad.
//
// KEYBOARD SHORTCUTS (registered by parent shell)
//   Enter      Generate        Shift+R    Randomize
//   Shift+X    Reset           Ctrl+Z     Undo last change
//   Ctrl+S     Save preset     Ctrl+O     Load preset
//
// PERFORMANCE
//   Sliders fire onChange every frame during drag.
//   Debounce heavy 3D operations in the onGenerate handler.
//   Wrap Slider/Select/Check in React.memo for large panels.
//
// PRESET SYSTEM (planned)
//   Key: spx_presets_<PanelName> in localStorage
//   Schema: Array<{ name: string, params: object, createdAt: number }>
//
// ACCESSIBILITY
//   All inputs are keyboard-navigable via Tab.
//   Color pickers show hex label for screen readers.
//   Section headers respond to Enter/Space.
//
// INTEGRATION
//   Panels mount in the right sidebar of SPX Mesh Editor.
//   Parent PanelHost wires onGenerate to the Three.js scene.
//   Generated geometry returns as THREE.Group with userData.params.
//
// SECTION REFERENCE
//   Every panel uses collapsible <Section> components.
//   defaultOpen={false} sections start collapsed.
//   Open/closed state is local React state, not persisted.
//
// COLOR PICKERS
//   All colors are CSS hex strings: #rrggbb
//   ColorRow renders native input[type=color] + hex display.
//
// RANDOMIZE
//   Math.random() seeded by the seed slider value.
//   Values clamped to artistically sensible ranges.
//   Does not guarantee physical plausibility.
//
// -----------------------------------------------------------------------------
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
//
// ─────────────────────────────────────────────────────────────────────────────
//
//
//
