# Task 1 — Repo State + Structure

_Read-only audit. No code modified._

## 1. Git State

- **Current branch**: `main` (tracks `origin/main`, clean working tree)
- **Remote branches**: `origin/HEAD -> origin/main`, `origin/main` only
- **Latest commit**: `0a17021 feat(parity): bezier-tolerant keyframe schema migration`

### Recent commits (last 20)

```
0a17021 feat(parity): bezier-tolerant keyframe schema migration
04b131d feat(parity): graph editor panel (read-mostly v1, list/jump/delete keyframes)
f7626af feat(parity): NLA panel with actions, tracks, strips, apply, bake
ead09cb feat(parity): geometry nodes UI and drivers UI
113ffce feat(parity): constraints UI with target picker and apply-all
b41ab6b feat(parity): modifier stack UI with drag-reorder, apply-all, dropdown-add
2eb923f feat(parity): keyframe overwrite fix, onion skin handler, grid snap, proportional editing
25153ef feat(animation): bone keyframing - helpers, click-select, evaluator replay
258d8a9 feat(3d-to-2d): fix Render crash, wire 4 dead styles, differentiate cartoon, native save bridge
d36af6e feat(mocap): wire retargetEnabled checkbox + bump webcam to 1280x720
b3e425a feat(mocap): wire MediaPipe landmarks to bone retargeting
3e9b44c fix(loader): auto-fit oversized GLBs to scene scale
0200eb6 fix(mocap): don't auto-play GLB embedded animations on avatar load
fb07cf1 WIP(mocap): diagnostic hooks and skeletonClone bypass
1dd7a1d fix(mocap): correct Y Bot URL paths from /ybot.glb to /models/ybot.glb
fa7952a fix(ui): style model picker panel as floating card grid
08b328d chore: add window.__spxScene dev hook for skeleton inspection
cec9539 chore: add ybot.glb test rig for bone keyframing development
f1178d0 Batch 3D-3: cleanup — dead files, file org, Vite warnings, env vars
000622b Batch 3D-1.8b: PNG sequence + manifest.json exporter for SPX Puppet handoff
```

> Note: the user-provided "latest" commit `f1178d0` is actually 18 commits behind `HEAD`. The repo has progressed through Session A+B parity work (modifier stack → NLA → graph editor → bezier keyframes) and a mocap wiring sprint since that batch.

## 2. Major Dependencies (from `package.json`)

### Runtime (deps)
| Package | Version | Notes |
|---|---|---|
| `three` | ^0.183.2 | core 3D engine |
| `@react-three/fiber` | ^9.5.0 | React renderer for Three (present but App.jsx uses raw three.js, not R3F for the main scene) |
| `@react-three/drei` | ^10.7.7 | helpers |
| `three-gpu-pathtracer` | ^0.0.24 | GPU path tracing (FilmPathTracerPanel) |
| `three-mesh-bvh` | ^0.9.9 | used by `mesh/BooleanOps.js` |
| `@dimforge/rapier3d-compat` | ^0.19.3 | Rapier WASM, dynamically imported in `DestructionPanel.jsx` |
| `react` / `react-dom` | ^19.2.4 | React 19 |
| `react-draggable` | ^4.5.0 | floating-window drag |
| `zustand` | ^5.0.12 | state (`SPXEditorStore.jsx`) |
| `jszip` | ^3.10.1 | used by SPX3DTo2DPanel (PNG sequence export) |
| `uuid` | ^13.0.0 | id generation |

### Dev / build tools
| Package | Version |
|---|---|
| `vite` | ^8.0.1 |
| `@vitejs/plugin-react` | ^6.0.1 |
| `eslint` | ^9.39.4 (+ react-hooks, react-refresh) |
| `electron` | ^28.3.3 |
| `electron-builder` | ^24.13.3 |
| `concurrently` | (referenced via `electron:dev` script — not declared as dep) |

### MediaPipe — NOT in package.json
- Pose / FaceMesh / Hands are pulled directly from CDN (`cdn.jsdelivr.net/npm/@mediapipe/...`) by `index.html` (eager) and `MultiPersonMocap.js`, `VideoFaceMocap3DPanel.jsx` (lazy `loadScript`).
- The legacy `src/front/js/component/LiveMoCapAvatar.jsx` does `import { Pose } from '@mediapipe/pose'`, which would fail to resolve since the package isn't installed — so that file is effectively dead.

