import React, { useState } from "react";
import AutoRigPanel from "./AutoRigPanel.jsx";
import AdvancedRigPanel from "./AdvancedRigPanel.jsx";
import "../../styles/rigging.css";

export default function RiggingPanel({ open, onClose, sceneRef, setStatus }) {
  const [tab, setTab] = useState("auto");
  if (!open) return null;

  return (
    <div className="rig-overlay" onClick={onClose}>
      <div className="rig-panel" onClick={e => e.stopPropagation()}>

        <div className="rig-header">
          <span className="rig-logo">SPX</span>
          <strong className="rig-title">Rigging</strong>
          <span className="rig-sub">auto · advanced · manual</span>
          <button className="rig-close" onClick={onClose}>✕</button>
        </div>

        <div className="rig-tabs">
          {[["auto","Auto Rig"],["advanced","Advanced"],["manual","Manual"]].map(([id, lbl]) => (
            <button
              key={id}
              className={`rig-tab${tab===id ? ' rig-tab--active' : ''}`}
              onClick={() => setTab(id)}
            >{lbl}</button>
          ))}
        </div>

        <div className="rig-body">
          {tab === "auto"     && <AutoRigPanel open sceneRef={sceneRef} setStatus={setStatus} onClose={() => {}} />}
          {tab === "advanced" && <AdvancedRigPanel open sceneRef={sceneRef} setStatus={setStatus} onClose={() => {}} />}
          {tab === "manual"   && (
            <div className="rig-manual">
              <p className="rig-manual__intro">Manual rigging is done directly in the 3D viewport:</p>
              <ol className="rig-manual__list">
                <li>Switch to <strong className="rig-manual__em">Rigging</strong> mode in the top bar</li>
                <li>Use <strong className="rig-manual__em">Add Bone</strong> to place bones</li>
                <li>Parent bones to build the hierarchy</li>
                <li>Use <strong className="rig-manual__em">Bind Mesh</strong> to attach the mesh</li>
                <li>Paint weights in <strong className="rig-manual__em">Weight Paint</strong> mode</li>
              </ol>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
