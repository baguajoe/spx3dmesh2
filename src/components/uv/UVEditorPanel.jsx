import React, { useEffect, useMemo, useState } from "react";
import UVCanvas from "./UVCanvas.jsx";
import {
  clearSelection,
  selectIsland,
  selectByBounds,
  getSelected,
} from "../../mesh/uv/UVSelection.js";
import {
  translate,
  rotate,
  scaleFromCenter,
  bounds,
} from "../../mesh/uv/UVMath.js";
import {
  createIsland,
  updateIslandBounds,
  cloneIsland,
} from "../../mesh/uv/UVIsland.js";
import {
  toggleIslandSeam,
  setIslandProjection,
  packIslands,
  scaleSelectedToTexelDensity,
  weldNearbyUVs,
  mirrorIsland,
  rotateSelectedBy90,
  projectIslandToUnitSquare,
} from "../../mesh/uv/UVTools.js";
import { uvStats } from "../../mesh/uv/UVPreview.js";
import { snapPoint } from "../../mesh/uv/UVSnap.js";

const demoUVs = [
  0.10, 0.10, 0.35, 0.10, 0.35, 0.30, 0.10, 0.30,
  0.55, 0.45, 0.82, 0.50, 0.72, 0.78, 0.50, 0.70
];

const demoIslands = [
  createIsland([0, 1, 2, 3], demoUVs),
  createIsland([4, 5, 6, 7], demoUVs),
];

