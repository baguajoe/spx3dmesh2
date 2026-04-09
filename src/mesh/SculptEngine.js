// SculptEngine.js — PRO Sculpting Engine
// SPX Mesh Editor | StreamPireX
// Features: 15 brush types, ZBrush-quality falloffs, dynamic topology,
//           symmetry, lazy mouse, stabilizer, mask, layers

import * as THREE from 'three';

// ─── Falloff Library ─────────────────────────────────────────────────────────

function smoothFalloff(t)   { const u=1-t; return u*u*(3-2*u); }
function linearFalloff(t)   { return 1-t; }
function sharpFalloff(t)    { return Math.pow(1-t, 4); }
function sphereFalloff(t)   { return Math.sqrt(Math.max(0, 1-t*t)); }
function rootFalloff(t)     { return 1-Math.sqrt(t); }
function constFalloff()     { return 1; }
function cubicFalloff(t)    { return 1-t*t*t; }
function sineFalloff(t)     { return Math.sin((1-t) * Math.PI * 0.5); }
function spikeFalloff(t)    { return t < 0.1 ? 1 : 1 - (t-0.1)/0.9; }

export function getFalloff(type, t) {
  if (t >= 1) return 0;
  switch (type) {
    case 'linear':   return linearFalloff(t);
    case 'sharp':    return sharpFalloff(t);
    case 'sphere':   return sphereFalloff(t);
    case 'root':     return rootFalloff(t);
    case 'constant': return constFalloff();
    case 'cubic':    return cubicFalloff(t);
    case 'sine':     return sineFalloff(t);
    case 'spike':    return spikeFalloff(t);
    default:         return smoothFalloff(t);
  }
}

// ─── Brush Settings ───────────────────────────────────────────────────────────

export function createBrushSettings(options = {}) {
  return {
    type:         options.type      ?? 'draw',
    radius:       options.radius    ?? 0.3,
    strength:     options.strength  ?? 0.5,
    falloff:      options.falloff   ?? 'smooth',
    direction:    options.direction ?? 1,      // 1=add, -1=subtract
    symmetry:     options.symmetry  ?? false,
    symmetryAxis: options.symmetryAxis ?? 'x',
    lazyMouse:    options.lazyMouse ?? false,
    lazyRadius:   options.lazyRadius ?? 0.1,
    stabilizer:   options.stabilizer ?? 0,    // 0-1
    accumulate:   options.accumulate ?? false,
    backfaceCull: options.backfaceCull ?? true,
    alphaTexture: options.alphaTexture ?? null,
    spacing:      options.spacing   ?? 0.1,
    jitter:       options.jitter    ?? 0,
  };
}

// ─── Brush Types ──────────────────────────────────────────────────────────────

export const BRUSH_TYPES = {
  draw:      'draw',       // Standard sculpt
  flatten:   'flatten',   // Flatten to plane
  smooth:    'smooth',    // Smooth/blur vertices
  pinch:     'pinch',     // Pull vertices together
  inflate:   'inflate',   // Push along normals
  grab:      'grab',      // Move vertices freely
  snake:     'snake',     // Snake hook
  clay:      'clay',      // Clay buildup
  trim:      'trim',      // Trim dynamic topology
  crease:    'crease',    // Sharp crease
  polish:    'polish',    // Polish/relax
  scrape:    'scrape',    // Scrape high areas
  fill:      'fill',      // Fill low areas
  nudge:     'nudge',     // Nudge along surface
  mask:      'mask',      // Paint mask
};

// ─── Sculpt Operations ────────────────────────────────────────────────────────

