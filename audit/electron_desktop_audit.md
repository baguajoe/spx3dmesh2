# Electron Desktop Integration Audit

**Date:** 2026-05-13
**Scope:** What the Electron desktop wrapper actually does today, what
differentiates it from the browser version, and what desktop-specific
capabilities are available but unused. Read-only; no code changes.

---

## Headline

The Electron wrapper is **functional but thin**. Two paragraphs of summary
before the per-section detail:

1. **The renderer is a browser app first.** Every Electron-aware code path
   in `src/` has either a browser fallback or a no-op gate. Removing
   Electron tomorrow would lose: native file dialogs, Python execution,
   one PNG-save IPC call, native menu shortcuts. Everything else — every
   panel, every Three.js render path, every export — would still work in
   a browser. There is no renderer code that *requires* Electron except
   the Python console.

2. **The desktop wrapper hasn't been treated as a product.** No code
   signing config, no auto-update, no `.spx` file association, no
   "Open Recent", no install gate, no telemetry, no license enforcement.
   The wrapper exists to give the dev team an Electron build target;
   shipping it as a real desktop product needs a distribution layer
   that today is entirely absent. Several built-in desktop capabilities
   are already wired in `main.js` but never called from the renderer
   (notably the `render:export-video` ffmpeg handler).

Implication for desktop-first strategy: **the leverage isn't in
"port the app to desktop" — it's already there. The leverage is in
(a) wiring the existing main-process capabilities into the renderer,
(b) adding the missing pro-product layer (signing, updates, recents,
file associations), and (c) committing to a few capabilities that the
browser tier genuinely cannot match (native ffmpeg, on-disk model
caching, native FBX/USD).**

---

## Part 1 — Current Electron Setup

### 1.1 Files involved

| File | Role |
|------|------|
| `main.js` (279 lines) | Electron main process — window, menus, IPC, Python, render export. |
| `preload.js` (37 lines) | `contextBridge` wrapper exposing `window.electronAPI`. |
| `package.json:6-15` | `electron`, `electron:build`, `electron:pack`, `electron:dev`, `electron:preview` scripts. |
| `package.json:45` | `"main": "main.js"` — electron-builder entry. |
| `package.json:46-109` | Inline electron-builder block (no separate config file). |
| `package.json:37-38` | devDependencies: `electron@^28.3.3`, `electron-builder@^24.13.3`. No `electron-updater`. |

No `electron-builder.yml` / `electron-builder.json5` / `forge.config.js` —
all packaging config is inline in `package.json`.

### 1.2 What the main process actually does

**Window** (`main.js:13-39`):
- 1440×900, minWidth 1024, minHeight 600, frame on, `#06060f` background.
- `webPreferences`: `contextIsolation: true`, `nodeIntegration: false`,
  `webSecurity: false` (`main.js:26` — disabled to allow local file
  loads for GLB/BVH; this is a security-relevant choice worth noting).
- Dev: loads `http://localhost:5173` and detaches DevTools.
- Prod: loads `dist/index.html`.

**Menu** (`main.js:42-102`) — built once at window creation. All
non-role items are `webContents.send()` fire-and-forget messages to
the renderer. Channels emitted:
`menu:save`, `menu:export-glb`, `menu:export-bvh`, `menu:undo`,
`menu:redo`, `menu:mesh-script`, `menu:collaborate`,
`menu:render-start`, `menu:render-preview`, `menu:python-console`,
`file:opened`, `script:run`. (Whitelist mirrored in `preload.js:22-27`.)

**IPC handlers registered** (every channel — counted from `ipcMain.handle`
calls):

