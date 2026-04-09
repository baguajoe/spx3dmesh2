import * as THREE from "three";

// ── Fiber/strand data ─────────────────────────────────────────────────────────
export function createStrand(root, direction, length, segments) {
  const points = [root.clone()];
  const step   = direction.clone().normalize().multiplyScalar(length / segments);
  for (let i = 1; i <= segments; i++) {
    const prev = points[i-1].clone();
    // Add slight random curve
    const noise = new THREE.Vector3(
      (Math.random()-0.5)*0.02,
      (Math.random()-0.5)*0.02,
      (Math.random()-0.5)*0.02,
    );
    points.push(prev.add(step).add(noise));
  }
  return {
    id:       crypto.randomUUID(),
    points,
    root:     root.clone(),
    length,
    segments,
    selected: false,
  };
}

// ── Generate fibermesh from surface ───────────────────────────────────────────
export function generateFibermesh(mesh, options = {}) {
  const {
    density   = 0.5,   // strands per unit area
    length    = 0.3,
    segments  = 8,
    lengthVar = 0.2,   // length variation
    clump     = 0.3,
    faceSelection = null, // if null, use all faces
  } = options;

  const geo     = mesh.geometry;
  const pos     = geo.attributes.position;
  const nor     = geo.attributes.normal;
  const idx     = geo.index;
  const strands = [];

  if (!pos || !nor || !idx) return strands;

  const arr  = idx.array;
  const mat  = mesh.matrixWorld;

  for (let i = 0; i < arr.length; i += 3) {
    if (faceSelection && !faceSelection.has(Math.floor(i/3))) continue;

    const va = new THREE.Vector3(pos.getX(arr[i]),   pos.getY(arr[i]),   pos.getZ(arr[i]));
    const vb = new THREE.Vector3(pos.getX(arr[i+1]), pos.getY(arr[i+1]), pos.getZ(arr[i+1]));
    const vc = new THREE.Vector3(pos.getX(arr[i+2]), pos.getY(arr[i+2]), pos.getZ(arr[i+2]));

    va.applyMatrix4(mat); vb.applyMatrix4(mat); vc.applyMatrix4(mat);

    const area        = new THREE.Triangle(va,vb,vc).getArea();
    const strandCount = Math.max(1, Math.round(area * density * 100));

    // Average face normal
    const na = new THREE.Vector3(nor.getX(arr[i]),   nor.getY(arr[i]),   nor.getZ(arr[i]));
    const nb = new THREE.Vector3(nor.getX(arr[i+1]), nor.getY(arr[i+1]), nor.getZ(arr[i+1]));
    const nc = new THREE.Vector3(nor.getX(arr[i+2]), nor.getY(arr[i+2]), nor.getZ(arr[i+2]));
    const avgNormal = na.add(nb).add(nc).normalize();

    for (let s = 0; s < strandCount; s++) {
      // Random barycentric point on triangle
      let u = Math.random(), v = Math.random();
      if (u + v > 1) { u = 1-u; v = 1-v; }
      const w = 1 - u - v;

      const root = new THREE.Vector3(
        va.x*u + vb.x*v + vc.x*w,
        va.y*u + vb.y*v + vc.y*w,
        va.z*u + vb.z*v + vc.z*w,
      );

      // Add length variation and slight gravity
      const strandLen = length * (1 + (Math.random()-0.5) * lengthVar);
      const dir       = avgNormal.clone();
      dir.y           -= 0.1; // slight gravity
      dir.normalize();

      strands.push(createStrand(root, dir, strandLen, segments));
    }
  }

  return strands;
}

