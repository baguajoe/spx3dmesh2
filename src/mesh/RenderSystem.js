import * as THREE from "three";

// ── PBR Material upgrade ──────────────────────────────────────────────────────
export function createPBRMaterial(options = {}) {
  const {
    color        = "#ffffff",
    roughness    = 0.5,
    metalness    = 0.0,
    normalScale  = 1.0,
    aoIntensity  = 1.0,
    emissive     = "#000000",
    emissiveIntensity = 0.0,
    transparent  = false,
    opacity      = 1.0,
    alphaTest    = 0.0,
    side         = THREE.FrontSide,
    envMapIntensity = 1.0,
  } = options;

  const mat = new THREE.MeshPhysicalMaterial({
    color, roughness, metalness,
    emissive, emissiveIntensity,
    transparent, opacity, alphaTest, side,
    envMapIntensity,
    clearcoat:           options.clearcoat           ?? 0.0,
    clearcoatRoughness:  options.clearcoatRoughness  ?? 0.3,
    sheen:               options.sheen               ?? 0.0,
    sheenColor:          options.sheenColor          ? new THREE.Color(options.sheenColor) : new THREE.Color(0xffffff),
    anisotropy:          options.anisotropy          ?? 0.0,
    iridescence:         options.iridescence         ?? 0.0,
  });
  mat.userData.aoIntensity  = aoIntensity;
  mat.userData.normalScale  = normalScale;
  return mat;
}

// ── Apply PBR texture maps ────────────────────────────────────────────────────
export function applyPBRMaps(material, maps = {}) {
  if (maps.albedo)    { material.map          = maps.albedo;    material.map.needsUpdate = true; }
  if (maps.normal)    { material.normalMap     = maps.normal;   material.normalMap.needsUpdate = true; material.normalScale.set(material.userData.normalScale, material.userData.normalScale); }
  if (maps.roughness) { material.roughnessMap  = maps.roughness; }
  if (maps.metalness) { material.metalnessMap  = maps.metalness; }
  if (maps.ao)        { material.aoMap         = maps.ao;       material.aoMapIntensity = material.userData.aoIntensity; }
  if (maps.emissive)  { material.emissiveMap   = maps.emissive; }
  if (maps.displacement) { material.displacementMap = maps.displacement; material.displacementScale = maps.displacementScale || 0.1; }
  material.needsUpdate = true;
}

// ── Subsurface Scattering approximation ───────────────────────────────────────
export const SSS_PRESETS = {
  skin:    { color:"#ffccaa", subsurface:0.6, scatterColor:"#ff8866", thickness:0.3, label:"Skin" },
  wax:     { color:"#ffffcc", subsurface:0.8, scatterColor:"#ffff88", thickness:0.5, label:"Wax" },
  marble:  { color:"#f0f0f0", subsurface:0.4, scatterColor:"#ccddff", thickness:0.2, label:"Marble" },
  jade:    { color:"#88ccaa", subsurface:0.5, scatterColor:"#44aa66", thickness:0.3, label:"Jade" },
  milk:    { color:"#ffffff", subsurface:0.9, scatterColor:"#ffeecc", thickness:0.6, label:"Milk" },
  leaves:  { color:"#44aa22", subsurface:0.7, scatterColor:"#88ff44", thickness:0.2, label:"Leaves" },
};

export function createSSSMaterial(presetKey = "skin") {
  const preset = SSS_PRESETS[presetKey] || SSS_PRESETS.skin;
  const mat = new THREE.MeshStandardMaterial({
    color:     preset.color,
    roughness: 0.7,
    metalness: 0.0,
    side:      THREE.FrontSide,
  });
  // Approximate SSS via emissive + transparency trick
  mat.emissive    = new THREE.Color(preset.scatterColor);
  mat.emissiveIntensity = preset.subsurface * 0.15;
  mat.userData.sssPreset    = presetKey;
  mat.userData.subsurface   = preset.subsurface;
  mat.userData.scatterColor = preset.scatterColor;
  return mat;
}

