// CreatureGenerator.js — Procedural Creature Geometry Generator
// SPX Mesh Editor | StreamPireX

import * as THREE from 'three';

function lerp(a,b,t){return a+(b-a)*t;}
function seededRng(seed){let s=seed;return ()=>{s=(s*9301+49297)%233280;return s/233280;};}

// ─── Body Parts ───────────────────────────────────────────────────────────────

export function generateBody(params = {}) {
  const { bodyLength=1, bodyWidth=0.6, bodyHeight=0.5, segments=8 } = params;
  const geo = new THREE.SphereGeometry(1, segments*2, segments);
  geo.scale(bodyWidth, bodyHeight, bodyLength/2);
  return geo;
}

export function generateHead(params = {}) {
  const { headSize=1, segments=8 } = params;
  const geo = new THREE.SphereGeometry(headSize*0.35, segments*2, segments);
  return geo;
}

export function generateLeg(params = {}) {
  const { length=0.8, radius=0.06, segments=6 } = params;
  const group = new THREE.Group();

  // Upper leg
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(radius*1.2, radius, length*0.5, segments), new THREE.MeshPhysicalMaterial());
  upper.position.y = -length*0.25;
  group.add(upper);

  // Lower leg
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius*0.7, length*0.5, segments), new THREE.MeshPhysicalMaterial());
  lower.position.y = -length*0.75;
  group.add(lower);

  // Foot
  const foot = new THREE.Mesh(new THREE.BoxGeometry(radius*3, radius*0.5, radius*4), new THREE.MeshPhysicalMaterial());
  foot.position.set(radius, -length, radius);
  group.add(foot);

  return group;
}

export function generateWing(params = {}) {
  const { span=2, segments=8 } = params;
  if (span <= 0) return null;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(span*0.3, span*0.4, span, span*0.1);
  shape.quadraticCurveTo(span*0.7, -span*0.1, span*0.4, -span*0.3);
  shape.quadraticCurveTo(span*0.2, -span*0.2, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, segments*2);
  return geo;
}

