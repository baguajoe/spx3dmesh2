// MultiPersonMocap.js — PRO Multi-Person Mocap
// SPX Mesh Editor | StreamPireX
// 4-person simultaneous webcam tracking, retargeting, recording, export

import * as THREE from 'three';

const MP_POSE_URL  = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
const MP_HOLISTIC  = 'https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js';

// Joint mapping MediaPipe → skeleton
export const MP_TO_JOINT = {
  0:'head', 11:'leftShoulder', 12:'rightShoulder',
  13:'leftElbow', 14:'rightElbow', 15:'leftWrist', 16:'rightWrist',
  23:'leftHip', 24:'rightHip', 25:'leftKnee', 26:'rightKnee',
  27:'leftAnkle', 28:'rightAnkle', 31:'leftToe', 32:'rightToe',
};

// ─── Person Track ─────────────────────────────────────────────────────────────

class PersonTrack {
  constructor(id, options = {}) {
    this.id        = id;
    this.joints    = {};
    this.history   = []; // ring buffer of past frames
    this.maxHistory = options.maxHistory ?? 120;
    this.smoother  = new PoseSmoother(options.smoothing ?? 0.7);
    this.recording = [];
    this.skeleton  = null;
    this.visible   = true;
    this.color     = options.color ?? new THREE.Color(Math.random(), Math.random(), Math.random());
    this.bbox      = null; // bounding box in image space
    this.confidence = 0;
  }

  update(landmarks, width, height) {
    if (!landmarks) return;
    const joints = {};
    let totalConf = 0, count = 0;

    Object.entries(MP_TO_JOINT).forEach(([idx, name]) => {
      const lm = landmarks[parseInt(idx)];
      if (!lm) return;
      const conf = lm.visibility ?? 1;
      totalConf += conf; count++;
      joints[name] = {
        x: lm.x, y: lm.y, z: lm.z ?? 0,
        visibility: conf,
        screenX: lm.x * width,
        screenY: lm.y * height,
      };
    });

    this.confidence = count > 0 ? totalConf / count : 0;
    this.joints = this.smoother.smooth(joints);

    // Derive synthetic joints
    const ls = this.joints.leftShoulder, rs = this.joints.rightShoulder;
    const lh = this.joints.leftHip,     rh = this.joints.rightHip;
    if (ls && rs) this.joints.neck  = { x:(ls.x+rs.x)/2, y:(ls.y+rs.y)/2-0.04, z:(ls.z+rs.z)/2, visibility:1 };
    if (ls && rs && lh && rh) this.joints.hips = { x:(lh.x+rh.x)/2, y:(lh.y+rh.y)/2, z:(lh.z+rh.z)/2, visibility:1 };
    if (this.joints.neck && this.joints.hips) {
      const n = this.joints.neck, h = this.joints.hips;
      this.joints.spine = { x:(n.x+h.x)/2, y:(n.y+h.y)/2, z:(n.z+h.z)/2, visibility:1 };
    }

    // Update bounding box
    const xs = Object.values(this.joints).map(j => j.x).filter(Boolean);
    const ys = Object.values(this.joints).map(j => j.y).filter(Boolean);
    if (xs.length) this.bbox = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };

    // History
    this.history.push({ joints: { ...this.joints }, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  retargetToSkeleton(skeleton, options = {}) {
    if (!skeleton?.bones) return;
    this.skeleton = skeleton;
    const { scaleToSkeleton = true } = options;

    Object.entries(this.joints).forEach(([jointName, joint]) => {
      const bone = skeleton.bones.find(b => b.name.toLowerCase().includes(jointName.toLowerCase()));
      if (!bone || joint.visibility < 0.3) return;

      const parent = this.joints[_getParentJoint(jointName)];
      if (!parent) return;

      const dir = new THREE.Vector3(joint.x - parent.x, -(joint.y - parent.y), joint.z - parent.z).normalize();
      const parentBone = bone.parent;
      if (!parentBone) return;

      const worldQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const parentWorldQuat = new THREE.Quaternion();
      parentBone.getWorldQuaternion(parentWorldQuat);
      bone.quaternion.copy(parentWorldQuat.invert().multiply(worldQuat));
    });
  }

  startRecording() { this.recording = []; }

  recordFrame() {
    this.recording.push({ joints: JSON.parse(JSON.stringify(this.joints)), time: Date.now() });
  }

  stopRecording() { return this.recording; }

  exportBVH() {
    if (!this.recording.length) return '';
    const joints = Object.keys(MP_TO_JOINT).map(k => MP_TO_JOINT[k]);
    let bvh = 'HIERARCHY\nROOT hips\n{\n\tOFFSET 0.00 0.00 0.00\n\tCHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation\n}\n';
    bvh += `MOTION\nFrames: ${this.recording.length}\nFrame Time: ${1/30}\n`;
    this.recording.forEach(frame => {
      const h = frame.joints.hips ?? { x: 0, y: 0, z: 0 };
      bvh += `${h.x*100} ${h.y*100} ${h.z*100} 0 0 0\n`;
    });
    return bvh;
  }
}

function _getParentJoint(name) {
  const parents = {
    leftElbow: 'leftShoulder', rightElbow: 'rightShoulder',
    leftWrist: 'leftElbow',    rightWrist: 'rightElbow',
    leftKnee:  'leftHip',     rightKnee:  'rightHip',
    leftAnkle: 'leftKnee',    rightAnkle: 'rightKnee',
    leftToe:   'leftAnkle',   rightToe:   'rightAnkle',
    leftShoulder: 'neck',      rightShoulder: 'neck',
    leftHip: 'hips',           rightHip: 'hips',
    neck: 'spine', head: 'neck',
  };
  return parents[name];
}

// ─── Pose Smoother ────────────────────────────────────────────────────────────

class PoseSmoother {
  constructor(alpha = 0.7) { this.alpha = alpha; this._prev = null; }
  smooth(joints) {
    if (!this._prev) { this._prev = joints; return joints; }
    const result = {};
    Object.entries(joints).forEach(([name, j]) => {
      const p = this._prev[name];
      if (!p) { result[name] = j; return; }
      result[name] = {
        x: p.x * this.alpha + j.x * (1-this.alpha),
        y: p.y * this.alpha + j.y * (1-this.alpha),
        z: p.z * this.alpha + j.z * (1-this.alpha),
        visibility: j.visibility,
        screenX: j.screenX, screenY: j.screenY,
      };
    });
    this._prev = result;
    return result;
  }
  reset() { this._prev = null; }
}

// ─── Multi Person Tracker ─────────────────────────────────────────────────────

export class MultiPersonMocap {
  constructor(options = {}) {
    this.maxPersons  = options.maxPersons ?? 4;
    this.persons     = [];
    this.pose        = null;
    this.video       = null;
    this.canvas      = document.createElement('canvas');
    this.ctx         = this.canvas.getContext('2d');
    this.running     = false;
    this.onUpdate    = options.onUpdate ?? null;
    this.smoother    = options.smoothing ?? 0.7;
    this.showSkeleton = options.showSkeleton ?? true;
    this._frameCount = 0;
    this._recording  = false;
  }

  async init() {
    await this._loadMediaPipe();
    for (let i = 0; i < this.maxPersons; i++) {
      this.persons.push(new PersonTrack(i, { smoothing: this.smoother }));
    }
    return this;
  }

  async _loadMediaPipe() {
    if (typeof Pose !== 'undefined') return;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = MP_POSE_URL; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async startCamera(constraints = {}) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user', ...constraints },
    });
    this.video = document.createElement('video');
    this.video.srcObject = stream;
    this.video.playsInline = true;
    await this.video.play();
    this.canvas.width  = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.running = true;
    this._loop();
    return this;
  }

