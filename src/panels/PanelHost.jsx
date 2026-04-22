import React, { useEffect, useState } from "react";
import "../styles/panel-host.css";

function prettyTitle(panelId) {
  return String(panelId || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function PanelHost({ meshRef, sceneRef, rendererRef, setStatus }) {
  const [activePanel, setActivePanel] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.mode === "dock") return;
      setActivePanel(e.detail.panelId);
    };

    window.addEventListener("spx-open-panel", handler);
    return () => window.removeEventListener("spx-open-panel", handler);
  }, []);

  if (!activePanel) return null;

  const Panel = window.SPXPanels?.[activePanel];
  if (!Panel) return null;

  return (
    <div className="spx-panel-host">
      <div className="spx-panel-host__header">
        <div className="spx-panel-host__title">{prettyTitle(activePanel)}</div>
        <button className="spx-panel-host__close" onClick={() => setActivePanel(null)}>×</button>
      </div>

      <div className="spx-panel-host__body">
        <Panel
          meshRef={meshRef}
          sceneRef={sceneRef}
          rendererRef={rendererRef}
          setStatus={setStatus}
        />
      </div>
    </div>
  );
}
