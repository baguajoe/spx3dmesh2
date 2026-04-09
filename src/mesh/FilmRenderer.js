import * as THREE from "three";
import { EffectComposer }   from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass }       from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass }  from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SSAOPass }         from "three/examples/jsm/postprocessing/SSAOPass.js";
import { SMAAPass }         from "three/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass }       from "three/examples/jsm/postprocessing/OutputPass.js";

// ── Procedural sky HDRI (no file needed) ─────────────────────────────────────
export function createProceduralHDRI(renderer) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size * 4; canvas.height = size * 2;
  const ctx = canvas.getContext("2d");

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, size * 2);
  skyGrad.addColorStop(0.0,  "#0a0a1a");
  skyGrad.addColorStop(0.3,  "#0d1b3e");
  skyGrad.addColorStop(0.5,  "#1a3a6e");
  skyGrad.addColorStop(0.65, "#4a7fbf");
  skyGrad.addColorStop(0.75, "#e8c090");
  skyGrad.addColorStop(0.85, "#c05020");
  skyGrad.addColorStop(1.0,  "#080808");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, size * 4, size * 2);

  // Sun disc
  const sunX = size * 2, sunY = size * 1.35;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
  sunGrad.addColorStop(0,   "rgba(255,240,200,1)");
  sunGrad.addColorStop(0.2, "rgba(255,200,100,0.8)");
  sunGrad.addColorStop(0.5, "rgba(255,120,30,0.3)");
  sunGrad.addColorStop(1,   "rgba(255,80,0,0)");
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, size * 4, size * 2);

  // Ground
  const gndGrad = ctx.createLinearGradient(0, size * 1.5, 0, size * 2);
  gndGrad.addColorStop(0, "#1a1208");
  gndGrad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = gndGrad;
  ctx.fillRect(0, size * 1.5, size * 4, size * 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return envMap;
}

// ── Upgrade all scene materials to MeshPhysical ───────────────────────────────
export function upgradeMaterialsToPhysical(scene) {
  scene.traverse(obj => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    obj.material = mats.map(m => {
      if (!m || m.isMeshPhysicalMaterial) return m;
      const p = new THREE.MeshPhysicalMaterial({
        color:            m.color            || new THREE.Color(0xffffff),
        roughness:        m.roughness        ?? 0.5,
        metalness:        m.metalness        ?? 0.0,
        map:              m.map              || null,
        normalMap:        m.normalMap        || null,
        roughnessMap:     m.roughnessMap     || null,
        metalnessMap:     m.metalnessMap     || null,
        aoMap:            m.aoMap            || null,
        emissive:         m.emissive         || new THREE.Color(0x000000),
        emissiveIntensity:m.emissiveIntensity ?? 0,
        emissiveMap:      m.emissiveMap      || null,
        transparent:      m.transparent      || false,
        opacity:          m.opacity          ?? 1.0,
        side:             m.side             ?? THREE.FrontSide,
        envMapIntensity:  m.envMapIntensity  ?? 1.0,
        // Film-quality extras
        clearcoat:        0.1,
        clearcoatRoughness: 0.3,
        sheen:            0.0,
        anisotropy:       0.0,
      });
      p.needsUpdate = true;
      return p;
    });
    if (!Array.isArray(obj.material)) obj.material = obj.material[0];
  });
}

// ── Init film-quality EffectComposer ──────────────────────────────────────────
export function initFilmComposer(renderer, scene, camera) {
  const w = renderer.domElement.clientWidth  || renderer.domElement.width;
  const h = renderer.domElement.clientHeight || renderer.domElement.height;
  const size = new THREE.Vector2(w, h);

  const composer = new EffectComposer(renderer);

  // Pass 1: beauty render
  composer.addPass(new RenderPass(scene, camera));

  // Pass 2: SSAO (ambient occlusion — kills flat look)
  try {
    const ssao = new SSAOPass(scene, camera, w, h);
    ssao.kernelRadius = 0.6;
    ssao.minDistance  = 0.001;
    ssao.maxDistance  = 0.08;
    composer.addPass(ssao);
  } catch(e) { console.warn("SSAOPass unavailable:", e.message); }

  // Pass 3: Bloom (cinematic glow on bright surfaces)
  const bloom = new UnrealBloomPass(size, 0.4, 0.5, 0.85);
  composer.addPass(bloom);

  // Pass 4: SMAA anti-alias (sharper than FXAA)
  try {
    composer.addPass(new SMAAPass(w, h));
  } catch(e) { console.warn("SMAAPass unavailable:", e.message); }

  // Pass 5: output color space correction
  try {
    composer.addPass(new OutputPass());
  } catch(e) {}

  // Expose named pass refs for live control panels
  composer._passes = {
    render: composer.passes[0] || null,
    ssao:   composer.passes[1] || null,
    bloom:  composer.passes[2] || null,
    smaa:   composer.passes[3] || null,
    output: composer.passes[4] || null,
  };

  return composer;
}

