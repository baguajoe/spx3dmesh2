import * as THREE from "three";

// ── Anisotropic Hair Shader ───────────────────────────────────────────────────
const hairVertexShader = `
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vViewDir;
varying vec2 vUv;
varying float vDepth;

attribute vec3 tangent;

void main() {
  vUv       = uv;
  vNormal   = normalize(normalMatrix * normal);
  vTangent  = normalize(normalMatrix * tangent);
  vec4 mvPos= modelViewMatrix * vec4(position, 1.0);
  vViewDir  = normalize(-mvPos.xyz);
  vDepth    = -mvPos.z;
  gl_Position = projectionMatrix * mvPos;
}
`;

const hairFragmentShader = `
uniform vec3  rootColor;
uniform vec3  tipColor;
uniform vec3  specColor1;
uniform vec3  specColor2;
uniform float specShift1;
uniform float specShift2;
uniform float specExp1;
uniform float specExp2;
uniform vec3  lightDir;
uniform float roughness;
uniform float opacity;

varying vec3  vNormal;
varying vec3  vTangent;
varying vec3  vViewDir;
varying vec2  vUv;
varying float vDepth;

float strandSpecular(vec3 T, vec3 V, vec3 L, float exp) {
  vec3  H    = normalize(L + V);
  float dotTH = dot(T, H);
  float sinTH = sqrt(max(0.0, 1.0 - dotTH * dotTH));
  float dirAtt = smoothstep(-1.0, 0.0, dot(T, H));
  return dirAtt * pow(sinTH, exp);
}

void main() {
  vec3  color   = mix(rootColor, tipColor, vUv.y);
  vec3  T       = normalize(vTangent + vNormal * specShift1);
  vec3  T2      = normalize(vTangent + vNormal * specShift2);
  float diffuse = max(0.0, dot(vNormal, lightDir));
  float spec1   = strandSpecular(T,  vViewDir, lightDir, specExp1);
  float spec2   = strandSpecular(T2, vViewDir, lightDir, specExp2);
  vec3  result  = color * diffuse
                + specColor1 * spec1 * 0.5
                + specColor2 * spec2 * 0.3;
  result = mix(result, color, roughness * 0.5);
  gl_FragColor  = vec4(result, opacity);
}
`;

export function createHairShaderMaterial(options = {}) {
  return new THREE.ShaderMaterial({
    vertexShader:   hairVertexShader,
    fragmentShader: hairFragmentShader,
    uniforms: {
      rootColor:  { value: new THREE.Color(options.rootColor  || "#2a1a0a") },
      tipColor:   { value: new THREE.Color(options.tipColor   || "#8b6040") },
      specColor1: { value: new THREE.Color(options.specColor1 || "#ffffff") },
      specColor2: { value: new THREE.Color(options.specColor2 || "#ffeecc") },
      specShift1: { value: options.specShift1 || -0.1 },
      specShift2: { value: options.specShift2 ||  0.1 },
      specExp1:   { value: options.specExp1   || 128  },
      specExp2:   { value: options.specExp2   ||  64  },
      lightDir:   { value: new THREE.Vector3(0.5, 1.0, 0.5).normalize() },
      roughness:  { value: options.roughness  || 0.7  },
      opacity:    { value: options.opacity    || 1.0  },
    },
    transparent: true,
    side: THREE.DoubleSide,
  });
}

// ── Toon / NPR Shader ─────────────────────────────────────────────────────────
const toonVertexShader = `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
varying float vEdge;

void main() {
  vUv     = uv;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vNormal   = normalize(normalMatrix * normal);
  vViewDir  = normalize(-mvPos.xyz);
  vEdge     = abs(dot(vNormal, normalize(vViewDir)));
  gl_Position = projectionMatrix * mvPos;
}
`;

const toonFragmentShader = `
uniform vec3  color;
uniform vec3  shadowColor;
uniform vec3  edgeColor;
uniform float edgeThreshold;
uniform float steps;
uniform vec3  lightDir;
uniform float rimStrength;

varying vec3  vNormal;
varying vec3  vViewDir;
varying vec2  vUv;
varying float vEdge;

void main() {
  // Outline
  if (vEdge < edgeThreshold) {
    gl_FragColor = vec4(edgeColor, 1.0);
    return;
  }

  // Stepped diffuse
  float diff    = max(0.0, dot(vNormal, lightDir));
  float stepped = floor(diff * steps) / steps;

  // Rim light
  float rim     = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 3.0) * rimStrength;

  vec3  result  = mix(shadowColor, color, stepped) + vec3(rim);
  gl_FragColor  = vec4(result, 1.0);
}
`;

