// Full-screen quad vertex shader. Bound to a 2-unit clip-space quad
// (positions in [-1,1]) so a single triangle pair covers the whole
// viewport. vUv carries texture coordinates in [0,1] for the fragment.
//
// Stage 1: standard passthrough. No transformation matrices — the
// post-process pass is screen-space only, so we skip the modelView/
// projection chain entirely and emit position in clip space directly.
export const CEL_VERT_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;
