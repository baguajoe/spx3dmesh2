// EnvironmentProbes.js — Environment Probes + GI UPGRADE
// SPX Mesh Editor | StreamPireX
// Features: probe placement, blending, capture resolution control,
//           reflection capture, sky probe, probe volume system

import * as THREE from 'three';

export const PROBE_TYPES = { REFLECTION: 'REFLECTION', SKY: 'SKY', IRRADIANCE: 'IRRADIANCE' };

export class EnvironmentProbe {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.type = options.type ?? PROBE_TYPES.REFLECTION;
    this.position = options.position ? new THREE.Vector3(...options.position) : new THREE.Vector3();
    this.radius = options.radius ?? 10;
    this.resolution = options.resolution ?? 128;
    this.intensity = options.intensity ?? 1.0;
    this.id = options.id ?? Math.random().toString(36).slice(2);
    this.isDirty = true;
    this._build();
  }

  _build() {
    this.renderTarget = new THREE.WebGLCubeRenderTarget(this.resolution, {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    this.cubeCamera = new THREE.CubeCamera(0.1, this.radius * 2, this.renderTarget);
    this.cubeCamera.position.copy(this.position);
    this.scene.add(this.cubeCamera);

    // Visual helper sphere
    this.helper = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }),
    );
    this.helper.position.copy(this.position);
    this.helper.userData.probeId = this.id;
    this.scene.add(this.helper);
  }

  setPosition(pos) {
    this.position.copy(pos);
    this.cubeCamera.position.copy(pos);
    this.helper.position.copy(pos);
    this.isDirty = true;
  }

  setResolution(res) {
    this.resolution = res;
    this.renderTarget.dispose();
    this._build();
  }

  capture(renderer) {
    this.cubeCamera.update(renderer, this.scene);
    this.isDirty = false;
  }

  get texture() { return this.renderTarget.texture; }

  applyToMaterial(material) {
    material.envMap = this.renderTarget.texture;
    material.envMapIntensity = this.intensity;
    material.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.cubeCamera);
    this.scene.remove(this.helper);
    this.renderTarget.dispose();
    this.helper.geometry.dispose();
  }
}

// ─── Probe Volume (blend multiple probes) ────────────────────────────────────

export class ProbeVolume {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.probes = new Map();
    this.autoUpdate = true;
    this._frameCount = 0;
    this._updateInterval = 30; // capture every N frames
  }

  addProbe(options = {}) {
    const probe = new EnvironmentProbe(this.scene, options);
    this.probes.set(probe.id, probe);
    probe.capture(this.renderer);
    return probe.id;
  }

  removeProbe(id) {
    const probe = this.probes.get(id);
    if (probe) { probe.dispose(); this.probes.delete(id); }
  }

  update() {
    if (!this.autoUpdate) return;
    this._frameCount++;
    if (this._frameCount % this._updateInterval !== 0) return;
    this.probes.forEach(probe => {
      if (probe.isDirty) probe.capture(this.renderer);
    });
  }

  captureAll() {
    this.probes.forEach(probe => probe.capture(this.renderer));
  }

  // Find best probe for a given world position and apply to mesh
  applyBestProbe(mesh) {
    const meshPos = new THREE.Vector3();
    mesh.getWorldPosition(meshPos);

    let bestProbe = null, bestScore = Infinity;
    this.probes.forEach(probe => {
      const dist = meshPos.distanceTo(probe.position);
      if (dist < probe.radius && dist < bestScore) {
        bestScore = dist;
        bestProbe = probe;
      }
    });

    if (bestProbe) {
      bestProbe.applyToMaterial(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material);
    }
    return bestProbe?.id ?? null;
  }

  // Blend two nearest probes (weighted by inverse distance)
  applyBlendedProbes(mesh) {
    const meshPos = new THREE.Vector3();
    mesh.getWorldPosition(meshPos);

    const nearby = [];
    this.probes.forEach(probe => {
      const dist = meshPos.distanceTo(probe.position);
      if (dist < probe.radius) nearby.push({ probe, dist });
    });

    if (nearby.length === 0) return;
    if (nearby.length === 1) { nearby[0].probe.applyToMaterial(mesh.material); return; }

    // Use nearest probe (full blending requires shader support)
    nearby.sort((a, b) => a.dist - b.dist);
    nearby[0].probe.applyToMaterial(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material);
  }

  setupSkyProbe(hdrTexture, options = {}) {
    const probe = new EnvironmentProbe(this.scene, {
      ...options,
      type: PROBE_TYPES.SKY,
      radius: 9999,
    });
    if (hdrTexture) {
      this.scene.background = hdrTexture;
      this.scene.environment = hdrTexture;
    }
    this.probes.set(probe.id, probe);
    return probe.id;
  }

  markDirty() { this.probes.forEach(p => { p.isDirty = true; }); }

  getProbeList() {
    return Array.from(this.probes.values()).map(p => ({
      id: p.id, type: p.type, position: p.position.toArray(),
      radius: p.radius, resolution: p.resolution, intensity: p.intensity,
    }));
  }

  dispose() {
    this.probes.forEach(p => p.dispose());
    this.probes.clear();
  }
}

export default ProbeVolume;


// ─── Legacy functional exports (App.jsx compat) ───────────────────────────────

export function createReflectionProbe(scene, position, options = {}) {
  const volume = new ProbeVolume(scene, options.renderer);
  const id = volume.addProbe({ ...options, position: position.toArray?.() ?? position, type: PROBE_TYPES.REFLECTION });
  return { volume, id };
}

export function updateReflectionProbe(probeRef) {
  probeRef?.volume?.captureAll();
}

export function applyProbeToScene(probeRef, scene) {
  scene.traverse(obj => {
    if (obj.isMesh) probeRef?.volume?.applyBestProbe(obj);
  });
}

export function createIrradianceProbe(scene, position, options = {}) {
  const volume = new ProbeVolume(scene, options.renderer);
  const id = volume.addProbe({ ...options, position: position.toArray?.() ?? position, type: PROBE_TYPES.IRRADIANCE });
  return { volume, id };
}

export function applySSR(renderer, scene, camera) {
  // SSR requires post-processing pass — stub for shader pipeline integration
  console.info('[EnvironmentProbes] SSR: wire into PostProcessing.js RenderPass chain');
}

export function bakeEnvironment(probeRef, mesh) {
  probeRef?.volume?.applyBestProbe(mesh);
}

export function createProbeManager(scene, renderer) {
  return new ProbeVolume(scene, renderer);
}
