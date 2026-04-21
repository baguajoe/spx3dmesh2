import * as THREE from "three";

// ── Material preset library ───────────────────────────────────────────────────
export const MATERIAL_PRESETS = {
  // Metals
  chrome:      { color:"#c0c0c0", roughness:0.05, metalness:1.0, clearcoat:1.0, clearcoatRoughness:0.05, label:"Chrome" },
  gold:        { color:"#ffd700", roughness:0.1,  metalness:1.0, label:"Gold" },
  copper:      { color:"#b87333", roughness:0.2,  metalness:0.9, label:"Copper" },
  iron:        { color:"#888888", roughness:0.6,  metalness:0.8, label:"Iron" },
  brushedMetal:{ color:"#aaaaaa", roughness:0.4,  metalness:0.9, label:"Brushed Metal" },
  // Stone
  marble:      { color:"#f0f0f0", roughness:0.2,  metalness:0.0, clearcoat:0.8, clearcoatRoughness:0.1, label:"Marble" },
  granite:     { color:"#888060", roughness:0.7,  metalness:0.0, label:"Granite" },
  concrete:    { color:"#888888", roughness:0.9,  metalness:0.0, label:"Concrete" },
  slate:       { color:"#445566", roughness:0.8,  metalness:0.0, label:"Slate" },
  // Organic
  skin:        { color:"#ffcc99", roughness:0.7,  metalness:0.0, sheen:0.4, label:"Skin" },
  wood:        { color:"#8b4513", roughness:0.8,  metalness:0.0, label:"Wood" },
  leather:     { color:"#4a2f1a", roughness:0.6,  metalness:0.0, label:"Leather" },
  rubber:      { color:"#222222", roughness:0.9,  metalness:0.0, label:"Rubber" },
  // Glass/Plastic
  glass:       { color:"#aaccff", roughness:0.0,  metalness:0.0, transmission:1.0, ior:1.5, thickness:0.5, transparent:true, opacity:1.0, label:"Glass" },
  plastic:     { color:"#ff4444", roughness:0.3,  metalness:0.0, label:"Plastic" },
  ceramic:     { color:"#ffffff", roughness:0.1,  metalness:0.0, label:"Ceramic" },
  // Special
  emissiveTeal:{ color:"#00ffc8", roughness:0.5,  metalness:0.0, emissive:"#00ffc8", emissiveIntensity:0.5, label:"Emissive Teal" },
  emissiveOrange:{ color:"#FF6600", roughness:0.5, metalness:0.0, emissive:"#FF6600", emissiveIntensity:0.5, label:"Emissive Orange" },
  holographic: { color:"#88ffff", roughness:0.0,  metalness:1.0, label:"Holographic" },
  lava:        { color:"#ff4400", roughness:0.8,  metalness:0.0, emissive:"#ff2200", emissiveIntensity:0.8, label:"Lava" },
  ice:         { color:"#aaddff", roughness:0.05, metalness:0.0, transmission:0.9, ior:1.31, thickness:1.0, transparent:true, opacity:1.0, label:"Ice" },
  clay2:       { color:"#cc8866", roughness:0.9,  metalness:0.0, label:"Clay" },
};

// ── Apply preset to mesh ──────────────────────────────────────────────────────
export function applyPreset(mesh, presetKey) {
  const preset = MATERIAL_PRESETS[presetKey];
  if (!preset || !mesh) return;

  const mat = new THREE.MeshPhysicalMaterial({
    color:             new THREE.Color(preset.color),
    roughness:         preset.roughness,
    metalness:         preset.metalness,
    transparent:       preset.transparent || false,
    opacity:           preset.opacity !== undefined ? preset.opacity : 1.0,
    emissive:          preset.emissive ? new THREE.Color(preset.emissive) : new THREE.Color(0),
    emissiveIntensity: preset.emissiveIntensity || 0,
  });

  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map(() => mat.clone());
  } else {
    mesh.material = mat;
  }
  mesh.material.needsUpdate = true;
}

// ── Edge wear — darken edges ──────────────────────────────────────────────────
export function applyEdgeWear(mesh, { strength = 0.5, threshold = 0.3 } = {}) {
  const geo = mesh.geometry;
  if (!geo.attributes.color) {
    const count  = geo.attributes.position.count;
    const colors = new Float32Array(count * 3).fill(1);
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }

  // Detect edges by curvature (simplified — use normal difference)
  const pos     = geo.attributes.position;
  const normals = geo.attributes.normal;
  const colors  = geo.attributes.color;
  const idx     = geo.index;
  if (!normals || !idx) return;

  const arr = idx.array;
  for (let i = 0; i < arr.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const ai = arr[i+k], bi = arr[i+(k+1)%3];
      const na = new THREE.Vector3(normals.getX(ai), normals.getY(ai), normals.getZ(ai));
      const nb = new THREE.Vector3(normals.getX(bi), normals.getY(bi), normals.getZ(bi));
      const diff = 1 - na.dot(nb);
      if (diff > threshold) {
        const wear = 1 - diff * strength;
        colors.setXYZ(ai, wear, wear, wear);
        colors.setXYZ(bi, wear, wear, wear);
      }
    }
  }
  colors.needsUpdate = true;
  if (mesh.material) { mesh.material.vertexColors = true; mesh.material.needsUpdate = true; }
}

// ── Cavity dirt — darken concave areas ───────────────────────────────────────
export function applyCavityDirt(mesh, { strength = 0.8, blur = 2 } = {}) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  if (!pos || !nor) return;

  if (!geo.attributes.color) {
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3));
  }
  const colors = geo.attributes.color;
  const idx    = geo.index;
  if (!idx) return;

  // Compute concavity per vertex
  const concavity = new Float32Array(pos.count).fill(0);
  const counts    = new Uint32Array(pos.count).fill(0);
  const arr       = idx.array;

  for (let i = 0; i < arr.length; i += 3) {
    const [a, b, c] = [arr[i], arr[i+1], arr[i+2]];
    const pa = new THREE.Vector3(pos.getX(a), pos.getY(a), pos.getZ(a));
    const pb = new THREE.Vector3(pos.getX(b), pos.getY(b), pos.getZ(b));
    const pc = new THREE.Vector3(pos.getX(c), pos.getY(c), pos.getZ(c));
    const center = pa.clone().add(pb).add(pc).divideScalar(3);
    [a, b, c].forEach(vi => {
      const vp = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
      const vn = new THREE.Vector3(nor.getX(vi), nor.getY(vi), nor.getZ(vi));
      const toCenter = center.clone().sub(vp);
      const dot = toCenter.dot(vn);
      if (dot > 0) { concavity[vi] += dot; counts[vi]++; }
    });
  }

  for (let i = 0; i < pos.count; i++) {
    const c = counts[i] > 0 ? Math.min(1, concavity[i] / counts[i] * strength) : 0;
    const v = 1 - c;
    colors.setXYZ(i, v, v, v);
  }
  colors.needsUpdate = true;
  if (mesh.material) { mesh.material.vertexColors = true; mesh.material.needsUpdate = true; }
}

// ── Get preset categories ─────────────────────────────────────────────────────
export function getPresetCategories() {
  return {
    Metals:   ["chrome","gold","copper","iron","brushedMetal"],
    Stone:    ["marble","granite","concrete","slate"],
    Organic:  ["skin","wood","leather","rubber"],
    Glass:    ["glass","plastic","ceramic"],
    Special:  ["emissiveTeal","emissiveOrange","holographic","lava","ice","clay2"],
  };
}

