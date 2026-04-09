import * as THREE from "three";

function cloneVec3(v) {
  return new THREE.Vector3(v.x, v.y, v.z);
}

export function getSceneBodyCandidates(scene) {
  if (!scene) return [];
  const out = [];
  scene.traverse((obj) => {
    if (!obj?.isMesh) return;
    const name = (obj.name || "").toLowerCase();
    if (name.startsWith("garment_")) return;
    out.push(obj);
  });
  return out;
}

export function chooseBestBodyTarget(garmentMesh, candidates = []) {
  if (!garmentMesh || !candidates.length) return null;

  const garmentPos = new THREE.Vector3();
  garmentMesh.getWorldPosition(garmentPos);

  let best = null;
  let bestDist = Infinity;

  for (const c of candidates) {
    const p = new THREE.Vector3();
    c.getWorldPosition(p);
    const d = garmentPos.distanceTo(p);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }

  return best;
}

export function fitGarmentToBody(garmentMesh, bodyMesh, {
  offset = 0.03,
  strength = 0.85,
  samples = 1,
} = {}) {
  if (!garmentMesh?.geometry || !bodyMesh?.geometry) return false;

  const g = garmentMesh.geometry;
  const pos = g.attributes.position;
  if (!pos) return false;

  bodyMesh.geometry.computeBoundingBox();
  const bb = bodyMesh.geometry.boundingBox;
  const bodySize = new THREE.Vector3();
  bb.getSize(bodySize);

  const garmentBox = new THREE.Box3().setFromObject(garmentMesh);
  const garmentSize = new THREE.Vector3();
  garmentBox.getSize(garmentSize);

  const sx = bodySize.x > 0 ? bodySize.x / Math.max(garmentSize.x, 1e-4) : 1;
  const sy = bodySize.y > 0 ? bodySize.y / Math.max(garmentSize.y, 1e-4) : 1;
  const sz = bodySize.z > 0 ? bodySize.z / Math.max(garmentSize.z, 1e-4) : 1;

  const avgScale = (sx + sy + sz) / 3;
  garmentMesh.scale.multiplyScalar(THREE.MathUtils.lerp(1, avgScale, strength));

  const bodyWorld = new THREE.Vector3();
  const garmentWorld = new THREE.Vector3();
  bodyMesh.getWorldPosition(bodyWorld);
  garmentMesh.getWorldPosition(garmentWorld);

  garmentMesh.position.add(bodyWorld.sub(garmentWorld).multiplyScalar(strength));

  const normal = new THREE.Vector3(0, 0, 1);
  for (let s = 0; s < samples; s++) {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      pos.setXYZ(
        i,
        x,
        y,
        z + offset * (1 - Math.abs(y) * 0.02)
      );
    }
  }

  pos.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return true;
}

export function offsetGarment(garmentMesh, distance = 0.01) {
  if (!garmentMesh?.geometry) return false;
  const g = garmentMesh.geometry;
  const pos = g.attributes.position;
  const normal = g.attributes.normal;

  if (!pos || !normal) return false;

  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + normal.getX(i) * distance,
      pos.getY(i) + normal.getY(i) * distance,
      pos.getZ(i) + normal.getZ(i) * distance
    );
  }

  pos.needsUpdate = true;
  g.computeVertexNormals();
  return true;
}

export function relaxGarment(garmentMesh, iterations = 1, strength = 0.25) {
  if (!garmentMesh?.geometry) return false;
  const g = garmentMesh.geometry;
  const pos = g.attributes.position;
  if (!pos) return false;

  for (let iter = 0; iter < iterations; iter++) {
    const copy = [];
    for (let i = 0; i < pos.count; i++) {
      copy.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }

    for (let i = 1; i < pos.count - 1; i++) {
      const prev = copy[i - 1];
      const curr = copy[i];
      const next = copy[i + 1];

      const avg = cloneVec3(prev).add(next).multiplyScalar(0.5);
      curr.lerp(avg, strength);

      pos.setXYZ(i, curr.x, curr.y, curr.z);
    }
  }

  pos.needsUpdate = true;
  g.computeVertexNormals();
  return true;
}

export function fitNearestGarmentInScene(scene, {
  offset = 0.03,
  strength = 0.85,
  relaxIterations = 1,
} = {}) {
  if (!scene) return { ok: false, reason: "No scene" };

  const garments = [];
  scene.traverse((obj) => {
    if (obj?.isMesh && (obj.name || "").toLowerCase().startsWith("garment_")) {
      garments.push(obj);
    }
  });

  if (!garments.length) return { ok: false, reason: "No garment found" };

  const garment = garments[garments.length - 1];
  const candidates = getSceneBodyCandidates(scene);
  const body = chooseBestBodyTarget(garment, candidates);

  if (!body) return { ok: false, reason: "No body target found" };

  fitGarmentToBody(garment, body, { offset, strength });
  relaxGarment(garment, relaxIterations, 0.2);

  return {
    ok: true,
    garmentName: garment.name,
    bodyName: body.name || "Body Mesh",
  };
}
