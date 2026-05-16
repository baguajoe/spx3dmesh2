// AvatarRigPlayer3D.jsx — ROTATION-BASED bone mapping for Mixamo rigs
// Replaces the old position-based system that caused static/broken avatars
// Drop-in replacement: src/front/js/component/AvatarRigPlayer3D.jsx

import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils';
import { OneEuroFilter } from '../utils/OneEuroFilter';
import * as Kalidokit from 'kalidokit'; // SPX_MOCAP_KALIDOKIT_V1
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'; // SPX_MOCAP_VRM_V1

// ─────────────────────────────────────────────────────────────
// MEDIAPIPE POSE LANDMARK INDICES
// ─────────────────────────────────────────────────────────────
const MP = {
  NOSE: 0,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
};

// ─────────────────────────────────────────────────────────────
// MIXAMO BONE NAMES (works with X Bot, Y Bot, any Mixamo char)
// We try multiple naming conventions to handle different rigs
// ─────────────────────────────────────────────────────────────
const BONE_NAME_VARIANTS = {
  hips:           ['mixamorig:Hips', 'mixamorigHips', 'Hips', 'hips', 'pelvis'],
  spine:          ['mixamorig:Spine', 'mixamorigSpine', 'Spine', 'spine'],
  spine1:         ['mixamorig:Spine1', 'mixamorigSpine1', 'Spine1', 'Chest', 'chest'],
  spine2:         ['mixamorig:Spine2', 'mixamorigSpine2', 'Spine2', 'UpperChest'],
  neck:           ['mixamorig:Neck', 'mixamorigNeck', 'Neck', 'neck'],
  head:           ['mixamorig:Head', 'mixamorigHead', 'Head', 'head'],
  leftShoulder:   ['mixamorig:LeftShoulder', 'mixamorigLeftShoulder', 'LeftShoulder', 'l_clavicle'],
  leftArm:        ['mixamorig:LeftArm', 'mixamorigLeftArm', 'LeftArm', 'LeftUpperArm', 'l_upper_arm'],
  leftForeArm:    ['mixamorig:LeftForeArm', 'mixamorigLeftForeArm', 'LeftForeArm', 'LeftLowerArm', 'l_forearm'],
  leftHand:       ['mixamorig:LeftHand', 'mixamorigLeftHand', 'LeftHand', 'l_hand'],
  rightShoulder:  ['mixamorig:RightShoulder', 'mixamorigRightShoulder', 'RightShoulder', 'r_clavicle'],
  rightArm:       ['mixamorig:RightArm', 'mixamorigRightArm', 'RightArm', 'RightUpperArm', 'r_upper_arm'],
  rightForeArm:   ['mixamorig:RightForeArm', 'mixamorigRightForeArm', 'RightForeArm', 'RightLowerArm', 'r_forearm'],
  rightHand:      ['mixamorig:RightHand', 'mixamorigRightHand', 'RightHand', 'r_hand'],
  leftUpLeg:      ['mixamorig:LeftUpLeg', 'mixamorigLeftUpLeg', 'LeftUpLeg', 'LeftThigh', 'l_femur'],
  leftLeg:        ['mixamorig:LeftLeg', 'mixamorigLeftLeg', 'LeftLeg', 'LeftShin', 'l_tibia'],
  leftFoot:       ['mixamorig:LeftFoot', 'mixamorigLeftFoot', 'LeftFoot', 'l_foot'],
  leftToeBase:    ['mixamorig:LeftToeBase', 'mixamorigLeftToeBase', 'LeftToeBase', 'l_toe_base'],
  rightUpLeg:     ['mixamorig:RightUpLeg', 'mixamorigRightUpLeg', 'RightUpLeg', 'RightThigh', 'r_femur'],
  rightLeg:       ['mixamorig:RightLeg', 'mixamorigRightLeg', 'RightLeg', 'RightShin', 'r_tibia'],

  // Face bones
  jaw:         ['mixamorig:Jaw','mixamorigJaw','Jaw','jaw','CC_Base_JawRoot'],
  leftEye:     ['mixamorig:LeftEye','mixamorigLeftEye','LeftEye','CC_Base_L_Eye'],
  rightEye:    ['mixamorig:RightEye','mixamorigRightEye','RightEye','CC_Base_R_Eye'],
  leftBrow:    ['mixamorig:LeftEyeBrow1','LeftEyeBrow1','CC_Base_L_Brow1'],
  rightBrow:   ['mixamorig:RightEyeBrow1','RightEyeBrow1','CC_Base_R_Brow1'],
  rightFoot:      ['mixamorig:RightFoot', 'mixamorigRightFoot', 'RightFoot', 'r_foot'],
  rightToeBase:   ['mixamorig:RightToeBase', 'mixamorigRightToeBase', 'RightToeBase', 'r_toe_base'],
};

