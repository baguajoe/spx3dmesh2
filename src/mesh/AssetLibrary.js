import * as THREE from "three";

// ── Asset types ───────────────────────────────────────────────────────────────
export const ASSET_TYPES = {
  mesh:      { label:"Mesh",      icon:"⬡", color:"#00ffc8" },
  material:  { label:"Material",  icon:"◈", color:"#FF6600" },
  texture:   { label:"Texture",   icon:"▣", color:"#4488ff" },
  animation: { label:"Animation", icon:"▶", color:"#8844ff" },
  preset:    { label:"Preset",    icon:"★", color:"#ffaa00" },
  scene:     { label:"Scene",     icon:"🌐", color:"#44ff88" },
};

// ── Asset library ─────────────────────────────────────────────────────────────
export function createAssetLibrary() {
  return {
    assets:    [],
    tags:      new Set(),
    favorites: new Set(),
    recent:    [],
    searchTerm:"",
  };
}

// ── Add asset ─────────────────────────────────────────────────────────────────
export function addAsset(library, options = {}) {
  const asset = {
    id:          crypto.randomUUID(),
    name:        options.name        || "Asset_" + library.assets.length,
    type:        options.type        || "mesh",
    tags:        options.tags        || [],
    thumbnail:   options.thumbnail   || null,
    data:        options.data        || null,
    created:     Date.now(),
    modified:    Date.now(),
    size:        options.size        || 0,
    author:      options.author      || "User",
    description: options.description || "",
    r2Key:       options.r2Key       || null,
  };
  library.assets.push(asset);
  asset.tags.forEach(t => library.tags.add(t));
  library.recent.unshift(asset.id);
  if (library.recent.length > 20) library.recent.pop();
  return asset;
}

// ── Search assets ─────────────────────────────────────────────────────────────
export function searchAssets(library, query, { type=null, tags=[] } = {}) {
  return library.assets.filter(a => {
    const matchName = !query || a.name.toLowerCase().includes(query.toLowerCase());
    const matchType = !type || a.type === type;
    const matchTags = !tags.length || tags.every(t => a.tags.includes(t));
    return matchName && matchType && matchTags;
  });
}

// ── Remove asset ──────────────────────────────────────────────────────────────
export function removeAsset(library, id) {
  library.assets = library.assets.filter(a => a.id !== id);
  library.recent  = library.recent.filter(r => r !== id);
  library.favorites.delete(id);
}

// ── Toggle favorite ───────────────────────────────────────────────────────────
export function toggleFavorite(library, id) {
  if (library.favorites.has(id)) library.favorites.delete(id);
  else library.favorites.add(id);
}

// ── Generate thumbnail ────────────────────────────────────────────────────────
export function generateThumbnail(renderer, scene, camera, size=128) {
  const origSize = renderer.getSize(new THREE.Vector2());
  renderer.setSize(size, size);
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL("image/png");
  renderer.setSize(origSize.x, origSize.y);
  return dataURL;
}

// ── Save to R2 (serialized) ───────────────────────────────────────────────────
export function serializeAssetForR2(asset) {
  return JSON.stringify({
    id:       asset.id,
    name:     asset.name,
    type:     asset.type,
    tags:     asset.tags,
    created:  asset.created,
    modified: asset.modified,
    size:     asset.size,
    author:   asset.author,
    description: asset.description,
  });
}

// ── Procedural animation library ─────────────────────────────────────────────
export const PROCEDURAL_ANIMATIONS = {
  float:   { label:"Float",   expr:(t)=>({ posY: Math.sin(t*2)*0.1 }), label2:"Gentle floating" },
  spin:    { label:"Spin",    expr:(t)=>({ rotY: t*0.5 }), label2:"Continuous rotation" },
  pulse:   { label:"Pulse",   expr:(t)=>({ scaleX:1+Math.sin(t*3)*0.05, scaleY:1+Math.sin(t*3)*0.05, scaleZ:1+Math.sin(t*3)*0.05 }), label2:"Pulsing scale" },
  wobble:  { label:"Wobble",  expr:(t)=>({ rotZ: Math.sin(t*4)*0.1 }), label2:"Side wobble" },
  bounce:  { label:"Bounce",  expr:(t)=>({ posY: Math.abs(Math.sin(t*3))*0.2 }), label2:"Bouncing" },
  orbit:   { label:"Orbit",   expr:(t)=>({ posX: Math.cos(t)*0.5, posZ: Math.sin(t)*0.5 }), label2:"Orbit path" },
  shake:   { label:"Shake",   expr:(t)=>({ posX: Math.sin(t*20)*0.01, posZ: Math.cos(t*17)*0.01 }), label2:"Random shake" },
  breathe: { label:"Breathe", expr:(t)=>({ scaleX:1+Math.sin(t)*0.02, scaleY:1+Math.sin(t)*0.02, scaleZ:1+Math.sin(t)*0.02 }), label2:"Breathing scale" },
};

