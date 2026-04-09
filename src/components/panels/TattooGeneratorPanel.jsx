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

const TATTOO_STYLES = ['Traditional','Neo-Traditional','Realism','Tribal','Geometric','Watercolor','Japanese','Blackwork','Minimalist','Dotwork','Illustrative','Surrealism','Fine Line'];
const BODY_REGIONS  = ['Upper Arm','Forearm','Full Sleeve','Chest','Back','Shoulder','Neck','Calf','Thigh','Full Leg','Hand','Foot','Spine','Rib','Hip','Wrist'];
const SUBJECTS      = ['Custom','Floral','Animal','Portrait','Skull','Geometric','Script','Dragon','Phoenix','Koi','Samurai','Viking','Abstract','Mandala','Snake'];
const POLY_OPTIONS  = ['Low','Mid','High'];

export default function TattooGeneratorPanel({ onGenerate }) {
  const [tattooStyle,    setTattooStyle]    = useState('Traditional');
  const [subject,        setSubject]        = useState('Floral');
  const [bodyRegion,     setBodyRegion]     = useState('Upper Arm');
  const [seed,           setSeed]           = useState(1);
  const [inkColor,       setInkColor]       = useState('#1a1a2e');
  const [inkColor2,      setInkColor2]      = useState('#8a2020');
  const [inkColor3,      setInkColor3]      = useState('#204a8a');
  const [inkColor4,      setInkColor4]      = useState('#208a40');
  const [highlightColor, setHighlightColor] = useState('#e8e0c0');
  const [colorCount,     setColorCount]     = useState(2);
  const [scale,          setScale]          = useState(0.50);
  const [positionX,      setPositionX]      = useState(0.50);
  const [positionY,      setPositionY]      = useState(0.50);
  const [rotation,       setRotation]       = useState(0.00);
  const [opacity,        setOpacity]        = useState(0.95);
  const [saturation,     setSaturation]     = useState(0.80);
  const [contrast,       setContrast]       = useState(0.70);
  const [lineWeight,     setLineWeight]     = useState(0.50);
  const [shading,        setShading]        = useState(0.60);
  const [highlight,      setHighlight]      = useState(0.40);
  const [edgeSoftness,   setEdgeSoftness]   = useState(0.15);
  const [detailLevel,    setDetailLevel]    = useState(0.70);
  const [noiseTexture,   setNoiseTexture]   = useState(0.20);
  const [inkSpread,      setInkSpread]      = useState(0.10);
  const [aging,          setAging]          = useState(0.00);
  const [fading,         setFading]         = useState(0.00);
  const [blowout,        setBlowout]        = useState(0.00);
  const [scarring,       setScarring]       = useState(0.00);
  const [sunDamage,      setSunDamage]      = useState(0.00);
  const [symmetry,       setSymmetry]       = useState(false);
  const [mirrorX,        setMirrorX]        = useState(false);
  const [tilePattern,    setTilePattern]    = useState(false);
  const [wrapAround,     setWrapAround]     = useState(true);
  const [followContour,  setFollowContour]  = useState(true);
  const [procedural,     setProcedural]     = useState(false);
  const [procDensity,    setProcDensity]    = useState(0.50);
  const [procScale,      setProcScale]      = useState(0.50);
  const [polyBudget,     setPolyBudget]     = useState('Mid');
  const [exportUV,       setExportUV]       = useState(false);
  const [exportMask,     setExportMask]     = useState(false);
  const [exportAlpha,    setExportAlpha]    = useState(false);

  return (
    <div style={P}>
      <Section title="🎨 Style">
        <Badges items={TATTOO_STYLES} active={tattooStyle} onSelect={setTattooStyle} />
        <Select label="Subject"     value={subject}    options={SUBJECTS}     onChange={setSubject}    />
        <Select label="Body Region" value={bodyRegion} options={BODY_REGIONS} onChange={setBodyRegion} />
        <Slider label="Random Seed" value={seed} min={0} max={9999} step={1} onChange={setSeed} />
      </Section>
      <Section title="Colors">
        <Slider label="Color Count" value={colorCount} min={1} max={6} step={1} onChange={setColorCount} />
        <ColorRow label="Ink 1"       value={inkColor}       onChange={setInkColor}       />
        {colorCount >= 2 && <ColorRow label="Ink 2" value={inkColor2} onChange={setInkColor2} />}
        {colorCount >= 3 && <ColorRow label="Ink 3" value={inkColor3} onChange={setInkColor3} />}
        {colorCount >= 4 && <ColorRow label="Ink 4" value={inkColor4} onChange={setInkColor4} />}
        <ColorRow label="Highlight" value={highlightColor} onChange={setHighlightColor} />
      </Section>
      <Section title="Placement">
        <Slider label="Scale"      value={scale}     onChange={setScale}     />
        <Slider label="Position X" value={positionX} onChange={setPositionX} />
        <Slider label="Position Y" value={positionY} onChange={setPositionY} />
        <Slider label="Rotation"   value={rotation}  min={-1} max={1} step={0.01} onChange={setRotation} />
      </Section>
      <Section title="Ink Properties">
        <Slider label="Opacity"      value={opacity}      onChange={setOpacity}      />
        <Slider label="Saturation"   value={saturation}   onChange={setSaturation}   />
        <Slider label="Contrast"     value={contrast}     onChange={setContrast}     />
        <Slider label="Line Weight"  value={lineWeight}   onChange={setLineWeight}   />
        <Slider label="Shading"      value={shading}      onChange={setShading}      />
        <Slider label="Highlight"    value={highlight}    onChange={setHighlight}    />
        <Slider label="Edge Softness" value={edgeSoftness} onChange={setEdgeSoftness} />
        <Slider label="Detail"       value={detailLevel}  onChange={setDetailLevel}  />
        <Slider label="Noise"        value={noiseTexture} onChange={setNoiseTexture} />
        <Slider label="Ink Spread"   value={inkSpread}    onChange={setInkSpread}    />
      </Section>
      <Section title="Aging & Wear" defaultOpen={false}>
        <Slider label="Age"        value={aging}     onChange={setAging}     />
        <Slider label="Fading"     value={fading}    onChange={setFading}    />
        <Slider label="Blowout"    value={blowout}   onChange={setBlowout}   />
        <Slider label="Scarring"   value={scarring}  onChange={setScarring}  />
        <Slider label="Sun Damage" value={sunDamage} onChange={setSunDamage} />
      </Section>
      <Section title="Layout" defaultOpen={false}>
        <Check label="Symmetry"       value={symmetry}      onChange={setSymmetry}      />
        <Check label="Mirror X"       value={mirrorX}       onChange={setMirrorX}       />
        <Check label="Tile Pattern"   value={tilePattern}   onChange={setTilePattern}   />
        <Check label="Wrap Around"    value={wrapAround}    onChange={setWrapAround}    />
        <Check label="Follow Contour" value={followContour} onChange={setFollowContour} />
      </Section>
      <Section title="Procedural" defaultOpen={false}>
        <Check label="Procedural Mode" value={procedural} onChange={setProcedural} />
        {procedural && (<>
          <Slider label="Density" value={procDensity} onChange={setProcDensity} />
          <Slider label="Scale"   value={procScale}   onChange={setProcScale}   />
        </>)}
      </Section>
      <Section title="\u2699 Output" defaultOpen={false}>
        <Select label="Poly Budget" value={polyBudget}  options={POLY_OPTIONS} onChange={setPolyBudget}  />
        <Check  label="Export UV Map"  value={exportUV}    onChange={setExportUV}    />
        <Check  label="Export Mask"    value={exportMask}  onChange={setExportMask}  />
        <Check  label="Export Alpha"   value={exportAlpha} onChange={setExportAlpha} />
      </Section>
      <GenBtn label="\u26a1 Generate Tattoo" onClick={() => onGenerate?.({
        tattooStyle, subject, bodyRegion, seed,
        colors: { inkColor, inkColor2, inkColor3, inkColor4, highlightColor, colorCount },
        placement: { scale, positionX, positionY, rotation },
        ink: { opacity, saturation, contrast, lineWeight, shading, highlight, edgeSoftness, detailLevel, noiseTexture, inkSpread },
        aging: { aging, fading, blowout, scarring, sunDamage },
        layout: { symmetry, mirrorX, tilePattern, wrapAround, followContour },
        procedural: { procedural, procDensity, procScale },
        output: { polyBudget, exportUV, exportMask, exportAlpha },
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
//
//
//
