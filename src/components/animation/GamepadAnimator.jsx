import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import {
  exportBVH, downloadBVH, captureSkeletonFrame, getBVHStats,
} from "../../mesh/BVHExporter.js";
import "../../styles/gamepad-animator.css";

const AXIS_TARGETS = [
  { id:"none",       label:"— None —" },
  { id:"move_x",     label:"Move X" },
  { id:"move_y",     label:"Move Y" },
  { id:"move_z",     label:"Move Z" },
  { id:"rotate_y",   label:"Rotate Y" },
  { id:"head_x",     label:"Head Look X" },
  { id:"head_y",     label:"Head Look Y" },
  { id:"arm_l_x",    label:"L Arm X" },
  { id:"arm_l_y",    label:"L Arm Y" },
  { id:"arm_r_x",    label:"R Arm X" },
  { id:"arm_r_y",    label:"R Arm Y" },
  { id:"spine_x",    label:"Spine Bend X" },
  { id:"spine_y",    label:"Spine Bend Y" },
  { id:"blend_walk", label:"Walk Blend" },
  { id:"blend_run",  label:"Run Blend" },
];

const BUTTON_ACTIONS = [
  { id:"none",       label:"— None —" },
  { id:"keyframe",   label:"Insert Keyframe" },
  { id:"walk",       label:"Walk Cycle" },
  { id:"run",        label:"Run Cycle" },
  { id:"jump",       label:"Jump" },
  { id:"punch_l",    label:"Punch Left" },
  { id:"punch_r",    label:"Punch Right" },
  { id:"kick",       label:"Kick" },
  { id:"block",      label:"Block" },
  { id:"dodge",      label:"Dodge Roll" },
  { id:"wave",       label:"Wave" },
  { id:"sit",        label:"Sit" },
  { id:"stand",      label:"Stand" },
  { id:"crouch",     label:"Crouch" },
  { id:"play_pause", label:"Play / Pause" },
];

const DEFAULT_MAPPING = {
  axes:    { 0:"move_x", 1:"move_z", 2:"head_x", 3:"head_y" },
  buttons: { 0:"keyframe", 1:"jump", 2:"punch_l", 3:"kick", 4:"block", 5:"punch_r", 8:"play_pause", 9:"walk" },
};

const BTN_LABELS = ["A","B","X","Y","LB","RB","LT","RT","Sel","St","LS","RS","↑","↓","←","→"];

function Toggle({ value, onChange }) {
  return (
    <div
      className={`gpa-toggle${value ? ' gpa-toggle--on' : ' gpa-toggle--off'}`}
      onClick={() => onChange(!value)}
    >
      <div className={`gpa-toggle-dot${value ? ' gpa-toggle-dot--on' : ' gpa-toggle-dot--off'}`} />
    </div>
  );
}

function KS({ label, value, min, max, step=0.01, unit="", onChange }) {
  return (
    <div className="gpa-setting-row">
      <span className="gpa-setting-label">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        className="gpa-setting-slider"
        onChange={e => onChange(+e.target.value)}
      />
      <span className="gpa-setting-val">{typeof value==="number" ? value.toFixed(2) : value}{unit}</span>
    </div>
  );
}

