import * as THREE from "three";

let _idCounter = 0;

export function buildPrimitiveMesh(type) {
  let geo;
  switch (type) {
    case "sphere":     geo = new THREE.SphereGeometry(0.75, 32, 32); break;
    case "cylinder":   geo = new THREE.CylinderGeometry(0.6, 0.6, 1.5, 32); break;
    case "cone":       geo = new THREE.ConeGeometry(0.6, 1.5, 32); break;
    case "torus":      geo = new THREE.TorusGeometry(0.6, 0.25, 32, 64); break;
    case "plane":      geo = new THREE.PlaneGeometry(2, 2); break;
    case "circle":     geo = new THREE.CircleGeometry(1, 32); break;
    case "icosphere":  geo = new THREE.IcosahedronGeometry(0.8, 2); break;
    default:           geo = new THREE.BoxGeometry(1, 1, 1); break;
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.1 });
  const side = (type === "plane" || type === "circle") ? THREE.DoubleSide : THREE.FrontSide;
  mat.side = side;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createSceneObject(type, name, mesh) {
  const id = "obj_" + (++_idCounter) + "_" + Date.now();
  const label = name || (type.charAt(0).toUpperCase() + type.slice(1) + "." + String(_idCounter).padStart(3, "0"));
  return {
    id,
    name: label,
    type,
    mesh,       // THE SAME mesh that was added to the scene
    visible: true,
    parentId: null,
  };
}
