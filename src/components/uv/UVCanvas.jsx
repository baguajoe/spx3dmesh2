import React, { useMemo, useRef, useState } from "react";
import { rectFromPoints } from "../../mesh/uv/UVMath.js";
import { createCheckerPattern, islandDistortionScore, distortionColor } from "../../mesh/uv/UVPreview.js";

const SIZE = 420;
const GRID_DIVS = 10;

function toScreen(p) {
  return { x: p.x * SIZE, y: (1 - p.y) * SIZE };
}

function fromScreen(x, y) {
  return { x: x / SIZE, y: 1 - y / SIZE };
}

function islandHit(island, x, y) {
  const b = island.bounds;
  const minX = b.min.x * SIZE;
  const maxX = b.max.x * SIZE;
  const minY = (1 - b.max.y) * SIZE;
  const maxY = (1 - b.min.y) * SIZE;
  return x >= minX && x <= maxX && y >= minY && y <= maxY;

function pointHit(islands, x, y) {
  const radius = 7;
  for (let i = islands.length - 1; i >= 0; i--) {
    const island = islands[i];
    for (let j = 0; j < (island.points || []).length; j++) {
      const p = toScreen(island.points[j]);
      const dx = p.x - x;
      const dy = p.y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        return { islandId: island.id, pointIndex: j };
      }
    }
  }
  return null;
}

}

export default function UVCanvas({
  islands = [],
  onSelectIsland,
  onBoxSelect,
  onMoveSelected,
  onMovePoint,
  checkerEnabled = true,
  heatmapEnabled = false,
  snapEnabled = false,
}) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [activePoint, setActivePoint] = useState(null);
  const [boxStart, setBoxStart] = useState(null);
  const [boxCurrent, setBoxCurrent] = useState(null);

  const checkerCells = useMemo(() => createCheckerPattern(8), []);

  const grid = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= GRID_DIVS; i++) {
      const p = (i / GRID_DIVS) * SIZE;
      lines.push(
        <line key={`v-${i}`} x1={p} y1={0} x2={p} y2={SIZE} stroke="rgba(255,255,255,0.08)" />,
        <line key={`h-${i}`} x1={0} y1={p} x2={SIZE} y2={p} stroke="rgba(255,255,255,0.08)" />
      );
    }
    return lines;
  }, []);

  const getPos = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const handleMouseDown = (e) => {
    const pos = getPos(e);
    const point = pointHit(islands, pos.x, pos.y);
    if (point) {
      setActivePoint(point);
      setDragging(true);
      setBoxStart(pos);
      setBoxCurrent(pos);
      return;
    }

    const hit = [...islands].reverse().find((island) => islandHit(island, pos.x, pos.y));

    if (hit) {
      onSelectIsland?.(hit.id, e.shiftKey);
      setDragging(true);
      setBoxStart(pos);
      setBoxCurrent(pos);
      return;
    }

    setDragging(false);
    setBoxStart(pos);
    setBoxCurrent(pos);
  };

  const handleMouseMove = (e) => {
    if (!boxStart) return;
    const pos = getPos(e);

    if (dragging) {
      const dx = (pos.x - boxCurrent.x) / SIZE;
      const dy = -(pos.y - boxCurrent.y) / SIZE;

      if (activePoint) {
        onMovePoint?.(activePoint.islandId, activePoint.pointIndex, dx, dy, snapEnabled);
      } else {
        onMoveSelected?.(dx, dy);
      }

      setBoxCurrent(pos);
      return;
    }

    setBoxCurrent(pos);
  };

  const handleMouseUp = () => {
    if (boxStart && boxCurrent && !dragging) {
      const a = fromScreen(boxStart.x, boxStart.y);
      const b = fromScreen(boxCurrent.x, boxCurrent.y);
      onBoxSelect?.(rectFromPoints(a, b));
    }

    setDragging(false);
    setActivePoint(null);
    setBoxStart(null);
    setBoxCurrent(null);
  };

  let selectionRect = null;
  if (boxStart && boxCurrent && !dragging) {
    const x = Math.min(boxStart.x, boxCurrent.x);
    const y = Math.min(boxStart.y, boxCurrent.y);
    const w = Math.abs(boxCurrent.x - boxStart.x);
    const h = Math.abs(boxCurrent.y - boxStart.y);
    selectionRect = { x, y, w, h };
  }

  return (
    <div className="uv-canvas-wrap">
      <svg
        ref={svgRef}
        className="uv-canvas"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <rect x="0" y="0" width={SIZE} height={SIZE} fill="#10151c" />
        {checkerEnabled && checkerCells.map((cell, idx) => (
          <rect
            key={`checker-${idx}`}
            x={cell.x * SIZE}
            y={cell.y * SIZE}
            width={cell.w * SIZE}
            height={cell.h * SIZE}
            fill={cell.dark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.08)"}
          />
        ))}
        {grid}
        <rect x="0" y="0" width={SIZE} height={SIZE} fill="none" stroke="rgba(255,255,255,0.18)" />

        {islands.map((island) => (
          <g key={island.id}>
            <polygon
              points={(island.points || [])
                .map((p) => {
                  const s = toScreen(p);
                  return `${s.x},${s.y}`;
                })
                .join(" ")}
              fill={heatmapEnabled ? distortionColor(islandDistortionScore(island)) : (island.selected ? "rgba(74,140,255,0.28)" : "rgba(255,255,255,0.07)")}
              stroke={island.selected ? "#4a8cff" : "rgba(255,255,255,0.28)"}
              strokeWidth="1.25"
            />
            {(island.points || []).map((p, idx) => {
              const s = toScreen(p);
              return (
                <circle
                  key={`${island.id}-${idx}`}
                  cx={s.x}
                  cy={s.y}
                  r="3"
                  fill={island.selected ? "#9ec5ff" : "#d8dee9"}
                />
              );
            })}
          </g>
        ))}

        {selectionRect && (
          <rect
            x={selectionRect.x}
            y={selectionRect.y}
            width={selectionRect.w}
            height={selectionRect.h}
            fill="rgba(74,140,255,0.15)"
            stroke="#4a8cff"
            strokeDasharray="4 4"
          />
        )}
      </svg>
    </div>
  );
}
