import * as THREE from "three";

export function findLatestRiggedMesh(scene) {
  let found = null;
  scene?.traverse((obj) => {
    if (obj?.isSkinnedMesh) found = obj;
  });
  return found;
}

export function findBoneByName(skinnedMesh, name) {
  return skinnedMesh?.skeleton?.bones?.find((b) => b.name === name) || null;
}

export function createFingerChains(handBone, side = "L", scale = 1) {
  if (!handBone) return [];
  const fingerNames = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
  const chains = [];

  fingerNames.forEach((finger, fi) => {
    const baseX = side === "L" ? 0.05 + fi * 0.02 : -0.05 - fi * 0.02;

    const root = new THREE.Bone();
    root.name = `${finger}_1_${side}`;
    root.position.set(baseX, 0, 0.03 * scale);

    const mid = new THREE.Bone();
    mid.name = `${finger}_2_${side}`;
    mid.position.set(side === "L" ? 0.045 * scale : -0.045 * scale, 0, 0);

    const tip = new THREE.Bone();
    tip.name = `${finger}_3_${side}`;
    tip.position.set(side === "L" ? 0.04 * scale : -0.04 * scale, 0, 0);

    handBone.add(root);
    root.add(mid);
    mid.add(tip);

    chains.push(root, mid, tip);
  });

  return chains;
}

export function addFingerRig(skinnedMesh, scale = 1) {
  if (!skinnedMesh?.skeleton) return { ok: false, reason: "No skeleton found" };

  const handL = findBoneByName(skinnedMesh, "Hand_L");
  const handR = findBoneByName(skinnedMesh, "Hand_R");
  if (!handL || !handR) return { ok: false, reason: "Hand bones not found" };

  const left = createFingerChains(handL, "L", scale);
  const right = createFingerChains(handR, "R", scale);

  skinnedMesh.skeleton.bones.push(...left, ...right);
  return { ok: true, added: left.length + right.length };
}

export function addTwistBones(skinnedMesh, scale = 1) {
  if (!skinnedMesh?.skeleton) return { ok: false, reason: "No skeleton found" };

  const pairs = [
    ["UpperArm_L", "UpperArmTwist_L"],
    ["UpperArm_R", "UpperArmTwist_R"],
    ["Forearm_L", "ForearmTwist_L"],
    ["Forearm_R", "ForearmTwist_R"],
    ["UpperLeg_L", "ThighTwist_L"],
    ["UpperLeg_R", "ThighTwist_R"],
    ["LowerLeg_L", "CalfTwist_L"],
    ["LowerLeg_R", "CalfTwist_R"],
  ];

  let added = 0;
  for (const [src, name] of pairs) {
    const parent = findBoneByName(skinnedMesh, src);
    if (!parent) continue;
    if (findBoneByName(skinnedMesh, name)) continue;

    const b = new THREE.Bone();
    b.name = name;
    b.position.copy(parent.position.clone().multiplyScalar(0.5));
    parent.add(b);
    skinnedMesh.skeleton.bones.push(b);
    added += 1;
  }

  return { ok: true, added };
}

export function addFacialAutoRig(skinnedMesh, scale = 1) {
  if (!skinnedMesh?.skeleton) return { ok: false, reason: "No skeleton found" };
  const head = findBoneByName(skinnedMesh, "Head");
  if (!head) return { ok: false, reason: "Head bone not found" };

  const facial = [
    ["Jaw", 0, -0.08, 0.03],
    ["Eye_L", 0.05, 0.05, 0.08],
    ["Eye_R", -0.05, 0.05, 0.08],
    ["Brow_L", 0.05, 0.10, 0.06],
    ["Brow_R", -0.05, 0.10, 0.06],
    ["Cheek_L", 0.06, -0.01, 0.05],
    ["Cheek_R", -0.06, -0.01, 0.05],
    ["Lip_Upper", 0, -0.01, 0.08],
    ["Lip_Lower", 0, -0.04, 0.08],
  ];

  let added = 0;
  for (const [name, x, y, z] of facial) {
    if (findBoneByName(skinnedMesh, name)) continue;
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x * scale, y * scale, z * scale);
    head.add(b);
    skinnedMesh.skeleton.bones.push(b);
    added += 1;
  }

  return { ok: true, added };
}

