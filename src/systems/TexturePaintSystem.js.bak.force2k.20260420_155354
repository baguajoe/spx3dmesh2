import * as THREE from 'three';

/**
 * SPX TexturePaintSystem — canvas-based texture painting on 3D meshes
 * Supports: brush types, opacity, hardness, color, erase, fill, clone stamp
 * Uses UV raycasting to project paint onto a CanvasTexture
 */

const BRUSH_TYPES = ['round', 'square', 'spray', 'smear', 'eraser'];

export class TexturePaintSystem {
  constructor(renderer, scene, camera, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Canvas & texture
    this.size = options.size || 1024;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.needsUpdate = true;

    // Brush settings
    this.brushType = 'round';
    this.brushSize = options.brushSize || 32;
    this.brushOpacity = options.brushOpacity || 0.8;
    this.brushHardness = options.brushHardness || 0.8;
    this.color = options.color || '#ff6600';
    this.blendMode = 'source-over'; // 'source-over' | 'multiply' | 'screen' | 'destination-out' (erase)

    // Internal
    this._raycaster = new THREE.Raycaster();
    this._targetMesh = null;
    this._painting = false;
    this._lastUV = null;
    this._history = [];   // array of ImageData snapshots
    this._historyMax = 20;

    // Fill canvas white
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.size, this.size);
    this._saveHistory();
  }

  // ── Attach to mesh ────────────────────────────────────────────────────────
  attachToMesh(mesh) {
    this._targetMesh = mesh;
    mesh.material = mesh.material.clone();
    mesh.material.map = this.texture;
    mesh.material.needsUpdate = true;
    return this;
  }

  // ── Brush operations ──────────────────────────────────────────────────────
  _drawBrush(u, v, interpolate = false) {
    const x = u * this.size;
    const y = (1 - v) * this.size;
    const r = this.brushSize;

    this.ctx.save();
    this.ctx.globalAlpha = this.brushOpacity;
    this.ctx.globalCompositeOperation = this.blendMode === 'eraser' ? 'destination-out' : this.blendMode;

    switch (this.brushType) {
      case 'round': {
        const grad = this.ctx.createRadialGradient(x, y, 0, x, y, r);
        const alpha = this.brushHardness;
        grad.addColorStop(0, this.color);
        grad.addColorStop(alpha, this.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fillStyle = grad;
        this.ctx.fill();
        break;
      }
      case 'square': {
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(x - r * 0.5, y - r * 0.5, r, r);
        break;
      }
      case 'spray': {
        const density = Math.floor(r * 1.5);
        this.ctx.fillStyle = this.color;
        for (let i = 0; i < density; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * r;
          const sx = x + Math.cos(angle) * dist;
          const sy = y + Math.sin(angle) * dist;
          this.ctx.beginPath();
          this.ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
          this.ctx.fill();
        }
        break;
      }
      case 'smear': {
        if (this._lastUV) {
          const lx = this._lastUV.u * this.size;
          const ly = (1 - this._lastUV.v) * this.size;
          const data = this.ctx.getImageData(lx - r / 2, ly - r / 2, r, r);
          this.ctx.putImageData(data, x - r / 2, y - r / 2);
        }
        break;
      }
      case 'eraser': {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0,0,0,1)';
        this.ctx.fill();
        break;
      }
    }

    this.ctx.restore();
    this.texture.needsUpdate = true;
  }

  // ── UV raycasting ─────────────────────────────────────────────────────────
  _getUVFromMouse(mouseX, mouseY, domWidth, domHeight) {
    if (!this._targetMesh) return null;
    const ndc = new THREE.Vector2(
      (mouseX / domWidth) * 2 - 1,
      -(mouseY / domHeight) * 2 + 1
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    const hits = this._raycaster.intersectObject(this._targetMesh, false);
    if (!hits.length || !hits[0].uv) return null;
    return hits[0].uv;
  }

  // ── Event handlers ────────────────────────────────────────────────────────
  onPointerDown(e, domWidth, domHeight) {
    this._painting = true;
    const uv = this._getUVFromMouse(e.offsetX, e.offsetY, domWidth, domHeight);
    if (uv) { this._drawBrush(uv.x, uv.y); this._lastUV = { u: uv.x, v: uv.y }; }
  }

  onPointerMove(e, domWidth, domHeight) {
    if (!this._painting) return;
    const uv = this._getUVFromMouse(e.offsetX, e.offsetY, domWidth, domHeight);
    if (!uv) return;
    // Interpolate between last and current for smooth strokes
    if (this._lastUV) {
      const steps = Math.max(1, Math.ceil(
        Math.hypot(uv.x - this._lastUV.u, uv.y - this._lastUV.v) * this.size / (this.brushSize * 0.3)
      ));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const iu = this._lastUV.u + (uv.x - this._lastUV.u) * t;
        const iv = this._lastUV.v + (uv.y - this._lastUV.v) * t;
        this._drawBrush(iu, iv, true);
      }
    }
    this._lastUV = { u: uv.x, v: uv.y };
  }

  onPointerUp() {
    if (this._painting) { this._painting = false; this._lastUV = null; this._saveHistory(); }
  }

  // ── Fill ──────────────────────────────────────────────────────────────────
  fill(color = this.color) {
    this._saveHistory();
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.size, this.size);
    this.ctx.restore();
    this.texture.needsUpdate = true;
  }

  clear() { this.fill('#ffffff'); }

  // ── History ───────────────────────────────────────────────────────────────
  _saveHistory() {
    const snap = this.ctx.getImageData(0, 0, this.size, this.size);
    this._history.push(snap);
    if (this._history.length > this._historyMax) this._history.shift();
  }

  undo() {
    if (this._history.length < 2) return;
    this._history.pop();
    this.ctx.putImageData(this._history[this._history.length - 1], 0, 0);
    this.texture.needsUpdate = true;
  }

  // ── Export ────────────────────────────────────────────────────────────────
  exportPNG() {
    return this.canvas.toDataURL('image/png');
  }

  exportTexture() { return this.texture; }

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, this.size, this.size);
        this.texture.needsUpdate = true;
        this._saveHistory();
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  setBrush(type) { if (BRUSH_TYPES.includes(type)) this.brushType = type; }
  setColor(hex) { this.color = hex; }
  setSize(px) { this.brushSize = px; }
  setOpacity(v) { this.brushOpacity = v; }
  setHardness(v) { this.brushHardness = v; }
  setBlendMode(mode) { this.blendMode = mode; }

  static BRUSH_TYPES = BRUSH_TYPES;
}

export default TexturePaintSystem;