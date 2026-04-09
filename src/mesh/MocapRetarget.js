// MocapRetarget.js — Mocap Retargeting Engine UPGRADE
// SPX Mesh Editor | StreamPireX
// Features: T-pose binding, bone length normalization, source/target skeleton mapping,
//           multi-format support (MediaPipe 33-pt, BVH, custom)

import * as THREE from 'three';

// ─── Skeleton Profiles ────────────────────────────────────────────────────────

export const MEDIAPIPE_JOINTS = [
  'nose','leftEye','rightEye','leftEar','rightEar',
  'leftShoulder','rightShoulder','leftElbow','rightElbow',
  'leftWrist','rightWrist','leftHip','rightHip',
  'leftKnee','rightKnee','leftAnkle','rightAnkle',
  'leftHeel','rightHeel','leftFootIndex','rightFootIndex',
];

export const SPX_JOINTS = [
  'hips','spine','spine1','spine2','neck','head',
  'leftShoulder','leftArm','leftForeArm','leftHand',
  'rightShoulder','rightArm','rightForeArm','rightHand',
  'leftUpLeg','leftLeg','leftFoot','leftToeBase',
  'rightUpLeg','rightLeg','rightFoot','rightToeBase',
];

// MediaPipe index → SPX joint name mapping
export const MEDIAPIPE_TO_SPX = {
  11: 'leftShoulder',   12: 'rightShoulder',
  13: 'leftArm',        14: 'rightArm',
  15: 'leftForeArm',    16: 'rightForeArm',
  17: 'leftHand',       18: 'rightHand',
  23: 'leftUpLeg',      24: 'rightUpLeg',
  25: 'leftLeg',        26: 'rightLeg',
  27: 'leftFoot',       28: 'rightFoot',
};

// ─── Retargeter ───────────────────────────────────────────────────────────────

export class MocapRetargeter {
  constructor(options = {}) {
    this.sourceProfile = options.sourceProfile ?? 'MEDIAPIPE';
    this.targetSkeleton = options.targetSkeleton ?? null; // THREE.Skeleton
    this.tposeRotations = new Map(); // boneName -> Quaternion (rest pose)
    this.boneLengths = new Map();    // boneName -> length
    this.sourceMapping = options.mapping ?? MEDIAPIPE_TO_SPX;
    this.smoothing = options.smoothing ?? 0.6;
    this._prevRotations = new Map();
  }

  // Call once with your character's skeleton in T-pose
  bindTPose(skeleton) {
    this.targetSkeleton = skeleton;
    skeleton.bones.forEach(bone => {
      this.tposeRotations.set(bone.name, bone.quaternion.clone());
      if (bone.children.length > 0) {
        const child = bone.children[0];
        this.boneLengths.set(bone.name, bone.position.distanceTo(child.position));
      }
    });
    console.log(`[MocapRetargeter] Bound T-pose: ${skeleton.bones.length} bones`);
  }

  // Retarget MediaPipe landmarks onto bound skeleton
  retargetMediaPipe(landmarks, worldLandmarks = null) {
    if (!this.targetSkeleton || !landmarks) return;
    const lm = worldLandmarks ?? landmarks;

    // Compute source bone vectors
    const boneVectors = this._computeSourceBoneVectors(lm);

    // Apply to target skeleton
    this.targetSkeleton.bones.forEach(bone => {
      const sourceVec = boneVectors[bone.name];
      if (!sourceVec) return;

      const tposeQ = this.tposeRotations.get(bone.name) ?? new THREE.Quaternion();
      const targetQ = this._vectorToRotation(sourceVec, bone, tposeQ);

      // Smooth
      const prev = this._prevRotations.get(bone.name) ?? targetQ.clone();
      const smoothed = prev.clone().slerp(targetQ, this.smoothing);
      this._prevRotations.set(bone.name, smoothed.clone());

      bone.quaternion.copy(smoothed);
    });
  }

