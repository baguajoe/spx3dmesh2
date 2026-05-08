# Known Issues — Bug Pattern Audit (Task 8)

Audit scope: all `.js` / `.jsx` / `.ts` / `.tsx` files outside `node_modules`, `dist`, `.git`. Backup files (`*.bak*`, `*.before_*`) excluded.

## Headline counts

| Marker | Count | Files affected |
|--------|------:|---------------:|
| TODO   | 5     | 1 |
| FIXME  | 0     | 0 |
| HACK   | 0     | 0 |
| XXX    | 0     | 0 (string match found in `package-lock.json` integrity hashes only — not real markers) |
| "not implemented" / "coming soon" / "not yet" / "unimplemented" | 5 | 4 |
| `stub` / `STUB` (real, not "stubble" / "Stubble") | 6 | 5 |
| `if (false)` (explicit dead-block) | 0 | 0 |
| `// disabled` / `// DISABLED` | 0 | 0 |
| `mock` / `Mock` (true mocks, not unrelated) | 2 | 2 |
| `console.warn` | 52 | 30 |
| `console.error` | 19 | 14 |
| `try {` | 144 | 77 |
| `throw new Error` / `throw Error` | 14 | — |

The bug-marker count is exceptionally low for a codebase of this size (412 source files). Almost all in-progress / "to-do" work is encoded as **explicit user-facing status messages** ("coming soon", "params editor coming soon", etc.) rather than `// TODO` comments.

## Full list of TODOs (all 5)

All 5 live in **one file**:

- `src/animation/onionSkin.js:45` — `// TODO: implement next session`
- `src/animation/onionSkin.js:47` — `attach(mesh) { /* TODO */ }`
- `src/animation/onionSkin.js:48` — `detach() { /* TODO */ }`
- `src/animation/onionSkin.js:49` — `update(currentFrame, animationData) { /* TODO */ }`
- `src/animation/onionSkin.js:50` — `dispose() { /* TODO */ }`

This is a **scaffold-only file** with a long header comment (lines 1–40) describing the planned design, integration points, and risks. Every method body is empty. The class is exported but consumers should expect no behavior. **Do not demo onion-skin.**

## "Not implemented" / "Coming soon" surface (5 sites)

- `src/components/mesh/ProMeshPanel.jsx:309` — `title="Undo not yet implemented"`
- `src/components/panels/ModifierStackPanel.jsx:242` — `setStatus('Params editor coming soon')` (also `title="params (stub)"` line 241)
- `src/components/panels/GeometryNodesPanel.jsx:91` — `setStatus('Params editor coming soon');` (also `title="params (stub)"` line 271)
- `src/mesh/FBXPipeline.js:218` — Alembic export returns `{ success:false, error:"Alembic export requires Railway backend — coming soon", pending:true }`
- `src/mesh/FBXPipeline.js:224` — USD export returns same shape

## Stubs that explicitly admit they are stubs

- `src/mesh/EnvironmentProbes.js:211` — `applySSR()` is a no-op that prints `console.info` instructing future engineer to wire into PostProcessing.js. SSR button is therefore dead-but-silent.
- `src/components/panels/ModifierStackPanel.jsx:241` & `src/components/panels/GeometryNodesPanel.jsx:271` — params-edit buttons titled "params (stub)".
- `src/mesh/FBXPipeline.js:215`, `:221` — Alembic and USD export stubs (return objects with `pending:true`).
- `src/mesh/GPUClothSolver.js:2` & `src/front/js/utils/motionUtils.js:2` — header comments noting these are replacements for earlier stubs (these themselves are now real implementations).

## Mock / placeholder data in production code paths

- `src/mesh/MultiPersonMocap.js:213-230` — `_loop()` calls `_simulateDetection()` which generates **`fakeJoints` based on `Math.sin(t)`**. Comment on line 212 says: *"In a real implementation, MediaPipe would process each frame. For now, simulate with placeholder data."* This means the entire `MultiPersonMocap` class produces fake joint motion until a real MediaPipe integration is wired. **Do not demo multi-person mocap as live tracking — it is a sine-wave puppet.**
- `src/mesh/PluginSystem.js:163-175` — `COMMUNITY_PRESETS` is hardcoded mock data with comment `// Community presets (mock data — replace with API)`. The preset marketplace UI will display these 10 fake entries. Install/uninstall against this array works locally but does not call any backend.
- `src/mesh/CollaborationSystem.js:124` — comment `// ── Simulate WebSocket connection (mock for browser) ─────`. Real-time collaboration is mocked.
- `src/components/panels/BaseModelLibraryPanel.jsx:78` — `// Lightweight placeholder mesh so user sees something immediately` (this is intentional UX, not a bug — a stand-in mesh while real model loads).

## Disabled / dead code

- No `if (false)` blocks found.
- No `// disabled` markers found.
- One `return null; // Not available in browser` in `src/mesh/ElectronBridge.js:54` — intentional browser-side guard, not dead code.

## `console.warn` / `console.error` hotspots (top 10 files by warn+error count)

