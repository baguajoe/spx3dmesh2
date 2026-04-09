// ── Theme system ──────────────────────────────────────────────────────────────
export const THEMES = {
  dark: {
    label:      "Dark",
    bg:         "#06060f",
    surface:    "#0d1117",
    border:     "#21262d",
    accent:     "#00ffc8",
    accent2:    "#FF6600",
    text:       "#dde6ef",
    text2:      "#8fa8bf",
    text3:      "#4e6a82",
    font:       "JetBrains Mono, monospace",
  },
  light: {
    label:      "Light",
    bg:         "#f0f4f8",
    surface:    "#ffffff",
    border:     "#d1d9e0",
    accent:     "#00a884",
    accent2:    "#e05a00",
    text:       "#1a2332",
    text2:      "#4a6080",
    text3:      "#8090a0",
    font:       "JetBrains Mono, monospace",
  },
  midnight: {
    label:      "Midnight",
    bg:         "#000010",
    surface:    "#080818",
    border:     "#1a1a3a",
    accent:     "#4488ff",
    accent2:    "#ff4488",
    text:       "#ccd8ff",
    text2:      "#6688cc",
    text3:      "#334466",
    font:       "JetBrains Mono, monospace",
  },
  forest: {
    label:      "Forest",
    bg:         "#0a0f0a",
    surface:    "#0f1a0f",
    border:     "#1a2e1a",
    accent:     "#44ff88",
    accent2:    "#ff8844",
    text:       "#ccddcc",
    text2:      "#669966",
    text3:      "#334433",
    font:       "JetBrains Mono, monospace",
  },
  custom: {
    label:      "Custom",
    bg:         "#06060f",
    surface:    "#0d1117",
    border:     "#21262d",
    accent:     "#00ffc8",
    accent2:    "#FF6600",
    text:       "#dde6ef",
    text2:      "#8fa8bf",
    text3:      "#4e6a82",
    font:       "JetBrains Mono, monospace",
  },
};

export function applyTheme(theme) {
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    if (typeof value === "string") root.style.setProperty("--spx-" + key, value);
  });
  document.body.style.background   = theme.bg;
  document.body.style.color        = theme.text;
  document.body.style.fontFamily   = theme.font;
}

export function serializeTheme(theme) {
  return JSON.stringify(theme);
}

