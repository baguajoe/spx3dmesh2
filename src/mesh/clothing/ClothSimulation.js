import * as THREE from "three";

function getGeometryVertex(mesh, index) {
  const pos = mesh.geometry.attributes.position;
  return new THREE.Vector3(pos.getX(index), pos.getY(index), pos.getZ(index));
}

function buildEdgesFromGeometry(geometry) {
  const edgeSet = new Set();
  const edges = [];
  const index = geometry.index ? geometry.index.array : null;
  const triCount = index ? index.length / 3 : geometry.attributes.position.count / 3;

  const addEdge = (a, b) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push([a, b]);
  };

  for (let i = 0; i < triCount; i++) {
    let a, b, c;
    if (index) {
      a = index[i * 3];
      b = index[i * 3 + 1];
      c = index[i * 3 + 2];
    } else {
      a = i * 3;
      b = i * 3 + 1;
      c = i * 3 + 2;
    }

    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }

  return edges;
}

export function createClothState(mesh) {
  if (!mesh?.geometry?.attributes?.position) return null;

  const geometry = mesh.geometry;
  const pos = geometry.attributes.position;
  const vertices = [];
  const previous = [];

  for (let i = 0; i < pos.count; i++) {
    const v = getGeometryVertex(mesh, i);
    vertices.push(v.clone());
    previous.push(v.clone());
  }

  const edges = buildEdgesFromGeometry(geometry).map(([a, b]) => ({
    a,
    b,
    restLength: vertices[a].distanceTo(vertices[b]),
  }));

  return {
    meshUUID: mesh.uuid,
    vertices,
    previous,
    edges,
    pinned: new Set(),
    gravity: new THREE.Vector3(0, -9.8, 0),
    damping: 0.992,
    constraintIterations: 5,
    floorY: -10,
    initialized: true,
  };
}

export function syncClothStateToMesh(state, mesh) {
  if (!state || !mesh?.geometry?.attributes?.position) return false;
  const pos = mesh.geometry.attributes.position;

  for (let i = 0; i < state.vertices.length; i++) {
    const v = state.vertices[i];
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
  return true;
}

export function stepClothSimulation(state, {
  dt = 1 / 60,
  gravity = null,
  damping = null,
  constraintIterations = null,
} = {}) {
  if (!state) return false;

  const g = gravity || state.gravity;
  const damp = damping ?? state.damping;
  const iterations = constraintIterations ?? state.constraintIterations;

  for (let i = 0; i < state.vertices.length; i++) {
    if (state.pinned.has(i)) continue;

    const current = state.vertices[i];
    const previous = state.previous[i];
    const velocity = current.clone().sub(previous).multiplyScalar(damp);
    const next = current.clone().add(velocity).add(g.clone().multiplyScalar(dt * dt));

    state.previous[i] = current.clone();
    state.vertices[i] = next;

    if (state.vertices[i].y < state.floorY) {
      state.vertices[i].y = state.floorY;
    }
  }

  for (let iter = 0; iter < iterations; iter++) {
    for (const edge of state.edges) {
      const a = state.vertices[edge.a];
      const b = state.vertices[edge.b];
      const delta = b.clone().sub(a);
      const dist = Math.max(1e-6, delta.length());
      const diff = (dist - edge.restLength) / dist;
      const correction = delta.multiplyScalar(0.5 * diff);

      const aPinned = state.pinned.has(edge.a);
      const bPinned = state.pinned.has(edge.b);

      if (!aPinned && !bPinned) {
        a.add(correction);
        b.sub(correction);
      } else if (aPinned && !bPinned) {
        b.sub(correction.multiplyScalar(2));
      } else if (!aPinned && bPinned) {
        a.add(correction.multiplyScalar(2));
      }
    }
  }

  return true;
}

export function pinTopRow(state, tolerance = 0.05) {
  if (!state?.vertices?.length) return false;

  let maxY = -Infinity;
  for (const v of state.vertices) {
    if (v.y > maxY) maxY = v.y;
  }

  const span = Math.max(
    1e-6,
    Math.max(...state.vertices.map((v) => v.y)) - Math.min(...state.vertices.map((v) => v.y))
  );
  const limit = maxY - span * tolerance;

  state.pinned.clear();
  state.vertices.forEach((v, i) => {
    if (v.y >= limit) state.pinned.add(i);
  });

  return true;
}

export function unpinAll(state) {
  if (!state) return false;
  state.pinned.clear();
  return true;
}

export function resetClothState(state) {
  if (!state) return false;
  state.vertices = state.previous.map((v) => v.clone());
  return true;
}

export function offsetClothState(state, distance = 0.01) {
  if (!state) return false;
  for (const v of state.vertices) {
    v.z += distance;
  }
  return true;
}

export function getPinnedCount(state) {
  return state?.pinned?.size || 0;
}
