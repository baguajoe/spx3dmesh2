// WeatherPanel.js — Weather & Atmosphere Simulation
// SPX Mesh Editor | StreamPireX
// Features: wind field, rain, snow, fog, lightning, storm system

import * as THREE from 'three';

// ─── Wind Field ───────────────────────────────────────────────────────────────

export class WindField {
  constructor(options = {}) {
    this.baseDirection = options.direction ?? new THREE.Vector3(1, 0, 0);
    this.baseStrength  = options.strength  ?? 5;
    this.turbulence    = options.turbulence ?? 0.3;
    this.gustStrength  = options.gustStrength ?? 8;
    this.gustFrequency = options.gustFrequency ?? 0.5;
    this.vortices      = [];
    this._time         = 0;
  }

  addVortex(center, radius, strength) {
    this.vortices.push({ center: center.clone(), radius, strength });
  }

  sample(position, time) {
    this._time = time ?? this._time;
    const t = this._time;

    // Base wind with turbulence
    const turb = new THREE.Vector3(
      Math.sin(position.x * 1.7 + t * 2.3) * Math.cos(position.z * 1.1 + t),
      Math.sin(position.y * 2.1 + t * 1.7) * 0.3,
      Math.cos(position.z * 1.9 + t * 2.1) * Math.sin(position.x * 1.3),
    ).multiplyScalar(this.turbulence);

    // Gust
    const gust = Math.max(0, Math.sin(t * this.gustFrequency * Math.PI * 2)) * this.gustStrength;

    const wind = this.baseDirection.clone()
      .multiplyScalar(this.baseStrength + gust)
      .add(turb);

    // Vortex contributions
    this.vortices.forEach(v => {
      const toPos = position.clone().sub(v.center);
      toPos.y = 0;
      const dist = toPos.length();
      if (dist < v.radius && dist > 0.001) {
        const tangent = new THREE.Vector3(-toPos.z, 0, toPos.x).normalize();
        const influence = (1 - dist / v.radius) * v.strength;
        wind.addScaledVector(tangent, influence);
      }
    });

    return wind;
  }

  update(dt) { this._time += dt; }
}

// ─── Precipitation Particle ───────────────────────────────────────────────────

function createPrecipParticle(type, bounds) {
  const x = bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x);
  const z = bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z);
  const y = bounds.max.y;
  return {
    position: new THREE.Vector3(x, y, z),
    velocity: new THREE.Vector3(0, type === 'snow' ? -0.5 : -8, 0),
    alive: true,
    type,
    size: type === 'snow' ? 0.02 + Math.random() * 0.03 : 0.003 + Math.random() * 0.002,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random()-0.5) * 2,
  };
}

// ─── Weather System ───────────────────────────────────────────────────────────

export class WeatherSystem {
  constructor(options = {}) {
    this.bounds = options.bounds ?? {
      min: new THREE.Vector3(-5, 0, -5),
      max: new THREE.Vector3(5, 10, 5),
    };
    this.windField    = new WindField(options.wind ?? {});
    this.particles    = [];
    this.maxParticles = options.maxParticles ?? 500;
    this.type         = options.type ?? 'clear'; // clear|rain|snow|storm|fog
    this.intensity    = options.intensity ?? 0.5; // 0-1
    this.fog          = { enabled: false, color: new THREE.Color(0.8, 0.8, 0.8), density: 0 };
    this.lightning    = { enabled: false, flashes: [], _nextFlash: 5 };
    this._time        = 0;
    this._spawnRate   = 0;
    this.enabled      = true;
    this._applyPreset(this.type);
  }

