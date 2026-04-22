import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export function loadHDR(scene, renderer, url){

  new RGBELoader().load(url, texture => {

    texture.mapping = THREE.EquirectangularReflectionMapping;

    scene.environment = texture;
    scene.background = texture;

  });

}
