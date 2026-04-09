import * as THREE from "three";

// ── Initialize vertex color attribute on a mesh ───────────────────────────────
export function initVertexColors(mesh) {
  const geo = mesh.geometry;
  if (geo.attributes.color) return; // already initialized
  const count  = geo.attributes.position.count;
  const colors = new Float32Array(count * 3).fill(0.5); // default grey
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  if (mesh.material) {
    mesh.material.vertexColors = true;
    mesh.material.needsUpdate  = true;
  }
}

// ── Paint vertex colors at hit point ─────────────────────────────────────────
export function paintVertexColor(mesh, hit, brush) {
  const { color, radius, strength, falloffType } = brush;
  const geo    = mesh.geometry;
  const pos    = geo.attributes.position;
  const col    = geo.attributes.color;
  if (!col) return;

  const r = parseInt(color.slice(1,3), 16) / 255;
  const g = parseInt(color.slice(3,5), 16) / 255;
  const b = parseInt(color.slice(5,7), 16) / 255;

  const invMat   = mesh.matrixWorld.clone().invert();
  const localCtr = hit.point.clone().applyMatrix4(invMat);
  const tmp      = new THREE.Vector3();
  const count    = pos.count;

  for (let i = 0; i < count; i++) {
    tmp.fromBufferAttribute(pos, i);
    const dist = tmp.distanceTo(localCtr);
    if (dist >= radius) continue;
    const t       = dist / radius;
    const falloff = getFalloff(falloffType, t) * strength;
    const cr      = col.getX(i);
    const cg      = col.getY(i);
    const cb      = col.getZ(i);
    col.setXYZ(i,
      cr + (r - cr) * falloff,
      cg + (g - cg) * falloff,
      cb + (b - cb) * falloff,
    );
  }
  col.needsUpdate = true;
}

// ── Fill all vertices with a single color ────────────────────────────────────
export function fillVertexColor(mesh, hexColor) {
  const geo = mesh.geometry;
  const col = geo.attributes.color;
  if (!col) return;
  const r = parseInt(hexColor.slice(1,3), 16) / 255;
  const g = parseInt(hexColor.slice(3,5), 16) / 255;
  const b = parseInt(hexColor.slice(5,7), 16) / 255;
  for (let i = 0; i < col.count; i++) col.setXYZ(i, r, g, b);
  col.needsUpdate = true;
}

// ── Gradient fill between two colors across Y axis ───────────────────────────
export function gradientFillVertexColor(mesh, colorA, colorB) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  if (!col || !pos) return;

  const rA = parseInt(colorA.slice(1,3),16)/255, gA = parseInt(colorA.slice(3,5),16)/255, bA = parseInt(colorA.slice(5,7),16)/255;
  const rB = parseInt(colorB.slice(1,3),16)/255, gB = parseInt(colorB.slice(3,5),16)/255, bB = parseInt(colorB.slice(5,7),16)/255;

  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const range = maxY - minY || 1;

  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - minY) / range;
    col.setXYZ(i, rA+(rB-rA)*t, gA+(gB-gA)*t, bA+(bB-bA)*t);
  }
  col.needsUpdate = true;
}

function getFalloff(type, t) {
  if (t >= 1) return 0;
  switch (type) {
    case "linear": return 1 - t;
    case "sharp":  return t < 0.5 ? 1 : 1 - (t-0.5)*2;
    default:       return 1 - t*t;
  }
}
