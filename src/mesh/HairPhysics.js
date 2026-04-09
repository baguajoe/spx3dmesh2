// HairPhysics.js — PRO Hair Simulation
// SPX Mesh Editor | StreamPireX
// Features: position-based dynamics, per-strand stiffness, wind turbulence,
//           sphere/capsule/mesh collision, clumping, curl, baking, LOD

import * as THREE from 'three';

// ─── Strand Creation ──────────────────────────────────────────────────────────

export function createStrand(rootPos, direction, options = {}) {
  const {
    segments    = 12,
    length      = 1.0,
    stiffness   = 0.85,
    thickness   = 0.01,
    curl        = 0,
    curlFreq    = 3,
    mass        = 1.0,
    id          = Math.random().toString(36).slice(2),
  } = options;

  const segLen = length / segments;
  const points = [], restPoints = [], velocity = [], masses = [];
  const up = direction.clone().normalize();

  // Build curl offset
  const right = new THREE.Vector3(1, 0, 0);
  if (Math.abs(up.dot(right)) > 0.9) right.set(0, 1, 0);
  const tangent = right.clone().crossVectors(up, right).normalize();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const curlOffset = curl > 0
      ? tangent.clone().multiplyScalar(Math.sin(t * curlFreq * Math.PI * 2) * curl)
      : new THREE.Vector3();
    const pos = rootPos.clone()
      .addScaledVector(up, -i * segLen)
      .add(curlOffset);
    points.push(pos.clone());
    restPoints.push(pos.clone());
    velocity.push(new THREE.Vector3());
    masses.push(i === 0 ? 0 : mass * (1 - t * 0.3)); // tip is lighter
  }

  return { id, points, restPoints, velocity, masses, segments, length, stiffness, thickness, curl, curlFreq };
}

// ─── Physics Settings ─────────────────────────────────────────────────────────

export function createHairPhysicsSettings(options = {}) {
  return {
    enabled:       options.enabled    ?? true,
    gravity:       options.gravity    ?? -9.8,
    wind:          options.wind       ?? new THREE.Vector3(0, 0, 0),
    windNoise:     options.windNoise  ?? 0.5,
    windTurbulence: options.windTurbulence ?? 0.3,
    damping:       options.damping    ?? 0.98,
    stiffness:     options.stiffness  ?? 0.8,
    bendStiffness: options.bendStiffness ?? 0.4,
    colliders:     [],
    iterations:    options.iterations ?? 8,
    subSteps:      options.subSteps   ?? 2,
    // Clumping
    clumpStrength: options.clumpStrength ?? 0,
    clumpRadius:   options.clumpRadius  ?? 0.05,
    // Attraction to guide strands
    guideStrands:  [],
    guideStrength: options.guideStrength ?? 0,
    // LOD
    lodDistance:   options.lodDistance  ?? 10,
    lodSubdivision: options.lodSubdivision ?? 4,
  };
}

// ─── Turbulence ───────────────────────────────────────────────────────────────

function turbulence(pos, time, scale = 1) {
  const x = pos.x * scale + time * 0.3;
  const y = pos.y * scale + time * 0.17;
  const z = pos.z * scale + time * 0.23;
  return new THREE.Vector3(
    Math.sin(x * 1.7 + z * 2.3) * Math.cos(y * 1.1),
    Math.sin(y * 2.1 + x * 1.3) * Math.cos(z * 1.7),
    Math.sin(z * 1.9 + y * 2.7) * Math.cos(x * 1.4),
  );
}

// ─── Step Simulation ──────────────────────────────────────────────────────────

let _time = 0;

export function stepHairPhysics(strands, settings, dt = 1/60) {
  if (!settings.enabled) return;
  _time += dt;

  const subDt = dt / settings.subSteps;

  for (let sub = 0; sub < settings.subSteps; sub++) {
    strands.forEach(strand => {
      _stepStrand(strand, settings, subDt);
    });

    // Clumping — pull strands toward neighbors
    if (settings.clumpStrength > 0 && strands.length > 1) {
      _applyClumping(strands, settings);
    }

    // Guide strand attraction
    if (settings.guideStrength > 0 && settings.guideStrands.length > 0) {
      _applyGuideAttraction(strands, settings);
    }
  }
}

