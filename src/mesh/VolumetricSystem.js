// VolumetricSystem.js — Fog, Smoke, Fire volumetric shaders
// Uses Three.js ShaderMaterial with ray-marching GLSL
import * as THREE from 'three';

// ── Volume types ──────────────────────────────────────────────────────────────
export const VOLUME_TYPES = {
  fog:   { label:'Fog',   icon:'🌫️' },
  smoke: { label:'Smoke', icon:'💨' },
  fire:  { label:'Fire',  icon:'🔥' },
  cloud: { label:'Cloud', icon:'☁️' },
  dust:  { label:'Dust',  icon:'🟤' },
};

// ── Shared ray-march vertex shader ────────────────────────────────────────────
const VERT = /* glsl */`
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  void main() {
    vLocalPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// ── Noise helper ──────────────────────────────────────────────────────────────
const NOISE_GLSL = /* glsl */`
  float hash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(
      mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
          mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
          mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p, int oct) {
    float v=0.0, a=0.5;
    for(int i=0;i<oct;i++){ v+=a*noise(p); p=p*2.0+vec3(1.7,9.2,3.4); a*=0.5; }
    return v;
  }
`;

// ── FOG fragment ──────────────────────────────────────────────────────────────
const FOG_FRAG = /* glsl */`
  ${NOISE_GLSL}
  uniform vec3  uColor;
  uniform float uDensity;
  uniform float uTime;
  uniform vec3  uCamPos;
  varying vec3  vLocalPos;
  varying vec3  vWorldPos;
  void main() {
    vec3 ro = uCamPos;
    vec3 rd = normalize(vWorldPos - uCamPos);
    float acc = 0.0;
    vec3 rp = vLocalPos;
    for(int i=0;i<32;i++) {
      float d = fbm(rp * 2.0 + uTime * 0.1, 3);
      acc += d * uDensity * 0.05;
      rp += rd * 0.05;
      if(acc > 1.0 || any(greaterThan(abs(rp), vec3(1.0)))) break;
    }
    acc = clamp(acc, 0.0, 1.0);
    gl_FragColor = vec4(uColor, acc * 0.6);
  }
`;

// ── SMOKE fragment ────────────────────────────────────────────────────────────
const SMOKE_FRAG = /* glsl */`
  ${NOISE_GLSL}
  uniform vec3  uColor;
  uniform float uDensity;
  uniform float uTime;
  uniform vec3  uCamPos;
  varying vec3  vLocalPos;
  varying vec3  vWorldPos;
  void main() {
    vec3 rd = normalize(vWorldPos - uCamPos);
    float acc = 0.0;
    vec3 rp = vLocalPos;
    for(int i=0;i<48;i++) {
      vec3 sp = rp + vec3(0.0, uTime * 0.15, 0.0);
      float d = fbm(sp * 1.5, 5);
      float h = rp.y * 0.5 + 0.5; // fade at top
      acc += d * uDensity * 0.04 * (1.0 - h * 0.5);
      rp += rd * 0.04;
      if(acc > 1.0 || any(greaterThan(abs(rp), vec3(1.1)))) break;
    }
    acc = clamp(acc, 0.0, 1.0);
    vec3 col = mix(vec3(0.1), uColor, acc);
    gl_FragColor = vec4(col, acc * 0.85);
  }
`;

// ── FIRE fragment ─────────────────────────────────────────────────────────────
const FIRE_FRAG = /* glsl */`
  ${NOISE_GLSL}
  uniform float uTime;
  uniform float uDensity;
  uniform vec3  uCamPos;
  varying vec3  vLocalPos;
  varying vec3  vWorldPos;
  void main() {
    vec3 rd = normalize(vWorldPos - uCamPos);
    float acc = 0.0;
    vec3 col  = vec3(0.0);
    vec3 rp   = vLocalPos;
    for(int i=0;i<48;i++) {
      vec3 fp = rp * 2.0 + vec3(0.0, -uTime * 0.8, 0.0);
      float fire = fbm(fp, 6);
      float h = 1.0 - (rp.y * 0.5 + 0.5); // hot at bottom
      fire *= h * h;
      float t = fire * uDensity;
      // Fire color gradient: black -> red -> orange -> yellow -> white
      vec3 fc = mix(vec3(0.0), vec3(1.0,0.1,0.0), smoothstep(0.0,0.3,fire));
      fc = mix(fc, vec3(1.0,0.5,0.0), smoothstep(0.3,0.6,fire));
      fc = mix(fc, vec3(1.0,0.9,0.3), smoothstep(0.6,0.8,fire));
      fc = mix(fc, vec3(1.0,1.0,0.9), smoothstep(0.8,1.0,fire));
      col  += fc * t * 0.1;
      acc  += t * 0.08;
      rp   += rd * 0.04;
      if(acc > 1.5 || any(greaterThan(abs(rp), vec3(1.1)))) break;
    }
    acc = clamp(acc, 0.0, 1.0);
    col = clamp(col, vec3(0.0), vec3(1.0));
    gl_FragColor = vec4(col, acc);
  }
