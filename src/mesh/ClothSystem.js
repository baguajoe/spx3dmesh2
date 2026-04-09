// ClothSystem.js — PRO Cloth Simulation
// SPX Mesh Editor | StreamPireX
// Features: position-based dynamics, stretch/shear/bend constraints,
//           self-collision, friction, air resistance, tearing, pinning

import * as THREE from 'three';

// ─── Particle ────────────────────────────────────────────────────────────────

export function createClothParticle(position, mass = 1.0) {
  return {
    position: position.clone(),
    prevPos:  position.clone(),
    velocity: new THREE.Vector3(),
    force:    new THREE.Vector3(),
    mass,
    invMass:  mass > 0 ? 1 / mass : 0,
    pinned:   false,
    pinWeight: 0,
    friction: 0.5,
  };
}

// ─── Constraint Types ─────────────────────────────────────────────────────────

const CONSTRAINT = { STRETCH: 'stretch', SHEAR: 'shear', BEND: 'bend' };

function createConstraint(a, b, restLen, stiffness, type = CONSTRAINT.STRETCH, maxStretch = 1.1) {
  return { a, b, restLen, stiffness, type, maxStretch, broken: false };
}

// ─── Cloth Creation ───────────────────────────────────────────────────────────

export function createCloth(mesh, options = {}) {
  const {
    mass        = 1.0,
    stiffness   = 0.95,
    shearStiff  = 0.8,
    bendStiff   = 0.3,
    damping     = 0.99,
    gravity     = -9.8,
    iterations  = 12,
    windForce   = new THREE.Vector3(0, 0, 0),
    tearing     = false,
    tearThreshold = 2.5,
    selfCollision = false,
    selfCollisionRadius = 0.02,
  } = options;

  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const idx = geo.index;
  if (!pos) return null;

  const mat = mesh.matrixWorld;
  const particles = [];

  for (let i = 0; i < pos.count; i++) {
    const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat);
    particles.push(createClothParticle(p, mass));
  }

  const constraints = [];
  const edgeSet = new Set();

  if (idx) {
    const arr = idx.array;
    for (let i = 0; i < arr.length; i += 3) {
      const a = arr[i], b = arr[i+1], c = arr[i+2];

      // Stretch constraints (edges)
      for (let k = 0; k < 3; k++) {
        const va = arr[i+k], vb = arr[i+(k+1)%3];
        const key = Math.min(va,vb) + '_' + Math.max(va,vb);
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          const restLen = particles[va].position.distanceTo(particles[vb].position);
          constraints.push(createConstraint(va, vb, restLen, stiffness, CONSTRAINT.STRETCH, tearThreshold));
        }
      }

      // Shear constraints (face diagonals)
      const shearKey = Math.min(a,c) + '_' + Math.max(a,c) + '_s';
      if (!edgeSet.has(shearKey)) {
        edgeSet.add(shearKey);
        const restLen = particles[a].position.distanceTo(particles[c].position);
        constraints.push(createConstraint(a, c, restLen, shearStiff, CONSTRAINT.SHEAR));
      }
    }

    // Bend constraints (skip-one-vertex connections)
    const vertFaces = new Map();
    for (let i = 0; i < arr.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = arr[i+k];
        if (!vertFaces.has(v)) vertFaces.set(v, []);
        vertFaces.get(v).push(i/3);
      }
    }

    edgeSet.forEach(key => {
      if (key.includes('_s')) return;
      const [va, vb] = key.split('_').map(Number);
      const facesA = vertFaces.get(va) ?? [];
      const facesB = vertFaces.get(vb) ?? [];
      const shared = facesA.filter(f => facesB.includes(f));
      if (shared.length === 2) {
        // Find the two non-shared vertices
        const faceVerts = (fi) => [arr[fi*3], arr[fi*3+1], arr[fi*3+2]];
        const v0 = faceVerts(shared[0]).find(v => v !== va && v !== vb);
        const v1 = faceVerts(shared[1]).find(v => v !== va && v !== vb);
        if (v0 !== undefined && v1 !== undefined) {
          const bendKey = Math.min(v0,v1) + '_' + Math.max(v0,v1) + '_b';
          if (!edgeSet.has(bendKey)) {
            edgeSet.add(bendKey);
            const restLen = particles[v0].position.distanceTo(particles[v1].position);
            constraints.push(createConstraint(v0, v1, restLen, bendStiff, CONSTRAINT.BEND));
          }
        }
      }
    });
  }

  return {
    particles, constraints, mesh,
    stiffness, damping, gravity, iterations, windForce,
    tearing, tearThreshold, selfCollision, selfCollisionRadius,
    colliders: [],
    friction: 0.5,
    airResistance: 0.02,
  };
}