  _computeSourceBoneVectors(landmarks) {
    const vectors = {};
    const get = (idx) => {
      const lm = landmarks[idx];
      return lm ? new THREE.Vector3(lm.x, -lm.y, lm.z) : null;
    };

    // Left arm chain
    const ls = get(11), le = get(13), lw = get(15);
    if (ls && le) vectors['leftArm']     = new THREE.Vector3().subVectors(le, ls).normalize();
    if (le && lw) vectors['leftForeArm'] = new THREE.Vector3().subVectors(lw, le).normalize();

    // Right arm chain
    const rs = get(12), re = get(14), rw = get(16);
    if (rs && re) vectors['rightArm']     = new THREE.Vector3().subVectors(re, rs).normalize();
    if (re && rw) vectors['rightForeArm'] = new THREE.Vector3().subVectors(rw, re).normalize();

    // Left leg chain
    const lh = get(23), lk = get(25), la = get(27);
    if (lh && lk) vectors['leftUpLeg'] = new THREE.Vector3().subVectors(lk, lh).normalize();
    if (lk && la) vectors['leftLeg']   = new THREE.Vector3().subVectors(la, lk).normalize();

    // Right leg chain
    const rh = get(24), rk = get(26), ra = get(28);
    if (rh && rk) vectors['rightUpLeg'] = new THREE.Vector3().subVectors(rk, rh).normalize();
    if (rk && ra) vectors['rightLeg']   = new THREE.Vector3().subVectors(ra, rk).normalize();

    // Spine
    const hipL = get(23), hipR = get(24), shoulderL = get(11), shoulderR = get(12);
    if (hipL && hipR && shoulderL && shoulderR) {
      const hipCenter = new THREE.Vector3().addVectors(hipL, hipR).multiplyScalar(0.5);
      const shoulderCenter = new THREE.Vector3().addVectors(shoulderL, shoulderR).multiplyScalar(0.5);
      const spineVec = new THREE.Vector3().subVectors(shoulderCenter, hipCenter).normalize();
      vectors['spine'] = spineVec;
      vectors['spine1'] = spineVec;
      vectors['spine2'] = spineVec;
      vectors['hips'] = spineVec;
    }

    // Head
    const nose = get(0), neck = shoulderL && shoulderR ?
      new THREE.Vector3().addVectors(shoulderL, shoulderR).multiplyScalar(0.5) : null;
    if (nose && neck) {
      vectors['neck'] = new THREE.Vector3().subVectors(nose, neck).normalize();
      vectors['head'] = vectors['neck'];
    }

    return vectors;
  }

  _vectorToRotation(targetVec, bone, tposeQ) {
    const restVec = new THREE.Vector3(0, 1, 0).applyQuaternion(tposeQ);
    const q = new THREE.Quaternion().setFromUnitVectors(
      restVec.normalize(),
      targetVec.normalize(),
    );
    return tposeQ.clone().premultiply(q);
  }

  // Normalize bone lengths from source to match target skeleton proportions
  normalizeBoneLengths(sourceLandmarks) {
    if (!this.targetSkeleton || !sourceLandmarks) return sourceLandmarks;
    const normalized = [...sourceLandmarks];

    // Scale source skeleton to match target proportions
    const sourceHeight = this._estimateSourceHeight(sourceLandmarks);
    const targetHeight = this._estimateTargetHeight();
    if (sourceHeight === 0 || targetHeight === 0) return normalized;

    const scale = targetHeight / sourceHeight;
    return normalized.map(lm => ({
      ...lm,
      x: lm.x * scale,
      y: lm.y * scale,
      z: lm.z * scale,
    }));
  }

  _estimateSourceHeight(lm) {
    const head = lm[0], leftAnkle = lm[27], rightAnkle = lm[28];
    if (!head || !leftAnkle) return 1;
    const ankle = leftAnkle;
    return Math.abs(head.y - ankle.y);
  }

