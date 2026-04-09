import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import {
  createDestructionEffect, stepDestructionFrags,
  createEmitter, buildParticleSystem, stepEmitter,
  updateParticleSystem, VFX_PRESETS,
} from "../../mesh/VFXSystem.js";

const C = {
  bg:"#06060f", panel:"#0a0a14", border:"#1a2a3a",
  teal:"#00ffc8", orange:"#FF6600", muted:"#5a7088",
  text:"#ccc", danger:"#ff4444", warn:"#ffaa00",
};

const S = {
  wrap:   { display:"flex", flexDirection:"column", height:"100%", background:C.bg, fontFamily:"JetBrains Mono,monospace", fontSize:11, color:C.text, overflow:"hidden" },
  header: { display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:C.panel, borderBottom:`1px solid ${C.border}`, flexShrink:0 },
  title:  { color:C.orange, fontWeight:700, fontSize:12, letterSpacing:1 },
  close:  { marginLeft:"auto", background:"none", border:`1px solid ${C.border}`, borderRadius:3, color:C.muted, cursor:"pointer", padding:"3px 8px" },
  tabs:   { display:"flex", background:C.panel, borderBottom:`1px solid ${C.border}`, flexShrink:0 },
  tab:    (a) => ({ padding:"6px 14px", border:"none", borderBottom:`2px solid ${a?C.orange:"transparent"}`, background:"transparent", color:a?C.orange:C.muted, cursor:"pointer", fontSize:10, fontWeight:a?700:400 }),
  body:   { flex:1, overflowY:"auto", padding:10 },
  sec:    { marginBottom:14 },
  sl:     { fontSize:9, color:C.muted, letterSpacing:1, textTransform:"uppercase", marginBottom:5 },
  row:    { display:"flex", gap:6, alignItems:"center", marginBottom:6 },
  label:  { fontSize:10, color:C.muted, minWidth:90, flexShrink:0 },
  val:    { fontSize:10, color:C.orange, minWidth:36, textAlign:"right" },
  slider: { flex:1, accentColor:C.orange, cursor:"pointer" },
  btn:    (col=C.orange, sm=false) => ({ padding:sm?"3px 8px":"5px 12px", border:`1px solid ${col}44`, borderRadius:3, background:`${col}11`, color:col, cursor:"pointer", fontSize:sm?9:10, fontWeight:600, fontFamily:"inherit" }),
  card:   (a) => ({ padding:"8px 10px", borderRadius:4, border:`1px solid ${a?C.orange:C.border}`, background:a?`${C.orange}11`:C.panel, marginBottom:4, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }),
  stat:   { display:"flex", justifyContent:"space-between", padding:"3px 0", fontSize:10, borderBottom:`1px solid ${C.border}22` },
  warn:   { background:`${C.warn}11`, border:`1px solid ${C.warn}44`, borderRadius:3, padding:"6px 8px", fontSize:9, color:C.warn, marginBottom:8 },
  grid2:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:8 },
};

const DESTRUCTION_TYPES = [
  { id:"shatter",    label:"Shatter",      icon:"💥", pieces:24, force:4.0, desc:"Object explodes outward instantly" },
  { id:"crumble",    label:"Crumble",      icon:"🧱", pieces:32, force:1.5, desc:"Slow collapse into rubble" },
  { id:"explode",    label:"Explosion",    icon:"💣", pieces:16, force:8.0, desc:"High-force blast with debris" },
  { id:"impact",     label:"Impact",       icon:"⚡", pieces:12, force:3.0, desc:"Crash impact from one side" },
  { id:"dissolve",   label:"Dissolve",     icon:"✨", pieces:8,  force:0.5, desc:"Gentle dissolve into fragments" },
  { id:"bullet",     label:"Bullet Holes", icon:"🔫", pieces:6,  force:2.0, desc:"Small localized fracture" },
  { id:"wall_break", label:"Break Through",icon:"🚪", pieces:20, force:5.0, desc:"Force through wall/barrier" },
  { id:"glass",      label:"Glass Shatter",icon:"🪟", pieces:40, force:3.5, desc:"Fine glass-like fragments" },
];

