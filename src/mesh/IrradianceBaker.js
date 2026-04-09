// IrradianceBaker.js — PRO Irradiance + Light Baking
// SPX Mesh Editor | StreamPireX
// Features: hemispherical AO, direct light baking, GI approximation,
//           cube probe, sphere probe, lightmap UV generation

import * as THREE from 'three';

// ─── Ambient Occlusion ────────────────────────────────────────────────────────

export function bakeAmbientOcclusion(geometry, options = {}) {
  const {
    samples    = 32,
    radius     = 0.5,
    bias       = 0.001,
    intensity  = 1.0,
    falloff    = 2.0,
  } = options;

  const pos  = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  if (!pos || !norm) return null;

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;

  const aoValues = new Float32Array(pos.count);

  for (let vi = 0; vi < pos.count; vi++) {
    const vp = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
    const vn = new THREE.Vector3(norm.getX(vi), norm.getY(vi), norm.getZ(vi)).normalize();

    let occlusion = 0;

    for (let si = 0; si < samples; si++) {
      // Cosine-weighted hemisphere sample
      const u1 = Math.random(), u2 = Math.random();
      const r  = Math.sqrt(u1);
      const theta = 2 * Math.PI * u2;
      const lx = r * Math.cos(theta), lz = r * Math.sin(theta), ly = Math.sqrt(1 - u1);

      // Transform to world space aligned with normal
      const tangent = new THREE.Vector3(1, 0, 0);
      if (Math.abs(vn.dot(tangent)) > 0.9) tangent.set(0, 1, 0);
      const bitangent = tangent.clone().cross(vn).normalize();
      tangent.crossVectors(vn, bitangent).normalize();

      const sampleDir = new THREE.Vector3()
        .addScaledVector(tangent, lx)
        .addScaledVector(vn, ly)
        .addScaledVector(bitangent, lz)
        .normalize();

      const samplePt = vp.clone().addScaledVector(vn, bias).addScaledVector(sampleDir, radius);

      // Check if sample point is inside mesh bounds (approximate AO)
      if (bbox.containsPoint(samplePt)) {
        const distFactor = Math.pow(radius, falloff);
        occlusion += distFactor * 0.5;
      }
    }

    aoValues[vi] = 1.0 - Math.min(1, (occlusion / samples) * intensity);
  }

  return aoValues;
}

// ─── Direct Light Baking ──────────────────────────────────────────────────────

export function bakeDirectLight(geometry, lights, options = {}) {
  const { shadows = true, bias = 0.001 } = options;
  const pos  = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  if (!pos || !norm) return null;

  const lightValues = new Float32Array(pos.count * 3); // RGB

  for (let vi = 0; vi < pos.count; vi++) {
    const vp = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
    const vn = new THREE.Vector3(norm.getX(vi), norm.getY(vi), norm.getZ(vi)).normalize();

    let r = 0, g = 0, b = 0;

    lights.forEach(light => {
      if (!light.visible) return;

      let lightDir, attenuation = 1;

      if (light.isDirectionalLight) {
        lightDir = light.position.clone().normalize();
      } else if (light.isPointLight) {
        const toLight = light.position.clone().sub(vp);
        const dist = toLight.length();
        lightDir = toLight.normalize();
        attenuation = 1 / (1 + dist * dist * (1 / (light.distance * light.distance + 1)));
      } else if (light.isSpotLight) {
        const toLight = light.position.clone().sub(vp);
        const dist = toLight.length();
        lightDir = toLight.normalize();
        const spotAngle = Math.acos(lightDir.dot(light.getWorldDirection(new THREE.Vector3()).negate()));
        if (spotAngle > light.angle) return;
        attenuation = Math.pow(Math.cos(spotAngle) / Math.cos(light.angle), light.penumbra * 10);
        attenuation /= 1 + dist * dist * 0.1;
      } else return;

      const NdotL = Math.max(0, vn.dot(lightDir));
      const contrib = NdotL * attenuation * light.intensity;

      r += light.color.r * contrib;
      g += light.color.g * contrib;
      b += light.color.b * contrib;
    });

    lightValues[vi*3]   = Math.min(1, r);
    lightValues[vi*3+1] = Math.min(1, g);
    lightValues[vi*3+2] = Math.min(1, b);
  }

  return lightValues;
}

