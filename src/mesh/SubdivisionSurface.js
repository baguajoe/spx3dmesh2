// SubdivisionSurface.js — Catmull-Clark non-destructive subdivision engine
// SPX Mesh Editor | StreamPireX

import * as THREE from 'three';

// ─── Catmull-Clark Core ───────────────────────────────────────────────────────

/**
 * Compute face points: average of all face vertices
 */
function computeFacePoints(geo) {
  const pos = geo.attributes.position;
  const idx = geo.index ? geo.index.array : null;
  const facePoints = [];

  if (idx) {
    for (let i = 0; i < idx.length; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, idx[i]);
      const b = new THREE.Vector3().fromBufferAttribute(pos, idx[i + 1]);
      const c = new THREE.Vector3().fromBufferAttribute(pos, idx[i + 2]);
      facePoints.push(new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3));
    }
  }
  return facePoints;
}

/**
 * Full Catmull-Clark subdivision pass on a BufferGeometry
 * Returns a new subdivided BufferGeometry (non-destructive)
 */
export function catmullClarkSubdivide(geometry, iterations = 1) {
  let geo = geometry.clone();

  for (let iter = 0; iter < iterations; iter++) {
    geo = _subdividOnce(geo);
  }

  geo.computeVertexNormals();
  return geo;
}

function _subdividOnce(geometry) {
  const pos = geometry.attributes.position;
  const idx = geometry.index ? Array.from(geometry.index.array) : null;
  if (!idx) return geometry; // non-indexed not supported yet

  const vertCount = pos.count;
  const faceCount = idx.length / 3;

  // Step 1: face points
  const facePoints = [];
  for (let f = 0; f < faceCount; f++) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, idx[f * 3]);
    const b = new THREE.Vector3().fromBufferAttribute(pos, idx[f * 3 + 1]);
    const c = new THREE.Vector3().fromBufferAttribute(pos, idx[f * 3 + 2]);
    facePoints.push(new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3));
  }

  // Step 2: edge points — midpoint of edge + avg of adjacent face points
  const edgeMap = new Map();
  const edgePoints = [];

  function edgeKey(a, b) { return a < b ? `${a}_${b}` : `${b}_${a}`; }

  for (let f = 0; f < faceCount; f++) {
    const verts = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]];
    for (let e = 0; e < 3; e++) {
      const v0 = verts[e], v1 = verts[(e + 1) % 3];
      const key = edgeKey(v0, v1);
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { faces: [f], v0, v1, idx: vertCount + faceCount + edgePoints.length });
        edgePoints.push(key);
      } else {
        edgeMap.get(key).faces.push(f);
      }
    }
  }

  // Step 3: updated original vertex positions (Catmull-Clark smoothing)
  const newOrigVerts = [];
  for (let v = 0; v < vertCount; v++) {
    const vp = new THREE.Vector3().fromBufferAttribute(pos, v);

    // Gather adjacent faces and edges
    const adjFaces = [];
    const adjEdgeMids = [];

    for (let f = 0; f < faceCount; f++) {
      const verts = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]];
      if (verts.includes(v)) adjFaces.push(f);
    }

    edgeMap.forEach((data) => {
      if (data.v0 === v || data.v1 === v) {
        const mid = new THREE.Vector3()
          .fromBufferAttribute(pos, data.v0)
          .add(new THREE.Vector3().fromBufferAttribute(pos, data.v1))
          .divideScalar(2);
        adjEdgeMids.push(mid);
      }
    });

    const n = adjFaces.length;
    if (n === 0) { newOrigVerts.push(vp); continue; }

    const F = new THREE.Vector3();
    adjFaces.forEach(fi => F.add(facePoints[fi]));
    F.divideScalar(n);

    const R = new THREE.Vector3();
    adjEdgeMids.forEach(m => R.add(m));
    if (adjEdgeMids.length > 0) R.divideScalar(adjEdgeMids.length);

    // Catmull-Clark formula: (F + 2R + (n-3)P) / n
    const updated = new THREE.Vector3()
      .addScaledVector(F, 1)
      .addScaledVector(R, 2)
      .addScaledVector(vp, n - 3)
      .divideScalar(n);

    newOrigVerts.push(updated);
  }

  // Assemble new vertex buffer
  const totalVerts = vertCount + faceCount + edgePoints.length;
  const newPositions = new Float32Array(totalVerts * 3);

  // Original (smoothed)
  newOrigVerts.forEach((v, i) => {
    newPositions[i * 3] = v.x;
    newPositions[i * 3 + 1] = v.y;
    newPositions[i * 3 + 2] = v.z;
  });

  // Face points
  facePoints.forEach((fp, i) => {
    const off = (vertCount + i) * 3;
    newPositions[off] = fp.x;
    newPositions[off + 1] = fp.y;
    newPositions[off + 2] = fp.z;
  });

  // Edge points
  edgePoints.forEach((key, i) => {
    const data = edgeMap.get(key);
    const mid = new THREE.Vector3()
      .fromBufferAttribute(pos, data.v0)
      .add(new THREE.Vector3().fromBufferAttribute(pos, data.v1))
      .divideScalar(2);
    const fp = data.faces.reduce((acc, fi) => acc.add(facePoints[fi]), new THREE.Vector3())
      .divideScalar(data.faces.length);
    const ep = new THREE.Vector3().addVectors(mid, fp).divideScalar(2);
    const off = (vertCount + faceCount + i) * 3;
    newPositions[off] = ep.x;
    newPositions[off + 1] = ep.y;
    newPositions[off + 2] = ep.z;
  });

  // Build new index — each original triangle becomes 3 quads (split as 2 tris each)
  const newIndices = [];
  for (let f = 0; f < faceCount; f++) {
    const v = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]];
    const fp = vertCount + f;

    for (let e = 0; e < 3; e++) {
      const v0 = v[e];
      const v1 = v[(e + 1) % 3];
      const key = edgeKey(v0, v1);
      const ep = edgeMap.get(key).idx;
      const prevKey = edgeKey(v[(e + 2) % 3], v[e]);
      const ep2 = edgeMap.get(prevKey).idx;

      // Quad as 2 triangles
      newIndices.push(v0, ep, fp);
      newIndices.push(v0, fp, ep2);
    }
  }

  const newGeo = new THREE.BufferGeometry();
  newGeo.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
  newGeo.setIndex(newIndices);
  newGeo.computeVertexNormals();
  return newGeo;
}

