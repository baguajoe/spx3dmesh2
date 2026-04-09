import * as THREE from "three";

export function createHairStrand(root, normal, options = {}) {
  const { length=0.3, segments=8, width=0.002, stiffness=0.8 } = options;
  const points = [root.clone()];
  const dir = normal.clone().normalize();
  dir.y -= 0.1; dir.normalize();
  const segLen = length / segments;
  for (let i = 1; i <= segments; i++) {
    const prev = points[i-1].clone();
    const droop = new THREE.Vector3(0, -i*0.005, 0);
    const noise = new THREE.Vector3((Math.random()-0.5)*0.008,(Math.random()-0.5)*0.003,(Math.random()-0.5)*0.008);
    points.push(prev.addScaledVector(dir, segLen).add(droop).add(noise));
  }
  return {
    id: crypto.randomUUID(), points,
    restPoints: points.map(p => p.clone()),
    root: root.clone(), normal: normal.clone(),
    length, segments, width, stiffness,
    velocity: points.map(() => new THREE.Vector3()),
    selected: false, groupId: null, clump: 0,
  };
}

export function emitHair(mesh, options = {}) {
  const { density=200, length=0.3, lengthVar=0.15, segments=8, width=0.002, stiffness=0.8 } = options;
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const idx = geo.index;
  const strands = [];
  if (!pos || !nor || !idx) return strands;
  const arr = idx.array;
  const mat = mesh.matrixWorld;
  const normalMat = new THREE.Matrix3().getNormalMatrix(mat);

  for (let i = 0; i < arr.length; i += 3) {
    const va = new THREE.Vector3(pos.getX(arr[i]),   pos.getY(arr[i]),   pos.getZ(arr[i])).applyMatrix4(mat);
    const vb = new THREE.Vector3(pos.getX(arr[i+1]), pos.getY(arr[i+1]), pos.getZ(arr[i+1])).applyMatrix4(mat);
    const vc = new THREE.Vector3(pos.getX(arr[i+2]), pos.getY(arr[i+2]), pos.getZ(arr[i+2])).applyMatrix4(mat);
    const area = new THREE.Triangle(va,vb,vc).getArea();
    const count = Math.max(1, Math.round(area * density * 10));
    const na = new THREE.Vector3(nor.getX(arr[i]),   nor.getY(arr[i]),   nor.getZ(arr[i]));
    const nb = new THREE.Vector3(nor.getX(arr[i+1]), nor.getY(arr[i+1]), nor.getZ(arr[i+1]));
    const nc = new THREE.Vector3(nor.getX(arr[i+2]), nor.getY(arr[i+2]), nor.getZ(arr[i+2]));
    const avgNor = na.add(nb).add(nc).normalize().applyMatrix3(normalMat).normalize();

    for (let s = 0; s < count; s++) {
      let u = Math.random(), v = Math.random();
      if (u+v > 1) { u=1-u; v=1-v; }
      const w = 1-u-v;
      const root = new THREE.Vector3(
        va.x*u+vb.x*v+vc.x*w, va.y*u+vb.y*v+vc.y*w, va.z*u+vb.z*v+vc.z*w
      );
      const strandLen = length * (1+(Math.random()-0.5)*lengthVar);
      strands.push(createHairStrand(root, avgNor, { length:strandLen, segments, width, stiffness }));
    }
  }
  return strands;
}

export function buildHairLines(strands, { rootColor="#332211", tipColor="#886644" } = {}) {
  const positions = [], colors = [];
  const rc = new THREE.Color(rootColor), tc = new THREE.Color(tipColor);
  strands.forEach(strand => {
    for (let i = 0; i < strand.points.length-1; i++) {
      const t1 = i/(strand.points.length-1), t2 = (i+1)/(strand.points.length-1);
      positions.push(...strand.points[i].toArray(), ...strand.points[i+1].toArray());
      const c1 = rc.clone().lerp(tc, t1), c2 = rc.clone().lerp(tc, t2);
      colors.push(c1.r,c1.g,c1.b, c2.r,c2.g,c2.b);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(new Float32Array(colors), 3));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true });
  return new THREE.LineSegments(geo, mat);
}