| Channel | Location | Behavior |
|---|---|---|
| `fs:readFile` | `main.js:144` | Read file path → base64. |
| `fs:writeFile` | `main.js:149` | Recursively mkdir, write base64. |
| `fs:showSaveDialog` | `main.js:157` | Pass-through to `dialog.showSaveDialog`. |
| `fs:showOpenDialog` | `main.js:162` | Pass-through to `dialog.showOpenDialog`. |
| `python:run` | `main.js:168` | Spawn `python3` (or `python` on win32) with `-c <code>`, 30s timeout. |
| `python:runFile` | `main.js:189` | Spawn with file path, 60s timeout. |
| `python:check` | `main.js:201` | Spawn `--version`, return availability. |
| `system:info` | `main.js:214` | Platform, arch, CPU count, memory, Node/Electron versions. |
| `render:save-image` | `main.js:246` | Decode dataURL, `fs.writeFileSync` to path. |
| `render:export-video` | `main.js:257` | Write JPG frame sequence to tmp dir, shell out to system `ffmpeg` for H.264 MP4 to `~/spx_<style>_<ts>.mp4`. **No renderer caller — see §1.4.** |

**Native dialogs**: `dialog.showOpenDialog` at `main.js:106`, `:123`, `:162`;
`dialog.showSaveDialog` at `:157`; `dialog.showMessageBox` at `:135`.

**App lifecycle** (`main.js:228-239`): standard ready → createWindow,
window-all-closed quits except darwin, on quit kills `pythonProcess`
(though `pythonProcess` is declared at `main.js:10` but never assigned —
the IPC handlers spawn fresh subprocesses each time, so the kill on
quit is dead code).

**NOT present**:
- No `autoUpdater` / `electron-updater` import.
- No `protocol.registerSchemesAsPrivileged` or `protocol.handle`.
- No `app.setAsDefaultProtocolClient` (no `.spx` URL handler).
- No tray (`new Tray(...)`), no `app.dock.setBadge`, no global shortcut.
- No `session` permission handlers.

### 1.3 What the preload exposes

Single `contextBridge.exposeInMainWorld('electronAPI', { … })` call at
`preload.js:3-37`. Exposed surface:

- **File**: `readFile(path)`, `writeFile(path, data)`, `showSaveDialog`,
  `showOpenDialog`, `saveFile` (alias for showSaveDialog), and a generic
  pass-through `invoke(channel, ...args)` (`preload.js:10`).
- **Python**: `runPython(code)`, `runPythonFile(path)`, `checkPython()`.
- **System**: `systemInfo()`.
- **Menu events**: `onMenuEvent(channel, cb)` with the 12-channel
  whitelist (`preload.js:22-27`); `removeMenuListener(channel)`.
- **Platform**: `platform` (`process.platform`), `isElectron: true`.

**Security posture**: `contextIsolation: true`, `nodeIntegration: false`
(both at `main.js:24-25`). No `sandbox: true` explicitly — Electron
defaults are in effect. The `webSecurity: false` flag (`main.js:26`)
weakens the default — local-file loads work but cross-origin protections
are off in the renderer.

### 1.4 What renderer (React) code uses Electron APIs

**Detection layer** — `src/mesh/ElectronBridge.js:2-7`:
```js
function isElectron() {
  return typeof window !== "undefined" &&
    (window.electronAPI !== undefined ||
     window.process?.type === "renderer" ||
     navigator.userAgent.includes("Electron"));
}
```

**Categorized call sites** (everything in `src/` that touches
`window.electronAPI`):

**Electron-only (no fallback, but feature is gated):**
- `src/hooks/usePythonBridge.js:5,10` — Python console returns
  `{ available: false, version: 'Web mode — JS only' }` when
  `window.electronAPI` is missing. The console UI just shows a
  disabled state. So technically dual-path (graceful disable), not
  hard-fail.
- `src/components/pipeline/SPX3DTo2DPanel.jsx:2440` — only caller of
  the `render:save-image` IPC. Wrapped in `if (isElectron && …)` at
  `:2432`; browser fallback at `:2447-2452` does an `<a download>` PNG
  download.

**Dual-path (Electron preferred, browser fallback):**
- `src/mesh/ElectronBridge.js:13-32` — `openFile()`: native dialog or
  `<input type="file">`.
- `src/mesh/ElectronBridge.js:35-47` — `saveFile()`: native dialog +
  `writeFile` IPC, or Blob + `URL.createObjectURL` + `<a download>`.
- `src/App.jsx:3547-3555` — Import GLB/GLTF/FBX/OBJ via Electron
  `openFile` + `readFile`; non-Electron path is a status message at
  `:3559` ("desktop only" — actually no fallback here, it just sets
  status text).
