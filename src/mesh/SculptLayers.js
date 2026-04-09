import * as THREE from "three";

// ── Sculpt layer system ───────────────────────────────────────────────────────
export function createSculptLayer(name = "Layer", strength = 1.0) {
  return {
    id:      crypto.randomUUID(),
    name,
    strength,
    visible: true,
    locked:  false,
    deltas:  new Map(), // vertIndex -> {x,y,z}
  };
}

export function addSculptLayer(stack, name, strength = 1.0) {
  const l = createSculptLayer(name, strength);
  stack.push(l);
  return l;
}

export function removeSculptLayer(stack, id) {
  const i = stack.findIndex(l => l.id === id);
  if (i !== -1) stack.splice(i, 1);
  return stack;
}

export function setSculptLayerStrength(stack, id, strength) {
  const l = stack.find(l => l.id === id);
  if (l) l.strength = Math.max(0, Math.min(1, strength));
  return stack;
}

export function applyLayerDelta(layer, vi, delta) {
  const e = layer.deltas.get(vi) || { x: 0, y: 0, z: 0 };
  layer.deltas.set(vi, { x: e.x + delta.x, y: e.y + delta.y, z: e.z + delta.z });
}

export function captureBasePositions(mesh) {
  if (!mesh?.geometry?.attributes?.position) return;
  mesh._basePosArray = new Float32Array(mesh.geometry.attributes.position.array);
}