export function buildHairTubes(strands, { radius=0.0015, radialSegs=3, rootColor="#332211", tipColor="#886644" } = {}) {
  const group = new THREE.Group(); group.name = "Hair";
  const rc = new THREE.Color(rootColor), tc = new THREE.Color(tipColor);
  strands.forEach(strand => {
    if (strand.points.length < 2) return;
    const curve = new THREE.CatmullRomCurve3(strand.points);
    const geo   = new THREE.TubeGeometry(curve, strand.segments*2, radius, radialSegs, false);
    const t     = Math.random();
    const color = rc.clone().lerp(tc, t);
    const mat   = new THREE.MeshStandardMaterial({ color, roughness:0.8, metalness:0 });
    group.add(new THREE.Mesh(geo, mat));
  });
  return group;
}

export function clumpHair(strands, { strength=0.3, radius=0.1 } = {}) {
  if (!strands.length) return;
  // Group strands spatially and clump tips
  const buckets = new Map();
  strands.forEach(s => {
    const key = Math.round(s.root.x/radius)+"_"+Math.round(s.root.z/radius);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  });
  buckets.forEach(group => {
    if (group.length < 2) return;
    const tipCenter = new THREE.Vector3();
    group.forEach(s => tipCenter.add(s.points[s.points.length-1]));
    tipCenter.divideScalar(group.length);
    group.forEach(s => {
      for (let i=1; i<s.points.length; i++) {
        const t = i/s.points.length;
        s.points[i].lerp(tipCenter, t*strength);
      }
    });
  });
}

export const HAIR_PRESETS = {
  short:   { length:0.08, density:300, stiffness:0.9, clump:0.2, label:"Short" },
  medium:  { length:0.2,  density:200, stiffness:0.7, clump:0.3, label:"Medium" },
  long:    { length:0.5,  density:150, stiffness:0.5, clump:0.4, label:"Long" },
  curly:   { length:0.25, density:250, stiffness:0.3, clump:0.5, label:"Curly" },
  wavy:    { length:0.35, density:180, stiffness:0.6, clump:0.35,label:"Wavy" },
  afro:    { length:0.15, density:400, stiffness:0.2, clump:0.1, label:"Afro" },
  braids:  { length:0.4,  density:100, stiffness:0.85,clump:0.8, label:"Braids" },
  buzz:    { length:0.03, density:600, stiffness:0.99,clump:0.05,label:"Buzz Cut" },
};

export function applyHairPreset(mesh, presetKey) {
  const preset = HAIR_PRESETS[presetKey];
  if (!preset) return [];
  const strands = emitHair(mesh, preset);
  if (preset.clump > 0) clumpHair(strands, { strength: preset.clump });
  return strands;
}

export function getHairStats(strands) {
  const totalPts = strands.reduce((s,st)=>s+st.points.length,0);
  const avgLen   = strands.length ? strands.reduce((s,st)=>s+st.length,0)/strands.length : 0;
  return { strands:strands.length, totalPoints:totalPts, avgLength:avgLen.toFixed(3) };
}

export function serializeHair(strands) {
  return strands.map(s=>({ id:s.id, points:s.points.map(p=>p.toArray()), root:s.root.toArray(), normal:s.normal.toArray(), length:s.length, segments:s.segments }));
}

export function deserializeHair(data) {
  return data.map(s=>({ ...s, points:s.points.map(p=>new THREE.Vector3(...p)), restPoints:s.points.map(p=>new THREE.Vector3(...p)), root:new THREE.Vector3(...s.root), normal:new THREE.Vector3(...s.normal), velocity:s.points.map(()=>new THREE.Vector3()), selected:false, groupId:null, clump:0 }));
}