export function createExpressionLibrary() {
  return [
    { id: "smile", label: "Smile", jaw: 0.08, brow: 0.02 },
    { id: "frown", label: "Frown", jaw: 0.02, brow: -0.03 },
    { id: "blink", label: "Blink", eye: -0.03 },
    { id: "surprised", label: "Surprised", jaw: 0.14, brow: 0.06 },
    { id: "angry", label: "Angry", brow: -0.05, jaw: 0.01 },
  ];
}

export function applyExpression(skinnedMesh, exprId) {
  const expr = createExpressionLibrary().find((e) => e.id === exprId);
  if (!expr) return { ok: false, reason: "Expression not found" };

  const jaw = findBoneByName(skinnedMesh, "Jaw");
  const browL = findBoneByName(skinnedMesh, "Brow_L");
  const browR = findBoneByName(skinnedMesh, "Brow_R");
  const eyeL = findBoneByName(skinnedMesh, "Eye_L");
  const eyeR = findBoneByName(skinnedMesh, "Eye_R");

  if (jaw) jaw.rotation.x = -(expr.jaw || 0);
  if (browL) browL.position.y = 0.10 + (expr.brow || 0);
  if (browR) browR.position.y = 0.10 + (expr.brow || 0);
  if (eyeL) eyeL.position.y = 0.05 + (expr.eye || 0);
  if (eyeR) eyeR.position.y = 0.05 + (expr.eye || 0);

  return { ok: true };
}

export function smoothWeights(skinnedMesh, passes = 1) {
  const geo = skinnedMesh?.geometry;
  const sw = geo?.attributes?.skinWeight;
  if (!sw) return { ok: false, reason: "No skin weights found" };

  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < sw.count; i++) {
      const w0 = sw.getX(i);
      const w1 = sw.getY(i);
      const w2 = sw.getZ(i);
      const w3 = sw.getW(i);
      const sum = Math.max(1e-6, w0 + w1 + w2 + w3);
      sw.setXYZW(i, w0 / sum, w1 / sum, w2 / sum, w3 / sum);
    }
  }

  sw.needsUpdate = true;
  return { ok: true };
}

export function mirrorWeights(skinnedMesh) {
  const geo = skinnedMesh?.geometry;
  const sw = geo?.attributes?.skinWeight;
  const pos = geo?.attributes?.position;
  if (!sw || !pos) return { ok: false, reason: "No weights found" };

  for (let i = 0; i < sw.count; i++) {
    const x = pos.getX(i);
    if (x < 0) {
      sw.setXYZW(i, sw.getY(i), sw.getX(i), sw.getW(i), sw.getZ(i));
    }
  }

  sw.needsUpdate = true;
  return { ok: true };
}

export function createRetargetPresets() {
  return [
    { id: "mixamo", label: "Mixamo", mapping: { hips: "Hips", spine: "Spine_1", head: "Head" } },
    { id: "rpm", label: "Ready Player Me", mapping: { hips: "Hips", spine: "Spine_1", head: "Head" } },
    { id: "spx", label: "SPX", mapping: { hips: "Hips", spine: "Spine_1", head: "Head" } },
  ];
}

export function applyRetargetPreset(skinnedMesh, presetId) {
  const preset = createRetargetPresets().find((p) => p.id === presetId);
  if (!preset) return { ok: false, reason: "Preset not found" };
  skinnedMesh.userData.retargetPreset = presetId;
  return { ok: true, preset: preset.label };
}

export function bindMocapSkeleton(skinnedMesh) {
  if (!skinnedMesh?.skeleton) return { ok: false, reason: "No skeleton found" };
  skinnedMesh.userData.mocapBound = true;
  return { ok: true };
}

export function ensureAnimationLibrary(skinnedMesh) {
  if (!skinnedMesh) return { ok: false, reason: "No skinned mesh" };

  skinnedMesh.userData.animationLibrary = [
    { id: "idle", label: "Idle" },
    { id: "walk", label: "Walk" },
    { id: "run", label: "Run" },
    { id: "wave", label: "Wave" },
    { id: "jump", label: "Jump" },
    { id: "pose_a", label: "Pose A" },
    { id: "pose_t", label: "Pose T" },
  ];
  return { ok: true, count: skinnedMesh.userData.animationLibrary.length };
}

export function createPoseLibrary() {
  return [
    { id: "pose_a", label: "Pose A" },
    { id: "pose_t", label: "Pose T" },
    { id: "hero", label: "Hero Pose" },
    { id: "relaxed", label: "Relaxed" },
  ];
}

