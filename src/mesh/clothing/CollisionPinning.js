import * as THREE from "three";

export function resolveBodyBoxCollision(state, garmentMesh, bodyMesh, offset = 0.01) {
  if (!state || !garmentMesh || !bodyMesh) return false;

  const bodyBox = new THREE.Box3().setFromObject(bodyMesh);
  const inv = new THREE.Matrix4().copy(garmentMesh.matrixWorld).invert();

  for (let i = 0; i < state.vertices.length; i++) {
    if (state.pinned.has(i)) continue;

    const local = state.vertices[i].clone();
    const world = local.clone().applyMatrix4(garmentMesh.matrixWorld);

    if (!bodyBox.containsPoint(world)) continue;

    const dxMin = Math.abs(world.x - bodyBox.min.x);
    const dxMax = Math.abs(bodyBox.max.x - world.x);
    const dyMin = Math.abs(world.y - bodyBox.min.y);
    const dyMax = Math.abs(bodyBox.max.y - world.y);
    const dzMin = Math.abs(world.z - bodyBox.min.z);
    const dzMax = Math.abs(bodyBox.max.z - world.z);

    const minDist = Math.min(dxMin, dxMax, dyMin, dyMax, dzMin, dzMax);

    if (minDist === dxMin) world.x = bodyBox.min.x - offset;
    else if (minDist === dxMax) world.x = bodyBox.max.x + offset;
    else if (minDist === dyMin) world.y = bodyBox.min.y - offset;
    else if (minDist === dyMax) world.y = bodyBox.max.y + offset;
    else if (minDist === dzMin) world.z = bodyBox.min.z - offset;
    else world.z = bodyBox.max.z + offset;

    state.vertices[i] = world.applyMatrix4(inv);
  }

  return true;
}

export function findLatestGarment(scene) {
  let garment = null;
  scene?.traverse((obj) => {
    if (obj?.isMesh && (obj.name || "").toLowerCase().startsWith("garment_")) {
      garment = obj;
    }
  });
  return garment;
}

export function findNearestBody(scene, garment) {
  if (!scene || !garment) return null;

  const garmentPos = new THREE.Vector3();
  garment.getWorldPosition(garmentPos);

  let nearest = null;
  let best = Infinity;

  scene.traverse((obj) => {
    if (!obj?.isMesh) return;
    const name = (obj.name || "").toLowerCase();
    if (name.startsWith("garment_")) return;

    const pos = new THREE.Vector3();
    obj.getWorldPosition(pos);
    const d = pos.distanceTo(garmentPos);

    if (d < best) {
      best = d;
      nearest = obj;
    }
  });

  return nearest;
}
