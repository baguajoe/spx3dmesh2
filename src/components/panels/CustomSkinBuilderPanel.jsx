import React, { useState, useCallback, useRef } from "react";

const C = {
  bg:"#06060f", panel:"#0d1117", panel2:"#0a0e18", border:"#1e2535",
  teal:"#00ffc8", orange:"#FF6600", t0:"#f0f4ff", t1:"#b0bcd4", t2:"#6b7a99",
  font:"JetBrains Mono, monospace",
};

const SKIN_TONE_PRESETS = {
  porcelain:{ base:"#f8ede3", scatter:"#ff9980" }, fair:{ base:"#f5d5c0", scatter:"#ff8866" },
  light:    { base:"#edc9a8", scatter:"#e87755" }, medium:{ base:"#d4a574", scatter:"#cc6633" },
  olive:    { base:"#c49a6c", scatter:"#bb5522" }, tan:   { base:"#b8864e", scatter:"#aa4411" },
  brown:    { base:"#8b5e3c", scatter:"#883311" }, dark:  { base:"#4a2810", scatter:"#440011" },
  ebony:    { base:"#2c1608", scatter:"#330011" },
  stone:    { base:"#6b6b5a", scatter:"#888877" }, metal: { base:"#8a9090", scatter:"#aaaaaa" },
  lava:     { base:"#cc2200", scatter:"#ff4400" }, ice:   { base:"#aaccff", scatter:"#ccddff" },
  alien:    { base:"#2a4a20", scatter:"#44ff88" },
};

