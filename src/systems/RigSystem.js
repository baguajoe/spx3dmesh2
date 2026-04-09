import * as THREE from 'three';

/**
 * SPX RigSystem — armature-based skeletal rigging with FABRIK IK
 * Supports: bone creation, weight painting hooks, FK/IK switching, pose export
 */

export class Bone {
  constructor(name, parent = null) {
    this.name = name;
    this.parent = parent;
    this.children = [];
    this.object3D = new THREE.Object3D();
    this.object3D.name = name;
    this.restMatrix = new THREE.Matrix4();
    this.poseMatrix = new THREE.Matrix4();
    this.ikEnabled = false;
    this.ikTarget = null;   // THREE.Vector3 in world space
    this.ikChainLength = 2; // how many ancestors are in the IK chain
    this.length = 1.0;
    if (parent) {
      parent.children.push(this);
      parent.object3D.add(this.object3D);
    }
  }

  setPosition(x, y, z) { this.object3D.position.set(x, y, z); return this; }
  setRotation(x, y, z) { this.object3D.rotation.set(x, y, z); return this; }
  setLength(l) { this.length = l; return this; }

  getWorldPosition() {
    const wp = new THREE.Vector3();
    this.object3D.getWorldPosition(wp);
    return wp;
  }

  saveRest() {
    this.object3D.updateMatrixWorld(true);
    this.restMatrix.copy(this.object3D.matrixWorld);
    for (const c of this.children) c.saveRest();
  }
}

export class Armature {
  constructor(name = 'Armature') {
    this.name = name;
    this.root = new THREE.Object3D();
    this.root.name = name;
    this.bones = new Map();  // name → Bone
    this.rootBones = [];
    this.bindMeshes = [];    // { mesh, weights: Map<boneName, Float32Array> }
    this._helper = null;
  }

  addBone(name, parentName = null) {
    const parent = parentName ? this.bones.get(parentName) : null;
    const bone = new Bone(name, parent);
    this.bones.set(name, bone);
    if (!parent) {
      this.rootBones.push(bone);
      this.root.add(bone.object3D);
    }
    return bone;
  }

  getBone(name) { return this.bones.get(name); }

  // Bind a skinned mesh — weights is { boneName: Float32Array(vertexCount) }
  bindMesh(mesh, weights) {
    this.bindMeshes.push({ mesh, weights });
    this._applySkinning(mesh, weights);
  }

  _applySkinning(mesh, weights) {
    const geo = mesh.geometry;
    const vertexCount = geo.attributes.position.count;
    const boneNames = Object.keys(weights);
    const boneArray = boneNames.map(n => {
      const b = this.bones.get(n);
      if (!b) throw new Error(`Bone not found: ${n}`);
      return b;
    });

    // Build SkinnedMesh bones array
    const skeletonBones = [];
    const boneInverses = [];
    for (const bone of boneArray) {
      bone.object3D.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(bone.object3D.matrixWorld).invert();
      skeletonBones.push(bone.object3D);
      boneInverses.push(inv);
    }

    // Assign skin indices/weights (up to 4 influences per vertex)
    const skinIndices = new Float32Array(vertexCount * 4);
    const skinWeights = new Float32Array(vertexCount * 4);

    for (let v = 0; v < vertexCount; v++) {
      // Gather all influences for this vertex
      const influences = boneNames.map((n, i) => ({ i, w: weights[n][v] || 0 }))
        .filter(x => x.w > 0)
        .sort((a, b) => b.w - a.w)
        .slice(0, 4);

      const total = influences.reduce((s, x) => s + x.w, 0) || 1;
      for (let k = 0; k < 4; k++) {
        const inf = influences[k];
        skinIndices[v * 4 + k] = inf ? inf.i : 0;
        skinWeights[v * 4 + k] = inf ? inf.w / total : 0;
      }
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    const skeleton = new THREE.Skeleton(skeletonBones, boneInverses);
    const skinnedMesh = new THREE.SkinnedMesh(geo, mesh.material);
    skinnedMesh.name = mesh.name + '_skinned';
    skinnedMesh.add(this.root);
    skinnedMesh.bind(skeleton);
    return skinnedMesh;
  }

  // ── FABRIK IK ─────────────────────────────────────────────────────────────
  solveIK(endBoneName, targetPosition, iterations = 10) {
    const endBone = this.bones.get(endBoneName);
    if (!endBone) return;

    // Collect chain
    const chain = [endBone];
    let cur = endBone;
    for (let i = 0; i < endBone.ikChainLength - 1; i++) {
      if (!cur.parent) break;
      chain.push(cur.parent);
      cur = cur.parent;
    }
    chain.reverse(); // root → end

    const positions = chain.map(b => b.getWorldPosition());
    const lengths = [];
    for (let i = 0; i < chain.length - 1; i++) {
      lengths.push(positions[i].distanceTo(positions[i + 1]));
    }
    const target = targetPosition.clone();

    for (let iter = 0; iter < iterations; iter++) {
      // Forward pass (end → root)
      positions[positions.length - 1].copy(target);
      for (let i = positions.length - 2; i >= 0; i--) {
        const dir = new THREE.Vector3().subVectors(positions[i], positions[i + 1]).normalize();
        positions[i].copy(positions[i + 1]).addScaledVector(dir, lengths[i]);
      }
      // Backward pass (root → end)
      const rootPos = chain[0].getWorldPosition();
      positions[0].copy(rootPos);
      for (let i = 1; i < positions.length; i++) {
        const dir = new THREE.Vector3().subVectors(positions[i], positions[i - 1]).normalize();
        positions[i].copy(positions[i - 1]).addScaledVector(dir, lengths[i - 1]);
      }
    }

    // Apply positions back to bones
    for (let i = 0; i < chain.length - 1; i++) {
      const bone = chain[i];
      const from = positions[i];
      const to = positions[i + 1];
      const dir = new THREE.Vector3().subVectors(to, from).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), dir
      );
      // Convert world quat to local
      const parentQuat = new THREE.Quaternion();
      if (bone.parent) bone.parent.object3D.getWorldQuaternion(parentQuat);
      bone.object3D.quaternion.copy(parentQuat.invert().multiply(quat));
    }
  }

  // ── Pose export ───────────────────────────────────────────────────────────
  exportPose() {
    const pose = {};
    for (const [name, bone] of this.bones) {
      pose[name] = {
        position: bone.object3D.position.toArray(),
        quaternion: bone.object3D.quaternion.toArray(),
        scale: bone.object3D.scale.toArray(),
      };
    }
    return pose;
  }

  applyPose(pose) {
    for (const [name, data] of Object.entries(pose)) {
      const bone = this.bones.get(name);
      if (!bone) continue;
      bone.object3D.position.fromArray(data.position);
      bone.object3D.quaternion.fromArray(data.quaternion);
      bone.object3D.scale.fromArray(data.scale);
    }
  }

  resetPose() {
    for (const bone of this.bones.values()) {
      bone.object3D.position.set(0, 0, 0);
      bone.object3D.quaternion.identity();
      bone.object3D.scale.set(1, 1, 1);
    }
  }

  // Build visual helper for viewport
  buildHelper() {
    if (this._helper) return this._helper;
    const group = new THREE.Group();
    group.name = this.name + '_helper';
    for (const bone of this.bones.values()) {
      const geo = new THREE.ConeGeometry(0.04, bone.length, 4);
      geo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, bone.length / 2, 0));
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ffc8, wireframe: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = bone.name + '_visual';
      bone.object3D.add(mesh);
      // Joint sphere
      const jGeo = new THREE.SphereGeometry(0.06, 6, 6);
      const jMat = new THREE.MeshBasicMaterial({ color: 0xFF6600 });
      bone.object3D.add(new THREE.Mesh(jGeo, jMat));
    }
    this._helper = group;
    return group;
  }
}

