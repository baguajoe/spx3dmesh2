import * as THREE from "three";

function getHairCards(group) {
  const cards = [];
  group?.traverse((obj) => {
    if (obj?.isMesh && (obj.name || "").toLowerCase().includes("hair_card")) cards.push(obj);
  });
  return cards;
}

export function createStrandSetFromHair(group) {
  const cards = getHairCards(group);
  return cards.map((card, i) => ({
    id: `strand_${i}`,
    position: card.position.clone(),
    rotation: card.rotation.clone(),
    scale: card.scale.clone(),
  }));
}

export function applyStrandLength(group, scaleY = 1) {
  const cards = getHairCards(group);
  cards.forEach((card) => { card.scale.y = Math.max(0.05, scaleY); });
  return true
}

export function applyStrandWidth(group, scaleX = 1) {
  const cards = getHairCards(group);
  cards.forEach((card) => { card.scale.x = Math.max(0.05, scaleX); });
  return true;
}

export function applyStrandCurl(group, amount = 0.1) {
  const cards = getHairCards(group);
  cards.forEach((card, i) => {
    card.rotation.z = Math.sin(i * 0.37) * amount;
    card.rotation.x = Math.cos(i * 0.19) * amount * 0.35;
  });
  return true;
}

export function groomBrushMove(group, center = new THREE.Vector3(), radius = 0.15, delta = new THREE.Vector3()) {
  const cards = getHairCards(group);
  cards.forEach((card) => {
    const d = card.position.distanceTo(center);
    if (d <= radius) {
      const falloff = 1 - d / Math.max(radius, 1e-6);
      card.position.add(delta.clone().multiplyScalar(falloff));
    }
  });
  return true;
}
