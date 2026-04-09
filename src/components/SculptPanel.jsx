import React, { useState } from "react";

// ── Brush definitions ────────────────────────────────────────────────────────
const BRUSHES = [
  { id: "draw",    label: "Draw",    icon: "✏️",  desc: "Pull geometry outward" },
  { id: "clay",    label: "Clay",    icon: "🏺",  desc: "Build up clay-like surface" },
  { id: "smooth",  label: "Smooth",  icon: "〰️",  desc: "Smooth surface (Shift)" },
  { id: "crease",  label: "Crease",  icon: "📐",  desc: "Crease/sharpen edges" },
  { id: "flatten", label: "Flatten", icon: "▬",   desc: "Flatten to plane" },
  { id: "inflate", label: "Inflate", icon: "🫧",  desc: "Inflate volume" },
  { id: "grab",    label: "Grab",    icon: "✋",  desc: "Grab and move" },
  { id: "mask",    label: "Mask",    icon: "🎭",  desc: "Mask vertices" },
  { id: "pinch",   label: "Pinch",   icon: "🤌",  desc: "Pinch geometry together" },
  { id: "elastic", label: "Elastic", icon: "🪢",  desc: "Elastic deform" },
];

const FALLOFFS = ["Smooth", "Sphere", "Root", "Sharp", "Linear", "Constant"];

const ALPHA_PRESETS = [
  { id: "circle",   label: "Circle" },
  { id: "stars",    label: "Stars" },
  { id: "noise",    label: "Noise" },
  { id: "cracks",   label: "Cracks" },
  { id: "fabric",   label: "Fabric" },
  { id: "skin",     label: "Skin" },
];

// ── GP brush types ───────────────────────────────────────────────────────────
const GP_BRUSHES = [
  { id: "gp_draw",   label: "Draw",   icon: "✏️"  },
  { id: "gp_fill",   label: "Fill",   icon: "🪣"  },
  { id: "gp_erase",  label: "Erase",  icon: "⬜"  },
  { id: "gp_tint",   label: "Tint",   icon: "🎨"  },
];

function Slider({ label, value, min, max, step = 0.01, onChange, unit = "" }) {
  return (
    <div className="spnl-row">
      <span className="spnl-label">{label}</span>
      <input className="spnl-slider" type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
      <span className="spnl-value">{typeof value === "number" ? value.toFixed(2) : value}{unit}</span>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spnl-section">
      <button className="spnl-section-header" onClick={() => setOpen(v => !v)}>
        <span className="spnl-section-arrow">{open ? "▾" : "▸"}</span>
        {title}
      </button>
      {open && <div className="spnl-section-body">{children}</div>}
    </div>
  );
}

