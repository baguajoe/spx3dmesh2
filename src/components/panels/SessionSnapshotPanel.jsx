import React, { useEffect, useState, useCallback } from "react";

export default function SessionSnapshotPanel({ open, onClose, setStatus }) {
  const [snapshots, setSnapshots] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("__SPX_SESSION_SNAPSHOTS__");
      if (raw) setSnapshots(JSON.parse(raw));
    } catch {}
  }, [open]);

  const persist = useCallback((next) => {
    setSnapshots(next);
    localStorage.setItem("__SPX_SESSION_SNAPSHOTS__", JSON.stringify(next));
  }, []);

  const saveSnapshot = useCallback(() => {
    if (!name.trim()) return;
    const snap = {
      id: Date.now(),
      name: name.trim(),
      time: new Date().toISOString()
    };
    const next = [...snapshots, snap];
    persist(next);
    window.__SPX_LAST_SNAPSHOT__ = snap;
    setName("");
    setStatus?.("Session snapshot saved");
  }, [name, snapshots, persist, setStatus]);

  const restoreSnapshot = useCallback((snap) => {
    window.__SPX_RESTORED_SNAPSHOT__ = snap;
    setStatus?.(`Snapshot restored: ${snap.name}`);
  }, [setStatus]);

  const removeSnapshot = useCallback((id) => {
    persist(snapshots.filter(s => s.id !== id));
    setStatus?.("Snapshot removed");
  }, [snapshots, persist, setStatus]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 68 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">SESSION SNAPSHOTS</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <input
          className="spx-slider-input"
          placeholder="snapshot name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />
        <div className="fcam-focal-chips" style={{ marginTop: 10, marginBottom: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={saveSnapshot}>SAVE SNAPSHOT</button>
        </div>
        <div style={{ display: "grid", gap: 8, maxHeight: 320, overflow: "auto" }}>
          {snapshots.map(snap => (
            <div key={snap.id} className="spx-slider-wrap" style={{ padding: 8 }}>
              <div className="spx-slider-header">
                <span>{snap.name}</span>
                <span className="spx-slider-header__val">{snap.time?.slice(11,19)}</span>
              </div>
              <div className="fcam-focal-chips" style={{ marginTop: 8 }}>
                <button className="fcam-chip" onClick={()=>restoreSnapshot(snap)}>RESTORE</button>
                <button className="fcam-chip" onClick={()=>removeSnapshot(snap.id)}>REMOVE</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