// ── Humanoid rig preset ──────────────────────────────────────────────────────
export function buildHumanoidRig(name = 'Humanoid') {
  const arm = new Armature(name);

  // Spine chain
  arm.addBone('root').setPosition(0, 0, 0).setLength(0.1);
  arm.addBone('hips', 'root').setPosition(0, 1.0, 0).setLength(0.15);
  arm.addBone('spine', 'hips').setPosition(0, 0.15, 0).setLength(0.2);
  arm.addBone('chest', 'spine').setPosition(0, 0.2, 0).setLength(0.2);
  arm.addBone('neck', 'chest').setPosition(0, 0.2, 0).setLength(0.12);
  arm.addBone('head', 'neck').setPosition(0, 0.12, 0).setLength(0.2);

  // Left arm
  arm.addBone('shoulder.L', 'chest').setPosition(0.18, 0.18, 0).setLength(0.12);
  arm.addBone('upper_arm.L', 'shoulder.L').setPosition(0.12, 0, 0).setLength(0.28);
  arm.addBone('lower_arm.L', 'upper_arm.L').setPosition(0.28, 0, 0).setLength(0.25);
  arm.addBone('hand.L', 'lower_arm.L').setPosition(0.25, 0, 0).setLength(0.1);

  // Right arm (mirror)
  arm.addBone('shoulder.R', 'chest').setPosition(-0.18, 0.18, 0).setLength(0.12);
  arm.addBone('upper_arm.R', 'shoulder.R').setPosition(-0.12, 0, 0).setLength(0.28);
  arm.addBone('lower_arm.R', 'upper_arm.R').setPosition(-0.28, 0, 0).setLength(0.25);
  arm.addBone('hand.R', 'lower_arm.R').setPosition(-0.25, 0, 0).setLength(0.1);

  // Left leg
  arm.addBone('upper_leg.L', 'hips').setPosition(0.1, -0.1, 0).setLength(0.42);
  arm.addBone('lower_leg.L', 'upper_leg.L').setPosition(0, -0.42, 0).setLength(0.4);
  arm.addBone('foot.L', 'lower_leg.L').setPosition(0, -0.4, 0).setLength(0.15);

  // Right leg
  arm.addBone('upper_leg.R', 'hips').setPosition(-0.1, -0.1, 0).setLength(0.42);
  arm.addBone('lower_leg.R', 'upper_leg.R').setPosition(0, -0.42, 0).setLength(0.4);
  arm.addBone('foot.R', 'lower_leg.R').setPosition(0, -0.4, 0).setLength(0.15);

  // Enable IK on hands and feet
  ['hand.L', 'hand.R', 'foot.L', 'foot.R'].forEach(n => {
    const b = arm.getBone(n);
    b.ikEnabled = true;
    b.ikChainLength = 3;
  });

  return arm;
}

export default RigSystem = { Armature, Bone, buildHumanoidRig };