import * as THREE from 'three';

// ── Lathe-based body profile builder ─────────────────────────────────────────
function buildBodyProfile(params) {
  const { bodyLength:bl=1, bodyHeight:bh=0.4, bodyWidth:bw=0.6,
          frontRake=0.55, rearRake=0.45, roofHeight=0.7,
          noseDrops=0.3, tailDrops=0.2 } = params;

  // Catmull-Rom spline profile points (side silhouette)
  const pts = [
    new THREE.Vector2(0,              noseDrops*bh),          // nose tip
    new THREE.Vector2(bl*0.08,        0),                     // front bumper bottom
    new THREE.Vector2(bl*frontRake,   bh*0.55),               // windshield base
    new THREE.Vector2(bl*0.42,        bh*(0.55+roofHeight*0.45)), // roof front
    new THREE.Vector2(bl*0.58,        bh*(0.55+roofHeight*0.45)), // roof rear
    new THREE.Vector2(bl*rearRake,    bh*0.55),               // rear window base
    new THREE.Vector2(bl*0.95,        0),                     // rear bumper bottom
    new THREE.Vector2(bl,             tailDrops*bh),          // tail tip
  ];

  const curve = new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p.x-bl*0.5,p.y,0)), false, 'catmullrom', 0.5);
  return curve.getPoints(48);
}

function buildWheelMesh(radius, width, mat) {
  const group = new THREE.Group();
  // Tire
  const tireGeo = new THREE.TorusGeometry(radius, width*0.35, 16, 32);
  const tireMat = new THREE.MeshPhysicalMaterial({ color:0x1a1a1a, roughness:0.95 });
  group.add(new THREE.Mesh(tireGeo, tireMat));
  // Rim
  const rimGeo = new THREE.CylinderGeometry(radius*0.72, radius*0.72, width*0.4, 16, 1);
  const rimMat = new THREE.MeshPhysicalMaterial({ color:0xcccccc, roughness:0.1, metalness:1.0, clearcoat:1.0 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI/2;
  group.add(rim);
  // Spokes
  for (let i=0;i<5;i++) {
    const sGeo = new THREE.BoxGeometry(radius*1.3, width*0.08, width*0.06);
    const spoke = new THREE.Mesh(sGeo, rimMat);
    spoke.rotation.z = (i/5)*Math.PI*2;
    group.add(spoke);
  }
  group.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
  return group;
}

export function buildCurvedVehicle(scene, params, meshesRef) {
  meshesRef.current.forEach(m=>{ scene.remove(m); m.traverse(o=>{ o.geometry?.dispose(); o.material?.dispose(); }); });
  meshesRef.current = [];

  const {
    bodyLength=1, bodyHeight=0.4, bodyWidth=0.6,
    wheelSize=0.18, wheelCount=4, groundClearance=0.18,
    primaryColor='#cc2200', spoiler=false,
    frontRake=0.55, rearRake=0.45, roofHeight=0.7,
  } = params;

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(primaryColor),
    roughness: 0.15, metalness: 0.6,
    clearcoat: 1.0, clearcoatRoughness: 0.05,
    envMapIntensity: 1.5,
  });

  // Build side profile via CatmullRom curve + extrude
  const profilePts = buildBodyProfile({bodyLength,bodyHeight,bodyWidth,frontRake,rearRake,roofHeight});

  const shape = new THREE.Shape();
  profilePts.forEach((p,i)=>{ i===0?shape.moveTo(p.x,p.y):shape.lineTo(p.x,p.y); });
  shape.closePath();

  const extrudeSettings = {
    depth: bodyWidth,
    bevelEnabled: true,
    bevelThickness: bodyWidth*0.08,
    bevelSize: bodyWidth*0.06,
    bevelSegments: 4,
    steps: 2,
  };

  const bodyGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  bodyGeo.center();
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = groundClearance + bodyHeight*0.5;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  scene.add(bodyMesh);
  meshesRef.current.push(bodyMesh);

  // Windshield glass
  const glassShape = new THREE.Shape();
  const gs = profilePts.slice(2,5);
  glassShape.moveTo(gs[0].x,gs[0].y);
  gs.forEach(p=>glassShape.lineTo(p.x,p.y));
  glassShape.closePath();
  const glassGeo = new THREE.ExtrudeGeometry(glassShape, {...extrudeSettings, depth:bodyWidth*0.98, bevelEnabled:false});
  glassGeo.center();
  const glassMat = new THREE.MeshPhysicalMaterial({ color:0x88aacc, transmission:0.85, ior:1.45, roughness:0, transparent:true, opacity:1, envMapIntensity:2 });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.copy(bodyMesh.position);
  scene.add(glassMesh);
  meshesRef.current.push(glassMesh);

  // Wheels
  const wheelR = wheelSize;
  const wheelW = wheelSize*0.55;
  const wheelY = wheelR;
  const wlx = bodyWidth*0.52;
  const positions = wheelCount===2
    ? [[0, bodyLength*0.32],[0,-bodyLength*0.32]]
    : [[ wlx,bodyLength*0.32],[-wlx,bodyLength*0.32],[ wlx,-bodyLength*0.32],[-wlx,-bodyLength*0.32]];

  positions.forEach(([wx,wz])=>{
    const wg = buildWheelMesh(wheelR, wheelW, bodyMat);
    wg.position.set(wx, wheelY, wz);
    wg.rotation.z = Math.PI/2;
    scene.add(wg);
    meshesRef.current.push(wg);
  });

  // Spoiler
  if (spoiler) {
    const sGeo = new THREE.BoxGeometry(bodyWidth*0.85, bodyHeight*0.04, bodyHeight*0.18);
    const sMat = new THREE.MeshPhysicalMaterial({ color:0x111111, roughness:0.3, metalness:0.5 });
    const spoilerMesh = new THREE.Mesh(sGeo, sMat);
    spoilerMesh.position.set(0, groundClearance+bodyHeight*0.95, -bodyLength*0.45);
    spoilerMesh.castShadow = true;
    scene.add(spoilerMesh);
    meshesRef.current.push(spoilerMesh);

    // Spoiler stands
    [-1,1].forEach(side=>{
      const stGeo = new THREE.BoxGeometry(bodyWidth*0.04, bodyHeight*0.2, bodyHeight*0.04);
      const st = new THREE.Mesh(stGeo, sMat);
      st.position.set(side*bodyWidth*0.35, groundClearance+bodyHeight*0.85, -bodyLength*0.45);
      scene.add(st);
      meshesRef.current.push(st);
    });
  }

  // Ground plane
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(20,20), new THREE.MeshPhysicalMaterial({color:0x111111,roughness:0.9}));
  gnd.rotation.x = -Math.PI/2;
  gnd.receiveShadow = true;
  scene.add(gnd);
  meshesRef.current.push(gnd);
}

