import * as THREE from "three";

// ── Multires stack entry ──────────────────────────────────────────────────────
export function createMultiresStack(mesh) {
  const geo = mesh.geometry.clone();
  geo.computeVertexNormals();
  return {
    levels:       [{ geo: geo.clone(), vertices: geo.attributes.position.count }],
    currentLevel: 0,
    mesh,
  };
}

// ── Subdivide — add a new higher-res level ────────────────────────────────────
export function subdivideLevel(stack) {
  const currentGeo = stack.levels[stack.currentLevel].geo;
  const newGeo     = subdivideGeometry(currentGeo);
  newGeo.computeVertexNormals();
  stack.levels.push({ geo: newGeo, vertices: newGeo.attributes.position.count });
  stack.currentLevel = stack.levels.length - 1;
  applyLevelToMesh(stack);
  return stack;
}

// ── Apply level to mesh ───────────────────────────────────────────────────────
export function applyLevelToMesh(stack) {
  const { geo }   = stack.levels[stack.currentLevel];
  const mesh      = stack.mesh;
  mesh.geometry.dispose();
  mesh.geometry   = geo.clone();
  mesh.geometry.computeVertexNormals();
}

// ── Switch to a level ─────────────────────────────────────────────────────────
export function setMultiresLevel(stack, level) {
  if (level < 0 || level >= stack.levels.length) return;
  stack.currentLevel = level;
  applyLevelToMesh(stack);
}

// ── Bake sculpt down to lower level ──────────────────────────────────────────
export function bakeDownLevel(stack) {
  if (stack.currentLevel === 0) return;
  // Save current sculpted state
  const currentGeo = stack.mesh.geometry.clone();
  stack.levels[stack.currentLevel].geo = currentGeo;

  // Decimate to lower level
  const targetLevel = stack.currentLevel - 1;
  const targetGeo   = decimateToLevel(currentGeo, stack.levels[targetLevel].vertices);
  stack.levels[targetLevel].geo = targetGeo;
  stack.currentLevel = targetLevel;
  applyLevelToMesh(stack);
}

// ── Apply multires — flatten to current level ─────────────────────────────────
export function applyMultires(stack) {
  stack.levels = [stack.levels[stack.currentLevel]];
  stack.currentLevel = 0;
  applyLevelToMesh(stack);
}

// ── Reshape — push high-res detail to low-res shape ───────────────────────────
export function reshapeFromLowRes(stack, lowResGeo) {
  stack.levels[0].geo = lowResGeo.clone();
  // Propagate shape change to higher levels (simplified)
  for (let i = 1; i < stack.levels.length; i++) {
    stack.levels[i].geo = subdivideGeometry(stack.levels[i-1].geo);
  }
  applyLevelToMesh(stack);
}

// ── Simple midpoint subdivision ───────────────────────────────────────────────
function subdivideGeometry(geo) {
  const pos    = geo.attributes.position;
  const idx    = geo.index;
  if (!idx) return geo.clone();

  const arr     = idx.array;
  const newPos  = [];
  const newIdx  = [];
  const midMap  = new Map();
  let   vi      = pos.count;

  // Copy original verts
  for (let i = 0; i < pos.count; i++) {
    newPos.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  }

  const getMid = (a, b) => {
    const key = Math.min(a,b) + "_" + Math.max(a,b);
    if (midMap.has(key)) return midMap.get(key);
    const mx = (pos.getX(a)+pos.getX(b))/2;
    const my = (pos.getY(a)+pos.getY(b))/2;
    const mz = (pos.getZ(a)+pos.getZ(b))/2;
    newPos.push(mx, my, mz);
    midMap.set(key, vi);
    return vi++;
  };

  for (let i = 0; i < arr.length; i += 3) {
    const a = arr[i], b = arr[i+1], c = arr[i+2];
    const ab = getMid(a, b);
    const bc = getMid(b, c);
    const ca = getMid(c, a);
    newIdx.push(a,ab,ca, ab,b,bc, ca,bc,c, ab,bc,ca);
  }

  const newGeo = new THREE.BufferGeometry();
  newGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(newPos), 3));
  newGeo.setIndex(newIdx);
  newGeo.computeVertexNormals();
  return newGeo;
}

function decimateToLevel(geo, targetCount) {
  const pos    = geo.attributes.position;
  const ratio  = Math.max(0.1, targetCount / pos.count);
  const idx    = geo.index;
  if (!idx) return geo.clone();

  const arr    = idx.array;
  const keep   = Math.max(3, Math.floor(arr.length * ratio / 3) * 3);
  const newIdx = Array.from(arr.slice(0, keep));

  const newGeo = geo.clone();
  newGeo.setIndex(newIdx);
  newGeo.computeVertexNormals();
  return newGeo;
}

// ── Get stack stats ───────────────────────────────────────────────────────────
export function getMultiresStats(stack) {
  return {
    levels:       stack.levels.length,
    currentLevel: stack.currentLevel,
    vertices:     stack.levels.map(l => l.vertices),
  };
}
