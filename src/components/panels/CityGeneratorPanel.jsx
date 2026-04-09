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

const CITY_STYLES  = ['Modern','Medieval','Futuristic','Ruins','Sci-Fi','Fantasy','Cyberpunk','Art Deco','Soviet','Colonial'];
const ROAD_TYPES   = ['Grid','Organic','Radial','Medieval Winding','Highway','Mixed'];
const DISTRICT     = ['Residential','Commercial','Industrial','Historic','Park','Slum','Financial','Mixed'];
const POLY_OPTIONS = ['Low','Mid','High'];

export default function CityGeneratorPanel({ onGenerate }) {
  const [cityStyle,      setCityStyle]      = useState('Modern');
  const [seed,           setSeed]           = useState(1);
  // Grid
  const [gridW,          setGridW]          = useState(10);
  const [gridH,          setGridH]          = useState(10);
  const [blockSize,      setBlockSize]      = useState(20);
  const [streetW,        setStreetW]        = useState(8);
  const [sidewalkW,      setSidewalkW]      = useState(2);
  const [roadType,       setRoadType]       = useState('Grid');
  const [alleyFreq,      setAlleyFreq]      = useState(0.20);
  // Buildings
  const [minHeight,      setMinHeight]      = useState(5);
  const [maxHeight,      setMaxHeight]      = useState(80);
  const [buildingDensity,setBuildingDensity]= useState(0.70);
  const [heightVariance, setHeightVariance] = useState(0.50);
  const [setbackMin,     setSetbackMin]     = useState(0);
  const [setbackMax,     setSetbackMax]     = useState(3);
  const [roofVariety,    setRoofVariety]    = useState(0.60);
  const [facadeDetail,   setFacadeDetail]   = useState(0.50);
  const [windowDensity,  setWindowDensity]  = useState(0.60);
  const [balconies,      setBalconies]      = useState(0.20);
  const [signage,        setSignage]        = useState(0.30);
  // Districts
  const [districtType,   setDistrictType]   = useState('Mixed');
  const [districtDensity,setDistrictDensity]= useState(0.50);
  // Props
  const [addLights,      setAddLights]      = useState(true);
  const [lightDensity,   setLightDensity]   = useState(0.50);
  const [addPeople,      setAddPeople]      = useState(false);
  const [peopleCount,    setPeopleCount]    = useState(50);
  const [addVehicles,    setAddVehicles]    = useState(false);
  const [vehicleCount,   setVehicleCount]   = useState(20);
  const [addFoliage,     setAddFoliage]     = useState(true);
  const [foliageDensity, setFoliageDensity] = useState(0.30);
  const [addBenches,     setAddBenches]     = useState(false);
  const [addTrash,       setAddTrash]       = useState(false);
  // Atmosphere
  const [skyboxType,     setSkyboxType]     = useState('Clear');
  const [addFog,         setAddFog]         = useState(false);
  // Output
  const [polyBudget,     setPolyBudget]     = useState('Mid');
  const [addColliders,   setAddColliders]   = useState(true);
  const [addLOD,         setAddLOD]         = useState(true);
  const [splitDistricts, setSplitDistricts] = useState(false);
  const [addNavMesh,     setAddNavMesh]     = useState(false);

  const SKYBOX_OPTIONS = ['Clear','Overcast','Night','Sunset','Storm','Smog'];

  const randomize = useCallback(() => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const rn = (a, b) => parseFloat((a + Math.random() * (b - a)).toFixed(2));
    setCityStyle(pick(CITY_STYLES)); setRoadType(pick(ROAD_TYPES));
    setGridW(Math.round(5 + Math.random() * 20));
    setGridH(Math.round(5 + Math.random() * 20));
    setMaxHeight(Math.round(20 + Math.random() * 160));
    setBuildingDensity(rn(0.4, 0.95));
    setSeed(Math.floor(Math.random() * 9999));
  }, []);

  return (
    <div style={P}>
      <Section title="🏙 City Style">
        <Badges items={CITY_STYLES} active={cityStyle} onSelect={setCityStyle} />
        <Slider label="Random Seed" value={seed} min={0} max={9999} step={1} onChange={setSeed} />
      </Section>
      <Section title="Grid & Roads">
        <NumInput label="Grid Width"   value={gridW}     min={2} max={50} onChange={setGridW}     />
        <NumInput label="Grid Depth"   value={gridH}     min={2} max={50} onChange={setGridH}     />
        <NumInput label="Block Size"   value={blockSize} min={10} max={100} onChange={setBlockSize} unit="m" />
        <NumInput label="Street Width" value={streetW}   min={4} max={30}  onChange={setStreetW}   unit="m" />
        <NumInput label="Sidewalk"     value={sidewalkW} min={0} max={10}  onChange={setSidewalkW} unit="m" />
        <Select   label="Road Layout"  value={roadType}  options={ROAD_TYPES} onChange={setRoadType} />
        <Slider   label="Alley Freq"   value={alleyFreq} onChange={setAlleyFreq} />
      </Section>
      <Section title="🏢 Buildings">
        <NumInput label="Min Height"    value={minHeight}       min={2}  max={200} onChange={setMinHeight}       unit="m" />
        <NumInput label="Max Height"    value={maxHeight}       min={5}  max={500} onChange={setMaxHeight}       unit="m" />
        <Slider   label="Density"       value={buildingDensity} onChange={setBuildingDensity} />
        <Slider   label="Height Variance" value={heightVariance} onChange={setHeightVariance} />
        <NumInput label="Setback Min"   value={setbackMin}      min={0}  max={10}  onChange={setSetbackMin}      unit="m" />
        <NumInput label="Setback Max"   value={setbackMax}      min={0}  max={20}  onChange={setSetbackMax}      unit="m" />
        <Slider   label="Roof Variety"  value={roofVariety}     onChange={setRoofVariety}     />
        <Slider   label="Facade Detail" value={facadeDetail}    onChange={setFacadeDetail}    />
        <Slider   label="Windows"       value={windowDensity}   onChange={setWindowDensity}   />
        <Slider   label="Balconies"     value={balconies}       onChange={setBalconies}       />
        <Slider   label="Signage"       value={signage}         onChange={setSignage}         />
      </Section>
      <Section title="Districts" defaultOpen={false}>
        <Select label="District Type"    value={districtType}    options={DISTRICT} onChange={setDistrictType}    />
        <Slider label="District Density" value={districtDensity} onChange={setDistrictDensity} />
      </Section>
      <Section title="Props" defaultOpen={false}>
        <Check    label="Street Lights" value={addLights}     onChange={setAddLights}     />
        {addLights && <Slider label="Light Density" value={lightDensity} onChange={setLightDensity} />}
        <Check    label="People"        value={addPeople}     onChange={setAddPeople}     />
        {addPeople && <NumInput label="People Count" value={peopleCount} min={1} max={500} onChange={setPeopleCount} />}
        <Check    label="Vehicles"      value={addVehicles}   onChange={setAddVehicles}   />
        {addVehicles && <NumInput label="Vehicle Count" value={vehicleCount} min={1} max={200} onChange={setVehicleCount} />}
        <Check    label="Trees / Plants" value={addFoliage}   onChange={setAddFoliage}   />
        {addFoliage && <Slider label="Foliage Density" value={foliageDensity} onChange={setFoliageDensity} />}
        <Check    label="Street Benches" value={addBenches}   onChange={setAddBenches}   />
        <Check    label="Trash / Debris" value={addTrash}     onChange={setAddTrash}     />
      </Section>
      <Section title="Atmosphere" defaultOpen={false}>
        <Select label="Skybox"  value={skyboxType} options={SKYBOX_OPTIONS} onChange={setSkyboxType} />
        <Check  label="Add Fog" value={addFog}     onChange={setAddFog}     />
      </Section>
      <Section title="\u2699 Output" defaultOpen={false}>
        <Select label="Poly Budget"       value={polyBudget}     options={POLY_OPTIONS} onChange={setPolyBudget}     />
        <Check  label="Add Colliders"     value={addColliders}   onChange={setAddColliders}   />
        <Check  label="Auto LOD"          value={addLOD}         onChange={setAddLOD}         />
        <Check  label="Split by District" value={splitDistricts} onChange={setSplitDistricts} />
        <Check  label="Nav Mesh"          value={addNavMesh}     onChange={setAddNavMesh}     />
      </Section>
      <div style={{ display: 'flex', gap: 6 }}>
        <RandBtn onClick={randomize} />
        <GenBtn label="\u26a1 Generate City" onClick={() => onGenerate?.({
          cityStyle, seed,
          grid: { gridW, gridH, blockSize, streetW, sidewalkW, roadType, alleyFreq },
          buildings: { minHeight, maxHeight, buildingDensity, heightVariance, setbackMin, setbackMax, roofVariety, facadeDetail, windowDensity, balconies, signage },
          districts: { districtType, districtDensity },
          props: { addLights, lightDensity, addPeople, peopleCount, addVehicles, vehicleCount, addFoliage, foliageDensity, addBenches, addTrash },
          atmosphere: { skyboxType, addFog },
          output: { polyBudget, addColliders, addLOD, splitDistricts, addNavMesh },
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