function _stepStrand(strand, settings, dt) {
  const { gravity, wind, windNoise, windTurbulence, damping, stiffness, bendStiffness, colliders, iterations } = settings;

  const gravVec = new THREE.Vector3(0, gravity * 0.001, 0);
  const windBase = wind.clone();

  for (let i = 1; i < strand.points.length; i++) {
    const prev = strand.points[i].clone();
    const invMass = 1 / (strand.masses[i] || 1);

    // Wind with turbulence
    const turb = turbulence(strand.points[i], _time, 1.5).multiplyScalar(windTurbulence * 0.002);
    const noise = new THREE.Vector3(
      (Math.random()-0.5) * windNoise * 0.001,
      (Math.random()-0.5) * windNoise * 0.0005,
      (Math.random()-0.5) * windNoise * 0.001,
    );
    const windForce = windBase.clone().add(turb).add(noise);

    // Velocity update
    strand.velocity[i]
      .add(gravVec.clone().multiplyScalar(invMass))
      .add(windForce)
      .multiplyScalar(damping);

    strand.points[i].add(strand.velocity[i].clone().multiplyScalar(dt * 60));

    // Constraint solving
    for (let iter = 0; iter < iterations; iter++) {
      // Distance constraint to parent
      const parent = strand.points[i-1];
      const segLen = strand.length / strand.segments;
      const diff = strand.points[i].clone().sub(parent);
      const dist = diff.length();
      if (dist > 0.0001) {
        const correction = diff.multiplyScalar((dist - segLen) / dist * 0.5);
        strand.points[i].sub(correction);
      }

      // Bend constraint (resist bending)
      if (i >= 2 && bendStiffness > 0) {
        const p0 = strand.points[i-2];
        const p1 = strand.points[i-1];
        const p2 = strand.points[i];
        const mid = p0.clone().add(p2).multiplyScalar(0.5);
        const bend = p1.clone().sub(mid);
        strand.points[i-1].sub(bend.multiplyScalar(bendStiffness * 0.1));
      }

      // Stiffness toward rest
      if (strand.restPoints[i]) {
        strand.points[i].lerp(strand.restPoints[i], stiffness * 0.005 * strand.stiffness);
      }

      // Collision
      colliders.forEach(col => {
        _resolveCollider(strand.points[i], col);
      });
    }

    // Update velocity from position delta
    strand.velocity[i].copy(
      strand.points[i].clone().sub(prev).multiplyScalar(dt > 0 ? 1/dt : 0)
    );
  }
}

function _resolveCollider(point, col) {
  if (col.type === 'sphere') {
    const toPoint = point.clone().sub(col.center);
    const dist = toPoint.length();
    if (dist < col.radius + 0.001) {
      point.copy(col.center).addScaledVector(toPoint.normalize(), col.radius + 0.001);
    }
  } else if (col.type === 'capsule') {
    // Capsule collision — closest point on segment
    const ab = col.end.clone().sub(col.start);
    const t = Math.max(0, Math.min(1, point.clone().sub(col.start).dot(ab) / ab.lengthSq()));
    const closest = col.start.clone().addScaledVector(ab, t);
    const toPoint = point.clone().sub(closest);
    const dist = toPoint.length();
    if (dist < col.radius + 0.001) {
      point.copy(closest).addScaledVector(toPoint.normalize(), col.radius + 0.001);
    }
  } else if (col.type === 'plane') {
    const d = point.clone().sub(col.point).dot(col.normal);
    if (d < 0) point.addScaledVector(col.normal, -d);
  }
}

