# Task 6 — How to Run + Test

_Read-only audit. Derived from `package.json`, `vite.config.js`, `index.html`, `main.js`, `preload.js` and source greps._

## 1. Quickstart (web / browser)

```bash
# from /workspaces/spx3dmesh2
npm install        # one-time
npm run dev        # starts Vite on http://localhost:5173
```

Open: **http://localhost:5173**

- Port: **5173** (Vite default — `vite.config.js` does not override `server.port`).
- Electron `main.js:31` confirms the same port (`mainWindow.loadURL('http://localhost:5173')` in dev mode).
- HMR is enabled by default via `@vitejs/plugin-react`.

## 2. Quickstart (Electron desktop)

```bash
npm install
npm run electron:dev          # runs Vite + Electron together
# OR
npm run electron              # opens packaged dev electron (NODE_ENV=development electron .)
```

Note: `package.json` references `concurrently` for `electron:dev` but it is **not declared** in `dependencies` or `devDependencies`. If `npm install` does not pull it transitively, `npx concurrently …` or adding it as a devDep will be required.

## 3. Production builds

```bash
npm run build                 # web → dist/
npm run preview               # serve dist/ locally for sanity-check
npm run electron:build        # ELECTRON=true vite build && electron-builder
npm run electron:pack         # same as :build
npm run electron:preview      # ELECTRON=true vite build && electron .
```

Electron output goes to `dist-electron/`. Targets per `package.json`'s `build` block:
- Windows: NSIS installer (x64) — `public/icon.ico`
- macOS: DMG (x64 + arm64) — `public/icon.icns`
- Linux: AppImage (x64) — `public/icon.png`

## 4. Lint

```bash
npm run lint                  # eslint .
```

Config: `eslint.config.js` (flat config, react-hooks + react-refresh plugins).

## 5. Environment Variables

There is **no `.env.example`** in the repo. The web app reads these via `import.meta.env`:

| Var | Used by | Default if unset | Notes |
|---|---|---|---|
| `VITE_BACKEND_URL` | `src/mesh/AIAnimationAssistant.js`, `src/mesh/FBXPipeline.js`, `src/mesh/UISystem.js`, `src/mesh/StreamPireXBridge.js`, `src/workspaces/mocap/MocapWorkspace.jsx`, `src/front/js/component/MotionCapture*.jsx`, `LiveMoCapAvatar.jsx`, `VideoMocapSystem.jsx` | empty (most callers); `https://streampirex-production.up.railway.app` (`StreamPireXBridge.js:4`) | Backend for FBX import/export, USD/Alembic export, AI assistant proxy, mocap upload, StreamPireX handoff |
| `VITE_MIDAS_MODEL_URL` | `src/mesh/DepthEstimator.js` | `https://huggingface.co/onnx-community/midas-v2.1-small/resolve/main/onnx/model.onnx` | MiDaS depth estimation ONNX model URL |
| `NODE_ENV` | `main.js` | — | `development` enables Electron devtools and Vite dev URL |
| `ELECTRON` | scripts | — | switches build mode |

To configure for local dev, create `/workspaces/spx3dmesh2/.env.local` (Vite reads it automatically):

```
VITE_BACKEND_URL=http://localhost:3001
VITE_MIDAS_MODEL_URL=https://huggingface.co/onnx-community/midas-v2.1-small/resolve/main/onnx/model.onnx
```

> The user's memory says "MIDAS_MODEL_URL env-var-ified". The real key is `VITE_MIDAS_MODEL_URL` (Vite-prefix required to expose it to the browser).

## 6. Initial Setup

