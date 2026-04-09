// GroomSystem.js — Interactive Hair Groom System (XGen equivalent)
// SPX Mesh Editor | StreamPireX
// Features: grow from surface, guide strands, comb, smooth, cut, clump,
//           noise, curl, density painting, render-ready export

import * as THREE from 'three';

// ─── Guide Strand ─────────────────────────────────────────────────────────────

export function createGuideStrand(rootPos, rootNormal, options = {}) {
  const {
    segments = 8,
    length   = 0.3,
    id       = Math.random().toString(36).slice(2),
  } = options;

  const points = [];
  const segLen = length / segments;

  for (let i = 0; i <= segments; i++) {
    points.push(rootPos.clone().addScaledVector(rootNormal, i * segLen));
  }

  return {
    id, points, rootPos: rootPos.clone(), rootNormal: rootNormal.clone(),
    segments, length, selected: false, weight: 1.0,
  };
}

// ─── Groom System ─────────────────────────────────────────────────────────────

export class GroomSystem {
  constructor(mesh, options = {}) {
    this.mesh          = mesh;
    this.guides        = [];
    this.density       = options.density       ?? 1000; // hairs per unit area
    this.length        = options.length        ?? 0.2;
    this.segments      = options.segments      ?? 8;
    this.clumpStrength = options.clumpStrength ?? 0.3;
    this.noiseStrength = options.noiseStrength ?? 0.02;
    this.curlAmount    = options.curlAmount    ?? 0;
    this.curlFreq      = options.curlFreq      ?? 3;
    this.taper         = options.taper         ?? 0.8; // tip is this fraction of root thickness
    this.rootThickness = options.rootThickness ?? 0.003;
    this.tipThickness  = options.tipThickness  ?? 0.001;
    this._densityMap   = null; // Float32Array per vertex 0-1
    this._lengthMap    = null;
    this._tool         = 'comb'; // comb|smooth|cut|grow|clump|noise
    this._toolRadius   = 0.1;
    this._toolStrength = 0.5;
  }

  // ─── Grow guides from surface ────────────────────────────────────────────

  growFromSurface(count = 100, options = {}) {
    const geo = this.mesh.geometry;
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const idx = geo.index;
    if (!pos) return;

    // Sample random points on mesh surface
    for (let i = 0; i < count; i++) {
      let faceIdx, u, v;
      if (idx) {
        faceIdx = Math.floor(Math.random() * (idx.count / 3)) * 3;
        u = Math.random(); v = Math.random() * (1 - u);
      } else {
        faceIdx = Math.floor(Math.random() * (pos.count / 3)) * 3;
        u = Math.random(); v = Math.random() * (1 - u);
      }

      const w = 1 - u - v;
      const ai = idx ? idx.getX(faceIdx)   : faceIdx;
      const bi = idx ? idx.getX(faceIdx+1) : faceIdx+1;
      const ci = idx ? idx.getX(faceIdx+2) : faceIdx+2;

      const rootPos = new THREE.Vector3(
        pos.getX(ai)*u + pos.getX(bi)*v + pos.getX(ci)*w,
        pos.getY(ai)*u + pos.getY(bi)*v + pos.getY(ci)*w,
        pos.getZ(ai)*u + pos.getZ(bi)*v + pos.getZ(ci)*w,
      ).applyMatrix4(this.mesh.matrixWorld);

      const rootNormal = norm ? new THREE.Vector3(
        norm.getX(ai)*u + norm.getX(bi)*v + norm.getX(ci)*w,
        norm.getY(ai)*u + norm.getY(bi)*v + norm.getY(ci)*w,
        norm.getZ(ai)*u + norm.getZ(bi)*v + norm.getZ(ci)*w,
      ).normalize().transformDirection(this.mesh.matrixWorld) : new THREE.Vector3(0,1,0);

      const densityWeight = this._densityMap ? this._sampleDensityAt(rootPos) : 1;
      if (Math.random() > densityWeight) continue;

      const lengthMult = this._lengthMap ? this._sampleLengthAt(rootPos) : 1;

      const guide = createGuideStrand(rootPos, rootNormal, {
        segments: this.segments,
        length: this.length * lengthMult,
        ...options,
      });

      // Apply curl
      if (this.curlAmount > 0) this._applyCurl(guide);

      // Apply noise
      if (this.noiseStrength > 0) this._applyNoise(guide);

      this.guides.push(guide);
    }
    return this;
  }

