/**
 * SPXPerformance.js
 * Full mocap pipeline — import, retarget, clean, blend, sequence, export
 * Wired to: BVHImporter, MocapRetarget, AnimationUpgrade, PoseMode, AIAnimationAssistant
 */

import * as THREE from "three";
import { parseBVH, buildSkeletonFromBVH } from "./BVHImporter.js";
import {
  DEFAULT_BONE_MAP,
  retargetFrame,
} from "./MocapRetarget.js";
import {
  createIKFKBlend,
  updateIKFKBlend,
  createSplineIK,
  solveSplineIK,
} from "./AnimationUpgrade.js";
import {
  enterPoseMode,
  exitPoseMode,
  capturePose,
  applyPose,
  resetToRestPose,
} from "./PoseMode.js";
import {
  smoothKeyframes,
  lockFootContacts,
  removeOutliers,
  cleanMocapCapture,
  analyzeAnimationClip,
  askAnimationAssistant,
  deductAICredit,
} from "./AIAnimationAssistant.js";

// ── Clip Library ──────────────────────────────────────────────────────────────

/**
 * Create a new performance session
 */
export function createPerformanceSession(name = "Untitled Performance") {
  return {
    id: `perf_${Date.now()}`,
    name,
    createdAt: Date.now(),
    clips: [],           // { id, name, bvh, frames, frameTime, duration, startFrame, endFrame, trackOffset, blendIn, blendOut }
    characters: [],      // { id, name, armature, boneMap }
    activeClipId: null,
    activeCharId: null,
    currentFrame: 0,
    totalFrames: 0,
    fps: 30,
    playing: false,
    loop: false,
    speed: 1.0,
  };
}

/**
 * Import a BVH file and add it to the clip library
 * @param {PerformanceSession} session
 * @param {string} bvhText - raw BVH file content
 * @param {string} name - clip name
 */
export function importBVHClip(session, bvhText, name) {
  const bvh = parseBVH(bvhText);
  if (!bvh || !bvh.frames.length) {
    throw new Error("Invalid BVH file — no motion data found");
  }
  const clip = {
    id: `clip_${Date.now()}`,
    name: name || `Clip_${session.clips.length + 1}`,
    bvh,
    frames: bvh.frames,
    frameTime: bvh.frameTime,
    duration: bvh.frames.length * bvh.frameTime,
    startFrame: 0,
    endFrame: bvh.frames.length - 1,
    trackOffset: session.totalFrames,
    blendIn: 0,
    blendOut: 0,
    cleaned: false,
    analysisResult: null,
  };
  session.clips.push(clip);
  session.totalFrames = Math.max(
    session.totalFrames,
    clip.trackOffset + clip.frames.length
  );
  session.activeClipId = clip.id;
  return clip;
}

/**
 * Import MediaPipe live capture data as a clip
 * @param {PerformanceSession} session
 * @param {Array} poseFrames - array of MediaPipe pose landmark frames
 * @param {string} name
 */