1. Install Node ≥ 18 (Vite 8 + React 19 require modern Node).
2. `npm install` — pulls Three.js 0.183, Rapier WASM, three-gpu-pathtracer, three-mesh-bvh, etc.
3. **No asset download step is required** — the only bundled binary asset is `public/models/ybot.glb` (Y Bot test rig, committed for bone-keyframing dev per commit `cec9539`).
4. **Network dependencies at runtime**:
   - `index.html` eagerly fetches MediaPipe scripts from `cdn.jsdelivr.net/npm/@mediapipe/{camera_utils,drawing_utils,face_mesh,pose,hands}`. **First load requires internet.**
   - `DepthEstimator.js` fetches MiDaS ONNX from Hugging Face on first use.
   - `MultiPersonMocap.js` lazy-loads `@mediapipe/pose` and `@mediapipe/holistic` from CDN.
   - `StreamPireXBridge.js` defaults to `https://streampirex-production.up.railway.app` if `VITE_BACKEND_URL` is unset.
5. For Electron: `main.js` enables `webSecurity: false` (allows local GLB/BVH file loads) and `contextIsolation: true` with `preload.js`.

## 7. Sample / Test Data

- **Y Bot avatar**: `public/models/ybot.glb`. Loaded by default in the MoCap workspace via `setAvatarUrl('/models/ybot.glb')` in `src/workspaces/mocap/MocapWorkspace.jsx:160` and `:630`. The Avatar picker lists it as `[{label:'Y Bot', url:'/models/ybot.glb'}]` (line 530).
- No `samples/`, `examples/`, or `demo/` directory exists at any depth in `src/` or repo root.
- The app has built-in primitive generators (Cube/Sphere/Cylinder/Cone/Torus/Plane/Icosphere/Gear/Pipe/Helix/Staircase/Arch/Lathe via `ProceduralMesh.js`) accessible from the Modeling workspace's Primitives folder.
- Drag-and-drop or File menu → "Open GLB/GLTF…" loads any `.glb` / `.gltf`. Auto-fit logic in `App.jsx:500-527` (`importGLB`) re-centers and scales oversized models to scene scale (commit `3e9b44c`).
- Bone keyframing dev: load `/models/ybot.glb` and use the new bone helpers (commit `25153ef`).

## 8. Loading Test Data

| What | How |
|---|---|
| Y Bot avatar | MoCap workspace → Avatar picker → "Y Bot" tile, OR paste `/models/ybot.glb` into the GLB-URL input |
| Custom GLB | File menu → "Open GLB/GLTF…" (`Ctrl+O`), or drop a file, or in MoCap workspace paste a URL |
| BVH motion | File menu → "Open BVH…" (`Ctrl+Shift+O`); engine: `src/mesh/BVHImporter.js` |
| Built-in motion clips | Animation workspace → Motion Library → search MOTION_CLIPS via `src/mesh/MotionLibrary.js` |
| Live mocap (webcam) | MoCap workspace; webcam set to 1280×720 (commit `d36af6e`) and pipes MediaPipe landmarks to bone retargeting (commit `b3e425a`) |

## 9. Browser Console Tips for Debugging

The app exposes several global hooks (deliberately set on `window`):

| Global | Purpose | Source |
|---|---|---|
| `window.hardResetScene()` | Dispose all GPU memory + clear scene + clear React state | `src/App.jsx:457` |
| `window.__spxScene` | Live reference to the Three.js scene for skeleton inspection | commit `08b328d` |
| `window.SPXPanels` | Map of panel-id → React component (PANEL_REGISTRY) | `src/panels/registerPanels.js:44` |
| `window.openSPXPanel(panelId)` | Dispatch `spx-open-panel` event | `src/panels/registerPanels.js:46` |
| `window.openSPXDockPanel(panelId, zone='right')` | Dock panel into a zone | `src/panels/registerPanels.js:54` |
| `window.__SPX_TOOL_SEARCH__` | Last value of ToolSearch (informational) | `src/components/panels/ToolSearchPanel.jsx:22` |
| `window.electronAPI` | Only present when running under Electron — file IO, Python bridge | `preload.js` |

App emits and listens to custom events; useful in the console:

```js
// Switch workspace mode
window.dispatchEvent(new CustomEvent('spx:setWorkspaceMode', { detail: { mode: 'modeling' } }));

// Open a registered panel
window.openSPXPanel('shader_graph');
window.openSPXDockPanel('asset_pipeline', 'right');
```

