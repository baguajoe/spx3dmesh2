import * as THREE from "three";

// ── Heat map auto-weighting ───────────────────────────────────────────────────
export function heatMapWeights(mesh, armature) {
  const pos   = mesh.geometry.attributes.position;
  const bones = armature.bones || [];
  const weights = Array.from({ length: pos.count }, () => []);
  for (let vi = 0; vi < pos.count; vi++) {
    const v     = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
    const dists = bones.map((bone, bi) => {
      const bp = new THREE.Vector3(...(bone.position || [0, 0, 0]));
      return { bi, d: v.distanceTo(bp) };
    });
    dists.sort((a, b) => a.d - b.d);
    const top   = dists.slice(0, 4);
    const total = top.reduce((s, e) => s + 1 / (e.d + 0.0001), 0);
    weights[vi] = top.map(e => ({ boneIndex: e.bi, weight: 1 / (e.d + 0.0001) / total }));
  }
  mesh._boneWeights = weights;
  return weights;
}

// ── Dual quaternion ───────────────────────────────────────────────────────────
export function dualQuatFromBone(bone) {
  const q   = new THREE.Quaternion();
  const pos = new THREE.Vector3(...(bone.position || [0, 0, 0]));
  const dual = new THREE.Quaternion(
     0.5 * ( pos.x * q.w + pos.y * q.z - pos.z * q.y),
     0.5 * (-pos.x * q.z + pos.y * q.w + pos.z * q.x),
     0.5 * ( pos.x * q.y - pos.y * q.x + pos.z * q.w),
    -0.5 * ( pos.x * q.x + pos.y * q.y + pos.z * q.z),
  );
  return { real: q.clone(), dual };
}

export function blendDualQuats(dqs, weights) {
  let rw = 0, rx = 0, ry = 0, rz = 0;
  let dw = 0, dx = 0, dy = 0, dz = 0;
  const pivot = dqs[0]?.real || { w: 1, x: 0, y: 0, z: 0 };
  for (let i = 0; i < dqs.length; i++) {
    const w  = weights[i] || 0;
    const dq = dqs[i];
    const dot = pivot.w * dq.real.w + pivot.x * dq.real.x + pivot.y * dq.real.y + pivot.z * dq.real.z;
    const s   = dot < 0 ? -w : w;
    rw += s * dq.real.w; rx += s * dq.real.x; ry += s * dq.real.y; rz += s * dq.real.z;
    dw += s * dq.dual.w; dx += s * dq.dual.x; dy += s * dq.dual.y; dz += s * dq.dual.z;
  }
  const len = Math.sqrt(rw * rw + rx * rx + ry * ry + rz * rz) || 1;
  return {
    real: new THREE.Quaternion(rx / len, ry / len, rz / len, rw / len),
    dual: new THREE.Quaternion(dx / len, dy / len, dz / len, dw / len),
  };
}

export function applyDualQuatToVertex(v, dq) {
  const r  = dq.real, d = dq.dual;
  const tx = 2 * (-d.w * r.x + d.x * r.w - d.y * r.z + d.z * r.y);
  const ty = 2 * (-d.w * r.y + d.x * r.z + d.y * r.w - d.z * r.x);
  const tz = 2 * (-d.w * r.z - d.x * r.y + d.y * r.x + d.z * r.w);
  return v.clone().applyQuaternion(r).add(new THREE.Vector3(tx, ty, tz));
}

// ── Bone envelopes ────────────────────────────────────────────────────────────
export function createBoneEnvelope(bone, opts = {}) {
  return {
    boneId:     bone.id || crypto.randomUUID(),
    headRadius: opts.headRadius || 0.2,
    tailRadius: opts.tailRadius || 0.15,
    distance:   opts.distance   || 0.3,
    weight:     opts.weight     || 1.0,
  };
}

export function weighByEnvelope(mesh, armature, envelopes) {
  const pos     = mesh.geometry.attributes.position;
  const weights = Array.from({ length: pos.count }, () => []);
  for (let vi = 0; vi < pos.count; vi++) {
    const v     = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
    let total   = 0;
    const contrib = [];
    for (let bi = 0; bi < (armature.bones || []).length; bi++) {
      const env = envelopes[bi] || createBoneEnvelope(armature.bones[bi]);
      const bp  = new THREE.Vector3(...(armature.bones[bi].position || [0, 0, 0]));
      const d   = v.distanceTo(bp);
      if (d < env.distance) {
        const w = (1 - d / env.distance) * env.weight;
        contrib.push({ boneIndex: bi, weight: w });
        total += w;
      }
    }
    if (total > 0) weights[vi] = contrib.map(c => ({ ...c, weight: c.weight / total }));
  }
  mesh._boneWeights = weights;
  return weights;
}

// ── Full skeleton bind ────────────────────────────────────────────────────────
export function bindSkeletonAdvanced(mesh, armature, opts = {}) {
  const method  = opts.method || "heat";
  const weights = method === "envelope"
    ? weighByEnvelope(mesh, armature, opts.envelopes || [])
    : heatMapWeights(mesh, armature);
  const skinIndices = [], skinWeights = [];
  for (const vw of weights) {
    const top = vw.slice(0, 4);
    while (top.length < 4) top.push({ boneIndex: 0, weight: 0 });
    const sum = top.reduce((s, e) => s + e.weight, 0) || 1;
    skinIndices.push(...top.map(e => e.boneIndex));
    skinWeights.push(...top.map(e => e.weight / sum));
  }
  mesh.geometry.setAttribute("skinIndex",  new THREE.Uint16BufferAttribute(skinIndices,  4));
  mesh.geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  return { weights, boneCount: (armature.bones || []).length };
}

export function normalizeAllWeights(mesh) {
  if (!mesh._boneWeights) return;
  for (const vw of mesh._boneWeights) {
    const total = vw.reduce((s, e) => s + e.weight, 0) || 1;
    vw.forEach(e => (e.weight /= total));
  }
}

export function paintBoneWeight(mesh, hit, boneIndex, opts = {}) {
  const { radius = 0.15, strength = 0.5, mode = "add" } = opts;
  if (!mesh._boneWeights) heatMapWeights(mesh, { bones: [] });
  const pos = mesh.geometry.attributes.position;
  for (let vi = 0; vi < pos.count; vi++) {
    const v = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
    const d = v.distanceTo(hit.point);
    if (d > radius) continue;
    const f  = Math.pow(1 - d / radius, 2) * strength;
    const vw = mesh._boneWeights[vi] || [];
    const existing = vw.find(e => e.boneIndex === boneIndex);
    if (mode === "add") {
      if (existing) existing.weight = Math.min(1, existing.weight + f);
      else vw.push({ boneIndex, weight: f });
    } else if (mode === "subtract") {
      if (existing) existing.weight = Math.max(0, existing.weight - f);
    } else {
      if (existing) existing.weight = f;
      else vw.push({ boneIndex, weight: f });
    }
    mesh._boneWeights[vi] = vw;
  }
  normalizeAllWeights(mesh);
}

export function getBindingStats(mesh) {
  return {
    hasSkinIndex:  !!mesh.geometry.attributes.skinIndex,
    hasSkinWeight: !!mesh.geometry.attributes.skinWeight,
    boneWeights:   mesh._boneWeights?.length || 0,
  };
}
