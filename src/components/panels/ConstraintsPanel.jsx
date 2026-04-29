import React, { useState, useCallback } from 'react';
import {
  CONSTRAINT_TYPES,
  createConstraint,
  applyAllConstraints,
} from '../../mesh/ConstraintSystem.js';

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

const VISIBLE_TYPES = [
  'lookAt',
  'floor',
  'stretchTo',
  'copyLocation',
  'copyRotation',
  'copyScale',
  'limitLocation',
  'dampedTrack',
];

const NEEDS_TARGET = new Set([
  'lookAt',
  'stretchTo',
  'copyLocation',
  'copyRotation',
  'copyScale',
  'dampedTrack',
]);

export default function ConstraintsPanel({ meshRef, sceneObjects, setStatus, onClose }) {
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const [pickType, setPickType] = useState(VISIBLE_TYPES[0]);
  const [targetId, setTargetId] = useState('');

  const target = meshRef && meshRef.current;
  if (target && !target.userData) target.userData = {};
  if (target && target.userData && !target.userData.constraints) {
    target.userData.constraints = [];
  }
  const constraints = target && target.userData ? target.userData.constraints : [];

  const objList = Array.isArray(sceneObjects) ? sceneObjects : [];
  const targetable = objList.filter((o) => o && o.mesh && o.mesh !== target);
  const targetLabel = (id) => {
    const o = objList.find((x) => x && x.id === id);
    if (!o) return id ? '(missing)' : '—';
    return o.name || (o.id ? String(o.id).slice(0, 8) : 'object');
  };

  const handleAdd = () => {
    if (!target) {
      setStatus && setStatus('No mesh selected');
      return;
    }
    if (NEEDS_TARGET.has(pickType) && !targetId) {
      setStatus && setStatus('Pick a target object first');
      return;
    }
    const c = createConstraint(pickType, targetId || null, {});
    target.userData.constraints.push(c);
    setStatus && setStatus('Added ' + (CONSTRAINT_TYPES[pickType] && CONSTRAINT_TYPES[pickType].label || pickType));
    bump();
  };

  const handleRemove = (id) => {
    if (!target || !target.userData || !target.userData.constraints) return;
    target.userData.constraints = target.userData.constraints.filter((c) => c.id !== id);
    bump();
  };
  
  const handleToggle = (id) => {
    if (!target || !target.userData || !target.userData.constraints) return;
    const c = target.userData.constraints.find((x) => x.id === id);
    if (c) c.enabled = !c.enabled;
    bump();
  };

  const handleApplyAll = () => {
    if (!target) {
      setStatus && setStatus('No mesh selected');
      return;
    }
    if (!constraints.length) {
      setStatus && setStatus('No constraints to apply');
      return;
    }
    try {
      applyAllConstraints(constraints, target, objList);
      setStatus && setStatus('Applied ' + constraints.length + ' constraint(s)');
    } catch (e) {
      console.warn('Constraint apply failed:', e);
      setStatus && setStatus('Constraint apply error: ' + e.message);
    }
    bump();
  };

  const handleClear = () => {
    if (!target || !target.userData) return;
    target.userData.constraints = [];
    setStatus && setStatus('Constraints cleared');
    bump();
  };

  return (
    <div className="spnl-panel-container" style={{ maxWidth: 340 }}>
      <div className="spnl-panel-hdr">
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: C.teal,
            boxShadow: '0 0 6px ' + C.teal,
          }}
        />
        <span className="spnl-hdr-title" style={{ color: C.teal }}>
          CONSTRAINTS
        </span>
        {onClose && (
          <span onClick={onClose} className="spnl-close">
            ×
          </span>
        )}
      </div>

      <div className="spnl-panel-scroll">
        <div style={{ marginBottom: 4, fontSize: 9, color: C.dim }}>
          Active mesh:{' '}
          <span style={{ color: target ? C.teal : C.pink }}>
            {target ? (target.name || target.uuid.slice(0, 8)) : 'none'}
          </span>
        </div>

        <div className="spnl-row" style={{ gap: 4 }}>
          <select
            value={pickType}
            onChange={(e) => setPickType(e.target.value)}
            style={{
              flex: 1,
              background: C.bg,
              color: C.text,
              border: '1px solid ' + C.border,
              borderRadius: 4,
              padding: 4,
              fontFamily: C.font,
              fontSize: 10,
            }}
          >
            {VISIBLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {(CONSTRAINT_TYPES[t] && CONSTRAINT_TYPES[t].icon) || ''}{' '}
                {(CONSTRAINT_TYPES[t] && CONSTRAINT_TYPES[t].label) || t}
              </option>
            ))}
          </select>
        </div>

        {NEEDS_TARGET.has(pickType) && (
          <div className="spnl-row" style={{ gap: 4, marginTop: 4 }}>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              style={{
                flex: 1,
                background: C.bg,
                color: C.text,
                border: '1px solid ' + C.border,
                borderRadius: 4,
                padding: 4,
                fontFamily: C.font,
                fontSize: 10,
              }}
            >
              <option value="">— pick target —</option>
              {targetable.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || String(o.id).slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="spnl-row" style={{ gap: 4, marginTop: 4 }}>
          <button
            onClick={handleAdd}
            style={{
              flex: 1,
              padding: '6px 10px',
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
            + ADD CONSTRAINT
          </button>
        </div>

        <div style={{ marginTop: 8 }}>
          {constraints.length === 0 && (
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
              No constraints
            </div>
          )}
          {constraints.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: 6,
                marginBottom: 4,
                background: C.bg,
                border: '1px solid ' + C.border,
                borderRadius: 4,
                opacity: c.enabled === false ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 12 }}>
                {(CONSTRAINT_TYPES[c.type] && CONSTRAINT_TYPES[c.type].icon) || ''}
              </span>
              <span style={{ flex: 1, color: C.teal, fontFamily: C.font, fontSize: 10 }}>
                {(CONSTRAINT_TYPES[c.type] && CONSTRAINT_TYPES[c.type].label) || c.type}
                {NEEDS_TARGET.has(c.type) && (
                  <span style={{ color: C.dim, marginLeft: 6 }}>
                    → {targetLabel(c.targetId)}
                  </span>
                )}
              </span>
              <button
                onClick={() => handleToggle(c.id)}
                title="enable / disable"
                style={{
                  padding: '2px 6px',
                  background: 'transparent',
                  border: '1px solid ' + C.border,
                  borderRadius: 3,
                  color: c.enabled === false ? C.dim : C.orange,
                  cursor: 'pointer',
                  fontSize: 9,
                }}
              >
                {c.enabled === false ? '○' : '⟏'}
              </button>
              <button
                onClick={() => handleRemove(c.id)}
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

        <div className="spnl-row" style={{ gap: 4, marginTop: 8 }}>
          <button
            onClick={handleApplyAll}
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
            ▶ APPLY ALL
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
          1. Select a mesh in the scene
          <br />
          2. Pick a constraint type, then a target
          <br />
          3. ADD CONSTRAINT — stored on mesh.userData.constraints
          <br />
          4. APPLY ALL evaluates the stack against the current target poses
        </div>
      </div>
    </div>
  );
}
