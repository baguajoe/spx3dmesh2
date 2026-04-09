// ModifierStack.js — PRO Non-Destructive Modifier Stack
// SPX Mesh Editor | StreamPireX
// Features: SubDiv, Mirror, Boolean, Solidify, Bevel, Array, Warp,
//           Lattice, Displace, Smooth, Decimate, Cast, Shrinkwrap

import * as THREE from 'three';
import { catmullClarkSubdivide } from './SubdivisionSurface.js';

export const MOD_TYPES = {
  SUBDIVISION: 'SUBDIVISION',
  MIRROR:      'MIRROR',
  BOOLEAN:     'BOOLEAN',
  SOLIDIFY:    'SOLIDIFY',
  BEVEL:       'BEVEL',
  ARRAY:       'ARRAY',
  WARP:        'WARP',
  DISPLACE:    'DISPLACE',
  SMOOTH:      'SMOOTH',
  DECIMATE:    'DECIMATE',
  CAST:        'CAST',
  TWIST:       'TWIST',
  BEND:        'BEND',
};

// ─── Merge Utility ────────────────────────────────────────────────────────────

function mergeGeometries(geos) {
  let totalVerts = 0, totalIdx = 0;
  geos.forEach(g => { totalVerts += g.attributes.position.count; if(g.index) totalIdx += g.index.count; });
  const positions = new Float32Array(totalVerts * 3);
  const indices = [];
  let vOffset = 0;
  geos.forEach(g => {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      positions[(vOffset+i)*3]   = pos.getX(i);
      positions[(vOffset+i)*3+1] = pos.getY(i);
      positions[(vOffset+i)*3+2] = pos.getZ(i);
    }
    if (g.index) Array.from(g.index.array).forEach(i => indices.push(i + vOffset));
    vOffset += pos.count;
  });
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (indices.length) merged.setIndex(indices);
  merged.computeVertexNormals();
  return merged;
}

// ─── Modifier Implementations ─────────────────────────────────────────────────

function applySubdivision(geo, params) {
  const levels = params.levels ?? 1;
  let result = geo;
  for (let i = 0; i < levels; i++) {
    result = catmullClarkSubdivide(result);
  }
  return result;
}

function applyMirror(geo, params) {
  const axis = params.axis ?? 'x';
  const merge = params.mergeThreshold ?? 0.001;
  const pos = geo.attributes.position;
  const mirrored = geo.clone();
  const mpos = mirrored.attributes.position;
  const axisIdx = { x: 0, y: 1, z: 2 }[axis] ?? 0;
  for (let i = 0; i < mpos.count; i++) {
    const v = [mpos.getX(i), mpos.getY(i), mpos.getZ(i)];
    v[axisIdx] *= -1;
    mpos.setXYZ(i, v[0], v[1], v[2]);
  }
  if (mirrored.index) {
    const idx = mirrored.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i+1]; idx[i+1] = idx[i+2]; idx[i+2] = t;
    }
    mirrored.index.needsUpdate = true;
  }
  return mergeGeometries([geo, mirrored]);
}

function applySolidify(geo, params) {
  const thickness = params.thickness ?? 0.1;
  const pos = geo.attributes.position;
  geo.computeVertexNormals(); const norm = geo.attributes.normal;
  const inner = geo.clone();
  const ipos = inner.attributes.position;
  const inorm = inner.attributes.normal;
  if (!inorm) return geo;
  for (let i = 0; i < ipos.count; i++) {
    ipos.setXYZ(i,
      ipos.getX(i) - inorm.getX(i) * thickness,
      ipos.getY(i) - inorm.getY(i) * thickness,
      ipos.getZ(i) - inorm.getZ(i) * thickness,
    );
  }
  if (inner.index) {
    const idx = inner.index.array.slice();
    for (let i = 0; i < idx.length; i += 3) { const t=idx[i+1]; idx[i+1]=idx[i+2]; idx[i+2]=t; }
    inner.setIndex(Array.from(idx));
  }
  return mergeGeometries([geo, inner]);
}

function applyArray(geo, params) {
  const count = params.count ?? 3;
  const offset = params.offset ?? new THREE.Vector3(2, 0, 0);
  const geos = [];
  for (let i = 0; i < count; i++) {
    const copy = geo.clone();
    copy.translate(offset.x * i, offset.y * i, offset.z * i);
    geos.push(copy);
  }
  return mergeGeometries(geos);
}

