// ProceduralMesh.js — UPGRADE: Extended Procedural Mesh Generators
// SPX Mesh Editor | StreamPireX

import * as THREE from 'three';

// ─── Basic Primitives ─────────────────────────────────────────────────────────

export function createBox(w=1, h=1, d=1, wSeg=1, hSeg=1, dSeg=1) {
  return new THREE.BoxGeometry(w, h, d, wSeg, hSeg, dSeg);
}
export function createSphere(r=1, w=32, h=16) {
  return new THREE.SphereGeometry(r, w, h);
}
export function createCylinder(rTop=1, rBot=1, h=2, seg=32, open=false) {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
}
export function createCone(r=1, h=2, seg=32) {
  return new THREE.ConeGeometry(r, h, seg);
}
export function createTorus(r=1, tube=0.4, rSeg=16, tSeg=100) {
  return new THREE.TorusGeometry(r, tube, rSeg, tSeg);
}
export function createPlane(w=1, h=1, wSeg=1, hSeg=1) {
  return new THREE.PlaneGeometry(w, h, wSeg, hSeg);
}

// ─── Advanced Primitives ──────────────────────────────────────────────────────

export function createTorusKnot(r=1, tube=0.4, tSeg=128, rSeg=16, p=2, q=3) {
  return new THREE.TorusKnotGeometry(r, tube, tSeg, rSeg, p, q);
}

export function createIcosphere(radius=1, detail=2) {
  return new THREE.IcosahedronGeometry(radius, detail);
}

export function createCapsule(r=0.5, length=1, capSeg=8, radSeg=16) {
  // Manual capsule: cylinder + two hemispheres
  const parts = [];
  const cyl = new THREE.CylinderGeometry(r, r, length, radSeg, 1, true);
  const topHemi = new THREE.SphereGeometry(r, radSeg, capSeg, 0, Math.PI*2, 0, Math.PI/2);
  const botHemi = new THREE.SphereGeometry(r, radSeg, capSeg, 0, Math.PI*2, Math.PI/2, Math.PI/2);

  // Offset hemisphere positions
  topHemi.translate(0,  length/2, 0);
  botHemi.translate(0, -length/2, 0);

  return mergeGeometries([cyl, topHemi, botHemi]);
}

export function createArrow(length=2, headLen=0.4, headRadius=0.2, shaftRadius=0.05) {
  const shaft = new THREE.CylinderGeometry(shaftRadius, shaftRadius, length-headLen, 8);
  shaft.translate(0, (length-headLen)/2, 0);
  const head = new THREE.ConeGeometry(headRadius, headLen, 8);
  head.translate(0, length - headLen/2, 0);
  return mergeGeometries([shaft, head]);
}

export function createStar(outerR=1, innerR=0.4, points=5, depth=0.2) {
  const shape = new THREE.Shape();
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const angle = i * step - Math.PI/2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
}

export function createSpring(coils=5, radius=0.5, tubeRadius=0.05, height=2, seg=256) {
  const points = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const angle = t * Math.PI * 2 * coils;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      t * height - height/2,
      Math.sin(angle) * radius,
    ));
  }
  const path = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(path, seg, tubeRadius, 8, false);
}

// ─── Terrain / Landscape ──────────────────────────────────────────────────────

