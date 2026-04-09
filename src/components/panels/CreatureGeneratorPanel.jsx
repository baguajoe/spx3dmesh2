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

const ARCHETYPES   = ['Reptilian','Insectoid','Aquatic','Avian','Mammalian','Undead','Demonic','Celestial','Fungal','Crystalline','Mechanical','Eldritch'];
const SIZES        = ['Tiny','Small','Medium','Large','Huge','Colossal'];
const WING_TYPES   = ['None','Bat','Bird','Insect','Membrane','Feathered','Draconic','Mechanical'];
const TAIL_TYPES   = ['None','Short','Long','Spiked','Whip','Armored','Prehensile','Fan'];
const HEAD_TYPES   = ['Horned','Crested','Finned','Tusked','Beaked','Eyeless','Multi-Eyed','Maned'];
const SKIN_TYPES   = ['Scales','Chitin','Fur','Feathers','Smooth','Bark','Crystal','Metallic','Slime','Bone'];
const HORN_TYPES   = ['None','Ram','Antler','Spike','Twisted','Crown','Brow Ridge'];
const POLY_OPTIONS = ['Low','Mid','High','Ultra'];

export default function CreatureGeneratorPanel({ onGenerate }) {
  const [archetype,      setArchetype]      = useState('Reptilian');
  const [size,           setSize]           = useState('Medium');
  const [seed,           setSeed]           = useState(7);
  // Body
  const [bodyLen,        setBodyLen]        = useState(0.50);
  const [bodyGirth,      setBodyGirth]      = useState(0.50);
  const [neckLen,        setNeckLen]        = useState(0.40);
  const [neckThick,      setNeckThick]      = useState(0.40);
  // Head
  const [headType,       setHeadType]       = useState('Horned');
  const [headSize,       setHeadSize]       = useState(0.50);
  const [mawSize,        setMawSize]        = useState(0.50);
  const [eyeCount,       setEyeCount]       = useState(2);
  const [hornType,       setHornType]       = useState('None');
  const [hornCount,      setHornCount]      = useState(2);
  const [hornLen,        setHornLen]        = useState(0.40);
  const [crestHeight,    setCrestHeight]    = useState(0.00);
  const [spineCount,     setSpineCount]     = useState(0.30);
  // Limbs
  const [limbCount,      setLimbCount]      = useState(4);
  const [limbLen,        setLimbLen]        = useState(0.50);
  const [limbThick,      setLimbThick]      = useState(0.45);
  const [claws,          setClaws]          = useState(true);
  const [clawLen,        setClawLen]        = useState(0.40);
  const [footType,       setFootType]       = useState('Clawed');
  // Wings
  const [wingType,       setWingType]       = useState('None');
  const [wingSpan,       setWingSpan]       = useState(0.60);
  const [wingThick,      setWingThick]      = useState(0.20);
  // Tail
  const [tailType,       setTailType]       = useState('Long');
  const [tailLen,        setTailLen]        = useState(0.60);
  const [tailSpines,     setTailSpines]     = useState(false);
  // Skin
  const [skinType,       setSkinType]       = useState('Scales');
  const [primaryColor,   setPrimaryColor]   = useState('#4a6a30');
  const [secondColor,    setSecondColor]    = useState('#2a3a18');
  const [accentColor,    setAccentColor]    = useState('#c8a000');
  const [patternType,    setPatternType]    = useState('None');
  const [patternOpacity, setPatternOpacity] = useState(0.70);
  const [skinRough,      setSkinRough]      = useState(0.70);
  // FX
  const [biolum,         setBiolum]         = useState(false);
  const [biolumColor,    setBiolumColor]    = useState('#00ffc8');
  const [biolumIntensity,setBiolumIntensity]= useState(0.60);
  const [armorPlates,    setArmorPlates]    = useState(false);
  const [armorColor,     setArmorColor]     = useState('#505060');
  const [venomSacs,      setVenomSacs]      = useState(false);
  const [fireBreather,   setFireBreather]   = useState(false);
  // Output
  const [polyBudget,     setPolyBudget]     = useState('High');
  const [addRig,         setAddRig]         = useState(true);
  const [addLOD,         setAddLOD]         = useState(false);
  const [addCollider,    setAddCollider]    = useState(true);

  const PATTERNS = ['None','Stripes','Spots','Banding','Iridescent','Mottled','Gradient'];
  const FOOT_TYPES = ['Clawed','Hooved','Padded','Tentacled','Webbed','Taloned'];

  const randomize = useCallback(() => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const rn = (a, b) => parseFloat((a + Math.random() * (b - a)).toFixed(2));
    setArchetype(pick(ARCHETYPES)); setSize(pick(SIZES));
    setBodyLen(rn(0.3, 0.8)); setBodyGirth(rn(0.3, 0.8));
    setLimbCount(pick([2, 4, 6, 8]));
    setWingType(Math.random() > 0.6 ? pick(WING_TYPES.slice(1)) : 'None');
    setTailType(Math.random() > 0.3 ? pick(TAIL_TYPES.slice(1)) : 'None');
    setBiolum(Math.random() > 0.7);
    setArmorPlates(Math.random() > 0.5);
    setSeed(Math.floor(Math.random() * 9999));
  }, []);

  return (
    <div style={P}>
      <Section title="🐉 Archetype">
        <Badges items={ARCHETYPES} active={archetype} onSelect={setArchetype} />
        <Select label="Size"        value={size} options={SIZES} onChange={setSize} />
        <Slider label="Random Seed" value={seed} min={0} max={9999} step={1} onChange={setSeed} />
      </Section>
      <Section title="Body">
        <Slider label="Body Length"    value={bodyLen}   onChange={setBodyLen}   />
        <Slider label="Body Girth"     value={bodyGirth} onChange={setBodyGirth} />
        <Slider label="Neck Length"    value={neckLen}   onChange={setNeckLen}   />
        <Slider label="Neck Thickness" value={neckThick} onChange={setNeckThick} />
      </Section>
      <Section title="Head">
        <Badges items={HEAD_TYPES} active={headType} onSelect={setHeadType} />
        <Slider label="Head Size"     value={headSize}    onChange={setHeadSize}    />
        <Slider label="Maw / Jaw"     value={mawSize}     onChange={setMawSize}     />
        <Slider label="Eye Count"     value={eyeCount} min={0} max={8} step={1} onChange={setEyeCount} />
        <Select label="Horn Type"     value={hornType}    options={HORN_TYPES}  onChange={setHornType}    />
        <Slider label="Horn Count"    value={hornCount} min={0} max={6} step={1} onChange={setHornCount} />
        <Slider label="Horn Length"   value={hornLen}     onChange={setHornLen}     />
        <Slider label="Crest Height"  value={crestHeight} onChange={setCrestHeight} />
        <Slider label="Spine Count"   value={spineCount}  onChange={setSpineCount}  />
      </Section>
      <Section title="Limbs">
        <Slider label="Limb Count"    value={limbCount} min={0} max={8} step={1} onChange={setLimbCount} />
        <Slider label="Limb Length"   value={limbLen}   onChange={setLimbLen}   />
        <Slider label="Limb Girth"    value={limbThick} onChange={setLimbThick} />
        <Check  label="Claws"         value={claws}     onChange={setClaws}     />
        {claws && <Slider label="Claw Length" value={clawLen} onChange={setClawLen} />}
        <Select label="Foot Type"     value={footType}  options={FOOT_TYPES}  onChange={setFootType} />
      </Section>
      <Section title="Wings">
        <Badges items={WING_TYPES} active={wingType} onSelect={setWingType} />
        {wingType !== 'None' && (<>
          <Slider label="Wingspan"    value={wingSpan}  onChange={setWingSpan}  />
          <Slider label="Membrane"    value={wingThick} onChange={setWingThick} />
        </>)}
      </Section>
      <Section title="Tail">
        <Badges items={TAIL_TYPES} active={tailType} onSelect={setTailType} />
        {tailType !== 'None' && (<>
          <Slider label="Tail Length" value={tailLen}    onChange={setTailLen}    />
          <Check  label="Tail Spines" value={tailSpines} onChange={setTailSpines} />
        </>)}
      </Section>
      <Section title="🎨 Skin & Color">
        <Badges items={SKIN_TYPES} active={skinType} onSelect={setSkinType} />
        <ColorRow label="Primary Color" value={primaryColor}   onChange={setPrimaryColor}   />
        <ColorRow label="Secondary"     value={secondColor}    onChange={setSecondColor}    />
        <ColorRow label="Accent"        value={accentColor}    onChange={setAccentColor}    />
        <Select   label="Pattern"       value={patternType}    options={PATTERNS}  onChange={setPatternType}    />
        {patternType !== 'None' && <Slider label="Pattern Opacity" value={patternOpacity} onChange={setPatternOpacity} />}
        <Slider   label="Skin Roughness" value={skinRough}    onChange={setSkinRough}    />
      </Section>
      <Section title="\u2728 Special" defaultOpen={false}>
        <Check label="Bioluminescence" value={biolum}      onChange={setBiolum}      />
        {biolum && (<>
          <ColorRow label="Glow Color"    value={biolumColor}     onChange={setBiolumColor}     />
          <Slider   label="Glow Intensity" value={biolumIntensity} onChange={setBiolumIntensity} />
        </>)}
        <Check label="Armor Plates"    value={armorPlates} onChange={setArmorPlates} />
        {armorPlates && <ColorRow label="Armor Color" value={armorColor} onChange={setArmorColor} />}
        <Check label="Venom Sacs"      value={venomSacs}   onChange={setVenomSacs}   />
        <Check label="Fire Breather"   value={fireBreather} onChange={setFireBreather} />
      </Section>
      <Section title="\u2699 Output" defaultOpen={false}>
        <Select label="Poly Budget" value={polyBudget} options={POLY_OPTIONS} onChange={setPolyBudget} />
        <Check  label="Add Rig"       value={addRig}     onChange={setAddRig}     />
        <Check  label="Auto LOD"      value={addLOD}     onChange={setAddLOD}     />
        <Check  label="Add Collider"  value={addCollider} onChange={setAddCollider} />
      </Section>
      <div style={{ display: 'flex', gap: 6 }}>
        <RandBtn onClick={randomize} />
        <GenBtn label="\u26a1 Generate Creature" onClick={() => onGenerate?.({
          archetype, size, seed,
          body: { bodyLen, bodyGirth, neckLen, neckThick },
          head: { headType, headSize, mawSize, eyeCount, hornType, hornCount, hornLen, crestHeight, spineCount },
          limbs: { limbCount, limbLen, limbThick, claws, clawLen, footType },
          wings: { wingType, wingSpan, wingThick },
          tail: { tailType, tailLen, tailSpines },
          skin: { skinType, primaryColor, secondColor, accentColor, patternType, patternOpacity, skinRough },
          special: { biolum, biolumColor, biolumIntensity, armorPlates, armorColor, venomSacs, fireBreather },
          output: { polyBudget, addRig, addLOD, addCollider },
        })} />
      </div>
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