export default function UVEditorPanel({ open = false, onClose }) {
  const [islands, setIslands] = useState(demoIslands);
  const [rotateDeg, setRotateDeg] = useState(15);
  const [scaleAmt, setScaleAmt] = useState(1.1);
  const [selectionMode, setSelectionMode] = useState("island");
  const [texelDensity, setTexelDensity] = useState(1.0);
  const [projectionMode, setProjectionMode] = useState("planar");
  const [checkerEnabled, setCheckerEnabled] = useState(true);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [activeObject, setActiveObject] = useState("Object 1");

  useEffect(() => {
    setIslands((prev) => prev.map((i) => updateIslandBounds(cloneIsland(i))));
  }, []);

  const selectedCount = useMemo(() => getSelected(islands).length, [islands]);
  const stats = useMemo(() => uvStats(islands), [islands]);

  const applyIslandOp = (op) => {
    setIslands((prev) => prev.map((island) => {
      if (!island.selected || island.locked) return updateIslandBounds(cloneIsland(island));
      return updateIslandBounds(op(island));
    }));
  };

  const updateSelected = (transformer) => {
    setIslands((prev) =>
      prev.map((island) => {
        if (!island.selected || island.locked) return updateIslandBounds(cloneIsland(island));
        const next = cloneIsland(island);
        next.points = transformer(next.points);
        return updateIslandBounds(next);
      })
    );
  };

  const handleSelectIsland = (id, additive = false) => {
    setIslands((prev) => {
      const next = prev.map((i) => updateIslandBounds(cloneIsland(i)));
      if (!additive) clearSelection(next);
      const hit = next.find((i) => i.id === id);
      if (hit) selectIsland(hit);
      return next;
    });
  };

  const handleBoxSelect = (rect) => {
    setIslands((prev) => {
      const next = prev.map((i) => updateIslandBounds(cloneIsland(i)));
      clearSelection(next);
      selectByBounds(next, rect);
      return next;
    });
  };

  const handleMoveSelected = (dx, dy) => {
    updateSelected((pts) => translate(pts, dx, dy));
  };

  const handleMovePoint = (islandId, pointIndex, dx, dy, snapToGrid = false) => {
    setIslands((prev) =>
      prev.map((island) => {
        const next = updateIslandBounds(cloneIsland(island));
        if (next.id !== islandId || next.locked) return next;
        const p = next.points[pointIndex];
        if (!p) return next;
        const moved = { x: p.x + dx, y: p.y + dy };
        next.points[pointIndex] = snapToGrid ? snapPoint(moved, 0.0625) : moved;
        return updateIslandBounds(next);
      })
    );
  };

  const handleRotate = (dir = 1) => {
    updateSelected((pts) => rotate(pts, (rotateDeg * dir * Math.PI) / 180));
  };

  const handleScale = (dir = 1) => {
    updateSelected((pts) => scaleFromCenter(pts, dir > 0 ? scaleAmt : 1 / scaleAmt));
  };

  const handlePack = () => {
    setIslands((prev) => packIslands(prev));
  };

  const handleTexelDensity = () => {
    setIslands((prev) => scaleSelectedToTexelDensity(prev, texelDensity));
  };

  const handleWeld = () => {
    applyIslandOp((island) => weldNearbyUVs(island, 0.02));
  };

  const handleMirrorX = () => {
    applyIslandOp((island) => mirrorIsland(island, "x"));
  };

  const handleMirrorY = () => {
    applyIslandOp((island) => mirrorIsland(island, "y"));
  };

  const handleRotate90 = (dir = 1) => {
    setIslands((prev) => rotateSelectedBy90(prev, dir));
  };

  const handleProjection = () => {
    applyIslandOp((island) => setIslandProjection(projectIslandToUnitSquare(island), projectionMode));
  };

  const handleToggleSeam = () => {
    applyIslandOp((island) => toggleIslandSeam(island));
  };

  const handleNormalize = () => {
    const sel = getSelected(islands);
    if (!sel.length) return;

    const allPts = sel.flatMap((i) => i.points);
    const b = bounds(allPts);

    updateSelected((pts) =>
      pts.map((p) => ({
        x: (p.x - b.min.x) / (b.size.x || 1),
        y: (p.y - b.min.y) / (b.size.y || 1),
      }))
    );
  };

  if (!open) return null;

  return (
    <div className="uv-panel-float">
      <div className="uv-panel">
        <div className="uv-panel-header">
          <div>
            <strong>UV Editor</strong>
            <span className="uv-panel-sub"> {selectedCount} selected</span>
          </div>
          <div className="uv-header-actions">
            <select
              className="uv-input"
              value={activeObject}
              onChange={(e) => setActiveObject(e.target.value)}
            >
              <option>Object 1</option>
              <option>Object 2</option>
              <option>Object 3</option>
            </select>
            <button type="button" className="uv-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="uv-stats">
          <span>Islands: {stats.islands}</span>
          <span>Visible: {stats.visible}</span>
          <span>Points: {stats.points}</span>
          <span>Selected: {stats.selected}</span>
        </div>

        <div className="uv-toolbar">
          <button type="button" className="uv-btn" onClick={() => handleRotate(-1)}>Rotate -</button>
          <button type="button" className="uv-btn" onClick={() => handleRotate(1)}>Rotate +</button>
          <input
            className="uv-input"
            type="number"
            value={rotateDeg}
            onChange={(e) => setRotateDeg(Number(e.target.value || 0))}
          />
          <button type="button" className="uv-btn" onClick={() => handleScale(1)}>Scale +</button>
          <button type="button" className="uv-btn" onClick={() => handleScale(-1)}>Scale -</button>
          <input
            className="uv-input"
            type="number"
            step="0.05"
            value={scaleAmt}
            onChange={(e) => setScaleAmt(Number(e.target.value || 1.1))}
          />
          <button type="button" className="uv-btn" onClick={handleNormalize}>Normalize</button>
        </div>


        <div className="uv-toolbar uv-toolbar-row">
          <button type="button" className={`uv-btn ${selectionMode === "island" ? "is-active" : ""}`} onClick={() => setSelectionMode("island")}>Island</button>
          <button type="button" className={`uv-btn ${selectionMode === "edge" ? "is-active" : ""}`} onClick={() => setSelectionMode("edge")}>Edge</button>
          <button type="button" className={`uv-btn ${selectionMode === "face" ? "is-active" : ""}`} onClick={() => setSelectionMode("face")}>Face</button>
          <button type="button" className="uv-btn" onClick={() => handleRotate90(-1)}>90° -</button>
          <button type="button" className="uv-btn" onClick={() => handleRotate90(1)}>90° +</button>
          <button type="button" className="uv-btn" onClick={handlePack}>Pack</button>
          <button type="button" className="uv-btn" onClick={handleWeld}>Weld</button>
        </div>

        <div className="uv-toolbar uv-toolbar-row">
          <button type="button" className="uv-btn" onClick={handleMirrorX}>Mirror X</button>
          <button type="button" className="uv-btn" onClick={handleMirrorY}>Mirror Y</button>
          <button type="button" className="uv-btn" onClick={handleToggleSeam}>Toggle Seam</button>
          <select
            className="uv-input"
            value={projectionMode}
            onChange={(e) => setProjectionMode(e.target.value)}
          >
            <option value="planar">Planar</option>
            <option value="box">Box</option>
            <option value="cylindrical">Cylindrical</option>
          </select>
          <button type="button" className="uv-btn" onClick={handleProjection}>Project</button>
          <input
            className="uv-input"
            type="number"
            step="0.1"
            value={texelDensity}
            onChange={(e) => setTexelDensity(Number(e.target.value || 1))}
          />
          <button type="button" className="uv-btn" onClick={handleTexelDensity}>Texel</button>
        </div>

        <UVCanvas
          islands={islands}
          onSelectIsland={handleSelectIsland}
          onBoxSelect={handleBoxSelect}
          onMoveSelected={handleMoveSelected}
          onMovePoint={handleMovePoint}
          checkerEnabled={checkerEnabled}
          heatmapEnabled={heatmapEnabled}
          snapEnabled={snapEnabled}
        />
      </div>
    </div>
  );
}
