export function snapValue(v, step = 0.0625) {
  return Math.round(v / step) * step;
}

export function snapPoint(p, step = 0.0625) {
  return {
    x: snapValue(p.x, step),
    y: snapValue(p.y, step),
  };
}

export function snapPoints(points = [], step = 0.0625) {
  return points.map((p) => snapPoint(p, step));
}
