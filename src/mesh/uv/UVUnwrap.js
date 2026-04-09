import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

export function buildCheckerTexture(size = 512, cells = 8) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  const cell = size / cells;

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#999999" : "#222222";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i <= cells; i++) {
    const p = i * cell;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.needsUpdate = true;
  return tex;
}

export function applyCheckerToMesh(mesh) {
  if (!mesh) return null;

  const checker = buildCheckerTexture();

  const oldMat = mesh.material;
  const nextMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: checker,
    metalness: 0.05,
    roughness: 0.8,
  });

  if (oldMat?.side != null) nextMat.side = oldMat.side;
  mesh.material = nextMat;
  mesh.material.needsUpdate = true;
  return checker;
}

export function ensureUVAttribute(geometry) {
  if (!geometry) return null;
  if (geometry.attributes.uv) return geometry.attributes.uv;

  const pos = geometry.attributes.position;
  if (!pos) return null;

  const uv = new Float32Array(pos.count * 2);
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry.attributes.uv;
}

export function unwrapBoxProjection(geometry) {
  if (!geometry || !geometry.attributes.position) return geometry;

  const pos = geometry.attributes.position;
  const uvAttr = ensureUVAttribute(geometry);
  geometry.computeBoundingBox();

  const bb = geometry.boundingBox;
  const size = new THREE.Vector3();
  bb.getSize(size);

  const sx = Math.max(size.x, 1e-6);
  const sy = Math.max(size.y, 1e-6);
  const sz = Math.max(size.z, 1e-6);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const ax = Math.abs(x / sx);
    const ay = Math.abs(y / sy);
    const az = Math.abs(z / sz);

    let u = 0;
    let v = 0;

    if (ax >= ay && ax >= az) {
      u = (z - bb.min.z) / sz;
      v = (y - bb.min.y) / sy;
    } else if (ay >= ax && ay >= az) {
      u = (x - bb.min.x) / sx;
      v = (z - bb.min.z) / sz;
    } else {
      u = (x - bb.min.x) / sx;
      v = (y - bb.min.y) / sy;
    }

    uvAttr.setXY(i, u, v);
  }

  uvAttr.needsUpdate = true;
  return geometry;
}

export function exportUVLayoutGLB(mesh) {
  return new Promise((resolve, reject) => {
    if (!mesh) {
      reject(new Error("No mesh provided"));
      return;
    }

    const exporter = new GLTFExporter();
    exporter.parse(
      mesh,
      (result) => resolve(result),
      (error) => reject(error),
      { binary: false }
    );
  });
}

// ── Seam marking ─────────────────────────────────────────────────────────────
export const seams = new Set(); // Set of halfEdge IDs marked as seams

export function markSeam(halfEdgeId) {
  seams.add(halfEdgeId);
}

export function clearSeam(halfEdgeId) {
  seams.delete(halfEdgeId);
}

export function toggleSeam(halfEdgeId) {
  if (seams.has(halfEdgeId)) seams.delete(halfEdgeId);
  else seams.add(halfEdgeId);
  return seams.has(halfEdgeId);
}

export function clearAllSeams() {
  seams.clear();
}

export function getSeams() {
  return [...seams];
}

// ── Pack UV islands ─────────────────────────────────────────────────────────
// Simple bin-packing: sort islands by area, pack into 0-1 UV space
export function packUVIslands(uvMaps) {
  // uvMaps: array of { verts: [{u,v}], area }
  if (!uvMaps || !uvMaps.length) return uvMaps;

  // Sort by area descending
  const sorted = [...uvMaps].sort((a, b) => (b.area || 0) - (a.area || 0));
  const margin = 0.02;
  let x = margin, y = margin, rowH = 0;
  const maxW = 1 - margin * 2;

  for (const island of sorted) {
    // Compute island bounds
    const us = island.verts.map(v => v.u);
    const vs2 = island.verts.map(v => v.v);
    const w = Math.max(...us) - Math.min(...us);
    const h = Math.max(...vs2) - Math.min(...vs2);
    const minU = Math.min(...us);
    const minV = Math.min(...vs2);

    // Scale island to fit if too wide
    const scale = w > maxW ? maxW / w : 1.0;

    // Wrap to next row if needed
    if (x + w * scale > 1 - margin) {
      x = margin;
      y += rowH + margin;
      rowH = 0;
    }

    // Translate island
    const offsetU = x - minU * scale;
    const offsetV = y - minV * scale;
    for (const vert of island.verts) {
      vert.u = vert.u * scale + offsetU;
      vert.v = vert.v * scale + offsetV;
    }

    x += w * scale + margin;
    rowH = Math.max(rowH, h * scale);
  }

  return sorted;
}

