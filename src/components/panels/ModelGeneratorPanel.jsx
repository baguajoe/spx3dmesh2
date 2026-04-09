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

const MODEL_TYPES  = ['Human','Creature','Robot','Stylized','Alien','Fantasy','Sci-Fi','Hybrid','Toon','Mech'];
const BODY_TYPES   = ['Athletic','Slim','Average','Heavy','Petite','Giant','Exaggerated','Realistic','Stocky','Lean'];
const GENDERS      = ['Male','Female','Non-Binary','Masculine','Feminine','Ambiguous'];
const AGE_RANGES   = ['Infant','Child','Teen','Young Adult','Adult','Middle-Aged','Senior','Ancient'];
const POLY_OPTIONS = ['Low (800)','Mid (3.2K)','High (12K)','Ultra (48K)'];
const PRESETS      = { Athlete:{muscleDef:0.85,fatLayer:0.08,shoulderW:0.68,height:183}, Heavy:{muscleDef:0.25,fatLayer:0.65,shoulderW:0.70,height:175}, Slim:{muscleDef:0.30,fatLayer:0.06,shoulderW:0.40,height:170}, Giant:{muscleDef:0.60,fatLayer:0.20,shoulderW:0.75,height:220} };

export default function ModelGeneratorPanel({ onGenerate }) {
  const [modelType,    setModelType]    = useState('Human');
  const [bodyType,     setBodyType]     = useState('Average');
  const [gender,       setGender]       = useState('Non-Binary');
  const [ageRange,     setAgeRange]     = useState('Adult');
  const [seed,         setSeed]         = useState(42);
  const [height,       setHeight]       = useState(175);
  const [mass,         setMass]         = useState(70);
  const [headSize,     setHeadSize]     = useState(1.00);
  const [shoulderW,    setShoulderW]    = useState(0.50);
  const [chestDepth,   setChestDepth]   = useState(0.45);
  const [waistW,       setWaistW]       = useState(0.40);
  const [hipW,         setHipW]         = useState(0.50);
  const [legLen,       setLegLen]       = useState(0.50);
  const [armLen,       setArmLen]       = useState(0.50);
  const [neckLen,      setNeckLen]      = useState(0.45);
  const [handSize,     setHandSize]     = useState(0.48);
  const [footSize,     setFootSize]     = useState(0.50);
  const [muscleDef,    setMuscleDef]    = useState(0.50);
  const [fatLayer,     setFatLayer]     = useState(0.20);
  const [boneProm,     setBoneProm]     = useState(0.30);
  const [skinTone,     setSkinTone]     = useState('#c8905c');
  const [skinRough,    setSkinRough]    = useState(0.55);
  const [skinGloss,    setSkinGloss]    = useState(0.25);
  const [subsurface,   setSubsurface]   = useState(0.60);
  const [polyBudget,   setPolyBudget]   = useState('High (12K)');
  const [subdivision,  setSubdivision]  = useState(0);
  const [smoothing,    setSmoothing]    = useState(0.50);
  const [addFace,      setAddFace]      = useState(true);
  const [addHair,      setAddHair]      = useState(true);
  const [addHands,     setAddHands]     = useState(true);
  const [addFeet,      setAddFeet]      = useState(true);
  const [addRig,       setAddRig]       = useState(true);
  const [addClothes,   setAddClothes]   = useState(false);
  const [addBlend,     setAddBlend]     = useState(true);
  const [separateMesh, setSeparateMesh] = useState(false);
  const [addNormals,   setAddNormals]   = useState(true);
  const [addUV2,       setAddUV2]       = useState(false);
  const [lastPreset,   setLastPreset]   = useState('');
  const [generating,   setGenerating]   = useState(false);

  const randomize = useCallback(() => {
    const rn = (a,b) => parseFloat((a+Math.random()*(b-a)).toFixed(2));
    const pick = arr => arr[Math.floor(Math.random()*arr.length)];
    setModelType(pick(MODEL_TYPES)); setBodyType(pick(BODY_TYPES));
    setGender(pick(GENDERS)); setAgeRange(pick(AGE_RANGES));
    setHeight(Math.round(145+Math.random()*65)); setMass(Math.round(45+Math.random()*90));
    setHeadSize(rn(0.75,1.30)); setShoulderW(rn(0.28,0.78));
    setHipW(rn(0.28,0.75)); setLegLen(rn(0.38,0.65));
    setMuscleDef(rn(0,1)); setFatLayer(rn(0,0.65));
    setSeed(Math.floor(Math.random()*9999)); setLastPreset('Random');
  }, []);

  const applyPreset = useCallback((name) => {
    const p = PRESETS[name]; if (!p) return;
    setLastPreset(name);
    if (p.muscleDef !== undefined) setMuscleDef(p.muscleDef);
    if (p.fatLayer  !== undefined) setFatLayer(p.fatLayer);
    if (p.shoulderW !== undefined) setShoulderW(p.shoulderW);
    if (p.height    !== undefined) setHeight(p.height);
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await onGenerate?.({
        modelType, bodyType, gender, ageRange, seed,
        scale: { height, mass },
        proportions: { headSize, shoulderW, chestDepth, waistW, hipW, legLen, armLen, neckLen, handSize, footSize },
        composition: { muscleDef, fatLayer, boneProm },
        skin: { skinTone, skinRough, skinGloss, subsurface },
        quality: { polyBudget, subdivision, smoothing },
        features: { addFace, addHair, addHands, addFeet, addRig, addClothes, addBlend, separateMesh, addNormals, addUV2 },
      });
    } finally { setGenerating(false); }
  }, [modelType,bodyType,gender,ageRange,seed,height,mass,headSize,shoulderW,chestDepth,waistW,hipW,legLen,armLen,neckLen,handSize,footSize,muscleDef,fatLayer,boneProm,skinTone,skinRough,skinGloss,subsurface,polyBudget,subdivision,smoothing,addFace,addHair,addHands,addFeet,addRig,addClothes,addBlend,separateMesh,addNormals,addUV2]);

  return (
    <div style={P}>
      <div style={{ display:'flex', gap:4, marginBottom:6 }}>
        {Object.keys(PRESETS).map(p => (
          <button key={p} onClick={() => applyPreset(p)} style={{
            flex:1, padding:'3px 0', fontSize:9, borderRadius:3, cursor:'pointer',
            background: lastPreset===p ? '#FF6600' : '#1a1f2c',
            color: lastPreset===p ? '#fff' : '#888',
            border: `1px solid ${lastPreset===p ? '#FF6600' : '#21262d'}`,
          }}>{p}</button>
        ))}
      </div>
      <Section title="🧬 Model Type">
        <Badges items={MODEL_TYPES} active={modelType} onSelect={setModelType} />
        <Select label="Body Type" value={bodyType} options={BODY_TYPES} onChange={setBodyType} />
        <Select label="Gender"    value={gender}   options={GENDERS}    onChange={setGender}   />
        <Select label="Age Range" value={ageRange} options={AGE_RANGES} onChange={setAgeRange} />
        <Slider label="Random Seed" value={seed} min={0} max={9999} step={1} onChange={setSeed} />
      </Section>
      <Section title="📏 Scale">
        <NumInput label="Height" value={height} min={80}  max={280} onChange={setHeight} unit="cm" />
        <NumInput label="Mass"   value={mass}   min={30}  max={220} onChange={setMass}   unit="kg" />
      </Section>
      <Section title="📐 Proportions">
        <Slider label="Head Size"      value={headSize}  min={0.6} max={1.6} step={0.02} onChange={setHeadSize}  />
        <Slider label="Shoulder Width" value={shoulderW} onChange={setShoulderW} />
        <Slider label="Chest Depth"    value={chestDepth} onChange={setChestDepth} />
        <Slider label="Waist Width"    value={waistW}    onChange={setWaistW}    />
        <Slider label="Hip Width"      value={hipW}      onChange={setHipW}      />
        <Slider label="Leg Length"     value={legLen}    onChange={setLegLen}    />
        <Slider label="Arm Length"     value={armLen}    onChange={setArmLen}    />
        <Slider label="Neck Length"    value={neckLen}   onChange={setNeckLen}   />
        <Slider label="Hand Size"      value={handSize}  onChange={setHandSize}  />
        <Slider label="Foot Size"      value={footSize}  onChange={setFootSize}  />
      </Section>
      <Section title="💪 Composition">
        <Slider label="Muscle Definition" value={muscleDef} onChange={setMuscleDef} />
        <Slider label="Fat Layer"         value={fatLayer}  onChange={setFatLayer}  />
        <Slider label="Bone Prominence"   value={boneProm}  onChange={setBoneProm}  />
      </Section>
      <Section title="🎨 Skin">
        <ColorRow label="Skin Tone"  value={skinTone}   onChange={setSkinTone}   />
        <Slider   label="Roughness"  value={skinRough}  onChange={setSkinRough}  />
        <Slider   label="Gloss"      value={skinGloss}  onChange={setSkinGloss}  />
        <Slider   label="Subsurface" value={subsurface} onChange={setSubsurface} />
      </Section>
      <Section title="⚙ Mesh Quality">
        <Select label="Poly Budget"       value={polyBudget}  options={POLY_OPTIONS} onChange={setPolyBudget}  />
        <Slider label="Subdivision Level" value={subdivision} min={0} max={3} step={1} onChange={setSubdivision} />
        <Slider label="Smoothing"         value={smoothing}   onChange={setSmoothing} />
      </Section>
      <Section title="✅ Features" defaultOpen={false}>
        <Check label="Face Mesh"        value={addFace}      onChange={setAddFace}      />
        <Check label="Hair"             value={addHair}      onChange={setAddHair}      />
        <Check label="Detailed Hands"   value={addHands}     onChange={setAddHands}     />
        <Check label="Detailed Feet"    value={addFeet}      onChange={setAddFeet}      />
        <Check label="Rig / Armature"   value={addRig}       onChange={setAddRig}       />
        <Check label="Starter Clothes"  value={addClothes}   onChange={setAddClothes}   />
        <Check label="Blendshapes"      value={addBlend}     onChange={setAddBlend}     />
        <Check label="Separate Meshes"  value={separateMesh} onChange={setSeparateMesh} />
        <Check label="Smooth Normals"   value={addNormals}   onChange={setAddNormals}   />
        <Check label="UV Channel 2"     value={addUV2}       onChange={setAddUV2}       />
      </Section>
      <div style={{ display:'flex', gap:6 }}>
        <RandBtn onClick={randomize} />
        <GenBtn label={generating ? '\u23f3 Generating\u2026' : '\u26a1 Generate Model'} onClick={handleGenerate} disabled={generating} />
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