- `src/App.jsx:3564-3568` — Save GLB via `electronAPI.saveFile`;
  no-op outside Electron.
- `src/App.jsx:3573-3585` — Open HDRI via `electronAPI.openFile`;
  no-op outside Electron.
- `src/App.jsx:4391-4400` — Subscribe to menu IPC channels
  (`file:opened`, `script:run`, etc); no-op outside Electron.

**Detection-only (just for UI labels / feature gates):**
- `src/components/pipeline/SPX3DTo2DPanel.jsx:828` —
  `const isElectron = …` flag.
- `src/components/pipeline/SPX3DTo2DPanel.jsx:2773` — renders
  `<span className="s2d-electron-badge">ELECTRON</span>` in the panel.
- `src/mesh/ElectronBridge.js:162-176` — `DESKTOP_ONLY_FEATURES`
  array + `isFeatureAvailable()`. **Pure metadata** — only
  consulted by `isFeatureAvailable()` itself; nothing in `main.js` or
  `preload.js` actually implements `nativeFileSystem`,
  `localAssetCache`, `offlineMode`, `nativeMenus` (separate from the
  built-in `Menu`), `windowDrag`, `systemTray`, `autoUpdater`, or
  `multiWindow`. They're a roadmap list dressed as a feature flag
  table.
- `src/mesh/RenderFarmManager.js:122` — optional-chained
  `window.electronAPI?.writeFile()` for render output, no-op in
  browser.

**Detection-only Python wiring** (`src/hooks/usePythonBridge.js:4-12`):
guards every call with `if (!window.electronAPI) return …`, returns
"Python requires desktop app" in the browser.

**Total renderer Electron touch points across `src/`: ~15 call sites
in 5 files** (counted from grep).

There are **no `require('electron')` or `import … from 'electron'`
statements in `src/`** — the contextIsolation boundary is intact.

---

## Part 2 — Browser-Only vs Desktop-Only

### 2.1 Identical in browser and desktop (the bulk of the codebase)

Almost all functionality:
- Three.js 3D editor, sculpt, animation, rigging, IK, retargeting.
- All panels under `src/components/panels/` and
  `src/components/pipeline/`.
- 3D→2D stylization pipeline (the work being audited in adjacent
  documents — anime/manga/comic/cel/toon/pixar GPU shader).
- Mocap (MediaPipe Pose, Holistic, FaceMesh — see §2.4 for the
  CDN-loading caveat).
- Depth estimation (ONNX Runtime via WASM — `src/mesh/DepthEstimator.js`).
- Render output (canvas, WebCodecs, WebGL2/WebGPU compute).
- Persistence (localStorage — see §2.4).

### 2.2 Desktop-only paths

Just five things gate on Electron:

1. **Python console** (`src/hooks/usePythonBridge.js`) — entirely
   dependent on `python:run` IPC.
2. **Native menus** (`main.js:42-102`) — Electron sends `menu:*` IPC,
   renderer subscribes via `electronAPI.onMenuEvent`.
3. **PNG render save** (`SPX3DTo2DPanel.jsx:2432-2440`) — Electron
   path uses native save dialog + IPC writeFile; browser path does
   `<a download>`.
4. **GLB/HDRI import** (`App.jsx:3543-3585`) — only the Electron
   path exists; browser users can't import via this code path
   (drag-drop + other panels still work).
5. **`render:export-video` ffmpeg IPC handler** (`main.js:257-279`)
   — registered, not called from anywhere in `src/`. **Built but
   unused.**

### 2.3 Better in desktop, with browser fallback

- **File dialogs** — native is nicer than `<input type=file>` /
  `<a download>`. Implemented in `ElectronBridge.js`.
- **Local file system access** — Electron has full FS via IPC; the
  browser equivalent (File System Access API) is **not used anywhere in
  `src/`** (zero hits for `showSaveFilePicker` / `showOpenFilePicker`).
  So the browser tier is locked into download/upload paradigms.
- **Render save (PNG)** — covered above.

### 2.4 Limited by browser today