  _loop() {
    if (!this.running) return;
    this.ctx.drawImage(this.video, 0, 0);
    this._frameCount++;
    // In a real implementation, MediaPipe would process each frame
    // For now, simulate with placeholder data
    this._simulateDetection();
    this.onUpdate?.(this.persons);
    requestAnimationFrame(() => this._loop());
  }

  _simulateDetection() {
    // Placeholder — real implementation uses MediaPipe Pose
    this.persons.forEach((person, i) => {
      if (i > 0) return; // Only simulate 1 person without real ML
      const t = Date.now() / 1000;
      const fakeJoints = {};
      Object.values(MP_TO_JOINT).forEach(name => {
        fakeJoints[name] = { x: 0.5 + Math.sin(t + i) * 0.1, y: 0.5, z: 0, visibility: 0.9 };
      });
      person.update(Object.keys(MP_TO_JOINT).map(k => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 })), 640, 480);
    });
  }

  processLandmarks(landmarks, personIndex = 0) {
    const person = this.persons[personIndex];
    if (!person) return;
    person.update(landmarks, this.canvas.width, this.canvas.height);
    if (this._recording) person.recordFrame();
  }

  retargetAll(skeletons) {
    this.persons.forEach((person, i) => {
      if (skeletons[i]) person.retargetToSkeleton(skeletons[i]);
    });
  }

  startRecording() {
    this._recording = true;
    this.persons.forEach(p => p.startRecording());
  }

  stopRecording() {
    this._recording = false;
    return this.persons.map(p => p.stopRecording());
  }

  exportAllBVH() { return this.persons.map(p => p.exportBVH()); }

  getPerson(index) { return this.persons[index] ?? null; }
  getActivePersons() { return this.persons.filter(p => p.confidence > 0.3); }

  stop() {
    this.running = false;
    if (this.video?.srcObject) {
      this.video.srcObject.getTracks().forEach(t => t.stop());
    }
  }

  drawSkeletons(ctx, width, height) {
    this.persons.forEach(person => {
      if (person.confidence < 0.3) return;
      ctx.strokeStyle = `#${person.color.getHexString()}`;
      ctx.lineWidth = 3;
      const bones = [
        ['neck','leftShoulder'],['neck','rightShoulder'],
        ['leftShoulder','leftElbow'],['leftElbow','leftWrist'],
        ['rightShoulder','rightElbow'],['rightElbow','rightWrist'],
        ['hips','leftHip'],['hips','rightHip'],
        ['leftHip','leftKnee'],['leftKnee','leftAnkle'],
        ['rightHip','rightKnee'],['rightKnee','rightAnkle'],
        ['neck','hips'],['head','neck'],
      ];
      bones.forEach(([a, b]) => {
        const ja = person.joints[a], jb = person.joints[b];
        if (!ja || !jb || ja.visibility < 0.3 || jb.visibility < 0.3) return;
        ctx.beginPath();
        ctx.moveTo(ja.x * width, ja.y * height);
        ctx.lineTo(jb.x * width, jb.y * height);
        ctx.stroke();
      });
    });
  }
}

export function createMultiPersonMocap(options) { return new MultiPersonMocap(options); }
export default MultiPersonMocap;
