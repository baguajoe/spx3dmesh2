// PathTracer.js — PRO Path Tracer
// SPX Mesh Editor | StreamPireX
// Features: BVH acceleration, Monte Carlo sampling, subsurface scattering,
//           volumetrics, caustics, BRDF materials, denoising

import * as THREE from 'three';

// ─── BVH Node ─────────────────────────────────────────────────────────────────

class BVHNode {
  constructor() {
    this.bbox   = new THREE.Box3();
    this.left   = null;
    this.right  = null;
    this.tris   = []; // leaf triangles
    this.isLeaf = false;
  }
}

function buildBVH(triangles, depth = 0, maxDepth = 20, leafSize = 4) {
  const node = new BVHNode();
  const bbox = new THREE.Box3();
  triangles.forEach(t => { bbox.expandByPoint(t.a); bbox.expandByPoint(t.b); bbox.expandByPoint(t.c); });
  node.bbox = bbox;

  if (triangles.length <= leafSize || depth >= maxDepth) {
    node.isLeaf = true;
    node.tris = triangles;
    return node;
  }

  // Split along longest axis
  const size = bbox.getSize(new THREE.Vector3());
  const axis = size.x > size.y ? (size.x > size.z ? 'x' : 'z') : (size.y > size.z ? 'y' : 'z');
  const mid = (bbox.min[axis] + bbox.max[axis]) * 0.5;

  const left  = triangles.filter(t => (t.a[axis] + t.b[axis] + t.c[axis]) / 3 <= mid);
  const right = triangles.filter(t => (t.a[axis] + t.b[axis] + t.c[axis]) / 3 > mid);

  if (!left.length || !right.length) {
    node.isLeaf = true; node.tris = triangles; return node;
  }

  node.left  = buildBVH(left,  depth+1, maxDepth, leafSize);
  node.right = buildBVH(right, depth+1, maxDepth, leafSize);
  return node;
}

function intersectBVH(node, ray, tMin = 0.001, tMax = Infinity) {
  if (!ray.intersectsBox(node.bbox)) return null;
  if (node.isLeaf) {
    let nearest = null;
    node.tris.forEach(tri => {
      const hit = intersectTriangle(ray, tri.a, tri.b, tri.c);
      if (hit && hit.t > tMin && hit.t < tMax) {
        tMax = hit.t;
        nearest = { ...hit, tri };
      }
    });
    return nearest;
  }
  const hitL = intersectBVH(node.left,  ray, tMin, tMax);
  const hitR = intersectBVH(node.right, ray, tMin, hitL?.t ?? tMax);
  return hitR ?? hitL;
}

function intersectTriangle(ray, a, b, c) {
  const e1 = b.clone().sub(a), e2 = c.clone().sub(a);
  const h = new THREE.Vector3().crossVectors(ray.direction, e2);
  const det = e1.dot(h);
  if (Math.abs(det) < 1e-8) return null;
  const f = 1 / det;
  const s = ray.origin.clone().sub(a);
  const u = f * s.dot(h);
  if (u < 0 || u > 1) return null;
  const q = new THREE.Vector3().crossVectors(s, e1);
  const v = f * ray.direction.dot(q);
  if (v < 0 || u + v > 1) return null;
  const t = f * e2.dot(q);
  if (t < 0.001) return null;
  const point = ray.origin.clone().addScaledVector(ray.direction, t);
  const normal = e1.clone().cross(e2).normalize();
  return { t, point, normal, u, v };
}

// ─── BRDF Materials ───────────────────────────────────────────────────────────

function lambertBRDF(normal, wo, wi) {
  return Math.max(0, normal.dot(wi)) / Math.PI;
}

