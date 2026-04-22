import React, { useEffect, useState, useCallback } from "react";

export default function SmartPresetPanel({ open, onClose, setStatus }) {
  const [presets, setPresets] = useState([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("render");

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("__SPX_SMART_PRESETS__");
      if (raw) setPresets(JSON.parse(raw));
    } catch {}
  }, [open]);

  const persist = useCallback((next) => {
    setPresets(next);
    localStorage.setItem("__SPX_SMART_PRESETS__", JSON.stringify(next));
  }, []);

  const savePreset = useCallback(() => {
    if (!name.trim()) return;
    const next = [...presets, {
      id: Date.now(),
      name: name.trim(),
      category
    }];
    persist(next);
    setName("");
    setStatus?.("Smart preset saved");
  }, [name, category, presets, persist, setStatus]);

  const applyPreset = useCallback((preset) => {
    window.__SPX_SMART_PRESET_ACTIVE__ = preset;
    setStatus?.(`Preset applied: ${preset.name}`);
  }, [setStatus]);

  const removePreset = useCallback((id) => {
    persist(presets.filter(p => p.id !== id));
    setStatus?.("Smart preset removed");
  }, [presets, persist, setStatus]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 66 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">SMART PRESETS</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <input
          className="spx-slider-input"
          placeholder="preset name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />
        <select className="spx-slider-input" value={category} onChange={(e)=>setCategory(e.target.value)} style={{ marginTop: 8 }}>
          <option value="render">render</option>
          <option value="lighting">lighting</option>
          <option value="material">material</option>
          <option value="fx">fx</option>
          <option value="npr">npr</option>
        </select>
        <div className="fcam-focal-chips" style={{ marginTop: 10, marginBottom: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={savePreset}>SAVE</button>
        </div>

        <div style={{ display: "grid", gap: 8, maxHeight: 320, overflow: "auto" }}>
          {presets.map(preset => (
            <div key={preset.id} className="spx-slider-wrap" style={{ padding: 8 }}>
              <div className="spx-slider-header">
                <span>{preset.name}</span>
                <span className="spx-slider-header__val">{preset.category}</span>
              </div>
              <div className="fcam-focal-chips" style={{ marginTop: 8 }}>
                <button className="fcam-chip" onClick={()=>applyPreset(preset)}>APPLY</button>
                <button className="fcam-chip" onClick={()=>removePreset(preset.id)}>REMOVE</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
