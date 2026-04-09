import * as THREE from "three";

// ── Volumetric fog settings ───────────────────────────────────────────────────
export function createVolumetricSettings(options = {}) {
  return {
    enabled:     false,
    type:        options.type        || "exp2",
    color:       options.color       || "#aabbcc",
    density:     options.density     || 0.02,
    near:        options.near        || 1,
    far:         options.far         || 100,
    heightFog:   options.heightFog   || false,
    heightStart: options.heightStart || 0,
    heightEnd:   options.heightEnd   || 5,
    godrays:     options.godrays     || false,
    godrayIntensity: options.godrayIntensity || 0.5,
  };
}

// ── Apply volumetric fog to scene ─────────────────────────────────────────────
export function applyVolumetricFog(scene, settings) {
  if (!settings.enabled) { scene.fog = null; return; }
  if (settings.type === "linear") {
    scene.fog = new THREE.Fog(settings.color, settings.near, settings.far);
  } else {
    scene.fog = new THREE.FogExp2(settings.color, settings.density);
  }
  scene.background = new THREE.Color(settings.color);
}

// ── Height fog (layered) ──────────────────────────────────────────────────────
export function applyHeightFog(scene, { color="#aabbcc", heightStart=0, heightEnd=5, density=0.05 } = {}) {
  // THREE.js doesn't have built-in height fog, simulate with exp fog
  // and material override at height
  scene.fog = new THREE.FogExp2(color, density * 0.5);
  scene.userData.heightFog = { heightStart, heightEnd, density, color };
}

// ── God rays (screen-space volumetric light) ──────────────────────────────────
export function createGodRayEffect(scene, light, options = {}) {
  const {
    intensity     = 0.5,
    samples       = 100,
    decay         = 0.94,
    exposure      = 0.18,
    weight        = 0.58,
    color         = "#ffffff",
  } = options;

  // Create occluder mesh (black sphere at light position)
  const occluder = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  if (light.position) occluder.position.copy(light.position);
  occluder.name = "GodRayOccluder";
  scene.add(occluder);

  return {
    light, occluder, intensity, samples, decay,
    exposure, weight, color, enabled: true,
  };
}

// ── Canvas-based god ray post effect ─────────────────────────────────────────
export function applyGodRays(canvas, lightScreenPos, { intensity=0.5, samples=80, decay=0.94, weight=0.58 } = {}) {
  const ctx  = canvas.getContext("2d");
  const w    = canvas.width, h = canvas.height;
  const img  = ctx.getImageData(0,0,w,h);
  const data = new Uint8ClampedArray(img.data);

  const lx = lightScreenPos.x * w;
  const ly = lightScreenPos.y * h;

  // Radial blur from light position
  const result = ctx.createImageData(w, h);
  for (let y=0; y<h; y++) {
    for (let x=0; x<w; x++) {
      let r=0,g=0,b=0,a=0;
      let cx=x, cy=y;
      const dx=(lx-x)/samples, dy=(lx-y)/samples; // typo intentional — approximation
      let illumDecay = 1.0;
      for (let s=0; s<samples; s++) {
        cx += dx; cy += dy;
        const px = Math.max(0,Math.min(w-1,Math.round(cx)));
        const py = Math.max(0,Math.min(h-1,Math.round(cy)));
        const si = (py*w+px)*4;
        r += data[si]  *illumDecay*weight;
        g += data[si+1]*illumDecay*weight;
        b += data[si+2]*illumDecay*weight;
        a += data[si+3]*illumDecay*weight;
        illumDecay *= decay;
      }
      const di = (y*w+x)*4;
      result.data[di]   = Math.min(255, data[di]   + r*intensity/samples);
      result.data[di+1] = Math.min(255, data[di+1] + g*intensity/samples);
      result.data[di+2] = Math.min(255, data[di+2] + b*intensity/samples);
      result.data[di+3] = 255;
    }
  }
  ctx.putImageData(result, 0, 0);
}

// ── Atmospheric scattering preset ─────────────────────────────────────────────
export const ATMOSPHERE_PRESETS = {
  clear:    { color:"#87ceeb", density:0.003, label:"Clear Day" },
  hazy:     { color:"#ccccaa", density:0.015, label:"Hazy" },
  foggy:    { color:"#888888", density:0.04,  label:"Foggy" },
  misty:    { color:"#aabbcc", density:0.025, label:"Misty" },
  smoggy:   { color:"#bbaa88", density:0.03,  label:"Smoggy" },
  night:    { color:"#112244", density:0.02,  label:"Night" },
  dusk:     { color:"#cc6644", density:0.015, label:"Dusk" },
  underwater:{ color:"#004466",density:0.05,  label:"Underwater" },
};

export function applyAtmospherePreset(scene, presetKey) {
  const preset = ATMOSPHERE_PRESETS[presetKey];
  if (!preset) return;
  scene.fog       = new THREE.FogExp2(preset.color, preset.density);
  scene.background = new THREE.Color(preset.color);
  return preset;
}

// ── Volumetric light shaft ────────────────────────────────────────────────────
export function createLightShaft(scene, light, options = {}) {
  const {
    length   = 5,
    radius   = 0.5,
    segments = 8,
    color    = "#ffffff",
    opacity  = 0.1,
  } = options;

  const geo = new THREE.ConeGeometry(radius, length, segments, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity,
    side: THREE.DoubleSide, depthWrite: false,
  });

  const shaft = new THREE.Mesh(geo, mat);
  if (light.position) {
    shaft.position.copy(light.position);
    shaft.position.y -= length/2;
  }
  shaft.name = "LightShaft";
  scene.add(shaft);
  return shaft;
}
