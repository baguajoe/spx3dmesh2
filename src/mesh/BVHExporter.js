import * as THREE from "three";

// ── BVH Exporter ─────────────────────────────────────────────────────────────
// Exports a recorded animation as a valid .bvh file
// Compatible with: Blender, iClone, Maya, MotionBuilder, Unreal, Unity, Rokoko
//
// Usage:
//   const bvh = exportBVH(skeleton, recordedFrames, frameTime);
//   downloadBVH(bvh, "my_animation.bvh");

// ── Standard Mixamo/humanoid bone order ───────────────────────────────────────
// If no skeleton available, use this default hierarchy
const DEFAULT_HIERARCHY = [
  { name: "Hips",           parent: null,           channels: ["Xposition","Yposition","Zposition","Zrotation","Xrotation","Yrotation"] },
  { name: "Spine",          parent: "Hips",          channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "Spine1",         parent: "Spine",         channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "Spine2",         parent: "Spine1",        channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "Neck",           parent: "Spine2",        channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "Head",           parent: "Neck",          channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "LeftShoulder",   parent: "Spine2",        channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "LeftArm",        parent: "LeftShoulder",  channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "LeftForeArm",    parent: "LeftArm",       channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "LeftHand",       parent: "LeftForeArm",   channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "RightShoulder",  parent: "Spine2",        channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "RightArm",       parent: "RightShoulder", channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "RightForeArm",   parent: "RightArm",      channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "RightHand",      parent: "RightForeArm",  channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "LeftUpLeg",      parent: "Hips",          channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "LeftLeg",        parent: "LeftUpLeg",     channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "LeftFoot",       parent: "LeftLeg",       channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "LeftToeBase",    parent: "LeftFoot",      channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "RightUpLeg",     parent: "Hips",          channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "RightLeg",       parent: "RightUpLeg",    channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "RightFoot",      parent: "RightLeg",      channels: ["Zrotation","Xrotation","Yrotation"] },
  { name: "RightToeBase",   parent: "RightFoot",     channels: ["Zrotation","Xrotation","Yrotation"] },
];

// Standard T-pose offsets (centimeters, Mixamo scale)
const DEFAULT_OFFSETS = {
  Hips:           [0,     95,    0   ],
  Spine:          [0,     10.5,  0   ],
  Spine1:         [0,     10.5,  0   ],
  Spine2:         [0,     10.5,  0   ],
  Neck:           [0,     11,    0   ],
  Head:           [0,     10,    0   ],
  LeftShoulder:   [5,     8,     0   ],
  LeftArm:        [15,    0,     0   ],
  LeftForeArm:    [28,    0,     0   ],
  LeftHand:       [27,    0,     0   ],
  RightShoulder:  [-5,    8,     0   ],
  RightArm:       [-15,   0,     0   ],
  RightForeArm:   [-28,   0,     0   ],
  RightHand:      [-27,   0,     0   ],
  LeftUpLeg:      [9,     0,     0   ],
  LeftLeg:        [0,    -42,    0   ],
  LeftFoot:       [0,    -40,    0   ],
  LeftToeBase:    [0,     -5,    10  ],
  RightUpLeg:     [-9,    0,     0   ],
  RightLeg:       [0,    -42,    0   ],
  RightFoot:      [0,    -40,    0   ],
  RightToeBase:   [0,     -5,    10  ],
};

// End site offsets
const END_SITE_OFFSETS = {
  Head:         [0,   10,  0 ],
  LeftHand:     [15,  0,   0 ],
  RightHand:    [-15, 0,   0 ],
  LeftToeBase:  [0,   0,   15],
  RightToeBase: [0,   0,   15],
};

// ── Build joint hierarchy from Three.js skeleton ──────────────────────────────
export function buildJointsFromSkeleton(skeleton) {
  if (!skeleton?.bones?.length) return DEFAULT_HIERARCHY.map(j => ({
    ...j,
    offset: DEFAULT_OFFSETS[j.name] || [0, 0, 0],
  }));

  const joints = [];
  const seen   = new Set();

  const traverse = (bone, parentName) => {
    if (seen.has(bone.name)) return;
    seen.add(bone.name);

    const isRoot = !parentName;
    joints.push({
      name:     bone.name,
      parent:   parentName || null,
      channels: isRoot
        ? ["Xposition","Yposition","Zposition","Zrotation","Xrotation","Yrotation"]
        : ["Zrotation","Xrotation","Yrotation"],
      offset: [
        bone.position.x * 100,  // convert to cm
        bone.position.y * 100,
        bone.position.z * 100,
      ],
    });

    bone.children.forEach(child => {
      if (child.isBone) traverse(child, bone.name);
    });
  };

  // Find root bone
  const root = skeleton.bones.find(b => {
    const name = b.name.toLowerCase();
    return name.includes("hip") || name.includes("root") || name.includes("pelvis");
  }) || skeleton.bones[0];

  if (root) traverse(root, null);
  return joints;
}

