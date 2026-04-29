import React, { useState, useCallback } from 'react';
import {
  MOD_TYPES,
  addModifier,
  removeModifier,
  reorderModifier,
  applyModifierStack,
} from '../../mesh/ModifierStack.js';
import { EXTENDED_MOD_TYPES, applyExtendedModifier } from '../../mesh/ExtendedModifiers.js';
import { applyModifier50 } from '../../mesh/ModifierStack50.js';

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

const MOD_TYPES_50_LIST = [
  'LAPLACIAN_SMOOTH',
  'HOOK',
  'VOLUME_DISPLACE',
  'NORMAL_EDIT',
  'CORRECTIVE_SMOOTH',
  'WELD',
  'SUBDIVIDE_SIMPLE',
  'NOISE_TEXTURE',
  'TAPER',
  'SHEAR',
  'PUSH',
  'UV_WARP',
  'VERTEX_WEIGHT',
  'PARTICLE_INSTANCE',
  'FRACTURE_SIMPLE',
  'EXTRUDE',
];

const dedupe = (arr) => Array.from(new Set(arr));
const ALL_TYPES = dedupe([
  ...Object.values(MOD_TYPES || {}),
  ...Object.values(EXTENDED_MOD_TYPES || {}),
  ...MOD_TYPES_50_LIST,
]).sort();

const BASE_TYPE_SET = new Set(Object.values(MOD_TYPES || {}));
const EXTENDED_TYPE_SET = new Set(Object.values(EXTENDED_MOD_TYPES || {}));
const FIFTY_TYPE_SET = new Set(MOD_TYPES_50_LIST);

export default function ModifierStackPanel({ meshRef, setStatus, onClose }) {
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const [pickType, setPickType] = useState(ALL_TYPES[0] || 'SUBDIVISION');
  const [dragIdx, setDragIdx] = useState(null);

  if (!window._modStack) window._modStack = [];
  const stack = window._modStack;

  const handleAdd = () => {
    addModifier(stack, pickType, {});
    setStatus && setStatus('Added ' + pickType);
    bump();
  };

  const handleRemove = (id) => {
    removeModifier(stack, id);
    bump();
  };

  const applyOne = (geo, mod) => {
    try {
      if (BASE_TYPE_SET.has(mod.type)) {
        return applyModifierStack(geo, [mod]) || geo;
      }
      if (EXTENDED_TYPE_SET.has(mod.type)) {
        return applyExtendedModifier(geo, mod) || geo;
      }
      if (FIFTY_TYPE_SET.has(mod.type)) {
        return applyModifier50(geo, mod) || geo;
      }
    } catch (e) {
      console.warn('Modifier ' + mod.type + ' failed:', e);
    }
    return geo;
  };

  const handleApplyAll = () => {
    const target = meshRef && meshRef.current;
    if (!target || !target.geometry) {
      setStatus && setStatus('No mesh selected');
      return;
    }
    if (!stack.length) {
      setStatus && setStatus('Stack is empty');
      return;
    }
    let geo = target.geometry.clone();
    for (const mod of stack) {
      if (!mod.enabled && mod.enabled !== undefined) continue;
      geo = applyOne(geo, mod);
    }
    target.geometry.dispose();
    target.geometry = geo;
    window._modStack = [];
    setStatus && setStatus('All modifiers applied');
    bump();
  };

  const handleClear = () => {
    window._modStack = [];
    setStatus && setStatus('Stack cleared');
    bump();
  };

  const onDragStart = (i) => () => setDragIdx(i);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (i) => (e) => {
    e.preventDefault();
    if (dragIdx == null || dragIdx === i) {
      setDragIdx(null);
      return;
    }
    const mod = stack[dragIdx];
    if (mod) reorderModifier(stack, mod.id, i);
    setDragIdx(null);
    bump();
  };

  const rowStyle = (i) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    marginBottom: 4,
    background: C.bg,
    border: '1px solid ' + (dragIdx === i ? C.teal : C.border),
    borderRadius: 4,
  });

  return (
    <div className="spnl-panel-container" style={{ maxWidth: 320 }}>
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
          MODIFIER STACK
        </span>
        {onClose && (
          <span onClick={onClose} className="spnl-close">
            ×
          </span>
        )}
      </div>
      <div className="spnl-panel-scroll">
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

        <div style={{ marginTop: 8 }}>
          {stack.length === 0 && (
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
              Stack is empty
            </div>
          )}
          {stack.map((mod, i) => (
            <div
              key={mod.id}
              draggable
              onDragStart={onDragStart(i)}
              onDragOver={onDragOver}
              onDrop={onDrop(i)}
              style={rowStyle(i)}
            >
              <span
                title="drag to reorder"
                style={{ cursor: 'grab', color: C.dim, fontSize: 12, userSelect: 'none' }}
              >
                ⋮⋮
              </span>
              <span
                style={{ flex: 1, color: C.teal, fontFamily: C.font, fontSize: 10 }}
              >
                {mod.type}
              </span>
              <button
                title="params (stub)"
                onClick={() => setStatus && setStatus('Params editor coming soon')}
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
                onClick={() => handleRemove(mod.id)}
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
          1. Pick modifier from dropdown, click ADD
          <br />
          2. Drag rows to reorder the stack
          <br />
          3. APPLY ALL bakes the stack into mesh geometry
          <br />
          4. CLEAR ALL discards without applying
        </div>
      </div>
    </div>
  );
}