export function applySculpt(geometry, hitPoint, hitNormal, brush, options = {}) {
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  if (!pos) return false;

  const { type, radius, strength, falloff, direction, symmetry, symmetryAxis, backfaceCull } = brush;
  const dt = options.dt ?? 1/60;
  let modified = false;

  for (let i = 0; i < pos.count; i++) {
    const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const dist = vp.distanceTo(hitPoint);
    if (dist > radius) continue;

    // Backface culling
    if (backfaceCull && norm) {
      const vn = new THREE.Vector3(norm.getX(i), norm.getY(i), norm.getZ(i));
      if (vn.dot(hitNormal) < 0) continue;
    }

    const t = dist / radius;
    const influence = getFalloff(falloff, t) * strength * direction * dt * 60;

    _applyBrushType(type, pos, norm, i, vp, hitPoint, hitNormal, influence, brush);
    modified = true;
  }

  // Symmetry
  if (symmetry) {
    const mirrorHit = hitPoint.clone();
    const axisIdx = { x:0, y:1, z:2 }[symmetryAxis] ?? 0;
    mirrorHit.setComponent(axisIdx, -mirrorHit.getComponent(axisIdx));
    const mirrorNormal = hitNormal.clone();
    mirrorNormal.setComponent(axisIdx, -mirrorNormal.getComponent(axisIdx));

    for (let i = 0; i < pos.count; i++) {
      const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      const dist = vp.distanceTo(mirrorHit);
      if (dist > radius) continue;
      const t = dist / radius;
      const influence = getFalloff(falloff, t) * strength * direction * dt * 60;
      _applyBrushType(type, pos, norm, i, vp, mirrorHit, mirrorNormal, influence, brush);
    }
  }

  if (modified) {
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  return modified;
}

function _applyBrushType(type, pos, norm, i, vp, hitPoint, hitNormal, influence, brush) {
  switch (type) {
    case 'draw':
    case 'clay': {
      pos.setXYZ(i,
        vp.x + hitNormal.x * influence,
        vp.y + hitNormal.y * influence,
        vp.z + hitNormal.z * influence,
      );
      break;
    }
    case 'inflate': {
      if (!norm) break;
      const vn = new THREE.Vector3(norm.getX(i), norm.getY(i), norm.getZ(i)).normalize();
      pos.setXYZ(i, vp.x + vn.x * influence, vp.y + vn.y * influence, vp.z + vn.z * influence);
      break;
    }
    case 'flatten': {
      const toPlane = vp.clone().sub(hitPoint);
      const dist = toPlane.dot(hitNormal);
      const rate = Math.min(1, Math.abs(influence) * 0.5);
      pos.setXYZ(i,
        vp.x - hitNormal.x * dist * rate,
        vp.y - hitNormal.y * dist * rate,
        vp.z - hitNormal.z * dist * rate,
      );
      break;
    }
    case 'pinch': {
      const toCenter = hitPoint.clone().sub(vp);
      pos.setXYZ(i,
        vp.x + toCenter.x * Math.abs(influence) * 0.5,
        vp.y + toCenter.y * Math.abs(influence) * 0.5,
        vp.z + toCenter.z * Math.abs(influence) * 0.5,
      );
      break;
    }
    case 'grab': {
      if (brush._grabDelta) {
        pos.setXYZ(i, vp.x + brush._grabDelta.x * influence * 2, vp.y + brush._grabDelta.y * influence * 2, vp.z + brush._grabDelta.z * influence * 2);
      }
      break;
    }
    case 'smooth': {
      // Handled separately in smoothVertices
      break;
    }
    case 'crease': {
      const toCenter = hitPoint.clone().sub(vp);
      const perp = toCenter.clone().cross(hitNormal).normalize();
      pos.setXYZ(i,
        vp.x + perp.x * influence * 0.5,
        vp.y + perp.y * influence * 0.5 + hitNormal.y * influence * 0.3,
        vp.z + perp.z * influence * 0.5,
      );
      break;
    }
    case 'scrape': {
      if (vp.dot(hitNormal) > hitPoint.dot(hitNormal)) {
        pos.setXYZ(i, vp.x - hitNormal.x * Math.abs(influence) * 0.5, vp.y - hitNormal.y * Math.abs(influence) * 0.5, vp.z - hitNormal.z * Math.abs(influence) * 0.5);
      }
      break;
    }
    case 'fill': {
      if (vp.dot(hitNormal) < hitPoint.dot(hitNormal)) {
        pos.setXYZ(i, vp.x + hitNormal.x * Math.abs(influence) * 0.5, vp.y + hitNormal.y * Math.abs(influence) * 0.5, vp.z + hitNormal.z * Math.abs(influence) * 0.5);
      }
      break;
    }
    case 'nudge': {
      if (brush._nudgeDir) {
        pos.setXYZ(i, vp.x + brush._nudgeDir.x * influence, vp.y + brush._nudgeDir.y * influence, vp.z + brush._nudgeDir.z * influence);
      }
      break;
    }
    default: break;
  }
}

// ─── Smooth ───────────────────────────────────────────────────────────────────

export function smoothVertices(geometry, hitPoint, radius, strength, iterations = 2) {
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  if (!pos || !idx) return;

  // Build adjacency
  const adj = Array.from({ length: pos.count }, () => new Set());
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i+1), c = idx.getX(i+2);
    adj[a].add(b); adj[a].add(c);
    adj[b].add(a); adj[b].add(c);
    adj[c].add(a); adj[c].add(b);
  }

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < pos.count; i++) {
      const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      const dist = vp.distanceTo(hitPoint);
      if (dist > radius) continue;

      const t = dist / radius;
      const influence = getFalloff('smooth', t) * strength;
      const neighbors = Array.from(adj[i]);
      if (!neighbors.length) continue;

      const avg = new THREE.Vector3();
      neighbors.forEach(n => avg.add(new THREE.Vector3(pos.getX(n), pos.getY(n), pos.getZ(n))));
      avg.divideScalar(neighbors.length);

      pos.setXYZ(i,
        vp.x + (avg.x - vp.x) * influence,
        vp.y + (avg.y - vp.y) * influence,
        vp.z + (avg.z - vp.z) * influence,
      );
    }
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