// ── Drag-based knob ───────────────────────────────────────────────────────────
function Knob({ label, value, min, max, step=0.01, onChange, color=C.teal, unit="" }) {
  const pct = (value - min) / (max - min);
  const angle = -135 + pct * 270;
  const cx=20, cy=20, r=16;
  const toXY = (deg) => {
    const rad = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [sx, sy] = toXY(-135), [ex, ey] = toXY(angle);
  const large = pct > 0.5 ? 1 : 0;

  const onDrag = useCallback((e) => {
    const sy0 = e.clientY, v0 = value;
    const move = (me) => {
      const dy = sy0 - me.clientY;
      const nv = Math.max(min, Math.min(max, v0 + dy * (max-min) * 0.006));
      const rounded = Math.round(nv / step) * step;
      onChange(parseFloat(rounded.toFixed(4)));
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [value, min, max, step, onChange]);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"ns-resize", userSelect:"none", minWidth:52 }}
      onMouseDown={onDrag} title={`${label}: ${value}${unit} (drag to adjust)`}>
      <svg width={40} height={40}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={2.5}/>
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`}
          fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx={ex} cy={ey} r={3} fill={color}/>
        <circle cx={cx} cy={cy} r={4} fill={C.panel2} stroke={C.border} strokeWidth={1}/>
      </svg>
      <div style={{ fontSize:9, color:color, fontFamily:C.font, letterSpacing:"0.05em" }}>
        {typeof value === "number" ? value.toFixed(step < 0.1 ? 2 : 1) : value}{unit}
      </div>
      <div style={{ fontSize:8, color:C.t2, fontFamily:C.font, textAlign:"center", maxWidth:52 }}>{label}</div>
    </div>
  );
}

// ── Color swatch picker ───────────────────────────────────────────────────────
function ColorPicker({ label, value, onChange }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <div style={{ fontSize:9, color:C.t2, fontFamily:C.font }}>{label}</div>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ width:28, height:28, background:value, border:`1px solid ${C.border}`,
          borderRadius:3, cursor:"pointer", position:"relative" }}
          onClick={() => document.getElementById(`cp_${label.replace(/\s/g,'')}`).click()}>
          <input id={`cp_${label.replace(/\s/g,'')}`} type="color" value={value}
            onChange={e => onChange(e.target.value)}
            style={{ opacity:0, position:"absolute", inset:0, cursor:"pointer", width:"100%", height:"100%" }}/>
        </div>
        <span style={{ fontSize:9, color:C.t1, fontFamily:C.font }}>{value}</span>
      </div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
      <span style={{ fontSize:10, color:C.t1, fontFamily:C.font }}>{label}</span>
      <div onClick={() => onChange(!value)} style={{
        width:32, height:16, borderRadius:8, background: value ? C.teal : C.border,
        cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0,
      }}>
        <div style={{
          position:"absolute", top:2, left: value ? 18 : 2, width:12, height:12,
          borderRadius:"50%", background:"white", transition:"left 0.2s",
        }}/>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, color=C.teal, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom:12 }}>
      <div onClick={() => setOpen(v=>!v)} style={{
        display:"flex", alignItems:"center", gap:8, padding:"6px 12px",
        background:C.panel2, borderLeft:`3px solid ${color}`, cursor:"pointer",
        marginBottom: open ? 10 : 0,
      }}>
        <span style={{ fontSize:9, color, fontFamily:C.font, letterSpacing:"0.15em", fontWeight:700, textTransform:"uppercase" }}>
          {open ? "▾" : "▸"} {title}
        </span>
      </div>
      {open && <div style={{ padding:"0 12px" }}>{children}</div>}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function CustomSkinBuilderPanel({ open, onClose, onApply, onDownload }) {
  const [params, setParams] = useState({
    baseColor:        "#d4a574",
    roughness:        0.70,
    metalness:        0.00,
    sssStrength:      0.50,
    sssColor:         "#cc6633",
    sssRadius:        0.60,
    clearcoat:        0.10,
    clearcoatRoughness: 0.30,
    anisotropy:       0.00,
    sheen:            0.00,
    sheenColor:       "#ffffff",
    transmission:     0.00,
    ior:              1.40,
    thickness:        0.50,
    poreScale:        55,
    wrinkleStrength:  0.50,
    displacementDepth:0.05,
    noiseType:        "perlin",
    textureSize:      1024,
    age:              30,
    region:           "face",
    useJimenezSSS:    false,
  });

  const set = (key) => (val) => setParams(p => ({ ...p, [key]: val }));

  const loadPreset = (key) => {
    const preset = SKIN_TONE_PRESETS[key];
    if (preset) setParams(p => ({ ...p, baseColor: preset.base, sssColor: preset.scatter }));
  };

  if (!open) return null;

  return (
    <div style={{
      position:"fixed", top:40, right:0, width:320, bottom:80,
      background:C.bg, border:`1px solid ${C.border}`, borderRadius:"8px 0 0 8px",
      display:"flex", flexDirection:"column", zIndex:900, fontFamily:C.font,
      boxShadow:"-8px 0 40px rgba(0,0,0,0.8)",
    }}>
      {/* Header */}
      <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:"0.15em" }}>CUSTOM SKIN BUILDER</div>
          <div style={{ fontSize:9, color:C.t2, marginTop:2 }}>Full material control</div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:C.t2, cursor:"pointer", fontSize:16 }}>✕</button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex:1, overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:`${C.border} transparent` }}>

        {/* Quick presets */}
        <div style={{ padding:"10px 12px 0" }}>
          <div style={{ fontSize:9, color:C.t2, letterSpacing:"0.15em", marginBottom:6 }}>QUICK TONE PRESETS</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            {Object.entries(SKIN_TONE_PRESETS).map(([key, p]) => (
              <button key={key} onClick={() => loadPreset(key)} style={{
                background: p.base, border:`1px solid ${C.border}`, borderRadius:3,
                width:28, height:28, cursor:"pointer", title:key,
              }} title={key}/>
            ))}
          </div>
        </div>

        {/* Base properties */}
        <Section title="Base" color={C.teal}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:10 }}>
            <ColorPicker label="Base Color" value={params.baseColor} onChange={set("baseColor")}/>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Knob label="Roughness"  value={params.roughness}  min={0} max={1} onChange={set("roughness")}/>
            <Knob label="Metalness"  value={params.metalness}  min={0} max={1} onChange={set("metalness")} color={C.orange}/>
            <Knob label="Clearcoat"  value={params.clearcoat}  min={0} max={1} onChange={set("clearcoat")} color="#4a9eff"/>
            <Knob label="CC Rough"   value={params.clearcoatRoughness} min={0} max={1} onChange={set("clearcoatRoughness")}/>
          </div>
        </Section>

        {/* SSS */}
        <Section title="Subsurface Scattering" color="#ff8866">
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            <ColorPicker label="SSS Color" value={params.sssColor} onChange={set("sssColor")}/>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Knob label="Strength" value={params.sssStrength} min={0} max={1} onChange={set("sssStrength")} color="#ff8866"/>
            <Knob label="Radius"   value={params.sssRadius}   min={0} max={2} onChange={set("sssRadius")}   color="#ff8866"/>
          </div>
          <div style={{ marginTop:10 }}>
            <Toggle label="Jimenez GLSL SSS (film)" value={params.useJimenezSSS} onChange={set("useJimenezSSS")}/>
          </div>
        </Section>

        {/* Surface effects */}
        <Section title="Surface Effects" color="#a78bfa">
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            <ColorPicker label="Sheen Color" value={params.sheenColor} onChange={set("sheenColor")}/>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Knob label="Sheen"      value={params.sheen}      min={0} max={1} onChange={set("sheen")} color="#a78bfa"/>
            <Knob label="Anisotropy" value={params.anisotropy} min={0} max={1} onChange={set("anisotropy")} color="#a78bfa"/>
          </div>
        </Section>

        {/* Transmission */}
        <Section title="Transmission / Glass" color="#4a9eff">
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Knob label="Transmit"  value={params.transmission} min={0} max={1} step={0.01} onChange={set("transmission")} color="#4a9eff"/>
            <Knob label="IOR"       value={params.ior}          min={1} max={2.5} step={0.01} onChange={set("ior")} color="#4a9eff"/>
            <Knob label="Thickness" value={params.thickness}    min={0} max={3}   step={0.1}  onChange={set("thickness")}/>
          </div>
        </Section>

        {/* Texture generation */}
        <Section title="Procedural Texture" color={C.orange}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            <Knob label="Pore Scale"   value={params.poreScale}       min={10} max={120} step={1}   onChange={set("poreScale")} color={C.orange}/>
            <Knob label="Wrinkles"     value={params.wrinkleStrength} min={0}  max={1}   step={0.01} onChange={set("wrinkleStrength")} color={C.orange}/>
            <Knob label="Displace"     value={params.displacementDepth} min={0} max={0.3} step={0.01} onChange={set("displacementDepth")} color={C.orange}/>
            <Knob label="Age"          value={params.age}             min={0}  max={100} step={1}   onChange={set("age")} color={C.orange}/>
          </div>
          {/* Noise type */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:C.t2, marginBottom:4 }}>Noise Type</div>
            <div style={{ display:"flex", gap:4 }}>
              {["perlin","voronoi","cellular"].map(n => (
                <button key={n} onClick={() => set("noiseType")(n)} style={{
                  background: params.noiseType===n ? C.orange : C.panel2,
                  color: params.noiseType===n ? "#fff" : C.t2,
                  border:`1px solid ${params.noiseType===n ? C.orange : C.border}`,
                  padding:"3px 8px", borderRadius:3, fontFamily:C.font, fontSize:9, cursor:"pointer",
                }}>{n}</button>
              ))}
            </div>
          </div>
          {/* Texture size */}
          <div>
            <div style={{ fontSize:9, color:C.t2, marginBottom:4 }}>Texture Size</div>
            <div style={{ display:"flex", gap:4 }}>
              {[512,1024,2048,4096].map(s => (
                <button key={s} onClick={() => set("textureSize")(s)} style={{
                  background: params.textureSize===s ? C.teal : C.panel2,
                  color: params.textureSize===s ? C.bg : C.t2,
                  border:`1px solid ${params.textureSize===s ? C.teal : C.border}`,
                  padding:"3px 6px", borderRadius:3, fontFamily:C.font, fontSize:9, cursor:"pointer",
                }}>{s}</button>
              ))}
            </div>
          </div>
        </Section>

        {/* Region */}
        <Section title="Body Region" color={C.teal}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            {["face","body","hand","lip","ear","nose"].map(r => (
              <button key={r} onClick={() => set("region")(r)} style={{
                background: params.region===r ? C.teal : C.panel2,
                color: params.region===r ? C.bg : C.t2,
                border:`1px solid ${params.region===r ? C.teal : C.border}`,
                padding:"4px 10px", borderRadius:3, fontFamily:C.font, fontSize:9, cursor:"pointer",
                textTransform:"capitalize",
              }}>{r}</button>
            ))}
          </div>
        </Section>

      </div>

      {/* Action buttons */}
      <div style={{ padding:"12px", borderTop:`1px solid ${C.border}`, display:"flex", gap:6, flexShrink:0 }}>
        <button onClick={() => onApply && onApply(params)} style={{
          flex:1, background:C.teal, color:C.bg, border:"none", borderRadius:4,
          padding:"8px", fontFamily:C.font, fontSize:10, fontWeight:700, cursor:"pointer",
          letterSpacing:"0.08em",
        }}>▶ APPLY</button>
        <button onClick={() => onDownload && onDownload(params)} style={{
          flex:1, background:C.panel2, color:C.teal, border:`1px solid ${C.teal}`,
          borderRadius:4, padding:"8px", fontFamily:C.font, fontSize:10, cursor:"pointer",
          letterSpacing:"0.08em",
        }}>⬇ TEXTURES</button>
      </div>
    </div>
  );
}