import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { initRapier, createPhysicsWorld, addRigidBody, addGroundPlane, stepPhysics, applyImpulse, applyExplosion, removeBody, disposePhysics } from '../../mesh/PhysicsSystem.js';
import '../../styles/panel-components.css';
import '../../styles/fx-panels.css';

function Knob({ label, value, min, max, step=0.01, onChange, color='#00ffc8', unit='' }) {
  const pct = Math.min(1, Math.max(0, (value-min)/(max-min)));
  const gradient = `conic-gradient(${color} 0% ${pct*100}%, #1a2030 ${pct*100}% 100%)`;
  const display = value>=100 ? Math.round(value) : value>=1 ? value.toFixed(1) : value.toFixed(2);

  const handleMouseDown = e => {
    const sy=e.clientY, sv=value;
    const mv = ev => {
      const d=(sy-ev.clientY)/80*(max-min);
      onChange(Math.min(max, Math.max(min, parseFloat((sv+d).toFixed(4)))));
    };
    const up = () => { document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); };
    document.addEventListener('mousemove',mv);
    document.addEventListener('mouseup',up);
  };

  return (
    <div className="fx-knob-wrap">
      <div className="fx-knob-ring" style={{background:gradient}} onMouseDown={handleMouseDown}>
        <div className="fx-knob-inner">
          <span className="fx-knob-val" style={{color}}>{display}{unit}</span>
        </div>
      </div>
      <span className="fx-knob-label">{label}</span>
    </div>
  );
}

export default function PhysicsPanel({ sceneRef, open=true, onClose }) {
  const [ready,        setReady]       = useState(false);
  const [running,      setRunning]     = useState(false);
  const [gravity,      setGravity]     = useState(9.81);
  const [restitution,  setRestitution] = useState(0.3);
  const [friction,     setFriction]    = useState(0.5);
  const [density,      setDensity]     = useState(1.0);
  const [linDamp,      setLinDamp]     = useState(0.1);
  const [bodyCount,    setBodyCount]   = useState(0);
  const [status,       setStatus]      = useState('Click INIT to load Rapier');

  const physRef = useRef(null);
  const rafRef  = useRef(null);

  const initPhysics = useCallback(async () => {
    const scene = sceneRef?.current; if (!scene) return;
    setStatus('Loading Rapier WASM...');
    try {
      await initRapier();
      physRef.current = createPhysicsWorld({ x:0, y:-gravity, z:0 });
      addGroundPlane(physRef.current, 0);
      let count = 0;
      scene.traverse(obj => {
        if (obj.isMesh && !obj.userData.isHelper && !obj.userData.weatherParticle && !obj.userData.isFragment) {
          try { addRigidBody(physRef.current, obj, { type:'dynamic', restitution, friction, density, linearDamping:linDamp }); count++; } catch(e) {}
        }
      });
      setBodyCount(count);
      setReady(true);
      setStatus(`Rapier ready — ${count} bodies registered`);
    } catch(e) { setStatus('Error: ' + e.message); }
  }, [sceneRef, gravity, restitution, friction, density, linDamp]);

  const startSim = useCallback(() => {
    if (!physRef.current) { setStatus('Init first'); return; }
    setRunning(true);
    const tick = () => { try { stepPhysics(physRef.current); } catch(e) {} rafRef.current=requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopSim = useCallback(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); setRunning(false); }, []);

  const shootImpulse = useCallback(() => {
    const scene = sceneRef?.current; if (!scene||!physRef.current) return;
    scene.traverse(obj => {
      if (obj.isMesh && !obj.userData.isHelper) {
        applyImpulse(physRef.current, obj, { x:(Math.random()-0.5)*10, y:5+Math.random()*10, z:(Math.random()-0.5)*10 });
      }
    });
  }, [sceneRef]);

  const explodePhysics = useCallback(() => {
    if (!physRef.current) return;
    applyExplosion(physRef.current, new THREE.Vector3(0,0,0), 30, 8);
  }, []);

  useEffect(() => () => { stopSim(); if (physRef.current) disposePhysics(physRef.current); }, []);
  if (!open) return null;

  return (
    <div className="fx-panel fx-panel--physics">
      <div className="fx-header">
        <div className="fx-header__dot fx-header__dot--physics"/>
        <span className="fx-header__title fx-header__title--physics">RIGID BODY</span>
        {onClose && <button className="fx-header__close" style={{marginLeft:'auto'}} onClick={onClose}>×</button>}
      </div>
      <div className={`fx-status${ready?' fx-status--ready':''}`}>{status}</div>

      <div className="fx-body">
        <div className="fx-sec-label fx-mb10">PHYSICS PARAMETERS</div>
        <div className="fx-knob-row fx-mb14">
          <Knob label="Gravity"     value={gravity}     min={0}   max={20} step={0.1}  onChange={setGravity}     color="#ff4444" unit="m/s²"/>
          <Knob label="Restitution" value={restitution} min={0}   max={1}  step={0.01} onChange={setRestitution} color="#00ffc8"/>
          <Knob label="Friction"    value={friction}    min={0}   max={1}  step={0.01} onChange={setFriction}    color="#ffaa44"/>
          <Knob label="Density"     value={density}     min={0.1} max={10} step={0.1}  onChange={setDensity}     color="#44aaff" unit="kg/m³"/>
          <Knob label="Lin Damp"    value={linDamp}     min={0}   max={1}  step={0.01} onChange={setLinDamp}     color="#aaaaff"/>
        </div>

        {bodyCount > 0 && <div className="fx-body-count">{bodyCount} rigid bodies in world</div>}

        <div className="fx-ctrl-grid fx-ctrl-grid--2 fx-mb6">
          <button className="fx-btn fx-btn--init" onClick={initPhysics}>⚙ INIT RAPIER</button>
          {!running
            ? <button className="fx-btn fx-btn--play-tl" onClick={startSim} disabled={!ready}>▶ SIMULATE</button>
            : <button className="fx-btn fx-btn--stop"    onClick={stopSim}>■ STOP</button>
          }
        </div>

        <div className="fx-ctrl-grid fx-ctrl-grid--2">
          <button className="fx-btn fx-btn--impulse"  onClick={shootImpulse}    disabled={!ready}>↑ IMPULSE ALL</button>
          <button className="fx-btn fx-btn--explode2" onClick={explodePhysics}  disabled={!ready}>💥 EXPLODE</button>
        </div>
      </div>
    </div>
  );
}
