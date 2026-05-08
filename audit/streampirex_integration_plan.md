# spx3dmesh2 → StreamPireX Integration Plan (Task 5)

Read-only inspection of the spx3dmesh2 side. The StreamPireX codebase was not available, so requirements are *inferred* from the spx3dmesh2 surface: the existing `StreamPireXBridge.js`, env-var conventions, localStorage keys, and assumptions baked into the build config.

---

## 1. What spx3dmesh2 actually is

- **Stack**: React 19.2 + Vite 8 + Three.js 0.183 + react-three-fiber 9 + @react-three/drei 10 + @dimforge/rapier3d-compat (WASM) + three-gpu-pathtracer + three-mesh-bvh + zustand 5
- **Entry point**: `index.html` mounts `<div id="root">`, loads `src/main.jsx`, which renders `<App />` from `src/App.jsx`
- **App shape**: monolithic 5320-LOC `src/App.jsx` mounted under a single `<SPXEditorProvider>` context
- **Routes**: NONE. Single-page app, no react-router, no `/path` URLs. All workspace switching is via the in-app `ProfessionalShell` switcher driven by `src/pro-ui/workspaceMap.js`
- **Side effects in App.jsx**: hundreds of `window.exportOBJ = ...` global assignments wire engine fns onto `window.*` for non-React panels and the menu dispatcher (App.jsx 1822-2122). Strong implication: the editor expects to *own* the global scope while it's mounted

---

## 2. Build & deployment

### Build output (`dist/` — already built April 27)
| File | Size |
|---|---:|
| `index-FioyAqda.js` | 2.61 MB (main bundle) |
| `generators-jMtTat2w.js` | 720 KB (lazy chunk for /src/mesh/generators/) |
| `panels-DM0JMqyG.js` | 224 KB (lazy chunk for /src/components/panels/) |
| `three-extras-CpfR6k9X.js` | 186 KB |
| `three-core-DV0v81Ma.js` | 179 KB |
| `panels-COW1ULXX.css` | 42 KB |
| `index-BVGkptbY.css` | 115 KB |
| Total `dist/` | **~4.1 MB** |

Plus the runtime `MotionLibrary.js` (1.4 MB JSON inside the main bundle — not a separate chunk).

### `vite.config.js` highlights
- **Path alias**: `@` → `./src`
- **Manual chunks**: `three-core`, `three-extras`, `cloth`, `materials`, `uv`, `generators`, `panels` — pre-set up for embedding (chunks split correctly)
- **chunkSizeWarningLimit: 1600** — author already aware of large chunks
- No custom `base` URL — **assets default to `/` absolute paths** (see "Asset paths" below)

### `index.html` script tags (these will need to move into StreamPireX)
- 5 MediaPipe CDN scripts (`camera_utils`, `drawing_utils`, `face_mesh`, `pose`, `hands`) loaded via `<script crossorigin>` from jsdelivr
- `/favicon.svg`

### Asset paths
- Bundled JS imports use relative module paths inside the chunk (Vite handles this fine when served from same host)
- **Generated `dist/index.html` contains absolute paths** like `/assets/index-FioyAqda.js`. Will break when served under a sub-path (`/3dmesh/`) without `vite build --base=/3dmesh/`
- MediaPipe CDN scripts are CORS-friendly, no spx3dmesh2 hosting needed
- No hardcoded `localhost`/`127.0.0.1` URLs found
- `VITE_BACKEND_URL` env var defaults to `https://streampirex-production.up.railway.app` — **already StreamPireX-aware**
- `VITE_MIDAS_MODEL_URL` env var for depth estimator (per session notes)

### Bundle size considerations
- 2.6 MB main JS + 720 KB generators + 1.4 MB MotionLibrary = **~5 MB minified** before gzip
- Three.js + Rapier WASM + MediaPipe (loaded as `<script>` tags) make this a heavy add for a typical streaming app
- React 19 dependency: **likely conflicts with whatever React StreamPireX uses** (React 18 is most common as of mid-2025)

