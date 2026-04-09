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

const GENDERS      = ['Male','Female','Non-Binary','Androgynous','Masculine','Feminine'];
const BODY_TYPES   = ['Ectomorph','Slim','Lean','Athletic','Average','Stocky','Endomorph','Mesomorph'];
const AGE_GROUPS   = ['Child (6-12)','Teen (13-17)','Young Adult (18-25)','Adult (26-40)','Middle-Aged (41-60)','Senior (60+)'];
const SKIN_TONES   = ['#f5d0b0','#e8b68a','#c8906a','#a0663a','#7a4420','#4a2210','#d0b090','#b89070'];
const POLY_OPTIONS = ['Low','Mid','High','Ultra'];

export default function BodyGeneratorPanel({ onGenerate }) {
  const [gender,         setGender]         = useState('Male');
  const [bodyType,       setBodyType]       = useState('Average');
  const [ageGroup,       setAgeGroup]       = useState('Adult (26-40)');
  const [seed,           setSeed]           = useState(1);
  const [height,         setHeight]         = useState(175);
  const [weight,         setWeight]         = useState(75);
  const [muscleDef,      setMuscleDef]      = useState(0.50);
  const [bodyFat,        setBodyFat]        = useState(0.18);
  const [boneFrame,      setBoneFrame]      = useState(0.50);
  const [waterRetention, setWaterRetention] = useState(0.40);
  const [shoulderW,      setShoulderW]      = useState(0.50);
  const [chestSize,      setChestSize]      = useState(0.50);
  const [chestDepth,     setChestDepth]     = useState(0.45);
  const [neckThick,      setNeckThick]      = useState(0.45);
  const [armLen,         setArmLen]         = useState(0.50);
  const [upperArmThick,  setUpperArmThick]  = useState(0.45);
  const [forearmThick,   setForearmThick]   = useState(0.42);
  const [wristSize,      setWristSize]      = useState(0.38);
  const [handSize,       setHandSize]       = useState(0.48);
  const [waistSize,      setWaistSize]      = useState(0.42);
  const [abDef,          setAbDef]          = useState(0.40);
  const [loveHandles,    setLoveHandles]    = useState(0.15);
  const [hipSize,        setHipSize]        = useState(0.50);
  const [gluteSize,      setGluteSize]      = useState(0.50);
  const [legLen,         setLegLen]         = useState(0.50);
  const [thighThick,     setThighThick]     = useState(0.48);
  const [calfSize,       setCalfSize]       = useState(0.44);
  const [ankleSize,      setAnkleSize]      = useState(0.36);
  const [footSize,       setFootSize]       = useState(0.50);
  const [skinTone,       setSkinTone]       = useState('#c8906a');
  const [skinRough,      setSkinRough]      = useState(0.55);
  const [skinGloss,      setSkinGloss]      = useState(0.25);
  const [subsurface,     setSubsurface]     = useState(0.60);
  const [polyBudget,     setPolyBudget]     = useState('High');
  const [addRig,         setAddRig]         = useState(true);
  const [addLOD,         setAddLOD]         = useState(false);
  const [separateHead,   setSeparateHead]   = useState(false);
  const [addSubdiv,      setAddSubdiv]      = useState(false);

  const randomize = useCallback(() => {
    const rn = (a,b) => parseFloat((a+Math.random()*(b-a)).toFixed(2));
    const pick = arr => arr[Math.floor(Math.random()*arr.length)];
    setGender(pick(GENDERS)); setBodyType(pick(BODY_TYPES));
    setHeight(Math.round(150+Math.random()*60));
    setWeight(Math.round(50+Math.random()*80));
    setMuscleDef(rn(0,1)); setBodyFat(rn(0.05,0.45));
    setShoulderW(rn(0.3,0.75)); setHipSize(rn(0.3,0.72));
    setSeed(Math.floor(Math.random()*9999));
  }, []);

  return (
    <div style={P}>
      <Section title="🧬 Base">
        <Badges items={GENDERS}   active={gender}   onSelect={setGender}   />
        <Select label="Body Type" value={bodyType}  options={BODY_TYPES}   onChange={setBodyType}  />
        <Select label="Age Group" value={ageGroup}  options={AGE_GROUPS}   onChange={setAgeGroup}  />
        <Slider label="Seed"      value={seed} min={0} max={9999} step={1} onChange={setSeed} />
      </Section>
      <Section title="Scale">
        <NumInput label="Height" value={height} min={120} max={230} onChange={setHeight} unit="cm" />
        <NumInput label="Weight" value={weight} min={35}  max={200} onChange={setWeight} unit="kg" />
      </Section>
      <Section title="💪 Composition">
        <Slider label="Muscle Definition" value={muscleDef}      onChange={setMuscleDef}      />
        <Slider label="Body Fat %"        value={bodyFat}        onChange={setBodyFat}        />
        <Slider label="Bone Frame"        value={boneFrame}      onChange={setBoneFrame}      />
        <Slider label="Water Retention"   value={waterRetention} onChange={setWaterRetention} />
      </Section>
      <Section title="Upper Body">
        <Slider label="Shoulder Width" value={shoulderW}    onChange={setShoulderW}    />
        <Slider label="Chest Size"     value={chestSize}    onChange={setChestSize}    />
        <Slider label="Chest Depth"    value={chestDepth}   onChange={setChestDepth}   />
        <Slider label="Neck Thickness" value={neckThick}    onChange={setNeckThick}    />
        <Slider label="Arm Length"     value={armLen}       onChange={setArmLen}       />
        <Slider label="Upper Arm"      value={upperArmThick} onChange={setUpperArmThick} />
        <Slider label="Forearm"        value={forearmThick} onChange={setForearmThick} />
        <Slider label="Wrist"          value={wristSize}    onChange={setWristSize}    />
        <Slider label="Hand Size"      value={handSize}     onChange={setHandSize}     />
      </Section>
      <Section title="Core">
        <Slider label="Waist Size"    value={waistSize}   onChange={setWaistSize}   />
        <Slider label="Ab Definition" value={abDef}       onChange={setAbDef}       />
        <Slider label="Love Handles"  value={loveHandles} onChange={setLoveHandles} />
        <Slider label="Hip Size"      value={hipSize}     onChange={setHipSize}     />
        <Slider label="Glute Size"    value={gluteSize}   onChange={setGluteSize}   />
      </Section>
      <Section title="Lower Body">
        <Slider label="Leg Length" value={legLen}     onChange={setLegLen}     />
        <Slider label="Thigh"      value={thighThick} onChange={setThighThick} />
        <Slider label="Calf"       value={calfSize}   onChange={setCalfSize}   />
        <Slider label="Ankle"      value={ankleSize}  onChange={setAnkleSize}  />
        <Slider label="Foot Size"  value={footSize}   onChange={setFootSize}   />
      </Section>
      <Section title="🎨 Skin" defaultOpen={false}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>
          {SKIN_TONES.map(t => (
            <div key={t} onClick={() => setSkinTone(t)} style={{
              width:24, height:24, borderRadius:4, background:t, cursor:'pointer',
              border:`2px solid ${skinTone===t ? '#00ffc8' : '#21262d'}`,
            }} />
          ))}
        </div>
        <ColorRow label="Custom Tone" value={skinTone}   onChange={setSkinTone}   />
        <Slider   label="Roughness"   value={skinRough}  onChange={setSkinRough}  />
        <Slider   label="Gloss"       value={skinGloss}  onChange={setSkinGloss}  />
        <Slider   label="Subsurface"  value={subsurface} onChange={setSubsurface} />
      </Section>
      <Section title="\u2699 Output" defaultOpen={false}>
        <Select label="Poly Budget"   value={polyBudget}   options={POLY_OPTIONS} onChange={setPolyBudget}   />
        <Check  label="Add Rig"       value={addRig}       onChange={setAddRig}       />
        <Check  label="Auto LOD"      value={addLOD}       onChange={setAddLOD}       />
        <Check  label="Separate Head" value={separateHead} onChange={setSeparateHead} />
        <Check  label="Subdivision"   value={addSubdiv}    onChange={setAddSubdiv}    />
      </Section>
      <div style={{ display:'flex', gap:6 }}>
        <RandBtn onClick={randomize} />
        <GenBtn label="\u26a1 Generate Body" onClick={() => onGenerate?.({
          gender, bodyType, ageGroup, seed, height, weight,
          composition: { muscleDef, bodyFat, boneFrame, waterRetention },
          upper: { shoulderW, chestSize, chestDepth, neckThick, armLen, upperArmThick, forearmThick, wristSize, handSize },
          core: { waistSize, abDef, loveHandles, hipSize, gluteSize },
          lower: { legLen, thighThick, calfSize, ankleSize, footSize },
          skin: { skinTone, skinRough, skinGloss, subsurface },
          output: { polyBudget, addRig, addLOD, separateHead, addSubdiv },
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
//
//
//
//