// ── DISPLACEMENT MAP ──────────────────────────────────────────────────────────
export function applyDisplacementMap(mesh, options = {}) {
  if (!mesh?.geometry) return false;
  const {
    texture = null,
    scale = 0.1,
    bias = 0.0,
    noiseType = 'perlin',
    noiseScale = 4.0,
    noiseOctaves = 4,
    noiseAmplitude = 0.15,
  } = options;

  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  if (!pos) return false;

  // Generate displacement values
  const displace = new Float32Array(pos.count);

  if (texture) {
    // Use texture pixel data
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(texture.image, 0, 0, 256, 256);
    const imgData = ctx.getImageData(0, 0, 256, 256).data;
    const uvs = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const u = uvs ? uvs.getX(i) : (i / pos.count);
      const v = uvs ? uvs.getY(i) : 0.5;
      const px = Math.floor(u * 255) * 4;
      const py = Math.floor((1 - v) * 255) * 256 * 4;
      const idx = px + py;
      displace[i] = (imgData[idx] / 255) * scale + bias;
    }
  } else {
    // Procedural noise displacement
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      let val = 0;
      let amp = noiseAmplitude, freq = noiseScale;
      for (let o = 0; o < noiseOctaves; o++) {
        val += amp * simplexNoise(x * freq, y * freq, z * freq, noiseType);
        amp *= 0.5; freq *= 2.0;
      }
      displace[i] = val;
    }
  }

  // Apply displacement along normals
  const normals = geo.attributes.normal;
  if (!normals) { geo.computeVertexNormals(); }
  const nrm = geo.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    const d = displace[i];
    pos.setXYZ(
      i,
      pos.getX(i) + (nrm ? nrm.getX(i) : 0) * d,
      pos.getY(i) + (nrm ? nrm.getY(i) : 0) * d,
      pos.getZ(i) + (nrm ? nrm.getZ(i) : 0) * d,
    );
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return true;
}

// ── SIMPLE NOISE FUNCTIONS ────────────────────────────────────────────────────
function simplexNoise(x, y, z, type = 'perlin') {
  switch (type) {
    case 'voronoi': return voronoiNoise(x, y, z);
    case 'cellular': return cellularNoise(x, y, z);
    case 'perlin': default: return perlinNoise(x, y, z);
  }
}

function fade(t) { return t*t*t*(t*(t*6-15)+10); }
function lerp(a, b, t) { return a + t*(b-a); }
function grad(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y, v = h < 4 ? y : h===12||h===14 ? x : z;
  return ((h&1)===0?u:-u) + ((h&2)===0?v:-v);
}
const P = new Uint8Array(512);
for (let i=0;i<256;i++) P[i]=P[i+256]=Math.floor(Math.random()*256);

function perlinNoise(x, y, z) {
  const X=Math.floor(x)&255, Y=Math.floor(y)&255, Z=Math.floor(z)&255;
  x-=Math.floor(x); y-=Math.floor(y); z-=Math.floor(z);
  const u=fade(x), v=fade(y), w=fade(z);
  const A=P[X]+Y, AA=P[A]+Z, AB=P[A+1]+Z, B=P[X+1]+Y, BA=P[B]+Z, BB=P[B+1]+Z;
  return lerp(lerp(lerp(grad(P[AA],x,y,z),grad(P[BA],x-1,y,z),u),
    lerp(grad(P[AB],x,y-1,z),grad(P[BB],x-1,y-1,z),u),v),
    lerp(lerp(grad(P[AA+1],x,y,z-1),grad(P[BA+1],x-1,y,z-1),u),
    lerp(grad(P[AB+1],x,y-1,z-1),grad(P[BB+1],x-1,y-1,z-1),u),v),w);
}

function voronoiNoise(x, y, z) {
  let minDist = 1e10;
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) for (let dz=-1;dz<=1;dz++) {
    const cx = xi+dx, cy = yi+dy, cz = zi+dz;
    const rx = cx + Math.sin(cx*127.1+cy*311.7)*0.5+0.5;
    const ry = cy + Math.sin(cx*269.5+cy*183.3)*0.5+0.5;
    const rz = cz + Math.sin(cx*419.2+cy*371.9)*0.5+0.5;
    const d = Math.sqrt((x-rx)**2+(y-ry)**2+(z-rz)**2);
    if (d < minDist) minDist = d;
  }
  return Math.min(minDist, 1.0) * 2 - 1;
}

function cellularNoise(x, y, z) {
  let f1 = 1e10, f2 = 1e10;
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) for (let dz=-1;dz<=1;dz++) {
    const cx=xi+dx, cy=yi+dy, cz=zi+dz;
    const rx=cx+Math.sin(cx*127.1+cy*311.7)*0.5+0.5;
    const ry=cy+Math.sin(cx*269.5+cy*183.3)*0.5+0.5;
    const rz=cz+Math.sin(cx*419.2+cy*371.9)*0.5+0.5;
    const d=Math.sqrt((x-rx)**2+(y-ry)**2+(z-rz)**2);
    if (d < f1) { f2=f1; f1=d; } else if (d < f2) { f2=d; }
  }
  return (f2-f1)*2-1;
}

// ── CLEARCOAT MATERIAL ────────────────────────────────────────────────────────
export function applyClearcoatMaterial(mesh, options = {}) {
  if (!mesh) return false;
  const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
  if (!THREE) return false;
  const { clearcoat=1.0, clearcoatRoughness=0.1, color="#ffffff",
    roughness=0.3, metalness=0.0, wetness=false } = options;
  mesh.material = new THREE.MeshPhysicalMaterial({
    color, roughness, metalness,
    clearcoat, clearcoatRoughness,
    reflectivity: wetness ? 1.0 : 0.5,
    envMapIntensity: wetness ? 2.0 : 1.0,
  });
  mesh.material.needsUpdate = true;
  return true;
}

// ── ANISOTROPY MATERIAL ───────────────────────────────────────────────────────
export function applyAnisotropyMaterial(mesh, options = {}) {
  if (!mesh) return false;
  const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
  if (!THREE) return false;
  const { anisotropy=1.0, anisotropyRotation=0.0, color="#c0c0c0",
    roughness=0.2, metalness=0.8 } = options;
  mesh.material = new THREE.MeshPhysicalMaterial({
    color, roughness, metalness,
    anisotropy, anisotropyRotation,
  });
  mesh.material.needsUpdate = true;
  return true;
}

// ── TRANSMISSION (SKIN/TRANSLUCENT) ──────────────────────────────────────────
export function applySkinSSS(mesh, options = {}) {
  if (!mesh) return false;
  const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
  if (!THREE) return false;
  const { color="#ffcc99", roughness=0.7, subsurface=0.4,
    subsurfaceRadius=[1.0, 0.2, 0.1], thickness=0.5 } = options;
  mesh.material = new THREE.MeshPhysicalMaterial({
    color, roughness, metalness: 0,
    sheen: subsurface, sheenColor: subsurfaceRadius[0] > 0.5 ? "#ff8866" : "#ffaaaa",
    transmission: 0.05, thickness,
    clearcoat: 0.1, clearcoatRoughness: 0.4,
  });
  mesh.material.needsUpdate = true;
  return true;
}

// ── AREA LIGHT ────────────────────────────────────────────────────────────────
export function addAreaLight(scene, options = {}) {
  const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
  if (!THREE || !scene) return null;
  const { color="#ffffff", intensity=2.0, width=2, height=2,
    position=[0,3,0], target=[0,0,0] } = options;
  const light = new THREE.RectAreaLight(color, intensity, width, height);
  light.position.set(...position);
  light.lookAt(...target);
  scene.add(light);
  // Visual helper
  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    color, side: THREE.DoubleSide, transparent: true, opacity: 0.3,
  });
  const helper = new THREE.Mesh(geo, mat);
  helper.position.set(...position);
  helper.lookAt(...target);
  scene.add(helper);
  return { light, helper };
}

