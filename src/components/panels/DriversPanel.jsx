import React, { useState, useCallback, useMemo } from 'react';
import {
  DRIVER_TYPES,
  DRIVER_PRESETS,
  createDriver,
  applyAllDrivers,
} from '../../mesh/DriverSystem.js';

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

const TARGET_PROPS = [
  { ui: 'position.x', engine: 'pos.x' },
  { ui: 'position.y', engine: 'pos.y' },
  { ui: 'position.z', engine: 'pos.z' },
  { ui: 'rotation.x', engine: 'rot.x' },
  { ui: 'rotation.y', engine: 'rot.y' },
  { ui: 'rotation.z', engine: 'rot.z' },
  { ui: 'scale.x',    engine: 'scale.x' },
  { ui: 'scale.y',    engine: 'scale.y' },
  { ui: 'scale.z',    engine: 'scale.z' },
];

const ENGINE_TO_UI = TARGET_PROPS.reduce((m, p) => { m[p.engine] = p.ui; return m; }, {});
const TYPE_KEYS = Object.keys(DRIVER_TYPES || {});
const PRESET_KEYS = Object.keys(DRIVER_PRESETS || {});

export default function DriversPanel({ meshRef, sceneObjects, currentFrame, setStatus, onClose }) {
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const [targetProp, setTargetProp] = useState(TARGET_PROPS[0].engine);
  const [expression, setExpression] = useState('sin(frame * 0.1)');
  const [driverType, setDriverType] = useState(TYPE_KEYS[0] || 'scripted');

  const target = meshRef && meshRef.current;
  if (target && !target.userData) target.userData = {};
  if (target && target.userData && !target.userData.drivers) {
    target.userData.drivers = [];
  }
  const drivers = target && target.userData ? target.userData.drivers : [];

  const wrapperId = useMemo(() => {
    if (!target) return null;
    const objList = Array.isArray(sceneObjects) ? sceneObjects : [];
    const found = objList.find((o) => o && o.mesh === target);
    return found ? found.id : target.uuid;
  }, [target, sceneObjects]);

  const handleAdd = () => {
    if (!target) {
      setStatus && setStatus('No mesh selected');
      return;
    }
    if (!expression.trim()) {
      setStatus && setStatus('Expression cannot be empty');
      return;
    }
    const d = createDriver({
      type: driverType,
      expression: expression.trim(),
      targetObjId: wrapperId,
      targetProp,
    });
    target.userData.drivers.push(d);
    setStatus && setStatus('Added driver: ' + (ENGINE_TO_UI[targetProp] || targetProp) + ' = ' + expression);
    bump();
  };

  const handleRemove = (id) => {
    if (!target || !target.userData || !target.userData.drivers) return;
    target.userData.drivers = target.userData.drivers.filter((d) => d.id !== id);
    bump();
  };

  const handleToggle = (id) => {
    if (!target || !target.userData || !target.userData.drivers) return;
    const d = target.userData.drivers.find((x) => x.id === id);
    if (d) d.enabled = !d.enabled;
    bump();
  };

  const handleApplyAll = () => {
    if (!target) {
      setStatus && setStatus('No mesh selected');
      return;
    }
    if (!drivers.length) {
      setStatus && setStatus('No drivers to apply');
      return;
    }
    const objList = Array.isArray(sceneObjects) ? sceneObjects.slice() : [];
    if (!objList.find((o) => o && o.id === wrapperId)) {
      objList.push({ id: wrapperId, mesh: target, name: target.name || 'active' });
    }
    try {
      applyAllDrivers(drivers, objList, [], currentFrame || 0);
      setStatus && setStatus('Applied ' + drivers.length + ' driver(s) @ frame ' + (currentFrame || 0));
    } catch (e) {
      console.warn('Driver apply failed:', e);
      setStatus && setStatus('Driver eval error: ' + e.message);
    }
    bump();
  };

  const handleClear = () => {
    if (!target || !target.userData) return;
    target.userData.drivers = [];
    setStatus && setStatus('Drivers cleared');
    bump();
  };

  const usePreset = (key) => {
    const p = DRIVER_PRESETS[key];
    if (p && p.expression) {
      setExpression(p.expression);
      setStatus && setStatus('Preset: ' + (p.label || key));
    }
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
          DRIVERS
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
          </span>{' '}
          · Frame:{' '}
          <span style={{ color: C.teal }}>{currentFrame || 0}</span>
        </div>

        <div style={{ fontSize: 9, color: C.dim, marginTop: 6, marginBottom: 4 }}>
          TARGET PROPERTY
        </div>
        <div className="spnl-row" style={{ gap: 4 }}>
          <select
            value={targetProp}
            onChange={(e) => setTargetProp(e.target.value)}
            style={selectStyle}
          >
            {TARGET_PROPS.map((p) => (
              <option key={p.engine} value={p.engine}>
                {p.ui}
              </option>
            ))}
          </select>
          <select
            value={driverType}
            onChange={(e) => setDriverType(e.target.value)}
            style={selectStyle}
          >
            {TYPE_KEYS.map((k) => (
              <option key={k} value={k}>
                {(DRIVER_TYPES[k] && DRIVER_TYPES[k].icon) || ''}{' '}
                {(DRIVER_TYPES[k] && DRIVER_TYPES[k].label) || k}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 9, color: C.dim, marginTop: 6, marginBottom: 4 }}>
          EXPRESSION
        </div>
        <textarea
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="sin(frame * 0.1)"
          rows={2}
          style={{
            width: '100%',
            background: C.bg,
            color: C.teal,
            border: '1px solid ' + C.border,
            borderRadius: 4,
            padding: 4,
            fontFamily: C.font,
            fontSize: 10,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        {PRESET_KEYS.length > 0 && (
          <>
            <div style={{ fontSize: 9, color: C.dim, marginTop: 6, marginBottom: 4 }}>
              PRESETS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {PRESET_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => usePreset(k)}
                  style={{
                    padding: '2px 6px',
                    background: 'transparent',
                    border: '1px solid ' + C.border,
                    borderRadius: 3,
                    color: C.dim,
                    cursor: 'pointer',
                    fontFamily: C.font,
                    fontSize: 9,
                  }}
                >
                  {(DRIVER_PRESETS[k] && DRIVER_PRESETS[k].label) || k}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="spnl-row" style={{ gap: 4, marginTop: 8 }}>
          <button
            onClick={handleAdd}
            style={{
              flex: 1,
              padding: '6px 10px',
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
            + ADD DRIVER
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 9, color: C.dim }}>
          DRIVERS ON ACTIVE MESH
        </div>
        <div style={{ marginTop: 4 }}>
          {drivers.length === 0 && (
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
              No drivers
            </div>
          )}
          {drivers.map((d) => (
            <div
              key={d.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: 6,
                marginBottom: 4,
                background: C.bg,
                border: '1px solid ' + C.border,
                borderRadius: 4,
                opacity: d.enabled === false ? 0.5 : 1,
              }}
            >
              <span style={{ color: C.teal, fontFamily: C.font, fontSize: 10, minWidth: 70 }}>
                {ENGINE_TO_UI[d.targetProp] || d.targetProp}
              </span>
              <span
                style={{
                flex: 1,
                color: C.dim,
                fontFamily: C.font,
                fontSize: 9,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={d.expression}
              >
                = {d.expression}
              </span>
              <button
                onClick={() => handleToggle(d.id)}
                title="enable / disable"
                style={{
                  padding: '2px 6px',
                  background: 'transparent', 
                  border: '1px solid ' + C.border,
                  borderRadius: 3,
                  color: d.enabled === false ? C.dim : C.orange,
                  cursor: 'pointer',
                  fontSize: 9,
                }}
              >
                {d.enabled === false ? '○' : '●'}
              </button>
              <button
                onClick={() => handleRemove(d.id)}
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
          1. Pick a target property (e.g. rotation.y)
          <br />
          2. Type a JS expression — `frame` is auto-injected
          <br />
          3. ADD DRIVER — stored on mesh.userData.drivers
          <br />
          4. APPLY ALL writes the result to the mesh at current frame
          <br />
          Helpers: sin, cos, abs, min, max, pow, sqrt, PI
        </div>
      </div>
    </div>
  );
}
