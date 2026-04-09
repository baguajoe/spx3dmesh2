// ── Plugin registry ───────────────────────────────────────────────────────────
const pluginRegistry = {
  brushes:    new Map(),
  shaders:    new Map(),
  exporters:  new Map(),
  importers:  new Map(),
  panels:     new Map(),
  emitters:   new Map(),
  constraints:new Map(),
};

// ── Register plugin ───────────────────────────────────────────────────────────
export function registerPlugin(plugin) {
  if (!plugin?.name || !plugin?.type) {
    console.warn("SPXPlugin: plugin must have name and type");
    return false;
  }
  const registry = pluginRegistry[plugin.type + "s"] || pluginRegistry[plugin.type];
  if (!registry) {
    console.warn("SPXPlugin: unknown type:", plugin.type);
    return false;
  }
  registry.set(plugin.name, {
    ...plugin,
    registeredAt: Date.now(),
    enabled: plugin.enabled !== false,
  });
  console.log(`SPXPlugin: registered ${plugin.type} — ${plugin.name}`);
  return true;
}

// ── Unregister plugin ─────────────────────────────────────────────────────────
export function unregisterPlugin(type, name) {
  const registry = pluginRegistry[type + "s"] || pluginRegistry[type];
  if (!registry) return false;
  return registry.delete(name);
}

// ── Get plugins by type ───────────────────────────────────────────────────────
export function getPlugins(type) {
  const registry = pluginRegistry[type + "s"] || pluginRegistry[type];
  if (!registry) return [];
  return Array.from(registry.values()).filter(p => p.enabled);
}

// ── Get all plugins ───────────────────────────────────────────────────────────
export function getAllPlugins() {
  const all = [];
  Object.entries(pluginRegistry).forEach(([type, map]) => {
    map.forEach(plugin => all.push({ ...plugin, registryType: type }));
  });
  return all;
}

// ── Expose global API ─────────────────────────────────────────────────────────
export function initPluginAPI() {
  if (typeof window === "undefined") return;
  window.SPXPlugin = {
    register:   registerPlugin,
    unregister: unregisterPlugin,
    get:        getPlugins,
    getAll:     getAllPlugins,
    version:    "1.0.0",
    types:      Object.keys(pluginRegistry),
  };
  console.log("SPXPlugin API initialized — window.SPXPlugin ready");
}

// ── Load plugin from URL ──────────────────────────────────────────────────────
export async function loadPluginFromURL(url) {
  try {
    const script = document.createElement("script");
    script.src   = url;
    script.type  = "module";
    await new Promise((resolve, reject) => {
      script.onload  = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return { success:true, url };
  } catch(e) {
    return { success:false, url, error:e.message };
  }
}

// ── Load plugin from file ─────────────────────────────────────────────────────
export async function loadPluginFromFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const blob = new Blob([e.target.result], { type:"application/javascript" });
        const url  = URL.createObjectURL(blob);
        const script = document.createElement("script");
        script.src   = url;
        script.type  = "module";
        script.onload  = () => resolve({ success:true, name:file.name });
        script.onerror = () => resolve({ success:false, name:file.name, error:"Script load failed" });
        document.head.appendChild(script);
      } catch(e) {
        resolve({ success:false, error:e.message });
      }
    };
    reader.readAsText(file);
  });
}

// ── Built-in preset plugins ───────────────────────────────────────────────────
export const BUILTIN_BRUSH_PLUGINS = [
  {
    name: "TubeBrush",
    type: "brush",
    label: "Tube",
    icon: "⌀",
    description: "Creates tube-shaped extrusions along stroke",
    onStroke: (hit, mesh, settings) => {
      // Placeholder — actual implementation adds tube geometry
      return { type:"tube", hit, settings };
    },
  },
  {
    name: "CracksBrush",
    type: "brush",
    label: "Cracks",
    icon: "⚡",
    description: "Adds crack/split details",
    onStroke: (hit, mesh, settings) => {
      return { type:"cracks", hit, settings };
    },
  },
  {
    name: "ScalesBrush",
    type: "brush",
    label: "Scales",
    icon: "◈",
    description: "Reptile scale pattern",
    onStroke: (hit, mesh, settings) => {
      return { type:"scales", hit, settings };
    },
  },
];

