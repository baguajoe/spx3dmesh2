import * as THREE from "three";

export function getHeadCandidates(scene) {
  const hits = [];
  scene?.traverse((obj) => {
    if (!obj?.isMesh) return;
    const name = (obj.name || "").toLowerCase();
    if (name.startsWith("garment_") || name.startsWith("hair_")) return;
    if (
      name.includes("head") ||
      name.includes("face") ||
      name.includes("body") ||
      name.includes("avatar") ||
      name.includes("scalp")
    ) {
      hits.push(obj);
    }
  });
  return hits;
}

export function chooseHeadTarget(scene) {
  const hits = getHeadCandidates(scene);
  return hits[0] || null;
}

export function fitHairGroupToHead(group, headMesh, {
  scale = 1,
  yOffset = 0.12,
  zOffset = 0,
} = {}) {
  if (!group || !headMesh) return false;

  const box = new THREE.Box3().setFromObject(headMesh);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  group.position.set(center.x, box.max.y + yOffset, center.z + zOffset);
  group.scale.setScalar(Math.max(0.001, size.x * 0.95 * scale));
  return true;
}
