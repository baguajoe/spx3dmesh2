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

const S = {
  root: { position:"fixed", top:40, left:200, right:200, bottom:80,
    background:C.bg, border:`1px solid ${C.border}`, borderRadius:8,
    fontFamily:C.font, color:C.text, zIndex:850, display:"flex",
    flexDirection:"column", boxShadow:"0 8px 40px rgba(0,0,0,0.8)" },
  header: { display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
    borderBottom:`1px solid ${C.border}`, flexShrink:0, background:C.panel },
  title: { fontSize:12, fontWeight:700, color:C.teal, letterSpacing:2, flex:1 },
  close: { background:"none", border:"none", color:C.dim, cursor:"pointer", fontSize:16 },
  toolbar: { display:"flex", gap:6, padding:"6px 12px", borderBottom:`1px solid ${C.border}`,
    flexShrink:0, flexWrap:"wrap", alignItems:"center" },
  btn: (active) => ({ background: active ? C.teal : "#161b22",
    color: active ? "#06060f" : C.dim, border:`1px solid ${active ? C.teal : C.border}`,
    borderRadius:4, padding:"4px 10px", fontFamily:C.font, fontSize:10, cursor:"pointer" }),
  btnO: { background:C.orange, color:"#fff", border:"none", borderRadius:4,
    padding:"4px 10px", fontFamily:C.font, fontSize:10, cursor:"pointer" },
  canvas: { flex:1, position:"relative", overflow:"hidden", background:"#030308" },
  sidebar: { width:200, borderLeft:`1px solid ${C.border}`, background:C.panel,
    overflowY:"auto", flexShrink:0 },
  sideSection: { padding:"8px 10px", borderBottom:`1px solid ${C.border}` },
  sideTitle: { fontSize:9, color:C.orange, letterSpacing:2, marginBottom:6, textTransform:"uppercase" },
  nodeCard: { background:C.nodeHeader, border:`1px solid ${C.border}`, borderRadius:4,
    marginBottom:4, overflow:"hidden", cursor:"pointer" },
  nodeCardHeader: (cat) => ({ background:`${CAT_COLORS[cat] || C.teal}22`,
    borderBottom:`1px solid ${CAT_COLORS[cat] || C.teal}44`,
    padding:"3px 7px", fontSize:9, color: CAT_COLORS[cat] || C.teal,
    fontWeight:700, letterSpacing:1 }),
  nodeItem: { padding:"2px 7px 3px", fontSize:9, color:C.dim, cursor:"pointer",
    transition:"background 0.1s" },
  stat: { fontSize:9, color:C.teal, marginBottom:2 },
};