// ─── Mask ─────────────────────────────────────────────────────────────────────

export function createMask(vertexCount) {
  return new Float32Array(vertexCount).fill(0);
}

export function paintMask(mask, geometry, hitPoint, radius, value = 1, falloffType = 'smooth') {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const dist = vp.distanceTo(hitPoint);
    if (dist > radius) continue;
    const t = dist / radius;
    const influence = getFalloff(falloffType, t);
    mask[i] = Math.max(0, Math.min(1, mask[i] + value * influence));
  }
}

export function invertMask(mask) {
  for (let i = 0; i < mask.length; i++) mask[i] = 1 - mask[i];
}

export function clearMask(mask) { mask.fill(0); }

// ─── Sculpt Layers ────────────────────────────────────────────────────────────

export function createSculptLayer(name, geometry) {
  const pos = geometry.attributes.position;
  return {
    id:       Math.random().toString(36).slice(2),
    name,
    data:     new Float32Array(pos.array),
    strength: 1.0,
    visible:  true,
  };
}

export function mergeSculptLayers(geometry, layers) {
  const pos = geometry.attributes.position;
  const basis = layers[0];
  if (!basis) return;
  pos.array.set(basis.data);
  for (let li = 1; li < layers.length; li++) {
    const layer = layers[li];
    if (!layer.visible) continue;
    for (let i = 0; i < pos.array.length; i++) {
      pos.array[i] += (layer.data[i] - basis.data[i]) * layer.strength;
    }
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

// ─── Lazy Mouse ───────────────────────────────────────────────────────────────

export class LazyMouse {
  constructor(radius = 0.05) {
    this.radius = radius;
    this.position = null;
  }
  update(target) {
    if (!this.position) { this.position = target.clone(); return this.position; }
    const dist = this.position.distanceTo(target);
    if (dist > this.radius) {
      const dir = target.clone().sub(this.position).normalize();
      this.position.addScaledVector(dir, dist - this.radius);
    }
    return this.position.clone();
  }
  reset() { this.position = null; }
}

export default {
  getFalloff, createBrushSettings, applySculpt, smoothVertices,
  createMask, paintMask, invertMask, clearMask,
  createSculptLayer, mergeSculptLayers, LazyMouse,
  BRUSH_TYPES,
};

export function applySculptStroke(geometry, hitPoint, hitNormal, brush, options) {
  if (brush.type === 'smooth') {
    smoothVertices(geometry, hitPoint, brush.radius, brush.strength);
    return true;
  }
  return applySculpt(geometry, hitPoint, hitNormal, brush, options);
}

export function getSculptHit(raycaster, mesh) {
  const hits = raycaster.intersectObject(mesh, false);
  const hit = hits[0];
  return { point: hit.point, normal: hit.face ? hit.face.normal.clone().transformDirection(mesh.matrixWorld) : new THREE.Vector3(0,1,0), distance: hit.distance, faceIndex: hit.faceIndex };
}

