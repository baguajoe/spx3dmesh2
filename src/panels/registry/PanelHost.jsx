import React, { useEffect, useState } from "react";

export default function PanelHost({ meshRef, sceneRef, rendererRef, setStatus }) {
  const [activePanel, setActivePanel] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setActivePanel(e.detail.panelId);
    };

    window.addEventListener("spx-open-panel", handler);
    return () => window.removeEventListener("spx-open-panel", handler);
  }, []);

  if (!activePanel) return null;

  const Panel = window.SPXPanels?.[activePanel];
  if (!Panel) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 100,
        right: 20,
        zIndex: 9999,
        background: "#111",
        border: "1px solid #333",
        padding: 10,
        minWidth: 360,
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ color: "#ddd" }}>{activePanel}</strong>
        <button onClick={() => setActivePanel(null)}>X</button>
      </div>
      <Panel
        meshRef={meshRef}
        sceneRef={sceneRef}
        rendererRef={rendererRef}
        setStatus={setStatus}
      />
    </div>
  );
}