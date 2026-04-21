import * as THREE from "three";

function pixelsToCanvas(width, height, pixels) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    const srcRow = y;
    const dstRow = height - y - 1;
    for (let x = 0; x < width; x++) {
      const src = (srcRow * width + x) * 4;
      const dst = (dstRow * width + x) * 4;
      img.data[dst + 0] = pixels[src + 0];
      img.data[dst + 1] = pixels[src + 1];
      img.data[dst + 2] = pixels[src + 2];
      img.data[dst + 3] = pixels[src + 3];
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

function downloadCanvas(canvas, filename) {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}

function renderOverridePass(renderer, scene, camera, overrideMaterial) {
  const width = renderer.domElement.width || renderer.getSize(new THREE.Vector2()).x;
  const height = renderer.domElement.height || renderer.getSize(new THREE.Vector2()).y;

  const target = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true
  });

  const prevOverride = scene.overrideMaterial;
  const prevTarget = renderer.getRenderTarget();

  scene.overrideMaterial = overrideMaterial;
  renderer.setRenderTarget(target);
  renderer.clear(true, true, true);
  renderer.render(scene, camera);

  const pixels = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);

  renderer.setRenderTarget(prevTarget);
  scene.overrideMaterial = prevOverride;
  target.dispose();
  overrideMaterial.dispose?.();

  return pixelsToCanvas(width, height, pixels);
}

export function captureBeautyCanvas(renderer) {
  const src = renderer?.domElement;
  if (!src) return null;
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(src, 0, 0);
  return canvas;
}

export function captureNormalCanvas(renderer, scene, camera) {
  const mat = new THREE.MeshNormalMaterial();
  return renderOverridePass(renderer, scene, camera, mat);
}

export function captureDepthCanvas(renderer, scene, camera) {
  const mat = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking
  });
  return renderOverridePass(renderer, scene, camera, mat);
}

export function captureAOVPack({ renderer, scene, camera, prefix = "spx" }) {
  if (!renderer || !scene || !camera) return false;

  const beauty = captureBeautyCanvas(renderer);
  const normal = captureNormalCanvas(renderer, scene, camera);
  const depth = captureDepthCanvas(renderer, scene, camera);

  if (beauty) downloadCanvas(beauty, `${prefix}_beauty.png`);
  if (normal) downloadCanvas(normal, `${prefix}_normal.png`);
  if (depth) downloadCanvas(depth, `${prefix}_depth.png`);

  return true;
}