export function applyPose(skinnedMesh, poseId) {
  const armL = findBoneByName(skinnedMesh, "UpperArm_L");
  const armR = findBoneByName(skinnedMesh, "UpperArm_R");

  if (poseId === "pose_a") {
    if (armL) armL.rotation.z = 0.45;
    if (armR) armR.rotation.z = -0.45;
  } else if (poseId === "pose_t") {
    if (armL) armL.rotation.z = 1.2;
    if (armR) armR.rotation.z = -1.2;
  } else if (poseId === "hero") {
    if (armL) armL.rotation.z = 0.25;
    if (armR) armR.rotation.z = -0.9;
  } else if (poseId === "relaxed") {
    if (armL) armL.rotation.z = 0.15;
    if (armR) armR.rotation.z = -0.15;
  }

  return { ok: true };
}

export function createWeightHeatmapData(skinnedMesh) {
  const geo = skinnedMesh?.geometry;
  const sw = geo?.attributes?.skinWeight;
  if (!sw) return { ok: false, reason: "No skin weights found" };

  const out = [];
  for (let i = 0; i < sw.count; i++) {
    out.push({
      index: i,
      influence: Math.max(sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)),
    });
  }
  return { ok: true, points: out };
}

export function addMuscleHelpers(skinnedMesh) {
  if (!skinnedMesh?.skeleton) return { ok: false, reason: "No skeleton found" };

  const muscleTargets = ["UpperArm_L", "UpperArm_R", "UpperLeg_L", "UpperLeg_R"];
  let added = 0;

  for (const name of muscleTargets) {
    const parent = findBoneByName(skinnedMesh, name);
    if (!parent) continue;

    const helper = new THREE.Bone();
    helper.name = `${name}_Muscle`;
    helper.position.set(0, 0.03, 0);
    parent.add(helper);
    skinnedMesh.skeleton.bones.push(helper);
    added += 1;
  }

  return { ok: true, added };
}

export function addCorrectiveHelpers(skinnedMesh) {
  if (!skinnedMesh?.skeleton) return { ok: false, reason: "No skeleton found" };

  const targets = ["LowerLeg_L", "LowerLeg_R", "Forearm_L", "Forearm_R"];
  let added = 0;

  for (const name of targets) {
    const parent = findBoneByName(skinnedMesh, name);
    if (!parent) continue;

    const helper = new THREE.Bone();
    helper.name = `${name}_Corrective`;
    helper.position.set(0, 0.02, 0);
    parent.add(helper);
    skinnedMesh.skeleton.bones.push(helper);
    added += 1;
  }

  return { ok: true, added };
}

export function upgradeDeformation(skinnedMesh) {
  const twist = addTwistBones(skinnedMesh, 1);
  const smooth = smoothWeights(skinnedMesh, 3);
  const mirror = mirrorWeights(skinnedMesh);
  const corrective = addCorrectiveHelpers(skinnedMesh);
  const muscles = addMuscleHelpers(skinnedMesh);

  return {
    ok: true,
    twistAdded: twist.ok ? twist.added : 0,
    correctiveAdded: corrective.ok ? corrective.added : 0,
    muscleAdded: muscles.ok ? muscles.added : 0,
    smoothed: smooth.ok,
    mirrored: mirror.ok,
  };
}

export function runRigAnimationTest(skinnedMesh, clip = "idle", time = 0) {
  const head = findBoneByName(skinnedMesh, "Head");
  const armL = findBoneByName(skinnedMesh, "UpperArm_L");
  const armR = findBoneByName(skinnedMesh, "UpperArm_R");

  if (clip === "idle") {
    if (head) head.rotation.y = Math.sin(time * 0.001) * 0.1;
  } else if (clip === "wave") {
    if (armR) armR.rotation.z = -0.8 + Math.sin(time * 0.006) * 0.3;
  } else if (clip === "walk") {
    if (armL) armL.rotation.z = Math.sin(time * 0.006) * 0.45;
    if (armR) armR.rotation.z = -Math.sin(time * 0.006) * 0.45;
  } else if (clip === "run") {
    if (armL) armL.rotation.z = Math.sin(time * 0.012) * 0.75;
    if (armR) armR.rotation.z = -Math.sin(time * 0.012) * 0.75;
  } else if (clip === "jump") {
    if (head) head.position.y = 0.16 + Math.abs(Math.sin(time * 0.01)) * 0.05;
  }

  return { ok: true };
}
