import React, { useState, useCallback } from "react";
import { FABRIC_LIBRARY, applyFabricToClothState } from "../../mesh/clothing/FabricPresets.js";
import { DEFAULT_COLORWAYS, PATTERN_TYPES, getPatternPreviewCSS, createColorwaySession, addColorwayToSession, removeColorwayFromSession, setActiveColorway } from "../../mesh/clothing/GarmentColorways.js";
import { SIZE_CHARTS, STANDARD_SIZES, generateSizeRun } from "../../mesh/clothing/GarmentGrading.js";
import { downloadFlatSketch, getFlatSketchDataURL } from "../../mesh/clothing/FlatSketchExport.js";

const S = {
  panel: { background: "#0d1117", color: "#c8c8c8", fontFamily: "JetBrains Mono, monospace", fontSize: 11, padding: 10, display: "flex", flexDirection: "column", gap: 8, height: "100%", overflowY: "auto" },
  section: { borderBottom: "1px solid #21262d", paddingBottom: 8, marginBottom: 4 },
  sectionTitle: { color: "#00ffc8", fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  row: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  label: { color: "#8b949e", fontSize: 10, minWidth: 70 },
  btn: { background: "#21262d", border: "1px solid #30363d", color: "#c8c8c8", borderRadius: 3, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontFamily: "JetBrains Mono, monospace" },
  btnActive: { background: "#00ffc820", border: "1px solid #00ffc8", color: "#00ffc8", borderRadius: 3, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontFamily: "JetBrains Mono, monospace" },
  btnOrange: { background: "#FF660015", border: "1px solid #FF6600", color: "#FF6600", borderRadius: 3, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontFamily: "JetBrains Mono, monospace" },
  btnDanger: { background: "#ff000015", border: "1px solid #f85149", color: "#f85149", borderRadius: 3, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontFamily: "JetBrains Mono, monospace" },
  input: { background: "#0d1117", border: "1px solid #30363d", color: "#c8c8c8", borderRadius: 3, padding: "3px 6px", fontSize: 10, fontFamily: "JetBrains Mono, monospace", width: "100%", boxSizing: "border-box" },
  select: { background: "#0d1117", border: "1px solid #30363d", color: "#c8c8c8", borderRadius: 3, padding: "3px 6px", fontSize: 10, fontFamily: "JetBrains Mono, monospace", width: "100%" },
  slider: { width: "100%", accentColor: "#00ffc8" },
  prop: { display: "flex", flexDirection: "column", gap: 2 },
  propRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  val: { color: "#00ffc8", fontSize: 10, minWidth: 30, textAlign: "right" },
  fabricCard: (active) => ({ background: active ? "#00ffc810" : "#161b22", border: `1px solid ${active ? "#00ffc8" : "#21262d"}`, borderRadius: 4, padding: "6px 8px", cursor: "pointer", marginBottom: 4 }),
  colorSwatch: (color, pattern) => ({ width: 24, height: 24, borderRadius: 3, border: "1px solid #30363d", background: getPatternPreviewCSS(pattern, color), cursor: "pointer", flexShrink: 0 }),
  colorwayItem: (active) => ({ background: active ? "#00ffc810" : "#161b22", border: `1px solid ${active ? "#00ffc8" : "#21262d"}`, borderRadius: 3, padding: "4px 6px", display: "flex", gap: 6, alignItems: "center", marginBottom: 3, cursor: "pointer" }),
  sketchPreview: { width: "100%", border: "1px solid #21262d", borderRadius: 4, background: "#f9f9f9", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sizeBtn: (active) => ({ background: active ? "#00ffc820" : "#21262d", border: `1px solid ${active ? "#00ffc8" : "#30363d"}`, color: active ? "#00ffc8" : "#c8c8c8", borderRadius: 3, padding: "2px 6px", cursor: "pointer", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }),
};

export default function FabricPanel({ open = false, clothStateRef, setStatus, panels = [], onPanelsChange }) {
  const [selectedFabric, setSelectedFabric] = useState("cotton");
  if (!open) return null;
  const [fabricProps, setFabricProps] = useState({ ...FABRIC_LIBRARY.cotton });
  const [colorwaySession, setColorwaySession] = useState(() => createColorwaySession("My Garment"));
  const [newCWName, setNewCWName] = useState("");
  const [newCWColor, setNewCWColor] = useState("#FFFFFF");
  const [newCWPattern, setNewCWPattern] = useState("none");
  const [gradingCategory, setGradingCategory] = useState("women");
  const [baseSize, setBaseSize] = useState("M");
  const [targetSizes, setTargetSizes] = useState(["XS", "S", "L", "XL"]);
  const [sketchPreviewURL, setSketchPreviewURL] = useState(null);
  const [activeTab, setActiveTab] = useState("fabric");

  // ── Fabric ─────────────────────────────────────────────────────────────────
  const handleSelectFabric = useCallback((name) => {
    setSelectedFabric(name);
    setFabricProps({ ...FABRIC_LIBRARY[name] });
  }, []);

  const handleApplyFabric = useCallback(() => {
    if (clothStateRef?.current) {
      applyFabricToClothState(clothStateRef.current, selectedFabric);
    }
    setStatus?.(`Fabric applied: ${selectedFabric}`);
  }, [clothStateRef, selectedFabric, setStatus]);

  const handlePropChange = useCallback((key, val) => {
    setFabricProps(prev => ({ ...prev, [key]: parseFloat(val) }));
  }, []);

  // ── Colorways ──────────────────────────────────────────────────────────────
  const handleAddColorway = useCallback(() => {
    if (!newCWName.trim()) return;
    const session = { ...colorwaySession };
    addColorwayToSession(session, newCWName, selectedFabric, newCWColor, newCWPattern === "none" ? null : newCWPattern);
    setColorwaySession(session);
    setNewCWName("");
    setStatus?.(`Colorway added: ${newCWName}`);
  }, [colorwaySession, newCWName, selectedFabric, newCWColor, newCWPattern, setStatus]);

  const handleRemoveColorway = useCallback((id) => {
    const session = { ...colorwaySession };
    removeColorwayFromSession(session, id);
    setColorwaySession(session);
  }, [colorwaySession]);

  const handleSelectColorway = useCallback((id) => {
    const session = { ...colorwaySession };
    const cw = setActiveColorway(session, id);
    setColorwaySession(session);
    if (cw) { setSelectedFabric(cw.fabric); setNewCWColor(cw.color); }
    setStatus?.(`Colorway active: ${cw?.name}`);
  }, [colorwaySession, setStatus]);

  const handleApplyDefaultColorway = useCallback((name) => {
    const cw = DEFAULT_COLORWAYS[name];
    if (!cw) return;
    setSelectedFabric(cw.fabric);
    setNewCWColor(cw.color);
    setNewCWPattern(cw.pattern || "none");
    setStatus?.(`Applied: ${name}`);
  }, [setStatus]);

  // ── Grading ────────────────────────────────────────────────────────────────
  const handleToggleSize = useCallback((size) => {
    setTargetSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  }, []);

  const handleGenerateSizeRun = useCallback(() => {
    if (!panels.length) { setStatus?.("No panels to grade — add pattern panels first"); return; }
    const run = generateSizeRun(panels, gradingCategory, baseSize, targetSizes);
    setStatus?.(`Size run generated: ${Object.keys(run).join(", ")}`);
    console.log("[SPX Fashion] Size run:", run);
  }, [panels, gradingCategory, baseSize, targetSizes, setStatus]);

  // ── Flat sketch ────────────────────────────────────────────────────────────
  const handlePreviewSketch = useCallback(() => {
    const url = getFlatSketchDataURL(panels, { title: colorwaySession.garmentName, size: baseSize });
    setSketchPreviewURL(url);
    setStatus?.("Flat sketch preview generated");
  }, [panels, colorwaySession, baseSize]);

  const handleExportSketch = useCallback(() => {
    downloadFlatSketch(panels, { title: colorwaySession.garmentName, size: baseSize, showSeamAllowance: true, showGrainLine: true, showMeasurements: true });
    setStatus?.("Flat sketch SVG exported");
  }, [panels, colorwaySession, baseSize]);

  const sizes = STANDARD_SIZES[gradingCategory] || [];

  return (
    <div style={S.panel}>
      {/* Tabs */}
      <div style={S.row}>
        {["fabric", "colorways", "grading", "sketch"].map(tab => (
          <button key={tab} style={activeTab === tab ? S.btnActive : S.btn} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Fabric Tab ── */}
      {activeTab === "fabric" && (
        <>
          <div style={S.section}>
            <div style={S.sectionTitle}>Fabric Library</div>
            {Object.entries(FABRIC_LIBRARY).map(([name, props]) => (
              <div key={name} style={S.fabricCard(selectedFabric === name)} onClick={() => handleSelectFabric(name)}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: selectedFabric === name ? "#00ffc8" : "#c8c8c8", fontWeight: 600 }}>{name}</span>
                  <span style={{ color: "#8b949e", fontSize: 9 }}>stiffness: {props.stiffness}</span>
                </div>
                <div style={{ color: "#484f58", fontSize: 9 }}>
                  wrinkle: {props.wrinkle} · thickness: {props.thickness}mm · roughness: {props.roughness}
                </div>
              </div>
            ))}
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>Properties — {selectedFabric}</div>
            {Object.entries(fabricProps).map(([key, val]) => (
              <div key={key} style={S.prop}>
                <div style={S.propRow}>
                  <span style={S.label}>{key}</span>
                  <span style={S.val}>{typeof val === 'number' ? val.toFixed(3) : val}</span>
                </div>
                {typeof val === 'number' && (
                  <input type="range" style={S.slider} min={0} max={key === 'wrinkle' ? 3 : 1} step={0.001}
                    value={val} onChange={e => handlePropChange(key, e.target.value)} />
                )}
              </div>
            ))}
            <button style={S.btnActive} onClick={handleApplyFabric}>⬡ Apply to Garment</button>
          </div>
        </>
      )}

      {/* ── Colorways Tab ── */}
      {activeTab === "colorways" && (
        <>
          <div style={S.section}>
            <div style={S.sectionTitle}>Quick Colorways</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Object.entries(DEFAULT_COLORWAYS).map(([name, cw]) => (
                <div key={name} title={name} style={S.colorSwatch(cw.color, cw.pattern)}
                  onClick={() => handleApplyDefaultColorway(name)} />
              ))}
            </div>
            <div style={{ color: "#484f58", fontSize: 9, marginTop: 4 }}>Click a swatch to apply</div>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>My Colorways</div>
            {colorwaySession.colorways.map(cw => (
              <div key={cw.id} style={S.colorwayItem(cw.id === colorwaySession.activeColorwayId)}
                onClick={() => handleSelectColorway(cw.id)}>
                <div style={S.colorSwatch(cw.color, cw.pattern)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: cw.id === colorwaySession.activeColorwayId ? "#00ffc8" : "#c8c8c8" }}>{cw.name}</div>
                  <div style={{ fontSize: 9, color: "#8b949e" }}>{cw.fabric} · {cw.pattern || "solid"}</div>
                </div>
                <button style={{ ...S.btnDanger, padding: "1px 4px" }}
                  onClick={e => { e.stopPropagation(); handleRemoveColorway(cw.id); }}>✕</button>
              </div>
            ))}
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>Add Colorway</div>
            <input style={S.input} placeholder="Name..." value={newCWName} onChange={e => setNewCWName(e.target.value)} />
            <div style={{ ...S.row, marginTop: 4 }}>
              <span style={S.label}>Color</span>
              <input type="color" value={newCWColor} onChange={e => setNewCWColor(e.target.value)}
                style={{ width: 40, height: 24, border: "none", background: "none", cursor: "pointer" }} />
              <span style={S.val}>{newCWColor}</span>
            </div>
            <div style={{ ...S.row, marginTop: 4 }}>
              <span style={S.label}>Pattern</span>
              <select style={{ ...S.select, width: "auto", flex: 1 }} value={newCWPattern}
                onChange={e => setNewCWPattern(e.target.value)}>
                {PATTERN_TYPES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ width: "100%", height: 24, borderRadius: 3, marginTop: 4, border: "1px solid #30363d", background: getPatternPreviewCSS(newCWPattern, newCWColor) }} />
            <button style={{ ...S.btnActive, marginTop: 4 }} onClick={handleAddColorway}>⊕ Add Colorway</button>
          </div>
        </>
      )}

      {/* ── Grading Tab ── */}
      {activeTab === "grading" && (
        <>
          <div style={S.section}>
            <div style={S.sectionTitle}>Size Chart</div>
            <div style={S.row}>
              {["women", "men", "kids"].map(cat => (
                <button key={cat} style={gradingCategory === cat ? S.btnActive : S.btn}
                  onClick={() => { setGradingCategory(cat); setBaseSize(STANDARD_SIZES[cat][2]); setTargetSizes([]); }}>
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 6 }}>
              <div style={{ color: "#8b949e", fontSize: 9, marginBottom: 4 }}>Base Size</div>
              <div style={S.row}>
                {sizes.map(s => (
                  <button key={s} style={S.sizeBtn(baseSize === s)} onClick={() => setBaseSize(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 6 }}>
              <div style={{ color: "#8b949e", fontSize: 9, marginBottom: 4 }}>Grade To</div>
              <div style={S.row}>
                {sizes.filter(s => s !== baseSize).map(s => (
                  <button key={s} style={S.sizeBtn(targetSizes.includes(s))} onClick={() => handleToggleSize(s)}>{s}</button>
                ))}
              </div>
            </div>
            <button style={{ ...S.btnOrange, marginTop: 8 }} onClick={handleGenerateSizeRun}>
              ⬡ Generate Size Run
            </button>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>Size Reference — {gradingCategory}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
              <thead>
                <tr>
                  <th style={{ color: "#8b949e", textAlign: "left", padding: "2px 4px", borderBottom: "1px solid #21262d" }}>Size</th>
                  {Object.keys(Object.values(SIZE_CHARTS[gradingCategory])[0]).map(k => (
                    <th key={k} style={{ color: "#8b949e", textAlign: "right", padding: "2px 4px", borderBottom: "1px solid #21262d" }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(SIZE_CHARTS[gradingCategory]).map(([size, measurements]) => (
                  <tr key={size} style={{ background: size === baseSize ? "#00ffc810" : "transparent" }}>
                    <td style={{ color: size === baseSize ? "#00ffc8" : "#c8c8c8", padding: "2px 4px", fontWeight: size === baseSize ? 700 : 400 }}>{size}</td>
                    {Object.values(measurements).map((v, i) => (
                      <td key={i} style={{ color: "#8b949e", textAlign: "right", padding: "2px 4px" }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Flat Sketch Tab ── */}
      {activeTab === "sketch" && (
        <>
          <div style={S.section}>
            <div style={S.sectionTitle}>Technical Flat Sketch</div>
            <div style={{ color: "#484f58", fontSize: 9, marginBottom: 6 }}>
              {panels.length} panel{panels.length !== 1 ? "s" : ""} · Size: {baseSize}
            </div>
            <div style={S.row}>
              <button style={S.btn} onClick={handlePreviewSketch}>👁 Preview</button>
              <button style={S.btnOrange} onClick={handleExportSketch}>↓ Export SVG</button>
            </div>
            {sketchPreviewURL && (
              <div style={S.sketchPreview}>
                <img src={sketchPreviewURL} alt="Flat sketch" style={{ maxWidth: "100%", maxHeight: 200 }} />
              </div>
            )}
            {!sketchPreviewURL && (
              <div style={{ ...S.sketchPreview, color: "#484f58", fontSize: 10 }}>
                Click Preview to generate
              </div>
            )}
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>Export Options</div>
            <div style={S.prop}>
              <div style={S.propRow}>
                <span style={S.label}>Garment name</span>
              </div>
              <input style={S.input} value={colorwaySession.garmentName}
                onChange={e => setColorwaySession(s => ({ ...s, garmentName: e.target.value }))} />
            </div>
            <div style={{ color: "#484f58", fontSize: 9, marginTop: 4 }}>
              Exports include: cut lines, seam allowance, grain lines, dart marks, notches, measurements, legend
            </div>
          </div>
        </>
      )}
    </div>
  );
}
