import { gaussianFalloff, clamp01 } from "./HairMath";

export const HAIR_BRUSHES = {
  comb: {
    apply(strand, ctx) {
      const w = ctx.falloff;
      strand.direction.x += ctx.strokeDelta.x * w;
      strand.direction.y += ctx.strokeDelta.y * w;
      strand.direction.z += ctx.strokeDelta.z * w;
    }
  },
  clump: {
    apply(strand, ctx) {
      strand.clump = clamp01((strand.clump || 0) + 0.35 * ctx.falloff * ctx.strength);
    }
  },
  twist: {
    apply(strand, ctx) {
      strand.twist = (strand.twist || 0) + ctx.strength * ctx.falloff * 0.2;
    }
  }
};

export function applyHairBrushStroke(strands, brush, stroke) {
  const impl = HAIR_BRUSHES[brush.type];
  if (!impl) return strands;

  for (const strand of strands) {
    const dx = strand.root.x - stroke.center.x;
    const dy = strand.root.y - stroke.center.y;
    const dz = strand.root.z - stroke.center.z;
    const d = Math.hypot(dx, dy, dz);
    const falloff = gaussianFalloff(d, brush.radius);

    if (falloff <= 0) continue;

    impl.apply(strand, {
      strength: brush.strength,
      falloff,
      strokeDelta: stroke.delta
    });
  }

  return strands;
}
