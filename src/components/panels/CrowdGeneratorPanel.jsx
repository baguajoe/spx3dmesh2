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

const ANIM_STATES   = ['Idle','Walk','Run','Cheer','Talk','Sit','Stand','Fight','Dance','Pray','Work'];
const LOD_PROFILES  = ['Aggressive','Balanced','Quality','Custom'];
const FORMATION     = ['Random','Grid','Circle','Line','Cluster','Wave'];
const CROWD_STYLES  = ['Generic','Medieval','Modern','Sci-Fi','Fantasy','Military','Sports','Zombie','Ritual'];
const POLY_OPTIONS  = ['Low','Mid','High'];

export default function CrowdGeneratorPanel({ onGenerate }) {
  const [crowdStyle,      setCrowdStyle]      = useState('Generic');
  const [seed,            setSeed]            = useState(42);
  // Size & Spacing
  const [crowdSize,       setCrowdSize]       = useState(50);
  const [agentRadius,     setAgentRadius]     = useState(0.40);
  const [spacing,         setSpacing]         = useState(1.20);
  const [formation,       setFormation]       = useState('Random');
  const [areaW,           setAreaW]           = useState(20);
  const [areaD,           setAreaD]           = useState(20);
  // Animation
  const [animState,       setAnimState]       = useState('Idle');
  const [animVariation,   setAnimVariation]   = useState(0.30);
  const [animOffset,      setAnimOffset]      = useState(0.40);
  const [syncLevel,       setSyncLevel]       = useState(0.20);
  // Variation
  const [heightVariation, setHeightVariation] = useState(0.20);
  const [widthVariation,  setWidthVariation]  = useState(0.15);
  const [genderRatio,     setGenderRatio]     = useState(0.50);
  const [ageVariation,    setAgeVariation]    = useState(0.30);
  const [skinVariation,   setSkinVariation]   = useState(0.60);
  const [outfitVariation, setOutfitVariation] = useState(0.70);
  const [hairVariation,   setHairVariation]   = useState(0.80);
  // Randomize options
  const [randomGender,    setRandomGender]    = useState(true);
  const [randomOutfit,    setRandomOutfit]    = useState(true);
  const [randomHair,      setRandomHair]      = useState(true);
  const [randomScale,     setRandomScale]     = useState(true);
  const [randomAnim,      setRandomAnim]      = useState(false);
  // LOD & Performance
  const [lodProfile,      setLodProfile]      = useState('Balanced');
  const [lodDist1,        setLodDist1]        = useState(10);
  const [lodDist2,        setLodDist2]        = useState(30);
  const [lodDist3,        setLodDist3]        = useState(60);
  const [batchInstancing, setBatchInstancing] = useState(true);
  const [occlusionCull,   setOcclusionCull]   = useState(true);
  const [impostorDist,    setImpostorDist]    = useState(80);
  const [maxDrawCalls,    setMaxDrawCalls]    = useState(100);
  // Output
  const [polyBudget,      setPolyBudget]      = useState('Low');
  const [addNavMesh,      setAddNavMesh]      = useState(false);
  const [separateAgents,  setSeparateAgents]  = useState(false);

  const randomize = useCallback(() => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    setCrowdStyle(pick(CROWD_STYLES));
    setCrowdSize(Math.round(20 + Math.random() * 180));
    setFormation(pick(FORMATION));
    setAnimState(pick(ANIM_STATES));
    setSeed(Math.floor(Math.random() * 9999));
  }, []);

  return (
    <div style={P}>
      <Section title="👥 Crowd Style">
        <Badges items={CROWD_STYLES} active={crowdStyle} onSelect={setCrowdStyle} />
        <Slider label="Random Seed" value={seed} min={0} max={9999} step={1} onChange={setSeed} />
      </Section>
      <Section title="Size & Layout">
        <NumInput label="Agent Count"  value={crowdSize}   min={1}  max={500} onChange={setCrowdSize}   />
        <NumInput label="Area Width"   value={areaW}       min={5}  max={200} onChange={setAreaW}       unit="m" />
        <NumInput label="Area Depth"   value={areaD}       min={5}  max={200} onChange={setAreaD}       unit="m" />
        <Slider   label="Agent Radius" value={agentRadius} onChange={setAgentRadius} />
        <Slider   label="Min Spacing"  value={spacing}     min={0.5} max={5} step={0.1} onChange={setSpacing} />
        <Select   label="Formation"    value={formation}   options={FORMATION} onChange={setFormation}  />
      </Section>
      <Section title="Animation">
        <Badges items={ANIM_STATES} active={animState} onSelect={setAnimState} />
        <Slider label="Variation"    value={animVariation} onChange={setAnimVariation} />
        <Slider label="Time Offset"  value={animOffset}    onChange={setAnimOffset}    />
        <Slider label="Sync Level"   value={syncLevel}     onChange={setSyncLevel}     />
        <Check  label="Random Anim per Agent" value={randomAnim} onChange={setRandomAnim} />
      </Section>
      <Section title="Agent Variation">
        <Slider label="Height"    value={heightVariation}  onChange={setHeightVariation}  />
        <Slider label="Width"     value={widthVariation}   onChange={setWidthVariation}   />
        <Slider label="Gender Ratio (M\u2192F)" value={genderRatio} onChange={setGenderRatio} />
        <Slider label="Age"       value={ageVariation}     onChange={setAgeVariation}     />
        <Slider label="Skin Tone" value={skinVariation}    onChange={setSkinVariation}    />
        <Slider label="Outfit"    value={outfitVariation}  onChange={setOutfitVariation}  />
        <Slider label="Hair"      value={hairVariation}    onChange={setHairVariation}    />
        <Check  label="Random Gender"  value={randomGender}  onChange={setRandomGender}  />
        <Check  label="Random Outfit"  value={randomOutfit}  onChange={setRandomOutfit}  />
        <Check  label="Random Hair"    value={randomHair}    onChange={setRandomHair}    />
        <Check  label="Random Scale"   value={randomScale}   onChange={setRandomScale}   />
      </Section>
      <Section title="\u26A1 LOD & Performance" defaultOpen={false}>
        <Select   label="LOD Profile"     value={lodProfile}     options={LOD_PROFILES} onChange={setLodProfile}     />
        <NumInput label="LOD 1 Distance"  value={lodDist1}  min={5}  max={50}  onChange={setLodDist1}  unit="m" />
        <NumInput label="LOD 2 Distance"  value={lodDist2}  min={20} max={100} onChange={setLodDist2}  unit="m" />
        <NumInput label="LOD 3 Distance"  value={lodDist3}  min={40} max={200} onChange={setLodDist3}  unit="m" />
        <NumInput label="Impostor Dist"   value={impostorDist} min={50} max={300} onChange={setImpostorDist} unit="m" />
        <NumInput label="Max Draw Calls"  value={maxDrawCalls} min={10} max={500} onChange={setMaxDrawCalls}  />
        <Check  label="GPU Instancing"    value={batchInstancing} onChange={setBatchInstancing} />
        <Check  label="Occlusion Culling" value={occlusionCull}   onChange={setOcclusionCull}   />
      </Section>
      <Section title="\u2699 Output" defaultOpen={false}>
        <Select label="Poly Budget per Agent" value={polyBudget} options={POLY_OPTIONS} onChange={setPolyBudget} />
        <Check  label="Add Nav Mesh"           value={addNavMesh}      onChange={setAddNavMesh}      />
        <Check  label="Separate Agent Objects" value={separateAgents}  onChange={setSeparateAgents}  />
      </Section>
      <div style={{ display: 'flex', gap: 6 }}>
        <RandBtn onClick={randomize} />
        <GenBtn label="\u26a1 Generate Crowd" onClick={() => onGenerate?.({
          crowdStyle, seed,
          layout: { crowdSize, agentRadius, spacing, formation, areaW, areaD },
          animation: { animState, animVariation, animOffset, syncLevel, randomAnim },
          variation: { heightVariation, widthVariation, genderRatio, ageVariation, skinVariation, outfitVariation, hairVariation, randomGender, randomOutfit, randomHair, randomScale },
          lod: { lodProfile, lodDist1, lodDist2, lodDist3, impostorDist, maxDrawCalls, batchInstancing, occlusionCull },
          output: { polyBudget, addNavMesh, separateAgents },
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