export function createTerrain(width=10, depth=10, wSeg=64, dSeg=64, heightScale=2, seed=42) {
  const geo = new THREE.PlaneGeometry(width, depth, wSeg, dSeg);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  const rng = seededRandom(seed);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = fbmNoise(x * 0.3, z * 0.3, rng) * heightScale;
    pos.setY(i, h);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function createMountains(width=20, depth=20, peaks=5, height=4, seed=0) {
  const geo = createTerrain(width, depth, 128, 128, height, seed);
  return geo;
}

// ─── Organic Shapes ───────────────────────────────────────────────────────────

export function createBlob(radius=1, detail=3, noiseScale=0.5, noiseMag=0.3, seed=0) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  const rng = seededRandom(seed);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const noise = simpleNoise3(x*noiseScale, y*noiseScale, z*noiseScale) * noiseMag;
    const len = Math.sqrt(x*x + y*y + z*z) + noise;
    const scale = len / Math.sqrt(x*x + y*y + z*z);
    pos.setXYZ(i, x*scale, y*scale, z*scale);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function createRock(seed=42) {
  return createBlob(1, 2, 0.8, 0.4, seed);
}

export function createCloud(layers=5, seed=0) {
  const geos = [];
  const rng = seededRandom(seed);
  for (let i = 0; i < layers; i++) {
    const r = 0.4 + rng() * 0.6;
    const g = new THREE.SphereGeometry(r, 8, 6);
    g.translate((rng()-0.5)*1.5, (rng()-0.5)*0.4, (rng()-0.5)*0.8);
    geos.push(g);
  }
  return mergeGeometries(geos);
}

// ─── Architectural ────────────────────────────────────────────────────────────

export function createWall(width=4, height=3, thickness=0.2, bricks=true) {
  const geo = new THREE.BoxGeometry(width, height, thickness, bricks?Math.round(width*2):1, bricks?Math.round(height*1.5):1, 1);
  if (bricks) {
    // Displace brick rows slightly for mortar effect
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const row = Math.round(y / 0.4);
      if (Math.abs(y - row * 0.4) < 0.02) pos.setZ(i, pos.getZ(i) * 0.98);
    }
    pos.needsUpdate = true;
  }
  return geo;
}

export function createStairs(steps=10, stepW=2, stepH=0.2, stepD=0.3) {
  const geos = [];
  for (let i = 0; i < steps; i++) {
    const g = new THREE.BoxGeometry(stepW, stepH, stepD);
    g.translate(0, i * stepH + stepH/2, i * stepD + stepD/2);
    geos.push(g);
  }
  return mergeGeometries(geos);
}

export function createPillar(radius=0.3, height=4, fluted=true, segments=16) {
  if (fluted) {
    // Fluted column — vary radius at different angles
    const shape = new THREE.Shape();
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = radius + Math.cos(angle * 8) * radius * 0.08;
      const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
      i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  }
  return createCylinder(radius, radius * 1.1, height, segments);
}

// ─── Nature ───────────────────────────────────────────────────────────────────

export function createTree(trunkHeight=2, trunkRadius=0.15, canopyRadius=1.2, canopyLayers=3, seed=0) {
  const geos = [];
  const rng = seededRandom(seed);

  // Trunk
  const trunk = createCylinder(trunkRadius*0.7, trunkRadius, trunkHeight, 8);
  trunk.translate(0, trunkHeight/2, 0);
  geos.push(trunk);

  // Canopy layers
  for (let i = 0; i < canopyLayers; i++) {
    const t = i / (canopyLayers - 1);
    const r = canopyRadius * (1 - t * 0.5) + rng() * 0.2;
    const h = canopyRadius * 0.8 + rng() * 0.4;
    const y = trunkHeight + i * (h * 0.4);
    const layer = new THREE.ConeGeometry(r, h, 7 + i);
    layer.translate(0, y + h/2, 0);
    geos.push(layer);
  }

  return mergeGeometries(geos);
}

export function createGrass(blades=20, width=0.05, height=0.8, spread=1, seed=0) {
  const geos = [];
  const rng = seededRandom(seed);
  for (let i = 0; i < blades; i++) {
    const bx = (rng()-0.5)*spread*2, bz = (rng()-0.5)*spread*2;
    const bh = height * (0.7 + rng()*0.6);
    const tilt = (rng()-0.5)*0.4;
    const g = new THREE.PlaneGeometry(width, bh);
    g.rotateY(rng()*Math.PI*2);
    g.translate(bx + tilt*bh*0.5, bh/2, bz);
    geos.push(g);
  }
  return mergeGeometries(geos);
}

// ─── Text / Logo ──────────────────────────────────────────────────────────────

export function createTextGeometry(text, font, options = {}) {
  if (!font || !window.THREE?.TextGeometry) return createBox(1, 0.3, 0.1);
  const { size=0.5, depth=0.1, bevelEnabled=true, bevelSize=0.02 } = options;
  return new window.THREE.TextGeometry(text, { font, size, depth, bevelEnabled, bevelSize, bevelThickness: 0.01 });
}

// ─── Merge Utility ────────────────────────────────────────────────────────────

