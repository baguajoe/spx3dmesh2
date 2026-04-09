import * as THREE from "three";

function mapGuide(point, scale = 1, centerX = 210, baseY = 245) {
  if (!point) return { x: 0, y: 0, z: 0 };
  return {
    x: ((point.x - centerX) / 170) * scale,
    y: ((baseY - point.y) / 170) * scale + 1.0 * scale,
    z: 0,
  };
}

function makeBone(name, x, y, z) {
  const b = new THREE.Bone();
  b.name = name;
  b.position.set(x, y, z);
  return b;
}

export function createHumanoidAutoRig({
  spineCount = 4,
  armSegments = 2,
  legSegments = 2,
  scale = 1,
  guides = null,
} = {}) {
  if (guides) {
    const hipsP = mapGuide(guides.hips, scale);
    const spineP = mapGuide(guides.spine, scale);
    const chestP = mapGuide(guides.chest, scale);
    const neckP = mapGuide(guides.neck, scale);
    const headP = mapGuide(guides.head, scale);

    const hips = makeBone("Hips", hipsP.x, hipsP.y, hipsP.z);

    const spine1 = makeBone("Spine_1", spineP.x - hipsP.x, spineP.y - hipsP.y, 0);
    const spine2 = makeBone("Spine_2", chestP.x - spineP.x, chestP.y - spineP.y, 0);
    const neck = makeBone("Neck", neckP.x - chestP.x, neckP.y - chestP.y, 0);
    const head = makeBone("Head", headP.x - neckP.x, headP.y - neckP.y, 0);

    hips.add(spine1);
    spine1.add(spine2);
    spine2.add(neck);
    neck.add(head);

    const shoulderLP = mapGuide(guides.shoulder_l, scale);
    const elbowLP = mapGuide(guides.elbow_l, scale);
    const wristLP = mapGuide(guides.wrist_l, scale);

    const shoulderL = makeBone("Shoulder_L", shoulderLP.x - chestP.x, shoulderLP.y - chestP.y, 0);
    const upperArmL = makeBone("UpperArm_L", elbowLP.x - shoulderLP.x, elbowLP.y - shoulderLP.y, 0);
    const forearmL = makeBone("Forearm_L", wristLP.x - elbowLP.x, wristLP.y - elbowLP.y, 0);
    const handL = makeBone("Hand_L", 0.08 * scale, 0, 0);

    spine2.add(shoulderL);
    shoulderL.add(upperArmL);
    upperArmL.add(forearmL);
    forearmL.add(handL);

    const shoulderRP = mapGuide(guides.shoulder_r, scale);
    const elbowRP = mapGuide(guides.elbow_r, scale);
    const wristRP = mapGuide(guides.wrist_r, scale);

    const shoulderR = makeBone("Shoulder_R", shoulderRP.x - chestP.x, shoulderRP.y - chestP.y, 0);
    const upperArmR = makeBone("UpperArm_R", elbowRP.x - shoulderRP.x, elbowRP.y - shoulderRP.y, 0);
    const forearmR = makeBone("Forearm_R", wristRP.x - elbowRP.x, wristRP.y - elbowRP.y, 0);
    const handR = makeBone("Hand_R", -0.08 * scale, 0, 0);

    spine2.add(shoulderR);
    shoulderR.add(upperArmR);
    upperArmR.add(forearmR);
    forearmR.add(handR);

    const hipLP = mapGuide(guides.hip_l, scale);
    const kneeLP = mapGuide(guides.knee_l, scale);
    const ankleLP = mapGuide(guides.ankle_l, scale);

    const upperLegL = makeBone("UpperLeg_L", hipLP.x - hipsP.x, hipLP.y - hipsP.y, 0);
    const lowerLegL = makeBone("LowerLeg_L", kneeLP.x - hipLP.x, kneeLP.y - hipLP.y, 0);
    const footL = makeBone("Foot_L", ankleLP.x - kneeLP.x, ankleLP.y - kneeLP.y, 0.06 * scale);

    hips.add(upperLegL);
    upperLegL.add(lowerLegL);
    lowerLegL.add(footL);

    const hipRP = mapGuide(guides.hip_r, scale);
    const kneeRP = mapGuide(guides.knee_r, scale);
    const ankleRP = mapGuide(guides.ankle_r, scale);

    const upperLegR = makeBone("UpperLeg_R", hipRP.x - hipsP.x, hipRP.y - hipsP.y, 0);
    const lowerLegR = makeBone("LowerLeg_R", kneeRP.x - hipRP.x, kneeRP.y - hipRP.y, 0);
    const footR = makeBone("Foot_R", ankleRP.x - kneeRP.x, ankleRP.y - kneeRP.y, 0.06 * scale);

    hips.add(upperLegR);
    upperLegR.add(lowerLegR);
    lowerLegR.add(footR);

    const skeleton = new THREE.Skeleton([
      hips, spine1, spine2, neck, head,
      shoulderL, upperArmL, forearmL, handL,
      shoulderR, upperArmR, forearmR, handR,
      upperLegL, lowerLegL, footL,
      upperLegR, lowerLegR, footR,
    ]);

    return { rootBone: hips, skeleton };
  }

  const hips = makeBone("Hips", 0, 1.0 * scale, 0);

  let prev = hips;
  const spineBones = [];
  for (let i = 0; i < spineCount; i++) {
    const b = makeBone(`Spine_${i + 1}`, 0, 0.18 * scale, 0);
    prev.add(b);
    spineBones.push(b);
    prev = b;
  }

  const chest = prev;
  const neck = makeBone("Neck", 0, 0.16 * scale, 0);
  const head = makeBone("Head", 0, 0.16 * scale, 0);
  chest.add(neck);
  neck.add(head);

  const shoulderL = makeBone("Shoulder_L", 0.14 * scale, 0.12 * scale, 0);
  const upperArmL = makeBone("UpperArm_L", 0.22 * scale, 0, 0);
  const forearmL = makeBone("Forearm_L", 0.24 * scale, 0, 0);
  const handL = makeBone("Hand_L", 0.20 * scale, 0, 0);

  chest.add(shoulderL);
  shoulderL.add(upperArmL);
  upperArmL.add(forearmL);
  forearmL.add(handL);

  const shoulderR = makeBone("Shoulder_R", -0.14 * scale, 0.12 * scale, 0);
  const upperArmR = makeBone("UpperArm_R", -0.22 * scale, 0, 0);
  const forearmR = makeBone("Forearm_R", -0.24 * scale, 0, 0);
  const handR = makeBone("Hand_R", -0.20 * scale, 0, 0);

  chest.add(shoulderR);
  shoulderR.add(upperArmR);
  upperArmR.add(forearmR);
  forearmR.add(handR);

  const upperLegL = makeBone("UpperLeg_L", 0.10 * scale, -0.32 * scale, 0);
  const lowerLegL = makeBone("LowerLeg_L", 0, -0.42 * scale, 0);
  const footL = makeBone("Foot_L", 0, -0.38 * scale, 0.06 * scale);

  hips.add(upperLegL);
  upperLegL.add(lowerLegL);
  lowerLegL.add(footL);

  const upperLegR = makeBone("UpperLeg_R", -0.10 * scale, -0.32 * scale, 0);
  const lowerLegR = makeBone("LowerLeg_R", 0, -0.42 * scale, 0);
  const footR = makeBone("Foot_R", 0, -0.38 * scale, 0.06 * scale);

  hips.add(upperLegR);
  upperLegR.add(lowerLegR);
  lowerLegR.add(footR);

  const skeleton = new THREE.Skeleton([
    hips,
    ...spineBones,
    neck, head,
    shoulderL, upperArmL, forearmL, handL,
    shoulderR, upperArmR, forearmR, handR,
    upperLegL, lowerLegL, footL,
    upperLegR, lowerLegR, footR,
  ]);

  return { rootBone: hips, skeleton };
}

