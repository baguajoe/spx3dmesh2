// DestructionPanel.js — Voronoi Fracture + Rigid Body Destruction
// SPX Mesh Editor | StreamPireX
// Features: Voronoi fracture, impact detection, debris physics,
//           procedural cracks, material splitting, explosion force

import * as THREE from 'three';

// ─── Voronoi Cell ─────────────────────────────────────────────────────────────

function generateVoronoiCells(geometry, count = 20, seed = 42) {
  const pos = geometry.attributes.position;
  const bbox = new THREE.Box3().setFromBufferAttribute(pos);
  const size = bbox.getSize(new THREE.Vector3());
  const center = bbox.getCenter(new THREE.Vector3());

  // Seeded RNG
  let s = seed;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  // Generate seed points inside bbox
  const seeds = [];
  for (let i = 0; i < count; i++) {
    seeds.push(new THREE.Vector3(
      center.x + (rng()-0.5) * size.x,
      center.y + (rng()-0.5) * size.y,
      center.z + (rng()-0.5) * size.z,
    ));
  }

  return seeds;
}

function assignVerticesToCells(geometry, cellSeeds) {
  const pos = geometry.attributes.position;
  const assignments = new Int32Array(pos.count);

  for (let vi = 0; vi < pos.count; vi++) {
    const vp = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
    let nearest = 0, nearDist = Infinity;
    cellSeeds.forEach((seed, si) => {
      const d = vp.distanceTo(seed);
      if (d < nearDist) { nearDist = d; nearest = si; }
    });
    assignments[vi] = nearest;
  }
  return assignments;
}

function buildCellGeometries(geometry, assignments, cellCount) {
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  const cellGeos = Array.from({ length: cellCount }, () => ({ verts: [], indices: [] }));

  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i), b = idx.getX(i+1), c = idx.getX(i+2);
      const cell = assignments[a]; // use first vertex's cell
      const g = cellGeos[cell];
      const base = g.verts.length / 3;
      for (const v of [a, b, c]) {
        g.verts.push(pos.getX(v), pos.getY(v), pos.getZ(v));
      }
      g.indices.push(base, base+1, base+2);
    }
  }

  return cellGeos.map(g => {
    if (!g.verts.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.verts, 3));
    geo.setIndex(g.indices);
    geo.computeVertexNormals();
    return geo;
  }).filter(Boolean);
}

// ─── Debris Piece ─────────────────────────────────────────────────────────────

export function createDebrisPiece(geometry, material, impactPoint, impactForce, options = {}) {
  const mesh = new THREE.Mesh(geometry, material.clone());
  const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());

  const dir = center.clone().sub(impactPoint).normalize();
  const speed = impactForce * (0.5 + Math.random() * 0.5);

  return {
    mesh,
    velocity: dir.multiplyScalar(speed).add(
      new THREE.Vector3((Math.random()-0.5)*2, Math.random()*3, (Math.random()-0.5)*2)
    ),
    angularVelocity: new THREE.Vector3(
      (Math.random()-0.5)*10, (Math.random()-0.5)*10, (Math.random()-0.5)*10
    ),
    mass: options.mass ?? 1,
    restitution: options.restitution ?? 0.3,
    friction: options.friction ?? 0.8,
    lifetime: options.lifetime ?? 5,
    age: 0,
    alive: true,
    groundY: options.groundY ?? 0,
  };
}

// ─── Destruction System ───────────────────────────────────────────────────────

export class DestructionSystem {
  constructor(options = {}) {
    this.gravity      = options.gravity ?? -9.8;
    this.debris       = [];
    this.fragments    = new Map(); // mesh uuid → [debris pieces]
    this.maxDebris    = options.maxDebris ?? 200;
    this.enabled      = true;
    this.groundY      = options.groundY ?? -2;
    this.airResistance = options.airResistance ?? 0.02;
  }