export function mergeGeometries(geos) {
  let totalVerts = 0;
  geos.forEach(g => { totalVerts += g.attributes.position.count; });
  const positions = new Float32Array(totalVerts * 3);
  const indices = [];
  let offset = 0;
  geos.forEach(g => {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      positions[(offset+i)*3]   = pos.getX(i);
      positions[(offset+i)*3+1] = pos.getY(i);
      positions[(offset+i)*3+2] = pos.getZ(i);
    }
    if (g.index) Array.from(g.index.array).forEach(i => indices.push(i+offset));
    offset += pos.count;
  });
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (indices.length) merged.setIndex(indices);
  merged.computeVertexNormals();
  return merged;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function simpleNoise3(x, y, z) {
  return Math.sin(x*1.7+y*2.3)*Math.cos(y*1.1+z*3.7)*Math.sin(z*2.9+x*1.3);
}

function fbmNoise(x, z, rng, octaves=4) {
  let v=0, amp=0.5, freq=1;
  for (let i=0; i<octaves; i++) {
    v += simpleNoise3(x*freq+rng()*10, 0, z*freq+rng()*10)*amp;
    amp*=0.5; freq*=2;
  }
  return v;
}

export const PROCEDURAL_TYPES = {
  PRIMITIVES:    ['box','sphere','cylinder','cone','torus','plane','torusKnot','icosphere','capsule','arrow','star','spring'],
  TERRAIN:       ['terrain','mountains'],
  ORGANIC:       ['blob','rock','cloud'],
  ARCHITECTURAL: ['wall','stairs','pillar'],
  NATURE:        ['tree','grass'],
};

export default {
  createBox, createSphere, createCylinder, createCone, createTorus, createPlane,
  createTorusKnot, createIcosphere, createCapsule, createArrow, createStar, createSpring,
  createTerrain, createMountains, createBlob, createRock, createCloud,
  createWall, createStairs, createPillar,
  createTree, createGrass,
  mergeGeometries, PROCEDURAL_TYPES,
};

export function createPipe(radiusOuter=0.5, radiusInner=0.3, height=2, seg=32) {
  const outer = new THREE.CylinderGeometry(radiusOuter, radiusOuter, height, seg, 1, true);
  const inner = new THREE.CylinderGeometry(radiusInner, radiusInner, height, seg, 1, true);
  // Flip inner normals
  if (inner.index) { const idx = inner.index.array; for (let i=0; i<idx.length; i+=3) { const t=idx[i+1]; idx[i+1]=idx[i+2]; idx[i+2]=t; } inner.index.needsUpdate=true; }
  return mergeGeometries([outer, inner]);
}

export function createGear(outerR=1, innerR=0.6, teeth=12, toothH=0.2, depth=0.2) {
  const shape = new THREE.Shape();
  const step = (Math.PI*2) / teeth;
  for (let i=0; i<teeth; i++) {
    const a1=i*step, a2=a1+step*0.4, a3=a1+step*0.6, a4=a1+step;
    const fn=(a,r)=>({x:Math.cos(a)*r, y:Math.sin(a)*r});
    const p1=fn(a1,innerR), p2=fn(a2,outerR+toothH), p3=fn(a3,outerR+toothH), p4=fn(a4,innerR);
    i===0 ? shape.moveTo(p1.x,p1.y) : shape.lineTo(p1.x,p1.y);
    shape.lineTo(p2.x,p2.y); shape.lineTo(p3.x,p3.y); shape.lineTo(p4.x,p4.y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled:false });
}

export function buildProceduralMesh(type, params={}) {
  const map = { box:createBox, sphere:createSphere, cylinder:createCylinder, cone:createCone, torus:createTorus, plane:createPlane, torusKnot:createTorusKnot, icosphere:createIcosphere, capsule:createCapsule, arrow:createArrow, star:createStar, spring:createSpring, terrain:createTerrain, blob:createBlob, rock:createRock, cloud:createCloud, wall:createWall, stairs:createStairs, pillar:createPillar, tree:createTree, grass:createGrass, pipe:createPipe, gear:createGear };
  const fn = map[type];
  return fn ? fn(...Object.values(params)) : createBox();
}

export function createAssetLibrary() {
  return { meshes: new Map(), add(name, geo) { this.meshes.set(name, geo); }, get(name) { return this.meshes.get(name); }, list() { return Array.from(this.meshes.keys()); } };
}

export function createTourState() {
  return { step: 0, steps: [], addStep(label, fn) { this.steps.push({label,fn}); }, next() { if(this.step<this.steps.length) this.steps[this.step++]?.fn(); }, reset() { this.step=0; } };
}
