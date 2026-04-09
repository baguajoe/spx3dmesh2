// HairRigPhysics.js — PRO Hair Rig Physics
// SPX Mesh Editor | StreamPireX
// Connects hair strands to skeleton bones with proper bone-following,
// wind zones, per-bone stiffness, collision capsules from skeleton

import * as THREE from 'three';

export class HairRigPhysics {
  constructor(skeleton, options = {}) {
    this.skeleton    = skeleton;
    this.strands     = [];
    this.stiffness   = options.stiffness   ?? 0.85;
    this.damping     = options.damping     ?? 0.98;
    this.gravity     = options.gravity     ?? -9.8;
    this.wind        = options.wind        ?? new THREE.Vector3(0, 0, 0);
    this.turbulence  = options.turbulence  ?? 0.2;
    this.iterations  = options.iterations  ?? 8;
    this.subSteps    = options.subSteps    ?? 3;
    this.colliders   = [];
    this._time       = 0;
    this._autoColliders = options.autoColliders ?? true;
    if (this._autoColliders) this._buildSkeletonColliders();
  }

  _buildSkeletonColliders() {
    if (!this.skeleton?.bones) return;
    const bonePairs = [
      ['Head', 'Neck'], ['Neck', 'Spine'], ['LeftArm', 'LeftForeArm'],
      ['RightArm', 'RightForeArm'], ['LeftUpLeg', 'LeftLeg'], ['RightUpLeg', 'RightLeg'],
    ];
    bonePairs.forEach(([nameA, nameB]) => {
      const boneA = this.skeleton.bones.find(b => b.name.includes(nameA));
      const boneB = this.skeleton.bones.find(b => b.name.includes(nameB));
      if (!boneA || !boneB) return;
      const posA = new THREE.Vector3(), posB = new THREE.Vector3();
      boneA.getWorldPosition(posA); boneB.getWorldPosition(posB);
      const radius = posA.distanceTo(posB) * 0.2;
      this.colliders.push({ type: 'capsule', boneA: boneA.name, boneB: boneB.name, radius, _posA: posA, _posB: posB });
    });
  }

  _updateColliders() {
    this.colliders.forEach(col => {
      if (col.type === 'capsule' && col.boneA && col.boneB) {
        const bA = this.skeleton.bones.find(b => b.name === col.boneA);
        const bB = this.skeleton.bones.find(b => b.name === col.boneB);
        if (bA) bA.getWorldPosition(col._posA);
        if (bB) bB.getWorldPosition(col._posB);
      }
    });
  }

  attachStrand(rootBoneName, options = {}) {
    const bone = this.skeleton?.bones?.find(b => b.name === rootBoneName);
    if (!bone) return null;

    const rootPos = new THREE.Vector3();
    bone.getWorldPosition(rootPos);

    const segments = options.segments ?? 10;
    const length   = options.length   ?? 0.3;
    const segLen   = length / segments;

    const points = [], velocity = [], restPoints = [];
    for (let i = 0; i <= segments; i++) {
      const p = rootPos.clone().addScaledVector(new THREE.Vector3(0, -1, 0), i * segLen);
      points.push(p.clone());
      restPoints.push(p.clone());
      velocity.push(new THREE.Vector3());
    }

    const strand = {
      id:         Math.random().toString(36).slice(2),
      rootBone:   rootBoneName,
      bone,
      points,
      restPoints,
      velocity,
      segments,
      length,
      stiffness:  options.stiffness ?? this.stiffness,
      thickness:  options.thickness ?? 0.005,
      color:      options.color     ?? '#4a2c0a',
    };

    this.strands.push(strand);
    return strand;
  }

