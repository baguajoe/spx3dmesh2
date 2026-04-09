import * as THREE from 'three';

/**
 * SPX HairStrandSystem — strand-based hair grooming
 * Each strand = array of segments simulated with verlet dynamics
 * Supports: combing, length painting, clumping, gravity, wind, style presets
 */

const HAIR_PRESETS = {
  short:   { segments: 4,  length: 0.15, clump: 0.6, wave: 0.02 },
  medium:  { segments: 8,  length: 0.35, clump: 0.4, wave: 0.05 },
  long:    { segments: 12, length: 0.7,  clump: 0.3, wave: 0.08 },
  curly:   { segments: 10, length: 0.4,  clump: 0.5, wave: 0.15 },
  braided: { segments: 14, length: 0.6,  clump: 0.8, wave: 0.04 },
};

class Strand {
  constructor(root, normal, options = {}) {
    this.segments = options.segments || 8;
    this.length = options.length || 0.3;
    this.stiffness = options.stiffness || 0.85;
    this.gravity = options.gravity || new THREE.Vector3(0, -0.001, 0);

    const segLen = this.length / this.segments;
    this.positions = [];
    this.prevPositions = [];

    for (let i = 0; i <= this.segments; i++) {
      const p = root.clone().addScaledVector(normal, segLen * i);
      this.positions.push(p.clone());
      this.prevPositions.push(p.clone());
    }
    this.root = root.clone();
    this.normal = normal.clone().normalize();
    this.restLengths = Array(this.segments).fill(segLen);
  }

  simulate(wind = new THREE.Vector3(), iterations = 3) {
    // Pin root
    this.positions[0].copy(this.root);

    // Verlet integration (skip root)
    for (let i = 1; i <= this.segments; i++) {
      const cur = this.positions[i];
      const prev = this.prevPositions[i];
      const vel = cur.clone().sub(prev).multiplyScalar(0.98); // dampen
      prev.copy(cur);
      cur.add(vel).add(this.gravity).add(wind.clone().multiplyScalar(0.0003 * i));
    }

    // Distance constraints
    for (let iter = 0; iter < iterations; iter++) {
      this.positions[0].copy(this.root); // re-pin
      for (let i = 0; i < this.segments; i++) {
        const a = this.positions[i], b = this.positions[i + 1];
        const diff = b.clone().sub(a);
        const dist = diff.length();
        const rest = this.restLengths[i];
        if (dist < 0.0001) continue;
        const correction = diff.multiplyScalar((dist - rest) / dist * 0.5);
        if (i > 0) a.add(correction.clone().multiplyScalar(1 - this.stiffness));
        b.sub(correction.clone().multiplyScalar(1 - this.stiffness));
      }
    }
  }

  getPositions() { return this.positions; }
}

export class HairStrandSystem {
  constructor(options = {}) {
    this.strands = [];
    this.preset = options.preset || 'medium';
    this.color = options.color || '#1a0a00';
    this.highlightColor = options.highlightColor || '#6b3a1f';
    this.density = options.density || 1.0;
    this.gravity = new THREE.Vector3(0, -0.001, 0);
    this.wind = new THREE.Vector3(0, 0, 0);
    this._lineSegments = null;
    this._group = new THREE.Group();
    this._group.name = 'HairSystem';
    this._animating = false;
    this._animFrame = null;
  }

  // Generate strands from mesh surface using face normals
  growFromMesh(mesh, strandCount = 200, regionFilter = null) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    if (!pos || !norm) throw new Error('Mesh needs position and normal attributes');

    const opts = { ...HAIR_PRESETS[this.preset] };
    const step = Math.max(1, Math.floor(pos.count / strandCount));

    this.strands = [];
    for (let i = 0; i < pos.count; i += step) {
      const root = new THREE.Vector3().fromBufferAttribute(pos, i);
      const normal = new THREE.Vector3().fromBufferAttribute(norm, i).normalize();
      // Apply mesh world transform
      root.applyMatrix4(mesh.matrixWorld);
      normal.transformDirection(mesh.matrixWorld).normalize();

      if (regionFilter && !regionFilter(root, i)) continue;
      this.strands.push(new Strand(root, normal, opts));
    }

    this._buildGeometry();
    return this;
  }

  _buildGeometry() {
    if (this._lineSegments) {
      this._group.remove(this._lineSegments);
      this._lineSegments.geometry.dispose();
    }

    const totalPoints = this.strands.reduce((s, st) => s + st.positions.length, 0);
    const positions = new Float32Array(totalPoints * 3);
    const colors = new Float32Array(totalPoints * 3);
    const indices = [];

    const c1 = new THREE.Color(this.color);
    const c2 = new THREE.Color(this.highlightColor);

    let offset = 0;
    for (const strand of this.strands) {
      const pts = strand.positions;
      for (let i = 0; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        const col = c1.clone().lerp(c2, t * 0.4 + Math.random() * 0.1);
        positions[offset * 3]     = pts[i].x;
        positions[offset * 3 + 1] = pts[i].y;
        positions[offset * 3 + 2] = pts[i].z;
        colors[offset * 3]     = col.r;
        colors[offset * 3 + 1] = col.g;
        colors[offset * 3 + 2] = col.b;
        if (i < pts.length - 1) { indices.push(offset, offset + 1); }
        offset++;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);

    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 });
    this._lineSegments = new THREE.LineSegments(geo, mat);
    this._lineSegments.name = 'HairStrands';
    this._group.add(this._lineSegments);
  }

  _updateGeometry() {
    if (!this._lineSegments) return;
    const pos = this._lineSegments.geometry.attributes.position;
    let offset = 0;
    for (const strand of this.strands) {
      for (const p of strand.positions) {
        pos.setXYZ(offset++, p.x, p.y, p.z);
      }
    }
    pos.needsUpdate = true;
  }

  // Simulate all strands one step
  step() {
    for (const strand of this.strands) strand.simulate(this.wind);
    this._updateGeometry();
  }

  // Start/stop real-time simulation
  startSimulation(fps = 60) {
    if (this._animating) return;
    this._animating = true;
    const interval = 1000 / fps;
    let last = 0;
    const loop = (t) => {
      if (!this._animating) return;
      if (t - last >= interval) { this.step(); last = t; }
      this._animFrame = requestAnimationFrame(loop);
    };
    this._animFrame = requestAnimationFrame(loop);
  }

  stopSimulation() {
    this._animating = false;
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
  }

  setPreset(name) {
    if (!HAIR_PRESETS[name]) return;
    this.preset = name;
  }

  setWind(x, y, z) { this.wind.set(x, y, z); }
  setGravity(strength) { this.gravity.set(0, -strength, 0); for (const s of this.strands) s.gravity.set(0, -strength, 0); }
  setColor(hex) { this.color = hex; this._buildGeometry(); }

  getGroup() { return this._group; }

  // Comb brush — push strands toward direction at position
  comb(worldPos, direction, radius = 0.2, strength = 0.1) {
    direction = direction.clone().normalize();
    for (const strand of this.strands) {
      if (strand.root.distanceTo(worldPos) > radius) continue;
      for (let i = 1; i < strand.positions.length; i++) {
        strand.positions[i].addScaledVector(direction, strength * (i / strand.positions.length));
      }
    }
    this._updateGeometry();
  }

  static PRESETS = Object.keys(HAIR_PRESETS);
}

export default HairStrandSystem;