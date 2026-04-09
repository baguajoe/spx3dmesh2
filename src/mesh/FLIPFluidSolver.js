// FLIPFluidSolver.js — FLIP Fluid Solver
// SPX Mesh Editor | StreamPireX
// FLIP (Fluid-Implicit-Particle) — handles large scale better than SPH
// Features: MAC grid, particle-to-grid transfer, pressure solve,
//           grid-to-particle transfer, surface reconstruction, foam/spray

import * as THREE from 'three';

// ─── MAC Grid ─────────────────────────────────────────────────────────────────

class MACGrid {
  constructor(nx, ny, nz, cellSize) {
    this.nx = nx; this.ny = ny; this.nz = nz;
    this.cellSize = cellSize;
    this.u  = new Float32Array((nx+1)*ny*nz).fill(0);   // x-face velocities
    this.v  = new Float32Array(nx*(ny+1)*nz).fill(0);   // y-face velocities
    this.w  = new Float32Array(nx*ny*(nz+1)).fill(0);   // z-face velocities
    this.p  = new Float32Array(nx*ny*nz).fill(0);        // pressure
    this.d  = new Float32Array(nx*ny*nz).fill(0);        // divergence
    this.type = new Uint8Array(nx*ny*nz).fill(0);       // 0=air, 1=fluid, 2=solid
  }

  idx(x,y,z) { return z*this.ny*this.nx + y*this.nx + x; }
  uIdx(x,y,z) { return z*this.ny*(this.nx+1) + y*(this.nx+1) + x; }
  vIdx(x,y,z) { return z*(this.ny+1)*this.nx + y*this.nx + x; }
  wIdx(x,y,z) { return z*this.ny*this.nx + y*this.nx + x; }

  clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  sampleU(x,y,z) {
    const xi = this.clamp(Math.floor(x), 0, this.nx);
    const yi = this.clamp(Math.floor(y-0.5), 0, this.ny-1);
    const zi = this.clamp(Math.floor(z-0.5), 0, this.nz-1);
    return this.u[this.uIdx(xi,yi,zi)];
  }
  sampleV(x,y,z) {
    const xi = this.clamp(Math.floor(x-0.5), 0, this.nx-1);
    const yi = this.clamp(Math.floor(y), 0, this.ny);
    const zi = this.clamp(Math.floor(z-0.5), 0, this.nz-1);
    return this.v[this.vIdx(xi,yi,zi)];
  }
  sampleW(x,y,z) {
    const xi = this.clamp(Math.floor(x-0.5), 0, this.nx-1);
    const yi = this.clamp(Math.floor(y-0.5), 0, this.ny-1);
    const zi = this.clamp(Math.floor(z), 0, this.nz);
    return this.w[this.wIdx(xi,yi,zi)];
  }

  velocityAt(x,y,z) {
    return new THREE.Vector3(this.sampleU(x,y,z), this.sampleV(x,y,z), this.sampleW(x,y,z));
  }

  clearVelocities() { this.u.fill(0); this.v.fill(0); this.w.fill(0); }
  clearPressure()   { this.p.fill(0); this.d.fill(0); }
}

// ─── FLIP Particle ────────────────────────────────────────────────────────────

export function createFLIPParticle(position, velocity, options = {}) {
  return {
    position: position.clone(),
    velocity: velocity?.clone() ?? new THREE.Vector3(),
    mass:     options.mass     ?? 1,
    radius:   options.radius   ?? 0.05,
    phase:    options.phase    ?? 0,   // 0=fluid, 1=foam, 2=spray, 3=bubble
    age:      0,
    alive:    true,
  };
}

// ─── FLIP Fluid Solver ────────────────────────────────────────────────────────

