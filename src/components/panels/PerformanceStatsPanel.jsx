import React, { useEffect, useState, useCallback } from "react";

export default function PerformanceStatsPanel({ open, onClose, rendererRef, setStatus }) {
  const [stats, setStats] = useState({ triangles: 0, calls: 0, points: 0 });

  const refresh = useCallback(() => {
    const info = rendererRef?.current?.info?.render;
    const next = {
      triangles: info?.triangles || 0,
      calls: info?.calls || 0,
      points: info?.points || 0
    };
    setStats(next);
    window.__SPX_PERF_STATS__ = next;
    setStatus?.("Performance stats refreshed");
  }, [rendererRef, setStatus]);

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open, refresh]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 320, zIndex: 67 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">PERFORMANCE STATS</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <div className="spx-slider-wrap" style={{ padding: 8 }}>
          <div className="spx-slider-header"><span>TRIANGLES</span><span className="spx-slider-header__val">{stats.triangles}</span></div>
        </div>
        <div className="spx-slider-wrap" style={{ padding: 8 }}>
          <div className="spx-slider-header"><span>DRAW CALLS</span><span className="spx-slider-header__val">{stats.calls}</span></div>
        </div>
        <div className="spx-slider-wrap" style={{ padding: 8 }}>
          <div className="spx-slider-header"><span>POINTS</span><span className="spx-slider-header__val">{stats.points}</span></div>
        </div>
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={refresh}>REFRESH</button>
        </div>
      </div>
    </div>
  );
}
