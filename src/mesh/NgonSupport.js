import * as THREE from "three";

// ── Fan triangulation ─────────────────────────────────────────────────────────
export function triangulateNgon(verts) {
  const tris = [];
  for (let i = 1; i < verts.length - 1; i++) tris.push([verts[0], verts[i], verts[i + 1]]);
  return tris;
}

// ── Build BufferGeometry from n-gon soup ──────────────────────────────────────
export function buildNgonGeometry(ngons) {
  const pos = [], nrm = [], uvs = [], idx = [];
  let off = 0;
  for (const ng of ngons) {
    for (const [a, b, c] of triangulateNgon(ng)) {
      const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      for (const v of [a, b, c]) {
        pos.push(v.x, v.y, v.z);
        nrm.push(n.x, n.y, n.z);
        uvs.push(0.5, 0.5);
      }
      idx.push(off, off + 1, off + 2);
      off += 3;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal",   new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  return geo;
}

// ── HalfEdgeMesh n-gon API ────────────────────────────────────────────────────
export function addNgonFace(hem, vertIndices) {
  if (!hem.ngonFaces) hem.ngonFaces = [];
  hem.ngonFaces.push({ verts: [...vertIndices], id: crypto.randomUUID() });
}

export function getNgonFaces(hem)    { return hem.ngonFaces || []; }
export function getTris(hem)         { return (hem.ngonFaces || []).filter(f => f.verts.length === 3); }
export function getQuads(hem)        { return (hem.ngonFaces || []).filter(f => f.verts.length === 4); }
export function getPolygons(hem)     { return (hem.ngonFaces || []).filter(f => f.verts.length  > 4); }

// ── Dissolve edge (merge two faces into n-gon) ────────────────────────────────
export function dissolveEdge(hem, edgeId) {
  if (!hem._dissolvedEdges) hem._dissolvedEdges = new Set();
  hem._dissolvedEdges.add(edgeId);
  return hem;
}

// ── Bridge two face loops ─────────────────────────────────────────────────────
export function bridgeFaces(hem, faceIdA, faceIdB) {
  if (!hem.ngonFaces) hem.ngonFaces = [];
  const a = hem.ngonFaces.find(f => f.id === faceIdA);
  const b = hem.ngonFaces.find(f => f.id === faceIdB);
  if (!a || !b) return hem;
  const newFace = { verts: [...a.verts, ...b.verts.slice().reverse()], id: crypto.randomUUID(), bridged: true };
  hem.ngonFaces.push(newFace);
  return hem;
}

// ── Grid fill from edge loop ──────────────────────────────────────────────────
export function gridFill(hem, edgeLoop) {
  if (!hem.ngonFaces) hem.ngonFaces = [];
  const n    = edgeLoop.length;
  const half = Math.floor(n / 2);
  for (let i = 0; i < half - 1; i++) {
    hem.ngonFaces.push({
      verts: [edgeLoop[i], edgeLoop[i + 1], edgeLoop[n - i - 2], edgeLoop[n - i - 1]],
      id:    crypto.randomUUID(),
      type:  "quad",
    });
  }
  return hem;
}

// ── Poke face (fan from centroid) ─────────────────────────────────────────────
export function pokeFace(hem, faceId, positions) {
  if (!hem.ngonFaces) return hem;
  const face = hem.ngonFaces.find(f => f.id === faceId);
  if (!face) return hem;
  const verts = face.verts;
  const cx = verts.reduce((s, vi) => s + positions[vi * 3],     0) / verts.length;
  const cy = verts.reduce((s, vi) => s + positions[vi * 3 + 1], 0) / verts.length;
  const cz = verts.reduce((s, vi) => s + positions[vi * 3 + 2], 0) / verts.length;
  const centerIdx = positions.length / 3;
  positions.push(cx, cy, cz);
  const newFaces = [];
  for (let i = 0; i < verts.length; i++) {
    newFaces.push({ verts: [verts[i], verts[(i + 1) % verts.length], centerIdx], id: crypto.randomUUID(), type: "tri" });
  }
  hem.ngonFaces = hem.ngonFaces.filter(f => f.id !== faceId).concat(newFaces);
  return hem;
}

// ── Inset face ────────────────────────────────────────────────────────────────
export function insetFace(hem, faceId, positions, amount = 0.1) {
  if (!hem.ngonFaces) return hem;
  const face = hem.ngonFaces.find(f => f.id === faceId);
  if (!face) return hem;
  const verts = face.verts;
  const cx = verts.reduce((s, vi) => s + positions[vi * 3],     0) / verts.length;
  const cy = verts.reduce((s, vi) => s + positions[vi * 3 + 1], 0) / verts.length;
  const cz = verts.reduce((s, vi) => s + positions[vi * 3 + 2], 0) / verts.length;
  const innerVerts = verts.map(vi => {
    const x = positions[vi * 3]     + (cx - positions[vi * 3])     * amount;
    const y = positions[vi * 3 + 1] + (cy - positions[vi * 3 + 1]) * amount;
    const z = positions[vi * 3 + 2] + (cz - positions[vi * 3 + 2]) * amount;
    const ni = positions.length / 3;
    positions.push(x, y, z);
    return ni;
  });
  const newFaces = [];
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    newFaces.push({ verts: [verts[i], verts[j], innerVerts[j], innerVerts[i]], id: crypto.randomUUID(), type: "quad" });
  }
  newFaces.push({ verts: [...innerVerts], id: crypto.randomUUID(), type: "ngon" });
  hem.ngonFaces = hem.ngonFaces.filter(f => f.id !== faceId).concat(newFaces);
  return hem;
}

// ── Convert all n-gons to tris ────────────────────────────────────────────────
export function convertNgonsToTris(hem) {
  if (!hem.ngonFaces) return hem;
  const tris = [];
  for (const f of hem.ngonFaces) {
    for (const t of triangulateNgon(f.verts)) {
      tris.push({ verts: t, id: crypto.randomUUID(), type: "tri" });
    }
  }
  hem.triFaces = [...(hem.triFaces || []), ...tris];
  return hem;
}

export function getNgonStats(hem) {
  const ng = hem.ngonFaces || [];
  return {
    total:  ng.length,
    tris:   ng.filter(f => f.verts.length === 3).length,
    quads:  ng.filter(f => f.verts.length === 4).length,
    ngons:  ng.filter(f => f.verts.length  > 4).length,
  };
}
