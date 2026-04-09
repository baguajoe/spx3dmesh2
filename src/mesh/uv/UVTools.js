import { bounds, centroid, translate, scaleNonUniform, rotate } from "./UVMath.js";
import { cloneIsland, updateIslandBounds } from "./UVIsland.js";

export function toggleIslandSeam(island) {
  const next = cloneIsland(island);
  next.seam = !next.seam;
  return next;
}

export function setIslandProjection(island, projection = "planar") {
  const next = cloneIsland(island);
  next.projection = projection;
  return next;
}

export function packIslands(islands = [], gap = 0.03) {
  let cursorX = gap;
  let rowY = gap;
  let rowH = 0;

  return islands.map((island) => {
    const next = cloneIsland(island);
    const b = bounds(next.points);
    const w = b.size.x || 0.001;
    const h = b.size.y || 0.001;

    if (cursorX + w > 1 - gap) {
      cursorX = gap;
      rowY += rowH + gap;
      rowH = 0;
    }

    next.points = translate(next.points, cursorX - b.min.x, rowY - b.min.y);
    cursorX += w + gap;
    rowH = Math.max(rowH, h);

    return updateIslandBounds(next);
  });
}

export function scaleSelectedToTexelDensity(islands = [], density = 1) {
  return islands.map((island) => {
    if (!island.selected || island.locked) return updateIslandBounds(cloneIsland(island));
    const next = cloneIsland(island);
    next.points = scaleNonUniform(next.points, density, density);
    return updateIslandBounds(next);
  });
}

export function weldNearbyUVs(island, epsilon = 0.01) {
  const next = cloneIsland(island);

  for (let i = 0; i < next.points.length; i++) {
    for (let j = i + 1; j < next.points.length; j++) {
      const a = next.points[i];
      const b = next.points[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= epsilon) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        next.points[i] = { ...mid };
        next.points[j] = { ...mid };
      }
    }
  }

  return updateIslandBounds(next);
}

export function mirrorIsland(island, axis = "x") {
  const next = cloneIsland(island);
  const c = centroid(next.points);

  next.points = next.points.map((p) => {
    if (axis === "x") {
      return { x: c.x - (p.x - c.x), y: p.y };
    }
    return { x: p.x, y: c.y - (p.y - c.y) };
  });

  return updateIslandBounds(next);
}

export function rotateSelectedBy90(islands = [], dir = 1) {
  const angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  return islands.map((island) => {
    if (!island.selected || island.locked) return updateIslandBounds(cloneIsland(island));
    const next = cloneIsland(island);
    next.points = rotate(next.points, angle);
    return updateIslandBounds(next);
  });
}

export function projectIslandToUnitSquare(island) {
  const next = cloneIsland(island);
  const b = bounds(next.points);

  next.points = next.points.map((p) => ({
    x: (p.x - b.min.x) / (b.size.x || 1),
    y: (p.y - b.min.y) / (b.size.y || 1),
  }));

  return updateIslandBounds(next);
}

export function setSelectionMode(state, mode = "island") {
  return { ...state, selectionMode: mode };
}