// ── MULTI-LAYER TEXTURE BLEND ─────────────────────────────────────────────────
export function applyMultiLayerTexture(mesh, layers = {}) {
  if (!mesh?.material) return false;
  const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
  if (!THREE) return false;
  // layers: { base, cavity, curvature, colorVariation, roughness }
  // Apply each map to the appropriate material slot
  if (layers.cavity) mesh.material.aoMap = layers.cavity;
  if (layers.colorVariation) mesh.material.map = layers.colorVariation;
  if (layers.roughness) mesh.material.roughnessMap = layers.roughness;
  if (layers.normal) mesh.material.normalMap = layers.normal;
  if (layers.displacement) mesh.material.displacementMap = layers.displacement;
  mesh.material.needsUpdate = true;
  return true;
}

// ── PROCEDURAL SKIN TEXTURE ────────────────────────────────────────────────────
// Generates a realistic skin-like procedural texture on a canvas
export function generateProceduralSkinTexture(options = {}) {
  const { size=1024, baseColor=[255,180,140], poreScale=60,
    wrinkleScale=8, variation=0.15 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = x / size * poreScale, ny = y / size * poreScale;
      // Voronoi for pores
      const pore = voronoiNoise(nx, ny, 0) * 0.5 + 0.5;
      // Perlin for large variation
      const lv = perlinNoise(x/size*wrinkleScale, y/size*wrinkleScale, 0.5) * 0.5 + 0.5;
      // Combine
      const skin = pore * 0.3 + lv * 0.7;
      const vari = 1.0 - skin * variation;
      d[i]   = Math.min(255, Math.round(baseColor[0] * vari));
      d[i+1] = Math.min(255, Math.round(baseColor[1] * vari * 0.95));
      d[i+2] = Math.min(255, Math.round(baseColor[2] * vari * 0.9));
      d[i+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// ── PROCEDURAL SCALE TEXTURE (for creatures like Godzilla) ───────────────────
export function generateScaleTexture(options = {}) {
  const { size=1024, scaleSize=20, depth=0.8,
    baseColor=[40,60,40], scaleColor=[60,90,50] } = options;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = x / size * scaleSize, ny = y / size * scaleSize;
      // Voronoi for scale cells
      const cell = voronoiNoise(nx, ny, 0) * 0.5 + 0.5;
      // Edge detection (dark at cell borders)
      const edge = Math.pow(cell, 0.3);
      // Large noise for variation
      const lv = perlinNoise(x/size*4, y/size*4, 0) * 0.5 + 0.5;

      const t = edge * (0.7 + lv * 0.3);
      d[i]   = Math.round(baseColor[0] + (scaleColor[0]-baseColor[0]) * t);
      d[i+1] = Math.round(baseColor[1] + (scaleColor[1]-baseColor[1]) * t);
      d[i+2] = Math.round(baseColor[2] + (scaleColor[2]-baseColor[2]) * t);
      d[i+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// ── GENERATE NORMAL MAP FROM CANVAS ───────────────────────────────────────────
export function canvasToNormalMap(canvas, strength = 2.0) {
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  const src = ctx.getImageData(0, 0, size, size).data;
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const octx = out.getContext('2d');
  const outData = octx.createImageData(size, size);
  const d = outData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y*size+x)*4;
      const l = src[((y*size+Math.max(0,x-1))*4)];
      const r = src[((y*size+Math.min(size-1,x+1))*4)];
      const u = src[((Math.max(0,y-1)*size+x)*4)];
      const dn = src[((Math.min(size-1,y+1)*size+x)*4)];
      const nx = (l-r)/255 * strength;
      const ny = (u-dn)/255 * strength;
      const nz = Math.sqrt(Math.max(0, 1-nx*nx-ny*ny));
      d[i]   = Math.round((nx*0.5+0.5)*255);
      d[i+1] = Math.round((ny*0.5+0.5)*255);
      d[i+2] = Math.round(nz*255);
      d[i+3] = 255;
    }
  }
  octx.putImageData(outData, 0, 0);
  return out;
}

// ══════════════════════════════════════════════════════════════════════════════
// REALISTIC HUMAN SKIN SYSTEM
// Multi-layer SSS + procedural textures + skin tone library
// ══════════════════════════════════════════════════════════════════════════════

// ── Skin tone library (based on Fitzpatrick scale + common ethnicities) ───────
export const SKIN_TONES = {
  // Fair
  porcelain:    { base:"#f8ede3", sub:"#f4c5b0", scatter:"#ff9980", vein:"#9090c0", label:"Porcelain" },
  fair:         { base:"#f5d5c0", sub:"#f0b899", scatter:"#ff8866", vein:"#8888bb", label:"Fair" },
  light:        { base:"#edc9a8", sub:"#dea882", scatter:"#e87755", vein:"#7777aa", label:"Light" },
  // Medium
  medium:       { base:"#d4a574", sub:"#c08050", scatter:"#cc6633", vein:"#886688", label:"Medium" },
  olive:        { base:"#c49a6c", sub:"#b07840", scatter:"#bb5522", vein:"#776677", label:"Olive" },
  tan:          { base:"#b8864e", sub:"#9c6632", scatter:"#aa4411", vein:"#665566", label:"Tan" },
  // Deep
  brown:        { base:"#8b5e3c", sub:"#6b3e1c", scatter:"#883311", vein:"#553355", label:"Brown" },
  deep_brown:   { base:"#6b3e26", sub:"#4e2410", scatter:"#660022", vein:"#442244", label:"Deep Brown" },
  dark:         { base:"#4a2810", sub:"#341806", scatter:"#440011", vein:"#331133", label:"Dark" },
  ebony:        { base:"#2c1608", sub:"#1e0c04", scatter:"#330011", vein:"#220022", label:"Ebony" },
  // Special
  albino:       { base:"#fef0ea", sub:"#fad4c8", scatter:"#ffbbaa", vein:"#ddaaaa", label:"Albino" },
  vitiligo:     { base:"#f5e6da", sub:"#f0c8b0", scatter:"#ff9977", vein:"#9999cc", label:"Vitiligo" },
  aged:         { base:"#d4a882", sub:"#b88860", scatter:"#cc6644", vein:"#887788", label:"Aged" },
  newborn:      { base:"#ffddcc", sub:"#ffbbaa", scatter:"#ff9988", vein:"#aaaaee", label:"Newborn" },
};

// ── Core realistic skin material ───────────────────────────────────────────────
// Uses MeshPhysicalMaterial with multi-layer SSS approximation via sheen + transmission
export function applyRealisticSkin(mesh, options = {}) {
  if (!mesh) return false;
  const THREE = window.THREE;
  if (!THREE) return false;

  const toneKey = options.tone || 'medium';
  const tone = SKIN_TONES[toneKey] || SKIN_TONES.medium;

  const {
    // Base properties
    color = tone.base,
    roughness = 0.72,
    metalness = 0.0,
    // SSS properties
    subsurfaceStrength = 0.6,
    subsurfaceColor = tone.scatter,
    subsurfaceRadius = 0.8,
    // Surface properties
    poreStrength = 0.3,
    oiliness = 0.15,        // clearcoat = oily/wet areas
    hairFollicles = false,
    // Body region
    region = 'face',        // face | body | hand | lip | ear
  } = options;

  // Region-specific adjustments
  const regionProps = {
    face:  { roughness: 0.68, clearcoat: oiliness, sheenColor: tone.scatter, thickness: 0.6 },
    body:  { roughness: 0.75, clearcoat: oiliness * 0.5, sheenColor: tone.scatter, thickness: 0.8 },
    hand:  { roughness: 0.80, clearcoat: 0.05, sheenColor: tone.scatter, thickness: 1.0 },
    lip:   { roughness: 0.40, clearcoat: 0.5, sheenColor: "#ff6655", thickness: 0.3 },
    ear:   { roughness: 0.65, clearcoat: 0.1, sheenColor: tone.scatter, thickness: 0.3, transmission: 0.15 },
    nose:  { roughness: 0.55, clearcoat: 0.3, sheenColor: tone.scatter, thickness: 0.4 },
  };
  const rp = regionProps[region] || regionProps.face;

  mesh.material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: rp.roughness,
    metalness,
    // SSS approximation via sheen
    sheen: subsurfaceStrength,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(rp.sheenColor || subsurfaceColor),
    // Clearcoat for oily areas (nose, forehead T-zone)
    clearcoat: rp.clearcoat || oiliness,
    clearcoatRoughness: 0.3,
    // Transmission for thin areas (ears, lips, nostrils)
    transmission: rp.transmission || 0,
    thickness: rp.thickness || 0.5,
    ior: 1.4, // skin IOR
    // Reflectivity
    reflectivity: 0.04, // non-metallic fresnel
    envMapIntensity: 0.8,
  });

  mesh.material.needsUpdate = true;
  return true;
}

