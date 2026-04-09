import * as THREE from "three";

export const DOPPELFLEX_LANDMARK_MAP = {
  root:          "hips",
  hips:          "hips",
  spine:         "spine",
  spine1:        "spine1",
  spine2:        "spine2",
  neck:          "neck",
  head:          "head",
  leftShoulder:  "shoulder.L",
  leftArm:       "upper_arm.L",
  leftForeArm:   "forearm.L",
  leftHand:      "hand.L",
  rightShoulder: "shoulder.R",
  rightArm:      "upper_arm.R",
  rightForeArm:  "forearm.R",
  rightHand:     "hand.R",
  leftUpLeg:     "thigh.L",
  leftLeg:       "shin.L",
  leftFoot:      "foot.L",
  leftToeBase:   "toe.L",
  rightUpLeg:    "thigh.R",
  rightLeg:      "shin.R",
  rightFoot:     "foot.R",
  rightToeBase:  "toe.R",
};

export const DOPPELFLEX_BONE_HIERARCHY = [
  { name: "hips",         parent: null,           pos: [0,    1.00, 0]    },
  { name: "spine",        parent: "hips",         pos: [0,    1.10, 0]    },
  { name: "spine1",       parent: "spine",        pos: [0,    1.30, 0]    },
  { name: "spine2",       parent: "spine1",       pos: [0,    1.50, 0]    },
  { name: "neck",         parent: "spine2",       pos: [0,    1.65, 0]    },
  { name: "head",         parent: "neck",         pos: [0,    1.75, 0]    },
  { name: "shoulder.L",   parent: "spine2",       pos: [-0.15, 1.55, 0]   },
  { name: "upper_arm.L",  parent: "shoulder.L",   pos: [-0.30, 1.50, 0]   },
  { name: "forearm.L",    parent: "upper_arm.L",  pos: [-0.55, 1.20, 0]   },
  { name: "hand.L",       parent: "forearm.L",    pos: [-0.70, 1.00, 0]   },
  { name: "shoulder.R",   parent: "spine2",       pos: [ 0.15, 1.55, 0]   },
  { name: "upper_arm.R",  parent: "shoulder.R",   pos: [ 0.30, 1.50, 0]   },
  { name: "forearm.R",    parent: "upper_arm.R",  pos: [ 0.55, 1.20, 0]   },
  { name: "hand.R",       parent: "forearm.R",    pos: [ 0.70, 1.00, 0]   },
  { name: "thigh.L",      parent: "hips",         pos: [-0.10, 0.85, 0]   },
  { name: "shin.L",       parent: "thigh.L",      pos: [-0.12, 0.45, 0]   },
  { name: "foot.L",       parent: "shin.L",       pos: [-0.12, 0.08, 0.05]},
  { name: "toe.L",        parent: "foot.L",       pos: [-0.12, 0.02, 0.15]},
  { name: "thigh.R",      parent: "hips",         pos: [ 0.10, 0.85, 0]   },
  { name: "shin.R",       parent: "thigh.R",      pos: [ 0.12, 0.45, 0]   },
  { name: "foot.R",       parent: "shin.R",       pos: [ 0.12, 0.08, 0.05]},
  { name: "toe.R",        parent: "foot.R",       pos: [ 0.12, 0.02, 0.15]},
];

export function buildRigFromDoppelflex(landmarks = {}, opts = {}) {
  const scale = opts.scale || 1.0;
  const bones = DOPPELFLEX_BONE_HIERARCHY.map(b => {
    const lmKey = DOPPELFLEX_LANDMARK_MAP[b.name];
    const lm    = landmarks[lmKey] || landmarks[b.name];
    const pos   = lm
      ? [lm.x * scale, lm.y * scale, lm.z * scale]
      : b.pos.map(v => v * scale);
    return {
      id:       crypto.randomUUID(),
      name:     b.name,
      parent:   b.parent,
      position: pos,
      rotation: [0, 0, 0],
      scale:    [1, 1, 1],
      children: [],
    };
  });
  const boneMap = Object.fromEntries(bones.map(b => [b.name, b]));
  for (const bone of bones) {
    if (bone.parent && boneMap[bone.parent]) boneMap[bone.parent].children.push(bone.name);
  }
  return {
    id:        crypto.randomUUID(),
    name:      opts.name || "DoppelflexRig",
    bones,
    boneMap,
    source:    "doppelflex",
    landmarks: { ...landmarks },
    metadata:  { created: Date.now(), scale },
  };
}

export function applyDoppelflexFrame(armature, frameData = {}) {
  for (const [boneName, transform] of Object.entries(frameData)) {
    const bone = armature.boneMap?.[boneName];
    if (!bone) continue;
    if (transform.position)   bone.position = [...transform.position];
    if (transform.rotation)   bone.rotation = [...transform.rotation];
    if (transform.quaternion) {
      const q = new THREE.Quaternion(...transform.quaternion);
      const e = new THREE.Euler().setFromQuaternion(q);
      bone.rotation = [e.x, e.y, e.z];
    }
  }
  return armature;
}

export function retargetDoppelflexToSPX(frames, spxArmature) {
  return frames.map(frame => {
    const out = {};
    for (const [dname, transform] of Object.entries(frame)) {
      const spxName = DOPPELFLEX_LANDMARK_MAP[dname] || dname;
      if (spxArmature.boneMap?.[spxName]) out[spxName] = { ...transform };
    }
    return out;
  });
}

export function buildThreeSkeletonFromRig(rig) {
  const threeBones = {};
  const boneArray  = [];
  for (const b of rig.bones) {
    const tb = new THREE.Bone();
    tb.name  = b.name;
    tb.position.set(...b.position);
    threeBones[b.name] = tb;
    boneArray.push(tb);
  }
  for (const b of rig.bones) {
    if (b.parent && threeBones[b.parent]) threeBones[b.parent].add(threeBones[b.name]);
  }
  return { skeleton: new THREE.Skeleton(boneArray), bones: threeBones };
}

export function serializeRig(rig) {
  return JSON.stringify({ ...rig, boneMap: undefined }, null, 2);
}

export function deserializeRig(json) {
  try {
    const r = JSON.parse(json);
    r.boneMap = Object.fromEntries(r.bones.map(b => [b.name, b]));
    return r;
  } catch { return buildRigFromDoppelflex(); }
}

export function getRigStats(rig) {
  return { bones: rig.bones?.length || 0, source: rig.source, name: rig.name };
}