// ─────────────────────────────────────────────────────────────
// HELPER: Find a bone by trying multiple name variants
// ─────────────────────────────────────────────────────────────
function findBone(skeleton, key) {
  const variants = BONE_NAME_VARIANTS[key];
  if (!variants || !skeleton) return null;
  for (const name of variants) {
    const bone = skeleton.getBoneByName(name);
    if (bone) return bone;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// HELPER: Convert MediaPipe landmark to THREE.Vector3
// MediaPipe: x right [0-1], y down [0-1], z toward camera (negative = closer)
// Three.js:  x right, y up, z toward camera
// ─────────────────────────────────────────────────────────────
function landmarkToVec3(lm) {
  return new THREE.Vector3(
    (lm.x - 0.5) * 2,   // center and scale x
    -(lm.y - 0.5) * 2,   // flip y (MediaPipe y is down)
    -lm.z * 2             // flip z
  );
}

// ─────────────────────────────────────────────────────────────
// HELPER: Compute rotation quaternion from parent→child direction
// Given a "from" direction (bone's rest direction) and a "to" direction
// (where MediaPipe says the limb is pointing), compute the rotation
// ─────────────────────────────────────────────────────────────
function computeLimbRotation(parentLm, childLm, restDir) {
  const currentDir = new THREE.Vector3().subVectors(
    landmarkToVec3(childLm),
    landmarkToVec3(parentLm)
  ).normalize();

  const quat = new THREE.Quaternion().setFromUnitVectors(restDir, currentDir);
  return quat;
}

// ─────────────────────────────────────────────────────────────
// REST POSE DIRECTIONS (T-pose for Mixamo characters)
// These define which way each bone points in the default pose
// ─────────────────────────────────────────────────────────────
const REST_DIRS = {
  // Arms: left arm points +X, right arm points -X in T-pose
  leftArm:      new THREE.Vector3(-1, 0, 0),
  leftForeArm:  new THREE.Vector3(-1, 0, 0),
  rightArm:     new THREE.Vector3(1, 0, 0),
  rightForeArm: new THREE.Vector3(1, 0, 0),
  // Legs: both point downward -Y
  leftUpLeg:    new THREE.Vector3(0, -1, 0),
  leftLeg:      new THREE.Vector3(0, -1, 0),
  rightUpLeg:   new THREE.Vector3(0, -1, 0),
  rightLeg:     new THREE.Vector3(0, -1, 0),
  // Spine: points upward +Y
  spine:        new THREE.Vector3(0, 1, 0),
  neck:         new THREE.Vector3(0, 1, 0),
};

// ─────────────────────────────────────────────────────────────
// VISIBILITY THRESHOLD — below this, we skip the landmark
// Set very low to catch legs (MediaPipe often reports low vis for legs)
// ─────────────────────────────────────────────────────────────
const VIS_THRESHOLD = 0.01;

function isVisible(lm) {
  return lm && (lm.visibility === undefined || lm.visibility > VIS_THRESHOLD);
}

// ─────────────────────────────────────────────────────────────
// MAIN AVATAR RIG COMPONENT
// ─────────────────────────────────────────────────────────────
const AvatarRig = ({ recordedFrames, avatarUrl, liveFrame, smoothingEnabled = true, visemes = [], audioRef = null }) => {
  const avatarRef = useRef();
  const frameIndex = useRef(0);
  const bonesRef = useRef({});
  const skeletonRef = useRef(null);
  const filtersRef = useRef({});

  const gltf = useLoader(GLTFLoader, avatarUrl || '/models/ybot.glb');
  const clonedScene = gltf.scene; // was skeletonClone(gltf.scene) — broke AssimpFbx pre-rotation hierarchy on Mixamo rigs

  // ── Setup: find skeleton & cache bone references ──
  useEffect(() => {
    if (!avatarRef.current || !clonedScene) return;

    avatarRef.current.add(clonedScene);

    // Find the SkinnedMesh to get the skeleton
    let skeleton = null;
    clonedScene.traverse((child) => {
      if (child.isSkinnedMesh && child.skeleton) {
        skeleton = child.skeleton;
      }
    });

    if (!skeleton) {
      console.warn('[AvatarRig] No skeleton found in model!');
      return;
    }

    skeletonRef.current = skeleton;

    // Cache bone references using name variants
    const bones = {};
    for (const key of Object.keys(BONE_NAME_VARIANTS)) {
      bones[key] = findBone(skeleton, key);
      if (!bones[key]) {
        console.warn(`[AvatarRig] Bone not found: ${key}`);
      }
    }
    bonesRef.current = bones;

    // Log discovered bones for debugging
    console.log('[AvatarRig] Discovered bones:', 
      Object.entries(bones)
        .filter(([, b]) => b !== null)
        .map(([k, b]) => `${k}→${b.name}`)
    );

    // Initialize OneEuro filters for each bone (x, y, z per bone = lots of filters)
    const filterKeys = [
      'hipsPos', 'hipsRotX', 'hipsRotY', 'hipsRotZ',
      'spineX', 'spineZ', 'neckX', 'neckY', 'neckZ', 'headX', 'headY',
      'leftArmX', 'leftArmY', 'leftArmZ',
      'leftForeArmX', 'leftForeArmY', 'leftForeArmZ',
      'rightArmX', 'rightArmY', 'rightArmZ',
      'rightForeArmX', 'rightForeArmY', 'rightForeArmZ',
      'leftUpLegX', 'leftUpLegY', 'leftUpLegZ',
      'leftLegX', 'leftLegY', 'leftLegZ',
      'rightUpLegX', 'rightUpLegY', 'rightUpLegZ',
      'rightLegX', 'rightLegY', 'rightLegZ',
    ];
    const filters = {};
    for (const k of filterKeys) {
      filters[k] = new OneEuroFilter(1.0, 0.007, 1.0);
    }
    filtersRef.current = filters;

    return () => {
      if (avatarRef.current) {
        avatarRef.current.remove(clonedScene);
      }
    };
  }, [clonedScene]);

  // ── Per-frame animation loop ──
  useFrame(() => {
    const bones = bonesRef.current;
    if (!bones.hips) return; // No skeleton loaded yet

    // Determine which frame to use: live webcam or recorded playback
    let frame;
    if (liveFrame) {
      frame = liveFrame;
    } else if (recordedFrames && recordedFrames.length > 0) {
      frameIndex.current = (frameIndex.current + 1) % recordedFrames.length;
      frame = recordedFrames[frameIndex.current];
    } else {
      return;
    }

    const lm = frame.landmarks || frame;
    if (!lm || lm.length < 33) return; // MediaPipe Pose has 33 landmarks

    const filters = filtersRef.current;
    const now = performance.now() / 1000; // seconds
    const smooth = smoothingEnabled;

    // Helper: optionally filter a value
    const f = (key, val) => {
      if (!smooth || !filters[key]) return val;
      return filters[key].filter(val, now);
    };

    // ─── HIPS POSITION (root motion) ───
    if (bones.hips && isVisible(lm[MP.LEFT_HIP]) && isVisible(lm[MP.RIGHT_HIP])) {
      const midHip = {
        x: (lm[MP.LEFT_HIP].x + lm[MP.RIGHT_HIP].x) / 2,
        y: (lm[MP.LEFT_HIP].y + lm[MP.RIGHT_HIP].y) / 2,
        z: (lm[MP.LEFT_HIP].z + lm[MP.RIGHT_HIP].z) / 2,
      };
      // Only apply Y offset (vertical bob) and Z (depth). Keep X centered unless full body tracking.
      const hipY = f('hipsPos', -(midHip.y - 0.5) * 0.5);
      bones.hips.position.y = bones.hips.position.y + hipY * 0.1; // Subtle vertical movement

      // Hip rotation from hip-to-hip line
      const hipVec = new THREE.Vector3(
        lm[MP.RIGHT_HIP].x - lm[MP.LEFT_HIP].x,
        0,
        lm[MP.RIGHT_HIP].z - lm[MP.LEFT_HIP].z
      ).normalize();
      const hipAngleY = Math.atan2(hipVec.z, hipVec.x);
      bones.hips.rotation.y = f('hipsRotY', hipAngleY * 0.5);
    }

    // ─── SPINE / TORSO ───
    if (bones.spine && isVisible(lm[MP.LEFT_SHOULDER]) && isVisible(lm[MP.RIGHT_SHOULDER]) 
        && isVisible(lm[MP.LEFT_HIP]) && isVisible(lm[MP.RIGHT_HIP])) {
      const midShoulder = landmarkToVec3({
        x: (lm[MP.LEFT_SHOULDER].x + lm[MP.RIGHT_SHOULDER].x) / 2,
        y: (lm[MP.LEFT_SHOULDER].y + lm[MP.RIGHT_SHOULDER].y) / 2,
        z: (lm[MP.LEFT_SHOULDER].z + lm[MP.RIGHT_SHOULDER].z) / 2,
      });
      const midHipVec = landmarkToVec3({
        x: (lm[MP.LEFT_HIP].x + lm[MP.RIGHT_HIP].x) / 2,
        y: (lm[MP.LEFT_HIP].y + lm[MP.RIGHT_HIP].y) / 2,
        z: (lm[MP.LEFT_HIP].z + lm[MP.RIGHT_HIP].z) / 2,
      });
      const torsoDir = new THREE.Vector3().subVectors(midShoulder, midHipVec).normalize();
      
      // Lean forward/back (X rotation) and side-to-side (Z rotation)
      const spineX = Math.asin(Math.max(-1, Math.min(1, -torsoDir.z))) * 0.6;
      const spineZ = Math.asin(Math.max(-1, Math.min(1, torsoDir.x))) * 0.4;
      bones.spine.rotation.x = f('spineX', spineX);
      bones.spine.rotation.z = f('spineZ', spineZ);
    }

    // ─── NECK / HEAD ───
    if (bones.neck && isVisible(lm[MP.NOSE]) && isVisible(lm[MP.LEFT_SHOULDER]) && isVisible(lm[MP.RIGHT_SHOULDER])) {
      const noseVec = landmarkToVec3(lm[MP.NOSE]);
      const midShoulderVec = landmarkToVec3({
        x: (lm[MP.LEFT_SHOULDER].x + lm[MP.RIGHT_SHOULDER].x) / 2,
        y: (lm[MP.LEFT_SHOULDER].y + lm[MP.RIGHT_SHOULDER].y) / 2,
        z: (lm[MP.LEFT_SHOULDER].z + lm[MP.RIGHT_SHOULDER].z) / 2,
      });
      const headDir = new THREE.Vector3().subVectors(noseVec, midShoulderVec).normalize();
      
      const neckX = f('neckX', Math.asin(Math.max(-1, Math.min(1, -headDir.z))) * 0.4);
      const neckY = f('neckY', Math.atan2(headDir.x, headDir.y) * 0.3);
      bones.neck.rotation.x = neckX;
      bones.neck.rotation.y = neckY;
    }

    // ─── LEFT ARM ───
    if (bones.leftArm && isVisible(lm[MP.LEFT_SHOULDER]) && isVisible(lm[MP.LEFT_ELBOW])) {
      const q = computeLimbRotation(lm[MP.LEFT_SHOULDER], lm[MP.LEFT_ELBOW], REST_DIRS.leftArm);
      const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');
      bones.leftArm.rotation.x = f('leftArmX', euler.x);
      bones.leftArm.rotation.y = f('leftArmY', euler.y);
      bones.leftArm.rotation.z = f('leftArmZ', euler.z);
    }

    // ─── LEFT FOREARM ───
    if (bones.leftForeArm && isVisible(lm[MP.LEFT_ELBOW]) && isVisible(lm[MP.LEFT_WRIST])) {
      const q = computeLimbRotation(lm[MP.LEFT_ELBOW], lm[MP.LEFT_WRIST], REST_DIRS.leftForeArm);
      const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');
      bones.leftForeArm.rotation.x = f('leftForeArmX', euler.x);
      bones.leftForeArm.rotation.y = f('leftForeArmY', euler.y);
      bones.leftForeArm.rotation.z = f('leftForeArmZ', euler.z);
    }

    // ─── RIGHT ARM ───
    if (bones.rightArm && isVisible(lm[MP.RIGHT_SHOULDER]) && isVisible(lm[MP.RIGHT_ELBOW])) {
      const q = computeLimbRotation(lm[MP.RIGHT_SHOULDER], lm[MP.RIGHT_ELBOW], REST_DIRS.rightArm);
      const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');
      bones.rightArm.rotation.x = f('rightArmX', euler.x);
      bones.rightArm.rotation.y = f('rightArmY', euler.y);
      bones.rightArm.rotation.z = f('rightArmZ', euler.z);
    }

    // ─── RIGHT FOREARM ───
    if (bones.rightForeArm && isVisible(lm[MP.RIGHT_ELBOW]) && isVisible(lm[MP.RIGHT_WRIST])) {
      const q = computeLimbRotation(lm[MP.RIGHT_ELBOW], lm[MP.RIGHT_WRIST], REST_DIRS.rightForeArm);
      const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');
      bones.rightForeArm.rotation.x = f('rightForeArmX', euler.x);
      bones.rightForeArm.rotation.y = f('rightForeArmY', euler.y);
      bones.rightForeArm.rotation.z = f('rightForeArmZ', euler.z);
    }

    // ─── LEFT UPPER LEG ───
    if (bones.leftUpLeg && isVisible(lm[MP.LEFT_HIP]) && isVisible(lm[MP.LEFT_KNEE])) {
      const q = computeLimbRotation(lm[MP.LEFT_HIP], lm[MP.LEFT_KNEE], REST_DIRS.leftUpLeg);
      const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');
      bones.leftUpLeg.rotation.x = f('leftUpLegX', euler.x);
      bones.leftUpLeg.rotation.y = f('leftUpLegY', euler.y);
      bones.leftUpLeg.rotation.z = f('leftUpLegZ', euler.z);
    }

    // ─── LEFT LOWER LEG ───
    if (bones.leftLeg && isVisible(lm[MP.LEFT_KNEE]) && isVisible(lm[MP.LEFT_ANKLE])) {
      const q = computeLimbRotation(lm[MP.LEFT_KNEE], lm[MP.LEFT_ANKLE], REST_DIRS.leftLeg);
      const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');
      bones.leftLeg.rotation.x = f('leftLegX', euler.x);
      bones.leftLeg.rotation.y = f('leftLegY', euler.y);
      bones.leftLeg.rotation.z = f('leftLegZ', euler.z);
    }

    // ─── RIGHT UPPER LEG ───
    if (bones.rightUpLeg && isVisible(lm[MP.RIGHT_HIP]) && isVisible(lm[MP.RIGHT_KNEE])) {
      const q = computeLimbRotation(lm[MP.RIGHT_HIP], lm[MP.RIGHT_KNEE], REST_DIRS.rightUpLeg);
      const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');
      bones.rightUpLeg.rotation.x = f('rightUpLegX', euler.x);
      bones.rightUpLeg.rotation.y = f('rightUpLegY', euler.y);
      bones.rightUpLeg.rotation.z = f('rightUpLegZ', euler.z);
    }

    // ─── RIGHT LOWER LEG ───
    if (bones.rightLeg && isVisible(lm[MP.RIGHT_KNEE]) && isVisible(lm[MP.RIGHT_ANKLE])) {
      const q = computeLimbRotation(lm[MP.RIGHT_KNEE], lm[MP.RIGHT_ANKLE], REST_DIRS.rightLeg);
      const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');
      bones.rightLeg.rotation.x = f('rightLegX', euler.x);
      bones.rightLeg.rotation.y = f('rightLegY', euler.y);
      bones.rightLeg.rotation.z = f('rightLegZ', euler.z);
    }

    // ─── JAW / LIP SYNC ───
    if (bones.head && frame.jawOpen !== undefined) {
      const jaw = skeletonRef.current?.getBoneByName('mixamorig:Jaw')
                || skeletonRef.current?.getBoneByName('mixamorigJaw') 
                || skeletonRef.current?.getBoneByName('Jaw');
      if (jaw) {
        jaw.rotation.x = THREE.MathUtils.lerp(jaw.rotation.x, frame.jawOpen * 0.3, 0.2);
      }
    }

    // ── FACE BONES ──
    // JAW: live face capture or timed viseme playback
    let jawTarget = 0;
    if (frame.jawOpen !== undefined) {
      jawTarget = frame.jawOpen * 0.3;
    } else if (typeof visemes !== 'undefined' && visemes.length > 0 && audioRef?.current) {
      const audioTime = audioRef.current.currentTime;
      const VISEME_JAW = { rest:0, M:0.02, E:0.08, A:0.18, O:0.14, AH:0.25 };
      let activeViseme = 'rest';
      for (const v of visemes) { if (v.time <= audioTime) activeViseme = v.viseme; else break; }
      jawTarget = VISEME_JAW[activeViseme] ?? 0;
    }
    if (bones.jaw) {
      bones.jaw.rotation.x = THREE.MathUtils.lerp(bones.jaw.rotation.x, jawTarget, 0.2);
    }
    if (bones.leftEye && frame.leftBlink !== undefined) {
      bones.leftEye.rotation.x = THREE.MathUtils.lerp(bones.leftEye.rotation.x, frame.leftBlink * 0.15, 0.25);
    }
    if (bones.rightEye && frame.rightBlink !== undefined) {
      bones.rightEye.rotation.x = THREE.MathUtils.lerp(bones.rightEye.rotation.x, frame.rightBlink * 0.15, 0.25);
    }
    if (bones.leftBrow && frame.browRaise !== undefined) {
      bones.leftBrow.rotation.y = THREE.MathUtils.lerp(bones.leftBrow.rotation.y, frame.browRaise * 0.1, 0.2);
    }
    if (bones.rightBrow && frame.browRaise !== undefined) {
      bones.rightBrow.rotation.y = THREE.MathUtils.lerp(bones.rightBrow.rotation.y, frame.browRaise * 0.1, 0.2);
    }
  });

  return <group ref={avatarRef} />;
};

// ─────────────────────────────────────────────────────────────
// EXPORTED COMPONENT
// ─────────────────────────────────────────────────────────────
const AvatarRigPlayer3D = ({ recordedFrames, avatarUrl, liveFrame, smoothingEnabled, visemes = [], audioRef = null, retargetEnabled = true }) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const frameRef = useRef(null);
  const mixerRef = useRef(null);
  const avatarRef = useRef(null);
  const clockRef = useRef(null); if (!clockRef.current) clockRef.current = new THREE.Clock();

  // SPX_MOCAP_LIVEFRAME_REF_V1 — mirror liveFrame into a ref so the
  // animate() closure (which only mounts once per avatarUrl) reads
  // the latest pose data instead of the null captured at first render.
  const liveFrameRef = useRef(null);
  const retargetEnabledRef = useRef(true);
  useEffect(() => { liveFrameRef.current = liveFrame; }, [liveFrame]);
  useEffect(() => { retargetEnabledRef.current = retargetEnabled; }, [retargetEnabled]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 800;
    const H = mount.clientHeight || 500;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    // SPX_MOCAP_CAMERA_V1 — closer framing for the avatar
    camera.position.set(0, 1.2, 3.5);
    camera.lookAt(0, 1.0, 0);
    cameraRef.current = camera;

    // Renderer — create new one just for this canvas
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer; window.__mocapScene = scene; // dev hook

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffeedd, 1.2);
    dir.position.set(3, 5, 5); dir.castShadow = true; scene.add(dir);

    // Ground grid
    scene.add(new THREE.GridHelper(10, 10, 0x1a2a1a, 0x1a2a1a));

    // Load avatar
    // SPX_MOCAP_VRM_V1 — VRM-aware loader: register VRMLoaderPlugin so .vrm files surface as gltf.userData.vrm
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    // SPX_MOCAP_AVATAR_DEFAULT_V1 — verify Y Bot is reachable before we depend on it as fallback
    fetch('/models/ybot.glb', { method: 'HEAD' })
      .then(r => console.log('[AvatarRigPlayer3D] Y Bot HEAD check:', r.status, r.statusText))
      .catch(e => console.error('[AvatarRigPlayer3D] Y Bot not reachable:', e));

    const finalUrl = avatarUrl || '/models/ybot.glb';
    console.log('[AvatarRigPlayer3D] Loading avatar from:', finalUrl);

    // SPX_MOCAP_VRM_V2 — extract success path so VRM URL failure can fall back to Y Bot
    const handleGltfLoaded = (gltf) => {
      console.log('[AvatarRigPlayer3D] GLTF loaded successfully');
      const vrm = gltf.userData?.vrm; // SPX_MOCAP_VRM_V1
      if (vrm) {
        console.log('[AvatarRigPlayer3D] VRM avatar detected');
        // VRM path — Kalidokit retargets native VRM humanoid bones
        VRMUtils.rotateVRM0(vrm); // VRM0 avatars face -Z; rotate to face +Z
        vrm.scene.traverse(child => {
          if (child.isMesh || child.isSkinnedMesh) {
            child.frustumCulled = false;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        scene.add(vrm.scene);
        // Fit to viewport like the Mixamo path
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.8 / maxDim;
        vrm.scene.scale.setScalar(scale);
        const box2 = new THREE.Box3().setFromObject(vrm.scene);
        vrm.scene.position.set(-center.x * scale, -box2.min.y, -center.z * scale);

        avatarRef.current = { vrm, isVRM: true, bones: {} };
        window.__mocapScene = scene;
        console.log('[AvatarRigPlayer3D] VRM avatar loaded');
        mixerRef.current = null;
        return;
      }

      console.log('[AvatarRigPlayer3D] GLB avatar (Mixamo path)');
      const model = gltf.scene;
      // Disable frustum culling FIRST before any bounding box calc
      model.traverse(child => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.frustumCulled = false;
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(m => { m.needsUpdate = true; });
          }
        }
      });
      // Add to scene first so bones are updated
      scene.add(model);
      // Now compute bounding box with skeleton posed
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.8 / maxDim;
      model.scale.setScalar(scale);
      // Place feet on ground
      const box2 = new THREE.Box3().setFromObject(model);
      model.position.set(-center.x * scale, -box2.min.y, -center.z * scale);
      avatarRef.current = model;

      // Cache bone references for live retargeting
      let skeleton = null;
      model.traverse((child) => {
        if (child.isSkinnedMesh && child.skeleton) {
          skeleton = child.skeleton;
        }
      });

      // SPX_MOCAP_ASSIMP_PREROT_V1 — walk up to AssimpFbx PreRotation helper if present
      const resolveAssimpParent = (bone) => {
        if (!bone) return null;
        // Walk up through any _$AssimpFbx$_PreRotation or _$AssimpFbx$_Translation helpers
        let target = bone;
        while (target.parent && target.parent.name && target.parent.name.includes('_$AssimpFbx$_')) {
          target = target.parent;
        }
        return target;
      };

      const bones = {};
      if (skeleton) {
        for (const key of Object.keys(BONE_NAME_VARIANTS)) {
          const raw = findBone(skeleton, key);
          bones[key] = resolveAssimpParent(raw);
        }
        avatarRef.current.bones = bones; // Cache on avatar for animate() loop
        avatarRef.current.skeleton = skeleton;
        console.log('[AvatarRigPlayer3D] Cached bones (with AssimpFbx resolution):',
          Object.entries(bones)
            .filter(([, b]) => b !== null)
            .map(([k, b]) => `${k}→${b.name}`)
        );
      }
      // Don't auto-play GLB embedded animations on MoCap avatars.
      // The avatar should remain in T-pose so MediaPipe data drives the bones.
      // Auto-playing was causing arms-back/leg-up corruption from baked Mixamo idle clip.
      mixerRef.current = null;
    };
    // SPX_MOCAP_AVATAR_DEFAULT_V1 — bulletproof load with progress + fallback chain
    const handleLoadError = (err) => {
      console.error('[AvatarRigPlayer3D] Avatar load FAILED for:', finalUrl);
      console.error('[AvatarRigPlayer3D] Error:', err?.message || err);
      if (finalUrl !== '/models/ybot.glb') {
        console.log('[AvatarRigPlayer3D] Falling back to /models/ybot.glb');
        loader.load(
          '/models/ybot.glb',
          handleGltfLoaded,
          (prog) => console.log('[AvatarRigPlayer3D] Fallback progress:', prog.loaded, '/', prog.total),
          (err2) => console.error('[AvatarRigPlayer3D] Y Bot fallback ALSO failed:', err2)
        );
      } else {
        console.error('[AvatarRigPlayer3D] Y Bot itself failed to load. Check /models/ybot.glb exists in public/');
      }
    };

    loader.load(
      finalUrl,
      handleGltfLoaded,
      (prog) => console.log('[AvatarRigPlayer3D] Primary progress:', prog.loaded, '/', prog.total),
      handleLoadError
    );

    // Animate
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      // Live frame retargeting - gate with liveFrame check
      // SPX_MOCAP_LIVEFRAME_REF_V1 — read from refs to avoid stale closure
      const _lf = liveFrameRef.current;
      const _re = retargetEnabledRef.current;

      // SPX_MOCAP_REST_GUARD_V1 — revert to rest pose when no valid pose data
      const _lm = _lf?.landmarks || _lf?.poseLandmarks || (Array.isArray(_lf) ? _lf : null);
      const hasValidPose = !!(_lm && Array.isArray(_lm) && _lm.length >= 33);

      if ((!_re || !hasValidPose) && avatarRef.current) {
        const ar = avatarRef.current;
        const identity = new THREE.Quaternion();
        if (ar.isVRM && ar.vrm?.humanoid) {
          // SPX_MOCAP_VRM_V1 — rest-pose reset via VRM humanoid bone names
          const vrmBones = ['head','neck','spine','chest','upperChest','hips',
            'leftUpperArm','leftLowerArm','leftHand','rightUpperArm','rightLowerArm','rightHand',
            'leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'];
          for (const name of vrmBones) {
            const b = ar.vrm.humanoid.getNormalizedBoneNode(name);
            if (b) b.quaternion.slerp(identity, 0.1);
          }
        } else if (ar.bones) {
          const bones = ar.bones;
          const resetBones = ['hips', 'leftArm', 'rightArm', 'leftForeArm', 'rightForeArm', 'leftShoulder', 'rightShoulder', 'leftUpLeg', 'rightUpLeg', 'leftLeg', 'rightLeg', 'leftFoot', 'rightFoot', 'head', 'spine', 'spine1', 'spine2', 'neck', 'leftHand', 'rightHand'];
          for (const name of resetBones) {
            const b = bones[name];
            if (b) b.quaternion.slerp(identity, 0.1);
          }
        }
      } else if (_lf && _re && avatarRef.current && (avatarRef.current.isVRM || avatarRef.current.bones)) {
        // SPX_MOCAP_KALIDOKIT_V1 — pose retargeting via Kalidokit.Pose.solve()
        // Replaces all prior hand-rolled math (HEAD_V2, WRIST_V1, SPINE_V1, plus original arm/leg).
        const LERP_SPEED = 0.4;
        const ar = avatarRef.current;
        const lm2d = _lf.landmarks;
        const lm3d = _lf.worldLandmarks;

        if (lm2d && lm2d.length >= 33 && lm3d && lm3d.length >= 33) {
          let solved;
          try {
            solved = Kalidokit.Pose.solve(lm3d, lm2d, {
              runtime: 'mediapipe',
              imageSize: { width: 640, height: 640 },
              enableLegs: true,
            });
          } catch (e) {
            solved = null;
          }

          if (solved && ar.isVRM && ar.vrm) {
            // SPX_MOCAP_VRM_V1 — Kalidokit native VRM retargeting
            if (!window.__kalidokitLogTime || performance.now() - window.__kalidokitLogTime > 1000) {
              window.__kalidokitLogTime = performance.now();
              console.log('[Kalidokit VRM]', solved);
            }

            const rigVRM = (boneName, euler, dampener = 1, easing = LERP_SPEED) => {
              if (!euler) return;
              const bone = ar.vrm.humanoid?.getNormalizedBoneNode(boneName);
              if (!bone) return;
              const q = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                  (euler.x || 0) * dampener,
                  (euler.y || 0) * dampener,
                  (euler.z || 0) * dampener,
                  'XYZ'
                )
              );
              bone.quaternion.slerp(q, easing);
            };

            rigVRM('hips',           solved.Hips?.rotation, 0.7);
            rigVRM('spine',          solved.Spine, 0.45);
            rigVRM('chest',          solved.Spine, 0.25);
            rigVRM('upperChest',     solved.Spine, 0.25);

            rigVRM('leftUpperArm',   solved.LeftUpperArm);
            rigVRM('leftLowerArm',   solved.LeftLowerArm);
            rigVRM('rightUpperArm',  solved.RightUpperArm);
            rigVRM('rightLowerArm',  solved.RightLowerArm);

            rigVRM('leftHand',       solved.LeftHand);
            rigVRM('rightHand',      solved.RightHand);

            rigVRM('leftUpperLeg',   solved.LeftUpperLeg);
            rigVRM('leftLowerLeg',   solved.LeftLowerLeg);
            rigVRM('rightUpperLeg',  solved.RightUpperLeg);
            rigVRM('rightLowerLeg',  solved.RightLowerLeg);

            // Head from 2D landmarks (Kalidokit.Pose doesn't return Head)
            try {
              const nose = lm2d[0];
              const lSh = lm2d[11], rSh = lm2d[12];
              if (nose && lSh && rSh &&
                  nose.visibility > 0.5 && lSh.visibility > 0.3 && rSh.visibility > 0.3) {
                const shMidX = (lSh.x + rSh.x) / 2;
                const shMidY = (lSh.y + rSh.y) / 2;
                const shWidth = Math.abs(rSh.x - lSh.x) + 0.001;
                const yaw = THREE.MathUtils.clamp((nose.x - shMidX) / shWidth * 2.0, -1.0, 1.0);
                const noseAbove = (shMidY - nose.y) / shWidth;
                const pitch = THREE.MathUtils.clamp((1.6 - noseAbove) * -1.0, -0.7, 0.7);
                rigVRM('head', { x: pitch, y: -yaw, z: 0 }, 0.85);
                rigVRM('neck', { x: pitch, y: -yaw, z: 0 }, 0.15);
              }
            } catch (e) { /* head fallback failed */ }
          } else if (solved && ar.bones) {
            const bones = ar.bones;
            // SPX_MOCAP_DIAGNOSTIC_NO_OFFSET — log Kalidokit output once per second to see actual rotation values
            if (!window.__kalidokitLogTime || performance.now() - window.__kalidokitLogTime > 1000) {
              window.__kalidokitLogTime = performance.now();
              console.log('[Kalidokit]', {
                LeftUpperArm: solved.LeftUpperArm,
                RightUpperArm: solved.RightUpperArm,
                LeftLowerArm: solved.LeftLowerArm,
                RightLowerArm: solved.RightLowerArm,
                Spine: solved.Spine,
                Hips: solved.Hips,
              });
            }

            const applyEuler = (boneKey, euler, offset = null) => {
              const bone = bones[boneKey];
              if (!bone || !euler) return;
              const q = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(euler.x || 0, euler.y || 0, euler.z || 0, 'XYZ')
              );
              if (offset) q.multiply(offset);
              bone.quaternion.slerp(q, LERP_SPEED);
            };

            // Hips rotation only (drop noisy position)
            if (solved.Hips && solved.Hips.rotation) {
              applyEuler('hips', solved.Hips.rotation);
            }

            // Spine chain — damped (Y especially) because Kalidokit folds head motion into Spine
            if (solved.Spine) {
              applyEuler('spine',  { x: solved.Spine.x * 0.15, y: solved.Spine.y * 0.10, z: solved.Spine.z * 0.15 });
              applyEuler('spine1', { x: solved.Spine.x * 0.10, y: solved.Spine.y * 0.05, z: solved.Spine.z * 0.10 });
              applyEuler('spine2', { x: solved.Spine.x * 0.10, y: solved.Spine.y * 0.05, z: solved.Spine.z * 0.10 });
            }

            // SPX_MOCAP_DIAGNOSTIC_NO_OFFSET — temporary: drop all bone offsets to see raw Kalidokit output
            applyEuler('leftArm',      solved.LeftUpperArm);
            applyEuler('leftForeArm',  solved.LeftLowerArm);
            applyEuler('rightArm',     solved.RightUpperArm);
            applyEuler('rightForeArm', solved.RightLowerArm);

            // Wrists
            applyEuler('leftHand',  solved.LeftHand);
            applyEuler('rightHand', solved.RightHand);

            // Legs — VRM and Mixamo rest both legs-down, no offset.
            applyEuler('leftUpLeg',  solved.LeftUpperLeg);
            applyEuler('leftLeg',    solved.LeftLowerLeg);
            applyEuler('rightUpLeg', solved.RightUpperLeg);
            applyEuler('rightLeg',   solved.RightLowerLeg);

            // SPX_MOCAP_HEAD_V3 — strengthened head fallback. Runs AFTER spine so head gets clean rotation.
            try {
              const nose = lm2d[0];
              const lEar = lm2d[7], rEar = lm2d[8];
              const lSh = lm2d[11], rSh = lm2d[12];
              if (nose && lSh && rSh &&
                  nose.visibility > 0.5 &&
                  lSh.visibility > 0.3 && rSh.visibility > 0.3) {
                const shMidX = (lSh.x + rSh.x) / 2;
                const shMidY = (lSh.y + rSh.y) / 2;
                const shWidth = Math.abs(rSh.x - lSh.x) + 0.001;

                // YAW: blend horizontal nose offset (always reliable) + ear-z asymmetry (when ears visible)
                let yawRaw = (nose.x - shMidX) / shWidth * 2.0;
                if (lEar && rEar && lEar.visibility > 0.1 && rEar.visibility > 0.1) {
                  const earZDelta = (rEar.z - lEar.z) * 3.0;
                  yawRaw = (yawRaw + earZDelta) * 0.5;
                }
                const yaw = THREE.MathUtils.clamp(yawRaw, -1.1, 1.1);

                // PITCH: nose-to-shoulder vertical ratio vs baseline
                const noseAboveShoulders = (shMidY - nose.y) / shWidth;
                const PITCH_BASELINE = 1.6;
                const pitchRaw = (PITCH_BASELINE - noseAboveShoulders) * 1.2;
                const pitch = THREE.MathUtils.clamp(pitchRaw, -0.7, 0.7);

                // ROLL: ear line slope (only when both ears confidently visible)
                let roll = 0;
                if (lEar && rEar && lEar.visibility > 0.3 && rEar.visibility > 0.3) {
                  roll = THREE.MathUtils.clamp(Math.atan2(rEar.y - lEar.y, rEar.x - lEar.x), -0.5, 0.5);
                }

                const headQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch * 0.85, -yaw * 0.85, -roll * 0.85, 'XYZ'));
                const neckQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch * 0.15, -yaw * 0.15, -roll * 0.15, 'XYZ'));

                if (bones.head) bones.head.quaternion.slerp(headQ, LERP_SPEED);
                if (bones.neck) bones.neck.quaternion.slerp(neckQ, LERP_SPEED);
              }
            } catch (e) { /* head fallback failed */ }
          }
        }
      }
      // SPX_MOCAP_VRM_V1 — VRM needs per-frame update for spring bones / blendshapes
      if (avatarRef.current?.isVRM && avatarRef.current.vrm) {
        avatarRef.current.vrm.update(delta);
      }
      mixerRef.current?.update(delta);
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [avatarUrl]);

  return <div ref={mountRef} className="avatar-rig-mount" />;
};

export default AvatarRigPlayer3D;