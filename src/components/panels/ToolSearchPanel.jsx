import React, { useMemo, useState } from "react";

const TOOLS = [
  "camera", "render presets", "lighting presets", "material nodes", "material graph",
  "shader graph", "asset browser", "quick export", "render queue", "lut",
  "color pipeline", "volumetrics", "advanced volumetrics", "film skin", "advanced skin",
  "film hair", "particles", "weather", "destruction", "mocap refine",
  "geometry nodes", "physics framework", "rigging tools", "scene optimizer",
  "texture paint pro", "painterly npr", "compositor", "compositor graph"
];

export default function ToolSearchPanel({ open, onClose, setStatus }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOLS;
    return TOOLS.filter(t => t.includes(q));
  }, [query]);

  const activate = (tool) => {
    window.__SPX_TOOL_SEARCH__ = tool;
    setStatus?.(`Tool search: ${tool}`);
  };

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 65 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">TOOL SEARCH</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <input
          className="spx-slider-input"
          placeholder="search tool..."
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
        />
        <div style={{ display: "grid", gap: 8, maxHeight: 340, overflow: "auto", marginTop: 12 }}>
          {results.map(tool => (
            <div key={tool} className="spx-slider-wrap" style={{ padding: 8 }}>
              <div className="spx-slider-header">
                <span>{tool}</span>
              </div>
              <div className="fcam-focal-chips" style={{ marginTop: 8 }}>
                <button className="fcam-chip" onClick={()=>activate(tool)}>SELECT</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