export function createToonMaterial(options = {}) {
  return new THREE.ShaderMaterial({
    vertexShader:   toonVertexShader,
    fragmentShader: toonFragmentShader,
    uniforms: {
      color:         { value: new THREE.Color(options.color        || "#00ffc8") },
      shadowColor:   { value: new THREE.Color(options.shadowColor  || "#006644") },
      edgeColor:     { value: new THREE.Color(options.edgeColor    || "#000000") },
      edgeThreshold: { value: options.edgeThreshold || 0.3  },
      steps:         { value: options.steps         || 3.0  },
      lightDir:      { value: new THREE.Vector3(0.5,1,0.5).normalize() },
      rimStrength:   { value: options.rimStrength   || 0.4  },
    },
    side: THREE.FrontSide,
  });
}

// ── PBR + IBL Shader ──────────────────────────────────────────────────────────
const pbrVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying vec3 vViewDir;

void main() {
  vUv      = uv;
  vec4 wp  = modelMatrix * vec4(position, 1.0);
  vWorldPos= wp.xyz;
  vNormal  = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const pbrFragmentShader = `
uniform vec3  albedo;
uniform float metalness;
uniform float roughness;
uniform vec3  lightPos;
uniform vec3  lightColor;
uniform vec3  ambientColor;
uniform samplerCube envMap;
uniform float envMapIntensity;
uniform float aoStrength;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying vec3 vViewDir;

const float PI = 3.14159265;

float DistributionGGX(vec3 N, vec3 H, float rough) {
  float a  = rough * rough;
  float a2 = a * a;
  float NdH = max(dot(N,H), 0.0);
  float denom = NdH*NdH*(a2-1.0)+1.0;
  return a2 / (PI * denom * denom);
}

float GeometrySchlick(float NdV, float rough) {
  float r = rough + 1.0;
  float k = (r*r) / 8.0;
  return NdV / (NdV*(1.0-k)+k);
}

vec3 FresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0-F0) * pow(clamp(1.0-cosTheta,0.0,1.0), 5.0);
}

void main() {
  vec3  N   = normalize(vNormal);
  vec3  V   = normalize(vViewDir);
  vec3  L   = normalize(lightPos - vWorldPos);
  vec3  H   = normalize(V + L);

  vec3  F0  = mix(vec3(0.04), albedo, metalness);
  float NdL = max(dot(N,L), 0.0);
  float NdV = max(dot(N,V), 0.0);

  float D   = DistributionGGX(N, H, roughness);
  float G   = GeometrySchlick(NdV, roughness) * GeometrySchlick(NdL, roughness);
  vec3  F   = FresnelSchlick(max(dot(H,V),0.0), F0);

  vec3  num   = D * G * F;
  float denom = 4.0 * NdV * NdL + 0.0001;
  vec3  spec  = num / denom;

  vec3  kD    = (1.0 - F) * (1.0 - metalness);
  vec3  diff  = kD * albedo / PI;

  vec3  radiance = lightColor * NdL;
  vec3  direct   = (diff + spec) * radiance;

  // IBL ambient
  vec3  refl    = reflect(-V, N);
  vec3  envSample = textureCube(envMap, refl).rgb * envMapIntensity;
  vec3  ambient  = ambientColor * albedo + envSample * F * (1.0 - roughness);

  gl_FragColor = vec4(direct + ambient, 1.0);
}
`;

export function createPBRShaderMaterial(options = {}) {
  return new THREE.ShaderMaterial({
    vertexShader:   pbrVertexShader,
    fragmentShader: pbrFragmentShader,
    uniforms: {
      albedo:          { value: new THREE.Color(options.albedo || "#ffffff") },
      metalness:       { value: options.metalness       || 0.0 },
      roughness:       { value: options.roughness       || 0.5 },
      lightPos:        { value: options.lightPos        || new THREE.Vector3(5,10,5) },
      lightColor:      { value: new THREE.Color(options.lightColor || "#ffffff") },
      ambientColor:    { value: new THREE.Color(options.ambientColor || "#222222") },
      envMap:          { value: options.envMap          || null },
      envMapIntensity: { value: options.envMapIntensity || 1.0 },
      aoStrength:      { value: options.aoStrength      || 1.0 },
    },
  });
}

// ── Outline / Silhouette shader ───────────────────────────────────────────────
const outlineVertexShader = `
uniform float outlineWidth;
void main() {
  vec3 pos = position + normal * outlineWidth;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const outlineFragmentShader = `
uniform vec3 outlineColor;
void main() {
  gl_FragColor = vec4(outlineColor, 1.0);
}
`;

export function createOutlineMaterial(options = {}) {
  return new THREE.ShaderMaterial({
    vertexShader:   outlineVertexShader,
    fragmentShader: outlineFragmentShader,
    uniforms: {
      outlineWidth: { value: options.width || 0.02 },
      outlineColor: { value: new THREE.Color(options.color || "#000000") },
    },
    side: THREE.BackSide,
  });
}

// ── Add outline pass to mesh ──────────────────────────────────────────────────
export function addOutlineToMesh(mesh, scene, options = {}) {
  const outline = new THREE.Mesh(mesh.geometry, createOutlineMaterial(options));
  outline.name  = mesh.name + "_outline";
  outline.renderOrder = mesh.renderOrder - 1;
  scene.add(outline);
  return outline;
}

// ── Holographic shader ────────────────────────────────────────────────────────
const holoVertexShader = `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
uniform float time;

void main() {
  vUv     = uv;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vNormal   = normalize(normalMatrix * normal);
  vViewDir  = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}
`;

const holoFragmentShader = `
uniform vec3  color;
uniform float time;
uniform float scanSpeed;
uniform float glitchIntensity;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 2.0);

  // Scan lines
  float scan = sin(vUv.y * 80.0 - time * scanSpeed) * 0.5 + 0.5;
  scan = smoothstep(0.4, 0.6, scan);

  // Glitch
  float glitch = rand(vec2(floor(vUv.y * 20.0), floor(time * 10.0)));
  float glitchLine = step(0.98, glitch) * glitchIntensity;

  float alpha = (fresnel * 0.6 + scan * 0.3 + 0.1) * (1.0 - glitchLine);
  vec3  result = color * (fresnel + scan * 0.5);
  gl_FragColor = vec4(result, alpha * 0.8);
}
`;

export function createHolographicMaterial(options = {}) {
  return new THREE.ShaderMaterial({
    vertexShader:   holoVertexShader,
    fragmentShader: holoFragmentShader,
    uniforms: {
      color:          { value: new THREE.Color(options.color || "#00ffc8") },
      time:           { value: 0.0 },
      scanSpeed:      { value: options.scanSpeed      || 3.0 },
      glitchIntensity:{ value: options.glitchIntensity|| 0.5 },
    },
    transparent: true,
    depthWrite:  false,
    side: THREE.DoubleSide,
  });
}

export function updateHolographicTime(material, time) {
  if (material.uniforms?.time) material.uniforms.time.value = time;
}

// ── Dissolve shader ───────────────────────────────────────────────────────────
const dissolveFragmentShader = `
uniform vec3  color;
uniform float dissolve;
uniform vec3  edgeColor;
uniform float edgeWidth;

