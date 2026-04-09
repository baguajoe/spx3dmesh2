// FaceGenerator.js — Procedural Face Mesh Generator
// SPX Mesh Editor | StreamPireX
// Generates anatomically correct face geometry from parameters

import * as THREE from 'three';

// ─── Utilities ────────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function addVertex(positions, normals, uvs, x, y, z, nx=0, ny=1, nz=0, u=0, v=0) {
  positions.push(x, y, z);
  normals.push(nx, ny, nz);
  uvs.push(u, v);
  return positions.length / 3 - 1;
}

function addFace(indices, a, b, c) { indices.push(a, b, c); }
function addQuad(indices, a, b, c, d) { indices.push(a, b, c, a, c, d); }

// ─── Head Shape ───────────────────────────────────────────────────────────────

export function generateHeadGeometry(params = {}) {
  const {
    headWidth        = 1.0,
    headHeight       = 1.2,
    jawWidth         = 0.85,
    chinHeight       = 0.15,
    cheekbone        = 0.6,
    foreheadHeight   = 0.4,
    crownRoundness   = 0.8,
    temporalWidth    = 0.9,
    occipitalBulge   = 0.3,
    segments         = 24,
  } = params;

  const positions = [], normals = [], uvs = [], indices = [];
  const rings = 16;
  const segs = segments;

  // Generate head as deformed sphere with facial feature zones
  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * Math.PI;
    const y = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    for (let s = 0; s <= segs; s++) {
      const theta = (s / segs) * Math.PI * 2;
      const x = Math.cos(theta) * sinPhi;
      const z = Math.sin(theta) * sinPhi;

      // Deform based on face region
      const t = r / rings; // 0=top, 1=bottom
      const isFront = z > 0;

      // Width deformation
      let wx = headWidth;
      if (t > 0.3 && t < 0.7) wx *= lerp(1, cheekbone, Math.sin((t-0.3)/0.4*Math.PI));
      if (t > 0.6) wx *= lerp(cheekbone, jawWidth, (t-0.6)/0.4);

      // Height deformation
      let hy = headHeight;
      if (t < 0.2) hy *= lerp(crownRoundness, 1, t/0.2);

      // Forehead flatten
      const foreheadFactor = isFront && t < 0.4 ? lerp(0.95, 1, t/0.4) : 1;

      // Temporal region
      const isTemple = Math.abs(x) > 0.7 && z > -0.3;
      const tempFactor = isTemple ? temporalWidth : 1;

      // Occipital bulge
      const isBack = z < -0.5;
      const occFactor = isBack && t > 0.3 && t < 0.7 ? 1 + occipitalBulge * 0.1 : 1;

      const px = x * wx * tempFactor * occFactor;
      const py = y * hy;
      const pz = z * (isFront ? foreheadFactor : occFactor);

      const len = Math.sqrt(px*px + py*py + pz*pz);
      addVertex(positions, normals, uvs, px, py, pz, px/len, py/len, pz/len, s/segs, r/rings);
    }
  }

  // Build indices
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r*(segs+1)+s, b = a+1, c = a+(segs+1), d = c+1;
      addQuad(indices, a, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ─── Eye Socket ───────────────────────────────────────────────────────────────

export function generateEyeSocket(params = {}) {
  const { size=0.12, depth=0.08, segments=16, side='left' } = params;
  const positions=[], normals=[], uvs=[], indices=[];
  const cx = side==='left' ? -0.28 : 0.28;
  const cy = 0.15, cz = 0.85;

  // Eye rim
  for (let i = 0; i <= segments; i++) {
    const a = (i/segments)*Math.PI*2;
    const x = cx + Math.cos(a)*size*(1 + Math.abs(Math.cos(a))*0.2);
    const y = cy + Math.sin(a)*size*0.7;
    const z = cz - Math.abs(Math.sin(a))*depth*0.5;
    addVertex(positions, normals, uvs, x, y, z, 0, 0, 1, i/segments, 0.5);
    addVertex(positions, normals, uvs, cx + Math.cos(a)*size*0.5, cy + Math.sin(a)*size*0.35, cz - depth, 0, 0, 1, i/segments, 1);
  }

  for (let i = 0; i < segments; i++) {
    const a = i*2, b = a+1, c = a+2, d = a+3;
    addQuad(indices, a, c, d, b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ─── Nose ─────────────────────────────────────────────────────────────────────

export function generateNose(params = {}) {
  const { length=0.22, width=0.12, bridge=0.08, tipSize=0.06, nostrilFlare=0.04 } = params;
  const positions=[], normals=[], uvs=[], indices=[];

  const pts = [
    [0, 0.15, 0.75],           // bridge top
    [0, 0.08, 0.80+bridge],    // bridge mid
    [-width/2, 0, 0.85],        // left wing
    [width/2,  0, 0.85],        // right wing
    [-nostrilFlare, -length*0.3, 0.88],  // left nostril
    [nostrilFlare,  -length*0.3, 0.88],  // right nostril
    [0, -length*0.5, 0.90+tipSize],      // tip
  ];

  pts.forEach(([x,y,z], i) => addVertex(positions, normals, uvs, x, y, z, 0, 0, 1, i/pts.length, 0.5));
  indices.push(0,1,2, 0,1,3, 1,2,4, 1,3,5, 2,4,6, 3,5,6, 4,5,6);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ─── Lips ─────────────────────────────────────────────────────────────────────

export function generateLips(params = {}) {
  const { width=0.38, thickness=0.08, cupDepth=0.04, segments=12 } = params;
  const positions=[], normals=[], uvs=[], indices=[];

  // Upper lip
  for (let i = 0; i <= segments; i++) {
    const t = i/segments;
    const x = (t-0.5)*width;
    const cupY = t > 0.3 && t < 0.7 ? -cupDepth * Math.sin((t-0.3)/0.4*Math.PI) : 0;
    const y = -0.12 + cupY;
    const z = 0.88 + Math.sin(t*Math.PI)*0.02;
    addVertex(positions, normals, uvs, x, y, z, 0, 0, 1, t, 0.3);
    addVertex(positions, normals, uvs, x, y-thickness*0.4, z+0.01, 0, 0, 1, t, 0.5);
  }

  // Lower lip
  for (let i = 0; i <= segments; i++) {
    const t = i/segments;
    const x = (t-0.5)*width*0.95;
    const y = -0.12 - thickness*0.6 - Math.sin(t*Math.PI)*thickness*0.3;
    const z = 0.88 + Math.sin(t*Math.PI)*0.03;
    addVertex(positions, normals, uvs, x, y, z, 0, 0, 1, t, 0.5);
    addVertex(positions, normals, uvs, x, y-thickness*0.3, z-0.01, 0, 0, 1, t, 0.7);
  }

  for (let i = 0; i < segments*2; i++) addQuad(indices, i*2, i*2+1, i*2+3, i*2+2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ─── Ear ──────────────────────────────────────────────────────────────────────

export function generateEar(params = {}) {
  const { size=0.18, protrusion=0.06, side='left', segments=12 } = params;
  const cx = side==='left' ? -0.9 : 0.9;
  const positions=[], normals=[], uvs=[], indices=[];

  for (let i = 0; i <= segments; i++) {
    const t = i/segments;
    const a = t*Math.PI*2;
    // Ear is oval with helix notch
    const rx = size*0.4;
    const ry = size;
    const helixNotch = (t > 0.1 && t < 0.35) ? 0.15 : 0;
    const x = cx + Math.cos(a)*(rx - helixNotch*rx) * (side==='left'?-1:1);
    const y = 0.05 + Math.sin(a)*ry;
    const z = protrusion * Math.abs(Math.sin(a*0.5));
    addVertex(positions, normals, uvs, x, y, z, side==='left'?-1:1, 0, 0, t, 0.5);
    addVertex(positions, normals, uvs, x*(1-0.15), y*(1-0.1), z*0.3, side==='left'?-1:1, 0, 0, t, 1);
  }

  for (let i = 0; i < segments; i++) addQuad(indices, i*2, i*2+1, i*2+3, i*2+2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ─── Full Face Assembly ───────────────────────────────────────────────────────

export function createFaceMesh(params = {}) {
  const head   = generateHeadGeometry(params);
  const noseG  = generateNose(params);
  const lipsG  = generateLips(params);
  const lEar   = generateEar({ ...params, side: 'left' });
  const rEar   = generateEar({ ...params, side: 'right' });

  // Merge all geometries
  const geos = [head, noseG, lipsG, lEar, rEar];
  let totalV = 0;
  const allPos=[], allNorm=[], allUV=[], allIdx=[];

  geos.forEach(geo => {
    const off = totalV;
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const idx = geo.index;
    for (let i=0;i<pos.count;i++) {
      allPos.push(pos.getX(i),pos.getY(i),pos.getZ(i));
      allNorm.push(norm.getX(i),norm.getY(i),norm.getZ(i));
      allUV.push(uv.getX(i),uv.getY(i));
    }
    if (idx) Array.from(idx.array).forEach(i => allIdx.push(i+off));
    totalV += pos.count;
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3));
  merged.setAttribute('normal',   new THREE.Float32BufferAttribute(allNorm, 3));
  merged.setAttribute('uv',       new THREE.Float32BufferAttribute(allUV, 2));
  merged.setIndex(allIdx);
  merged.computeVertexNormals();

  const mat = new THREE.MeshPhysicalMaterial({ color: 0xf4a261, roughness: 0.7, metalness: 0 });
  const mesh = new THREE.Mesh(merged, mat);
  mesh.name = 'Face';
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export const FACE_PRESETS = {
  neutral:   { headWidth:1.0, headHeight:1.2, jawWidth:0.85, chinHeight:0.15, cheekbone:0.6 },
  masculine: { headWidth:1.1, headHeight:1.15, jawWidth:1.0, chinHeight:0.18, cheekbone:0.55 },
  feminine:  { headWidth:0.92, headHeight:1.25, jawWidth:0.75, chinHeight:0.12, cheekbone:0.68 },
  child:     { headWidth:0.88, headHeight:1.0, jawWidth:0.70, chinHeight:0.10, cheekbone:0.72 },
  elder:     { headWidth:0.98, headHeight:1.18, jawWidth:0.82, chinHeight:0.16, cheekbone:0.52 },
  anime:     { headWidth:0.90, headHeight:1.35, jawWidth:0.65, chinHeight:0.08, cheekbone:0.80 },
};

export default { createFaceMesh, generateHeadGeometry, generateEyeSocket, generateNose, generateLips, generateEar, FACE_PRESETS };
