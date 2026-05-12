// GPU cel post-process pipeline driver.
//
// Stage 1: scaffolds the WebGLRenderTarget + full-screen quad + ShaderMaterial
// structures so the pieces are in place before the real fragment shader lands
// in Stage 2. The exported `runCelPostProcess` is a no-op stub: the panel's
// captureAndProcess logs a diagnostic and falls through to the existing CPU
// pipeline. No visible behavior change.
//
// All allocations are lazy and idempotent. createCelPostProcessPipeline can
// be called repeatedly with the same renderer — it returns the existing
// pipeline if one matches. dispose tears everything down.

import * as THREE from 'three';
import { CEL_VERT_SHADER } from './celShader.vert.glsl.js';
import { CEL_FRAG_SHADER } from './celShader.frag.glsl.js';

// Stage 1: kept as a single module-level state slot. Stage 2 may move
// per-renderer state into a WeakMap if the panel ever drives more than one
// renderer simultaneously, but the current panel uses a single renderer ref.
let _pipeline = null;

// WebGL2 detection. Tested at flag-toggle time so the panel can hide the
// "GPU Cel" toggle on WebGL1-only clients (rare in 2026 — <3% of users).
// Defensive try/catch because some restrictive environments throw on
// context creation rather than returning null.
export function isWebGL2Supported() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

// Create (or return existing) post-process pipeline bound to a renderer.
// Idempotent: repeat calls with the same renderer return the same handle.
//
// Sets up:
//   - One float16 RGBA render target (cel-shaded color, MRT 0 in Stage 2+)
//   - Placeholder uniforms (real values bound at run time)
//   - Full-screen quad geometry (2-unit clip-space triangle pair)
//   - Orthographic camera for the post-process pass (clip-space only)
//   - ShaderMaterial wrapping the passthrough vert/frag shaders
//
// Stage 2 will add tNormalDepth (RGBA8) and tRegionId (R8) targets, plus the
// MRT setup on the main scene render so all three buffers populate in one
// draw pass.
export function createCelPostProcessPipeline(renderer) {
  if (!renderer) return null;
  if (_pipeline && _pipeline.renderer === renderer) return _pipeline;
  if (_pipeline) disposeCelPostProcessPipeline();

  const size = new THREE.Vector2();
  renderer.getSize(size);
  const pixelRatio = renderer.getPixelRatio();
  const targetW = Math.max(1, Math.floor(size.x * pixelRatio));
  const targetH = Math.max(1, Math.floor(size.y * pixelRatio));

  // float16 (HalfFloatType) per Q7: preserves linear-space precision through
  // the post-process math, avoiding the 8-bit banding the CPU pipeline hits
  // after every getImageData round-trip. Final write to canvas truncates to
  // 8-bit anyway, so end-to-end output matches `toDataURL` semantics.
  const colorTarget = new THREE.WebGLRenderTarget(targetW, targetH, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format:    THREE.RGBAFormat,
    type:      THREE.HalfFloatType,
    depthBuffer:   false,
    stencilBuffer: false,
  });

  const uniforms = {
    tInput:        { value: null },
    tNormalDepth:  { value: null },
    tRegionId:     { value: null },
    uResolution:   { value: new THREE.Vector2(targetW, targetH) },
    uPosterizeLv:  { value: 5 },
    uBilateralR:   { value: 3 },
    uBilateralSig: { value: 45 },
    uEdgeThresh:   { value: 90 },
    uEdgeBias:     { value: 1.0 },
    uExposure:     { value: 1.0 },
    uMonochrome:   { value: 0 },
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
  const scene    = new THREE.Scene();
  scene.add(quad);

  // Orthographic camera at z=1 looking toward -z. Only used to bind a
  // camera reference for renderer.render(); the vertex shader ignores
  // it (positions are already in clip space).
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  _pipeline = {
    renderer,
    colorTarget,
    uniforms,
    material,
    geometry,
    quad,
    scene,
    camera,
  };
  return _pipeline;
}

// Run the post-process pass. Stage 1 stub: does nothing and returns null.
// Caller (captureAndProcess in SPX3DTo2DPanel) treats null as "fall through
// to CPU pipeline."
//
// Stage 2 signature will be (srcRenderTarget, dstCanvas, params) where
// srcRenderTarget is the cel-shaded scene MRT and dstCanvas receives the
// post-processed output. Stage 1 keeps the same arg shape so the call site
// doesn't churn.
export function runCelPostProcess(_srcRenderTarget, _dstCanvas, _params) {
  if (!_pipeline) return null;
  // Stage 1: no-op. Stage 2 will bind the source target to tInput, set
  // per-style uniforms from params, render the full-screen quad to a
  // dstCanvas-sized output, and return the canvas.
  return null;
}

// Tear down GPU resources. Safe to call multiple times.
export function disposeCelPostProcessPipeline() {
  if (!_pipeline) return;
  _pipeline.colorTarget?.dispose();
  _pipeline.material?.dispose();
  _pipeline.geometry?.dispose();
  _pipeline = null;
}