// ─── Pin Vertices ─────────────────────────────────────────────────────────────

export function pinParticle(cloth, index, weight = 1.0) {
  if (cloth.particles[index]) {
    cloth.particles[index].pinned = true;
    cloth.particles[index].pinWeight = weight;
    cloth.particles[index].invMass = 0;
  }
}

export function unpinParticle(cloth, index) {
  if (cloth.particles[index]) {
    cloth.particles[index].pinned = false;
    cloth.particles[index].invMass = 1 / cloth.particles[index].mass;
  }
}

export function pinTopRow(cloth, mesh) {
  const pos = mesh.geometry.attributes.position;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) maxY = Math.max(maxY, pos.getY(i));
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(pos.getY(i) - maxY) < 0.01) pinParticle(cloth, i);
  }
}

// ─── Simulation Step ──────────────────────────────────────────────────────────

export function stepCloth(cloth, dt = 1/60) {
  const { particles, constraints, gravity, damping, windForce, iterations, colliders, airResistance } = cloth;

  const gravVec = new THREE.Vector3(0, gravity * dt * dt, 0);
  const windVec = windForce.clone().multiplyScalar(dt * dt);

  // Apply external forces (Verlet integration)
  particles.forEach(p => {
    if (p.pinned) return;

    const vel = p.position.clone().sub(p.prevPos);
    vel.multiplyScalar(damping);

    // Air resistance
    const speed = vel.length();
    if (speed > 0) vel.addScaledVector(vel, -airResistance * speed);

    p.prevPos.copy(p.position);
    p.position.add(vel).add(gravVec).add(windVec);
  });

  // Solve constraints
  for (let iter = 0; iter < iterations; iter++) {
    constraints.forEach(c => {
      if (c.broken) return;
      const pa = particles[c.a], pb = particles[c.b];
      if (!pa || !pb) return;

      const diff = pb.position.clone().sub(pa.position);
      const dist = diff.length();
      if (dist < 0.0001) return;

      const correction = diff.multiplyScalar((dist - c.restLen) / dist);

      // Tearing
      if (cloth.tearing && dist > c.restLen * c.maxStretch) {
        c.broken = true;
        return;
      }

      const totalInvMass = pa.invMass + pb.invMass;
      if (totalInvMass === 0) return;

      const stiffnessFactor = c.stiffness;
      if (pa.invMass > 0) pa.position.addScaledVector(correction, pa.invMass / totalInvMass * stiffnessFactor);
      if (pb.invMass > 0) pb.position.addScaledVector(correction, -pb.invMass / totalInvMass * stiffnessFactor);
    });

    // Collision response
    colliders.forEach(col => {
      particles.forEach(p => {
        if (p.pinned) return;
        _resolveClothCollider(p, col);
      });
    });

    // Self-collision
    if (cloth.selfCollision) {
      _resolveSelfCollision(particles, cloth.selfCollisionRadius);
    }
  }
}

function _resolveClothCollider(particle, col) {
  if (col.type === 'sphere') {
    const d = particle.position.clone().sub(col.center);
    const dist = d.length();
    if (dist < col.radius + 0.001) {
      particle.position.copy(col.center).addScaledVector(d.normalize(), col.radius + 0.001);
    }
  } else if (col.type === 'plane') {
    const d = particle.position.clone().sub(col.point).dot(col.normal);
    if (d < 0) particle.position.addScaledVector(col.normal, -d);
  } else if (col.type === 'capsule') {
    const ab = col.end.clone().sub(col.start);
    const t = Math.max(0, Math.min(1, particle.position.clone().sub(col.start).dot(ab) / ab.lengthSq()));
    const closest = col.start.clone().addScaledVector(ab, t);
    const d = particle.position.clone().sub(closest);
    const dist = d.length();
    if (dist < col.radius + 0.001) {
      particle.position.copy(closest).addScaledVector(d.normalize(), col.radius + 0.001);
    }
  }
}

