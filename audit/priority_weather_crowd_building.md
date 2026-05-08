# Priority Audit: Weather / Crowd / Buildings

Read-only audit. Three procedural generator areas. Stack: Three.js, Vite, three-gpu-pathtracer, Rapier WASM (unused here), MediaPipe (unused here).

Cross-cutting finding before details: there are **multiple, overlapping, half-wired implementations** of each system. Several of the panels are imported in `App.jsx` but never mounted. Some panels that *are* mounted are pure UI mockups whose "Generate" button is a `setTimeout` that updates a status string.

---

## TASK 3C — WEATHER GENERATOR

### Files

Backing systems (logic):
- `/workspaces/spx3dmesh2/src/mesh/WeatherSystem.js` — particle-pool rain/snow + fog + lightning, presets, dispose
- `/workspaces/spx3dmesh2/src/mesh/WeatherPanel.js` — `WindField` + class-based `WeatherSystem` (parallel/duplicate API to the function-based one above)
- `/workspaces/spx3dmesh2/src/mesh/GPUParticles.js` — InstancedMesh particle system with force fields (used by VFX WeatherPanel)

UI panels (React):
- `/workspaces/spx3dmesh2/src/components/vfx/WeatherPanel.jsx` — **MOUNTED** in `App.jsx` line 5096. Real, GPU-particle backed, 8 preset weather types, atmosphere tab, force-fields tab.
- `/workspaces/spx3dmesh2/src/components/panels/FilmWeatherPanel.jsx` — **MOUNTED** in `App.jsx` line 5036. Lightweight `THREE.Points` rain/snow/fog/dust/storm with lightning clear-color flash.
- `/workspaces/spx3dmesh2/src/components/panels/WeatherPanel.jsx` — **NOT MOUNTED**. Wires to `mesh/WeatherSystem.js`. Has the nicest preset grid (drizzle, hailstorm, sandstorm, thunderstorm, blizzard, etc.).

Other call-sites:
- `App.jsx:4009-4010` — `weather_rain` / `weather_snow` apply-fn handlers create a `WeatherSystem` but **never call `stepWeather`** and **never store/dispose** it. Effectively dead.
- `App.jsx:42`, `212` — imports `FilmWeatherPanel` and the vfx `WeatherPanel`.

### Effects available

- vfx WeatherPanel: rain, snow, sandstorm, thunderstorm, blizzard, fog/mist, hail, volcanic ash. Plus lightning toggle (only enabled for storm/rain in UI).
- FilmWeatherPanel: fog, rain, snow, dust, storm.
- WeatherSystem.js (mounted via panels/WeatherPanel — but that panel is unmounted): clear, drizzle, lightRain, heavyRain, thunderstorm, lightSnow, blizzard, hailstorm, fog, sandstorm.
- WeatherPanel.js class API: clear, rain, snow, storm, fog (with `WindField` class supporting vortices, gusts, turbulence — but no UI binding).

### Implementation per effect

- **vfx/WeatherPanel** uses `GPUParticles.js` `createGPUParticleSystem` → InstancedMesh of small spheres. Per-type config table sets gravity, life, size, count (200–3000), colors. Wind & turbulence implemented as force fields. Lightning is a `PointLight` flash via setTimeout chain.
- **FilmWeatherPanel** uses `THREE.Points` with `BufferGeometry` directly, manually advecting positions in a rAF loop and wrapping at boundaries. Storm flash modulates `renderer.setClearColor` (which will fight any other render path).
- **WeatherSystem.js** uses `THREE.Points` with two pre-allocated pools (rain, snow), both up to 16K particles, additive blending for rain, normal for snow. Fog uses `THREE.FogExp2`. Lightning is a `PointLight` flicker.
- **WeatherPanel.js** (class) is a more proper data model with `WindField` (turbulence + gusts + vortices) but is not connected to any rendering code in the project — it has `buildParticleGeometry` that creates a one-shot static buffer, not a continuous renderer.

### Customization