// ── Preset marketplace ────────────────────────────────────────────────────────
export const PRESET_CATEGORIES = {
  sculpt:    { label:"Sculpt",    icon:"🗿", color:"#00ffc8" },
  material:  { label:"Material",  icon:"◈",  color:"#FF6600" },
  shader:    { label:"Shader",    icon:"✦",  color:"#8844ff" },
  hair:      { label:"Hair",      icon:"〰", color:"#886644" },
  vfx:       { label:"VFX",       icon:"✦",  color:"#4488ff" },
  lighting:  { label:"Lighting",  icon:"☀",  color:"#ffaa00" },
  scene:     { label:"Scene",     icon:"🌐", color:"#44ff88" },
};

export function createPresetMarketplace() {
  return {
    presets:    [],
    featured:   [],
    installed:  new Set(),
    loading:    false,
  };
}

// ── Community presets (mock data — replace with API) ──────────────────────────
export const COMMUNITY_PRESETS = [
  { id:"p001", name:"Skin SSS",        category:"material", author:"SPX",    downloads:1240, rating:4.8, free:true,  price:0,    tags:["skin","sss","realistic"] },
  { id:"p002", name:"Toon Outline",    category:"shader",   author:"SPX",    downloads:980,  rating:4.6, free:true,  price:0,    tags:["toon","npl","anime"] },
  { id:"p003", name:"Wet Hair",        category:"hair",     author:"SPX",    downloads:760,  rating:4.7, free:true,  price:0,    tags:["hair","wet","realistic"] },
  { id:"p004", name:"Fire Preset",     category:"vfx",      author:"SPX",    downloads:2100, rating:4.9, free:true,  price:0,    tags:["fire","vfx","particles"] },
  { id:"p005", name:"Studio HDRI",     category:"lighting", author:"SPX",    downloads:3400, rating:4.9, free:true,  price:0,    tags:["hdri","studio","lighting"] },
  { id:"p006", name:"Rock Sculpt",     category:"sculpt",   author:"Community", downloads:540, rating:4.5, free:false, price:2.99, tags:["rock","sculpt","natural"] },
  { id:"p007", name:"Metal PBR",       category:"material", author:"Community", downloads:890, rating:4.7, free:false, price:1.99, tags:["metal","pbr","reflective"] },
  { id:"p008", name:"Dragon Scales",   category:"sculpt",   author:"Community", downloads:320, rating:4.4, free:false, price:4.99, tags:["scales","dragon","fantasy"] },
  { id:"p009", name:"Holographic",     category:"shader",   author:"SPX",    downloads:1560, rating:4.8, free:true,  price:0,    tags:["holographic","sci-fi","glow"] },
  { id:"p010", name:"Ocean Fluid",     category:"vfx",      author:"Community", downloads:670, rating:4.6, free:false, price:3.99, tags:["ocean","fluid","water"] },
];

export function searchPresets(marketplace, query, { category=null, freeOnly=false } = {}) {
  return COMMUNITY_PRESETS.filter(p => {
    const matchQ    = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.tags.some(t=>t.includes(query.toLowerCase()));
    const matchCat  = !category || p.category === category;
    const matchFree = !freeOnly || p.free;
    return matchQ && matchCat && matchFree;
  });
}

export function installPreset(marketplace, presetId) {
  marketplace.installed.add(presetId);
  return { success:true, id:presetId };
}

export function uninstallPreset(marketplace, presetId) {
  marketplace.installed.delete(presetId);
  return { success:true, id:presetId };
}

export function isPresetInstalled(marketplace, presetId) {
  return marketplace.installed.has(presetId);
}

export function getInstalledPresets(marketplace) {
  return COMMUNITY_PRESETS.filter(p => marketplace.installed.has(p.id));
}

// ── Save custom preset ────────────────────────────────────────────────────────
export function saveCustomPreset(name, category, data, author="User") {
  const preset = {
    id:        "custom_" + crypto.randomUUID().slice(0,8),
    name,
    category,
    author,
    data,
    created:   Date.now(),
    free:      true,
    price:     0,
    downloads: 0,
    rating:    0,
    tags:      ["custom", "user"],
  };
  try {
    const existing = JSON.parse(localStorage.getItem("spx-custom-presets") || "[]");
    existing.push(preset);
    localStorage.setItem("spx-custom-presets", JSON.stringify(existing));
  } catch(e) {}
  return preset;
}

export function loadCustomPresets() {
  try {
    return JSON.parse(localStorage.getItem("spx-custom-presets") || "[]");
  } catch { return []; }
}

export function getPluginStats() {
  const stats = {};
  Object.entries(pluginRegistry).forEach(([type, map]) => {
    stats[type] = map.size;
  });
  stats.total = Object.values(stats).reduce((s,n)=>s+n,0);
  return stats;
}
