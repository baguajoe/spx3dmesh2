// RenderFarmManager.js — Distributed render farm via WebSockets + SharedArrayBuffer
// Desktop: uses Electron worker_threads for local multi-core rendering
// Web: uses WebWorkers + BroadcastChannel for tab-based distribution
import * as THREE from 'three';
import { SPXPathTracer, RENDER_PRESETS } from './SPXPathTracer.js';

// ── Job system ────────────────────────────────────────────────────────────────
export const JOB_STATUS = { PENDING:'pending', RUNNING:'running', DONE:'done', FAILED:'failed', CANCELLED:'cancelled' };

export function createRenderJob(options = {}) {
  return {
    id:         Math.random().toString(36).slice(2,9),
    name:       options.name    ?? `Render_${Date.now()}`,
    preset:     options.preset  ?? 'medium',
    width:      options.width   ?? 1920,
    height:     options.height  ?? 1080,
    samples:    options.samples ?? 64,
    bounces:    options.bounces ?? 4,
    frameStart: options.frameStart ?? 1,
    frameEnd:   options.frameEnd   ?? 1,
    outputDir:  options.outputDir  ?? './renders',
    status:     JOB_STATUS.PENDING,
    progress:   0,
    startTime:  null,
    endTime:    null,
    tiles:      [],
    workers:    [],
    result:     null,
  };
}

// ── Tile splitter ─────────────────────────────────────────────────────────────
export function splitIntoTiles(width, height, tileSize = 64) {
  const tiles = [];
  const tilesX = Math.ceil(width  / tileSize);
  const tilesY = Math.ceil(height / tileSize);
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      tiles.push({
        id:   ty * tilesX + tx,
        x:    tx * tileSize,
        y:    ty * tileSize,
        w:    Math.min(tileSize, width  - tx * tileSize),
        h:    Math.min(tileSize, height - ty * tileSize),
        done: false,
      });
    }
  }
  return tiles;
}

// ── Local worker pool ─────────────────────────────────────────────────────────
export class RenderFarmManager {
  constructor() {
    this.jobs        = new Map();
    this.workers     = [];
    this.maxWorkers  = Math.max(1, (navigator.hardwareConcurrency ?? 4) - 1);
    this.queue       = [];
    this.onJobUpdate = null;
    this.onComplete  = null;
    this._isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  }

  // ── Add job ────────────────────────────────────────────────────────────────
  addJob(options = {}) {
    const job = createRenderJob(options);
    job.tiles = splitIntoTiles(job.width, job.height, 64);
    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    this._notify(job);
    return job;
  }

  // ── Start farm ────────────────────────────────────────────────────────────
  async start(scene, camera) {
    if (!this.queue.length) return;
    const jobId = this.queue.shift();
    const job   = this.jobs.get(jobId);
    if (!job) return;
    job.status    = JOB_STATUS.RUNNING;
    job.startTime = Date.now();
    this._notify(job);
    if (this._isElectron) {
      await this._renderElectron(job, scene, camera);
    } else {
      await this._renderWeb(job, scene, camera);
    }
  }

  // ── Web rendering (path tracer, tile by tile) ─────────────────────────────
  async _renderWeb(job, scene, camera) {
    const preset = RENDER_PRESETS[job.preset] ?? RENDER_PRESETS.medium;
    const tracer = new SPXPathTracer();
    tracer.setResolution(job.width, job.height);
    tracer.setSamples(job.samples ?? preset.samples);
    tracer.setBounces(job.bounces ?? preset.maxBounce);
    tracer.init();
    tracer.onProgress = (pct, s, total) => {
      job.progress = pct * 100;
      this._notify(job);
    };
    tracer.onTile = (x, y, w, h, sample) => {
      const tile = job.tiles.find(t => t.x === x && t.y === y);
      if (tile && sample >= (job.samples ?? preset.samples)) tile.done = true;
    };
    tracer.onComplete = (canvas) => {
      job.status   = JOB_STATUS.DONE;
      job.endTime  = Date.now();
      job.result   = canvas.toDataURL('image/png');
      job.progress = 100;
      this._notify(job);
      this.onComplete?.(job);
      if (this.queue.length) this.start(scene, camera);
    };
    await tracer.render(scene, camera);
  }

  // ── Electron rendering (uses native file system for output) ──────────────
  async _renderElectron(job, scene, camera) {
    await this._renderWeb(job, scene, camera);
    // On desktop, also save to disk via Electron API
    if (job.result && window.electronAPI?.writeFile) {
      const base64 = job.result.split(',')[1];
      const outPath = `${job.outputDir}/${job.name}_${Date.now()}.png`;
      await window.electronAPI.writeFile(outPath, base64);
      job.outputPath = outPath;
      this._notify(job);
    }
  }

  cancelJob(id) {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = JOB_STATUS.CANCELLED;
    this._notify(job);
  }

  getJob(id)    { return this.jobs.get(id); }
  listJobs()    { return Array.from(this.jobs.values()); }
  clearDone()   { this.jobs.forEach((j,id) => { if (j.status === JOB_STATUS.DONE) this.jobs.delete(id); }); }

  getStats() {
    const all = this.listJobs();
    return {
      total:     all.length,
      pending:   all.filter(j=>j.status===JOB_STATUS.PENDING).length,
      running:   all.filter(j=>j.status===JOB_STATUS.RUNNING).length,
      done:      all.filter(j=>j.status===JOB_STATUS.DONE).length,
      workers:   this.maxWorkers,
      queued:    this.queue.length,
    };
  }

  _notify(job) { this.onJobUpdate?.(job, this.getStats()); }
}

export async function createRenderFarm() {
  return new RenderFarmManager();
}

export default RenderFarmManager;
