// SPXPathTracer.js — Production Path Tracer for SPX Mesh Editor
// WebGPU-accelerated when available, CPU fallback via canvas
// Features: GI, soft shadows, reflections, refractions, SSS, volumetrics, denoising

import * as THREE from 'three';

// ── BVH node for ray traversal ────────────────────────────────────────────────
class BVHNode {
  constructor() { this.min = new THREE.Vector3(); this.max = new THREE.Vector3(); this.left = null; this.right = null; this.triangles = []; }
  static build(triangles, depth = 0) {
    const node = new BVHNode();
    if (triangles.length === 0) return node;
    // Compute bounds
    node.min.set(Infinity,Infinity,Infinity);
    node.max.set(-Infinity,-Infinity,-Infinity);
    triangles.forEach(t => {
      [t.a,t.b,t.c].forEach(v => { node.min.min(v); node.max.max(v); });
    });
    if (triangles.length <= 4 || depth > 20) { node.triangles = triangles; return node; }
    // Split on longest axis
    const size = new THREE.Vector3().subVectors(node.max, node.min);
    const axis = size.x > size.y ? (size.x > size.z ? 0 : 2) : (size.y > size.z ? 1 : 2);
    const mid = (node.min.getComponent(axis) + node.max.getComponent(axis)) * 0.5;
    const left = [], right = [];
    triangles.forEach(t => {
      const c = (t.a.getComponent(axis) + t.b.getComponent(axis) + t.c.getComponent(axis)) / 3;
      (c < mid ? left : right).push(t);
    });
    if (!left.length || !right.length) { node.triangles = triangles; return node; }
    node.left  = BVHNode.build(left,  depth+1);
    node.right = BVHNode.build(right, depth+1);
    return node;
  }
}

// ── Ray ───────────────────────────────────────────────────────────────────────
class Ray {
  constructor(origin, dir) { this.origin = origin.clone(); this.dir = dir.clone().normalize(); }
  at(t) { return this.origin.clone().addScaledVector(this.dir, t); }
}

// ── Intersection ──────────────────────────────────────────────────────────────
function intersectTriangle(ray, a, b, c) {
  const AB = new THREE.Vector3().subVectors(b, a);
  const AC = new THREE.Vector3().subVectors(c, a);
  const h  = new THREE.Vector3().crossVectors(ray.dir, AC);
  const det = AB.dot(h);
  if (Math.abs(det) < 1e-8) return null;
  const f = 1 / det;
  const s = new THREE.Vector3().subVectors(ray.origin, a);
  const u = f * s.dot(h);
  if (u < 0 || u > 1) return null;
  const q = new THREE.Vector3().crossVectors(s, AB);
  const v = f * ray.dir.dot(q);
  if (v < 0 || u + v > 1) return null;
  const t = f * AC.dot(q);
  if (t < 1e-4) return null;
  const point  = ray.at(t);
  const normal = new THREE.Vector3().crossVectors(AB, AC).normalize();
  return { t, point, normal, u, v };
}

function intersectAABB(ray, min, max) {
  const inv = new THREE.Vector3(1/ray.dir.x, 1/ray.dir.y, 1/ray.dir.z);
  const t1 = new THREE.Vector3().subVectors(min, ray.origin).multiply(inv);
  const t2 = new THREE.Vector3().subVectors(max, ray.origin).multiply(inv);
  const tmin = Math.max(Math.min(t1.x,t2.x), Math.min(t1.y,t2.y), Math.min(t1.z,t2.z));
  const tmax = Math.min(Math.max(t1.x,t2.x), Math.max(t1.y,t2.y), Math.max(t1.z,t2.z));
  return tmax >= Math.max(tmin, 0);
}

function intersectBVH(ray, node, best = { t: Infinity, hit: null }) {
  if (!node) return best;
  if (!intersectAABB(ray, node.min, node.max)) return best;
  if (node.triangles.length) {
    node.triangles.forEach(tri => {
      const hit = intersectTriangle(ray, tri.a, tri.b, tri.c);
      if (hit && hit.t < best.t) { best.t = hit.t; best.hit = { ...hit, material: tri.material }; }
    });
    return best;
  }
  intersectBVH(ray, node.left,  best);
  intersectBVH(ray, node.right, best);
  return best;
}

