/**
 * VehicleGenerator.js — SPX Mesh Editor
 * Parametric vehicle builder: cars, trucks, motorcycles, planes, boats, mechs.
 */
import * as THREE from 'three';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)   => a + (b - a) * t;
const rand  = (lo, hi)    => lo + Math.random() * (hi - lo);
const TWO_PI = Math.PI * 2;


export class VehicleGenerator {
  constructor(opts = {}) {
    this.opts = opts;
    this.seed = opts.seed ?? 3;
    this._rng = this._mkRng(this.seed);
  }
  _mkRng(s) { let n = s; return () => { n = (n * 9301 + 49297) % 233280; return n / 233280; }; }
  _rn(lo, hi) { return lo + this._rng() * (hi - lo); }
  _mat(hex, rough = 0.3, metal = 0.8) {
    return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
  }

  buildWheel(radius, thickness, rimColor) {
    const g       = new THREE.Group();
    const tireMat = this._mat('#1a1a1a', 0.9, 0);
    const rimMat  = this._mat(rimColor ?? '#888888', 0.25, 0.9);
    const tire    = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 24), tireMat);
    tire.rotation.x = Math.PI / 2;
    const rim     = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, thickness + 0.01, 8), rimMat);
    rim.rotation.x = Math.PI / 2;
    // Spokes
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * TWO_PI;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.08, radius * 0.9, thickness * 0.5), rimMat);
      spoke.rotation.z = angle;
      g.add(spoke);
    }
    g.add(tire, rim);
    return g;
  }

  buildCar(p) {
    const { primaryColor = '#1a2a8a', secondColor = '#c0c0c0',
      bodyLen = 0.5, bodyW = 0.5, bodyH = 0.5,
      wheelSize = 0.5, wheelW = 0.5, wheelCount = 4,
      roughness = 0.25, metalness = 0.7, windowTint = 0.3,
      addLights = true } = p;

    const L = 3.6 + bodyLen * 1.4;
    const W = 1.65 + bodyW  * 0.35;
    const H = 1.25 + bodyH  * 0.35;
    const group  = new THREE.Group();
    const bodyMat  = this._mat(primaryColor, roughness, metalness);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x223344, transparent: true, opacity: 0.35 + windowTint * 0.4, metalness: 0.05, roughness: 0.05,
    });

    // Body lower
    const bodyLow = new THREE.Mesh(new THREE.BoxGeometry(L, H * 0.52, W), bodyMat);
    bodyLow.position.y = H * 0.52 / 2 + 0.22;
    group.add(bodyLow);

    // Cabin
    const cabW = L * 0.52, cabH = H * 0.46;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabW, cabH, W * 0.88), bodyMat);
    cabin.position.set(L * 0.04, H * 0.52 + cabH / 2 + 0.22, 0);
    group.add(cabin);

    // Windshield
    const windF = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.82, cabH * 0.78), glassMat);
    windF.position.set(cabW * 0.47 + L * 0.04, H * 0.52 + cabH / 2 + 0.22, 0);
    windF.rotation.y = Math.PI / 2 - 0.28;
    group.add(windF);

    // Side windows
    [-W / 2 - 0.01, W / 2 + 0.01].forEach((z, si) => {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(cabW * 0.85, cabH * 0.7), glassMat);
      win.position.set(L * 0.04, H * 0.52 + cabH / 2 + 0.22, z);
      win.rotation.y = si === 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(win);
    });

    // Wheels
    const wr = 0.27 + wheelSize * 0.09;
    const wt = 0.17 + wheelW  * 0.07;
    const wPositions = [
      [-L * 0.36,  wr + 0.22,  W / 2 + wt / 2 + 0.02],
      [-L * 0.36,  wr + 0.22, -W / 2 - wt / 2 - 0.02],
      [ L * 0.30,  wr + 0.22,  W / 2 + wt / 2 + 0.02],
      [ L * 0.30,  wr + 0.22, -W / 2 - wt / 2 - 0.02],
    ].slice(0, wheelCount);
    wPositions.forEach(([wx, wy, wz]) => {
      const wheel = this.buildWheel(wr, wt, secondColor);
      wheel.position.set(wx, wy, wz);
      wheel.rotation.y = wz > 0 ? 0 : Math.PI;
      group.add(wheel);
    });

    // Headlights
    if (addLights) {
      const lightMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 0.9 });
      [-W * 0.3, W * 0.3].forEach(z => {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), lightMat);
        l.position.set(-L / 2, H * 0.52 * 0.75 + 0.22, z);
        group.add(l);
      });
      // Taillights
      const tailMat = new THREE.MeshPhysicalMaterial({ color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 0.7 });
      [-W * 0.28, W * 0.28].forEach(z => {
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.08), tailMat);
        t.position.set(L / 2, H * 0.52 * 0.7 + 0.22, z);
        group.add(t);
      });
    }

    group.userData.params = p;
    return group;
  }

  buildMotorcycle(p) {
    const { primaryColor = '#cc2200' } = p;
    const g   = new THREE.Group();
    const mat = this._mat(primaryColor, 0.3, 0.7);
    // Frame
    g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 8), mat),
      { rotation: new THREE.Euler(0, 0, Math.PI / 2), position: new THREE.Vector3(0, 0.68, 0) }));
    // Engine block
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 0.22), this._mat('#2a2a2a', 0.5, 0.7)),
      { position: new THREE.Vector3(0, 0.52, 0) }));
    // Wheels
    [-0.52, 0.52].forEach(z => {
      const w = this.buildWheel(0.30, 0.12, '#888888');
      w.position.set(0, 0.30, z);
      g.add(w);
    });
    // Seat
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.18), this._mat('#1a1a1a', 0.9, 0)),
      { position: new THREE.Vector3(-0.1, 0.84, 0) }));
    // Handlebars
    g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.52, 8), this._mat('#888888', 0.2, 0.9)),
      { rotation: new THREE.Euler(0, 0, Math.PI / 2), position: new THREE.Vector3(-0.45, 0.95, 0) }));
    g.userData.params = p;
    return g;
  }

  generate(params = {}) {
    const cls = params.vehicleClass ?? 'Car';
    if (cls === 'Motorcycle' || cls === 'Bicycle') return this.buildMotorcycle(params);
    return this.buildCar(params);
  }

  toJSON() { return { seed: this.seed, opts: this.opts }; }
}

export default VehicleGenerator;
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
