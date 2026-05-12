// Cel post-process fragment shader.
//
// Stage 1: passthrough. Samples the input cel-shaded texture and writes
// it through unchanged. This exists to verify the render-target /
// full-screen-quad / readback plumbing before adding real cel logic.
//
// Stage 2 (next): replaces the body with bilateral + posterize + Sobel
// (sampled from a screen-space normal+depth buffer) + ink composite —
// all in this single fragment, full renderer resolution, zero CPU
// readbacks until the final canvas write.
//
// Uniforms used in Stage 1:
//   tInput        — cel-shaded source render target (MRT 0 in later stages)
//
// Reserved uniforms for Stage 2+ (declared but unused now so the
// post-process driver can bind them without errors during the
// migration):
//   tNormalDepth  — screen-space normal + linearDepth (MRT 1, RGBA8)
//   tRegionId     — per-pixel region tag (MRT 2, R8): 0=body, 1=face, 2=hair
//   uResolution   — viewport size in pixels
//   uPosterizeLv  — cel band count
//   uBilateralR   — bilateral radius (in pixels)
//   uBilateralSig — bilateral range sigma (in luminance units)
//   uEdgeThresh   — Sobel threshold above which a pixel becomes ink
//   uEdgeBias     — Sobel magnitude multiplier
//   uExposure     — post-posterize brightness multiplier
//   uMonochrome   — 0/1 toggle for manga desaturation
export const CEL_FRAG_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D tInput;
  uniform sampler2D tNormalDepth;
  uniform sampler2D tRegionId;
  uniform vec2  uResolution;
  uniform float uPosterizeLv;
  uniform float uBilateralR;
  uniform float uBilateralSig;
  uniform float uEdgeThresh;
  uniform float uEdgeBias;
  uniform float uExposure;
  uniform float uMonochrome;

  void main() {
    // Stage 1: passthrough.
    gl_FragColor = texture2D(tInput, vUv);
  }
`;