export function importMediaPipeClip(session, poseFrames, name) {
  // Convert MediaPipe landmarks to BVH-compatible bone keyframes
  const boneFrames = poseFrames.map((frame, i) => {
    const lm = frame.poseLandmarks || frame;
    return {
      frame: i,
      // Map MediaPipe landmark indices to SPX bone names
      Hips:          lm[23] ? { x: lm[23].x, y: lm[23].y, z: lm[23].z } : null,
      LeftUpLeg:     lm[23] ? { x: lm[23].x, y: lm[23].y, z: lm[23].z } : null,
      RightUpLeg:    lm[24] ? { x: lm[24].x, y: lm[24].y, z: lm[24].z } : null,
      LeftLeg:       lm[25] ? { x: lm[25].x, y: lm[25].y, z: lm[25].z } : null,
      RightLeg:      lm[26] ? { x: lm[26].x, y: lm[26].y, z: lm[26].z } : null,
      LeftFoot:      lm[27] ? { x: lm[27].x, y: lm[27].y, z: lm[27].z } : null,
      RightFoot:     lm[28] ? { x: lm[28].x, y: lm[28].y, z: lm[28].z } : null,
      LeftArm:       lm[11] ? { x: lm[11].x, y: lm[11].y, z: lm[11].z } : null,
      RightArm:      lm[12] ? { x: lm[12].x, y: lm[12].y, z: lm[12].z } : null,
      LeftForeArm:   lm[13] ? { x: lm[13].x, y: lm[13].y, z: lm[13].z } : null,
      RightForeArm:  lm[14] ? { x: lm[14].x, y: lm[14].y, z: lm[14].z } : null,
      LeftHand:      lm[15] ? { x: lm[15].x, y: lm[15].y, z: lm[15].z } : null,
      RightHand:     lm[16] ? { x: lm[16].x, y: lm[16].y, z: lm[16].z } : null,
      Head:          lm[0]  ? { x: lm[0].x,  y: lm[0].y,  z: lm[0].z  } : null,
    };
  });

  const clip = {
    id: `clip_mp_${Date.now()}`,
    name: name || `LiveCapture_${session.clips.length + 1}`,
    source: "mediapipe",
    boneFrames,
    frames: boneFrames,
    frameTime: 1 / 30,
    duration: boneFrames.length / 30,
    startFrame: 0,
    endFrame: boneFrames.length - 1,
    trackOffset: session.totalFrames,
    blendIn: 0,
    blendOut: 0,
    cleaned: false,
  };
  session.clips.push(clip);
  session.totalFrames += boneFrames.length;
  session.activeClipId = clip.id;
  return clip;
}

/**
 * Remove a clip from the session
 */
export function removeClip(session, clipId) {
  session.clips = session.clips.filter(c => c.id !== clipId);
  if (session.activeClipId === clipId) {
    session.activeClipId = session.clips[0]?.id || null;
  }
  recalcTotalFrames(session);
}

/**
 * Rename a clip
 */
export function renameClip(session, clipId, newName) {
  const clip = session.clips.find(c => c.id === clipId);
  if (clip) clip.name = newName;
}

// ── Character Setup ───────────────────────────────────────────────────────────

/**
 * Register a character armature with the session
 * @param {PerformanceSession} session
 * @param {THREE.Object3D} armature - rigged character armature
 * @param {string} name
 * @param {Object} boneMap - custom bone map, defaults to DEFAULT_BONE_MAP
 */
export function addCharacter(session, armature, name, boneMap = DEFAULT_BONE_MAP) {
  const char = {
    id: `char_${Date.now()}`,
    name: name || `Character_${session.characters.length + 1}`,
    armature,
    boneMap,
    restPose: capturePose(armature),
    ikfkBlend: null,
  };
  session.characters.push(char);
  session.activeCharId = char.id;
  enterPoseMode(armature);
  return char;
}

/**
 * Remove a character from the session
 */
export function removeCharacter(session, charId) {
  const char = session.characters.find(c => c.id === charId);
  if (char) exitPoseMode(char.armature);
  session.characters = session.characters.filter(c => c.id !== charId);
  if (session.activeCharId === charId) {
    session.activeCharId = session.characters[0]?.id || null;
  }
}

/**
 * Auto-map bones from BVH joint names to SPX rig
 * Returns a bone map with any unmapped bones flagged
 */
export function autoMapBones(bvh, armature, customMap = {}) {
  const map = { ...DEFAULT_BONE_MAP, ...customMap };
  const bvhBones = bvh.joints.map(j => j.name);
  const armBones = armature.userData.bones?.map(b => b.name) || [];
  const unmapped = bvhBones.filter(b => !map[b]);
  const missing = Object.values(map).filter(b => !armBones.includes(b));
  return { map, unmapped, missing, coverage: ((bvhBones.length - unmapped.length) / bvhBones.length * 100).toFixed(1) };
}

/**
 * Reset active character to rest pose
 */
export function resetCharacterPose(session) {
  const char = session.characters.find(c => c.id === session.activeCharId);
  if (!char) return;
  resetToRestPose(char.armature);
}

// ── Clip Editing ──────────────────────────────────────────────────────────────

/**
 * Trim clip in/out points
 */
export function trimClip(clip, startFrame, endFrame) {
  clip.startFrame = Math.max(0, startFrame);
  clip.endFrame   = Math.min(clip.frames.length - 1, endFrame);
}

