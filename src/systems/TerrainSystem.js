import * as THREE from 'three';

/**
 * SPX TerrainSystem — film-quality heightmap terrain
 * Features: multi-octave noise, erosion passes, texture splatting, LOD, export
 */

// ── Noise utilities ─────────────────────────────────────────────────────────
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + (b - a) * t; }
function grad(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

const PERM = Array.from({ length: 512 }, (_, i) => {
  const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225];
  return p[i & 15] ^ (i & 255);
});

function perlin(x, y, z = 0) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const a = PERM[X] + Y, aa = PERM[a] + Z, ab = PERM[a + 1] + Z;
  const b = PERM[X + 1] + Y, ba = PERM[b] + Z, bb = PERM[b + 1] + Z;
  return lerp(
    lerp(lerp(grad(PERM[aa], x, y, z), grad(PERM[ba], x - 1, y, z), u),
         lerp(grad(PERM[ab], x, y - 1, z), grad(PERM[bb], x - 1, y - 1, z), u), v),
    lerp(lerp(grad(PERM[aa + 1], x, y, z - 1), grad(PERM[ba + 1], x - 1, y, z - 1), u),
         lerp(grad(PERM[ab + 1], x, y - 1, z - 1), grad(PERM[bb + 1], x - 1, y - 1, z - 1), u), v), w
  );
}

function fbm(x, z, octaves = 6, lacunarity = 2.0, gain = 0.5) {
  let value = 0, amplitude = 0.5, frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlin(x * frequency, z * frequency, i * 1.7);
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value;
}

// ── Terrain presets ──────────────────────────────────────────────────────────
const TERRAIN_PRESETS = {
  'Flat Plain':       { scale: 0.5,  octaves: 3, amplitude: 0.3,  ridged: false, seaLevel: -0.5 },
  'Rolling Hills':    { scale: 1.2,  octaves: 5, amplitude: 1.2,  ridged: false, seaLevel: -0.8 },
  'Mountain Range':   { scale: 2.0,  octaves: 8, amplitude: 3.5,  ridged: true,  seaLevel: -1.0 },
  'Canyon':           { scale: 1.5,  octaves: 6, amplitude: 2.5,  ridged: false, seaLevel: -2.0 },
  'Volcanic Island':  { scale: 1.8,  octaves: 7, amplitude: 2.8,  ridged: true,  seaLevel: 0.0  },
  'Coastal':          { scale: 1.0,  octaves: 5, amplitude: 1.5,  ridged: false, seaLevel: 0.1  },
  'Desert Dunes':     { scale: 0.8,  octaves: 4, amplitude: 0.8,  ridged: false, seaLevel: -1.5 },
  'Arctic':           { scale: 1.3,  octaves: 6, amplitude: 1.8,  ridged: false, seaLevel: -0.3 },
};

export class TerrainSystem {
  constructor(options = {}) {
    this.width = options.width || 256;
    this.depth = options.depth || 256;
    this.resolution = options.resolution || 128;
    this.preset = options.preset || 'Rolling Hills';
    this.seed = options.seed || Math.random() * 1000;
    this._heightmap = null;
    this._mesh = null;
    this._group = new THREE.Group();
    this._group.name = 'TerrainSystem';
  }

  generate(preset = this.preset) {
    this.preset = preset;
    const cfg = { ...TERRAIN_PRESETS[preset] };
    const res = this.resolution;
    const W = this.width, D = this.depth;

    // Build heightmap
    const hmap = new Float32Array(res * res);
    for (let z = 0; z < res; z++) {
      for (let x = 0; x < res; x++) {
        const nx = (x / res) * cfg.scale + this.seed;
        const nz = (z / res) * cfg.scale + this.seed * 0.73;
        let h = fbm(nx, nz, cfg.octaves);
        if (cfg.ridged) h = 1 - Math.abs(h) * 1.8;
        hmap[z * res + x] = h * cfg.amplitude;
      }
    }

    // Hydraulic erosion (lightweight pass)
    this._erode(hmap, res, 3);

    this._heightmap = hmap;
    this._buildMesh(hmap, res, W, D, cfg);
    return this;
  }

  _erode(hmap, res, passes) {
    for (let p = 0; p < passes; p++) {
      for (let z = 1; z < res - 1; z++) {
        for (let x = 1; x < res - 1; x++) {
          const i = z * res + x;
          const neighbors = [hmap[(z-1)*res+x], hmap[(z+1)*res+x], hmap[z*res+(x-1)], hmap[z*res+(x+1)]];
          const minH = Math.min(...neighbors);
          if (hmap[i] > minH) {
            const diff = hmap[i] - minH;
            hmap[i] -= diff * 0.08;
          }
        }
      }
    }
  }