  attachStrandsToHead(count = 20, options = {}) {
    const headBone = this.skeleton?.bones?.find(b => b.name.includes('Head'));
    if (!headBone) return;

    const headPos = new THREE.Vector3();
    headBone.getWorldPosition(headPos);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const offset = new THREE.Vector3(Math.cos(angle) * 0.08, 0.05 + Math.random() * 0.03, Math.sin(angle) * 0.08);
      const strandOptions = {
        ...options,
        length: 0.2 + Math.random() * 0.3,
        segments: 8,
        stiffness: 0.7 + Math.random() * 0.2,
      };
      this.attachStrand('Head', strandOptions);
      if (this.strands.length) {
        const strand = this.strands[this.strands.length - 1];
        strand.points.forEach((p, i) => p.add(offset.clone().multiplyScalar(1 - i / strand.segments)));
        strand.restPoints.forEach((p, i) => p.add(offset.clone().multiplyScalar(1 - i / strand.segments)));
      }
    }
  }

  step(dt = 1/60) {
    this._time += dt;
    this._updateColliders();
    const subDt = dt / this.subSteps;

    for (let sub = 0; sub < this.subSteps; sub++) {
      this.strands.forEach(strand => {
        // Update root to follow bone
        if (strand.bone) {
          strand.bone.getWorldPosition(strand.points[0]);
          strand.restPoints[0].copy(strand.points[0]);
          strand.velocity[0].set(0, 0, 0);
        }

        const gravVec = new THREE.Vector3(0, this.gravity * 0.001, 0);
        const turb = new THREE.Vector3(
          Math.sin(this._time * 2.3 + strand.points[1]?.x ?? 0) * this.turbulence * 0.002,
          0,
          Math.cos(this._time * 1.7 + strand.points[1]?.z ?? 0) * this.turbulence * 0.002,
        );
        const windForce = this.wind.clone().add(turb);

        for (let i = 1; i < strand.points.length; i++) {
          const prev = strand.points[i].clone();
          strand.velocity[i].add(gravVec).add(windForce).multiplyScalar(this.damping);
          strand.points[i].add(strand.velocity[i].clone().multiplyScalar(subDt * 60));

          for (let iter = 0; iter < this.iterations; iter++) {
            // Distance constraint
            const parent = strand.points[i-1];
            const segLen = strand.length / strand.segments;
            const diff = strand.points[i].clone().sub(parent);
            const dist = diff.length();
            if (dist > 0.0001) strand.points[i].sub(diff.multiplyScalar((dist - segLen) / dist * 0.5));

            // Stiffness
            if (strand.restPoints[i]) strand.points[i].lerp(strand.restPoints[i], strand.stiffness * 0.004);

            // Skeleton capsule colliders
            this.colliders.forEach(col => {
              if (col.type === 'capsule' && col._posA && col._posB) {
                const ab = col._posB.clone().sub(col._posA);
                const t = Math.max(0, Math.min(1, strand.points[i].clone().sub(col._posA).dot(ab) / ab.lengthSq()));
                const closest = col._posA.clone().addScaledVector(ab, t);
                const d = strand.points[i].clone().sub(closest);
                const dist = d.length();
                if (dist < col.radius + 0.002) strand.points[i].copy(closest).addScaledVector(d.normalize(), col.radius + 0.002);
              }
            });
          }

          strand.velocity[i].copy(strand.points[i].clone().sub(prev).multiplyScalar(subDt > 0 ? 1/subDt : 0));
        }
      });
    }
  }

  setWind(direction, strength) { this.wind = direction.clone().normalize().multiplyScalar(strength); }
  addCollider(col) { this.colliders.push(col); }
  getStrands() { return this.strands; }
  reset() { this.strands.forEach(s => { s.points = s.restPoints.map(p => p.clone()); s.velocity = s.points.map(() => new THREE.Vector3()); }); }
  dispose() { this.strands = []; }
}

export default HairRigPhysics;

export function createPonytailRig(skeleton, options) {
  const rig = new HairRigPhysics(skeleton, options);
  rig.attachStrand('Head', { segments: 12, length: 0.5, stiffness: 0.6, ...options });
  return rig;
}
export function attachCardsToRig(rig, count, options) {
  for (let i = 0; i < count; i++) rig.attachStrand('Head', { segments: 8, length: 0.3, ...options });
  return rig;
}
export function stepHairPhysics(rig, dt) { rig.step(dt); }
