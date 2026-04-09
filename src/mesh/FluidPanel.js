// FluidPanel.js — SPH Fluid Simulation
// SPX Mesh Editor | StreamPireX
// Smoothed Particle Hydrodynamics — real fluid behavior
// Features: pressure, viscosity, surface tension, vorticity, collision

import * as THREE from 'three';

const REST_DENSITY  = 1000;
const GAS_CONSTANT  = 2000;
const VISCOSITY     = 250;
const SURFACE_TENSION = 0.0728;
const GRAVITY       = new THREE.Vector3(0, -9.8, 0);

// ─── Particle ────────────────────────────────────────────────────────────────

export function createFluidParticle(position, options = {}) {
  return {
    position:  position.clone(),
    velocity:  options.velocity ?? new THREE.Vector3(),
    force:     new THREE.Vector3(),
    density:   REST_DENSITY,
    pressure:  0,
    mass:      options.mass ?? 0.02,
    radius:    options.radius ?? 0.1,
    color:     options.color ?? new THREE.Color(0.2, 0.5, 1.0),
    id:        Math.random().toString(36).slice(2),
  };
}

// ─── SPH Kernels ──────────────────────────────────────────────────────────────

function kernelPoly6(r, h) {
  if (r > h) return 0;
  const d = h*h - r*r;
  return (315 / (64 * Math.PI * Math.pow(h, 9))) * d * d * d;
}

function kernelSpiky(r, h) {
  if (r > h) return 0;
  return -(45 / (Math.PI * Math.pow(h, 6))) * Math.pow(h - r, 2);
}

function kernelViscosity(r, h) {
  if (r > h) return 0;
  return (45 / (Math.PI * Math.pow(h, 6))) * (h - r);
}

// ─── Fluid System ─────────────────────────────────────────────────────────────

export class FluidSystem {
  constructor(options = {}) {
    this.particles  = [];
    this.h          = options.smoothingRadius ?? 0.2;   // smoothing radius
    this.gravity    = options.gravity ?? GRAVITY.clone();
    this.viscosity  = options.viscosity ?? VISCOSITY;
    this.restDensity = options.restDensity ?? REST_DENSITY;
    this.gasConst   = options.gasConstant ?? GAS_CONSTANT;
    this.surfTension = options.surfaceTension ?? SURFACE_TENSION;
    this.colliders  = [];
    this.bounds     = options.bounds ?? { min: new THREE.Vector3(-2,-2,-2), max: new THREE.Vector3(2,2,2) };
    this.damping    = options.damping ?? 0.5;
    this.enabled    = true;
    this.subSteps   = options.subSteps ?? 3;
    this._grid      = new Map();
  }

  addParticle(position, options = {}) {
    const p = createFluidParticle(position, options);
    this.particles.push(p);
    return p;
  }

