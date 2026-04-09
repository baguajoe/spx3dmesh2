import * as THREE from "three";

export function createHairTexture({
  base = "#3a281c",
  streak = "#6b4a33",
  highlight = "#9a785e",
  size = 256,
  noise = 0.15,
} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, highlight);
  g.addColorStop(0.2, streak);
  g.addColorStop(1, base);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, size);

  for (let i = 0; i < 180; i++) {
    const y = Math.random() * size;
    const a = Math.random() * noise;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(Math.random() * 32, y, 1 + Math.random() * 2, 18 + Math.random() * 40);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function applyProceduralHairTexture(group, opts = {}) {
  const tex = createHairTexture(opts);
  group?.traverse((obj) => {
    if (!obj?.isMesh || !obj.material) return;
    obj.material.map = tex;
    obj.material.alphaMap = tex;
    obj.material.transparent = true;
    obj.material.needsUpdate = true;
  });
  return tex;
}
