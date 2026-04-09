/**
 * WalkCycleGenerator.js — SPX Mesh Editor
 * Procedural walk cycle generator for biped/quadruped rigs. Outputs BVH data and per-frame bone rotations.
 */
import * as THREE from 'three';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)   => a + (b - a) * t;
const rand  = (lo, hi)    => lo + Math.random() * (hi - lo);
const TWO_PI = Math.PI * 2;


const DEG = Math.PI / 180;

function sinW(t, phase, amp, freq = 1) {
  return Math.sin((t * freq + phase) * Math.PI * 2) * amp;
}

const BIPED_JOINTS = [
  'Hips','Spine','Spine1','Spine2','Neck','Head',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
  'RightShoulder','RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
  'RightUpLeg','RightLeg','RightFoot','RightToeBase',
];

export class WalkCycleGenerator {
  constructor(opts = {}) {
    this.frameRate    = opts.frameRate    ?? 30;
    this.duration     = opts.duration     ?? 1.0;
    this.stepHeight   = opts.stepHeight   ?? 0.12;
    this.stepLen      = opts.stepLen      ?? 0.50;
    this.armSwing     = opts.armSwing     ?? 0.30;
    this.hipSway      = opts.hipSway      ?? 0.04;
    this.bounciness   = opts.bounciness   ?? 0.03;
    this.speed        = opts.speed        ?? 1.0;
    this.style        = opts.style        ?? 'Normal';
    this.quadruped    = opts.quadruped    ?? false;
  }

  _hipPos(t) {
    return {
      x: sinW(t, 0, this.hipSway, 2),
      y: 0.95 + Math.abs(sinW(t, 0, this.bounciness, 2)),
      z: 0,
    };
  }

  _footPos(t, side) {
    const phase = side === 'L' ? 0 : 0.5;
    const lift  = Math.max(0, sinW(t, phase, 1, 1));
    return {
      x: side === 'L' ? -0.10 : 0.10,
      y: lift * this.stepHeight,
      z: sinW(t, phase, this.stepLen * 0.5, 1),
    };
  }

  _spineRot(t) {
    return {
      x: sinW(t, 0.12, 2.5),
      y: sinW(t, 0,    3.0),
      z: sinW(t, 0,    1.5) * 0.5,
    };
  }

  _armRot(t, side) {
    const phase = side === 'L' ? 0.5 : 0.0;
    const swing = this.armSwing * 60;
    return {
      x: sinW(t, phase, swing),
      y: sinW(t, phase, swing * 0.15),
      z: side === 'L' ? -6 : 6,
    };
  }

  _kneeAngle(t, side) {
    const phase = side === 'L' ? 0 : 0.5;
    return Math.max(0, sinW(t, phase + 0.25, 25, 1));
  }

  _hipRot(t, side) {
    const phase = side === 'L' ? 0 : 0.5;
    return {
      x: sinW(t, phase, 18, 1),
      y: sinW(t, 0,      5, 2) * (side === 'L' ? -1 : 1),
      z: 0,
    };
  }

  generateFrames() {
    const frames = Math.round(this.frameRate * this.duration);
    return Array.from({ length: frames }, (_, f) => {
      const t = (f / frames) * this.speed;
      return {
        frame:  f,
        t,
        hip:    this._hipPos(t),
        footL:  this._footPos(t, 'L'),
        footR:  this._footPos(t, 'R'),
        spine:  this._spineRot(t),
        armL:   this._armRot(t, 'L'),
        armR:   this._armRot(t, 'R'),
        kneeL:  this._kneeAngle(t, 'L'),
        kneeR:  this._kneeAngle(t, 'R'),
        hipRotL: this._hipRot(t, 'L'),
        hipRotR: this._hipRot(t, 'R'),
      };
    });
  }

