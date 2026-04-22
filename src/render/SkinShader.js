import * as THREE from "three";

export function createSkinMaterial({
  color = "#f2c6a0",
  roughness = 0.35,
  metalness = 0.0,
  subsurface = 0.35
} = {}) {

  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat: 0.2,
    clearcoatRoughness: 0.25,
    transmission: 0.0
  });

  mat.onBeforeCompile = shader => {

    shader.uniforms.subsurfaceStrength = { value: subsurface };

    shader.fragmentShader =
      `
      uniform float subsurfaceStrength;
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <output_fragment>",
      `
      vec3 scatter = outgoingLight * subsurfaceStrength * 0.35;
      outgoingLight += scatter;

      #include <output_fragment>
      `
    );
  };

  return mat;
}

export function applySkinMaterial(mesh){
  mesh.material = createSkinMaterial();
}