Auto-save (every 60s) writes mesh transform to `localStorage.spx_autosave` — inspect via `localStorage.getItem('spx_autosave')`.

## 10. Common Errors & What They Mean

| Symptom | Likely cause | Source |
|---|---|---|
| `Pose / FaceMesh / Hands is not defined` (window-level errors) | MediaPipe CDN scripts in `index.html` failed to load (no internet, blocked CDN) — these are required for: RIG > MoCap, RIG > Retarget, GEN > Multi MoCap, Performance > MoCap timeline, `useFaceMocap`, `useHandMocap`, `MultiPersonMocap.js`. | `index.html:12-20` (the comment block explicitly enumerates this) |
| `Cannot find module '@mediapipe/pose'` (build-time) | The legacy `src/front/js/component/LiveMoCapAvatar.jsx` does a static `import { Pose } from '@mediapipe/pose'` but the package is NOT in `package.json`. Treat this file as dead — do not import it. | `src/front/js/component/LiveMoCapAvatar.jsx:9` |
| `AI assistant unavailable — no backend proxy configured. Set VITE_BACKEND_URL.` | `AIAnimationAssistant.js` needs `VITE_BACKEND_URL` to reach `/api/spx-mesh/anthropic-proxy` | `src/mesh/AIAnimationAssistant.js:127-134` |
| FBX import/export, Alembic, USD silently fail | `FBXPipeline.js` routes these through the backend (`/api/...`); both Alembic and USD have explicit `stub (requires backend)` comments. Need a running StreamPireX backend. | `src/mesh/FBXPipeline.js:215, 221` |
| Depth estimator never becomes ready | MiDaS ONNX fetch from `huggingface.co` failed (CORS, offline, blocked). Override with `VITE_MIDAS_MODEL_URL` to a local model. | `src/mesh/DepthEstimator.js:7-9` |
| Imported GLB looks tiny / huge | Auto-fit logic re-centers and scales (`obj.scale.setScalar(3 / Math.max(...))`) — works for most assets; if a model has weird bounds, the auto-fit may produce odd results. | `src/App.jsx:511-516` (commit `3e9b44c`) |
| GLB embedded animation auto-plays | This was fixed (commit `0200eb6` "don't auto-play GLB embedded animations on avatar load"); if it recurs, check `src/workspaces/mocap/MocapWorkspace.jsx`. | — |
| 404 on `/ybot.glb` | The path was historically wrong; correct path is `/models/ybot.glb` (commit `1dd7a1d`). | — |
| Mesh script panel "params (stub)" tooltip | The per-modifier and per-geometry-node param editors are stubbed — UI only, not functional yet. | `ModifierStackPanel.jsx:241`, `GeometryNodesPanel.jsx:271` |
| Onion skin does nothing | `src/animation/onionSkin.js` lifecycle methods are explicit `// TODO`. | `src/animation/onionSkin.js:45-50` |

## 11. Lint / Test Tooling

- **ESLint**: `npm run lint` (flat config, react-hooks + react-refresh).
- **No test runner** is configured in `package.json` (no `test` script, no Vitest / Jest / Playwright deps).
- **No CI config** (no `.github/workflows`, no `circle`, no `gitlab-ci.yml` at root).
- **No type checker** (Vite project, JS/JSX only — `@types/react` is only present so React types resolve in editor LSP).

## 12. Required ports / external services summary

| Service | Default | Required for |
|---|---|---|
| Vite dev server | `http://localhost:5173` | dev |
| StreamPireX backend | `https://streampirex-production.up.railway.app` (or your `VITE_BACKEND_URL`) | FBX/USD/Alembic IO, AI assistant, mocap upload, SPX handoff |
| MediaPipe CDN | `cdn.jsdelivr.net` | Pose / FaceMesh / Hands runtime |
| Hugging Face | `huggingface.co/onnx-community/midas-v2.1-small` | Depth estimation |

Internet access on first run is effectively required unless every CDN/model URL is mirrored locally and overridden via env vars.
