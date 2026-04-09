import * as THREE from "three";

function enableShadow(light) {
  light.castShadow = true;
  if (light.shadow) {
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.bias = -0.0002;
  }
}

export function createTightLightingRig(scene) {
  const group = new THREE.Group();
  group.name = "SPX_TightLightRig";

  const ambient = new THREE.AmbientLight(0xffffff, 0.18);
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x1c1c24, 0.35);
  hemi.position.set(0, 8, 0);

  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(6, 8, 6);
  enableShadow(key);

  const fill = new THREE.DirectionalLight(0xaad8ff, 0.42);
  fill.position.set(-6, 4, 3);

  const rim = new THREE.DirectionalLight(0xfff0dd, 0.95);
  rim.position.set(-4, 6, -7);

  group.add(ambient, hemi, key, fill, rim);
  scene.add(group);

  return { group, ambient, hemi, key, fill, rim };
}

export function addPointLight(scene, opts = {}) {
  const light = new THREE.PointLight(
    opts.color ?? 0xffffff,
    opts.intensity ?? 2.0,
    opts.distance ?? 0,
    opts.decay ?? 2
  );
  light.position.set(...(opts.position ?? [3, 4, 3]));
  enableShadow(light);
  scene.add(light);
  return light;
}

export function addSpotLight(scene, opts = {}) {
  const light = new THREE.SpotLight(
    opts.color ?? 0xffffff,
    opts.intensity ?? 2.2,
    opts.distance ?? 0,
    opts.angle ?? Math.PI / 6,
    opts.penumbra ?? 0.35,
    opts.decay ?? 2
  );
  light.position.set(...(opts.position ?? [5, 7, 5]));
  light.target.position.set(...(opts.target ?? [0, 0, 0]));
  enableShadow(light);
  scene.add(light);
  scene.add(light.target);
  return light;
}