export const VEHICLE_CURVE_PRESETS = {
  'Sports Car': { bodyLength:1.0, bodyHeight:0.38, bodyWidth:0.55, wheelSize:0.18, wheelCount:4, groundClearance:0.14, primaryColor:'#cc2200', spoiler:true,  frontRake:0.52, rearRake:0.48, roofHeight:0.65 },
  'SUV':        { bodyLength:1.1, bodyHeight:0.62, bodyWidth:0.62, wheelSize:0.22, wheelCount:4, groundClearance:0.25, primaryColor:'#1a3a5a', spoiler:false, frontRake:0.58, rearRake:0.42, roofHeight:0.85 },
  'Supercar':   { bodyLength:1.0, bodyHeight:0.28, bodyWidth:0.58, wheelSize:0.17, wheelCount:4, groundClearance:0.08, primaryColor:'#f0c000', spoiler:true,  frontRake:0.48, rearRake:0.52, roofHeight:0.55 },
  'Muscle Car': { bodyLength:1.05,bodyHeight:0.42, bodyWidth:0.58, wheelSize:0.20, wheelCount:4, groundClearance:0.16, primaryColor:'#222244', spoiler:true,  frontRake:0.55, rearRake:0.45, roofHeight:0.70 },
  'Pickup':     { bodyLength:1.2, bodyHeight:0.55, bodyWidth:0.62, wheelSize:0.24, wheelCount:4, groundClearance:0.30, primaryColor:'#3a3a2a', spoiler:false, frontRake:0.60, rearRake:0.40, roofHeight:0.80 },
  'Motorcycle': { bodyLength:0.8, bodyHeight:0.35, bodyWidth:0.18, wheelSize:0.18, wheelCount:2, groundClearance:0.18, primaryColor:'#111111', spoiler:false, frontRake:0.50, rearRake:0.50, roofHeight:0.50 },
};