---

## 3. Code integration

### Routes that need exposing in StreamPireX
- spx3dmesh2 itself **has no internal routes**. It is one mountable React tree
- StreamPireX needs **one route**, e.g. `/3d-editor` or `/mesh`, that mounts the entire `<App />` component
- All workspaces (Sculpt, Animate, Render, Generators, etc.) live inside that one component via `ProfessionalShell`'s in-app switcher

### Component API surface
- **Public mountable component**: `src/App.jsx` `export default App`. No props. Self-contained
- **Provider already wraps**: `<SPXEditorProvider>` is internal — App.jsx mounts it itself
- **No exposed callbacks**: StreamPireX cannot pass `onSave`, `onExport`, etc. down. All comms today goes through:
  - `localStorage` (`spx_autosave`, `spx_mesh_export`, `spx_mesh_library`, `__SPX_*__` keys, `__SPX_ASSET_BROWSER__`, `__SPX_COMPOSITOR__`)
  - `window.postMessage({ type: 'SPX_MESH_READY', url, name })` to parent (already wired in `StreamPireXBridge.js` line 60)
  - Direct fetch to `${VITE_BACKEND_URL}/api/r2/upload`

### Shared dependencies — likely conflicts
| Dep | spx3dmesh2 | Risk if StreamPireX has different version |
|---|---|---|
| `react`, `react-dom` | ^19.2.4 | **HIGH** — React 19's transition rules differ from 18; mixing will throw. If StreamPireX is on 18, must upgrade together or iframe |
| `three` | ^0.183.2 | HIGH if StreamPireX renders any 3D — Three.js has frequent breaking changes (every ~10 versions) |
| `@dimforge/rapier3d-compat` | ^0.19.3 | Medium — WASM blob, side-effects |
| `three-gpu-pathtracer` | ^0.0.24 | Low — leaf dep, rarely shared |
| `@react-three/fiber` | ^9.5.0 | HIGH — R3F 9 needs React 19 |
| `@react-three/drei` | ^10.7.7 | Medium — pinned to R3F 9 |
| `zustand` | ^5.0.12 | Medium — store changes between major versions |
| `uuid` | ^13.0.0 | Low |
| `jszip` | ^3.10.1 | Low |
| `react-draggable` | ^4.5.0 | Low — abandoned-ish lib but stable |

### Framework compatibility
- spx3dmesh2 is **pure React** — not Vue, not vanilla. Mountable into any React 19 host
- BUT the editor leans on **MediaPipe `<script>` tags pre-loaded in `index.html`** — these must be added to StreamPireX's HTML head (or dynamically loaded before the editor mounts)
- BUT the editor **assigns ~250 globals to `window.*`** in App.jsx during init. If StreamPireX has anything on `window.exportOBJ`, `window.createPathTracerSettings`, `window.openSPXPanel`, `window._geoNodeGraph`, `window._nlaActions`, `window.__SPX_*`, etc., it will collide. *(This is the single biggest hidden integration cost.)*

---

## 4. State integration

### Auth / user state
- spx3dmesh2 **already reads StreamPireX-style auth**:
  - `localStorage.getItem('jwt-token')` and `localStorage.getItem('token')` (App.jsx 3050, StreamPireXBridge.js 7)
  - Sends as `Authorization: Bearer ${token}` to `/api/r2/upload` and `/api/r2/list`
- No local login/signup flow exists
- **Implication**: integration just needs StreamPireX to set `localStorage['jwt-token']` *before* the editor mounts. Already designed for this

### Project save/load
- **Current save targets**:
  - `localStorage` (`spx_autosave` every 60s, `spx_mesh_export` on GLB export, `spx_mesh_library` after R2 upload)
  - `.spx` JSON file download via `exportSpxScene()` (App.jsx 1135)
  - GLB / OBJ / FBX / Alembic / USD download to user's disk
  - StreamPireX R2 (auto-fires on GLB export when JWT present, App.jsx 3050)
