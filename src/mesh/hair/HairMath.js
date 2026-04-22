export function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a || 1e-6));
  return t * t * (3 - 2 * t);
}

export function gaussianFalloff(distance, radius, hardness = 2.5) {
  const r = Math.max(radius, 1e-6);
  const x = distance / r;
  return Math.exp(-(x * x) * hardness);
}

export function braidRadiusProfile(t, rootRadius = 1, tipRadius = 0.2) {
  return lerp(rootRadius, tipRadius, smoothstep(0, 1, t));
}
