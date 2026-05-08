# Performance Notes — Performance Audit (Task 9)

Audit scope: render loop, RAF usage, FPS monitoring, Rapier physics, three-gpu-pathtracer, Web Workers, asset loading, WebGL constraints, WebAssembly init paths, instancing, particle caps, LOD system, quality knobs.

## Frame rate target

**Implicit 60 fps target.** No code line states "target fps", but:

- Physics / cloth / particle steps default to `dt = 1/60` (`src/mesh/ClothSystem.js:162`, `src/mesh/VFXSystem.js:233`).
- `src/App.jsx:1647` clamps DPR to `Math.min(window.devicePixelRatio, 2)` — typical 60-fps shipping default.
- `src/components/AnimationTimeline.jsx:247` exposes UI presets `[12, 24, 25, 30, 60]` fps for timeline playback (separate from render loop).
- `src/components/panels/VRPreviewPanel.jsx:171` text says: "Target 72–90 FPS for comfort" — VR-only guidance.

## Render loops detected

**Main loop** — `src/App.jsx:1771-1799`. Single `requestAnimationFrame` chain. Calls `renderViewportSet` (or `_composer.render()`) every frame. Has an early-exit when `window.__spxFullscreenOpen` is truthy (lines 1776-1778), so fullscreen overlays pause the render — good. Updates the gizmo screen-space size every frame (`gizmoRef.current.updateScale`).

**Stats sampler** — `src/App.jsx:429-455`. A second RAF chain that polls `renderer.info.render.triangles` and computes FPS once per second (`if (now >= lastTime + 1000)`). Cheap — only updates state every 1 s.

**LiveViewportMirror** — `src/App.jsx:353-377`. RAF-driven `<canvas>` mirror (rendered when `open`). Ticks `drawImage` from main canvas. Cancels on close.

**Per-panel RAF chains** — Many panels run their own RAF loops while open (cloth sim, fluid, weather, crowd, destruction, physics, gamepad animator, weather, VR preview, building simulator, asset library, animation panel, performance panel, particle, etc.). Most pair `requestAnimationFrame` with a `cancelAnimationFrame` in cleanup. These can stack: every open simulation panel = another RAF loop in flight.

**Generator preview canvases** — `src/components/generators/{VRPreviewMode,PhysicsSimulation,BuildingSimulator,AssetLibrary}.jsx` each create their own `new THREE.WebGLRenderer` (see "Renderer instances" below). Each disposes the renderer in cleanup.

## FPS counters

- **Main FPS counter** — `src/App.jsx:425-455`, displayed at line 4704 (`FPS: {fps} | Δ: {polyCount.toLocaleString()}`).
- **Gamepad animator** — `src/components/animation/GamepadAnimator.jsx:402` shows "Controller FPS".
- **Mocap UI** — `src/front/js/component/MotionCaptureSystem.jsx:198` shows mocap landmark fps.
- **VR preview** — `src/components/generators/VRPreviewMode.jsx:427`.
- **Physics generator** — `src/components/generators/PhysicsSimulation.jsx:546,560,569`.
- **Render workspace** — `src/components/workspace/RenderWorkspacePanel.jsx`.

`performance.now()` is used in a couple of timing measurements (`src/App.jsx:430,437`, `src/components/panels/FilmPathTracerPanel.jsx:67,83,98`). No `performance.mark()` / `performance.measure()` instrumentation anywhere.

## Heavy operations identified