`;

// ── CLOUD fragment ────────────────────────────────────────────────────────────
const CLOUD_FRAG = /* glsl */`
  ${NOISE_GLSL}
  uniform vec3  uColor;
  uniform float uDensity;
  uniform float uTime;
  uniform vec3  uCamPos;
  varying vec3  vLocalPos;
  varying vec3  vWorldPos;
  void main() {
    vec3 rd = normalize(vWorldPos - uCamPos);
    float acc = 0.0;
    vec3 rp = vLocalPos;
    for(int i=0;i<64;i++) {
      float d = fbm(rp * 3.0 + uTime * 0.02, 6);
      d = max(0.0, d - 0.4) * 1.8;
      acc += d * uDensity * 0.03;
      rp += rd * 0.03;
      if(acc > 1.0 || any(greaterThan(abs(rp), vec3(1.0)))) break;
    }
    acc = clamp(acc, 0.0, 1.0);
    vec3 col = mix(uColor, vec3(1.0), acc * 0.3);
    gl_FragColor = vec4(col, acc * 0.9);
  }
`;

const FRAGS = { fog: FOG_FRAG, smoke: SMOKE_FRAG, fire: FIRE_FRAG, cloud: CLOUD_FRAG, dust: FOG_FRAG };

// ── VolumeObject ──────────────────────────────────────────────────────────────
export class VolumeObject {
  constructor(type = 'fog', options = {}) {
    this.type    = type;
    this.options = options;
    this._time   = 0;
    this.mesh    = this._build();
  }

  _build() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAGS[this.type] ?? FOG_FRAG,
      uniforms: {
        uColor:   { value: new THREE.Color(this.options.color ?? 0xcccccc) },
        uDensity: { value: this.options.density ?? 1.0 },
        uTime:    { value: 0 },
        uCamPos:  { value: new THREE.Vector3() },
      },
      transparent: true,
      depthWrite:  false,
      side:        THREE.BackSide,
      blending:    this.type === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(
      this.options.width  ?? 4,
      this.options.height ?? 4,
      this.options.depth  ?? 4,
    );
    mesh.userData.volumeType = this.type;
    return mesh;
  }

  update(dt, camera) {
    this._time += dt;
    const u = this.mesh.material.uniforms;
    u.uTime.value   = this._time;
    u.uCamPos.value.copy(camera.position);
  }

  setDensity(v)  { this.mesh.material.uniforms.uDensity.value = v; }
  setColor(hex)  { this.mesh.material.uniforms.uColor.value.set(hex); }
  setScale(w,h,d){ this.mesh.scale.set(w,h,d); }

  addToScene(scene) { scene.add(this.mesh); }
  removeFromScene(scene) { scene.remove(this.mesh); }
  dispose() { this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

// ── VolumetricSystem ──────────────────────────────────────────────────────────
export class VolumetricSystem {
  constructor(scene, camera) {
    this.scene   = scene;
    this.camera  = camera;
    this.volumes = new Map();
  }

  add(id, type, options = {}) {
    if (this.volumes.has(id)) this.remove(id);
    const vol = new VolumeObject(type, options);
    if (options.position) vol.mesh.position.set(...options.position);
    vol.addToScene(this.scene);
    this.volumes.set(id, vol);
    return vol;
  }

  remove(id) {
    const vol = this.volumes.get(id);
    if (!vol) return;
    vol.removeFromScene(this.scene);
    vol.dispose();
    this.volumes.delete(id);
  }

  update(dt) {
    this.volumes.forEach(vol => vol.update(dt, this.camera));
  }

  get(id)     { return this.volumes.get(id); }
  list()      { return Array.from(this.volumes.keys()); }
  disposeAll(){ this.volumes.forEach((v,id) => this.remove(id)); }
}

export function createFog(scene, camera, options)   { const s = new VolumetricSystem(scene,camera); s.add('fog','fog',options); return s; }
export function createSmoke(scene, camera, options) { const s = new VolumetricSystem(scene,camera); s.add('smoke','smoke',options); return s; }
export function createFire(scene, camera, options)  { const s = new VolumetricSystem(scene,camera); s.add('fire','fire',options); return s; }

export default VolumetricSystem;
