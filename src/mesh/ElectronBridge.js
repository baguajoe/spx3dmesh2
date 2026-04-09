// ── Electron detection ────────────────────────────────────────────────────────
export function isElectron() {
  return typeof window !== "undefined" &&
    (window.electronAPI !== undefined ||
     window.process?.type === "renderer" ||
     navigator.userAgent.includes("Electron"));
}

export function isDesktop() { return isElectron(); }
export function isBrowser() { return !isElectron(); }

// ── File system (Electron only) ───────────────────────────────────────────────
export async function openFile(options = {}) {
  if (isElectron() && window.electronAPI?.openFile) {
    return await window.electronAPI.openFile(options);
  }
  // Browser fallback — file input
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type  = "file";
    input.accept = options.accept || "*";
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) { reject(new Error("No file selected")); return; }
      const reader = new FileReader();
      reader.onload  = ev => resolve({ path: file.name, data: ev.target.result, file });
      reader.onerror = reject;
      if (options.binary) reader.readAsArrayBuffer(file);
      else reader.readAsText(file);
    };
    input.click();
  });
}

export async function saveFile(data, options = {}) {
  if (isElectron() && window.electronAPI?.saveFile) {
    return await window.electronAPI.saveFile({ data, ...options });
  }
  // Browser fallback — download
  const blob = new Blob([data], { type: options.mimeType || "application/octet-stream" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = options.filename || "export.bin";
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, path: options.filename };
}

export async function openDirectory(options = {}) {
  if (isElectron() && window.electronAPI?.openDirectory) {
    return await window.electronAPI.openDirectory(options);
  }
  return null; // Not available in browser
}

// ── Native menus ──────────────────────────────────────────────────────────────
export const MENU_ITEMS = {
  file: [
    { id:"new",        label:"New Scene",        shortcut:"Ctrl+N" },
    { id:"open",       label:"Open...",           shortcut:"Ctrl+O" },
    { id:"save",       label:"Save",              shortcut:"Ctrl+S" },
    { id:"saveAs",     label:"Save As...",        shortcut:"Ctrl+Shift+S" },
    { id:"import",     label:"Import...",         shortcut:"Ctrl+I" },
    { id:"export",     label:"Export...",         shortcut:"Ctrl+E" },
    { id:"sep1",       type:"separator" },
    { id:"quit",       label:"Quit",              shortcut:"Ctrl+Q" },
  ],
  edit: [
    { id:"undo",       label:"Undo",              shortcut:"Ctrl+Z" },
    { id:"redo",       label:"Redo",              shortcut:"Ctrl+Y" },
    { id:"sep1",       type:"separator" },
    { id:"cut",        label:"Cut",               shortcut:"Ctrl+X" },
    { id:"copy",       label:"Copy",              shortcut:"Ctrl+C" },
    { id:"paste",      label:"Paste",             shortcut:"Ctrl+V" },
    { id:"duplicate",  label:"Duplicate",         shortcut:"Ctrl+D" },
    { id:"delete",     label:"Delete",            shortcut:"Delete" },
    { id:"selectAll",  label:"Select All",        shortcut:"Ctrl+A" },
  ],
  view: [
    { id:"wireframe",  label:"Toggle Wireframe",  shortcut:"W" },
    { id:"grid",       label:"Toggle Grid",       shortcut:"G" },
    { id:"stats",      label:"Toggle Stats",      shortcut:"Ctrl+Shift+S" },
    { id:"fullscreen", label:"Fullscreen",        shortcut:"F11" },
  ],
  object: [
    { id:"addMesh",    label:"Add Mesh",          shortcut:"Shift+A" },
    { id:"group",      label:"Group",             shortcut:"Ctrl+G" },
    { id:"ungroup",    label:"Ungroup",           shortcut:"Ctrl+Shift+G" },
    { id:"hide",       label:"Hide",              shortcut:"H" },
    { id:"show",       label:"Show All",          shortcut:"Alt+H" },
  ],
};

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
export const KEYBOARD_SHORTCUTS = {
  "ctrl+z":        "undo",
  "ctrl+y":        "redo",
  "ctrl+shift+z":  "redo",
  "ctrl+s":        "save",
  "ctrl+o":        "open",
  "ctrl+n":        "new",
  "ctrl+d":        "duplicate",
  "delete":        "delete",
  "backspace":     "delete",
  "ctrl+a":        "selectAll",
  "g":             "toggleGrid",
  "w":             "toggleWireframe",
  "f":             "focusSelected",
  "numpad0":       "cameraTop",
  "numpad1":       "cameraFront",
  "numpad3":       "cameraRight",
  "numpad7":       "cameraTop",
  "shift+a":       "addMesh",
  "ctrl+g":        "group",
  "h":             "hide",
  "alt+h":         "showAll",
  "ctrl+e":        "export",
  "ctrl+i":        "import",
  "tab":           "toggleEditMode",
  "escape":        "deselect",
  "f11":           "fullscreen",
  "ctrl+shift+s":  "toggleStats",
};

// ── Register keyboard shortcuts ───────────────────────────────────────────────
export function registerShortcuts(handlers) {
  const listener = (e) => {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push("ctrl");
    if (e.shiftKey) parts.push("shift");
    if (e.altKey) parts.push("alt");
    parts.push(e.key.toLowerCase());
    const combo  = parts.join("+");
    const action = KEYBOARD_SHORTCUTS[combo];
    if (action && handlers[action]) {
      e.preventDefault();
      handlers[action](e);
    }
  };
  window.addEventListener("keydown", listener);
  return () => window.removeEventListener("keydown", listener);
}

// ── Auto-updater ──────────────────────────────────────────────────────────────
export async function checkForUpdates() {
  if (isElectron() && window.electronAPI?.checkForUpdates) {
    return await window.electronAPI.checkForUpdates();
  }
  // Browser fallback — check version endpoint
  try {
    const res = await fetch("/api/version");
    if (res.ok) {
      const data = await res.json();
      return { hasUpdate: data.version !== __APP_VERSION__, version: data.version };
    }
  } catch(e) {}
  return { hasUpdate: false };
}

// ── Desktop features gate ─────────────────────────────────────────────────────
export const DESKTOP_ONLY_FEATURES = [
  "nativeFileSystem",
  "localAssetCache",
  "offlineMode",
  "nativeMenus",
  "windowDrag",
  "systemTray",
  "autoUpdater",
  "multiWindow",
];

export function isFeatureAvailable(feature) {
  if (DESKTOP_ONLY_FEATURES.includes(feature)) return isElectron();
  return true;
}

// ── Window controls ───────────────────────────────────────────────────────────
export function minimizeWindow() {
  if (isElectron()) window.electronAPI?.minimize?.();
}

export function maximizeWindow() {
  if (isElectron()) window.electronAPI?.maximize?.();
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
}

export function closeWindow() {
  if (isElectron()) window.electronAPI?.close?.();
}

// ── Platform info ─────────────────────────────────────────────────────────────
export function getPlatformInfo() {
  return {
    isElectron:   isElectron(),
    isBrowser:    isBrowser(),
    platform:     navigator.platform,
    userAgent:    navigator.userAgent,
    webGL:        !!document.createElement("canvas").getContext("webgl2"),
    memory:       navigator.deviceMemory || "unknown",
    cores:        navigator.hardwareConcurrency || "unknown",
    appVersion:   typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev",
  };
}

// ── Desktop app shell config ──────────────────────────────────────────────────
export const ELECTRON_CONFIG = {
  windowTitle:   "SPX Mesh Editor",
  minWidth:      1200,
  minHeight:     700,
  defaultWidth:  1600,
  defaultHeight: 900,
  icon:          "assets/icon.png",
  backgroundColor: "#06060f",
  webPreferences: {
    nodeIntegration:  false,
    contextIsolation: true,
    preload:          "preload.js",
  },
};
