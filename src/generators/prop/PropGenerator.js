// PropGenerator.js — Procedural Prop Geometry Generator
// SPX Mesh Editor | StreamPireX

import * as THREE from 'three';

function lerp(a,b,t){return a+(b-a)*t;}
function seededRng(seed){let s=seed;return ()=>{s=(s*9301+49297)%233280;return s/233280;};}

// ─── Generic Box Prop ─────────────────────────────────────────────────────────

export function generateBoxProp(params = {}) {
  const { width=1, height=1, depth=1, bevelSize=0.02, subdivision=1 } = params;
  const geo = new THREE.BoxGeometry(width, height, depth, subdivision, subdivision, subdivision);
  return geo;
}

// ─── Chair ────────────────────────────────────────────────────────────────────

export function generateChair(params = {}) {
  const { seatHeight=0.45, seatWidth=0.45, seatDepth=0.45, backHeight=0.5, legRadius=0.025, style='modern' } = params;
  const group = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: params.color ?? 0xa0785a, roughness: 0.8 });

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(seatWidth, 0.05, seatDepth), mat);
  seat.position.y = seatHeight;
  group.add(seat);

  // Back
  const back = new THREE.Mesh(new THREE.BoxGeometry(seatWidth, backHeight, 0.05), mat);
  back.position.set(0, seatHeight + backHeight/2, -seatDepth/2);
  group.add(back);

  // Legs
  const legPositions = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z]) => [x*seatWidth/2*0.85, 0, z*seatDepth/2*0.85]);
  legPositions.forEach(([x,y,z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(legRadius, legRadius*1.2, seatHeight, 6), mat);
    leg.position.set(x, seatHeight/2, z);
    group.add(leg);
  });

  return group;
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function generateTable(params = {}) {
  const { width=1.2, depth=0.8, height=0.75, thickness=0.05, legRadius=0.04, style='modern' } = params;
  const group = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: params.color ?? 0x8b6914, roughness: 0.7 });

  // Top
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), mat);
  top.position.y = height;
  group.add(top);

  // Legs
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([x,z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(legRadius, legRadius*1.3, height, 8), mat);
    leg.position.set(x*(width/2-0.08), height/2, z*(depth/2-0.08));
    group.add(leg);
  });

  return group;
}

// ─── Barrel ───────────────────────────────────────────────────────────────────

export function generateBarrel(params = {}) {
  const { radius=0.3, height=0.5, hoopCount=3, segments=16 } = params;
  const group = new THREE.Group();
  const woodMat = new THREE.MeshPhysicalMaterial({ color: params.color ?? 0x8b6914, roughness: 0.9 });
  const metalMat = new THREE.MeshPhysicalMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.8 });

  // Barrel body (bulged cylinder)
  const positions=[], normals=[], uvs=[], indices=[];
  const rings = 12;
  for (let r=0;r<=rings;r++) {
    const t=r/rings;
    const y=t*height-height/2;
    const bulgeFactor = 1 + Math.sin(t*Math.PI)*0.12;
    const rad = radius*bulgeFactor;
    for (let s=0;s<=segments;s++) {
      const a=(s/segments)*Math.PI*2;
      const x=Math.cos(a)*rad, z=Math.sin(a)*rad;
      positions.push(x,y,z); normals.push(x/rad,0,z/rad); uvs.push(s/segments,t);
    }
  }
  for (let r=0;r<rings;r++) for (let s=0;s<segments;s++) {
    const a=r*(segments+1)+s,b=a+1,c=a+(segments+1),d=c+1;
    indices.push(a,b,d,a,d,c);
  }
  const bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  bodyGeo.setAttribute('normal',  new THREE.Float32BufferAttribute(normals,3));
  bodyGeo.setAttribute('uv',      new THREE.Float32BufferAttribute(uvs,2));
  bodyGeo.setIndex(indices);
  bodyGeo.computeVertexNormals();
  group.add(new THREE.Mesh(bodyGeo, woodMat));

  // Top/bottom caps
  [height/2, -height/2].forEach(y => {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(radius*0.95, segments), woodMat);
    cap.rotation.x = -Math.PI/2; cap.position.y = y;
    group.add(cap);
  });

  // Metal hoops
  for (let h=0;h<hoopCount;h++) {
    const y = lerp(-height/2+0.05, height/2-0.05, h/(hoopCount-1));
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(radius*1.05, 0.015, 6, segments), metalMat);
    hoop.rotation.x = Math.PI/2; hoop.position.y = y;
    group.add(hoop);
  }

  return group;
}

