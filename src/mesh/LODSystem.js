import * as THREE from "three";
import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js";

// ── Generate LOD levels from a mesh ──────────────────────────────────────────
export function generateLOD(mesh, levels = [1.0, 0.5, 0.25, 0.1]) {
  const lod = new THREE.LOD();
  const geo  = mesh.geometry;
  const mat  = mesh.material;

  levels.forEach((ratio, i) => {
    let lodGeo;
    if (ratio === 1.0) {
      lodGeo = geo.clone();
    } else {
      try {
        const modifier = new SimplifyModifier();
        const targetCount = Math.max(4, Math.floor((geo.attributes.position.count) * ratio));
        lodGeo = modifier.modify(geo.clone(), targetCount);
      } catch {
        // fallback — decimate manually by skipping vertices
        lodGeo = decimateGeometry(geo, ratio);
      }
    }
    lodGeo.computeVertexNormals();
    const lodMesh = new THREE.Mesh(lodGeo, mat.clone());
    lodMesh.name  = `LOD_${i}_${Math.round(ratio * 100)}pct`;
    // Distance thresholds: LOD0=0, LOD1=5, LOD2=15, LOD3=30
    const distance = i === 0 ? 0 : i === 1 ? 5 : i === 2 ? 15 : 30;
    lod.addLevel(lodMesh, distance);
  });

  lod.name = mesh.name + "_LOD";
  return lod;
}

// ── Manual decimation fallback ────────────────────────────────────────────────
function decimateGeometry(geo, ratio) {
  const pos = geo.attributes.position;
  const idx = geo.index;
  if (!idx) return geo.clone();

  const arr      = idx.array;
  const keepEvery = Math.max(1, Math.round(1 / ratio));
  const newIdx   = [];

  for (let i = 0; i < arr.length; i += 3 * keepEvery) {
    if (i + 2 < arr.length) {
      newIdx.push(arr[i], arr[i+1], arr[i+2]);
    }
  }

  const newGeo = geo.clone();
  newGeo.setIndex(newIdx);
  return newGeo;
}

// ── Get LOD stats ─────────────────────────────────────────────────────────────
export function getLODStats(lod) {
  return lod.levels.map((level, i) => {
    const geo = level.object?.geometry;
    return {
      level:     i,
      distance:  level.distance,
      vertices:  geo?.attributes?.position?.count || 0,
      triangles: geo?.index ? Math.floor(geo.index.count / 3) : 0,
      ratio:     [100, 50, 25, 10][i] + "%",
    };
  });
}

// ── Switch to specific LOD level manually ─────────────────────────────────────
export function setLODLevel(lod, level) {
  lod.levels.forEach((l, i) => {
    l.object.visible = i === level;
  });
}

// ── Restore auto LOD ──────────────────────────────────────────────────────────
export function restoreAutoLOD(lod) {
  lod.levels.forEach(l => { l.object.visible = true; });
}
