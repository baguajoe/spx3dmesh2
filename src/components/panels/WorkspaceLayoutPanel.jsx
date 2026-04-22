import React, { useEffect, useState, useCallback } from "react";

const DEFAULT_LAYOUTS = [
  { id: "modeling", name: "Modeling", panels: ["materialNode", "assetBrowser"] },
  { id: "sculpt", name: "Sculpt", panels: ["texturePaintPro", "sceneOptimizer"] },
  { id: "animation", name: "Animation", panels: ["riggingTools", "mocapRefine"] },
  { id: "shading", name: "Shading", panels: ["colorPipeline", "lut", "compositor"] }
];

export default function WorkspaceLayoutPanel({ open, onClose, setStatus }) {
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUTS);
  const [layoutName, setLayoutName] = useState("");

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("__SPX_LAYOUTS__");
      if (raw) setLayouts(JSON.parse(raw));
    } catch {}
  }, [open]);

  const persist = useCallback((next) => {
    setLayouts(next);
    localStorage.setItem("__SPX_LAYOUTS__", JSON.stringify(next));
  }, []);

  const saveLayout = useCallback(() => {
    if (!layoutName.trim()) return;
    const next = [
      ...layouts,
      { id: Date.now().toString(), name: layoutName.trim(), panels: [] }
    ];
    persist(next);
    setLayoutName("");
    setStatus?.("Workspace layout saved");
  }, [layoutName, layouts, persist, setStatus]);

  const applyLayout = useCallback((layout) => {
    window.__SPX_ACTIVE_LAYOUT__ = layout;
    setStatus?.(`Workspace layout: ${layout.name}`);
  }, [setStatus]);

  const removeLayout = useCallback((id) => {
    persist(layouts.filter(l => l.id !== id));
    setStatus?.("Workspace layout removed");
  }, [layouts, persist, setStatus]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 64 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">WORKSPACE LAYOUTS</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <input
          className="spx-slider-input"
          placeholder="new layout name"
          value={layoutName}
          onChange={(e)=>setLayoutName(e.target.value)}
        />
        <div className="fcam-focal-chips" style={{ marginTop: 10, marginBottom: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={saveLayout}>SAVE LAYOUT</button>
        </div>
        <div style={{ display: "grid", gap: 8, maxHeight: 320, overflow: "auto" }}>
          {layouts.map(layout => (
            <div key={layout.id} className="spx-slider-wrap" style={{ padding: 8 }}>
              <div className="spx-slider-header">
                <span>{layout.name}</span>
                <span className="spx-slider-header__val">{layout.panels?.length || 0} panels</span>
              </div>
              <div className="fcam-focal-chips" style={{ marginTop: 8 }}>
                <button className="fcam-chip" onClick={()=>applyLayout(layout)}>APPLY</button>
                <button className="fcam-chip" onClick={()=>removeLayout(layout.id)}>REMOVE</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