export function loadThemeFromStorage(key="spx-theme") {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveThemeToStorage(theme, key="spx-theme") {
  try { localStorage.setItem(key, JSON.stringify(theme)); } catch {}
}

// ── Keyboard shortcut overlay ─────────────────────────────────────────────────
export const SHORTCUT_CATEGORIES = {
  navigation: {
    label: "Navigation",
    shortcuts: [
      { keys:["G"],           desc:"Toggle grid" },
      { keys:["W"],           desc:"Toggle wireframe" },
      { keys:["F"],           desc:"Focus selected" },
      { keys:["Numpad 1"],    desc:"Front view" },
      { keys:["Numpad 3"],    desc:"Right view" },
      { keys:["Numpad 7"],    desc:"Top view" },
      { keys:["F11"],         desc:"Fullscreen" },
    ],
  },
  edit: {
    label: "Edit",
    shortcuts: [
      { keys:["Ctrl","Z"],    desc:"Undo" },
      { keys:["Ctrl","Y"],    desc:"Redo" },
      { keys:["Ctrl","D"],    desc:"Duplicate" },
      { keys:["Delete"],      desc:"Delete" },
      { keys:["Ctrl","A"],    desc:"Select all" },
      { keys:["Shift","A"],   desc:"Add mesh" },
      { keys:["H"],           desc:"Hide selected" },
      { keys:["Alt","H"],     desc:"Show all" },
    ],
  },
  file: {
    label: "File",
    shortcuts: [
      { keys:["Ctrl","S"],    desc:"Save scene" },
      { keys:["Ctrl","O"],    desc:"Open file" },
      { keys:["Ctrl","E"],    desc:"Export" },
      { keys:["Ctrl","I"],    desc:"Import" },
      { keys:["Ctrl","N"],    desc:"New scene" },
    ],
  },
  sculpt: {
    label: "Sculpt",
    shortcuts: [
      { keys:["Tab"],         desc:"Toggle edit mode" },
      { keys:["Escape"],      desc:"Deselect" },
      { keys:["["],           desc:"Decrease brush size" },
      { keys:["]"],           desc:"Increase brush size" },
      { keys:["Shift"],       desc:"Smooth brush" },
      { keys:["Ctrl"],        desc:"Subtract brush" },
    ],
  },
};

export function buildShortcutOverlayHTML(theme) {
  return Object.entries(SHORTCUT_CATEGORIES).map(([catKey, cat]) => ({
    category: cat.label,
    items:    cat.shortcuts,
  }));
}

// ── Onboarding tour ───────────────────────────────────────────────────────────
export const TOUR_STEPS = [
  {
    id:      "welcome",
    title:   "Welcome to SPX Mesh Editor",
    body:    "A professional 3D modeling suite running entirely in your browser — or as a desktop app.",
    target:  null,
    action:  null,
  },
  {
    id:      "viewport",
    title:   "3D Viewport",
    body:    "This is your main workspace. Left-click to select, right-click to orbit, scroll to zoom.",
    target:  "viewport",
    action:  null,
  },
  {
    id:      "toolbar",
    title:   "Toolbar",
    body:    "Quick access to all feature panels — sculpting, rigging, hair, cloth, VFX, rendering and more.",
    target:  "toolbar",
    action:  null,
  },
  {
    id:      "addmesh",
    title:   "Add Your First Mesh",
    body:    "Click any shape button (Cube, Sphere, Cylinder...) to add geometry to the scene.",
    target:  "mesh-buttons",
    action:  "addSphere",
  },
  {
    id:      "sculpt",
    title:   "Sculpting",
    body:    "Enable sculpt mode and use the brush panel to shape your mesh with brushes like Draw, Smooth, Pinch.",
    target:  "sculpt-panel",
    action:  null,
  },
  {
    id:      "materials",
    title:   "Materials",
    body:    "Open the Material Editor to apply PBR materials, GLSL shaders, toon rendering, and more.",
    target:  "material-panel",
    action:  null,
  },
  {
    id:      "export",
    title:   "Export to StreamPireX",
    body:    "When ready, use Export → StreamPireX to send your asset directly to the StreamPireX platform.",
    target:  "export-btn",
    action:  null,
  },
  {
    id:      "done",
    title:   "You're Ready!",
    body:    "Explore all the panels to discover sculpting, rigging, animation, hair, cloth, VFX, and more. Happy creating!",
    target:  null,
    action:  null,
  },
];

export function createTourState() {
  return {
    active:      false,
    step:        0,
    completed:   loadTourCompleted(),
    dismissed:   false,
  };
}

export function advanceTour(tour) {
  if (tour.step < TOUR_STEPS.length - 1) { tour.step++; return TOUR_STEPS[tour.step]; }
  tour.active    = false;
  tour.completed = true;
  saveTourCompleted();
  return null;
}

export function loadTourCompleted(key="spx-tour-done") {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}

export function saveTourCompleted(key="spx-tour-done") {
  try { localStorage.setItem(key, "1"); } catch {}
}

// ── StreamPireX export ────────────────────────────────────────────────────────
export const SPX_EXPORT_FORMATS = {
  glb:      { label:"GLB",       ext:".glb",  mime:"model/gltf-binary",   desc:"Binary GLTF — recommended" },
  gltf:     { label:"GLTF",      ext:".gltf", mime:"model/gltf+json",     desc:"JSON GLTF with separate assets" },
  obj:      { label:"OBJ",       ext:".obj",  mime:"text/plain",           desc:"Wavefront OBJ — universal" },
  spx:      { label:"SPX Scene", ext:".spx",  mime:"application/json",    desc:"Native SPX scene format" },
  fbx:      { label:"FBX",       ext:".fbx",  mime:"application/octet-stream", desc:"Autodesk FBX — requires backend" },
};

export function buildSPXExportPayload(scene, options = {}) {
  const objects = [];
  scene.traverse(obj => {
    if (!obj.isMesh) return;
    const geo = obj.geometry;
    const mat = obj.material;
    objects.push({
      name:     obj.name || "Object",
      uuid:     obj.uuid,
      position: obj.position.toArray(),
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale:    obj.scale.toArray(),
      visible:  obj.visible,
      vertices: geo.attributes.position?.count || 0,
      material: {
        type:     mat.type,
        color:    mat.color?.getHexString(),
        roughness:mat.roughness,
        metalness:mat.metalness,
      },
    });
  });

  return {
    version:   "1.0",
    app:       "SPX Mesh Editor",
    exported:  new Date().toISOString(),
    platform:  "StreamPireX",
    userId:    options.userId     || null,
    projectId: options.projectId  || null,
    format:    options.format     || "spx",
    scene: {
      objects,
      lights:  [],
      cameras: [],
    },
    meta: {
      objectCount: objects.length,
      exportedBy:  "SPX Mesh Editor v1.0",
    },
  };
}

export async function exportToStreamPireX(payload, apiBase="https://streampirex.com/api") {
  try {
    const res = await fetch(`${apiBase}/mesh-editor/import`, {
      method:  "POST",
      headers: { "Content-Type":"application/json" },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch(e) {
    console.warn("SPX export (offline mode):", e.message);
    return { success:false, offline:true, payload };
  }
}

export function downloadSPXFile(payload, filename="scene.spx") {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
