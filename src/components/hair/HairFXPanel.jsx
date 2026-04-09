import React, { useState, useCallback, useRef, useEffect } from 'react';

function Slider({ label, value, min=0, max=1, step=0.01, onChange, unit='' }) {
  return (
    <div className="ha-slider-wrap">
      <div className="ha-slider-row">
        <span>{label}</span>
        <span className="ha-slider-val">
          {typeof value==='number' ? (step<0.1 ? value.toFixed(2) : Math.round(value)) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="ha-slider" />
    </div>
  );
}
function Select({ label, value, options, onChange }) {
  return (
    <div className="ha-select-wrap">
      {label && <div className="ha-select-label">{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} className="ha-select">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Check({ label, value, onChange }) {
  return (
    <label className="ha-check">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="ha-check__input" />
      {label}
    </label>
  );
}
function ColorRow({ label, value, onChange }) {
  return (
    <div className="ha-color-row">
      <span className="ha-color-label">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="ha-color-input" />
      <span className="ha-color-hex">{value}</span>
    </div>
  );
}
function Section({ title, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ha-section">
      <div className="ha-section__header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span className="ha-section__arrow">{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="ha-section__body">{children}</div>}
    </div>
  );
}
function Badges({ items, active, onSelect }) {
  return (
    <div className="ha-badges">
      {items.map(item => (
        <button key={item} onClick={() => onSelect(item)}
          className={`ha-badge${active===item?' ha-badge--active':''}`}>{item}</button>
      ))}
    </div>
  );
}
function GenBtn({ label, onClick }) {
  return (
    <button onClick={onClick} className="ha-gen-btn">{label}</button>
  );
}
function RandBtn({ onClick }) {
  return (
    <button onClick={onClick} className="ha-rand-btn">🎲</button>
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
