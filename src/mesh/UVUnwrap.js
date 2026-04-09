// UVUnwrap.js — UV Unwrapping UPGRADE
// SPX Mesh Editor | StreamPireX
// Features: seam marking, angle-based smart unwrap, UDIM tile layout, island packing

import * as THREE from 'three';

// ─── Seam Management ─────────────────────────────────────────────────────────

export class SeamManager {
  constructor() {
    this.seams = new Set(); // Set of "v0_v1" edge keys (sorted)
  }

  edgeKey(a, b) { return a < b ? `${a}_${b}` : `${b}_${a}`; }

  markSeam(v0, v1) { this.seams.add(this.edgeKey(v0, v1)); }
  unmarkSeam(v0, v1) { this.seams.delete(this.edgeKey(v0, v1)); }
  isSeam(v0, v1) { return this.seams.has(this.edgeKey(v0, v1)); }
  clearSeams() { this.seams.clear(); }

  markSharpEdgesAsSeams(geometry, angleThreshold = Math.PI / 4) {
    const pos = geometry.attributes.position;
    const idx = geometry.index;
    if (!idx) return;

    const faceNormals = [];
    for (let f = 0; f < idx.count / 3; f++) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(f*3));
      const b = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(f*3+1));
      const c = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(f*3+2));
      const n = new THREE.Vector3().crossVectors(b.sub(a), c.clone().sub(a)).normalize();
      faceNormals.push(n);
    }

    const edgeFaces = new Map();
    for (let f = 0; f < idx.count / 3; f++) {
      const verts = [idx.getX(f*3), idx.getX(f*3+1), idx.getX(f*3+2)];
      for (let e = 0; e < 3; e++) {
        const key = this.edgeKey(verts[e], verts[(e+1)%3]);
        if (!edgeFaces.has(key)) edgeFaces.set(key, []);
        edgeFaces.get(key).push(f);
      }
    }

    edgeFaces.forEach((faces, key) => {
      if (faces.length === 2) {
        const angle = faceNormals[faces[0]].angleTo(faceNormals[faces[1]]);
        if (angle > angleThreshold) this.seams.add(key);
      } else {
        this.seams.add(key); // boundary edge
      }
    });
  }

  serialize() { return Array.from(this.seams); }
  deserialize(data) { this.seams = new Set(data); }
}

// ─── Smart Unwrap (angle-based ABF approximation) ─────────────────────────────

export function smartUnwrap(geometry, seamManager = null) {
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  if (!idx) return geometry;

  const sm = seamManager ?? new SeamManager();
  if (!seamManager) sm.markSharpEdgesAsSeams(geometry);

  const faceCount = idx.count / 3;
  const visited = new Uint8Array(faceCount);
  const uvCoords = new Float32Array(pos.count * 2);
  let islandOffset = 0;

  // BFS island growing — separated by seams
  for (let startFace = 0; startFace < faceCount; startFace++) {
    if (visited[startFace]) continue;

    // Grow island from startFace
    const island = [];
    const queue = [startFace];
    visited[startFace] = 1;

    // Build face adjacency
    const adj = buildFaceAdjacency(idx, faceCount, sm);

    while (queue.length) {
      const f = queue.shift();
      island.push(f);
      (adj[f] || []).forEach(nf => {
        if (!visited[nf]) { visited[nf] = 1; queue.push(nf); }
      });
    }

    // Project island faces to 2D using planar projection
    const islandUVs = projectIsland(island, idx, pos);

    // Place island UVs into main UV buffer
    island.forEach((f, fi) => {
      for (let v = 0; v < 3; v++) {
        const vi = idx.getX(f * 3 + v);
        uvCoords[vi * 2]     = islandUVs[fi * 3 * 2 + v * 2]     * 0.9 + islandOffset * 0.1;
        uvCoords[vi * 2 + 1] = islandUVs[fi * 3 * 2 + v * 2 + 1] * 0.9;
      }
    });

    islandOffset = (islandOffset + 1) % 10;
  }

  const newGeo = geometry.clone();
  newGeo.setAttribute('uv', new THREE.BufferAttribute(uvCoords, 2));
  newGeo.setAttribute('uv2', new THREE.BufferAttribute(uvCoords.slice(), 2));
  return newGeo;
}