- **Persistence**: 64 `localStorage` call sites in `src/` (`grep -rn
  localStorage src | wc -l = 64`). Zero `indexedDB` references. The
  autosave at `App.jsx:417` is `localStorage.setItem("spx_autosave",
  …)`. localStorage caps at ~5 MB per origin; saving full scene state
  hits that wall fast. No project-file format with bundled assets.
- **Models from CDN, not bundled**:
  - MediaPipe FaceMesh: `VideoFaceMocap3DPanel.jsx:99` injects
    `<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js">`;
    `:108` sets `locateFile` to the same CDN.
  - MediaPipe Pose: `MotionCaptureSystem.jsx:112` and
    `VideoMocapSystem.jsx:124-127` both `locateFile` from
    `cdn.jsdelivr.net/npm/@mediapipe/pose/`.
  - MediaPipe Holistic: `MultiPersonMocap.js:8` from same CDN.
  - ONNX Runtime + MiDaS depth model:
    `DepthEstimator.js:9` model URL is
    `huggingface.co/onnx-community/midas-v2.1-small/…`;
    `:32` loads `cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js`
    via `_loadScript` (runtime `<script>` injection).
  - **Note**: `@mediapipe/pose` and `@mediapipe/camera_utils` are
    `import`-ed in `MotionCaptureSystem.jsx:2-3` but are **not in
    `package.json`**. Only `@mediapipe/tasks-vision` shows up in
    `node_modules` (likely transitive). The MediaPipe story has some
    drift between code and deps — worth a follow-up but not in scope
    here.
- **Video export memory**: `SPX3DTo2DPanel.jsx:2485-2487` does
  `const { Muxer, ArrayBufferTarget } = await import('mp4-muxer'); …
  new Muxer({ target: new ArrayBufferTarget(), … })` — the entire MP4
  is buffered in RAM before download. Length is implicitly capped by
  available memory. Worse: the export hard-fails outside browsers
  with WebCodecs (`SPX3DTo2DPanel.jsx:2462-2465` returns
  "⚠ Browser lacks WebCodecs — use PNG SEQUENCE instead"). No
  fallback to the bundled ffmpeg IPC handler (see §3.4).
- **No native libraries**: no Sharp / OpenCV / FFmpeg in the
  renderer. ffmpeg is invoked only from `main.js:271` as a
  shell-out, and only by an IPC channel that no caller uses.
- **WebGPU is in use**: `WebGPURenderer.js`, `WebGPUPathTracer.js`,
  `GPUClothSolver.js`, `GPUSculptEngine.js` all exist. WebGPU
  availability is browser/GPU-driver dependent; desktop wrapping
  doesn't change this (Electron is Chromium, same WebGPU stack).

---

## Part 3 — Desktop-First Capability Gaps

Capabilities the desktop wrapper *could* unlock that aren't being used.
Only listing things browser **genuinely cannot do as well** today.

### 3.1 File system & project files
- **Persistent project files on disk**: the `electronAPI.writeFile` /
  `readFile` IPC exist but the renderer's "save" path (`App.jsx:417`
  autosave + manual download) doesn't use them. A real `.spx` project
  file with bundled assets and incremental save is doable today using
  what's already in `preload.js`.
- **Open Recent**: not implemented anywhere. `main.js` does not call
  `app.addRecentDocument`, and no renderer code maintains an MRU list.
- **`.spx` file association**: `main.js` has no
  `app.setAsDefaultProtocolClient` and electron-builder's
  `fileAssociations` block in `package.json:46-109` is absent. Double-
  clicking a `.spx` file does nothing.
- **Asset library on disk**: panels use localStorage for presets
  (e.g. `spx_presets_<PanelName>` per generator panel). With native
  FS, asset libraries could live in `~/Documents/SPX/assets/` and
  scale beyond the 5 MB origin quota.
- **Scene autosave to file** (vs localStorage at
  `App.jsx:417`): trivial swap once the project-file format is
  decided.

### 3.2 Performance / native libraries
- **Native ffmpeg**: handler wired at `main.js:257-279`, no caller.
  Wiring it up is small effort, big payoff (4K, long video, ProRes,
  GPU-accelerated codecs).