// ── Generate full skin texture stack ──────────────────────────────────────────
// Returns { color, roughness, normal, ao } canvas maps
export function generateFullSkinTextures(options = {}) {
  const {
    size = 1024,
    tone = 'medium',
    poreScale = 55,
    wrinkleStrength = 0.5,
    region = 'face',
    age = 30,        // 0-100 — affects wrinkle density
    oiliness = 0.15,
  } = options;

  const skinTone = SKIN_TONES[tone] || SKIN_TONES.medium;
  const baseRGB = hexToRGB(skinTone.base);
  const subRGB  = hexToRGB(skinTone.scatter);

  const colorCanvas    = document.createElement('canvas');
  const roughCanvas    = document.createElement('canvas');
  const normalCanvas   = document.createElement('canvas');
  const aoCanvas       = document.createElement('canvas');

  [colorCanvas, roughCanvas, normalCanvas, aoCanvas].forEach(c => {
    c.width = c.height = size;
  });

  const colorCtx  = colorCanvas.getContext('2d');
  const roughCtx  = roughCanvas.getContext('2d');
  const normalCtx = normalCanvas.getContext('2d');
  const aoCtx     = aoCanvas.getContext('2d');

  const colorData  = colorCtx.createImageData(size, size);
  const roughData  = roughCtx.createImageData(size, size);
  const normalData = normalCtx.createImageData(size, size);
  const aoData     = aoCtx.createImageData(size, size);

  const cd = colorData.data, rd = roughData.data;
  const nd = normalData.data, ad = aoData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = x / size, ny = y / size;

      // ── Pore layer (voronoi) ──
      const poreX = nx * poreScale, poreY = ny * poreScale;
      const poreVal = voronoiNoise(poreX, poreY, 0.5) * 0.5 + 0.5;
      const poreDark = Math.pow(poreVal, 1.5); // pore centers darker

      // ── Large variation (perlin) ──
      const lv1 = perlinNoise(nx*3, ny*3, 0) * 0.5 + 0.5;
      const lv2 = perlinNoise(nx*7, ny*7, 1) * 0.5 + 0.5;

      // ── Wrinkle layer (fine perlin) ──
      const ageScale = 4 + age * 0.08;
      const wrinkle = Math.abs(perlinNoise(nx*ageScale, ny*ageScale, 2)) * wrinkleStrength;

      // ── Pore bump for normal map ──
      const poreL = voronoiNoise(poreX-0.01, poreY, 0.5) * 0.5 + 0.5;
      const poreR = voronoiNoise(poreX+0.01, poreY, 0.5) * 0.5 + 0.5;
      const poreU = voronoiNoise(poreX, poreY-0.01, 0.5) * 0.5 + 0.5;
      const poreDn = voronoiNoise(poreX, poreY+0.01, 0.5) * 0.5 + 0.5;

      // ── Color map ──
      // Mix base skin color with subsurface scatter color in pore valleys
      const poreInfluence = 1 - poreDark * 0.25;
      const varInfluence  = 0.85 + lv1 * 0.15;
      const wrinkShadow   = 1 - wrinkle * 0.15;

      // Blood vessel suggestion (very subtle red variation)
      const blood = perlinNoise(nx*2, ny*2, 3) * 0.5 + 0.5;
      const bloodR = 1.0 + blood * 0.04;
      const bloodG = 1.0 - blood * 0.02;

      cd[i]   = Math.min(255, Math.round(baseRGB[0] * poreInfluence * varInfluence * wrinkShadow * bloodR));
      cd[i+1] = Math.min(255, Math.round(baseRGB[1] * poreInfluence * varInfluence * wrinkShadow * bloodG));
      cd[i+2] = Math.min(255, Math.round(baseRGB[2] * poreInfluence * varInfluence * wrinkShadow));
      cd[i+3] = 255;

      // ── Roughness map ──
      // Pore centers = rougher, oily areas = smoother
      const baseRough = 0.65 + (1 - poreDark) * 0.2 + wrinkle * 0.15;
      const oilySpot = perlinNoise(nx*2, ny*2, 4) * 0.5 + 0.5;
      const finalRough = Math.max(0, Math.min(1, baseRough - oiliness * oilySpot));
      const roughVal = Math.round(finalRough * 255);
      rd[i] = rd[i+1] = rd[i+2] = roughVal;
      rd[i+3] = 255;

      // ── Normal map ──
      const strength = 3.0;
      const nnx = (poreL - poreR) * strength;
      const nny = (poreU - poreDn) * strength;
      const nnz = Math.sqrt(Math.max(0, 1 - nnx*nnx - nny*nny));
      nd[i]   = Math.round((nnx * 0.5 + 0.5) * 255);
      nd[i+1] = Math.round((nny * 0.5 + 0.5) * 255);
      nd[i+2] = Math.round(nnz * 255);
      nd[i+3] = 255;

      // ── AO map (cavity) ──
      const ao = 0.7 + poreDark * 0.3 - wrinkle * 0.1;
      const aoVal = Math.min(255, Math.round(ao * 255));
      ad[i] = ad[i+1] = ad[i+2] = aoVal;
      ad[i+3] = 255;
    }
  }

  colorCtx.putImageData(colorData, 0, 0);
  roughCtx.putImageData(roughData, 0, 0);
  normalCtx.putImageData(normalData, 0, 0);
  aoCtx.putImageData(aoData, 0, 0);

  return { color: colorCanvas, roughness: roughCanvas, normal: normalCanvas, ao: aoCanvas };
}

// ── Apply full skin texture stack to mesh ─────────────────────────────────────
export function applyFullSkinTextures(mesh, textures) {
  if (!mesh?.material || !textures) return false;
  const THREE = window.THREE;
  if (!THREE) return false;
  const { color, roughness, normal, ao } = textures;
  if (color)    mesh.material.map          = new THREE.CanvasTexture(color);
  if (roughness)mesh.material.roughnessMap = new THREE.CanvasTexture(roughness);
  if (normal)   mesh.material.normalMap    = new THREE.CanvasTexture(normal);
  if (ao)       mesh.material.aoMap        = new THREE.CanvasTexture(ao);
  mesh.material.needsUpdate = true;
  return true;
}

// ── Lip material ──────────────────────────────────────────────────────────────
export function applyLipMaterial(mesh, options = {}) {
  const THREE = window.THREE;
  if (!THREE || !mesh) return false;
  const { color="#cc4444", gloss=0.7, tone='medium' } = options;
  const skinTone = SKIN_TONES[tone] || SKIN_TONES.medium;
  // Mix lip color with skin tone
  mesh.material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: 1.0 - gloss * 0.7,
    metalness: 0,
    sheen: 0.6,
    sheenColor: new THREE.Color("#ff8877"),
    clearcoat: gloss,
    clearcoatRoughness: 0.1,
    transmission: 0.08,
    thickness: 0.2,
  });
  mesh.material.needsUpdate = true;
  return true;
}

