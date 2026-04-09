export function applyWetHair(group, amount = 0.6) {
  group?.traverse((obj) => {
    if (!obj?.isMesh || !obj.material) return;
    if ("roughness" in obj.material) obj.material.roughness = Math.max(0.05, 0.7 - amount * 0.6);
    if ("metalness" in obj.material) obj.material.metalness = Math.min(0.35, amount * 0.25);
    if ("opacity" in obj.material) {
      obj.material.opacity = Math.min(1, 0.85 + amount * 0.15);
      obj.material.transparent = true;
    }
    obj.material.needsUpdate = true;
  });
  group.userData.wetHair = amount;
  return true;
}
