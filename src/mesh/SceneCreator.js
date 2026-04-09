import * as THREE from "three";

export const SCENE_PRESETS = {
  empty:     { name:"Empty",        lighting:"none",    bg:"#06060f" },
  studio:    { name:"Studio",       lighting:"studio",  bg:"#111111" },
  outdoor:   { name:"Outdoor",      lighting:"outdoor", bg:"#87ceeb" },
  night:     { name:"Night",        lighting:"night",   bg:"#000010" },
  product:   { name:"Product Shot", lighting:"product", bg:"#ffffff" },
  character: { name:"Character",    lighting:"three",   bg:"#1a1a2e" },
};

export const ENVIRONMENT_PRESETS = {
  none:      { type:"color",    value:"#06060f" },
  studio:    { type:"gradient", top:"#222",    bottom:"#111" },
  sky:       { type:"gradient", top:"#1a6fa8", bottom:"#c8e8f0" },
  sunset:    { type:"gradient", top:"#ff6b35", bottom:"#f7c59f" },
  night:     { type:"gradient", top:"#000010", bottom:"#0d0d2b" },
  warehouse: { type:"color",    value:"#2a2a2a" },
  void:      { type:"color",    value:"#000000" },
};

export function createSceneObject(type, options = {}) {
  return {
    id:       crypto.randomUUID(),
    name:     options.name || `${type}_${Date.now()}`,
    type,
    position: options.position || [0, 0, 0],
    rotation: options.rotation || [0, 0, 0],
    scale:    options.scale    || [1, 1, 1],
    visible:  true,
    locked:   false,
    children: [],
    parent:   null,
    userData: options.userData || {},
    ...options,
  };
}

export function createScene(name = "Untitled Scene") {
  return {
    id:   crypto.randomUUID(),
    name,
    objects: [],
    collections: [{ id: "scene_col", name: "Scene Collection", objects: [], visible: true }],
    activeObject:    null,
    selectedObjects: [],
    frame:      1,
    frameStart: 1,
    frameEnd:   250,
    fps:        24,
    environment: { ...ENVIRONMENT_PRESETS.none },
    lighting:    "none",
    lightingObjects: [],
    metadata: { created: Date.now(), modified: Date.now(), version: "1.0" },
  };
}

export function addObjectToScene(scene, obj) {
  scene.objects.push(obj);
  scene.collections[0].objects.push(obj.id);
  scene.activeObject = obj.id;
  return scene;
}

export function removeObjectFromScene(scene, id) {
  scene.objects = scene.objects.filter(o => o.id !== id);
  scene.collections.forEach(c => { c.objects = c.objects.filter(x => x !== id); });
  if (scene.activeObject === id) scene.activeObject = scene.objects.at(-1)?.id || null;
  return scene;
}

export function duplicateObject(scene, id) {
  const src = scene.objects.find(o => o.id === id);
  if (!src) return scene;
  const copy = { ...JSON.parse(JSON.stringify(src)), id: crypto.randomUUID(), name: src.name + "_copy" };
  copy.position = [src.position[0] + 0.5, src.position[1], src.position[2] + 0.5];
  copy.children = [];
  copy.parent = null;
  return addObjectToScene(scene, copy);
}

export function parentObjects(scene, childId, parentId) {
  const child = scene.objects.find(o => o.id === childId);
  const par   = scene.objects.find(o => o.id === parentId);
  if (!child || !par) return scene;
  child.parent = parentId;
  if (!par.children.includes(childId)) par.children.push(childId);
  return scene;
}

export function unparentObject(scene, childId) {
  const child = scene.objects.find(o => o.id === childId);
  if (!child || !child.parent) return scene;
  const par = scene.objects.find(o => o.id === child.parent);
  if (par) par.children = par.children.filter(c => c !== childId);
  child.parent = null;
  return scene;
}

export function getObjectHierarchy(scene) {
  const build = obj => ({
    ...obj,
    children: obj.children
      .map(cid => build(scene.objects.find(o => o.id === cid)))
      .filter(Boolean),
  });
  return scene.objects.filter(o => !o.parent).map(build);
}

export function selectObject(scene, id, additive = false) {
  if (!additive) scene.selectedObjects = [];
  if (id && !scene.selectedObjects.includes(id)) scene.selectedObjects.push(id);
  scene.activeObject = id;
  return scene;
}

