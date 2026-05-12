// GPU cel post-process pipeline driver (Stage 2).
//
// Replaces the CPU bilateral + posterize + Sobel + ink chain for the
// anime style. Other cel-family styles still route through the panel's
// existing applyStyleFilter cel branch until Stage 3.
//
// Per-frame flow inside runCelPostProcess:
//   1. Render scene with current cel materials → colorTarget (half-float)
//   2. Swap meshes to MeshNormalMaterial, render → normalTarget (RGBA8)
//   3. Restore materials (try/finally)
//   4. Bind both targets to the fullscreen quad's ShaderMaterial uniforms
//   5. Render quad to renderer.domElement (default framebuffer)
//   6. drawImage(renderer.domElement, …) into the caller's dstCanvas
//
// drawImage from renderer.domElement is the same pattern the existing
// captureAndProcess uses, so the downstream consumer (preview rAF
// drawImage to previewRef) sees an indistinguishable canvas API.

import * as THREE from 'three';
import { CEL_VERT_SHADER } from './celShader.vert.glsl.js';
import { CEL_FRAG_SHADER } from './celShader.frag.glsl.js';

let _pipeline = null;

// Shared module-level normal-pass material. Allocated once, reused
// every frame — zero per-frame GC. Modern Three.js (r152+) auto-
// detects skinning when bound to a SkinnedMesh, so no `skinning: true`
// flag needed. DoubleSide so back-facing triangles also write normals,
// otherwise hair caps / open garment shells produce Sobel false-edges
// at the front/back boundary.
const _normalMaterial = new THREE.MeshNormalMaterial({
  side: THREE.DoubleSide,
});

// WebGL2 detection. Tested at flag-toggle time so the panel can hide
// the "GPU Cel" toggle on WebGL1-only clients (rare in 2026 — <3% of
// users). Defensive try/catch because some restrictive environments
// throw on context creation rather than returning null.
export function isWebGL2Supported() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

// Create (or return existing) post-process pipeline bound to a
// renderer. Idempotent: repeat calls with the same renderer return the
// existing handle. If the renderer changes, the prior pipeline is
// disposed and a fresh one allocated.
export function createCelPostProcessPipeline(renderer) {
  if (!renderer) return null;
  if (_pipeline && _pipeline.renderer === renderer) return _pipeline;
  if (_pipeline) disposeCelPostProcessPipeline();

  const size = new THREE.Vector2();
  renderer.getSize(size);
  const pixelRatio = renderer.getPixelRatio();
  const targetW = Math.max(1, Math.floor(size.x * pixelRatio));
  const targetH = Math.max(1, Math.floor(size.y * pixelRatio));

  // Cel color target: half-float (Q7 of audit). Preserves linear-space
  // precision through bilateral+posterize math; avoids the 8-bit
  // banding the CPU pipeline accumulates after every getImageData.
  const colorTarget = new THREE.WebGLRenderTarget(targetW, targetH, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format:    THREE.RGBAFormat,
    type:      THREE.HalfFloatType,
    depthBuffer:   true,   // scene render needs depth test
    stencilBuffer: false,
  });

  // Normal+depth target: RGBA8. Stage 2 only writes RGB (view normal
  // via MeshNormalMaterial); alpha is constant 1.0. Stage 2.5+ can
  // swap in a custom shader that writes linear depth to alpha without
  // re-allocating the target.
  const normalTarget = new THREE.WebGLRenderTarget(targetW, targetH, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format:    THREE.RGBAFormat,
    type:      THREE.UnsignedByteType,
    depthBuffer:   true,
    stencilBuffer: false,
  });

  const uniforms = {
    tCelColor:            { value: colorTarget.texture },
    tNormalDepth:         { value: normalTarget.texture },
    tRegionId:            { value: null },
    uResolution:          { value: new THREE.Vector2(targetW, targetH) },
    uPosterizeLevels:     { value: 5 },
    uBilateralSigmaSpace: { value: 3 },
    uBilateralSigmaRange: { value: 45 / 255 },
    uEdgeThreshold:       { value: 90 / 255 },
    uEdgeBias:            { value: 1.0 },
    uExposure:            { value: 1.0 },
    uMonochrome:          { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader:   CEL_VERT_SHADER,
    fragmentShader: CEL_FRAG_SHADER,
    depthTest:  false,
    depthWrite: false,
  });

  // Two-triangle full-screen quad in clip space. PlaneGeometry(2,2)
  // emits positions in [-1,1] which the passthrough vertex shader uses
  // directly without a projection matrix.
  const geometry = new THREE.PlaneGeometry(2, 2);
  const quad     = new THREE.Mesh(geometry, material);
  const quadScene = new THREE.Scene();
  quadScene.add(quad);

  // Camera reference required by renderer.render(); the vertex shader
  // ignores it (positions are already in clip space).
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  _pipeline = {
    renderer,
    colorTarget,
    normalTarget,
    uniforms,
    material,
    geometry,
    quad,
    quadScene,
    quadCamera,
    targetW,
    targetH,
  };
  return _pipeline;
}

// Ensure the pipeline's targets match the renderer's current pixel
// dimensions. Called at the top of every runCelPostProcess so a
// resized renderer (window resize, devicePixelRatio change) doesn't
// produce mismatched sampling.
function _ensureSize(renderer) {
  if (!_pipeline) return;
  const size = new THREE.Vector2();
  renderer.getSize(size);
  const pixelRatio = renderer.getPixelRatio();
  const w = Math.max(1, Math.floor(size.x * pixelRatio));
  const h = Math.max(1, Math.floor(size.y * pixelRatio));
  if (w === _pipeline.targetW && h === _pipeline.targetH) return;
  _pipeline.colorTarget.setSize(w, h);
  _pipeline.normalTarget.setSize(w, h);
  _pipeline.uniforms.uResolution.value.set(w, h);
  _pipeline.targetW = w;
  _pipeline.targetH = h;
}

