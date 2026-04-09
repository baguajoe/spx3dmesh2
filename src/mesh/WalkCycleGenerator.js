import * as THREE from "three";

// ── Walk cycle styles ─────────────────────────────────────────────────────────
export const WALK_STYLES = {
  normal:   { label: "Normal",    hipSwing:0.15, armSwing:0.3,  bounce:0.05, stepHeight:0.1 },
  military: { label: "Military",  hipSwing:0.05, armSwing:0.1,  bounce:0.02, stepHeight:0.05 },
  casual:   { label: "Casual",    hipSwing:0.2,  armSwing:0.35, bounce:0.08, stepHeight:0.12 },
  sneak:    { label: "Sneak",     hipSwing:0.1,  armSwing:0.15, bounce:0.03, stepHeight:0.15 },
  injured:  { label: "Injured",   hipSwing:0.25, armSwing:0.15, bounce:0.1,  stepHeight:0.05 },
  strut:    { label: "Strut",     hipSwing:0.3,  armSwing:0.4,  bounce:0.12, stepHeight:0.15 },
  zombie:   { label: "Zombie",    hipSwing:0.35, armSwing:0.05, bounce:0.15, stepHeight:0.08 },
};

// ── Generate walk cycle keyframes ─────────────────────────────────────────────
export function generateWalkCycle(armature, options = {}) {
  const {
    style     = "normal",
    speed     = 1.0,
    stride    = 1.0,
    fps       = 24,
    loopFrames = 24,
  } = options;

  const styleParams = WALK_STYLES[style] || WALK_STYLES.normal;
  const bones       = armature?.userData?.bones || [];
  const keys        = {};

  // Find bones by common names
  const findBone = (...names) => bones.find(b => names.some(n =>
    b.name.toLowerCase().includes(n.toLowerCase())
  ));

  const hipBone   = findBone("Root", "Hips", "Hip");
  const spineBone = findBone("Spine", "Chest");
  const lThigh    = findBone("L_Thigh", "LeftUpLeg", "LThigh");
  const rThigh    = findBone("R_Thigh", "RightUpLeg", "RThigh");
  const lShin     = findBone("L_Shin", "LeftLeg", "LShin");
  const rShin     = findBone("R_Shin", "RightLeg", "RShin");
  const lUpperArm = findBone("L_UpperArm", "LeftArm", "LUpperArm");
  const rUpperArm = findBone("R_UpperArm", "RightArm", "RUpperArm");
  const lLowerArm = findBone("L_LowerArm", "LeftForeArm");
  const rLowerArm = findBone("R_LowerArm", "RightForeArm");

  const initKey = (boneId, prop) => {
    if (!keys[boneId]) keys[boneId] = {};
    if (!keys[boneId][prop]) keys[boneId][prop] = {};
  };

  const setKey = (bone, prop, frame, value) => {
    if (!bone) return;
    const id = bone.userData?.boneId || bone.uuid;
    initKey(id, prop);
    keys[id][prop][frame] = value;
  };

  // Generate keyframes over one loop cycle
  for (let f = 0; f <= loopFrames; f++) {
    const t     = (f / loopFrames) * Math.PI * 2;
    const phase = t * speed;

    // Hip bounce and sway
    if (hipBone) {
      setKey(hipBone, "pos.y", f, Math.abs(Math.sin(phase * 2)) * styleParams.bounce);
      setKey(hipBone, "rot.z", f, Math.sin(phase) * styleParams.hipSwing * stride);
    }

    // Spine counter-rotation
    if (spineBone) {
      setKey(spineBone, "rot.z", f, -Math.sin(phase) * styleParams.hipSwing * 0.5);
      setKey(spineBone, "rot.x", f, Math.sin(phase * 2) * 0.02);
    }

    // Left leg
    if (lThigh) setKey(lThigh, "rot.x", f, Math.sin(phase) * 0.4 * stride);
    if (lShin)  setKey(lShin,  "rot.x", f, Math.max(0, -Math.sin(phase)) * 0.4 * styleParams.stepHeight * 10);

    // Right leg (opposite phase)
    if (rThigh) setKey(rThigh, "rot.x", f, -Math.sin(phase) * 0.4 * stride);
    if (rShin)  setKey(rShin,  "rot.x", f, Math.max(0, Math.sin(phase)) * 0.4 * styleParams.stepHeight * 10);

    // Left arm (opposite to left leg)
    if (lUpperArm) setKey(lUpperArm, "rot.x", f, -Math.sin(phase) * styleParams.armSwing);
    if (lLowerArm) setKey(lLowerArm, "rot.x", f, Math.max(0, -Math.sin(phase)) * styleParams.armSwing * 0.3);

    // Right arm (opposite to right leg)
    if (rUpperArm) setKey(rUpperArm, "rot.x", f, Math.sin(phase) * styleParams.armSwing);
    if (rLowerArm) setKey(rLowerArm, "rot.x", f, Math.max(0, Math.sin(phase)) * styleParams.armSwing * 0.3);
  }

  return { keys, loopFrames, style, speed, stride };
}

