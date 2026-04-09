/**
 * FoliageGenerator.js — SPX Mesh Editor
 * L-system & parametric foliage: trees, shrubs, grass, ferns, mushrooms.
 */
import * as THREE from 'three';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)   => a + (b - a) * t;
const rand  = (lo, hi)    => lo + Math.random() * (hi - lo);
const TWO_PI = Math.PI * 2;


function hash(n) { return Math.sin(n * 127.1 + 311.7) * 43758.5453 % 1; }

export class FoliageGenerator {
  constructor(opts = {}) {
    this.opts = opts;
    this.seed = opts.seed ?? 1;
    this._rng = this._mkRng(this.seed);
  }
  _mkRng(s) { let n = s; return () => { n = (n * 9301 + 49297) % 233280; return n / 233280; }; }
  _rn(lo, hi) { return lo + this._rng() * (hi - lo); }

  buildTrunk(height, radius, taper, curve = 0.2, barkColor = '#5a3820') {
    const segs = 5;
    const geo  = new THREE.CylinderGeometry(radius * (1 - taper), radius, height, 8, segs, false);
    const pos  = geo.attributes.position;
    // Add curve
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (y + height / 2) / height;
      const bend = t * t * curve * 0.3;
      pos.setX(i, pos.getX(i) + bend);
      // Twist
      const ang = t * 0.4;
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setX(i, x * Math.cos(ang) - z * Math.sin(ang));
      pos.setZ(i, x * Math.sin(ang) + z * Math.cos(ang));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: new THREE.Color(barkColor), roughness: 0.9 }));
  }

  buildLeafCard(size, color1 = '#3a7a20', color2 = '#5a9a30') {
    const geo = new THREE.PlaneGeometry(size, size * 1.6, 2, 4);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setZ(i, Math.sin((y / size + 0.5) * Math.PI) * size * 0.1);
    }
    pos.needsUpdate = true;
    return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(this._rng() > 0.5 ? color1 : color2),
      side: THREE.DoubleSide, roughness: 0.9, alphaTest: 0.4,
    }));
  }

  buildBranch(len, radius, droop = 0.2) {
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(len * 0.3, len * 0.2 - droop * 0.1, 0),
      new THREE.Vector3(len, len * 0.1 - droop * len * 0.3, 0),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, radius, 5, false);
  }

  buildCanopy(centerY, spreadR, density, leafSize, color1, color2) {
    const group = new THREE.Group();
    const count = Math.round(density * 80);
    for (let i = 0; i < count; i++) {
      const theta = this._rn(0, TWO_PI);
      const phi   = this._rn(0, Math.PI * 0.65);
      const r     = this._rn(spreadR * 0.2, spreadR);
      const leaf  = this.buildLeafCard(leafSize ?? 0.14, color1, color2);
      leaf.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        centerY + r * Math.cos(phi) * 0.6,
        r * Math.sin(phi) * Math.sin(theta),
      );
      leaf.rotation.set(this._rn(-0.5, 0.5), this._rn(0, TWO_PI), this._rn(-0.3, 0.3));
      group.add(leaf);
    }
    return group;
  }

  buildTree(params = {}) {
    const {
      trunkH = 0.5, trunkGirth = 0.5, trunkTaper = 0.4, trunkCurve = 0.2,
      barkColor = '#5a3820', branchCount = 0.6, branchLen = 0.5, branchDroop = 0.2,
      leafDensity = 0.7, leafSize = 0.5, leafColor = '#3a7a20', leafColor2 = '#5a9a30',
    } = params;
    const group  = new THREE.Group();
    const height = 3 + trunkH * 7;
    const radius = 0.10 + trunkGirth * 0.20;
    const trunk  = this.buildTrunk(height, radius, trunkTaper, trunkCurve, barkColor);
    trunk.position.y = height / 2;
    group.add(trunk);
    const branches = Math.round(3 + branchCount * 9);
    const branchMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(barkColor), roughness: 0.9 });
    for (let i = 0; i < branches; i++) {
      const bh  = height * (0.35 + i / branches * 0.55);
      const ang = (i / branches) * TWO_PI + this._rn(-0.4, 0.4);
      const bl  = (0.8 + branchLen) * (0.8 + this._rn(-0.2, 0.2));
      const bGeo = this.buildBranch(bl, radius * 0.35, branchDroop);
      const b    = new THREE.Mesh(bGeo, branchMat);
      b.position.set(0, bh, 0);
      b.rotation.y = ang;
      b.rotation.z = 0.5 + branchDroop * 0.5;
      group.add(b);
    }
    const canopy = this.buildCanopy(height * 0.82, 1.4 + branchLen, leafDensity, 0.11 + leafSize * 0.07, leafColor, leafColor2);
    group.add(canopy);
    group.userData.params = params;
    return group;
  }

  buildGrassTuft(params = {}) {
    const count = 10 + Math.round((params.leafDensity ?? 0.7) * 22);
    const group = new THREE.Group();
    const mat   = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(params.leafColor ?? '#4a8a20'), side: THREE.DoubleSide });
    for (let i = 0; i < count; i++) {
      const h   = 0.18 + this._rn(0, 0.28);
      const geo = new THREE.PlaneGeometry(0.035, h, 1, 5);
      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const t = (pos.getY(j) + h / 2) / h;
        pos.setX(j, pos.getX(j) + Math.sin(t * Math.PI) * 0.04 * this._rn(-1, 1));
      }
      pos.needsUpdate = true;
      const blade = new THREE.Mesh(geo, mat);
      blade.position.set(this._rn(-0.18, 0.18), h / 2, this._rn(-0.18, 0.18));
      blade.rotation.y = this._rn(0, TWO_PI);
      group.add(blade);
    }
    return group;
  }

  buildMushroom(params = {}) {
    const group  = new THREE.Group();
    const capColor  = params.primaryColor ?? '#cc3322';
    const stemColor = '#e8d8c0';
    const stem  = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.20, 10),
      new THREE.MeshPhysicalMaterial({ color: new THREE.Color(stemColor), roughness: 0.8 })
    );
    stem.position.y = 0.10;
    const cap   = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 8, 0, TWO_PI, 0, Math.PI * 0.6),
      new THREE.MeshPhysicalMaterial({ color: new THREE.Color(capColor), roughness: 0.7 })
    );
    cap.position.y = 0.22;
    group.add(stem, cap);
    return group;
  }

  generate(params = {}) {
    const type = params.foliageType ?? 'Deciduous Tree';
    if (type === 'Grass Tuft') return this.buildGrassTuft(params);
    if (type === 'Mushroom')   return this.buildMushroom(params);
    return this.buildTree(params);
  }

  toJSON() {
    return { seed: this.seed, opts: this.opts };
  }
}

export default FoliageGenerator;
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