export class FLIPFluidSolver {
  constructor(options = {}) {
    this.cellSize   = options.cellSize   ?? 0.1;
    this.gravity    = options.gravity    ?? new THREE.Vector3(0, -9.8, 0);
    this.flipRatio  = options.flipRatio  ?? 0.95; // FLIP/PIC blend: 1=full FLIP, 0=full PIC
    this.viscosity  = options.viscosity  ?? 0;
    this.density    = options.density    ?? 1000;
    this.particles  = [];
    this.bounds     = options.bounds ?? {
      min: new THREE.Vector3(-1,-1,-1), max: new THREE.Vector3(1,1,1),
    };
    this.subSteps   = options.subSteps   ?? 2;
    this.maxParticles = options.maxParticles ?? 5000;
    this.foam       = options.foam       ?? false;
    this.foamThreshold = options.foamThreshold ?? 6;
    this.enabled    = true;

    // Build grid
    const size = this.bounds.max.clone().sub(this.bounds.min);
    this.nx = Math.ceil(size.x / this.cellSize);
    this.ny = Math.ceil(size.y / this.cellSize);
    this.nz = Math.ceil(size.z / this.cellSize);
    this.grid = new MACGrid(this.nx, this.ny, this.nz, this.cellSize);
    this._prevU = new Float32Array(this.grid.u.length);
    this._prevV = new Float32Array(this.grid.v.length);
    this._prevW = new Float32Array(this.grid.w.length);
  }

  _worldToGrid(pos) {
    return new THREE.Vector3(
      (pos.x - this.bounds.min.x) / this.cellSize,
      (pos.y - this.bounds.min.y) / this.cellSize,
      (pos.z - this.bounds.min.z) / this.cellSize,
    );
  }

  // ─── Particle → Grid (P2G) ─────────────────────────────────────────────

  _particleToGrid() {
    const g = this.grid;
    g.clearVelocities();
    const uWeights = new Float32Array(g.u.length);
    const vWeights = new Float32Array(g.v.length);
    const wWeights = new Float32Array(g.w.length);

    this.particles.forEach(p => {
      if (!p.alive || p.phase !== 0) return;
      const gp = this._worldToGrid(p.position);

      // Splat velocity to grid using trilinear weights
      for (let dz = 0; dz <= 1; dz++) for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
        const xi = Math.floor(gp.x) + dx;
        const yi = Math.floor(gp.y) + dy;
        const zi = Math.floor(gp.z) + dz;
        if (xi < 0 || xi > g.nx || yi < 0 || yi >= g.ny || zi < 0 || zi >= g.nz) continue;
        const wx = dx === 0 ? (1-(gp.x%1)) : (gp.x%1);
        const wy = dy === 0 ? (1-(gp.y%1)) : (gp.y%1);
        const wz = dz === 0 ? (1-(gp.z%1)) : (gp.z%1);
        const w = wx * wy * wz;
        const ui = g.uIdx(xi,yi,zi);
        if (ui < g.u.length) { g.u[ui] += p.velocity.x * w; uWeights[ui] += w; }
        const vi = g.vIdx(xi,yi,zi);
        if (vi < g.v.length) { g.v[vi] += p.velocity.y * w; vWeights[vi] += w; }
        const wi2 = g.wIdx(xi,yi,zi);
        if (wi2 < g.w.length) { g.w[wi2] += p.velocity.z * w; wWeights[wi2] += w; }
      }
    });