vfx WeatherPanel exposes intensity (0.1–1), coverage (2–20), emit height (2–20), wind X/Z (-5–5), fog density/color, and a Force Fields tab where vortex/attractor/repulsor/turbulence/wind/drag can be added at runtime. There are 6 atmosphere presets ("Dark Stormy Night", "Heavy Blizzard", "Desert Sandstorm", etc.). FilmWeatherPanel exposes intensity, wind, density, speed, lightning flash strength, tint color. The unmounted panels/WeatherPanel exposes per-effect knobs (rain, snow, fog, wind, lightning, hail) plus particle count chips up to 16K.

### Performance

- vfx Weather caps at ~3K particles per type at intensity=1. Sphere geometry is `(0.04, 3, 3)` — 6-tri spheres. With InstancedMesh + DynamicDrawUsage this should sustain 60fps easily.
- FilmWeatherPanel can spawn up to 5800 (`800 + 1·5000`) `Points` particles, plus 3000 dust. Single draw call but JS-side per-frame loop over typed array. Fine on modern hardware.
- WeatherSystem.js scales to 16K particles in two `Points` meshes; per-frame Float32Array writes plus full `attributes.position.needsUpdate = true`. CPU-bound at high counts.
- Lightning via `setTimeout` (vfx panel: 80/120/200ms; WeatherSystem: 80/120/300ms) is not synced to rAF — fine but skips frames during tab switches.
- Force-field math in `GPUParticles.applyForceField` runs per-particle per-field per-frame on the JS main thread. No spatial accel.

### Integration with scene

- `vfx/WeatherPanel`, `FilmWeatherPanel`, and `mesh/WeatherSystem` all expect `sceneRef.current` and add their meshes/group to that scene. They co-exist with whatever is already there.
- Each system manages `scene.fog` independently. Two of them active simultaneously will fight over `scene.fog`.
- FilmWeatherPanel's storm mode also overwrites `renderer.setClearColor` per frame — this conflicts with any background/skybox set by `EnvironmentSystem`.
- vfx WeatherPanel positions emit volume relative to world origin (0, emitHeight, 0), not relative to the camera. WeatherSystem.js *does* track camera position for rain/snow (`origin.x + p.position.x`).

### Layering

- Multiple weather effects at once: only the unmounted panels/WeatherPanel exposes simultaneous rain+snow+fog+lightning+hail knobs. The mounted panels are exclusive (one weatherType state). FilmWeather and vfx WeatherPanel can technically run together since they keep separate refs/groups, but fog/clearColor/scene.fog will collide.
- vfx WeatherPanel internally allows adding multiple force-fields to the active particle system at runtime — this is the only real "layering."

### Cleanup

- vfx WeatherPanel `clearAll`: removes instanced mesh, lightning light, sets `scene.fog = null`. Looks correct.
- FilmWeatherPanel `clearWeather`: traverses + disposes geometry/material, removes group, nulls fog, resets clear color. Correct.
- WeatherSystem.js `disposeWeather`: removes both meshes, disposes geo/mat, nulls fog. Correct.
- `App.jsx:4009-4010` `weather_rain` apply-fn: creates a system but **never disposes** — orphaned object on every invocation, leaks scene children + memory.

### Visual quality

Mid. All systems use `PointsMaterial` or simple sphere `InstancedMesh`. No streak shader for rain (no per-particle velocity-aligned billboards), no flake-shaped sprites for snow, no volumetric fog (just `FogExp2`). Lightning is a single point light flash, no actual bolt geometry, no thunder audio. WindField in WeatherPanel.js is sophisticated (vortices, gusts) but unused. FilmWeatherPanel's "storm" clear-color flash will look awful in any final render with proper lighting.

### Known bugs / dead code

- No literal TODO/FIXME/HACK markers in any of these files.
- `App.jsx:4009-4010`: `createWeatherSystem(...)` called with `{ preset: "rain" }` but that option is not read; system is created, `applyWeatherPreset` mutates fields, but **`stepWeather` is never invoked**. Particles will not animate. System is never freed. Bug.
- `panels/WeatherPanel.jsx` is imported nowhere → dead component (the "premium" preset grid never reaches the user).
- `WeatherPanel.js` class API + `WindField` + vortex code are entirely unused → dead code (~225 lines).
- Three competing weather APIs (`mesh/WeatherSystem.js` function-based, `mesh/WeatherPanel.js` class-based, `mesh/GPUParticles.js` instanced) — confusing maintenance surface.
- vfx `WeatherPanel.jsx` imports `createEmitter, stepEmitter, buildParticleSystem, updateParticleSystem, VFX_PRESETS, emitParticles` from `VFXSystem.js` and `burstEmit` from `GPUParticles.js` but uses none of them — dead imports.
- vfx WeatherPanel emits in a square XZ box around (0,0,0); will look detached if camera/character is far from origin (unlike WeatherSystem.js which follows camera).