export function SculptPanel({ onApplyFunction, sculptBrush, setSculptBrush,
  sculptRadius, setSculptRadius, sculptStrength, setSculptStrength,
  sculptFalloff, setSculptFalloff, sculptSymX, setSculptSymX,
  dyntopoEnabled, setDyntopoEnabled,
  vcPaintColor, setVcPaintColor, vcRadius, setVcRadius, vcStrength, setVcStrength,
  gpColor, setGpColor, gpThickness, setGpThickness,
}) {
  const [tab, setTab] = useState("sculpt"); // sculpt | vcolor | grease
  const [invertBrush, setInvertBrush] = useState(false);
  const [lazyMouse, setLazyMouse] = useState(false);
  const [lazyRadius, setLazyRadius] = useState(0.1);
  const [alphaPreset, setAlphaPreset] = useState("circle");
  const [remeshVoxel, setRemeshVoxel] = useState(0.05);
  const [multiresLevel, setMultiresLevel] = useState(0);
  const [vcFalloff, setVcFalloff] = useState("smooth");
  const [vcColor2, setVcColor2] = useState("#00ffc8");
  const [vcBlendMode, setVcBlendMode] = useState("normal");
  const [gpLayer, setGpLayer] = useState("Layer 1");
  const [gpOpacity, setGpOpacity] = useState(1.0);
  const [gpFill, setGpFill] = useState(false);
  const [gpOnionBefore, setGpOnionBefore] = useState(2);
  const [gpOnionAfter, setGpOnionAfter] = useState(1);
  const [gpOnionEnabled, setGpOnionEnabled] = useState(false);

  return (
    <div className="spnl-root">
      {/* Tab bar */}
      <div className="spnl-tabs">
        {[["sculpt","Sculpt"],["vcolor","V.Color"],["grease","Grease Pencil"]].map(([id,lbl]) => (
          <button key={id} className={`spnl-tab${tab===id?" spnl-tab--active":""}`}
            onClick={() => { setTab(id); if(id==="sculpt") onApplyFunction("brush_"+sculptBrush); if(id==="vcolor") onApplyFunction("vc_init"); if(id==="grease") onApplyFunction("gp_layer"); }}>
            {lbl}
          </button>
        ))}
      </div>

      <div className="spnl-body">

        {/* ── SCULPT TAB ── */}
        {tab === "sculpt" && (<>

          <Section title="Brushes">
            <div className="spnl-brush-grid">
              {BRUSHES.map(b => (
                <button key={b.id}
                  className={`spnl-brush-btn${sculptBrush===b.id?" spnl-brush-btn--active":""}`}
                  title={b.desc}
                  onClick={() => { setSculptBrush(b.id); onApplyFunction("brush_"+b.id); }}>
                  <span className="spnl-brush-icon">{b.icon}</span>
                  <span className="spnl-brush-label">{b.label}</span>
                </button>
              ))}
            </div>
            <div className="spnl-row spnl-row--checks">
              <label className="spnl-check">
                <input type="checkbox" checked={invertBrush} onChange={e => setInvertBrush(e.target.checked)} />
                Invert (Ctrl)
              </label>
            </div>
          </Section>

          <Section title="Brush Settings">
            <Slider label="Radius" value={sculptRadius} min={0.01} max={2} step={0.01}
              onChange={v => { setSculptRadius(v); }} />
            <Slider label="Strength" value={sculptStrength} min={0.001} max={1} step={0.001}
              onChange={v => { setSculptStrength(v); }} />
            <div className="spnl-row">
              <span className="spnl-label">Falloff</span>
              <select className="spnl-select" value={sculptFalloff}
                onChange={e => { setSculptFalloff(e.target.value); }}>
                {FALLOFFS.map(f => <option key={f} value={f.toLowerCase()}>{f}</option>)}
              </select>
            </div>
            <div className="spnl-row spnl-row--checks">
              <label className="spnl-check">
                <input type="checkbox" checked={sculptSymX} onChange={e => { setSculptSymX(e.target.checked); onApplyFunction("sculpt_sym_x"); }} />
                Mirror X
              </label>
              <label className="spnl-check">
                <input type="checkbox" checked={lazyMouse} onChange={e => setLazyMouse(e.target.checked)} />
                Lazy Mouse
              </label>
            </div>
            {lazyMouse && (
              <Slider label="Lazy Radius" value={lazyRadius} min={0.01} max={1} step={0.01}
                onChange={setLazyRadius} />
            )}
          </Section>

          <Section title="Alpha Texture">
            <div className="spnl-alpha-grid">
              {ALPHA_PRESETS.map(a => (
                <button key={a.id}
                  className={`spnl-alpha-btn${alphaPreset===a.id?" spnl-alpha-btn--active":""}`}
                  onClick={() => { setAlphaPreset(a.id); onApplyFunction("alpha_"+a.id); }}>
                  {a.label}
                </button>
              ))}
            </div>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("alpha_load")}>
              ↑ Load Custom Alpha
            </button>
          </Section>

          <Section title="Dynamic Topology">
            <div className="spnl-row">
              <button
                className={`spnl-btn-toggle${dyntopoEnabled?" spnl-btn-toggle--on":""}`}
                onClick={() => { setDyntopoEnabled(v => !v); onApplyFunction("dyntopo"); }}>
                {dyntopoEnabled ? "⬤ Dyntopo ON" : "○ Dyntopo OFF"}
              </button>
            </div>
            {dyntopoEnabled && (<>
              <Slider label="Detail" value={remeshVoxel} min={0.01} max={0.2} step={0.005}
                onChange={setRemeshVoxel} />
              <button className="spnl-btn-full" onClick={() => onApplyFunction("dyntopo_flood")}>
                Flood Fill Topology
              </button>
              <button className="spnl-btn-full" onClick={() => onApplyFunction("smooth_topo")}>
                Smooth Topology
              </button>
            </>)}
          </Section>

          <Section title="Remesh">
            <div className="spnl-row">
              <span className="spnl-label">Voxel Size</span>
              <input className="spnl-input" type="number" value={remeshVoxel} step={0.005} min={0.01} max={0.5}
                onChange={e => setRemeshVoxel(Number(e.target.value))} />
            </div>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("voxel_remesh")}>Voxel</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("quad_remesh")}>Quad</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("auto_retopo")}>Auto</button>
            </div>
          </Section>

          <Section title="Multires" defaultOpen={false}>
            <div className="spnl-row">
              <span className="spnl-label">Level</span>
              <span className="spnl-value">{multiresLevel}</span>
            </div>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => { setMultiresLevel(v=>v+1); onApplyFunction("multires_add"); }}>+ Subdivide</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("multires_bake")}>Bake Down</button>
            </div>
            <div className="spnl-btn-row">
              {[0,1,2,3,4].map(l => (
                <button key={l}
                  className={`spnl-btn${multiresLevel===l?" spnl-btn--active":""}`}
                  onClick={() => { setMultiresLevel(l); onApplyFunction("multires_level"); }}>
                  {l}
                </button>
              ))}
            </div>
          </Section>

        </>)}

        {/* ── VERTEX COLOR TAB ── */}
        {tab === "vcolor" && (<>

          <Section title="Paint">
            <div className="spnl-row">
              <span className="spnl-label">Color</span>
              <input type="color" className="spnl-color" value={vcPaintColor}
                onChange={e => setVcPaintColor(e.target.value)} />
              <span className="spnl-value">{vcPaintColor}</span>
            </div>
            <div className="spnl-row">
              <span className="spnl-label">Secondary</span>
              <input type="color" className="spnl-color" value={vcColor2}
                onChange={e => setVcColor2(e.target.value)} />
            </div>
            <Slider label="Radius" value={vcRadius} min={0.1} max={3} step={0.05}
              onChange={v => { setVcRadius(v); }} />
            <Slider label="Strength" value={vcStrength} min={0.01} max={1} step={0.01}
              onChange={v => { setVcStrength(v); }} />
            <div className="spnl-row">
              <span className="spnl-label">Blend</span>
              <select className="spnl-select" value={vcBlendMode}
                onChange={e => setVcBlendMode(e.target.value)}>
                {["normal","multiply","screen","overlay","add","subtract"].map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>
                ))}
              </select>
            </div>
          </Section>

          <Section title="Layer Stack">
            <button className="spnl-btn-full" onClick={() => onApplyFunction("vc_layers")}>
              + Add Layer
            </button>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("vc_fill")}>Fill</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("vc_smear")}>Smear</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("vc_blur")}>Blur</button>
            </div>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("vc_flatten")}>
              Flatten All Layers
            </button>
          </Section>

          <Section title="Fill">
            <button className="spnl-btn-full" onClick={() => onApplyFunction("vc_fill")}>
              Fill with Primary Color
            </button>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("vc_gradient")}>
              Gradient Fill
            </button>
          </Section>

        </>)}

        {/* ── GREASE PENCIL TAB ── */}
        {tab === "grease" && (<>

          <Section title="Draw Mode">
            <div className="spnl-brush-grid">
              {GP_BRUSHES.map(b => (
                <button key={b.id} className="spnl-brush-btn"
                  onClick={() => onApplyFunction(b.id)}>
                  <span className="spnl-brush-icon">{b.icon}</span>
                  <span className="spnl-brush-label">{b.label}</span>
                </button>
              ))}
            </div>
            <div className="spnl-row">
              <span className="spnl-label">Color</span>
              <input type="color" className="spnl-color" value={gpColor}
                onChange={e => setGpColor(e.target.value)} />
              <span className="spnl-value">{gpColor}</span>
            </div>
            <Slider label="Thickness" value={gpThickness} min={1} max={20} step={1}
              onChange={v => setGpThickness(v)} unit="px" />
            <Slider label="Opacity" value={gpOpacity} min={0.1} max={1} step={0.05}
              onChange={setGpOpacity} />
            <div className="spnl-row spnl-row--checks">
              <label className="spnl-check">
                <input type="checkbox" checked={gpFill} onChange={e => setGpFill(e.target.checked)} />
                Fill Strokes
              </label>
            </div>
          </Section>

          <Section title="Layers">
            <div className="spnl-row">
              <span className="spnl-label">Active</span>
              <input className="spnl-input" type="text" value={gpLayer}
                onChange={e => setGpLayer(e.target.value)} />
            </div>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("gp_layer")}>+ Layer</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("gp_stroke")}>+ Frame</button>
            </div>
          </Section>

          <Section title="Onion Skin">
            <div className="spnl-row spnl-row--checks">
              <label className="spnl-check">
                <input type="checkbox" checked={gpOnionEnabled}
                  onChange={e => { setGpOnionEnabled(e.target.checked); onApplyFunction("gp_onion"); }} />
                Enable Onion Skin
              </label>
            </div>
            {gpOnionEnabled && (<>
              <Slider label="Before" value={gpOnionBefore} min={0} max={10} step={1}
                onChange={setGpOnionBefore} unit=" frames" />
              <Slider label="After" value={gpOnionAfter} min={0} max={10} step={1}
                onChange={setGpOnionAfter} unit=" frames" />
            </>)}
          </Section>

          <Section title="Animation">
            <button className="spnl-btn-full" onClick={() => onApplyFunction("gp_interp")}>
              Interpolate Strokes
            </button>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("gp_stroke")}>
              Add Stroke to Frame
            </button>
          </Section>

        </>)}
      </div>
    </div>
  );
}