export function evaluateSculptLayers(mesh, layers) {
  if (!mesh?.geometry?.attributes?.position) return;
  const pos = mesh.geometry.attributes.position;
  if (mesh._basePosArray) {
    for (let i = 0; i < pos.array.length; i++) pos.array[i] = mesh._basePosArray[i];
  }
  for (const layer of layers) {
    if (!layer.visible) continue;
    const s = layer.strength;
    layer.deltas.forEach((d, vi) => {
      const i3 = vi * 3;
      pos.array[i3]     += d.x * s;
      pos.array[i3 + 1] += d.y * s;
      pos.array[i3 + 2] += d.z * s;
    });
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

export function flattenLayerToMesh(mesh, layer) {
  captureBasePositions(mesh);
  evaluateSculptLayers(mesh, [layer]);
  captureBasePositions(mesh);
  layer.deltas.clear();
}

export function mergeLayers(layers) {
  if (layers.length < 2) return layers;
  const base = layers[0];
  for (let i = 1; i < layers.length; i++) {
    const l = layers[i];
    if (!l.visible) continue;
    l.deltas.forEach((d, vi) =>
      applyLayerDelta(base, vi, { x: d.x * l.strength, y: d.y * l.strength, z: d.z * l.strength })
    );
  }
  return [base];
}

export function getSculptLayerStats(layers) {
  return {
    count:       layers.length,
    totalDeltas: layers.reduce((s, l) => s + l.deltas.size, 0),
    visible:     layers.filter(l => l.visible).length,
  };
}

// ── Falloff helper ────────────────────────────────────────────────────────────
function fo(d, r) { return Math.pow(1 - d / r, 2); }

// ── Advanced brushes ──────────────────────────────────────────────────────────
export const ADVANCED_BRUSHES = {
  clay:      { name: "Clay",       radius: 0.3, strength: 0.5, accumulate: true  },
  clayStrip: { name: "Clay Strip", radius: 0.2, strength: 0.6, accumulate: true  },
  polish:    { name: "Polish",     radius: 0.4, strength: 0.3, accumulate: false },
  scrape:    { name: "Scrape",     radius: 0.3, strength: 0.4, accumulate: false },
  flatten:   { name: "Flatten",    radius: 0.5, strength: 0.5, accumulate: false },
  mask:      { name: "Mask",       radius: 0.3, strength: 1.0, accumulate: false },
  fill:      { name: "Fill",       radius: 0.5, strength: 0.3, accumulate: false },
  pose:      { name: "Pose",       radius: 0.5, strength: 0.8, accumulate: false },
};

export function applyClayBrush(mesh, hit, opts = {}) {
  const { radius = 0.3, strength = 0.5, invert = false } = opts;
  const pos  = mesh.geometry.attributes.position;
  const n    = hit.face.normal.clone().transformDirection(mesh.matrixWorld).normalize();
  const sign = invert ? -1 : 1;
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const d = v.distanceTo(hit.point);
    if (d > radius) continue;
    const f = fo(d, radius) * strength * sign;
    pos.setXYZ(i, pos.getX(i) + n.x * f, pos.getY(i) + n.y * f, pos.getZ(i) + n.z * f);
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

export function applyScrapeBrush(mesh, hit, opts = {}) {
  const { radius = 0.3, strength = 0.4 } = opts;
  const pos = mesh.geometry.attributes.position;
  const n   = hit.face.normal.clone().transformDirection(mesh.matrixWorld).normalize();
  for (let i = 0; i < pos.count; i++) {
    const v  = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const d  = v.distanceTo(hit.point);
    if (d > radius) continue;
    const dp = v.clone().sub(hit.point).dot(n);
    if (dp > 0) {
      const f = fo(d, radius) * strength;
      pos.setXYZ(i, pos.getX(i) - n.x * dp * f, pos.getY(i) - n.y * dp * f, pos.getZ(i) - n.z * dp * f);
    }
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

export function applyFlattenBrush(mesh, hit, opts = {}) {
  const { radius = 0.5, strength = 0.5 } = opts;
  const pos = mesh.geometry.attributes.position;
  const n   = hit.face.normal.clone().transformDirection(mesh.matrixWorld).normalize();
  for (let i = 0; i < pos.count; i++) {
    const v  = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const d  = v.distanceTo(hit.point);
    if (d > radius) continue;
    const dp = v.clone().sub(hit.point).dot(n);
    const f  = fo(d, radius) * strength;
    pos.setXYZ(i, pos.getX(i) - n.x * dp * f, pos.getY(i) - n.y * dp * f, pos.getZ(i) - n.z * dp * f);
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

export function applyPolishBrush(mesh, hit, opts = {}) {
  const { radius = 0.4, strength = 0.3 } = opts;
  const pos    = mesh.geometry.attributes.position;
  const verts  = [];
  const center = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const d = v.distanceTo(hit.point);
    if (d > radius) continue;
    verts.push({ i, v, d });
    center.add(v);
  }
  if (!verts.length) return;
  center.divideScalar(verts.length);
  for (const { i, v, d } of verts) {
    const f = fo(d, radius) * strength;
    const target = v.clone().lerp(center, f);
    pos.setXYZ(i, target.x, target.y, target.z);
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

export function applyMaskBrush(mesh, hit, opts = {}) {
  const { radius = 0.3, value = 1.0, invert = false } = opts;
  if (!mesh._maskArray) mesh._maskArray = new Float32Array(mesh.geometry.attributes.position.count);
  const pos = mesh.geometry.attributes.position;
  const v2  = invert ? 0 : value;
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const d = v.distanceTo(hit.point);
    if (d > radius) continue;
    const f = fo(d, radius);
    mesh._maskArray[i] = Math.min(1, Math.max(0, mesh._maskArray[i] + (v2 - mesh._maskArray[i]) * f));
  }
}

export function clearMask(mesh)  { if (mesh._maskArray) mesh._maskArray.fill(0); }
export function invertMask(mesh) {
  if (mesh._maskArray) for (let i = 0; i < mesh._maskArray.length; i++) mesh._maskArray[i] = 1 - mesh._maskArray[i];
}

export function applySymmetryStroke(mesh, hit, brushFn, opts = {}) {
  const { axisX = true, axisY = false, axisZ = false } = opts;
  brushFn(mesh, hit, opts);
  const mirror = axis => ({
    ...hit,
    point: hit.point.clone().multiply(
      new THREE.Vector3(axis === "x" ? -1 : 1, axis === "y" ? -1 : 1, axis === "z" ? -1 : 1)
    ),
  });
  if (axisX) brushFn(mesh, mirror("x"), opts);
  if (axisY) brushFn(mesh, mirror("y"), opts);
  if (axisZ) brushFn(mesh, mirror("z"), opts);
}
