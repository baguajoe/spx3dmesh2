import * as THREE from "three";

function makePlane(width = 1, height = 1, wSeg = 12, hSeg = 12) {
  return new THREE.PlaneGeometry(width, height, wSeg, hSeg);
}

function centerGeometry(geometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const offset = new THREE.Vector3();
  box.getCenter(offset);
  geometry.translate(-offset.x, -offset.y, -offset.z);
  return geometry;
}

export function createShirtTemplate({
  width = 1.4,
  height = 1.8,
  sleeveWidth = 0.45,
  sleeveDrop = 0.35,
} = {}) {
  const body = new THREE.Shape();
  body.moveTo(-width / 2, height / 2);
  body.lineTo(width / 2, height / 2);
  body.lineTo(width / 2, -height / 2);
  body.lineTo(-width / 2, -height / 2);
  body.lineTo(-width / 2, height / 2);

  const geo = new THREE.ShapeGeometry(body, 20);

  const sleeveL = new THREE.BoxGeometry(sleeveWidth, 0.35, 0.06);
  sleeveL.translate(-(width / 2 + sleeveWidth / 2 - 0.06), height / 2 - sleeveDrop, 0);

  const sleeveR = new THREE.BoxGeometry(sleeveWidth, 0.35, 0.06);
  sleeveR.translate((width / 2 + sleeveWidth / 2 - 0.06), height / 2 - sleeveDrop, 0);

  const merged = mergeBufferGeometries([geo, sleeveL, sleeveR]);
  return centerGeometry(merged);
}

export function createPantsTemplate({
  width = 1.0,
  height = 1.9,
  gap = 0.16,
} = {}) {
  const legWidth = (width - gap) / 2;

  const leftLeg = new THREE.BoxGeometry(legWidth, height, 0.08);
  leftLeg.translate(-(legWidth / 2 + gap / 2), 0, 0);

  const rightLeg = new THREE.BoxGeometry(legWidth, height, 0.08);
  rightLeg.translate((legWidth / 2 + gap / 2), 0, 0);

  const waist = new THREE.BoxGeometry(width, 0.28, 0.08);
  waist.translate(0, height / 2 - 0.14, 0);

  return centerGeometry(mergeBufferGeometries([leftLeg, rightLeg, waist]));
}

export function createJacketTemplate({
  width = 1.5,
  height = 1.9,
  lapelInset = 0.18,
} = {}) {
  const geo = createShirtTemplate({ width, height, sleeveWidth: 0.5, sleeveDrop: 0.28 });

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    if (y > 0.15 && Math.abs(x) < lapelInset) {
      pos.setX(i, x * 0.45);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return centerGeometry(geo);
}

export function createDressTemplate({
  topWidth = 1.1,
  waistWidth = 0.8,
  bottomWidth = 1.9,
  height = 2.2,
} = {}) {
  const shape = new THREE.Shape();
  shape.moveTo(-topWidth / 2, height / 2);
  shape.lineTo(topWidth / 2, height / 2);
  shape.lineTo(waistWidth / 2, 0.25);
  shape.lineTo(bottomWidth / 2, -height / 2);
  shape.lineTo(-bottomWidth / 2, -height / 2);
  shape.lineTo(-waistWidth / 2, 0.25);
  shape.lineTo(-topWidth / 2, height / 2);

  const geo = new THREE.ShapeGeometry(shape, 28);
  return centerGeometry(geo);
}

export function createCapeTemplate({
  topWidth = 1.2,
  bottomWidth = 2.4,
  height = 2.6,
} = {}) {
  const shape = new THREE.Shape();
  shape.moveTo(-topWidth / 2, height / 2);
  shape.lineTo(topWidth / 2, height / 2);
  shape.lineTo(bottomWidth / 2, -height / 2);
  shape.lineTo(-bottomWidth / 2, -height / 2);
  shape.lineTo(-topWidth / 2, height / 2);

  const geo = new THREE.ShapeGeometry(shape, 24);
  return centerGeometry(geo);
}

export function createGarmentTemplate(type = "shirt", options = {}) {
  switch (type) {
    case "shirt":
      return createShirtTemplate(options);
    case "pants":
      return createPantsTemplate(options);
    case "jacket":
      return createJacketTemplate(options);
    case "dress":
      return createDressTemplate(options);
    case "cape":
      return createCapeTemplate(options);
    default:
      return makePlane(1.2, 1.8, 12, 12);
  }
}

export function createGarmentCatalog() {
  return [
    { id: "shirt", label: "Shirt" },
    { id: "pants", label: "Pants" },
    { id: "jacket", label: "Jacket" },
    { id: "dress", label: "Dress" },
    { id: "cape", label: "Cape" },
  ];
}

export function createGarmentMesh(type = "shirt", options = {}) {
  const geometry = createGarmentTemplate(type, options);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8fa8c9,
    side: THREE.DoubleSide,
    roughness: 0.85,
    metalness: 0.02,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `garment_${type}`;
  return mesh;
}

function mergeBufferGeometries(geometries = []) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let offset = 0;

  for (const g of geometries) {
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const uv = g.attributes.uv;
    const idx = g.index;

    for (let i = 0; i < pos.array.length; i++) positions.push(pos.array[i]);
    if (nor) for (let i = 0; i < nor.array.length; i++) normals.push(nor.array[i]);
    if (uv) for (let i = 0; i < uv.array.length; i++) uvs.push(uv.array[i]);

    if (idx) {
      for (let i = 0; i < idx.array.length; i++) indices.push(idx.array[i] + offset);
    } else {
      for (let i = 0; i < pos.count; i++) indices.push(i + offset);
    }

    offset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length) merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  if (uvs.length) merged.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  merged.computeVertexNormals();
  return merged;
}
