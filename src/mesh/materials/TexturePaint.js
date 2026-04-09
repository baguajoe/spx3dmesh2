import * as THREE from "three";

export function createPaintCanvas(size = 1024, fill = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, size, size);
  return { canvas, ctx };
}

export function canvasToTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.needsUpdate = true;
  return tex;
}

export function applyPaintTextureToMesh(mesh, canvas) {
  if (!mesh || !canvas) return null;
  const tex = canvasToTexture(canvas);

  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => {
      if (!m) return;
      m.map = tex;
      m.needsUpdate = true;
    });
    return tex;
  }

  if (mesh.material) {
    mesh.material.map = tex;
    mesh.material.needsUpdate = true;
  }

  return tex;
}

export function clearPaintCanvas(ctx, color = "#ffffff") {
  const canvas = ctx.canvas;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

export function paintDot(ctx, x, y, size = 20, color = "#ff0000", erase = false) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function paintStroke(ctx, from, to, size = 20, color = "#ff0000", erase = false) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = size;
  ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

export function exportPaintTexture(canvas, filename = "paint-texture.png") {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}