- **No real "scene project" abstraction in StreamPireX backend yet** — the bridge only stores a URL + filename + timestamp, no scene graph
- **Implication**: a "project" today is one mesh. To save full scenes (camera, lights, rig, animation, modifiers) StreamPireX needs a new `/api/scene/save` endpoint or to accept the `.spx` JSON

---

## 5. Storage integration

### Where do user 3D models go currently?
| Asset type | Storage today |
|---|---|
| Scene autosave | `localStorage["spx_autosave"]` (just position+rotation, not geometry) |
| Asset browser entries | `localStorage["__SPX_ASSET_BROWSER__"]` (names + tags only, **no actual asset data**) |
| Session snapshots | `localStorage["__SPX_SESSION_SNAPSHOTS__"]` (names + timestamps, **no scene state**) |
| Compositor / shader graphs | `localStorage["__SPX_COMPOSITOR_GRAPH__"]`, `__SPX_*` keys |
| Exported GLB/OBJ/FBX | User's local download folder via `<a download>` |
| Mocap clips | Bundled in `MotionLibrary.js` (1.4 MB committed) |
| HDRIs | Bundled assets in `src/assets/` (2 files), plus runtime CDN |
| Mesh files | Repo committed (80+ per session memory). At runtime, only generated/loaded into Three.js scene |

**Storage today is essentially: localStorage for state, browser-download for output, no persistent user-asset backend.**

### Cloudflare R2 storage integration points
spx3dmesh2 **already has** R2-aware code:
- `src/mesh/StreamPireXBridge.js` — `uploadMeshToStreamPireX(blob, filename, meta)` posts FormData to `/api/r2/upload` with folder=`meshes`
- `listUserMeshes()` GETs `/api/r2/list?folder=meshes`
- `notifyStreamPireX(url, name)` writes to `localStorage['spx_mesh_library']` and `window.postMessage({type:'SPX_MESH_READY', url, name})` to parent
- `mesh/AssetLibrary.js` Asset shape already has `r2Key` field

**StreamPireX backend needs to provide**:
1. `POST /api/r2/upload` — multipart upload, returns `{ url, key, size }`
2. `GET /api/r2/list?folder=meshes` — returns `Array<{ name, url, key, size, uploadedAt }>`
3. `POST /api/scene/save` *(new — for full project save)* — accepts the `.spx` JSON
4. `GET /api/scene/load/:id` *(new)* — returns the JSON
5. `POST /api/mesh/convert` *(already referenced in `FBXPipeline.js`)* — server-side FBX/Alembic/USD conversion (else those export buttons stay broken)
6. `POST /api/spx-mesh/anthropic-proxy` *(already referenced in `AIAnimationAssistant.js`)* — Claude API proxy

### Asset pipeline (mesh files at runtime)
- 80 committed mesh modules under `src/mesh/*.js` are bundled at build time, not loaded at runtime
- User-generated meshes live in `meshRef.current` (a Three.js `Mesh`/`Object3D`) and `sceneObjects` array (App.jsx state). Not persisted to disk unless exported
- HDRIs / motion clips: bundled
- Asset Library panel and Asset Browser panel are **frontends only** — they don't actually fetch anything at runtime; they store names in localStorage

---

## 6. Suggested integration phases

### Phase 1 — Embed as iframe / standalone (LOWEST RISK)

**Complexity: S**

What it looks like:
- Deploy spx3dmesh2 to its own subdomain (e.g. `mesh.streampirex.com`) using the existing `dist/`
- StreamPireX adds an `<iframe src="https://mesh.streampirex.com">` somewhere in its UI
- Pass JWT via `postMessage` (iframe pulls from localStorage shared via `targetOrigin`) or via querystring `?token=...`
- Mesh-ready notifications already use `window.parent.postMessage({ type: 'SPX_MESH_READY', url, name }, '*')` (StreamPireXBridge.js 60) — StreamPireX listens for these

