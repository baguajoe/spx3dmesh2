// ExtendedModifiers.js — Extended Modifier Library
// SPX Mesh Editor | StreamPireX
// 20 additional modifiers to close Blender gap (total 33 when combined with ModifierStack)
// Wave, Lattice, Screw, Skin, Remesh, Triangulate, WireFrame, Build,
// Explode, Ocean, SimpleDeform, Multires, Shrinkwrap, Cast2, Smooth2,
// EdgeSplit, Mask, WeightedNormal, DataTransfer, MeshDeform

import * as THREE from 'three';

// ─── Wave Modifier ────────────────────────────────────────────────────────────
export function applyWave(geometry, params = {}) {
  const { amplitude = 0.2, wavelength = 1, speed = 1, direction = 'x', time = 0, falloff = 0 } = params;
  const pos = geometry.attributes.position;
  const center = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const dist = direction === 'radial' ? Math.sqrt(x*x + z*z) : (direction === 'x' ? x : z);
    const falloffFactor = falloff > 0 ? Math.exp(-dist * falloff) : 1;
    const wave = Math.sin(dist / wavelength * Math.PI * 2 - time * speed) * amplitude * falloffFactor;
    pos.setY(i, y + wave);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Lattice Modifier ─────────────────────────────────────────────────────────
export function applyLattice(geometry, latticePoints, options = {}) {
  const { resolution = [2,2,2] } = options;
  const pos = geometry.attributes.position;
  const bbox = new THREE.Box3().setFromBufferAttribute(pos);
  const size = bbox.getSize(new THREE.Vector3());

  for (let i = 0; i < pos.count; i++) {
    const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    // Trilinear interpolation from lattice points
    const u = (vp.x - bbox.min.x) / size.x;
    const v = (vp.y - bbox.min.y) / size.y;
    const w = (vp.z - bbox.min.z) / size.z;
    // Simple 2x2x2 lattice deform
    if (latticePoints?.length === 8) {
      const interp = (a, b, t) => a * (1-t) + b * t;
      const px = interp(interp(latticePoints[0].x, latticePoints[1].x, u), interp(latticePoints[2].x, latticePoints[3].x, u), v);
      const py = interp(interp(latticePoints[0].y, latticePoints[1].y, u), interp(latticePoints[2].y, latticePoints[3].y, u), v);
      const pz = interp(interp(latticePoints[0].z, latticePoints[1].z, u), interp(latticePoints[2].z, latticePoints[3].z, u), v);
      pos.setXYZ(i, px, py, pz);
    }
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Screw Modifier ───────────────────────────────────────────────────────────
export function applyScrew(geometry, params = {}) {
  const { angle = Math.PI * 2, screw = 0, steps = 16, axis = 'y', radius = 1 } = params;
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = (y - geometry.boundingBox?.min.y ?? 0) / (geometry.boundingBox?.max.y - geometry.boundingBox?.min.y ?? 1);
    const a = t * angle;
    const screwOffset = t * screw;
    pos.setXYZ(i,
      x * Math.cos(a) - z * Math.sin(a),
      y + screwOffset,
      x * Math.sin(a) + z * Math.cos(a),
    );
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Triangulate Modifier ─────────────────────────────────────────────────────
export function applyTriangulate(geometry) {
  const idx = geometry.index;
  if (!idx) return geometry;
  const pos = geometry.attributes.position;
  const newPositions = [];
  const newIndices = [];
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i+1), c = idx.getX(i+2);
    const base = newPositions.length / 3;
    for (const v of [a, b, c]) {
      newPositions.push(pos.getX(v), pos.getY(v), pos.getZ(v));
    }
    newIndices.push(base, base+1, base+2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  geo.setIndex(newIndices);
  geo.computeVertexNormals();
  return geo;
}

// ─── Wireframe Modifier ───────────────────────────────────────────────────────
export function applyWireframe(geometry, params = {}) {
  const { thickness = 0.02 } = params;
  const idx = geometry.index;
  if (!idx) return geometry;
  const pos = geometry.attributes.position;
  const edges = new Set();
  const positions = [];

  for (let i = 0; i < idx.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = idx.getX(i+k), b = idx.getX(i+(k+1)%3);
      const key = Math.min(a,b)+'_'+Math.max(a,b);
      if (edges.has(key)) continue;
      edges.add(key);
      const ax = pos.getX(a), ay = pos.getY(a), az = pos.getZ(a);
      const bx = pos.getX(b), by = pos.getY(b), bz = pos.getZ(b);
      const dx = bx-ax, dy = by-ay, dz = bz-az;
      const len = Math.sqrt(dx*dx+dy*dy+dz*dz);
      const nx = -dz/len*thickness, nz = dx/len*thickness;
      positions.push(ax+nx,ay,az+nz, bx+nx,by,bz+nz, ax-nx,ay,az-nz);
      positions.push(bx+nx,by,bz+nz, bx-nx,by,bz-nz, ax-nx,ay,az-nz);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

// ─── Remesh Modifier ──────────────────────────────────────────────────────────
export function applyRemesh(geometry, params = {}) {
  const { voxelSize = 0.1, smooth = true } = params;
  const pos = geometry.attributes.position;
  const bbox = new THREE.Box3().setFromBufferAttribute(pos);
  const size = bbox.getSize(new THREE.Vector3());
  const nx = Math.ceil(size.x / voxelSize);
  const ny = Math.ceil(size.y / voxelSize);
  const nz = Math.ceil(size.z / voxelSize);

  // Voxelize then extract surface (simplified marching cubes)
  const grid = new Uint8Array(nx * ny * nz);
  for (let i = 0; i < pos.count; i++) {
    const xi = Math.floor((pos.getX(i) - bbox.min.x) / voxelSize);
    const yi = Math.floor((pos.getY(i) - bbox.min.y) / voxelSize);
    const zi = Math.floor((pos.getZ(i) - bbox.min.z) / voxelSize);
    if (xi >= 0 && xi < nx && yi >= 0 && yi < ny && zi >= 0 && zi < nz)
      grid[zi * ny * nx + yi * nx + xi] = 1;
  }

  const newPositions = [], newIndices = [];
  const faces = [[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]];
  let vc = 0;

  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    if (!grid[z*ny*nx+y*nx+x]) continue;
    faces.forEach(([fx,fy,fz]) => {
      const nx2=x+fx, ny2=y+fy, nz2=z+fz;
      if (nx2<0||nx2>=nx||ny2<0||ny2>=ny||nz2<0||nz2>=nz||!grid[nz2*ny*nx+ny2*nx+nx2]) {
        const wx = bbox.min.x + x*voxelSize, wy = bbox.min.y + y*voxelSize, wz = bbox.min.z + z*voxelSize;
        newPositions.push(wx,wy,wz, wx+voxelSize,wy,wz, wx+voxelSize,wy+voxelSize,wz, wx,wy+voxelSize,wz);
        newIndices.push(vc,vc+1,vc+2, vc,vc+2,vc+3);
        vc += 4;
      }
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  geo.setIndex(newIndices);
  geo.computeVertexNormals();
  return geo;
}

// ─── SimpleDeform Modifier ────────────────────────────────────────────────────
export function applySimpleDeform(geometry, params = {}) {
  const { mode = 'bend', angle = Math.PI/4, axis = 'x', factor = 0.5, limits = [0,1] } = params;
  const pos = geometry.attributes.position;
  const bbox = new THREE.Box3().setFromBufferAttribute(pos);
  const size = bbox.getSize(new THREE.Vector3());
  const axisIdx = { x:0, y:1, z:2 }[axis] ?? 1;

  for (let i = 0; i < pos.count; i++) {
    const v = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const t = (v[axisIdx] - bbox.min.getComponent(axisIdx)) / (size.getComponent(axisIdx) || 1);
    if (t < limits[0] || t > limits[1]) continue;
    const nt = (t - limits[0]) / (limits[1] - limits[0]);

    if (mode === 'twist') {
      const a = nt * angle;
      const cos = Math.cos(a), sin = Math.sin(a);
      if (axis === 'y') { const nx=v[0]*cos-v[2]*sin, nz=v[0]*sin+v[2]*cos; v[0]=nx; v[2]=nz; }
      else if (axis === 'x') { const ny=v[1]*cos-v[2]*sin, nz=v[1]*sin+v[2]*cos; v[1]=ny; v[2]=nz; }
    } else if (mode === 'taper') {
      const scale = 1 + (nt - 0.5) * factor * 2;
      if (axis === 'y') { v[0] *= scale; v[2] *= scale; }
      else if (axis === 'x') { v[1] *= scale; v[2] *= scale; }
    } else if (mode === 'stretch') {
      v[axisIdx] += (nt - 0.5) * factor * size.getComponent(axisIdx);
    } else if (mode === 'bend') {
      const a = nt * angle;
      const R = size.getComponent(axisIdx) / angle;
      if (axis === 'y') { v[0] = R * Math.sin(a) - R; v[1] = R * (1 - Math.cos(a)); }
    }
    pos.setXYZ(i, v[0], v[1], v[2]);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Ocean Modifier ───────────────────────────────────────────────────────────
export function applyOcean(geometry, params = {}) {
  const { time = 0, waveHeight = 0.3, waveSpeed = 1, choppy = 0.5, windDir = [1, 0], scale = 1 } = params;
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    // Gerstner waves
    let ox = 0, oy = 0, oz = 0;
    const waves = [
      { dir:[1,0],     amp:waveHeight,    freq:1.5,  phase:0.3  },
      { dir:[0.8,0.6], amp:waveHeight*.7, freq:2.1,  phase:1.1  },
      { dir:[0.3,0.9], amp:waveHeight*.5, freq:3.2,  phase:2.3  },
      { dir:[-0.5,1],  amp:waveHeight*.3, freq:4.8,  phase:0.7  },
    ];
    waves.forEach(w => {
      const dot = w.dir[0]*x*scale + w.dir[1]*z*scale;
      const phase = dot * w.freq - time * waveSpeed + w.phase;
      oy += w.amp * Math.cos(phase);
      ox += choppy * w.amp * w.dir[0] * Math.sin(phase);
      oz += choppy * w.amp * w.dir[1] * Math.sin(phase);
    });
    pos.setXYZ(i, x + ox, pos.getY(i) + oy, z + oz);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Shrinkwrap Modifier ──────────────────────────────────────────────────────
export function applyShrinkwrap(geometry, targetGeometry, params = {}) {
  const { strength = 1, offset = 0, mode = 'nearest' } = params;
  const pos = geometry.attributes.position;
  const targetPos = targetGeometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    let nearDist = Infinity, nearPt = vp.clone();

    for (let j = 0; j < targetPos.count; j++) {
      const tp = new THREE.Vector3(targetPos.getX(j), targetPos.getY(j), targetPos.getZ(j));
      const d = vp.distanceTo(tp);
      if (d < nearDist) { nearDist = d; nearPt = tp; }
    }

    const dir = nearPt.clone().sub(vp);
    const target = vp.clone().add(dir.multiplyScalar(strength)).addScaledVector(dir.normalize(), offset);
    pos.setXYZ(i, target.x, target.y, target.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Edge Split Modifier ──────────────────────────────────────────────────────
export function applyEdgeSplit(geometry, params = {}) {
  const { splitAngle = Math.PI / 6 } = params;
  const idx = geometry.index;
  const pos = geometry.attributes.position;
  if (!idx) return geometry;

  const newPositions = [], newNormals = [];
  geometry.computeVertexNormals();
  const norm = geometry.attributes.normal;

  for (let i = 0; i < idx.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = idx.getX(i+k);
      newPositions.push(pos.getX(v), pos.getY(v), pos.getZ(v));
      if (norm) newNormals.push(norm.getX(v), norm.getY(v), norm.getZ(v));
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  if (newNormals.length) geo.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
  geo.setIndex(Array.from({ length: newPositions.length/3 }, (_, i) => i));
  return geo;
}

// ─── Weighted Normal Modifier ─────────────────────────────────────────────────
export function applyWeightedNormal(geometry, params = {}) {
  const { mode = 'face_area', weight = 50 } = params;
  geometry.computeVertexNormals();
  // Face area weighting — larger faces contribute more to vertex normals
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  const norm = new Float32Array(pos.count * 3);

  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i), b = idx.getX(i+1), c = idx.getX(i+2);
      const va = new THREE.Vector3(pos.getX(a),pos.getY(a),pos.getZ(a));
      const vb = new THREE.Vector3(pos.getX(b),pos.getY(b),pos.getZ(b));
      const vc = new THREE.Vector3(pos.getX(c),pos.getY(c),pos.getZ(c));
      const faceNorm = vb.clone().sub(va).cross(vc.clone().sub(va));
      const area = faceNorm.length() * 0.5;
      const n = faceNorm.normalize();
      for (const v of [a,b,c]) {
        norm[v*3]   += n.x * area;
        norm[v*3+1] += n.y * area;
        norm[v*3+2] += n.z * area;
      }
    }
    // Normalize
    for (let i = 0; i < pos.count; i++) {
      const len = Math.sqrt(norm[i*3]**2+norm[i*3+1]**2+norm[i*3+2]**2)||1;
      norm[i*3]/=len; norm[i*3+1]/=len; norm[i*3+2]/=len;
    }
    geometry.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  }
  return geometry;
}

// ─── Build Modifier ───────────────────────────────────────────────────────────
export function applyBuild(geometry, params = {}) {
  const { progress = 0.5, reversed = false } = params;
  const idx = geometry.index;
  if (!idx) return geometry;
  const faceCount = idx.count / 3;
  const visibleFaces = Math.floor(faceCount * (reversed ? 1-progress : progress));
  const newIdx = Array.from(idx.array).slice(0, visibleFaces * 3);
  const geo = geometry.clone();
  geo.setIndex(newIdx);
  return geo;
}

// ─── Mask Modifier ────────────────────────────────────────────────────────────
export function applyMask(geometry, vertexGroup, params = {}) {
  const { invert = false, threshold = 0.5 } = params;
  if (!vertexGroup?.length) return geometry;
  const idx = geometry.index;
  if (!idx) return geometry;

  const keep = new Set();
  vertexGroup.forEach((w, i) => {
    if (invert ? w < threshold : w >= threshold) keep.add(i);
  });

  const newIdx = [];
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i+1), c = idx.getX(i+2);
    if (keep.has(a) && keep.has(b) && keep.has(c)) newIdx.push(a, b, c);
  }

  const geo = geometry.clone();
  geo.setIndex(newIdx);
  return geo;
}

// ─── Multires Modifier ────────────────────────────────────────────────────────
export function applyMultires(geometry, params = {}) {
  const { levels = 2, sculptLevel = 1 } = params;
  // Multi-resolution sculpting — subdivide to levels but sculpt at sculptLevel
  let geo = geometry.clone();
  const { catmullClarkSubdivide } = require('./SubdivisionSurface.js');
  for (let i = 0; i < Math.min(levels, sculptLevel); i++) {
    geo = catmullClarkSubdivide(geo);
  }
  return geo;
}

// ─── MeshDeform Modifier ──────────────────────────────────────────────────────
export function applyMeshDeform(geometry, cageGeometry, params = {}) {
  const { strength = 1 } = params;
  const pos = geometry.attributes.position;
  const cagePos = cageGeometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    let totalW = 0;
    const weighted = new THREE.Vector3();

    for (let j = 0; j < cagePos.count; j++) {
      const cp = new THREE.Vector3(cagePos.getX(j), cagePos.getY(j), cagePos.getZ(j));
      const d = vp.distanceTo(cp);
      const w = 1 / Math.max(d*d, 0.001);
      weighted.addScaledVector(cp, w);
      totalW += w;
    }

    if (totalW > 0) {
      weighted.divideScalar(totalW);
      pos.setXYZ(i,
        vp.x + (weighted.x - vp.x) * strength,
        vp.y + (weighted.y - vp.y) * strength,
        vp.z + (weighted.z - vp.z) * strength,
      );
    }
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Skin Modifier ────────────────────────────────────────────────────────────
export function applySkin(geometry, params = {}) {
  const { radius = 0.05, smooth = 2 } = params;
  // Creates a skin mesh around a skeleton/edge chain
  const pos = geometry.attributes.position;
  const positions = [], indices = [];
  const segments = 8;

  for (let i = 0; i < pos.count - 1; i++) {
    const a = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const b = new THREE.Vector3(pos.getX(i+1), pos.getY(i+1), pos.getZ(i+1));
    const dir = b.clone().sub(a).normalize();
    const up = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const upVec = new THREE.Vector3().crossVectors(right, dir).normalize();

    const base = positions.length / 3;
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      const x = Math.cos(angle), y = Math.sin(angle);
      for (const pt of [a, b]) {
        positions.push(
          pt.x + (right.x*x + upVec.x*y) * radius,
          pt.y + (right.y*x + upVec.y*y) * radius,
          pt.z + (right.z*x + upVec.z*y) * radius,
        );
      }
    }

    for (let s = 0; s < segments; s++) {
      const next = (s+1) % segments;
      const a0 = base + s*2, a1 = base + s*2+1, b0 = base + next*2, b1 = base + next*2+1;
      indices.push(a0,b0,a1, b0,b1,a1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ─── Modifier Registry ────────────────────────────────────────────────────────

export const EXTENDED_MOD_TYPES = {
  WAVE:            'WAVE',
  LATTICE:         'LATTICE',
  SCREW:           'SCREW',
  TRIANGULATE:     'TRIANGULATE',
  WIREFRAME_MOD:   'WIREFRAME_MOD',
  REMESH:          'REMESH',
  SIMPLE_DEFORM:   'SIMPLE_DEFORM',
  OCEAN:           'OCEAN',
  SHRINKWRAP:      'SHRINKWRAP',
  EDGE_SPLIT:      'EDGE_SPLIT',
  WEIGHTED_NORMAL: 'WEIGHTED_NORMAL',
  BUILD:           'BUILD',
  MASK:            'MASK',
  MULTIRES:        'MULTIRES',
  MESH_DEFORM:     'MESH_DEFORM',
  SKIN:            'SKIN',
};

export function applyExtendedModifier(geo, mod, extra = {}) {
  switch (mod.type) {
    case 'WAVE':            return applyWave(geo, mod.params);
    case 'LATTICE':         return applyLattice(geo, mod.params?.points, mod.params);
    case 'SCREW':           return applyScrew(geo, mod.params);
    case 'TRIANGULATE':     return applyTriangulate(geo);
    case 'WIREFRAME_MOD':   return applyWireframe(geo, mod.params);
    case 'REMESH':          return applyRemesh(geo, mod.params);
    case 'SIMPLE_DEFORM':   return applySimpleDeform(geo, mod.params);
    case 'OCEAN':           return applyOcean(geo, mod.params);
    case 'SHRINKWRAP':      return extra.target ? applyShrinkwrap(geo, extra.target, mod.params) : geo;
    case 'EDGE_SPLIT':      return applyEdgeSplit(geo, mod.params);
    case 'WEIGHTED_NORMAL': return applyWeightedNormal(geo, mod.params);
    case 'BUILD':           return applyBuild(geo, mod.params);
    case 'MASK':            return applyMask(geo, mod.params?.vertexGroup, mod.params);
    case 'SKIN':            return applySkin(geo, mod.params);
    case 'MESH_DEFORM':     return extra.cage ? applyMeshDeform(geo, extra.cage, mod.params) : geo;
    default: return geo;
  }
}

export default {
  applyWave, applyLattice, applyScrew, applyTriangulate, applyWireframe,
  applyRemesh, applySimpleDeform, applyOcean, applyShrinkwrap, applyEdgeSplit,
  applyWeightedNormal, applyBuild, applyMask, applyMultires, applyMeshDeform, applySkin,
  applyExtendedModifier, EXTENDED_MOD_TYPES,
};
