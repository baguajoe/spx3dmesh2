import * as THREE from "three";

export const GLTF_EXTENSIONS = {
  KHR_draco_mesh_compression:  "KHR_draco_mesh_compression",
  KHR_materials_unlit:         "KHR_materials_unlit",
  KHR_materials_clearcoat:     "KHR_materials_clearcoat",
  KHR_materials_transmission:  "KHR_materials_transmission",
  KHR_materials_ior:           "KHR_materials_ior",
  KHR_materials_sheen:         "KHR_materials_sheen",
  KHR_mesh_quantization:       "KHR_mesh_quantization",
  KHR_animation_pointer:       "KHR_animation_pointer",
  EXT_mesh_gpu_instancing:     "EXT_mesh_gpu_instancing",
  EXT_texture_webp:            "EXT_texture_webp",
};

export async function loadGLTFAdvanced(url, opts = {}) {
  const { GLTFLoader } = await import(/* @vite-ignore */ "three/examples/jsm/loaders/GLTFLoader.js").catch(() => ({}));
  if (!GLTFLoader) { console.warn("GLTFLoader not available"); return null; }
  const loader = new GLTFLoader();
  if (opts.draco) {
    const { DRACOLoader } = await import(/* @vite-ignore */ "three/examples/jsm/loaders/DRACOLoader.js").catch(() => ({}));
    if (DRACOLoader) {
      const d = new DRACOLoader();
      d.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
      loader.setDRACOLoader(d);
    }
  }
  if (opts.ktx2) {
    const { KTX2Loader } = await import(/* @vite-ignore */ "three/examples/jsm/loaders/KTX2Loader.js").catch(() => ({}));
    if (KTX2Loader && opts.renderer) {
      const k = new KTX2Loader().setTranscoderPath("https://cdn.jsdelivr.net/npm/three/examples/jsm/libs/basis/");
      k.detectSupport(opts.renderer);
      loader.setKTX2Loader(k);
    }
  }
  return new Promise((res, rej) => loader.load(url, res, opts.onProgress, rej));
}

export async function exportGLTFAdvanced(scene, opts = {}) {
  const { GLTFExporter } = await import(/* @vite-ignore */ "three/examples/jsm/exporters/GLTFExporter.js").catch(() => ({}));
  if (!GLTFExporter) { console.warn("GLTFExporter not available"); return null; }
  const exporter = new GLTFExporter();
  const options  = {
    binary:         opts.binary         ?? false,
    trs:            opts.trs            ?? false,
    onlyVisible:    opts.onlyVisible    ?? true,
    maxTextureSize: opts.maxTextureSize ?? 4096,
    animations:     opts.animations     || [],
    includeCustomExtensions: opts.extensions ?? false,
  };
  return new Promise((res, rej) => {
    exporter.parse(scene, result => {
      if (opts.binary) {
        const blob = new Blob([result], { type: "application/octet-stream" });
        const url  = URL.createObjectURL(blob);
        if (opts.download) {
          const a = document.createElement("a");
          a.href = url; a.download = (opts.filename || "export") + ".glb"; a.click();
        }
        res({ blob, url });
      } else {
        const json = JSON.stringify(result, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        if (opts.download) {
          const a = document.createElement("a");
          a.href = url; a.download = (opts.filename || "export") + ".gltf"; a.click();
        }
        res({ json, blob, url });
      }
    }, err => rej(err), options);
  });
}

export function buildGLTFMorphTargets(mesh, shapeKeys) {
  if (!shapeKeys?.length) return;
  const basis = shapeKeys.find(k => k.name === "Basis");
  if (!basis) return;
  const targets = shapeKeys
    .filter(k => k.name !== "Basis")
    .map(key => {
      const delta = new Float32Array(basis.data.length);
      for (let i = 0; i < delta.length; i++) delta[i] = key.data[i] - basis.data[i];
      return { position: new THREE.Float32BufferAttribute(delta, 3), name: key.name };
    });
  mesh.geometry.morphAttributes.position = targets.map(t => t.position);
  mesh.morphTargetInfluences = targets.map(() => 0);
  mesh.morphTargetDictionary = Object.fromEntries(targets.map((t, i) => [t.name, i]));
}

export function applyGLTFMorphWeights(mesh, weights = {}) {
  if (!mesh.morphTargetDictionary) return;
  for (const [name, val] of Object.entries(weights)) {
    const idx = mesh.morphTargetDictionary[name];
    if (idx !== undefined) mesh.morphTargetInfluences[idx] = val;
  }
}

export function extractGLTFAnimations(gltf) {
  if (!gltf?.animations?.length) return [];
  return gltf.animations.map(clip => ({
    name:     clip.name,
    duration: clip.duration,
    tracks:   clip.tracks.map(t => ({
      name:   t.name,
      type:   t.constructor.name,
      times:  Array.from(t.times),
      values: Array.from(t.values),
    })),
  }));
}

export function mergeGLTFScenes(gltfArray) {
  const group = new THREE.Group();
  gltfArray.forEach((gltf, i) => {
    if (gltf?.scene) {
      gltf.scene.name = gltf.scene.name || `Scene_${i}`;
      group.add(gltf.scene.clone());
    }
  });
  return group;
}

export function getGLTFStats(gltf) {
  if (!gltf?.scene) return {};
  let meshCount = 0, matCount = 0, triCount = 0, boneCount = 0;
  gltf.scene.traverse(obj => {
    if (obj.isMesh) {
      meshCount++;
      if (obj.material) matCount++;
      const geo = obj.geometry;
      if (geo?.index)                 triCount += geo.index.count / 3;
      else if (geo?.attributes?.position) triCount += geo.attributes.position.count / 3;
    }
    if (obj.isBone) boneCount++;
  });
  return {
    meshes:     meshCount,
    materials:  matCount,
    triangles:  Math.round(triCount),
    animations: gltf.animations?.length || 0,
    bones:      boneCount,
  };
}
