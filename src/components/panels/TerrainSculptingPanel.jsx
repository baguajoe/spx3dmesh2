import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import Knob from "../Knob";
import { TerrainSystem } from "../../systems/TerrainSystem";

const BRUSHES = ["Raise","Lower","Smooth","Flatten","Noise","Plateau","Crater","Ridge"];
const PRESETS = ["Flat Plain","Rolling Hills","Mountain Range","Canyon","Volcanic Island","Coastal","Desert Dunes","Arctic"];

function noise(x,z,oct=4){ let v=0,amp=1,freq=1; for(let i=0;i<oct;i++){ v+=Math.sin(x*freq*0.05+i)*Math.cos(z*freq*0.05+i*0.7)*amp; amp*=0.5; freq*=2; } return v; }

export default function TerrainSculptingPanel({ scene, camera }) {
  const [brush, setBrush] = useState("Raise");
  const [brushSize, setBrushSize] = useState(3);
  const [brushStr, setBrushStr] = useState(0.5);
  const [falloff, setFalloff] = useState(0.7);
  const [resolution, setResolution] = useState(64);
  const [preset, setPreset] = useState("Rolling Hills");
  const [wireframe, setWireframe] = useState(false);
  const [status, setStatus] = useState("");
  const [terrainSys, setTerrainSys] = useState(null);
  const [amplitude, setAmplitude] = useState(2.0);
  const [octaves, setOctaves] = useState(5);
  const [seed, setSeed] = useState(42);
  const terrainRef = useRef(null);

  // Build terrain
  const buildTerrain = () => {
    if (!scene) { setStatus("No scene attached"); return; }
    try {
      if (terrainRef.current) { scene.remove(terrainRef.current.getGroup()); terrainRef.current = null; }
      const sys = new TerrainSystem({ resolution, preset, seed });
      sys.generate(preset);
      scene.add(sys.getGroup());
      terrainRef.current = sys;
      setTerrainSys(sys);
      setStatus(`✓ Terrain generated — ${resolution}×${resolution}`);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const toggleWireframe = () => {
    if (!terrainRef.current?.getMesh()) return;
    const m = terrainRef.current.getMesh();
    m.material.wireframe = !wireframe;
    setWireframe(!wireframe);
  };

  const exportHmap = () => {
    if (!terrainRef.current) return;
    const url = terrainRef.current.exportHeightmap();
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = 'spx_heightmap.png'; a.click();
    setStatus("✓ Heightmap exported");
  };

  return (
    <div className="spnl-root">
      <div style={S.h2}>⛰ TERRAIN SCULPTING</div>

      {/* Preset */}
      <div className="spnl-section">
        <div className="spnl-section-title">Preset</div>
        <select value={preset} onChange={e => setPreset(e.target.value)} className="spnl-select">
          {PRESETS.map(p => <option key={p}>{p}</option>)}
        </select>
        <div style={{ display:"flex", gap:6 }}>
          <button style={S.btnPrimary} onClick={buildTerrain}>Generate</button>
          <button style={S.btnOrange} onClick={() => setSeed(Math.floor(Math.random()*9999))}>
            Randomize
          </button>
        </div>
      </div>

      {/* Generation knobs */}
      <div className="spnl-section">
        <div className="spnl-section-title">Generation Parameters</div>
        <div style={S.knobRow}>
          <Knob label="Resolution" value={resolution} min={32} max={256} step={16}
            onChange={v => setResolution(v)} size={52} unit="" />
          <Knob label="Amplitude" value={amplitude} min={0.1} max={8} step={0.1}
            onChange={v => setAmplitude(v)} size={52} unit="" />
          <Knob label="Octaves" value={octaves} min={1} max={10} step={1}
            onChange={v => setOctaves(v)} size={52} unit="" />
          <Knob label="Seed" value={seed} min={0} max={9999} step={1}
            onChange={v => setSeed(v)} size={52} unit="" accentColor="#FF6600" />
        </div>
      </div>

      {/* Brush select */}
      <div className="spnl-section">
        <div className="spnl-section-title">Sculpt Brush</div>
        <div style={{ display:"flex", flexWrap:"wrap" }}>
          {BRUSHES.map(b => (
            <button key={b} style={S.btn(brush === b)} onClick={() => setBrush(b)}>{b}</button>
          ))}
        </div>
      </div>

      {/* Brush knobs */}
      <div className="spnl-section">
        <div className="spnl-section-title">Brush Controls</div>
        <div style={S.knobRow}>
          <Knob label="Radius" value={brushSize} min={0.5} max={20} step={0.5}
            onChange={v => setBrushSize(v)} size={52} unit="u" />
          <Knob label="Strength" value={brushStr} min={0.01} max={1} step={0.01}
            onChange={v => setBrushStr(v)} size={52} unit="" />
          <Knob label="Falloff" value={falloff} min={0} max={1} step={0.01}
            onChange={v => setFalloff(v)} size={52} unit="" accentColor="#FF6600" />
        </div>
      </div>

      {/* View controls */}
      <div className="spnl-section">
        <div className="spnl-section-title">View</div>
        <button style={S.btn(wireframe)} onClick={toggleWireframe}>Wireframe</button>
        <button style={S.btnOrange} onClick={exportHmap}>Export Heightmap</button>
      </div>

      {status && <div style={{ ...S.stat, padding:"6px 8px", background:"#0d1a0d", borderRadius:4, marginTop:4 }}>{status}</div>}
    </div>
  );
}