/**
 * Set blend in/out frames for crossfading between clips
 */
export function setClipBlend(clip, blendIn, blendOut) {
  clip.blendIn  = Math.max(0, blendIn);
  clip.blendOut = Math.max(0, blendOut);
}

/**
 * Move a clip's position on the timeline
 */
export function moveClipOnTimeline(session, clipId, newOffset) {
  const clip = session.clips.find(c => c.id === clipId);
  if (!clip) return;
  clip.trackOffset = Math.max(0, newOffset);
  recalcTotalFrames(session);
}

/**
 * Duplicate a clip
 */
export function duplicateClip(session, clipId) {
  const src = session.clips.find(c => c.id === clipId);
  if (!src) return null;
  const dupe = {
    ...src,
    id: `clip_${Date.now()}`,
    name: `${src.name}_copy`,
    trackOffset: session.totalFrames,
  };
  session.clips.push(dupe);
  recalcTotalFrames(session);
  return dupe;
}

/**
 * Blend two clips together at a transition point
 * Returns blended frame data for the overlap region
 */
export function blendClips(clipA, clipB, blendFrames = 10) {
  const blended = [];
  for (let i = 0; i < blendFrames; i++) {
    const t = i / blendFrames;
    const frameA = clipA.frames[clipA.endFrame - blendFrames + i] || {};
    const frameB = clipB.frames[clipB.startFrame + i] || {};
    // Linear interpolation between frame values
    const blendedFrame = frameA.map
      ? frameA.map((v, idx) => v * (1 - t) + (frameB[idx] || v) * t)
      : frameA;
    blended.push(blendedFrame);
  }
  return blended;
}

// ── Cleanup Pipeline ──────────────────────────────────────────────────────────

/**
 * Run full cleanup on a clip — jitter removal, outlier filtering, foot locking
 */
export function cleanClip(clip, options = {}) {
  if (clip.source === "mediapipe") {
    // Clean MediaPipe bone frames
    const bones = {};
    const boneNames = Object.keys(clip.frames[0] || {}).filter(k => k !== "frame");
    boneNames.forEach(bone => {
      const kfs = clip.frames
        .map((f, i) => f[bone] ? { frame: i, ...f[bone] } : null)
        .filter(Boolean);
      bones[bone] = kfs;
    });
    const cleaned = cleanMocapCapture({ bones }, options);
    // Write cleaned data back
    boneNames.forEach(bone => {
      cleaned.bones[bone]?.forEach(kf => {
        if (clip.frames[kf.frame]) {
          clip.frames[kf.frame][bone] = { x: kf.x, y: kf.y, z: kf.z };
        }
      });
    });
  } else {
    // BVH cleanup — smooth the raw frame values
    if (clip.frames.length > 2) {
      const win = options.smoothWindow || 5;
      const half = Math.floor(win / 2);
      clip.frames = clip.frames.map((frame, i) => {
        const start = Math.max(0, i - half);
        const end   = Math.min(clip.frames.length - 1, i + half);
        const window = clip.frames.slice(start, end + 1);
        return frame.map((v, ch) => window.reduce((s, f) => s + (f[ch] || 0), 0) / window.length);
      });
    }
  }
  clip.cleaned = true;
  return clip;
}

/**
 * Analyze a clip and return quality report
 */
export async function analyzeClip(clip) {
  // Build bone structure for analysis
  const bones = {};
  if (clip.source === "mediapipe") {
    const boneNames = Object.keys(clip.frames[0] || {}).filter(k => k !== "frame");
    boneNames.forEach(bone => {
      bones[bone] = clip.frames
        .map((f, i) => f[bone] ? { frame: i, ...f[bone] } : null)
        .filter(Boolean);
    });
  } else {
    bones["RawData"] = clip.frames.map((f, i) => ({
      frame: i,
      x: f[0] || 0,
      y: f[1] || 0,
      z: f[2] || 0,
    }));
  }
  return await analyzeAnimationClip({ bones });
}

// ── Retargeting ───────────────────────────────────────────────────────────────

/**
 * Apply a clip frame to a character's armature
 */