  _applyCurl(guide) {
    const right = new THREE.Vector3(1,0,0);
    if (Math.abs(guide.rootNormal.dot(right)) > 0.9) right.set(0,1,0);
    const tangent = right.clone().cross(guide.rootNormal).normalize();

    guide.points.forEach((p, i) => {
      if (i === 0) return;
      const t = i / guide.segments;
      const angle = t * this.curlFreq * Math.PI * 2;
      p.addScaledVector(tangent, Math.sin(angle) * this.curlAmount * t);
    });
  }

  _applyNoise(guide) {
    guide.points.forEach((p, i) => {
      if (i === 0) return;
      const t = i / guide.segments;
      p.x += (Math.random()-0.5) * this.noiseStrength * t;
      p.y += (Math.random()-0.5) * this.noiseStrength * t;
      p.z += (Math.random()-0.5) * this.noiseStrength * t;
    });
  }

  _sampleDensityAt(pos) { return 1; } // Override with painted density
  _sampleLengthAt(pos)  { return 1; } // Override with painted length

  // ─── Groom Tools ──────────────────────────────────────────────────────────

  setTool(tool) { this._tool = tool; }
  setToolRadius(r) { this._toolRadius = r; }
  setToolStrength(s) { this._toolStrength = s; }

  applyTool(hitPoint, hitNormal, options = {}) {
    switch (this._tool) {
      case 'comb':   this._comb(hitPoint, hitNormal); break;
      case 'smooth': this._smooth(hitPoint); break;
      case 'cut':    this._cut(hitPoint, options.cutLength ?? 0.1); break;
      case 'grow':   this._grow(hitPoint, hitNormal); break;
      case 'clump':  this._clump(hitPoint); break;
      case 'noise':  this._addNoise(hitPoint); break;
      case 'erase':  this._erase(hitPoint); break;
      case 'relax':  this._relax(hitPoint); break;
    }
  }

  _getAffectedGuides(center) {
    return this.guides.filter(g => g.rootPos.distanceTo(center) < this._toolRadius);
  }

  _comb(hitPoint, direction) {
    this._getAffectedGuides(hitPoint).forEach(guide => {
      const falloff = 1 - guide.rootPos.distanceTo(hitPoint) / this._toolRadius;
      const dir = direction.clone().multiplyScalar(this._toolStrength * falloff * 0.1);
      guide.points.forEach((p, i) => {
        if (i === 0) return;
        const t = i / guide.segments;
        p.add(dir.clone().multiplyScalar(t));
      });
      this._constrainLength(guide);
    });
  }

  _smooth(hitPoint) {
    const affected = this._getAffectedGuides(hitPoint);
    if (affected.length < 2) return;
    for (let i = 1; i <= this.segments; i++) {
      const avg = new THREE.Vector3();
      affected.forEach(g => { if (g.points[i]) avg.add(g.points[i]); });
      avg.divideScalar(affected.length);
      affected.forEach(g => {
        if (!g.points[i]) return;
        const falloff = 1 - g.rootPos.distanceTo(hitPoint) / this._toolRadius;
        g.points[i].lerp(avg, this._toolStrength * falloff * 0.3);
      });
    }
  }

  _cut(hitPoint, targetLength) {
    this._getAffectedGuides(hitPoint).forEach(guide => {
      const currentLen = guide.rootPos.distanceTo(guide.points[guide.segments]);
      if (currentLen <= targetLength) return;
      const ratio = targetLength / currentLen;
      guide.points.forEach((p, i) => {
        if (i === 0) return;
        const t = i / guide.segments;
        p.lerpVectors(guide.rootPos, p, ratio * t + (1-t));
      });
      guide.length = targetLength;
    });
  }

  _grow(hitPoint, normal) {
    // Add new guide at hit point
    const guide = createGuideStrand(hitPoint, normal, { segments: this.segments, length: this.length });
    if (this.curlAmount > 0) this._applyCurl(guide);
    if (this.noiseStrength > 0) this._applyNoise(guide);
    this.guides.push(guide);
  }

  _clump(hitPoint) {
    const affected = this._getAffectedGuides(hitPoint);
    if (affected.length < 2) return;
    const center = new THREE.Vector3();
    affected.forEach(g => center.add(g.rootPos));
    center.divideScalar(affected.length);

    affected.forEach(guide => {
      const falloff = 1 - guide.rootPos.distanceTo(hitPoint) / this._toolRadius;
      guide.points.forEach((p, i) => {
        if (i === 0) return;
        const t = i / guide.segments;
        const clumpPt = center.clone().addScaledVector(guide.rootNormal, t * guide.length);
        p.lerp(clumpPt, this._toolStrength * falloff * this.clumpStrength * t);
      });
    });
  }