export function applyProceduralAnimation(mesh, animKey, time) {
  const anim = PROCEDURAL_ANIMATIONS[animKey];
  if (!anim || !mesh) return;
  const vals = anim.expr(time);
  if (vals.posX !== undefined) mesh.position.x = vals.posX;
  if (vals.posY !== undefined) mesh.position.y = vals.posY;
  if (vals.posZ !== undefined) mesh.position.z = vals.posZ;
  if (vals.rotX !== undefined) mesh.rotation.x = vals.rotX;
  if (vals.rotY !== undefined) mesh.rotation.y = vals.rotY;
  if (vals.rotZ !== undefined) mesh.rotation.z = vals.rotZ;
  if (vals.scaleX !== undefined) { mesh.scale.x=vals.scaleX; mesh.scale.y=vals.scaleY||vals.scaleX; mesh.scale.z=vals.scaleZ||vals.scaleX; }
}

// ── Audio sync ────────────────────────────────────────────────────────────────
export function createAudioAnalyzer(audioContext, sourceNode) {
  const analyzer = audioContext.createAnalyser();
  analyzer.fftSize = 256;
  sourceNode.connect(analyzer);
  return {
    analyzer,
    dataArray: new Uint8Array(analyzer.frequencyBinCount),
    getFrequencyData() {
      this.analyzer.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    },
    getBassLevel() {
      this.analyzer.getByteFrequencyData(this.dataArray);
      const bass = this.dataArray.slice(0, 8);
      return bass.reduce((s,v)=>s+v,0) / (8*255);
    },
    getMidLevel() {
      this.analyzer.getByteFrequencyData(this.dataArray);
      const mid = this.dataArray.slice(8, 64);
      return mid.reduce((s,v)=>s+v,0) / (56*255);
    },
    getHighLevel() {
      this.analyzer.getByteFrequencyData(this.dataArray);
      const high = this.dataArray.slice(64);
      return high.reduce((s,v)=>s+v,0) / (high.length*255);
    },
  };
}

export function applyAudioToMesh(mesh, analyzer, { bassScale=true, midColor=false, highEmissive=false } = {}) {
  if (!analyzer || !mesh) return;
  const bass = analyzer.getBassLevel();
  const mid  = analyzer.getMidLevel();
  const high = analyzer.getHighLevel();
  if (bassScale) { const s=1+bass*0.3; mesh.scale.set(s,s,s); }
  if (midColor && mesh.material) mesh.material.color.setHSL(mid, 1, 0.5);
  if (highEmissive && mesh.material) { mesh.material.emissive.setHSL(high, 1, 0.3); mesh.material.emissiveIntensity=high; }
}

// ── Performance optimizer ─────────────────────────────────────────────────────
export function optimizeScene(scene, camera, { frustumCull=true, lodDistance=10, mergeThreshold=5 } = {}) {
  const frustum  = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreenMatrix);

  let visible=0, culled=0, merged=0;
  const mergeCandidates = new Map();

  scene.traverse(obj => {
    if (!obj.isMesh) return;
    if (frustumCull) {
      const inFrustum = frustum.intersectsObject(obj);
      if (!inFrustum && !obj.userData.alwaysVisible) { obj.visible=false; culled++; return; }
      obj.visible = true; visible++;
    }
  });

  return { visible, culled, merged };
}

export function getSceneStats(scene) {
  let meshes=0, tris=0, verts=0, lights=0, materials=new Set();
  scene.traverse(obj => {
    if (obj.isMesh) {
      meshes++;
      if (obj.geometry.index) tris += obj.geometry.index.count/3;
      else tris += obj.geometry.attributes.position?.count/3 || 0;
      verts += obj.geometry.attributes.position?.count || 0;
      if (obj.material) materials.add(obj.material.uuid);
    }
    if (obj.isLight) lights++;
  });
  return { meshes, triangles:Math.round(tris), vertices:verts, lights, materials:materials.size };
}