// ── Sample bone rotations at current pose ─────────────────────────────────────
export function sampleBoneRotations(skeleton, joints) {
  const frameValues = [];

  joints.forEach(joint => {
    const bone = skeleton?.bones?.find(b => b.name === joint.name);

    if (joint.channels.includes("Xposition")) {
      // Root — position + rotation
      if (bone) {
        frameValues.push(bone.position.x * 100); // cm
        frameValues.push(bone.position.y * 100);
        frameValues.push(bone.position.z * 100);
      } else {
        frameValues.push(0, 95, 0); // default hip height
      }
    }

    // Rotation channels (always ZXY order in BVH)
    const euler = bone
      ? new THREE.Euler().setFromQuaternion(bone.quaternion, "ZXY")
      : new THREE.Euler(0, 0, 0, "ZXY");

    joint.channels.forEach(ch => {
      switch (ch) {
        case "Zrotation": frameValues.push(THREE.MathUtils.radToDeg(euler.z)); break;
        case "Xrotation": frameValues.push(THREE.MathUtils.radToDeg(euler.x)); break;
        case "Yrotation": frameValues.push(THREE.MathUtils.radToDeg(euler.y)); break;
      }
    });
  });

  return frameValues;
}

// ── Write BVH hierarchy block ─────────────────────────────────────────────────
function writeHierarchy(joints) {
  const lines = ["HIERARCHY"];

  const writeJoint = (joint, depth) => {
    const indent = "\t".repeat(depth);
    const isRoot = !joint.parent;
    const keyword = isRoot ? "ROOT" : "JOINT";

    lines.push(`${indent}${keyword} ${joint.name}`);
    lines.push(`${indent}{`);

    const offset = joint.offset || DEFAULT_OFFSETS[joint.name] || [0, 0, 0];
    lines.push(`${indent}\tOFFSET ${offset[0].toFixed(6)} ${offset[1].toFixed(6)} ${offset[2].toFixed(6)}`);
    lines.push(`${indent}\tCHANNELS ${joint.channels.length} ${joint.channels.join(" ")}`);

    // Write children
    const children = joints.filter(j => j.parent === joint.name);
    if (children.length === 0) {
      // End site
      const endOffset = END_SITE_OFFSETS[joint.name] || [0, 5, 0];
      lines.push(`${indent}\tEnd Site`);
      lines.push(`${indent}\t{`);
      lines.push(`${indent}\t\tOFFSET ${endOffset[0].toFixed(6)} ${endOffset[1].toFixed(6)} ${endOffset[2].toFixed(6)}`);
      lines.push(`${indent}\t}`);
    } else {
      children.forEach(child => writeJoint(child, depth + 1));
    }

    lines.push(`${indent}}`);
  };

  // Start from root
  const root = joints.find(j => !j.parent);
  if (root) writeJoint(root, 0);

  return lines.join("\n");
}

// ── Write BVH motion block ────────────────────────────────────────────────────
function writeMotion(frames, frameTime) {
  const lines = [
    "MOTION",
    `Frames: ${frames.length}`,
    `Frame Time: ${frameTime.toFixed(6)}`,
  ];

  frames.forEach(frame => {
    lines.push(frame.map(v => v.toFixed(6)).join(" "));
  });

  return lines.join("\n");
}

// ── Main export function ──────────────────────────────────────────────────────
export function exportBVH(skeleton, recordedFrames, frameTime = 1/30) {
  // Build joint list from skeleton or use default
  const joints = buildJointsFromSkeleton(skeleton);

  // Convert recorded frames to BVH frame data
  // recordedFrames: array of { pos, rot, bones: Map<boneName, quaternion> }
  const bvhFrames = recordedFrames.map(frame => {
    if (frame.bones && frame.bones instanceof Map) {
      // Full bone data recorded — use it
      return sampleFrameFromBoneData(joints, frame);
    } else {
      // Only root pos/rot — generate T-pose for all other bones
      return sampleFrameFromRootOnly(joints, frame);
    }
  });

  const hierarchy = writeHierarchy(joints);
  const motion    = writeMotion(bvhFrames, frameTime);

  return hierarchy + "\n" + motion;
}