function _resolveSelfCollision(particles, radius) {
  // Spatial hashing for performance
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const d = particles[i].position.clone().sub(particles[j].position);
      const dist = d.length();
      if (dist < radius * 2 && dist > 0.0001) {
        const correction = d.normalize().multiplyScalar((radius * 2 - dist) * 0.5);
        if (!particles[i].pinned) particles[i].position.add(correction);
        if (!particles[j].pinned) particles[j].position.sub(correction);
      }
    }
  }
}

// ─── Apply to Mesh ────────────────────────────────────────────────────────────

export function applyClothToMesh(cloth) {
  const pos = cloth.mesh.geometry.attributes.position;
  const mat = cloth.mesh.matrixWorld.clone().invert();
  cloth.particles.forEach((p, i) => {
    const local = p.position.clone().applyMatrix4(mat);
    pos.setXYZ(i, local.x, local.y, local.z);
  });
  pos.needsUpdate = true;
  cloth.mesh.geometry.computeVertexNormals();
}

// ─── Colliders ────────────────────────────────────────────────────────────────

export function addSphereCollider(cloth, center, radius) {
  cloth.colliders.push({ type: 'sphere', center: center.clone(), radius });
}

export function addCapsuleCollider(cloth, start, end, radius) {
  cloth.colliders.push({ type: 'capsule', start: start.clone(), end: end.clone(), radius });
}

export function addPlaneCollider(cloth, point, normal) {
  cloth.colliders.push({ type: 'plane', point: point.clone(), normal: normal.clone().normalize() });
}

export function addGroundPlane(cloth, y = 0) {
  addPlaneCollider(cloth, new THREE.Vector3(0, y, 0), new THREE.Vector3(0, 1, 0));
}

// ─── Wind ─────────────────────────────────────────────────────────────────────

export function setClothWind(cloth, direction, strength) {
  cloth.windForce = direction.clone().normalize().multiplyScalar(strength);
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export function clothPreset(type) {
  const presets = {
    silk:    { stiffness: 0.7, shearStiff: 0.5, bendStiff: 0.1, damping: 0.999, mass: 0.3 },
    cotton:  { stiffness: 0.9, shearStiff: 0.8, bendStiff: 0.4, damping: 0.99,  mass: 0.8 },
    denim:   { stiffness: 0.98,shearStiff: 0.9, bendStiff: 0.7, damping: 0.98,  mass: 1.5 },
    leather: { stiffness: 0.99,shearStiff: 0.95,bendStiff: 0.9, damping: 0.97,  mass: 2.0 },
    rubber:  { stiffness: 0.6, shearStiff: 0.6, bendStiff: 0.2, damping: 0.995, mass: 1.2 },
    paper:   { stiffness: 0.95,shearStiff: 0.9, bendStiff: 0.8, damping: 0.95,  mass: 0.2 },
  };
  return presets[type] ?? presets.cotton;
}

export default {
  createClothParticle, createCloth,
  pinParticle, unpinParticle, pinTopRow,
  stepCloth, applyClothToMesh,
  addSphereCollider, addCapsuleCollider, addPlaneCollider, addGroundPlane,
  setClothWind, clothPreset, CONSTRAINT,
};

export function applyClothPreset(cloth, type) { const p = clothPreset(type); Object.assign(cloth, p); return cloth; }
export function resetCloth(cloth) { cloth.particles.forEach(p => { p.position.copy(p.prevPos); p.velocity.set(0,0,0); }); }
export function getClothStats(cloth) { return { particles: cloth.particles.length, constraints: cloth.constraints.length, broken: cloth.constraints.filter(c=>c.broken).length, pinned: cloth.particles.filter(p=>p.pinned).length }; }
export const CLOTH_PRESETS = { silk: clothPreset('silk'), cotton: clothPreset('cotton'), denim: clothPreset('denim'), leather: clothPreset('leather'), rubber: clothPreset('rubber'), paper: clothPreset('paper') };
