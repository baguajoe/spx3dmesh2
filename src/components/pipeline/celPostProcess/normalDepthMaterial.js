// Custom normal+depth material for Stage 4c of the GPU cel pipeline.
//
// MeshNormalMaterial alone writes view-space normal to RGB and a
// constant alpha=1.0. The cel fragment shader's depth-Sobel branch
// reads tNormalDepth.a as linear depth — with constant alpha the Sobel
// always returns zero, so silhouetteFactor never fires and outer
// silhouettes render at the same line weight as inner detail.
//
// This factory builds a MeshNormalMaterial and patches it via
// onBeforeCompile to also write linearized view-space depth to alpha.
// Patching MeshNormalMaterial (rather than rolling a from-scratch
// ShaderMaterial) inherits Three.js's existing handling of skinning,
// morph targets, and instancing — none of which the cel pipeline would
// otherwise have to re-implement for skinned avatars.
//
// Linear depth = -mvPosition.z / uFarPlane, clamped to [0,1]. Caller
// must update uFarPlane each frame via setFar(camera.far) before
// rendering the normal pass; otherwise depth will compress against the
// 100-unit default and silhouette detection on far-away geometry
// degrades.

import * as THREE from 'three';

// Factory. Returns the material with a setFar(v) helper attached so
// the celPostProcess driver doesn't have to reach into shader internals
// to swing the uniform per frame.
//
// One instance handles both regular Mesh and SkinnedMesh because
// MeshNormalMaterial already opts into Three.js's USE_SKINNING /
// USE_MORPHTARGETS macro flow when bound to a SkinnedMesh — our
// onBeforeCompile patches don't touch any of that.
export function createNormalDepthMaterial() {
  const farUniform = { value: 100.0 };

  const mat = new THREE.MeshNormalMaterial({
    side: THREE.DoubleSide,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFarPlane = farUniform;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vViewZ;'
      )
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvViewZ = -mvPosition.z;'
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vViewZ;\nuniform float uFarPlane;'
      )
      .replace(
        'gl_FragColor = vec4( packNormalToRGB( normal ), opacity );',
        'gl_FragColor = vec4( packNormalToRGB( normal ), clamp(vViewZ / uFarPlane, 0.0, 1.0) );'
      );
  };

  mat.setFar = (v) => { farUniform.value = v; };

  return mat;
}
