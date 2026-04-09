import * as THREE from "three";

export const VC_BLEND_MODES = ["normal","multiply","screen","overlay","add","subtract","darken","lighten","difference"];

function lerp(a, b, t) { return a + (b - a) * t; }
function fo(d, r)       { return Math.pow(1 - d / r, 2); }

export function initVCAdvanced(mesh) {
  const n = mesh.geometry.attributes.position.count;
  if (!mesh.geometry.attributes.color) {
    const arr = new Float32Array(n * 4);
    arr.fill(1.0);
    mesh.geometry.setAttribute("color", new THREE.BufferAttribute(arr, 4));
  }
  if (!mesh._vcLayers) {
    const base = new Float32Array(n * 4);
    base.fill(1.0);
    mesh._vcLayers = [{
      id:        crypto.randomUUID(),
      name:      "Base",
      opacity:   1.0,
      visible:   true,
      blendMode: "normal",
      data:      base,
    }];
  }
  return mesh;
}

export function addVCLayer(mesh, name = "Layer") {
  if (!mesh._vcLayers) initVCAdvanced(mesh);
  const n = mesh.geometry.attributes.position.count;
  const layer = {
    id:        crypto.randomUUID(),
    name,
    opacity:   1.0,
    visible:   true,
    blendMode: "normal",
    data:      new Float32Array(n * 4),
  };
  mesh._vcLayers.push(layer);
  return layer;
}

export function removeVCLayer(mesh, id) {
  if (mesh._vcLayers) mesh._vcLayers = mesh._vcLayers.filter(l => l.id !== id);
}

export function setVCLayerBlendMode(mesh, id, mode) {
  const l = mesh._vcLayers?.find(l => l.id === id);
  if (l) l.blendMode = mode;
}

export function paintVCAdvanced(mesh, hit, opts = {}) {
  const { radius = 0.15, strength = 1.0, color = [1, 0, 0, 1], blendMode = "normal", layerIndex = 0 } = opts;
  const layer = mesh._vcLayers?.[layerIndex];
  if (!layer) return;
  const pos = mesh.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const d = v.distanceTo(hit.point);
    if (d > radius) continue;
    const t = fo(d, radius) * strength;
    const b = i * 4;
    const [r, g, bv, a] = color;
    switch (blendMode) {
      case "multiply":
        layer.data[b]     = lerp(layer.data[b],     layer.data[b]     * r,  t);
        layer.data[b + 1] = lerp(layer.data[b + 1], layer.data[b + 1] * g,  t);
        layer.data[b + 2] = lerp(layer.data[b + 2], layer.data[b + 2] * bv, t);
        break;
      case "screen":
        layer.data[b]     = lerp(layer.data[b],     1 - (1 - layer.data[b])     * (1 - r),  t);
        layer.data[b + 1] = lerp(layer.data[b + 1], 1 - (1 - layer.data[b + 1]) * (1 - g),  t);
        layer.data[b + 2] = lerp(layer.data[b + 2], 1 - (1 - layer.data[b + 2]) * (1 - bv), t);
        break;
      case "add":
        layer.data[b]     = Math.min(1, layer.data[b]     + r  * t);
        layer.data[b + 1] = Math.min(1, layer.data[b + 1] + g  * t);
        layer.data[b + 2] = Math.min(1, layer.data[b + 2] + bv * t);
        break;
      case "subtract":
        layer.data[b]     = Math.max(0, layer.data[b]     - r  * t);
        layer.data[b + 1] = Math.max(0, layer.data[b + 1] - g  * t);
        layer.data[b + 2] = Math.max(0, layer.data[b + 2] - bv * t);
        break;
      case "darken":
        layer.data[b]     = lerp(layer.data[b],     Math.min(layer.data[b],     r),  t);
        layer.data[b + 1] = lerp(layer.data[b + 1], Math.min(layer.data[b + 1], g),  t);
        layer.data[b + 2] = lerp(layer.data[b + 2], Math.min(layer.data[b + 2], bv), t);
        break;
      case "lighten":
        layer.data[b]     = lerp(layer.data[b],     Math.max(layer.data[b],     r),  t);
        layer.data[b + 1] = lerp(layer.data[b + 1], Math.max(layer.data[b + 1], g),  t);
        layer.data[b + 2] = lerp(layer.data[b + 2], Math.max(layer.data[b + 2], bv), t);
        break;
      default: // normal
        layer.data[b]     = lerp(layer.data[b],     r,  t);
        layer.data[b + 1] = lerp(layer.data[b + 1], g,  t);
        layer.data[b + 2] = lerp(layer.data[b + 2], bv, t);
        layer.data[b + 3] = lerp(layer.data[b + 3], a,  t);
    }
  }
  flattenVCLayers(mesh);
}