## 3. Build System & Commands

`package.json` scripts:
```
dev              vite                                    # local dev server
build            vite build
lint             eslint .
preview          vite preview
electron         NODE_ENV=development electron .
electron:build   ELECTRON=true vite build && electron-builder
electron:pack    ELECTRON=true vite build && electron-builder
electron:dev     ELECTRON=true NODE_ENV=development concurrently "vite" "electron ."
electron:preview ELECTRON=true vite build && electron .
```

Vite config (`vite.config.js`):
- React plugin
- Alias `@` → `./src`
- `chunkSizeWarningLimit: 1600`
- Manual chunks: splits `node_modules/three/examples` → `three-extras`, `node_modules/three` → `three-core`, plus `cloth`, `materials`, `uv`, `generators`, `panels` chunks.
- No `server.port` set → default Vite port `5173`.

Electron build config (in `package.json` "build" key):
- appId `com.eyeforgstudios.spx-mesh-editor`, productName `SPX Mesh Editor`
- targets: Win NSIS x64, macOS DMG x64+arm64, Linux AppImage x64
- Output: `dist-electron/`
- Bundles `dist/**`, `main.js`, `preload.js`, `package.json`; copies `public/` as extraResources.

## 4. Project Structure (top 3 levels)

Repo root contains a heavy mix of build artifacts, legacy CSS shims, Python migration scripts and the actual app:

```
/workspaces/spx3dmesh2
├── audit/                          (this audit)
├── dist/                           build output
│   └── assets/
├── public/
│   └── models/                     ybot.glb (test rig)
├── src/                            APP SOURCE — see below
├── tools/                          47 fix-*.py / patch-*.cjs migration scripts (note: README claims tools/ folder is "recently created"; contents look like archived one-off fixes)
├── node_modules/
├── index.html                      Vite entry, MediaPipe CDN scripts
├── main.js                         Electron main process
├── preload.js                      Electron preload bridge
├── package.json
├── vite.config.js
├── eslint.config.js
├── README.md                       (default Vite/React README, not project-specific)
├── .gitignore
├── Pipfile                         (orphaned Python pipenv file)
├── App_chunk7.jsx                  loose 30 KB jsx in repo root (legacy / orphaned)
├── UDIMSystem.js                   loose .js in root (duplicate of src/mesh/UDIMSystem.js?)
├── main.js / preload.js            Electron files
├── *.css (≈15 files)               loose CSS files at root that look like legacy snapshots
├── *.py (≈10 files)                add_ai_denoiser.py, fix-*.py, rewrite_*.py, restore_anim_mesh.py, wire24.py
└── *.cjs                           wire-all.cjs
```

`src/` (top 2 levels):

