# spx3dmesh2 — Initial Audit Summary

**Audit date**: 2026-05-08
**Branch**: main (clean)
**Latest commit**: 0a17021 (feat(parity): bezier-tolerant keyframe schema migration)
**Scope**: Read-only diagnostic — no code modified. Five parallel research agents covering 10 task areas.
**Companion files**: `repo_state.md`, `feature_inventory.md`, `how_to_run.md`, `priority_mocap.md`, `priority_3d_to_2d.md`, `priority_weather_crowd_building.md`, `secondary_features_audit.md`, `streampirex_integration_plan.md`, `known_issues.md`, `performance_notes.md`, `smoke_test_recipe.md`.

---

## Executive summary

`spx3dmesh2` ("SPX Mesh Editor") is a **mature, ambitious, browser-native 3D content suite** — Blender/ZBrush/Houdini scope in scale (~340 source files, ~180–200 user-facing features, 217 secondary feature inventory) with a **flagship 3D→2D cinematic pipeline** that is the strongest Techstars differentiator. The build is **95% impressive, 5% landmines** — the impressive surface is broad and real, the landmines are concentrated in three specific places (multi-person mocap, the mounted Crowd panel, and the City Gen tab) and are easy to hide before a demo. **Demo-readiness: GREEN with one critical pre-demo edit** (expand `VISIBLE_STYLES` in the 3D→2D panel) and ~5 toggles/tabs to hide. **Top recommendation**: do not attempt to fix the broken features before the pitch — hide them, lean on the generator suite + animation tools + weather + 3D→2D, and accept that mocap is single-person only.

---

## Priority feature status table

| Feature | Status | Demo-Ready | Time to Demo-Ready |
|---------|--------|------------|--------------------|
| **3D→2D conversion** (51 styles in engine) | WORKING — UI hides 31 working styles, surfaces 7 placeholders | **GREEN** with caveat | **1-line edit** to `VISIBLE_STYLES` |
| **Mocap (single-person live)** | WORKING end-to-end | **GREEN** (after hiding 3 toggles) | 5 min — hide Multi-Person, MiDaS, BVH Export |
| **Weather generator** | WORKING via `vfx/WeatherPanel.jsx` (8 effects) | **GREEN** (use the right panel) | 0 — already works |
| **Crowd generator** | Engine excellent, mounted UI is mockup | **RED** | Hide the panel; engine work = 1 day |
| **Building generator** | Mounted City Gen crashes on open | **RED** | 30-min fix (`useEffect` import) — or hide tab |

---

## Secondary feature status table

| Category | Total | Working | Partial | Broken/Stub |
|----------|-------|---------|---------|-------------|
| Generators (bird/fish/creature/etc.) | ~12 | 12 | 0 | 0 |
| Sculpting + primitives | ~20 | 18 | 2 | 0 |
| Animation (NLA, Motion Library, Walk Cycle, Graph, Constraints, Drivers, Geo Nodes) | ~25 | 18 | 6 | 1 (Onion Skin scaffold) |
| Import/Export (GLTF, FBX, OBJ, PNG seq, Alembic, USD) | ~10 | 6 | 2 | 2 (Alembic, USD) |
| Rendering (path tracer, rasterizer, NPR) | ~15 | 14 | 1 | 0 |
| Physics (Rapier, cloth, fluid) | ~10 | 8 | 2 | 0 |
| UI Editors (panels, workspaces) | ~105 | ~75 | ~25 | ~5 (incl. Crowd panel, City Gen tab) |
| Audio + misc tools | ~20 | 16 | 4 | 0 |
| **TOTALS (secondary, excluding 5 priority)** | **217** | **157 (72%)** | **56 (26%)** | **3 explicit stubs + ~5 broken mounts** |

---

## Demo readiness per feature (RED / YELLOW / GREEN)

### Priority

- **Mocap** — 🟢 **GREEN** for single-person live tracking. 🔴 RED for Multi-Person, MiDaS Depth, BVH Export — hide before stage.
- **3D→2D conversion**:
  - 🟢 GREEN: anime cel, cyberpunk neon, Studio Ghibli, posterize, sketch, ink, comic, NPR variants, all Mythic Ink (10), all Noir Panel (10), edge-detect variants — **31 working styles total** (hidden behind `VISIBLE_STYLES`)
  - 🔴 RED: oil, watercolor, cinematic, gouache, impressionist, linocut, risograph (fall through to default — return unstyled render)
  - 🟡 YELLOW: PNG sequence exporter manifest (works, but exports paths assume local filesystem)