  toBVH() {
    const frames = this.generateFrames();
    const fps    = this.frameRate;
    let bvh  = `HIERARCHY\nROOT Hips\n{\n  OFFSET 0.0 95.0 0.0\n`;
    bvh += `  CHANNELS 6 Xposition Yposition Zposition Xrotation Yrotation Zrotation\n`;
    bvh += `  JOINT Spine\n  {\n    OFFSET 0.0 10.0 0.0\n    CHANNELS 3 Xrotation Yrotation Zrotation\n`;
    bvh += `    JOINT LeftArm\n    {\n      OFFSET -15.0 0.0 0.0\n      CHANNELS 3 Xrotation Yrotation Zrotation\n      End Site\n      { OFFSET 0.0 -25.0 0.0 }\n    }\n`;
    bvh += `    JOINT RightArm\n    {\n      OFFSET 15.0 0.0 0.0\n      CHANNELS 3 Xrotation Yrotation Zrotation\n      End Site\n      { OFFSET 0.0 -25.0 0.0 }\n    }\n`;
    bvh += `  }\n  JOINT LeftUpLeg\n  {\n    OFFSET -9.0 0.0 0.0\n    CHANNELS 3 Xrotation Yrotation Zrotation\n    End Site\n    { OFFSET 0.0 -40.0 0.0 }\n  }\n`;
    bvh += `  JOINT RightUpLeg\n  {\n    OFFSET 9.0 0.0 0.0\n    CHANNELS 3 Xrotation Yrotation Zrotation\n    End Site\n    { OFFSET 0.0 -40.0 0.0 }\n  }\n}\n`;
    bvh += `MOTION\nFrames: ${frames.length}\nFrame Time: ${(1 / fps).toFixed(6)}\n`;
    frames.forEach(fr => {
      const h = fr.hip, s = fr.spine;
      const la = fr.armL, ra = fr.armR;
      const ll = fr.hipRotL, rl = fr.hipRotR;
      bvh += [
        (h.x * 100).toFixed(4), (h.y * 100).toFixed(4), (h.z * 100).toFixed(4),
        s.x.toFixed(4), s.y.toFixed(4), s.z.toFixed(4),
        la.x.toFixed(4), la.y.toFixed(4), la.z.toFixed(4),
        ra.x.toFixed(4), ra.y.toFixed(4), ra.z.toFixed(4),
        ll.x.toFixed(4), ll.y.toFixed(4), ll.z.toFixed(4),
        rl.x.toFixed(4), rl.y.toFixed(4), rl.z.toFixed(4),
      ].join(' ') + '\n';
    });
    return bvh;
  }

  applyToSkeleton(skeleton, t) {
    if (!skeleton?.bones) return;
    const spine = this._spineRot(t);
    const armL  = this._armRot(t, 'L');
    const armR  = this._armRot(t, 'R');
    skeleton.bones.forEach(bone => {
      if (bone.name.includes('Spine')) {
        bone.rotation.x = spine.x * DEG;
        bone.rotation.y = spine.y * DEG;
      }
      if (bone.name.includes('LeftArm') || (bone.name.includes('Left') && bone.name.includes('Arm')))
        bone.rotation.x = armL.x * DEG;
      if (bone.name.includes('RightArm') || (bone.name.includes('Right') && bone.name.includes('Arm')))
        bone.rotation.x = armR.x * DEG;
    });
  }

  setStyle(style) {
    this.style = style;
    switch (style) {
      case 'Sneak':   this.stepHeight = 0.04; this.hipSway = 0.02; this.bounciness = 0.01; this.armSwing = 0.15; break;
      case 'Jog':     this.stepHeight = 0.20; this.armSwing = 0.50; this.bounciness = 0.07; this.duration = 0.55; break;
      case 'Run':     this.stepHeight = 0.28; this.armSwing = 0.65; this.bounciness = 0.10; this.duration = 0.40; break;
      case 'March':   this.stepHeight = 0.18; this.armSwing = 0.40; this.hipSway = 0.02; break;
      case 'Limp':    this.stepHeight = 0.06; this.hipSway = 0.09; this.armSwing = 0.10; break;
      case 'Strafe':  this.armSwing   = 0.08; this.hipSway = 0.08; break;
      case 'Crouch':  this.stepHeight = 0.06; this.bounciness = 0.015; this.armSwing = 0.2; break;
      default:        this.stepHeight = 0.12; this.armSwing = 0.30; this.bounciness = 0.03; this.duration = 1.0;
    }
    return this;
  }

  toJSON() {
    return { frameRate: this.frameRate, duration: this.duration, stepHeight: this.stepHeight,
      stepLen: this.stepLen, armSwing: this.armSwing, hipSway: this.hipSway,
      bounciness: this.bounciness, speed: this.speed, style: this.style };
  }
}

export default WalkCycleGenerator;
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
//
//
//
// ──────────────────────────────────────────────────────────────────────────
//
//
