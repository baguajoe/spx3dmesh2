import React, { useEffect, useState, useCallback } from "react";

const SHADER_NODES = ["baseColor","normal","roughness","metallic","emission","mix","math","gradient","noise"];

export default function ShaderGraphPanel({ open, onClose, meshRef, setStatus }) {
  const [nodes, setNodes] = useState([
    { id: 1, type: "baseColor", x: 40, y: 40 },
    { id: 2, type: "roughness", x: 220, y: 140 }
  ]);

  const persist = useCallback((next) => {
    setNodes(next);
    const mesh = meshRef?.current;
    if (mesh?.material) {
      mesh.material.userData.shaderGraph = next;
      mesh.material.needsUpdate = true;
    }
    setStatus?.("Shader graph updated");
  }, [meshRef, setStatus]);

  const addNode = useCallback(() => {
    persist([...nodes, { id: Date.now(), type: "noise", x: 120, y: 120 }]);
  }, [nodes, persist]);

  const updateNode = useCallback((id, patch) => {
    persist(nodes.map(n => n.id === id ? { ...n, ...patch } : n));
  }, [nodes, persist]);

  const removeNode = useCallback((id) => {
    persist(nodes.filter(n => n.id !== id));
  }, [nodes, persist]);

  useEffect(() => {
    if (!open) return;
    const mesh = meshRef?.current;
    const existing = mesh?.material?.userData?.shaderGraph;
    if (existing?.length) setNodes(existing);
  }, [open, meshRef]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 420, zIndex: 52 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">SHADER GRAPH</span>
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
                <span>{node.type}</span>
                <span className="spx-slider-header__val">#{node.id}</span>
              </div>
              <select className="spx-slider-input" value={node.type} onChange={(e)=>updateNode(node.id, { type: e.target.value })}>
                {SHADER_NODES.map(t => <option key={t} value={t}>{t}</option>)}
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
