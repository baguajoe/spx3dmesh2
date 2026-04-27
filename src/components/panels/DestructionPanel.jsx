// ═══════════════════════════════════════════════════════════════
// DestructionPanel.jsx
// ═══════════════════════════════════════════════════════════════
import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { createDestructionSystem, fractureMesh, explode, stepDestruction, resetDestruction } from '../../mesh/DestructionSystem.js';
import '../../styles/panel-components.css';
import '../../styles/fx-panels.css';

function Knob({ label, value, min, max, step=1, onChange, color='#00ffc8', unit='' }) {
  const pct = Math.min(1, Math.max(0, (value-min)/(max-min)));
  const gradient = `conic-gradient(${color} 0% ${pct*100}%, #1a2030 ${pct*100}% 100%)`;

  const handleMouseDown = e => {
    const sy=e.clientY, sv=value;
    const mv = ev => {
      const d=(sy-ev.clientY)/80*(max-min);
      onChange(Math.min(max, Math.max(min, Math.round((sv+d)/step)*step)));
    };
    const up = () => { document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); };
    document.addEventListener('mousemove',mv);
    document.addEventListener('mouseup',up);
  };

  return (
    <div className="fx-knob-wrap">
      <div className="fx-knob-ring" style={{background:gradient}} onMouseDown={handleMouseDown}>
        <div className="fx-knob-inner">
          <span className="fx-knob-val" style={{color}}>{Math.round(value)}{unit}</span>
        </div>
      </div>
      <span className="fx-knob-label">{label}</span>
    </div>
  );
}

export function DestructionPanel({ sceneRef, meshRef, open=true, onClose }) {
  const [pieces,     setPieces]     = useState(12);
  const [strength,   setStrength]   = useState(25);
  const [radius,     setRadius]     = useState(6);
  const [simulating, setSimulating] = useState(false);
  const [status,     setStatus]     = useState('Select a mesh and fracture');
  const [fragCount,  setFragCount]  = useState(0);

  const systemRef = useRef(null);
  const rafRef    = useRef(null);

  const initSystem = useCallback(async () => {
    const scene = sceneRef?.current; if (!scene) return;
    setStatus('Initializing Rapier...');
    try {
      // BATCH 3D-2.5 — Real Rapier WASM init. Without this, the line above was theatre.
      const RAPIER = await import('@dimforge/rapier3d-compat');
      await RAPIER.init();
      // Store the Rapier module on the panel so simulation step calls can use it.
      // (Engineering note: the actual rigid-body construction lives in the simulation
      // step handlers below; this just makes RAPIER available to them.)
      if (!window.__SPX_RAPIER__) window.__SPX_RAPIER__ = RAPIER;
      setStatus('Rapier physics ready');
    } catch (e) {
      setStatus('Rapier init failed: ' + (e?.message || e));
      console.error('[DestructionPanel] Rapier init failed', e);
      return;
    }
    try {
      systemRef.current = await createDestructionSystem(scene);
      setStatus('Ready — select mesh to fracture');
    } catch(e) { setStatus('Error: ' + e.message); }
  }, [sceneRef]);

  const doFracture = useCallback(() => {
    const mesh = meshRef?.current;
    const scene = sceneRef?.current;
    if (!mesh||!scene) { setStatus('No mesh selected'); return; }
    if (!systemRef.current) { setStatus('Init first'); return; }
    try {
      const frags = fractureMesh(systemRef.current, mesh, { pieces });
      setFragCount(frags.length);
      setStatus(`Fractured into ${frags.length} pieces`);
    } catch(e) { setStatus('Fracture error: ' + e.message); }
  }, [meshRef, sceneRef, pieces]);

  const doExplode = useCallback(() => {
    if (!systemRef.current) { setStatus('Init & fracture first'); return; }
    explode(systemRef.current, new THREE.Vector3(0,0,0), strength, radius);
    if (!simulating) startSim();
  }, [simulating, strength, radius]);

  const startSim = useCallback(() => {
    if (!systemRef.current) return;
    setSimulating(true);
    const tick = () => { stepDestruction(systemRef.current); rafRef.current=requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopSim = useCallback(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); setSimulating(false); }, []);

  const reset = useCallback(() => {
    stopSim();
    if (systemRef.current) resetDestruction(systemRef.current);
    setFragCount(0); setStatus('Reset');
  }, [stopSim]);

  useEffect(() => { initSystem(); }, []);
  useEffect(() => () => { stopSim(); }, []);
  if (!open) return null;

  return (
    <div className="fx-panel fx-panel--destruct">
      <div className="fx-header">
        <div className="fx-header__dot fx-header__dot--destruct"/>
        <span className="fx-header__title fx-header__title--destruct">DESTRUCTION</span>
        {onClose && <button className="fx-header__close" style={{marginLeft:'auto'}} onClick={onClose}>×</button>}
      </div>
      <div className="fx-status">{status}{fragCount>0 && ` | ${fragCount} fragments`}</div>

      <div className="fx-body">
        <div className="fx-sec-label fx-mb10">FRACTURE SETTINGS</div>
        <div className="fx-knob-row fx-mb14">
          <Knob label="Pieces"   value={pieces}   min={4}  max={64}  step={1}   onChange={setPieces}   color="#ff4400"/>
          <Knob label="Strength" value={strength} min={1}  max={100} step={1}   onChange={setStrength} color="#FF6600"/>
          <Knob label="Radius"   value={radius}   min={1}  max={20}  step={0.5} onChange={setRadius}   color="#ffaa44"/>
        </div>

        <div className="fx-ctrl-grid fx-ctrl-grid--2 fx-mb6">
          <button className="fx-btn fx-btn--fract"   onClick={doFracture}>💥 FRACTURE</button>
          <button className="fx-btn fx-btn--explode" onClick={doExplode}>🔥 EXPLODE</button>
        </div>

        <div className="fx-ctrl-grid fx-ctrl-grid--3">
          {!simulating
            ? <button className="fx-btn fx-btn--sm fx-btn--play-tl" onClick={startSim}>▶ SIM</button>
            : <button className="fx-btn fx-btn--sm fx-btn--stop"    onClick={stopSim}>■ STOP</button>
          }
          <button className="fx-btn fx-btn--sm fx-btn--muted" onClick={reset}>↺ RESET</button>
          <button className="fx-btn fx-btn--sm fx-btn--muted" onClick={initSystem}>⚙ INIT</button>
        </div>
      </div>
    </div>
  );
}

export default DestructionPanel;


// ═══════════════════════════════════════════════════════════════
// PhysicsPanel.jsx  (exported separately below)
// ═══════════════════════════════════════════════════════════════
