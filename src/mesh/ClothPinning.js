import * as THREE from "three";

export function pinVertex(cloth, vertexIndex, weight=1.0) {
  const p = cloth.particles[vertexIndex];
  if (!p) return;
  p.pinned    = true;
  p.pinWeight = weight;
  p.invMass   = 0;
}

export function unpinVertex(cloth, vertexIndex) {
  const p = cloth.particles[vertexIndex];
  if (!p) return;
  p.pinned  = false;
  p.invMass = p.mass > 0 ? 1/p.mass : 0;
}

export function pinVerticesInRadius(cloth, worldPoint, radius, weight=1.0) {
  const pinned = [];
  cloth.particles.forEach((p,i) => {
    if (p.position.distanceTo(worldPoint) < radius) {
      pinVertex(cloth, i, weight);
      pinned.push(i);
    }
  });
  return pinned;
}

export function unpinVerticesInRadius(cloth, worldPoint, radius) {
  cloth.particles.forEach((p,i) => {
    if (p.position.distanceTo(worldPoint) < radius) unpinVertex(cloth, i);
  });
}

export function pinTopRow(cloth, threshold=0.9) {
  const pos = cloth.mesh.geometry.attributes.position;
  let maxY = -Infinity;
  for (let i=0; i<pos.count; i++) maxY = Math.max(maxY, pos.getY(i));
  cloth.particles.forEach((p,i) => {
    const y = pos.getY(i);
    if (y >= maxY * threshold) pinVertex(cloth, i);
  });
}

export function pinToMesh(cloth, targetMesh, threshold=0.05) {
  const tPos = targetMesh.geometry.attributes.position;
  const tMat = targetMesh.matrixWorld;
  cloth.particles.forEach((p,i) => {
    for (let j=0; j<tPos.count; j++) {
      const tp = new THREE.Vector3(tPos.getX(j),tPos.getY(j),tPos.getZ(j)).applyMatrix4(tMat);
      if (p.position.distanceTo(tp) < threshold) {
        pinVertex(cloth, i);
        break;
      }
    }
  });
}

export function pinToBone(cloth, bone, threshold=0.1) {
  const bonePos = new THREE.Vector3();
  bone.getWorldPosition(bonePos);
  pinVerticesInRadius(cloth, bonePos, threshold);
}

export function softPin(cloth, vertexIndex, targetPosition, strength=0.1) {
  // Soft pin — pull toward target without fully fixing
  const p = cloth.particles[vertexIndex];
  if (!p) return;
  const diff = targetPosition.clone().sub(p.position);
  p.position.addScaledVector(diff, strength);
}

export function getPinnedVertices(cloth) {
  return cloth.particles.reduce((acc,p,i) => { if (p.pinned) acc.push(i); return acc; }, []);
}

export function visualizePins(cloth, scene, color="#00ffc8") {
  const positions = [];
  cloth.particles.forEach((p,i) => {
    if (p.pinned) positions.push(p.position.x, p.position.y, p.position.z);
  });
  if (!positions.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size:0.05 }));
  pts.name = "ClothPins";
  scene.add(pts);
  return pts;
}