- **Sharp / native image processing**: not used. Could replace
  canvas-based image ops in batch export.
- **Multi-process rendering**: Electron supports utility processes;
  none are spawned. Heavy work (mesh decimation, baking, video
  encoding) currently blocks the renderer thread or relies on Web
  Workers.
- **Native mesh libs (DRACO, meshoptimizer, libigl)**: only
  Three.js JS-side equivalents in use. No measurable gain unless
  pipelines move off-renderer.

### 3.3 ML inference
- **ONNX Runtime native (vs WASM)**: `DepthEstimator.js:34` uses
  `executionProviders: ['wasm']`. Native bindings (CUDA / DirectML
  / CoreML) would be 5–20× faster for the same MiDaS model. Requires
  bundling `onnxruntime-node` (not currently a dep).
- **Local model storage**: every model is fetched from CDN at
  runtime (huggingface, jsdelivr). Desktop should bundle/cache models
  locally — first-run download once, then offline forever.
- **TensorFlow.js with native backend**: not currently used at all.

### 3.4 Export
- **Native ffmpeg video export**: see 3.1/3.2. The `mp4-muxer`
  in-RAM path at `SPX3DTo2DPanel.jsx:2485` is the only video export.
  Pro codecs (ProRes, DNxHR, HAP), arbitrary length, hardware encode
  — all blocked.
- **Layered PSD/AE-compatible output**: not implemented in either
  tier. The 3D→2D pipeline writes flat PNG only.
- **Batch / headless export**: no CLI, no `--render` flag; would
  require a new main-process entry point.
- **PNG sequence ZIP**: implemented (`jszip` is in deps,
  `package.json:21`). Browser can already do this — not a desktop
  gap.

### 3.5 Mocap
- **Native MediaPipe / OpenPose bindings**: not in use; mocap is
  100% browser-WASM today. Native would be faster but the gain is
  smaller than for ML inference because MediaPipe's WASM is already
  highly tuned.
- **Camera permissions**: browser camera permission prompts apply.
  Electron lets you suppress/allow at the app level —
  `session.setPermissionRequestHandler` not currently used.

### 3.6 3D file integration
- **FBX**: actually works in browser via Three.js's `FBXLoader`
  (`App.jsx:3394`). Not a desktop-only gap. **Correction to one of
  the exploration agents' claims** — there is no `/api/mesh/convert`
  call site in `src/`; FBX is loaded directly via Three.js.
- **USD / USDZ**: zero loader references in `src/` (no
  `USDZLoader`, no `usd*` matches). Not supported in either tier.
  Native libusd would be a real desktop-only capability.
- **Alembic**: zero references in `src/`. Not supported. Native
  Alembic SDK would unlock VFX pipelines.
- **Blender direct import via file watching**: not implemented.
  Doable on desktop via `chokidar` + IPC.

### 3.7 OS integration
- **Native menus**: implemented (`main.js:42-102`).
- **Dock badge / tray / global shortcuts**: none. `app.dock.setBadge`,
  `new Tray()`, `globalShortcut.register` — zero usage.
- **OS file association for `.spx`**: not configured. See 3.1.
- **System notifications**: `new Notification()` not used in either
  tier.
- **Drag-out from app to OS** (e.g. drag a render thumbnail to the
  desktop): not wired.

### 3.8 Update / distribution
- **Auto-update**: no `electron-updater` dep
  (`package.json:32-43`), no `autoUpdater` import in `main.js`,
  no `publish` field in the electron-builder block.
  `ElectronBridge.js:147` calls `electronAPI.checkForUpdates`
  defensively but `preload.js` does not expose that function — it's
  a dead path.
- **Code signing**: `mac.hardenedRuntime: true`
  (`package.json:90`) but no `mac.identity` or notarization config.
  `win.requestedExecutionLevel: asInvoker` (`:76`) but no
  `certificateFile`. Linux AppImage unsigned. Builds today produce
  unsigned binaries that will trigger Gatekeeper / SmartScreen
  warnings on every install.
- **License enforcement**: no license check, no machine-binding,
  no online activation.
- **Telemetry**: no analytics SDK, no error reporter (Sentry,
  Crashpad), no opt-in usage metrics.

