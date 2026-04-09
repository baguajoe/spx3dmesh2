import * as THREE from "three";

// ── Render target helpers ─────────────────────────────────────────────────────
export function createRenderTarget(width, height, options = {}) {
  return new THREE.WebGLRenderTarget(width, height, {
    minFilter:    THREE.LinearFilter,
    magFilter:    THREE.LinearFilter,
    format:       THREE.RGBAFormat,
    type:         options.float ? THREE.FloatType : THREE.UnsignedByteType,
    depthBuffer:  options.depth !== false,
    stencilBuffer:false,
  });
}

// ── SSAO ──────────────────────────────────────────────────────────────────────
const ssaoFragShader = `
uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2      resolution;
uniform float     radius;
uniform float     bias;
uniform float     intensity;
uniform mat4      projMatrix;
uniform mat4      invProjMatrix;

varying vec2 vUv;

const int SAMPLES = 16;
vec3 kernel[SAMPLES];

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

vec3 getViewPos(vec2 uv) {
  float depth = texture2D(tDepth, uv).r * 2.0 - 1.0;
  vec4  ndc   = vec4(uv * 2.0 - 1.0, depth, 1.0);
  vec4  view  = invProjMatrix * ndc;
  return view.xyz / view.w;
}

void main() {
  vec3  viewPos  = getViewPos(vUv);
  vec3  normal   = normalize(texture2D(tNormal, vUv).rgb * 2.0 - 1.0);
  float noise    = rand(vUv * resolution);
  float occlusion = 0.0;

  for (int i = 0; i < SAMPLES; i++) {
    float fi    = float(i);
    vec3  sample = vec3(
      rand(vUv + vec2(fi * 0.1, 0.0)) * 2.0 - 1.0,
      rand(vUv + vec2(0.0, fi * 0.1)) * 2.0 - 1.0,
      rand(vUv + vec2(fi * 0.07, fi * 0.13))
    );
    sample = normalize(sample) * (0.1 + rand(vUv + vec2(fi)) * 0.9);
    sample = sample * radius + viewPos;

    vec4 offset = projMatrix * vec4(sample, 1.0);
    offset.xyz /= offset.w;
    offset.xyz = offset.xyz * 0.5 + 0.5;

    float sampleDepth = getViewPos(offset.xy).z;
    float rangeCheck  = smoothstep(0.0, 1.0, radius / abs(viewPos.z - sampleDepth));
    occlusion += (sampleDepth >= sample.z + bias ? 1.0 : 0.0) * rangeCheck;
  }

  occlusion = 1.0 - (occlusion / float(SAMPLES)) * intensity;
  gl_FragColor = vec4(vec3(occlusion), 1.0);
}
`;

const fullscreenVertShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position * 2.0 - 1.0, 1.0);
}
`;

export function createSSAOPass(width, height) {
  const target  = createRenderTarget(width, height);
  const mat     = new THREE.ShaderMaterial({
    vertexShader:   fullscreenVertShader,
    fragmentShader: ssaoFragShader,
    uniforms: {
      tDepth:       { value: null },
      tNormal:      { value: null },
      resolution:   { value: new THREE.Vector2(width, height) },
      radius:       { value: 0.5 },
      bias:         { value: 0.025 },
      intensity:    { value: 1.5 },
      projMatrix:   { value: new THREE.Matrix4() },
      invProjMatrix:{ value: new THREE.Matrix4() },
    },
  });
  return { target, material: mat, enabled: true };
}

// ── Bloom ─────────────────────────────────────────────────────────────────────
const bloomThresholdFrag = `
uniform sampler2D tDiffuse;
uniform float threshold;
varying vec2 vUv;

void main() {
  vec4  color  = texture2D(tDiffuse, vUv);
  float bright = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = bright > threshold ? color : vec4(0.0, 0.0, 0.0, 1.0);
}
`;

const blurFrag = `
uniform sampler2D tDiffuse;
uniform vec2      direction;
uniform vec2      resolution;
varying vec2 vUv;

void main() {
  vec2  off1 = vec2(1.3846153846) * direction / resolution;
  vec2  off2 = vec2(3.2307692308) * direction / resolution;
  vec4  color = texture2D(tDiffuse, vUv) * 0.2270270270;
  color += texture2D(tDiffuse, vUv + off1) * 0.3162162162;
  color += texture2D(tDiffuse, vUv - off1) * 0.3162162162;
  color += texture2D(tDiffuse, vUv + off2) * 0.0702702703;
  color += texture2D(tDiffuse, vUv - off2) * 0.0702702703;
  gl_FragColor = color;
}
`;

const bloomCompositeFrag = `
uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform float strength;
varying vec2 vUv;

