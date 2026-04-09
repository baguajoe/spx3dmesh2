import * as THREE from "three";

// ── Initialize weight attribute ───────────────────────────────────────────────
export function initWeights(mesh, boneCount) {
  const geo   = mesh.geometry;
  const count = geo.attributes.position.count;
  // 4 bone influences per vertex (standard skinning)
  const indices = new Float32Array(count * 4).fill(0);
  const weights = new Float32Array(count * 4).fill(0);
  // Default: all weight on bone 0
  for (let i = 0; i < count; i++) weights[i * 4] = 1.0;
  geo.setAttribute("skinIndex",  new THREE.BufferAttribute(indices, 4));
  geo.setAttribute("skinWeight", new THREE.BufferAttribute(weights, 4));
  return { indices, weights };
}

// ── Paint weight at hit point ─────────────────────────────────────────────────
export function paintWeight(mesh, hit, brush) {
  const { boneIndex = 0, radius = 0.5, strength = 0.1, falloffType = "smooth", mode = "add" } = brush;
  const geo     = mesh.geometry;
  const pos     = geo.attributes.position;
  const weights = geo.attributes.skinWeight;
  if (!pos || !weights) return;

  const invMat   = mesh.matrixWorld.clone().invert();
  const localCtr = hit.point.clone().applyMatrix4(invMat);
  const tmp      = new THREE.Vector3();
  const count    = pos.count;

  for (let i = 0; i < count; i++) {
    tmp.fromBufferAttribute(pos, i);
    const dist = tmp.distanceTo(localCtr);
    if (dist >= radius) continue;

    const t       = dist / radius;
    const falloff = getFalloff(falloffType, t) * strength;
    const slot    = boneIndex % 4;
    let   w       = weights.getComponent(i, slot);

    if (mode === "add")      w = Math.min(1, w + falloff);
    else if (mode === "sub") w = Math.max(0, w - falloff);
    else if (mode === "set") w = falloff;

    weights.setComponent(i, slot, w);
  }

  normalizeWeights(geo);
  weights.needsUpdate = true;
}

// ── Normalize weights so they sum to 1 per vertex ────────────────────────────
export function normalizeWeights(geo) {
  const weights = geo.attributes.skinWeight;
  if (!weights) return;
  for (let i = 0; i < weights.count; i++) {
    let sum = 0;
    for (let j = 0; j < 4; j++) sum += weights.getComponent(i, j);
    if (sum > 0) {
      for (let j = 0; j < 4; j++) {
        weights.setComponent(i, j, weights.getComponent(i, j) / sum);
      }
    }
  }
  weights.needsUpdate = true;
}

// ── Auto-weight by bone distance ──────────────────────────────────────────────
export function autoWeightByDistance(mesh, armature) {
  const geo   = mesh.geometry;
  const pos   = geo.attributes.position;
  const bones = armature?.userData?.bones || [];
  if (!bones.length) return;

  initWeights(mesh, bones.length);
  const weights = geo.attributes.skinWeight;
  const indices = geo.attributes.skinIndex;
  const count   = pos.count;
  const tmp     = new THREE.Vector3();
  const bonePos = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    tmp.fromBufferAttribute(pos, i);
    tmp.applyMatrix4(mesh.matrixWorld);

    // Get 4 closest bones
    const dists = bones.map((bone, bi) => {
      bone.getWorldPosition(bonePos);
      return { bi, dist: tmp.distanceTo(bonePos) };
    }).sort((a,b) => a.dist - b.dist).slice(0, 4);

    // Inverse distance weighting
    const total = dists.reduce((s, d) => s + (1 / (d.dist + 0.0001)), 0);
    dists.forEach((d, slot) => {
      indices.setComponent(i, slot, d.bi);
      weights.setComponent(i, slot, (1 / (d.dist + 0.0001)) / total);
    });
  }

  indices.needsUpdate  = true;
  weights.needsUpdate  = true;
}

// ── Get weight color for vertex (for display) ─────────────────────────────────
export function getWeightColor(weight) {
  // Blue (0) → Green (0.5) → Red (1)
  if (weight < 0.5) {
    return new THREE.Color(0, weight * 2, 1 - weight * 2);
  } else {
    return new THREE.Color((weight - 0.5) * 2, 1 - (weight - 0.5) * 2, 0);
  }
}

// ── Visualize weights as vertex colors ────────────────────────────────────────
export function visualizeWeights(mesh, boneIndex = 0) {
  const geo     = mesh.geometry;
  const weights = geo.attributes.skinWeight;
  if (!weights) return;
  const count   = weights.count;
  const colors  = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const w   = weights.getComponent(i, boneIndex % 4);
    const col = getWeightColor(w);
    colors[i*3]   = col.r;
    colors[i*3+1] = col.g;
    colors[i*3+2] = col.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  if (mesh.material) {
    mesh.material.vertexColors = true;
    mesh.material.needsUpdate  = true;
  }
}

function getFalloff(type, t) {
  if (t >= 1) return 0;
  switch (type) {
    case "linear": return 1 - t;
    case "sharp":  return t < 0.5 ? 1 : 1-(t-0.5)*2;
    default:       return 1 - t*t;
  }
}