---

## Part 4 — Desktop-First Roadmap Candidates

Eight candidates, ranked by approximate ROI (user-visible value /
implementation effort). Effort: **S** (≤1 week), **M** (2–4 weeks),
**L** (1–3 months), **XL** (quarter+).

### Rank 1 — Wire renderer to `render:export-video` ffmpeg IPC
- **Description**: The handler at `main.js:257-279` already shells
  out to system `ffmpeg` for H.264 MP4. Wire
  `SPX3DTo2DPanel.jsx`'s video export to call it on Electron and
  fall back to the in-RAM `mp4-muxer` path on browser.
- **Value**: Removes the WebCodecs-required gate. Long videos (>1
  min), 4K, ProRes/DNxHR (with codec flag changes) become possible
  on desktop.
- **Effort**: **S** (a day if just MP4; maybe an extra week if you
  want a codec picker UI and bundled-vs-system ffmpeg detection).
- **Deps**: optionally bundle ffmpeg-static (~50 MB extra install
  size) so users don't need system ffmpeg.
- **Architecture impact**: none — uses existing wrapper.

### Rank 2 — Native `.spx` project files + file association + Open Recent
- **Description**: Define a `.spx` bundle format (JSON + assets in a
  zip or folder), wire the `electronAPI.writeFile` path in the
  Save/Save As menu actions, register `.spx` in
  `electron-builder.fileAssociations`, maintain MRU via
  `app.addRecentDocument`.
- **Value**: Turns SPX from "tab in browser" into "real desktop
  app." Users can double-click projects, see them in Recent,
  preserve work outside one origin's localStorage cap.
- **Effort**: **M** (format design is the bulk; FS + association
  wiring is small).
- **Deps**: maybe `archiver` for zip bundling.
- **Architecture impact**: introduces a project-file abstraction
  the browser tier also benefits from (export-as-zip path).

### Rank 3 — Bundle / cache ML models locally
- **Description**: MediaPipe weights and ONNX MiDaS are CDN-fetched
  every cold start. Desktop should download once on first run to
  `app.getPath('userData')/models/`, then load from disk.
- **Value**: Offline operation, faster cold start, no CDN
  dependency, predictable behavior in air-gapped environments.
- **Effort**: **S** (download + caching layer, swap `locateFile`
  callbacks to disk paths).
- **Deps**: none new.
- **Architecture impact**: minor abstraction in
  MotionCaptureSystem.jsx, VideoMocapSystem.jsx,
  VideoFaceMocap3DPanel.jsx, MultiPersonMocap.js, DepthEstimator.js
  — touches all five mocap/ML files but the change is mechanical.

### Rank 4 — Code signing + notarization + auto-update
- **Description**: Add Mac developer ID signing + Apple
  notarization, Windows EV cert, Linux GPG signing for AppImage.
  Add `electron-updater` + `publish` to a release server (S3 /
  Github Releases / private CDN).