    // Normalize
    for (let i = 0; i < g.u.length; i++) if (uWeights[i] > 0) g.u[i] /= uWeights[i];
    for (let i = 0; i < g.v.length; i++) if (vWeights[i] > 0) g.v[i] /= vWeights[i];
    for (let i = 0; i < g.w.length; i++) if (wWeights[i] > 0) g.w[i] /= wWeights[i];
  }

  // ─── Apply External Forces ──────────────────────────────────────────────

  _applyForces(dt) {
    const g = this.grid;
    for (let z = 0; z < g.nz; z++) for (let y = 0; y <= g.ny; y++) for (let x = 0; x < g.nx; x++) {
      g.v[g.vIdx(x,y,z)] += this.gravity.y * dt;
    }
  }

  // ─── Pressure Solve (Jacobi iterations) ────────────────────────────────

  _solvePressure(dt, iterations = 40) {
    const g = this.grid;
    const scale = dt / (this.density * this.cellSize * this.cellSize);
    g.clearPressure();

    // Compute divergence
    for (let z = 0; z < g.nz; z++) for (let y = 0; y < g.ny; y++) for (let x = 0; x < g.nx; x++) {
      if (g.type[g.idx(x,y,z)] !== 1) continue;
      const div = (g.u[g.uIdx(x+1,y,z)] - g.u[g.uIdx(x,y,z)] +
                   g.v[g.vIdx(x,y+1,z)] - g.v[g.vIdx(x,y,z)] +
                   g.w[g.wIdx(x,y,z+1)] - g.w[g.wIdx(x,y,z)]) / this.cellSize;
      g.d[g.idx(x,y,z)] = -div;
    }

    // Jacobi pressure solve
    const pNew = new Float32Array(g.p.length);
    for (let iter = 0; iter < iterations; iter++) {
      for (let z = 0; z < g.nz; z++) for (let y = 0; y < g.ny; y++) for (let x = 0; x < g.nx; x++) {
        if (g.type[g.idx(x,y,z)] !== 1) continue;
        let sum = 0, count = 0;
        if (x>0)      { sum += g.p[g.idx(x-1,y,z)]; count++; }
        if (x<g.nx-1) { sum += g.p[g.idx(x+1,y,z)]; count++; }
        if (y>0)      { sum += g.p[g.idx(x,y-1,z)]; count++; }
        if (y<g.ny-1) { sum += g.p[g.idx(x,y+1,z)]; count++; }
        if (z>0)      { sum += g.p[g.idx(x,y,z-1)]; count++; }
        if (z<g.nz-1) { sum += g.p[g.idx(x,y,z+1)]; count++; }
        pNew[g.idx(x,y,z)] = (sum - g.d[g.idx(x,y,z)] * this.cellSize * this.cellSize) / (count || 1);
      }
      g.p.set(pNew);
    }

    // Apply pressure gradient
    for (let z = 0; z < g.nz; z++) for (let y = 0; y < g.ny; y++) for (let x = 0; x <= g.nx; x++) {
      if (x > 0 && x < g.nx) {
        g.u[g.uIdx(x,y,z)] -= scale * (g.p[g.idx(x,y,z)] - g.p[g.idx(x-1,y,z)]);
      }
    }
    for (let z = 0; z < g.nz; z++) for (let y = 0; y <= g.ny; y++) for (let x = 0; x < g.nx; x++) {
      if (y > 0 && y < g.ny) {
        g.v[g.vIdx(x,y,z)] -= scale * (g.p[g.idx(x,y,z)] - g.p[g.idx(x,y-1,z)]);
      }
    }
  }

  // ─── Grid → Particle (G2P) ─────────────────────────────────────────────

  _gridToParticle(dt) {
    this.particles.forEach(p => {
      if (!p.alive || p.phase !== 0) return;
      const gp = this._worldToGrid(p.position);
      const picVel  = this.grid.velocityAt(gp.x, gp.y, gp.z);
      const prevVel = new THREE.Vector3(
        this._interpU(gp.x, gp.y, gp.z, true),
        this._interpV(gp.x, gp.y, gp.z, true),
        this._interpW(gp.x, gp.y, gp.z, true),
      );
      const flipVel = p.velocity.clone().add(picVel.clone().sub(prevVel));
      p.velocity.lerpVectors(picVel, flipVel, this.flipRatio);
    });
  }

  _interpU(gx,gy,gz, prev=false) {
    const arr = prev ? this._prevU : this.grid.u;
    const xi = Math.floor(gx), yi = Math.floor(gy-0.5), zi = Math.floor(gz-0.5);
    const xi2 = Math.min(xi+1, this.nx), yi2 = Math.min(yi+1, this.ny-1), zi2 = Math.min(zi+1, this.nz-1);
    const tx = gx-xi, ty = gy-0.5-yi, tz = gz-0.5-zi;
    const g = this.grid;
    return arr[g.uIdx(xi,yi,zi)]*(1-tx)*(1-ty)*(1-tz) + arr[g.uIdx(xi2,yi,zi)]*tx*(1-ty)*(1-tz);
  }
  _interpV(gx,gy,gz, prev=false) { return prev ? this._prevV[0] : this.grid.sampleV(gx,gy,gz); }
  _interpW(gx,gy,gz, prev=false) { return prev ? this._prevW[0] : this.grid.sampleW(gx,gy,gz); }

  // ─── Advect Particles ──────────────────────────────────────────────────

  _advectParticles(dt) {
    this.particles.forEach(p => {
      if (!p.alive) return;
      p.age += dt;

      // RK2 advection
      const gp = this._worldToGrid(p.position);
      const v1 = this.grid.velocityAt(gp.x, gp.y, gp.z);
      const midPos = p.position.clone().addScaledVector(v1, dt*0.5);
      const gp2 = this._worldToGrid(midPos);
      const v2 = this.grid.velocityAt(gp2.x, gp2.y, gp2.z);

      p.position.addScaledVector(v2, dt);

      // Boundary collision
      ['x','y','z'].forEach(axis => {
        if (p.position[axis] < this.bounds.min[axis] + p.radius) {
          p.position[axis] = this.bounds.min[axis] + p.radius;
          p.velocity[axis] *= -0.3;
        }
        if (p.position[axis] > this.bounds.max[axis] - p.radius) {
          p.position[axis] = this.bounds.max[axis] - p.radius;
          p.velocity[axis] *= -0.3;
        }
      });

      // Kill escaped particles
      if (!p.position.x) p.alive = false;
    });

    this.particles = this.particles.filter(p => p.alive);
  }

  // ─── Foam / Spray ──────────────────────────────────────────────────────

  _updateFoamSpray() {
    if (!this.foam) return;
    this.particles.forEach(p => {
      if (p.phase !== 0) return;
      const speed = p.velocity.length();
      const trapped = this._countNeighbors(p) < 4;
      if (speed > this.foamThreshold && trapped) {
        p.phase = Math.random() < 0.5 ? 1 : 2; // foam or spray
      }
    });
    this.particles.forEach(p => {
      if (p.phase === 1) { // foam — floats on surface
        p.velocity.y += 0.1;
        p.velocity.multiplyScalar(0.95);
      } else if (p.phase === 2) { // spray — flies through air
        p.velocity.y += this.gravity.y * 0.01;
        if (this._countNeighbors(p) > 6) p.phase = 0; // reabsorb
      }
    });
  }

  _countNeighbors(particle) {
    const radius = this.cellSize * 2;
    return this.particles.filter(p => p !== particle && p.alive && p.phase === 0 &&
      p.position.distanceTo(particle.position) < radius).length;
  }

  // ─── Mark Fluid Cells ──────────────────────────────────────────────────

  _markFluidCells() {
    this.grid.type.fill(0); // air
    this.particles.forEach(p => {
      if (!p.alive || p.phase !== 0) return;
      const gp = this._worldToGrid(p.position);
      const xi = Math.floor(gp.x), yi = Math.floor(gp.y), zi = Math.floor(gp.z);
      if (xi>=0 && xi<this.nx && yi>=0 && yi<this.ny && zi>=0 && zi<this.nz) {
        this.grid.type[this.grid.idx(xi,yi,zi)] = 1;
      }
    });
    // Solid boundary
    for (let z=0; z<this.nz; z++) for (let y=0; y<this.ny; y++) for (let x=0; x<this.nx; x++) {
      if (x===0||x===this.nx-1||y===0||y===this.ny-1||z===0||z===this.nz-1)
        this.grid.type[this.grid.idx(x,y,z)] = 2;
    }
  }

  // ─── Main Step ─────────────────────────────────────────────────────────

  step(dt = 1/60) {
    if (!this.enabled || !this.particles.length) return;
    const subDt = dt / this.subSteps;

    for (let sub = 0; sub < this.subSteps; sub++) {
      this._markFluidCells();
      this._particleToGrid();
      this._prevU.set(this.grid.u);
      this._prevV.set(this.grid.v);
      this._prevW.set(this.grid.w);
      this._applyForces(subDt);
      this._solvePressure(subDt);
      this._gridToParticle(subDt);
      this._advectParticles(subDt);
      if (this.foam) this._updateFoamSpray();
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────

  addParticle(position, velocity, options) {
    if (this.particles.length >= this.maxParticles) return null;
    const p = createFLIPParticle(position, velocity, options);
    this.particles.push(p);
    return p;
  }

  spawnBox(min, max, count = 200, velocity) {
    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        min.x + Math.random()*(max.x-min.x),
        min.y + Math.random()*(max.y-min.y),
        min.z + Math.random()*(max.z-min.z),
      );
      this.addParticle(pos, velocity?.clone() ?? new THREE.Vector3(), { radius: this.cellSize*0.5 });
    }
  }

  buildPointCloud() {
    const positions = new Float32Array(this.particles.length * 3);
    const colors    = new Float32Array(this.particles.length * 3);
    this.particles.forEach((p, i) => {
      positions[i*3]   = p.position.x;
      positions[i*3+1] = p.position.y;
      positions[i*3+2] = p.position.z;
      // Color by phase
      if (p.phase === 0) { colors[i*3]=0.2; colors[i*3+1]=0.5; colors[i*3+2]=1.0; } // water=blue
      else if (p.phase===1) { colors[i*3]=1;colors[i*3+1]=1;colors[i*3+2]=1; }       // foam=white
      else { colors[i*3]=0.7;colors[i*3+1]=0.9;colors[i*3+2]=1; }                    // spray=light blue
    });
    const { THREE: T } = { THREE };
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    return geo;
  }

  updatePointCloud(geo) {
    const pos = geo.attributes.position;
    if (pos.count !== this.particles.length) return false;
    this.particles.forEach((p,i) => pos.setXYZ(i, p.position.x, p.position.y, p.position.z));
    pos.needsUpdate = true;
    return true;
  }

  getStats() {
    const fluid = this.particles.filter(p=>p.phase===0).length;
    const foam  = this.particles.filter(p=>p.phase===1).length;
    const spray = this.particles.filter(p=>p.phase===2).length;
    return { total: this.particles.length, fluid, foam, spray, gridSize: [this.nx,this.ny,this.nz] };
  }

  clear() { this.particles = []; }
  setEnabled(v) { this.enabled = v; }
}

