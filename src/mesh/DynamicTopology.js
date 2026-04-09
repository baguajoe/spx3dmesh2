import * as THREE from "three";
import { HalfEdgeMesh } from "./HalfEdgeMesh.js";

// ── Dyntopo settings ──────────────────────────────────────────────────────────
export const DYNTOPO_DEFAULTS = {
  enabled:    false,
  detailSize: 0.05,   // target edge length
  mode:       "subdivide", // subdivide | collapse | both
  smoothing:  0.5,
};

// ── Subdivide long edges in sculpt radius ─────────────────────────────────────
export function dyntopoSubdivide(mesh, hit, detailSize, radius) {
  const geo  = mesh.geometry;
  const pos  = geo.attributes.position;
  if (!pos) return;

  const invMat   = mesh.matrixWorld.clone().invert();
  const localCtr = hit.point.clone().applyMatrix4(invMat);
  const tmp      = new THREE.Vector3();
  const idx      = geo.index;
  if (!idx) return;

  const arr    = idx.array;
  const newPos = [...pos.array];
  const newIdx = [...arr];
  let   added  = 0;

  for (let i = 0; i < arr.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const ai = arr[i + k];
      const bi = arr[i + (k+1)%3];
      const ax = pos.getX(ai), ay = pos.getY(ai), az = pos.getZ(ai);
      const bx = pos.getX(bi), by = pos.getY(bi), bz = pos.getZ(bi);
      const mx = (ax+bx)/2,   my = (ay+by)/2,   mz = (az+bz)/2;

      tmp.set(mx, my, mz);
      const distToCenter = tmp.distanceTo(localCtr);
      if (distToCenter > radius) continue;

      const edgeLen = Math.sqrt((bx-ax)**2+(by-ay)**2+(bz-az)**2);
      if (edgeLen > detailSize * 2) {
        // Add midpoint vertex
        newPos.push(mx, my, mz);
        added++;
      }
    }
  }

  if (added > 0) {
    const newPosArr = new Float32Array(newPos);
    geo.setAttribute("position", new THREE.BufferAttribute(newPosArr, 3));
    geo.computeVertexNormals();
  }

  return added;
}

// ── Collapse short edges ──────────────────────────────────────────────────────
export function dyntopoCollapse(mesh, hit, detailSize, radius) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  if (!pos || !geo.index) return 0;

  const invMat   = mesh.matrixWorld.clone().invert();
  const localCtr = hit.point.clone().applyMatrix4(invMat);
  const arr      = geo.index.array;
  const tmp      = new THREE.Vector3();
  const remap    = new Map();
  let   collapsed = 0;

  for (let i = 0; i < arr.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const ai = arr[i + k];
      const bi = arr[i + (k+1)%3];
      tmp.set(pos.getX(ai), pos.getY(ai), pos.getZ(ai));
      if (tmp.distanceTo(localCtr) > radius) continue;
      const ax=pos.getX(ai),ay=pos.getY(ai),az=pos.getZ(ai);
      const bx=pos.getX(bi),by=pos.getY(bi),bz=pos.getZ(bi);
      const edgeLen=Math.sqrt((bx-ax)**2+(by-ay)**2+(bz-az)**2);
      if (edgeLen < detailSize * 0.5) {
        remap.set(bi, ai); // collapse bi into ai
        collapsed++;
      }
    }
  }

  if (collapsed > 0) {
    const newArr = new Uint32Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      newArr[i] = remap.get(arr[i]) ?? arr[i];
    }
    geo.setIndex(new THREE.BufferAttribute(newArr, 1));
    geo.computeVertexNormals();
  }

  return collapsed;
}

// ── Combined dyntopo stroke ───────────────────────────────────────────────────
export function applyDyntopo(mesh, hit, settings) {
  const { detailSize = 0.05, mode = "both", radius = 0.5 } = settings;
  let total = 0;
  if (mode === "subdivide" || mode === "both") {
    total += dyntopoSubdivide(mesh, hit, detailSize, radius) || 0;
  }
  if (mode === "collapse" || mode === "both") {
    total += dyntopoCollapse(mesh, hit, detailSize, radius) || 0;
  }
  return total;
}

// ── Flood fill — apply dyntopo to entire mesh ─────────────────────────────────
export function dyntopoFloodFill(mesh, detailSize = 0.05) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  if (!pos) return;

  // Fake hit at center
  const box    = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3()).length();
  const fakeHit = { point: center };
  applyDyntopo(mesh, fakeHit, { detailSize, mode: "both", radius: size });
}

// ── Smooth topology ───────────────────────────────────────────────────────────
export function smoothTopology(mesh, iterations = 1) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  if (!pos || !geo.index) return;

  for (let iter = 0; iter < iterations; iter++) {
    const arr      = geo.index.array;
    const newPos   = new Float32Array(pos.array.length);
    const counts   = new Uint32Array(pos.count);

    for (let i = 0; i < arr.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const ai = arr[i+k];
        const bi = arr[i+(k+1)%3];
        newPos[ai*3]   += pos.getX(bi);
        newPos[ai*3+1] += pos.getY(bi);
        newPos[ai*3+2] += pos.getZ(bi);
        newPos[bi*3]   += pos.getX(ai);
        newPos[bi*3+1] += pos.getY(ai);
        newPos[bi*3+2] += pos.getZ(ai);
        counts[ai]++; counts[bi]++;
      }
    }

    for (let i = 0; i < pos.count; i++) {
      if (counts[i] > 0) {
        const orig = 0.5;
        pos.setXYZ(i,
          pos.getX(i)*orig + (newPos[i*3]/counts[i])*(1-orig),
          pos.getY(i)*orig + (newPos[i*3+1]/counts[i])*(1-orig),
          pos.getZ(i)*orig + (newPos[i*3+2]/counts[i])*(1-orig),
        );
      }
    }
    pos.needsUpdate = true;
  }
  geo.computeVertexNormals();
}

export function createDynaMeshSettings() {
    return {
        enabled: false,
        resolution: 128,
        constantDetail: 10.0,
        subdivisionMethod: 'linear',
        smoothShading: true,
        preserveVolume: true
    };
}