const VFX_ON_DESTROY = [
  { id:"none",      label:"None",      icon:"—" },
  { id:"fire",      label:"Fire",      icon:"🔥" },
  { id:"sparks",    label:"Sparks",    icon:"✨" },
  { id:"smoke",     label:"Smoke",     icon:"💨" },
  { id:"explosion", label:"Explosion", icon:"💥" },
  { id:"magic",     label:"Magic",     icon:"🪄" },
];

function KS({ label, value, min, max, step=0.1, unit="", onChange }) {
  return (
    <div style={S.row}>
      <span style={S.label}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} style={S.slider} />
      <span style={S.val}>{value}{unit}</span>
    </div>
  );
}

export default function DestructionPanel({ open, onClose, sceneRef, meshRef, setStatus, onApplyFunction }) {
  if (!open) return null;

  const [tab, setTab]             = useState("destroy");
  const [destroyType, setDestroyType] = useState("shatter");
  const [pieces, setPieces]       = useState(24);
  const [force, setForce]         = useState(4.0);
  const [vfxOnDestroy, setVfxOnDestroy] = useState("sparks");
  const [gravity, setGravity]     = useState(0.1);
  const [fragLife, setFragLife]   = useState(2.0);
  const [impactDir, setImpactDir] = useState({ x:0, y:0, z:1 });
  const [fragsRunning, setFragsRunning] = useState(false);
  const [fragCount, setFragCount] = useState(0);
  const [stats, setStats]         = useState({ frags:0, vfxParticles:0 });

  const fragsRef    = useRef([]);
  const vfxPtsRef   = useRef(null);
  const vfxEmitRef  = useRef(null);
  const animRef     = useRef(null);
  const runRef      = useRef(false);

  useEffect(() => { runRef.current = fragsRunning; }, [fragsRunning]);

  const doDestroy = useCallback(() => {
    const scene = sceneRef?.current;
    const mesh  = meshRef?.current;

    if (!scene) { setStatus?.("No scene available"); return; }
    if (!mesh)  { setStatus?.("Select a mesh first — use 'Use Mine' or click an object"); return; }

    const dt = DESTRUCTION_TYPES.find(d => d.id === destroyType) || DESTRUCTION_TYPES[0];

    // Apply directional force for impact types
    let effectForce = force;
    let effectPieces = pieces;

    if (destroyType === "glass") {
      effectPieces = Math.max(pieces, 30);
    }

    // Create destruction fragments using your VFXSystem
    const frags = createDestructionEffect(mesh, scene, {
      pieces: effectPieces,
      force:  effectForce,
    });

    // Adjust fragment life
    frags.forEach(f => {
      f.userData.life    = fragLife;
      f.userData.maxLife = fragLife;
      // For impact: bias velocity in impact direction
      if (destroyType === "impact" || destroyType === "wall_break" || destroyType === "bullet") {
        f.userData.velocity.x += impactDir.x * force * 0.5;
        f.userData.velocity.z += impactDir.z * force * 0.5;
      }
      // Glass: extra rotation speed
      if (destroyType === "glass") {
        f.userData.angVel.multiplyScalar(3);
        f.material.transparent = true;
        f.material.opacity = 0.7;
      }
      // Dissolve: slower
      if (destroyType === "dissolve") {
        f.userData.velocity.multiplyScalar(0.3);
      }
    });

    fragsRef.current = frags;
    meshRef.current = null; // mesh was removed by createDestructionEffect

    // VFX at destruction point
    if (vfxOnDestroy !== "none" && VFX_PRESETS[vfxOnDestroy]) {
      const box = new THREE.Box3();
      frags.forEach(f => box.expandByObject(f));
      const center = box.getCenter(new THREE.Vector3());

      const emitter = createEmitter({
        preset: vfxOnDestroy,
        position: center,
        burst: true,
        burstCount: 80,
        ...VFX_PRESETS[vfxOnDestroy],
      });
      const pts = buildParticleSystem(emitter);
      scene.add(pts);
      vfxEmitRef.current = emitter;
      vfxPtsRef.current  = pts;
    }

    setFragsRunning(true);
    setFragCount(frags.length);
    setStatus?.(`${dt.label} — ${frags.length} fragments`);
  }, [sceneRef, meshRef, destroyType, pieces, force, fragLife, vfxOnDestroy, impactDir, setStatus]);

  // Animate fragments
  useEffect(() => {
    if (!fragsRunning) return;
    let last = performance.now();

    const loop = () => {
      if (!runRef.current) return;
      animRef.current = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      // Step fragments
      fragsRef.current = stepDestructionFrags(fragsRef.current, dt);

      // Step VFX emitter
      const emit = vfxEmitRef.current;
      const pts  = vfxPtsRef.current;
      if (emit && pts) {
        stepEmitter(emit, dt);
        if (emit.particles.length > 0) updateParticleSystem(pts, emit);
      }

      setStats({
        frags: fragsRef.current.length,
        vfxParticles: emit?.particles.length || 0,
      });

      // Stop when all frags gone
      if (fragsRef.current.length === 0) {
        setFragsRunning(false);
        // Clean up VFX
        const scene = sceneRef?.current;
        if (pts && scene) scene.remove(pts);
        setStatus?.("Destruction complete");
      }
    };
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [fragsRunning, sceneRef, setStatus]);

  const clearAll = () => {
    const scene = sceneRef?.current;
    if (!scene) return;
    setFragsRunning(false);
    cancelAnimationFrame(animRef.current);
    fragsRef.current.forEach(f => scene.remove(f));
    fragsRef.current = [];
    if (vfxPtsRef.current) scene.remove(vfxPtsRef.current);
    vfxPtsRef.current = null;
    setStats({ frags:0, vfxParticles:0 });
    setStatus?.("Destruction cleared");
  };

  // Also expose rb_fracture from your existing handler
  const fractureMesh = () => {
    onApplyFunction?.("rb_fracture");
    setStatus?.("Fracture applied via physics system");
  };

  const dt = DESTRUCTION_TYPES.find(d => d.id === destroyType);

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <span style={S.title}>💥 DESTRUCTION</span>
        <button style={S.close} onClick={onClose}>✕</button>
      </div>

      <div style={S.tabs}>
        {[["destroy","Destroy"],["settings","Settings"],["presets","Presets"]].map(([id,label]) => (
          <button key={id} style={S.tab(tab===id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={S.body}>

        {tab === "destroy" && (<>
          <div style={S.warn}>
            ⚠ Select a mesh in the scene first, then click DESTROY. The mesh will be replaced by fragments.
          </div>

          <div style={S.sec}>
            <div style={S.sl}>Destruction Type</div>
            {DESTRUCTION_TYPES.map(d => (
              <div key={d.id} style={S.card(destroyType===d.id)} onClick={() => {
                setDestroyType(d.id);
                setPieces(d.pieces);
                setForce(d.force);
              }}>
                <span style={{fontSize:20}}>{d.icon}</span>
                <div>
                  <div style={{fontWeight:600, color:destroyType===d.id?C.orange:C.text}}>{d.label}</div>
                  <div style={{fontSize:9, color:C.muted}}>{d.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={S.sec}>
            <div style={S.sl}>VFX on Destroy</div>
            <div style={S.grid2}>
              {VFX_ON_DESTROY.map(v => (
                <div key={v.id} style={{
                  ...S.card(vfxOnDestroy===v.id),
                  justifyContent:"center", flexDirection:"column", textAlign:"center", padding:"6px 4px"
                }} onClick={() => setVfxOnDestroy(v.id)}>
                  <span style={{fontSize:18}}>{v.icon}</span>
                  <span style={{fontSize:9}}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={S.sec}>
            <div style={S.sl}>Stats</div>
            {[
              ["Fragments", `${stats.frags} / ${fragCount}`],
              ["VFX Particles", stats.vfxParticles],
              ["Status", fragsRunning ? "● ANIMATING" : "■ READY"],
            ].map(([k,v]) => (
              <div key={k} style={S.stat}>
                <span style={{color:C.muted}}>{k}</span>
                <span style={{color: k==="Status"?(fragsRunning?C.orange:C.muted):C.text}}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
            <button style={S.btn(C.danger)} onClick={doDestroy} disabled={fragsRunning}>💥 DESTROY</button>
            <button style={S.btn(C.warn)} onClick={fractureMesh}>🔨 FRACTURE</button>
            <button style={S.btn(C.muted)} onClick={clearAll}>🗑 CLEAR</button>
          </div>

          <div style={{marginTop:10, fontSize:9, color:C.muted, lineHeight:1.7}}>
            DESTROY — removes mesh, creates physics fragments<br/>
            FRACTURE — uses your Rapier physics system
          </div>
        </>)}

        {tab === "settings" && (<>
          <div style={S.sec}>
            <div style={S.sl}>Fragment Settings</div>
            <KS label="Pieces" value={pieces} min={4} max={64} step={1} onChange={setPieces} />
            <KS label="Force" value={force} min={0.5} max={15} step={0.5} onChange={setForce} />
            <KS label="Fragment Life" value={fragLife} min={0.5} max={10} step={0.5} unit="s" onChange={setFragLife} />
          </div>

          <div style={S.sec}>
            <div style={S.sl}>Impact Direction (for Impact / Wall Break)</div>
            <KS label="Direction X" value={impactDir.x} min={-1} max={1} step={0.1} onChange={v => setImpactDir(p=>({...p,x:v}))} />
            <KS label="Direction Z" value={impactDir.z} min={-1} max={1} step={0.1} onChange={v => setImpactDir(p=>({...p,z:v}))} />
          </div>
        </>)}

        {tab === "presets" && (<>
          <div style={S.sec}>
            <div style={S.sl}>Scene Destruction Presets</div>
            {[
              { label:"Building Collapse",    type:"crumble",    pieces:40, force:2.0,  vfx:"smoke",     life:5 },
              { label:"Car Crash",            type:"impact",     pieces:20, force:6.0,  vfx:"sparks",    life:3 },
              { label:"Explosion",            type:"explode",    pieces:24, force:10.0, vfx:"explosion", life:2 },
              { label:"Window Shatter",       type:"glass",      pieces:50, force:3.0,  vfx:"none",      life:2 },
              { label:"Punch Through Wall",   type:"wall_break", pieces:20, force:5.0,  vfx:"smoke",     life:3 },
              { label:"Magic Disintegrate",   type:"dissolve",   pieces:12, force:0.3,  vfx:"magic",     life:4 },
              { label:"Bullet Hit",           type:"bullet",     pieces:6,  force:2.0,  vfx:"sparks",    life:1.5 },
              { label:"Fight Scene KO",       type:"shatter",    pieces:8,  force:3.0,  vfx:"sparks",    life:2 },
            ].map(p => (
              <div key={p.label} style={S.card(false)} onClick={() => {
                setDestroyType(p.type);
                setPieces(p.pieces);
                setForce(p.force);
                setVfxOnDestroy(p.vfx);
                setFragLife(p.life);
                setTab("destroy");
                setStatus?.(`Preset loaded: ${p.label}`);
              }}>
                <span style={{fontSize:10, flex:1}}>{p.label}</span>
                <span style={{fontSize:8, color:C.muted}}>{p.pieces} pcs · f{p.force}</span>
              </div>
            ))}
          </div>
        </>)}

      </div>
    </div>
  );
}
