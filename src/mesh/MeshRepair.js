import * as THREE from "three";

// ── Fix normals — recompute all vertex normals ────────────────────────────────
export function fixNormals(mesh) {
  if (!mesh?.geometry) return;
  mesh.geometry.computeVertexNormals();
  return true;
}

// ── Remove doubles — merge vertices within threshold ─────────────────────────
export function removeDoubles(mesh, threshold = 0.001) {
  const geo = mesh?.geometry; if (!geo) return 0;
  const pos = geo.attributes.position;
  const count = pos.count;
  const merged = new Map();
  const remap  = new Uint32Array(count);
  let newCount = 0;
  const newPositions = [];

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let found = -1;
    for (let j = 0; j < newCount; j++) {
      const dx = newPositions[j*3]   - x;
      const dy = newPositions[j*3+1] - y;
      const dz = newPositions[j*3+2] - z;
      if (Math.sqrt(dx*dx + dy*dy + dz*dz) < threshold) { found = j; break; }
    }
    if (found === -1) {
      newPositions.push(x, y, z);
      remap[i] = newCount++;
    } else {
      remap[i] = found;
    }
  }

  const newPos = new Float32Array(newPositions);
  geo.setAttribute("position", new THREE.BufferAttribute(newPos, 3));

  if (geo.index) {
    const idx = geo.index.array;
    for (let i = 0; i < idx.length; i++) idx[i] = remap[idx[i]];
    geo.index.needsUpdate = true;
  }

  geo.attributes.position.needsUpdate = true;
  geo.computeVertexNormals();
  const removed = count - newCount;
  return removed;
}

// ── Remove degenerate faces — zero-area triangles ────────────────────────────
export function removeDegenerates(mesh, threshold = 0.0001) {
  const geo = mesh?.geometry; if (!geo) return 0;
  const pos = geo.attributes.position;
  const idx = geo.index;
  if (!idx) return 0;

  const arr = idx.array;
  const keep = [];
  let removed = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();

  for (let i = 0; i < arr.length; i += 3) {
    a.fromBufferAttribute(pos, arr[i]);
    b.fromBufferAttribute(pos, arr[i+1]);
    c.fromBufferAttribute(pos, arr[i+2]);
    const area = new THREE.Triangle(a, b, c).getArea();
    if (area > threshold) {
      keep.push(arr[i], arr[i+1], arr[i+2]);
    } else {
      removed++;
    }
  }

  geo.setIndex(keep);
  geo.computeVertexNormals();
  return removed;
}

// ── Fill holes — detect boundary edges and cap them ──────────────────────────
export function fillHoles(mesh) {
  const geo = mesh?.geometry; if (!geo) return 0;
  const pos = geo.attributes.position;
  const idx = geo.index;
  if (!idx) return 0;

  const arr   = idx.array;
  const edges = new Map();

  // Find boundary edges (appear only once)
  for (let i = 0; i < arr.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = arr[i + k];
      const b = arr[i + (k + 1) % 3];
      const key  = `${Math.min(a,b)}_${Math.max(a,b)}`;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }

  const boundary = [];
  edges.forEach((count, key) => {
    if (count === 1) {
      const [a, b] = key.split("_").map(Number);
      boundary.push(a, b);
    }
  });

  if (boundary.length === 0) return 0;

  // Simple fan fill — find centroid of boundary verts, add as new vert, triangulate
  const boundarySet = [...new Set(boundary)];
  const cx = boundarySet.reduce((s, i) => s + pos.getX(i), 0) / boundarySet.length;
  const cy = boundarySet.reduce((s, i) => s + pos.getY(i), 0) / boundarySet.length;
  const cz = boundarySet.reduce((s, i) => s + pos.getZ(i), 0) / boundarySet.length;

  // Add centroid vertex
  const oldCount = pos.count;
  const oldArr   = pos.array;
  const newArr   = new Float32Array(oldArr.length + 3);
  newArr.set(oldArr);
  newArr[oldArr.length]     = cx;
  newArr[oldArr.length + 1] = cy;
  newArr[oldArr.length + 2] = cz;
  geo.setAttribute("position", new THREE.BufferAttribute(newArr, 3));
  const centerIdx = oldCount;

  // Add fan triangles
  const newIdx = [...arr];
  for (let i = 0; i < boundary.length; i += 2) {
    newIdx.push(boundary[i], boundary[i+1], centerIdx);
  }
  geo.setIndex(newIdx);
  geo.computeVertexNormals();
  return Math.floor(boundary.length / 2);
}

// ── Full repair — run all operations ─────────────────────────────────────────
export function fullRepair(mesh, threshold = 0.001) {
  const doubles    = removeDoubles(mesh, threshold);
  const degenerates = removeDegenerates(mesh);
  const holes      = fillHoles(mesh);
  fixNormals(mesh);
  return { doubles, degenerates, holes };
}

export function createRetopoSettings() {
    return {
        targetPolyCount: 5000,
        method: 'quadriflow',
        adaptiveSize: 0.5,
        symmetry: 'x',
        preserveSharpEdges: true
    };
}
