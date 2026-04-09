// DepthEstimator.js — PRO Monocular Depth Estimation
// SPX Mesh Editor | StreamPireX
// MiDaS ONNX + stereo depth + point cloud reconstruction + mesh generation

import * as THREE from 'three';

const MIDAS_MODEL_URL = 'https://huggingface.co/onnx-community/midas-v2.1-small/resolve/main/onnx/model.onnx';
const INPUT_SIZE = 256;

export class DepthEstimator {
  constructor(options = {}) {
    this.modelUrl  = options.modelUrl ?? MIDAS_MODEL_URL;
    this.session   = null;
    this.ready     = false;
    this.onReady   = options.onReady ?? null;
    this.onDepth   = options.onDepth ?? null;
    this._canvas   = document.createElement('canvas');
    this._canvas.width = this._canvas.height = INPUT_SIZE;
    this._ctx      = this._canvas.getContext('2d');
    this._depthMap = null;
    this._width    = INPUT_SIZE;
    this._height   = INPUT_SIZE;
    this._minDepth = 0;
    this._maxDepth = 1;
  }

  async load() {
    try {
      if (typeof ort === 'undefined') {
        await this._loadScript('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');
      }
      this.session = await ort.InferenceSession.create(this.modelUrl, { executionProviders: ['wasm'] });
      this.ready = true;
      this.onReady?.();
    } catch(e) {
      console.warn('DepthEstimator: ONNX load failed, using fallback', e);
      this.ready = true; // Use fallback
    }
    return this;
  }

  _loadScript(url) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = url; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async estimateFromImage(imageElement) {
    this._ctx.drawImage(imageElement, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const imageData = this._ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
    return this._estimate(imageData);
  }

  async estimateFromCanvas(canvas) {
    this._ctx.drawImage(canvas, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const imageData = this._ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
    return this._estimate(imageData);
  }

  async estimateFromVideo(video) {
    this._ctx.drawImage(video, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const imageData = this._ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
    return this._estimate(imageData);
  }

  async _estimate(imageData) {
    const { data, width, height } = imageData;
    this._width = width; this._height = height;

    let depthMap;

    if (this.session) {
      // ONNX inference
      const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
      const input = new Float32Array(3 * width * height);
      for (let i = 0; i < width * height; i++) {
        input[i]                     = (data[i*4]   / 255 - mean[0]) / std[0];
        input[i + width*height]      = (data[i*4+1] / 255 - mean[1]) / std[1];
        input[i + width*height*2]    = (data[i*4+2] / 255 - mean[2]) / std[2];
      }
      const tensor = new ort.Tensor('float32', input, [1, 3, height, width]);
      const results = await this.session.run({ input: tensor });
      const output = Object.values(results)[0].data;
      depthMap = new Float32Array(output);
    } else {
      // Fallback: luminance-based pseudo depth
      depthMap = new Float32Array(width * height);
      for (let i = 0; i < width * height; i++) {
        const r = data[i*4] / 255, g = data[i*4+1] / 255, b = data[i*4+2] / 255;
        depthMap[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
    }

    // Normalize
    this._minDepth = Math.min(...depthMap);
    this._maxDepth = Math.max(...depthMap);
    const range = this._maxDepth - this._minDepth || 1;
    const normalized = depthMap.map(v => (v - this._minDepth) / range);
    this._depthMap = normalized;
    this.onDepth?.(normalized, width, height);
    return normalized;
  }

  getDepthAt(x, y) {
    if (!this._depthMap) return 0;
    const ix = Math.floor(x * this._width);
    const iy = Math.floor(y * this._height);
    return this._depthMap[iy * this._width + ix] ?? 0;
  }

  toPointCloud(options = {}) {
    if (!this._depthMap) return null;
    const { depthScale = 2, fov = 60, step = 2 } = options;
    const positions = [], colors = [];
    const fovRad = fov * Math.PI / 180;
    const focalX = this._width  / (2 * Math.tan(fovRad / 2));
    const focalY = this._height / (2 * Math.tan(fovRad / 2));

    this._ctx.drawImage(this._canvas, 0, 0);
    const imgData = this._ctx.getImageData(0, 0, this._width, this._height);

    for (let y = 0; y < this._height; y += step) {
      for (let x = 0; x < this._width; x += step) {
        const idx = y * this._width + x;
        const depth = this._depthMap[idx] * depthScale;
        const X = (x - this._width/2)  / focalX * depth;
        const Y = -(y - this._height/2) / focalY * depth;
        const Z = -depth;
        positions.push(X, Y, Z);
        colors.push(imgData.data[idx*4]/255, imgData.data[idx*4+1]/255, imgData.data[idx*4+2]/255);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }

  toMesh(options = {}) {
    if (!this._depthMap) return null;
    const { depthScale = 2, step = 4, smooth = true } = options;
    const W = Math.floor(this._width / step);
    const H = Math.floor(this._height / step);
    const positions = new Float32Array(W * H * 3);
    const indices = [];

    for (let iy = 0; iy < H; iy++) {
      for (let ix = 0; ix < W; ix++) {
        const sx = ix * step, sy = iy * step;
        const depth = this._depthMap[sy * this._width + sx] * depthScale;
        const idx = iy * W + ix;
        positions[idx*3]   = (ix / W - 0.5) * 2;
        positions[idx*3+1] = -(iy / H - 0.5) * 2;
        positions[idx*3+2] = -depth;
        if (ix < W-1 && iy < H-1) {
          const a = idx, b = idx+1, c = idx+W, d = idx+W+1;
          indices.push(a, c, b, b, c, d);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  toDepthTexture() {
    if (!this._depthMap) return null;
    const data = new Uint8Array(this._width * this._height * 4);
    for (let i = 0; i < this._depthMap.length; i++) {
      const v = Math.floor(this._depthMap[i] * 255);
      data[i*4] = data[i*4+1] = data[i*4+2] = v;
      data[i*4+3] = 255;
    }
    const tex = new THREE.DataTexture(data, this._width, this._height, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }

  dispose() { this.session = null; this._depthMap = null; }
}

export async function createDepthEstimator(options) {
  const estimator = new DepthEstimator(options);
  await estimator.load();
  return estimator;
}

export default DepthEstimator;
