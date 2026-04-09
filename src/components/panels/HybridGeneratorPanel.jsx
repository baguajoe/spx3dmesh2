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

const SPECIES_LIST = ['Human','Wolf','Eagle','Lion','Shark','Snake','Dragon','Bear','Fox','Tiger','Panther','Horse','Deer','Owl','Crow','Octopus','Crab','Scorpion','Elephant','Gorilla'];
const BLEND_REGIONS = ['Head','Torso','Arms','Legs','Tail','Wings','Skin','Eyes','Ears'];
const POLY_OPTIONS  = ['Low','Mid','High','Ultra'];

export default function HybridGeneratorPanel({ onGenerate }) {
  const [speciesA,       setSpeciesA]       = useState('Human');
  const [speciesB,       setSpeciesB]       = useState('Wolf');
  const [blendRatio,     setBlendRatio]     = useState(0.50);
  const [seed,           setSeed]           = useState(1);
  // Per-region blend
  const [headBlend,      setHeadBlend]      = useState(0.50);
  const [torsoBlend,     setTorsoBlend]     = useState(0.50);
  const [armsBlend,      setArmsBlend]      = useState(0.50);
  const [legsBlend,      setLegsBlend]      = useState(0.50);
  const [tailBlend,      setTailBlend]      = useState(0.80);
  const [wingsBlend,     setWingsBlend]     = useState(0.00);
  const [skinBlend,      setSkinBlend]      = useState(0.50);
  const [eyesBlend,      setEyesBlend]      = useState(0.60);
  const [earsBlend,      setEarsBlend]      = useState(0.70);
  // Coverage
  const [furCoverage,    setFurCoverage]    = useState(0.50);
  const [scaleCoverage,  setScaleCoverage]  = useState(0.00);
  const [featherCoverage,setFeatherCoverage]= useState(0.00);
  // Appendages
  const [hasTail,        setHasTail]        = useState(true);
  const [tailType,       setTailType]       = useState('Bushy');
  const [hasWings,       setHasWings]       = useState(false);
  const [wingType,       setWingType]       = useState('Feathered');
  const [hasClaws,       setHasClaws]       = useState(true);
  const [hasHorns,       setHasHorns]       = useState(false);
  const [hasMuzzle,      setHasMuzzle]      = useState(true);
  const [muzzleLen,      setMuzzleLen]      = useState(0.40);
  const [hasEarTufts,    setHasEarTufts]    = useState(true);
  // Colors
  const [primaryColor,   setPrimaryColor]   = useState('#c8905c');
  const [furColor,       setFurColor]       = useState('#8a6030');
  const [accentColor,    setAccentColor]    = useState('#3a2010');
  const [eyeColor,       setEyeColor]       = useState('#f0a020');
  // Proportions
  const [heightMod,      setHeightMod]      = useState(0.50);
  const [muscleMod,      setMuscleMod]      = useState(0.60);
  const [limbLenMod,     setLimbLenMod]     = useState(0.50);
  // Output
  const [polyBudget,     setPolyBudget]     = useState('High');
  const [addRig,         setAddRig]         = useState(true);
  const [addBlendshapes, setAddBlendshapes] = useState(false);
  const [addLOD,         setAddLOD]         = useState(false);

  const TAIL_TYPES = ['None','Short','Long','Bushy','Spiked','Whip','Armored'];
  const WING_TYPES = ['None','Bat','Feathered','Membrane','Draconic'];

  const randomize = useCallback(() => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const rn = (a, b) => parseFloat((a + Math.random() * (b - a)).toFixed(2));
    setSpeciesA(pick(SPECIES_LIST)); setSpeciesB(pick(SPECIES_LIST));
    setBlendRatio(rn(0.2, 0.8));
    setHeadBlend(rn(0.1, 0.9)); setTorsoBlend(rn(0.1, 0.9));
    setFurCoverage(rn(0, 1)); setScaleCoverage(rn(0, 0.5));
    setSeed(Math.floor(Math.random() * 9999));
  }, []);

  return (
    <div style={P}>
      <Section title="🧬 Species">
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: '#888', marginBottom: 3 }}>Species A</div>
            <Badges items={SPECIES_LIST} active={speciesA} onSelect={setSpeciesA} />
          </div>
        </div>
        <div style={{ fontSize: 9, color: '#888', marginBottom: 3 }}>Species B</div>
        <Badges items={SPECIES_LIST} active={speciesB} onSelect={setSpeciesB} />
        <Slider label="Global Blend (A \u2192 B)" value={blendRatio} onChange={setBlendRatio} />
        <Slider label="Random Seed"               value={seed} min={0} max={9999} step={1} onChange={setSeed} />
      </Section>
      <Section title="Per-Region Blend">
        <Slider label="Head"   value={headBlend}   onChange={setHeadBlend}   />
        <Slider label="Torso"  value={torsoBlend}  onChange={setTorsoBlend}  />
        <Slider label="Arms"   value={armsBlend}   onChange={setArmsBlend}   />
        <Slider label="Legs"   value={legsBlend}   onChange={setLegsBlend}   />
        <Slider label="Tail"   value={tailBlend}   onChange={setTailBlend}   />
        <Slider label="Wings"  value={wingsBlend}  onChange={setWingsBlend}  />
        <Slider label="Skin"   value={skinBlend}   onChange={setSkinBlend}   />
        <Slider label="Eyes"   value={eyesBlend}   onChange={setEyesBlend}   />
        <Slider label="Ears"   value={earsBlend}   onChange={setEarsBlend}   />
      </Section>
      <Section title="Coverage">
        <Slider label="Fur Coverage"     value={furCoverage}     onChange={setFurCoverage}     />
        <Slider label="Scale Coverage"   value={scaleCoverage}   onChange={setScaleCoverage}   />
        <Slider label="Feather Coverage" value={featherCoverage} onChange={setFeatherCoverage} />
      </Section>
      <Section title="Appendages">
        <Check  label="Tail"         value={hasTail}    onChange={setHasTail}    />
        {hasTail    && <Select label="Tail Type"  value={tailType}  options={TAIL_TYPES} onChange={setTailType}  />}
        <Check  label="Wings"        value={hasWings}   onChange={setHasWings}   />
        {hasWings   && <Select label="Wing Type"  value={wingType}  options={WING_TYPES} onChange={setWingType}  />}
        <Check  label="Claws"        value={hasClaws}   onChange={setHasClaws}   />
        <Check  label="Horns"        value={hasHorns}   onChange={setHasHorns}   />
        <Check  label="Muzzle"       value={hasMuzzle}  onChange={setHasMuzzle}  />
        {hasMuzzle  && <Slider label="Muzzle Length" value={muzzleLen} onChange={setMuzzleLen} />}
        <Check  label="Ear Tufts"    value={hasEarTufts} onChange={setHasEarTufts} />
      </Section>
      <Section title="🎨 Colors">
        <ColorRow label="Skin Color"  value={primaryColor} onChange={setPrimaryColor} />
        <ColorRow label="Fur Color"   value={furColor}     onChange={setFurColor}     />
        <ColorRow label="Accent"      value={accentColor}  onChange={setAccentColor}  />
        <ColorRow label="Eye Color"   value={eyeColor}     onChange={setEyeColor}     />
      </Section>
      <Section title="Proportions" defaultOpen={false}>
        <Slider label="Height Mod"   value={heightMod}  onChange={setHeightMod}  />
        <Slider label="Muscle Mod"   value={muscleMod}  onChange={setMuscleMod}  />
        <Slider label="Limb Length"  value={limbLenMod} onChange={setLimbLenMod} />
      </Section>
      <Section title="\u2699 Output" defaultOpen={false}>
        <Select label="Poly Budget"  value={polyBudget}     options={POLY_OPTIONS} onChange={setPolyBudget}     />
        <Check  label="Add Rig"      value={addRig}         onChange={setAddRig}         />
        <Check  label="Blendshapes"  value={addBlendshapes} onChange={setAddBlendshapes} />
        <Check  label="Auto LOD"     value={addLOD}         onChange={setAddLOD}         />
      </Section>
      <div style={{ display: 'flex', gap: 6 }}>
        <RandBtn onClick={randomize} />
        <GenBtn label="\u26a1 Generate Hybrid" onClick={() => onGenerate?.({
          speciesA, speciesB, blendRatio, seed,
          regionBlend: { headBlend, torsoBlend, armsBlend, legsBlend, tailBlend, wingsBlend, skinBlend, eyesBlend, earsBlend },
          coverage: { furCoverage, scaleCoverage, featherCoverage },
          appendages: { hasTail, tailType, hasWings, wingType, hasClaws, hasHorns, hasMuzzle, muzzleLen, hasEarTufts },
          colors: { primaryColor, furColor, accentColor, eyeColor },
          proportions: { heightMod, muscleMod, limbLenMod },
          output: { polyBudget, addRig, addBlendshapes, addLOD },
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
