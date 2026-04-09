
/**
 * SPX Mesh Editor — Boolean Operations
 * Union, Subtract, Intersect using three-mesh-bvh
 */
import * as THREE from "three";
import { MeshBVH, CONTAINED, INTERSECTED, NOT_INTERSECTED } from "three-mesh-bvh";

function ensureIndex(geo) {
  if (!geo.index) {
    const pos   = geo.attributes.position;
    const index = new Uint32Array(pos.count);
    for (let i=0;i<pos.count;i++) index[i]=i;
    geo.setIndex(new THREE.BufferAttribute(index,1));
  }
  return geo;
}

function mergeGeometries(geos) {
  let totalVerts = 0, totalIdx = 0;
  geos.forEach(g => { totalVerts += g.attributes.position.count; totalIdx += g.index.count; });
  const positions = new Float32Array(totalVerts*3);
  const indices   = new Uint32Array(totalIdx);
  let vi=0, ii=0, vOffset=0;
  geos.forEach(g => {
    const pos = g.attributes.position.array;
    const idx = g.index.array;
    positions.set(pos, vi); vi += pos.length;
    for (let i=0;i<idx.length;i++) indices[ii++] = idx[i] + vOffset;
    vOffset += g.attributes.position.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions,3));
  out.setIndex(new THREE.BufferAttribute(indices,1));
  out.computeVertexNormals();
  return out;
}

export function booleanUnion(meshA, meshB) {
  try {
    const gA = ensureIndex(meshA.geometry.clone());
    const gB = ensureIndex(meshB.geometry.clone());
    // Apply world transforms
    gA.applyMatrix4(meshA.matrixWorld);
    gB.applyMatrix4(meshB.matrixWorld);
    // Simple union: merge both geometries
    const merged = mergeGeometries([gA, gB]);
    const mat    = meshA.material.clone();
    return new THREE.Mesh(merged, mat);
  } catch(e) {
    console.error("Boolean union error:", e);
    return null;
  }
}

export function booleanSubtract(meshA, meshB) {
  try {
    const gA = ensureIndex(meshA.geometry.clone());
    const gB = ensureIndex(meshB.geometry.clone());
    gA.applyMatrix4(meshA.matrixWorld);
    gB.applyMatrix4(meshB.matrixWorld);

    // Build BVH for B
    const bvh = new MeshBVH(gB);
    const posA = gA.attributes.position;
    const idxA = gA.index.array;

    // Remove triangles from A that are inside B
    const keepTris = [];
    for (let i=0;i<idxA.length;i+=3) {
      const ax=(posA.getX(idxA[i])+posA.getX(idxA[i+1])+posA.getX(idxA[i+2]))/3;
      const ay=(posA.getY(idxA[i])+posA.getY(idxA[i+1])+posA.getY(idxA[i+2]))/3;
      const az=(posA.getZ(idxA[i])+posA.getZ(idxA[i+1])+posA.getZ(idxA[i+2]))/3;
      const pt = new THREE.Vector3(ax,ay,az);
      // Cast ray upward to check inside/outside
      const ray = new THREE.Ray(pt, new THREE.Vector3(0,1,0));
      let hits = 0;
      bvh.raycast(ray, THREE.DoubleSide, 0, Infinity, (hit) => { hits++; });
      if (hits % 2 === 0) keepTris.push(idxA[i], idxA[i+1], idxA[i+2]);
    }

    const newIdx = new Uint32Array(keepTris);
    const out    = gA.clone();
    out.setIndex(new THREE.BufferAttribute(newIdx,1));
    out.computeVertexNormals();
    return new THREE.Mesh(out, meshA.material.clone());
  } catch(e) {
    console.error("Boolean subtract error:", e);
    // Fallback: return meshA unchanged
    return new THREE.Mesh(meshA.geometry.clone(), meshA.material.clone());
  }
}

export function booleanIntersect(meshA, meshB) {
  try {
    const gA = ensureIndex(meshA.geometry.clone());
    const gB = ensureIndex(meshB.geometry.clone());
    gA.applyMatrix4(meshA.matrixWorld);
    gB.applyMatrix4(meshB.matrixWorld);

    const bvh  = new MeshBVH(gB);
    const posA = gA.attributes.position;
    const idxA = gA.index.array;

    // Keep only triangles inside B
    const keepTris = [];
    for (let i=0;i<idxA.length;i+=3) {
      const ax=(posA.getX(idxA[i])+posA.getX(idxA[i+1])+posA.getX(idxA[i+2]))/3;
      const ay=(posA.getY(idxA[i])+posA.getY(idxA[i+1])+posA.getY(idxA[i+2]))/3;
      const az=(posA.getZ(idxA[i])+posA.getZ(idxA[i+1])+posA.getZ(idxA[i+2]))/3;
      const pt  = new THREE.Vector3(ax,ay,az);
      const ray = new THREE.Ray(pt, new THREE.Vector3(0,1,0));
      let hits  = 0;
      bvh.raycast(ray, THREE.DoubleSide, 0, Infinity, () => { hits++; });
      if (hits % 2 !== 0) keepTris.push(idxA[i], idxA[i+1], idxA[i+2]);
    }

    const newIdx = new Uint32Array(keepTris);
    const out    = gA.clone();
    out.setIndex(new THREE.BufferAttribute(newIdx,1));
    out.computeVertexNormals();
    return new THREE.Mesh(out, meshA.material.clone());
  } catch(e) {
    console.error("Boolean intersect error:", e);
    return null;
  }
}
