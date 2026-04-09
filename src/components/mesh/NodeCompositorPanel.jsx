import React, { useState, useRef, useCallback } from "react";
import {
  COMPOSITOR_NODE_TYPES, createCompositorGraph, createCompositorNode,
  addCompositorNode, removeCompositorNode, connectCompositorNodes,
  disconnectInput, muteCompositorNode, evaluateCompositorGraph,
  applyCompositorPreset, getCompositorStats,
} from "../../mesh/NodeCompositor.js";

const C = {
  bg:"#06060f", panel:"#0d1117", border:"#21262d",
  teal:"#00ffc8", orange:"#FF6600", text:"#e0e0e0", dim:"#8b949e",
  font:"JetBrains Mono, monospace",
  node:"#0d1117", nodeHeader:"#161b22", wire:"#00ffc8",
};

const CAT_COLORS = {
  INPUT:"#4a9eff", OUTPUT:"#ff6b6b", COLOR:"#ffd93d",
  FILTER:"#a29bfe", MATTE:"#00ffc8", TRANSFORM:"#FF6600", UTILITIES:"#c3cfe2",
};

const PRESETS = ["Beauty Pass","Toon Composite","Film Grade","Night Vision","Infrared","Bleach Bypass","Cross Process"];

// ── Node visual component ────────────────────────────────────────────────────
function NodeWidget({ node, selected, onSelect, onDelete, onMute, onMove }) {
  const cat = Object.entries(COMPOSITOR_NODE_TYPES)
    .find(([, types]) => types.includes(node.type))?.[0] || "UTILITIES";
  const color = CAT_COLORS[cat] || C.teal;

  return (
    <div
        className={`nc-node-widget${selected?' nc-node-widget--selected':''}${node.mute?' nc-node-widget--muted':''}`}
      style={{ left:node.position.x, top:node.position.y, '--node-color': color }}
      onClick={() => onSelect(node.id)}
      onMouseDown={e => onMove(e, node.id)}
    >
      {/* Header */}
      <div className="nc-node-header" style={{ background:`${color}22`, borderBottom:`1px solid ${color}44` }}>
        <span className="nc-node-type" style={{ color }}>{node.type}</span>
        <div className="nc-node-btns">
          <button onClick={e=>{e.stopPropagation();onMute(node.id);}}
            className={`nc-node-mute-btn${node.mute?' nc-node-mute-btn--on':''}`}>
            {node.mute ? "↺" : "M"}
          </button>
          <button onClick={e=>{e.stopPropagation();onDelete(node.id);}}
            className="nc-node-del">✕</button>
        </div>
      </div>
      {/* Inputs */}
      <div className="nc-node-ports">
        {node.inputs.map(inp => (
          <div key={inp.id} className="nc-port-row">
            <div className="nc-port-dot" style={{ background: inp.connected ? color : '#21262d', border:`1px solid ${color}` }} />
            {inp.name}
          </div>
        ))}
      </div>
      {/* Params preview */}
      {Object.keys(node.params).length > 0 && (
        <div className="nc-node-params">
          {Object.entries(node.params).slice(0,2).map(([k,v]) => (
            <div key={k}>{k}: <span className="nc-param-val">{JSON.stringify(v).slice(0,12)}</span></div>
          ))}
        </div>
      )}
      {/* Outputs */}
      <div className="nc-node-ports nc-node-ports--out">
        {node.outputs.map(out => (
          <div key={out.id} className="nc-port-row nc-port-row--out">
            {out.name}
            <div className="nc-port-dot" style={{ background:color, border:`1px solid ${color}` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function NodeCompositorPanel({ open, onClose }) {
  const [graph, setGraph] = useState(() => {
    const g = createCompositorGraph();
    // Default nodes
    const rl = createCompositorNode("RenderLayer", { position:{ x:20, y:80 } });
    const comp = createCompositorNode("Composite", { position:{ x:420, y:80 } });
    g.nodes.push(rl, comp);
    return g;
  });
  const [selected, setSelected] = useState(null);
  const [preset, setPreset] = useState("");
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("");
  const canvasRef = useRef(null);
  const dragging = useRef(null);
  const dragOffset = useRef({ x:0, y:0 });

  const addNode = (type) => {
    setGraph(g => {
      const node = createCompositorNode(type, { position:{ x: 60 + Math.random()*300, y: 60 + Math.random()*200 } });
      return { ...g, nodes: [...g.nodes, node] };
    });
  };

  const deleteNode = (id) => {
    setGraph(g => ({ ...g, nodes: g.nodes.filter(n => n.id !== id) }));
    if (selected === id) setSelected(null);
  };

  const muteNode = (id) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id === id ? { ...n, mute: !n.mute } : n)
    }));
  };

  const onMove = (e, id) => {
    const node = graph.nodes.find(n => n.id === id);
    if (!node) return;
    dragging.current = id;
    dragOffset.current = { x: e.clientX - node.position.x, y: e.clientY - node.position.y };
    const onMouseMove = (me) => {
      if (!dragging.current) return;
      setGraph(g => ({
        ...g,
        nodes: g.nodes.map(n => n.id === dragging.current
          ? { ...n, position:{ x: me.clientX - dragOffset.current.x, y: me.clientY - dragOffset.current.y } }
          : n)
      }));
    };
    const onMouseUp = () => { dragging.current = null; window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const evaluate = () => {
    const s = getCompositorStats(graph);
    setStats(s);
    setStatus(`✓ Evaluated — ${s.nodeCount} nodes, ${s.connectionCount} connections`);
  };

  const loadPreset = (name) => {
    if (!name) return;
    const g = applyCompositorPreset(name);
    setGraph(g);
    setPreset(name);
    setStatus(`✓ Preset: ${name}`);
  };

  const selectedNode = graph.nodes.find(n => n.id === selected);

  if (!open) return null;

  return (
    <div className="nc-root">
      {/* Header */}
      <div className="nc-header">
        <span className="nc-title">⬡ NODE COMPOSITOR</span>
        <span className="nc-node-count">{graph.nodes.length} nodes</span>
        <button className="nc-close" onClick={onClose}>✕</button>
      </div>

      {/* Toolbar */}
      <div className="nc-toolbar">
        <button className="nc-btn" onClick={evaluate}>▶ Evaluate</button>
        <select value={preset} onChange={e => loadPreset(e.target.value)} className="nc-select">
          <option value="">Presets…</option>
          {PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="nc-btn" onClick={() => setGraph(createCompositorGraph())}>Clear</button>
        {status && <span className="nc-status">{status}</span>}
      </div>

      {/* Main area */}
      <div className="nc-main">

        {/* Node canvas */}
        <div ref={canvasRef} className="nc-canvas">
          {/* Wire SVG layer */}
          <svg className="nc-wire-svg">
            {graph.connections && graph.connections.map((conn, i) => {
              const fromNode = graph.nodes.find(n => n.id === conn.fromNodeId);
              const toNode = graph.nodes.find(n => n.id === conn.toNodeId);
              if (!fromNode || !toNode) return null;
              const x1 = fromNode.position.x + 160, y1 = fromNode.position.y + 40;
              const x2 = toNode.position.x, y2 = toNode.position.y + 40;
              return (
                <path key={i}
                  d={`M${x1},${y1} C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}`}
                  fill="none" stroke={C.teal} strokeWidth={1.5} opacity={0.6}
                  strokeDasharray={conn.active === false ? "4,4" : "none"} />
              );
            })}
          </svg>
          {/* Nodes */}
          {graph.nodes.map(node => (
            <NodeWidget key={node.id} node={node}
              selected={selected === node.id}
              onSelect={setSelected} onDelete={deleteNode}
              onMute={muteNode} onMove={onMove} />
          ))}
          {graph.nodes.length === 0 && (
            <div className="nc-empty">
              Add nodes from the sidebar →
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="nc-sidebar">
          {/* Add nodes */}
          {Object.entries(COMPOSITOR_NODE_TYPES).map(([cat, types]) => (
            <div key={cat} className="nc-side-section">
              <div className="nc-side-title">{cat}</div>
              {types.map(type => (
                <div key={type} className="nc-node-item"
                  onClick={() => addNode(type)}
                  onMouseEnter={e => e.currentTarget.style.background = "#161b22"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  + {type}
                </div>
              ))}
            </div>
          ))}

          {/* Selected node params */}
          {selectedNode && (
            <div className="nc-side-section">
              <div className="nc-side-title">Params — {selectedNode.type}</div>
              {Object.entries(selectedNode.params).map(([k, v]) => (
                <div key={k} className="nc-param-edit">
                  <div className="nc-param-label">{k}</div>
                  {typeof v === "number" ? (
                    <input type="number" value={v} step={0.1}
                      onChange={e => setGraph(g => ({
                        ...g,
                        nodes: g.nodes.map(n => n.id === selectedNode.id
                          ? { ...n, params:{ ...n.params, [k]: parseFloat(e.target.value) } } : n)
                      }))}
                      className="nc-param-input" />
                  ) : (
                    <div className="nc-param-val">{JSON.stringify(v)}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="nc-side-section">
              <div className="nc-side-title">Stats</div>
              <div className="nc-stat">Nodes: {stats.nodeCount}</div>
              <div className="nc-stat">Connections: {stats.connectionCount}</div>
              <div className="nc-stat">Muted: {stats.mutedCount}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}