### Demo-readiness verdict: **YELLOW**

vfx `WeatherPanel.jsx` works end-to-end and renders particles to the live scene — this is demo-able for rain/snow/storm. FilmWeatherPanel works as a quick alternate. But: (a) the apply-fn shortcuts `weather_rain`/`weather_snow` are broken (no animation, leak), (b) the prettiest preset grid panel is unmounted, (c) overlapping APIs and clear-color hijack mean a stage demo could surprise the presenter. Visual fidelity is "okay particles," not "wow." Safe-stage path is: open vfx Weather → pick Thunderstorm with Lightning toggle → set fog → demo.

---

## TASK 3D — CROWD GENERATOR

### Files

Backing system:
- `/workspaces/spx3dmesh2/src/mesh/CrowdSystem.js` — full boids/steering crowd: separate, align, cohesion, wander, seek, flee, boundary repel. InstancedMesh capsule-style agents.

UI panels:
- `/workspaces/spx3dmesh2/src/components/panels/CrowdPanel.jsx` — wires `CrowdSystem.js`. **NOT MOUNTED in App.jsx.**
- `/workspaces/spx3dmesh2/src/components/generators/ProceduralCrowdGenerator.jsx` — **MOUNTED** (line 5189). UI-only mockup; "Generate" button is a `setTimeout` that updates status text.
- `/workspaces/spx3dmesh2/src/components/panels/CrowdGeneratorPanel.jsx` — imported in `App.jsx:12` but **never mounted** (dead). Has the most elaborate options UI (LOD profiles, impostor distance, gender/skin/outfit variation, formations, animation states).

App.jsx imports `createCrowdSystem, stepCrowd, setCrowdBehavior, disposeCrowd` (line 95) but never calls them — they only fire from the unmounted `CrowdPanel.jsx`.

### Implementation approach

`CrowdSystem.js` is solid: two `InstancedMesh`es (cylinder body, sphere head) sharing one `MeshPhysicalMaterial`, per-instance color from a 7-color palette by `i % colors.length`. Agents are integrated each step by writing matrices via a shared `THREE.Object3D _dummy` helper. Yaw rotates toward velocity. No animation playback — agents slide on the ground.

`ProceduralCrowdGenerator` (mounted) does NOT render anything; its `<canvas>` mirrors the main renderer's domElement via `drawImage`. Generation just fires a status callback after 1.2s.

### Variety of characters

`CrowdSystem.js`: identical capsule + sphere, 7 color variants. No mesh swap, no body shape variation, no clothing. Agents differ only by `maxSpeed` (1.5–2.5) and color.

`CrowdGeneratorPanel.jsx` UI exposes 9 styles (Generic / Medieval / Modern / Sci-Fi / Fantasy / Military / Sports / Zombie / Ritual), gender ratio, age, skin tone, outfit, hair sliders — but none of this is wired to any geometry.

### Animation system

None in the mounted path. Agents are static geometry that translates and rotates.

`CrowdGeneratorPanel.jsx` has 11 animation states (Idle/Walk/Run/Cheer/Talk/Sit/Stand/Fight/Dance/Pray/Work) with variation/sync/offset sliders — entirely cosmetic, never wired.

### Procedural placement vs manual

`CrowdSystem.js` spawns randomly within `bounds * 1.5` square. `CrowdGeneratorPanel` and `ProceduralCrowdGenerator` UIs offer formations (Random / Grid / Circle / Line / V-Shape / Cluster / March / Stadium / Wave) — **never implemented**.

### Crowd behavior

