/**
 * PropGenerator.js — SPX Mesh Editor
 * Procedural prop builder: furniture, containers, weapons, tools, architecture pieces.
 */
import * as THREE from 'three';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)   => a + (b - a) * t;
const rand  = (lo, hi)    => lo + Math.random() * (hi - lo);
const TWO_PI = Math.PI * 2;


export class PropGenerator {
  constructor(opts = {}) {
    this.opts = opts;
    this.seed = opts.seed ?? 1;
    this._rng = this._mkRng(this.seed);
  }
  _mkRng(s) { let n = s; return () => { n = (n * 9301 + 49297) % 233280; return n / 233280; }; }
  _rn(lo, hi) { return lo + this._rng() * (hi - lo); }
  _mat(hex, rough = 0.6, metal = 0) {
    return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex ?? '#8a6030'), roughness: rough, metalness: metal });
  }

  buildChair(p) {
    const g = new THREE.Group();
    const mat = this._mat(p.primaryColor ?? '#8a6030', 0.7);
    const W = 0.48, H = 0.44, D = 0.48;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, D), mat);
    seat.position.y = H;
    const back = new THREE.Mesh(new THREE.BoxGeometry(W, 0.48, 0.04), mat);
    back.position.set(0, H + 0.26, -D / 2 + 0.02);
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, H, 6);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lx * (W/2-0.04), H/2, lz * (D/2-0.04));
      g.add(leg);
    });
    g.add(seat, back);
    return g;
  }

  buildTable(p) {
    const g   = new THREE.Group();
    const mat = this._mat(p.primaryColor ?? '#6a4020', 0.65);
    const W = 1.0 + this._rn(-0.2, 0.4), H = 0.75, D = 0.6;
    const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, D), mat);
    top.position.y = H;
    const legGeo = new THREE.BoxGeometry(0.05, H, 0.05);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lx * (W/2-0.06), H/2, lz * (D/2-0.06));
      g.add(leg);
    });
    g.add(top);
    return g;
  }

  buildBarrel(p) {
    const mat  = this._mat(p.primaryColor ?? '#6a3010', 0.8);
    const hoop = this._mat('#888888', 0.3, 0.8);
    const g    = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.75, 16), mat));
    [-0.28, 0, 0.28].forEach(y => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.014, 6, 24), hoop);
      r.position.y = y; r.rotation.x = Math.PI / 2; g.add(r);
    });
    return g;
  }

  buildCrate(p) {
    const mat   = this._mat(p.primaryColor ?? '#8a6020', 0.85);
    const plank = this._mat('#5a3a10', 0.9);
    const g     = new THREE.Group();
    const S     = 0.55 + this._rn(-0.1, 0.2);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(S, S, S), mat));
    for (let i = 0; i < 3; i++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(S + 0.01, 0.04, S + 0.01), plank);
      strip.position.y = -S/2 + i * (S/2);
      g.add(strip);
    }
    return g;
  }

  buildSword(p) {
    const g     = new THREE.Group();
    const blade = this._mat('#c8c8d0', 0.15, 0.9);
    const grip  = this._mat(p.primaryColor ?? '#4a2a10', 0.8);
    const accent = this._mat(p.secondColor ?? '#c8a830', 0.3, 0.8);
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.048, 1.05, 0.007), blade), { position: new THREE.Vector3(0, 0.2, 0) }));
    // Fuller
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.85, 0.002), new THREE.MeshPhysicalMaterial({ color: 0xb8b8c8 })), { position: new THREE.Vector3(0, 0.2, 0.005) }));
    // Crossguard
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.04), accent), { position: new THREE.Vector3(0, -0.42, 0) }));
    // Grip
    g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.28, 8), grip), { position: new THREE.Vector3(0, -0.62, 0) }));
    // Pommel
    g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), accent), { position: new THREE.Vector3(0, -0.78, 0) }));
    return g;
  }

  buildLamp(p) {
    const g      = new THREE.Group();
    const mat    = this._mat(p.primaryColor ?? '#c8a830', 0.4, 0.6);
    const shade  = this._mat(p.secondColor  ?? '#e8d090', 0.7);
    // Base
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.06, 16), mat));
    // Pole
    g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 8), mat), { position: new THREE.Vector3(0, 0.31, 0) }));
    // Shade
    g.add(Object.assign(new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.22, 12, 1, true), shade), { position: new THREE.Vector3(0, 0.67, 0) }));
    // Bulb
    g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6),
      new THREE.MeshPhysicalMaterial({ color: 0xfffff0, emissive: 0xffffaa, emissiveIntensity: 0.8 })),
      { position: new THREE.Vector3(0, 0.58, 0) }));
    return g;
  }

  generate(params = {}) {
    const type = `${params.propCategory}:${params.propType}`;
    let g;
    if      (type.includes('Chair'))  g = this.buildChair(params);
    else if (type.includes('Table'))  g = this.buildTable(params);
    else if (type.includes('Barrel')) g = this.buildBarrel(params);
    else if (type.includes('Crate'))  g = this.buildCrate(params);
    else if (type.includes('Sword'))  g = this.buildSword(params);
    else if (type.includes('Lamp'))   g = this.buildLamp(params);
    else    g = this.buildCrate(params);
    g.scale.set(params.scaleX ?? 1, params.scaleY ?? 1, params.scaleZ ?? 1);
    g.userData.params = params;
    return g;
  }

  toJSON() { return { seed: this.seed, opts: this.opts }; }
}

export default PropGenerator;
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
// ──────────────────────────────────────────────────────────────────────────
//