- **Weather** — 🟢 GREEN: 8 effects through `vfx/WeatherPanel.jsx`. 🔴 RED: App.jsx-level weather buttons (never animate).
- **Crowd** — 🔴 RED across the board. Engine is good but no UI reaches it.
- **Building** — 🔴 RED — mounted panel crashes. 🟡 YELLOW for the isolated `BuildingSimulator.jsx` (works but can't composite).

### Other key features (sample)

- 🟢 Generators suite (bird/fish/quadruped/creature/eye/teeth/body)
- 🟢 Sculpt brushes (13 brushes)
- 🟢 Procedural primitives (gear, helix, staircase, arch, pipe)
- 🟢 NLA Panel + Motion Library + Walk Cycle Generator
- 🟢 Graph Editor (read-mostly v1)
- 🟢 Constraints UI / Drivers UI / Geometry Nodes UI (recent commits)
- 🟢 PNG sequence exporter with manifest
- 🟡 Path tracer (works but 4K × 2048 samples can stall page)
- 🟡 GPU sculpt / cloth (silent CPU fallback if no `navigator.gpu`)
- 🔴 Alembic export (`pending:true`)
- 🔴 USD export (`pending:true`)
- 🔴 ProMesh Undo (not implemented)
- 🔴 Modifier Stack params editor (coming soon)
- 🔴 Community Presets (hardcoded mocks)
- 🔴 Collaboration (mocked WebSocket)

---

## Integration complexity estimate (StreamPireX)

| Tier | Tasks | Complexity | Time |
|------|-------|------------|------|
| **Simple** | Deploy 4.1 MB `dist/` to `mesh.streampirex.com`, add iframe at `/mesh` route, JWT handoff via `localStorage['jwt-token']` | **S** | **1–2 days** — first "visible inside StreamPireX" |
| **Medium** | `POST /api/r2/upload` + `GET /api/r2/list?folder=meshes` on StreamPireX backend (editor side already coded in `StreamPireXBridge.js`); `postMessage` listener for SPX_MESH_READY → push to media library | **M** | **1 week** |
| **Hard** | ESM bundle integration (vs iframe), shared React context, ~250 `window.*` globals in App.jsx need namespacing or removal, React 19 + R3F 9 lockstep with main app | **L** | **2–4 weeks** |
| **Risky / deferred** | FBX/USD/Alembic conversion service (`/api/mesh/convert` doesn't exist), full state save/load to R2, multi-user collaboration | **XL** | **deferred to v2.0** |

**Total estimated time to full StreamPireX integration**: **L overall** — about 3–6 weeks for full embed, but **S for first useful demo** (1–2 days iframe path).

---

## Recommended smoke test order

1. **Phase 1 — startup** (5 min): `npm run dev`, console check, viewport renders
2. **Phase 2A — 3D→2D conversion** (10 min, the flagship): cycle through working presets, export PNG sequence
3. **Phase 2B — Mocap single-person** (10 min): camera → Y Bot → record → playback
4. **Phase 2C — Weather (vfx panel)** (5 min): thunderstorm + lightning, then blizzard
5. **Phase 3 — Generator sweep** (15 min): bird, fish, creature, walk cycle
6. **Phase 4 — End-to-end demo flow rehearsal** (15 min): the full pitch sequence in `smoke_test_recipe.md`
7. **DO NOT TEST**: City Gen tab (crashes), Crowd panel (no-op), Multi-Person mocap toggle (throws), MiDaS Depth toggle (silent fail), BVH Export (zeros), Alembic/USD export (pending), App-level weather_rain/snow buttons (broken animation)

---

## Top 5 risks for the demo

1. **City Gen tab on stage** → `useEffect` ReferenceError crashes the editor mid-pitch. **Mitigation**: hide the tab in the demo build, or stage-fix by adding `useEffect` to the imports (line 1 of `components/generators/CityGenerator.jsx`).
2. **A judge asks "where are the 41 styles?"** and sees a 20-tile grid — and clicks "Oil" which renders unstyled. **Mitigation**: expand `VISIBLE_STYLES` to surface the 31 hidden working styles before pitching.
3. **`VITE_BACKEND_URL` defaults to production Railway** if not set — dev work hits prod, demo on conference Wi-Fi may hit prod and surface real-user data. **Mitigation**: `.env.local` with `VITE_BACKEND_URL=` set explicitly to staging or localhost.
4. **Path tracer at 4K × 2048 samples can stall the page** if accidentally cranked up; combined with multiple WebGL renderers + 4096² shadow map → GPU saturation on weaker hardware. **Mitigation**: leave path tracer at default samples, close generator preview panels before live render.
5. **MediaPipe loaded from CDN** at runtime — if conference Wi-Fi blocks `cdn.jsdelivr.net` the entire mocap section dies. **Mitigation**: warm browser cache before going on stage, or self-host the MP scripts.

---

## Top 5 strengths to highlight

1. **3D→2D conversion is genuinely a differentiator** — once `VISIBLE_STYLES` is expanded, 30+ styles are real, varied, and one-click. The PNG sequence + manifest export pipeline is solid and lands directly in StreamPireX's content workflow.
2. **Generator suite produces real, varied output in seconds** — bird/fish/quadruped/creature/eye/teeth — each is a 20 KB self-contained panel with no backend, no setup. Visually impressive sweep on stage.
3. **NLA + Motion Library + Walk Cycle Generator + Graph Editor + Constraints/Drivers/Geometry Nodes UI** — the recent commits added a Blender-class animation pipeline. Anyone familiar with Blender will recognize it instantly.
4. **MediaPipe mocap drives a Mixamo Y Bot live from a webcam with no extra hardware** — face metrics (jaw, blinks, brow), pose, hands. Demo-able on a laptop.
5. **The whole thing runs in the browser** — Three.js + Vite 8 + React 19 + Rapier WASM + WebGPU (with silent fallback). 4.1 MB build artifact ready to deploy. No installer, no Electron required (though Electron host exists). Browser-native is the story.

---

## Recommended actions

### Quick wins (under 1 hour each)
1. **Edit `VISIBLE_STYLES` in `src/components/pipeline/SPX3DTo2DPanel.jsx`** to surface the 31 hidden working styles (Mythic Ink + Noir Panel packs especially) — converges UI with the pitched "41 styles" number. **1-line change**.
2. **Add `useEffect` to imports in `src/components/generators/CityGenerator.jsx`** (line 1) — turns the City Gen crash into a working-but-stub UI. Or hide the tab.
3. **Hide three Mocap toggles** (Multi-Person, MiDaS Depth, BVH Export) — comment out the JSX or gate behind `if (false)` until the underlying APIs are fixed.
4. **Create `.env.example`** with `VITE_BACKEND_URL=http://localhost:3000` and add a startup console warning if it's unset (defaults to prod) — protects future dev.
5. **Remove the four committed `App.jsx.bak_*` backup files** — repo hygiene.

### Medium fixes (1–4 hours each)
6. **Wire the existing `mesh/CrowdSystem.js` boids engine** into the mounted `ProceduralCrowdGenerator.jsx` Generate button (replace the `setTimeout` mockup with a real call). Engine is already excellent — just needs the 20-line bridge.
7. **Fix `App.jsx` `weather_rain`/`weather_snow` apply-fns** to call `stepWeather()` in a RAF loop. Current code creates the system but never animates it, leaks particles. Either route those buttons to the working `vfx/WeatherPanel.jsx` or finish the animation hookup.
8. **Replace 7 placeholder 3D→2D presets** (oil, watercolor, cinematic, gouache, impressionist, linocut, risograph) — each is a 30–60 line shader/postprocess addition; the engine framework is in place.
9. **Fix the 5,320-line `App.jsx` duplicate state declarations** — `groomBrushPanelOpen` (and others) declared twice; React's behavior is "last one wins" but the lint signal is real. Single-pass cleanup.
10. **Audit + fix the ~250 `window.*` global assignments** before any embed-as-ESM integration with StreamPireX. Today they work because the editor owns the page; in a sub-mounted React tree they will collide.

### Defer to v2.0 (4+ hours each)
11. **Mocap improvements**: implement real `MultiPersonMocap` (currently sine-wave simulator), real `DepthEstimator` (MiDaS API binding), real BVH export (currently writes zeros). Each is 1–3 days of work.
12. **Building generator**: implement the missing `mesh/CityGenerator.js` and `mesh/BuildingGenerator.js` files referenced by `CityGenPanel.jsx`. Or wire `BuildingSimulatorPanel.jsx` (parametric tower, exists in code) as the canonical building UI.
13. **FBX/USD/Alembic export backend**: `/api/mesh/convert` does not exist on StreamPireX backend. Needs a Blender-headless conversion service. Operationally heavy.
14. **GPU sculpt + GPU cloth + path tracer WebGPU paths** — currently silently fall back to CPU when `navigator.gpu` is absent. Either gate behind a "Requires WebGPU" warning or implement WebGL2 fallback paths.
15. **Performance pass**: central RAF scheduler instead of per-panel loops; LOD on instanced meshes; cap path tracer resolution × samples; dispose Three.js resources on panel close.

### Hide entirely (broken/stub — keep out of the demo build)
16. **Onion Skin scaffold class** (5 TODOs, 4 empty methods)
17. **`applySSR()` no-op** (just `console.info`)
18. **Modifier Stack params editor** ("coming soon")
19. **Geometry Nodes params editor** ("coming soon")
20. **Community Presets tab** (hardcoded mock data)
21. **Collaboration tab** (mocked WebSocket)
22. **ProMesh Undo button** (`title="not yet implemented"`)
23. **Shader Node Editor compile** (stub)

---

## Bottom line for Techstars pitch

The platform is **demonstrably real**. 217 secondary features, 31 working 3D→2D styles, working mocap, working weather, working procedural generators, working animation pipeline. The traps are concentrated and easy to remove from the demo path. **One 1-line edit** (`VISIBLE_STYLES`) does more for the pitch than any other action — it converges the surfaced style count toward the pitched number and removes the "where are the 41 styles?" objection. **Hide City Gen, hide Crowd, hide three Mocap toggles, hide stubs/coming-soons** — that's the entire pre-demo task list.

The integration into StreamPireX should happen **iframe-first** (1–2 days) rather than ESM-first (3–6 weeks). The R2 upload pipeline is already coded on the editor side — only the StreamPireX backend `/api/r2/upload` endpoint blocks the medium-tier integration. Get visible-in-app first, optimize embed later.
