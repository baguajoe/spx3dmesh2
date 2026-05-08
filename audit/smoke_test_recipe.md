# Smoke Test Recipe — spx3dmesh2

**Goal**: Step-by-step verification before the StreamPireX integration push and before any pitch demo. Synthesized from the parallel audit findings in this directory.

**Prereqs**:
- `npm install` completed
- Webcam accessible (for mocap tests)
- Modern browser with WebGL2 (Chrome/Edge preferred — Safari has WebGPU gaps that affect GPU sculpt / cloth / path tracer)
- ~4–8 GB free GPU memory recommended (path tracer + multiple preview renderers)

**Open dev server**: `npm run dev` → http://localhost:5173

---

## Phase 1 — Basic startup (5 min)

| Step | Action | Expected | Failure mode |
|------|--------|----------|--------------|
| 1.1 | `npm run dev` | Vite starts on `:5173`, no compile errors | Missing `VITE_BACKEND_URL` defaults to **production Railway** — set to a dev value or `http://localhost:3000` to avoid hitting prod |
| 1.2 | Open http://localhost:5173 | Editor shell loads, header + toolbar visible | Blank page → check console for `@mediapipe/*` import errors (CDN load) |
| 1.3 | Open DevTools console | No red errors on first paint | Yellow warnings about WebGPU absent are OK (silent fallback paths) |
| 1.4 | Verify 3D viewport renders | Default scene visible (grid + light) | Black canvas → WebGL context lost → reload, drop window size |
| 1.5 | Try View / Camera nav | Orbit + zoom + pan works | If frozen, check for stacked RAF loops |

---

## Phase 2 — Priority features (40–60 min)

### 2A — Mocap (single-person live, the only safe path)

**DO NOT TOUCH**: "Track multiple people" toggle (calls broken `MultiPersonMocap` constructor — throws), "MiDaS 3D depth" toggle (API mismatch, errors swallowed), "Export BVH" button (writes all-zero motion data).

| Step | Action | Expected |
|------|--------|----------|
| 2A.1 | Open Mocap workspace / panel | UI loads, "Start camera" visible |
| 2A.2 | Grant webcam permission | Live video preview overlaid with landmarks |
| 2A.3 | Wait for MediaPipe load (Pose + FaceMesh + Hands) | All 3 CDN scripts loaded — check Network tab |
| 2A.4 | Confirm Y Bot avatar appears | `/public/models/ybot.glb` loads, T-pose visible |
| 2A.5 | Move arms / open mouth / blink | Bot mirrors body pose; jaw opens; eyes blink |
| 2A.6 | Click Record | Status changes to recording |
| 2A.7 | Move for 5 sec, click Stop | Frame count > 0 |
| 2A.8 | Export JSON | File downloads, contains keyframe data (not zeros) |
| 2A.9 | Click Playback / scrub | Bot replays motion |

**Failure modes**: Camera blocked → red error overlay. Hands tracking flickers if arms below frame.

### 2B — 3D→2D Conversion (the pitch flagship)

| Step | Action | Expected |
|------|--------|----------|
| 2B.1 | Open `SPX3DTo2DPanel` | 20-tile style grid renders |
| 2B.2 | Load any test scene (default cube + light fine) | Scene visible in viewport |
| 2B.3 | Click "Cyberpunk Neon" preset | Canvas restyles in <2 sec |
| 2B.4 | Click "Studio Ghibli" preset | Cel-shaded render appears |
| 2B.5 | Click "Anime Cel" preset | Posterized look appears |
| 2B.6 | **AVOID demo-day**: "Oil", "Watercolor", "Cinematic", "Gouache", "Impressionist", "Linocut", "Risograph" — these fall through to `default:` and return the unstyled render |
| 2B.7 | Click "Render PNG sequence" | Manifest + frames written to disk |
| 2B.8 | Verify manifest JSON | Frame count + style metadata correct |

**Critical pre-demo task**: Edit `src/components/pipeline/SPX3DTo2DPanel.jsx` — expand `VISIBLE_STYLES` array to surface the 31 hidden-but-working styles (Mythic Ink + Noir Panel packs especially). One-line change.

### 2C — Weather Generator

| Step | Action | Expected |
|------|--------|----------|
| 2C.1 | Open the **vfx WeatherPanel** (the mounted one) | 8-effect grid: rain, snow, sandstorm, thunderstorm, blizzard, fog, hail, ash |
| 2C.2 | Click Thunderstorm | Particles + lightning toggle available |
| 2C.3 | Toggle Lightning | Periodic flashes |
| 2C.4 | Click "Heavy Blizzard" preset | Strong snow + fog atmospheric |
| 2C.5 | Switch to force-field tab | Wind direction/speed sliders work |

**DO NOT** hit the buttons in App.jsx labeled `weather_rain` / `weather_snow` (the broken App-level apply-fns that never call `stepWeather` — system leaks but never animates). Use the panel directly.

### 2D — Crowd Generator (RED — DO NOT DEMO)

The mounted `ProceduralCrowdGenerator.jsx` Generate button is a `setTimeout` that updates a status string and produces zero geometry. The good boids code in `mesh/CrowdSystem.js` is unreachable from the UI.

**Recommendation**: Hide the panel from the demo build, or do not open it on stage.

### 2E — Building Generator (RED — DO NOT OPEN)