// ── Build THREE.js geometry from strands ──────────────────────────────────────
export function buildFibermeshGeometry(strands, { width = 0.002 } = {}) {
  if (!strands.length) return null;

  const positions = [];
  const indices   = [];
  let   vi        = 0;

  strands.forEach(strand => {
    const pts = strand.points;
    for (let i = 0; i < pts.length-1; i++) {
      const a = pts[i], b = pts[i+1];
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      indices.push(vi, vi+1);
      vi += 2;
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(indices);
  return geo;
}

// ── Build as line segments ────────────────────────────────────────────────────
export function buildFibermeshLines(strands, color = "#cccccc") {
  const geo = buildFibermeshGeometry(strands);
  if (!geo) return null;
  const mat  = new THREE.LineBasicMaterial({ color, linewidth: 1 });
  return new THREE.LineSegments(geo, mat);
}

// ── Build as tube meshes ──────────────────────────────────────────────────────
export function buildFibermeshTubes(strands, { radius = 0.003, radialSegments = 4 } = {}) {
  const group = new THREE.Group();
  group.name  = "Fibermesh";

  strands.forEach(strand => {
    if (strand.points.length < 2) return;
    const curve  = new THREE.CatmullRomCurve3(strand.points);
    const geo    = new THREE.TubeGeometry(curve, strand.segments*2, radius, radialSegments, false);
    const mat    = new THREE.MeshStandardMaterial({ color: "#cccccc", roughness:0.8, metalness:0 });
    group.add(new THREE.Mesh(geo, mat));
  });

  return group;
}

// ── Comb brush — push strands toward direction ────────────────────────────────
export function combStrands(strands, hitPoint, direction, { radius=0.5, strength=0.1 } = {}) {
  strands.forEach(strand => {
    const dist = strand.root.distanceTo(hitPoint);
    if (dist >= radius) return;
    const falloff = (1 - dist/radius) * strength;
    for (let i = 1; i < strand.points.length; i++) {
      const influence = (i / strand.points.length) * falloff;
      strand.points[i].addScaledVector(direction, influence);
    }
  });
}

// ── Length brush — scale strand length ────────────────────────────────────────
export function adjustLength(strands, hitPoint, scale, { radius=0.5 } = {}) {
  strands.forEach(strand => {
    const dist = strand.root.distanceTo(hitPoint);
    if (dist >= radius) return;
    const falloff = 1 - dist/radius;
    const root    = strand.points[0];
    for (let i = 1; i < strand.points.length; i++) {
      const dir = strand.points[i].clone().sub(root);
      dir.multiplyScalar(1 + (scale-1) * falloff);
      strand.points[i] = root.clone().add(dir);
    }
    strand.length *= 1 + (scale-1) * falloff;
  });
}

// ── Clump brush — pull strands toward center ──────────────────────────────────
export function clumpStrands(strands, hitPoint, { radius=0.5, strength=0.3 } = {}) {
  const affected = strands.filter(s => s.root.distanceTo(hitPoint) < radius);
  if (!affected.length) return;

  const center = new THREE.Vector3();
  affected.forEach(s => center.add(s.points[s.points.length-1]));
  center.divideScalar(affected.length);

  affected.forEach(strand => {
    const dist    = strand.root.distanceTo(hitPoint);
    const falloff = (1 - dist/radius) * strength;
    const tip     = strand.points[strand.points.length-1];
    const toCtr   = center.clone().sub(tip);
    for (let i = 1; i < strand.points.length; i++) {
      const t = i / strand.points.length;
      strand.points[i].addScaledVector(toCtr, t * falloff);
    }
  });
}

// ── Puff brush — push strands outward from normal ─────────────────────────────
export function puffStrands(strands, hitPoint, normal, { radius=0.5, strength=0.1 } = {}) {
  strands.forEach(strand => {
    const dist = strand.root.distanceTo(hitPoint);
    if (dist >= radius) return;
    const falloff = (1-dist/radius)*strength;
    for (let i=1; i<strand.points.length; i++) {
      const t = i/strand.points.length;
      strand.points[i].addScaledVector(normal, t*falloff);
    }
  });
}

// ── Smooth strands ────────────────────────────────────────────────────────────
export function smoothStrands(strands, hitPoint, { radius=0.5, strength=0.5 } = {}) {
  strands.forEach(strand => {
    if (strand.root.distanceTo(hitPoint) >= radius) return;
    for (let i=1; i<strand.points.length-1; i++) {
      const prev = strand.points[i-1], next = strand.points[i+1];
      const mid  = prev.clone().add(next).multiplyScalar(0.5);
      strand.points[i].lerp(mid, strength);
    }
  });
}

// ── Serialize fibermesh ───────────────────────────────────────────────────────
export function serializeFibermesh(strands) {
  return strands.map(s => ({
    id:       s.id,
    points:   s.points.map(p => p.toArray()),
    root:     s.root.toArray(),
    length:   s.length,
    segments: s.segments,
  }));
}

export function deserializeFibermesh(data) {
  return data.map(s => ({
    ...s,
    points: s.points.map(p => new THREE.Vector3(...p)),
    root:   new THREE.Vector3(...s.root),
  }));
}

// ── Get fibermesh stats ───────────────────────────────────────────────────────
export function getFibermeshStats(strands) {
  const totalPoints = strands.reduce((s, st) => s + st.points.length, 0);
  const avgLength   = strands.length > 0
    ? strands.reduce((s,st)=>s+st.length,0)/strands.length
    : 0;
  return { strands: strands.length, totalPoints, avgLength: avgLength.toFixed(3) };
}