  _applyPreset(type) {
    switch (type) {
      case 'rain':
        this._spawnRate = 20 * this.intensity;
        this.windField.baseStrength = 3 * this.intensity;
        this.fog.density = 0.02 * this.intensity;
        break;
      case 'snow':
        this._spawnRate = 10 * this.intensity;
        this.windField.baseStrength = 1 * this.intensity;
        this.windField.turbulence = 0.5;
        this.fog.density = 0.01 * this.intensity;
        break;
      case 'storm':
        this._spawnRate = 40 * this.intensity;
        this.windField.baseStrength = 15 * this.intensity;
        this.windField.gustStrength = 25 * this.intensity;
        this.windField.turbulence = 0.8;
        this.fog.density = 0.04 * this.intensity;
        this.lightning.enabled = true;
        break;
      case 'fog':
        this._spawnRate = 0;
        this.fog.enabled = true;
        this.fog.density = 0.1 * this.intensity;
        break;
      default:
        this._spawnRate = 0;
        this.fog.density = 0;
    }
  }

  setType(type) { this.type = type; this._applyPreset(type); }
  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); this._applyPreset(this.type); }

  _spawnParticle() {
    if (this.particles.length >= this.maxParticles) return;
    const precip = ['rain','storm'].includes(this.type) ? 'rain' : 'snow';
    this.particles.push(createPrecipParticle(precip, this.bounds));
  }

  _updateLightning(dt) {
    if (!this.lightning.enabled) return;
    this.lightning._nextFlash -= dt;
    if (this.lightning._nextFlash <= 0) {
      this.lightning.flashes.push({ age: 0, duration: 0.1 + Math.random() * 0.2, intensity: 0.5 + Math.random() * 0.5 });
      this.lightning._nextFlash = 1 + Math.random() * 4 / this.intensity;
    }
    this.lightning.flashes = this.lightning.flashes.filter(f => {
      f.age += dt;
      return f.age < f.duration;
    });
  }

  step(dt = 1/60) {
    if (!this.enabled) return;
    this._time += dt;
    this.windField.update(dt);
    this._updateLightning(dt);

    // Spawn
    const toSpawn = Math.floor(this._spawnRate * dt);
    for (let i = 0; i < toSpawn; i++) this._spawnParticle();

    // Update particles
    this.particles.forEach(p => {
      const wind = this.windField.sample(p.position, this._time);
      const windInfluence = p.type === 'snow' ? 0.8 : 0.1;

      p.velocity.addScaledVector(wind, windInfluence * dt);
      if (p.type === 'snow') {
        p.velocity.x += (Math.random()-0.5) * 0.1;
        p.velocity.z += (Math.random()-0.5) * 0.1;
        p.rotation += p.rotSpeed * dt;
      }

      p.position.addScaledVector(p.velocity, dt);

      // Kill if out of bounds
      if (p.position.y < this.bounds.min.y ||
          p.position.x < this.bounds.min.x || p.position.x > this.bounds.max.x ||
          p.position.z < this.bounds.min.z || p.position.z > this.bounds.max.z) {
        p.alive = false;
      }
    });

    this.particles = this.particles.filter(p => p.alive);
  }

  applyToObject(obj, dt) {
    if (!obj?.position) return;
    const wind = this.windField.sample(obj.position, this._time);
    return wind;
  }

  getFogDensity() { return this.fog.density; }
  getLightningIntensity() {
    if (!this.lightning.flashes.length) return 0;
    return Math.max(...this.lightning.flashes.map(f => f.intensity * (1 - f.age / f.duration)));
  }

  buildParticleGeometry() {
    const positions = new Float32Array(this.particles.length * 3);
    this.particles.forEach((p, i) => {
      positions[i*3] = p.position.x;
      positions[i*3+1] = p.position.y;
      positions[i*3+2] = p.position.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }

  updateParticleGeometry(geo) {
    const pos = geo.attributes.position;
    if (!pos || pos.count !== this.particles.length) return false;
    this.particles.forEach((p, i) => pos.setXYZ(i, p.position.x, p.position.y, p.position.z));
    pos.needsUpdate = true;
    return true;
  }

  dispose() { this.particles = []; }
}

export const WEATHER_PRESETS = ['clear','rain','snow','storm','fog'];

export default WeatherSystem;
