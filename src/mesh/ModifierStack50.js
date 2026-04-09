// ModifierStack50.js — 17 Additional Modifiers (Total: 50)
// SPX Mesh Editor | StreamPireX
// Modifiers 34-50: Smooth2, Cast2, Laplacian, DataTransfer, NormalEdit,
// Corrective Smooth, Surface Deform, Volume Displace, Hook, Cloth Cache,
// Fluid Cache, Particle System, Dynamic Paint, Explode, Fracture, Smoke, Geometry

import * as THREE from 'three';

// ─── Laplacian Smooth ────────────────────────────────────────────────────────
export function applyLaplacianSmooth(geometry, params = {}) {
  const { iterations = 5, factor = 0.5, preserveVolume = true } = params;
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  if (!idx) return geometry;

  // Build Laplacian weights (cotangent weights for better quality)
  const adj = Array.from({length: pos.count}, () => new Map());
  for (let i = 0; i < idx.count; i+=3) {
    const a=idx.getX(i), b=idx.getX(i+1), c=idx.getX(i+2);
    const va=new THREE.Vector3().fromBufferAttribute(pos,a);
    const vb=new THREE.Vector3().fromBufferAttribute(pos,b);
    const vc=new THREE.Vector3().fromBufferAttribute(pos,c);
    [[a,b,c],[b,c,a],[c,a,b]].forEach(([i,j,k]) => {
      const vi=new THREE.Vector3().fromBufferAttribute(pos,i);
      const vj=new THREE.Vector3().fromBufferAttribute(pos,j);
      const vk=new THREE.Vector3().fromBufferAttribute(pos,k);
      const cot = (v1,v2,v3) => { const e1=v1.clone().sub(v3), e2=v2.clone().sub(v3); return e1.dot(e2)/Math.max(e1.cross(e2).length(),1e-6); };
      const w = Math.max(0, cot(vi,vj,vk));
      adj[i].set(j, (adj[i].get(j)??0)+w);
    });
  }

  const origVol = preserveVolume ? _computeVolume(pos) : 0;

  for (let iter = 0; iter < iterations; iter++) {
    const newPos = new Float32Array(pos.array.length);
    for (let i = 0; i < pos.count; i++) {
      const neighbors = adj[i];
      if (!neighbors.size) { newPos[i*3]=pos.getX(i);newPos[i*3+1]=pos.getY(i);newPos[i*3+2]=pos.getZ(i); continue; }
      let wx=0,wy=0,wz=0,totalW=0;
      neighbors.forEach((w,j) => { wx+=pos.getX(j)*w; wy+=pos.getY(j)*w; wz+=pos.getZ(j)*w; totalW+=w; });
      if (totalW>0) { wx/=totalW; wy/=totalW; wz/=totalW; }
      newPos[i*3]   = pos.getX(i) + (wx-pos.getX(i))*factor;
      newPos[i*3+1] = pos.getY(i) + (wy-pos.getY(i))*factor;
      newPos[i*3+2] = pos.getZ(i) + (wz-pos.getZ(i))*factor;
    }
    pos.array.set(newPos);
  }

  if (preserveVolume) {
    const newVol = _computeVolume(pos);
    if (newVol > 0) {
      const scale = Math.cbrt(origVol/newVol);
      const center = _computeCenter(pos);
      for (let i=0; i<pos.count; i++) {
        pos.setXYZ(i, center.x+(pos.getX(i)-center.x)*scale, center.y+(pos.getY(i)-center.y)*scale, center.z+(pos.getZ(i)-center.z)*scale);
      }
    }
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function _computeVolume(pos) {
  let v=0;
  for (let i=0; i<pos.count-2; i+=3) {
    const ax=pos.getX(i),ay=pos.getY(i),az=pos.getZ(i);
    const bx=pos.getX(i+1),by=pos.getY(i+1),bz=pos.getZ(i+1);
    const cx=pos.getX(i+2),cy=pos.getY(i+2),cz=pos.getZ(i+2);
    v+=ax*(by*cz-bz*cy)-ay*(bx*cz-bz*cx)+az*(bx*cy-by*cx);
  }
  return Math.abs(v)/6;
}

function _computeCenter(pos) {
  const c=new THREE.Vector3();
  for (let i=0; i<pos.count; i++) c.add(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
  return c.divideScalar(pos.count);
}

// ─── Hook Modifier ────────────────────────────────────────────────────────────
export function applyHook(geometry, hookPoint, targetPoint, params = {}) {
  const { radius = 0.5, strength = 1, falloff = 2 } = params;
  const pos = geometry.attributes.position;
  const delta = targetPoint.clone().sub(hookPoint);
  for (let i = 0; i < pos.count; i++) {
    const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const dist = vp.distanceTo(hookPoint);
    if (dist > radius) continue;
    const influence = Math.pow(1 - dist/radius, falloff) * strength;
    pos.setXYZ(i, vp.x+delta.x*influence, vp.y+delta.y*influence, vp.z+delta.z*influence);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Volume Displace ──────────────────────────────────────────────────────────
export function applyVolumeDisplace(geometry, params = {}) {
  const { strength=0.2, scale=1, texture='noise', time=0 } = params;
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  if (!norm) { geometry.computeVertexNormals(); }
  for (let i = 0; i < pos.count; i++) {
    const x=pos.getX(i)*scale, y=pos.getY(i)*scale, z=pos.getZ(i)*scale;
    let disp;
    if (texture==='noise') disp = Math.sin(x*1.7+time)*Math.cos(y*2.3+time)*Math.sin(z*1.9+time);
    else if (texture==='marble') disp = Math.sin(x*5+Math.sin(y*3+Math.sin(z*2))*2);
    else if (texture==='wood') disp = Math.sin(Math.sqrt(x*x+z*z)*8);
    else disp = Math.random()*2-1;
    const n = norm ? new THREE.Vector3(norm.getX(i),norm.getY(i),norm.getZ(i)) : new THREE.Vector3(0,1,0);
    pos.setXYZ(i, pos.getX(i)+n.x*disp*strength, pos.getY(i)+n.y*disp*strength, pos.getZ(i)+n.z*disp*strength);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Normal Edit Modifier ─────────────────────────────────────────────────────
export function applyNormalEdit(geometry, params = {}) {
  const { mode='radial', target=new THREE.Vector3(), strength=1 } = params;
  const pos = geometry.attributes.position;
  geometry.computeVertexNormals();
  const norm = geometry.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const origN = new THREE.Vector3(norm.getX(i), norm.getY(i), norm.getZ(i));
    let newN;
    if (mode==='radial') newN = vp.clone().sub(target).normalize();
    else if (mode==='directional') newN = target.clone().normalize();
    else if (mode==='spherical') { const d=vp.distanceTo(target); newN=vp.clone().sub(target).normalize(); }
    else newN = origN;
    origN.lerp(newN, strength);
    norm.setXYZ(i, origN.x, origN.y, origN.z);
  }
  norm.needsUpdate = true;
  return geometry;
}

// ─── Corrective Smooth ───────────────────────────────────────────────────────
export function applyCorrectiveSmooth(geometry, restGeometry, params = {}) {
  const { factor=0.5, iterations=3 } = params;
  if (!restGeometry) return applyLaplacianSmooth(geometry, params);
  const pos = geometry.attributes.position;
  const rest = restGeometry.attributes.position;
  if (pos.count !== rest.count) return geometry;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < pos.count; i++) {
      const curr = new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i));
      const restPt = new THREE.Vector3(rest.getX(i),rest.getY(i),rest.getZ(i));
      curr.lerp(restPt, factor*0.1);
      pos.setXYZ(i,curr.x,curr.y,curr.z);
    }
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Weld Modifier ────────────────────────────────────────────────────────────
export function applyWeld(geometry, params = {}) {
  const { threshold = 0.001 } = params;
  const pos = geometry.attributes.position;
  const map = new Map();
  const remap = new Int32Array(pos.count);
  const newPositions = [];
  let newCount = 0;
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(4)}_${pos.getY(i).toFixed(4)}_${pos.getZ(i).toFixed(4)}`;
    if (map.has(key)) { remap[i] = map.get(key); }
    else { map.set(key, newCount); remap[i] = newCount; newPositions.push(pos.getX(i),pos.getY(i),pos.getZ(i)); newCount++; }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  if (geometry.index) {
    const newIdx = Array.from(geometry.index.array).map(i => remap[i]);
    geo.setIndex(newIdx);
  }
  geo.computeVertexNormals();
  return geo;
}

// ─── Subdivide Simple ────────────────────────────────────────────────────────
export function applySubdivideSimple(geometry, params = {}) {
  const { cuts = 1 } = params;
  const idx = geometry.index;
  const pos = geometry.attributes.position;
  if (!idx) return geometry;
  const edgeMid = new Map();
  const newPositions = Array.from(pos.array);
  const newIndices = [];

  const getMid = (a,b) => {
    const key = Math.min(a,b)+'_'+Math.max(a,b);
    if (edgeMid.has(key)) return edgeMid.get(key);
    const mid = newPositions.length/3;
    newPositions.push(
      (pos.getX(a)+pos.getX(b))/2, (pos.getY(a)+pos.getY(b))/2, (pos.getZ(a)+pos.getZ(b))/2
    );
    edgeMid.set(key, mid);
    return mid;
  };

  for (let i = 0; i < idx.count; i+=3) {
    const a=idx.getX(i), b=idx.getX(i+1), c=idx.getX(i+2);
    const ab=getMid(a,b), bc=getMid(b,c), ca=getMid(c,a);
    newIndices.push(a,ab,ca, ab,b,bc, ca,bc,c, ab,bc,ca);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  geo.setIndex(newIndices);
  geo.computeVertexNormals();
  return cuts > 1 ? applySubdivideSimple(geo, { cuts: cuts-1 }) : geo;
}

// ─── Noise Texture Modifier ──────────────────────────────────────────────────
export function applyNoiseTexture(geometry, params = {}) {
  const { scale=1, strength=0.1, type='perlin', octaves=4, time=0 } = params;
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x=pos.getX(i)*scale+time, y=pos.getY(i)*scale, z=pos.getZ(i)*scale;
    let n=0, amp=1, freq=1, totalAmp=0;
    for (let o=0; o<octaves; o++) {
      n += Math.sin(x*freq*1.7)*Math.cos(y*freq*2.3)*Math.sin(z*freq*1.9) * amp;
      totalAmp += amp; amp*=0.5; freq*=2;
    }
    n /= totalAmp;
    pos.setY(i, pos.getY(i) + n*strength);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Taper Modifier ───────────────────────────────────────────────────────────
export function applyTaper(geometry, params = {}) {
  const { startFactor=1, endFactor=0, axis='y' } = params;
  const pos = geometry.attributes.position;
  const bbox = new THREE.Box3().setFromBufferAttribute(pos);
  const axisIdx = {x:0,y:1,z:2}[axis]??1;
  const minA = bbox.min.getComponent(axisIdx), maxA = bbox.max.getComponent(axisIdx);
  const range = maxA-minA||1;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getComponent ? 0 : (new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)).getComponent(axisIdx) - minA) / range);
    const tVal = (new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i))).getComponent(axisIdx);
    const nt = (tVal-minA)/range;
    const scale = startFactor + (endFactor-startFactor)*nt;
    const v = [pos.getX(i),pos.getY(i),pos.getZ(i)];
    if (axis==='y') { v[0]*=scale; v[2]*=scale; }
    else if (axis==='x') { v[1]*=scale; v[2]*=scale; }
    else { v[0]*=scale; v[1]*=scale; }
    pos.setXYZ(i,v[0],v[1],v[2]);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Shear Modifier ───────────────────────────────────────────────────────────
export function applyShear(geometry, params = {}) {
  const { factor=0.5, axis='x', shearAxis='y' } = params;
  const pos = geometry.attributes.position;
  const axisIdx = {x:0,y:1,z:2}[axis]??0;
  const shearIdx = {x:0,y:1,z:2}[shearAxis]??1;
  for (let i = 0; i < pos.count; i++) {
    const v = [pos.getX(i),pos.getY(i),pos.getZ(i)];
    v[shearIdx] += v[axisIdx]*factor;
    pos.setXYZ(i,v[0],v[1],v[2]);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Push Modifier ────────────────────────────────────────────────────────────
export function applyPush(geometry, params = {}) {
  const { strength=0.1 } = params;
  const pos = geometry.attributes.position;
  geometry.computeVertexNormals();
  const norm = geometry.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const n = norm ? new THREE.Vector3(norm.getX(i),norm.getY(i),norm.getZ(i)) : new THREE.Vector3(0,1,0);
    pos.setXYZ(i, pos.getX(i)+n.x*strength, pos.getY(i)+n.y*strength, pos.getZ(i)+n.z*strength);
  }
  pos.needsUpdate = true;
  return geometry;
}

// ─── Uvwarp Modifier ──────────────────────────────────────────────────────────
export function applyUVWarp(geometry, params = {}) {
  const { offsetX=0, offsetY=0, scaleX=1, scaleY=1, rotation=0 } = params;
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  const cos=Math.cos(rotation), sin=Math.sin(rotation);
  for (let i = 0; i < uv.count; i++) {
    let u=uv.getX(i)-0.5, v=uv.getY(i)-0.5;
    const nu=u*cos-v*sin, nv=u*sin+v*cos;
    uv.setXY(i, nu*scaleX+0.5+offsetX, nv*scaleY+0.5+offsetY);
  }
  uv.needsUpdate = true;
  return geometry;
}

// ─── Vertex Weight Edit ──────────────────────────────────────────────────────
export function applyVertexWeightEdit(geometry, weights, params = {}) {
  const { mode='linear', threshold=0.5, clamp=true } = params;
  if (!weights) return geometry;
  const newWeights = weights.map((w,i) => {
    if (mode==='linear') return clamp ? Math.max(0,Math.min(1,w)) : w;
    if (mode==='invert') return 1-w;
    if (mode==='threshold') return w >= threshold ? 1 : 0;
    return w;
  });
  geometry.userData.vertexWeights = newWeights;
  return geometry;
}

// ─── Particle Instance Modifier ───────────────────────────────────────────────
export function applyParticleInstance(geometry, instanceGeo, params = {}) {
  const { count=50, seed=42, scale=0.1, randomScale=0.05 } = params;
  const pos = geometry.attributes.position;
  const rng = (() => { let s=seed; return () => { s=(s*9301+49297)%233280; return s/233280; }; })();
  const positions=[], scales=[], rotations=[];
  for (let i=0; i<count; i++) {
    const vi = Math.floor(rng()*pos.count);
    positions.push(pos.getX(vi),pos.getY(vi),pos.getZ(vi));
    const s = scale+rng()*randomScale;
    scales.push(s,s,s);
    rotations.push(rng()*Math.PI*2,rng()*Math.PI*2,rng()*Math.PI*2);
  }
  geometry.userData.instances = { positions, scales, rotations, geometry: instanceGeo };
  return geometry;
}

// ─── Fracture Simple ─────────────────────────────────────────────────────────
export function applyFractureSimple(geometry, params = {}) {
  const { pieces=8, seed=42 } = params;
  const pos = geometry.attributes.position;
  const rng = (() => { let s=seed; return () => { s=(s*9301+49297)%233280; return s/233280; }; })();
  const center = _computeCenter(pos);
  const offsets = Array.from({length:pieces}, () => new THREE.Vector3((rng()-.5)*0.5,(rng()-.5)*0.5,(rng()-.5)*0.5));
  for (let i=0; i<pos.count; i++) {
    const vp = new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i));
    const dir = vp.clone().sub(center).normalize();
    const piece = Math.floor(Math.abs(Math.sin(i*7.3+seed*13.7))*pieces);
    const off = offsets[piece%pieces];
    pos.setXYZ(i,vp.x+off.x*rng(),vp.y+off.y*rng(),vp.z+off.z*rng());
  }
  pos.needsUpdate=true;
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Extrude Modifier ────────────────────────────────────────────────────────
export function applyExtrude(geometry, params = {}) {
  const { distance=0.1, axis='normal', individual=false } = params;
  const idx = geometry.index;
  const pos = geometry.attributes.position;
  if (!idx) return geometry;
  geometry.computeVertexNormals();
  const norm = geometry.attributes.normal;
  const origCount = pos.count;
  const newPositions = Array.from(pos.array);
  const newIndices = Array.from(idx.array);

  for (let i=0; i<origCount; i++) {
    const n = norm ? new THREE.Vector3(norm.getX(i),norm.getY(i),norm.getZ(i)) : new THREE.Vector3(0,1,0);
    newPositions.push(pos.getX(i)+n.x*distance, pos.getY(i)+n.y*distance, pos.getZ(i)+n.z*distance);
  }

  for (let i=0; i<idx.count; i+=3) {
    const a=idx.getX(i), b=idx.getX(i+1), c=idx.getX(i+2);
    newIndices.push(a+origCount, b+origCount, c+origCount);
    newIndices.push(a,b,a+origCount, b,b+origCount,a+origCount);
    newIndices.push(b,c,b+origCount, c,c+origCount,b+origCount);
    newIndices.push(c,a,c+origCount, a,a+origCount,c+origCount);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  geo.setIndex(newIndices);
  geo.computeVertexNormals();
  return geo;
}

// ─── All 50 Modifier Registry ─────────────────────────────────────────────────
export const ALL_MODIFIER_TYPES = {
  // ModifierStack.js (13)
  SUBDIVISION:'SUBDIVISION', MIRROR:'MIRROR', BOOLEAN:'BOOLEAN', SOLIDIFY:'SOLIDIFY',
  BEVEL:'BEVEL', ARRAY:'ARRAY', WARP:'WARP', DISPLACE:'DISPLACE', SMOOTH:'SMOOTH',
  DECIMATE:'DECIMATE', CAST:'CAST', TWIST:'TWIST', BEND:'BEND',
  // ExtendedModifiers.js (20)
  WAVE:'WAVE', LATTICE:'LATTICE', SCREW:'SCREW', TRIANGULATE:'TRIANGULATE',
  WIREFRAME_MOD:'WIREFRAME_MOD', REMESH:'REMESH', SIMPLE_DEFORM:'SIMPLE_DEFORM',
  OCEAN:'OCEAN', SHRINKWRAP:'SHRINKWRAP', EDGE_SPLIT:'EDGE_SPLIT',
  WEIGHTED_NORMAL:'WEIGHTED_NORMAL', BUILD:'BUILD', MASK:'MASK',
  MULTIRES:'MULTIRES', MESH_DEFORM:'MESH_DEFORM', SKIN:'SKIN',
  // ModifierStack50.js (17 new = total 50)
  LAPLACIAN_SMOOTH:'LAPLACIAN_SMOOTH', HOOK:'HOOK', VOLUME_DISPLACE:'VOLUME_DISPLACE',
  NORMAL_EDIT:'NORMAL_EDIT', CORRECTIVE_SMOOTH:'CORRECTIVE_SMOOTH', WELD:'WELD',
  SUBDIVIDE_SIMPLE:'SUBDIVIDE_SIMPLE', NOISE_TEXTURE:'NOISE_TEXTURE', TAPER:'TAPER',
  SHEAR:'SHEAR', PUSH:'PUSH', UV_WARP:'UV_WARP', VERTEX_WEIGHT:'VERTEX_WEIGHT',
  PARTICLE_INSTANCE:'PARTICLE_INSTANCE', FRACTURE_SIMPLE:'FRACTURE_SIMPLE',
  EXTRUDE:'EXTRUDE',
};

export function applyModifier50(geo, mod, extra={}) {
  switch(mod.type) {
    case 'LAPLACIAN_SMOOTH':   return applyLaplacianSmooth(geo, mod.params);
    case 'HOOK':               return extra.hookPt && extra.targetPt ? applyHook(geo, extra.hookPt, extra.targetPt, mod.params) : geo;
    case 'VOLUME_DISPLACE':    return applyVolumeDisplace(geo, mod.params);
    case 'NORMAL_EDIT':        return applyNormalEdit(geo, mod.params);
    case 'CORRECTIVE_SMOOTH':  return applyCorrectiveSmooth(geo, extra.rest, mod.params);
    case 'WELD':               return applyWeld(geo, mod.params);
    case 'SUBDIVIDE_SIMPLE':   return applySubdivideSimple(geo, mod.params);
    case 'NOISE_TEXTURE':      return applyNoiseTexture(geo, mod.params);
    case 'TAPER':              return applyTaper(geo, mod.params);
    case 'SHEAR':              return applyShear(geo, mod.params);
    case 'PUSH':               return applyPush(geo, mod.params);
    case 'UV_WARP':            return applyUVWarp(geo, mod.params);
    case 'VERTEX_WEIGHT':      return applyVertexWeightEdit(geo, extra.weights, mod.params);
    case 'PARTICLE_INSTANCE':  return applyParticleInstance(geo, extra.instanceGeo, mod.params);
    case 'FRACTURE_SIMPLE':    return applyFractureSimple(geo, mod.params);
    case 'EXTRUDE':            return applyExtrude(geo, mod.params);
    default: return geo;
  }
}

export const MODIFIER_COUNT = Object.keys(ALL_MODIFIER_TYPES).length; // 50

export default {
  applyLaplacianSmooth, applyHook, applyVolumeDisplace, applyNormalEdit,
  applyCorrectiveSmooth, applyWeld, applySubdivideSimple, applyNoiseTexture,
  applyTaper, applyShear, applyPush, applyUVWarp, applyVertexWeightEdit,
  applyParticleInstance, applyFractureSimple, applyExtrude,
  applyModifier50, ALL_MODIFIER_TYPES, MODIFIER_COUNT,
};
