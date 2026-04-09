/**
 * CreatureGenerator.js — SPX Mesh Editor
 * Modular creature mesh assembly: body, head, limbs, wings, tail, skin FX.
 */
import * as THREE from 'three';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)   => a + (b - a) * t;
const rand  = (lo, hi)    => lo + Math.random() * (hi - lo);
const TWO_PI = Math.PI * 2;


export class CreatureGenerator {
  constructor(opts = {}) {
    this.opts = opts;
    this.seed = opts.seed ?? 7;
    this._rng = this._mkRng(this.seed);
  }
  _mkRng(s) { let n = s; return () => { n = (n * 9301 + 49297) % 233280; return n / 233280; }; }
  _rn(lo, hi) { return lo + this._rng() * (hi - lo); }
  _mat(hex, rough = 0.7, metal = 0) {
    return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
  }

  buildBody(p) {
    const W = 0.45 + p.bodyGirth * 0.40;
    const L = 0.70 + p.bodyLen   * 0.60;
    const H = 0.35;
    const geo = new THREE.SphereGeometry(W / 2, 12, 9);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, pos.getZ(i) * (L / W));
      pos.setY(i, pos.getY(i) * (H / (W / 2)));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  buildHead(p) {
    const r = 0.22 + this._rn(-0.04, 0.08);
    return new THREE.SphereGeometry(r, 12, 10);
  }

  buildHorn(p, index, total) {
    const h = 0.10 + this._rn(0.04, 0.16);
    const ang = ((index / Math.max(total, 1)) - 0.5) * Math.PI * 0.7;
    const pts = [
      new THREE.Vector3(Math.sin(ang) * 0.03, 0, 0),
      new THREE.Vector3(Math.sin(ang) * 0.05, h * 0.4, 0),
      new THREE.Vector3(Math.sin(ang) * 0.02, h, 0),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.018 + this._rn(0, 0.012), 6, false);
  }

  buildLimb(len, thick) {
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(len * 0.3, -len * 0.1, 0),
      new THREE.Vector3(len, -len * 0.25, 0),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, thick / 2, 6, false);
  }

  buildWing(p) {
    const span = 0.7 + this._rn(0, 0.5);
    const pts  = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(span * 0.35, span * 0.28),
      new THREE.Vector2(span, 0),
      new THREE.Vector2(span * 0.6, -span * 0.35),
      new THREE.Vector2(0, 0),
    ];
    return new THREE.ShapeGeometry(new THREE.Shape(pts));
  }

  buildTail(p) {
    const len  = 0.35 + (p.tailLen ?? 0.6) * 0.80;
    const segs = 10;
    const pts  = Array.from({ length: segs }, (_, i) => {
      const t = i / (segs - 1);
      return new THREE.Vector3(
        Math.sin(t * Math.PI * 0.6) * len * 0.18,
        -t * len * 0.25,
        t * len
      );
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segs * 2, 0.035 * (1 - 0.75 * (p.tailLen ?? 0.6)), 6, false);
  }

  assemble(params = {}) {
    const {
      archetype = 'Reptilian', primaryColor = '#4a6a30', secondColor = '#2a3a18',
      accentColor = '#c8a000', bodyLen = 0.5, bodyGirth = 0.5,
      limbCount = 4, hornCount = 2, wingType = 'None', tailType = 'Long',
      biolum = false, biolumColor = '#00ffc8', biolumIntensity = 0.6,
      armorPlates = false, armorColor = '#505060',
    } = params;

    const group = new THREE.Group();
    const mat1  = this._mat(primaryColor, 0.7);
    const mat2  = this._mat(secondColor, 0.8);
    const matAcc = this._mat(accentColor, 0.4, 0.2);
    if (biolum) mat1.emissive = new THREE.Color(biolumColor);
    if (biolum) mat1.emissiveIntensity = biolumIntensity * 0.15;

    // Body
    const bodyGeo = this.buildBody(params);
    group.add(new THREE.Mesh(bodyGeo, mat1));

    // Head
    const headGeo = this.buildHead(params);
    const head    = new THREE.Mesh(headGeo, mat1);
    head.position.set(0, 0.10, 0.55 + bodyLen * 0.28);
    group.add(head);

    // Horns
    for (let i = 0; i < Math.min(hornCount, 8); i++) {
      const hGeo = this.buildHorn(params, i, hornCount);
      const h    = new THREE.Mesh(hGeo, matAcc);
      const ang  = ((i / Math.max(hornCount, 1)) - 0.5) * Math.PI * 0.7;
      h.position.set(Math.sin(ang) * 0.10, 0.22, 0.55 + bodyLen * 0.28);
      group.add(h);
    }

    // Limbs
    for (let i = 0; i < Math.min(limbCount, 8); i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row  = Math.floor(i / 2);
      const lGeo = this.buildLimb(0.28 + bodyGirth * 0.10, 0.06);
      const limb = new THREE.Mesh(lGeo, mat2);
      limb.position.set(side * (0.28 + bodyGirth * 0.18), -0.12, -0.15 + row * 0.28);
      limb.rotation.z = side * 0.45;
      group.add(limb);
    }

    // Wings
    if (wingType !== 'None') {
      [-1, 1].forEach(side => {
        const wGeo = this.buildWing(params);
        const wing = new THREE.Mesh(wGeo, new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(primaryColor), transparent: true, opacity: 0.65, side: THREE.DoubleSide,
        }));
        wing.position.set(side * 0.45, 0.15, 0);
        wing.scale.x = side;
        group.add(wing);
      });
    }

    // Tail
    if (tailType !== 'None') {
      const tGeo = this.buildTail(params);
      const tail = new THREE.Mesh(tGeo, mat2);
      tail.position.set(0, -0.05, -0.38 - bodyLen * 0.18);
      group.add(tail);
    }

    // Armor plates
    if (armorPlates) {
      const armorMat = this._mat(armorColor, 0.4, 0.3);
      for (let i = 0; i < 5; i++) {
        const plate = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4, 0, TWO_PI, 0, Math.PI * 0.5), armorMat);
        plate.position.set(0, 0.18, -0.25 + i * 0.12);
        group.add(plate);
      }
    }

    group.userData.params = params;
    return group;
  }

  generate(params = {}) { return this.assemble(params); }
  toJSON() { return { seed: this.seed, opts: this.opts }; }
}

export default CreatureGenerator;
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