`CrowdSystem.js` implements 5 behaviors: `flock` (sep+align+cohesion+wander, classic boids), `scatter` (strong separation + wander), `march` (seek targetPoint + separation), `panic` (flee from panicPoint + separation), `idle` (small wander + separation, with idle timer that randomly turns the agent). Weights are exposed via the `CrowdPanel` knobs (separation, alignment, cohesion). This is genuinely good — comparable to a textbook boids reference.

### Performance limits

Each step does an O(N²) neighbor scan: `agents.filter((o, j) => j !== i && agent.position.distanceTo(o.position) < 5)`. Comment in source acknowledges this: "spatial partition would be faster but this is fine for 500." Per-frame matrix writes for both bodyMesh and headMesh require `instanceMatrix.needsUpdate = true` (correct).

Practical ceiling: 200–300 agents at 60fps on modern desktop; 500 may dip but is the hard cap exposed by the UI. UI default is 100. Above 500 the `CrowdGeneratorPanel` UI claims to support — it doesn't (since the panel is dead).

### Integration with weather

None. `CrowdSystem` agents have no exposure to `WeatherSystem.windField` or any wind force. They don't flinch, look up, or change color in rain.

### Integration with buildings

None. There is no obstacle avoidance. `boundaryRepel` only handles the square play-area edge, not building meshes. Agents will walk through walls.

### LOD system

None implemented. `CrowdGeneratorPanel.jsx` UI exposes LOD profile / LOD distances / impostor distance / max draw calls / occlusion culling / GPU instancing checkboxes — all decorative.

### Known bugs / dead code

- No TODO/FIXME/HACK markers.
- `CrowdPanel.jsx` is the **only** working bridge to `CrowdSystem.js` and is not mounted anywhere — the boids code is unreachable through the UI.
- `App.jsx:95` imports `createCrowdSystem, stepCrowd, setCrowdBehavior, disposeCrowd` but never uses them.
- `CrowdGeneratorPanel.jsx` is imported (line 12) but never rendered — full panel + 220+ lines of decorative trailing comments are dead.
- `ProceduralCrowdGenerator.jsx` is the mounted panel and does **not** generate anything — the user clicks Generate, sees "✓ 50 crowd members generated" status, and nothing appears in the scene. This is the worst kind of demo trap.
- `CrowdSystem.js:231` reads `agent.agentHeight` but `createAgent` stores it as `agent.height` (not `agentHeight`). The ternary falls through to fallbacks `0.63` / `1.53`, so all agents render at the default ~1.8m height regardless of the `agentHeight` option. Latent bug.
- `CrowdSystem.js:226` `velocity.y = 0` is set after `clampLength`, fine. But `agent.acceleration` is added to velocity then never reset between agents in the same step — wait, it IS reset at top of forEach with `agent.acceleration.set(0,0,0)`. OK.

### Demo-readiness verdict: **RED**

The good crowd code (`CrowdSystem.js` boids) is present but **not reachable from any mounted UI**. The mounted "Procedural Crowd Generator" is a façade — clicking Generate produces a status string and zero geometry. On stage this will be visibly empty. To get to GREEN: either mount `CrowdPanel.jsx`, or wire `ProceduralCrowdGenerator`'s Generate button to `createCrowdSystem` + a stepping rAF.

Performance ceiling (when CrowdSystem is reached): ~200–300 agents at 60fps; UI cap 500.

---

## TASK 3E — BUILDING GENERATOR

### Files

Backing systems:
- *None present.* `/workspaces/spx3dmesh2/src/components/panels/CityGenPanel.jsx` imports `generateCity, disposeCity` from `../../mesh/CityGenerator.js` and `generateDetailedBuilding, BUILDING_STYLES` from `../../mesh/BuildingGenerator.js` — **both files do not exist.** Confirmed via `ls`. CityGenPanel itself is also not mounted in `App.jsx`, so the missing-import doesn't crash the running app, but it cannot ever work.