void main() {
  vec4 base  = texture2D(tDiffuse, vUv);
  vec4 bloom = texture2D(tBloom, vUv);
  gl_FragColor = base + bloom * strength;
}
`;

export function createBloomPass(width, height, options = {}) {
  const targetA  = createRenderTarget(width/2, height/2);
  const targetB  = createRenderTarget(width/2, height/2);
  const threshold = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertShader, fragmentShader: bloomThresholdFrag,
    uniforms: { tDiffuse: { value: null }, threshold: { value: options.threshold || 0.8 } },
  });
  const blurH = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertShader, fragmentShader: blurFrag,
    uniforms: { tDiffuse: { value: null }, direction: { value: new THREE.Vector2(1,0) }, resolution: { value: new THREE.Vector2(width/2, height/2) } },
  });
  const blurV = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertShader, fragmentShader: blurFrag,
    uniforms: { tDiffuse: { value: null }, direction: { value: new THREE.Vector2(0,1) }, resolution: { value: new THREE.Vector2(width/2, height/2) } },
  });
  const composite = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertShader, fragmentShader: bloomCompositeFrag,
    uniforms: { tDiffuse: { value: null }, tBloom: { value: null }, strength: { value: options.strength || 0.5 } },
  });
  return { targetA, targetB, threshold, blurH, blurV, composite, enabled: true };
}

// ── DOF ───────────────────────────────────────────────────────────────────────
const dofFrag = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float     focusDepth;
uniform float     aperture;
uniform float     maxBlur;
uniform vec2      resolution;
varying vec2 vUv;

void main() {
  float depth  = texture2D(tDepth, vUv).r;
  float coc    = abs(depth - focusDepth) * aperture;
  coc          = clamp(coc, 0.0, maxBlur);

  vec4  color  = vec4(0.0);
  float total  = 0.0;
  int   samples = 16;

  for (int i = 0; i < samples; i++) {
    float angle = float(i) / float(samples) * 6.28318;
    vec2  offset = vec2(cos(angle), sin(angle)) * coc / resolution;
    color += texture2D(tDiffuse, vUv + offset);
    total += 1.0;
  }
  gl_FragColor = color / total;
}
`;

export function createDOFPass(width, height, options = {}) {
  const target = createRenderTarget(width, height);
  const mat    = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertShader, fragmentShader: dofFrag,
    uniforms: {
      tDiffuse:   { value: null },
      tDepth:     { value: null },
      focusDepth: { value: options.focusDepth || 0.5 },
      aperture:   { value: options.aperture   || 0.025 },
      maxBlur:    { value: options.maxBlur    || 0.01  },
      resolution: { value: new THREE.Vector2(width, height) },
    },
  });
  return { target, material: mat, enabled: false };
}

// ── Chromatic Aberration ──────────────────────────────────────────────────────
const chromaticFrag = `
uniform sampler2D tDiffuse;
uniform float     intensity;
uniform vec2      resolution;
varying vec2 vUv;

void main() {
  vec2 center = vUv - 0.5;
  float dist  = length(center);
  vec2  offset = center * dist * intensity / resolution;
  float r = texture2D(tDiffuse, vUv + offset).r;
  float g = texture2D(tDiffuse, vUv).g;
  float b = texture2D(tDiffuse, vUv - offset).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}
`;

export function createChromaticAberrationPass(width, height, options = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: fullscreenVertShader, fragmentShader: chromaticFrag,
    uniforms: {
      tDiffuse:   { value: null },
      intensity:  { value: options.intensity || 0.005 },
      resolution: { value: new THREE.Vector2(width, height) },
    },
  });
}

// ── Post pass manager ─────────────────────────────────────────────────────────
export function createPostPassManager(renderer, width, height) {
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial()
  );
  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  scene.add(quad);

  return {
    renderer, quad, scene, camera,
    width, height,
    passes: {
      ssao:  createSSAOPass(width, height),
      bloom: createBloomPass(width, height),
      dof:   createDOFPass(width, height),
      chromatic: createChromaticAberrationPass(width, height),
    },
    mainTarget: createRenderTarget(width, height),

    render(material) {
      quad.material = material;
      renderer.render(scene, camera);
    },

    dispose() {
      Object.values(passes).forEach(p => {
        p.target?.dispose();
        p.targetA?.dispose();
        p.targetB?.dispose();
      });
    },
  };
}