// ── Eye material ──────────────────────────────────────────────────────────────
export function applyEyeMaterial(mesh, options = {}) {
  const THREE = window.THREE;
  if (!THREE || !mesh) return false;
  const { irisColor="#4a7c9e", pupilSize=0.35 } = options;
  mesh.material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(irisColor),
    roughness: 0.0,
    metalness: 0.0,
    transmission: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    ior: 1.34,
    thickness: 0.5,
  });
  mesh.material.needsUpdate = true;
  return true;
}

// ── Set up RectAreaLight for skin rendering ────────────────────────────────────
export async function setupSkinLighting(scene, renderer) {
  const THREE = window.THREE;
  if (!THREE || !scene || !renderer) return null;
  try {
    const { RectAreaLightUniformsLib } = await import('three/examples/jsm/lights/RectAreaLightUniformsLib.js');
    RectAreaLightUniformsLib.init();
    // Key light (warm)
    const keyLight = new THREE.RectAreaLight("#fff5e0", 4, 1.5, 2.0);
    keyLight.position.set(1.5, 2, 2); keyLight.lookAt(0, 0, 0);
    scene.add(keyLight);
    // Fill light (cool)
    const fillLight = new THREE.RectAreaLight("#e0f0ff", 2, 1.0, 1.5);
    fillLight.position.set(-2, 1, 1); fillLight.lookAt(0, 0, 0);
    scene.add(fillLight);
    // Rim light (warm back)
    const rimLight = new THREE.RectAreaLight("#ffeecc", 3, 0.5, 1.5);
    rimLight.position.set(0, 1, -2); rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);
    return { keyLight, fillLight, rimLight };
  } catch(e) {
    console.warn("RectAreaLight setup failed:", e);
    return null;
  }
}

// ── Helper: hex to RGB ────────────────────────────────────────────────────────
function hexToRGB(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return [r, g, b];
}

// ══════════════════════════════════════════════════════════════════════════════
// FILM-QUALITY SKIN — Jimenez Screen-Space SSS + Multi-Resolution Normals
// Based on the technique used in film and AAA games (Frostbite, UE5, ILM)
// ══════════════════════════════════════════════════════════════════════════════

// ── True 3-channel SSS via custom ShaderMaterial ─────────────────────────────
// R scatters 1.0 (far) — deep red-orange subsurface
// G scatters 0.2 (medium) — mid-green subsurface
// B scatters 0.1 (shallow) — blue barely scatters
export const JIMENEZ_SSS_VERT = `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying vec3 vViewPos;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
  vViewPos = viewPos.xyz;
  gl_Position = projectionMatrix * viewPos;
}
`;

export const JIMENEZ_SSS_FRAG = `
precision highp float;

uniform sampler2D tColor;
uniform sampler2D tNormal;
uniform sampler2D tRoughness;
uniform vec3  uLightPos;
uniform vec3  uLightColor;
uniform float uLightIntensity;
uniform vec3  uCameraPos;
uniform vec3  uSkinColor;
uniform vec3  uScatterColor;   // subsurface scatter color
uniform float uScatterRadius;  // overall SSS radius
uniform float uSSSStrength;
uniform float uRoughness;
uniform float uClearcoat;
uniform float uClearcoatRoughness;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying vec3 vViewPos;

// ── Gaussian SSS weights (Jimenez 2015) ──────────────────────────────────────
// 3 Gaussian lobes per channel — simulates true spectral SSS
vec3 gaussianSSS(float r) {
  // Red — wide scatter (1.0 unit radius)
  float r1 = 0.233 * exp(-r*r / 0.0064) +
             0.100 * exp(-r*r / 0.0484) +
             0.118 * exp(-r*r / 0.1870) +
             0.113 * exp(-r*r / 0.5670) +
             0.358 * exp(-r*r / 1.9900) +
             0.078 * exp(-r*r / 7.4100);
  // Green — medium scatter
  float g1 = 0.455 * exp(-r*r / 0.0064) +
             0.336 * exp(-r*r / 0.0484) +
             0.198 * exp(-r*r / 0.1870) +
             0.007 * exp(-r*r / 0.5670) +
             0.004 * exp(-r*r / 1.9900);
  // Blue — shallow scatter
  float b1 = 0.649 * exp(-r*r / 0.0064) +
             0.344 * exp(-r*r / 0.0484) +
             0.007 * exp(-r*r / 0.1870);
  return vec3(r1, g1, b1);
}

// ── GGX Microfacet BRDF ────────────────────────────────────────────────────
float GGX_D(float NdotH, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
  return a2 / (3.14159265 * denom * denom);
}

float GGX_G(float NdotV, float NdotL, float roughness) {
  float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
  float gl = NdotL / (NdotL * (1.0 - k) + k);
  float gv = NdotV / (NdotV * (1.0 - k) + k);
  return gl * gv;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightPos - vWorldPos);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 H = normalize(L + V);

  float NdotL = max(dot(N, L), 0.0);
  float NdotV = max(dot(N, V), 0.001);
  float NdotH = max(dot(N, H), 0.0);
  float VdotH = max(dot(V, H), 0.0);

  // Sample textures
  vec4  colorTex = texture2D(tColor, vUv);
  float roughTex = texture2D(tRoughness, vUv).r;
  float rough = uRoughness * roughTex;

  // ── Diffuse (Lambertian) ──
  vec3 albedo = colorTex.rgb * uSkinColor;
  vec3 diffuse = albedo * NdotL;

  // ── Specular (GGX) ──
  vec3 F0 = vec3(0.028); // skin F0 ~2.8%
  vec3 F  = fresnelSchlick(VdotH, F0);
  float D = GGX_D(NdotH, rough);
  float G = GGX_G(NdotV, NdotL, rough);
  vec3 specular = (D * G * F) / max(4.0 * NdotV * NdotL, 0.001);

  // ── SSS approximation (wrap lighting + scatter tint) ──
  // Wrap lighting extends light into shadow terminator
  float wrap = 0.3;
  float wrapNdotL = (NdotL + wrap) / (1.0 + wrap);
  vec3 sssWeights = gaussianSSS(uScatterRadius * (1.0 - wrapNdotL));
  vec3 sss = uScatterColor * sssWeights * uSSSStrength * albedo;

  // ── Clearcoat (wet/oily skin layer) ──
  float ccRough = uClearcoatRoughness;
  float ccD = GGX_D(NdotH, ccRough);
  float ccG = GGX_G(NdotV, NdotL, ccRough);
  vec3  ccF = fresnelSchlick(VdotH, vec3(0.04));
  vec3 clearcoat = (ccD * ccG * ccF) / max(4.0 * NdotV * NdotL, 0.001) * uClearcoat;

  // ── Final composite ──
  vec3 light = uLightColor * uLightIntensity;
  vec3 color = light * (diffuse + specular * (1.0 - uSSSStrength) + sss + clearcoat);

  // Gamma correction
  color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));

  gl_FragColor = vec4(color, 1.0);
}
`;

// ── Create Jimenez SSS ShaderMaterial ─────────────────────────────────────────
export function createJimenezSkinMaterial(options = {}) {
  const THREE = window.THREE;
  if (!THREE) return null;

  const toneKey = options.tone || 'medium';
  const tone = (typeof SKIN_TONES !== 'undefined' ? SKIN_TONES : {})[toneKey] || { base:"#d4a574", scatter:"#cc6633" };

  const skinRGB = hexToRGB2(tone.base);
  const scatRGB = hexToRGB2(tone.scatter);

  return new THREE.ShaderMaterial({
    vertexShader:   JIMENEZ_SSS_VERT,
    fragmentShader: JIMENEZ_SSS_FRAG,
    uniforms: {
      tColor:              { value: null },
      tNormal:             { value: null },
      tRoughness:          { value: null },
      uLightPos:           { value: new THREE.Vector3(2, 3, 2) },
      uLightColor:         { value: new THREE.Color("#fff5e0") },
      uLightIntensity:     { value: 3.0 },
      uCameraPos:          { value: new THREE.Vector3(0, 0, 5) },
      uSkinColor:          { value: new THREE.Vector3(skinRGB[0]/255, skinRGB[1]/255, skinRGB[2]/255) },
      uScatterColor:       { value: new THREE.Vector3(scatRGB[0]/255, scatRGB[1]/255, scatRGB[2]/255) },
      uScatterRadius:      { value: options.scatterRadius || 0.6 },
      uSSSStrength:        { value: options.sssStrength || 0.5 },
      uRoughness:          { value: options.roughness || 0.7 },
      uClearcoat:          { value: options.clearcoat || 0.1 },
      uClearcoatRoughness: { value: options.clearcoatRoughness || 0.3 },
    },
    lights: false, // manual light uniforms
  });
}