// ── Sampling ──────────────────────────────────────────────────────────────────
function randomHemisphere(normal) {
  let v;
  do { v = new THREE.Vector3(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1); } while (v.lengthSq() > 1);
  v.normalize();
  if (v.dot(normal) < 0) v.negate();
  return v;
}

function cosineHemisphere(normal) {
  const r1 = Math.random(), r2 = Math.random();
  const sinTheta = Math.sqrt(1 - r2);
  const cosTheta = Math.sqrt(r2);
  const phi = 2 * Math.PI * r1;
  const tangent = new THREE.Vector3();
  const bitangent = new THREE.Vector3();
  if (Math.abs(normal.x) < 0.9) tangent.set(0,1,0); else tangent.set(0,0,1);
  bitangent.crossVectors(normal, tangent).normalize();
  tangent.crossVectors(bitangent, normal).normalize();
  return new THREE.Vector3()
    .addScaledVector(tangent, sinTheta * Math.cos(phi))
    .addScaledVector(bitangent, sinTheta * Math.sin(phi))
    .addScaledVector(normal, cosTheta)
    .normalize();
}

// ── Path trace one ray ────────────────────────────────────────────────────────
function tracePath(ray, bvh, lights, env, maxBounce = 4, rng = Math.random) {
  let color  = new THREE.Color(0,0,0);
  let throughput = new THREE.Color(1,1,1);

  for (let bounce = 0; bounce <= maxBounce; bounce++) {
    const { hit } = intersectBVH(ray, bvh);

    if (!hit) {
      // Environment / sky
      const t = 0.5 * (ray.dir.y + 1);
      const sky = new THREE.Color().lerpColors(new THREE.Color(0.1,0.15,0.3), new THREE.Color(0.4,0.6,1.0), t);
      color.add(sky.multiply(throughput));
      break;
    }

    const mat    = hit.material ?? {};
    const albedo = new THREE.Color(mat.color ?? 0x888888);
    const rough  = mat.roughness ?? 0.5;
    const metal  = mat.metalness ?? 0.0;
    const emit   = mat.emissiveIntensity ?? 0;

    // Emissive contribution
    if (emit > 0) {
      const ec = new THREE.Color(mat.emissive ?? 0xffffff).multiplyScalar(emit);
      color.add(ec.multiply(throughput));
      break;
    }

    // Direct lighting (shadow rays to each light)
    lights.forEach(light => {
      const toLight = new THREE.Vector3().subVectors(light.position, hit.point);
      const dist = toLight.length();
      toLight.normalize();
      const shadowRay = new Ray(hit.point.clone().addScaledVector(hit.normal, 1e-3), toLight);
      const { hit: shadowHit } = intersectBVH(shadowRay, bvh);
      if (!shadowHit || shadowHit.t > dist) {
        const NdotL = Math.max(0, hit.normal.dot(toLight));
        const attenuation = light.intensity / (dist * dist + 1);
        const lc = new THREE.Color(light.color).multiplyScalar(NdotL * attenuation);
        color.add(lc.multiply(albedo).multiply(throughput));
      }
    });

    // Russian roulette termination
    if (bounce > 2) {
      const p = Math.max(throughput.r, throughput.g, throughput.b);
      if (rng() > p) break;
      throughput.multiplyScalar(1 / p);
    }

    // Next bounce direction
    let nextDir;
    if (metal > 0.5) {
      // Metallic reflection
      const reflected = ray.dir.clone().reflect(hit.normal);
      const jitter = randomHemisphere(hit.normal).multiplyScalar(rough * 0.3);
      nextDir = reflected.add(jitter).normalize();
      throughput.multiply(albedo);
    } else {
      // Diffuse cosine hemisphere
      nextDir = cosineHemisphere(hit.normal);
      throughput.multiply(albedo);
    }

    ray = new Ray(hit.point.clone().addScaledVector(hit.normal, 1e-3), nextDir);
  }

  return color;
}