export default function GamepadAnimator({ open, onClose, sceneRef, meshRef, setStatus, onApplyFunction, currentFrame, setCurrentFrame, isPlaying, setIsPlaying }) {
  if (!open) return null;

  const [tab,          setTab]          = useState("control");
  const [connected,    setConnected]    = useState(false);
  const [gpIndex,      setGpIndex]      = useState(0);
  const [axes,         setAxes]         = useState([0,0,0,0,0,0,0,0]);
  const [buttons,      setButtons]      = useState(new Array(17).fill(false));
  const [mapping,      setMapping]      = useState(DEFAULT_MAPPING);
  const [recording,    setRecording]    = useState(false);
  const [deadzone,     setDeadzone]     = useState(0.12);
  const [sensitivity,  setSensitivity]  = useState(1.0);
  const [smoothing,    setSmoothing]    = useState(0.8);
  const [invertY,      setInvertY]      = useState(false);
  const [stats,        setStats]        = useState({ keys:0, duration:0, fps:0 });
  const [gpName,       setGpName]       = useState("—");

  const animRef     = useRef(null);
  const recordRef   = useRef(false);
  const keysRef     = useRef([]);
  const smoothAxes  = useRef([0,0,0,0,0,0,0,0]);
  const prevButtons = useRef(new Array(17).fill(false));
  const startTime   = useRef(null);
  const frameRef    = useRef(0);

  useEffect(() => { recordRef.current = recording; }, [recording]);

  useEffect(() => {
    const onConnect = (e) => {
      setConnected(true); setGpIndex(e.gamepad.index);
      setGpName(e.gamepad.id.substring(0,40));
      setStatus?.(`🎮 Controller connected: ${e.gamepad.id.substring(0,30)}`);
    };
    const onDisconnect = () => { setConnected(false); setGpName("—"); setStatus?.("Controller disconnected"); };
    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);
    const gps = navigator.getGamepads?.();
    if (gps) for (let i=0; i<gps.length; i++) {
      if (gps[i]) { setConnected(true); setGpIndex(i); setGpName(gps[i].id.substring(0,40)); break; }
    }
    return () => { window.removeEventListener("gamepadconnected", onConnect); window.removeEventListener("gamepaddisconnected", onDisconnect); };
  }, [setStatus]);

  const applyAxisMappings = useCallback((axisValues, dt) => {
    const mesh = meshRef?.current;
    if (!mesh) return;
    axisValues.forEach((val, axisIdx) => {
      if (Math.abs(val) < 0.001) return;
      const target = mapping.axes[axisIdx];
      const spd = val * sensitivity * dt * 3;
      if (!target || target === "none") return;
      if (target === "move_x")   mesh.position.x += spd;
      if (target === "move_y")   mesh.position.y += spd;
      if (target === "move_z")   mesh.position.z += spd;
      if (target === "rotate_y") mesh.rotation.y += spd;
      if (target === "spine_x")  mesh.rotation.z += spd * 0.3;
      if (target === "spine_y")  mesh.rotation.x += spd * 0.3;
      if (target === "head_x" || target === "head_y") {
        mesh.traverse(child => {
          if (child.isBone && (child.name.toLowerCase().includes("head") || child.name.toLowerCase().includes("neck"))) {
            if (target === "head_x") child.rotation.y += spd * 0.5;
            if (target === "head_y") child.rotation.x += spd * 0.3;
          }
        });
      }
      if (target === "arm_l_x" || target === "arm_l_y") {
        mesh.traverse(child => {
          if (child.isBone && child.name.toLowerCase().includes("arm") && child.name.toLowerCase().includes("l")) {
            if (target === "arm_l_x") child.rotation.z += spd * 0.4;
            if (target === "arm_l_y") child.rotation.x += spd * 0.4;
          }
        });
      }
      if (target === "arm_r_x" || target === "arm_r_y") {
        mesh.traverse(child => {
          if (child.isBone && child.name.toLowerCase().includes("arm") && child.name.toLowerCase().includes("r")) {
            if (target === "arm_r_x") child.rotation.z += spd * 0.4;
            if (target === "arm_r_y") child.rotation.x += spd * 0.4;
          }
        });
      }
    });
  }, [meshRef, mapping, sensitivity]);

  const onButtonPress = useCallback((btnIdx) => {
    const action = mapping.buttons[btnIdx];
    if (!action || action === "none") return;
    if (action === "keyframe")   { onApplyFunction?.("add_keyframe"); setStatus?.(`🔴 Keyframe at frame ${frameRef.current}`); }
    else if (action === "play_pause") { setIsPlaying?.(v => !v); }
    else if (action === "walk")  { onApplyFunction?.("walk_gen"); setStatus?.("Walk cycle"); }
    else if (action === "jump")  { const m=meshRef?.current; if(m){m.position.y+=0.5;setTimeout(()=>{if(m)m.position.y-=0.5},300);} setStatus?.("Jump"); }
    else if (action === "punch_l") { onApplyFunction?.("ai_anim_assist"); setStatus?.("Punch L"); }
    else { setStatus?.(action.charAt(0).toUpperCase()+action.slice(1)); }
  }, [mapping, meshRef, onApplyFunction, setStatus, setIsPlaying]);

  useEffect(() => {
    let lastTime = performance.now(); let frameCount=0, fpsTimer=0;
    const poll = () => {
      animRef.current = requestAnimationFrame(poll);
      const now = performance.now(); const dt=(now-lastTime)/1000; lastTime=now;
      frameCount++; fpsTimer+=dt;
      if (fpsTimer > 0.5) { setStats(s=>({...s,fps:Math.round(frameCount/fpsTimer)})); frameCount=0; fpsTimer=0; }
      const gps = navigator.getGamepads?.(); if (!gps) return;
      const gp = gps[gpIndex]; if (!gp) return;
      const newAxes = [...gp.axes].map((v,i) => {
        const dead = Math.abs(v)<deadzone ? 0 : v;
        const inv  = (i===3&&invertY) ? -dead : dead;
        const smoothed = (smoothAxes.current[i]||0)*smoothing + inv*(1-smoothing);
        smoothAxes.current[i]=smoothed; return smoothed;
      });
      setAxes(newAxes);
      applyAxisMappings(newAxes, dt);
      const newBtns = gp.buttons.map(b=>b.pressed);
      newBtns.forEach((pressed,i) => { if(pressed&&!prevButtons.current[i]) onButtonPress(i); });
      prevButtons.current=newBtns; setButtons(newBtns);
      if (recordRef.current) {
        const elapsed=startTime.current?(now-startTime.current)/1000:0;
        const mesh=meshRef?.current;
        if (mesh&&frameCount%2===0) {
          const frame=captureSkeletonFrame(mesh.skeleton||null,mesh,frameRef.current,elapsed);
          keysRef.current.push(frame); frameRef.current++;
          setStats(s=>({...s,keys:keysRef.current.length,duration:+elapsed.toFixed(1)}));
        }
      }
    };
    poll();
    return () => cancelAnimationFrame(animRef.current);
  }, [gpIndex,deadzone,smoothing,sensitivity,invertY,mapping,applyAxisMappings,onButtonPress]);

  const startRecording = () => {
    keysRef.current=[]; frameRef.current=0; startTime.current=performance.now();
    setRecording(true); setIsPlaying?.(true);
    setStatus?.("🔴 Recording — move controller to animate");
  };

  const stopRecording = () => {
    setRecording(false); setIsPlaying?.(false);
    setStatus?.(`⏹ Stopped — ${keysRef.current.length} keyframes`);
  };

  const exportAnimation = () => {
    if (!keysRef.current.length) { setStatus?.("No frames recorded"); return; }
    const skeleton = meshRef?.current?.skeleton || null;
    const bvhString = exportBVH(skeleton, keysRef.current, 1/30);
    const s = getBVHStats(bvhString);
    downloadBVH(bvhString, `spx_anim_${Date.now()}.bvh`);
    setStatus?.(`BVH exported — ${s.joints} joints, ${s.frames} frames`);
  };

  const setAxisMap   = (i, t) => setMapping(p=>({...p, axes:{...p.axes,[i]:t}}));
  const setButtonMap = (i, a) => setMapping(p=>({...p, buttons:{...p.buttons,[i]:a}}));

  const lx=axes[0]||0, ly=-(axes[1]||0), rx=axes[2]||0, ry=-(axes[3]||0);

  return (
    <div className="gpa-wrap">
      <div className="gpa-header">
        <span className="gpa-title">🎮 GAMEPAD ANIMATOR</span>
        <button className="gpa-close" onClick={onClose}>✕</button>
      </div>

      <div className="gpa-tabs">
        {[["control","Control"],["mapping","Mapping"],["record","Record"]].map(([id,label]) => (
          <button key={id} className={`gpa-tab${tab===id?' gpa-tab--active':''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div className="gpa-body">

        {tab === "control" && (<>
          <div className={`gpa-conn-card${connected?' gpa-conn-card--on':' gpa-conn-card--off'}`}>
            <span className="gpa-conn-icon">{connected ? "🎮" : "🔌"}</span>
            <div>
              <div className={`gpa-conn-status${connected?' gpa-conn-status--on':' gpa-conn-status--off'}`}>
                {connected ? "CONNECTED" : "NO CONTROLLER"}
              </div>
              <div className="gpa-conn-sub">{connected ? gpName : "Plug in Xbox / PS / any gamepad"}</div>
            </div>
            <div className="gpa-conn-fps">{stats.fps} fps</div>
          </div>

          {!connected && <div className="gpa-warn">Connect an Xbox, PlayStation, or generic USB/Bluetooth gamepad. Press any button after connecting to activate it.</div>}

          <div className="gpa-sec">
            <div className="gpa-sec-label">Analog Sticks</div>
            <div className="gpa-sticks">
              <div className="gpa-stick-wrap">
                <div className="gpa-stick-label">LEFT</div>
                <div className="gpa-stick">
                  <div className="gpa-stick-dot" style={{ left:`calc(50% + ${lx*30}px - 7px)`, top:`calc(50% - ${ly*30}px - 7px)` }} />
                </div>
              </div>
              <div className="gpa-axes">
                {["LX","LY","RX","RY"].map((name,i) => (
                  <div key={name} className="gpa-axis-row">
                    <div className="gpa-axis-hdr">
                      <span>{name}</span>
                      <span className="gpa-axis-val">{(axes[i]||0).toFixed(2)}</span>
                    </div>
                    <div className="gpa-axis-bar">
                      <div className="gpa-axis-fill" style={{
                        left: (axes[i]||0) >= 0 ? '50%' : `${50+(axes[i]||0)*50}%`,
                        width: `${Math.abs(axes[i]||0)*50}%`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="gpa-stick-wrap">
                <div className="gpa-stick-label">RIGHT</div>
                <div className="gpa-stick">
                  <div className="gpa-stick-dot" style={{ left:`calc(50% + ${rx*30}px - 7px)`, top:`calc(50% - ${ry*30}px - 7px)` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="gpa-sec">
            <div className="gpa-sec-label">Buttons</div>
            <div className="gpa-btns-grid">
              {BTN_LABELS.map((label,i) => (
                <div key={i} className={`gpa-btn-key${buttons[i]?' gpa-btn-key--pressed':''}`}>{label}</div>
              ))}
            </div>
          </div>

          <div className="gpa-sec">
            <div className="gpa-sec-label">Settings</div>
            <KS label="Deadzone"    value={deadzone}    min={0}   max={0.5}  step={0.01} onChange={setDeadzone}    />
            <KS label="Sensitivity" value={sensitivity} min={0.1} max={5}    step={0.1}  onChange={setSensitivity} />
            <KS label="Smoothing"   value={smoothing}   min={0}   max={0.99} step={0.01} onChange={setSmoothing}   />
            <div className="gpa-setting-row">
              <span className="gpa-setting-label">Invert Y</span>
              <Toggle value={invertY} onChange={setInvertY} />
            </div>
          </div>
        </>)}

        {tab === "mapping" && (<>
          <div className="gpa-sec">
            <div className="gpa-sec-label">Axis Mapping</div>
            {[0,1,2,3].map(i => (
              <div key={i} className="gpa-map-card">
                <div className="gpa-map-card-hdr">
                  <span className="gpa-map-axis-name">{["L-Stick X","L-Stick Y","R-Stick X","R-Stick Y"][i]}</span>
                  <span className="gpa-map-axis-val">{(axes[i]||0).toFixed(2)}</span>
                </div>
                <select className="gpa-map-select" value={mapping.axes[i]||"none"} onChange={e => setAxisMap(i,e.target.value)}>
                  {AXIS_TARGETS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="gpa-sec">
            <div className="gpa-sec-label">Button Mapping</div>
            {[0,1,2,3,4,5,8,9].map(i => (
              <div key={i} className="gpa-map-card">
                <div className="gpa-map-card-hdr">
                  <div className={`gpa-map-btn-key${buttons[i]?' gpa-map-btn-key--pressed':''}`}>
                    {["A","B","X","Y","LB","RB","","","Sel","St"][i]}
                  </div>
                  <span className="gpa-map-btn-num">Button {i}</span>
                </div>
                <select className="gpa-map-select" value={mapping.buttons[i]||"none"} onChange={e => setButtonMap(i,e.target.value)}>
                  {BUTTON_ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="gpa-sec">
            <div className="gpa-sec-label">Quick Presets</div>
            {[
              { label:"Fight / Combat",  axes:{0:"move_x",1:"move_z",2:"head_x",3:"head_y"}, buttons:{0:"keyframe",1:"kick",2:"punch_l",3:"punch_r",4:"block",5:"dodge"} },
              { label:"Walk & Explore",  axes:{0:"move_x",1:"move_z",2:"rotate_y",3:"head_y"}, buttons:{0:"keyframe",1:"jump",2:"walk",3:"run",8:"play_pause"} },
              { label:"Character Poser", axes:{0:"arm_l_x",1:"arm_l_y",2:"arm_r_x",3:"arm_r_y"}, buttons:{0:"keyframe",9:"play_pause"} },
            ].map(p => (
              <div key={p.label} className="gpa-preset-card" onClick={() => { setMapping({axes:p.axes,buttons:p.buttons}); setStatus?.(`Mapping: ${p.label}`); }}>
                {p.label}
              </div>
            ))}
          </div>
        </>)}

        {tab === "record" && (<>
          <div className="gpa-sec">
            <div className="gpa-sec-label">Recording</div>
            {!connected && <div className="gpa-warn">Connect a controller first</div>}

            <div className={`gpa-rec-display${recording?' gpa-rec-display--active':' gpa-rec-display--idle'}`}>
              <div className="gpa-rec-icon">{recording ? "🔴" : "⏺"}</div>
              {recording ? (
                <>
                  <div className="gpa-rec-label">RECORDING</div>
                  <div className="gpa-rec-info">{stats.keys} keyframes · {stats.duration}s</div>
                </>
              ) : (
                <>
                  <div className="gpa-rec-label--idle">Ready to record</div>
                  <div className="gpa-rec-info">{keysRef.current.length} keyframes captured</div>
                </>
              )}
            </div>

            <div className="gpa-rec-btns">
              <button className="gpa-rec-btn gpa-rec-btn--record" onClick={startRecording} disabled={recording||!connected}>🔴 RECORD</button>
              <button className="gpa-rec-btn gpa-rec-btn--stop"   onClick={stopRecording}  disabled={!recording}>⏹ STOP</button>
              <button className="gpa-rec-btn gpa-rec-btn--export" onClick={exportAnimation} disabled={keysRef.current.length===0}>💾 EXPORT</button>
            </div>

            <div className="gpa-tips">
              1. Select your character/mesh<br/>
              2. Hit RECORD<br/>
              3. Move controller — character follows in real-time<br/>
              4. Press A (Button 0) to insert keyframes while moving<br/>
              5. Hit STOP when done<br/>
              6. EXPORT saves animation as BVH
            </div>
          </div>

          <div className="gpa-sec">
            <div className="gpa-sec-label">Stats</div>
            {[
              ["Keyframes",      stats.keys,                          ""],
              ["Duration",       `${stats.duration}s`,                ""],
              ["Controller FPS", stats.fps,                           ""],
              ["Status",         recording?"● RECORDING":connected?"Ready":"No controller", recording?"rec":connected?"ok":""],
            ].map(([k,v,type]) => (
              <div key={k} className="gpa-stat-row">
                <span className="gpa-stat-key">{k}</span>
                <span className={`gpa-stat-val${type==="rec"?' gpa-stat-val--rec':type==="ok"?' gpa-stat-val--ok':''}`}>{v}</span>
              </div>
            ))}
          </div>

          <div className="gpa-sec">
            <div className="gpa-sec-label">iClone-style Tips</div>
            <div className="gpa-tips">
              🎯 Fight scene: Use "Fight / Combat" preset. Map punches to face buttons, movement to left stick.<br/><br/>
              🚶 Walk cycle: Use "Walk & Explore" preset. Push left stick forward to play walk animation.<br/><br/>
              💃 Dance: Map both sticks to arm bones. Move naturally while recording.<br/><br/>
              📸 Posing: Use "Character Poser" preset. Each stick controls an arm independently.
            </div>
          </div>
        </>)}

      </div>
    </div>
  );
}
