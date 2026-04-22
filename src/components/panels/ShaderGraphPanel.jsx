import React, { useMemo, useRef, useState } from "react";
import "../../styles/spx-tool-panels.css";

const AVAILABLE = [
  "Base Color",
  "Roughness",
  "Normal",
  "Noise",
  "Multiply",
  "Fresnel",
  "Emission",
  "Output"
];

function bezierPath(a, b) {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

export default function ShaderGraphPanel({ meshRef, setStatus }) {
  const [nodes, setNodes] = useState([
    { id: "n1", type: "Base Color", x: 40, y: 40 },
    { id: "n2", type: "Output", x: 260, y: 160 }
  ]);

  const [connections, setConnections] = useState([
    { from: "n1", to: "n2" }
  ]);

  const dragRef = useRef(null);

  const nodeMap = useMemo(() => {
    const map = {};
    nodes.forEach((n) => { map[n.id] = n; });
    return map;
  }, [nodes]);

  const addNode = (type) => {
    const id = `n${Date.now()}`;
    setNodes((prev) => [...prev, { id, type, x: 80 + prev.length * 24, y: 70 + prev.length * 24 }]);
    setStatus?.(`Shader node added: ${type}`);
  };

  const connectLastTwo = () => {
    if (nodes.length < 2) return;
    const a = nodes[nodes.length - 2];
    const b = nodes[nodes.length - 1];
    setConnections((prev) => [...prev, { from: a.id, to: b.id }]);
    setStatus?.(`Connected ${a.type} → ${b.type}`);
  };

  const applyGraph = () => {
    const mesh = meshRef?.current;
    if (!mesh?.material) {
      setStatus?.("Select a mesh first");
      return;
    }
    mesh.material.userData.shaderGraph = { nodes, connections };
    mesh.material.needsUpdate = true;
    window.__SPX_SHADER_GRAPH__ = { nodes, connections };
    setStatus?.("Shader graph applied to material");
  };

  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    const { id, startX, startY, nodeX, nodeY } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, x: nodeX + dx, y: nodeY + dy } : n));
  };

  const onMouseUp = () => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  const startDrag = (e, node) => {
    dragRef.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      nodeX: node.x,
      nodeY: node.y
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="spx-tool-panel">
      <div className="spx-tool-panel__heading">Shader Graph</div>

      <select className="spx-tool-panel__select" defaultValue="" onChange={(e) => e.target.value && addNode(e.target.value)}>
        <option value="" disabled>Add node…</option>
        {AVAILABLE.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>

      <div style={{ position: "relative", height: 320, background: "#121418", border: "1px solid #2d2d2d", borderRadius: 8, overflow: "hidden" }}>
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
          {connections.map((c, i) => {
            const a = nodeMap[c.from];
            const b = nodeMap[c.to];
            if (!a || !b) return null;
            return (
              <path
                key={i}
                d={bezierPath({ x: a.x + 120, y: a.y + 24 }, { x: b.x, y: b.y + 24 })}
                stroke="#8ab4ff"
                strokeWidth="2"
                fill="none"
              />
            );
          })}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            onMouseDown={(e) => startDrag(e, node)}
            style={{
              position: "absolute",
              left: node.x,
              top: node.y,
              width: 120,
              background: "#1c2128",
              border: "1px solid #39424e",
              borderRadius: 8,
              padding: "8px 10px",
              color: "#e6edf3",
              cursor: "grab",
              userSelect: "none",
              boxShadow: "0 4px 10px rgba(0,0,0,0.25)"
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.7 }}>{node.id}</div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{node.type}</div>
          </div>
        ))}
      </div>

      <div className="spx-tool-panel__buttonrow">
        <button className="spx-tool-panel__button" onClick={connectLastTwo}>Connect Last Two</button>
        <button className="spx-tool-panel__button" onClick={applyGraph}>Apply Graph</button>
      </div>
    </div>
  );
}