| File | warn | error | Notes |
|------|-----:|------:|-------|
| `src/App.jsx` | 11 | 2 | Main app shell — many fallback paths |
| `src/mesh/BooleanOps.js` | 0 | 3 | CSG failures |
| `src/mesh/WebGPUPathTracer.js` | 3 | 0 | WebGPU init fallbacks |
| `src/mesh/SmartMaterials.js` | 3 | 0 | Material setup fallbacks |
| `src/mesh/WebGPURenderer.js` | 2 | 0 | WebGPU fallback path |
| `src/mesh/PluginSystem.js` | 2 | 0 | Plugin load failures |
| `src/mesh/GLTFAdvanced.js` | 2 | 0 | GLTF advanced features |
| `src/mesh/FilmRenderer.js` | 2 | 0 | Render path |
| `src/mesh/AIDenoiser.js` | 2 | 0 | OIDN load + execution fallbacks |
| `src/components/panels/NLAPanel.jsx` | 2 | 0 | NLA strip handling |
| `src/components/panels/FilmSubdivPanel.jsx` | 0 | 2 | Subdiv errors |
| `src/components/panels/ClothSimPanel.jsx` | 0 | 2 | Cloth sim errors |

## `try`/`catch` density hotspots (top 10 files by `try {` count)

| File | try blocks | Notes |
|------|-----------:|-------|
| `src/App.jsx` | 12 | Main shell — broad guard rails |
| `src/workspaces/mocap/MocapWorkspace.jsx` | 5 | MediaPipe + camera permission risk |
| `src/mesh/UISystem.js` | 5 | UI side-effects |
| `main.js` | 5 | Electron main process |
| `src/mesh/PluginSystem.js` | 4 | User-supplied plugin code |
| `src/front/js/component/MotionCaptureSystem.jsx` | 4 | Camera + MediaPipe |
| `src/components/pipeline/SPX3DTo2DPanel.jsx` | 4 | PNG export pipeline |
| `src/mesh/SmartMaterials.js` | 3 | — |
| `src/mesh/FilmRenderer.js` | 3 | — |
| `src/mesh/BooleanOps.js` | 3 | CSG ops fragile |

## Per-file warning-marker hotspots (combined TODO/FIXME/HACK/XXX/"coming soon"/stub mentions)

| Rank | File | Markers |
|-----:|------|--------:|
| 1 | `src/animation/onionSkin.js` | 5 (all TODO) |
| 2 | `src/mesh/FBXPipeline.js` | 4 (Alembic + USD stubs, "coming soon") |
| 3 | `src/mesh/MultiPersonMocap.js` | 3 (placeholder, fake-joints simulator) |
| 4 | `src/components/panels/ModifierStackPanel.jsx` | 2 (params stub + "coming soon") |
| 5 | `src/components/panels/GeometryNodesPanel.jsx` | 2 (params stub + "coming soon") |
| 6 | `src/mesh/EnvironmentProbes.js` | 1 (SSR stub) |
| 7 | `src/mesh/PluginSystem.js` | 1 (mock community presets) |
| 8 | `src/mesh/CollaborationSystem.js` | 1 (mock WebSocket) |
| 9 | `src/components/mesh/ProMeshPanel.jsx` | 1 ("Undo not yet implemented") |
| 10 | `src/mesh/AIDenoiser.js` | 0 markers but high warn density (OIDN fallback) |

## Recurring themes (categorized)

1. **Backend-dependent features still client-only** — Alembic / USD export, community preset marketplace, real-time collaboration. All return `pending:true` or use hardcoded data.
2. **AI-inference fallbacks** — OIDN denoiser, MiDaS depth estimation, MediaPipe multi-person mocap. Each gracefully falls back to JS / sine-wave / no-op when the AI model is missing. The fallback can be silent.
3. **WebGPU fallbacks** — `WebGPURenderer`, `GPUSculptEngine`, `GPUClothSolver`, `WebGPUPathTracer`, `RenderFarm` all check `navigator.gpu` and set `this.fallback = true` on failure. Browser must support WebGPU (Chrome 113+) or these will silently no-op.
4. **Editor stubs** — params editors for the modifier stack and geometry nodes, plus the Pro mesh panel's Undo, all surface "coming soon" status to users.
5. **Onion skin** — entirely a scaffold (5 TODOs in one file).

## Demo caution list (features safer to skip or pre-flight)

- **Onion skin** — empty class, every method is a no-op. Will appear to do nothing.
- **Multi-person mocap** — produces sine-wave joint motion, NOT live tracking, until a real MediaPipe integration replaces `_simulateDetection()`. (Single-person mocap via `MotionCaptureSystem.jsx` / `useFaceMocap` / `useHandMocap` *is* real.)
- **Alembic export, USD export** — both return error+pending=true. Will surface as a friendly error in the UI but cannot succeed.
- **Pro Mesh panel Undo** — explicitly labeled "not yet implemented" in title attribute.
- **Modifier Stack params editor** — "Params editor coming soon" status; the rest of the modifier stack works.
- **Geometry Nodes params editor** — same: "Params editor coming soon."
- **Community Preset marketplace install/uninstall** — works against in-memory mock data; does not persist or call API.
- **Collaboration / multi-user** — mock WebSocket simulation.
- **SSR (screen-space reflections)** — `applySSR()` is a no-op `console.info`.
- **Path tracer fallback path** (`FilmPathTracerPanel.jsx:94`) — when `three-gpu-pathtracer` import fails, falls back to a single rasterized frame and labels it as "rendered". This may be misleading on weak hardware.
- **WebGPU paths in general** — confirm `navigator.gpu` is present in the demo browser before showing GPU sculpt / GPU cloth / GPU path tracer.

## Assessment

This codebase is unusually **light on left-behind TODO/FIXME/HACK markers** for its size. Where work is incomplete, the team has chosen to communicate it via the UI (`setStatus('Params editor coming soon')`, `title="..."`) rather than code comments. The real risk surface is the small set of **mock/simulated subsystems** above (multi-person mocap is the highest-impact hidden mock), and the larger set of **graceful fallback paths** (WebGPU, OIDN, MediaPipe) that may silently demo at lower fidelity than expected.