function buildFaceAdjacency(idx, faceCount, seamManager) {
  const edgeFaces = new Map();
  const sm = seamManager;

  for (let f = 0; f < faceCount; f++) {
    for (let e = 0; e < 3; e++) {
      const v0 = idx.getX(f*3+e), v1 = idx.getX(f*3+(e+1)%3);
      if (sm && sm.isSeam(v0, v1)) continue;
      const key = v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`;
      if (!edgeFaces.has(key)) edgeFaces.set(key, []);
      edgeFaces.get(key).push(f);
    }
  }

  const adj = Array.from({ length: faceCount }, () => []);
  edgeFaces.forEach(faces => {
    if (faces.length === 2) { adj[faces[0]].push(faces[1]); adj[faces[1]].push(faces[0]); }
  });
  return adj;
}

function projectIsland(faces, idx, pos) {
  // Angle-weighted average normal for best projection plane
  const avgNormal = new THREE.Vector3();
  faces.forEach(f => {
    const a = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(f*3));
    const b = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(f*3+1));
    const c = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(f*3+2));
    avgNormal.add(new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)));
  });
  avgNormal.normalize();

  // Build local 2D axes
  const up = Math.abs(avgNormal.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
  const tangent = new THREE.Vector3().crossVectors(up, avgNormal).normalize();
  const bitangent = new THREE.Vector3().crossVectors(avgNormal, tangent);

  const uvs = new Float32Array(faces.length * 3 * 2);
  faces.forEach((f, fi) => {
    for (let v = 0; v < 3; v++) {
      const p = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(f*3+v));
      uvs[fi*6 + v*2]     = p.dot(tangent);
      uvs[fi*6 + v*2 + 1] = p.dot(bitangent);
    }
  });

  // Normalize to 0-1
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < uvs.length; i += 2) {
    minU = Math.min(minU, uvs[i]); maxU = Math.max(maxU, uvs[i]);
    minV = Math.min(minV, uvs[i+1]); maxV = Math.max(maxV, uvs[i+1]);
  }
  const rangeU = maxU - minU || 1, rangeV = maxV - minV || 1;
  for (let i = 0; i < uvs.length; i += 2) {
    uvs[i] = (uvs[i] - minU) / rangeU;
    uvs[i+1] = (uvs[i+1] - minV) / rangeV;
  }

  return uvs;
}

// ─── UDIM Layout ─────────────────────────────────────────────────────────────

export class UDIMLayout {
  constructor(tilesWide = 10) {
    this.tilesWide = tilesWide;
    this.islands = []; // [{ uvs, tileU, tileV }]
  }

  addIsland(uvCoords, tileIndex = 0) {
    const tileU = tileIndex % this.tilesWide;
    const tileV = Math.floor(tileIndex / this.tilesWide);
    this.islands.push({ uvCoords, tileU, tileV });
  }

  applyToGeometry(geometry) {
    const uvAttr = geometry.attributes.uv;
    if (!uvAttr) return;
    this.islands.forEach(({ uvCoords, tileU, tileV }) => {
      for (let i = 0; i < uvCoords.length; i += 2) {
        uvAttr.setXY(
          i / 2,
          uvCoords[i] + tileU,
          uvCoords[i+1] + tileV,
        );
      }
    });
    uvAttr.needsUpdate = true;
  }

  getTileFromUV(u, v) {
    return { tileU: Math.floor(u), tileV: Math.floor(v), udim: 1001 + Math.floor(u) + Math.floor(v) * this.tilesWide };
  }

  getUDIMLabel(tileIndex) {
    const tileU = tileIndex % this.tilesWide;
    const tileV = Math.floor(tileIndex / this.tilesWide);
    return 1001 + tileU + tileV * this.tilesWide;
  }
}

// ─── Island Packing (simple shelf-based bin packing) ──────────────────────────

export function packIslands(islands, padding = 0.01) {
  // Sort by area descending
  const sorted = [...islands].sort((a, b) => b.area - a.area);
  const shelves = [{ y: 0, height: 0, x: 0 }];
  const result = [];

  sorted.forEach(island => {
    const w = island.width + padding, h = island.height + padding;
    let placed = false;

    for (const shelf of shelves) {
      if (shelf.x + w <= 1.0) {
        result.push({ ...island, placedX: shelf.x, placedY: shelf.y });
        shelf.x += w;
        shelf.height = Math.max(shelf.height, h);
        placed = true;
        break;
      }
    }

    if (!placed) {
      const lastShelf = shelves[shelves.length - 1];
      const newY = lastShelf.y + lastShelf.height;
      shelves.push({ y: newY, height: h, x: w });
      result.push({ ...island, placedX: 0, placedY: newY });
    }
  });

  return result;
}

export default { SeamManager, smartUnwrap, UDIMLayout, packIslands };


// ─── Legacy projection exports (App.jsx compat) ───────────────────────────────

export function uvPlanarProject(geometry, axis = 'z') {
  const geo = geometry.clone();
  const pos = geo.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    if (axis === 'z')      { uvs[i*2] = pos.getX(i) * 0.5 + 0.5; uvs[i*2+1] = pos.getY(i) * 0.5 + 0.5; }
    else if (axis === 'y') { uvs[i*2] = pos.getX(i) * 0.5 + 0.5; uvs[i*2+1] = pos.getZ(i) * 0.5 + 0.5; }
    else                   { uvs[i*2] = pos.getZ(i) * 0.5 + 0.5; uvs[i*2+1] = pos.getY(i) * 0.5 + 0.5; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}

export function uvBoxProject(geometry) {
  const geo = geometry.clone();
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(norm.getX(i)), ny = Math.abs(norm.getY(i)), nz = Math.abs(norm.getZ(i));
    if (nx >= ny && nx >= nz)      { uvs[i*2] = pos.getZ(i)*0.5+0.5; uvs[i*2+1] = pos.getY(i)*0.5+0.5; }
    else if (ny >= nx && ny >= nz) { uvs[i*2] = pos.getX(i)*0.5+0.5; uvs[i*2+1] = pos.getZ(i)*0.5+0.5; }
    else                           { uvs[i*2] = pos.getX(i)*0.5+0.5; uvs[i*2+1] = pos.getY(i)*0.5+0.5; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}

export function uvSphereProject(geometry) {
  const geo = geometry.clone();
  const pos = geo.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x*x + y*y + z*z) || 1;
    uvs[i*2]   = 0.5 + Math.atan2(z/len, x/len) / (2 * Math.PI);
    uvs[i*2+1] = 0.5 - Math.asin(y/len) / Math.PI;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}