function sampleFrameFromBoneData(joints, frame) {
  const values = [];
  joints.forEach(joint => {
    if (joint.channels.includes("Xposition")) {
      const pos = frame.pos || [0, 0.95, 0];
      values.push(pos[0] * 100, pos[1] * 100, pos[2] * 100);
    }
    const quat = frame.bones?.get(joint.name) || new THREE.Quaternion();
    const euler = new THREE.Euler().setFromQuaternion(quat, "ZXY");
    joint.channels.forEach(ch => {
      switch (ch) {
        case "Zrotation": values.push(THREE.MathUtils.radToDeg(euler.z)); break;
        case "Xrotation": values.push(THREE.MathUtils.radToDeg(euler.x)); break;
        case "Yrotation": values.push(THREE.MathUtils.radToDeg(euler.y)); break;
      }
    });
  });
  return values;
}

function sampleFrameFromRootOnly(joints, frame) {
  const values = [];
  const pos = frame.pos?.toArray?.() || frame.pos || [0, 0.95, 0];
  const rotArr = frame.rot instanceof THREE.Euler
    ? [frame.rot.x, frame.rot.y, frame.rot.z]
    : frame.rot || [0, 0, 0];

  joints.forEach(joint => {
    if (joint.channels.includes("Xposition")) {
      values.push(pos[0] * 100, pos[1] * 100, pos[2] * 100);
    }
    joint.channels.forEach(ch => {
      switch (ch) {
        case "Zrotation": values.push(joint.name === "Hips" ? THREE.MathUtils.radToDeg(rotArr[2] || 0) : 0); break;
        case "Xrotation": values.push(joint.name === "Hips" ? THREE.MathUtils.radToDeg(rotArr[0] || 0) : 0); break;
        case "Yrotation": values.push(joint.name === "Hips" ? THREE.MathUtils.radToDeg(rotArr[1] || 0) : 0); break;
      }
    });
  });
  return values;
}

// ── Download .bvh file ────────────────────────────────────────────────────────
export function downloadBVH(bvhString, filename = "spx_animation.bvh") {
  const blob = new Blob([bvhString], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Record a full bone frame from live skeleton ───────────────────────────────
// Call this every frame while recording, pass result to recordedFrames array
export function captureSkeletonFrame(skeleton, rootMesh, frameIndex, time) {
  const boneData = new Map();

  if (skeleton?.bones) {
    skeleton.bones.forEach(bone => {
      boneData.set(bone.name, bone.quaternion.clone());
    });
  }

  // Also traverse mesh for bones on skinned meshes
  if (rootMesh) {
    rootMesh.traverse(child => {
      if (child.isBone) {
        boneData.set(child.name, child.quaternion.clone());
      }
      if (child.isSkinnedMesh && child.skeleton) {
        child.skeleton.bones.forEach(bone => {
          boneData.set(bone.name, bone.quaternion.clone());
        });
      }
    });
  }

  return {
    frame: frameIndex,
    time,
    pos:   rootMesh?.position.clone() || new THREE.Vector3(0, 0.95, 0),
    rot:   rootMesh?.rotation.clone() || new THREE.Euler(),
    bones: boneData,
  };
}

// ── Get BVH stats ─────────────────────────────────────────────────────────────
export function getBVHStats(bvhString) {
  const lines      = bvhString.split("\n");
  const jointLines = lines.filter(l => l.trim().startsWith("JOINT") || l.trim().startsWith("ROOT"));
  const frameLine  = lines.find(l => l.trim().startsWith("Frames:"));
  const timeLine   = lines.find(l => l.trim().startsWith("Frame Time:"));
  const frames     = frameLine ? parseInt(frameLine.split(":")[1]) : 0;
  const frameTime  = timeLine  ? parseFloat(timeLine.split(":")[1]) : 1/30;
  return {
    joints:    jointLines.length,
    frames,
    duration:  (frames * frameTime).toFixed(2) + "s",
    frameTime: frameTime.toFixed(4),
    fps:       Math.round(1 / frameTime),
    size:      (bvhString.length / 1024).toFixed(1) + " KB",
  };
}
