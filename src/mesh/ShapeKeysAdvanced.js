// ShapeKeysAdvanced.js — UPGRADE: Corrective + Driven Shape Keys + Muscle Sim
// SPX Mesh Editor | StreamPireX
// Features: corrective shapes, driven shapes, combination shapes,
//           muscle simulation, inbetween shapes, shape key drivers

import * as THREE from 'three';

// ─── Shape Key Creation ───────────────────────────────────────────────────────

export function createAdvancedShapeKey(name, mesh, opts = {}) {
  const pos = mesh.geometry.attributes.position;
  return {
    id:           crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    name,
    data:         new Float32Array(pos.array),
    value:        0,
    mute:         false,
    locked:       false,
    relativeKey:  opts.relativeKey  ?? 'Basis',
    driver:       opts.driver       ?? null,   // { type, boneA, boneB, axis, minAngle, maxAngle }
    range:        opts.range        ?? [0, 1],
    sliderMin:    opts.sliderMin    ?? 0,
    sliderMax:    opts.sliderMax    ?? 1,
    category:     opts.category     ?? 'shape', // 'shape' | 'corrective' | 'muscle' | 'inbetween'
    inbetweens:   opts.inbetweens   ?? [],       // [{ value, data }] for multi-target interpolation
    combinations: opts.combinations ?? [],       // [{ keyName, weight }] combo shapes
  };
}

export function addAdvancedShapeKey(keys, name, mesh, opts = {}) {
  const k = createAdvancedShapeKey(name, mesh, opts);
  keys.push(k);
  return k;
}

export function removeShapeKey(keys, id) {
  const i = keys.findIndex(k => k.id === id);
  if (i !== -1) keys.splice(i, 1);
  return keys;
}

// ─── Corrective Shape Keys ────────────────────────────────────────────────────

/**
 * Create a corrective shape key that triggers when a bone reaches a certain angle
 * triggerBone: bone name, triggerAngle: degrees, tolerance: degrees
 */
export function createCorrectiveShapeKey(name, mesh, triggerBone, triggerAngle, tolerance = 15, opts = {}) {
  return createAdvancedShapeKey(name, mesh, {
    ...opts,
    category: 'corrective',
    driver: {
      type:        'bone_angle',
      bone:        triggerBone,
      triggerAngle,
      tolerance,
      axis:        opts.axis ?? 'z',
    },
  });
}

export function evaluateCorrectiveShapeKey(key, skeleton) {
  if (!key.driver || key.driver.type !== 'bone_angle') return key.value;
  const bone = skeleton?.bones?.find(b => b.name === key.driver.bone);
  if (!bone) return 0;

  const euler = new THREE.Euler().setFromQuaternion(bone.quaternion);
  const axisMap = { x: euler.x, y: euler.y, z: euler.z };
  const angle = (axisMap[key.driver.axis] ?? 0) * 180 / Math.PI;
  const diff = Math.abs(angle - key.driver.triggerAngle);

  if (diff > key.driver.tolerance) return 0;
  return 1 - diff / key.driver.tolerance;
}

// ─── Driven Shape Keys ────────────────────────────────────────────────────────

export function createDrivenShapeKey(name, mesh, driverConfig, opts = {}) {
  return createAdvancedShapeKey(name, mesh, {
    ...opts,
    category: 'shape',
    driver: driverConfig,
  });
}

export function evaluateDrivenShapeKey(key, context = {}) {
  if (!key.driver) return key.value;
  const { type } = key.driver;

  switch (type) {
    case 'bone_angle': return evaluateCorrectiveShapeKey(key, context.skeleton);
    case 'bone_location': {
      const bone = context.skeleton?.bones?.find(b => b.name === key.driver.bone);
      if (!bone) return 0;
      const val = bone.position[key.driver.axis ?? 'y'];
      return THREE.MathUtils.mapLinear(val, key.driver.min ?? 0, key.driver.max ?? 1, 0, 1);
    }
    case 'custom': return key.driver.evaluate?.(context) ?? 0;
    default: return key.value;
  }
}

// ─── Combination Shapes ───────────────────────────────────────────────────────

/**
 * A combination shape activates only when multiple shapes are active simultaneously
 * Useful for elbow/shoulder correctives that only need fixing at specific pose combos
 */
export function createCombinationShapeKey(name, mesh, combinations, opts = {}) {
  return createAdvancedShapeKey(name, mesh, {
    ...opts,
    category: 'corrective',
    combinations, // [{ keyName: 'smile', weight: 0.8 }, { keyName: 'eyeClose', weight: 0.6 }]
  });
}

export function evaluateCombinationWeight(key, keys) {
  if (!key.combinations?.length) return key.value;
  let combo = 1;
  for (const c of key.combinations) {
    const other = keys.find(k => k.name === c.keyName);
    if (!other) return 0;
    combo *= Math.min(1, other.value / (c.weight || 1));
  }
  return combo;
}