// ── Apply Jimenez SSS to mesh ─────────────────────────────────────────────────
export function applyJimenezSkin(mesh, options = {}) {
  if (!mesh) return false;
  const mat = createJimenezSkinMaterial(options);
  if (!mat) return false;
  // Transfer existing texture maps if present
  if (mesh.material?.map)          mat.uniforms.tColor.value    = mesh.material.map;
  if (mesh.material?.normalMap)    mat.uniforms.tNormal.value   = mesh.material.normalMap;
  if (mesh.material?.roughnessMap) mat.uniforms.tRoughness.value= mesh.material.roughnessMap;
  mesh.material = mat;
  return true;
}

// ── Multi-Resolution Normal Blending ─────────────────────────────────────────
// Blends 3 normal map levels: macro (wrinkles) + meso (pores) + micro (fine texture)
export function generateMultiResNormals(options = {}) {
  const { size=2048, tone='medium', age=30 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const data = ctx.createImageData(size, size);
  const d = data.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = x / size, ny = y / size;

      // Macro: large wrinkles (low frequency)
      const macroScale = 2 + age * 0.04;
      const mL = perlinNoise(nx*macroScale - 0.005, ny*macroScale, 2) * 0.5 + 0.5;
      const mR = perlinNoise(nx*macroScale + 0.005, ny*macroScale, 2) * 0.5 + 0.5;
      const mU = perlinNoise(nx*macroScale, ny*macroScale - 0.005, 2) * 0.5 + 0.5;
      const mD = perlinNoise(nx*macroScale, ny*macroScale + 0.005, 2) * 0.5 + 0.5;

      // Meso: pores (medium frequency)
      const mesoScale = 50;
      const vL = voronoiNoise(nx*mesoScale - 0.01, ny*mesoScale, 0.5) * 0.5 + 0.5;
      const vR = voronoiNoise(nx*mesoScale + 0.01, ny*mesoScale, 0.5) * 0.5 + 0.5;
      const vU = voronoiNoise(nx*mesoScale, ny*mesoScale - 0.01, 0.5) * 0.5 + 0.5;
      const vD = voronoiNoise(nx*mesoScale, ny*mesoScale + 0.01, 0.5) * 0.5 + 0.5;

      // Micro: fine skin texture (high frequency)
      const microScale = 200;
      const pL = perlinNoise(nx*microScale - 0.002, ny*microScale, 7) * 0.5 + 0.5;
      const pR = perlinNoise(nx*microScale + 0.002, ny*microScale, 7) * 0.5 + 0.5;
      const pU = perlinNoise(nx*microScale, ny*microScale - 0.002, 7) * 0.5 + 0.5;
      const pD = perlinNoise(nx*microScale, ny*microScale + 0.002, 7) * 0.5 + 0.5;

      // Blend: macro strong, meso medium, micro subtle
      const macroStr = 3.0 * (age / 50);
      const mesoStr  = 2.0;
      const microStr = 0.8;

      const bx = (mL-mR)*macroStr + (vL-vR)*mesoStr + (pL-pR)*microStr;
      const by = (mU-mD)*macroStr + (vU-vD)*mesoStr + (pU-pD)*microStr;
      const bz = Math.sqrt(Math.max(0, 1 - bx*bx - by*by));

      d[i]   = Math.min(255, Math.round((bx*0.5+0.5)*255));
      d[i+1] = Math.min(255, Math.round((by*0.5+0.5)*255));
      d[i+2] = Math.round(bz*255);
      d[i+3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

// ── 8K Texture Generator ──────────────────────────────────────────────────────
export function generateFilmQualitySkinTextures(options = {}) {
  const size8k = options.size || 4096; // 4K default, set 8192 for 8K (slow)
  return generateFullSkinTextures({ ...options, size: size8k });
}

// ── Wire SSAO into existing EffectComposer ────────────────────────────────────
export async function wireSSAOToComposer(renderer, scene, camera, composer) {
  if (!renderer || !scene || !camera || !composer) return false;
  try {
    const { SSAOPass } = await import('three/examples/jsm/postprocessing/SSAOPass.js');
    const w = renderer.domElement.width, h = renderer.domElement.height;
    const ssaoPass = new SSAOPass(scene, camera, w, h);
    ssaoPass.kernelRadius = 16;
    ssaoPass.minDistance  = 0.005;
    ssaoPass.maxDistance  = 0.3;
    // Insert SSAO as second pass (after RenderPass, before bloom)
    composer.passes.splice(1, 0, ssaoPass);
    return ssaoPass;
  } catch(e) {
    console.warn("SSAO wire failed:", e);
    return false;
  }
}

// ── Initialize LTC Area Lights ────────────────────────────────────────────────
export async function initLTCAreaLights(renderer) {
  try {
    const { RectAreaLightUniformsLib } = await import('three/examples/jsm/lights/RectAreaLightUniformsLib.js');
    RectAreaLightUniformsLib.init();
    return true;
  } catch(e) {
    console.warn("LTC init failed:", e);
    return false;
  }
}

function hexToRGB2(hex) {
  if (!hex || hex.length < 7) return [200, 160, 120];
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

// ══════════════════════════════════════════════════════════════════════════════
// SURFACE MATERIAL LIBRARY + CHARACTER SKIN VARIANTS + CUSTOM SKIN BUILDER
// ══════════════════════════════════════════════════════════════════════════════

export const SURFACE_PRESETS = {
  // ── WATER ────────────────────────────────────────────────────────────────────
  ocean_water:   { type:'water', color:"#006994", roughness:0.02, transmission:0.95, ior:1.333, clearcoat:1.0, clearcoatRoughness:0.0,  label:"Ocean Water" },
  shallow_water: { type:'water', color:"#40b4c8", roughness:0.03, transmission:0.85, ior:1.333, clearcoat:1.0, clearcoatRoughness:0.0,  label:"Shallow Water" },
  murky_water:   { type:'water', color:"#2d5a27", roughness:0.15, transmission:0.5,  ior:1.333, clearcoat:0.8, clearcoatRoughness:0.1,  label:"Murky Water" },
  ice_water:     { type:'water', color:"#aaddff", roughness:0.05, transmission:0.8,  ior:1.309, clearcoat:0.9, clearcoatRoughness:0.05, label:"Ice" },
  lava:          { type:'water', color:"#ff4400", roughness:0.3,  transmission:0.2,  ior:1.5,   clearcoat:0.3, clearcoatRoughness:0.4,  label:"Lava" },
  blood:         { type:'water', color:"#8b0000", roughness:0.08, transmission:0.3,  ior:1.36,  clearcoat:0.9, clearcoatRoughness:0.05, label:"Blood" },
  // ── ROCK / STONE ─────────────────────────────────────────────────────────────
  granite:       { type:'rock', color:"#8b7355", roughness:0.85, noiseScale:8,  depth:0.08, label:"Granite" },
  limestone:     { type:'rock', color:"#d4c5a9", roughness:0.90, noiseScale:6,  depth:0.06, label:"Limestone" },
  obsidian:      { type:'rock', color:"#1a1a2e", roughness:0.05, noiseScale:12, depth:0.03, clearcoat:0.8, label:"Obsidian" },
  sandstone:     { type:'rock', color:"#c2956c", roughness:0.95, noiseScale:4,  depth:0.05, label:"Sandstone" },
  marble:        { type:'rock', color:"#f0ece0", roughness:0.15, noiseScale:3,  depth:0.02, clearcoat:0.6, label:"Marble" },
  volcanic:      { type:'rock', color:"#2d1b00", roughness:0.95, noiseScale:10, depth:0.12, label:"Volcanic Rock" },
  crystal:       { type:'rock', color:"#88ccff", roughness:0.0,  noiseScale:20, depth:0.04, transmission:0.7, ior:1.5, clearcoat:1.0, label:"Crystal" },
  cave_stone:    { type:'rock', color:"#4a4a4a", roughness:0.92, noiseScale:7,  depth:0.10, label:"Cave Stone" },
  // ── METAL ────────────────────────────────────────────────────────────────────
  chrome:        { type:'metal', color:"#c8c8c8", roughness:0.05, metalness:1.0, label:"Chrome" },
  brushed_steel: { type:'metal', color:"#a8a8a8", roughness:0.25, metalness:1.0, anisotropy:0.9, label:"Brushed Steel" },
  rust:          { type:'metal', color:"#8b3a2a", roughness:0.85, metalness:0.4, noiseScale:15, depth:0.06, label:"Rust" },
  gold:          { type:'metal', color:"#ffd700", roughness:0.10, metalness:1.0, label:"Gold" },
  copper:        { type:'metal', color:"#b87333", roughness:0.20, metalness:1.0, label:"Copper" },
  bronze:        { type:'metal', color:"#cd7f32", roughness:0.30, metalness:0.9, label:"Bronze" },
  iron:          { type:'metal', color:"#434343", roughness:0.60, metalness:0.9, label:"Iron" },
  // ── CHARACTER SKIN VARIANTS ───────────────────────────────────────────────────
  stone_skin:    { type:'char', color:"#6b6b5a", roughness:0.88, metalness:0.05, noiseScale:8, depth:0.12, sheen:0.1, label:"Stone Skin" },
  metal_skin:    { type:'char', color:"#8a9090", roughness:0.20, metalness:0.95, anisotropy:0.6, label:"Metal Skin" },
  water_skin:    { type:'char', color:"#2255aa", roughness:0.02, metalness:0.0, transmission:0.6, ior:1.333, clearcoat:1.0, sheen:0.4, sheenColor:"#88bbff", label:"Water Skin" },
  rock_skin:     { type:'char', color:"#5a4a3a", roughness:0.92, metalness:0.0, noiseScale:6, depth:0.15, sheen:0.05, label:"Rock Skin" },
  lava_skin:     { type:'char', color:"#cc2200", roughness:0.4,  metalness:0.1, noiseScale:10, depth:0.10, clearcoat:0.2, label:"Lava Skin" },
  ice_skin:      { type:'char', color:"#aaccff", roughness:0.05, metalness:0.0, transmission:0.5, ior:1.309, clearcoat:0.9, sheen:0.2, sheenColor:"#ccddff", label:"Ice Skin" },
  wood_skin:     { type:'char', color:"#8b5e3c", roughness:0.80, metalness:0.0, noiseScale:5, depth:0.08, label:"Wood/Bark Skin" },
  crystal_skin:  { type:'char', color:"#88ccff", roughness:0.02, metalness:0.0, transmission:0.6, ior:1.5, clearcoat:1.0, label:"Crystal Skin" },
  obsidian_skin: { type:'char', color:"#1a1a2e", roughness:0.05, metalness:0.2, clearcoat:0.9, noiseScale:12, depth:0.04, label:"Obsidian Skin" },
  demon_skin:    { type:'char', color:"#6b1a0a", roughness:0.65, metalness:0.1, noiseScale:8, depth:0.10, sheen:0.3, sheenColor:"#ff4400", clearcoat:0.15, label:"Demon Skin" },
  cyber_skin:    { type:'char', color:"#223344", roughness:0.15, metalness:0.7, anisotropy:0.5, clearcoat:0.4, label:"Cyber/Android Skin" },
  alien_skin:    { type:'char', color:"#2a4a20", roughness:0.55, metalness:0.0, noiseScale:20, depth:0.06, sheen:0.5, sheenColor:"#44ff88", label:"Alien Skin" },
};

// ── Apply any surface preset to a mesh ────────────────────────────────────────
export function applySurfaceMaterial(mesh, presetKey, options = {}) {
  const THREE = window.THREE;
  if (!THREE || !mesh) return false;
  const preset = SURFACE_PRESETS[presetKey];
  if (!preset) return false;

  const matProps = {
    color:              new THREE.Color(preset.color),
    roughness:          preset.roughness ?? 0.5,
    metalness:          preset.metalness ?? 0.0,
    clearcoat:          preset.clearcoat ?? 0.0,
    clearcoatRoughness: preset.clearcoatRoughness ?? 0.5,
    transmission:       preset.transmission ?? 0.0,
    thickness:          preset.thickness ?? 0.5,
    ior:                preset.ior ?? 1.5,
    sheen:              preset.sheen ?? 0.0,
    sheenColor:         preset.sheenColor ? new THREE.Color(preset.sheenColor) : new THREE.Color("#ffffff"),
    anisotropy:         preset.anisotropy ?? 0.0,
    envMapIntensity:    1.2,
    transparent:        (preset.transmission ?? 0) > 0,
    opacity:            1.0,
  };

  mesh.material = new THREE.MeshPhysicalMaterial(matProps);

  // Generate procedural texture for rock/stone/character skin types
  if (preset.type === 'rock' || preset.type === 'char') {
    if (preset.noiseScale) {
      const rgb = hexToRGB3(preset.color);
      const lightRGB = [Math.min(255, rgb[0]+40), Math.min(255, rgb[1]+40), Math.min(255, rgb[2]+40)];
      const texCanvas = generateScaleTexture({
        size: 1024,
        scaleSize: preset.noiseScale,
        baseColor: rgb,
        scaleColor: lightRGB,
      });
      const normCanvas = canvasToNormalMap(texCanvas, (preset.depth || 0.08) * 20);
      mesh.material.map       = new THREE.CanvasTexture(texCanvas);
      mesh.material.normalMap = new THREE.CanvasTexture(normCanvas);
      mesh.material.normalScale = new THREE.Vector2(
        (preset.depth || 0.08) * 15,
        (preset.depth || 0.08) * 15
      );
      // Apply displacement
      if (preset.depth) {
        applyDisplacementMap(mesh, {
          noiseType: preset.noiseScale > 15 ? 'voronoi' : 'perlin',
          noiseAmplitude: preset.depth,
          noiseScale: preset.noiseScale / 8,
        });
      }
    }
  }

  // Water: add animated normal map
  if (preset.type === 'water') {
    const waterNorm = generateWaterNormalMap(1024);
    mesh.material.normalMap = new THREE.CanvasTexture(waterNorm);
    mesh.material.normalScale = new THREE.Vector2(1.5, 1.5);
  }

  // Metal: generate brushed/scratched texture
  if (preset.type === 'metal' && preset.noiseScale) {
    const rgb = hexToRGB3(preset.color);
    const metalTex = generateMetalTexture(1024, rgb, preset.noiseScale || 10);
    mesh.material.map          = new THREE.CanvasTexture(metalTex.color);
    mesh.material.roughnessMap = new THREE.CanvasTexture(metalTex.roughness);
    mesh.material.normalMap    = new THREE.CanvasTexture(metalTex.normal);
  }

  mesh.material.needsUpdate = true;
  return true;
}

// ── Water normal map generator ─────────────────────────────────────────────────
export function generateWaterNormalMap(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const data = ctx.createImageData(size, size);
  const d = data.data;
  const t = Date.now() * 0.001;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = x / size, ny = y / size;
      const w1L = perlinNoise((nx-0.003)*4+t*0.3, ny*4, 0) * 0.5 + 0.5;
      const w1R = perlinNoise((nx+0.003)*4+t*0.3, ny*4, 0) * 0.5 + 0.5;
      const w1U = perlinNoise(nx*4+t*0.3, (ny-0.003)*4, 0) * 0.5 + 0.5;
      const w1D = perlinNoise(nx*4+t*0.3, (ny+0.003)*4, 0) * 0.5 + 0.5;
      const w2L = perlinNoise((nx-0.002)*8-t*0.2, ny*8, 1) * 0.5 + 0.5;
      const w2R = perlinNoise((nx+0.002)*8-t*0.2, ny*8, 1) * 0.5 + 0.5;
      const w2U = perlinNoise(nx*8-t*0.2, (ny-0.002)*8, 1) * 0.5 + 0.5;
      const w2D = perlinNoise(nx*8-t*0.2, (ny+0.002)*8, 1) * 0.5 + 0.5;
      const bx = (w1L-w1R)*2.0 + (w2L-w2R)*1.0;
      const by = (w1U-w1D)*2.0 + (w2U-w2D)*1.0;
      const bz = Math.sqrt(Math.max(0, 1-bx*bx-by*by));
      d[i]   = Math.min(255, Math.round((bx*0.5+0.5)*255));
      d[i+1] = Math.min(255, Math.round((by*0.5+0.5)*255));
      d[i+2] = Math.round(bz*255);
      d[i+3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

// ── Metal texture generator ────────────────────────────────────────────────────
export function generateMetalTexture(size = 1024, rgb = [168,168,168], scratchScale = 10) {
  const colorCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  const normCanvas  = document.createElement('canvas');
  [colorCanvas, roughCanvas, normCanvas].forEach(c => { c.width = c.height = size; });
  const cCtx = colorCanvas.getContext('2d'), rCtx = roughCanvas.getContext('2d'), nCtx = normCanvas.getContext('2d');
  const cData = cCtx.createImageData(size,size), rData = rCtx.createImageData(size,size), nData = nCtx.createImageData(size,size);
  const cd = cData.data, rd = rData.data, nd = nData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y*size+x)*4;
      const nx = x/size, ny = y/size;
      // Directional scratches (anisotropic along X)
      const scratch = Math.abs(perlinNoise(nx*scratchScale*8, ny*0.5, 5)) * 0.5 + 0.5;
      const grain   = perlinNoise(nx*scratchScale, ny*scratchScale, 6) * 0.5 + 0.5;
      const bright  = 0.8 + scratch*0.1 + grain*0.1;
      cd[i]   = Math.min(255, Math.round(rgb[0]*bright));
      cd[i+1] = Math.min(255, Math.round(rgb[1]*bright));
      cd[i+2] = Math.min(255, Math.round(rgb[2]*bright));
      cd[i+3] = 255;
      // Roughness: scratches = rougher
      const roughVal = Math.round((0.1 + (1-scratch)*0.3 + grain*0.1) * 255);
      rd[i]=rd[i+1]=rd[i+2]=roughVal; rd[i+3]=255;
      // Normal: scratch direction
      const sL = Math.abs(perlinNoise((nx-0.002)*scratchScale*8, ny*0.5, 5));
      const sR = Math.abs(perlinNoise((nx+0.002)*scratchScale*8, ny*0.5, 5));
      const bnx = (sL-sR)*2.0;
      const bnz = Math.sqrt(Math.max(0,1-bnx*bnx));
      nd[i]   = Math.min(255, Math.round((bnx*0.5+0.5)*255));
      nd[i+1] = Math.round(0.5*255);
      nd[i+2] = Math.round(bnz*255);
      nd[i+3] = 255;
    }
  }
  cCtx.putImageData(cData,0,0); rCtx.putImageData(rData,0,0); nCtx.putImageData(nData,0,0);
  return { color:colorCanvas, roughness:roughCanvas, normal:normCanvas };
}

// ── CUSTOM SKIN BUILDER ────────────────────────────────────────────────────────
// Lets the user fully customize every skin parameter and build a unique material
export const DEFAULT_CUSTOM_SKIN = {
  // Base
  baseColor:       "#d4a574",
  roughness:       0.70,
  metalness:       0.00,
  // SSS
  sssStrength:     0.50,
  sssColor:        "#cc6633",
  sssRadius:       0.60,
  // Surface
  clearcoat:       0.10,
  clearcoatRoughness: 0.30,
  anisotropy:      0.00,
  sheen:           0.00,
  sheenColor:      "#ffffff",
  // Transmission
  transmission:    0.00,
  ior:             1.40,
  thickness:       0.50,
  // Texture
  poreScale:       55,
  wrinkleStrength: 0.50,
  displacementDepth: 0.05,
  noiseType:       "perlin",  // perlin | voronoi | cellular
  textureSize:     1024,      // 512 | 1024 | 2048 | 4096
  // Age/region
  age:             30,
  region:          "face",
  useJimenezSSS:   false,     // true = full GLSL SSS shader
};

export function buildCustomSkin(mesh, params = {}) {
  const THREE = window.THREE;
  if (!THREE || !mesh) return false;
  const p = { ...DEFAULT_CUSTOM_SKIN, ...params };

  if (p.useJimenezSSS) {
    // Full GLSL SSS path
    const mat = createJimenezSkinMaterial({
      tone:               'custom',
      roughness:          p.roughness,
      clearcoat:          p.clearcoat,
      clearcoatRoughness: p.clearcoatRoughness,
      sssStrength:        p.sssStrength,
      scatterRadius:      p.sssRadius,
    });
    if (mat) {
      // Override skin/scatter color uniforms
      mat.uniforms.uSkinColor.value    = new THREE.Color(p.baseColor);
      mat.uniforms.uScatterColor.value = new THREE.Color(p.sssColor);
      mesh.material = mat;
    }
  } else {
    // MeshPhysicalMaterial path (faster)
    mesh.material = new THREE.MeshPhysicalMaterial({
      color:              new THREE.Color(p.baseColor),
      roughness:          p.roughness,
      metalness:          p.metalness,
      sheen:              p.sheen,
      sheenColor:         new THREE.Color(p.sheenColor),
      clearcoat:          p.clearcoat,
      clearcoatRoughness: p.clearcoatRoughness,
      anisotropy:         p.anisotropy,
      transmission:       p.transmission,
      ior:                p.ior,
      thickness:          p.thickness,
      transparent:        p.transmission > 0,
      envMapIntensity:    1.2,
    });
  }

  // Generate custom textures
  const rgb = hexToRGB3(p.baseColor);
  const textures = generateFullSkinTextures({
    size:            p.textureSize,
    tone:            'custom',
    poreScale:       p.poreScale,
    wrinkleStrength: p.wrinkleStrength,
    region:          p.region,
    age:             p.age,
  });
  // Override base color in generateFullSkinTextures result using custom color
  if (textures.color && mesh.material.uniforms?.tColor) {
    mesh.material.uniforms.tColor.value = new THREE.CanvasTexture(textures.color);
  } else if (textures.color) {
    mesh.material.map          = new THREE.CanvasTexture(textures.color);
    mesh.material.roughnessMap = new THREE.CanvasTexture(textures.roughness);
    mesh.material.normalMap    = new THREE.CanvasTexture(textures.normal);
    mesh.material.aoMap        = new THREE.CanvasTexture(textures.ao);
  }

  // Displacement
  if (p.displacementDepth > 0) {
    applyDisplacementMap(mesh, {
      noiseType:      p.noiseType,
      noiseAmplitude: p.displacementDepth,
      noiseScale:     4,
    });
  }

  mesh.material.needsUpdate = true;
  return true;
}

function hexToRGB3(hex) {
  if (!hex || hex.length < 7) return [200,160,120];
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