export function autoBindSkeletonToMesh(mesh, skeletonData) {
  if (!mesh || !mesh.geometry || !skeletonData?.skeleton || !skeletonData?.rootBone) return false;

  mesh.add(skeletonData.rootBone);
  const skinned = new THREE.SkinnedMesh(mesh.geometry, mesh.material);
  skinned.name = mesh.name ? `${mesh.name}_rigged` : "AutoRiggedMesh";
  skinned.bind(skeletonData.skeleton);
  skinned.add(skeletonData.rootBone);

  generateBasicWeights(skinned, skeletonData.skeleton);
  return skinned;
}

export function generateBasicWeights(skinnedMesh, skeleton) {
  const geo = skinnedMesh.geometry;
  const pos = geo.attributes.position;
  const skinIndices = [];
  const skinWeights = [];

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    let boneIndex = 0;

    if (y > 1.55) boneIndex = skeleton.bones.findIndex(b => b.name === "Head");
    else if (y > 1.25) boneIndex = skeleton.bones.findIndex(b => b.name.startsWith("Spine"));
    else if (y > 0.9) boneIndex = skeleton.bones.findIndex(b => b.name === "Hips");
    else if (y > 0.4) boneIndex = skeleton.bones.findIndex(b => b.name === "UpperLeg_L");
    else boneIndex = skeleton.bones.findIndex(b => b.name === "LowerLeg_L");

    if (boneIndex < 0) boneIndex = 0;

    skinIndices.push(boneIndex, 0, 0, 0);
    skinWeights.push(1, 0, 0, 0);
  }

  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  return true;
}

export function findPrimaryMesh(scene) {
  let found = null;
  scene?.traverse((obj) => {
    if (found) return;
    if (obj?.isMesh && !obj.isSkinnedMesh) {
      const name = (obj.name || "").toLowerCase();
      if (!name.startsWith("hair_") && !name.startsWith("garment_")) {
        found = obj;
      }
    }
  });
  return found;
}

export function runAutoRig(scene, options = {}) {
  const mesh = findPrimaryMesh(scene);
  if (!mesh) return { ok: false, reason: "No primary mesh found" };

  const rig = createHumanoidAutoRig({ ...options, guides: options.guides || null });
  const skinned = autoBindSkeletonToMesh(mesh, rig);
  if (!skinned) return { ok: false, reason: "Auto rig bind failed" };

  skinned.position.copy(mesh.position);
  skinned.rotation.copy(mesh.rotation);
  skinned.scale.copy(mesh.scale);

  mesh.parent?.add(skinned);
  mesh.visible = false;

  return {
    ok: true,
    meshName: mesh.name || "Mesh",
    boneCount: rig.skeleton.bones.length,
    skinnedName: skinned.name,
  };
}
