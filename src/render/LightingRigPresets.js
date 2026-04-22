import * as THREE from "three";

export function applyThreePointLighting(scene){

  const key = new THREE.DirectionalLight("#ffffff", 1.5);
  key.position.set(5,5,5);

  const fill = new THREE.DirectionalLight("#ffffff", 0.6);
  fill.position.set(-5,3,2);

  const rim = new THREE.DirectionalLight("#ffffff", 1.2);
  rim.position.set(0,5,-5);

  scene.add(key, fill, rim);
}

export function applyStudioLighting(scene){

  const hemi = new THREE.HemisphereLight("#ffffff", "#444444", 1.1);
  scene.add(hemi);

}
