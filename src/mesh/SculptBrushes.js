import * as THREE from "three";

// ── Brush registry ────────────────────────────────────────────────────────────
export const BRUSHES = {
  clay:       { label: "Clay",        icon: "⬟", description: "Build up clay-like material" },
  clayStrips: { label: "Clay Strips", icon: "▬", description: "Add strips of clay" },
  trim:       { label: "Trim",        icon: "✂", description: "Flatten surface" },
  fill:       { label: "Fill",        icon: "⬛", description: "Fill concave areas" },
  scrape:     { label: "Scrape",      icon: "⌇", description: "Scrape convex areas" },
  mask:       { label: "Mask",        icon: "◈", description: "Mask vertices from sculpting" },
  faceSets:   { label: "Face Sets",   icon: "⬡", description: "Paint face groups" },
  boundary:   { label: "Boundary",    icon: "⬣", description: "Sculpt boundary edges" },
  multiplane: { label: "Multiplane",  icon: "⊞", description: "Cut flat planes into surface" },
};

// ── Get vertex normal at index ────────────────────────────────────────────────
function getVertexNormal(geo, i) {
  if (geo.attributes.normal) {
    return new THREE.Vector3(
      geo.attributes.normal.getX(i),
      geo.attributes.normal.getY(i),
      geo.attributes.normal.getZ(i),
    ).normalize();
  }
  return new THREE.Vector3(0, 1, 0);
}

// ── Shared: get affected vertices ─────────────────────────────────────────────
function getAffected(geo, mesh, hitPoint, radius) {
  const pos    = geo.attributes.position;
  const inv    = mesh.matrixWorld.clone().invert();
  const local  = hitPoint.clone().applyMatrix4(inv);
  const tmp    = new THREE.Vector3();
  const result = [];
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i);
    const dist = tmp.distanceTo(local);
    if (dist < radius) result.push({ i, dist, t: dist / radius });
  }
  return result;
}

function smoothFalloff(t) { return 1 - t * t; }

// ── Clay brush — push along average normal ────────────────────────────────────
export function applyClay(mesh, hit, { radius = 0.5, strength = 0.02, invert = false } = {}) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const affected = getAffected(geo, mesh, hit.point, radius);
  const dir = invert ? -1 : 1;
  affected.forEach(({ i, t }) => {
    const n = getVertexNormal(geo, i);
    const f = smoothFalloff(t) * strength * dir;
    pos.setXYZ(i, pos.getX(i) + n.x * f, pos.getY(i) + n.y * f, pos.getZ(i) + n.z * f);
  });
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ── Clay Strips — add strips perpendicular to stroke ──────────────────────────
export function applyClayStrips(mesh, hit, { radius = 0.5, strength = 0.03, invert = false } = {}) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const affected = getAffected(geo, mesh, hit.point, radius * 0.6);
  const dir = invert ? -1 : 1;
  affected.forEach(({ i, t }) => {
    const n = getVertexNormal(geo, i);
    const f = (1 - t) * strength * dir * 1.5;
    pos.setXYZ(i, pos.getX(i) + n.x * f, pos.getY(i) + n.y * f, pos.getZ(i) + n.z * f);
  });
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ── Trim brush — flatten to average plane ─────────────────────────────────────
export function applyTrim(mesh, hit, { radius = 0.5, strength = 0.8 } = {}) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const inv = mesh.matrixWorld.clone().invert();
  const localHit = hit.point.clone().applyMatrix4(inv);
  const affected = getAffected(geo, mesh, hit.point, radius);
  if (!affected.length) return;

  // Average Y of affected verts as target plane
  const avgY = affected.reduce((s, { i }) => s + pos.getY(i), 0) / affected.length;
  affected.forEach(({ i, t }) => {
    const f = smoothFalloff(t) * strength;
    pos.setY(i, pos.getY(i) + (avgY - pos.getY(i)) * f);
  });
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ── Fill brush — push concave verts outward ────────────────────────────────────
export function applyFill(mesh, hit, { radius = 0.5, strength = 0.02 } = {}) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const inv = mesh.matrixWorld.clone().invert();
  const localHit = hit.point.clone().applyMatrix4(inv);
  const affected = getAffected(geo, mesh, hit.point, radius);
  affected.forEach(({ i, t }) => {
    const n = getVertexNormal(geo, i);
    const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
    const toCenter = localHit.clone().sub(new THREE.Vector3(vx, vy, vz));
    const dot = toCenter.dot(n);
    if (dot > 0) { // only fill concave areas
      const f = smoothFalloff(t) * strength;
      pos.setXYZ(i, vx + n.x * f, vy + n.y * f, vz + n.z * f);
    }
  });
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ── Scrape brush — push convex verts inward ────────────────────────────────────
export function applyScrape(mesh, hit, { radius = 0.5, strength = 0.02 } = {}) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const inv = mesh.matrixWorld.clone().invert();
  const localHit = hit.point.clone().applyMatrix4(inv);
  const affected = getAffected(geo, mesh, hit.point, radius);
  affected.forEach(({ i, t }) => {
    const n = getVertexNormal(geo, i);
    const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
    const toCenter = localHit.clone().sub(new THREE.Vector3(vx, vy, vz));
    const dot = toCenter.dot(n);
    if (dot < 0) { // only scrape convex areas
      const f = smoothFalloff(t) * strength;
      pos.setXYZ(i, vx - n.x * f, vy - n.y * f, vz - n.z * f);
    }
  });
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ── Mask brush — mark vertices as masked ─────────────────────────────────────
export function applyMask(mesh, hit, { radius = 0.5, strength = 1.0, erase = false } = {}) {
  const geo = mesh.geometry;
  if (!geo.attributes.mask) {
    const mask = new Float32Array(geo.attributes.position.count).fill(0);
    geo.setAttribute("mask", new THREE.BufferAttribute(mask, 1));
  }
  const mask     = geo.attributes.mask;
  const affected = getAffected(geo, mesh, hit.point, radius);
  affected.forEach(({ i, t }) => {
    const f = smoothFalloff(t) * strength;
    mask.setX(i, erase ? Math.max(0, mask.getX(i) - f) : Math.min(1, mask.getX(i) + f));
  });
  mask.needsUpdate = true;
}

