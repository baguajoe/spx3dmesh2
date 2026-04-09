import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import Knob from "../Knob";
import { EnvironmentSystem } from "../../systems/EnvironmentSystem";

const S = {
  root: { background:"#06060f", color:"#e0e0e0", fontFamily:"JetBrains Mono,monospace", padding:16, height:"100%", overflowY:"auto" },
  h2:   { color:"#00ffc8", fontSize:14, marginBottom:12, letterSpacing:1, borderBottom:"1px solid #1a1a2e", paddingBottom:8 },
  section: { background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:6, padding:12, marginBottom:10 },
  sectionTitle: { fontSize:10, color:"#00ffc8", letterSpacing:1, marginBottom:10, textTransform:"uppercase" },
  btn: (active) => ({
    background: active ? "#00ffc8" : "#1a1a2e",
    color: active ? "#06060f" : "#e0e0e0",
    border: `1px solid ${active ? "#00ffc8" : "#333"}`,
    borderRadius:4, padding:"5px 10px", fontFamily:"JetBrains Mono,monospace",
    fontSize:10, cursor:"pointer", marginRight:4, marginBottom:4,
  }),
  btnPrimary: { background:"#00ffc8", color:"#06060f", border:"none", borderRadius:4, padding:"7px 14px", fontFamily:"JetBrains Mono,monospace", fontSize:11, fontWeight:700, cursor:"pointer", marginRight:6, marginBottom:6 },
  btnOrange:  { background:"#FF6600", color:"#fff",    border:"none", borderRadius:4, padding:"7px 14px", fontFamily:"JetBrains Mono,monospace", fontSize:11, fontWeight:700, cursor:"pointer", marginRight:6, marginBottom:6 },
  select: { width:"100%", background:"#0d0d1a", border:"1px solid #1a1a2e", color:"#e0e0e0", padding:"4px 8px", borderRadius:4, fontFamily:"JetBrains Mono,monospace", fontSize:11, marginBottom:8 },
  stat: { fontSize:10, color:"#00ffc8", marginBottom:4, letterSpacing:0.5 },
  knobRow: { display:"flex", flexWrap:"wrap", gap:8, justifyContent:"flex-start", marginTop:6 },
  colorRow: { display:"flex", gap:8, alignItems:"center", marginBottom:8 },
  colorLabel: { fontSize:10, color:"#888", minWidth:70 },
  colorInput: { width:40, height:24, border:"1px solid #1a1a2e", borderRadius:3, cursor:"pointer", background:"none" },
};

const PRESETS = ["Day Clear","Day Overcast","Sunset","Night","Foggy Morning","Studio","Alien World","Arctic Tundra"];

