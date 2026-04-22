import React, { useEffect, useState, useCallback } from "react";

const NODE_TYPES = ["Input Beauty","Input Depth","Input Normal","Blur","Bloom","Vignette","Color Balance","Mix","Output"];

export default function CompositorGraphPanel({ open, onClose, setStatus }) {
  const [nodes, setNodes] = useState([
    { id: 1, type: "Input Beauty" },
    { id: 2, type: "Bloom" },
    { id: 3, type: "Output" }
  ]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("__SPX_COMPOSITOR_GRAPH__");
      if (raw) setNodes(JSON.parse(raw));
    } catch {}
  }, [open]);

  const persist = useCallback((next) => {
    setNodes(next);
    localStorage.setItem("__SPX_COMPOSITOR_GRAPH__", JSON.stringify(next));
    window.__SPX_COMPOSITOR_GRAPH__ = next;
    setStatus?.("Compositor graph updated");
  }, [setStatus]);

  const addNode = useCallback(() => {
    persist([...nodes, { id: Date.now(), type: "Blur" }]);
  }, [nodes, persist]);

  const updateNode = useCallback((id, type) => {
    persist(nodes.map(n => n.id === id ? { ...n, type } : n));
  }, [nodes, persist]);

  const removeNode = useCallback((id) => {
    persist(nodes.filter(n => n.id !== id));
  }, [nodes, persist]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 400, zIndex: 55 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">COMPOSITOR GRAPH</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <div className="fcam-focal-chips" style={{ marginBottom: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={addNode}>ADD NODE</button>
        </div>
        <div style={{ display: "grid", gap: 8, maxHeight: 340, overflow: "auto" }}>
          {nodes.map(node => (
            <div key={node.id} className="spx-slider-wrap" style={{ padding: 8 }}>
              <div className="spx-slider-header">
                <span>{node.type}</span>
                <span className="spx-slider-header__val">#{node.id}</span>
              </div>
              <select className="spx-slider-input" value={node.type} onChange={(e)=>updateNode(node.id, e.target.value)}>
                {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
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
