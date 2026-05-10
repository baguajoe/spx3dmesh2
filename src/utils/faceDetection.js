// Face region detection for the cel-family 2D panel pipeline. Returns a
// pixel-space rect anchored on the live head-bone position with extents
// derived from the rest-pose head-mesh bounding box.
//
// Why bone + rest-pose-mesh, not Box3.setFromObject:
// Box3.setFromObject on a SkinnedMesh reads geometry-local positions and
// applies the mesh node's matrixWorld — it does NOT account for skinning.
// For a turning/looking head we'd get the T-pose bbox forever. Instead we
// take the head bone's getWorldPosition() (live, animated) for the center
// and use the rest-pose mesh bbox only for SIZE (which doesn't change
// during typical animation). For non-rigged meshes we fall back to the
// rest-pose mesh bbox for both — face won't track if morph-target
// animated, accepted limitation.
//
// Naming patterns are intentionally narrow: substrings like "body" are
// EXCLUDED (would match CC_Base_Body and grab the whole torso). Phase 3A
// uses eye/jaw bones directly so we don't need to union eye/teeth meshes
// for Phase 1's rect.

import * as THREE from "three";

const HEAD_BONE_PATTERNS = [
  /^head$/i,
  /^cc_base_head$/i,
  /^mixamorig:?head$/i,
];

const FACE_MESH_PATTERNS = [
  /_head\b/i,
  /^head$/i,
  /face/i,
  /scalp/i,
  /wolf3d_head/i,
];

const EXCLUDE_MESH_PATTERNS = [
  /^garment_/i,
  /^hair_/i,
  /tongue/i,
  /teeth/i,
  /eyelash/i,
];

// Per-axis inward shrink applied to the rest-pose head bbox half-extents.
// Y is much smaller than X/Z because Wolf3D-style rigs include the neck
// stub in the head mesh (Wolf3D_Head Y-extent measured at 1.67× X-extent
// in diagnostic) — cutting half the Y isolates the face proper. The
// CENTER_Y_OFFSET below compensates for the head bone sitting at the
// base of this range (neck joint) rather than at the face center.
const SHRINK = { x: 0.85, y: 0.55, z: 0.85 };
const CENTER_Y_OFFSET_RATIO = 0.25;

// Pre-allocated to avoid per-frame GC churn. Module-level → not safe for
// concurrent calls, but the panel calls this from a single rAF loop.
const _corner = new THREE.Vector3();
const _center = new THREE.Vector3();
const _restSize = new THREE.Vector3();
const _box = new THREE.Box3();

function isInfrastructure(obj) {
  const u = obj?.userData;
  return u?._spxNprOutline === true
      || u?.isHelper === true
      || u?._spxInfrastructure === true;
}

export function findHeadBone(scene) {
  let hit = null;
  scene?.traverse(obj => {
    if (hit) return;
    if (!obj?.isBone) return;
    if (isInfrastructure(obj)) return;
    if (HEAD_BONE_PATTERNS.some(re => re.test(obj.name || ""))) hit = obj;
  });
  return hit;
}

export function findFaceMesh(scene) {
  let hit = null;
  scene?.traverse(obj => {
    if (hit) return;
    if (!obj?.isMesh) return;
    if (isInfrastructure(obj)) return;
    const name = obj.name || "";
    if (EXCLUDE_MESH_PATTERNS.some(re => re.test(name))) return;
    if (FACE_MESH_PATTERNS.some(re => re.test(name))) hit = obj;
  });
  return hit;
}

// Rest-pose world-space size. Cached by caller — call once per avatar.
export function measureRestPoseFaceSize(headMesh) {
  if (!headMesh) return null;
  _box.setFromObject(headMesh);
  if (_box.isEmpty()) return null;
  const size = new THREE.Vector3();
  _box.getSize(size);
  return size;
}

