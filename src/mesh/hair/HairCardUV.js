export function applyHairUVAtlas(group, preset = "stacked") {
  const maps = {
    stacked: { u0: 0.0, v0: 0.0, u1: 1.0, v1: 1.0 },
    left:    { u0: 0.0, v0: 0.0, u1: 0.5, v1: 1.0 },
    right:   { u0: 0.5, v0: 0.0, u1: 1.0, v1: 1.0 },
    top:     { u0: 0.0, v0: 0.5, u1: 1.0, v1: 1.0 },
    bottom:  { u0: 0.0, v0: 0.0, u1: 1.0, v1: 0.5 },
  };
  const box = maps[preset] || maps.stacked;

  group?.traverse((obj) => {
    if (!obj?.isMesh || !obj.geometry?.attributes?.uv) return;
    const uv = obj.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, box.u0 + u * (box.u1 - box.u0), box.v0 + v * (box.v1 - box.v0));
    }
    uv.needsUpdate = true;
  });

  return true;
}
