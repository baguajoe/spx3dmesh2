import * as THREE from "three";

// ── Constraint types ──────────────────────────────────────────────────────────
export const CONSTRAINT_TYPES = {
  lookAt:       { label: "Look At",          icon: "👁" },
  floor:        { label: "Floor",            icon: "⬇" },
  stretchTo:    { label: "Stretch To",       icon: "↕" },
  copyLocation: { label: "Copy Location",    icon: "📍" },
  copyRotation: { label: "Copy Rotation",    icon: "↺" },
  copyScale:    { label: "Copy Scale",       icon: "⤢" },
  limitLocation:{ label: "Limit Location",   icon: "📦" },
  limitRotation:{ label: "Limit Rotation",   icon: "🔒" },
  limitScale:   { label: "Limit Scale",      icon: "📐" },
  childOf:      { label: "Child Of",         icon: "🔗" },
  dampedTrack:  { label: "Damped Track",     icon: "🎯" },
};

// ── Create constraint ─────────────────────────────────────────────────────────
export function createConstraint(type, targetId, options = {}) {
  return {
    id:         crypto.randomUUID(),
    type,
    targetId,
    influence:  options.influence  !== undefined ? options.influence : 1.0,
    enabled:    true,
    // Look At
    trackAxis:  options.trackAxis  || "y",
    upAxis:     options.upAxis     || "z",
    // Floor
    floorY:     options.floorY     !== undefined ? options.floorY : 0,
    offset:     options.offset     || 0,
    // Stretch To
    volume:     options.volume     || "xz",
    restLength: options.restLength || 1.0,
    // Copy
    useX:       options.useX       !== undefined ? options.useX : true,
    useY:       options.useY       !== undefined ? options.useY : true,
    useZ:       options.useZ       !== undefined ? options.useZ : true,
    invert:     options.invert     || { x:false, y:false, z:false },
    mix:        options.mix        || "replace",
    // Limits
    minX: options.minX, maxX: options.maxX,
    minY: options.minY, maxY: options.maxY,
    minZ: options.minZ, maxZ: options.maxZ,
  };
}

// ── Apply Look At constraint ──────────────────────────────────────────────────
export function applyLookAt(obj, target, { trackAxis="y", upAxis="z", influence=1.0 } = {}) {
  if (!obj || !target) return;
  const targetPos = new THREE.Vector3();
  target.getWorldPosition ? target.getWorldPosition(targetPos) : targetPos.copy(target);
  const up = upAxis === "z" ? new THREE.Vector3(0,0,1) :
             upAxis === "y" ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
  const matrix = new THREE.Matrix4().lookAt(obj.position, targetPos, up);
  const targetQuat = new THREE.Quaternion().setFromRotationMatrix(matrix);
  obj.quaternion.slerp(targetQuat, influence);
}

// ── Apply Floor constraint ────────────────────────────────────────────────────
export function applyFloor(obj, { floorY=0, offset=0, influence=1.0 } = {}) {
  if (!obj) return;
  if (obj.position.y < floorY + offset) {
    obj.position.y = THREE.MathUtils.lerp(obj.position.y, floorY + offset, influence);
  }
}

// ── Apply Stretch To constraint ───────────────────────────────────────────────
export function applyStretchTo(bone, target, { restLength=1.0, volume="xz", influence=1.0 } = {}) {
  if (!bone || !target) return;
  const bonePos  = new THREE.Vector3(); bone.getWorldPosition(bonePos);
  const targetPos = new THREE.Vector3();
  target.getWorldPosition ? target.getWorldPosition(targetPos) : targetPos.copy(target);
  const dist = bonePos.distanceTo(targetPos);
  const scale = dist / restLength;
  // Stretch along Y, compensate volume on X/Z
  const comp = volume === "xz" ? 1 / Math.sqrt(scale) : 1;
  bone.scale.y = THREE.MathUtils.lerp(bone.scale.y, scale, influence);
  if (volume !== "none") {
    bone.scale.x = THREE.MathUtils.lerp(bone.scale.x, comp, influence);
    bone.scale.z = THREE.MathUtils.lerp(bone.scale.z, comp, influence);
  }
}

// ── Apply Copy Location ───────────────────────────────────────────────────────
export function applyCopyLocation(obj, target, { useX=true, useY=true, useZ=true, invert={}, mix="replace", influence=1.0 } = {}) {
  if (!obj || !target) return;
  const targetPos = new THREE.Vector3();
  target.getWorldPosition ? target.getWorldPosition(targetPos) : targetPos.copy(target);
  if (useX) {
    const tx = (invert.x ? -1 : 1) * targetPos.x;
    obj.position.x = mix==="replace" ? THREE.MathUtils.lerp(obj.position.x, tx, influence) : obj.position.x + tx*influence;
  }
  if (useY) {
    const ty = (invert.y ? -1 : 1) * targetPos.y;
    obj.position.y = mix==="replace" ? THREE.MathUtils.lerp(obj.position.y, ty, influence) : obj.position.y + ty*influence;
  }
  if (useZ) {
    const tz = (invert.z ? -1 : 1) * targetPos.z;
    obj.position.z = mix==="replace" ? THREE.MathUtils.lerp(obj.position.z, tz, influence) : obj.position.z + tz*influence;
  }
}

