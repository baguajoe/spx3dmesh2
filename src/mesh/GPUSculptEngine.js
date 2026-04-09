// GPUSculptEngine.js — WebGPU-accelerated sculpting for 1M+ poly meshes
// Falls back to CPU SculptEngine when WebGPU unavailable
import * as THREE from 'three';
import { getFalloff, createBrushSettings, applySculptStroke, smoothVertices } from './SculptEngine.js';

export class GPUSculptEngine {
  constructor() {
    this.device   = null;
    this.ready    = false;
    this.fallback = false;
    this._pipeline  = null;
    this._vertBuf   = null;
    this._normBuf   = null;
    this._paramBuf  = null;
    this._readBuf   = null;
    this._vertCount = 0;
  }

  async init() {
    if (!navigator.gpu) { this.fallback = true; return this; }
    try {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      this.device   = await adapter.requestDevice();
      this.ready    = true;
      await this._compilePipeline();
    } catch(e) {
      console.warn('GPUSculpt: WebGPU init failed, using CPU', e);
      this.fallback = true;
    }
    return this;
  }

  async _compilePipeline() {
    const shader = /* wgsl */`
      struct Vertex   { x:f32, y:f32, z:f32, pad:f32 }
      struct Normal   { x:f32, y:f32, z:f32, pad:f32 }
      struct BrushParams {
        hitX:f32, hitY:f32, hitZ:f32,
        normX:f32, normY:f32, normZ:f32,
        radius:f32, strength:f32, direction:f32,
        brushType:u32, falloffType:u32,
        symX:f32, symY:f32, symZ:f32, symEnable:u32,
        dt:f32,
      }
      @group(0) @binding(0) var<storage, read_write> verts  : array<Vertex>;
      @group(0) @binding(1) var<storage, read>       norms  : array<Normal>;
      @group(0) @binding(2) var<uniform>             params : BrushParams;

      fn falloff(t:f32, ftype:u32) -> f32 {
        if (t >= 1.0) { return 0.0; }
        switch ftype {
          case 1u: { return 1.0 - t; }
          case 2u: { let u = 1.0-t; return pow(1.0-t, 4.0); }
          case 3u: { return sqrt(max(0.0, 1.0 - t*t)); }
          case 4u: { return 1.0 - sqrt(t); }
          case 5u: { return 1.0; }
          default: { let u=1.0-t; return u*u*(3.0-2.0*u); }
        }
      }

      fn applyBrush(i:u32, hit:vec3f, norm:vec3f) {
        let vp   = vec3f(verts[i].x, verts[i].y, verts[i].z);
        let dist = length(vp - hit);
        if (dist >= params.radius) { return; }
        let t   = dist / params.radius;
        let infl = falloff(t, params.falloffType) * params.strength * params.direction * params.dt * 60.0;
        switch params.brushType {
          case 0u: { // draw/clay
            verts[i].x += norm.x * infl;
            verts[i].y += norm.y * infl;
            verts[i].z += norm.z * infl;
          }
          case 1u: { // inflate — use vertex normal
            let vn = normalize(vec3f(norms[i].x, norms[i].y, norms[i].z));
            verts[i].x += vn.x * infl;
            verts[i].y += vn.y * infl;
            verts[i].z += vn.z * infl;
          }
          case 2u: { // flatten
            let toPlane = vp - hit;
            let d   = dot(toPlane, norm);
            let rate = min(1.0, abs(infl) * 0.5);
            verts[i].x -= norm.x * d * rate;
            verts[i].y -= norm.y * d * rate;
            verts[i].z -= norm.z * d * rate;
          }
          case 3u: { // pinch
            let toC = hit - vp;
            verts[i].x += toC.x * abs(infl) * 0.5;
            verts[i].y += toC.y * abs(infl) * 0.5;
            verts[i].z += toC.z * abs(infl) * 0.5;
          }
          case 4u: { // scrape
            if (dot(vp, norm) > dot(hit, norm)) {
              verts[i].x -= norm.x * abs(infl) * 0.5;
              verts[i].y -= norm.y * abs(infl) * 0.5;
              verts[i].z -= norm.z * abs(infl) * 0.5;
            }
          }
          case 5u: { // fill
            if (dot(vp, norm) < dot(hit, norm)) {
              verts[i].x += norm.x * abs(infl) * 0.5;
              verts[i].y += norm.y * abs(infl) * 0.5;
              verts[i].z += norm.z * abs(infl) * 0.5;
            }
          }
          default: {}
        }
      }

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) id: vec3u) {
        let i = id.x;
        if (i >= arrayLength(&verts)) { return; }
        let hit  = vec3f(params.hitX,  params.hitY,  params.hitZ);
        let norm = vec3f(params.normX, params.normY, params.normZ);
        applyBrush(i, hit, norm);
        if (params.symEnable == 1u) {
          let symHit = vec3f(params.symX, params.symY, params.symZ);
          let symNorm = vec3f(-params.normX, params.normY, params.normZ);
          applyBrush(i, symHit, symNorm);
        }
      }
    `;
    const mod = this.device.createShaderModule({ code: shader });
    this._pipeline = await this.device.createComputePipelineAsync({
      layout: 'auto',
      compute: { module: mod, entryPoint: 'main' },
    });
  }

