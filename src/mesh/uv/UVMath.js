export const UV_EPSILON = 1e-5;

export function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function vec2(x = 0, y = 0) {
  return { x, y };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function mul(v, s) {
  return { x: v.x * s, y: v.y * s };
}

export function centroid(points = []) {
  if (!points.length) return { x: 0.5, y: 0.5 };
  let x = 0, y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

export function bounds(points = []) {
  if (!points.length) {
    return {
      min: { x: 0, y: 0 },
      max: { x: 1, y: 1 },
      size: { x: 1, y: 1 },
      center: { x: 0.5, y: 0.5 },
    };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
    size: { x: maxX - minX, y: maxY - minY },
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  };
}

export function normalize(points = []) {
  const b = bounds(points);
  return points.map((p) => ({
    x: (p.x - b.min.x) / (b.size.x || 1),
    y: (p.y - b.min.y) / (b.size.y || 1),
  }));
}

export function translate(points = [], dx = 0, dy = 0) {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

export function scaleFromCenter(points = [], s = 1) {
  const c = centroid(points);
  return points.map((p) => ({
    x: (p.x - c.x) * s + c.x,
    y: (p.y - c.y) * s + c.y,
  }));
}

export function scaleNonUniform(points = [], sx = 1, sy = 1, pivot = null) {
  const c = pivot || centroid(points);
  return points.map((p) => ({
    x: (p.x - c.x) * sx + c.x,
    y: (p.y - c.y) * sy + c.y,
  }));
}

export function rotate(points = [], angle = 0, pivot = null) {
  const c = pivot || centroid(points);
  const s = Math.sin(angle);
  const co = Math.cos(angle);

  return points.map((p) => {
    const x = p.x - c.x;
    const y = p.y - c.y;
    return {
      x: x * co - y * s + c.x,
      y: x * s + y * co + c.y,
    };
  });
}

export function snap(points = [], step = 0.0625) {
  return points.map((p) => ({
    x: Math.round(p.x / step) * step,
    y: Math.round(p.y / step) * step,
  }));
}

export function pointInRect(p, rect) {
  return (
    p.x >= rect.min.x &&
    p.x <= rect.max.x &&
    p.y >= rect.min.y &&
    p.y <= rect.max.y
  );
}

export function rectFromPoints(a, b) {
  return {
    min: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
    max: { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
  };
}
