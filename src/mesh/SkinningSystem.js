// SkinningSystem.js — UPGRADE: Dual Quaternion Skinning + volume preservation
// SPX Mesh Editor | StreamPireX
// Features: LBS, DQS, volume preservation, heat diffusion weight baking,
//           weight normalization, mirror weights, smooth weights, transfer weights

import * as THREE from 'three';

// ─── Linear Blend Skinning (LBS) ─────────────────────────────────────────────

export function applyLBS(geometry, skeleton, boneMatrices) {
  const pos = geometry.attributes.position;
  const skinIndex = geometry.attributes.skinIndex;
  const skinWeight = geometry.attributes.skinWeight;
  if (!skinIndex || !skinWeight) return;

  const result = new Float32Array(pos.array.length);
  const v = new THREE.Vector3();
  const bv = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.set(0, 0, 0);
    for (let j = 0; j < 4; j++) {
      const boneIdx = skinIndex.getComponent(i, j);
      const weight  = skinWeight.getComponent(i, j);
      if (weight === 0) continue;
      const mat = boneMatrices[boneIdx];
      if (!mat) continue;
      bv.fromBufferAttribute(pos, i).applyMatrix4(mat);
      v.addScaledVector(bv, weight);
    }
    result[i * 3]     = v.x;
    result[i * 3 + 1] = v.y;
    result[i * 3 + 2] = v.z;
  }

  pos.array.set(result);
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

// ─── Dual Quaternion Skinning (DQS) — no candy-wrapper artifact ──────────────

class DualQuaternion {
  constructor() {
    this.real = new THREE.Quaternion();  // rotation
    this.dual = new THREE.Quaternion();  // translation encoded
  }

  fromMatrix4(m) {
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    m.decompose(pos, rot, scale);
    this.real.copy(rot);
    // Dual part: 0.5 * t * q
    const t = new THREE.Quaternion(pos.x * 0.5, pos.y * 0.5, pos.z * 0.5, 0);
    this.dual.multiplyQuaternions(t, rot);
    return this;
  }

  add(other, weight) {
    this.real.x += other.real.x * weight;
    this.real.y += other.real.y * weight;
    this.real.z += other.real.z * weight;
    this.real.w += other.real.w * weight;
    this.dual.x += other.dual.x * weight;
    this.dual.y += other.dual.y * weight;
    this.dual.z += other.dual.z * weight;
    this.dual.w += other.dual.w * weight;
    return this;
  }

  normalize() {
    const len = this.real.length();
    if (len < 0.0001) return this;
    this.real.x /= len; this.real.y /= len;
    this.real.z /= len; this.real.w /= len;
    this.dual.x /= len; this.dual.y /= len;
    this.dual.z /= len; this.dual.w /= len;
    return this;
  }

  transformPoint(v) {
    const r = this.real, d = this.dual;
    // Extract translation
    const tx = 2 * (-d.w * r.x + d.x * r.w - d.y * r.z + d.z * r.y);
    const ty = 2 * (-d.w * r.y + d.x * r.z + d.y * r.w - d.z * r.x);
    const tz = 2 * (-d.w * r.z - d.x * r.y + d.y * r.x + d.z * r.w);
    // Apply rotation then translation
    const out = v.clone().applyQuaternion(r);
    out.x += tx; out.y += ty; out.z += tz;
    return out;
  }
}

export function applyDQS(geometry, skeleton, boneMatrices) {
  const pos = geometry.attributes.position;
  const skinIndex = geometry.attributes.skinIndex;
  const skinWeight = geometry.attributes.skinWeight;
  if (!skinIndex || !skinWeight) return;

  // Precompute dual quaternions for each bone
  const boneDQs = boneMatrices.map(m => new DualQuaternion().fromMatrix4(m));

  const result = new Float32Array(pos.array.length);
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    const blended = new DualQuaternion();

    for (let j = 0; j < 4; j++) {
      const boneIdx = skinIndex.getComponent(i, j);
      const weight  = skinWeight.getComponent(i, j);
      if (weight === 0 || !boneDQs[boneIdx]) continue;

      const dq = boneDQs[boneIdx];
      // Antipodality fix
      const dot = blended.real.dot(dq.real);
      blended.add(dq, dot < 0 ? -weight : weight);
    }

    blended.normalize();
    v.fromBufferAttribute(pos, i);
    const transformed = blended.transformPoint(v);
    result[i * 3]     = transformed.x;
    result[i * 3 + 1] = transformed.y;
    result[i * 3 + 2] = transformed.z;
  }

  pos.array.set(result);
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