// ── Live unwrap (angle-based) ──────────────────────────────────────────────
export function liveUnwrap(hem, camera) {
  if (!hem || !camera) return null;
  // Project each vertex using camera view matrix
  const uvs = new Map();
  for (const [id, v] of hem.vertices) {
    // Simple planar projection along camera direction
    const dot = v.x * camera.position.x + v.y * camera.position.y + v.z * camera.position.z;
    const u = (v.x - camera.position.x * dot) * 0.5 + 0.5;
    const vCoord = (v.y - camera.position.y * dot) * 0.5 + 0.5;
    uvs.set(id, { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, vCoord)) });
  }
  return uvs;
}

// ── Smart UV Unwrap (LSCM-style angle-based projection) ──────────────────────
export function smartUnwrap(hem, seams) {
  const seamSet = new Set(seams || []);
  const uvs = new Map();
  const visited = new Set();
  let islandId = 0;

  // For each unvisited face, flood-fill stopping at seams
  for (const [fid, face] of hem.faces) {
    if (visited.has(fid)) continue;
    // Collect island faces via BFS
    const island = [];
    const queue = [face];
    visited.add(fid);
    while (queue.length) {
      const f = queue.shift();
      island.push(f);
      if (!f.edge) continue;
      let e = f.edge;
      do {
        if (e.twin && e.twin.face && !visited.has(e.twin.face.id) && !seamSet.has(e.id)) {
          visited.add(e.twin.face.id);
          queue.push(e.twin.face);
        }
        e = e.next;
      } while (e && e !== f.edge);
    }

    // Project island using angle-based planar projection
    // Use first face normal as projection plane
    const firstFace = island[0];
    const fverts = firstFace.vertices ? firstFace.vertices() : [];
    if (fverts.length < 3) continue;

    const v0 = fverts[0], v1 = fverts[1], v2 = fverts[2];
    const ex = { x: v1.x-v0.x, y: v1.y-v0.y, z: v1.z-v0.z };
    const ey_raw = { x: v2.x-v0.x, y: v2.y-v0.y, z: v2.z-v0.z };
    const len_ex = Math.sqrt(ex.x**2+ex.y**2+ex.z**2) || 1;
    ex.x /= len_ex; ex.y /= len_ex; ex.z /= len_ex;
    // Gram-Schmidt orthogonalize
    const dot = ey_raw.x*ex.x+ey_raw.y*ex.y+ey_raw.z*ex.z;
    const ey = { x: ey_raw.x-dot*ex.x, y: ey_raw.y-dot*ex.y, z: ey_raw.z-dot*ex.z };
    const len_ey = Math.sqrt(ey.x**2+ey.y**2+ey.z**2) || 1;
    ey.x /= len_ey; ey.y /= len_ey; ey.z /= len_ey;

    // Project all verts in island onto this plane
    const islandUVs = new Map();
    for (const f of island) {
      const fv = f.vertices ? f.vertices() : [];
      for (const v of fv) {
        if (islandUVs.has(v.id)) continue;
        const dx = v.x-v0.x, dy = v.y-v0.y, dz = v.z-v0.z;
        const u = dx*ex.x + dy*ex.y + dz*ex.z;
        const vv = dx*ey.x + dy*ey.y + dz*ey.z;
        islandUVs.set(v.id, { u, v: vv });
      }
    }

    // Normalize island to 0-1 range
    const us = [...islandUVs.values()].map(uv => uv.u);
    const vs = [...islandUVs.values()].map(uv => uv.v);
    const minU = Math.min(...us), maxU = Math.max(...us);
    const minV = Math.min(...vs), maxV = Math.max(...vs);
    const rangeU = (maxU - minU) || 1, rangeV = (maxV - minV) || 1;

    for (const [vid, uvCoord] of islandUVs) {
      uvs.set(vid, {
        u: (uvCoord.u - minU) / rangeU,
        v: (uvCoord.v - minV) / rangeV,
        island: islandId
      });
    }
    islandId++;
  }
  return uvs;
}