- **Value**: Required before SPX Desktop ships as a paid product
  (or even a free public binary that doesn't trigger SmartScreen).
- **Effort**: **M** (mostly setup, certs cost money — Apple $99/yr,
  Windows EV $200-400/yr).
- **Deps**: `electron-updater`.
- **Architecture impact**: build/CI changes, no app code changes
  except a tiny update-check UI.

### Rank 5 — ONNX Runtime native + GPU acceleration
- **Description**: Replace `executionProviders: ['wasm']` at
  `DepthEstimator.js:34` with native bindings (CUDA on NVIDIA,
  DirectML on Win, CoreML on Mac). Same model, 5–20× faster.
  Same approach scales to future ML stylization models.
- **Value**: Real-time depth estimation, faster ML stylization
  passes (which the team is exploring per
  `audit/anime_ml_feasibility.md`).
- **Effort**: **M** (per-platform native binary bundling is the
  hard part; the JS API is similar).
- **Deps**: `onnxruntime-node` + per-platform native libs.
- **Architecture impact**: needs a runtime detection layer
  (use native if present, fall back to WASM).

### Rank 6 — Native FBX / USD / Alembic via desktop loaders
- **Description**: USD via Pixar libusd, Alembic via Alembic C++
  SDK, FBX via Autodesk SDK. Browser-side FBX (Three.js
  FBXLoader at `App.jsx:3394`) handles common cases but loses
  custom properties, advanced rigs, materials.
- **Value**: Real interop with VFX pipelines. Pro studio
  customers gate on this.
- **Effort**: **L** (Autodesk SDK has licensing implications;
  USD libs are large; binding work is non-trivial).
- **Deps**: native SDKs, NAPI bindings.
- **Architecture impact**: introduces a loader-router pattern;
  format support becomes a tier-differentiating feature.

### Rank 7 — Multi-window / detached panels
- **Description**: Implement what `DESKTOP_ONLY_FEATURES`
  promises. Panels (3D viewport, timeline, mesh script) can pop
  out into separate `BrowserWindow`s for multi-monitor work.
- **Value**: Real desktop-class workflow for power users with
  multiple monitors.
- **Effort**: **M** (needs window manager in main, IPC sync
  for shared state, panel registry refactor).
- **Deps**: none new.
- **Architecture impact**: real — moves panel state out of
  React local state into a shared store accessible across
  windows.

### Rank 8 — Streaming video render to disk
- **Description**: Replace `mp4-muxer` `ArrayBufferTarget` with
  a `FileSystemTarget` (or custom IPC-streamed writer) so video
  encode doesn't buffer in RAM. Lifts the implicit length cap.
- **Value**: Long renders without OOM.
- **Effort**: **M** (mp4-muxer supports streaming targets but
  needs IPC plumbing for Electron).
- **Deps**: none new.
- **Architecture impact**: minor; replaced by Rank 1 if native
  ffmpeg gets wired.

**Honest effort callouts** (per the spec): "full ML stylization"
— if the team adopts it as a feature — is **XL**, not L. ML model
training/fine-tuning is out of scope; even just integrating a
prebuilt model with proper UX (presets, tuning, fallback when
GPU is missing, cancellation, progress) is L+ on its own.

---

## Part 5 — Architecture Questions

### 5.1 Is Electron the right wrapper?

**Yes, for the next 6–12 months.** Reasoning:

- The codebase's leverage is in the JS / React / Three.js stack.
  Tauri would force a Rust backend rewrite for any IPC heavier than
  what the WebView can handle. The team would lose the one-codebase
  advantage instantly.
- The performance gaps that *might* push to Tauri (GPU compute, ML)
  don't actually live in the wrapper — they live in WebGPU and
  ONNX/MediaPipe. Both are wrapper-agnostic. Switching wrappers
  buys you nothing on those fronts.
- The pain points Electron is famous for (memory footprint,
  startup time, install size) are real but not differentiated by
  the alternatives at SPX's stage. ~150–200 MB RAM at idle is
  acceptable for a creative tool. ~120 MB install is acceptable.
- The roadmap candidates (§4) all work fine in Electron. None
  require leaving Chromium.

**When to revisit**: if the product wants to ship a (a) ≤30 MB
installer for accessibility, (b) <100 MB RAM idle for low-end
hardware, or (c) deep native GPU API access (CUDA shaders,
Metal compute, Vulkan) for a marquee feature. None of those are
on the table today.

**Pure native (Qt, native Cocoa/WPF)** is not justified — three
platform codebases for marginal gain over Electron.

### 5.2 Two-tier vs single-tier

**Single codebase with feature flags.** Reasoning:

- The pattern is already established
  (`ElectronBridge.isElectron()`, `DESKTOP_ONLY_FEATURES`). Forking
  doubles maintenance for ~15 call sites of difference today.
- Browser tier becoming the "lighter / accessible" tier
  (per the audit prompt) is fully consistent with feature-flag
  gating. Browser users get a subset; desktop users get the rest.
- The 3D editor itself, the mocap pipeline, the 3D→2D
  stylization — none of this needs to differ between tiers. Only
  IO, persistence, native exports, and pro-format integrations
  diverge.
- A future plugin / extension surface (if one ships) makes
  forking even less attractive — keeps the plugin API surface
  uniform across tiers.

### 5.3 Build / distribution maturity

**The build works. Distribution does not.**

- `package.json:12` `electron:build` produces installers via
  electron-builder for Win NSIS, Mac DMG (universal x64+arm64),
  Linux AppImage. Tested end-to-end is unverified from this audit
  but the config is consistent.
- **Missing for "real product" shipping**:
  - Code signing certificates (mac developer ID, win EV cert).
  - Notarization (mac stapler workflow).
  - `publish` config + auto-update server.
  - Landing page / download URL / installer hosting.
  - Release notes pipeline.
  - Crash reporting (Sentry, Crashpad).
  - License enforcement / activation server.
  - First-run experience (onboarding tour, sample project).

Until those exist, "SPX Desktop" is an internal / dev-channel
build, not a product.

---

## Part 6 — Immediate Next Steps

### Tasks that don't require strategic decisions (start now)

1. **Wire `render:export-video` IPC into the panel's video export.**
   Concrete: in `SPX3DTo2DPanel.jsx:2456+`, add an
   `if (isElectron && window.electronAPI?.invoke)` branch that
   calls `render:export-video` with the captured frames; keep the
   `mp4-muxer` path as the browser fallback. This is the
   highest-ROI, lowest-effort gap (Rank 1 in §4).

2. **Fix the dead-code paths in the Electron layer.**
   - `main.js:10` `pythonProcess` declared but never assigned —
     remove or actually track spawned subprocesses.
   - `ElectronBridge.js:147` `checkForUpdates` calls a function
     `preload.js` doesn't expose — either expose the IPC or drop
     the dead path.
   - `ElectronBridge.js:179-189` `minimize/maximize/close` ditto —
     not exposed in `preload.js`. These would no-op silently
     today.

3. **Bundle / cache ML models locally on Electron.**
   Touch all five files identified in §2.4 / §3.3. Mechanical;
   reads cleanly as a single PR.

4. **Add `electron-updater` + a basic auto-update check** (even
   without a publish server yet — ship the wiring, point it at a
   stub URL). Surfaces the gap and unblocks downstream work.

### Tasks that need strategic input

5. **`.spx` project file format**: needs product decision on
   what's in a project (assets bundled vs referenced; thumbnail
   embedding; version compat). Once decided, file association +
   Open Recent + native save flow can ship.

