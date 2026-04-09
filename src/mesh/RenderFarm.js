import * as THREE from "three";

// ── WebGPU detection ──────────────────────────────────────────────────────────
export async function detectWebGPU() {
  if (!navigator.gpu) return { supported: false, reason: "navigator.gpu not available" };
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { supported: false, reason: "No GPU adapter found" };
    const device  = await adapter.requestDevice();
    const info    = await adapter.requestAdapterInfo?.() || {};
    return {
      supported: true,
      vendor:    info.vendor    || "unknown",
      device:    info.device    || "unknown",
      adapter,
      gpuDevice: device,
    };
  } catch(e) {
    return { supported: false, reason: e.message };
  }
}

export function getWebGLInfo(renderer) {
  if (!renderer) return {};
  const gl   = renderer.getContext();
  const dbg  = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    vendor:   dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   : "unknown",
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown",
    version:  gl.getParameter(gl.VERSION),
    glsl:     gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    maxTex:   gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxAniso: gl.getExtension("EXT_texture_filter_anisotropic")?.MAX_TEXTURE_MAX_ANISOTROPY_EXT || 1,
  };
}

// ── IBL prefilter (PMREM) ─────────────────────────────────────────────────────
export function createPMREMFromHDR(renderer, hdrTexture) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
  pmremGenerator.dispose();
  return envMap;
}

export function createPMREMFromScene(renderer, scene, camera) {
  const pmrem  = new THREE.PMREMGenerator(renderer);
  // RoomEnvironment removed (not in three.module.js build)
  // Use a neutral grey scene as PMREM source instead
  const neutralScene = new THREE.Scene();
  neutralScene.background = new THREE.Color(0x444444);
  const target = pmrem.fromScene(neutralScene, 0.04);
  pmrem.dispose();
  return target.texture;
}

export function configurePBRRenderer(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

export function applyIBLToScene(scene, envMap, { intensity=1.0, background=false } = {}) {
  scene.environment       = envMap;
  scene.environmentIntensity = intensity;
  if (background) scene.background = envMap;
  scene.traverse(obj => {
    if (obj.isMesh && obj.material?.isMeshStandardMaterial) {
      obj.material.envMap          = envMap;
      obj.material.envMapIntensity = intensity;
      obj.material.needsUpdate     = true;
    }
  });
}

// ── Cascaded shadow maps ──────────────────────────────────────────────────────
export function setupCascadedShadows(renderer, light, options = {}) {
  const {
    mapSize   = 2048,
    near      = 0.1,
    far       = 100,
    bias      = -0.001,
    cascades  = 3,
  } = options;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

  if (!light.isDirectionalLight && !light.isSpotLight) return;

  light.castShadow                  = true;
  light.shadow.mapSize.set(mapSize, mapSize);
  light.shadow.camera.near          = near;
  light.shadow.camera.far           = far;
  light.shadow.bias                 = bias;
  light.shadow.normalBias           = 0.02;

  // Simulate cascade by adjusting frustum
  const range = far - near;
  light.shadow.camera.left   = -range * 0.5;
  light.shadow.camera.right  =  range * 0.5;
  light.shadow.camera.top    =  range * 0.5;
  light.shadow.camera.bottom = -range * 0.5;
  light.shadow.camera.updateProjectionMatrix();

  return { light, mapSize, cascades, bias };
}

export function enableShadowsOnScene(scene, { castShadow=true, receiveShadow=true } = {}) {
  scene.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow    = castShadow;
      obj.receiveShadow = receiveShadow;
    }
  });
}