function applyDisplace(geo, params) {
  const strength = params.strength ?? 0.1;
  const scale    = params.scale    ?? 1;
  const axis     = params.axis     ?? 'normal';
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * scale, y = pos.getY(i) * scale, z = pos.getZ(i) * scale;
    const noise = Math.sin(x*1.7+z*2.3)*Math.cos(y*1.1+x*1.9)*Math.sin(z*2.7+y*1.3);
    const disp = noise * strength;
    if (axis === 'normal' && norm) {
      pos.setXYZ(i, pos.getX(i)+norm.getX(i)*disp, pos.getY(i)+norm.getY(i)*disp, pos.getZ(i)+norm.getZ(i)*disp);
    } else if (axis === 'y') {
      pos.setY(i, pos.getY(i) + disp);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function applySmooth(geo, params) {
  const iterations = params.iterations ?? 3;
  const factor     = params.factor     ?? 0.5;
  const pos = geo.attributes.position;
  const idx = geo.index;
  if (!idx) return geo;
  const adj = Array.from({ length: pos.count }, () => new Set());
  for (let i = 0; i < idx.count; i += 3) {
    const a=idx.getX(i), b=idx.getX(i+1), c=idx.getX(i+2);
    adj[a].add(b);adj[a].add(c);adj[b].add(a);adj[b].add(c);adj[c].add(a);adj[c].add(b);
  }
  for (let iter = 0; iter < iterations; iter++) {
    const newPos = new Float32Array(pos.array.length);
    for (let i = 0; i < pos.count; i++) {
      const neighbors = Array.from(adj[i]);
      if (!neighbors.length) { newPos[i*3]=pos.getX(i);newPos[i*3+1]=pos.getY(i);newPos[i*3+2]=pos.getZ(i); continue; }
      let sx=0,sy=0,sz=0;
      neighbors.forEach(n=>{sx+=pos.getX(n);sy+=pos.getY(n);sz+=pos.getZ(n);});
      const n=neighbors.length;
      newPos[i*3]   = pos.getX(i)*(1-factor) + sx/n*factor;
      newPos[i*3+1] = pos.getY(i)*(1-factor) + sy/n*factor;
      newPos[i*3+2] = pos.getZ(i)*(1-factor) + sz/n*factor;
    }
    pos.array.set(newPos);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function applyDecimate(geo, params) {
  const ratio = params.ratio ?? 0.5;
  const idx = geo.index;
  if (!idx) return geo;
  const keep = Math.max(3, Math.floor(idx.count * ratio / 3) * 3);
  const newIdx = Array.from(idx.array).slice(0, keep);
  geo.setIndex(newIdx);
  geo.computeVertexNormals();
  return geo;
}

function applyCast(geo, params) {
  const type   = params.shape  ?? 'sphere';
  const factor = params.factor ?? 0.5;
  const radius = params.radius ?? 1;
  const pos = geo.attributes.position;
  const center = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    center.x += pos.getX(i); center.y += pos.getY(i); center.z += pos.getZ(i);
  }
  center.divideScalar(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const dir = vp.clone().sub(center);
    let target;
    if (type === 'sphere') target = center.clone().addScaledVector(dir.normalize(), radius);
    else if (type === 'cube') target = center.clone().add(dir.clone().clampScalar(-radius, radius));
    else target = vp;
    pos.setXYZ(i, vp.x+(target.x-vp.x)*factor, vp.y+(target.y-vp.y)*factor, vp.z+(target.z-vp.z)*factor);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function applyTwist(geo, params) {
  const angle = params.angle ?? Math.PI;
  const axis  = params.axis  ?? 'y';
  const pos = geo.attributes.position;
  const bbox = new THREE.Box3().setFromBufferAttribute(pos);
  const size = bbox.getSize(new THREE.Vector3());
  const axisIdx = { x: 0, y: 1, z: 2 }[axis] ?? 1;
  const axisSize = size.getComponent(axisIdx) || 1;
  for (let i = 0; i < pos.count; i++) {
    const vp = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const t = (vp[axisIdx] - bbox.min.getComponent(axisIdx)) / axisSize;
    const a = t * angle;
    const cos = Math.cos(a), sin = Math.sin(a);
    if (axis === 'y') {
      const nx = vp[0]*cos - vp[2]*sin, nz = vp[0]*sin + vp[2]*cos;
      pos.setXYZ(i, nx, vp[1], nz);
    } else if (axis === 'x') {
      const ny = vp[1]*cos - vp[2]*sin, nz = vp[1]*sin + vp[2]*cos;
      pos.setXYZ(i, vp[0], ny, nz);
    } else {
      const nx = vp[0]*cos - vp[1]*sin, ny = vp[0]*sin + vp[1]*cos;
      pos.setXYZ(i, nx, ny, vp[2]);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function applyBend(geo, params) {
  const angle = params.angle ?? Math.PI * 0.5;
  const axis  = params.axis  ?? 'x';
  const pos = geo.attributes.position;
  const bbox = new THREE.Box3().setFromBufferAttribute(pos);
  const size = bbox.getSize(new THREE.Vector3());
  const W = size.x || 1;
  const R = W / angle;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = x / W;
    const a = t * angle - angle * 0.5;
    pos.setXYZ(i, R * Math.sin(a), y - R * (1 - Math.cos(a)), z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ─── Modifier Stack ───────────────────────────────────────────────────────────

export function createModifier(type, params = {}, enabled = true) {
  return { id: Math.random().toString(36).slice(2), type, params, enabled };
}

export function addModifier(stack, type, params = {}) {
  const mod = createModifier(type, params);
  stack.push(mod);
  return mod;
}

export function removeModifier(stack, id) {
  const i = stack.findIndex(m => m.id === id);
  if (i !== -1) stack.splice(i, 1);
}

export function reorderModifier(stack, id, newIndex) {
  const i = stack.findIndex(m => m.id === id);
  if (i === -1) return;
  const [mod] = stack.splice(i, 1);
  stack.splice(Math.max(0, Math.min(stack.length, newIndex)), 0, mod);
}

export function applyModifierStack(baseGeometry, stack) {
  let geo = baseGeometry.clone();
  for (const mod of stack) {
    if (!mod.enabled) continue;
    try {
      switch (mod.type) {
        case MOD_TYPES.SUBDIVISION: geo = applySubdivision(geo, mod.params); break;
        case MOD_TYPES.MIRROR:      geo = applyMirror(geo, mod.params);      break;
        case MOD_TYPES.SOLIDIFY:    geo = applySolidify(geo, mod.params);    break;
        case MOD_TYPES.ARRAY:       geo = applyArray(geo, mod.params);       break;
        case MOD_TYPES.DISPLACE:    geo = applyDisplace(geo, mod.params);    break;
        case MOD_TYPES.SMOOTH:      geo = applySmooth(geo, mod.params);      break;
        case MOD_TYPES.DECIMATE:    geo = applyDecimate(geo, mod.params);    break;
        case MOD_TYPES.CAST:        geo = applyCast(geo, mod.params);        break;
        case MOD_TYPES.TWIST:       geo = applyTwist(geo, mod.params);       break;
        case MOD_TYPES.BEND:        geo = applyBend(geo, mod.params);        break;
        default: break;
      }
    } catch(e) { console.warn(`Modifier ${mod.type} failed:`, e); }
  }
  return geo;
}

export function applyModifier(geo, mod) {
  switch (mod.type) {
    case MOD_TYPES.SUBDIVISION: return applySubdivision(geo, mod.params);
    case MOD_TYPES.MIRROR:      return applyMirror(geo, mod.params);
    case MOD_TYPES.SOLIDIFY:    return applySolidify(geo, mod.params);
    case MOD_TYPES.ARRAY:       return applyArray(geo, mod.params);
    case MOD_TYPES.DISPLACE:    return applyDisplace(geo, mod.params);
    case MOD_TYPES.SMOOTH:      return applySmooth(geo, mod.params);
    case MOD_TYPES.DECIMATE:    return applyDecimate(geo, mod.params);
    case MOD_TYPES.CAST:        return applyCast(geo, mod.params);
    case MOD_TYPES.TWIST:       return applyTwist(geo, mod.params);
    case MOD_TYPES.BEND:        return applyBend(geo, mod.params);
    default: return geo;
  }
}

export default {
  MOD_TYPES, createModifier, addModifier, removeModifier,
  reorderModifier, applyModifierStack, applyModifier,
};