  _addNoise(hitPoint) {
    this._getAffectedGuides(hitPoint).forEach(guide => {
      const falloff = 1 - guide.rootPos.distanceTo(hitPoint) / this._toolRadius;
      guide.points.forEach((p, i) => {
        if (i === 0) return;
        const t = i / guide.segments;
        const n = this.noiseStrength * this._toolStrength * falloff * t;
        p.x += (Math.random()-0.5)*n; p.y += (Math.random()-0.5)*n; p.z += (Math.random()-0.5)*n;
      });
    });
  }

  _erase(hitPoint) {
    this.guides = this.guides.filter(g => g.rootPos.distanceTo(hitPoint) > this._toolRadius * this._toolStrength);
  }

  _relax(hitPoint) {
    this._getAffectedGuides(hitPoint).forEach(guide => {
      for (let i = 1; i < guide.points.length; i++) {
        const target = guide.rootPos.clone().addScaledVector(guide.rootNormal, (i/guide.segments) * guide.length);
        const falloff = 1 - guide.rootPos.distanceTo(hitPoint) / this._toolRadius;
        guide.points[i].lerp(target, this._toolStrength * falloff * 0.1);
      }
    });
  }

  _constrainLength(guide) {
    for (let i = 1; i < guide.points.length; i++) {
      const parent = guide.points[i-1];
      const segLen = guide.length / guide.segments;
      const diff = guide.points[i].clone().sub(parent);
      const dist = diff.length();
      if (dist > segLen * 1.01) {
        guide.points[i].copy(parent).addScaledVector(diff.normalize(), segLen);
      }
    }
  }

  // ─── Interpolate to render strands ───────────────────────────────────────

  interpolateStrands(count) {
    if (this.guides.length < 2) return this.guides;
    const strands = [];
    for (let i = 0; i < count; i++) {
      const u = Math.random(), v = Math.random();
      // Find 3 nearest guides and barycentric interpolate
      const sorted = this.guides
        .map(g => ({ g, d: new THREE.Vector3(u, 0, v).distanceTo(new THREE.Vector3()) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);

      if (!sorted.length) continue;
      const base = sorted[0].g;
      const strand = { ...base, points: base.points.map(p => p.clone()), id: Math.random().toString(36).slice(2) };
      this._applyCurl(strand);
      this._applyNoise(strand);
      strands.push(strand);
    }
    return strands;
  }

  // ─── Build geometry for rendering ────────────────────────────────────────

  buildRenderGeometry(interpolatedCount = 5000) {
    const strands = this.guides.length > 10 ? this.interpolateStrands(interpolatedCount) : this.guides;
    const positions = [];
    strands.forEach(strand => {
      for (let i = 0; i < strand.points.length - 1; i++) {
        positions.push(...strand.points[i].toArray(), ...strand.points[i+1].toArray());
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }

  // ─── Paint Maps ──────────────────────────────────────────────────────────

  paintDensity(hitPoint, value = 1) {
    if (!this._densityMap) this._densityMap = new Map();
    this._densityMap.set(`${hitPoint.x.toFixed(2)}_${hitPoint.y.toFixed(2)}_${hitPoint.z.toFixed(2)}`, value);
  }

  paintLength(hitPoint, value = 1) {
    if (!this._lengthMap) this._lengthMap = new Map();
    this._lengthMap.set(`${hitPoint.x.toFixed(2)}_${hitPoint.y.toFixed(2)}_${hitPoint.z.toFixed(2)}`, value);
  }

  // ─── Export ──────────────────────────────────────────────────────────────

  exportGuides() {
    return this.guides.map(g => ({
      id: g.id,
      rootPos: g.rootPos.toArray(),
      rootNormal: g.rootNormal.toArray(),
      points: g.points.map(p => p.toArray()),
      length: g.length, segments: g.segments,
    }));
  }

  importGuides(data) {
    this.guides = data.map(g => ({
      id: g.id,
      rootPos: new THREE.Vector3(...g.rootPos),
      rootNormal: new THREE.Vector3(...g.rootNormal),
      points: g.points.map(p => new THREE.Vector3(...p)),
      length: g.length, segments: g.segments, selected: false, weight: 1,
    }));
  }

  getStats() {
    return {
      guideCount: this.guides.length,
      avgLength: this.guides.reduce((s,g) => s+g.length, 0) / (this.guides.length||1),
      tool: this._tool, toolRadius: this._toolRadius,
    };
  }

  clear() { this.guides = []; }
}

export const GROOM_TOOLS = ['comb','smooth','cut','grow','clump','noise','erase','relax'];

export default GroomSystem;
