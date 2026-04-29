import React, { useState, useCallback, useMemo } from 'react';
import {
  NODE_TYPES,
  createGraph,
  addNode,
  connectNodes,
  evaluateGraph,
} from '../../mesh/GeometryNodes.js';

const C = {
  bg: '#06060f',
  panel: '#0d1117',
  border: '#21262d',
  teal: '#00ffc8',
  orange: '#FF6600',
  pink: '#ff44aa',
  text: '#e0e0e0',
  dim: '#8b949e',
  font: 'JetBrains Mono,monospace',
};

const ALL_TYPES = Object.values(NODE_TYPES || {}).sort();

const shortId = (id) => (id || '').replace(/^node_/, '#');

export default function GeometryNodesPanel({ meshRef, setStatus, onClose }) {
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const [pickType, setPickType] = useState(ALL_TYPES[0] || 'MESH_PRIMITIVE');
  const [showConnect, setShowConnect] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [fromPort, setFromPort] = useState('geometry');
  const [toPort, setToPort] = useState('geometry');

  if (!window._geoNodeGraph) window._geoNodeGraph = createGraph();
  const graph = window._geoNodeGraph;

  const allNodeIds = useMemo(
    () => Array.from(graph.nodes.keys()),
    [graph, graph.nodes.size, graph.connections.length]
  );

  const orderedIds = useMemo(() => {
    if (graph.nodes.size === 0) return [];
    let rootId = null;
    graph.nodes.forEach((n, id) => {
      if (n.type === 'GROUP_OUTPUT') rootId = id;
    });
    if (!rootId) rootId = allNodeIds[allNodeIds.length - 1];
    try {
      const order = graph.getExecutionOrder(rootId);
      const seen = new Set(order);
      allNodeIds.forEach((id) => {
        if (!seen.has(id)) order.push(id);
      });
      return order;
    } catch (e) {
      return allNodeIds.slice();
    }
  }, [graph, allNodeIds]);

  const orderedNodes = orderedIds
    .map((id) => ({ id, node: graph.nodes.get(id) }))
    .filter((x) => x.node);

  const nodeLabel = (id) => {
    const n = graph.nodes.get(id);
    if (!n) return id;
    return n.type + ' ' + shortId(id);
  };

  const handleAdd = () => {
    const id = addNode(graph, pickType, {});
    if (!id) {
      setStatus && setStatus('Unknown node type: ' + pickType);
      return;
    }
    setStatus && setStatus('Added ' + pickType + ' (' + shortId(id) + ')');
    bump();
  };

  const handleRemove = (id) => {
    graph.removeNode(id);
    setStatus && setStatus('Removed node');
    bump();
  };

  const handleParams = () => {
    setStatus && setStatus('Params editor coming soon');
  };

  const handleConnect = () => {
    if (!fromId || !toId) {
      setStatus && setStatus('Pick both source and target nodes');
      return;
    }
    if (fromId === toId) {
      setStatus && setStatus('Cannot connect a node to itself');
      return;
    }
    connectNodes(graph, fromId, fromPort || 'geometry', toId, toPort || 'geometry');
    setStatus && setStatus('Connected ' + nodeLabel(fromId) + '.' + fromPort + ' -> ' + nodeLabel(toId) + '.' + toPort);
    bump();
  };

  const handleDisconnect = (idx) => {
    if (idx < 0 || idx >= graph.connections.length) return;
    graph.connections.splice(idx, 1);
    bump();
  };

  const handleEvaluate = () => {
    if (graph.nodes.size === 0) {
      setStatus && setStatus('Graph is empty');
      return;
    }
    let rootId = null;
    graph.nodes.forEach((n, id) => {
      if (n.type === 'GROUP_OUTPUT') rootId = id;
    });
    if (!rootId) rootId = allNodeIds[allNodeIds.length - 1];
    const initial = {};
    const target = meshRef && meshRef.current;
    if (target && target.geometry) initial.geometry = target.geometry;
    try {
      const result = evaluateGraph(graph, rootId, initial);
      if (result && result.geometry && target && target.isMesh) {
        target.geometry.dispose();
        target.geometry = result.geometry;
        setStatus && setStatus('Graph evaluated -> mesh updated');
      } else {
        setStatus && setStatus('Graph evaluated (no geometry output)');
      }
    } catch (e) {
      console.warn('Graph evaluate failed:', e);
      setStatus && setStatus('Eval error: ' + e.message);
    }
    bump();
  };

  const handleClear = () => {
    window._geoNodeGraph = createGraph();
    setStatus && setStatus('Graph cleared');
    bump();
  };

  const selectStyle = {
    flex: 1,
    background: C.bg,
    color: C.text,
    border: '1px solid ' + C.border,
    borderRadius: 4,
    padding: 4,
    fontFamily: C.font,
    fontSize: 10,
    minWidth: 0,
  };

  const inputStyle = {
    width: 80,
    background: C.bg,
    color: C.text,
    border: '1px solid ' + C.border,
    borderRadius: 4,
    padding: 4,
    fontFamily: C.font,
    fontSize: 10,
  };

  return (
    <div className="spnl-panel-container" style={{ maxWidth: 360 }}>
      <div className="spnl-panel-hdr">
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: C.orange,
            boxShadow: '0 0 6px ' + C.orange,
          }}
        />
        <span className="spnl-hdr-title" style={{ color: C.orange }}>
          GEOMETRY NODES
        </span>
        {onClose && (
          <span onClick={onClose} className="spnl-close">
            ×
          </span>
        )}
      </div>

      <div className="spnl-panel-scroll">
        <div style={{ marginBottom: 4, fontSize: 9, color: C.dim }}>
          Nodes:{' '}
          <span style={{ color: C.teal }}>{graph.nodes.size}</span>{' '}
          · Connections:{' '}
          <span style={{ color: C.teal }}>{graph.connections.length}</span>
        </div>

        <div className="spnl-row" style={{ gap: 4 }}>
          <select
            value={pickType}
            onChange={(e) => setPickType(e.target.value)}
            style={selectStyle}
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            style={{
              padding: '4px 10px',
              background: 'rgba(255,102,0,0.1)',
              border: '1px solid ' + C.orange,
              borderRadius: 4,
              color: C.orange,
              cursor: 'pointer',
              fontFamily: C.font,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            + ADD
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 9, color: C.dim }}>
          NODES (execution order)
        </div>
        <div style={{ marginTop: 4 }}>
          {orderedNodes.length === 0 && (
            <div
              style={{
                padding: 12,
                color: C.dim,
                fontSize: 10,
                textAlign: 'center',
                border: '1px dashed ' + C.border,
                borderRadius: 4,
              }}
            >
              Graph is empty
            </div>
          )}
          {orderedNodes.map(({ id, node }, i) => (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: 6,
                marginBottom: 4,
                background: C.bg,
                border: '1px solid ' + C.border,
                borderRadius: 4,
              }}
            >
              <span style={{ color: C.dim, fontSize: 9, width: 18 }}>{i + 1}.</span>
              <span style={{ flex: 1, color: C.teal, fontFamily: C.font, fontSize: 10 }}>
                {node.type}
                <span style={{ color: C.dim, marginLeft: 6 }}>{shortId(id)}</span>
              </span>
              <button
                onClick={handleParams}
                title="params (stub)"
                style={{
                  padding: '2px 6px',
                  background: 'transparent',
                  border: '1px solid ' + C.border,
                  borderRadius: 3,
                  color: C.dim,
                  cursor: 'pointer',
                  fontSize: 9,
                }}
              >
                ⚙
              </button>
              <button
                onClick={() => handleRemove(id)}
                title="remove"
                style={{
                  padding: '2px 6px',
                  background: 'transparent',
                  border: '1px solid ' + C.border,
                  borderRadius: 3,
                  color: C.pink,
                  cursor: 'pointer',
                  fontSize: 9,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 8, display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            onClick={() => setShowConnect((v) => !v)}
            style={{
              flex: 1,
              padding: 6,
              background: showConnect ? 'rgba(0,255,200,0.15)' : 'rgba(0,255,200,0.05)',
              border: '1px solid ' + C.teal,
              borderRadius: 4,
              color: C.teal,
              cursor: 'pointer',
              fontFamily: C.font,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {showConnect ? '▾ CONNECT NODES' : '▸ CONNECT NODES'}
          </button>
        </div>

        {showConnect && (
          <div
            style={{
              marginTop: 4,
              padding: 6,
              border: '1px solid ' + C.border,
              borderRadius: 4,
              background: C.bg,
            }}
          >
            <div style={{ fontSize: 9, color: C.dim, marginBottom: 4 }}>FROM</div>
            <div className="spnl-row" style={{ gap: 4, marginBottom: 4 }}>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                style={selectStyle}
              >
                <option value="">— pick source —</option>
                {orderedNodes.map(({ id }) => (
                  <option key={id} value={id}>
                    {nodeLabel(id)}
                  </option>
                ))}
              </select>
              <input
                value={fromPort}
                onChange={(e) => setFromPort(e.target.value)}
                placeholder="port"
                style={inputStyle}
              />
            </div>
            <div style={{ fontSize: 9, color: C.dim, marginBottom: 4 }}>TO</div>
            <div className="spnl-row" style={{ gap: 4, marginBottom: 4 }}>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                style={selectStyle}
              >
                <option value="">— pick target —</option>
                {orderedNodes.map(({ id }) => (
                  <option key={id} value={id}>
                    {nodeLabel(id)}
                  </option>
                ))}
              </select>
              <input
                value={toPort}
                onChange={(e) => setToPort(e.target.value)}
                placeholder="port"
                style={inputStyle}
              />
            </div>
            <button
              onClick={handleConnect}
              style={{
                width: '100%',
                padding: 6,
                background: 'rgba(0,255,200,0.1)',
                border: '1px solid ' + C.teal,
                borderRadius: 4,
                color: C.teal,
                cursor: 'pointer',
                fontFamily: C.font,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              + CONNECT
            </button>
          </div>
        )}

        <div style={{ marginTop: 8, fontSize: 9, color: C.dim }}>CONNECTIONS</div>
        <div style={{ marginTop: 4 }}>
          {graph.connections.length === 0 && (
            <div
              style={{
                padding: 8,
                color: C.dim,
                fontSize: 10,
                textAlign: 'center',
                border: '1px dashed ' + C.border,
                borderRadius: 4,
              }}
            >
              No connections
            </div>
          )}
          {graph.connections.map((c, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: 6,
                marginBottom: 4,
                background: C.bg,
                border: '1px solid ' + C.border,
                borderRadius: 4,
              }}
            >
              <span style={{ flex: 1, color: C.teal, fontFamily: C.font, fontSize: 9 }}>
                {nodeLabel(c.fromId)}
                <span style={{ color: C.dim }}>.{c.fromPort}</span>
                <span style={{ color: C.orange, margin: '0 4px' }}>→</span>
                {nodeLabel(c.toId)}
                <span style={{ color: C.dim }}>.{c.toPort}</span>
              </span>
              <button
                onClick={() => handleDisconnect(i)}
                title="disconnect"
                style={{
                  padding: '2px 6px',
                  background: 'transparent',
                  border: '1px solid ' + C.border,
                  borderRadius: 3,
                  color: C.pink,
                  cursor: 'pointer',
                  fontSize: 9,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="spnl-row" style={{ gap: 4, marginTop: 8 }}>
          <button
            onClick={handleEvaluate}
            style={{
              flex: 1,
              padding: 6,
              background: 'rgba(0,255,200,0.1)',
              border: '1px solid ' + C.teal,
              borderRadius: 4,
              color: C.teal,
              cursor: 'pointer',
              fontFamily: C.font,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ▶ EVALUATE GRAPH
          </button>
          <button
            onClick={handleClear}
            style={{
              flex: 1,
              padding: 6,
              background: 'rgba(255,68,170,0.1)',
              border: '1px solid ' + C.pink,
              borderRadius: 4,
              color: C.pink,
              cursor: 'pointer',
              fontFamily: C.font,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ✕ CLEAR ALL
          </button>
        </div>

        <div
          style={{
            marginTop: 8,
            padding: 8,
            background: C.bg,
            borderRadius: 4,
            border: '1px solid ' + C.border,
            fontSize: 8,
            color: C.dim,
            lineHeight: 1.6,
          }}
        >
          <div style={{ color: C.teal, fontWeight: 700, marginBottom: 4 }}>
            HOW TO USE
          </div>
          1. Pick a node type, click ADD
          <br />
          2. Open CONNECT NODES, pick source & target with ports
          <br />
          3. EVALUATE GRAPH bakes the result into mesh.geometry
          <br />
          4. Default port for most nodes is "geometry"
        </div>
      </div>
    </div>
  );
}