// Swap every non-helper, non-infrastructure, non-outline mesh's
// material to the shared normal material, returning the saved state
// for restoration. Outline shells are hidden during the pass so they
// don't write geometry-orthogonal normals at the silhouette ring.
//
// Inlined here (not imported from the panel) so the GPU module has no
// reverse dependency on the panel — keeps the celPostProcess directory
// self-contained.
function _swapToNormalMaterial(scene) {
  const savedMaterials = [];
  const savedVisibility = [];
  scene.traverse(obj => {
    if (!obj.isMesh) return;
    if (obj.userData?.isHelper === true) return;
    if (obj.userData?._spxInfrastructure === true) return;
    if (obj.userData?._spxNprOutline === true) {
      savedVisibility.push({ mesh: obj, visible: obj.visible });
      obj.visible = false;
      return;
    }
    savedMaterials.push({ mesh: obj, material: obj.material });
    obj.material = _normalMaterial;
  });
  return { savedMaterials, savedVisibility };
}

function _restoreFromNormalSwap(saved) {
  if (!saved) return;
  for (const { mesh, material } of saved.savedMaterials) mesh.material = material;
  for (const { mesh, visible }  of saved.savedVisibility) mesh.visible  = visible;
}

// Run the post-process pass and write into params.dstCanvas. Returns
// dstCanvas on success, null on failure. Failure path is non-fatal —
// the panel falls back to the CPU pipeline.
//
// params shape (Stage 2):
//   style:               'anime' (other cel styles fall back to CPU)
//   posterizeLevels:     number
//   edgeThreshold:       number in [0,1]
//   edgeBias:            number (multiplier on Sobel magnitude)
//   bilateralSigmaSpace: number (pixels, 0 disables)
//   bilateralSigmaRange: number in [0,1]
//   dstCanvas:           HTMLCanvasElement — receives the final image
export function runCelPostProcess(renderer, scene, camera, params) {
  if (!_pipeline)            return null;
  if (!renderer || !scene)   return null;
  if (!camera)               return null;
  if (!params?.dstCanvas)    return null;

  _ensureSize(renderer);

  const {
    colorTarget, normalTarget,
    quadScene, quadCamera, uniforms,
  } = _pipeline;

  // Set uniforms before render. Defensive null checks let the caller
  // pass partial params during early integration.
  if (params.posterizeLevels     != null) uniforms.uPosterizeLevels.value     = params.posterizeLevels;
  if (params.bilateralSigmaSpace != null) uniforms.uBilateralSigmaSpace.value = params.bilateralSigmaSpace;
  if (params.bilateralSigmaRange != null) uniforms.uBilateralSigmaRange.value = params.bilateralSigmaRange;
  if (params.edgeThreshold       != null) uniforms.uEdgeThreshold.value       = params.edgeThreshold;
  if (params.edgeBias            != null) uniforms.uEdgeBias.value            = params.edgeBias;

  // Save renderer state we mutate.
  const prevRenderTarget = renderer.getRenderTarget();
  const prevAutoClear    = renderer.autoClear;
  renderer.autoClear = true;

  let normalSwap = null;
  try {
    // (1) Cel render → colorTarget. Materials are already cel (panel's
    // applyCelShading swapped them at style change). Outline shells
    // render normally — we want the silhouette ink to come through.
    renderer.setRenderTarget(colorTarget);
    renderer.render(scene, camera);

    // (2) Normal render → normalTarget. Swap to MeshNormalMaterial,
    // hide outlines (they'd write geometry-orthogonal normals), render.
    normalSwap = _swapToNormalMaterial(scene);
    renderer.setRenderTarget(normalTarget);
    renderer.render(scene, camera);

    // (3) Restore materials before any further work so the next caller
    // (live mirror in panel rAF, etc.) sees clean state. finally also
    // guards this for the throw path.
    _restoreFromNormalSwap(normalSwap);
    normalSwap = null;

    // (4) Fullscreen quad → renderer.domElement. Default framebuffer.
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCamera);

    // (5) Copy to dstCanvas. Same drawImage pattern as the existing
    // captureAndProcess: renderer.domElement holds the latest output
    // until the next renderer.render call.
    const src = renderer.domElement;
    const dst = params.dstCanvas;
    const dctx = dst.getContext('2d');
    dctx.imageSmoothingEnabled = true;
    dctx.imageSmoothingQuality = 'high';
    dctx.clearRect(0, 0, dst.width, dst.height);
    dctx.drawImage(src, 0, 0, dst.width, dst.height);

    return dst;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[celPostProcess] runCelPostProcess failed:', e);
    return null;
  } finally {
    _restoreFromNormalSwap(normalSwap);
    renderer.setRenderTarget(prevRenderTarget);
    renderer.autoClear = prevAutoClear;
  }
}

// Tear down GPU resources. Safe to call multiple times.
export function disposeCelPostProcessPipeline() {
  if (!_pipeline) return;
  _pipeline.colorTarget?.dispose();
  _pipeline.normalTarget?.dispose();
  _pipeline.material?.dispose();
  _pipeline.geometry?.dispose();
  _pipeline = null;
}