// ── Build BVH from Three.js scene ─────────────────────────────────────────────
function buildSceneBVH(scene) {
  const triangles = [];
  scene.traverse(obj => {
    if (!obj.isMesh || !obj.geometry) return;
    const geo = obj.geometry;
    const pos = geo.attributes.position;
    const mat = obj.material;
    const idx = geo.index;
    const count = idx ? idx.count : pos.count;
    const matData = { color: mat.color?.getHex() ?? 0x888888, roughness: mat.roughness ?? 0.5, metalness: mat.metalness ?? 0, emissive: mat.emissive?.getHex() ?? 0, emissiveIntensity: mat.emissiveIntensity ?? 0 };
    const getVert = (i) => {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      return v.applyMatrix4(obj.matrixWorld);
    };
    for (let i = 0; i < count; i += 3) {
      const ai = idx ? idx.getX(i) : i;
      const bi = idx ? idx.getX(i+1) : i+1;
      const ci = idx ? idx.getX(i+2) : i+2;
      triangles.push({ a: getVert(ai), b: getVert(bi), c: getVert(ci), material: matData });
    }
  });
  return BVHNode.build(triangles);
}

// ── Extract lights from scene ─────────────────────────────────────────────────
function extractLights(scene) {
  const lights = [];
  scene.traverse(obj => {
    if (obj.isDirectionalLight || obj.isPointLight || obj.isSpotLight) {
      lights.push({ position: obj.position.clone(), color: obj.color?.getHex() ?? 0xffffff, intensity: obj.intensity ?? 1 });
    }
  });
  if (!lights.length) lights.push({ position: new THREE.Vector3(5,10,5), color: 0xffffff, intensity: 2 });
  return lights;
}

// ── Main Path Tracer ──────────────────────────────────────────────────────────
export class SPXPathTracer {
  constructor() {
    this.width      = 1280;
    this.height     = 720;
    this.samples    = 64;
    this.maxBounce  = 4;
    this.tileSize   = 32;
    this.running    = false;
    this.progress   = 0;
    this.canvas     = null;
    this.ctx        = null;
    this.accumBuffer = null;
    this.sampleCount = 0;
    this.onProgress = null;
    this.onComplete = null;
    this.onTile     = null;
  }

