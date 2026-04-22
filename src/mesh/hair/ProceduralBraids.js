import { braidRadiusProfile } from "./HairMath";

export function generateBraidChain({
  segments = 24,
  length = 1.2,
  turns = 6,
  radius = 0.05
} = {}) {
  const points = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 2 * turns;
    const r = braidRadiusProfile(t, radius, radius * 0.3);

    points.push({
      x: Math.cos(angle) * r,
      y: (1 - t) * length,
      z: Math.sin(angle) * r
    });
  }

  return points;
}
