import * as THREE from "three";

// ── Create instanced mesh ─────────────────────────────────────────────────────
export function createInstances(mesh, count = 10, layout = "scatter", params = {}) {
  const geo = mesh.geometry;
  const mat = mesh.material.clone();
  mat.side = THREE.DoubleSide;

  const instanced = new THREE.InstancedMesh(geo, mat, count);
  instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instanced.name = (mesh.name || "mesh") + "_x" + count;

  const dummy = new THREE.Object3D();
  const {
    spread    = 5,
    gridCols  = Math.ceil(Math.sqrt(count)),
    gridGap   = 1.5,
    randomRot = true,
    randomScale = false,
    scaleMin  = 0.8,
    scaleMax  = 1.2,
  } = params;

  for (let i = 0; i < count; i++) {
    if (layout === "grid") {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      dummy.position.set(col * gridGap, 0, row * gridGap);
      dummy.position.x -= (gridCols * gridGap) / 2;
      dummy.position.z -= (Math.ceil(count / gridCols) * gridGap) / 2;
    } else {
      // scatter
      dummy.position.set(
        (Math.random() - 0.5) * spread * 2,
        0,
        (Math.random() - 0.5) * spread * 2,
      );
    }

    if (randomRot) {
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    } else {
      dummy.rotation.set(0, 0, 0);
    }

    if (randomScale) {
      const s = scaleMin + Math.random() * (scaleMax - scaleMin);
      dummy.scale.setScalar(s);
    } else {
      dummy.scale.setScalar(1);
    }

    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
  }

  instanced.instanceMatrix.needsUpdate = true;
  instanced.castShadow    = true;
  instanced.receiveShadow = true;
  return instanced;
}

// ── Get individual instance transform ─────────────────────────────────────────
export function getInstanceTransform(instanced, index) {
  const matrix = new THREE.Matrix4();
  instanced.getMatrixAt(index, matrix);
  const pos   = new THREE.Vector3();
  const quat  = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(pos, quat, scale);
  return { position: pos, quaternion: quat, scale };
}

// ── Set individual instance transform ─────────────────────────────────────────
export function setInstanceTransform(instanced, index, position, rotation, scale) {
  const dummy = new THREE.Object3D();
  if (position) dummy.position.copy(position);
  if (rotation) dummy.rotation.copy(rotation);
  if (scale)    dummy.scale.copy(scale);
  dummy.updateMatrix();
  instanced.setMatrixAt(index, dummy.matrix);
  instanced.instanceMatrix.needsUpdate = true;
}

// ── Convert instanced mesh to individual meshes ───────────────────────────────
export function flattenInstances(instanced) {
  const meshes = [];
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < instanced.count; i++) {
    instanced.getMatrixAt(i, matrix);
    const mesh = new THREE.Mesh(
      instanced.geometry.clone(),
      instanced.material.clone(),
    );
    mesh.applyMatrix4(matrix);
    mesh.name = instanced.name + "_" + i;
    meshes.push(mesh);
  }
  return meshes;
}