varying vec2 vUv;
varying vec3 vNormal;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = rand(i), b = rand(i+vec2(1,0)), c = rand(i+vec2(0,1)), d = rand(i+vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}

void main() {
  float n = noise(vUv * 8.0);
  if (n < dissolve) discard;
  float edge = smoothstep(dissolve, dissolve + edgeWidth, n);
  vec3  result = mix(edgeColor, color, edge);
  gl_FragColor = vec4(result, 1.0);
}
`;

export function createDissolveMaterial(options = {}) {
  return new THREE.ShaderMaterial({
    vertexShader:   toonVertexShader, // reuse basic vertex
    fragmentShader: dissolveFragmentShader,
    uniforms: {
      color:     { value: new THREE.Color(options.color     || "#00ffc8") },
      dissolve:  { value: options.dissolve  || 0.0 },
      edgeColor: { value: new THREE.Color(options.edgeColor || "#FF6600") },
      edgeWidth: { value: options.edgeWidth || 0.05 },
      lightDir:  { value: new THREE.Vector3(0.5,1,0.5).normalize() },
      rimStrength:{ value: 0 },
      steps:     { value: 3 },
      shadowColor:{ value: new THREE.Color("#000") },
      edgeThreshold:{ value: 0 },
    },
    transparent: true,
    side: THREE.DoubleSide,
  });
}

export function setDissolveAmount(material, amount) {
  if (material.uniforms?.dissolve) material.uniforms.dissolve.value = Math.max(0, Math.min(1, amount));
}

// ── Shader preset registry ────────────────────────────────────────────────────
export const SHADER_PRESETS = {
  hair:        { label:"Anisotropic Hair", create: createHairShaderMaterial,  icon:"💇" },
  toon:        { label:"Toon/NPR",         create: createToonMaterial,         icon:"🎨" },
  pbr:         { label:"Custom PBR",       create: createPBRShaderMaterial,    icon:"⚪" },
  holographic: { label:"Holographic",      create: createHolographicMaterial,  icon:"🔮" },
  dissolve:    { label:"Dissolve",         create: createDissolveMaterial,     icon:"💨" },
  outline:     { label:"Outline",          create: createOutlineMaterial,      icon:"⬡" },
};

export function applyShaderPreset(mesh, presetKey, options = {}) {
  const preset = SHADER_PRESETS[presetKey];
  if (!preset || !mesh) return null;
  const mat = preset.create(options);
  mesh.material = mat;
  return mat;
}
