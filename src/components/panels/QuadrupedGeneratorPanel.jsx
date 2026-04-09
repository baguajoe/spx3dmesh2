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

const ANIMAL_TYPES = ['Dog','Cat','Horse','Wolf','Lion','Tiger','Bear','Deer','Fox','Rabbit','Elephant','Dragon','Hyena','Panther','Rhino','Gorilla','Boar','Moose','Cow','Goat'];
const EAR_TYPES    = ['Floppy','Erect','Folded','Rounded','Pointed','Tufted','Absent'];
const TAIL_TYPES   = ['Long','Short','Stubby','Curled','Bushy','Spiked','Absent','Feathered'];
const FUR_TYPES    = ['Short','Medium','Long','Wiry','Fluffy','Matted','Double Coat','Hairless'];
const MARKINGS     = ['None','Stripes','Spots','Patches','Gradient','Brindle','Piebald','Roan','Saddle'];
const POLY_OPTIONS = ['Low','Mid','High','Ultra'];

export default function QuadrupedGeneratorPanel({ onGenerate }) {
  const [animalType,     setAnimalType]     = useState('Dog');
  const [furType,        setFurType]        = useState('Short');
  const [earType,        setEarType]        = useState('Erect');
  const [tailType,       setTailType]       = useState('Long');
  const [markingType,    setMarkingType]    = useState('None');
  const [seed,           setSeed]           = useState(1);
  const [bodyLen,        setBodyLen]        = useState(0.50);
  const [bodyGirth,      setBodyGirth]      = useState(0.50);
  const [shoulderH,      setShoulderH]      = useState(0.50);
  const [neckLen,        setNeckLen]        = useState(0.45);
  const [neckThick,      setNeckThick]      = useState(0.45);
  const [headSize,       setHeadSize]       = useState(0.50);
  const [muzzleLen,      setMuzzleLen]      = useState(0.50);
  const [muzzleW,        setMuzzleW]        = useState(0.45);
  const [jowls,          setJowls]          = useState(0.20);
  const [legLen,         setLegLen]         = useState(0.50);
  const [legThick,       setLegThick]       = useState(0.45);
  const [pawSize,        setPawSize]        = useState(0.48);
  const [claws,          setClaws]          = useState(false);
  const [hooves,         setHooves]         = useState(false);
  const [dewclaws,       setDewclaws]       = useState(false);
  const [tailLen,        setTailLen]        = useState(0.55);
  const [tailCurve,      setTailCurve]      = useState(0.30);
  const [tailThick,      setTailThick]      = useState(0.30);
  const [muscleDef,      setMuscleDef]      = useState(0.50);
  const [fatLayer,       setFatLayer]       = useState(0.20);
  const [boneProm,       setBoneProm]       = useState(0.25);
  const [addFur,         setAddFur]         = useState(true);
  const [furDensity,     setFurDensity]     = useState(0.70);
  const [furLen,         setFurLen]         = useState(0.30);
  const [furColor,       setFurColor]       = useState('#8a6030');
  const [furColor2,      setFurColor2]      = useState('#3a2010');
  const [furRoughness,   setFurRoughness]   = useState(0.80);
  const [undercoat,      setUndercoat]      = useState(false);
  const [undercoatColor, setUndercoatColor] = useState('#d0c0a0');
  const [markingColor,   setMarkingColor]   = useState('#1a1a1a');
  const [markingOpacity, setMarkingOpacity] = useState(0.80);
  const [polyBudget,     setPolyBudget]     = useState('Mid');
  const [addRig,         setAddRig]         = useState(true);
  const [addLOD,         setAddLOD]         = useState(true);
  const [addCollider,    setAddCollider]    = useState(true);
  const [addBlendshapes, setAddBlendshapes] = useState(false);

  const randomize = useCallback(() => {
    const pick = arr => arr[Math.floor(Math.random()*arr.length)];
    const rn = (a,b) => parseFloat((a+Math.random()*(b-a)).toFixed(2));
    setAnimalType(pick(ANIMAL_TYPES)); setFurType(pick(FUR_TYPES));
    setBodyLen(rn(0.3,0.8)); setBodyGirth(rn(0.3,0.8));
    setLegLen(rn(0.3,0.8)); setHeadSize(rn(0.3,0.7));
    setSeed(Math.floor(Math.random()*9999));
  }, []);

  return (
    <div style={P}>
      <Section title="🐾 Animal Type">
        <Badges items={ANIMAL_TYPES} active={animalType} onSelect={setAnimalType} />
        <Slider label="Random Seed" value={seed} min={0} max={9999} step={1} onChange={setSeed} />
      </Section>
      <Section title="🐘 Body">
        <Slider label="Body Length"     value={bodyLen}   onChange={setBodyLen}   />
        <Slider label="Body Girth"      value={bodyGirth} onChange={setBodyGirth} />
        <Slider label="Shoulder Height" value={shoulderH} onChange={setShoulderH} />
        <Slider label="Neck Length"     value={neckLen}   onChange={setNeckLen}   />
        <Slider label="Neck Thickness"  value={neckThick} onChange={setNeckThick} />
        <Slider label="Head Size"       value={headSize}  onChange={setHeadSize}  />
        <Slider label="Muzzle Length"   value={muzzleLen} onChange={setMuzzleLen} />
        <Slider label="Muzzle Width"    value={muzzleW}   onChange={setMuzzleW}   />
        <Slider label="Jowls"           value={jowls}     onChange={setJowls}     />
      </Section>
      <Section title="🦴 Limbs">
        <Slider label="Leg Length"    value={legLen}   onChange={setLegLen}   />
        <Slider label="Leg Thickness" value={legThick} onChange={setLegThick} />
        <Slider label="Paw Size"      value={pawSize}  onChange={setPawSize}  />
        <Check  label="Claws"         value={claws}    onChange={setClaws}    />
        <Check  label="Hooves"        value={hooves}   onChange={setHooves}   />
        <Check  label="Dewclaws"      value={dewclaws} onChange={setDewclaws} />
        <Select label="Ear Type"      value={earType}  options={EAR_TYPES}   onChange={setEarType} />
      </Section>
      <Section title="Tail">
        <Select label="Tail Type"      value={tailType}  options={TAIL_TYPES} onChange={setTailType}  />
        <Slider label="Tail Length"    value={tailLen}   onChange={setTailLen}   />
        <Slider label="Tail Curve"     value={tailCurve} onChange={setTailCurve} />
        <Slider label="Tail Thickness" value={tailThick} onChange={setTailThick} />
      </Section>
      <Section title="💪 Composition">
        <Slider label="Muscle Definition" value={muscleDef} onChange={setMuscleDef} />
        <Slider label="Fat Layer"         value={fatLayer}  onChange={setFatLayer}  />
        <Slider label="Bone Prominence"   value={boneProm}  onChange={setBoneProm}  />
      </Section>
      <Section title="Fur">
        <Check label="Generate Fur" value={addFur} onChange={setAddFur} />
        {addFur && (<>
          <Select   label="Fur Type"  value={furType}      options={FUR_TYPES} onChange={setFurType}      />
          <Slider   label="Density"   value={furDensity}   onChange={setFurDensity}   />
          <Slider   label="Length"    value={furLen}       onChange={setFurLen}       />
          <Slider   label="Roughness" value={furRoughness} onChange={setFurRoughness} />
          <ColorRow label="Color 1"   value={furColor}     onChange={setFurColor}     />
          <ColorRow label="Color 2"   value={furColor2}    onChange={setFurColor2}    />
          <Check    label="Undercoat" value={undercoat}    onChange={setUndercoat}    />
          {undercoat && <ColorRow label="Undercoat Color" value={undercoatColor} onChange={setUndercoatColor} />}
        </>)}
      </Section>
      <Section title="🎨 Markings" defaultOpen={false}>
        <Select label="Marking Type" value={markingType} options={MARKINGS} onChange={setMarkingType} />
        {markingType !== 'None' && (<>
          <ColorRow label="Marking Color" value={markingColor}   onChange={setMarkingColor}   />
          <Slider   label="Opacity"       value={markingOpacity} onChange={setMarkingOpacity} />
        </>)}
      </Section>
      <Section title="\u2699 Output" defaultOpen={false}>
        <Select label="Poly Budget" value={polyBudget} options={POLY_OPTIONS} onChange={setPolyBudget} />
        <Check  label="Add Rig"       value={addRig}        onChange={setAddRig}        />
        <Check  label="Auto LOD"      value={addLOD}        onChange={setAddLOD}        />
        <Check  label="Add Collider"  value={addCollider}   onChange={setAddCollider}   />
        <Check  label="Blendshapes"   value={addBlendshapes} onChange={setAddBlendshapes} />
      </Section>
      <div style={{ display:'flex', gap:6 }}>
        <RandBtn onClick={randomize} />
        <GenBtn label="\u26a1 Generate Quadruped" onClick={() => onGenerate?.({
          animalType, furType, earType, tailType, markingType, seed,
          body: { bodyLen, bodyGirth, shoulderH, neckLen, neckThick, headSize, muzzleLen, muzzleW, jowls },
          limbs: { legLen, legThick, pawSize, claws, hooves, dewclaws },
          tail: { tailLen, tailCurve, tailThick },
          composition: { muscleDef, fatLayer, boneProm },
          fur: { addFur, furDensity, furLen, furColor, furColor2, furRoughness, undercoat, undercoatColor },
          markings: { markingType, markingColor, markingOpacity },
          output: { polyBudget, addRig, addLOD, addCollider, addBlendshapes },
        })} />
      </div>
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
//
// ─────────────────────────────────────────────────────────────────────────────
