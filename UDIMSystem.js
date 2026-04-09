// UDIMSystem.js — Full UDIM texture tile system (Maya/Substance standard)
// UDIM tile addressing: tile 1001 = U[0,1] V[0,1], 1002 = U[1,2] V[0,1], etc.
import * as THREE from 'three';

export const UDIM_GRID = { tilesU: 10, tilesV: 10, maxTiles: 100 };

export function udimTileFromUV(u, v) {
  const tU = Math.floor(u);
  const tV = Math.floor(v);
  return 1001 + tU + tV * 10;
}

export function uvToUDIMLocal(u, v) {
  return { u: u % 1, v: v % 1, tile: udimTileFromUV(u, v) };
}

// ── UDIM Texture Set ───────────────────────────────────────────────────────────
export class UDIMTextureSet {
  constructor() {
    this.tiles   = new Map(); // tileId -> { albedo, normal, roughness, metalness, ao }
    this.loader  = new THREE.TextureLoader();
  }

  // Load a single tile texture map
  async loadTile(tileId, channel, url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, (tex) => {
        tex.colorSpace = channel === 'albedo' ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
        tex.flipY = false;
        if (!this.tiles.has(tileId)) this.tiles.set(tileId, {});
        this.tiles.get(tileId)[channel] = tex;
        resolve(tex);
      }, undefined, reject);
    });
  }

  // Load all channels for a tile from a naming convention
  // e.g. base = "textures/mesh" -> mesh_1001_albedo.png, mesh_1001_normal.png etc.
  async loadTileAuto(tileId, basePath, channels = ['albedo','normal','roughness','metalness','ao']) {
    const promises = channels.map(ch => {
      const url = `${basePath}_${tileId}_${ch}.png`;
      return this.loadTile(tileId, ch, url).catch(() => null);
    });
    await Promise.all(promises);
    return this.tiles.get(tileId);
  }

  // Load multiple tiles at once
  async loadRange(startTile, endTile, basePath, channels) {
    const promises = [];
    for (let t = startTile; t <= endTile; t++) {
      promises.push(this.loadTileAuto(t, basePath, channels));
    }
    await Promise.all(promises);
  }

  getTile(tileId) { return this.tiles.get(tileId) ?? null; }
  hasTile(tileId) { return this.tiles.has(tileId); }
  listTiles()     { return Array.from(this.tiles.keys()); }

  // Get texture for a UV coordinate
  getTextureAtUV(u, v, channel = 'albedo') {
    const tileId = udimTileFromUV(u, v);
    return this.tiles.get(tileId)?.[channel] ?? null;
  }

  dispose() {
    this.tiles.forEach(tile => {
      Object.values(tile).forEach(tex => tex?.dispose?.());
    });
    this.tiles.clear();
  }
}

// ── UDIM Material ─────────────────────────────────────────────────────────────
// Creates a ShaderMaterial that samples the correct UDIM tile based on UV
export function createUDIMMaterial(textureSet, tileIds = [1001]) {
  // For WebGL, we use a texture array approach
  // Each tile becomes a layer, UV selects the layer
  const uniforms = {};
  tileIds.forEach(id => {
    const tile = textureSet.getTile(id);
    if (!tile) return;
    const idx = id - 1001;
    if (tile.albedo)    uniforms[`uAlbedo_${idx}`]    = { value: tile.albedo    };
    if (tile.normal)    uniforms[`uNormal_${idx}`]    = { value: tile.normal    };
    if (tile.roughness) uniforms[`uRoughness_${idx}`] = { value: tile.roughness };
    if (tile.metalness) uniforms[`uMetalness_${idx}`] = { value: tile.metalness };
  });

  const numTiles = tileIds.length;
  // Generate sampling code for each tile
  const tileCode = tileIds.map((id, i) => {
    const idx = id - 1001;
    const tU  = idx % 10;
    const tV  = Math.floor(idx / 10);
    return `if (tileU == ${tU} && tileV == ${tV}) {
      albedo    = texture2D(uAlbedo_${idx}, localUV).rgb;
    }`;
  }).join('\n  ');

  const frag = /* glsl */`
    uniform sampler2D ${tileIds.map((_,i)=>`uAlbedo_${tileIds[i]-1001}`).join(', ')};
    varying vec2 vUv;
    void main() {
      int tileU = int(vUv.x);
      int tileV = int(vUv.y);
      vec2 localUV = fract(vUv);
      vec3 albedo = vec3(0.5);
      ${tileCode}
      gl_FragColor = vec4(albedo, 1.0);
    }
  `;
  const vert = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  return new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag });
}

// ── UDIM UV Layout ─────────────────────────────────────────────────────────────
export function getUDIMLayout(geometry) {
  const uv  = geometry.attributes.uv;
  if (!uv) return [];
  const tiles = new Set();
  for (let i = 0; i < uv.count; i++) {
    tiles.add(udimTileFromUV(uv.getX(i), uv.getY(i)));
  }
  return Array.from(tiles).sort();
}

export function remapUVsToTile(geometry, fromTile, toTile) {
  const uv  = geometry.attributes.uv;
  if (!uv) return;
  const fromU = (fromTile - 1001) % 10;
  const fromV = Math.floor((fromTile - 1001) / 10);
  const toU   = (toTile - 1001) % 10;
  const toV   = Math.floor((toTile - 1001) / 10);
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    if (Math.floor(u) === fromU && Math.floor(v) === fromV) {
      uv.setXY(i, (u - fromU) + toU, (v - fromV) + toV);
    }
  }
  uv.needsUpdate = true;
}

// ── UDIM Bake ─────────────────────────────────────────────────────────────────
export function bakeUDIMTileToCanvas(textureSet, tileId, channel = 'albedo', size = 1024) {
  const tex = textureSet.getTextureAtUV(
    (tileId - 1001) % 10 + 0.5,
    Math.floor((tileId - 1001) / 10) + 0.5,
    channel,
  );
  if (!tex?.image) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(tex.image, 0, 0, size, size);
  return canvas;
}

export function exportUDIMTile(textureSet, tileId, channel = 'albedo') {
  const canvas = bakeUDIMTileToCanvas(textureSet, tileId, channel);
  if (!canvas) return null;
  return canvas.toDataURL('image/png');
}

export default UDIMTextureSet;
