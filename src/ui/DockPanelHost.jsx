import React from "react";
import { useSPXEditor } from "../state/SPXEditorStore";
import "../styles/spx-docking.css";

function prettyTitle(panelId) {
  return String(panelId || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function DockZone({ zone, title, meshRef, sceneRef, rendererRef, setStatus }) {
  const { dockLayout, activeDockedPanels, closeDockedPanel, openDockedPanel } = useSPXEditor();
  const panelIds = dockLayout[zone] || [];
  const activePanel = activeDockedPanels[zone];
  const Panel = activePanel ? window.SPXPanels?.[activePanel] : null;

  if (!panelIds.length) return null;

  return (
    <div className={`spx-dock spx-dock--${zone}`}>
      <div className="spx-dock__tabs">
        <div className="spx-dock__label">{title}</div>
        {panelIds.map((id) => (
          <div
            key={id}
            className={`spx-dock__tab ${activePanel === id ? "is-active" : ""}`}
            onClick={() => openDockedPanel(id, zone)}
          >
            {prettyTitle(id)}
          </div>
        ))}
        {activePanel && (
          <button className="spx-dock__close" onClick={() => closeDockedPanel(activePanel, zone)}>×</button>
        )}
      </div>

      <div className="spx-dock__body">
        {Panel ? (
          <Panel
            meshRef={meshRef}
            sceneRef={sceneRef}
            rendererRef={rendererRef}
            setStatus={setStatus}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function DockPanelHost({ meshRef, sceneRef, rendererRef, setStatus }) {
  const { openDockedPanel } = useSPXEditor();

  React.useEffect(() => {
    const handler = (e) => {
      if (e.detail?.mode !== "dock") return;
      openDockedPanel(e.detail.panelId, e.detail.zone || "right");
    };

    window.addEventListener("spx-open-panel", handler);
    return () => window.removeEventListener("spx-open-panel", handler);
  }, [openDockedPanel]);

  return (
    <>
      <DockZone zone="left" title="Tools" meshRef={meshRef} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />
      <DockZone zone="right" title="Inspector" meshRef={meshRef} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />
      <DockZone zone="bottom" title="Pipeline" meshRef={meshRef} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />
    </>
  );
}
