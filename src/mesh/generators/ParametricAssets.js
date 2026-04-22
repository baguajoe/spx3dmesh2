import * as THREE from "three";

export function createStairParams() {
  return { width: 2, height: 2, depth: 4, steps: 12 };
}

export function createColumnParams() {
  return { radius: 0.35, height: 3, segments: 24 };
}

export function createArchParams() {
  return { width: 2.5, height: 2.2, thickness: 0.25, segments: 20 };
}

export function listParametricAssets() {
  return [
    { id: "stairs", label: "Stairs", defaults: createStairParams() },
    { id: "column", label: "Column", defaults: createColumnParams() },
    { id: "arch", label: "Arch", defaults: createArchParams() }
  ];
}

function defaultMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.55, metalness: 0.08 });
}

export function buildStairsMesh(params = {}) {
  const { width = 2, height = 2, depth = 4, steps = 12 } = params;
  const group = new THREE.Group();
  const mat = defaultMaterial();
  const stepH = height / steps;
  const stepD = depth / steps;

  for (let i = 0; i < steps; i++) {
    const geo = new THREE.BoxGeometry(width, stepH, stepD * (i + 1));
    const mesh = new THREE.Mesh(geo, mat.clone());
    mesh.position.y = stepH * 0.5 + i * stepH;
    mesh.position.z = -depth * 0.5 + (stepD * (i + 1)) * 0.5;
    group.add(mesh);
  }

  group.name = "SPX_Stairs";
  return group;
}

export function buildColumnMesh(params = {}) {
  const { radius = 0.35, height = 3, segments = 24 } = params;
  const group = new THREE.Group();
  const mat = defaultMaterial();

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.92, height, segments),
    mat.clone()
  );
  shaft.position.y = height * 0.5;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.35, radius * 1.15, height * 0.08, segments),
    mat.clone()
  );
  base.position.y = height * 0.04;

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.15, radius * 1.35, height * 0.08, segments),
    mat.clone()
  );
  cap.position.y = height - height * 0.04;

  group.add(base, shaft, cap);
  group.name = "SPX_Column";
  return group;
}

export function buildArchMesh(params = {}) {
  const { width = 2.5, height = 2.2, thickness = 0.25, segments = 20 } = params;
  const group = new THREE.Group();
  const mat = defaultMaterial();

  const pillarH = height * 0.7;
  const pillarOffset = width * 0.5 - thickness * 0.5;

  const left = new THREE.Mesh(new THREE.BoxGeometry(thickness, pillarH, thickness), mat.clone());
  const right = new THREE.Mesh(new THREE.BoxGeometry(thickness, pillarH, thickness), mat.clone());
  left.position.set(-pillarOffset, pillarH * 0.5, 0);
  right.position.set(pillarOffset, pillarH * 0.5, 0);

  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(width * 0.5 - thickness * 0.25, thickness * 0.5, 10, segments, Math.PI),
    mat.clone()
  );
  arch.rotation.z = Math.PI;
  arch.position.y = pillarH;

  group.add(left, right, arch);
  group.name = "SPX_Arch";
  return group;
}

export function buildParametricAsset(id, params = {}) {
  switch (id) {
    case "stairs": return buildStairsMesh(params);
    case "column": return buildColumnMesh(params);
    case "arch": return buildArchMesh(params);
    default: return buildStairsMesh(createStairParams());
  }
}