// ── Transmission + Refraction ─────────────────────────────────────────────────
export const TRANSMISSION_PRESETS = {
  glass:     { transmission:1.0, ior:1.5, thickness:0.5, roughness:0.0, color:"#aaccff", label:"Glass" },
  water:     { transmission:0.95,ior:1.33,thickness:1.0, roughness:0.05,color:"#88bbff", label:"Water" },
  ice:       { transmission:0.9, ior:1.31,thickness:0.8, roughness:0.1, color:"#ccddff", label:"Ice" },
  diamond:   { transmission:0.95,ior:2.42,thickness:0.3, roughness:0.0, color:"#ffffff", label:"Diamond" },
  amber:     { transmission:0.7, ior:1.55,thickness:0.5, roughness:0.1, color:"#ffaa44", label:"Amber" },
  crystal:   { transmission:0.85,ior:1.46,thickness:0.4, roughness:0.05,color:"#ddeeff", label:"Crystal" },
};

export function createTransmissionMaterial(presetKey = "glass") {
  const preset = TRANSMISSION_PRESETS[presetKey] || TRANSMISSION_PRESETS.glass;
  const mat = new THREE.MeshPhysicalMaterial({
    color:        preset.color,
    transmission: preset.transmission,
    ior:          preset.ior,
    thickness:    preset.thickness,
    roughness:    preset.roughness,
    metalness:    0,
    transparent:  true,
    opacity:      1.0,
    side:         THREE.FrontSide,
  });
  mat.userData.transmissionPreset = presetKey;
  return mat;
}

