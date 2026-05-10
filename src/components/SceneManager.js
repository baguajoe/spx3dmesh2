import * as THREE from "three";

let _idCounter = 0;

export function buildPrimitiveMesh(type) {
  let geo;
  switch (type) {
    case "sphere":     geo = new THREE.SphereGeometry(0.75, 96, 96); break;
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
    mesh,           // THE SAME mesh that was added to the scene
    visible: true,
    parentId: null,
    // Per-model AnimationMixer (Phase 1 multi-import). Populated by
    // _attachMixerToModel after construction; null until then or for
    // models without clips after the loader runs.
    mixer: null,
    mixerDuration: 0,
  };
}


export function createFilmSculptLighting(scene) {
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
  keyLight.position.set(3, 5, 4);

  const fillLight = new THREE.DirectionalLight(0xbfc7d6, 0.35);
  fillLight.position.set(-4, 2, 1);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.75);
  rimLight.position.set(-2, 4, -5);

  const ambient = new THREE.AmbientLight(0xffffff, 0.15);

  scene.add(keyLight);
  scene.add(fillLight);
  scene.add(rimLight);
  scene.add(ambient);

  return { keyLight, fillLight, rimLight, ambient };
}
