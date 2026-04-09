import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import {
  createEmitter, stepEmitter, buildParticleSystem,
  updateParticleSystem, VFX_PRESETS, emitParticles,
} from "../../mesh/VFXSystem.js";
import {
  createGPUParticleSystem, emitGPUParticles, stepGPUParticles,
  createForceField, FORCE_FIELD_TYPES, burstEmit, getGPUParticleStats,
} from "../../mesh/GPUParticles.js";

const C = {
  bg:"#06060f", panel:"#0a0a14", border:"#1a2a3a",
  teal:"#00ffc8", orange:"#FF6600", muted:"#5a7088",
  text:"#ccc", danger:"#ff4444", warn:"#ffaa00", purple:"#aa44ff",
};

const S = {
  wrap:   { display:"flex", flexDirection:"column", height:"100%", background:C.bg, fontFamily:"JetBrains Mono,monospace", fontSize:11, color:C.text, overflow:"hidden" },
  header: { display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:C.panel, borderBottom:`1px solid ${C.border}`, flexShrink:0 },
  title:  { color:C.teal, fontWeight:700, fontSize:12, letterSpacing:1 },
  close:  { marginLeft:"auto", background:"none", border:`1px solid ${C.border}`, borderRadius:3, color:C.muted, cursor:"pointer", padding:"3px 8px" },
  tabs:   { display:"flex", background:C.panel, borderBottom:`1px solid ${C.border}`, flexShrink:0 },
  tab:    (a) => ({ padding:"6px 14px", border:"none", borderBottom:`2px solid ${a?C.teal:"transparent"}`, background:"transparent", color:a?C.teal:C.muted, cursor:"pointer", fontSize:10, fontWeight:a?700:400 }),
  body:   { flex:1, overflowY:"auto", padding:10 },
  sec:    { marginBottom:14 },
  sl:     { fontSize:9, color:C.muted, letterSpacing:1, textTransform:"uppercase", marginBottom:5 },
  row:    { display:"flex", gap:6, alignItems:"center", marginBottom:6 },
  label:  { fontSize:10, color:C.muted, minWidth:90, flexShrink:0 },
  val:    { fontSize:10, color:C.teal, minWidth:36, textAlign:"right" },
  slider: { flex:1, accentColor:C.teal, cursor:"pointer" },
  btn:    (col=C.teal, sm=false) => ({ padding:sm?"3px 8px":"5px 12px", border:`1px solid ${col}44`, borderRadius:3, background:`${col}11`, color:col, cursor:"pointer", fontSize:sm?9:10, fontWeight:600, fontFamily:"inherit" }),
  card:   (a, col=C.teal) => ({ padding:"8px 10px", borderRadius:4, border:`1px solid ${a?col:C.border}`, background:a?`${col}11`:C.panel, marginBottom:4, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }),
  stat:   { display:"flex", justifyContent:"space-between", padding:"3px 0", fontSize:10, borderBottom:`1px solid ${C.border}22` },
  grid2:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:8 },
  toggle: (on) => ({ width:32, height:16, borderRadius:8, background:on?C.teal:C.panel, border:`1px solid ${on?C.teal:C.border}`, cursor:"pointer", position:"relative", flexShrink:0 }),
  dot:    (on) => ({ position:"absolute", top:2, left:on?16:2, width:10, height:10, borderRadius:"50%", background:on?C.bg:C.muted, transition:"left 0.2s" }),
};

const WEATHER_TYPES = [
  { id:"rain",       label:"Rain",       icon:"🌧️", preset:"rain",      gpuCount:2000, emitH:8,  spread:6,  gravity:new THREE.Vector3(0,-1.5,0),  color1:"#aabbcc", color2:"#ddeeff", size:[0.01,0.03], life:[0.5,1.2] },
  { id:"snow",       label:"Snow",       icon:"❄️",  preset:"snow",      gpuCount:1000, emitH:6,  spread:5,  gravity:new THREE.Vector3(0,-0.1,0),  color1:"#ffffff", color2:"#ddeeff", size:[0.03,0.08], life:[2,4] },
  { id:"sandstorm",  label:"Sandstorm",  icon:"🌪️", preset:"dust",      gpuCount:3000, emitH:2,  spread:8,  gravity:new THREE.Vector3(0.3,-0.05,0),color1:"#ccaa88", color2:"#ddbb99", size:[0.02,0.06], life:[1,3] },
  { id:"thunderstorm",label:"Thunderstorm",icon:"⛈️",preset:"rain",    gpuCount:3000, emitH:10, spread:8,  gravity:new THREE.Vector3(0,-2,0.1),   color1:"#889aaa", color2:"#aabbcc", size:[0.01,0.02], life:[0.4,0.8] },
  { id:"blizzard",   label:"Blizzard",   icon:"🌨️", preset:"snow",      gpuCount:2000, emitH:5,  spread:7,  gravity:new THREE.Vector3(0.5,-0.2,0), color1:"#ffffff", color2:"#ccddee", size:[0.02,0.07], life:[1.5,3.5] },
  { id:"fog",        label:"Fog / Mist", icon:"🌫️", preset:"smoke",     gpuCount:200,  emitH:0.5,spread:8,  gravity:new THREE.Vector3(0,-0.01,0),  color1:"#aabbcc", color2:"#ccdddd", size:[0.2,0.5],   life:[5,10] },
  { id:"hail",       label:"Hail",       icon:"🧊",  preset:"sparks",   gpuCount:500,  emitH:8,  spread:5,  gravity:new THREE.Vector3(0,-2,0),     color1:"#ccddff", color2:"#eeeeff", size:[0.03,0.07], life:[0.4,1.0] },
  { id:"ash",        label:"Volcanic Ash",icon:"🌋", preset:"smoke",    gpuCount:800,  emitH:3,  spread:6,  gravity:new THREE.Vector3(0,-0.02,0),  color1:"#333333", color2:"#666655", size:[0.04,0.12], life:[4,8] },
];

