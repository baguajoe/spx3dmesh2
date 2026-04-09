import * as THREE from "three";

// ── Bake ambient occlusion ────────────────────────────────────────────────────
export function bakeAO(mesh, { width = 512, height = 512, samples = 16, maxDistance = 1.0 } = {}) {
  const geo = mesh.geometry;
  if (!geo.attributes.uv || !geo.attributes.position || !geo.attributes.normal) {
    return null;
  }

  const canvas  = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx     = canvas.getContext("2d");
  const imgData = ctx.createImageData(width, height);

  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv  = geo.attributes.uv;
  const idx = geo.index;
  if (!idx) return null;

  // Simple AO: ray cast in hemisphere from each vertex
  const arr    = idx.array;
  const aoVals = new Float32Array(pos.count).fill(1.0);

  for (let vi = 0; vi < pos.count; vi++) {
    const vp = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
    const vn = new THREE.Vector3(nor.getX(vi), nor.getY(vi), nor.getZ(vi)).normalize();

    let occluded = 0;
    for (let s = 0; s < samples; s++) {
      // Random hemisphere direction
      const phi   = Math.random() * Math.PI * 2;
      const theta = Math.acos(Math.random());
      const dir   = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta),
      );
      if (dir.dot(vn) < 0) dir.negate();

      // Check if ray hits any triangle
      const raycaster = new THREE.Raycaster(vp.clone().addScaledVector(vn, 0.001), dir, 0, maxDistance);
      const hits = raycaster.intersectObject(mesh);
      if (hits.length > 0) occluded++;
    }
    aoVals[vi] = 1 - (occluded / samples) * 0.8;
  }

  // Project AO values to UV space
  for (let i = 0; i < arr.length; i += 3) {
    const [a, b, c] = [arr[i], arr[i+1], arr[i+2]];
    const uvA = new THREE.Vector2(uv.getX(a), uv.getY(a));
    const uvB = new THREE.Vector2(uv.getX(b), uv.getY(b));
    const uvC = new THREE.Vector2(uv.getX(c), uv.getY(c));

    rasterizeTriangle(imgData, width, height, uvA, uvB, uvC,
      aoVals[a], aoVals[b], aoVals[c], "grey");
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

// ── Bake normal map ───────────────────────────────────────────────────────────
export function bakeNormalMap(mesh, { width = 512, height = 512 } = {}) {
  const geo = mesh.geometry;
  if (!geo.attributes.uv || !geo.attributes.normal) return null;

  const canvas  = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx     = canvas.getContext("2d");
  const imgData = ctx.createImageData(width, height);

  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv  = geo.attributes.uv;
  const idx = geo.index;
  if (!idx) return null;

  const arr = idx.array;
  for (let i = 0; i < arr.length; i += 3) {
    const [a, b, c] = [arr[i], arr[i+1], arr[i+2]];
    const uvA = new THREE.Vector2(uv.getX(a), uv.getY(a));
    const uvB = new THREE.Vector2(uv.getX(b), uv.getY(b));
    const uvC = new THREE.Vector2(uv.getX(c), uv.getY(c));
    const nA  = { r: nor.getX(a)*0.5+0.5, g: nor.getY(a)*0.5+0.5, b: nor.getZ(a)*0.5+0.5 };
    const nB  = { r: nor.getX(b)*0.5+0.5, g: nor.getY(b)*0.5+0.5, b: nor.getZ(b)*0.5+0.5 };
    const nC  = { r: nor.getX(c)*0.5+0.5, g: nor.getY(c)*0.5+0.5, b: nor.getZ(c)*0.5+0.5 };

    rasterizeTriangleRGB(imgData, width, height, uvA, uvB, uvC, nA, nB, nC);
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

// ── Bake curvature map ────────────────────────────────────────────────────────
export function bakeCurvature(mesh, { width = 512, height = 512 } = {}) {
  const geo = mesh.geometry;
  if (!geo.attributes.uv || !geo.attributes.normal) return null;

  const canvas  = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx     = canvas.getContext("2d");
  const imgData = ctx.createImageData(width, height);

  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv  = geo.attributes.uv;
  const idx = geo.index;
  if (!idx) return null;

  // Compute per-vertex curvature
  const curvature = new Float32Array(pos.count).fill(0.5);
  const arr = idx.array;

  for (let i = 0; i < arr.length; i += 3) {
    const [a, b, c] = [arr[i], arr[i+1], arr[i+2]];
    const na = new THREE.Vector3(nor.getX(a), nor.getY(a), nor.getZ(a));
    const nb = new THREE.Vector3(nor.getX(b), nor.getY(b), nor.getZ(b));
    const nc = new THREE.Vector3(nor.getX(c), nor.getY(c), nor.getZ(c));
    const avg = na.clone().add(nb).add(nc).divideScalar(3).normalize();
    const diffA = 0.5 + na.dot(avg) * 0.5;
    const diffB = 0.5 + nb.dot(avg) * 0.5;
    const diffC = 0.5 + nc.dot(avg) * 0.5;
    curvature[a] = (curvature[a] + diffA) * 0.5;
    curvature[b] = (curvature[b] + diffB) * 0.5;
    curvature[c] = (curvature[c] + diffC) * 0.5;
  }

  for (let i = 0; i < arr.length; i += 3) {
    const [a, b, c] = [arr[i], arr[i+1], arr[i+2]];
    const uvA = new THREE.Vector2(uv.getX(a), uv.getY(a));
    const uvB = new THREE.Vector2(uv.getX(b), uv.getY(b));
    const uvC = new THREE.Vector2(uv.getX(c), uv.getY(c));
    rasterizeTriangle(imgData, width, height, uvA, uvB, uvC, curvature[a], curvature[b], curvature[c], "grey");
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

// ── Simple triangle rasterizer ────────────────────────────────────────────────
function rasterizeTriangle(imgData, w, h, uvA, uvB, uvC, valA, valB, valC, mode) {
  const minX = Math.floor(Math.min(uvA.x, uvB.x, uvC.x) * w);
  const maxX = Math.ceil(Math.max(uvA.x, uvB.x, uvC.x) * w);
  const minY = Math.floor(Math.min(1-uvA.y, 1-uvB.y, 1-uvC.y) * h);
  const maxY = Math.ceil(Math.max(1-uvA.y, 1-uvB.y, 1-uvC.y) * h);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const u = x / w, v = 1 - y / h;
      const { w0, w1, w2 } = barycentricWeights(u, v, uvA, uvB, uvC);
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const val   = (valA * w0 + valB * w1 + valC * w2) * 255;
      const idx   = (y * w + x) * 4;
      imgData.data[idx]   = val;
      imgData.data[idx+1] = val;
      imgData.data[idx+2] = val;
      imgData.data[idx+3] = 255;
    }
  }
}

function rasterizeTriangleRGB(imgData, w, h, uvA, uvB, uvC, cA, cB, cC) {
  const minX = Math.floor(Math.min(uvA.x, uvB.x, uvC.x) * w);
  const maxX = Math.ceil(Math.max(uvA.x, uvB.x, uvC.x) * w);
  const minY = Math.floor(Math.min(1-uvA.y, 1-uvB.y, 1-uvC.y) * h);
  const maxY = Math.ceil(Math.max(1-uvA.y, 1-uvB.y, 1-uvC.y) * h);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const u = x / w, v = 1 - y / h;
      const { w0, w1, w2 } = barycentricWeights(u, v, uvA, uvB, uvC);
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const idx = (y * w + x) * 4;
      imgData.data[idx]   = (cA.r*w0 + cB.r*w1 + cC.r*w2) * 255;
      imgData.data[idx+1] = (cA.g*w0 + cB.g*w1 + cC.g*w2) * 255;
      imgData.data[idx+2] = (cA.b*w0 + cB.b*w1 + cC.b*w2) * 255;
      imgData.data[idx+3] = 255;
    }
  }
}

function barycentricWeights(px, py, a, b, c) {
  const d  = (b.y-c.y)*(a.x-c.x) + (c.x-b.x)*(a.y-c.y);
  if (Math.abs(d) < 0.0001) return { w0:-1, w1:-1, w2:-1 };
  const w0 = ((b.y-c.y)*(px-c.x) + (c.x-b.x)*(py-c.y)) / d;
  const w1 = ((c.y-a.y)*(px-c.x) + (a.x-c.x)*(py-c.y)) / d;
  const w2 = 1 - w0 - w1;
  return { w0, w1, w2 };
}

// ── Download baked map ────────────────────────────────────────────────────────
export function downloadBakedMap(dataUrl, filename = "baked_map.png") {
  const a    = document.createElement("a");
  a.href     = dataUrl;
  a.download = filename;
  a.click();
}

// ── Bake all maps ─────────────────────────────────────────────────────────────
export function bakeAllMaps(mesh, options = {}) {
  return {
    ao:        bakeAO(mesh, options),
    normal:    bakeNormalMap(mesh, options),
    curvature: bakeCurvature(mesh, options),
  };
}
