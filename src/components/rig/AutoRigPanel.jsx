import React, { useMemo, useState } from "react";
import useDraggablePanel from "../../hooks/useDraggablePanel.js";
import { runAutoRig } from "../../mesh/rig/AutoRigSystem.js";
import { createDefaultRigGuides, mirrorGuidePoint, guidesToRigSettings } from "../../mesh/rig/AutoRigGuides.js";

const GUIDE_SIZE = 420;

export default function AutoRigPanel({ open = false, onClose, sceneRef = null, setStatus = null }) {
  const { beginDrag, style } = useDraggablePanel({ x: 0, y: 0 });

  const [guides, setGuides] = useState(createDefaultRigGuides());
  const [mirrorMode, setMirrorMode] = useState(true);
  const [dragKey, setDragKey] = useState(null);
  const derived = useMemo(() => guidesToRigSettings(guides), [guides]);

  const getPos = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * GUIDE_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * GUIDE_SIZE,
    };
  };

  const updateGuide = (key, point) => {
    setGuides((prev) => {
      const next = { ...prev, [key]: point };
      if (mirrorMode) {
        const mirrored = mirrorGuidePoint(key, point, next);
        if (mirrored) next[mirrored.mirrorKey] = mirrored.mirrorPoint;
      }
      return next;
    });
  };

  const handleMouseDown = (key) => (e) => {
    e.stopPropagation();
    setDragKey(key);
  };

  const handleMouseMove = (e) => {
    if (!dragKey) return;
    updateGuide(dragKey, getPos(e));
  };

  const handleMouseUp = () => setDragKey(null);

  const buildAutoRig = () => {
    const result = runAutoRig(sceneRef?.current, {
      spineCount: derived.spineCount,
      armSegments: derived.armSegments,
      legSegments: derived.legSegments,
      scale: derived.scale,
      guides,
    });

    if (result.ok) {
      setStatus?.(`Auto rig created from guides: ${result.boneCount} bones`);
    } else {
      setStatus?.(result.reason || "Auto rig failed");
    }
  };

  if (!open) return null;

  return (
    <div className="autorig-panel-float" style={{ ...style }}>
      <div className="autorig-panel autorig-panel-wide">
        <div className="autorig-panel-header" onMouseDown={beginDrag}>
          <div>
            <strong>Auto Rig</strong>
            <span className="autorig-panel-sub"> visual guide placement + one-click build</span>
          </div>
          <button className="autorig-btn" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="autorig-visual-layout">
          <div className="autorig-guide-wrap">
            <div className="autorig-guide-title">Guide Placement</div>

            <svg
              className="autorig-guide-canvas"
              viewBox={`0 0 ${GUIDE_SIZE} ${GUIDE_SIZE}`}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <rect x="0" y="0" width={GUIDE_SIZE} height={GUIDE_SIZE} fill="#10151c" />
              <line x1="210" y1="20" x2="210" y2="400" stroke="rgba(255,255,255,0.12)" strokeDasharray="5 4" />

              <line x1={guides.head.x} y1={guides.head.y} x2={guides.neck.x} y2={guides.neck.y} className="autorig-guide-line" />
              <line x1={guides.neck.x} y1={guides.neck.y} x2={guides.chest.x} y2={guides.chest.y} className="autorig-guide-line" />
              <line x1={guides.chest.x} y1={guides.chest.y} x2={guides.spine.x} y2={guides.spine.y} className="autorig-guide-line" />
              <line x1={guides.spine.x} y1={guides.spine.y} x2={guides.hips.x} y2={guides.hips.y} className="autorig-guide-line" />

              <line x1={guides.shoulder_l.x} y1={guides.shoulder_l.y} x2={guides.elbow_l.x} y2={guides.elbow_l.y} className="autorig-guide-line" />
              <line x1={guides.elbow_l.x} y1={guides.elbow_l.y} x2={guides.wrist_l.x} y2={guides.wrist_l.y} className="autorig-guide-line" />
              <line x1={guides.shoulder_r.x} y1={guides.shoulder_r.y} x2={guides.elbow_r.x} y2={guides.elbow_r.y} className="autorig-guide-line" />
              <line x1={guides.elbow_r.x} y1={guides.elbow_r.y} x2={guides.wrist_r.x} y2={guides.wrist_r.y} className="autorig-guide-line" />

              <line x1={guides.hip_l.x} y1={guides.hip_l.y} x2={guides.knee_l.x} y2={guides.knee_l.y} className="autorig-guide-line" />
              <line x1={guides.knee_l.x} y1={guides.knee_l.y} x2={guides.ankle_l.x} y2={guides.ankle_l.y} className="autorig-guide-line" />
              <line x1={guides.hip_r.x} y1={guides.hip_r.y} x2={guides.knee_r.x} y2={guides.knee_r.y} className="autorig-guide-line" />
              <line x1={guides.knee_r.x} y1={guides.knee_r.y} x2={guides.ankle_r.x} y2={guides.ankle_r.y} className="autorig-guide-line" />

              {Object.entries(guides).map(([key, p]) => (
                <g key={key}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="8"
                    className="autorig-guide-point"
                    onMouseDown={handleMouseDown(key)}
                  />
                  <text x={p.x + 10} y={p.y - 10} className="autorig-guide-label">
                    {key}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="autorig-controls">
            <div className="autorig-guide-title">Rig Settings</div>

            <label className="autorig-field">
              <span>Mirror Mode</span>
              <button className={`autorig-btn ${mirrorMode ? "is-active" : ""}`} type="button" onClick={() => setMirrorMode((v) => !v)}>
                {mirrorMode ? "Mirror ON" : "Mirror OFF"}
              </button>
            </label>

            <label className="autorig-field">
              <span>Derived Spine Count</span>
              <input className="autorig-input" readOnly value={derived.spineCount} />
            </label>

            <label className="autorig-field">
              <span>Derived Arm Segments</span>
              <input className="autorig-input" readOnly value={derived.armSegments} />
            </label>

            <label className="autorig-field">
              <span>Derived Leg Segments</span>
              <input className="autorig-input" readOnly value={derived.legSegments} />
            </label>

            <label className="autorig-field">
              <span>Derived Rig Scale</span>
              <input className="autorig-input" readOnly value={derived.scale.toFixed(2)} />
            </label>

            <button className="autorig-btn" type="button" onClick={() => setGuides(createDefaultRigGuides())}>
              Reset Guides
            </button>

            <button className="autorig-btn autorig-build-btn" type="button" onClick={buildAutoRig}>
              Build Auto Rig From Guides
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}