// ── Apply Copy Rotation ───────────────────────────────────────────────────────
export function applyCopyRotation(obj, target, { useX=true, useY=true, useZ=true, invert={}, mix="replace", influence=1.0 } = {}) {
  if (!obj || !target) return;
  if (useX) obj.rotation.x = THREE.MathUtils.lerp(obj.rotation.x, (invert.x?-1:1)*target.rotation.x, influence);
  if (useY) obj.rotation.y = THREE.MathUtils.lerp(obj.rotation.y, (invert.y?-1:1)*target.rotation.y, influence);
  if (useZ) obj.rotation.z = THREE.MathUtils.lerp(obj.rotation.z, (invert.z?-1:1)*target.rotation.z, influence);
}

// ── Apply Copy Scale ──────────────────────────────────────────────────────────
export function applyCopyScale(obj, target, { useX=true, useY=true, useZ=true, influence=1.0 } = {}) {
  if (!obj || !target) return;
  if (useX) obj.scale.x = THREE.MathUtils.lerp(obj.scale.x, target.scale.x, influence);
  if (useY) obj.scale.y = THREE.MathUtils.lerp(obj.scale.y, target.scale.y, influence);
  if (useZ) obj.scale.z = THREE.MathUtils.lerp(obj.scale.z, target.scale.z, influence);
}

// ── Apply Limit Location ──────────────────────────────────────────────────────
export function applyLimitLocation(obj, { minX, maxX, minY, maxY, minZ, maxZ, influence=1.0 } = {}) {
  if (!obj) return;
  if (minX !== undefined) obj.position.x = Math.max(minX, obj.position.x);
  if (maxX !== undefined) obj.position.x = Math.min(maxX, obj.position.x);
  if (minY !== undefined) obj.position.y = Math.max(minY, obj.position.y);
  if (maxY !== undefined) obj.position.y = Math.min(maxY, obj.position.y);
  if (minZ !== undefined) obj.position.z = Math.max(minZ, obj.position.z);
  if (maxZ !== undefined) obj.position.z = Math.min(maxZ, obj.position.z);
}

// ── Apply Limit Rotation ──────────────────────────────────────────────────────
export function applyLimitRotation(obj, { minX, maxX, minY, maxY, minZ, maxZ } = {}) {
  if (!obj) return;
  if (minX !== undefined) obj.rotation.x = Math.max(minX, obj.rotation.x);
  if (maxX !== undefined) obj.rotation.x = Math.min(maxX, obj.rotation.x);
  if (minY !== undefined) obj.rotation.y = Math.max(minY, obj.rotation.y);
  if (maxY !== undefined) obj.rotation.y = Math.min(maxY, obj.rotation.y);
  if (minZ !== undefined) obj.rotation.z = Math.max(minZ, obj.rotation.z);
  if (maxZ !== undefined) obj.rotation.z = Math.min(maxZ, obj.rotation.z);
}

// ── Apply Damped Track ────────────────────────────────────────────────────────
export function applyDampedTrack(obj, target, { trackAxis="y", influence=1.0 } = {}) {
  if (!obj || !target) return;
  const targetPos = new THREE.Vector3();
  target.getWorldPosition ? target.getWorldPosition(targetPos) : targetPos.copy(target);
  const dir = targetPos.clone().sub(obj.position).normalize();
  const axis = trackAxis === "y" ? new THREE.Vector3(0,1,0) :
               trackAxis === "x" ? new THREE.Vector3(1,0,0) : new THREE.Vector3(0,0,1);
  const quat = new THREE.Quaternion().setFromUnitVectors(axis, dir);
  obj.quaternion.slerp(quat, influence);
}

// ── Apply constraint by type ──────────────────────────────────────────────────
export function applyConstraint(constraint, obj, targetObj) {
  if (!constraint.enabled) return;
  switch (constraint.type) {
    case "lookAt":        applyLookAt(obj, targetObj, constraint); break;
    case "floor":         applyFloor(obj, constraint); break;
    case "stretchTo":     applyStretchTo(obj, targetObj, constraint); break;
    case "copyLocation":  applyCopyLocation(obj, targetObj, constraint); break;
    case "copyRotation":  applyCopyRotation(obj, targetObj, constraint); break;
    case "copyScale":     applyCopyScale(obj, targetObj, constraint); break;
    case "limitLocation": applyLimitLocation(obj, constraint); break;
    case "limitRotation": applyLimitRotation(obj, constraint); break;
    case "dampedTrack":   applyDampedTrack(obj, targetObj, constraint); break;
  }
}

// ── Apply all constraints for an object ──────────────────────────────────────
export function applyAllConstraints(constraints, obj, sceneObjects) {
  constraints.forEach(c => {
    const targetObj = sceneObjects.find(o => o.id === c.targetId)?.mesh;
    applyConstraint(c, obj, targetObj);
  });
}
