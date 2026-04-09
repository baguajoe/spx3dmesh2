import React, { useMemo, useRef, useState } from "react";
import useDraggablePanel from "../../hooks/useDraggablePanel.js";
import {
  createEmptyPanel,
  addPanel,
  removePanel,
  addPointToPanel,
  updatePointInPanel,
  closePanel,
  toggleMirrorPanel,
  movePanel,
  snapPoint,
  mirrorPanelPoints,
} from "../../mesh/clothing/PatternEditor.js";
import {
  createSeam,
  addSeam,
  removeSeam,
  panelEdges,
  edgeMidpoint,
} from "../../mesh/clothing/SeamStitching.js";
import { addPatternGarmentToScene } from "../../mesh/clothing/PatternBridge.js";

const SIZE = 512;
const GRID = 16;

function findPointHit(panel, x, y, radius = 8) {
  const pts = panel.points || [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dx = p.x - x;
    const dy = p.y - y;
    if (Math.sqrt(dx * dx + dy * dy) <= radius) return i;
  }
  return -1;
}

export default function PatternEditorPanel({ open = false, onClose, sceneRef = null, setStatus = null }) {
  const { beginDrag, style } = useDraggablePanel({ x: 0, y: 0 });

  const svgRef = useRef(null);
  const [panels, setPanels] = useState([createEmptyPanel("Front")]);
  const [activePanelId, setActivePanelId] = useState(null);
  const [dragPoint, setDragPoint] = useState(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [seams, setSeams] = useState([]);
  const [seamPick, setSeamPick] = useState(null);

  const activePanel = useMemo(
    () => panels.find((p) => p.id === activePanelId) || panels[0] || null,
    [panels, activePanelId]
  );

  const getPos = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * SIZE,
      y: ((e.clientY - r.top) / r.height) * SIZE,
    };
  };

  const handleMouseDown = (e) => {
    if (!activePanel) return;
    const p = getPos(e);
    const pointIndex = findPointHit(activePanel, p.x, p.y);

    if (pointIndex >= 0) {
      setDragPoint({ panelId: activePanel.id, pointIndex });
      return;
    }

    const nextPoint = snapEnabled ? snapPoint(p, SIZE / GRID) : p;
    setPanels((prev) => addPointToPanel(prev, activePanel.id, nextPoint));
  };

  const handleMouseMove = (e) => {
    if (!dragPoint) return;
    const p = getPos(e);
    const nextPoint = snapEnabled ? snapPoint(p, SIZE / GRID) : p;
    setPanels((prev) => updatePointInPanel(prev, dragPoint.panelId, dragPoint.pointIndex, nextPoint));
  };

  const handleMouseUp = () => {
    setDragPoint(null);
  };

  const addNewPanel = () => {
    setPanels((prev) => {
      const next = addPanel(prev);
      return next;
    });
  };

  const closeActive = () => {
    if (!activePanel) return;
    setPanels((prev) => closePanel(prev, activePanel.id));
  };

  const mirrorActive = () => {
    if (!activePanel) return;
    setPanels((prev) =>
      prev.map((p) => {
        if (p.id !== activePanel.id) return p;
        const mirrored = toggleMirrorPanel([p], p.id)[0];
        return mirrored.mirrored ? mirrorPanelPoints(mirrored, SIZE / 2) : mirrored;
      })
    );
  };

  const moveActive = (dx, dy) => {
    if (!activePanel) return;
    setPanels((prev) => movePanel(prev, activePanel.id, dx, dy));
  };

  const startSeamPick = (panelId, edgeIndex) => {
    if (!seamPick) {
      setSeamPick({ panelId, edgeIndex });
      return;
    }

    if (seamPick.panelId === panelId && seamPick.edgeIndex === edgeIndex) {
      setSeamPick(null);
      return;
    }

    const seam = createSeam(seamPick.panelId, seamPick.edgeIndex, panelId, edgeIndex);
    setSeams((prev) => addSeam(prev, seam));
    setSeamPick(null);
  };

  const buildGarmentFromPanels = () => {
    const validPanels = panels.filter((p) => (p.points || []).length >= 3 && p.closed);
    if (!validPanels.length) {
      setStatus?.("Need at least one closed panel");
      return;
    }
    addPatternGarmentToScene(sceneRef?.current, validPanels, {});
    setStatus?.("Pattern garment added to scene");
  };

  if (!open) return null;

  return (
    <div className="pattern-panel-float" style={{ ...style }}>
      <div className="pattern-panel">
        <div className="pattern-panel-header" onMouseDown={beginDrag}>
          <div>
            <strong>Pattern Editor</strong>
            <span className="pattern-sub"> draft, stitch, and build garments</span>
          </div>
          <button className="pattern-btn" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="pattern-toolbar">
          <button className="pattern-btn" type="button" onClick={addNewPanel}>Add Panel</button>
          <button className="pattern-btn" type="button" onClick={closeActive}>Close Shape</button>
          <button className="pattern-btn" type="button" onClick={mirrorActive}>Mirror</button>
          <button className="pattern-btn" type="button" onClick={() => moveActive(-10, 0)}>←</button>
          <button className="pattern-btn" type="button" onClick={() => moveActive(10, 0)}>→</button>
          <button className="pattern-btn" type="button" onClick={() => moveActive(0, -10)}>↑</button>
          <button className="pattern-btn" type="button" onClick={() => moveActive(0, 10)}>↓</button>
          <button
            className={`pattern-btn ${snapEnabled ? "is-active" : ""}`}
            type="button"
            onClick={() => setSnapEnabled((v) => !v)}
          >
            Snap
          </button>
          <button className="pattern-btn" type="button" onClick={buildGarmentFromPanels}>
            Build 3D Garment
          </button>
        </div>

        <div className="pattern-body">
          <div className="pattern-sidebar">
            <div className="pattern-sidebar-title">Panels</div>
            {panels.map((panel) => (
              <button
                key={panel.id}
                type="button"
                className={`pattern-list-item ${activePanel?.id === panel.id ? "is-active" : ""}`}
                onClick={() => setActivePanelId(panel.id)}
              >
                <span>{panel.name}</span>
                <span>{panel.points.length} pts</span>
              </button>
            ))}

            <div className="pattern-sidebar-title">Seams</div>
            {seams.map((seam) => (
              <button
                key={seam.id}
                type="button"
                className="pattern-list-item"
                onClick={() => setSeams((prev) => removeSeam(prev, seam.id))}
              >
                <span>{seam.panelA}:{seam.edgeA}</span>
                <span>{seam.panelB}:{seam.edgeB}</span>
              </button>
            ))}

            {activePanel && (
              <button
                className="pattern-btn pattern-btn-danger"
                type="button"
                onClick={() => setPanels((prev) => removePanel(prev, activePanel.id))}
              >
                Remove Active Panel
              </button>
            )}
          </div>

          <div className="pattern-canvas-wrap">
            <svg
              ref={svgRef}
              className="pattern-canvas"
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <rect x="0" y="0" width={SIZE} height={SIZE} fill="#10151c" />
              {Array.from({ length: GRID + 1 }).map((_, i) => {
                const p = (i / GRID) * SIZE;
                return (
                  <g key={i}>
                    <line x1={p} y1={0} x2={p} y2={SIZE} stroke="rgba(255,255,255,0.08)" />
                    <line x1={0} y1={p} x2={SIZE} y2={p} stroke="rgba(255,255,255,0.08)" />
                  </g>
                );
              })}

              {panels.map((panel) => (
                <g key={panel.id}>
                  {(panel.points || []).length >= 2 && (
                    <polyline
                      points={panel.points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill={panel.closed ? "rgba(74,140,255,0.12)" : "none"}
                      stroke={activePanel?.id === panel.id ? "#4a8cff" : "rgba(255,255,255,0.35)"}
                      strokeWidth="2"
                    />
                  )}

                  {panel.closed && panel.points.length >= 3 && (
                    <line
                      x1={panel.points[panel.points.length - 1].x}
                      y1={panel.points[panel.points.length - 1].y}
                      x2={panel.points[0].x}
                      y2={panel.points[0].y}
                      stroke={activePanel?.id === panel.id ? "#4a8cff" : "rgba(255,255,255,0.35)"}
                      strokeWidth="2"
                    />
                  )}

                  {(panel.points || []).map((p, idx) => (
                    <circle
                      key={`${panel.id}-${idx}`}
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill={activePanel?.id === panel.id ? "#9ec5ff" : "#d8dee9"}
                    />
                  ))}

                  {panelEdges(panel).map((edge) => {
                    const m = edgeMidpoint(edge);
                    const picked =
                      seamPick &&
                      seamPick.panelId === panel.id &&
                      seamPick.edgeIndex === edge.index;

                    return (
                      <circle
                        key={`${panel.id}-edge-${edge.index}`}
                        cx={m.x}
                        cy={m.y}
                        r="5"
                        fill={picked ? "#ffb347" : "#6fd3ff"}
                        stroke="#0b1016"
                        strokeWidth="1"
                        onClick={(e) => {
                          e.stopPropagation();
                          startSeamPick(panel.id, edge.index);
                        }}
                      />
                    );
                  })}
                </g>
              ))}

              {seams.map((seam) => {
                const panelA = panels.find((p) => p.id === seam.panelA);
                const panelB = panels.find((p) => p.id === seam.panelB);
                if (!panelA || !panelB) return null;
                const edgeA = panelEdges(panelA).find((e) => e.index === seam.edgeA);
                const edgeB = panelEdges(panelB).find((e) => e.index === seam.edgeB);
                if (!edgeA || !edgeB) return null;
                const a = edgeMidpoint(edgeA);
                const b = edgeMidpoint(edgeB);
                return (
                  <line
                    key={seam.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#ff8f8f"
                    strokeDasharray="6 4"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}