export function generateTail(params = {}) {
  const { length=1, radius=0.08, segments=12, taper=0.1 } = params;
  if (length <= 0) return null;
  const positions=[], normals=[], uvs=[], indices=[];
  const radialSegs = 6;

  for (let r=0;r<=segments;r++) {
    const t=r/segments;
    const y=-t*length;
    const rad=radius*lerp(1,taper,t);
    const bend=Math.sin(t*Math.PI)*0.2;
    for (let s=0;s<=radialSegs;s++) {
      const a=(s/radialSegs)*Math.PI*2;
      const x=Math.cos(a)*rad+bend;
      const z=Math.sin(a)*rad;
      const len=Math.sqrt(x*x+z*z)||1;
      positions.push(x,y,z);
      normals.push(x/len,0,z/len);
      uvs.push(s/radialSegs,t);
    }
  }
  for (let r=0;r<segments;r++) for (let s=0;s<radialSegs;s++) {
    const a=r*(radialSegs+1)+s,b=a+1,c=a+(radialSegs+1),d=c+1;
    indices.push(a,b,d,a,d,c);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('normal',  new THREE.Float32BufferAttribute(normals,3));
  geo.setAttribute('uv',      new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function generateHorn(params = {}) {
  const { length=0.3, baseRadius=0.04, curve=0.1, segments=6 } = params;
  const geo = new THREE.ConeGeometry(baseRadius, length, segments);
  geo.rotateX(-curve);
  return geo;
}

export function generateSpines(params = {}) {
  const { count=5, length=0.2, baseRadius=0.02, spacing=0.15 } = params;
  const group = new THREE.Group();
  for (let i=0;i<count;i++) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(baseRadius*(1-i/count*0.5), length, 4), new THREE.MeshPhysicalMaterial());
    spine.position.set(0, 0, -i*spacing);
    spine.rotation.x = 0.3;
    group.add(spine);
  }
  return group;
}

// ─── Full Creature Assembly ───────────────────────────────────────────────────

export function createCreature(params = {}) {
  const {
    creatureType='Dragon', bodyType='Quadruped',
    size=1, headSize=1, bodyLength=1, bodyWidth=0.6, bodyHeight=0.5,
    neckLength=0.5, legLength=0.8, legCount=4, wingSpan=0,
    tailLength=1, hornCount=2, hornLength=0.3, spineCount=0,
    colors={ primary:'#2d5a1b', secondary:'#1a3a0a', eye:'#ff4400' },
    seed=42,
  } = params;

  const rng = seededRng(seed);
  const group = new THREE.Group();
  group.name = creatureType;

  const primaryMat  = new THREE.MeshPhysicalMaterial({ color: colors.primary,   roughness: 0.7 });
  const secondaryMat = new THREE.MeshPhysicalMaterial({ color: colors.secondary, roughness: 0.8 });
  const eyeMat      = new THREE.MeshPhysicalMaterial({ color: colors.eye,       emissive: colors.eye, emissiveIntensity: 0.3, roughness: 0.1 });

  // Body
  const bodyGeo = generateBody({ bodyLength: bodyLength*size, bodyWidth: bodyWidth*size, bodyHeight: bodyHeight*size });
  const body = new THREE.Mesh(bodyGeo, primaryMat);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // Neck + Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12*size, 0.18*size, neckLength*size, 8), primaryMat);
  neck.position.set(0, bodyHeight*size*0.3, bodyLength*size*0.4);
  neck.rotation.x = -0.4;
  group.add(neck);

  const headGeo = generateHead({ headSize: headSize*size });
  const head = new THREE.Mesh(headGeo, primaryMat);
  head.position.set(0, bodyHeight*size*0.3 + neckLength*size*0.8, bodyLength*size*0.5 + neckLength*size*0.4);
  head.castShadow = true;
  group.add(head);

  // Eyes
  [-1,1].forEach(side => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05*size, 8, 6), eyeMat);
    eye.position.set(side*0.12*size*headSize, bodyHeight*size*0.4 + neckLength*size*0.85, bodyLength*size*0.5 + neckLength*size*0.5 + 0.25*size);
    group.add(eye);
  });

  // Legs
  if (legCount > 0) {
    const legPositions = [];
    for (let i=0;i<legCount;i++) {
      const side = i%2===0 ? -1 : 1;
      const fore = i<legCount/2 ? 1 : -1;
      legPositions.push([side*(bodyWidth*size*0.55), -bodyHeight*size*0.4, fore*(bodyLength*size*0.3)]);
    }
    legPositions.forEach(([x,y,z]) => {
      const legGroup = generateLeg({ length: legLength*size, radius: 0.06*size });
      legGroup.position.set(x, y, z);
      legGroup.children.forEach(c => c.material = primaryMat);
      group.add(legGroup);
    });
  }

  // Wings
  if (wingSpan > 0) {
    [-1,1].forEach(side => {
      const wingGeo = generateWing({ span: wingSpan*size });
      if (!wingGeo) return;
      const wing = new THREE.Mesh(wingGeo, secondaryMat);
      wing.position.set(side*bodyWidth*size*0.5, bodyHeight*size*0.2, 0);
      wing.rotation.set(0, side*0.3, side*0.4);
      wing.castShadow = true;
      group.add(wing);
    });
  }

  // Tail
  if (tailLength > 0) {
    const tailGeo = generateTail({ length: tailLength*size, radius: 0.08*size });
    if (tailGeo) {
      const tail = new THREE.Mesh(tailGeo, primaryMat);
      tail.position.set(0, bodyHeight*size*0.1, -bodyLength*size*0.5);
      tail.castShadow = true;
      group.add(tail);
    }
  }

  // Horns
  for (let i=0;i<hornCount;i++) {
    const side = i%2===0 ? -1 : 1;
    const hornGeo = generateHorn({ length: hornLength*size, baseRadius: 0.04*size });
    const horn = new THREE.Mesh(hornGeo, secondaryMat);
    horn.position.set(side*(0.1+i*0.05)*size, bodyHeight*size*0.5 + neckLength*size*0.9, bodyLength*size*0.5 + neckLength*size*0.45);
    horn.rotation.z = side*0.3;
    group.add(horn);
  }

  // Spines
  if (spineCount > 0) {
    const spineGroup = generateSpines({ count: spineCount, length: 0.15*size, spacing: bodyLength*size/spineCount });
    spineGroup.position.set(0, bodyHeight*size*0.5, bodyLength*size*0.3);
    spineGroup.children.forEach(c => c.material = secondaryMat);
    group.add(spineGroup);
  }

  group.scale.setScalar(size);
  return group;
}

export const CREATURE_PRESETS = {
  dragon:  { creatureType:'Dragon', bodyType:'Quadruped', size:2, wingSpan:3, hornCount:2, tailLength:2, spineCount:8 },
  wolf:    { creatureType:'Wolf',   bodyType:'Quadruped', size:0.8, wingSpan:0, hornCount:0, tailLength:0.8, spineCount:0 },
  phoenix: { creatureType:'Phoenix',bodyType:'Avian',     size:1.5, wingSpan:3, hornCount:0, tailLength:1.5, spineCount:0 },
  demon:   { creatureType:'Demon',  bodyType:'Biped',     size:1.8, wingSpan:2, hornCount:4, tailLength:0.6, spineCount:0 },
};

export default { createCreature, generateBody, generateHead, generateLeg, generateWing, generateTail, generateHorn, CREATURE_PRESETS };
