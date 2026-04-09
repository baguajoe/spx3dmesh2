import * as THREE from "three";

export const HAIR_SHADER_PRESETS = {
  natural:  { rootColor:"#2a1a0a", tipColor:"#8b6040", specular1:"#ffffff", specular2:"#ffeecc", shift1:-0.1, shift2:0.1, roughness:0.7, label:"Natural" },
  blonde:   { rootColor:"#c8a060", tipColor:"#f0d090", specular1:"#ffffff", specular2:"#fff8e0", shift1:-0.08,shift2:0.12,roughness:0.6, label:"Blonde" },
  black:    { rootColor:"#0a0806", tipColor:"#1a1208", specular1:"#8888ff", specular2:"#ffffff", shift1:-0.15,shift2:0.05,roughness:0.8, label:"Black" },
  red:      { rootColor:"#4a1008", tipColor:"#cc3010", specular1:"#ffffff", specular2:"#ffccaa", shift1:-0.1, shift2:0.15,roughness:0.65,label:"Red" },
  silver:   { rootColor:"#888888", tipColor:"#cccccc", specular1:"#ffffff", specular2:"#eeeeff", shift1:-0.05,shift2:0.1, roughness:0.5, label:"Silver" },
  cyan:     { rootColor:"#004040", tipColor:"#00ffc8", specular1:"#ffffff", specular2:"#aaffee", shift1:-0.1, shift2:0.1, roughness:0.6, label:"Cyber Teal" },
};

export function createHairMaterial(options = {}) {
  const {
    rootColor  = "#2a1a0a",
    tipColor   = "#8b6040",
    roughness  = 0.7,
    metalness  = 0.0,
    opacity    = 1.0,
    alphaTest  = 0.5,
    doubleSide = true,
  } = options;

  return new THREE.MeshStandardMaterial({
    color:     rootColor,
    roughness, metalness, opacity,
    alphaTest,
    transparent: opacity < 1 || alphaTest > 0,
    side:      doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
}

export function createAnisotropicHairMaterial(presetKey = "natural") {
  const preset = HAIR_SHADER_PRESETS[presetKey] || HAIR_SHADER_PRESETS.natural;
  // Standard material with anisotropy approximation via roughness+metalness
  return new THREE.MeshStandardMaterial({
    color:     preset.tipColor,
    roughness: preset.roughness,
    metalness: 0.05,
    side:      THREE.DoubleSide,
    alphaTest: 0.3,
  });
}

export function applyRootTipGradient(hairLines, rootColor, tipColor) {
  const geo = hairLines.geometry;
  if (!geo.attributes.color) return;
  const colors = geo.attributes.color;
  const rc = new THREE.Color(rootColor), tc = new THREE.Color(tipColor);
  const count = colors.count;
  for (let i=0; i<count; i++) {
    const t = i/count;
    const c = rc.clone().lerp(tc, t);
    colors.setXYZ(i, c.r, c.g, c.b);
  }
  colors.needsUpdate = true;
}

export function applyHairPresetToMesh(mesh, presetKey) {
  const preset = HAIR_SHADER_PRESETS[presetKey];
  if (!preset || !mesh.material) return;
  mesh.material.color.set(preset.tipColor);
  mesh.material.roughness = preset.roughness;
  mesh.material.needsUpdate = true;
}

export function createHairAlphaTexture({ width=256, height=256, strands=12, opacity=0.9 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width=width; canvas.height=height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0,0,width,height);

  // Draw hair strands
  for (let s=0; s<strands; s++) {
    const x = (s/strands)*width + (Math.random()-0.5)*width*0.1;
    const grad = ctx.createLinearGradient(x, 0, x, height);
    grad.addColorStop(0,   `rgba(255,255,255,${opacity})`);
    grad.addColorStop(0.8, `rgba(255,255,255,${opacity*0.6})`);
    grad.addColorStop(1,   "rgba(255,255,255,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 2 + Math.random()*2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    // Slight wave
    for (let y=0; y<height; y+=10) {
      ctx.lineTo(x + Math.sin(y*0.05 + s)*3, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