// ── Face Sets — paint integer IDs on faces ────────────────────────────────────
export function applyFaceSet(mesh, hit, { radius = 0.5, faceSetId = 1 } = {}) {
  const geo = mesh.geometry;
  if (!geo.attributes.faceSet) {
    const count = geo.attributes.position.count;
    const sets  = new Float32Array(count).fill(0);
    geo.setAttribute("faceSet", new THREE.BufferAttribute(sets, 1));
  }
  const faceSet  = geo.attributes.faceSet;
  const affected = getAffected(geo, mesh, hit.point, radius);
  affected.forEach(({ i }) => faceSet.setX(i, faceSetId));
  faceSet.needsUpdate = true;
}

// ── Multiplane — cut flat planes into surface ─────────────────────────────────
export function applyMultiplane(mesh, hit, { radius = 0.5, strength = 0.05, planes = 4 } = {}) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const inv = mesh.matrixWorld.clone().invert();
  const localHit = hit.point.clone().applyMatrix4(inv);
  const affected = getAffected(geo, mesh, hit.point, radius);
  affected.forEach(({ i, t }) => {
    const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
    const angle = Math.atan2(vz - localHit.z, vx - localHit.x);
    const snap  = Math.round(angle / (Math.PI * 2 / planes)) * (Math.PI * 2 / planes);
    const dx    = Math.cos(snap), dz = Math.sin(snap);
    const f     = smoothFalloff(t) * strength;
    pos.setXYZ(i, vx + dx * f, vy, vz + dz * f);
  });
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ── Boundary brush — sculpt along boundary edges ──────────────────────────────
export function applyBoundary(mesh, hit, { radius = 0.5, strength = 0.02 } = {}) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const idx = geo.index;
  if (!idx) return;

  // Find boundary verts (appear in odd number of edges)
  const edgeCount = new Map();
  const arr = idx.array;
  for (let i = 0; i < arr.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = arr[i+k], b = arr[i+(k+1)%3];
      const key = Math.min(a,b) + "_" + Math.max(a,b);
      edgeCount.set(key, (edgeCount.get(key)||0) + 1);
    }
  }
  const boundaryVerts = new Set();
  edgeCount.forEach((count, key) => {
    if (count === 1) key.split("_").forEach(v => boundaryVerts.add(Number(v)));
  });

  const affected = getAffected(geo, mesh, hit.point, radius);
  affected.forEach(({ i, t }) => {
    if (!boundaryVerts.has(i)) return;
    const n = getVertexNormal(geo, i);
    const f = smoothFalloff(t) * strength;
    pos.setXYZ(i, pos.getX(i) + n.x*f, pos.getY(i) + n.y*f, pos.getZ(i) + n.z*f);
  });
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ── Dispatch brush by type ────────────────────────────────────────────────────
export function applyBrush(type, mesh, hit, params) {
  switch (type) {
    case "clay":       return applyClay(mesh, hit, params);
    case "clayStrips": return applyClayStrips(mesh, hit, params);
    case "trim":       return applyTrim(mesh, hit, params);
    case "fill":       return applyFill(mesh, hit, params);
    case "scrape":     return applyScrape(mesh, hit, params);
    case "mask":       return applyMask(mesh, hit, params);
    case "faceSets":   return applyFaceSet(mesh, hit, params);
    case "boundary":   return applyBoundary(mesh, hit, params);
    case "multiplane": return applyMultiplane(mesh, hit, params);
    default: return;
  }
}
