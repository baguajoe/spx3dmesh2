import * as THREE from "three";

// ── Parse BVH file ────────────────────────────────────────────────────────────
export function parseBVH(text) {
  const lines   = text.split("\n").map(l => l.trim()).filter(Boolean);
  const joints  = [];
  const stack   = [];
  let   i       = 0;
  let   current = null;
  let   frameCount = 0;
  let   frameTime  = 1/30;
  const frames  = [];

  // Parse hierarchy
  while (i < lines.length) {
    const line = lines[i++];
    if (line.startsWith("ROOT") || line.startsWith("JOINT")) {
      const name   = line.split(/\s+/)[1];
      const joint  = { name, channels: [], offset: [0,0,0], children: [], parent: current?.name || null };
      if (current) current.children.push(joint);
      stack.push(joint);
      joints.push(joint);
      current = joint;
    } else if (line === "End Site") {
      i++; // skip {
      const offsetLine = lines[i++];
      i++; // skip }
    } else if (line.startsWith("OFFSET")) {
      const [, x, y, z] = line.split(/\s+/);
      if (current) current.offset = [parseFloat(x), parseFloat(y), parseFloat(z)];
    } else if (line.startsWith("CHANNELS")) {
      const parts = line.split(/\s+/);
      const count = parseInt(parts[1]);
      if (current) current.channels = parts.slice(2, 2 + count);
    } else if (line === "}") {
      stack.pop();
      current = stack[stack.length - 1] || null;
    } else if (line === "MOTION") {
      // Parse motion data
      i++; // Frames: N
      const framesLine = lines[i-1+1] || "";
      frameCount = parseInt((lines[i] || "").split(/\s+/)[1] || "0");
      i++;
      frameTime  = parseFloat((lines[i] || "").split(/\s+/)[2] || "0.033");
      i++;
      while (i < lines.length) {
        const values = lines[i++].split(/\s+/).map(parseFloat).filter(v => !isNaN(v));
        if (values.length) frames.push(values);
      }
      break;
    }
  }

  return { joints, frames, frameCount: frames.length, frameTime };
}

// ── Build THREE skeleton from BVH joints ──────────────────────────────────────
export function buildSkeletonFromBVH(bvh) {
  const bones   = [];
  const boneMap = {};

  bvh.joints.forEach(joint => {
    const bone = new THREE.Bone();
    bone.name  = joint.name;
    bone.position.set(...joint.offset);
    bone.userData.channels = joint.channels;
    bone.userData.bvhJoint = joint;
    bones.push(bone);
    boneMap[joint.name] = bone;
  });

  // Parent bones
  bvh.joints.forEach(joint => {
    if (joint.parent && boneMap[joint.parent]) {
      boneMap[joint.parent].add(boneMap[joint.name]);
    }
  });

  const rootBone = bones.find(b => !bvh.joints.find(j => j.name === b.name)?.parent);
  const skeleton = new THREE.Skeleton(bones);
  return { skeleton, bones, rootBone, boneMap };
}

// ── Apply BVH frame to skeleton ───────────────────────────────────────────────
export function applyBVHFrame(bvh, skeleton, frameIndex) {
  if (frameIndex >= bvh.frames.length) return;
  const values = bvh.frames[frameIndex];
  let   offset = 0;

  bvh.joints.forEach(joint => {
    const bone = skeleton.bones.find(b => b.name === joint.name);
    if (!bone) { offset += joint.channels.length; return; }

    joint.channels.forEach(ch => {
      const val = values[offset++] || 0;
      const rad = THREE.MathUtils.degToRad(val);
      switch (ch) {
        case "Xposition": bone.position.x = val * 0.01; break;
        case "Yposition": bone.position.y = val * 0.01; break;
        case "Zposition": bone.position.z = val * 0.01; break;
        case "Xrotation": bone.rotation.x = rad; break;
        case "Yrotation": bone.rotation.y = rad; break;
        case "Zrotation": bone.rotation.z = rad; break;
      }
    });
  });
}

// ── Build AnimationClip from BVH ─────────────────────────────────────────────
export function buildAnimationClip(bvh, skeleton, name = "BVH_Anim") {
  const tracks = [];
  const fps    = 1 / bvh.frameTime;

  skeleton.bones.forEach(bone => {
    const joint = bvh.joints.find(j => j.name === bone.name);
    if (!joint) return;

    const times  = bvh.frames.map((_, i) => i / fps);
    const posX=[], posY=[], posZ=[], rotX=[], rotY=[], rotZ=[], rotW=[];

    bvh.frames.forEach(frame => {
      let off = bvh.joints.slice(0, bvh.joints.indexOf(joint))
                          .reduce((s, j) => s + j.channels.length, 0);
      const euler = new THREE.Euler();
      joint.channels.forEach(ch => {
        const val = frame[off++] || 0;
        switch (ch) {
          case "Xrotation": euler.x = THREE.MathUtils.degToRad(val); break;
          case "Yrotation": euler.y = THREE.MathUtils.degToRad(val); break;
          case "Zrotation": euler.z = THREE.MathUtils.degToRad(val); break;
        }
      });
      const q = new THREE.Quaternion().setFromEuler(euler);
      rotX.push(q.x); rotY.push(q.y); rotZ.push(q.z); rotW.push(q.w);
    });

    tracks.push(new THREE.QuaternionKeyframeTrack(
      bone.name + ".quaternion",
      times,
      [...rotX,...rotY,...rotZ,...rotW].length > 0
        ? flatInterleave(rotX, rotY, rotZ, rotW)
        : [0,0,0,1],
    ));
  });

  return new THREE.AnimationClip(name, bvh.frames.length / fps, tracks);
}

function flatInterleave(x, y, z, w) {
  const out = new Float32Array(x.length * 4);
  for (let i = 0; i < x.length; i++) {
    out[i*4]   = x[i]; out[i*4+1] = y[i];
    out[i*4+2] = z[i]; out[i*4+3] = w[i];
  }
  return out;
}