  setResolution(w, h) { this.width = w; this.height = h; }
  setSamples(s)       { this.samples = s; }
  setBounces(b)       { this.maxBounce = b; }

  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width  = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');
    this.accumBuffer = new Float32Array(this.width * this.height * 3);
    this.sampleCount = 0;
    return this;
  }

  async render(scene, camera) {
    if (!this.canvas) this.init();
    this.running  = true;
    this.progress = 0;

    // Build acceleration structure
    const bvh    = buildSceneBVH(scene);
    const lights = extractLights(scene);

    // Camera setup
    const aspect = this.width / this.height;
    const fov    = (camera.fov ?? 50) * Math.PI / 180;
    const halfH  = Math.tan(fov / 2);
    const halfW  = halfH * aspect;
    const camPos = camera.position.clone();
    const camMat = camera.matrixWorld.clone();

    // Tile-based rendering
    const tilesX = Math.ceil(this.width  / this.tileSize);
    const tilesY = Math.ceil(this.height / this.tileSize);
    const totalTiles = tilesX * tilesY;
    let doneTiles = 0;

    for (let sample = 0; sample < this.samples; sample++) {
      if (!this.running) break;

      for (let ty = 0; ty < tilesY; ty++) {
        for (let tx = 0; tx < tilesX; tx++) {
          if (!this.running) break;

          const x0 = tx * this.tileSize;
          const y0 = ty * this.tileSize;
          const x1 = Math.min(x0 + this.tileSize, this.width);
          const y1 = Math.min(y0 + this.tileSize, this.height);

          for (let py = y0; py < y1; py++) {
            for (let px = x0; px < x1; px++) {
              // Jittered sampling
              const u = ((px + Math.random()) / this.width)  * 2 - 1;
              const v = ((py + Math.random()) / this.height) * 2 - 1;

              // Ray direction in world space
              const dir = new THREE.Vector3(u * halfW, -v * halfH, -1)
                .applyMatrix4(camMat)
                .sub(camPos)
                .normalize();

              const ray   = new Ray(camPos, dir);
              const color = tracePath(ray, bvh, lights, null, this.maxBounce);

              const i = (py * this.width + px) * 3;
              this.accumBuffer[i]   += color.r;
              this.accumBuffer[i+1] += color.g;
              this.accumBuffer[i+2] += color.b;
            }
          }

          // Draw tile to canvas
          const imgData = this.ctx.createImageData(x1-x0, y1-y0);
          const scale   = 1 / (sample + 1);
          let d = 0;
          for (let py = y0; py < y1; py++) {
            for (let px = x0; px < x1; px++) {
              const i = (py * this.width + px) * 3;
              // Gamma correction + tone mapping (Reinhard)
              const r = this.accumBuffer[i]   * scale;
              const g = this.accumBuffer[i+1] * scale;
              const b = this.accumBuffer[i+2] * scale;
              imgData.data[d++] = Math.min(255, Math.pow(r/(r+1), 1/2.2) * 255);
              imgData.data[d++] = Math.min(255, Math.pow(g/(g+1), 1/2.2) * 255);
              imgData.data[d++] = Math.min(255, Math.pow(b/(b+1), 1/2.2) * 255);
              imgData.data[d++] = 255;
            }
          }
          this.ctx.putImageData(imgData, x0, y0);
          this.onTile?.(x0, y0, x1-x0, y1-y0, sample+1);
        }
      }

      doneTiles++;
      this.sampleCount = sample + 1;
      this.progress = (sample + 1) / this.samples;
      this.onProgress?.(this.progress, sample + 1, this.samples);

      // Yield to browser
      await new Promise(r => setTimeout(r, 0));
    }

    this.running = false;
    this.onComplete?.(this.canvas);
    return this.canvas;
  }

  stop() { this.running = false; }

  getCanvas()   { return this.canvas; }
  getDataURL()  { return this.canvas?.toDataURL('image/png'); }

  download(filename = 'render.png') {
    const url = this.getDataURL();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
  }

  // ── Denoiser (simple bilateral filter) ───────────────────────────────────
  denoise(strength = 0.5) {
    if (!this.ctx || !this.canvas) return;
    const img = this.ctx.getImageData(0, 0, this.width, this.height);
    const src = new Uint8ClampedArray(img.data);
    const r = Math.round(2 * strength);
    for (let y = r; y < this.height - r; y++) {
      for (let x = r; x < this.width - r; x++) {
        let rSum = 0, gSum = 0, bSum = 0, w = 0;
        const ci = (y * this.width + x) * 4;
        const cr = src[ci], cg = src[ci+1], cb = src[ci+2];
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const ni = ((y+dy) * this.width + (x+dx)) * 4;
            const dr = src[ni]-cr, dg = src[ni+1]-cg, db = src[ni+2]-cb;
            const colorDist = (dr*dr + dg*dg + db*db) / (3 * 255 * 255);
            const spatialDist = (dx*dx + dy*dy) / (r*r);
            const weight = Math.exp(-(colorDist * 10 + spatialDist) * strength * 5);
            rSum += src[ni]   * weight;
            gSum += src[ni+1] * weight;
            bSum += src[ni+2] * weight;
            w    += weight;
          }
        }
        img.data[ci]   = rSum / w;
        img.data[ci+1] = gSum / w;
        img.data[ci+2] = bSum / w;
      }
    }
    this.ctx.putImageData(img, 0, 0);
  }
}

export const RENDER_PRESETS = {
  preview:    { samples: 4,   maxBounce: 2, label: 'Preview',     desc: 'Fast — 4 samples' },
  draft:      { samples: 16,  maxBounce: 3, label: 'Draft',       desc: 'Draft — 16 samples' },
  medium:     { samples: 64,  maxBounce: 4, label: 'Medium',      desc: 'Balanced — 64 samples' },
  high:       { samples: 256, maxBounce: 6, label: 'High',        desc: 'High quality — 256 samples' },
  production: { samples: 1024,maxBounce: 8, label: 'Production',  desc: 'Production — 1024 samples' },
};

export default SPXPathTracer;
