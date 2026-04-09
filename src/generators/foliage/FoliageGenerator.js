// FoliageGenerator.js — Procedural Foliage Geometry Generator
// SPX Mesh Editor | StreamPireX

import * as THREE from 'three';

function seededRng(seed) {
  let s = seed;
  return () => { s=(s*9301+49297)%233280; return s/233280; };
}

// ─── Trunk ────────────────────────────────────────────────────────────────────

export function generateTrunk(params = {}) {
  const { height=2, radius=0.18, segments=8, radialSegs=8, taper=0.6, bend=0.05, seed=42, rootFlare=0.25 } = params;
  const rng = seededRng(seed);
  const positions=[], normals=[], uvs=[], indices=[];

  const rings = segments + 1;
  for (let r = 0; r < rings; r++) {
    const t = r / (rings-1);
    const y = t * height;
    // Taper radius
    const flare = r === 0 ? 1 + rootFlare : 1;
    const rad = radius * lerp(flare, taper, t);
    // Bend noise
    const bendX = Math.sin(t*Math.PI) * bend * (rng()-0.5);
    const bendZ = Math.sin(t*Math.PI*1.3) * bend * (rng()-0.5);

    for (let s = 0; s <= radialSegs; s++) {
      const a = (s/radialSegs)*Math.PI*2;
      const x = Math.cos(a)*rad + bendX*y;
      const z = Math.sin(a)*rad + bendZ*y;
      const len = Math.sqrt(x*x+z*z);
      positions.push(x, y, z);
      normals.push(x/len, 0, z/len);
      uvs.push(s/radialSegs, t);
    }
  }

  for (let r = 0; r < rings-1; r++) {
    for (let s = 0; s < radialSegs; s++) {
      const a=r*(radialSegs+1)+s, b=a+1, c=a+(radialSegs+1), d=c+1;
      indices.push(a,b,d,a,d,c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function lerp(a,b,t){return a+(b-a)*t;}

// ─── Branch System ────────────────────────────────────────────────────────────

export function generateBranches(params = {}) {
  const { count=8, length=1.2, angle=45, radius=0.06, taper=0.3, spread=0.8, trunkHeight=2, levels=2, seed=42 } = params;
  const rng = seededRng(seed);
  const geos = [];

  function makeBranch(startPos, dir, len, rad, level) {
    if (level <= 0 || len < 0.05) return;
    const segs = Math.max(4, Math.floor(len*6));
    const positions=[], normals=[], uvs=[], indices=[];

    for (let r = 0; r <= segs; r++) {
      const t = r/segs;
      const y = t*len;
      const currentRad = rad * lerp(1, taper, t);
      const wobble = Math.sin(t*Math.PI*2)*0.02*rng();

      for (let s = 0; s <= 6; s++) {
        const a = (s/6)*Math.PI*2;
        const x = Math.cos(a)*currentRad + wobble;
        const z = Math.sin(a)*currentRad;
        positions.push(startPos.x+x, startPos.y+y, startPos.z+z);
        normals.push(x/currentRad, 0, z/currentRad);
        uvs.push(s/6, t);
      }
    }
    for (let r=0;r<segs;r++) for (let s=0;s<6;s++) {
      const a=r*7+s,b=a+1,c=a+7,d=c+1;
      indices.push(a,b,d,a,d,c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geos.push(geo);

    // Sub-branches
    if (level > 1) {
      const subCount = 2 + Math.floor(rng()*3);
      for (let i=0;i<subCount;i++) {
        const t = 0.5 + rng()*0.4;
        const subPos = new THREE.Vector3(startPos.x, startPos.y+t*len, startPos.z);
        const subDir = dir.clone().applyAxisAngle(new THREE.Vector3(rng()-0.5,0,rng()-0.5).normalize(), (angle+rng()*20)*Math.PI/180);
        makeBranch(subPos, subDir, len*0.6, rad*0.5, level-1);
      }
    }
  }

  for (let i=0;i<count;i++) {
    const branchHeight = trunkHeight * (0.3 + rng()*0.6);
    const a = (i/count)*Math.PI*2 + rng()*0.5;
    const dir = new THREE.Vector3(Math.sin(angle*Math.PI/180)*Math.cos(a), Math.cos(angle*Math.PI/180), Math.sin(angle*Math.PI/180)*Math.sin(a)).normalize();
    makeBranch(new THREE.Vector3(0, branchHeight, 0), dir, length*(0.7+rng()*0.6), radius, levels);
  }

  return geos;
}

// ─── Leaf Cluster ─────────────────────────────────────────────────────────────

export function generateLeafCluster(params = {}) {
  const { radius=1.8, density=0.85, leafSize=0.18, leafCount=200, seed=42, color=0x3a7d44 } = params;
  const rng = seededRng(seed);
  const positions=[], normals=[], uvs=[], indices=[];
  const count = Math.floor(leafCount * density);

  for (let i=0;i<count;i++) {
    const phi = Math.acos(2*rng()-1);
    const theta = rng()*Math.PI*2;
    const r = radius*(0.5+rng()*0.5);
    const cx = r*Math.sin(phi)*Math.cos(theta);
    const cy = r*Math.cos(phi)*0.7 + radius*0.2;
    const cz = r*Math.sin(phi)*Math.sin(theta);

    const lx = (rng()-0.5)*leafSize*2;
    const ly = (rng()-0.5)*leafSize;
    const nx = 0, ny = 1, nz = 0;
    const rot = rng()*Math.PI*2;
    const cos = Math.cos(rot), sin = Math.sin(rot);

    const base = positions.length/3;
    [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([u,v]) => {
      const lx2 = u*leafSize*0.5*cos - v*leafSize*0.3*sin;
      const lz2 = u*leafSize*0.5*sin + v*leafSize*0.3*cos;
      positions.push(cx+lx2, cy+v*leafSize*0.3*0.3, cz+lz2);
      normals.push(0,1,0);
      uvs.push((u+1)/2,(v+1)/2);
    });
    indices.push(base,base+1,base+2, base,base+2,base+3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('normal',  new THREE.Float32BufferAttribute(normals,3));
  geo.setAttribute('uv',      new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(indices);
  return geo;
}

// ─── Full Tree ────────────────────────────────────────────────────────────────

export function createTree(params = {}) {
  const { trunkColor=0x5c3d1e, leafColor=0x3a7d44, seed=42, ...rest } = params;
  const group = new THREE.Group();
  group.name = params.treeType || 'Tree';

  // Trunk
  const trunkGeo = generateTrunk({ ...rest, seed });
  const trunkMat = new THREE.MeshPhysicalMaterial({ color: trunkColor, roughness: 0.9, metalness: 0 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = trunk.receiveShadow = true;
  group.add(trunk);

  // Branches
  const branchGeos = generateBranches({ ...rest, seed: seed+1 });
  const branchMat = new THREE.MeshPhysicalMaterial({ color: trunkColor, roughness: 0.9 });
  branchGeos.forEach(geo => {
    const m = new THREE.Mesh(geo, branchMat);
    m.castShadow = true;
    group.add(m);
  });

  // Leaves
  if ((params.canopyDensity ?? 0.85) > 0) {
    const leafGeo = generateLeafCluster({ ...rest, seed: seed+2, color: leafColor });
    const leafMat = new THREE.MeshPhysicalMaterial({ color: leafColor, roughness: 0.8, side: THREE.DoubleSide });
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.y = (rest.trunkHeight ?? 2) * 0.7;
    leaves.castShadow = leaves.receiveShadow = true;
    group.add(leaves);
  }

  return group;
}

// ─── Bush ─────────────────────────────────────────────────────────────────────

export function createBush(params = {}) {
  const { leafColor=0x2d6a2d, size=0.8, density=0.7, seed=42 } = params;
  const geo = generateLeafCluster({ radius: size, density, leafSize: 0.12, leafCount: 80, seed, color: leafColor });
  const mat = new THREE.MeshPhysicalMaterial({ color: leafColor, roughness: 0.8, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'Bush';
  return mesh;
}

// ─── Grass Blade ──────────────────────────────────────────────────────────────

export function createGrass(params = {}) {
  const { count=50, spread=2, height=0.3, color=0x4a7c3f, seed=42 } = params;
  const rng = seededRng(seed);
  const group = new THREE.Group();
  group.name = 'Grass';

  for (let i=0;i<count;i++) {
    const x = (rng()-0.5)*spread*2;
    const z = (rng()-0.5)*spread*2;
    const h = height*(0.7+rng()*0.6);
    const lean = (rng()-0.5)*0.3;

    const positions=[0,0,0, lean*0.3,h*0.4,0, lean,h,0];
    const indices=[0,1,2];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.8, side: THREE.DoubleSide });
    const blade = new THREE.Mesh(geo, mat);
    blade.position.set(x, 0, z);
    blade.rotation.y = rng()*Math.PI*2;
    group.add(blade);
  }
  return group;
}

export const TREE_PRESETS = {
  oak:    { trunkHeight:2, trunkRadius:0.18, branchCount:8, branchLength:1.2, branchAngle:45, canopyRadius:1.8, canopyDensity:0.85 },
  pine:   { trunkHeight:4, trunkRadius:0.14, branchCount:12, branchLength:0.8, branchAngle:30, canopyRadius:0.8, canopyDensity:0.95 },
  palm:   { trunkHeight:5, trunkRadius:0.12, branchCount:8, branchLength:2.0, branchAngle:70, canopyRadius:2.2, canopyDensity:0.60 },
  willow: { trunkHeight:3, trunkRadius:0.20, branchCount:10, branchLength:2.5, branchAngle:60, canopyRadius:2.5, canopyDensity:0.70 },
  dead:   { trunkHeight:3.5, trunkRadius:0.22, branchCount:6, branchLength:1.0, branchAngle:50, canopyRadius:1.0, canopyDensity:0.0 },
};

export default { createTree, createBush, createGrass, generateTrunk, generateBranches, generateLeafCluster, TREE_PRESETS };