export function applyClipFrameToCharacter(session, clipId, charId, frameIndex) {
  const clip = session.clips.find(c => c.id === clipId);
  const char = session.characters.find(c => c.id === charId);
  if (!clip || !char) return;

  if (clip.bvh) {
    retargetFrame(clip.bvh, char.boneMap, char.armature, frameIndex);
  } else if (clip.source === "mediapipe" && clip.frames[frameIndex]) {
    const frame = clip.frames[frameIndex];
    char.armature.userData.bones?.forEach(bone => {
      const bvhName = Object.entries(char.boneMap).find(([, spx]) => spx === bone.name)?.[0];
      if (bvhName && frame[bvhName]) {
        bone.position.set(frame[bvhName].x, frame[bvhName].y, frame[bvhName].z);
      }
    });
  }
}

/**
 * Retarget entire clip to a character and bake keyframes
 */
export function retargetClipToCharacter(session, clipId, charId) {
  const clip = session.clips.find(c => c.id === clipId);
  const char = session.characters.find(c => c.id === charId);
  if (!clip || !char || !clip.bvh) return null;

  const bakedFrames = [];
  for (let i = clip.startFrame; i <= clip.endFrame; i++) {
    retargetFrame(clip.bvh, char.boneMap, char.armature, i);
    const pose = capturePose(char.armature);
    bakedFrames.push(pose);
  }
  return bakedFrames;
}

// ── Playback ──────────────────────────────────────────────────────────────────

/**
 * Advance session by one frame — call from requestAnimationFrame loop
 */
export function tickPerformance(session) {
  if (!session.playing) return;

  session.currentFrame += session.speed;

  if (session.currentFrame >= session.totalFrames) {
    if (session.loop) {
      session.currentFrame = 0;
    } else {
      session.currentFrame = session.totalFrames - 1;
      session.playing = false;
      return;
    }
  }

  // Find which clips are active at current frame and apply them
  const activeChar = session.characters.find(c => c.id === session.activeCharId);
  if (!activeChar) return;

  session.clips.forEach(clip => {
    const localFrame = Math.floor(session.currentFrame) - clip.trackOffset;
    if (localFrame >= clip.startFrame && localFrame <= clip.endFrame) {
      applyClipFrameToCharacter(session, clip.id, activeChar.id, localFrame);
    }
  });
}

export function playSession(session)  { session.playing = true; }
export function pauseSession(session) { session.playing = false; }
export function stopSession(session)  { session.playing = false; session.currentFrame = 0; }
export function seekSession(session, frame) { session.currentFrame = Math.max(0, Math.min(frame, session.totalFrames - 1)); }
export function setPlaybackSpeed(session, speed) { session.speed = speed; }
export function setLoop(session, loop) { session.loop = loop; }

// ── IK/FK blend ───────────────────────────────────────────────────────────────

/**
 * Set IK/FK blend on active character's limb chain
 */
export function setCharacterIKFK(session, charId, chain, blendValue) {
  const char = session.characters.find(c => c.id === charId);
  if (!char) return;
  if (!char.ikfkBlend) {
    char.ikfkBlend = createIKFKBlend(chain);
  }
  char.ikfkBlend.blend = Math.max(0, Math.min(1, blendValue));
  updateIKFKBlend(char.ikfkBlend);
}

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Export session as BVH file
 */
export function exportSessionAsBVH(session, clipId) {
  const clip = session.clips.find(c => c.id === clipId);
  if (!clip || !clip.bvh) throw new Error("No BVH data to export");

  const { joints, frameTime } = clip.bvh;
  const frames = clip.frames.slice(clip.startFrame, clip.endFrame + 1);

  let out = "HIERARCHY\n";
  // Write hierarchy
  function writeJoint(joint, depth) {
    const indent = "  ".repeat(depth);
    out += `${indent}${depth === 0 ? "ROOT" : "JOINT"} ${joint.name}\n`;
    out += `${indent}{\n`;
    out += `${indent}  OFFSET ${joint.offset.join(" ")}\n`;
    out += `${indent}  CHANNELS ${joint.channels.length} ${joint.channels.join(" ")}\n`;
    joint.children?.forEach(child => writeJoint(child, depth + 1));
    out += `${indent}}\n`;
  }
  if (joints[0]) writeJoint(joints[0], 0);

  out += "MOTION\n";
  out += `Frames: ${frames.length}\n`;
  out += `Frame Time: ${frameTime.toFixed(6)}\n`;
  frames.forEach(frame => { out += frame.join(" ") + "\n"; });

  return out;
}

