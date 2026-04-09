import * as THREE from "three";

// ── Spline curve ──────────────────────────────────────────────────────────────
export function createSpline(points = [], closed = false) {
  return {
    id:      crypto.randomUUID(),
    points,  // [{x,y,z}]
    closed,
    type:    "catmullrom",
    tension: 0.5,
  };
}

// ── Get THREE curve from spline ───────────────────────────────────────────────
export function getThreeCurve(spline) {
  const pts = spline.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  if (pts.length < 2) return null;
  return new THREE.CatmullRomCurve3(pts, spline.closed, spline.type, spline.tension);
}

// ── Mesh to curve (find longest edge loop) ────────────────────────────────────
export function meshToCurve(mesh) {
  const geo    = mesh.geometry;
  const pos    = geo.attributes.position;
  const points = [];
  // Sample vertices along Y axis as approximation
  const verts = [];
  for (let i = 0; i < pos.count; i++) {
    verts.push({ x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) });
  }
  verts.sort((a, b) => a.y - b.y);
  // Take every Nth vertex for a smooth curve
  const step = Math.max(1, Math.floor(verts.length / 20));
  for (let i = 0; i < verts.length; i += step) points.push(verts[i]);
  return createSpline(points);
}

// ── Pipe along curve ──────────────────────────────────────────────────────────
export function pipeAlongCurve(spline, { radius = 0.1, segments = 64, radialSegments = 8 } = {}) {
  const curve = getThreeCurve(spline);
  if (!curve) return null;
  const geo   = new THREE.TubeGeometry(curve, segments, radius, radialSegments, spline.closed);
  const mat   = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.1 });
  return new THREE.Mesh(geo, mat);
}

// ── Loft between two curves ───────────────────────────────────────────────────
export function loftCurves(splineA, splineB, { segments = 32 } = {}) {
  const curveA = getThreeCurve(splineA);
  const curveB = getThreeCurve(splineB);
  if (!curveA || !curveB) return null;

  const positions = [], indices = [];
  const ptsA = curveA.getPoints(segments);
  const ptsB = curveB.getPoints(segments);

  ptsA.forEach((p, i) => { positions.push(p.x, p.y, p.z); });
  ptsB.forEach((p, i) => { positions.push(p.x, p.y, p.z); });

  for (let i = 0; i < segments; i++) {
    const a = i, b = i+1, c = segments+1+i, d = segments+1+i+1;
    indices.push(a,b,c, b,d,c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide }));
}

// ── Extrude mesh along curve ──────────────────────────────────────────────────
export function extrudeAlongCurve(profileSpline, pathSpline, { steps = 32 } = {}) {
  const path    = getThreeCurve(pathSpline);
  const profile = getThreeCurve(profileSpline);
  if (!path || !profile) return null;

  const profilePts = profile.getPoints(16);
  const shape      = new THREE.Shape(profilePts.map(p => new THREE.Vector2(p.x, p.y)));
  const geo        = new THREE.ExtrudeGeometry(shape, {
    steps,
    extrudePath: path,
    bevelEnabled: false,
  });
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide }));
}

// ── Convert curve to mesh (flat ribbon) ──────────────────────────────────────
export function curveToMesh(spline, { width = 0.1, segments = 64 } = {}) {
  const curve = getThreeCurve(spline);
  if (!curve) return null;
  const pts    = curve.getPoints(segments);
  const frames = curve.computeFrenetFrames(segments, spline.closed);
  const positions = [], indices = [];

  pts.forEach((pt, i) => {
    const normal = frames.normals[i] || new THREE.Vector3(0,1,0);
    positions.push(
      pt.x - normal.x * width * 0.5,
      pt.y - normal.y * width * 0.5,
      pt.z - normal.z * width * 0.5,
      pt.x + normal.x * width * 0.5,
      pt.y + normal.y * width * 0.5,
      pt.z + normal.z * width * 0.5,
    );
    if (i < segments) {
      const b = i * 2;
      indices.push(b, b+1, b+2, b+1, b+3, b+2);
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide }));
}

// ── Add control point ─────────────────────────────────────────────────────────
export function addPoint(spline, point) {
  spline.points.push(point);
  return spline;
}

// ── Remove control point ──────────────────────────────────────────────────────
export function removePoint(spline, index) {
  spline.points.splice(index, 1);
  return spline;
}

// ── Move control point ────────────────────────────────────────────────────────
export function movePoint(spline, index, position) {
  if (spline.points[index]) spline.points[index] = position;
  return spline;
}
