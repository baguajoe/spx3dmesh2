import React, { useState } from "react";
import useDraggablePanel from "../../hooks/useDraggablePanel.js";
import { optimizeScene, getSceneStats as getLibStats } from "../../mesh/AssetLibrary.js";

export default function RenderWorkspacePanel({ open = false, onClose, sceneRef = null, canvasRef = null, setStatus = null }) {
  const { beginDrag, style } = useDraggablePanel({ x: 0, y: 0 });

  const [statsText, setStatsText] = useState("");

  const savePNG = () => {
    const canvas = canvasRef?.current;
    if (!canvas) {
      setStatus?.("No canvas found");
      return;
    }
    try {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `spx_render_${Date.now()}.png`;
      a.click();
      setStatus?.("PNG snapshot saved");
    } catch (err) {
      setStatus?.("Snapshot failed");
    }
  };

  const optimize = () => {
    const scene = sceneRef?.current;
    if (!scene) {
      setStatus?.("No scene found");
      return;
    }
    try {
      optimizeScene(scene);
      setStatus?.("Scene optimized");
    } catch (err) {
      setStatus?.("Scene optimize failed");
    }
  };

  const getStats = () => {
    const scene = sceneRef?.current;
    if (!scene) {
      setStatus?.("No scene found");
      return;
    }
    try {
      const stats = getLibStats(scene);
      setStatsText(JSON.stringify(stats, null, 2));
      setStatus?.("Scene stats ready");
    } catch (err) {
      setStatus?.("Scene stats failed");
    }
  };

  if (!open) return null;

  return (
    <div className="render-workspace-panel-float" style={{ ...style }}>
      <div className="render-workspace-panel">
        <div className="render-workspace-header" onMouseDown={beginDrag}>
          <div>
            <strong>Render Workspace</strong>
            <span className="render-workspace-sub"> snapshot, optimize, stats</span>
          </div>
          <button className="render-workspace-btn" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="render-workspace-body">
          <button className="render-workspace-btn" type="button" onClick={savePNG}>Save PNG Snapshot</button>
          <button className="render-workspace-btn" type="button" onClick={optimize}>Optimize Scene</button>
          <button className="render-workspace-btn" type="button" onClick={getStats}>Scene Stats</button>

          <textarea
            className="render-workspace-stats"
            readOnly
            value={statsText}
            placeholder="Scene stats will appear here..."
          />
        </div>
      </div>
    </div>
  );
}