export function fillVCLayer(mesh, layerIndex = 0, color = [1, 1, 1, 1]) {
  const layer = mesh._vcLayers?.[layerIndex];
  if (!layer) return;
  for (let i = 0; i < layer.data.length / 4; i++) {
    const b = i * 4;
    [layer.data[b], layer.data[b + 1], layer.data[b + 2], layer.data[b + 3]] = color;
  }
  flattenVCLayers(mesh);
}

export function flattenVCLayers(mesh) {
  if (!mesh._vcLayers || !mesh.geometry.attributes.color) return;
  const col = mesh.geometry.attributes.color;
  for (let i = 0; i < col.count; i++) {
    let r = 0, g = 0, b = 0, a = 1;
    for (const layer of mesh._vcLayers) {
      if (layer.visible === false) continue;
      const base = i * 4;
      const op   = layer.opacity ?? 1;
      r = lerp(r, layer.data[base],     op);
      g = lerp(g, layer.data[base + 1], op);
      b = lerp(b, layer.data[base + 2], op);
      a = lerp(a, layer.data[base + 3], op);
    }
    col.setXYZW(i, r, g, b, a);
  }
  col.needsUpdate = true;
}

export function smearVC(mesh, hit, opts = {}) {
  const { radius = 0.2, strength = 0.5, layerIndex = 0 } = opts;
  const layer = mesh._vcLayers?.[layerIndex];
  if (!layer) return;
  const pos = mesh.geometry.attributes.position;
  let sr = 0, sg = 0, sb = 0, sa = 0;
  const samples = [];
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const d = v.distanceTo(hit.point);
    if (d > radius / 2) continue;
    const b = i * 4;
    sr += layer.data[b]; sg += layer.data[b + 1]; sb += layer.data[b + 2]; sa += layer.data[b + 3];
    samples.push(i);
  }
  if (!samples.length) return;
  const avg = [sr / samples.length, sg / samples.length, sb / samples.length, sa / samples.length];
  paintVCAdvanced(mesh, hit, { radius, strength, color: avg, layerIndex });
}

export function blurVCLayer(mesh, layerIndex = 0, iterations = 1) {
  const layer = mesh._vcLayers?.[layerIndex];
  if (!layer) return;
  const pos = mesh.geometry.attributes.position;
  for (let iter = 0; iter < iterations; iter++) {
    const copy = new Float32Array(layer.data);
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      let sr = 0, sg = 0, sb = 0, sa = 0, cnt = 0;
      for (let j = 0; j < pos.count; j++) {
        const u = new THREE.Vector3(pos.getX(j), pos.getY(j), pos.getZ(j));
        if (v.distanceTo(u) < 0.1) {
          const b = j * 4;
          sr += copy[b]; sg += copy[b + 1]; sb += copy[b + 2]; sa += copy[b + 3];
          cnt++;
        }
      }
      if (cnt) {
        const b = i * 4;
        layer.data[b] = sr / cnt; layer.data[b + 1] = sg / cnt;
        layer.data[b + 2] = sb / cnt; layer.data[b + 3] = sa / cnt;
      }
    }
  }
  flattenVCLayers(mesh);
}

export function getVCStats(mesh) {
  return {
    layers:   mesh._vcLayers?.length || 0,
    hasColor: !!mesh.geometry.attributes.color,
  };
}