6. **Wrapper choice (re-confirm Electron)**: this audit
   recommends staying on Electron. The team should explicitly
   sign off so the roadmap doesn't get re-litigated mid-quarter.

7. **Two-tier feature matrix**: agree on which roadmap items in
   §4 are desktop-only vs available in both tiers. The audit
   recommends single-codebase + flags, but the per-feature split
   is a product decision.

8. **Distribution / signing budget**: Apple ($99/yr) + Windows
   EV cert ($200-400/yr) + AppImage signing setup. Trivial money
   but needs sign-off before code signing work starts.

---

## Appendix: Notable Findings

- **Built-but-unused `render:export-video`** (`main.js:257-279`) is
  the single most striking finding. Real ffmpeg video export is one
  PR away.
- **`webSecurity: false`** (`main.js:26`) is a security smell. Local
  file loads can be done with `protocol.handle('spx-asset://…')`
  instead of disabling web security globally — worth revisiting if
  any third-party content (textures from CDNs, downloaded HDRIs)
  ever gets rendered in the same window.
- **`@mediapipe/pose` and `@mediapipe/camera_utils`** are
  `import`-ed in `MotionCaptureSystem.jsx:2-3` but not declared in
  `package.json`. Build may be relying on a transitive of
  `@mediapipe/tasks-vision` or it may silently fail / fall through
  to a CDN-injected `window.Pose`. Worth verifying separately.
- **`DESKTOP_ONLY_FEATURES`** (`ElectronBridge.js:162-176`) is a
  promise list, not a feature gate. Useful as a roadmap doc; it's
  not actually implementing anything.
- **Persistence is at risk**: 64 `localStorage` call sites and
  zero IndexedDB usage means the app's state model assumes
  localStorage's 5MB-ish quota. Project files would help; so
  would IndexedDB even on the browser tier.