// ─── Inbetween Shapes ────────────────────────────────────────────────────────

/**
 * Inbetween shapes define intermediate targets at specific value points
 * e.g. a shape at value=0.5 that adjusts the blend between 0 and 1
 */
export function addInbetween(key, atValue, mesh) {
  const pos = mesh.geometry.attributes.position;
  key.inbetweens.push({
    value: atValue,
    data:  new Float32Array(pos.array),
  });
  key.inbetweens.sort((a, b) => a.value - b.value);
}

function interpolateInbetween(key, t) {
  if (!key.inbetweens?.length) return null;

  // Add boundary points
  const points = [
    { value: 0, data: key.inbetweens[0]?.data ?? key.data },
    ...key.inbetweens,
    { value: 1, data: key.data },
  ];

  // Find bracketing inbetweens
  let lo = points[0], hi = points[points.length - 1];
  for (let i = 0; i < points.length - 1; i++) {
    if (t >= points[i].value && t <= points[i+1].value) {
      lo = points[i]; hi = points[i+1]; break;
    }
  }

  const alpha = (hi.value - lo.value) > 0
    ? (t - lo.value) / (hi.value - lo.value) : 0;

  const result = new Float32Array(lo.data.length);
  for (let i = 0; i < result.length; i++) {
    result[i] = lo.data[i] * (1 - alpha) + hi.data[i] * alpha;
  }
  return result;
}

// ─── Shape Key Evaluation ─────────────────────────────────────────────────────