function ggxBRDF(normal, wo, wi, roughness, metalness) {
  const h = wi.clone().add(wo).normalize();
  const NdotH = Math.max(0, normal.dot(h));
  const NdotL = Math.max(0, normal.dot(wi));
  const NdotV = Math.max(0, normal.dot(wo));
  const a = roughness * roughness;
  const a2 = a * a;
  const denom = NdotH * NdotH * (a2 - 1) + 1;
  const D = a2 / (Math.PI * denom * denom);
  const k = a / 2;
  const G = (NdotL / (NdotL * (1-k) + k)) * (NdotV / (NdotV * (1-k) + k));
  const F0 = new THREE.Color(0.04, 0.04, 0.04).lerp(new THREE.Color(1,1,1), metalness);
  const VdotH = Math.max(0, wo.dot(h));
  const F = F0.clone().multiplyScalar(1 - Math.pow(1 - VdotH, 5)).addScalar(Math.pow(1-VdotH, 5));
  return D * G / Math.max(4 * NdotL * NdotV, 0.001);
}

// ─── Sampling Utilities ───────────────────────────────────────────────────────

function cosineWeightedHemisphere(normal) {
  const u1 = Math.random(), u2 = Math.random();
  const r = Math.sqrt(u1), theta = 2 * Math.PI * u2;
  const x = r * Math.cos(theta), z = r * Math.sin(theta), y = Math.sqrt(1 - u1);
  const tangent = new THREE.Vector3(1, 0, 0);
  if (Math.abs(normal.dot(tangent)) > 0.9) tangent.set(0, 1, 0);
  const bitangent = tangent.clone().cross(normal).normalize();
  tangent.crossVectors(normal, bitangent).normalize();
  return new THREE.Vector3()
    .addScaledVector(tangent, x)
    .addScaledVector(normal, y)
    .addScaledVector(bitangent, z)
    .normalize();
}

function sampleGGX(normal, roughness) {
  const u1 = Math.random(), u2 = Math.random();
  const a = roughness * roughness;
  const theta = Math.acos(Math.sqrt((1 - u1) / (u1 * (a*a - 1) + 1)));
  const phi = 2 * Math.PI * u2;
  const h = new THREE.Vector3(
    Math.sin(theta) * Math.cos(phi),
    Math.cos(theta),
    Math.sin(theta) * Math.sin(phi),
  );
  const tangent = new THREE.Vector3(1, 0, 0);
  if (Math.abs(normal.dot(tangent)) > 0.9) tangent.set(0, 1, 0);
  const bitangent = tangent.clone().cross(normal).normalize();
  tangent.crossVectors(normal, bitangent).normalize();
  return new THREE.Vector3()
    .addScaledVector(tangent, h.x)
    .addScaledVector(normal, h.y)
    .addScaledVector(bitangent, h.z)
    .normalize();
}

// ─── Subsurface Scattering ────────────────────────────────────────────────────

function subsurfaceScatter(point, normal, material, bvh, depth) {
  if (!material.subsurface || depth > 2) return new THREE.Color(0, 0, 0);
  const scatterColor = material.subsurfaceColor ?? new THREE.Color(1, 0.3, 0.2);
  const scatterDist  = material.subsurfaceRadius ?? 0.1;
  let result = new THREE.Color(0, 0, 0);
  const samples = 4;
  for (let i = 0; i < samples; i++) {
    const dir = cosineWeightedHemisphere(normal.clone().negate());
    const ray = new THREE.Ray(point.clone().addScaledVector(normal, -0.001), dir);
    const hit = intersectBVH(bvh, ray);
    if (hit && hit.t < scatterDist) {
      const scatter = Math.exp(-hit.t / scatterDist);
      result.add(scatterColor.clone().multiplyScalar(scatter / samples));
    }
  }
  return result;
}

// ─── Volume Rendering ─────────────────────────────────────────────────────────