  spawnBox(min, max, count = 100, options = {}) {
    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        min.x + Math.random() * (max.x - min.x),
        min.y + Math.random() * (max.y - min.y),
        min.z + Math.random() * (max.z - min.z),
      );
      this.addParticle(pos, options);
    }
  }

  spawnSphere(center, radius, count = 200, options = {}) {
    let added = 0;
    while (added < count) {
      const p = new THREE.Vector3(
        (Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2
      ).normalize().multiplyScalar(radius * Math.cbrt(Math.random()));
      p.add(center);
      this.addParticle(p, options);
      added++;
    }
  }

  // Spatial hashing for neighbor search
  _hashCell(ix, iy, iz) { return `${ix},${iy},${iz}`; }
  _cellIdx(pos) {
    return [
      Math.floor(pos.x / this.h),
      Math.floor(pos.y / this.h),
      Math.floor(pos.z / this.h),
    ];
  }

  _buildGrid() {
    this._grid.clear();
    this.particles.forEach((p, i) => {
      const [ix, iy, iz] = this._cellIdx(p.position);
      const key = this._hashCell(ix, iy, iz);
      if (!this._grid.has(key)) this._grid.set(key, []);
      this._grid.get(key).push(i);
    });
  }

  _getNeighbors(p) {
    const [ix, iy, iz] = this._cellIdx(p.position);
    const neighbors = [];
    for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
    for (let dz = -1; dz <= 1; dz++) {
      const key = this._hashCell(ix+dx, iy+dy, iz+dz);
      const cell = this._grid.get(key);
      if (cell) neighbors.push(...cell);
    }
    return neighbors;
  }

  _computeDensityPressure() {
    this.particles.forEach(pi => {
      pi.density = 0;
      const neighbors = this._getNeighbors(pi);
      neighbors.forEach(j => {
        const pj = this.particles[j];
        const r = pi.position.distanceTo(pj.position);
        pi.density += pj.mass * kernelPoly6(r, this.h);
      });
      pi.density = Math.max(pi.density, this.restDensity * 0.01);
      pi.pressure = this.gasConst * (pi.density - this.restDensity);
    });
  }

  _computeForces() {
    this.particles.forEach(pi => {
      pi.force.set(0, 0, 0);
      const fPressure  = new THREE.Vector3();
      const fViscosity = new THREE.Vector3();
      const fSurface   = new THREE.Vector3();
      const neighbors  = this._getNeighbors(pi);

      neighbors.forEach(j => {
        const pj = this.particles[j];
        if (pi === pj) return;
        const diff = pi.position.clone().sub(pj.position);
        const r = diff.length();
        if (r < 0.0001 || r > this.h) return;

        const dir = diff.normalize();

        // Pressure force
        const pAvg = (pi.pressure + pj.pressure) / 2;
        fPressure.addScaledVector(dir, -pj.mass * pAvg / pj.density * kernelSpiky(r, this.h));

        // Viscosity force
        const velDiff = pj.velocity.clone().sub(pi.velocity);
        fViscosity.addScaledVector(velDiff, this.viscosity * pj.mass / pj.density * kernelViscosity(r, this.h));

        // Surface tension
        fSurface.addScaledVector(dir, -this.surfTension * kernelPoly6(r, this.h));
      });

      pi.force.add(fPressure).add(fViscosity).add(fSurface);
      // Gravity
      pi.force.addScaledVector(this.gravity, pi.mass);
    });
  }

  _integrate(dt) {
    this.particles.forEach(p => {
      p.velocity.addScaledVector(p.force, dt / p.mass);
      p.position.addScaledVector(p.velocity, dt);

      // Boundary collision
      ['x','y','z'].forEach(axis => {
        if (p.position[axis] < this.bounds.min[axis]) {
          p.position[axis] = this.bounds.min[axis];
          p.velocity[axis] *= -this.damping;
        }
        if (p.position[axis] > this.bounds.max[axis]) {
          p.position[axis] = this.bounds.max[axis];
          p.velocity[axis] *= -this.damping;
        }
      });

      // Colliders
      this.colliders.forEach(col => {
        if (col.type === 'sphere') {
          const d = p.position.clone().sub(col.center);
          const dist = d.length();
          if (dist < col.radius + p.radius) {
            p.position.copy(col.center).addScaledVector(d.normalize(), col.radius + p.radius);
            p.velocity.reflect(d.normalize()).multiplyScalar(this.damping);
          }
        }
      });
    });
  }

  step(dt = 1/60) {
    if (!this.enabled || !this.particles.length) return;
    const subDt = dt / this.subSteps;
    for (let i = 0; i < this.subSteps; i++) {
      this._buildGrid();
      this._computeDensityPressure();
      this._computeForces();
      this._integrate(subDt);
    }
  }

  addCollider(type, params) { this.colliders.push({ type, ...params }); }
  removeCollider(i) { this.colliders.splice(i, 1); }
  clear() { this.particles = []; }
  setGravity(v) { this.gravity.copy(v); }
  setEnabled(v) { this.enabled = v; }
  getParticleCount() { return this.particles.length; }

  buildPointCloud(scene) {
    const positions = new Float32Array(this.particles.length * 3);
    const colors    = new Float32Array(this.particles.length * 3);
    this.particles.forEach((p, i) => {
      positions[i*3]   = p.position.x;
      positions[i*3+1] = p.position.y;
      positions[i*3+2] = p.position.z;
      colors[i*3]   = p.color.r;
      colors[i*3+1] = p.color.g;
      colors[i*3+2] = p.color.b;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true });
    return new THREE.Points(geo, mat);
  }

  updatePointCloud(points) {
    const pos = points.geometry.attributes.position;
    this.particles.forEach((p, i) => {
      pos.setXYZ(i, p.position.x, p.position.y, p.position.z);
    });
    pos.needsUpdate = true;
  }
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export const FLUID_PRESETS = {
  water:   { viscosity: 250,  gasConstant: 2000, restDensity: 1000, surfaceTension: 0.0728, damping: 0.5 },
  honey:   { viscosity: 2000, gasConstant: 500,  restDensity: 1400, surfaceTension: 0.04,   damping: 0.3 },
  lava:    { viscosity: 5000, gasConstant: 300,  restDensity: 2200, surfaceTension: 0.02,   damping: 0.2 },
  mercury: { viscosity: 100,  gasConstant: 3000, restDensity: 13600,surfaceTension: 0.48,   damping: 0.7 },
  oil:     { viscosity: 800,  gasConstant: 1000, restDensity: 850,  surfaceTension: 0.03,   damping: 0.4 },
};

export function applyFluidPreset(system, type) {
  const p = FLUID_PRESETS[type];
  if (!p) return;
  Object.assign(system, p);
}

export default FluidSystem;