The mounted `components/generators/CityGenerator.jsx` will throw `ReferenceError: useEffect is not defined` on open (line 1 imports `useState, useRef` only; line 48 uses `useEffect`).

**Recommendation**: Hide the City Gen tab from the demo build. The `BuildingSimulator.jsx` works but runs in an isolated WebGLRenderer/scene — manual click-to-place tools, cannot composite with main scene.

---

## Phase 3 — Secondary features (30 min)

Pick from the 94 Demo-GREEN secondary features. Suggested high-impact sweep:

### Generators suite (12 min)
- **Bird Generator** — variety of avian forms, GLB-ready
- **Fish Generator** — different species
- **Quadruped Generator** — body proportions
- **Creature Generator** — fantasy hybrids
- **Eye Generator + Teeth Generator** — character detailing

Each is self-contained; produces mesh in seconds.

### Sculpting + primitives (8 min)
- 13 brushes: draw, clay, smooth, crease, flatten, inflate, grab, mask, pinch, polish, sharpen, elastic
- Procedural primitives: gear, helix, staircase, arch, pipe

### Animation (10 min)
- **NLA Panel** — Blender-style action/track/strip workflow with bake (recent commit f7626af)
- **Motion Library** — real BVH clip browser
- **Walk Cycle Generator** — procedural walk/idle/breathing on any rigged armature
- **Graph Editor** — read-mostly v1, list/jump/delete keyframes (commit 04b131d)
- **Constraints UI** + **Drivers UI** + **Geometry Nodes UI** (recent commits)

**Avoid in demo**: "Modifier Stack" + "Geometry Nodes" params editor (UI says "coming soon"), Alembic/USD export (`pending:true` returns), Shader Node Editor compile (stub), ProMesh Undo (`title="not yet implemented"`), "Community Presets" (hardcoded mock data), Collaboration tab (mocked WebSocket).

---

## Phase 4 — End-to-end demo flow (15 min)

The complete pitch sequence — sequenced to avoid every landmine identified above.

### Pre-demo prep (one-time, 30 min before pitch)
1. Set `VITE_BACKEND_URL=http://localhost:3000` (or staging) to avoid hitting prod
2. Edit `SPX3DTo2DPanel.jsx` — expand `VISIBLE_STYLES` to include the Mythic Ink + Noir Panel packs (one-line array change)
3. Hide or remove from menu: Multi-Person Mocap toggle, MiDaS Depth toggle, BVH Export button, Crowd panel, City Gen tab, App-level weather_rain/weather_snow buttons
4. Pre-load: Y Bot model, sample test scene, MediaPipe scripts (warm browser cache)

### Live demo sequence (8 min on stage)

| # | Action | Talking point |
|---|--------|---------------|
| 1 | Open editor | "Browser-native 3D content suite" |
| 2 | Show default scene | "Three.js + WebGPU under the hood" |
| 3 | **Generator sweep** — drop a bird, fish, creature in 30 sec | "200+ procedural systems" |
| 4 | Open Walk Cycle Generator → apply to character | "Procedural animation, no rigging knowledge needed" |
| 5 | Open vfx WeatherPanel → Thunderstorm + Lightning | "Real-time atmospherics" |
| 6 | Open Mocap → camera on → drive Y Bot | "MediaPipe live mocap, no special hardware" |
| 7 | **The flagship moment**: Open SPX3DTo2DPanel → cycle 4–5 styles | "30+ cinematic styles, one click" |
| 8 | Click Render PNG sequence → show manifest | "Direct handoff to StreamPireX as 2D content" |

Total flow tests: scene → generators → animation → weather → mocap → 3D→2D → export. Every step exercises a different system; every step has been confirmed reachable in the audit.

---

## Quick reference — features to AVOID on stage

| Feature | Why | What happens |
|---------|-----|--------------|
| Multi-Person Mocap toggle | Stub + wrong constructor call | Throws error |
| MiDaS Depth toggle | API mismatch | Silent failure (try/catch swallows) |
| BVH Export button | Writes all zeros | File looks valid, plays as static T-pose |
| Crowd panel (mounted) | UI mockup | Generate button does nothing |
| City Gen tab | Missing `useEffect` import | Crash on open |
| App.jsx weather_rain/snow buttons | Never call `stepWeather` | System leaks, never animates |
| 7 placeholder 3D→2D styles | Fall through to default | Shows unstyled render |
| Modifier Stack params | "Coming soon" | UI says it |
| Geometry Nodes params editor | "Coming soon" | UI says it |
| Alembic / USD export | Returns `pending:true` | No file written |
| ProMesh Undo | Title="not yet implemented" | Hover reveals |
| Community Presets tab | Hardcoded mock data | Looks real, isn't |
| Collaboration tab | Mock WebSocket | Looks live, isn't |

---

## Console error triage during smoke test

| Symptom | Likely cause |
|---------|--------------|
| `@mediapipe/* not found` | CDN script blocked or `LiveMoCapAvatar.jsx` (legacy/dead) accidentally loaded |
| `useEffect is not defined` | City Gen tab opened — close immediately |
| `mp.start is not a function` | Multi-Person Mocap toggle hit |
| Black viewport mid-demo | WebGL context lost → too many renderers (close preview panels), or path tracer at 4K hung |
| Frame rate tank | Multiple panels with their own RAF loops; close unused panels |
| Network tab shows production URL | `VITE_BACKEND_URL` not set — kill server, set env, restart |