  uploadGeometry(geometry) {
    if (this.fallback || !this.device) return;
    const pos  = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    this._vertCount = pos.count;
    const vData = new Float32Array(pos.count * 4);
    const nData = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) {
      vData[i*4]   = pos.getX(i); vData[i*4+1] = pos.getY(i); vData[i*4+2] = pos.getZ(i);
      if (norm) { nData[i*4] = norm.getX(i); nData[i*4+1] = norm.getY(i); nData[i*4+2] = norm.getZ(i); }
    }
    this._vertBuf  = this._createBuf(vData, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST);
    this._normBuf  = this._createBuf(nData, GPUBufferUsage.STORAGE);
    this._paramBuf = this.device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this._readBuf  = this.device.createBuffer({ size: vData.byteLength, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  }

  _createBuf(data, usage) {
    const buf = this.device.createBuffer({ size: data.byteLength, usage });
    this.device.queue.writeBuffer(buf, 0, data);
    return buf;
  }

  async applyStroke(geometry, hitPoint, hitNormal, brush) {
    if (this.fallback || !this._pipeline) {
      return applySculptStroke(geometry, hitPoint, hitNormal, brush);
    }
    const BRUSH_IDX = { draw:0, clay:0, inflate:1, flatten:2, pinch:3, scrape:4, fill:5, smooth:6 };
    const FALLOFF_IDX = { smooth:0, linear:1, sharp:2, sphere:3, root:4, constant:5 };
    const p = new Float32Array(16);
    p[0]=hitPoint.x;  p[1]=hitPoint.y;  p[2]=hitPoint.z;
    p[3]=hitNormal.x; p[4]=hitNormal.y; p[5]=hitNormal.z;
    p[6]=brush.radius; p[7]=brush.strength; p[8]=brush.direction??1;
    const bIdx = new Uint32Array(p.buffer, 36, 1); bIdx[0] = BRUSH_IDX[brush.type] ?? 0;
    const fIdx = new Uint32Array(p.buffer, 40, 1); fIdx[0] = FALLOFF_IDX[brush.falloff] ?? 0;
    if (brush.symmetry) {
      const ax = {x:0,y:1,z:2}[brush.symmetryAxis??'x'];
      const sym = hitPoint.clone(); sym.setComponent(ax, -sym.getComponent(ax));
      p[11]=sym.x; p[12]=sym.y; p[13]=sym.z;
      const se = new Uint32Array(p.buffer, 56, 1); se[0] = 1;
    }
    p[15] = 1/60;
    this.device.queue.writeBuffer(this._paramBuf, 0, p);
    const bg = this.device.createBindGroup({
      layout: this._pipeline.getBindGroupLayout(0),
      entries: [
        { binding:0, resource:{ buffer:this._vertBuf  }},
        { binding:1, resource:{ buffer:this._normBuf  }},
        { binding:2, resource:{ buffer:this._paramBuf }},
      ],
    });
    const enc  = this.device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(this._pipeline);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(this._vertCount / 64));
    pass.end();
    enc.copyBufferToBuffer(this._vertBuf, 0, this._readBuf, 0, this._vertCount * 16);
    this.device.queue.submit([enc.finish()]);
    await this._readBuf.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(this._readBuf.getMappedRange().slice());
    this._readBuf.unmap();
    const pos = geometry.attributes.position;
    for (let i = 0; i < this._vertCount; i++) {
      pos.setXYZ(i, result[i*4], result[i*4+1], result[i*4+2]);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    this.uploadGeometry(geometry); // re-upload updated normals
    return true;
  }

  dispose() {
    this._vertBuf?.destroy(); this._normBuf?.destroy();
    this._paramBuf?.destroy(); this._readBuf?.destroy();
    this.device?.destroy();
  }

  get isGPU() { return this.ready && !this.fallback; }
}

export async function createGPUSculptEngine() {
  const engine = new GPUSculptEngine();
  await engine.init();
  return engine;
}

export default GPUSculptEngine;