UI panels:
- `/workspaces/spx3dmesh2/src/components/generators/CityGenerator.jsx` — **MOUNTED** (line 5177). UI mockup. "Generate City" button is a `setTimeout` updating status text. Bug: imports `useState, useRef` but uses `useEffect` at line 48 → will throw `ReferenceError: useEffect is not defined` the moment the panel opens. **Crash bug.**
- `/workspaces/spx3dmesh2/src/components/generators/BuildingSimulator.jsx` — **MOUNTED** (line 5181). Self-contained: creates its own `THREE.WebGLRenderer`, scene, orbit camera, raycaster — does NOT touch the main `sceneRef`. Manual "click to place" tools: wall, floor, window, door, stair, roof.
- `/workspaces/spx3dmesh2/src/components/panels/BuildingSimulatorPanel.jsx` — imported (line 14) but **never mounted**. Renders a parametric office tower with floors/width/depth/material/roofType into the host `scene` prop. Real working code.
- `/workspaces/spx3dmesh2/src/components/panels/CityGeneratorPanel.jsx` — imported (line 10) but **never mounted**. Massive options UI (10 city styles, road types, district types, atmosphere/skybox, foliage/people/vehicles toggles); calls `onGenerate(params)` — but `App.jsx` does not provide an `onGenerate` handler.
- `/workspaces/spx3dmesh2/src/components/panels/CityGenPanel.jsx` — **never mounted**. Imports broken (missing `mesh/CityGenerator.js` + `mesh/BuildingGenerator.js`).

### Procedural generation or library?

- `BuildingSimulator.jsx` (mounted): manual click-to-place; not procedural. Materials: concrete, brick, wood, glass, metal, drywall, marble, tile.
- `BuildingSimulatorPanel.jsx` (unmounted but real): procedural per-floor extrusion. `for (f=0; f<floors; f++)` builds a `BoxGeometry(currentW, 3.2, currentD)` plus a glass window strip on front and back faces; setback every 4 floors. 8 archetypes in dropdown (Office Tower, Apartment Block, Industrial Warehouse, Gothic Cathedral, Modern House, Pyramid, Pagoda, Brutalist Complex, Victorian Mansion, Futuristic Hub) — but the actual geometry is identical for every archetype (only the dropdown label is consumed). Roof types implemented: Flat, Pyramid, Dome, plus a default cone. Adds a lobby box and lights.
- `CityGenPanel.jsx` (unmounted, broken imports): would call `generateCity(scene, {gridSize, blockSize, density, seed, addRoads})` and `generateDetailedBuilding({style, floors, width, depth, seed, addWindows})` — neither function exists.
- `CityGenerator.jsx` (mounted, crashes on open): parameters present in UI (city blocks, density, avg height, height variance, road width/grid, lot size, building variation, window density, roof style, landmarks, parks, waterways, bridges, night mode, wall/roof/road colors, 8 styles) — none of it generates anything.

### Building types

`BuildingSimulatorPanel.jsx` enumerates 10 archetypes and 8 facade materials and 8 roof types — but archetype is not consumed, and only Flat / Pyramid / Dome / default-cone roof code paths exist. So functionally: one shape (rectangular extrusion) with 4 roof tops and per-floor color variation.

### Customization options

`BuildingSimulatorPanel`: floors (1–100), width (4–60m), depth (4–60m), facade material (color lookup), roof type, accent color, setback toggle.
`BuildingSimulator`: per-tool sliders (wall W/H/thickness, window/door size, stair steps/width, roof type), grid snap, floor level, material picker, object list with delete, JSON export.

### Texturing

Plain `MeshStandardMaterial` / `MeshLambertMaterial` with a single color. No textures, no UV mapping, no facade texture atlas, no normal maps. Glass uses `transparent: true, opacity: 0.5`. The "window strip" in `BuildingSimulatorPanel.buildFloor` is a single semi-transparent box plane on each of the front/back faces — not per-window cells.

### Layout placement

No procedural city layout exists in any reachable code path (the only thing wired to the App is per-building code, not city planning). `CityGenPanel`'s `generateCity` would have done it but is missing.

### Performance

`BuildingSimulatorPanel.build()` is O(floors) — 12 floors → ~14 meshes. Trivial. `BuildingSimulator` is also limited by manual click rate. Neither uses InstancedMesh — every wall/floor is its own draw call. With a city of even 50 buildings × 12 floors that's 600+ draw calls; would need merging. Since no city generator runs, this is moot at the moment.

### Integration with crowd / weather

