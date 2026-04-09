/**
 * FaceGenerator.js — SPX Mesh Editor
 * Procedural face mesh with morphable skull, nose, eyes, lips, and blendshape targets.
 */
import * as THREE from 'three';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)   => a + (b - a) * t;
const rand  = (lo, hi)    => lo + Math.random() * (hi - lo);
const TWO_PI = Math.PI * 2;


const MORPH_TARGETS = ['jawOpen','mouthSmile','mouthFrown','eyeBlink_L','eyeBlink_R',
  'browUp_L','browUp_R','browDown_L','browDown_R','cheekPuff_L','cheekPuff_R',
  'noseSneer_L','noseSneer_R','tongueOut','surprise','anger','disgust','fear','contempt'];

export class FaceGenerator {
  constructor(opts = {}) {
    this.seed      = opts.seed      ?? Math.random() * 9999 | 0;
    this.polyLevel = opts.polyLevel ?? 'High';
    this.opts      = opts;
    this._rng      = this._mkRng(this.seed);
  }

  _mkRng(s) { let n = s; return () => { n = (n * 9301 + 49297) % 233280; return n / 233280; }; }
  _rn(lo, hi) { return lo + this._rng() * (hi - lo); }

  _polyCount() {
    return { 'Low (800)': 800, 'Mid (3.2K)': 3200, 'High (12K)': 12000, 'Ultra (48K)': 48000 }[this.polyLevel] ?? 12000;
  }

  buildSkull(params = {}) {
    const { foreheadH = 0.5, jawWidth = 0.5, cheekbone = 0.5, chinPoint = 0.5, faceLen = 0.5 } = params;
    const segs = Math.round(Math.sqrt(this._polyCount() / 2));
    const geo  = new THREE.SphereGeometry(1, Math.min(segs, 48), Math.min(segs, 32));
    const pos  = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      // Jaw narrowing
      if (y < -0.2) {
        const t = clamp((-y - 0.2) / 0.8, 0, 1);
        pos.setX(i, x * lerp(1, jawWidth * 0.7, t));
        pos.setZ(i, z * lerp(1, 0.7, t));
      }
      // Chin projection
      if (y < -0.7) pos.setY(i, y * (1 + chinPoint * 0.25));
      // Forehead expansion
      if (y > 0.5)  pos.setY(i, y * (1 + foreheadH * 0.12));
      // Cheekbone
      if (Math.abs(y) < 0.25 && Math.abs(x) > 0.5) pos.setX(i, x * (1 + cheekbone * 0.18));
      // Face length
      pos.setY(i, pos.getY(i) * (0.85 + faceLen * 0.3));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  buildNose(params = {}) {
    const { noseBridge = 0.5, noseW = 0.5, nostrilFlare = 0.4, noseLen = 0.5, noseTip = 0.5 } = params;
    const pts = [
      new THREE.Vector3(0, 0.22, 0.78),
      new THREE.Vector3(0, 0.12, 0.92 + noseBridge * 0.06),
      new THREE.Vector3(0, 0.02, 0.96 + noseBridge * 0.04),
      new THREE.Vector3(0, -0.08, 0.88 + noseTip * 0.04),
      new THREE.Vector3(0, -0.18, 0.80 + nostrilFlare * 0.04),
    ];
    const r = lerp(0.055, 0.09, noseW);
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, r, 8, false);
  }

  buildEye(params = {}, side = 1) {
    const { eyeSize = 0.5, eyeSpacing = 0.5, eyeDepth = 0.4, irisColor = '#3a7acc' } = params;
    const g    = new THREE.Group();
    const xOff = (0.28 + eyeSpacing * 0.08) * side;
    const yOff = 0.10;
    const zOff = 0.72 + eyeDepth * 0.05;
    const r    = 0.10 + eyeSize * 0.03;
    // Eyeball
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12),
      new THREE.MeshPhysicalMaterial({ color: 0xf5f0e8, roughness: 0.1 }));
    ball.position.set(xOff, yOff, zOff);
    // Iris
    const iris = new THREE.Mesh(new THREE.CircleGeometry(r * 0.55, 20),
      new THREE.MeshPhysicalMaterial({ color: new THREE.Color(irisColor) }));
    iris.position.set(xOff, yOff, zOff + r * 0.98);
    // Pupil
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(r * 0.28, 16),
      new THREE.MeshPhysicalMaterial({ color: 0x080808 }));
    pupil.position.set(xOff, yOff, zOff + r * 0.99);
    g.add(ball, iris, pupil);
    return g;
  }

  buildLips(params = {}) {
    const { lipThick = 0.5, lipWidth = 0.5, mouthAngle = 0, lipColor = '#c06070' } = params;
    const w  = 0.16 + lipWidth * 0.06;
    const mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(lipColor), roughness: 0.5 });
    const upper = new THREE.Mesh(new THREE.TorusGeometry(w, 0.03 + lipThick * 0.02, 6, 16, Math.PI), mat);
    upper.position.set(0, -0.22, 0.80);
    upper.rotation.x = -0.3 + mouthAngle * 0.5;
    const lower = new THREE.Mesh(new THREE.TorusGeometry(w * 0.9, 0.035 + lipThick * 0.025, 6, 16, Math.PI), mat);
    lower.position.set(0, -0.27, 0.79);
    lower.rotation.x = 0.3 - mouthAngle * 0.5;
    return { upper, lower };
  }

  buildMorphTargets(baseGeo) {
    return MORPH_TARGETS.map(name => ({
      name,
      data: new Float32Array(baseGeo.attributes.position.array.length),
    }));
  }

  generate(params = {}) {
    const skull  = this.buildSkull(params);
    const nose   = this.buildNose(params);
    const eyeL   = this.buildEye(params, -1);
    const eyeR   = this.buildEye(params,  1);
    const { upper, lower } = this.buildLips(params);
    const morphs = this.buildMorphTargets(skull);
    const group  = new THREE.Group();
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(params.skinTone ?? '#c8906a'), roughness: 0.6, metalness: 0,
    });
    group.add(new THREE.Mesh(skull, skinMat));
    group.add(new THREE.Mesh(nose,  skinMat));
    group.add(upper, lower, eyeL, eyeR);
    group.userData.morphTargets = morphs;
    group.userData.params = params;
    return group;
  }

  toJSON() {
    return { seed: this.seed, polyLevel: this.polyLevel, opts: this.opts };
  }
}

export default FaceGenerator;
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