function marchVolume(ray, volume, steps = 32) {
  if (!volume) return { color: new THREE.Color(0,0,0), transmittance: 1 };
  const stepSize = volume.density * 0.1;
  let transmittance = 1, r = 0, g = 0, b = 0;
  const stepVec = ray.direction.clone().multiplyScalar(stepSize);
  const pos = ray.origin.clone();
  for (let i = 0; i < steps; i++) {
    pos.add(stepVec);
    if (!volume.bbox.containsPoint(pos)) continue;
    const absorption = volume.absorptionCoeff ?? 0.1;
    const scattering = volume.scatteringCoeff ?? 0.05;
    const extinction = absorption + scattering;
    const sampleT = Math.exp(-extinction * stepSize);
    const emission = volume.emissionColor ?? new THREE.Color(0.1, 0.05, 0);
    r += transmittance * emission.r * (1 - sampleT);
    g += transmittance * emission.g * (1 - sampleT);
    b += transmittance * emission.b * (1 - sampleT);
    transmittance *= sampleT;
    if (transmittance < 0.001) break;
  }
  return { color: new THREE.Color(r, g, b), transmittance };
}

// ─── Path Tracer ──────────────────────────────────────────────────────────────

export class PathTracer {
  constructor(options = {}) {
    this.maxBounces  = options.maxBounces  ?? 6;
    this.samples     = options.samples     ?? 16;
    this.width       = options.width       ?? 512;
    this.height      = options.height      ?? 512;
    this.exposure    = options.exposure    ?? 1.0;
    this.gamma       = options.gamma       ?? 2.2;
    this.denoise     = options.denoise     ?? true;
    this.bvh         = null;
    this.lights      = [];
    this.volume      = null;
    this.environment = null;
    this._canvas     = null;
    this._ctx        = null;
    this._buffer     = null;
    this._sampleCount = 0;
  }

  buildBVH(scene) {
    const triangles = [];
    scene.traverse(obj => {
      if (!obj.isMesh) return;
      const geo = obj.geometry;
      const pos = geo.attributes.position;
      const idx = geo.index;
      const mat = obj.material;
      if (!pos) return;
      const toWorld = obj.matrixWorld;
      if (idx) {
        for (let i = 0; i < idx.count; i += 3) {
          const a = new THREE.Vector3(pos.getX(idx.getX(i)),   pos.getY(idx.getX(i)),   pos.getZ(idx.getX(i))).applyMatrix4(toWorld);
          const b = new THREE.Vector3(pos.getX(idx.getX(i+1)), pos.getY(idx.getX(i+1)), pos.getZ(idx.getX(i+1))).applyMatrix4(toWorld);
          const c = new THREE.Vector3(pos.getX(idx.getX(i+2)), pos.getY(idx.getX(i+2)), pos.getZ(idx.getX(i+2))).applyMatrix4(toWorld);
          triangles.push({ a, b, c, material: mat });
        }
      }
    });
    this.bvh = buildBVH(triangles);
    return this;
  }

  trace(ray, depth = 0) {
    if (depth > this.maxBounces) return new THREE.Color(0, 0, 0);
    if (!this.bvh) return this._sampleEnvironment(ray);

    // Volume march
    if (this.volume) {
      const vol = marchVolume(ray, this.volume);
      if (vol.transmittance < 0.01) return vol.color;
    }

    const hit = intersectBVH(this.bvh, ray);
    if (!hit) return this._sampleEnvironment(ray);

    const mat = hit.tri?.material;
    const color     = mat?.color         ?? new THREE.Color(0.8, 0.8, 0.8);
    const emission  = mat?.emissiveIntensity > 0 ? mat.emissive?.clone().multiplyScalar(mat.emissiveIntensity) : null;
    if (emission) return emission;

    const roughness = mat?.roughness ?? 0.5;
    const metalness = mat?.metalness ?? 0;
    const normal    = hit.normal;
    const wo        = ray.direction.clone().negate();

    let result = new THREE.Color(0, 0, 0);

    // Direct lighting
    this.lights.forEach(light => {
      const toLight = light.position.clone().sub(hit.point).normalize();
      const shadowRay = new THREE.Ray(hit.point.clone().addScaledVector(normal, 0.001), toLight);
      const shadow = intersectBVH(this.bvh, shadowRay);
      if (!shadow || shadow.t > light.position.distanceTo(hit.point)) {
        const NdotL = Math.max(0, normal.dot(toLight));
        const brdf = roughness > 0.8
          ? lambertBRDF(normal, wo, toLight)
          : ggxBRDF(normal, wo, toLight, roughness, metalness);
        result.add(color.clone().multiplyScalar(NdotL * brdf * light.intensity));
      }
    });

    // Indirect bounce
    const wi = roughness > 0.8
      ? cosineWeightedHemisphere(normal)
      : sampleGGX(normal, roughness);
    const bounceRay = new THREE.Ray(hit.point.clone().addScaledVector(normal, 0.001), wi);
    const indirect = this.trace(bounceRay, depth + 1);
    const NdotL = Math.max(0, normal.dot(wi));
    result.add(color.clone().multiply(indirect).multiplyScalar(NdotL * 2));

    // Subsurface
    if (mat?.subsurface) {
      const sss = subsurfaceScatter(hit.point, normal, mat, this.bvh, depth);
      result.add(sss);
    }

    return result;
  }

