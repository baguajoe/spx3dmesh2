import * as THREE from "three";

function getHairCards(group) {
  const cards = [];
  group?.traverse((obj) => {
    if (obj?.isMesh && (obj.name || "").toLowerCase().includes("hair_card")) cards.push(obj);
  });
  return cards;
}

export function applyWindToHair(group, {
  strength = 0.02,
  direction = new THREE.Vector3(1, 0, 0),
  time = 0,
} = {}) {
  const cards = getHairCards(group);
  cards.forEach((card, i) => {
    card.position.x += direction.x * Math.sin(time * 0.002 + i * 0.13) * strength;
    card.position.y += direction.y * Math.cos(time * 0.0015 + i * 0.09) * strength * 0.4;
    card.position.z += direction.z * Math.sin(time * 0.0018 + i * 0.11) * strength;
  });
  return true;
}

export function resolveHairClothingCollision(hairGroup, clothingScene) {
  if (!hairGroup || !clothingScene) return false;

  const clothingBoxes = []
  clothingScene.traverse((obj) => {
    if (obj?.isMesh && (obj.name || "").toLowerCase().startsWith("garment_")) {
      clothingBoxes.push(new THREE.Box3().setFromObject(obj));
    }
  });

  const cards = getHairCards(hairGroup);
  cards.forEach((card) => {
    const p = card.getWorldPosition(new THREE.Vector3());
    for (const box of clothingBoxes) {
      if (box.containsPoint(p)) {
        card.position.z += 0.02;
      }
    }
  });

  return true;
}
