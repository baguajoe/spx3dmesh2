// Cel post-process fragment shader (Stage 2 — anime style only).
//
// Operates on two screen-space textures bound in runCelPostProcess:
//   tCelColor    — half-float RGBA, scene rendered with MeshToonMaterial
//                  cel materials (the same cel render the CPU pipeline
//                  reads from renderer.domElement).
//   tNormalDepth — RGBA8. RGB packs view-space normal (0..1 from -1..1
//                  via MeshNormalMaterial's default encoding). Alpha
//                  reserved for linear depth; currently constant 1.0
//                  because Stage 2 uses MeshNormalMaterial (no depth
//                  output). Depth-edge code reads alpha anyway so a
//                  Stage 2.5 swap to a custom normal+depth material
//                  enables it with no shader edit.
//
// Order (matches CPU pipeline operations from cel_pipeline_clarity_audit.md
// §5, but in one pass with no intermediate readbacks):
//   (a) sample tCelColor                              — base color
//   (b) 5×5 bilateral filter on tCelColor             — flatten gradient
//   (c) luminance posterize with ceil round-up        — cel bands
//   (d) 3×3 Sobel on tNormalDepth (normals + depth)   — find ink edges
//   (e) multiply (1 - edge)                           — 1-bit ink ink
//   (f) write to gl_FragColor
//
// Reserved uniforms tRegionId / uExposure / uMonochrome are bound by
// the driver but unused in Stage 2 — wired so Stages 3/4 don't need to
// edit the uniform setup.
export const CEL_FRAG_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D tCelColor;
  uniform sampler2D tNormalDepth;
  uniform sampler2D tRegionId;          // reserved (Stage 4)
  uniform vec2  uResolution;
  uniform float uPosterizeLevels;
  uniform float uBilateralSigmaSpace;
  uniform float uBilateralSigmaRange;
  uniform float uEdgeThreshold;
  uniform float uEdgeBias;
  uniform float uExposure;              // reserved
  uniform float uMonochrome;            // reserved

  float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  void main() {
    vec2 texel = 1.0 / uResolution;
    vec3 base  = texture2D(tCelColor, vUv).rgb;

    // (b) Bilateral 5×5. Spatial Gaussian × range Gaussian on luminance
    // distance. Skipped when sigmaSpace is ~0 — matches the CPU "skip
    // if radius=0" behavior and saves 25 texture fetches when bilateral
    // is disabled via UI.
    vec3 filtered = base;
    if (uBilateralSigmaSpace > 0.001) {
      float centerLum = luma(base);
      float sigmaS2   = 2.0 * uBilateralSigmaSpace * uBilateralSigmaSpace;
      float sigmaR2   = 2.0 * uBilateralSigmaRange * uBilateralSigmaRange;
      vec3  acc       = vec3(0.0);
      float wsum      = 0.0;
      for (int j = -2; j <= 2; j++) {
        for (int i = -2; i <= 2; i++) {
          vec2 offs = vec2(float(i), float(j));
          vec3 c    = texture2D(tCelColor, vUv + offs * texel).rgb;
          float dl  = luma(c) - centerLum;
          float wS  = exp(-dot(offs, offs) / sigmaS2);
          float wR  = exp(-(dl * dl) / sigmaR2);
          float w   = wS * wR;
          acc  += c * w;
          wsum += w;
        }
      }
      filtered = acc / max(wsum, 0.0001);
    }

    // (c) Posterize luminance with ceil round-up. Preserves chroma by
    // rescaling RGB to the new luminance — same approach as the CPU
    // posterizeLuminance at SPX3DTo2DPanel.jsx:991. ceil (not round) is
    // the audit's "worth preserving" point #3: biases mid-tones into
    // the next brighter band so skin doesn't crush.
    float lum  = luma(filtered);
    float lumQ = ceil(lum * uPosterizeLevels) / uPosterizeLevels;
    float scale = (lum > 0.001) ? (lumQ / lum) : 0.0;
    vec3  posterized = filtered * scale;

    // (d) Sobel on tNormalDepth. RGB carries view normal, A carries
    // linear depth (when written — see file header). 3×3 kernel sampled
    // around vUv. Each Sobel produces gx, gy vectors; combine via
    // length() for the normal channels, abs() for depth scalar.
    vec3 nTL = texture2D(tNormalDepth, vUv + texel * vec2(-1.0, -1.0)).rgb;
    vec3 nTC = texture2D(tNormalDepth, vUv + texel * vec2( 0.0, -1.0)).rgb;
    vec3 nTR = texture2D(tNormalDepth, vUv + texel * vec2( 1.0, -1.0)).rgb;
    vec3 nML = texture2D(tNormalDepth, vUv + texel * vec2(-1.0,  0.0)).rgb;
    vec3 nMR = texture2D(tNormalDepth, vUv + texel * vec2( 1.0,  0.0)).rgb;
    vec3 nBL = texture2D(tNormalDepth, vUv + texel * vec2(-1.0,  1.0)).rgb;
    vec3 nBC = texture2D(tNormalDepth, vUv + texel * vec2( 0.0,  1.0)).rgb;
    vec3 nBR = texture2D(tNormalDepth, vUv + texel * vec2( 1.0,  1.0)).rgb;
    vec3 gxN = (nTR + 2.0*nMR + nBR) - (nTL + 2.0*nML + nBL);
    vec3 gyN = (nBL + 2.0*nBC + nBR) - (nTL + 2.0*nTC + nTR);
    // Normalize: each channel in [0,1] so each Sobel component is in
    // [-4, 4]. length() of a vec3 with components in [-4,4] reaches
    // ~sqrt(48) ≈ 6.9; sum of two such reaches ~14. Divide by 8 to
    // map roughly into [0, ~1.75]. The 0.125 factor is /8.
    float normalEdge = (length(gxN) + length(gyN)) * 0.125 * uEdgeBias;

    float dTL = texture2D(tNormalDepth, vUv + texel * vec2(-1.0, -1.0)).a;
    float dTC = texture2D(tNormalDepth, vUv + texel * vec2( 0.0, -1.0)).a;
    float dTR = texture2D(tNormalDepth, vUv + texel * vec2( 1.0, -1.0)).a;
    float dML = texture2D(tNormalDepth, vUv + texel * vec2(-1.0,  0.0)).a;
    float dMR = texture2D(tNormalDepth, vUv + texel * vec2( 1.0,  0.0)).a;
    float dBL = texture2D(tNormalDepth, vUv + texel * vec2(-1.0,  1.0)).a;
    float dBC = texture2D(tNormalDepth, vUv + texel * vec2( 0.0,  1.0)).a;
    float dBR = texture2D(tNormalDepth, vUv + texel * vec2( 1.0,  1.0)).a;
    float gxD = (dTR + 2.0*dMR + dBR) - (dTL + 2.0*dML + dBL);
    float gyD = (dBL + 2.0*dBC + dBR) - (dTL + 2.0*dTC + dTR);
    // Depth alpha is constant 1.0 in Stage 2 (MeshNormalMaterial does
    // not write depth) → depthEdge ≡ 0. Code path kept so Stage 2.5
    // can swap in a custom normal+depth material with no shader edit.
    float depthEdge = (abs(gxD) + abs(gyD)) * 0.125 * uEdgeBias;

    float edgeMag = max(normalEdge, depthEdge);
    float edge    = step(uEdgeThreshold, edgeMag);

    // (e) Ink composite. Binary 0/255 behavior matches the CPU
    // makeLinePass+multiply chain — edges become pure black, non-edges
    // pass through unchanged.
    vec3 inked = posterized * (1.0 - edge);

    // (f) Write.
    gl_FragColor = vec4(inked, 1.0);
  }
`;