export const FLIP_PRESETS = {
  water:  { flipRatio: 0.95, viscosity: 0,    density: 1000, foam: true,  foamThreshold: 6 },
  honey:  { flipRatio: 0.5,  viscosity: 50,   density: 1400, foam: false                   },
  lava:   { flipRatio: 0.6,  viscosity: 100,  density: 2200, foam: false                   },
  blood:  { flipRatio: 0.85, viscosity: 4,    density: 1060, foam: false                   },
  slime:  { flipRatio: 0.3,  viscosity: 200,  density: 1100, foam: false                   },
};

// ══════════════════════════════════════════════════════════════════════════════
// FILM-QUALITY FLUID — Surface Reconstruction + Foam + Water Shader
// ══════════════════════════════════════════════════════════════════════════════

import { fluidSurfaceMesh } from './MarchingCubes.js';

// ── Build surface mesh from FLIP particles ────────────────────────────────────
export function buildFluidSurface(solver, scene, options = {}) {
  const THREE = window.THREE;
  if (!THREE || !solver || !scene) return null;

  const {
    resolution   = 28,
    radius       = solver.cellSize * 2.5,
    isolevel     = 0.5,
    smoothPasses = 2,
  } = options;

  // Get alive fluid particles
  const particles = solver.particles
    .filter(p => p.alive && p.phase === 0)
    .map(p => p.position);

  if (particles.length < 4) return null;

  // Build marching cubes mesh
  const geo = fluidSurfaceMesh(particles, { resolution, radius, isolevel });
  if (!geo || !geo.attributes.position || geo.attributes.position.count === 0) return null;

  // Smooth the surface (Laplacian passes)
  for (let pass = 0; pass < smoothPasses; pass++) {
    _laplacianSmooth(geo);
  }
  geo.computeVertexNormals();

  return geo;
}

