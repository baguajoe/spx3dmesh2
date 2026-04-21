import React, { useEffect, useState, useCallback } from "react";

const NODE_TYPES = [
  "color",
  "texture",
  "noise",
  "gradient",
  "normal",
  "roughness",
  "metallic",
  "mix",
  "multiply",
  "clamp"
];

export default function MaterialGraphPanel({ open, onClose, meshRef, setStatus }) {
  const [nodes, setNodes] = useState([
    { id: 1, type: "color", value: "#cccccc" },
    { id: 2, type: "roughness", value: 0.5 }
  ]);

  const persist = useCallback((next) => {
    setNodes(next);
    const mesh = meshRef?.current;
    if (mesh?.material) {
      mesh.material.userData.materialGraph = next;
      mesh.material.needsUpdate = true;
    }
    setStatus?.("Material graph updated");
  }, [meshRef, setStatus]);

  const addNode = useCallback(() => {
    persist([...nodes, { id: Date.now(), type: "noise", value: 0.5 }]);
  }, [nodes, persist]);

  const removeNode = useCallback((id) => {
    persist(nodes.filter(n => n.id !== id));
  }, [nodes, persist]);

  const updateNode = useCallback((id, patch) => {
    persist(nodes.map(n => n.id === id ? { ...n, ...patch } : n));
  }, [nodes, persist]);

  useEffect(() => {
    if (!open) return;
    const mesh = meshRef?.current;
    const existing = mesh?.material?.userData?.materialGraph;
    if (existing?.length) setNodes(existing);
  }, [open, meshRef]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 380, zIndex: 50 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">MATERIAL GRAPH</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <div className="fcam-focal-chips" style={{ marginBottom: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={addNode}>ADD NODE</button>
        </div>

        <div style={{ display: "grid", gap: 8, maxHeight: 340, overflow: "auto" }}>
          {nodes.map(node => (
            <div key={node.id} className="spx-slider-wrap" style={{ padding: 8 }}>
              <div className="spx-slider-header">
                <span>{node.type.toUpperCase()}</span>
                <span className="spx-slider-header__val">#{node.id}</span>
              </div>

              <select className="spx-slider-input" value={node.type} onChange={(e)=>updateNode(node.id, { type: e.target.value })}>
                {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {typeof node.value === "string" && node.value.startsWith("#") ? (
                <input className="spx-slider-input" type="color" value={node.value} onChange={(e)=>updateNode(node.id, { value: e.target.value })} style={{ marginTop: 8 }} />
              ) : (
                <input className="spx-slider-input" type="range" min="0" max="1" step="0.01" value={parseFloat(node.value || 0)} onChange={(e)=>updateNode(node.id, { value: parseFloat(e.target.value) })} style={{ marginTop: 8 }} />
              )}

              <div className="fcam-focal-chips" style={{ marginTop: 8 }}>
                <button className="fcam-chip" onClick={()=>removeNode(node.id)}>REMOVE</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
