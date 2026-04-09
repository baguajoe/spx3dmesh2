import * as THREE from "three";

export function createHairLayer(group, {
  offsetY = 0.015,
  offsetZ = 0.01,
  scale = 1.02,
  name = "hair_layer",
} = {}) {
  if (!group) return null;
  const clone = group.clone(true);
  clone.name = `${name}_${Date.now()}`;
  clone.position.y += offsetY;
  clone.position.z += offsetZ;
  clone.scale.multiplyScalar(scale);
  group.parent?.add(clone);
  return clone;
}

export function stackHairLayers(group, count = 2, spacing = 0.01) {
  const out = [];
  for (let i = 1; i <= count; i++) {
    const layer = createHairLayer(group, {
      offsetY: i * spacing * 0.5,
      offsetZ: i * spacing,
      scale: 1 + i * 0.01,
      name: "hair_layer",
    });
    if (layer) out.push(layer);
  }
  return out;
}