Pros:
- Zero React/Three/version conflicts
- Zero global-namespace collisions
- Zero MediaPipe `<script>` injection into StreamPireX
- Existing `dist/` already builds; just configure CDN
- ~1 day of work

Cons:
- Two domains/cookies/CORS headaches for auth handoff (mitigated since JWT is in localStorage)
- Can't share UI chrome (top nav, sidebar) between StreamPireX and editor
- iframe = no deep linking, harder analytics
- Two separate React trees = double React download (unless stripped)

**Recommended for the first demo / MVP.**

### Phase 2 — Bundle as ES module (MEDIUM)

**Complexity: M**

What it looks like:
- Build spx3dmesh2 as a library: change `vite.config.js` to `build.lib` mode, output an ESM bundle exporting `<App />`
- StreamPireX `npm install spx3dmesh2` (or via path/git ref)
- StreamPireX route mounts `<MeshEditor />` directly
- MediaPipe scripts must be injected into StreamPireX `index.html`
- `App.jsx` global-window assignments need to be made idempotent (cleanup on unmount)
- `localStorage` keys need a namespace prefix to avoid clashes
- Probably need to ship `App.jsx` with a `<MemoryRouter>` or remove `<SPXEditorProvider>` from inside if StreamPireX has its own context

Pros:
- Single React tree, single Three instance (smaller download)
- Real navigation, deep links work
- Shared header/sidebar possible

Cons:
- React major-version lockstep (StreamPireX must run React 19)
- Three.js version lockstep
- ~250 `window.*` assignments need refactoring or a careful mount/unmount lifecycle
- Bundle conflict resolution between `three`, `@react-three/fiber`, `zustand`, etc.
- 2-4 weeks of work depending on StreamPireX's existing stack

### Phase 3 — Shared state + auth (HIGH)

**Complexity: L**

What it looks like:
- Replace `<SPXEditorProvider>` (`src/state/SPXEditorStore.jsx`) with StreamPireX's app store (could keep zustand if shared)
- Hook `pushHistory`/`undo`/`redo` into StreamPireX undo system
- Plumb StreamPireX user object → editor (currently editor reads `localStorage['jwt-token']` only, no user-name display)
- Replace `localStorage.spx_autosave` with StreamPireX's autosave service (probably `/api/scene/autosave`)
- Replace `localStorage.__SPX_ASSET_BROWSER__` and friends with backed Asset Library API

Pros:
- True single-app feel
- One-click "save to project" that actually saves a scene server-side

Cons:
- Touches every panel that uses localStorage (~12 panels per grep)
- Touches every panel that calls `window.exportXxx` (the menu router in `AssetBrowserPanel.jsx` lines 7-46 is a 50-item dispatch)
- 4-8 weeks; high test burden

### Phase 4 — R2 storage backend (HIGH)

**Complexity: L → XL**

What it looks like:
- StreamPireX backend implements:
  - `POST /api/r2/upload` (StreamPireX likely already has this for video uploads — confirm folder model supports `meshes/`)
  - `GET /api/r2/list?folder=meshes&user=...`
  - `POST /api/mesh/convert` server-side FBX/USD/Alembic export (this requires Blender or Assimp on the backend — significant ops investment)
  - `POST /api/scene/save` for `.spx` JSON projects
  - `POST /api/spx-mesh/anthropic-proxy` for AI features
- spx3dmesh2 side already has the client code; mostly backend work
- Asset Library panel needs to actually fetch from `/api/r2/list` instead of reading localStorage
- Decide R2 folder structure: `meshes/`, `scenes/`, `textures/`, `motions/`, `hdris/`, etc.
- Decide thumbnail strategy (currently no thumbnails; AssetLibrary supports a `thumbnail` field but never sets it)

Pros:
- True cloud-native editor; users can sign in on any device and see their projects
- Enables real collaboration (currently CollaborationSystem.js is in-memory only)

Cons:
- Backend work is the long pole
- FBX/USD/Alembic conversion server is operationally heavy (Blender headless, GPU optional, queue management). Without it, those export buttons in `AssetBrowserPanel.jsx` File menu remain stubs
- Cost: large user-uploaded meshes hit R2 egress
- 6-12 weeks; XL if the FBX-conversion service is included

