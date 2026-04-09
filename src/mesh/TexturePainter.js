import * as THREE from "three";

// ── Create paint canvas ───────────────────────────────────────────────────────
export function createPaintCanvas(width = 1024, height = 1024) {
  const canvas  = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx     = canvas.getContext("2d");
  ctx.fillStyle = "#888888";
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx, width, height };
}

// ── Create paint texture ──────────────────────────────────────────────────────
export function createPaintTexture(paintCanvas) {
  const tex = new THREE.CanvasTexture(paintCanvas.canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── Apply paint texture to mesh ───────────────────────────────────────────────
export function applyPaintTexture(mesh, texture) {
  if (!mesh.material) return;
  mesh.material.map         = texture;
  mesh.material.needsUpdate = true;
}

// ── Paint at UV coordinate ────────────────────────────────────────────────────
export function paintAtUV(paintCanvas, u, v, { color = "#ff0000", radius = 20, opacity = 1.0, hardness = 0.8 } = {}) {
  const { ctx, width, height } = paintCanvas;
  const x = u * width;
  const y = (1 - v) * height;

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0,        color + "ff");
  gradient.addColorStop(hardness, color + "aa");
  gradient.addColorStop(1,        color + "00");

  ctx.globalAlpha = opacity;
  ctx.fillStyle   = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ── Fill entire canvas ────────────────────────────────────────────────────────
export function fillCanvas(paintCanvas, color = "#888888") {
  const { ctx, width, height } = paintCanvas;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

// ── Get UV from ray hit ───────────────────────────────────────────────────────
export function getUVFromHit(hit) {
  return hit.uv || null;
}

// ── Paint layer stack ─────────────────────────────────────────────────────────
export function createLayerStack(width = 1024, height = 1024) {
  return {
    width,
    height,
    layers: [
      { id: crypto.randomUUID(), name: "Base", visible: true, opacity: 1.0, blendMode: "normal",
        canvas: createPaintCanvas(width, height) }
    ],
    activeLayer: 0,
  };
}

// ── Add layer ─────────────────────────────────────────────────────────────────
export function addLayer(stack, name = "Layer") {
  const layer = {
    id:        crypto.randomUUID(),
    name,
    visible:   true,
    opacity:   1.0,
    blendMode: "normal",
    canvas:    createPaintCanvas(stack.width, stack.height),
  };
  stack.layers.push(layer);
  stack.activeLayer = stack.layers.length - 1;
  return layer;
}

// ── Flatten layers to single canvas ──────────────────────────────────────────
export function flattenLayers(stack) {
  const result = createPaintCanvas(stack.width, stack.height);
  stack.layers.forEach(layer => {
    if (!layer.visible) return;
    result.ctx.globalAlpha = layer.opacity;
    result.ctx.globalCompositeOperation = getBlendMode(layer.blendMode);
    result.ctx.drawImage(layer.canvas.canvas, 0, 0);
    result.ctx.globalAlpha = 1;
    result.ctx.globalCompositeOperation = "source-over";
  });
  return result;
}

// ── Get CSS blend mode ────────────────────────────────────────────────────────
function getBlendMode(mode) {
  const modes = {
    normal:   "source-over",
    multiply: "multiply",
    screen:   "screen",
    overlay:  "overlay",
    add:      "lighter",
    subtract: "difference",
  };
  return modes[mode] || "source-over";
}

// ── Export texture as data URL ────────────────────────────────────────────────
export function exportTexture(paintCanvas, format = "image/png") {
  return paintCanvas.canvas.toDataURL(format);
}

// ── Export all maps (albedo + generated normal map via Sobel filter) ──────────
// Generate normal map from height/albedo using Sobel filter
export function generateNormalMap(albedoCanvas, strength = 2.0) {
  const w = albedoCanvas.width, h = albedoCanvas.height;
  const src = albedoCanvas.getContext('2d').getImageData(0, 0, w, h);
  const out = new ImageData(w, h);
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      const idx = (y*w+x)*4;
      const tl = src.data[((y-1)*w+(x-1))*4]/255, t = src.data[((y-1)*w+x)*4]/255, tr = src.data[((y-1)*w+(x+1))*4]/255;
      const l  = src.data[(y*w+(x-1))*4]/255,                                        r  = src.data[(y*w+(x+1))*4]/255;
      const bl = src.data[((y+1)*w+(x-1))*4]/255, b = src.data[((y+1)*w+x)*4]/255, br = src.data[((y+1)*w+(x+1))*4]/255;
      const dX = (tr + 2*r + br - tl - 2*l - bl) * strength;
      const dY = (bl + 2*b + br - tl - 2*t - tr) * strength;
      const len = Math.sqrt(dX*dX + dY*dY + 1);
      out.data[idx]   = Math.round((-dX/len*0.5+0.5)*255);
      out.data[idx+1] = Math.round((-dY/len*0.5+0.5)*255);
      out.data[idx+2] = Math.round((1/len*0.5+0.5)*255);
      out.data[idx+3] = 255;
    }
  }
  const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
  canvas.getContext('2d').putImageData(out,0,0); return canvas;
}
export function exportMaps(stack) {
  const flat = flattenLayers(stack);
  return {
    albedo: exportTexture(flat),
    // Normal and roughness would be separate layer stacks
  };
}