// Per-frame face rect in pixel coordinates of the target canvas (top-left
// origin). Returns null when the face is fully off-screen / behind near
// plane / smaller than 4×4 px / no head bone OR mesh found.
//
// `cache` is a plain object owned by the caller (e.g. useRef({}).current).
// First call populates cache.{scene, headBone, headMesh, restPoseSize};
// subsequent calls reuse. Cache invalidates on scene swap or when the
// cached bone/mesh has been detached (avatar replaced within same scene).
export function detectFaceRect(scene, camera, canvasW, canvasH, cache) {
  if (!scene || !camera || !canvasW || !canvasH || !cache) return null;

  const stale = cache.scene !== scene
             || (cache.headBone && !cache.headBone.parent)
             || (cache.headMesh && !cache.headMesh.parent);
  if (stale) {
    cache.scene = scene;
    cache.headBone = undefined;
    cache.headMesh = undefined;
    cache.restPoseSize = undefined;
  }

  if (cache.headBone === undefined) cache.headBone = findHeadBone(scene);
  if (cache.headMesh === undefined) cache.headMesh = findFaceMesh(scene);
  if (cache.restPoseSize === undefined) {
    cache.restPoseSize = cache.headMesh ? measureRestPoseFaceSize(cache.headMesh) : null;
  }

  // Center: prefer live bone (animation-respecting). Fall back to
  // rest-pose mesh center if no bone is rigged.
  if (cache.headBone) {
    cache.headBone.getWorldPosition(_center);
  } else if (cache.headMesh) {
    _box.setFromObject(cache.headMesh);
    if (_box.isEmpty()) return null;
    _box.getCenter(_center);
    if (!cache.restPoseSize) {
      cache.restPoseSize = new THREE.Vector3();
      _box.getSize(cache.restPoseSize);
    }
  } else {
    return null;
  }

  if (!cache.restPoseSize) return null;

  // Y center offset — applies to BOTH the rigged path (head bone sits at
  // neck joint) and the rigless path (geometric center is half-way down a
  // mesh that includes the neck). Either way, push center upward by 25% of
  // rest-pose Y so the rect lands on the face proper, not the collarbone.
  _center.y += cache.restPoseSize.y * CENTER_Y_OFFSET_RATIO;

  // Per-axis half-extents — see SHRINK constant header for why Y is
  // much smaller than X/Z. Stored in the pre-allocated _restSize vector
  // for use in the corner loop below.
  _restSize.set(
    cache.restPoseSize.x * 0.5 * SHRINK.x,
    cache.restPoseSize.y * 0.5 * SHRINK.y,
    cache.restPoseSize.z * 0.5 * SHRINK.z,
  );

  // Project all 8 AABB corners. anyInFront flag bails out when face is
  // fully off-screen / behind the near plane (project() returns z >= 1
  // for points outside the view frustum's near).
  let xMin =  Infinity, yMin =  Infinity;
  let xMax = -Infinity, yMax = -Infinity;
  let anyInFront = false;

  for (let dx = -1; dx <= 1; dx += 2)
  for (let dy = -1; dy <= 1; dy += 2)
  for (let dz = -1; dz <= 1; dz += 2) {
    _corner.set(
      _center.x + _restSize.x * dx,
      _center.y + _restSize.y * dy,
      _center.z + _restSize.z * dz,
    ).project(camera);
    if (_corner.z < 1) anyInFront = true;
    if (_corner.x < xMin) xMin = _corner.x;
    if (_corner.x > xMax) xMax = _corner.x;
    if (_corner.y < yMin) yMin = _corner.y;
    if (_corner.y > yMax) yMax = _corner.y;
  }

  if (!anyInFront) return null;

  // NDC → pixel coords (top-left origin). Matches App.jsx:2853 pattern.
  // NDC y = +1 is top of screen → pixel y = 0; flip via -ymax/-ymin.
  let x0 = ((xMin + 1) / 2) * canvasW;
  let x1 = ((xMax + 1) / 2) * canvasW;
  let y0 = ((-yMax + 1) / 2) * canvasH;
  let y1 = ((-yMin + 1) / 2) * canvasH;

  x0 = Math.max(0, Math.min(canvasW, x0));
  x1 = Math.max(0, Math.min(canvasW, x1));
  y0 = Math.max(0, Math.min(canvasH, y0));
  y1 = Math.max(0, Math.min(canvasH, y1));

  const w = x1 - x0;
  const h = y1 - y0;
  if (w < 4 || h < 4) return null;

  return {
    x: x0,
    y: y0,
    w,
    h,
    featherPx: Math.min(w, h) * 0.1,
  };
}