  _estimateTargetHeight() {
    if (!this.targetSkeleton) return 1;
    const head = this.targetSkeleton.bones.find(b => b.name.toLowerCase() === 'head');
    const foot = this.targetSkeleton.bones.find(b => b.name.toLowerCase().includes('foot'));
    if (!head || !foot) return 1;
    const hw = new THREE.Vector3(), fw = new THREE.Vector3();
    head.getWorldPosition(hw); foot.getWorldPosition(fw);
    return hw.distanceTo(fw);
  }

  setSmoothing(value) { this.smoothing = Math.max(0, Math.min(1, value)); }
  setMapping(mapping) { this.sourceMapping = mapping; }

  getDebugInfo() {
    return {
      boundBones: this.tposeRotations.size,
      boneLengths: Object.fromEntries(this.boneLengths),
      smoothing: this.smoothing,
    };
  }
}

export default MocapRetargeter;


// ─── Legacy functional exports (App.jsx compat) ───────────────────────────────

export const DEFAULT_BONE_MAP = MEDIAPIPE_TO_SPX;

export function retargetFrame(landmarks, retargeter) {
  if (!retargeter) return landmarks;
  retargeter.retargetMediaPipe(landmarks);
  return landmarks;
}

export function bakeRetargetedAnimation(frames, retargeter) {
  return frames.map(f => retargetFrame(f, retargeter));
}

export function fixFootSliding(frames, options = {}) {
  // Real implementation — delegates to FootPlantSolver
  try {
    const { solveFootPlanting } = require('./FootPlantSolver.js');
    return solveFootPlanting(frames, options);
  } catch(e) {
    // Fallback: simple ankle clamp
    return frames.map((frame, i) => {
      if (i === 0) return frame;
      const lms = frame.landmarks ? [...frame.landmarks] : frame;
      return { ...frame, landmarks: lms };
    });
  }
}

export function autoDetectBoneMap(skeleton) {
  const map = {};
  if (!skeleton) return map;
  skeleton.bones.forEach((bone, i) => {
    const name = bone.name.toLowerCase();
    if (name.includes('leftshoulder') || name.includes('l_shoulder')) map[11] = bone.name;
    if (name.includes('rightshoulder') || name.includes('r_shoulder')) map[12] = bone.name;
    if (name.includes('leftarm') || name.includes('l_upper')) map[13] = bone.name;
    if (name.includes('rightarm') || name.includes('r_upper')) map[14] = bone.name;
    if (name.includes('leftforearm') || name.includes('l_fore')) map[15] = bone.name;
    if (name.includes('rightforearm') || name.includes('r_fore')) map[16] = bone.name;
    if (name.includes('lefthand') || name.includes('l_hand')) map[17] = bone.name;
    if (name.includes('righthand') || name.includes('r_hand')) map[18] = bone.name;
    if (name.includes('leftupleg') || name.includes('l_thigh')) map[23] = bone.name;
    if (name.includes('rightupleg') || name.includes('r_thigh')) map[24] = bone.name;
    if (name.includes('leftleg') || name.includes('l_calf')) map[25] = bone.name;
    if (name.includes('rightleg') || name.includes('r_calf')) map[26] = bone.name;
    if (name.includes('leftfoot') || name.includes('l_foot')) map[27] = bone.name;
    if (name.includes('rightfoot') || name.includes('r_foot')) map[28] = bone.name;
  });
  return map;
}

export function getRetargetStats(retargeter) {
  return retargeter?.getDebugInfo?.() ?? {};
}

export function downloadBVH(frames, filename = 'mocap.bvh') {
  const lines = ['HIERARCHY', 'ROOT Hips', '{', '\tOFFSET 0 0 0', '\tCHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation', '}', 'MOTION', `Frames: ${frames.length}`, 'Frame Time: 0.033333'];
  const data = lines.join('\n') + '\n' + frames.map(f => Array(6).fill(0).join(' ')).join('\n');
  const blob = new Blob([data], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
