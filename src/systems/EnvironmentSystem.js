import * as THREE from 'three';

/**
 * SPX EnvironmentSystem — HDRI + procedural sky + fog + ambient lighting
 * Sky modes: HDRI | Procedural (Rayleigh scattering) | Solid | Gradient
 */

// ── Procedural sky shader ────────────────────────────────────────────────────
const SKY_VERT = `
varying vec3 vWorldPos;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = `
uniform vec3 uSunDirection;
uniform vec3 uSkyColorZenith;
uniform vec3 uSkyColorHorizon;
uniform vec3 uSunColor;
uniform float uSunSize;
uniform float uTurbidity;
uniform float uRayleigh;
varying vec3 vWorldPos;

void main() {
  vec3 dir = normalize(vWorldPos);
  float sunDot = max(0.0, dot(dir, normalize(uSunDirection)));
  
  // Rayleigh sky gradient
  float horizon = pow(clamp(1.0 - dir.y, 0.0, 1.0), uRayleigh);
  vec3 sky = mix(uSkyColorZenith, uSkyColorHorizon, horizon);
  
  // Mie scattering (haze near sun)
  float mie = pow(sunDot, 32.0 / uTurbidity) * uTurbidity * 0.3;
  sky += uSkyColorHorizon * mie;
  
  // Sun disk
  float sun = pow(sunDot, 500.0 / max(uSunSize, 0.01));
  sky += uSunColor * sun;
  
  // Atmospheric extinction near horizon
  sky *= 1.0 - horizon * 0.4;
  
  gl_FragColor = vec4(sky, 1.0);
}`;

const ENV_PRESETS = {
  'Day Clear':     { sunEl: 60,  sunAz: 180, turbidity: 1.0, rayleigh: 2.0, fogNear: 100, fogFar: 600,  fogColor: '#c8d8f0', skyZenith: '#0a4a8c', skyHorizon: '#b8d4f0', sunColor: '#fff8e0', ambientInt: 1.0 },
  'Day Overcast':  { sunEl: 80,  sunAz: 200, turbidity: 4.0, rayleigh: 3.0, fogNear: 20,  fogFar: 200,  fogColor: '#b0b8c8', skyZenith: '#606878', skyHorizon: '#a8b0c0', sunColor: '#e0e0e0', ambientInt: 1.4 },
  'Sunset':        { sunEl: 5,   sunAz: 260, turbidity: 3.0, rayleigh: 4.0, fogNear: 30,  fogFar: 300,  fogColor: '#c87830', skyZenith: '#3a1a6a', skyHorizon: '#e06820', sunColor: '#ffb060', ambientInt: 0.8 },
  'Night':         { sunEl: -30, sunAz: 0,   turbidity: 0.5, rayleigh: 1.0, fogNear: 10,  fogFar: 150,  fogColor: '#050a18', skyZenith: '#000814', skyHorizon: '#0a1a38', sunColor: '#8090ff', ambientInt: 0.15 },
  'Foggy Morning': { sunEl: 15,  sunAz: 90,  turbidity: 5.0, rayleigh: 5.0, fogNear: 5,   fogFar: 80,   fogColor: '#c0c8d0', skyZenith: '#708090', skyHorizon: '#c8d0d8', sunColor: '#e8d8c0', ambientInt: 0.9 },
  'Studio':        { sunEl: 45,  sunAz: 135, turbidity: 1.0, rayleigh: 0.5, fogNear: 1000,fogFar: 5000, fogColor: '#060a0f', skyZenith: '#060a0f', skyHorizon: '#060a0f', sunColor: '#ffffff', ambientInt: 1.2 },
  'Alien World':   { sunEl: 30,  sunAz: 220, turbidity: 2.0, rayleigh: 2.5, fogNear: 50,  fogFar: 400,  fogColor: '#1a3020', skyZenith: '#0a1a08', skyHorizon: '#2a5030', sunColor: '#80ff60', ambientInt: 0.7 },
  'Arctic Tundra': { sunEl: 10,  sunAz: 180, turbidity: 1.5, rayleigh: 2.0, fogNear: 40,  fogFar: 500,  fogColor: '#d0dce8', skyZenith: '#6080a0', skyHorizon: '#c0d0e0', sunColor: '#ffe8d0', ambientInt: 1.1 },
};

export class EnvironmentSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this._skyMesh = null;
    this._sunLight = null;
    this._ambientLight = null;
    this._skyUniforms = null;
    this._group = new THREE.Group();
    this._group.name = 'EnvironmentSystem';
    this.preset = options.preset || 'Day Clear';

    // Current params
    this.params = { ...ENV_PRESETS[this.preset] };
    this._build();
  }

  _build() {
    // Sky dome
    const skyGeo = new THREE.SphereGeometry(900, 32, 32);
    this._skyUniforms = {
      uSunDirection:    { value: new THREE.Vector3(0, 1, 0) },
      uSkyColorZenith:  { value: new THREE.Color(this.params.skyZenith) },
      uSkyColorHorizon: { value: new THREE.Color(this.params.skyHorizon) },
      uSunColor:        { value: new THREE.Color(this.params.sunColor) },
      uSunSize:         { value: 1.0 },
      uTurbidity:       { value: this.params.turbidity },
      uRayleigh:        { value: this.params.rayleigh },
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this._skyUniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this._skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this._skyMesh.name = 'ProceduralSky';
    this._group.add(this._skyMesh);

    // Sun directional light
    this._sunLight = new THREE.DirectionalLight(this.params.sunColor, 1.0);
    this._sunLight.name = 'SunLight';
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.near = 0.5;
    this._sunLight.shadow.camera.far = 1000;
    this._sunLight.shadow.camera.left = -100;
    this._sunLight.shadow.camera.right = 100;
    this._sunLight.shadow.camera.top = 100;
    this._sunLight.shadow.camera.bottom = -100;
    this._group.add(this._sunLight);

    // Ambient
    this._ambientLight = new THREE.AmbientLight(0xffffff, this.params.ambientInt);
    this._ambientLight.name = 'AmbientLight';
    this._group.add(this._ambientLight);

    // Fog
    this.scene.fog = new THREE.Fog(this.params.fogColor, this.params.fogNear, this.params.fogFar);

    this._updateSunPosition();
  }

  _updateSunPosition() {
    const el = (this.params.sunEl * Math.PI) / 180;
    const az = (this.params.sunAz * Math.PI) / 180;
    const x = Math.cos(el) * Math.sin(az);
    const y = Math.sin(el);
    const z = Math.cos(el) * Math.cos(az);
    const dir = new THREE.Vector3(x, y, z).normalize();
    this._skyUniforms.uSunDirection.value.copy(dir);
    this._sunLight.position.copy(dir.multiplyScalar(200));
    this._sunLight.target.position.set(0, 0, 0);
  }

  applyPreset(name) {
    if (!ENV_PRESETS[name]) return;
    this.preset = name;
    Object.assign(this.params, ENV_PRESETS[name]);
    this.refresh();
  }

  refresh() {
    this._skyUniforms.uSkyColorZenith.value.set(this.params.skyZenith);
    this._skyUniforms.uSkyColorHorizon.value.set(this.params.skyHorizon);
    this._skyUniforms.uSunColor.value.set(this.params.sunColor);
    this._skyUniforms.uTurbidity.value = this.params.turbidity;
    this._skyUniforms.uRayleigh.value = this.params.rayleigh;
    this._sunLight.color.set(this.params.sunColor);
    this._ambientLight.intensity = this.params.ambientInt;
    this.scene.fog.color.set(this.params.fogColor);
    this.scene.fog.near = this.params.fogNear;
    this.scene.fog.far = this.params.fogFar;
    this._updateSunPosition();
  }

  // Individual setters
  setSunElevation(deg) { this.params.sunEl = deg; this._updateSunPosition(); }
  setSunAzimuth(deg) { this.params.sunAz = deg; this._updateSunPosition(); }
  setTurbidity(v) { this.params.turbidity = v; this._skyUniforms.uTurbidity.value = v; }
  setRayleigh(v) { this.params.rayleigh = v; this._skyUniforms.uRayleigh.value = v; }
  setFog(near, far, color) {
    this.params.fogNear = near; this.params.fogFar = far;
    if (color) this.params.fogColor = color;
    this.scene.fog.near = near; this.scene.fog.far = far;
    if (color) this.scene.fog.color.set(color);
  }
  setAmbientIntensity(v) { this.params.ambientInt = v; this._ambientLight.intensity = v; }
  setSkyColors(zenith, horizon) {
    this.params.skyZenith = zenith; this.params.skyHorizon = horizon;
    this._skyUniforms.uSkyColorZenith.value.set(zenith);
    this._skyUniforms.uSkyColorHorizon.value.set(horizon);
  }

  // Animate sun (time-of-day)
  setTimeOfDay(hours) {
    const deg = hours * 15 - 90;
    this.setSunElevation(Math.sin((deg * Math.PI) / 180) * 90);
    this.setSunAzimuth(180 + deg);
  }

  getGroup() { return this._group; }
  getSunLight() { return this._sunLight; }

  static PRESETS = Object.keys(ENV_PRESETS);
}

export default EnvironmentSystem;