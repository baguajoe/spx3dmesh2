import * as THREE from "three";

export function createLayeredMaterial(layers){

  const base = layers[0];

  const mat = new THREE.MeshStandardMaterial({
    color: base.color || "#ffffff",
    roughness: base.roughness ?? 0.5
  });

  mat.onBeforeCompile = shader => {

    shader.uniforms.layerMix = { value: 0.5 };

    shader.fragmentShader = `
      uniform float layerMix;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `
        gl_FragColor.rgb = mix(gl_FragColor.rgb,
                               gl_FragColor.rgb * 1.1,
                               layerMix);
        #include <dithering_fragment>
      `
    );
  };

  return mat;
}