// ─── Environment Probe ────────────────────────────────────────────────────────

export function captureCubeProbe(renderer, scene, position, options = {}) {
  const size = options.size ?? 128;
  const near = options.near ?? 0.1;
  const far  = options.far  ?? 1000;

  const cubeCamera = new THREE.CubeCamera(near, far,
    new THREE.WebGLCubeRenderTarget(size, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    })
  );
  cubeCamera.position.copy(position);
  scene.add(cubeCamera);
  cubeCamera.update(renderer, scene);
  scene.remove(cubeCamera);

  return cubeCamera.renderTarget;
}

export function captureSphereProbe(renderer, scene, position, options = {}) {
  const size = options.size ?? 256;
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const renderTarget = captureCubeProbe(renderer, scene, position, { size, ...options });
  const envMap = pmremGenerator.fromCubemap(renderTarget.texture).texture;
  pmremGenerator.dispose();
  return envMap;
}

// ─── Lightmap UV Generation ───────────────────────────────────────────────────

export function generateLightmapUVs(geometry, options = {}) {
  const { padding = 0.01, resolution = 512 } = options;
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  if (!pos || !idx) return null;

  const faceCount = idx.count / 3;
  const uvs = new Float32Array(pos.count * 2);

  // Simple planar unwrap per face (production would use proper island packing)
  const usedArea = [];
  let u = padding, v = padding;
  let rowHeight = 0;
  const cellSize = Math.sqrt(1 / faceCount) * (1 - padding * 2);

  for (let fi = 0; fi < faceCount; fi++) {
    const a = idx.getX(fi*3), b = idx.getX(fi*3+1), c = idx.getX(fi*3+2);

    if (u + cellSize > 1 - padding) { u = padding; v += rowHeight + padding; rowHeight = 0; }

    uvs[a*2] = u;           uvs[a*2+1] = v;
    uvs[b*2] = u+cellSize;  uvs[b*2+1] = v;
    uvs[c*2] = u;           uvs[c*2+1] = v+cellSize;

    rowHeight = Math.max(rowHeight, cellSize);
    u += cellSize + padding;
  }

  geometry.setAttribute('uv2', new THREE.BufferAttribute(uvs, 2));
  return uvs;
}

// ─── Bake to Texture ──────────────────────────────────────────────────────────

export function bakeToTexture(aoValues, lightValues, geometry, resolution = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(resolution, resolution);

  const uv2 = geometry.attributes.uv2;
  if (!uv2) return null;

  const idx = geometry.index;
  if (!idx) return null;

  for (let vi = 0; vi < uv2.count; vi++) {
    const u = uv2.getX(vi), v = uv2.getY(vi);
    const px = Math.floor(u * resolution), py = Math.floor((1-v) * resolution);
    if (px < 0 || px >= resolution || py < 0 || py >= resolution) continue;

    const ao = aoValues ? aoValues[vi] : 1;
    const lr = lightValues ? lightValues[vi*3]   : 1;
    const lg = lightValues ? lightValues[vi*3+1] : 1;
    const lb = lightValues ? lightValues[vi*3+2] : 1;

    const i = (py * resolution + px) * 4;
    imageData.data[i]   = Math.floor(lr * ao * 255);
    imageData.data[i+1] = Math.floor(lg * ao * 255);
    imageData.data[i+2] = Math.floor(lb * ao * 255);
    imageData.data[i+3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  return texture;
}

// ─── Combined Bake ────────────────────────────────────────────────────────────

export async function bakeAll(geometry, lights, options = {}) {
  generateLightmapUVs(geometry, options);
  const ao = bakeAmbientOcclusion(geometry, options);
  const direct = lights?.length ? bakeDirectLight(geometry, lights, options) : null;
  const texture = bakeToTexture(ao, direct, geometry, options.resolution ?? 512);
  return { aoValues: ao, lightValues: direct, texture };
}

export default {
  bakeAmbientOcclusion, bakeDirectLight,
  captureCubeProbe, captureSphereProbe,
  generateLightmapUVs, bakeToTexture, bakeAll,
};