// ─── Non-Destructive Wrapper ──────────────────────────────────────────────────

export class SubdivisionModifier {
  constructor(mesh, levels = 1) {
    this.mesh = mesh;
    this.originalGeometry = mesh.geometry.clone();
    this.levels = levels;
    this.enabled = true;
    this._apply();
  }

  setLevels(n) {
    this.levels = Math.max(0, Math.min(n, 6)); // cap at 6 for performance
    this._apply();
  }

  toggle(enabled) {
    this.enabled = enabled;
    if (enabled) {
      this._apply();
    } else {
      this.mesh.geometry.dispose();
      this.mesh.geometry = this.originalGeometry.clone();
    }
  }

  updateOriginal(newGeo) {
    this.originalGeometry = newGeo.clone();
    if (this.enabled) this._apply();
  }

  _apply() {
    if (!this.enabled || this.levels === 0) return;
    const subdivided = catmullClarkSubdivide(this.originalGeometry, this.levels);
    this.mesh.geometry.dispose();
    this.mesh.geometry = subdivided;
  }

  dispose() {
    this.originalGeometry.dispose();
  }
}

// ─── Registry (for ModifierStack integration) ─────────────────────────────────

export const SUBDIVISION_MODIFIER_TYPE = 'SUBDIVISION';

export function createSubdivisionModifierDef(levels = 1) {
  return {
    type: SUBDIVISION_MODIFIER_TYPE,
    label: 'Subdivision Surface',
    icon: '⬡',
    enabled: true,
    params: { levels },
    apply(mesh) {
      return catmullClarkSubdivide(mesh.geometry, this.params.levels);
    }
  };
}
