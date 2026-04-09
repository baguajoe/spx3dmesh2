import * as THREE from "three";

export function createHairAccessory(type = "band", color = 0x222222) {
  let mesh = null;

  if (type === "band") {
    mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.015, 10, 48),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 })
    );
  } else if (type === "bead") {
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.2 })
    );
  } else if (type === "clip") {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.035, 0.025),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.25 })
    );
  }

  if (mesh) mesh.name = `hair_accessory_${type}`;
  return mesh;
}

export function attachAccessoryToHair(group, type = "band") {
  if (!group) return null;
  const acc = createHairAccessory(type);
  if (!acc) return null;

  acc.position.set(0, 0.08, 0);
  group.add(acc);
  return acc;
}
