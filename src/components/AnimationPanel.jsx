import React, { useState } from "react";
import MotionLibraryPanel from "./animation/MotionLibraryPanel";

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spnl-section">
      <button className="spnl-section-header" onClick={() => setOpen(v => !v)}>
        <span className="spnl-section-arrow">{open ? "▾" : "▸"}</span>
        {title}
      </button>
      {open && <div className="spnl-section-body">{children}</div>}
    </div>
  );
}

function Slider({ label, value, min, max, step = 0.01, onChange, unit = "" }) {
  return (
    <div className="spnl-row">
      <span className="spnl-label">{label}</span>
      <input className="spnl-slider" type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
      <span className="spnl-value">{typeof value === "number" ? value.toFixed(2) : value}{unit}</span>
    </div>
  );
}

export function AnimationPanel({ onApplyFunction,
  isAutoKey, setAutoKey,
  currentFrame, shapeKeys = [], nlaActions = [], nlaTracks = [],
}) {
  const [tab, setTab] = useState("keyframes"); // keyframes | nla | shapekeys | drivers | procedural
  
  // Keyframe
  const [keyType, setKeyType] = useState("location"); // location | rotation | scale | custom
  
  // NLA
  const [tracks, setTracks] = useState([
    { id: 1, name: "Track 1", muted: false, strips: [{ name: "Action.001", start: 0, end: 60 }] },
    { id: 2, name: "Track 2", muted: true,  strips: [] },
  ]);

  // Shape keys
  const [skValues, setSkValues] = useState({});

  // Drivers
  const [driverExpr, setDriverExpr] = useState("sin(frame * 0.1)");
  const [driverTarget, setDriverTarget] = useState("location.x");
  const [drivers, setDrivers] = useState([]);

  // Walk cycle
  const [walkStyle, setWalkStyle] = useState("normal");
  const [walkSpeed, setWalkSpeed] = useState(1.0);
  const [walkStride, setWalkStride] = useState(1.0);

  // Procedural
  const [procType, setProcType] = useState("float");
  const [procEnabled, setProcEnabled] = useState(false);

  // Motion Library
  const [motionLibOpen, setMotionLibOpen] = useState(true);

  return (
    <div className="spnl-root">
      <div className="spnl-tabs" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}>
        {[["keyframes","Keys"],["nla","NLA"],["shapekeys","Shapes"],["drivers","Drivers"],["procedural","Proc"],["motion","Motion"]].map(([id,lbl]) => (
          <button key={id} className={`spnl-tab${tab===id?" spnl-tab--active":""}`}
            onClick={() => setTab(id)}>
            {lbl}
          </button>
        ))}
      </div>

      <div className="spnl-body">

        {/* ── KEYFRAMES ── */}
        {tab === "keyframes" && (<>

          <Section title="Insert Keyframe">
            <div className="spnl-row">
              <span className="spnl-label">Frame</span>
              <span className="spnl-value spnl-value--highlight">{currentFrame}</span>
            </div>
            <div className="spnl-row">
              <span className="spnl-label">Type</span>
              <select className="spnl-select" value={keyType}
                onChange={e => setKeyType(e.target.value)}>
                {["location","rotation","scale","loc+rot","loc+rot+scale","custom"].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                ))}
              </select>
            </div>
            <button className="spnl-btn-full spnl-btn-accent"
              onClick={() => onApplyFunction("add_keyframe")}>
              ◆ Insert Keyframe (I)
            </button>
            <div className="spnl-row spnl-row--checks">
              <label className="spnl-check">
                <input type="checkbox" checked={isAutoKey}
                  onChange={e => { setAutoKey(e.target.checked); onApplyFunction("auto_key"); }} />
                <span style={{ color: isAutoKey ? "#e05050" : "inherit" }}>Auto Keyframe</span>
              </label>
            </div>
          </Section>

          <Section title="Playback">
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("play")}>▶ Play</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("takeSnapshot")}>📸 Render</button>
            </div>
          </Section>

          <Section title="MoCap Retarget">
            <div className="spnl-row">
              <span className="spnl-label">Source</span>
              <label className="spnl-import-btn" style={{flex:1}}>
                Load BVH
                <input type="file" accept=".bvh" style={{display:"none"}}
                  onChange={e => onApplyFunction("importBVH", e.target.files[0])} />
              </label>
            </div>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("mocap_automap")}>Auto Map</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("mocap_retarget")}>Retarget</button>
            </div>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("mocap_bake")}>Bake Animation</button>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("mocap_footfix")}>Fix Foot Sliding</button>
          </Section>

        </>)}

        {/* ── NLA EDITOR ── */}
        {tab === "nla" && (<>

          <Section title="NLA Tracks">
            <div className="spnl-nla-tracks">
              {tracks.map(track => (
                <div key={track.id} className="spnl-nla-track">
                  <div className="spnl-nla-track-header">
                    <button className="spnl-nla-mute"
                      onClick={() => setTracks(t => t.map(x => x.id===track.id ? {...x, muted:!x.muted} : x))}>
                      {track.muted ? "○" : "●"}
                    </button>
                    <span className="spnl-nla-track-name">{track.name}</span>
                  </div>
                  <div className="spnl-nla-strip-area">
                    {track.strips.map((strip, i) => (
                      <div key={i} className="spnl-nla-strip"
                        style={{ left: `${(strip.start/120)*100}%`, width: `${((strip.end-strip.start)/120)*100}%` }}>
                        <span className="spnl-nla-strip-label">{strip.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => { setTracks(t => [...t, { id: Date.now(), name: `Track ${t.length+1}`, muted: false, strips: [] }]); onApplyFunction("nla_track"); }}>+ Track</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("nla_strip")}>+ Strip</button>
            </div>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("push_action")}>Push Down Action</button>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("bake_nla")}>Bake NLA to Keyframes</button>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("nla_gltf")}>Export GLTF Animation</button>
          </Section>

        </>)}

        {/* ── SHAPE KEYS ── */}
        {tab === "shapekeys" && (<>

          <Section title="Shape Keys">
            {shapeKeys.length === 0 ? (
              <div className="spnl-empty">No shape keys — add one below</div>
            ) : (
              shapeKeys.map((sk, i) => (
                <div key={i} className="spnl-row">
                  <span className="spnl-label">{sk.name || `Key ${i}`}</span>
                  <input className="spnl-slider" type="range" min="0" max="1" step="0.01"
                    value={skValues[sk.name] || 0}
                    onChange={e => {
                      setSkValues(v => ({...v, [sk.name]: Number(e.target.value)}));
                      onApplyFunction("shapekey_apply");
                    }} />
                  <span className="spnl-value">{(skValues[sk.name] || 0).toFixed(2)}</span>
                </div>
              ))
            )}
            <button className="spnl-btn-full spnl-btn-accent"
              onClick={() => onApplyFunction("shapekey_new")}>
              + New Shape Key
            </button>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("shapekey_apply")}>Apply</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("shapekey_mirror")}>Mirror</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("shapekey_morph")}>Build Morphs</button>
            </div>
          </Section>

          <Section title="Advanced" defaultOpen={false}>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("shapekey_blend")}>Blend Keys</button>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("shapekey_driver")}>Add Driver to Key</button>
          </Section>

        </>)}

        {/* ── DRIVERS ── */}
        {tab === "drivers" && (<>

          <Section title="New Driver">
            <div className="spnl-row">
              <span className="spnl-label">Target</span>
              <select className="spnl-select" value={driverTarget}
                onChange={e => setDriverTarget(e.target.value)}>
                {["location.x","location.y","location.z","rotation.x","rotation.y","rotation.z","scale.x","scale.y","scale.z","material.roughness","material.metalness"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="spnl-row">
              <span className="spnl-label">Expression</span>
            </div>
            <input className="spnl-input spnl-input--full" type="text" value={driverExpr}
              onChange={e => setDriverExpr(e.target.value)}
              placeholder="sin(frame * 0.1)" />
            <div className="spnl-driver-presets">
              {["sin(frame*0.1)","cos(frame*0.05)","frame/100","sin(frame*0.2)*2","var*scale"].map(p => (
                <button key={p} className="spnl-driver-preset"
                  onClick={() => setDriverExpr(p)}>
                  {p}
                </button>
              ))}
            </div>
            <button className="spnl-btn-full spnl-btn-accent"
              onClick={() => { setDrivers(d => [...d, { target: driverTarget, expr: driverExpr }]); onApplyFunction("create_driver"); }}>
              + Add Driver
            </button>
          </Section>

          <Section title="Active Drivers">
            {drivers.length === 0 ? (
              <div className="spnl-empty">No drivers yet</div>
            ) : (
              drivers.map((d, i) => (
                <div key={i} className="spnl-driver-row">
                  <span className="spnl-driver-target">{d.target}</span>
                  <span className="spnl-driver-expr">{d.expr}</span>
                </div>
              ))
            )}
            {drivers.length > 0 && (
              <button className="spnl-btn-full" onClick={() => onApplyFunction("apply_drivers")}>
                Evaluate All Drivers
              </button>
            )}
          </Section>

        </>)}

        {/* ── PROCEDURAL ANIMATION ── */}
        {tab === "procedural" && (<>

          <Section title="Walk Cycle Generator">
            <div className="spnl-row">
              <span className="spnl-label">Style</span>
              <select className="spnl-select" value={walkStyle}
                onChange={e => setWalkStyle(e.target.value)}>
                {["normal","sneak","run","limp","march","strut"].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                ))}
              </select>
            </div>
            <Slider label="Speed" value={walkSpeed} min={0.1} max={3} step={0.1}
              onChange={setWalkSpeed} />
            <Slider label="Stride" value={walkStride} min={0.1} max={3} step={0.1}
              onChange={setWalkStride} />
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("walk_gen")}>Walk</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("idle_gen")}>Idle</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("breath_gen")}>Breathe</button>
            </div>
          </Section>

          <Section title="Procedural Anim">
            <div className="spnl-row">
              <span className="spnl-label">Type</span>
              <select className="spnl-select" value={procType}
                onChange={e => setProcType(e.target.value)}>
                {["float","spin","pulse","wave","bounce","orbit"].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="spnl-row spnl-row--checks">
              <label className="spnl-check">
                <input type="checkbox" checked={procEnabled}
                  onChange={e => { setProcEnabled(e.target.checked); onApplyFunction("proc_"+procType); }} />
                Enable Procedural
              </label>
            </div>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("proc_audio")}>
              🎵 Audio Reactive
            </button>
          </Section>

          <Section title="IK/FK" defaultOpen={false}>
            <div className="spnl-btn-row">
              <button className="spnl-btn" onClick={() => onApplyFunction("ik_chain")}>IK Chain</button>
              <button className="spnl-btn" onClick={() => onApplyFunction("ikfk_blend")}>IK/FK Blend</button>
            </div>
            <button className="spnl-btn-full" onClick={() => onApplyFunction("spline_ik")}>Spline IK</button>
          </Section>

        </>)}
        {/* ── MOTION LIBRARY ── */}
        {tab === "motion" && (
          <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <MotionLibraryPanel
              onOpenGamepadAnimator={() => {
                window.dispatchEvent(new CustomEvent('spx:openGamepadAnimator'));
              }}
              onClipApplied={(id, meta) => {
                onApplyFunction && onApplyFunction("motionClipApplied", { id, meta });
              }}
            />
          </div>
        )}

      </div>
    </div>
  );
}