  _buildMesh(hmap, res, W, D, cfg) {
    if (this._mesh) { this._group.remove(this._mesh); this._mesh.geometry.dispose(); }

    const geo = new THREE.PlaneGeometry(W, D, res - 1, res - 1);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);

    // Snow color
    const snowCol = new THREE.Color('#e8f0ff');
    const rockCol = new THREE.Color('#5a4a3a');
    const grassCol = new THREE.Color('#2d5a1b');
    const sandCol = new THREE.Color('#c8a96e');
    const waterCol = new THREE.Color('#1a3a5c');

    for (let i = 0; i < pos.count; i++) {
      const h = hmap[i] || 0;
      pos.setY(i, h);

      // Splat texture coloring
      let c;
      const slope = i > 0 ? Math.abs(hmap[i] - hmap[i - 1]) * 5 : 0;
      if (h < cfg.seaLevel) c = waterCol.clone();
      else if (h < cfg.seaLevel + 0.3) c = sandCol.clone();
      else if (slope > 0.5 || h > cfg.amplitude * 0.6) c = rockCol.clone();
      else if (h > cfg.amplitude * 0.8) c = snowCol.clone();
      else c = grassCol.clone().lerp(rockCol, slope * 0.8);

      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    this._mesh = new THREE.Mesh(geo, mat);
    this._mesh.name = 'TerrainMesh';
    this._mesh.receiveShadow = true;
    this._mesh.castShadow = false;
    this._group.add(this._mesh);
  }

  // Sculpt at world position with brush
  sculpt(worldPos, brushType = 'Raise', brushSize = 3, strength = 0.5) {
    if (!this._mesh || !this._heightmap) return;
    const pos = this._mesh.geometry.attributes.position;
    const local = worldPos.clone().applyMatrix4(this._mesh.matrixWorld.clone().invert());
    const res = this.resolution;

    for (let z = 0; z < res; z++) {
      for (let x = 0; x < res; x++) {
        const i = z * res + x;
        const vx = pos.getX(i), vz = pos.getZ(i);
        const dist = Math.hypot(vx - local.x, vz - local.z);
        if (dist > brushSize) continue;
        const falloff = Math.max(0, 1 - (dist / brushSize) ** 2);
        const delta = strength * falloff * 0.05;

        switch (brushType) {
          case 'Raise':   pos.setY(i, pos.getY(i) + delta); break;
          case 'Lower':   pos.setY(i, pos.getY(i) - delta); break;
          case 'Smooth': {
            const neighbors = [
              i - 1 >= 0 ? pos.getY(i - 1) : pos.getY(i),
              i + 1 < pos.count ? pos.getY(i + 1) : pos.getY(i),
            ];
            const avg = neighbors.reduce((s, v) => s + v, 0) / neighbors.length;
            pos.setY(i, pos.getY(i) + (avg - pos.getY(i)) * falloff * 0.3);
            break;
          }
          case 'Flatten': pos.setY(i, pos.getY(i) + (0 - pos.getY(i)) * falloff * 0.1); break;
          case 'Noise':   pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * delta * 2); break;
        }
        this._heightmap[i] = pos.getY(i);
      }
    }
    pos.needsUpdate = true;
    this._mesh.geometry.computeVertexNormals();
  }

  getHeightAt(worldX, worldZ) {
    if (!this._heightmap || !this._mesh) return 0;
    const geo = this._mesh.geometry;
    const pos = geo.attributes.position;
    const res = this.resolution;
    // Find closest vertex
    let minDist = Infinity, h = 0;
    for (let i = 0; i < pos.count; i++) {
      const d = Math.hypot(pos.getX(i) - worldX, pos.getZ(i) - worldZ);
      if (d < minDist) { minDist = d; h = pos.getY(i); }
    }
    return h;
  }

  getGroup() { return this._group; }
  getMesh() { return this._mesh; }

  exportHeightmap() {
    if (!this._heightmap) return null;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.resolution;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(this.resolution, this.resolution);
    const max = Math.max(...this._heightmap), min = Math.min(...this._heightmap);
    for (let i = 0; i < this._heightmap.length; i++) {
      const v = Math.round(((this._heightmap[i] - min) / (max - min)) * 255);
      imgData.data[i * 4] = imgData.data[i * 4 + 1] = imgData.data[i * 4 + 2] = v;
      imgData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  static PRESETS = Object.keys(TERRAIN_PRESETS);
}

export default TerrainSystem;