---

## 7. Recommended fastest path to "spx3dmesh2 visible inside StreamPireX"

1. **Day 1–2 (S):** Deploy existing `dist/` to a subdomain `mesh.streampirex.com` with `vite build --base=/`. Add `<iframe>` in StreamPireX's main app at route `/mesh`. Write JWT via `localStorage` before iframe loads (same-domain) or via `postMessage` handshake (cross-domain). Done — editor is visible
2. **Week 1 (S–M):** Implement `POST /api/r2/upload` and `GET /api/r2/list?folder=meshes` on StreamPireX backend. Now "Send to StreamPireX" button in the editor's File menu actually persists meshes. The R2 wiring is already coded on the editor side
3. **Week 2 (S):** Add a `<script>` listener in StreamPireX that catches `postMessage({type: 'SPX_MESH_READY'})` and adds the mesh to the StreamPireX media library / video editor. Already-coded on the editor side
4. **Month 2 (M):** If iframe limitations bite (auth handoff, style mismatch, double-React), schedule Phase 2 (ESM bundle). Until then, iframe + R2 upload covers the core "user creates a 3D asset and uses it in their stream" loop

**Overall integration complexity headline**: **L** (large) for full integration, but **S** (small) to get the editor visible and producing assets to R2 within ~1 week using iframe + the existing StreamPireXBridge.js.

---

## 8. Top 3 integration risks

1. **React 19 lockstep**. spx3dmesh2 requires React 19 + R3F 9. If StreamPireX is on React 18, Phase 2+ blocks until both upgrade together. iframe (Phase 1) sidesteps this entirely
2. **`window.*` global namespace pollution**. App.jsx assigns ~250 things to `window.*` (engine fns + state caches like `window._geoNodeGraph`, `window._nlaActions`, `window.animationData`, `window.__SPX_*`). Embedding in the same page risks collisions and memory leaks on unmount. Needs an auditing/cleanup pass before Phase 2
3. **Backend prerequisites for export buttons**. FBX/USD/Alembic exports already in the File menu route to `${VITE_BACKEND_URL}/api/mesh/convert` which **does not exist yet** on StreamPireX. Until built, those menu items will silently fail. Either ship a Blender-backed conversion service or hide the menu items in the embed build

---

## 9. Quick reference — env vars to set in StreamPireX iframe / build

```
VITE_BACKEND_URL=https://api.streampirex.com   # default falls back to railway prod URL
VITE_MIDAS_MODEL_URL=https://r2.streampirex.com/models/midas-small.onnx   # depth estimator
```

## 10. Quick reference — endpoints StreamPireX backend must provide

| Endpoint | Used by | Required for |
|---|---|---|
| `POST /api/r2/upload` (multipart) | `StreamPireXBridge.js` | "Send to StreamPireX" GLB upload |
| `GET /api/r2/list?folder=meshes` | `StreamPireXBridge.js` | User mesh library |
| `POST /api/mesh/convert` | `FBXPipeline.js` | FBX import, FBX export |
| `POST /api/spx-mesh/anthropic-proxy` | `AIAnimationAssistant.js` | AI animation cleanup |
| `GET /api/version` | `ElectronBridge.js` | (Electron only — not needed in web embed) |

## 11. Quick reference — postMessage protocol

| Message | Direction | Schema |
|---|---|---|
| `SPX_MESH_READY` | editor → parent | `{ type, url, name }` (already implemented in `StreamPireXBridge.js` 60) |

To extend (not yet implemented but cheap to add):
| Possible message | Purpose |
|---|---|
| `SPX_AUTH_SET` | parent → editor — pass JWT on iframe load |
| `SPX_PROJECT_OPEN` | parent → editor — load a `.spx` JSON by id |
| `SPX_REQUEST_THUMBNAIL` | parent → editor — capture viewport PNG |