// ── Apply walk cycle at frame ─────────────────────────────────────────────────
export function applyWalkCycleFrame(walkData, armature, frame) {
  const { keys, loopFrames } = walkData;
  const localFrame = frame % loopFrames;
  const bones      = armature?.userData?.bones || [];

  bones.forEach(bone => {
    const id      = bone.userData?.boneId || bone.uuid;
    const channel = keys[id];
    if (!channel) return;

    Object.entries(channel).forEach(([prop, keyframes]) => {
      const frames = Object.keys(keyframes).map(Number).sort((a,b)=>a-b);
      if (!frames.length) return;

      // Linear interpolation
      let value = keyframes[frames[frames.length-1]];
      for (let i = 0; i < frames.length-1; i++) {
        if (localFrame >= frames[i] && localFrame <= frames[i+1]) {
          const t = (localFrame-frames[i])/(frames[i+1]-frames[i]);
          value = keyframes[frames[i]] + (keyframes[frames[i+1]]-keyframes[frames[i]])*t;
          break;
        }
      }

      switch (prop) {
        case "pos.x": bone.position.x = value; break;
        case "pos.y": bone.position.y = value; break;
        case "pos.z": bone.position.z = value; break;
        case "rot.x": bone.rotation.x = value; break;
        case "rot.y": bone.rotation.y = value; break;
        case "rot.z": bone.rotation.z = value; break;
      }
    });
  });
}

// ── Generate idle cycle ───────────────────────────────────────────────────────
export function generateIdleCycle(armature, options = {}) {
  const { fps=24, loopFrames=48, breathingSpeed=1.0, fidget=true } = options;
  const bones = armature?.userData?.bones || [];
  const keys  = {};

  const findBone = (...names) => bones.find(b => names.some(n =>
    b.name.toLowerCase().includes(n.toLowerCase())
  ));

  const spineBone = findBone("Spine", "Chest");
  const headBone  = findBone("Head");
  const lArm      = findBone("L_UpperArm", "LeftArm");
  const rArm      = findBone("R_UpperArm", "RightArm");

  const setKey = (bone, prop, frame, value) => {
    if (!bone) return;
    const id = bone.userData?.boneId || bone.uuid;
    if (!keys[id]) keys[id] = {};
    if (!keys[id][prop]) keys[id][prop] = {};
    keys[id][prop][frame] = value;
  };

  for (let f = 0; f <= loopFrames; f++) {
    const t = (f / loopFrames) * Math.PI * 2 * breathingSpeed;

    // Breathing
    if (spineBone) {
      setKey(spineBone, "rot.x", f, Math.sin(t) * 0.02);
      setKey(spineBone, "pos.y", f, Math.sin(t) * 0.01);
    }

    // Head subtle sway
    if (headBone) {
      setKey(headBone, "rot.y", f, Math.sin(t * 0.5) * 0.03);
      setKey(headBone, "rot.z", f, Math.cos(t * 0.3) * 0.02);
    }

    // Arm micro-movement
    if (fidget) {
      if (lArm) setKey(lArm, "rot.z", f, Math.sin(t * 0.7) * 0.02);
      if (rArm) setKey(rArm, "rot.z", f, -Math.sin(t * 0.7) * 0.02);
    }
  }

  return { keys, loopFrames, type: "idle" };
}

// ── Generate breathing cycle ──────────────────────────────────────────────────
export function generateBreathingCycle(armature, { speed=1.0, loopFrames=60 } = {}) {
  return generateIdleCycle(armature, { loopFrames, breathingSpeed: speed, fidget: false });
}