| Operation | File | Notes |
|-----------|------|-------|
| Three-GPU path tracer (CPU-WebGL2) | `src/components/panels/FilmPathTracerPanel.jsx` | Default 256 samples × 8 bounces. Resolutions up to 4K (3840×2160). Uses `three-gpu-pathtracer` lib — accumulates 1 sample per RAF tick. Until `sampleCount >= samples` finishes, the tab is essentially blocked on rendering. |
| WebGPU path tracer (compute-shader) | `src/mesh/WebGPUPathTracer.js` | `maxBounces=8`, accumulating; requires `navigator.gpu`. Falls back silently when absent. Allocates up to 128 MB storage buffer (`maxStorageBufferBindingSize`). |
| Rapier WASM physics | `src/components/panels/DestructionPanel.jsx:48-69` | Async `await RAPIER.init()` on demand. Runs `stepDestruction` inside its own RAF loop while simulating. Large `pieces` value (slider goes up to **64**) creates many rigid bodies. |
| Cloth solver (JS) | `src/mesh/ClothSystem.js` | `iterations=12` constraint passes per step. Default `dt=1/60`. `stepCloth` is O(constraints × iterations). |
| Cloth solver (worker) | `src/mesh/WorkerBridge.js:6-49` (`clothWorkerCode`) | Off-main-thread version with 8 iterations. Posts whole particle array per step — JSON serialization cost grows with cloth size. |
| SPH fluid (worker) | `src/mesh/WorkerBridge.js:51-105` (`sphWorkerCode`) | **O(N²) loop** over particles for density and pressure. Will not scale beyond a few hundred particles. |
| GPU sculpt / GPU cloth | `src/mesh/GPUSculptEngine.js`, `src/mesh/GPUClothSolver.js` | Both call `navigator.gpu.requestAdapter({ powerPreference:'high-performance' })`. Falls back to CPU when WebGPU absent. |
| AI denoiser (Intel OIDN WASM) | `src/mesh/AIDenoiser.js` | Lazy-loaded via `import('@intel/oidn-web')`. Pre-converts entire image to Float32 HDR; one-shot per render. Falls back to bilateral filter (also CPU, O(W·H·radius²)). |
| MiDaS depth estimation (ONNX) | `src/mesh/DepthEstimator.js` | Loads `onnxruntime-web` from CDN at runtime. Runs full neural-net inference. |
| Crowd simulation | `src/mesh/CrowdSystem.js` | Default count=100 agents; flock/scatter/march/idle/panic. Steered via instanced mesh. Per-frame O(N²) for separation. |
| Particle system | `src/mesh/GPUParticles.js` | `maxCount=50000` default. Uses `THREE.InstancedMesh` with `DynamicDrawUsage`. Allocates Float32Arrays sized to `maxCount × 3`. |
| Boolean ops (CSG) | `src/mesh/BooleanOps.js` | 3 `console.error` paths — fragile under degenerate input. |
| Catmull-Clark subdivision | (multiple film panels) | One-shot ops; can stall main thread. |

## Memory disposal patterns

53 source files contain `.dispose()` calls. The major shells dispose properly:

- `src/App.jsx:457-482` (`window.hardResetScene`) — traverses the scene, calls `child.geometry.dispose()` and `child.material.dispose()`, then clears children. Good.
- `src/App.jsx:2200-2205` — main effect cleanup: `cancelAnimationFrame`, `removeEventListener`, `renderer.dispose()`.
- Generator panels (`VRPreviewMode`, `PhysicsSimulation`, `BuildingSimulator`, `AssetLibrary`) each call `renderer.dispose()` in cleanup.

**Concerns:**

