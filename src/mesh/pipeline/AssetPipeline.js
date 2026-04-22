export function createAssetManifest(obj) {
  return {
    name: obj?.name || obj?.type || "Unnamed",
    type: obj?.type || "Object3D",
    uuid: obj?.uuid || null,
    exportedAt: new Date().toISOString(),
    transforms: obj ? {
      position: obj.position?.toArray?.() || [0, 0, 0],
      rotation: [obj.rotation?.x || 0, obj.rotation?.y || 0, obj.rotation?.z || 0],
      scale: obj.scale?.toArray?.() || [1, 1, 1]
    } : null,
    material: obj?.material?.type || null,
    geometry: obj?.geometry?.type || null,
    userData: obj?.userData || {}
  };
}

export function createSceneManifest(scene) {
  const objects = [];
  scene?.traverse?.((obj) => {
    if (obj === scene) return;
    objects.push({
      name: obj.name || obj.type,
      type: obj.type,
      uuid: obj.uuid,
      parent: obj.parent?.uuid || null
    });
  });

  return {
    exportedAt: new Date().toISOString(),
    objectCount: objects.length,
    objects
  };
}

function downloadJson(name, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadAssetManifest(obj) {
  const manifest = createAssetManifest(obj);
  downloadJson(`${manifest.name || "asset"}_manifest.json`, manifest);
  return manifest;
}

export function downloadSceneManifest(scene) {
  const manifest = createSceneManifest(scene);
  downloadJson("scene_manifest.json", manifest);
  return manifest;
}