None. Buildings do not appear in `CrowdSystem`'s collision space (no obstacle avoidance). Weather systems do not interact with rooftops. `BuildingSimulator` runs in its own renderer/scene and cannot share any other system's scene.

### Window lighting / details

Window strip is a static blue-tint translucent rectangle. No per-window emissive, no night-mode lit-window randomness, no signage, no AC units. `CityGeneratorPanel` (unmounted) UI exposes window density / balconies / signage / facade detail sliders — never wired.

### Architectural variety

Low. One extrusion shape, a few roof variants, color variation. Nothing distinguishes "Gothic Cathedral" from "Office Tower" in geometry. No spires, arches, columns, ornament, or curved facades.

### Known bugs / dead code

- No TODO/FIXME/HACK markers.
- **CRASH**: `components/generators/CityGenerator.jsx:1` only imports `useState, useRef` but `useEffect` is called at line 48 (preview-canvas mirror loop). When the user opens "City Gen" from the WORLD tab, React will throw `ReferenceError: useEffect is not defined`. This is the actively-mounted City panel — every demo opener for City Generator will crash.
- **MISSING MODULES**: `src/mesh/CityGenerator.js` and `src/mesh/BuildingGenerator.js` are referenced by `CityGenPanel.jsx` but do not exist. Build will break if anything imports `CityGenPanel`. Currently nothing imports it, so the runtime is unaffected — but the panel can never function.
- `BuildingSimulatorPanel.jsx:69` has `<div className="spnl-panel-hdr" className="spnl-panel-hdr">` — duplicate `className` attribute (React will warn).
- `CityGeneratorPanel.jsx`, `BuildingSimulatorPanel.jsx`, and `CrowdGeneratorPanel.jsx` each end with ~200 lines of empty `// ────` comment dividers — generator-template artifact.
- `BuildingSimulator.jsx` builds its own `THREE.WebGLRenderer` and never disposes textures/geometries on unmount — memory leak when panel closes; renderer is disposed but the scene's box geometries aren't.
- `BuildingSimulatorPanel.jsx`'s `build()` adds `AmbientLight` and `DirectionalLight` to the host scene every time the user clicks Build — light count grows by 2 per build until `clearBuilding()` is called.
- Apply-fn `open_city_gen` (App.jsx:4054), `open_building` (4055), `open_crowd_gen` (4059) all wired and reachable from the WORLD tab.

### Demo-readiness verdict: **RED**

The mounted "City Gen" tab opens a panel that will crash on mount due to the `useEffect` import bug. Even if it didn't crash, "Generate City" is a status-string stub with zero geometry. The mounted "Building Simulator" works, but it's a manual click-to-place tool inside a separate canvas — it cannot composite with the rest of the scene. The procedurally-correct `BuildingSimulatorPanel.jsx` and the elaborate `CityGeneratorPanel.jsx` exist but are dead imports. No actual city or skyline can be presented on stage from any reachable code path.

---

## Cross-feature integration

| Pair | Reality |
|------|---------|
| Crowd ↔ Buildings | **None.** Crowd boids only repel from a square boundary; buildings are not in any nav/obstacle structure. |
| Crowd ↔ Weather | **None.** No wind force on agents; no animation reaction; no umbrella/coat. |
| Buildings ↔ Weather | **None.** No water on roofs, no snow accumulation, no scene-fog harmony. The `BuildingSimulator` doesn't even share the same scene. |
| Sky/atmosphere ↔ Weather | Partial. `EnvironmentSystem` (out of audit scope) sets `scene.fog` and a procedural sky shader; weather panels also set `scene.fog` independently — they will fight. |
| Apply-fn shortcuts ↔ Systems | `weather_rain`/`weather_snow` create-but-don't-step; `open_city_gen` opens the crashing panel; `open_crowd_gen` opens the stub. |

The three systems are independent islands that don't know about each other.

## Most-impressive-on-stage

**Weather** (vfx WeatherPanel). It is the only one that actually produces visible procedural output through a mounted UI, with eight effect types and lightning. Hit Thunderstorm + Lightning + sandstorm preset and it looks plausibly cinematic. Crowd's good code is unreachable; Buildings has only the manual click-to-place simulator, and the procedural city tab crashes.