1. `App.jsx:464-465` only checks `child.material.dispose` (singular). Three.js meshes can have `material` as an **array**; this branch silently misses array materials. (Not catastrophic — an array of materials is rare in this app, but it's a hidden leak path.)
2. Textures embedded in materials are not separately disposed in `hardResetScene`. Three.js does not auto-dispose textures when a material is disposed. PBR scenes accumulate texture memory.
3. No global "texture cache" / `disposeMesh(mesh)` utility — each subsystem rolls its own.
4. The `OnionSkin` scaffold (`src/animation/onionSkin.js`) lists "Disposed materials referenced after dispose: crash on next frame" in its risk comments — the author is aware of this pattern as a class-wide hazard.
5. `_composer` is attached as `rendererRef._composer` (a property of the ref object, not the renderer) at `src/App.jsx:1744`. Cleanup at line 2203 disposes `renderer` but does NOT dispose the composer's render targets.

## Asset loading strategy

**Lazy / dynamic.** Loaders are imported dynamically:

- `src/App.jsx:501-502` — `await import("three/examples/jsm/loaders/GLTFLoader.js")`
- `src/App.jsx:2308` — `import("...GLTFLoader.js").then(...)`
- `src/components/panels/FilmPathTracerPanel.jsx:72` — `await import('three-gpu-pathtracer')`
- `src/components/panels/DestructionPanel.jsx:53` — `await import('@dimforge/rapier3d-compat')`
- `src/components/panels/DenoiserPanel.jsx:2` — OIDN module via `import('@intel/oidn-web')`

**Build chunking** (`vite.config.js:14-26`) splits bundles by directory:

- `three-extras` — `node_modules/three/examples`
- `three-core` — `node_modules/three`
- `cloth`, `materials`, `uv`, `generators`, `panels` — by `/src/...` path

`chunkSizeWarningLimit: 1600` is raised — implies known large chunks.

There is essentially **no eager preloading**. The app starts fast because most heavy modules are deferred until a user opens the relevant panel.

## Renderer instances (main + generators)

Multiple `new THREE.WebGLRenderer(...)` are created — one per generator preview canvas:

- `src/App.jsx:1646` — main viewport (`antialias:true`, `powerPreference:'high-performance'`)
- `src/components/generators/VRPreviewMode.jsx:186`
- `src/components/generators/PhysicsSimulation.jsx:263`
- `src/components/generators/BuildingSimulator.jsx:156`
- `src/components/generators/AssetLibrary.jsx:120`

Each generator disposes its renderer in cleanup. WebGL has a per-tab WebGL context limit (~16 in Chrome). Opening 5-10 generator panels at once may exhaust contexts. None of these generators share a renderer with the main viewport.

Additional render targets:

- `src/App.jsx:3202` — `WebGLRenderTarget(size, size)` — used and disposed at line 3224.
- `src/mesh/PostPassShaders.js:5` — `WebGLRenderTarget`
- `src/mesh/EnvironmentProbes.js:24` — `WebGLCubeRenderTarget` per probe
- `src/mesh/RenderFarm.js:131` — depth target

## Shadow / quality settings (main viewport)

- `renderer.shadowMap.enabled = true`
- `renderer.shadowMap.type = THREE.PCFShadowMap` (not PCFSoft — less expensive)
- `dirLight.shadow.mapSize.width = 4096; height = 4096` — **16 MB+ shadow texture**. This is high. On weaker GPUs this alone can drop fps.
- `renderer.toneMapping = ACESFilmicToneMapping`
- `renderer.physicallyCorrectLights = true`
- `renderer.outputColorSpace = SRGBColorSpace`
- IBL (`createProceduralHDRI`) initialized with `scene.environment = envMap; environmentIntensity = 0.8`
- Two ambient lights are added (lines 1659 and 1754) — slight redundancy; one extra light evaluation per frame.

## WebAssembly init paths

- **Rapier** (`@dimforge/rapier3d-compat`) — async `await RAPIER.init()` (`src/components/panels/DestructionPanel.jsx:54`). On-demand, blocking that single panel until ready. Stored on `window.__SPX_RAPIER__`. Subsequent `world.step()` calls are synchronous.
- **OIDN** (`@intel/oidn-web`) — `loadOIDN()` in `src/mesh/AIDenoiser.js:11-31`. Re-entrant via `oidnLoading` flag with a 100 ms polling spin (`while (oidnLoading) await new Promise(r => setTimeout(r, 100))`). Falls back to bilateral filter on import failure.
- **ONNX** (`onnxruntime-web`) — loaded from CDN by `<script>` injection (`src/mesh/DepthEstimator.js:32`) — depends on network access at runtime, will silently fall back when offline.

## Worker thread usage

Single Worker bridge (`src/mesh/WorkerBridge.js`):

- `createInlineWorker(code)` — Blob-URL trick. Used for `clothWorkerCode` and `sphWorkerCode`.
- `runClothWorker` and `runSPHWorker` return Promises and post entire particle arrays each step. **Each call serializes the full state** — this is the canonical "structured-clone tax" pattern. For small simulations it's a win; for large ones the postMessage overhead can dominate.
- Workers are created on demand via `createClothWorker()` / `createSPHWorker()` and must be `destroyWorker(worker)` for cleanup. **No automatic teardown** if the panel is unmounted without stopping the sim.

No usage of `Comlink` (despite being mentioned in audit context). No `SharedArrayBuffer` / atomics.

## Particle / instance caps

| System | Default cap | Source |
|--------|------------:|--------|
| GPU particles | **50,000** | `src/mesh/GPUParticles.js:6` (`maxCount = 50000`) — allocates ~1.4 MB of Float32Array buffers up front |
| Crowd agents | **100** (caller can raise) | `src/mesh/CrowdSystem.js:114` (`count = 100`) |
| Cloth iterations | 12 (8 in worker version) | `src/mesh/ClothSystem.js:42` |
| Path tracer samples | 256 default, max **2048** | `src/components/panels/FilmPathTracerPanel.jsx:51,125` |
| Path tracer bounces | 8 default, max **32** | `src/components/panels/FilmPathTracerPanel.jsx:52,126` |
| Path tracer resolution | up to **4K** (3840×2160) | `src/components/panels/FilmPathTracerPanel.jsx:43-48` |
| Destruction pieces | up to **64** | `src/components/panels/DestructionPanel.jsx:120` |
| Shadow map | 4096×4096 | `src/App.jsx:1665-1666` |

## Instancing usage

- `src/mesh/Instancing.js` — generic `THREE.InstancedMesh` factory (`createInstances`). Sets `DynamicDrawUsage`. `castShadow=true; receiveShadow=true` — **shadow rendering on instanced meshes can be expensive at scale**.
- `src/mesh/CrowdSystem.js:128-129` — body + head InstancedMeshes.
- `src/mesh/GPUParticles.js:11` — particle InstancedMesh.

## LOD support

`src/mesh/LODSystem.js` and `src/components/panels/HairCardLODPanel.jsx`:

- `generateLOD(mesh, levels=[1.0, 0.5, 0.25, 0.1])` produces a `THREE.LOD` with 4 levels at distances 0, 5, 15, 30.
- Uses `three/examples/jsm/modifiers/SimplifyModifier.js`. Falls back to **manual decimation by skipping vertices** (line 21) — a crude approximation that can break index integrity.
- LODs are opt-in (callable from the UI), not applied automatically to all imported assets.

## Quality presets / knobs

- `src/mesh/SmartMaterials.js` exports `RENDER_PRESETS` (`RS_RENDER_PRESETS`) — used by `applyRenderPreset` (`src/App.jsx:1880`).
- `applyToneMappingMode` (`src/App.jsx:1881`) — runtime tone-mapping switch.
- Per-panel quality sliders (samples, bounces, particles count, etc.) but no global "Low / Medium / High" preset router that I could find.

## Specific performance-relevant comments / decisions in the code

- `src/App.jsx:1776-1778` — explicit "Pause render when fullscreen panel is covering the canvas" guard. Prevents re-rendering behind opaque overlays.
- `src/App.jsx:1647` — DPR clamp at 2.
- `src/mesh/HairPhysics.js:69-71` — `lodDistance:10`, `lodSubdivision:4`.
- `src/mesh/WebGPUPathTracer.js:35` — `maxStorageBufferBindingSize: 128*1024*1024`.

## Top performance concerns for live demo

1. **Path tracer samples × 4K resolution.** `src/components/panels/FilmPathTracerPanel.jsx`. Defaults of 256 samples at 1920×1080 take real wall-time; the user can crank to 2048 samples at 3840×2160 from the UI with no warning. Each sample is one `pt.update()` per RAF tick — for hundreds of samples the page is unresponsive. The `tick()` function holds onto the canvas at non-original size while running and only restores `origSize` at completion — if the user navigates away mid-render, the viewport is left at 4K.
2. **Stacked RAF loops.** Every open simulation panel (cloth, fluid, crowd, destruction, weather, gamepad, mocap, performance, generators, etc.) starts its own RAF chain. Opening multiple at once compounds linearly. There is **no central scheduler / priority**.
3. **4K shadow map + WebGL context fan-out.** `dirLight.shadow.mapSize = 4096×4096` is the single most expensive default in the main scene. On top of that, opening multiple generator panels can spawn additional WebGLRenderers (5+ contexts), risking context loss in the main viewport on weak GPUs.
4. **WebGPU silent fallback.** GPU sculpt, GPU cloth, GPU path tracer, render farm depth target — all silently set `this.fallback = true` when `navigator.gpu` is missing. Demo machines without WebGPU will appear to run these features but get a CPU fallback (or no-op for path tracer). Confirm `chrome://gpu` shows WebGPU enabled before showing these.
5. **MultiPersonMocap.js produces fake sine-wave joints** (see `known_issues.md`) — labelled as "real-time tracking" but is not. If shown live, it will look like a sad robot.
6. **SPH fluid worker is O(N²)** — fine for tens of particles, falls off a cliff past ~500.

## Summary table

| Category | Status |
|----------|--------|
| Frame-rate target | Implicit 60 fps (no explicit `targetFPS` constant) |
| Render loop | Single main RAF + many panel-local RAFs |
| FPS counter | Built-in (1-Hz sample), shown in HUD |
| `performance.mark` | None |
| Rapier physics | Async WASM init, on-demand; sync `step()` |
| Path tracing (CPU/WebGL2) | three-gpu-pathtracer, lazy-imported |
| Path tracing (WebGPU) | Compute-shader, lazy-imported, falls back silently |
| Workers | 1 inline-blob bridge for cloth + SPH |
| Asset loading | Fully lazy / dynamic-import; no preloader |
| WebGL contexts | Multiple (main + 4 generator previews); each disposes |
| Memory disposal | Per-feature; no central util; texture leaks possible |
| Particle cap | 50,000 (allocated up front) |
| Crowd cap | 100 default |
| Shadow map | 4096² (high) |
| LOD | Opt-in, 4 levels with crude decimation fallback |
| Quality presets | Per-panel sliders; no global low/med/high |
