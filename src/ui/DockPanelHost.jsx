import React, { useEffect, useState } from "react";
import { getPanel } from "../panels/registry/panelRegistry";

export default function DockPanelHost({ meshRef, sceneRef, rendererRef, setStatus }) {
  const [panels, setPanels] = useState({
    left: [],
    right: [],
    bottom: []
  });

  // ✅ RESET PANELS ON LOAD (fix ghost panels)
  useEffect(() => {
    setPanels({
      left: [],
      right: [],
      bottom: []
    });
  }, []);

  // ✅ OPEN PANEL (prevent duplicates)
  const openDockedPanel = (panelId, zone = "right") => {
    setPanels((prev) => {
      if (prev[zone].includes(panelId)) return prev;
      return {
        ...prev,
        [zone]: [...prev[zone], panelId]
      };
    });
  };

  // ✅ CLOSE PANEL (fully remove)
  const closePanel = (panelId, zone) => {
    setPanels((prev) => ({
      ...prev,
      [zone]: prev[zone].filter((p) => p !== panelId)
    }));
  };

  // ✅ GLOBAL EVENT LISTENER
  useEffect(() => {
    const handler = (e) => {
      const { panelId, zone } = e.detail || {};
      if (!panelId) return;
      openDockedPanel(panelId, zone || "right");
    };

    window.addEventListener("spx-open-panel", handler);
    return () => window.removeEventListener("spx-open-panel", handler);
  }, []);

  const renderZone = (zone) => {
    return panels[zone].map((panelId) => {
      const entry = getPanel(panelId);
      if (!entry) return null;

      const PanelComponent = entry.component;

      return (
        <div key={panelId} className={`spx-dock-panel spx-dock-${zone}`}>
          <div className="spx-dock-header">
            <span>{panelId}</span>
            <button onClick={() => closePanel(panelId, zone)}>X</button>
          </div>

          <PanelComponent
            meshRef={meshRef}
            sceneRef={sceneRef}
            rendererRef={rendererRef}
            setStatus={setStatus}
          />
        </div>
      );
    });
  };

  return (
    <>
      <div className="spx-dock-left">{renderZone("left")}</div>
      <div className="spx-dock-right">{renderZone("right")}</div>
      <div className="spx-dock-bottom">{renderZone("bottom")}</div>
    </>
  );
}
