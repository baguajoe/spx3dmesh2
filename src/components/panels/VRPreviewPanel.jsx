import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";

const HEADSETS = ["Meta Quest 2","Meta Quest 3","Valve Index","HTC Vive Pro 2","PlayStation VR2","Apple Vision Pro","Generic WebXR"];
const VR_MODES = ["Sit-Down 360°","Room-Scale","Standing","Cinematic Viewer"];

export default function VRPreviewPanel({ scene, camera, renderer }){
  const [headset, setHeadset] = useState("Meta Quest 3");
  const [vrMode, setVrMode] = useState("Room-Scale");
  const [ipd, setIpd] = useState(63.5);
  const [fov, setFov] = useState(110);
  const [scale, setScale] = useState(1.0);
  const [comfort, setComfort] = useState(true);
  const [grid, setGrid] = useState(true);
  const [stereoActive, setStereoActive] = useState(false);
  const [xrSupported, setXrSupported] = useState(null);
  const [status, setStatus] = useState("");
  const stereoRef = useRef(null);
  const origCamera = useRef(null);
  const xrSession = useRef(null);
  const gridHelper = useRef(null);

  useEffect(()=>{
    if(navigator.xr){
      navigator.xr.isSessionSupported("immersive-vr").then(ok=>{
        setXrSupported(ok);
        setStatus(ok ? "✓ WebXR immersive-vr supported" : "WebXR not supported — using stereo preview");
      });
    } else {
      setXrSupported(false);
      setStatus("WebXR unavailable — using stereo preview");
    }
  },[]);

  function addFloorGrid(){
    if(!scene) return;
    if(gridHelper.current){ scene.remove(gridHelper.current); gridHelper.current=null; }
    if(grid){
      const g = new THREE.GridHelper(20, 20, 0x00ffc8, 0x1a1a2e);
      g.position.y = 0;
      scene.add(g);
      gridHelper.current = g;
    }
  }

  function enterStereoPreview(){
    if(!camera || !renderer){ setStatus("No camera/renderer"); return; }
    origCamera.current = { fov: camera.fov, aspect: camera.aspect };
    camera.fov = fov;
    camera.aspect = (window.innerWidth/2) / window.innerHeight;
    camera.updateProjectionMatrix();
    setStereoActive(true);
    addFloorGrid();
    setStatus("Stereo preview active — split-screen VR simulation");
  }

  function exitStereoPreview(){
    if(origCamera.current && camera){
      camera.fov = origCamera.current.fov;
      camera.aspect = origCamera.current.aspect;
      camera.updateProjectionMatrix();
    }
    if(gridHelper.current && scene){ scene.remove(gridHelper.current); gridHelper.current=null; }
    setStereoActive(false);
    setStatus("Stereo preview ended");
  }

  async function enterWebXR(){
    if(!navigator.xr || !xrSupported){ setStatus("WebXR not available"); return; }
    try {
      const session = await navigator.xr.requestSession("immersive-vr", {
        requiredFeatures:["local-floor"], optionalFeatures:["bounded-floor","hand-tracking"]
      });
      xrSession.current = session;
      renderer.xr.enabled = true;
      renderer.xr.setSession(session);
      setStatus("✓ WebXR session active");
      session.addEventListener("end", ()=>{ setStatus("WebXR session ended"); xrSession.current=null; renderer.xr.enabled=false; });
    } catch(e){ setStatus("WebXR error: "+e.message); }
  }

  async function exitWebXR(){
    if(xrSession.current){ await xrSession.current.end(); }
  }

  function applyHeadsetProfile(){
    const profiles = {
      "Meta Quest 3": { fov:120, ipd:63.5 },
      "Meta Quest 2": { fov:89, ipd:64 },
      "Valve Index": { fov:130, ipd:63 },
      "HTC Vive Pro 2": { fov:120, ipd:63.5 },
      "PlayStation VR2": { fov:110, ipd:63.5 },
      "Apple Vision Pro": { fov:90, ipd:63 },
      "Generic WebXR": { fov:100, ipd:63.5 },
    };
    const p = profiles[headset] || profiles["Generic WebXR"];
    setFov(p.fov); setIpd(p.ipd);
    setStatus(`✓ ${headset} profile applied — FOV ${p.fov}° IPD ${p.ipd}mm`);
  }

  function exportVRScene(){
    if(!scene) return;
    const data = { headset, vrMode, ipd, fov, scale, objectCount: scene.children.length };
    const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="vr_scene.json"; a.click();
  }

  return (
    <div className="spnl-root">
      <div style={S.h2}>🥽 VR PREVIEW MODE</div>

      <div className="spnl-section">
        <label className="spnl-label">Target Headset</label>
        <select className="spnl-select" value={headset} onChange={e=>setHeadset(e.target.value)}>
          {HEADSETS.map(h=><option key={h}>{h}</option>)}
        </select>
        <button className="spnl-btn" onClick={applyHeadsetProfile}>Apply Profile</button>

        <label className="spnl-label">VR Mode</label>
        <select className="spnl-select" value={vrMode} onChange={e=>setVrMode(e.target.value)}>
          {VR_MODES.map(m=><option key={m}>{m}</option>)}
        </select>

        <label className="spnl-label">IPD: {ipd}mm</label>
        <input className="spnl-input" type="range" min={54} max={74} step={0.5} value={ipd} onChange={e=>setIpd(+e.target.value)}/>

        <label className="spnl-label">FOV: {fov}°</label>
        <input className="spnl-input" type="range" min={60} max={140} step={1} value={fov} onChange={e=>setFov(+e.target.value)}/>

        <label className="spnl-label">World Scale: {scale.toFixed(2)}x</label>
        <input className="spnl-input" type="range" min={0.1} max={3} step={0.01} value={scale} onChange={e=>setScale(+e.target.value)}/>

        <div style={{display:"flex",gap:16,marginBottom:8}}>
          <label style={{...S.label,cursor:"pointer"}}><input type="checkbox" checked={comfort} onChange={e=>setComfort(e.target.checked)}/> Comfort Mode</label>
          <label style={{...S.label,cursor:"pointer"}}><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/> Floor Grid</label>
        </div>
      </div>

      <div style={S.vr}>
        <div style={{...S.label,color:"#00ffc8",marginBottom:8}}>XR Status: {status || "Ready"}</div>
        {!stereoActive
          ? <button className="spnl-btn" onClick={enterStereoPreview}>👁 Enter Stereo Preview</button>
          : <button style={S.btnRed} onClick={exitStereoPreview}>✕ Exit Stereo Preview</button>
        }
        {xrSupported &&
          <button style={S.btnO} onClick={xrSession.current ? exitWebXR : enterWebXR}>
            {xrSession.current ? "✕ Exit WebXR" : "🥽 Enter WebXR"}
          </button>
        }
      </div>

      <button className="spnl-btn" onClick={exportVRScene}>💾 Export VR Config</button>

      <div className="spnl-section">
        <div className="spnl-label">VR Optimization Guide</div>
        <div style={{fontSize:10,color:"#888",lineHeight:1.6}}>
          • Target 72–90 FPS for comfort<br/>
          • Keep draw calls under 200<br/>
          • Use baked lighting where possible<br/>
          • Enable frustum culling on all meshes<br/>
          • Poly budget: ~500K tris total scene<br/>
          • Texture atlas to reduce draw calls
        </div>
      </div>
    </div>
  );
}