function _applyClumping(strands, settings) {
  const { clumpStrength, clumpRadius } = settings;
  for (let i = 0; i < strands.length; i++) {
    for (let j = i+1; j < strands.length; j++) {
      const sa = strands[i], sb = strands[j];
      for (let k = 1; k < Math.min(sa.points.length, sb.points.length); k++) {
        const dist = sa.points[k].distanceTo(sb.points[k]);
        if (dist < clumpRadius && dist > 0.0001) {
          const mid = sa.points[k].clone().add(sb.points[k]).multiplyScalar(0.5);
          sa.points[k].lerp(mid, clumpStrength * 0.1);
          sb.points[k].lerp(mid, clumpStrength * 0.1);
        }
      }
    }
  }
}

function _applyGuideAttraction(strands, settings) {
  strands.forEach(strand => {
    let nearest = null, nearDist = Infinity;
    settings.guideStrands.forEach(guide => {
      const d = strand.points[0].distanceTo(guide.points[0]);
      if (d < nearDist) { nearDist = d; nearest = guide; }
    });
    if (!nearest) return;
    for (let i = 1; i < Math.min(strand.points.length, nearest.points.length); i++) {
      strand.points[i].lerp(nearest.points[i], settings.guideStrength * 0.05);
    }
  });
}

// ─── Collider Helpers ─────────────────────────────────────────────────────────

export function addSphereCollider(settings, center, radius) {
  settings.colliders.push({ type: 'sphere', center: center.clone(), radius });
  return settings.colliders.length - 1;
}

export function addCapsuleCollider(settings, start, end, radius) {
  settings.colliders.push({ type: 'capsule', start: start.clone(), end: end.clone(), radius });
  return settings.colliders.length - 1;
}

export function addPlaneCollider(settings, point, normal) {
  settings.colliders.push({ type: 'plane', point: point.clone(), normal: normal.clone().normalize() });
  return settings.colliders.length - 1;
}

export function addCollider(settings, center, radius) {
  return addSphereCollider(settings, center, radius);
}

export function removeCollider(settings, index) {
  settings.colliders.splice(index, 1);
}

export function updateColliderPosition(settings, index, newCenter) {
  if (settings.colliders[index]) settings.colliders[index].center?.copy(newCenter);
}

// ─── Wind ─────────────────────────────────────────────────────────────────────

export function addWindForce(settings, direction, strength) {
  settings.wind = direction.clone().normalize().multiplyScalar(strength);
}

export function setWindGust(settings, strength, frequency = 0.5) {
  settings._gustStrength = strength;
  settings._gustFreq = frequency;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function resetHairToRest(strands) {
  strands.forEach(s => {
    if (!s.restPoints) return;
    s.points = s.restPoints.map(p => p.clone());
    s.velocity = s.points.map(() => new THREE.Vector3());
  });
}

export function bakeHairPhysics(strands, settings, frameCount = 60, fps = 24) {
  const baked = strands.map(s => ({ id: s.id, frames: [] }));
  const dt = 1 / fps;
  for (let f = 0; f < frameCount; f++) {
    stepHairPhysics(strands, settings, dt);
    strands.forEach((s, i) => {
      baked[i].frames.push(s.points.map(p => p.toArray()));
    });
  }
  return baked;
}

export function applyBakedHairFrame(strands, bakedData, frameIndex) {
  strands.forEach((s, i) => {
    const bd = bakedData[i];
    if (!bd?.frames[frameIndex]) return;
    bd.frames[frameIndex].forEach((pos, j) => {
      if (s.points[j]) s.points[j].fromArray(pos);
    });
  });
}

export function buildHairGeometry(strands, scene) {
  const positions = [];
  strands.forEach(strand => {
    for (let i = 0; i < strand.points.length - 1; i++) {
      positions.push(...strand.points[i].toArray(), ...strand.points[i+1].toArray());
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

export default {
  createStrand, createHairPhysicsSettings, stepHairPhysics,
  addSphereCollider, addCapsuleCollider, addPlaneCollider,
  addCollider, removeCollider, updateColliderPosition,
  addWindForce, setWindGust, resetHairToRest,
  bakeHairPhysics, applyBakedHairFrame, buildHairGeometry,
};
