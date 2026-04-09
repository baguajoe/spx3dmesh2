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

const TEETH_TYPES  = ['Human Adult','Human Child','Vampire','Animal Canine','Animal Herbivore','Shark','Snake Fang','Robot','Cartoon','Zombie','Alien'];
const GUM_SHAPES   = ['Normal','Receding','Inflamed','Healthy','Asymmetric','Exposed Root'];
const POLY_OPTIONS = ['Low','Mid','High','Ultra'];

export default function TeethGeneratorPanel({ onGenerate }) {
  const [teethType,     setTeethType]     = useState('Human Adult');
  const [seed,          setSeed]          = useState(1);
  const [incisorCount,  setIncisorCount]  = useState(4);
  const [canineCount,   setCanineCount]   = useState(2);
  const [premolarCount, setPremolarCount] = useState(4);
  const [molarCount,    setMolarCount]    = useState(6);
  const [showLower,     setShowLower]     = useState(true);
  const [showWisdom,    setShowWisdom]    = useState(false);
  const [toothSize,     setToothSize]     = useState(0.50);
  const [toothWidth,    setToothWidth]    = useState(0.50);
  const [toothHeight,   setToothHeight]   = useState(0.50);
  const [incisorEdge,   setIncisorEdge]   = useState(0.50);
  const [canineLen,     setCanineLen]     = useState(0.55);
  const [spacing,       setSpacing]       = useState(0.50);
  const [alignment,     setAlignment]     = useState(0.85);
  const [overbite,      setOverbite]      = useState(0.20);
  const [crowding,      setCrowding]      = useState(0.00);
  const [toothRotation, setToothRotation] = useState(0.00);
  const [enamelColor,   setEnamelColor]   = useState('#f5f0e0');
  const [enamelRough,   setEnamelRough]   = useState(0.20);
  const [enamelGloss,   setEnamelGloss]   = useState(0.75);
  const [translucency,  setTranslucency]  = useState(0.30);
  const [subsurface,    setSubsurface]    = useState(0.25);
  const [stainLevel,    setStainLevel]    = useState(0.05);
  const [stainColor,    setStainColor]    = useState('#c8b870');
  const [wearLevel,     setWearLevel]     = useState(0.10);
  const [crackDetail,   setCrackDetail]   = useState(0.00);
  const [chipDetail,    setChipDetail]    = useState(0.00);
  const [tartarLevel,   setTartarLevel]   = useState(0.00);
  const [addGums,       setAddGums]       = useState(true);
  const [gumShape,      setGumShape]      = useState('Normal');
  const [gumColor,      setGumColor]      = useState('#c86070');
  const [gumRecession,  setGumRecession]  = useState(0.10);
  const [gumInflam,     setGumInflam]     = useState(0.00);
  const [addBraces,     setAddBraces]     = useState(false);
  const [bracesColor,   setBracesColor]   = useState('#aaaaaa');
  const [addFillings,   setAddFillings]   = useState(false);
  const [fillingsColor, setFillingsColor] = useState('#d0c8a0');
  const [addCrowns,     setAddCrowns]     = useState(false);
  const [addImplants,   setAddImplants]   = useState(false);
  const [addRoots,      setAddRoots]      = useState(false);
  const [polyBudget,    setPolyBudget]    = useState('Mid');
  const [separateMesh,  setSeparateMesh]  = useState(false);

  return (
    <div style={P}>
      <Section title="🦷 Teeth Type">
        <Badges items={TEETH_TYPES} active={teethType} onSelect={setTeethType} />
        <Slider label="Random Seed" value={seed} min={0} max={9999} step={1} onChange={setSeed} />
      </Section>
      <Section title="Count & Layout">
        <Slider label="Incisors"  value={incisorCount}  min={0} max={8}  step={1} onChange={setIncisorCount}  />
        <Slider label="Canines"   value={canineCount}   min={0} max={4}  step={1} onChange={setCanineCount}   />
        <Slider label="Premolars" value={premolarCount} min={0} max={8}  step={1} onChange={setPremolarCount} />
        <Slider label="Molars"    value={molarCount}    min={0} max={12} step={1} onChange={setMolarCount}    />
        <Check  label="Include Lower Jaw" value={showLower}  onChange={setShowLower}  />
        <Check  label="Wisdom Teeth"      value={showWisdom} onChange={setShowWisdom} />
      </Section>
      <Section title="Size & Shape">
        <Slider label="Overall Size"  value={toothSize}     onChange={setToothSize}     />
        <Slider label="Width"         value={toothWidth}    onChange={setToothWidth}    />
        <Slider label="Height"        value={toothHeight}   onChange={setToothHeight}   />
        <Slider label="Incisor Edge"  value={incisorEdge}   onChange={setIncisorEdge}   />
        <Slider label="Canine Length" value={canineLen}     onChange={setCanineLen}     />
        <Slider label="Spacing"       value={spacing}       onChange={setSpacing}       />
        <Slider label="Alignment"     value={alignment}     onChange={setAlignment}     />
        <Slider label="Overbite"      value={overbite}      onChange={setOverbite}      />
        <Slider label="Crowding"      value={crowding}      onChange={setCrowding}      />
        <Slider label="Rotation"      value={toothRotation} onChange={setToothRotation} />
      </Section>
      <Section title="\u2728 Enamel">
        <ColorRow label="Enamel Color" value={enamelColor}  onChange={setEnamelColor}  />
        <Slider   label="Roughness"    value={enamelRough}  onChange={setEnamelRough}  />
        <Slider   label="Gloss"        value={enamelGloss}  onChange={setEnamelGloss}  />
        <Slider   label="Translucency" value={translucency} onChange={setTranslucency} />
        <Slider   label="Subsurface"   value={subsurface}   onChange={setSubsurface}   />
      </Section>
      <Section title="Stain & Wear" defaultOpen={false}>
        <Slider   label="Stain Level"  value={stainLevel}  onChange={setStainLevel}  />
        {stainLevel > 0 && <ColorRow label="Stain Color" value={stainColor} onChange={setStainColor} />}
        <Slider   label="Wear"         value={wearLevel}   onChange={setWearLevel}   />
        <Slider   label="Cracks"       value={crackDetail} onChange={setCrackDetail} />
        <Slider   label="Chips"        value={chipDetail}  onChange={setChipDetail}  />
        <Slider   label="Tartar"       value={tartarLevel} onChange={setTartarLevel} />
      </Section>
      <Section title="Gums" defaultOpen={false}>
        <Check    label="Include Gums" value={addGums} onChange={setAddGums} />
        {addGums && (<>
          <Select   label="Gum Shape"    value={gumShape}     options={GUM_SHAPES} onChange={setGumShape}     />
          <ColorRow label="Gum Color"    value={gumColor}     onChange={setGumColor}     />
          <Slider   label="Recession"    value={gumRecession} onChange={setGumRecession} />
          <Slider   label="Inflammation" value={gumInflam}    onChange={setGumInflam}    />
        </>)}
      </Section>
      <Section title="Dental Work" defaultOpen={false}>
        <Check label="Braces"   value={addBraces}   onChange={setAddBraces}   />
        {addBraces   && <ColorRow label="Braces Color"  value={bracesColor}   onChange={setBracesColor}   />}
        <Check label="Fillings" value={addFillings} onChange={setAddFillings} />
        {addFillings && <ColorRow label="Filling Color" value={fillingsColor} onChange={setFillingsColor} />}
        <Check label="Crowns"   value={addCrowns}   onChange={setAddCrowns}   />
        <Check label="Implants" value={addImplants} onChange={setAddImplants} />
        <Check label="Show Roots" value={addRoots}  onChange={setAddRoots}    />
      </Section>
      <Section title="\u2699 Output" defaultOpen={false}>
        <Select label="Poly Budget"    value={polyBudget}  options={POLY_OPTIONS} onChange={setPolyBudget}  />
        <Check  label="Separate Mesh" value={separateMesh} onChange={setSeparateMesh} />
      </Section>
      <GenBtn label="\u26a1 Generate Teeth" onClick={() => onGenerate?.({
        teethType, seed,
        count: { incisorCount, canineCount, premolarCount, molarCount, showLower, showWisdom },
        shape: { toothSize, toothWidth, toothHeight, incisorEdge, canineLen, spacing, alignment, overbite, crowding, toothRotation },
        enamel: { enamelColor, enamelRough, enamelGloss, translucency, subsurface },
        wear: { stainLevel, stainColor, wearLevel, crackDetail, chipDetail, tartarLevel },
        gums: { addGums, gumShape, gumColor, gumRecession, gumInflam },
        dental: { addBraces, bracesColor, addFillings, fillingsColor, addCrowns, addImplants, addRoots },
        output: { polyBudget, separateMesh },
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
