import { bounds } from "./UVMath.js";

export function createCheckerPattern(size = 8) {
  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      cells.push({
        x: x / size,
        y: y / size,
        w: 1 / size,
        h: 1 / size,
        dark: (x + y) % 2 === 0,
      });
    }
  }
  return cells;
}

export function islandDistortionScore(island) {
  const pts = island.points || [];
  if (pts.length < 3) return 0;

  let perimeter = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  const b = bounds(pts);
  const area = Math.max(0.00001, b.size.x * b.size.y);
  return Math.min(1, perimeter / (area * 8));
}

export function distortionColor(score) {
  const t = Math.max(0, Math.min(1, score));
  const r = Math.round(255 * t);
  const g = Math.round(180 * (1 - t));
  const b = Math.round(255 * (1 - t));
  return `rgba(${r},${g},${b},0.32)`;
}

export function uvStats(islands = []) {
  const selected = islands.filter(i => i.selected);
  const all = islands.length;
  const visible = islands.filter(i => i.visible !== false).length;
  const points = islands.reduce((acc, i) => acc + (i.points?.length || 0), 0);

  return {
    islands: all,
    visible,
    points,
    selected: selected.length,
  };
}
