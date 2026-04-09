import * as THREE from "three";

// ── Bone display constants ────────────────────────────────────────────────────
const BONE_COLOR        = 0x00ffc8;
const BONE_SEL_COLOR    = 0xFF6600;
const BONE_LENGTH       = 0.5;

// ── Create armature object ────────────────────────────────────────────────────
export function createArmature(name = "Armature") {
  const group = new THREE.Group();
  group.name  = name;
  group.userData.isArmature = true;
  group.userData.bones      = [];
  group.userData.selectedBone = null;
  return group;
}

// ── Add a bone to armature ────────────────────────────────────────────────────
export function addBone(armature, options = {}) {
  const {
    name     = "Bone_" + armature.userData.bones.length,
    head     = new THREE.Vector3(0, 0, 0),
    tail     = new THREE.Vector3(0, BONE_LENGTH, 0),
    parentId = null,
  } = options;

  const bone = new THREE.Bone();
  bone.name  = name;
  bone.position.copy(head);
  bone.userData.tail     = tail.clone().sub(head);
  bone.userData.boneId   = crypto.randomUUID();
  bone.userData.parentId = parentId;
  bone.userData.children = [];

  if (parentId) {
    const parent = findBoneById(armature, parentId);
    if (parent) {
      parent.add(bone);
      parent.userData.children.push(bone.userData.boneId);
    } else {
      armature.add(bone);
    }
  } else {
    armature.add(bone);
  }

  armature.userData.bones.push(bone);
  return bone;
}

// ── Find bone by id ───────────────────────────────────────────────────────────
export function findBoneById(armature, id) {
  return armature.userData.bones.find(b => b.userData.boneId === id) || null;
}

// ── Select a bone ─────────────────────────────────────────────────────────────
export function selectBone(armature, boneId) {
  armature.userData.selectedBone = boneId;
  updateBoneDisplay(armature);
}

// ── Build bone display meshes (octahedron shape) ──────────────────────────────
export function buildBoneDisplay(armature) {
  // Remove old display
  const old = armature.getObjectByName("__bone_display__");
  if (old) armature.remove(old);

  const displayGroup = new THREE.Group();
  displayGroup.name  = "__bone_display__";

  armature.userData.bones.forEach(bone => {
    const tail   = bone.userData.tail || new THREE.Vector3(0, BONE_LENGTH, 0);
    const len    = tail.length();
    const isSelected = bone.userData.boneId === armature.userData.selectedBone;

    // Octahedron bone shape
    const geo    = new THREE.OctahedronGeometry(len * 0.1, 0);
    const mat    = new THREE.MeshBasicMaterial({
      color: isSelected ? BONE_SEL_COLOR : BONE_COLOR,
      wireframe: false,
      transparent: true,
      opacity: 0.7,
    });
    const mesh   = new THREE.Mesh(geo, mat);

    // Position at bone head, scale along tail direction
    const worldPos = new THREE.Vector3();
    bone.getWorldPosition(worldPos);
    mesh.position.copy(worldPos);

    // Orient along tail
    const dir = tail.clone().normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
    mesh.scale.y = len / (len * 0.2);

    mesh.userData.boneId = bone.userData.boneId;
    displayGroup.add(mesh);

    // Bone stick (line from head to tail)
    const points = [
      worldPos.clone(),
      worldPos.clone().add(tail),
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: isSelected ? BONE_SEL_COLOR : BONE_COLOR,
    });
    displayGroup.add(new THREE.Line(lineGeo, lineMat));
  });

  armature.add(displayGroup);
  return displayGroup;
}

// ── Update bone display colors ────────────────────────────────────────────────
export function updateBoneDisplay(armature) {
  buildBoneDisplay(armature);
}

// ── Move bone head ────────────────────────────────────────────────────────────
export function moveBoneHead(bone, delta) {
  bone.position.add(delta);
}

// ── Move bone tail ────────────────────────────────────────────────────────────
export function moveBoneTail(bone, delta) {
  if (!bone.userData.tail) bone.userData.tail = new THREE.Vector3(0, BONE_LENGTH, 0);
  bone.userData.tail.add(delta);
}

// ── Parent bone to another ────────────────────────────────────────────────────
export function parentBone(armature, childId, parentId) {
  const child  = findBoneById(armature, childId);
  const parent = findBoneById(armature, parentId);
  if (!child || !parent) return false;
  child.userData.parentId = parentId;
  parent.add(child);
  parent.userData.children = parent.userData.children || [];
  parent.userData.children.push(childId);
  updateBoneDisplay(armature);
  return true;
}

// ── Get armature stats ────────────────────────────────────────────────────────
export function getArmatureStats(armature) {
  return {
    bones:    armature.userData.bones.length,
    selected: armature.userData.selectedBone,
    name:     armature.name,
  };
}

// ── Serialize armature for save ───────────────────────────────────────────────
export function serializeArmature(armature) {
  return {
    name:  armature.name,
    bones: armature.userData.bones.map(b => ({
      id:       b.userData.boneId,
      name:     b.name,
      head:     b.position.toArray(),
      tail:     b.userData.tail?.toArray() || [0, BONE_LENGTH, 0],
      parentId: b.userData.parentId,
    })),
  };
}
