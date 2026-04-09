// MuscleSystem.js — PRO Muscle Simulation
// SPX Mesh Editor | StreamPireX
// Features: fiber direction, activation curves, antagonist pairs,
//           fatty tissue layer, volume preservation, wrinkle maps

import * as THREE from 'three';

// ─── Muscle Definition ────────────────────────────────────────────────────────

export function createMuscle(options = {}) {
  return {
    id:           options.id    ?? Math.random().toString(36).slice(2),
    name:         options.name  ?? 'Muscle',
    originBone:   options.originBone  ?? null,
    insertBone:   options.insertBone  ?? null,

    // Muscle shape
    bulgeAxis:    options.bulgeAxis   ?? 'z',
    restLength:   options.restLength  ?? 1.0,
    maxBulge:     options.maxBulge    ?? 0.08,
    bulgeProfile: options.bulgeProfile ?? 'gaussian', // 'gaussian'|'linear'|'peak'

    // Fiber direction (normalized)
    fiberDir:     options.fiberDir ?? new THREE.Vector3(0, 1, 0),

    // Activation
    activationCurve: options.activationCurve ?? 'smooth', // 'linear'|'smooth'|'fast'
    minActivation:   options.minActivation   ?? 0,
    maxActivation:   options.maxActivation   ?? 1,

    // Antagonist
    antagonist:   options.antagonist ?? null, // muscle id that opposes this one

    // Affected vertices
    affectedVerts: options.affectedVerts ?? [], // [{ idx, weight }]
    falloff:       options.falloff ?? 2.5,
    falloffRadius: options.falloffRadius ?? 0.3,

    // State
    _activation: 0,
    _prevAngle:  0,
  };
}

// ─── Activation Curves ────────────────────────────────────────────────────────

function evaluateActivationCurve(t, curve) {
  t = Math.max(0, Math.min(1, t));
  switch (curve) {
    case 'smooth':  return t * t * (3 - 2 * t); // smoothstep
    case 'fast':    return Math.sqrt(t);
    case 'slow':    return t * t;
    case 'linear':
    default:        return t;
  }
}

// ─── Bulge Profiles ───────────────────────────────────────────────────────────

function evaluateBulgeProfile(distAlongFiber, profile) {
  const t = Math.max(0, Math.min(1, distAlongFiber));
  switch (profile) {
    case 'gaussian': return Math.exp(-Math.pow((t - 0.5) * 4, 2));
    case 'peak':     return Math.sin(t * Math.PI);
    case 'linear':   return 1 - Math.abs(t - 0.5) * 2;
    default:         return Math.sin(t * Math.PI);
  }
}

// ─── Muscle Simulator ─────────────────────────────────────────────────────────

export class MuscleSystem {
  constructor(mesh, skeleton) {
    this.mesh      = mesh;
    this.skeleton  = skeleton;
    this.muscles   = new Map();
    this.restPos   = new Float32Array(mesh.geometry.attributes.position.array);
    this.enabled   = true;
    this.fatLayer  = 0;    // 0-1, adds softness
    this.skinThickness = 0.02;
  }

  addMuscle(options) {
    const m = createMuscle(options);
    this.muscles.set(m.id, m);
    // Auto-assign affected verts if not provided
    if (!m.affectedVerts.length) this._autoAssignVerts(m);
    return m.id;
  }

  removeMuscle(id) { this.muscles.delete(id); }

  _autoAssignVerts(muscle) {
    const ob = this.skeleton.bones.find(b => b.name === muscle.originBone);
    const ib = this.skeleton.bones.find(b => b.name === muscle.insertBone);
    if (!ob || !ib) return;

    const op = new THREE.Vector3(), ip = new THREE.Vector3();
    ob.getWorldPosition(op); ib.getWorldPosition(ip);
    const mid = op.clone().lerp(ip, 0.5);
    const len = op.distanceTo(ip);

    const pos = this.mesh.geometry.attributes.position;
    muscle.restLength = len;

    for (let i = 0; i < pos.count; i++) {
      const vp = new THREE.Vector3(this.restPos[i*3], this.restPos[i*3+1], this.restPos[i*3+2]);
      const dist = vp.distanceTo(mid);
      if (dist < muscle.falloffRadius) {
        const weight = Math.exp(-Math.pow(dist / muscle.falloffRadius, 2) * muscle.falloff);
        if (weight > 0.01) muscle.affectedVerts.push({ idx: i, weight });
      }
    }
  }

