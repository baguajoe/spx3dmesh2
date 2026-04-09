import React, { useState, useCallback } from 'react';
import '../../../src/styles/panel-components.css';

function Slider({ label, value, min=0, max=1, step=0.01, onChange, unit='' }) {
  return (
    <div className="spx-slider-wrap">
      <div className="spx-slider-header">
        <span>{label}</span>
        <span className="spx-slider-header__val">
          {typeof value==='number' ? (step<0.1 ? value.toFixed(2) : Math.round(value)) : value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        className="spx-slider-input spx-slider-input--tall"
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <div className="spx-select-wrap">
      {label && <div className="spx-select-label">{label}</div>}
      <select
        className="spx-select-input"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Check({ label, value, onChange }) {
  return (
    <label className="spx-check-label">
      <input
        type="checkbox" checked={value}
        className="spx-check-input"
        onChange={e => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="spx-color-row">
      <span className="spx-color-row__label">{label}</span>
      <input
        type="color" value={value}
        className="spx-color-row__input"
        onChange={e => onChange(e.target.value)}
      />
      <span className="spx-color-row__hex">{value}</span>
    </div>
  );
}

function Section({ title, children, defaultOpen=true, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spx-section">
      <div
        className={`spx-section__hdr${accent ? ` spx-section__hdr--${accent}` : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className={`spx-section__arrow${accent ? ` spx-section__arrow--${accent}` : ''}`}>
          {open ? '▾' : '▸'}
        </span>
        <span className="spx-section__title">{title}</span>
      </div>
      {open && <div className="spx-section__body">{children}</div>}
    </div>
  );
}

function Badges({ items, active, onSelect }) {
  return (
    <div className="spx-badges">
      {items.map(item => (
        <button
          key={item}
          className={`spx-badge${active===item ? ' spx-badge--active' : ''}`}
          onClick={() => onSelect(item)}
        >{item}</button>
      ))}
    </div>
  );
}

const HAIR_STYLES  = ['Straight','Wavy','Curly','Coily','Afro','Braided','Locked','Buzzcut',
  'Mohawk','Bob','Pixie','Long','Ponytail','Bun','Updo','Undercut','Faded','Slicked'];
const HAIR_LENGTHS = ['Buzzed','Short','Ear Length','Chin Length','Shoulder','Mid-Back','Waist','Floor'];
const HAIR_COLORS  = ['#0a0808','#2a1808','#4a2810','#8a5020','#c08040','#d0b060','#f0f0e0','#e83030','#3040cc','#208040'];

export default function HairPanel({ character, scene, onUpdate }) {
  const [hairStyle,      setHairStyle]      = useState('Straight');
  const [hairLength,     setHairLength]     = useState('Shoulder');
  const [seed,           setSeed]           = useState(42);
  const [rootColor,      setRootColor]      = useState('#2a1808');
  const [tipColor,       setTipColor]       = useState('#8a5020');
  const [highlightColor, setHighlightColor] = useState('#c08040');
  const [highlightStr,   setHighlightStr]   = useState(0.00);
  const [greyAmount,     setGreyAmount]     = useState(0.00);
  const [density,        setDensity]        = useState(0.75);
  const [thickness,      setThickness]      = useState(0.45);
  const [thicknessVar,   setThicknessVar]   = useState(0.25);
  const [hairlineRec,    setHairlineRec]    = useState(0.00);
  const [partSide,       setPartSide]       = useState('None');
  const [waveAmt,        setWaveAmt]        = useState(0.00);
  const [waveFreq,       setWaveFreq]       = useState(0.50);
  const [curlAmt,        setCurlAmt]        = useState(0.00);
  const [curlFreq,       setCurlFreq]       = useState(0.50);
  const [frizz,          setFrizz]          = useState(0.10);
  const [flyaways,       setFlyaways]       = useState(0.10);
  const [stiffness,      setStiffness]      = useState(0.70);
  const [damping,        setDamping]        = useState(0.80);
  const [windResp,       setWindResp]       = useState(0.40);
  const [gravity,        setGravity]        = useState(0.50);
  const [roughness,      setRoughness]      = useState(0.70);
  const [glossiness,     setGlossiness]     = useState(0.30);
  const [subsurface,     setSubsurface]     = useState(0.20);
  const [shaderType,     setShaderType]     = useState('Kajiya-Kay');
  const [renderMethod,   setRenderMethod]   = useState('Cards');
  const [cardCount,      setCardCount]      = useState(300);
  const [segments,       setSegments]       = useState(8);
  const [addLOD,         setAddLOD]         = useState(true);

  const PART_SIDES     = ['None','Left','Right','Center','Zigzag'];
  const SHADER_TYPES   = ['Kajiya-Kay','PBR','Fur Shell','Rasterized','Marschner'];
  const RENDER_METHODS = ['Cards','Tubes','Strips','Fur Shell','Points'];

  const handleApply = useCallback(() => {
    onUpdate?.({
      style:    { hairStyle, hairLength, seed },
      color:    { rootColor, tipColor, highlightColor, highlightStr, greyAmount },
      density:  { density, thickness, thicknessVar, hairlineRec, partSide },
      shape:    { waveAmt, waveFreq, curlAmt, curlFreq, frizz, flyaways },
      physics:  { stiffness, damping, windResp, gravity },
      material: { roughness, glossiness, subsurface, shaderType },
      output:   { renderMethod, cardCount, segments, addLOD },
    });
  }, [hairStyle, hairLength, seed, rootColor, tipColor, highlightColor, highlightStr,
    greyAmount, density, thickness, thicknessVar, hairlineRec, partSide,
    waveAmt, waveFreq, curlAmt, curlFreq, frizz, flyaways,
    stiffness, damping, windResp, gravity, roughness, glossiness, subsurface, shaderType,
    renderMethod, cardCount, segments, addLOD]);

  const randomize = useCallback(() => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const rn = (a,b) => parseFloat((a+Math.random()*(b-a)).toFixed(2));
    setHairStyle(pick(HAIR_STYLES)); setHairLength(pick(HAIR_LENGTHS));
    setRootColor(pick(HAIR_COLORS)); setTipColor(pick(HAIR_COLORS));
    setDensity(rn(0.4,1.0)); setWaveAmt(rn(0,0.5)); setCurlAmt(rn(0,0.4));
    setSeed(Math.floor(Math.random()*9999));
  }, []);

  return (
    <div className="spx-panel-root">
      <Section title="🦱 Hair Style">
        <Badges items={HAIR_STYLES.slice(0,9)}  active={hairStyle} onSelect={setHairStyle} />
        <Badges items={HAIR_STYLES.slice(9)}    active={hairStyle} onSelect={setHairStyle} />
        <Select label="Length"      value={hairLength} options={HAIR_LENGTHS} onChange={setHairLength} />
        <Slider label="Random Seed" value={seed} min={0} max={9999} step={1} onChange={setSeed} />
      </Section>

      <Section title="🌈 Color">
        <div className="spx-palette">
          {HAIR_COLORS.map(c => (
            <div
              key={c}
              className={`spx-palette__swatch${rootColor===c ? ' spx-palette__swatch--active' : ''}`}
              className="hp-color-swatch" style={{ background: c }}
              onClick={() => setRootColor(c)}
            />
          ))}
        </div>
        <ColorRow label="Root Color"    value={rootColor}      onChange={setRootColor}      />
        <ColorRow label="Tip Color"     value={tipColor}       onChange={setTipColor}       />
        <Slider   label="Highlight Str" value={highlightStr}   onChange={setHighlightStr}   />
        {highlightStr > 0 && <ColorRow label="Highlight" value={highlightColor} onChange={setHighlightColor} />}
        <Slider   label="Grey Amount"   value={greyAmount}     onChange={setGreyAmount}     />
      </Section>

      <Section title="📊 Density">
        <Slider label="Density"         value={density}      onChange={setDensity}      />
        <Slider label="Thickness"       value={thickness}    onChange={setThickness}    />
        <Slider label="Thickness Var"   value={thicknessVar} onChange={setThicknessVar} />
        <Slider label="Hairline Recede" value={hairlineRec}  onChange={setHairlineRec}  />
        <Select label="Part Side"       value={partSide}     options={PART_SIDES}  onChange={setPartSide} />
      </Section>

      <Section title="🌀 Wave & Curl">
        <Slider label="Wave Amount" value={waveAmt}  onChange={setWaveAmt}  />
        <Slider label="Wave Freq"   value={waveFreq} onChange={setWaveFreq} />
        <Slider label="Curl Amount" value={curlAmt}  onChange={setCurlAmt}  />
        <Slider label="Curl Freq"   value={curlFreq} onChange={setCurlFreq} />
        <Slider label="Frizz"       value={frizz}    onChange={setFrizz}    />
        <Slider label="Flyaways"    value={flyaways} onChange={setFlyaways} />
      </Section>

      <Section title="💨 Physics">
        <Slider label="Stiffness" value={stiffness} onChange={setStiffness} />
        <Slider label="Damping"   value={damping}   onChange={setDamping}   />
        <Slider label="Wind Resp" value={windResp}  onChange={setWindResp}  />
        <Slider label="Gravity"   value={gravity}   onChange={setGravity}   />
      </Section>

      <Section title="💎 Material" defaultOpen={false}>
        <Select label="Shader"     value={shaderType} options={SHADER_TYPES}   onChange={setShaderType}  />
        <Slider label="Roughness"  value={roughness}  onChange={setRoughness}  />
        <Slider label="Glossiness" value={glossiness} onChange={setGlossiness} />
        <Slider label="Subsurface" value={subsurface} onChange={setSubsurface} />
      </Section>

      <Section title="⚙ Output" defaultOpen={false}>
        <Select label="Render Method" value={renderMethod} options={RENDER_METHODS} onChange={setRenderMethod} />
        <Slider label="Card Count" value={cardCount} min={50} max={2000} step={10} onChange={setCardCount} />
        <Slider label="Segments"   value={segments}  min={2}  max={16}   step={1}  onChange={setSegments}  />
        <Check  label="Auto LOD"   value={addLOD}    onChange={setAddLOD} />
      </Section>

      <div className="spx-btn-row">
        <button className="spx-rand-btn" onClick={randomize}>🎲</button>
        <button className="spx-gen-btn" onClick={handleApply}>⚡ Apply Hair</button>
      </div>
    </div>
  );
}