// ── NPR outline pass upgrade ──────────────────────────────────────────────────
export function createNPROutlinePass(renderer, scene, camera, options = {}) {
  const {
    edgeColor     = new THREE.Color("#000000"),
    edgeThickness = 2.0,
    edgeThreshold = 0.1,
    width         = renderer?.domElement.width  || 1920,
    height        = renderer?.domElement.height || 1080,
  } = options;

  // Depth + normal render target
  const depthTarget = new THREE.WebGLRenderTarget(width, height, {
    minFilter:    THREE.NearestFilter,
    magFilter:    THREE.NearestFilter,
    format:       THREE.RGBAFormat,
    depthBuffer:  true,
  });

  const outlineUniforms = {
    tDepth:     { value: depthTarget.texture },
    resolution: { value: new THREE.Vector2(width, height) },
    edgeColor:  { value: edgeColor },
    thickness:  { value: edgeThickness },
    threshold:  { value: edgeThreshold },
    cameraNear: { value: camera?.near || 0.1 },
    cameraFar:  { value: camera?.far  || 1000 },
  };

  return {
    depthTarget,
    uniforms:    outlineUniforms,
    enabled:     true,
    color:       edgeColor,
    thickness:   edgeThickness,
    threshold:   edgeThreshold,
  };
}

// ── Render farm queue ─────────────────────────────────────────────────────────
export const JOB_STATUS = {
  pending:    { label:"Pending",    color:"#888888" },
  running:    { label:"Running",    color:"#ffaa00" },
  complete:   { label:"Complete",   color:"#00ffc8" },
  failed:     { label:"Failed",     color:"#ff4444" },
  cancelled:  { label:"Cancelled",  color:"#555555" },
};

export function createRenderFarm() {
  return {
    jobs:        [],
    maxConcurrent: 1,
    running:     0,
    completed:   0,
    failed:      0,
    workers:     [],
  };
}

export function addRenderFarmJob(farm, options = {}) {
  const job = {
    id:         crypto.randomUUID(),
    name:       options.name       || "Job_" + farm.jobs.length,
    type:       options.type       || "frame",   // frame | sequence | preview
    frameStart: options.frameStart || 0,
    frameEnd:   options.frameEnd   || 0,
    fps:        options.fps        || 24,
    resolution: options.resolution || { w:1920, h:1080 },
    status:     "pending",
    progress:   0,
    created:    Date.now(),
    started:    null,
    finished:   null,
    output:     null,
    error:      null,
    priority:   options.priority   || 0,
  };
  farm.jobs.push(job);
  farm.jobs.sort((a,b) => b.priority - a.priority);
  return job;
}

export function cancelRenderJob(farm, jobId) {
  const job = farm.jobs.find(j => j.id === jobId);
  if (job && job.status === "pending") {
    job.status = "cancelled";
    return true;
  }
  return false;
}

export function removeRenderJob(farm, jobId) {
  const idx = farm.jobs.findIndex(j => j.id === jobId);
  if (idx >= 0) { farm.jobs.splice(idx, 1); return true; }
  return false;
}

export async function runNextRenderJob(farm, renderer, scene, camera, onProgress) {
  const job = farm.jobs.find(j => j.status === "pending");
  if (!job || farm.running >= farm.maxConcurrent) return null;

  job.status  = "running";
  job.started = Date.now();
  farm.running++;

  try {
    const frames = job.frameEnd - job.frameStart + 1;
    const results = [];

    for (let f = job.frameStart; f <= job.frameEnd; f++) {
      job.progress = (f - job.frameStart) / Math.max(frames - 1, 1);
      onProgress?.(job);

      // Render frame
      renderer.setSize(job.resolution.w, job.resolution.h);
      renderer.render(scene, camera);
      const dataURL = renderer.domElement.toDataURL("image/png");
      results.push({ frame: f, dataURL });

      // Small yield to keep UI responsive
      await new Promise(r => setTimeout(r, 0));
    }

    job.status   = "complete";
    job.progress = 1;
    job.output   = results;
    job.finished = Date.now();
    farm.completed++;
  } catch(e) {
    job.status = "failed";
    job.error  = e.message;
    farm.failed++;
  }

  farm.running--;
  return job;
}

export function getRenderFarmStats(farm) {
  const byStatus = {};
  farm.jobs.forEach(j => { byStatus[j.status] = (byStatus[j.status]||0)+1; });
  return {
    total:     farm.jobs.length,
    running:   farm.running,
    completed: farm.completed,
    failed:    farm.failed,
    byStatus,
  };
}