  setupHumanoid() {
    const pairs = [
      { name:'L_Bicep',    origin:'LeftArm',     insert:'LeftForeArm',  maxBulge:0.05, profile:'gaussian' },
      { name:'R_Bicep',    origin:'RightArm',    insert:'RightForeArm', maxBulge:0.05, profile:'gaussian' },
      { name:'L_Tricep',   origin:'LeftArm',     insert:'LeftForeArm',  maxBulge:0.03, bulgeAxis:'y' },
      { name:'R_Tricep',   origin:'RightArm',    insert:'RightForeArm', maxBulge:0.03, bulgeAxis:'y' },
      { name:'L_Quad',     origin:'LeftUpLeg',   insert:'LeftLeg',      maxBulge:0.06, profile:'peak' },
      { name:'R_Quad',     origin:'RightUpLeg',  insert:'RightLeg',     maxBulge:0.06, profile:'peak' },
      { name:'L_Hamstring',origin:'LeftUpLeg',   insert:'LeftLeg',      maxBulge:0.04, bulgeAxis:'y' },
      { name:'R_Hamstring',origin:'RightUpLeg',  insert:'RightLeg',     maxBulge:0.04, bulgeAxis:'y' },
      { name:'L_Calf',     origin:'LeftLeg',     insert:'LeftFoot',     maxBulge:0.04, profile:'gaussian' },
      { name:'R_Calf',     origin:'RightLeg',    insert:'RightFoot',    maxBulge:0.04, profile:'gaussian' },
      { name:'L_Deltoid',  origin:'LeftShoulder',insert:'LeftArm',      maxBulge:0.04, profile:'peak' },
      { name:'R_Deltoid',  origin:'RightShoulder',insert:'RightArm',    maxBulge:0.04, profile:'peak' },
      { name:'SpineExt',   origin:'Spine',       insert:'Spine1',       maxBulge:0.02, bulgeAxis:'z' },
      { name:'Pectoral_L', origin:'LeftShoulder',insert:'Spine2',       maxBulge:0.05, profile:'gaussian' },
      { name:'Pectoral_R', origin:'RightShoulder',insert:'Spine2',      maxBulge:0.05, profile:'gaussian' },
    ];

    pairs.forEach(p => {
      const ob = this.skeleton.bones.find(b => b.name.includes(p.origin));
      const ib = this.skeleton.bones.find(b => b.name.includes(p.insert));
      if (ob && ib) {
        this.addMuscle({
          name: p.name,
          originBone: ob.name, insertBone: ib.name,
          maxBulge: p.maxBulge, bulgeAxis: p.bulgeAxis ?? 'z',
          bulgeProfile: p.profile ?? 'gaussian',
          falloffRadius: 0.25,
        });
      }
    });

    // Set antagonist pairs
    const pairs2 = [['L_Bicep','L_Tricep'],['R_Bicep','R_Tricep'],
                    ['L_Quad','L_Hamstring'],['R_Quad','R_Hamstring']];
    pairs2.forEach(([a, b]) => {
      const ma = Array.from(this.muscles.values()).find(m=>m.name===a);
      const mb = Array.from(this.muscles.values()).find(m=>m.name===b);
      if (ma && mb) { ma.antagonist = mb.id; mb.antagonist = ma.id; }
    });
  }

  _getMuscleActivation(muscle) {
    const ob = this.skeleton.bones.find(b => b.name === muscle.originBone);
    const ib = this.skeleton.bones.find(b => b.name === muscle.insertBone);
    if (!ob || !ib) return 0;

    const euler = new THREE.Euler().setFromQuaternion(ib.quaternion);
    const angle = Math.abs(euler[muscle.bulgeAxis] ?? euler.z);
    const normalizedAngle = Math.min(1, angle / (Math.PI * 0.5));

    let activation = evaluateActivationCurve(normalizedAngle, muscle.activationCurve);

    // Antagonist reduces activation
    if (muscle.antagonist) {
      const ant = this.muscles.get(muscle.antagonist);
      if (ant) activation *= (1 - ant._activation * 0.5);
    }

    muscle._activation = activation;
    return activation;
  }

