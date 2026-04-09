import * as THREE from "three";

// ── Shape key data structure ──────────────────────────────────────────────────
// Each shape key stores a snapshot of vertex positions as a Float32Array.
// Basis (index 0) = rest pose. Additional keys = morph targets.

export function createShapeKey(name, mesh) {
  const pos = mesh.geometry.attributes.position;
  const snapshot = new Float32Array(pos.array.length);
  snapshot.set(pos.array);
  return {
    id:       crypto.randomUUID(),
    name:     name || `Key_${Date.now()}`,
    value:    0.0,           // slider 0–1
    vertices: snapshot,      // position snapshot
    driverId: null,          // id of another key that drives this one
  };
}

// ── Snapshot current vertex positions into an existing key ───────────────────
export function updateShapeKeySnapshot(key, mesh) {
  const pos = mesh.geometry.attributes.position;
  if (key.vertices.length !== pos.array.length) {
    key.vertices = new Float32Array(pos.array.length);
  }
  key.vertices.set(pos.array);
}

// ── Apply all shape keys additively to mesh ───────────────────────────────────
export function applyShapeKeys(mesh, keys) {
  if (!keys || keys.length < 2) return; // need at least basis + one key
  const basis  = keys[0];
  const pos    = mesh.geometry.attributes.position;
  const count  = pos.count;

  // Start from basis
  for (let i = 0; i < count; i++) {
    pos.setXYZ(i,
      basis.vertices[i*3],
      basis.vertices[i*3+1],
      basis.vertices[i*3+2],
    );
  }

  // Add each active key on top (additive blending)
  for (let k = 1; k < keys.length; k++) {
    const key = keys[k];
    const val = key.value;
    if (val === 0) continue;
    for (let i = 0; i < count; i++) {
      const bx = basis.vertices[i*3],   by = basis.vertices[i*3+1], bz = basis.vertices[i*3+2];
      const tx = key.vertices[i*3],     ty = key.vertices[i*3+1],   tz = key.vertices[i*3+2];
      pos.setXYZ(i,
        pos.getX(i) + (tx - bx) * val,
        pos.getY(i) + (ty - by) * val,
        pos.getZ(i) + (tz - bz) * val,
      );
    }
  }

  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

// ── Update basis key from current mesh positions ──────────────────────────────
export function updateBasis(keys, mesh) {
  if (!keys || keys.length === 0) return;
  updateShapeKeySnapshot(keys[0], mesh);
}

// ── Build THREE.js morph targets from shape keys (for GLB export) ─────────────
export function buildMorphTargets(mesh, keys) {
  if (!keys || keys.length < 2) return;
  const basis = keys[0];
  const morphTargets = [];

  for (let k = 1; k < keys.length; k++) {
    const key      = keys[k];
    const count    = basis.vertices.length / 3;
    const deltas   = new Float32Array(basis.vertices.length);
    for (let i = 0; i < count; i++) {
      deltas[i*3]   = key.vertices[i*3]   - basis.vertices[i*3];
      deltas[i*3+1] = key.vertices[i*3+1] - basis.vertices[i*3+1];
      deltas[i*3+2] = key.vertices[i*3+2] - basis.vertices[i*3+2];
    }
    morphTargets.push({
      name:       key.name,
      attributes: { position: new THREE.BufferAttribute(deltas, 3) },
    });
  }

  mesh.geometry.morphAttributes.position = morphTargets.map(t => t.attributes.position);
  mesh.morphTargetInfluences = keys.slice(1).map(k => k.value);
  mesh.updateMorphTargets();
}