// ── Node visual component ────────────────────────────────────────────────────
function NodeWidget({ node, selected, onSelect, onDelete, onMute, onMove }) {
  const cat = Object.entries(COMPOSITOR_NODE_TYPES)
    .find(([, types]) => types.includes(node.type))?.[0] || "UTILITIES";
  const color = CAT_COLORS[cat] || C.teal;

  return (
    <div
      style={{
        position:"absolute", left:node.position.x, top:node.position.y,
        width:160, background:C.node, border:`1px solid ${selected ? color : C.border}`,
        borderRadius:6, boxShadow: selected ? `0 0 10px ${color}44` : "0 2px 8px rgba(0,0,0,0.5)",
        userSelect:"none", opacity: node.mute ? 0.4 : 1,
      }}
      onClick={() => onSelect(node.id)}
      onMouseDown={e => onMove(e, node.id)}
    >
      {/* Header */}
      <div style={{ background:`${color}22`, borderBottom:`1px solid ${color}44`,
        padding:"4px 8px", display:"flex", alignItems:"center", justifyContent:"space-between",
        borderRadius:"6px 6px 0 0" }}>
        <span style={{ fontSize:9, color, fontWeight:700, letterSpacing:1 }}>{node.type}</span>
        <div style={{ display:"flex", gap:4 }}>
          <button onClick={e=>{e.stopPropagation();onMute(node.id);}}
            style={{ ...S.btn(node.mute), padding:"1px 5px", fontSize:8 }}>
            {node.mute ? "↺" : "M"}
          </button>
          <button onClick={e=>{e.stopPropagation();onDelete(node.id);}}
            style={{ background:"none", border:"none", color:"#ff4444", cursor:"pointer", fontSize:10 }}>✕</button>
        </div>
      </div>
      {/* Inputs */}
      <div style={{ padding:"4px 0" }}>
        {node.inputs.map(inp => (
          <div key={inp.id} style={{ display:"flex", alignItems:"center", padding:"2px 8px", fontSize:9, color:C.dim }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background: inp.connected ? color : C.border,
              border:`1px solid ${color}`, marginRight:5, flexShrink:0 }} />
            {inp.name}
          </div>
        ))}
      </div>
      {/* Params preview */}
      {Object.keys(node.params).length > 0 && (
        <div style={{ padding:"2px 8px 4px", fontSize:8, color:C.dim, borderTop:`1px solid ${C.border}` }}>
          {Object.entries(node.params).slice(0,2).map(([k,v]) => (
            <div key={k}>{k}: <span style={{color:C.teal}}>{JSON.stringify(v).slice(0,12)}</span></div>
          ))}
        </div>
      )}
      {/* Outputs */}
      <div style={{ padding:"4px 0", borderTop:`1px solid ${C.border}` }}>
        {node.outputs.map(out => (
          <div key={out.id} style={{ display:"flex", alignItems:"center", justifyContent:"flex-end",
            padding:"2px 8px", fontSize:9, color:C.dim }}>
            {out.name}
            <div style={{ width:8, height:8, borderRadius:"50%", background:color,
              border:`1px solid ${color}`, marginLeft:5, flexShrink:0 }} />
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
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.title}>⬡ NODE COMPOSITOR</span>
        <span style={{ fontSize:9, color:C.dim }}>{graph.nodes.length} nodes</span>
        <button style={S.close} onClick={onClose}>✕</button>
      </div>

      {/* Toolbar */}
      <div style={S.toolbar}>
        <button style={S.btn(false)} onClick={evaluate}>▶ Evaluate</button>
        <select value={preset} onChange={e => loadPreset(e.target.value)}
          style={{ background:"#0d1117", border:`1px solid ${C.border}`, color:C.text,
            padding:"4px 8px", borderRadius:4, fontFamily:C.font, fontSize:10, cursor:"pointer" }}>
          <option value="">Presets…</option>
          {PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button style={S.btn(false)} onClick={() => setGraph(createCompositorGraph())}>Clear</button>
        {status && <span style={{ fontSize:9, color:C.teal, marginLeft:8 }}>{status}</span>}
      </div>

      {/* Main area */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* Node canvas */}
        <div ref={canvasRef} style={S.canvas}>
          {/* Wire SVG layer */}
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
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
            <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
              fontSize:11, color:C.dim, textAlign:"center" }}>
              Add nodes from the sidebar →
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={S.sidebar}>
          {/* Add nodes */}
          {Object.entries(COMPOSITOR_NODE_TYPES).map(([cat, types]) => (
            <div key={cat} style={S.sideSection}>
              <div style={S.sideTitle}>{cat}</div>
              {types.map(type => (
                <div key={type} style={S.nodeItem}
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
            <div style={S.sideSection}>
              <div style={S.sideTitle}>Params — {selectedNode.type}</div>
              {Object.entries(selectedNode.params).map(([k, v]) => (
                <div key={k} style={{ marginBottom:6 }}>
                  <div style={{ fontSize:9, color:C.dim, marginBottom:2 }}>{k}</div>
                  {typeof v === "number" ? (
                    <input type="number" value={v} step={0.1}
                      onChange={e => setGraph(g => ({
                        ...g,
                        nodes: g.nodes.map(n => n.id === selectedNode.id
                          ? { ...n, params:{ ...n.params, [k]: parseFloat(e.target.value) } } : n)
                      }))}
                      style={{ width:"100%", background:"#0d1117", border:`1px solid ${C.border}`,
                        color:C.text, padding:"2px 6px", borderRadius:3, fontFamily:C.font, fontSize:10 }} />
                  ) : (
                    <div style={{ fontSize:9, color:C.teal }}>{JSON.stringify(v)}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div style={S.sideSection}>
              <div style={S.sideTitle}>Stats</div>
              <div style={S.stat}>Nodes: {stats.nodeCount}</div>
              <div style={S.stat}>Connections: {stats.connectionCount}</div>
              <div style={S.stat}>Muted: {stats.mutedCount}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}