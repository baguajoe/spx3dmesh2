import React, { useState } from "react";

const MATERIAL_PRESETS = [
  { id: "chrome",      label: "Chrome",       color: "#c8c8c8" },
  { id: "rust",        label: "Rust",         color: "#8b4513" },
  { id: "gold",        label: "Gold",         color: "#ffd700" },
  { id: "concrete",    label: "Concrete",     color: "#808080" },
  { id: "wood",        label: "Wood",         color: "#8b6914" },
  { id: "fabric",      label: "Fabric",       color: "#6b8cba" },
  { id: "plastic",     label: "Plastic",      color: "#2ecc71" },
  { id: "skin",        label: "Skin",         color: "#e8c49a" },
  { id: "glass",       label: "Glass",        color: "#aaddff" },
  { id: "emissive",    label: "Emissive",     color: "#ff6600" },
];

const LAYER_BLEND_MODES = ["Normal","Multiply","Screen","Overlay","Add","Subtract","Darken","Lighten"];

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

export function ShadingPanel({ onApplyFunction }) {
  const [tab, setTab] = useState("texpaint"); // texpaint | materials | udim | bake
  
  // Texture paint
  const [paintColor, setPaintColor] = useState("#ff0000");
  const [paintRadius, setPaintRadius] = useState(20);
  const [paintOpacity, setPaintOpacity] = useState(1.0);
  const [paintHardness, setPaintHardness] = useState(0.8);
  const [paintMode, setPaintMode] = useState("paint"); // paint | fill | erase | smear | clone
  const [layers, setLayers] = useState([
    { id: 1, name: "Base Color", visible: true, opacity: 1, blend: "Normal" },
    { id: 2, name: "Roughness",  visible: true, opacity: 1, blend: "Normal" },
    { id: 3, name: "Normal",     visible: true, opacity: 1, blend: "Normal" },
  ]);
  const [activeLayer, setActiveLayer] = useState(1);
  const [canvasSize, setCanvasSize] = useState(1024);

  // Materials
  const [activeMat, setActiveMat] = useState("chrome");
  const [matRoughness, setMatRoughness] = useState(0.5);
  const [matMetalness, setMatMetalness] = useState(0.0);
  const [matColor, setMatColor] = useState("#888888");
  const [matEmissive, setMatEmissive] = useState("#000000");
  const [matEmissiveInt, setMatEmissiveInt] = useState(0);
  const [matOpacity, setMatOpacity] = useState(1.0);
  const [matWireframe, setMatWireframe] = useState(false);

  // UDIM
  const [udimTiles, setUdimTiles] = useState(4);
  const [activeTile, setActiveTile] = useState(1001);

  // Bake
  const [bakeRes, setBakeRes] = useState(1024);
  const [bakeSamples, setBakeSamples] = useState(16);
  const [bakeTypes, setBakeTypes] = useState({ ao: true, normal: true, curvature: false, color: false });

  const addLayer = () => {
    const newId = Date.now();
    setLayers(l => [...l, { id: newId, name: `Layer ${l.length + 1}`, visible: true, opacity: 1, blend: "Normal" }]);
  };

  return (
    <div className="spnl-root">
      <div className="spnl-tabs" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
        {[["texpaint","Texture"],["materials","Material"],["udim","UDIM"],["bake","Bake"]].map(([id,lbl]) => (
          <button key={id} className={`spnl-tab${tab===id?" spnl-tab--active":""}`}
            onClick={() => setTab(id)}>
            {lbl}
          </button>
        ))}
      </div>

      <div className="spnl-body">

        {/* ── TEXTURE PAINT (Substance Painter style) ── */}
        {tab === "texpaint" && (<>

          <Section title="Paint Tools">
            <div className="spnl-brush-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
              {[["paint","🖌️","Paint"],["fill","🪣","Fill"],["erase","⬜","Erase"],["smear","💧","Smear"],["clone","📋","Clone"]].map(([id,icon,lbl]) => (
                <button key={id}
                  className={`spnl-brush-btn${paintMode===id?" spnl-brush-btn--active":""}`}
                  onClick={() => setPaintMode(id)}>
                  <span className="spnl-brush-icon">{icon}</span>
                  <span className="spnl-brush-label">{lbl}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Brush">
            <div className="spnl-row">
              <span className="spnl-label">Color</span>
              <input type="color" className="spnl-color" value={paintColor}
                onChange={e => setPaintColor(e.target.value)} />
              <span className="spnl-value">{paintColor}</span>
            </div>
            <Slider label="Radius" value={paintRadius} min={1} max={200} step={1}
              onChange={setPaintRadius} unit="px" />
            <Slider label="Opacity" value={paintOpacity} min={0.01} max={1} step={0.01}
              onChange={setPaintOpacity} />
            <Slider label="Hardness" value={paintHardness} min={0} max={1} step={0.01}
              onChange={setPaintHardness} />
          </Section>

          <Section title="Canvas">
            <div className="spnl-row">
              <span className="spnl-label">Resolution</span>
              <select className="spnl-select" value={canvasSize}
                onChange={e => setCanvasSize(Number(e.target.value))}>
                {[512,1024,2048,4096].map(s => <option key={s} value={s}>{s}×{s}</option>)}
              </select>
            </div>
            <button className="spnl-btn-full spnl-btn-accent"
              onClick={() => onApplyFunction("tp_canvas")}>
              ✚ New Canvas
            </button>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("tp_fill")}>Fill</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("tp_export")}>Export</button>
            </div>
          </Section>

          <Section title="Layer Stack">
            <div className="spnl-layer-list">
              {layers.map(layer => (
                <div key={layer.id}
                  className={`spnl-layer-row${activeLayer===layer.id?" spnl-layer-row--active":""}`}
                  onClick={() => setActiveLayer(layer.id)}>
                  <button className="spnl-layer-vis"
                    onClick={e => { e.stopPropagation(); setLayers(l => l.map(x => x.id===layer.id ? {...x, visible:!x.visible} : x)); }}>
                    {layer.visible ? "●" : "○"}
                  </button>
                  <span className="spnl-layer-name">{layer.name}</span>
                  <select className="spnl-layer-blend"
                    value={layer.blend}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setLayers(l => l.map(x => x.id===layer.id ? {...x, blend:e.target.value} : x))}>
                    {LAYER_BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input className="spnl-layer-opacity" type="range" min="0" max="1" step="0.05"
                    value={layer.opacity}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setLayers(l => l.map(x => x.id===layer.id ? {...x, opacity:Number(e.target.value)} : x))} />
                </div>
              ))}
            </div>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={addLayer}>+ Add</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("tp_flatten")}>Flatten</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("tp_export")}>Export</button>
            </div>
          </Section>

        </>)}

        {/* ── MATERIALS ── */}
        {tab === "materials" && (<>

          <Section title="Material Presets">
            <div className="spnl-mat-grid">
              {MATERIAL_PRESETS.map(m => (
                <button key={m.id}
                  className={`spnl-mat-btn${activeMat===m.id?" spnl-mat-btn--active":""}`}
                  onClick={() => { setActiveMat(m.id); onApplyFunction("mat_smart"); }}
                  style={{ "--mat-color": m.color }}>
                  <span className="spnl-mat-swatch" style={{ background: m.color }} />
                  <span className="spnl-mat-label">{m.label}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="PBR Properties">
            <div className="spnl-row">
              <span className="spnl-label">Base Color</span>
              <input type="color" className="spnl-color" value={matColor}
                onChange={e => setMatColor(e.target.value)} />
            </div>
            <Slider label="Roughness" value={matRoughness} min={0} max={1} step={0.01}
              onChange={setMatRoughness} />
            <Slider label="Metalness" value={matMetalness} min={0} max={1} step={0.01}
              onChange={setMatMetalness} />
            <Slider label="Opacity" value={matOpacity} min={0} max={1} step={0.01}
              onChange={setMatOpacity} />
            <div className="spnl-row">
              <span className="spnl-label">Emissive</span>
              <input type="color" className="spnl-color" value={matEmissive}
                onChange={e => setMatEmissive(e.target.value)} />
            </div>
            <Slider label="Emissive Int." value={matEmissiveInt} min={0} max={5} step={0.1}
              onChange={setMatEmissiveInt} />
            <div className="spnl-row spnl-row--checks">
              <label className="spnl-check">
                <input type="checkbox" checked={matWireframe}
                  onChange={e => { setMatWireframe(e.target.checked); onApplyFunction("toggleWireframe"); }} />
                Wireframe
              </label>
            </div>
            <button className="spnl-btn-full spnl-btn-accent"
              onClick={() => onApplyFunction("mat_pbr")}>
              Apply PBR Material
            </button>
          </Section>

          <Section title="Special Materials" defaultOpen={false}>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("mat_sss")}>SSS Skin</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("mat_glass")}>Glass</button>
            </div>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("sh_toon")}>Toon</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("sh_holo")}>Holo</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("sh_dissolve")}>Dissolve</button>
            </div>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("sh_outline")}>
              NPR Outline
            </button>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("mat_edge_wear")}>Edge Wear</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("mat_cavity")}>Cavity Dirt</button>
            </div>
          </Section>

        </>)}

        {/* ── UDIM ── */}
        {tab === "udim" && (<>

          <Section title="UDIM Layout">
            <div className="spnl-row">
              <span className="spnl-label">Tiles</span>
              <select className="spnl-select" value={udimTiles}
                onChange={e => setUdimTiles(Number(e.target.value))}>
                {[1,2,4,8,16].map(n => <option key={n} value={n}>{n} tile{n>1?"s":""}</option>)}
              </select>
            </div>
            <button className="spnl-btn-full spnl-btn-accent"
              onClick={() => onApplyFunction("udim_layout")}>
              Create UDIM Layout
            </button>
          </Section>

          <Section title="Tile Grid">
            <div className="spnl-udim-grid">
              {Array.from({length: udimTiles}, (_, i) => 1001 + i).map(tile => (
                <button key={tile}
                  className={`spnl-udim-tile${activeTile===tile?" spnl-udim-tile--active":""}`}
                  onClick={() => setActiveTile(tile)}>
                  {tile}
                </button>
              ))}
            </div>
            <div className="spnl-row">
              <span className="spnl-label">Active Tile</span>
              <span className="spnl-value">{activeTile}</span>
            </div>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("udim_paint")}>Paint Tile</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("udim_atlas")}>Build Atlas</button>
            </div>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("udim_export")}>
              Export All Tiles
            </button>
          </Section>

          <Section title="UV Unwrap" defaultOpen={false}>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("uv_box")}>Box</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("uv_sphere")}>Sphere</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("uv_planar")}>Planar</button>
            </div>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("udim_remap")}>
              Remap UVs to UDIM
            </button>
          </Section>

        </>)}

        {/* ── BAKE ── */}
        {tab === "bake" && (<>

          <Section title="Bake Settings">
            <div className="spnl-row">
              <span className="spnl-label">Resolution</span>
              <select className="spnl-select" value={bakeRes}
                onChange={e => setBakeRes(Number(e.target.value))}>
                {[256,512,1024,2048,4096].map(s => <option key={s} value={s}>{s}px</option>)}
              </select>
            </div>
            <div className="spnl-row">
              <span className="spnl-label">Samples</span>
              <select className="spnl-select" value={bakeSamples}
                onChange={e => setBakeSamples(Number(e.target.value))}>
                {[4,8,16,32,64,128].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </Section>

          <Section title="Bake Maps">
            {[["ao","Ambient Occlusion"],["normal","Normal Map"],["curvature","Curvature"],["color","Vertex Color"]].map(([id,lbl]) => (
              <div key={id} className="spnl-row spnl-row--checks">
                <label className="spnl-check">
                  <input type="checkbox"
                    checked={bakeTypes[id]}
                    onChange={e => setBakeTypes(b => ({...b, [id]: e.target.checked}))} />
                  {lbl}
                </label>
              </div>
            ))}
            <button className="spnl-btn-full spnl-btn-accent"
              onClick={() => {
                if (bakeTypes.ao) onApplyFunction("bake_ao");
                if (bakeTypes.normal) onApplyFunction("bake_normal");
                if (bakeTypes.curvature) onApplyFunction("bake_curvature");
                if (bakeTypes.color) onApplyFunction("bake_all");
              }}>
              ▶ Bake Selected Maps
            </button>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("bake_ao")}>AO</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("bake_normal")}>Normal</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("bake_curvature")}>Curve</button>
            </div>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("bake_all")}>
              Bake All Maps
            </button>
          </Section>

        </>)}
      </div>
    </div>
  );
}
