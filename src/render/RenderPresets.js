export function applyRenderPreset(renderer, preset){

  if(!renderer) return;

  if(preset === "film"){

    renderer.toneMappingExposure = 1.3;
    renderer.physicallyCorrectLights = true;

  }

  if(preset === "preview"){

    renderer.toneMappingExposure = 1.0;

  }

  if(preset === "stylized"){

    renderer.toneMappingExposure = 1.6;

  }

}