// ── Displacement mapping ───────────────────────────────────────────────────────
export function createDisplacementTexture(width=256, height=256, pattern="noise") {
  const canvas = document.createElement("canvas");
  canvas.width=width; canvas.height=height;
  const ctx    = canvas.getContext("2d");
  const data   = ctx.createImageData(width, height);

  for (let y=0; y<height; y++) {
    for (let x=0; x<width; x++) {
      const i = (y*width+x)*4;
      let v = 0;
      switch (pattern) {
        case "noise":
          v = (Math.sin(x*0.1)*Math.cos(y*0.1)+1)*0.5*255;
          break;
        case "waves":
          v = (Math.sin(x*0.05+y*0.05)+1)*0.5*255;
          break;
        case "checkers":
          v = ((Math.floor(x/16)+Math.floor(y/16))%2)*255;
          break;
        case "gradient":
          v = (y/height)*255;
          break;
        case "ridge":
          v = Math.abs(Math.sin(y*0.1))*255;
          break;
        default:
          v = Math.random()*255;
      }
      data.data[i]=data.data[i+1]=data.data[i+2]=v;
      data.data[i+3]=255;
    }
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── AI Denoise (canvas-based bilateral filter) ────────────────────────────────
export function denoiseCanvas(canvas, { sigma=2, iterations=2 } = {}) {
  const ctx  = canvas.getContext("2d");
  const w    = canvas.width, h = canvas.height;
  for (let iter=0; iter<iterations; iter++) {
    const img  = ctx.getImageData(0,0,w,h);
    const src  = new Uint8ClampedArray(img.data);
    const r    = Math.ceil(sigma*2);
    for (let y=r; y<h-r; y++) {
      for (let x=r; x<w-r; x++) {
        const ci = (y*w+x)*4;
        let rSum=0,gSum=0,bSum=0,wSum=0;
        for (let dy=-r; dy<=r; dy++) {
          for (let dx=-r; dx<=r; dx++) {
            const ni  = ((y+dy)*w+(x+dx))*4;
            const dr  = src[ci]-src[ni], dg=src[ci+1]-src[ni+1], db=src[ci+2]-src[ni+2];
            const rngW = Math.exp(-(dr*dr+dg*dg+db*db)/(2*sigma*sigma*255));
            const spcW = Math.exp(-(dx*dx+dy*dy)/(2*sigma*sigma));
            const w2   = rngW*spcW;
            rSum+=src[ni]*w2; gSum+=src[ni+1]*w2; bSum+=src[ni+2]*w2; wSum+=w2;
          }
        }
        img.data[ci]   = rSum/wSum;
        img.data[ci+1] = gSum/wSum;
        img.data[ci+2] = bSum/wSum;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
}

// ── Render queue ──────────────────────────────────────────────────────────────
export function createRenderQueue() {
  return {
    jobs:     [],
    running:  false,
    progress: 0,
    results:  [],
  };
}

export function addRenderJob(queue, options = {}) {
  const job = {
    id:         crypto.randomUUID(),
    name:       options.name || "Job_" + queue.jobs.length,
    frameStart: options.frameStart || 0,
    frameEnd:   options.frameEnd   || 24,
    fps:        options.fps        || 24,
    width:      options.width      || 1920,
    height:     options.height     || 1080,
    format:     options.format     || "PNG",
    samples:    options.samples    || 64,
    status:     "pending",
    progress:   0,
  };
  queue.jobs.push(job);
  return job;
}

export async function runRenderQueue(queue, renderer, scene, camera, onProgress) {
  queue.running = true;
  for (const job of queue.jobs) {
    if (job.status === "done") continue;
    job.status = "running";
    const totalFrames = job.frameEnd - job.frameStart;
    for (let f = job.frameStart; f <= job.frameEnd; f++) {
      job.progress = (f - job.frameStart) / totalFrames;
      onProgress?.(job, f);
      await new Promise(r => setTimeout(r, 0)); // yield
    }
    job.status = "done";
  }
  queue.running = false;
}

// ── Render presets ────────────────────────────────────────────────────────────
export const RENDER_PRESETS = {
  preview:    { width:960,  height:540,  samples:16,  shadowMapSize:512,  label:"Preview" },
  medium:     { width:1280, height:720,  samples:64,  shadowMapSize:1024, label:"720p" },
  hd:         { width:1920, height:1080, samples:128, shadowMapSize:2048, label:"1080p HD" },
  uhd:        { width:3840, height:2160, samples:256, shadowMapSize:4096, label:"4K UHD" },
  square:     { width:1080, height:1080, samples:64,  shadowMapSize:1024, label:"1080 Square" },
  portrait:   { width:1080, height:1920, samples:64,  shadowMapSize:1024, label:"Portrait 9:16" },
};

export function applyRenderPreset(renderer, presetKey) {
  const preset = RENDER_PRESETS[presetKey];
  if (!preset) return;
  renderer.setSize(preset.width, preset.height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  return preset;
}

// ── Tone mapping ──────────────────────────────────────────────────────────────
export const TONE_MAP_MODES = {
  none:     { mode: THREE.NoToneMapping,         label:"None" },
  linear:   { mode: THREE.LinearToneMapping,     label:"Linear" },
  reinhard: { mode: THREE.ReinhardToneMapping,   label:"Reinhard" },
  cineon:   { mode: THREE.CineonToneMapping,     label:"Cineon" },
  aces:     { mode: THREE.ACESFilmicToneMapping, label:"ACES Filmic" },
  agx:      { mode: THREE.AgXToneMapping || THREE.ACESFilmicToneMapping, label:"AgX" },
};

export function applyToneMappingMode(renderer, modeKey, exposure=1.0) {
  const mode = TONE_MAP_MODES[modeKey];
  if (!mode) return;
  renderer.toneMapping         = mode.mode;
  renderer.toneMappingExposure = exposure;
}

// ── Render output ─────────────────────────────────────────────────────────────
export function captureFrame(renderer, format="PNG", quality=0.95) {
  const canvas   = renderer.domElement;
  const mimeType = format === "WEBP" ? "image/webp" : format === "JPEG" ? "image/jpeg" : "image/png";
  return canvas.toDataURL(mimeType, quality);
}

export function downloadFrame(renderer, filename="render.png", format="PNG") {
  const dataURL = captureFrame(renderer, format);
  const a = document.createElement("a");
  a.href     = dataURL;
  a.download = filename;
  a.click();
}

export function getRenderStats(renderer) {
  const info = renderer.info;
  return {
    drawCalls:  info.render?.calls || 0,
    triangles:  info.render?.triangles || 0,
    points:     info.render?.points || 0,
    lines:      info.render?.lines || 0,
    textures:   info.memory?.textures || 0,
    geometries: info.memory?.geometries || 0,
  };
}
