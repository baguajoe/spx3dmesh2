import * as THREE from "three";

export function makeHairGradientTexture(rootColor = "#1f1612", tipColor = "#6b4a33", alphaSoftness = 0.85) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, rootColor);
  grad.addColorStop(1, tipColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);

  const alphaGrad = ctx.createLinearGradient(0, 0, 0, 256);
  alphaGrad.addColorStop(0, `rgba(255,255,255,${alphaSoftness})`);
  alphaGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = alphaGrad;
  ctx.fillRect(0, 0, 64, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createHairMaterial({
  rootColor = "#1f1612",
  tipColor = "#6b4a33",
  opacity = 1,
} = {}) {
  const map = makeHairGradientTexture(rootColor, tipColor);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    alphaMap: map,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    roughness: 0.72,
    metalness: 0.03,
    depthWrite: false,
  });
  return mat;
}

export function applyHairMaterial(group, opts = {}) {
  if (!group) return false;
  group.traverse((obj) => {
    if (obj?.isMesh) {
      obj.material = createHairMaterial(opts);
      obj.material.needsUpdate = true;
    }
  });
  return true;
}