export function createCollection(scene, name) {
  const col = { id: crypto.randomUUID(), name, objects: [], visible: true };
  scene.collections.push(col);
  return col;
}

export function addToCollection(scene, colId, objId) {
  const col = scene.collections.find(c => c.id === colId);
  if (col && !col.objects.includes(objId)) col.objects.push(objId);
  return scene;
}

export function toggleCollectionVisibility(scene, colId) {
  const col = scene.collections.find(c => c.id === colId);
  if (col) {
    col.visible = !col.visible;
    col.objects.forEach(oid => {
      const obj = scene.objects.find(o => o.id === oid);
      if (obj) obj.visible = col.visible;
    });
  }
  return scene;
}

export function applyLightingSetup(scene, type) {
  const setups = {
    none:    [],
    studio:  [
      { type: "point",       pos: [3, 4, 3],   color: "#ffffff", intensity: 1.5 },
      { type: "point",       pos: [-3, 2, -3], color: "#aaccff", intensity: 0.8 },
      { type: "ambient",     pos: [0, 0, 0],   color: "#ffffff", intensity: 0.3 },
    ],
    outdoor: [
      { type: "directional", pos: [5, 10, 5],  color: "#fff5e0", intensity: 2.0 },
      { type: "ambient",     pos: [0, 0, 0],   color: "#87ceeb", intensity: 0.5 },
    ],
    night:   [
      { type: "point",       pos: [0, 5, 0],   color: "#4455ff", intensity: 0.5 },
      { type: "ambient",     pos: [0, 0, 0],   color: "#000033", intensity: 0.1 },
    ],
    product: [
      { type: "directional", pos: [3, 5, 3],   color: "#ffffff", intensity: 1.8 },
      { type: "directional", pos: [-3, 3, -2], color: "#ffffff", intensity: 0.9 },
      { type: "ambient",     pos: [0, 0, 0],   color: "#ffffff", intensity: 0.4 },
    ],
    three:   [
      { type: "directional", pos: [5, 5, 5],   color: "#ffffff", intensity: 1.5 },
      { type: "directional", pos: [-5, 3, 0],  color: "#aaccff", intensity: 0.6 },
      { type: "directional", pos: [0, 0, -5],  color: "#ffeedd", intensity: 0.3 },
    ],
  };
  scene.lighting = type;
  scene.lightingObjects = (setups[type] || []).map((l, i) =>
    createSceneObject("light", {
      name:      `Light_${i}`,
      position:  l.pos,
      lightType: l.type,
      color:     l.color,
      intensity: l.intensity,
    })
  );
  return scene;
}

export function applyEnvironment(scene, key) {
  scene.environment = { ...(ENVIRONMENT_PRESETS[key] || ENVIRONMENT_PRESETS.none), preset: key };
  return scene;
}

export function buildEnvironmentMesh(preset) {
  if (!preset) return null;
  const geo = new THREE.SphereGeometry(500, 32, 16);
  geo.scale(-1, 1, 1);
  let mat;
  if (preset.type === "color") {
    mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(preset.value), side: THREE.BackSide });
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = 4; canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, preset.top    || "#000");
    g.addColorStop(1, preset.bottom || "#111");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.BackSide });
  }
  return new THREE.Mesh(geo, mat);
}

export function buildSceneThreeObjects(scene) {
  const group = new THREE.Group();
  group.name  = scene.name;
  scene.objects.forEach(obj => {
    if (obj.type === "empty") {
      const m = new THREE.Object3D();
      m.name = obj.name;
      m.position.set(...obj.position);
      m.rotation.set(...obj.rotation);
      m.scale.set(...obj.scale);
      group.add(m);
    }
  });
  return group;
}

export function serializeScene(scene) {
  return JSON.stringify({ ...scene, metadata: { ...scene.metadata, modified: Date.now() } }, null, 2);
}

export function deserializeScene(json) {
  try { return JSON.parse(json); } catch { return createScene(); }
}

export function getSceneStats(scene) {
  return {
    objects:     scene.objects.length,
    meshes:      scene.objects.filter(o => o.type === "mesh").length,
    lights:      scene.objects.filter(o => o.type === "light").length,
    cameras:     scene.objects.filter(o => o.type === "camera").length,
    armatures:   scene.objects.filter(o => o.type === "armature").length,
    collections: scene.collections.length,
    selected:    scene.selectedObjects.length,
  };
}

export function cloneScene(scene) {
  return deserializeScene(serializeScene(scene));
}