function KS({ label, value, min, max, step=0.01, unit="", onChange }) {
  return (
    <div style={S.row}>
      <span style={S.label}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} style={S.slider} />
      <span style={S.val}>{value}{unit}</span>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div style={S.toggle(value)} onClick={() => onChange(!value)}>
      <div style={S.dot(value)} />
    </div>
  );
}

export default function WeatherPanel({ open, onClose, sceneRef, setStatus }) {
  if (!open) return null;

  const [tab, setTab]               = useState("weather");
  const [weatherType, setWeatherType] = useState("rain");
  const [running, setRunning]       = useState(false);
  const [intensity, setIntensity]   = useState(0.7);
  const [windX, setWindX]           = useState(0);
  const [windZ, setWindZ]           = useState(0);
  const [emitHeight, setEmitHeight] = useState(8);
  const [coverage, setCoverage]     = useState(6);
  const [lightning, setLightning]   = useState(false);
  const [fogScene, setFogScene]     = useState(false);
  const [fogDensity, setFogDensity] = useState(0.02);
  const [fogColor, setFogColor]     = useState("#aabbcc");
  const [stats, setStats]           = useState({ active:0, max:0, fields:0, usage:"0%" });

  const gpuSysRef   = useRef(null);
  const animRef     = useRef(null);
  const runningRef  = useRef(false);
  const lightRef    = useRef(null);
  const lightTimerRef = useRef(0);

  useEffect(() => { runningRef.current = running; }, [running]);

  // Fog effect on scene
  useEffect(() => {
    const scene = sceneRef?.current;
    if (!scene) return;
    if (fogScene) {
      scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    } else {
      scene.fog = null;
    }
  }, [fogScene, fogDensity, fogColor, sceneRef]);

  const startWeather = useCallback(() => {
    const scene = sceneRef?.current;
    if (!scene) { setStatus?.("No scene — open a mesh first"); return; }

    const wt = WEATHER_TYPES.find(w => w.id === weatherType) || WEATHER_TYPES[0];

    // Remove old system
    const oldSys = scene.getObjectByName("weather_particles");
    if (oldSys) scene.remove(oldSys);
    if (gpuSysRef.current) { scene.remove(gpuSysRef.current.instanced); }

    // Create GPU particle system
    const count = Math.round(wt.gpuCount * intensity);
    const sys = createGPUParticleSystem({
      maxCount:   count,
      geometry:   new THREE.SphereGeometry(0.04, 3, 3),
      material:   new THREE.MeshBasicMaterial({ color: wt.color1, transparent:true, opacity:0.7 }),
      emitRate:   count / 2,
      gravity:    wt.gravity.clone().add(new THREE.Vector3(windX * 0.1, 0, windZ * 0.1)),
      lifeRange:  wt.life,
      speedRange: [0.05 * intensity, 0.2 * intensity],
      sizeRange:  wt.size,
      color1:     wt.color1,
      color2:     wt.color2,
      spread:     coverage,
    });

    // Add wind force field
    if (windX !== 0 || windZ !== 0) {
      const wind = createForceField("wind", new THREE.Vector3(0, emitHeight/2, 0), {
        strength: Math.sqrt(windX*windX + windZ*windZ) * 0.3,
        radius: coverage * 2,
        direction: new THREE.Vector3(windX, 0, windZ).normalize(),
      });
      sys.forceFields.push(wind);
    }

    // Turbulence for sandstorm/blizzard
    if (weatherType === "sandstorm" || weatherType === "blizzard") {
      const turb = createForceField("turbulence", new THREE.Vector3(0, emitHeight/2, 0), {
        strength: 0.5 * intensity,
        radius: coverage * 2,
      });
      sys.forceFields.push(turb);
    }

    sys.instanced.name = "weather_particles";
    scene.add(sys.instanced);
    gpuSysRef.current = sys;

    // Lightning light
    if (lightning && !lightRef.current) {
      const light = new THREE.PointLight("#8888ff", 0, 30);
      light.position.set(0, 10, 0);
      light.name = "lightning_light";
      scene.add(light);
      lightRef.current = light;
    }

    // Initial burst of particles spread across sky
    for (let i = 0; i < Math.min(count, 500); i++) {
      emitGPUParticles(sys,
        new THREE.Vector3(
          (Math.random()-0.5) * coverage * 2,
          emitHeight + Math.random() * 2,
          (Math.random()-0.5) * coverage * 2
        ), 1
      );
    }

    setRunning(true);
    setStatus?.(`${wt.label} started — ${count} particles`);
  }, [sceneRef, weatherType, intensity, windX, windZ, emitHeight, coverage, lightning, setStatus]);

  // Animate loop
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const wt = WEATHER_TYPES.find(w => w.id === weatherType) || WEATHER_TYPES[0];

    const loop = () => {
      if (!runningRef.current) return;
      animRef.current = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const sys = gpuSysRef.current;
      const scene = sceneRef?.current;
      if (!sys || !scene) return;

      // Continuous emit from above
      const toEmit = Math.floor(sys.emitRate * dt * intensity);
      for (let i = 0; i < toEmit; i++) {
        emitGPUParticles(sys,
          new THREE.Vector3(
            (Math.random()-0.5) * coverage * 2,
            emitHeight + Math.random() * 2,
            (Math.random()-0.5) * coverage * 2
          ), 1
        );
      }

      stepGPUParticles(sys, dt);

      // Lightning flash
      if (lightning && lightRef.current) {
        lightTimerRef.current += dt;
        if (lightTimerRef.current > 2 + Math.random() * 5) {
          lightTimerRef.current = 0;
          lightRef.current.intensity = 8;
          lightRef.current.position.set((Math.random()-0.5)*8, 12, (Math.random()-0.5)*8);
          setTimeout(() => { if (lightRef.current) lightRef.current.intensity = 0; }, 80);
          setTimeout(() => { if (lightRef.current) lightRef.current.intensity = 5; }, 120);
          setTimeout(() => { if (lightRef.current) lightRef.current.intensity = 0; }, 200);
        }
      }

      setStats(getGPUParticleStats(sys));
    };
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [running, sceneRef, weatherType, intensity, coverage, emitHeight, lightning]);

  const stopWeather = () => {
    setRunning(false);
    cancelAnimationFrame(animRef.current);
    setStatus?.("Weather stopped");
  };

  const clearAll = () => {
    const scene = sceneRef?.current;
    if (!scene) return;
    stopWeather();
    if (gpuSysRef.current) { scene.remove(gpuSysRef.current.instanced); gpuSysRef.current = null; }
    if (lightRef.current) { scene.remove(lightRef.current); lightRef.current = null; }
    scene.fog = null;
    setFogScene(false);
    setStats({ active:0, max:0, fields:0, usage:"0%" });
    setStatus?.("Weather cleared");
  };

  const wt = WEATHER_TYPES.find(w => w.id === weatherType);

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <span style={S.title}>🌧️ WEATHER &amp; VFX</span>
        <button style={S.close} onClick={onClose}>✕</button>
      </div>

      <div style={S.tabs}>
        {[["weather","Weather"],["atmosphere","Atmosphere"],["forces","Force Fields"]].map(([id,label]) => (
          <button key={id} style={S.tab(tab===id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={S.body}>

        {tab === "weather" && (<>
          <div style={S.sec}>
            <div style={S.sl}>Weather Type</div>
            {WEATHER_TYPES.map(w => (
              <div key={w.id} style={S.card(weatherType===w.id)} onClick={() => setWeatherType(w.id)}>
                <span style={{fontSize:20}}>{w.icon}</span>
                <span style={{fontWeight:600, color:weatherType===w.id?C.teal:C.text}}>{w.label}</span>
                <span style={{marginLeft:"auto", fontSize:9, color:C.muted}}>{w.gpuCount} particles</span>
              </div>
            ))}
          </div>

          <div style={S.sec}>
            <div style={S.sl}>Controls</div>
            <KS label="Intensity" value={intensity} min={0.1} max={1} step={0.05} onChange={setIntensity} />
            <KS label="Coverage" value={coverage} min={2} max={20} step={0.5} unit="u" onChange={setCoverage} />
            <KS label="Emit Height" value={emitHeight} min={2} max={20} step={0.5} unit="u" onChange={setEmitHeight} />
          </div>

          {/* Lightning toggle for storms */}
          {(weatherType === "thunderstorm" || weatherType === "rain") && (
            <div style={S.sec}>
              <div style={S.sl}>Lightning</div>
              <div style={{...S.row, justifyContent:"space-between"}}>
                <span style={S.label}>Lightning Flashes</span>
                <Toggle value={lightning} onChange={setLightning} />
              </div>
            </div>
          )}

          <div style={S.sec}>
            <div style={S.sl}>Stats</div>
            {[
              ["Active", `${stats.active} / ${stats.max}`],
              ["GPU Usage", stats.usage],
              ["Force Fields", stats.fields],
              ["Status", running ? "● RUNNING" : "■ STOPPED"],
            ].map(([k,v]) => (
              <div key={k} style={S.stat}>
                <span style={{color:C.muted}}>{k}</span>
                <span style={{color: k==="Status"?(running?C.teal:C.muted):C.text}}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
            <button style={S.btn(C.teal)} onClick={startWeather}>▶ START</button>
            <button style={S.btn(C.orange)} onClick={stopWeather} disabled={!running}>⏸ STOP</button>
            <button style={S.btn(C.danger)} onClick={clearAll}>🗑 CLEAR</button>
          </div>
        </>)}

        {tab === "atmosphere" && (<>
          <div style={S.sec}>
            <div style={S.sl}>Fog / Mist</div>
            <div style={{...S.row, justifyContent:"space-between", marginBottom:8}}>
              <span style={S.label}>Enable Fog</span>
              <Toggle value={fogScene} onChange={setFogScene} />
            </div>
            {fogScene && (<>
              <KS label="Fog Density" value={fogDensity} min={0.001} max={0.1} step={0.001} onChange={setFogDensity} />
              <div style={S.row}>
                <span style={S.label}>Fog Color</span>
                <input type="color" value={fogColor} onChange={e => setFogColor(e.target.value)}
                  style={{width:40, height:26, border:"none", background:"none", cursor:"pointer"}} />
              </div>
            </>)}
          </div>

          <div style={S.sec}>
            <div style={S.sl}>Wind Direction</div>
            <KS label="Wind X" value={windX} min={-5} max={5} step={0.1} onChange={setWindX} />
            <KS label="Wind Z" value={windZ} min={-5} max={5} step={0.1} onChange={setWindZ} />
          </div>

          <div style={S.sec}>
            <div style={S.sl}>Scene Presets</div>
            {[
              { label:"Dark Stormy Night", fog:true, density:0.04, color:"#223344", wx:0.5, wz:0.2 },
              { label:"Light Misty Morning", fog:true, density:0.015, color:"#aabbcc", wx:0, wz:0 },
              { label:"Heavy Blizzard", fog:true, density:0.06, color:"#ccddee", wx:2, wz:0.5 },
              { label:"Desert Sandstorm", fog:true, density:0.05, color:"#ccaa77", wx:3, wz:1 },
              { label:"Volcanic Atmosphere", fog:true, density:0.03, color:"#443322", wx:0.2, wz:0 },
              { label:"Clear Sky", fog:false, density:0, color:"#aabbcc", wx:0, wz:0 },
            ].map(p => (
              <div key={p.label} style={S.card(false)} onClick={() => {
                setFogScene(p.fog);
                setFogDensity(p.density);
                setFogColor(p.color);
                setWindX(p.wx);
                setWindZ(p.wz);
                setStatus?.(`Atmosphere: ${p.label}`);
              }}>
                <span style={{fontSize:10}}>{p.label}</span>
              </div>
            ))}
          </div>
        </>)}

        {tab === "forces" && (<>
          <div style={S.sec}>
            <div style={S.sl}>Force Field Types</div>
            {Object.entries(FORCE_FIELD_TYPES).map(([type, def]) => (
              <div key={type} style={S.card(false)} onClick={() => {
                const sys = gpuSysRef.current;
                const scene = sceneRef?.current;
                if (!sys || !scene) { setStatus?.("Start weather first"); return; }
                const ff = createForceField(type, new THREE.Vector3(0, 2, 0), { strength:1, radius:5 });
                sys.forceFields.push(ff);
                setStatus?.(`${def.label} force field added`);
              }}>
                <span style={{fontSize:18}}>{def.icon}</span>
                <div>
                  <div style={{fontWeight:600}}>{def.label}</div>
                  <div style={{fontSize:9, color:C.muted}}>Click to add to active system</div>
                </div>
              </div>
            ))}
          </div>
          <div style={S.sec}>
            <div style={{fontSize:9, color:C.muted, lineHeight:1.7}}>
              Active force fields: {gpuSysRef.current?.forceFields.length || 0}<br/>
              Force fields affect all active weather particles in real-time.
            </div>
          </div>
        </>)}

      </div>
    </div>
  );
}
