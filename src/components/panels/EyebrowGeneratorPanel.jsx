import React, { useState, useCallback, useRef, useEffect } from 'react';

function Slider({ label, value, min=0, max=1, step=0.01, onChange, unit='' }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#888' }}>
        <span>{label}</span>
        <span style={{ color:'#00ffc8', fontWeight:600 }}>
          {typeof value==='number' ? (step<0.1 ? value.toFixed(2) : Math.round(value)) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:'100%', accentColor:'#00ffc8', cursor:'pointer', height:16 }} />
    </div>
  );
}
function Select({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom:6 }}>
      {label && <div style={{ fontSize:10, color:'#888', marginBottom:2 }}>{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width:'100%', background:'#0d1117', color:'#e0e0e0',
        border:'1px solid #21262d', padding:'3px 6px', borderRadius:4, fontSize:11, cursor:'pointer',
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Check({ label, value, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:11,
      color:'#ccc', cursor:'pointer', marginBottom:4 }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ accentColor:'#00ffc8', width:12, height:12 }} />
      {label}
    </label>
  );
}
function ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
      <span style={{ fontSize:10, color:'#888', flex:1 }}>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width:32, height:22, border:'none', cursor:'pointer', borderRadius:3 }} />
      <span style={{ fontSize:9, color:'#555', fontFamily:'monospace' }}>{value}</span>
    </div>
  );
}
function Section({ title, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom:6, border:'1px solid #21262d', borderRadius:5, overflow:'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding:'5px 8px', cursor:'pointer', background:'#0d1117',
        display:'flex', justifyContent:'space-between',
        fontSize:11, fontWeight:600, color:'#00ffc8', userSelect:'none',
      }}>
        <span>{title}</span>
        <span style={{ fontSize:9, opacity:0.7 }}>{open ? '\u25b2' : '\u25bc'}</span>
      </div>
      {open && <div style={{ padding:'6px 8px', background:'#06060f' }}>{children}</div>}
    </div>
  );
}
function Badges({ items, active, onSelect }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:6 }}>
      {items.map(item => (
        <button key={item} onClick={() => onSelect(item)} style={{
          padding:'2px 7px', fontSize:9, borderRadius:4, cursor:'pointer',
          background: active===item ? '#00ffc8' : '#1a1f2c',
          color: active===item ? '#06060f' : '#ccc',
          border: `1px solid ${active===item ? '#00ffc8' : '#21262d'}`,
        }}>{item}</button>
      ))}
    </div>
  );
}
function GenBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', background:'#00ffc8', color:'#06060f', border:'none',
      borderRadius:4, padding:'7px 0', cursor:'pointer', fontWeight:700,
      fontSize:12, marginTop:6, letterSpacing:0.5, fontFamily:'JetBrains Mono, monospace',
    }}>{label}</button>
  );
}
function RandBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background:'#1a1f2c', color:'#888', border:'1px solid #21262d',
      borderRadius:4, padding:'6px 10px', cursor:'pointer', fontSize:11,
    }}>🎲</button>
  );
}
const P = { fontFamily:'JetBrains Mono, monospace', color:'#e0e0e0', fontSize:12, userSelect:'none', width:'100%' };

const BROW_SHAPES  = ['Straight','Arched','Peaked','Flat','S-Curve','Rounded','Angular','Bushy','Thin','Unibrow'];
const BROW_STYLES  = ['Natural','Defined','Bold','Feathered','Microbladed','Bleached','Tattooed','Ombre'];
const HAIR_COLORS  = ['#1a1008','#3a2010','#6a4020','#a06030','#c0a040','#e0d060','#f0f0f0','#e83030','#3030e0','#ffffff'];