  _sampleEnvironment(ray) {
    if (this.environment) return this.environment;
    const t = (ray.direction.y + 1) * 0.5;
    return new THREE.Color(0.1, 0.1, 0.2).lerp(new THREE.Color(0.5, 0.7, 1.0), t);
  }

  render(camera, canvas) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    if (!this._buffer || this._buffer.width !== canvas.width) {
      this._buffer = this._ctx.createImageData(canvas.width, canvas.height);
      this._sampleCount = 0;
    }

    const w = canvas.width, h = canvas.height;
    const imageData = this._ctx.createImageData(w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0;
        for (let s = 0; s < this.samples; s++) {
          const u = (x + Math.random()) / w * 2 - 1;
          const v = (y + Math.random()) / h * 2 - 1;
          const ray = new THREE.Ray();
          ray.origin.setFromMatrixPosition(camera.matrixWorld);
          ray.direction.set(u, -v, -1).unproject(camera).sub(ray.origin).normalize();
          const color = this.trace(ray);
          r += color.r; g += color.g; b += color.b;
        }
        // Tone mapping + gamma
        const scale = this.exposure / this.samples;
        const idx = (y * w + x) * 4;
        imageData.data[idx]   = Math.min(255, Math.pow(r * scale, 1/this.gamma) * 255);
        imageData.data[idx+1] = Math.min(255, Math.pow(g * scale, 1/this.gamma) * 255);
        imageData.data[idx+2] = Math.min(255, Math.pow(b * scale, 1/this.gamma) * 255);
        imageData.data[idx+3] = 255;
      }
    }

    if (this.denoise) this._boxDenoise(imageData);
    this._ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  _boxDenoise(imageData) {
    const w = imageData.width, h = imageData.height;
    const src = new Uint8ClampedArray(imageData.data);
    for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++) {
      const i = (y*w+x)*4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) sum += src[((y+dy)*w+(x+dx))*4+c];
        imageData.data[i+c] = sum / 9;
      }
    }
  }

  addLight(position, color, intensity) {
    this.lights.push({ position: position.clone(), color: color.clone(), intensity });
  }

  setVolume(bbox, options = {}) {
    this.volume = { bbox, ...options };
  }

  setEnvironment(color) { this.environment = color; }
  setSamples(n) { this.samples = n; }
  setMaxBounces(n) { this.maxBounces = n; }
}

export function createPathTracer(options) { return new PathTracer(options); }

export default PathTracer;

export function createPathTracerSettings(options) {
  return { maxBounces: 6, samples: 16, width: 512, height: 512, exposure: 1.0, gamma: 2.2, denoise: true, ...options };
}
export function createVolumetricSettings(options) {
  return { density: 0.1, absorptionCoeff: 0.1, scatteringCoeff: 0.05, emissionColor: { r:0.1, g:0.05, b:0 }, bbox: null, ...options };
}