function _laplacianSmooth(geo) {
  const pos = geo.attributes.position;
  const idx = geo.index;
  if (!pos || !idx) return;

  // Build adjacency
  const adj = new Map();
  for (let i = 0; i < idx.count; i += 3) {
    for (let j = 0; j < 3; j++) {
      const a = idx.getX(i+j), b = idx.getX(i+(j+1)%3);
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b); adj.get(b).add(a);
    }
  }

  const newPos = new Float32Array(pos.array.length);
  for (let i = 0; i < pos.count; i++) {
    const neighbors = adj.get(i);
    if (!neighbors || neighbors.size === 0) {
      newPos[i*3]=pos.getX(i); newPos[i*3+1]=pos.getY(i); newPos[i*3+2]=pos.getZ(i);
      continue;
    }
    let sx=0,sy=0,sz=0;
    for (const n of neighbors) { sx+=pos.getX(n); sy+=pos.getY(n); sz+=pos.getZ(n); }
    const n = neighbors.size;
    // Weighted average: 50% original, 50% neighbor average
    newPos[i*3]   = pos.getX(i)*0.5 + (sx/n)*0.5;
    newPos[i*3+1] = pos.getY(i)*0.5 + (sy/n)*0.5;
    newPos[i*3+2] = pos.getZ(i)*0.5 + (sz/n)*0.5;
  }
  pos.array.set(newPos);
  pos.needsUpdate = true;
}