/**
 * Export session as GLB animation clip
 * Returns AnimationClip ready for THREE.GLTFExporter
 */
export function exportSessionAsGLBClip(session, clipId, charId) {
  const clip = session.clips.find(c => c.id === clipId);
  const char = session.characters.find(c => c.id === charId);
  if (!clip || !char) return null;

  const bakedFrames = retargetClipToCharacter(session, clipId, charId);
  if (!bakedFrames) return null;

  const tracks = [];
  const bones = char.armature.userData.bones || [];

  bones.forEach(bone => {
    const times = bakedFrames.map((_, i) => i * clip.frameTime);
    const rotValues = [];
    bakedFrames.forEach(pose => {
      const p = pose[bone.userData.boneId];
      if (p) {
        const q = new THREE.Quaternion().setFromEuler(p.rotation);
        rotValues.push(q.x, q.y, q.z, q.w);
      } else {
        rotValues.push(0, 0, 0, 1);
      }
    });
    tracks.push(new THREE.QuaternionKeyframeTrack(
      `${bone.name}.quaternion`,
      times,
      rotValues
    ));
  });

  return new THREE.AnimationClip(
    clip.name,
    bakedFrames.length * clip.frameTime,
    tracks
  );
}

/**
 * Save session to JSON (for R2 / local storage)
 */
export function serializeSession(session) {
  return JSON.stringify({
    id: session.id,
    name: session.name,
    fps: session.fps,
    totalFrames: session.totalFrames,
    clips: session.clips.map(c => ({
      id: c.id,
      name: c.name,
      source: c.source || "bvh",
      startFrame: c.startFrame,
      endFrame: c.endFrame,
      trackOffset: c.trackOffset,
      blendIn: c.blendIn,
      blendOut: c.blendOut,
      frameTime: c.frameTime,
      duration: c.duration,
      cleaned: c.cleaned,
      frameCount: c.frames?.length || 0,
    })),
    characters: session.characters.map(c => ({
      id: c.id,
      name: c.name,
      boneMap: c.boneMap,
    })),
  });
}

/**
 * Download BVH export as file
 */
export function downloadBVH(bvhText, filename = "spx_performance.bvh") {
  const blob = new Blob([bvhText], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download session JSON as file
 */
export function downloadSessionJSON(session) {
  const blob = new Blob([serializeSession(session)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${session.name.replace(/\s+/g, "_")}.spxperf`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Send to StreamPireX — wires to /api/performance/save
 */
export async function sendToStreamPireX(session, userId) {
  await deductAICredit(userId, "performance_save");
  if (window.SPX_API) {
    return await window.SPX_API.post("/api/performance/save", {
      userId,
      session: serializeSession(session),
    });
  }
  console.log("[SPX Performance] StreamPireX not connected — running standalone");
  return { ok: true, message: "Saved locally (StreamPireX integration pending)" };
}

// ── AI Assistant ──────────────────────────────────────────────────────────────

/**
 * Ask AI to analyze and improve the active clip
 */
export async function getAIAnimationAdvice(session, userPrompt, userId) {
  await deductAICredit(userId, "ai_animation_advice");
  const activeClip = session.clips.find(c => c.id === session.activeClipId);
  const context = {
    clipName: activeClip?.name,
    frameCount: activeClip?.frames?.length,
    duration: activeClip?.duration,
    cleaned: activeClip?.cleaned,
    characters: session.characters.map(c => c.name),
    currentFrame: session.currentFrame,
  };
  return await askAnimationAssistant(userPrompt, context);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function recalcTotalFrames(session) {
  session.totalFrames = session.clips.reduce((max, c) => {
    return Math.max(max, c.trackOffset + (c.frames?.length || 0));
  }, 0);
}