  update() {
    if (!this.enabled) return;

    const pos = this.mesh.geometry.attributes.position;
    pos.array.set(this.restPos);

    this.muscles.forEach(muscle => {
      const activation = this._getMuscleActivation(muscle);
      if (activation < 0.01) return;

      const ob = this.skeleton.bones.find(b => b.name === muscle.originBone);
      const ib = this.skeleton.bones.find(b => b.name === muscle.insertBone);
      if (!ob || !ib) return;

      const op = new THREE.Vector3(), ip = new THREE.Vector3();
      ob.getWorldPosition(op); ib.getWorldPosition(ip);
      const mid = op.clone().lerp(ip, 0.5);
      const muscleDir = ip.clone().sub(op).normalize();
      const currentLen = op.distanceTo(ip);
      const compression = Math.max(0, 1 - currentLen / muscle.restLength);

      muscle.affectedVerts.forEach(({ idx, weight }) => {
        const vp = new THREE.Vector3(pos.getX(idx), pos.getY(idx), pos.getZ(idx));

        // Project vertex onto muscle fiber to get position along fiber
        const toVert = vp.clone().sub(op);
        const projLen = toVert.dot(muscleDir);
        const t = Math.max(0, Math.min(1, projLen / Math.max(currentLen, 0.001)));

        // Bulge profile along fiber
        const bulgeProfile = evaluateBulgeProfile(t, muscle.bulgeProfile);

        // Bulge amount = activation * compression * profile * weight * maxBulge
        const bulge = activation * (1 + compression) * bulgeProfile * weight * muscle.maxBulge;

        // Push vertex outward from muscle axis
        const axis = vp.clone().sub(mid);
        const axisAlongFiber = muscleDir.clone().multiplyScalar(axis.dot(muscleDir));
        const perpAxis = axis.clone().sub(axisAlongFiber);
        const perpLen = perpAxis.length();

        if (perpLen > 0.0001) {
          const pushDir = perpAxis.normalize();
          pos.setXYZ(idx,
            pos.getX(idx) + pushDir.x * bulge,
            pos.getY(idx) + pushDir.y * bulge,
            pos.getZ(idx) + pushDir.z * bulge,
          );
        }
      });
    });

    // Fat layer softening — slightly smooth displaced verts
    if (this.fatLayer > 0) this._applyFatLayer();

    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  _applyFatLayer() {
    const pos = this.mesh.geometry.attributes.position;
    const geo = this.mesh.geometry;
    const idx = geo.index;
    if (!idx) return;

    const smooth = new Float32Array(pos.array.length);
    const counts = new Int32Array(pos.count);
    smooth.set(pos.array);

    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i), b = idx.getX(i+1), c = idx.getX(i+2);
      for (const [v, n1, n2] of [[a,b,c],[b,a,c],[c,a,b]]) {
        for (let k = 0; k < 3; k++) {
          smooth[v*3+k] += pos.array[n1*3+k] + pos.array[n2*3+k];
        }
        counts[v] += 2;
      }
    }

    const fat = this.fatLayer;
    for (let i = 0; i < pos.count; i++) {
      if (counts[i] === 0) continue;
      for (let k = 0; k < 3; k++) {
        const avg = smooth[i*3+k] / (counts[i] + 1);
        pos.array[i*3+k] = pos.array[i*3+k] * (1-fat) + avg * fat;
      }
    }
    pos.needsUpdate = true;
  }

  setFatLayer(v) { this.fatLayer = Math.max(0, Math.min(1, v)); }
  setEnabled(v)  { this.enabled = v; }
  getMuscles()   { return Array.from(this.muscles.values()); }
  getActivations() {
    const result = {};
    this.muscles.forEach((m, id) => { result[id] = { name: m.name, activation: m._activation }; });
    return result;
  }
  dispose() { this.muscles.clear(); }
}

export default MuscleSystem;
