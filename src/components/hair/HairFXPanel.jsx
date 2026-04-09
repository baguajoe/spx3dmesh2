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

export default function HairFXPanel({ character, onUpdate }) {
  // Wet FX
  const [wetness,       setWetness]       = useState(0.00);
  const [wetnessColor,  setWetnessColor]  = useState('#0a0808');
  const [clumpStr,      setClumpStr]      = useState(0.50);
  const [dripSpeed,     setDripSpeed]     = useState(0.30);
  const [dripAmount,    setDripAmount]    = useState(0.40);
  const [fresnelPow,    setFresnelPow]    = useState(3.00);
  const [envReflStr,    setEnvReflStr]    = useState(0.60);
  // SSS
  const [sssEnabled,    setSssEnabled]    = useState(true);
  const [sssStr,        setSssStr]        = useState(0.30);
  const [sssColor,      setSssColor]      = useState('#c87040');
  const [sssRadius,     setSssRadius]     = useState(0.08);
  // Fur Shell
  const [furEnabled,    setFurEnabled]    = useState(false);
  const [furShells,     setFurShells]     = useState(16);
  const [furLength,     setFurLength]     = useState(0.04);
  const [furDensity,    setFurDensity]    = useState(0.70);
  const [furSoftness,   setFurSoftness]   = useState(0.50);
  const [furColor,      setFurColor]      = useState('#8a6030');
  // Specular
  const [specShift,     setSpecShift]     = useState(0.05);
  const [specShift2,    setSpecShift2]    = useState(-0.05);
  const [specPower,     setSpecPower]     = useState(80);
  const [spec2Str,      setSpec2Str]      = useState(0.40);
  const [specColor,     setSpecColor]     = useState('#fff8e0');
  // Alpha & Rendering
  const [alphaTest,     setAlphaTest]     = useState(0.10);
  const [alphaDither,   setAlphaDither]   = useState(false);
  const [depthWrite,    setDepthWrite]    = useState(false);
  const [doubleSide,    setDoubleSide]    = useState(true);
  // Strand Highlights
  const [highlightBand, setHighlightBand] = useState(false);
  const [highlightPos,  setHighlightPos]  = useState(0.30);
  const [highlightW,    setHighlightW]    = useState(0.10);
  const [highlightStr2, setHighlightStr2] = useState(0.50);
  // Color grading
  const [saturation,    setSaturation]    = useState(1.00);
  const [brightness,    setBrightness]    = useState(1.00);
  const [contrast,      setContrast]      = useState(1.00);
  const [tint,          setTint]          = useState('#ffffff');
  const [tintStr,       setTintStr]       = useState(0.00);

  const handleApply = useCallback(() => {
    onUpdate?.({
      wet:       { wetness, wetnessColor, clumpStr, dripSpeed, dripAmount, fresnelPow, envReflStr },
      sss:       { sssEnabled, sssStr, sssColor, sssRadius },
      fur:       { furEnabled, furShells, furLength, furDensity, furSoftness, furColor },
      specular:  { specShift, specShift2, specPower, spec2Str, specColor },
      alpha:     { alphaTest, alphaDither, depthWrite, doubleSide },
      highlight: { highlightBand, highlightPos, highlightW, highlightStr2 },
      grade:     { saturation, brightness, contrast, tint, tintStr },
    });
  }, [wetness, wetnessColor, clumpStr, dripSpeed, dripAmount, fresnelPow, envReflStr,
    sssEnabled, sssStr, sssColor, sssRadius,
    furEnabled, furShells, furLength, furDensity, furSoftness, furColor,
    specShift, specShift2, specPower, spec2Str, specColor,
    alphaTest, alphaDither, depthWrite, doubleSide,
    highlightBand, highlightPos, highlightW, highlightStr2,
    saturation, brightness, contrast, tint, tintStr]);

  return (
    <div style={P}>
      <Section title="💧 Wet FX">
        <Slider   label="Wetness"         value={wetness}      onChange={setWetness}      />
        {wetness > 0 && <>
          <ColorRow label="Wet Color"     value={wetnessColor} onChange={setWetnessColor} />
          <Slider   label="Clump Str"     value={clumpStr}     onChange={setClumpStr}     />
          <Slider   label="Drip Speed"    value={dripSpeed}    onChange={setDripSpeed}    />
          <Slider   label="Drip Amount"   value={dripAmount}   onChange={setDripAmount}   />
          <Slider   label="Fresnel Power" value={fresnelPow} min={0.5} max={8} step={0.1} onChange={setFresnelPow} />
          <Slider   label="Env Refl Str"  value={envReflStr}   onChange={setEnvReflStr}   />
        </>}
      </Section>

      <Section title="🧪 Subsurface Scatter">
        <Check    label="Enable SSS"    value={sssEnabled} onChange={setSssEnabled} />
        {sssEnabled && <>
          <Slider   label="SSS Strength" value={sssStr}    onChange={setSssStr}    />
          <Slider   label="SSS Radius"   value={sssRadius} onChange={setSssRadius} />
          <ColorRow label="SSS Color"    value={sssColor}  onChange={setSssColor}  />
        </>}
      </Section>

      <Section title="🐾 Fur Shell">
        <Check label="Enable Fur Shell" value={furEnabled} onChange={setFurEnabled} />
        {furEnabled && <>
          <Slider   label="Shell Count" value={furShells}  min={4} max={64} step={1} onChange={setFurShells}  />
          <Slider   label="Fur Length"  value={furLength}  onChange={setFurLength}  />
          <Slider   label="Density"     value={furDensity} onChange={setFurDensity} />
          <Slider   label="Softness"    value={furSoftness} onChange={setFurSoftness} />
          <ColorRow label="Fur Color"   value={furColor}   onChange={setFurColor}   />
        </>}
      </Section>

      <Section title="\u2728 Specular">
        <Slider   label="Primary Shift"   value={specShift}  min={-0.3} max={0.3} step={0.01} onChange={setSpecShift}  />
        <Slider   label="Secondary Shift" value={specShift2} min={-0.3} max={0.3} step={0.01} onChange={setSpecShift2} />
        <Slider   label="Spec Power"      value={specPower}  min={10} max={200} step={5} onChange={setSpecPower}  />
        <Slider   label="Secondary Str"   value={spec2Str}   onChange={setSpec2Str}   />
        <ColorRow label="Spec Color"      value={specColor}  onChange={setSpecColor}  />
      </Section>

      <Section title="🌟 Strand Highlight" defaultOpen={false}>
        <Check  label="Highlight Band"    value={highlightBand} onChange={setHighlightBand} />
        {highlightBand && <>
          <Slider label="Position"  value={highlightPos} onChange={setHighlightPos} />
          <Slider label="Width"     value={highlightW}   onChange={setHighlightW}   />
          <Slider label="Strength"  value={highlightStr2} onChange={setHighlightStr2} />
        </>}
      </Section>

      <Section title="🎨 Color Grade" defaultOpen={false}>
        <Slider   label="Saturation" value={saturation} min={0} max={2} step={0.05} onChange={setSaturation} />
        <Slider   label="Brightness" value={brightness} min={0} max={2} step={0.05} onChange={setBrightness} />
        <Slider   label="Contrast"   value={contrast}   min={0} max={2} step={0.05} onChange={setContrast}   />
        <Slider   label="Tint Str"   value={tintStr}    onChange={setTintStr}    />
        {tintStr > 0 && <ColorRow label="Tint Color" value={tint} onChange={setTint} />}
      </Section>

      <Section title="\u2699 Rendering" defaultOpen={false}>
        <Slider label="Alpha Test"    value={alphaTest}   min={0} max={0.5} step={0.01} onChange={setAlphaTest}   />
        <Check  label="Alpha Dither"  value={alphaDither} onChange={setAlphaDither} />
        <Check  label="Depth Write"   value={depthWrite}  onChange={setDepthWrite}  />
        <Check  label="Double Sided"  value={doubleSide}  onChange={setDoubleSide}  />
      </Section>

      <GenBtn label="\u26a1 Apply Hair FX" onClick={handleApply} />
    </div>
  );
}