// ── Film water shader material ─────────────────────────────────────────────────
export function createFilmWaterMaterial(options = {}) {
  const THREE = window.THREE;
  if (!THREE) return null;
  const {
    color         = "#006994",
    deepColor     = "#001a3a",
    roughness     = 0.02,
    transmission  = 0.95,
    ior           = 1.333,
    clearcoat     = 1.0,
    envMapIntensity = 2.0,
    opacity       = 0.85,
    foam          = true,
    foamColor     = "#e8f4f8",
  } = options;

  return new THREE.MeshPhysicalMaterial({
    color:              new THREE.Color(color),
    roughness,
    metalness:          0.0,
    transmission,
    ior,
    thickness:          1.5,
    clearcoat,
    clearcoatRoughness: 0.05,
    transparent:        true,
    opacity,
    envMapIntensity,
    side:               THREE.DoubleSide,
    depthWrite:         false,
  });
}

// ── Foam particle system ───────────────────────────────────────────────────────
export function buildFoamParticles(solver, scene, options = {}) {
  const THREE = window.THREE;
  if (!THREE || !solver || !scene) return null;
  const { color="#e8f4f8", size=0.04, maxFoam=2000 } = options;

  const foamParticles = solver.particles
    .filter(p => p.alive && p.phase === 1) // foam phase
    .slice(0, maxFoam);

  if (foamParticles.length === 0) return null;

  const positions = new Float32Array(foamParticles.length * 3);
  foamParticles.forEach((p, i) => {
    positions[i*3]   = p.position.x;
    positions[i*3+1] = p.position.y;
    positions[i*3+2] = p.position.z;
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: new THREE.Color(color),
    size,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

// ── Full film fluid simulation step with surface rebuild ───────────────────────
export function stepFilmFluid(solver, scene, fluidMeshRef, foamRef, options = {}) {
  const THREE = window.THREE;
  if (!THREE || !solver || !scene) return;

  // Step the simulation
  solver.step(options.dt || 1/60);

  // Rebuild surface mesh every N frames for performance
  const rebuildEvery = options.rebuildEvery || 3;
  if (!stepFilmFluid._frame) stepFilmFluid._frame = 0;
  stepFilmFluid._frame++;
  if (stepFilmFluid._frame % rebuildEvery !== 0) return;

  // Remove old surface mesh
  if (fluidMeshRef.current) { scene.remove(fluidMeshRef.current); fluidMeshRef.current = null; }
  if (foamRef.current) { scene.remove(foamRef.current); foamRef.current = null; }

  // Build new surface
  const geo = buildFluidSurface(solver, scene, options);
  if (geo) {
    if (!stepFilmFluid._mat) {
      stepFilmFluid._mat = createFilmWaterMaterial(options);
    }
    const mesh = new THREE.Mesh(geo, stepFilmFluid._mat);
    scene.add(mesh);
    fluidMeshRef.current = mesh;
  }

  // Build foam
  const foam = buildFoamParticles(solver, scene, options);
  if (foam) { scene.add(foam); foamRef.current = foam; }
}

export default FLIPFluidSolver;