  fracture(mesh, options = {}) {
    const {
      cellCount    = 15,
      impactPoint  = new THREE.Vector3(),
      impactForce  = 5,
      seed         = Math.floor(Math.random() * 10000),
      debrisLifetime = 5,
    } = options;

    const geo = mesh.geometry;
    const mat = mesh.material;

    // Generate Voronoi cells
    const seeds = generateVoronoiCells(geo, cellCount, seed);
    const assignments = assignVerticesToCells(geo, seeds);
    const cellGeos = buildCellGeometries(geo, assignments, cellCount);

    const pieces = [];
    cellGeos.forEach(cellGeo => {
      if (!cellGeo) return;
      // Apply mesh world transform to geometry
      cellGeo.applyMatrix4(mesh.matrixWorld);
      const piece = createDebrisPiece(cellGeo, mat, impactPoint, impactForce, {
        lifetime: debrisLifetime,
        groundY: this.groundY,
      });
      pieces.push(piece);
    });

    // Limit total debris
    this.debris.push(...pieces);
    if (this.debris.length > this.maxDebris) {
      this.debris.splice(0, this.debris.length - this.maxDebris);
    }

    this.fragments.set(mesh.uuid, pieces);

    // Hide original mesh
    mesh.visible = false;

    return pieces;
  }

  applyExplosion(center, radius, force) {
    this.debris.forEach(piece => {
      const meshCenter = new THREE.Box3().setFromObject(piece.mesh).getCenter(new THREE.Vector3());
      const dist = meshCenter.distanceTo(center);
      if (dist < radius) {
        const dir = meshCenter.clone().sub(center).normalize();
        const strength = force * (1 - dist / radius);
        piece.velocity.addScaledVector(dir, strength);
        piece.angularVelocity.addScaledVector(
          new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(),
          strength * 2
        );
      }
    });
  }

  step(dt = 1/60) {
    if (!this.enabled) return;

    this.debris.forEach(piece => {
      if (!piece.alive) return;

      piece.age += dt;
      if (piece.age > piece.lifetime) { piece.alive = false; return; }

      // Gravity
      piece.velocity.y += this.gravity * dt;

      // Air resistance
      const speed = piece.velocity.length();
      if (speed > 0) piece.velocity.addScaledVector(piece.velocity, -this.airResistance * dt);

      // Move
      piece.mesh.position.addScaledVector(piece.velocity, dt);

      // Rotate
      piece.mesh.rotation.x += piece.angularVelocity.x * dt;
      piece.mesh.rotation.y += piece.angularVelocity.y * dt;
      piece.mesh.rotation.z += piece.angularVelocity.z * dt;

      // Ground collision
      if (piece.mesh.position.y < this.groundY) {
        piece.mesh.position.y = this.groundY;
        piece.velocity.y *= -piece.restitution;
        piece.velocity.x *= piece.friction;
        piece.velocity.z *= piece.friction;
        piece.angularVelocity.multiplyScalar(piece.friction);
      }
    });

    // Remove dead debris
    this.debris = this.debris.filter(p => p.alive);
  }

  addToScene(scene) {
    this.debris.forEach(p => { if (!p.mesh.parent) scene.add(p.mesh); });
  }

  removeFromScene(scene) {
    this.debris.forEach(p => scene.remove(p.mesh));
    this.debris = [];
  }

  crackMesh(mesh, options = {}) {
    // Add visual cracks without fracturing (for pre-damage effect)
    const { count = 5, depth = 0.01 } = options;
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < Math.min(count, pos.count); i++) {
      const idx = Math.floor(Math.random() * pos.count);
      pos.setY(idx, pos.getY(idx) - depth * Math.random());
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  getDebrisCount() { return this.debris.length; }
  clear() { this.debris = []; this.fragments.clear(); }
}

export const DESTRUCTION_PRESETS = {
  glass:    { cellCount: 25, impactForce: 8,  restitution: 0.1, debrisLifetime: 3 },
  wood:     { cellCount: 12, impactForce: 4,  restitution: 0.2, debrisLifetime: 8 },
  concrete: { cellCount: 20, impactForce: 6,  restitution: 0.15,debrisLifetime: 10 },
  metal:    { cellCount: 8,  impactForce: 10, restitution: 0.4, debrisLifetime: 6 },
  ceramic:  { cellCount: 30, impactForce: 5,  restitution: 0.05,debrisLifetime: 4 },
};

export default DestructionSystem;
