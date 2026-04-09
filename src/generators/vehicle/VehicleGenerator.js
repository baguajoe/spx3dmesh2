// VehicleGenerator.js — Procedural Vehicle Geometry Generator
// SPX Mesh Editor | StreamPireX

import * as THREE from 'three';

function lerp(a,b,t){return a+(b-a)*t;}

// ─── Wheel ────────────────────────────────────────────────────────────────────

export function generateWheel(params = {}) {
  const { radius=0.35, width=0.22, spokes=5, rimDetail=16 } = params;
  const group = new THREE.Group();

  const tireMat  = new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.9 });
  const rimMat   = new THREE.MeshPhysicalMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.8 });
  const hubMat   = new THREE.MeshPhysicalMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.7 });

  // Tire
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius*0.85, radius*0.18, 12, rimDetail), tireMat);
  tire.rotation.y = Math.PI/2;
  group.add(tire);

  // Rim
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius*0.75, radius*0.75, width*0.6, rimDetail), rimMat);
  rim.rotation.z = Math.PI/2;
  group.add(rim);

  // Spokes
  for (let i=0;i<spokes;i++) {
    const a = (i/spokes)*Math.PI*2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(width*0.5, radius*0.08, radius*0.6), rimMat);
    spoke.rotation.z = Math.PI/2;
    spoke.rotation.x = a;
    group.add(spoke);
  }

  // Hub cap
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius*0.15, radius*0.15, width*0.7, 8), hubMat);
  hub.rotation.z = Math.PI/2;
  group.add(hub);

  return group;
}

// ─── Car Body ─────────────────────────────────────────────────────────────────