// ─── Sword ────────────────────────────────────────────────────────────────────

export function generateSword(params = {}) {
  const { bladeLength=1.2, bladeWidth=0.06, guardWidth=0.22, handleLength=0.22, style='medieval' } = params;
  const group = new THREE.Group();
  const bladeMat = new THREE.MeshPhysicalMaterial({ color: 0xccccdd, roughness: 0.2, metalness: 0.9 });
  const handleMat = new THREE.MeshPhysicalMaterial({ color: 0x8b4513, roughness: 0.8 });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.8 });

  // Blade
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(-bladeWidth/2, 0.1);
  bladeShape.lineTo(-bladeWidth/3, bladeLength);
  bladeShape.lineTo(0, bladeLength+0.05);
  bladeShape.lineTo(bladeWidth/3, bladeLength);
  bladeShape.lineTo(bladeWidth/2, 0.1);
  bladeShape.lineTo(0, 0);
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.01, bevelEnabled: false });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.y = handleLength + 0.03;
  group.add(blade);

  // Guard
  const guard = new THREE.Mesh(new THREE.BoxGeometry(guardWidth, 0.04, 0.04), goldMat);
  guard.position.y = handleLength;
  group.add(guard);

  // Handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, handleLength, 8), handleMat);
  handle.position.y = handleLength/2;
  group.add(handle);

  // Pommel
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), goldMat);
  pommel.position.y = 0;
  group.add(pommel);

  return group;
}

// ─── Crate ────────────────────────────────────────────────────────────────────

export function generateCrate(params = {}) {
  const { size=0.6, planks=true, metalCorners=true } = params;
  const group = new THREE.Group();
  const woodMat = new THREE.MeshPhysicalMaterial({ color: params.color??0x8b6914, roughness:0.9 });
  const metalMat = new THREE.MeshPhysicalMaterial({ color:0x555555, roughness:0.4, metalness:0.7 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(size,size,size), woodMat);
  group.add(box);

  if (metalCorners) {
    const cornerSize = size*0.12;
    const s2 = size/2;
    [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].forEach(([x,y,z]) => {
      const corner = new THREE.Mesh(new THREE.BoxGeometry(cornerSize,cornerSize,cornerSize), metalMat);
      corner.position.set(x*s2,y*s2,z*s2);
      group.add(corner);
    });
  }

  return group;
}

// ─── Main factory ─────────────────────────────────────────────────────────────

export function createProp(params = {}) {
  const { propType='Chair', category='Furniture' } = params;

  const generators = {
    Chair: generateChair, Table: generateTable, Barrel: generateBarrel,
    Sword: generateSword, Crate: generateCrate,
  };

  const fn = generators[propType];
  if (fn) {
    const result = fn(params);
    if (result.isGroup) { result.name = propType; return result; }
    const mat = new THREE.MeshPhysicalMaterial({ color: params.color??0x888888, roughness: params.roughness??0.5, metalness: params.metalness??0 });
    const mesh = new THREE.Mesh(result, mat);
    mesh.name = propType;
    return mesh;
  }

  // Fallback — generic box prop
  const geo = generateBoxProp(params);
  const mat = new THREE.MeshPhysicalMaterial({ color: params.color??0x888888, roughness: params.roughness??0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = propType;
  return mesh;
}

export const PROP_CATEGORIES = {
  Furniture: ['Chair','Table','Sofa','Bed','Desk','Bookshelf','Cabinet','Lamp'],
  Weapons:   ['Sword','Axe','Spear','Bow','Shield','Dagger','Mace','Staff'],
  SciFi:     ['Console','Crate','Barrel','Generator','Antenna','Pod','Turret'],
  Fantasy:   ['Chest','Torch','Cauldron','Crystal','Magic Staff','Amulet','Potion'],
};

export default { createProp, generateChair, generateTable, generateBarrel, generateSword, generateCrate, PROP_CATEGORIES };