export function evaluateShapeKeysAdvanced(mesh, keys, context = {}) {
  if (!keys?.length || !mesh?.geometry?.attributes?.position) return;

  const pos   = mesh.geometry.attributes.position;
  const basis = keys.find(k => k.name === 'Basis');
  if (!basis) return;

  // Start from basis
  for (let i = 0; i < pos.array.length; i++) pos.array[i] = basis.data[i];

  for (const key of keys) {
    if (key.name === 'Basis' || key.mute) continue;

    // Get effective value
    let value = key.value;
    if (key.driver) value = evaluateDrivenShapeKey(key, context);
    if (key.combinations?.length) value = evaluateCombinationWeight(key, keys);
    value = Math.max(key.range[0], Math.min(key.range[1], value));
    if (value === 0) continue;

    // Get target data (inbetween or direct)
    const targetData = key.inbetweens?.length
      ? interpolateInbetween(key, value)
      : key.data;

    if (!targetData) continue;

    // Get relative basis
    const relKey = keys.find(k => k.name === key.relativeKey);
    const relData = relKey?.data ?? basis.data;

    // Apply delta
    for (let i = 0; i < pos.array.length; i++) {
      pos.array[i] += (targetData[i] - relData[i]) * value;
    }
  }

  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

// ─── Muscle Simulation ────────────────────────────────────────────────────────

export class MuscleSimulator {
  constructor(mesh, skeleton) {
    this.mesh      = mesh;
    this.skeleton  = skeleton;
    this.muscles   = [];
    this.restPos   = new Float32Array(mesh.geometry.attributes.position.array);
    this.enabled   = true;
  }

  addMuscle(options = {}) {
    const {
      name        = 'Muscle',
      originBone  = null,   // bone at muscle origin
      insertBone  = null,   // bone at muscle insertion
      bulgeAxis   = 'y',    // which axis the muscle bulges on
      bulgeAmount = 0.05,   // max bulge at full contraction
      affectedVerts = [],   // vertex indices affected
      falloff     = 2.0,    // distance falloff
    } = options;

    this.muscles.push({ name, originBone, insertBone, bulgeAxis, bulgeAmount, affectedVerts, falloff, _prevAngle: 0 });
  }

  autoDetectMuscles() {
    // Auto-create muscles for standard joints
    const pairs = [
      { name: 'LeftBicep',   origin: 'LeftArm',    insert: 'LeftForeArm',  bulgeAxis: 'z', bulgeAmount: 0.04 },
      { name: 'RightBicep',  origin: 'RightArm',   insert: 'RightForeArm', bulgeAxis: 'z', bulgeAmount: 0.04 },
      { name: 'LeftQuad',    origin: 'LeftUpLeg',  insert: 'LeftLeg',      bulgeAxis: 'z', bulgeAmount: 0.05 },
      { name: 'RightQuad',   origin: 'RightUpLeg', insert: 'RightLeg',     bulgeAxis: 'z', bulgeAmount: 0.05 },
      { name: 'LeftCalf',    origin: 'LeftLeg',    insert: 'LeftFoot',     bulgeAxis: 'z', bulgeAmount: 0.03 },
      { name: 'RightCalf',   origin: 'RightLeg',   insert: 'RightFoot',    bulgeAxis: 'z', bulgeAmount: 0.03 },
    ];

    pairs.forEach(p => {
      const ob = this.skeleton.bones.find(b => b.name.includes(p.origin));
      const ib = this.skeleton.bones.find(b => b.name.includes(p.insert));
      if (ob && ib) {
        this.addMuscle({ ...p, originBone: ob.name, insertBone: ib.name });
      }
    });
  }

  update() {
    if (!this.enabled || !this.muscles.length) return;

    const pos = this.mesh.geometry.attributes.position;
    pos.array.set(this.restPos);

    this.muscles.forEach(muscle => {
      const ob = this.skeleton.bones.find(b => b.name === muscle.originBone);
      const ib = this.skeleton.bones.find(b => b.name === muscle.insertBone);
      if (!ob || !ib) return;

      // Get joint angle to determine contraction
      const euler = new THREE.Euler().setFromQuaternion(ib.quaternion);
      const angle = Math.abs(euler[muscle.bulgeAxis] ?? euler.z);
      const contraction = Math.sin(angle) * muscle.bulgeAmount;

      // Get bone midpoint world position
      const op = new THREE.Vector3(), ip = new THREE.Vector3();
      ob.getWorldPosition(op); ib.getWorldPosition(ip);
      const mid = op.clone().lerp(ip, 0.5);

      // Apply bulge to nearby vertices
      for (let i = 0; i < pos.count; i++) {
        const vp = new THREE.Vector3().fromBufferAttribute(pos, i);
        const dist = vp.distanceTo(mid);
        const influence = Math.exp(-dist * muscle.falloff) * contraction;

        if (Math.abs(influence) < 0.0001) continue;

        // Bulge outward from bone axis
        const toVert = vp.clone().sub(mid).normalize();
        pos.setXYZ(i,
          pos.getX(i) + toVert.x * influence,
          pos.getY(i) + toVert.y * influence,
          pos.getZ(i) + toVert.z * influence,
        );
      }
    });

    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  setEnabled(v) { this.enabled = v; }
  getMuscles()  { return this.muscles; }
  dispose()     { this.muscles = []; }
}

// ─── Preset Shape Keys ────────────────────────────────────────────────────────

export const FACE_SHAPE_PRESETS = [
  'Basis', 'JawOpen', 'JawLeft', 'JawRight', 'JawForward',
  'MouthSmileLeft', 'MouthSmileRight', 'MouthFrownLeft', 'MouthFrownRight',
  'MouthPucker', 'MouthWide', 'MouthUpperUp', 'MouthLowerDown',
  'EyeBlinkLeft', 'EyeBlinkRight', 'EyeOpenLeft', 'EyeOpenRight',
  'EyeSquintLeft', 'EyeSquintRight', 'EyeWideLeft', 'EyeWideRight',
  'BrowInnerUp', 'BrowOuterUpLeft', 'BrowOuterUpRight',
  'BrowDownLeft', 'BrowDownRight',
  'CheekPuff', 'CheekSquintLeft', 'CheekSquintRight',
  'NoseSneerLeft', 'NoseSneerRight',
  'TongueOut',
];

export const BODY_SHAPE_PRESETS = [
  'Basis',
  'ElbowBendLeft', 'ElbowBendRight',
  'KneeBendLeft', 'KneeBendRight',
  'ShoulderRaiseLeft', 'ShoulderRaiseRight',
  'SpineBend', 'SpineTwist',
  'HipShift',
];

export default {
  createAdvancedShapeKey, addAdvancedShapeKey, removeShapeKey,
  createCorrectiveShapeKey, evaluateCorrectiveShapeKey,
  createDrivenShapeKey, evaluateDrivenShapeKey,
  createCombinationShapeKey, evaluateCombinationWeight,
  addInbetween, evaluateShapeKeysAdvanced,
  MuscleSimulator,
  FACE_SHAPE_PRESETS, BODY_SHAPE_PRESETS,
};
export function mirrorShapeKey(key, axis) { axis=axis||'x'; var m={...key,id:Math.random().toString(36).slice(2),name:key.name+'_mirror',data:new Float32Array(key.data)}; var ai={x:0,y:1,z:2}[axis]||0; for(var i=ai;i<m.data.length;i+=3)m.data[i]*=-1; return m; }
export function blendShapeKeys(a, b, t) { t=t||0.5; if(a.data.length!==b.data.length)return a; var d=new Float32Array(a.data.length); for(var i=0;i<d.length;i++)d[i]=a.data[i]*(1-t)+b.data[i]*t; return {...a,name:a.name+'_blend',data:d}; }
export function driverShapeKey(key, cfg) { return {...key,driver:cfg}; }
export function buildMorphTargetsFromKeys(keys) { return keys.filter(k=>k.name!=='Basis').map(k=>({name:k.name,vertices:Array.from(k.data)})); }
export function getShapeKeyStats(keys) { return {total:keys.length,active:keys.filter(k=>k.value>0).length,muted:keys.filter(k=>k.mute).length}; }