export function generateCarBody(params = {}) {
  const {
    bodyLength=4.2, bodyWidth=1.8, bodyHeight=1.3,
    wheelbase=2.5, groundClearance=0.15, rakeAngle=15,
    roofHeight=0.6, roofStart=0.3, roofEnd=0.75,
    colors={ primary:'#c0392b', secondary:'#1a1a1a', glass:'#88ccff' },
    details=[],
  } = params;

  const group = new THREE.Group();
  const bodyMat  = new THREE.MeshPhysicalMaterial({ color: colors.primary,   roughness: params.roughness??0.15, metalness: params.metalness??0.85 });
  const trimMat  = new THREE.MeshPhysicalMaterial({ color: colors.secondary,  roughness: 0.5, metalness: 0.6 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: colors.glass,      roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.6 });
  const lightMat = new THREE.MeshPhysicalMaterial({ color: 0xffffcc,          emissive: 0xffffcc, emissiveIntensity: 0.5 });
  const brakeMat = new THREE.MeshPhysicalMaterial({ color: 0xff2200,          emissive: 0xff2200, emissiveIntensity: 0.3 });

  const hl = bodyLength/2, hw = bodyWidth/2, hh = bodyHeight/2;

  // Main body lower
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(bodyLength, bodyHeight*0.5, bodyWidth), bodyMat);
  lowerBody.position.y = groundClearance + bodyHeight*0.25;
  group.add(lowerBody);

  // Cabin roof section
  const cabinW = bodyWidth*0.88;
  const cabinL = bodyLength*(roofEnd-roofStart);
  const cabin  = new THREE.Mesh(new THREE.BoxGeometry(cabinL, roofHeight, cabinW), bodyMat);
  cabin.position.set(bodyLength*(roofStart+roofEnd)/2-hl, groundClearance+bodyHeight*0.5+roofHeight/2, 0);
  group.add(cabin);

  // Windshield
  const wsGeo = new THREE.PlaneGeometry(cabinW*0.9, roofHeight*1.1);
  const ws = new THREE.Mesh(wsGeo, glassMat);
  ws.position.set(bodyLength*roofStart-hl+0.05, groundClearance+bodyHeight*0.5+roofHeight*0.5, 0);
  ws.rotation.y = Math.PI/2; ws.rotation.z = (rakeAngle)*Math.PI/180;
  group.add(ws);

  // Rear window
  const rwGeo = new THREE.PlaneGeometry(cabinW*0.85, roofHeight*1.0);
  const rw = new THREE.Mesh(rwGeo, glassMat);
  rw.position.set(bodyLength*roofEnd-hl-0.05, groundClearance+bodyHeight*0.5+roofHeight*0.5, 0);
  rw.rotation.y = Math.PI/2; rw.rotation.z = -(rakeAngle*0.8)*Math.PI/180;
  group.add(rw);

  // Side windows
  [-1,1].forEach(side => {
    const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(cabinL*0.85, roofHeight*0.85), glassMat);
    sideWin.position.set(bodyLength*(roofStart+roofEnd)/2-hl, groundClearance+bodyHeight*0.5+roofHeight*0.5, side*cabinW/2);
    sideWin.rotation.y = side*Math.PI/2;
    group.add(sideWin);
  });

  // Headlights
  [-1,1].forEach(side => {
    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.25), lightMat);
    hl2.position.set(hl-0.04, groundClearance+bodyHeight*0.35, side*hw*0.6);
    group.add(hl2);
  });

  // Taillights
  [-1,1].forEach(side => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.3), brakeMat);
    tl.position.set(-hl+0.04, groundClearance+bodyHeight*0.35, side*hw*0.55);
    group.add(tl);
  });

  // Grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, bodyHeight*0.3, bodyWidth*0.6), trimMat);
  grille.position.set(hl-0.03, groundClearance+bodyHeight*0.2, 0);
  group.add(grille);

  // Wheels
  const wheelPositions = [
    [wheelbase/2, groundClearance, hw+0.05],
    [wheelbase/2, groundClearance, -hw-0.05],
    [-wheelbase/2, groundClearance, hw+0.05],
    [-wheelbase/2, groundClearance, -hw-0.05],
  ];

  const wheelParams = { radius: params.wheelSize??0.35, width: params.wheelWidth??0.22 };
  wheelPositions.forEach(([x,y,z]) => {
    const wheel = generateWheel(wheelParams);
    wheel.position.set(x, y, z);
    wheel.rotation.z = Math.PI/2;
    group.add(wheel);
  });

  // Optional spoiler
  if (details.includes('Spoiler')) {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, bodyWidth*0.8), trimMat);
    spoiler.position.set(-hl+0.1, groundClearance+bodyHeight*0.5+roofHeight+0.1, 0);
    group.add(spoiler);
  }

  // Bumpers
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.1, bodyHeight*0.2, bodyWidth), trimMat);
  frontBumper.position.set(hl+0.05, groundClearance+bodyHeight*0.1, 0);
  group.add(frontBumper);

  const rearBumper = frontBumper.clone();
  rearBumper.position.set(-hl-0.05, groundClearance+bodyHeight*0.1, 0);
  group.add(rearBumper);

  return group;
}

// ─── Main Factory ─────────────────────────────────────────────────────────────

export function createVehicle(params = {}) {
  const { vehicleType='Sedan', category='Land' } = params;

  switch (vehicleType) {
    case 'Sedan':
    case 'Sports Car':
    case 'SUV':
    case 'Truck':
    case 'Van':
    case 'Muscle Car':
    case 'Convertible':
    case 'Hatchback':
      return generateCarBody(params);
    default:
      return generateCarBody(params);
  }
}

export const VEHICLE_PRESETS = {
  compact: { bodyLength:3.8, bodyWidth:1.7, bodyHeight:1.4, wheelbase:2.4, groundClearance:0.15, rakeAngle:15 },
  suv:     { bodyLength:4.5, bodyWidth:1.9, bodyHeight:1.8, wheelbase:2.7, groundClearance:0.22, rakeAngle:10 },
  sports:  { bodyLength:4.2, bodyWidth:1.8, bodyHeight:1.1, wheelbase:2.5, groundClearance:0.10, rakeAngle:25 },
  truck:   { bodyLength:5.5, bodyWidth:2.0, bodyHeight:1.9, wheelbase:3.2, groundClearance:0.28, rakeAngle:8  },
};

export default { createVehicle, generateCarBody, generateWheel, VEHICLE_PRESETS };