// ─── Volume Preservation ──────────────────────────────────────────────────────

export function preserveVolume(geometry, originalGeometry, strength = 0.3) {
  const pos = geometry.attributes.position;
  const origPos = originalGeometry.attributes.position;
  if (pos.count !== origPos.count) return;

  // Compute volume change and apply corrective scaling
  const origVol = estimateVolume(origPos);
  const currVol = estimateVolume(pos);
  if (origVol === 0 || currVol === 0) return;

  const scale = Math.pow(origVol / currVol, strength / 3);
  const center = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    center.x += pos.getX(i); center.y += pos.getY(i); center.z += pos.getZ(i);
  }
  center.divideScalar(pos.count);

  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i,
      center.x + (pos.getX(i) - center.x) * scale,
      center.y + (pos.getY(i) - center.y) * scale,
      center.z + (pos.getZ(i) - center.z) * scale,
    );
  }
  pos.needsUpdate = true;
}

function estimateVolume(posAttr) {
  let vol = 0;
  for (let i = 0; i < posAttr.count - 2; i += 3) {
    const ax = posAttr.getX(i),   ay = posAttr.getY(i),   az = posAttr.getZ(i);
    const bx = posAttr.getX(i+1), by = posAttr.getY(i+1), bz = posAttr.getZ(i+1);
    const cx = posAttr.getX(i+2), cy = posAttr.getY(i+2), cz = posAttr.getZ(i+2);
    vol += (ax*(by*cz - bz*cy) - ay*(bx*cz - bz*cx) + az*(bx*cy - by*cx)) / 6;
  }
  return Math.abs(vol);
}

// ─── Heat Diffusion Weight Baking ─────────────────────────────────────────────

export function bakeHeatWeights(geometry, skeleton, options = {}) {
  const { iterations = 10, falloff = 2.0 } = options;
  const pos = geometry.attributes.position;
  const bones = skeleton.bones;
  const numVerts = pos.count;
  const numBones = bones.length;

  const weights = new Float32Array(numVerts * 4).fill(0);
  const indices = new Float32Array(numVerts * 4).fill(0);

  // For each vertex find closest bones
  const bonePositions = bones.map(b => {
    const wp = new THREE.Vector3();
    b.getWorldPosition(wp);
    return wp;
  });

  for (let vi = 0; vi < numVerts; vi++) {
    const vp = new THREE.Vector3().fromBufferAttribute(pos, vi);

    // Compute distance to each bone
    const distances = bonePositions.map((bp, bi) => ({
      idx: bi,
      dist: vp.distanceTo(bp),
    })).sort((a, b) => a.dist - b.dist).slice(0, 4);

    // Inverse distance weighting with falloff
    let totalW = 0;
    const ws = distances.map(d => {
      const w = 1 / Math.pow(Math.max(d.dist, 0.001), falloff);
      totalW += w;
      return w;
    });

    distances.forEach((d, j) => {
      indices[vi * 4 + j] = d.idx;
      weights[vi * 4 + j] = totalW > 0 ? ws[j] / totalW : 0;
    });
  }

  geometry.setAttribute('skinIndex',  new THREE.BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
  return { indices, weights };
}

// ─── Weight Operations ────────────────────────────────────────────────────────

export function normalizeWeights(geometry) {
  const sw = geometry.attributes.skinWeight;
  if (!sw) return;
  for (let i = 0; i < sw.count; i++) {
    let total = 0;
    for (let j = 0; j < 4; j++) total += sw.getComponent(i, j);
    if (total > 0) for (let j = 0; j < 4; j++) sw.setComponent(i, j, sw.getComponent(i, j) / total);
  }
  sw.needsUpdate = true;
}

export function mirrorWeights(geometry, axis = 'x', tolerance = 0.01) {
  const pos = geometry.attributes.position;
  const si  = geometry.attributes.skinIndex;
  const sw  = geometry.attributes.skinWeight;
  if (!si || !sw) return;

  const axisIdx = { x: 0, y: 1, z: 2 }[axis] ?? 0;

  for (let i = 0; i < pos.count; i++) {
    const vp = new THREE.Vector3().fromBufferAttribute(pos, i);
    const mirrorVal = -vp.getComponent(axisIdx);

    // Find mirror vertex
    for (let j = 0; j < pos.count; j++) {
      if (i === j) continue;
      const mp = new THREE.Vector3().fromBufferAttribute(pos, j);
      if (Math.abs(mp.getComponent(axisIdx) - mirrorVal) < tolerance &&
          Math.abs(mp.y - vp.y) < tolerance && Math.abs(mp.z - vp.z) < tolerance) {
        // Copy weights from j to i
        for (let k = 0; k < 4; k++) {
          si.setComponent(i, k, si.getComponent(j, k));
          sw.setComponent(i, k, sw.getComponent(j, k));
        }
        break;
      }
    }
  }
  si.needsUpdate = true; sw.needsUpdate = true;
}

export function smoothWeights(geometry, iterations = 2) {
  const pos = geometry.attributes.position;
  const sw  = geometry.attributes.skinWeight;
  if (!sw) return;

  // Build adjacency
  const adj = buildVertexAdjacency(geometry);

  for (let iter = 0; iter < iterations; iter++) {
    const newWeights = new Float32Array(sw.array.length);
    for (let i = 0; i < sw.count; i++) {
      const neighbors = adj[i] ?? [];
      const total = neighbors.length + 1;
      for (let k = 0; k < 4; k++) {
        let sum = sw.getComponent(i, k);
        neighbors.forEach(n => { sum += sw.getComponent(n, k); });
        newWeights[i * 4 + k] = sum / total;
      }
    }
    sw.array.set(newWeights);
  }
  sw.needsUpdate = true;
  normalizeWeights(geometry);
}

function buildVertexAdjacency(geometry) {
  const idx = geometry.index;
  const count = geometry.attributes.position.count;
  const adj = Array.from({ length: count }, () => new Set());
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i), b = idx.getX(i+1), c = idx.getX(i+2);
      adj[a].add(b); adj[a].add(c);
      adj[b].add(a); adj[b].add(c);
      adj[c].add(a); adj[c].add(b);
    }
  }
  return adj.map(s => Array.from(s));
}