export default function EnvironmentGeneratorPanel({ scene, camera }) {
  const [preset, setPreset] = useState("Day Clear");
  const [sunEl, setSunEl] = useState(60);
  const [sunAz, setSunAz] = useState(180);
  const [turbidity, setTurbidity] = useState(1.0);
  const [rayleigh, setRayleigh] = useState(2.0);
  const [fogNear, setFogNear] = useState(100);
  const [fogFar, setFogFar] = useState(600);
  const [ambientInt, setAmbientInt] = useState(1.0);
  const [timeOfDay, setTimeOfDay] = useState(12);
  const [fogColor, setFogColor] = useState("#c8d8f0");
  const [skyZenith, setSkyZenith] = useState("#0a4a8c");
  const [skyHorizon, setSkyHorizon] = useState("#b8d4f0");
  const [animate, setAnimate] = useState(false);
  const [status, setStatus] = useState("");
  const envRef = useRef(null);
  const animRef = useRef(null);
  const todRef = useRef(12);

  const buildEnv = () => {
    if (!scene) { setStatus("No scene attached"); return; }
    try {
      if (envRef.current) { scene.remove(envRef.current.getGroup()); envRef.current = null; }
      const env = new EnvironmentSystem(scene, { preset });
      scene.add(env.getGroup());
      envRef.current = env;
      syncFromPreset(preset, env);
      setStatus(`✓ Environment: ${preset}`);
    } catch(e) { setStatus(`Error: ${e.message}`); }
  };

  const syncFromPreset = (name, env) => {
    const p = env?.params;
    if (!p) return;
    setSunEl(p.sunEl); setSunAz(p.sunAz);
    setTurbidity(p.turbidity); setRayleigh(p.rayleigh);
    setFogNear(p.fogNear); setFogFar(p.fogFar);
    setAmbientInt(p.ambientInt); setFogColor(p.fogColor);
    setSkyZenith(p.skyZenith); setSkyHorizon(p.skyHorizon);
  };

  // Live-update on knob changes
  useEffect(() => {
    if (!envRef.current) return;
    envRef.current.setSunElevation(sunEl);
  }, [sunEl]);
  useEffect(() => { if (envRef.current) envRef.current.setSunAzimuth(sunAz); }, [sunAz]);
  useEffect(() => { if (envRef.current) envRef.current.setTurbidity(turbidity); }, [turbidity]);
  useEffect(() => { if (envRef.current) envRef.current.setRayleigh(rayleigh); }, [rayleigh]);
  useEffect(() => { if (envRef.current) envRef.current.setFog(fogNear, fogFar, fogColor); }, [fogNear, fogFar, fogColor]);
  useEffect(() => { if (envRef.current) envRef.current.setAmbientIntensity(ambientInt); }, [ambientInt]);
  useEffect(() => { if (envRef.current) envRef.current.setSkyColors(skyZenith, skyHorizon); }, [skyZenith, skyHorizon]);

  // Time-of-day animation
  useEffect(() => {
    if (animate && envRef.current) {
      animRef.current = setInterval(() => {
        todRef.current = (todRef.current + 0.05) % 24;
        envRef.current.setTimeOfDay(todRef.current);
        setTimeOfDay(parseFloat(todRef.current.toFixed(1)));
      }, 100);
    } else {
      clearInterval(animRef.current);
    }
    return () => clearInterval(animRef.current);
  }, [animate]);

  const loadPreset = (name) => {
    setPreset(name);
    if (envRef.current) { envRef.current.applyPreset(name); syncFromPreset(name, envRef.current); setStatus(`✓ Preset: ${name}`); }
  };

  return (
    <div style={S.root}>
      <div style={S.h2}>🌅 ENVIRONMENT GENERATOR</div>

      {/* Preset */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Preset</div>
        <select value={preset} onChange={e => loadPreset(e.target.value)} style={S.select}>
          {PRESETS.map(p => <option key={p}>{p}</option>)}
        </select>
        <button style={S.btnPrimary} onClick={buildEnv}>Build Environment</button>
      </div>

      {/* Sun knobs */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Sun / Atmosphere</div>
        <div style={S.knobRow}>
          <Knob label="Elevation" value={sunEl} min={-30} max={90} step={1}
            onChange={setSunEl} size={52} unit="°" />
          <Knob label="Azimuth" value={sunAz} min={0} max={360} step={1}
            onChange={setSunAz} size={52} unit="°" accentColor="#FF6600" />
          <Knob label="Turbidity" value={turbidity} min={0.1} max={10} step={0.1}
            onChange={setTurbidity} size={52} unit="" />
          <Knob label="Rayleigh" value={rayleigh} min={0.1} max={8} step={0.1}
            onChange={setRayleigh} size={52} unit="" />
          <Knob label="Ambient" value={ambientInt} min={0} max={3} step={0.05}
            onChange={setAmbientInt} size={52} unit="×" accentColor="#FF6600" />
        </div>
      </div>

      {/* Fog knobs */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Fog</div>
        <div style={S.knobRow}>
          <Knob label="Near" value={fogNear} min={0} max={500} step={5}
            onChange={setFogNear} size={52} unit="u" />
          <Knob label="Far" value={fogFar} min={50} max={3000} step={10}
            onChange={setFogFar} size={52} unit="u" accentColor="#FF6600" />
        </div>
      </div>

      {/* Time of day */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Time of Day</div>
        <div style={S.knobRow}>
          <Knob label="Hour" value={timeOfDay} min={0} max={23.9} step={0.1}
            onChange={v => { setTimeOfDay(v); todRef.current = v; if (envRef.current) envRef.current.setTimeOfDay(v); }}
            size={64} unit="h" accentColor="#FF6600" />
        </div>
        <div style={{ marginTop:8 }}>
          <button style={S.btn(animate)} onClick={() => setAnimate(!animate)}>
            {animate ? "⏸ Stop Animation" : "▶ Animate Day Cycle"}
          </button>
        </div>
      </div>

      {/* Sky colors */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Sky Colors</div>
        <div style={S.colorRow}>
          <span style={S.colorLabel}>Zenith</span>
          <input type="color" value={skyZenith} onChange={e => setSkyZenith(e.target.value)} style={S.colorInput} />
          <span style={{ fontSize:10, color:"#555", fontFamily:"JetBrains Mono,monospace" }}>{skyZenith}</span>
        </div>
        <div style={S.colorRow}>
          <span style={S.colorLabel}>Horizon</span>
          <input type="color" value={skyHorizon} onChange={e => setSkyHorizon(e.target.value)} style={S.colorInput} />
          <span style={{ fontSize:10, color:"#555", fontFamily:"JetBrains Mono,monospace" }}>{skyHorizon}</span>
        </div>
        <div style={S.colorRow}>
          <span style={S.colorLabel}>Fog Color</span>
          <input type="color" value={fogColor} onChange={e => setFogColor(e.target.value)} style={S.colorInput} />
          <span style={{ fontSize:10, color:"#555", fontFamily:"JetBrains Mono,monospace" }}>{fogColor}</span>
        </div>
      </div>

      {status && <div style={{ ...S.stat, padding:"6px 8px", background:"#0d1a0d", borderRadius:4, marginTop:4 }}>{status}</div>}
    </div>
  );
}