import * as THREE from "three";

// ── Render pass types ─────────────────────────────────────────────────────────
export const PASS_TYPES = {
  beauty:     { label:"Beauty",     color:"#ffffff", description:"Full combined render" },
  diffuse:    { label:"Diffuse",    color:"#aaccff", description:"Diffuse color only" },
  specular:   { label:"Specular",   color:"#ffff88", description:"Specular highlights" },
  shadow:     { label:"Shadow",     color:"#334455", description:"Shadow matte" },
  ao:         { label:"AO",         color:"#888888", description:"Ambient occlusion" },
  normal:     { label:"Normal",     color:"#8888ff", description:"World normal" },
  depth:      { label:"Depth",      color:"#445566", description:"Z-depth" },
  cryptomatte:{ label:"Cryptomatte",color:"#ff44ff", description:"Object ID" },
  emission:   { label:"Emission",   color:"#ffaa00", description:"Emissive light" },
  wireframe:  { label:"Wireframe",  color:"#00ffc8", description:"Geometry wireframe" },
};

// ── Render pass stack ─────────────────────────────────────────────────────────
export function createPassStack() {
  return {
    passes:  Object.keys(PASS_TYPES).map(type => ({ type, enabled: type === "beauty", canvas: null })),
    active:  "beauty",
    width:   1920,
    height:  1080,
  };
}

// ── Render beauty pass ────────────────────────────────────────────────────────
export function renderBeauty(renderer, scene, camera) {
  renderer.render(scene, camera);
  return captureToCanvas(renderer);
}

// ── Render normal pass ────────────────────────────────────────────────────────
export function renderNormalPass(renderer, scene, camera) {
  const origMaterials = new Map();
  scene.traverse(obj => {
    if (obj.isMesh && obj.material) {
      origMaterials.set(obj, obj.material);
      obj.material = new THREE.MeshNormalMaterial();
    }
  });
  renderer.render(scene, camera);
  const canvas = captureToCanvas(renderer);
  scene.traverse(obj => {
    if (origMaterials.has(obj)) obj.material = origMaterials.get(obj);
  });
  return canvas;
}

// ── Render depth pass ─────────────────────────────────────────────────────────
export function renderDepthPass(renderer, scene, camera) {
  const origMaterials = new Map();
  scene.traverse(obj => {
    if (obj.isMesh && obj.material) {
      origMaterials.set(obj, obj.material);
      obj.material = new THREE.MeshDepthMaterial();
    }
  });
  renderer.render(scene, camera);
  const canvas = captureToCanvas(renderer);
  scene.traverse(obj => {
    if (origMaterials.has(obj)) obj.material = origMaterials.get(obj);
  });
  return canvas;
}

// ── Render wireframe pass ─────────────────────────────────────────────────────
export function renderWireframePass(renderer, scene, camera) {
  const origMaterials = new Map();
  scene.traverse(obj => {
    if (obj.isMesh && obj.material) {
      origMaterials.set(obj, obj.material);
      obj.material = new THREE.MeshBasicMaterial({ color:"#00ffc8", wireframe: true });
    }
  });
  renderer.render(scene, camera);
  const canvas = captureToCanvas(renderer);
  scene.traverse(obj => {
    if (origMaterials.has(obj)) obj.material = origMaterials.get(obj);
  });
  return canvas;
}

// ── Cryptomatte pass ──────────────────────────────────────────────────────────
export function renderCryptomatte(renderer, scene, camera) {
  const origMaterials = new Map();
  const idColors = new Map();
  let colorIndex = 0;

  scene.traverse(obj => {
    if (obj.isMesh) {
      origMaterials.set(obj, obj.material);
      if (!idColors.has(obj.uuid)) {
        const hue = (colorIndex * 137.508) % 360;
        idColors.set(obj.uuid, new THREE.Color().setHSL(hue/360, 1, 0.5));
        colorIndex++;
      }
      obj.material = new THREE.MeshBasicMaterial({ color: idColors.get(obj.uuid) });
    }
  });

  renderer.render(scene, camera);
  const canvas = captureToCanvas(renderer);

  scene.traverse(obj => {
    if (origMaterials.has(obj)) obj.material = origMaterials.get(obj);
  });

  return { canvas, idColors };
}

// ── Emission pass ─────────────────────────────────────────────────────────────
export function renderEmissionPass(renderer, scene, camera) {
  const origMaterials = new Map();
  scene.traverse(obj => {
    if (obj.isMesh && obj.material) {
      origMaterials.set(obj, obj.material);
      const emissive = obj.material.emissive || new THREE.Color(0,0,0);
      const intensity = obj.material.emissiveIntensity || 0;
      obj.material = new THREE.MeshBasicMaterial({
        color: emissive.clone().multiplyScalar(intensity),
      });
    }
  });
  renderer.render(scene, camera);
  const canvas = captureToCanvas(renderer);
  scene.traverse(obj => { if (origMaterials.has(obj)) obj.material = origMaterials.get(obj); });
  return canvas;
}

// ── Capture renderer to canvas ────────────────────────────────────────────────
function captureToCanvas(renderer) {
  const src    = renderer.domElement;
  const canvas = document.createElement("canvas");
  canvas.width  = src.width;
  canvas.height = src.height;
  canvas.getContext("2d").drawImage(src, 0, 0);
  return canvas;
}

// ── Render all passes ─────────────────────────────────────────────────────────
export function renderAllPasses(renderer, scene, camera, stack) {
  const results = {};
  stack.passes.forEach(pass => {
    if (!pass.enabled) return;
    switch (pass.type) {
      case "beauty":      results.beauty      = renderBeauty(renderer, scene, camera); break;
      case "normal":      results.normal      = renderNormalPass(renderer, scene, camera); break;
      case "depth":       results.depth       = renderDepthPass(renderer, scene, camera); break;
      case "wireframe":   results.wireframe   = renderWireframePass(renderer, scene, camera); break;
      case "cryptomatte": results.cryptomatte = renderCryptomatte(renderer, scene, camera); break;
      case "emission":    results.emission    = renderEmissionPass(renderer, scene, camera); break;
    }
  });
  return results;
}

// ── Download pass as image ────────────────────────────────────────────────────
export function downloadPass(canvas, passType, format="PNG") {
  const mime = format === "WEBP" ? "image/webp" : "image/png";
  const a    = document.createElement("a");
  a.href     = canvas.toDataURL(mime);
  a.download = `pass_${passType}.${format.toLowerCase()}`;
  a.click();
}

// ── Composite passes ──────────────────────────────────────────────────────────
export function compositePasses(passes, { aoStrength=0.8, bloomStrength=0.3 } = {}) {
  const beauty = passes.beauty;
  if (!beauty) return null;
  const canvas = document.createElement("canvas");
  canvas.width  = beauty.width;
  canvas.height = beauty.height;
  const ctx = canvas.getContext("2d");

  // Draw beauty
  ctx.drawImage(beauty, 0, 0);

  // Multiply AO pass
  if (passes.ao) {
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = aoStrength;
    ctx.drawImage(passes.ao, 0, 0);
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1.0;
  return canvas;
}