```
src/
├── main.jsx                        React 19 root: <StrictMode><App/>
├── App.jsx                         5,320 lines — monolithic shell, registers all panels
├── App.css
├── index.css
├── App.jsx.bak_*                   4 backup snapshots committed to repo
│
├── animation/                      animationKeyUtils.js, onionSkin.js (mostly TODO stubs), timelineUtils.js
├── assets/
├── camera/                         CameraMath, CameraPresets, CameraRig, CameraSystem
├── components/                     editor panels (top-level + 16 sub-folders)
│   ├── animation/                  GamepadAnimator, MotionLibraryPanel
│   ├── camera/                     CameraPanel
│   ├── clothing/                   ClothingPanel, FabricPanel, PatternEditorPanel
│   ├── collaboration/              CollaboratePanel
│   ├── generators/                 9 world/asset generator React panels
│   ├── greasepencil/               GreasePencilPanel
│   ├── hair/                       Hair / HairAdvanced / HairFX panels
│   ├── materials/                  MaterialPanel, TexturePaintPanel
│   ├── mesh/                       NodeCompositorPanel, ProMeshPanel
│   ├── panels/                     105 *.jsx panels (the main panel grab-bag)
│   ├── pipeline/                   SPX3DTo2DPanel + ExportToPuppetButton + SPX2DStylePresets + VideoFaceMocap3DPanel
│   ├── rig/                        AdvancedRigPanel, AutoRigPanel, RiggingPanel
│   ├── scene/                      LightingCameraPanel
│   ├── ui/                         FloatPanel
│   ├── uv/                         UVCanvas, UVEditorPanel
│   ├── vfx/                        DestructionPanel, FluidPanel, WeatherPanel
│   └── workspace/                  RenderWorkspacePanel, WorkspaceToolsDock
│
├── front/                          legacy duplicate component tree (likely from older copy/paste)
│   ├── js/component/               AvatarRigPlayer3D, LiveMoCapAvatar, MotionCapture* (5 files), PoseVisualization, VideoMocapSystem
│   └── styles/
│
├── generators/                     creature / face / foliage / prop / vehicle generator engines (.js + sub-folders)
├── hooks/                          useDockLayoutPersistence, useDraggablePanel, usePythonBridge
├── mesh/                           115 *.js engine modules (the bulk of the systems)
│   ├── clothing/                   16 clothing engines + index.js
│   ├── generators/                 ParametricAssets.js
│   ├── hair/                       18 hair engines + index.js
│   ├── materials/                  MaterialSlots, TexturePaint
│   ├── pipeline/                   AssetPipeline.js
│   ├── rig/                        AdvancedRigging, AutoRigGuides, AutoRigSystem
│   └── uv/                         UV* engines + index.js + useUVSync
│
├── pages/mocap/                    MocapWorkspace.jsx
├── panels/                         panel framework — PanelHost, registerPanels.js, registry/, generators/
├── pipeline/                       SPX3DTo2DPipeline.js (main 3D→2D engine, 774 lines)
├── pro-ui/                         ProfessionalShell, FeatureIndexPanel, workspaceMap.js (12 workspaces)
├── render/                         AOVTools, BatchRenderQueue, Benchmark, DenoiseTools, HDRLoader, LightingRigPresets, MaterialLayers, RenderPresets, SceneAnalyzer, SimCache, SkinShader
├── state/                          SPXEditorStore.jsx (zustand)
├── styles/                         ~40 CSS files
├── systems/                        BooleanSystem, EnvironmentSystem, HairStrandSystem, RigSystem, TerrainSystem, TexturePaintSystem
├── ui/                             DockPanelHost, DockSplitterHost
├── utils/                          spxHistory, spxSelection
└── workspaces/mocap/               MocapWorkspace.jsx (770 lines)
```

### Source-file counts

- `*.jsx` files in `src/`: **188**
- `*.js` files in `src/`: **224**
- panels in `src/components/panels/`: **105**
- engine modules in `src/mesh/` (top level only): **115**

## 5. Entry Points

- HTML: `/workspaces/spx3dmesh2/index.html` mounts `<div id="root">` and loads `/src/main.jsx` as ES module. Three MediaPipe scripts are eagerly pulled from `cdn.jsdelivr.net` (camera_utils, drawing_utils, face_mesh, pose, hands).
- Web entry: `/workspaces/spx3dmesh2/src/main.jsx` — React 19 `createRoot` → `<StrictMode><App/>`.
- Main React component: `/workspaces/spx3dmesh2/src/App.jsx` (5,320 lines, single default export — monolithic).
- Electron entry: `/workspaces/spx3dmesh2/main.js` — opens `http://localhost:5173` in dev or `dist/index.html` in production. `preload.js` exposes a file-IO bridge consumed via `window.electronAPI` in `App.jsx`.
- Workspace map / shell: `/workspaces/spx3dmesh2/src/pro-ui/workspaceMap.js` (12 workspaces, 69 systems, 616 functions per its banner) and `src/pro-ui/ProfessionalShell.jsx` (top-bar menu).

## 6. Environment Variables

No `.env` or `.env.example` exists in the repo. Vars are referenced in code:

| Var | Purpose | Default fallback |
|---|---|---|
| `VITE_BACKEND_URL` | StreamPireX/python backend (`/api/...`) used by AIAnimationAssistant, FBXPipeline, UISystem, StreamPireXBridge, MotionCapture* | `https://streampirex-production.up.railway.app` (StreamPireXBridge), empty string elsewhere |
| `VITE_MIDAS_MODEL_URL` | MiDaS depth-estimation ONNX URL | `https://huggingface.co/onnx-community/midas-v2.1-small/resolve/main/onnx/model.onnx` |
| `NODE_ENV` / `ELECTRON` | switch between dev/prod and web/electron | — |

> The user's memory of `MIDAS_MODEL_URL env-var-ified` is correct — confirmed in `src/mesh/DepthEstimator.js:7-9`. The actual env var name is `VITE_MIDAS_MODEL_URL` (Vite-prefixed so it surfaces in `import.meta.env`).
