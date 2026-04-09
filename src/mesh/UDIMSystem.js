import * as THREE from "three";

// UDIM tile addressing: tile 1001 = U[0,1] V[0,1], 1002 = U[1,2] V[0,1], etc.
// Row of 10 tiles per V unit: tile = 1001 + uIndex + vIndex * 10

export const UDIM_GRID = { tilesU: 10, tilesV: 10, maxTiles: 100 };

export function udimTileFromUV(u, v) {
  const uIdx = Math.floor(u);
  const vIdx = Math.floor(v);
  return 1001 + uIdx + vIdx * 10;
}

export function uvToUDIMLocal(u, v) {
  return { u: u % 1, v: v % 1, tile: udimTileFromUV(u, v) };
}

export function udimTileToUVOffset(tile) {
  const idx  = tile - 1001;
  const uIdx = idx % 10;
  const vIdx = Math.floor(idx / 10);
  return { uOffset: uIdx, vOffset: vIdx };
}

export function createUDIMLayout(tileCount = 4) {
  const tiles = [];
  for (let i = 0; i < tileCount; i++) {
    const uIdx = i % 10;
    const vIdx = Math.floor(i / 10);
    tiles.push({
      id:      1001 + i,
      uOffset: uIdx,
      vOffset: vIdx,
      uRange:  [uIdx, uIdx + 1],
      vRange:  [vIdx, vIdx + 1],
      texture: null,
      canvas:  null,
      dirty:   false,
    });
  }
  return { tiles, tileCount, activeTextures: new Map() };
}

export function createUDIMTileCanvas(tile, width = 1024, height = 1024) {
  const canvas  = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx     = canvas.getContext("2d");
  ctx.fillStyle = "#222222";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#00ffc820";
  ctx.font      = "bold 48px monospace";
  ctx.fillText(`UDIM ${tile.id}`, 20, 60);
  tile.canvas = canvas;
  tile.texture = new THREE.CanvasTexture(canvas);
  return tile;
}

export function initUDIMLayout(layout, width = 1024, height = 1024) {
  for (const tile of layout.tiles) createUDIMTileCanvas(tile, width, height);
  return layout;
}

export function getUDIMTile(layout, tileId) {
  return layout.tiles.find(t => t.id === tileId) || null;
}

export function getUDIMTileFromUV(layout, u, v) {
  const id = udimTileFromUV(u, v);
  return getUDIMTile(layout, id);
}

export function paintUDIM(layout, u, v, opts = {}) {
  const { color = "#ff0000", radius = 20, opacity = 1.0 } = opts;
  const tile = getUDIMTileFromUV(layout, u, v);
  if (!tile?.canvas) return;
  const ctx  = tile.canvas.getContext("2d");
  const w    = tile.canvas.width;
  const h    = tile.canvas.height;
  const lu   = (u % 1) * w;
  const lv   = (1 - (v % 1)) * h;
  ctx.globalAlpha = opacity;
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.arc(lu, lv, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  tile.dirty = true;
  if (tile.texture) tile.texture.needsUpdate = true;
}

export function fillUDIMTile(layout, tileId, color = "#888888") {
  const tile = getUDIMTile(layout, tileId);
  if (!tile?.canvas) return;
  const ctx = tile.canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, tile.canvas.width, tile.canvas.height);
  tile.dirty = true;
  if (tile.texture) tile.texture.needsUpdate = true;
}

export function exportUDIMTile(layout, tileId, format = "image/png") {
  const tile = getUDIMTile(layout, tileId);
  if (!tile?.canvas) return null;
  return tile.canvas.toDataURL(format);
}

export function exportAllUDIMTiles(layout, format = "image/png") {
  return layout.tiles.map(t => ({
    id:  t.id,
    url: t.canvas ? t.canvas.toDataURL(format) : null,
  }));
}

export function applyUDIMToMaterial(material, layout) {
  if (!layout.tiles.length) return material;
  const first = layout.tiles[0];
  if (first?.texture) {
    material.map = first.texture;
    material.needsUpdate = true;
  }
  material._udimLayout = layout;
  return material;
}

export function applyUDIMTileToMaterial(material, layout, tileId) {
  const tile = getUDIMTile(layout, tileId);
  if (tile?.texture) {
    material.map = tile.texture;
    material.needsUpdate = true;
  }
  return material;
}

export function remapUVsToUDIM(geometry, tileAssignments = []) {
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  for (const { faceStart, faceEnd, tile } of tileAssignments) {
    const { uOffset, vOffset } = udimTileToUVOffset(tile);
    for (let i = faceStart * 3; i < faceEnd * 3; i++) {
      const u = uv.getX(i) + uOffset;
      const v = uv.getY(i) + vOffset;
      uv.setXY(i, u, v);
    }
  }
  uv.needsUpdate = true;
  return geometry;
}

export function buildUDIMAtlas(layout, atlasWidth = 4096, atlasHeight = 4096) {
  const canvas  = document.createElement("canvas");
  canvas.width  = atlasWidth;
  canvas.height = atlasHeight;
  const ctx     = canvas.getContext("2d");
  const tileW   = atlasWidth  / 10;
  const tileH   = atlasHeight / 10;
  for (const tile of layout.tiles) {
    if (!tile.canvas) continue;
    const { uOffset, vOffset } = udimTileToUVOffset(tile.id);
    ctx.drawImage(tile.canvas, uOffset * tileW, vOffset * tileH, tileW, tileH);
  }
  return { canvas, texture: new THREE.CanvasTexture(canvas) };
}

export function getUDIMStats(layout) {
  return {
    tiles:         layout.tileCount,
    initialized:   layout.tiles.filter(t => t.canvas).length,
    dirty:         layout.tiles.filter(t => t.dirty).length,
    tileIds:       layout.tiles.map(t => t.id),
  };
}
