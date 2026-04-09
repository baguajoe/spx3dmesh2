import * as THREE from "three";

// ── Pose mode state ───────────────────────────────────────────────────────────
export function enterPoseMode(armature) {
  armature.userData.poseMode = true;
  armature.userData.restPose = capturePose(armature);
  return armature.userData.restPose;
}

export function exitPoseMode(armature) {
  armature.userData.poseMode = false;
}

// ── Capture current pose ──────────────────────────────────────────────────────
export function capturePose(armature) {
  const pose = {};
  armature.userData.bones?.forEach(bone => {
    pose[bone.userData.boneId] = {
      position: bone.position.clone(),
      rotation: bone.rotation.clone(),
      scale:    bone.scale.clone(),
    };
  });
  return pose;
}

// ── Apply a saved pose ────────────────────────────────────────────────────────
export function applyPose(armature, pose) {
  armature.userData.bones?.forEach(bone => {
    const p = pose[bone.userData.boneId];
    if (!p) return;
    bone.position.copy(p.position);
    bone.rotation.copy(p.rotation);
    bone.scale.copy(p.scale);
  });
}

// ── Reset to rest pose ────────────────────────────────────────────────────────
export function resetToRestPose(armature) {
  const rest = armature.userData.restPose;
  if (!rest) return;
  applyPose(armature, rest);
}

// ── Pose bone — rotate around local axis ─────────────────────────────────────
export function poseBone(bone, axis, angle) {
  if (axis === "x") bone.rotation.x += angle;
  if (axis === "y") bone.rotation.y += angle;
  if (axis === "z") bone.rotation.z += angle;
}

// ── FK chain — rotate bone and propagate to children ─────────────────────────
export function rotateFKChain(armature, boneId, axis, angle) {
  const bone = armature.userData.bones?.find(b => b.userData.boneId === boneId);
  if (!bone) return;
  poseBone(bone, axis, angle);
  // THREE.Bone handles child propagation via scene graph
}

// ── Copy pose from one armature to another ────────────────────────────────────
export function copyPose(source, target) {
  const pose = capturePose(source);
  applyPose(target, pose);
}

// ── Pose library ──────────────────────────────────────────────────────────────
export function savePoseToLibrary(armature, name, library) {
  const pose = capturePose(armature);
  library[name] = { name, pose, timestamp: Date.now() };
  return library;
}

export function loadPoseFromLibrary(armature, name, library) {
  const entry = library[name];
  if (!entry) return false;
  applyPose(armature, entry.pose);
  return true;
}

// ── Bone constraint — copy rotation ──────────────────────────────────────────
export function applyBoneConstraints(armature) {
  armature.userData.bones?.forEach(bone => {
    const constraints = bone.userData.constraints || [];
    constraints.forEach(c => {
      if (c.type === "copyRotation") {
        const target = armature.userData.bones?.find(b => b.userData.boneId === c.targetId);
        if (target) {
          bone.rotation.x = target.rotation.x * (c.influence || 1);
          bone.rotation.y = target.rotation.y * (c.influence || 1);
          bone.rotation.z = target.rotation.z * (c.influence || 1);
        }
      }
      if (c.type === "limitRotation") {
        if (c.minX !== undefined) bone.rotation.x = Math.max(c.minX, Math.min(c.maxX, bone.rotation.x));
        if (c.minY !== undefined) bone.rotation.y = Math.max(c.minY, Math.min(c.maxY, bone.rotation.y));
        if (c.minZ !== undefined) bone.rotation.z = Math.max(c.minZ, Math.min(c.maxZ, bone.rotation.z));
      }
    });
  });
}