// ─── Skinned Mesh Creation ────────────────────────────────────────────────────

export function createSkinnedMesh(mesh, skeleton) {
  const geo = mesh.geometry.clone();
  if (!geo.attributes.skinWeight) {
    const count   = geo.attributes.position.count;
    const indices = new Float32Array(count * 4).fill(0);
    const weights = new Float32Array(count * 4).fill(0);
    for (let i = 0; i < count; i++) weights[i * 4] = 1.0;
    geo.setAttribute('skinIndex',  new THREE.BufferAttribute(indices, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
  }

  const mat = new THREE.MeshStandardMaterial({
    color: mesh.material?.color ?? 0x888888,
    roughness: 0.5, metalness: 0.1, skinning: true,
  });

  const skinned = new THREE.SkinnedMesh(geo, mat);
  skinned.add(skeleton.bones[0]);
  skinned.bind(skeleton);
  skinned.name = (mesh.name || 'mesh') + '_skinned';
  return skinned;
}

export function bindMeshToArmature(mesh, armature) {
  const bones = armature.userData.bones || [];
  if (!bones.length) return null;
  const threeBones = bones.map(b => {
    const tb = new THREE.Bone();
    tb.name = b.name;
    tb.position.copy(b.position);
    if (b.rotation) tb.rotation.copy(b.rotation);
    return tb;
  });
  // Build hierarchy
  bones.forEach((b, i) => {
    if (b.parentIndex !== undefined && b.parentIndex >= 0) {
      threeBones[b.parentIndex].add(threeBones[i]);
    }
  });
  const skeleton = new THREE.Skeleton(threeBones);
  return createSkinnedMesh(mesh, skeleton);
}

export const SKINNING_MODES = { LBS: 'lbs', DQS: 'dqs' };

export default {
  applyLBS, applyDQS, preserveVolume,
  bakeHeatWeights, normalizeWeights, mirrorWeights, smoothWeights,
  createSkinnedMesh, bindMeshToArmature, SKINNING_MODES,
};
export function createMixer(skinnedMesh) { return new THREE.AnimationMixer(skinnedMesh); }
export function playClip(mixer, clip, opts) { opts=opts||{}; var a=mixer.clipAction(clip); a.loop=opts.loop||2201; a.timeScale=opts.speed||1; a.play(); return a; }