export default function EyebrowGeneratorPanel({ character, onApply, onMirror }) {
  // Shape
  const [browShape,    setBrowShape]    = useState('Arched');
  const [browStyle,    setBrowStyle]    = useState('Natural');
  const [arch,         setArch]         = useState(0.50);
  const [archPos,      setArchPos]      = useState(0.55);
  const [thickness,    setThickness]    = useState(0.45);
  const [thicknessVar, setThicknessVar] = useState(0.30);
  const [length,       setLength]       = useState(0.55);
  const [tailAngle,    setTailAngle]    = useState(0.20);
  const [innerAngle,   setInnerAngle]   = useState(0.10);
  const [height,       setHeight]       = useState(0.50);
  const [spacing,      setSpacing]      = useState(0.50);
  const [frontGap,     setFrontGap]     = useState(0.30);
  // Hair properties
  const [hairColor,    setHairColor]    = useState('#1a1008');
  const [hairColor2,   setHairColor2]   = useState('#3a2010');
  const [hairDensity,  setHairDensity]  = useState(0.70);
  const [hairLen,      setHairLen]      = useState(0.40);
  const [hairCoarseness,setHairCoarseness]=useState(0.50);
  const [hairAngle,    setHairAngle]    = useState(0.30);
  const [greyAmount,   setGreyAmount]   = useState(0.00);
  // Grooming
  const [groomed,      setGroomed]      = useState(true);
  const [strayHairs,   setStrayHairs]   = useState(0.10);
  const [trimLevel,    setTrimLevel]    = useState(0.50);
  // Skin
  const [skinVisible,  setSkinVisible]  = useState(false);
  const [skinRoughness,setSkinRoughness]= useState(0.60);
  // Asymmetry
  const [asymmetry,    setAsymmetry]    = useState(0.00);
  const [asymSide,     setAsymSide]     = useState('Left');
  // Output
  const [genPair,      setGenPair]      = useState(true);
  const [addPhysics,   setAddPhysics]   = useState(false);
  const [polyBudget,   setPolyBudget]   = useState('Mid');

  const randomize = useCallback(() => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const rn = (a,b) => parseFloat((a + Math.random()*(b-a)).toFixed(2));
    setBrowShape(pick(BROW_SHAPES)); setBrowStyle(pick(BROW_STYLES));
    setArch(rn(0.1,0.9)); setArchPos(rn(0.4,0.7));
    setThickness(rn(0.2,0.8)); setLength(rn(0.4,0.7));
    setHairDensity(rn(0.4,1.0)); setGroomed(Math.random()>0.4);
    setAsymmetry(rn(0,0.2));
  }, []);

  const handleApply = useCallback(() => {
    onApply?.({
      shape: { browShape, arch, archPos, thickness, thicknessVar, length, tailAngle, innerAngle, height, spacing, frontGap },
      style: browStyle,
      hair: { hairColor, hairColor2, hairDensity, hairLen, hairCoarseness, hairAngle, greyAmount },
      grooming: { groomed, strayHairs, trimLevel },
      skin: { skinVisible, skinRoughness },
      asymmetry: { amount: asymmetry, side: asymSide },
      output: { genPair, addPhysics, polyBudget },
    });
  }, [browShape, arch, archPos, thickness, thicknessVar, length, tailAngle, innerAngle,
    height, spacing, frontGap, browStyle, hairColor, hairColor2, hairDensity, hairLen,
    hairCoarseness, hairAngle, greyAmount, groomed, strayHairs, trimLevel,
    skinVisible, skinRoughness, asymmetry, asymSide, genPair, addPhysics, polyBudget]);

  return (
    <div style={P}>
      <Section title="🦹 Shape">
        <Badges items={BROW_SHAPES} active={browShape} onSelect={setBrowShape} />
        <Slider label="Arch Height"    value={arch}         onChange={setArch}         />
        <Slider label="Arch Position"  value={archPos}      onChange={setArchPos}      />
        <Slider label="Thickness"      value={thickness}    onChange={setThickness}    />
        <Slider label="Thickness Var"  value={thicknessVar} onChange={setThicknessVar} />
        <Slider label="Length"         value={length}       onChange={setLength}       />
        <Slider label="Tail Angle"     value={tailAngle}    min={-0.5} max={0.5} step={0.01} onChange={setTailAngle} />
        <Slider label="Inner Angle"    value={innerAngle}   min={-0.5} max={0.5} step={0.01} onChange={setInnerAngle} />
        <Slider label="Height on Face" value={height}       onChange={setHeight}       />
        <Slider label="Brow Spacing"   value={spacing}      onChange={setSpacing}      />
        <Slider label="Front Gap"      value={frontGap}     onChange={setFrontGap}     />
      </Section>

      <Section title="🖌 Style">
        <Badges items={BROW_STYLES} active={browStyle} onSelect={setBrowStyle} />
      </Section>

      <Section title="🦱 Hair Properties">
        <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>
          {HAIR_COLORS.map(c => (
            <div key={c} onClick={() => setHairColor(c)} style={{
              width:20, height:20, borderRadius:3, background:c, cursor:'pointer',
              border:`2px solid ${hairColor===c ? '#00ffc8' : '#21262d'}`,
            }} />
          ))}
        </div>
        <ColorRow label="Hair Color 1"  value={hairColor}      onChange={setHairColor}      />
        <ColorRow label="Hair Color 2"  value={hairColor2}     onChange={setHairColor2}     />
        <Slider label="Density"         value={hairDensity}    onChange={setHairDensity}    />
        <Slider label="Hair Length"     value={hairLen}        onChange={setHairLen}        />
        <Slider label="Coarseness"      value={hairCoarseness} onChange={setHairCoarseness} />
        <Slider label="Growth Angle"    value={hairAngle}      onChange={setHairAngle}      />
        <Slider label="Grey Amount"     value={greyAmount}     onChange={setGreyAmount}     />
      </Section>

      <Section title="\u2702 Grooming">
        <Check  label="Groomed"         value={groomed}       onChange={setGroomed}       />
        <Slider label="Stray Hairs"     value={strayHairs}    onChange={setStrayHairs}    />
        <Slider label="Trim Level"      value={trimLevel}     onChange={setTrimLevel}     />
      </Section>

      <Section title="🧬 Asymmetry" defaultOpen={false}>
        <Slider label="Asymmetry Amount" value={asymmetry} min={0} max={0.4} step={0.01} onChange={setAsymmetry} />
        {asymmetry > 0 && (
          <Select label="Stronger Side" value={asymSide} options={['Left','Right']} onChange={setAsymSide} />
        )}
      </Section>

      <Section title="\u2699 Output" defaultOpen={false}>
        <Select label="Poly Budget" value={polyBudget} options={['Low','Mid','High','Ultra']} onChange={setPolyBudget} />
        <Check  label="Generate Pair (L+R)" value={genPair}    onChange={setGenPair}    />
        <Check  label="Physics Simulation"  value={addPhysics} onChange={setAddPhysics} />
        <Check  label="Visible Skin"        value={skinVisible} onChange={setSkinVisible} />
        {skinVisible && <Slider label="Skin Roughness" value={skinRoughness} onChange={setSkinRoughness} />}
      </Section>

      <div style={{ display:'flex', gap:6 }}>
        <RandBtn onClick={randomize} />
        <button onClick={() => onMirror?.()} style={{
          background:'#1a1f2c', color:'#888', border:'1px solid #21262d',
          borderRadius:4, padding:'6px 10px', cursor:'pointer', fontSize:10,
        }}>🔃</button>
        <GenBtn label="\u2713 Apply Brows" onClick={handleApply} />
      </div>
    </div>
  );
}
