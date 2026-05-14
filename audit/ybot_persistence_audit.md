# Y-Bot Persistence Audit — Why imported GLBs render as Y-Bot regardless of file

Date: 2026-05-09
Scope: Read-only audit of why every imported Mixamo GLB looks like
Y-Bot in T-pose in the SPX MESH editor, even though the file in
Blender / gltf-viewer renders the actual content correctly.
Constraint: no code changes, inventory only.

---

## What Y-Bot is

- File on disk: `/workspaces/spx3dmesh2/public/models/ybot.glb`
- Size: 3,007,692 bytes (≈ 3 MB).
- Served at `/models/ybot.glb` by the dev server.
- It is a **Mixamo "Y" avatar** GLB — the female bot rig used by
  Mixamo for animation downloads.
- Inside the file: a standard Mixamo skeleton with `mixamorig:Hips`
  root bone and the canonical Mixamo bone names referenced at
  `src/front/js/component/AvatarRigPlayer3D.jsx:30-60`. The skinned
  mesh hierarchy uses Mixamo's stock body part naming
  (`Alpha_Joints`, `Alpha_Surface`).
- **CRITICAL OBSERVATION**: `/workspaces/spx3dmesh2/public/models/`
  contains *only* `ybot.glb`. The DEFAULT_URLS list in App.jsx and
  the Model Picker reference `/models/michelle.glb` and
  `/models/xbot.glb`, but **those files don't exist in the repo**.
  Any code path that loads them would 404. This means in practice
  the only character file the editor can load from disk is Y-Bot.

---

## All places Y-Bot is referenced

### Hard-coded `/models/ybot.glb` URL
| File | Line | What it does |
|---|---|---|
| `src/App.jsx` | 2330 | DEFAULT_URLS list (used by `loadModelToScene` to dedup built-ins on import) |
| `src/App.jsx` | 2457 | `ensureWorkspaceMesh` "rigging" default — **fires loadModelToScene on Rigging workspace tool click** |
| `src/App.jsx` | 5117 | Model Picker button (Y Bot) — fires loadModelToScene on click |
| `src/front/js/component/AvatarRigPlayer3D.jsx` | 144, 461 | Fallback URL when `avatarUrl` prop missing — only for the **separate** mocap scene, NOT main editor |
| `src/workspaces/mocap/MocapWorkspace.jsx` | 160, 530, 630 | `useState('/models/ybot.glb')` — only mounts when MocapWorkspace.open=true (initially false) |
| `src/front/js/component/MotionCaptureSystem.jsx` | 20 | `'/static/models/Y_Bot.glb'` default — **not imported by App.jsx**, lives in `/front/` standalone tree |
| `src/front/js/component/VideoMocapSystem.jsx` | 19 | comment only |
| `src/pro-ui/workspaceMap.js` | 52 | `avatar_ybot` toolId for SPXPerformance workspace |

### Y-Bot label / "Y Bot" text
- `src/App.jsx:2457` — "Y Bot Rig" label for rigging workspace.
- `src/App.jsx:4065` — `avatar_ybot` dispatcher: opens MocapWorkspace, sets status "Y Bot avatar loaded". Does NOT load a mesh.
- `src/App.jsx:5117` — Model Picker button label "Y Bot".
- `src/components/panels/CharacterTargetingPanel.jsx:163` — instruction text.
- Mixamo bone-name dictionaries — match-by-name lookup tables, not mesh-substitution.

### `/static/models/Y_Bot.glb` (uppercase, served by separate Flask backend, unrelated to main editor)
- `src/front/js/component/MotionCaptureSystem.jsx:20`
- `src/front/js/component/VideoMocapSystem.jsx:19` (comment)
- These belong to the standalone `/front/` mocap tree and are not
  reachable from App.jsx's import flow.

### What's NOT in the repo
- No "ybot mesh template" / "base armature" file
- No JSON/data file with hardcoded Y-Bot geometry
- No "applyYBotSkeleton" function
- No `cloneMesh`, `replaceMesh`, `swapMesh`, `substituteMesh`
- No place where Y-Bot's geometry is copied into another model
- `/public/models/michelle.glb` and `/public/models/xbot.glb` don't exist

---

## The full GLB import pipeline (post Fix 1.7 / commit `f368e56`)

1. **User clicks File → Import GLB** (top menubar)
   → `ProfessionalShell.jsx` MenuDropdown → `onMenuAction("importGLB")`
   → `App.jsx:3168` `handleApplyFunction("importGLB", undefined)`

2. **Dispatcher branch (App.jsx:3167-3176)**
   → no-arg branch creates `<input type="file" accept=".glb,.gltf">`,
     calls `input.click()`. User picks file.
   → onchange fires with the File object. Recurses
     `handleApplyFunction("importGLB", file)`.

3. **Dispatcher arg-path → `importGLB(file)`** (App.jsx:500-554)
   - Dynamic import GLTFLoader.
   - Bail if no scene.
   - `clearOverlays()` — wipes vert/edge/face overlay refs.
   - **Cleanup pass** (App.jsx:506-525): collects every scene root
     child that isn't infrastructure (lights / GridHelper / AxesHelper
     / LineSegments / `userData.isHelper` / `userData._spxInfrastructure`),
     calls `scene.remove(c)`, syncs sceneObjects.
   - `URL.createObjectURL(file)` — unique blob URL per call.
   - `new GLTFLoader().load(url, callback, undefined, errCallback)`
     — async.

4. **GLTFLoader callback fires** (App.jsx:529-548)
   - `gltf.scene.animations = gltf.animations || []` — copy clip array.
   - `label = file.name.replace(/\.[^.]+$/, "")`.
   - **`_addLoadedModelToScene(gltf.scene, { label, type: "glb", fileName: file.name })`**.
   - Half-edge build: traverse `gltf.scene`, find first `isMesh`,
     build `HalfEdgeMesh.fromBufferGeometry(child.geometry)`.
   - `setStatus(`Imported ${file.name}`)`.
   - `URL.revokeObjectURL(url)`.

5. **`_addLoadedModelToScene` (App.jsx:2391-2425)**
   - `model.name = label`.
   - `scene.add(model)` — direct child of main scene.
   - `model.updateMatrixWorld(true)` — propagate transforms.
   - Box3 measure → conditional auto-fit (scale 2/maxDim, ground at y=0)
     when `maxDim < 0.5 || maxDim > 10`.
   - `createSceneObject(type, label, model)` (SceneManager.js:26-37).
   - `obj.userData = { url: fileName, hasAnimations: ... }`.
   - `setSceneObjects(prev => [...prev, obj])`.
   - `setActiveObjId(obj.id)`.
   - `meshRef.current = model`.
   - `heMeshRef.current = null`.

**That is the entire chain.** No other functions are invoked. No
auto-rig, no retargeting, no skin transfer, no mesh substitution.
The model passed to `_addLoadedModelToScene` IS `gltf.scene` from the
picked file — by-reference, no clone, no swap.

---

## Auto-effects that fire on import

**None.** I checked exhaustively:

- No `useEffect` in App.jsx watches `sceneObjects` / `meshRef.current` /
  `activeObjId` for triggering auto-rig / retarget / mesh
  modification on add. (Effects exist but they're for things like
  syncing refs, keyboard handlers, etc.)
- No `setTimeout` / `setInterval` re-adds models after import.
- No CustomEvent listener fires on import.
- `runAutoRig` (`src/mesh/rig/AutoRigSystem.js:228-249`) is the only
  function in the codebase that does mesh substitution
  (`mesh.parent?.add(skinned); mesh.visible = false`), but it's
  invoked **only** from the AutoRigPanel "Build Auto Rig From Guides"
  button (`src/components/rig/AutoRigPanel.jsx:48-62`). User has to
  open AutoRig panel and click Build.
- `MocapRetargetPanel`, `AdvancedRigPanel`, `AutoRigPanel` — all
  `open` -gated and only mount on demand. Initial state false for all.
- `BaseModelLibraryPanel` (which contains the 7-mesh primitive
  humanoid `buildQuickMesh`) — **defined but never imported into
  App.jsx**. Cannot be the source.
- `AvatarRigPlayer3D` — creates its OWN Three.js scene
  (`window.__mocapScene`), never adds to `window.__spxScene`. Even if
  somehow active, it can't pollute the main scene.
- No custom `scene.add` override, no `onBeforeRender` hook injecting
  Y-Bot, no render-pass override.
- No `SkeletonHelper` / `BoneHelper` (`new THREE.SkeletonHelper`) anywhere
  in the codebase. Bone helpers in `loadModelToScene` (App.jsx:2342)
  are tiny orange spheres parented to bones inside the loaded model
  — they ride with the parent and are not Y-Bot-shaped overlays.
- No "skin transfer" / "retargeting" / "T-pose normalization" code
  fires on plain GLB import.

---

## The strong hypothesis (ranked #1, very likely the actual answer)

### **The imported file IS rendering correctly. It just happens to be the same Y-Bot avatar as the rigging workspace default.**

Mixamo distributes a single avatar (Y-Bot) and a library of
animations. When a user goes to `mixamo.com`, picks the Y-Bot
character, and downloads "Hip-Hop Dancing", "Swinging", "Idle" — every
download contains:
- The **same Y-Bot mesh geometry** (`Alpha_Joints`, `Alpha_Surface`).
- The **same Y-Bot skeleton** (mixamorig:Hips etc.).
- A **different baked AnimationClip** (the actual hip-hop / swing /
  idle motion).

Two facts make this hypothesis decisive:
1. The user's DevTools snapshot showed mesh names `Alpha_Joints` and
   `Alpha_Surface` inside the imported Swinging.glb. These are
   the canonical Mixamo Y-Bot mesh names. (Confirmed: those strings
   don't exist anywhere in the codebase, so the editor is not
   inserting them — they are inside the user's GLB file.)
2. **Animation playback is not wired up.** The audit at
   `audit/editor_bugs_audit.md` Symptom 2 documents this in detail.
   `App.jsx:166` imports `createMixer, playClip` from
   `SkinningSystem.js` — but they are **never called** anywhere.
   The playback loop at `App.jsx:1402-1413` only ticks
   `currentFrame`. The animate loop at `App.jsx:1782-1810` does NOT
   call `mixer.update(dt)`. Without a mixer driving the clip, the
   skinned mesh stays in its **bind pose** (T-pose) forever.

### What the user is seeing

- In Blender / gltf-viewer: the embedded `Swinging` clip plays. The
  Y-Bot avatar moves through the swing motion. The user sees a
  swinging humanoid.
- In our editor: the Y-Bot avatar loads correctly. No mixer plays the
  clip. The skinned mesh stays in T-pose. The user sees Y-Bot in
  T-pose.

The geometry is identical between Blender and the editor — same Y-Bot
mesh. The pose differs because Blender plays the animation and we
don't.

### Why "regardless of which file imports"

Every Mixamo download with the Y-Bot avatar contains the same Y-Bot
geometry. Hip-Hop Dancing + Y-Bot avatar → identical mesh to Swinging
+ Y-Bot avatar. Different clips, same mesh. With no playback, all
look the same.

### Why DevTools shows the right meshes but renders look wrong

DevTools shows the file's `Alpha_Joints` / `Alpha_Surface` SkinnedMesh
nodes — they ARE there, ARE in the scene. The renderer draws them
correctly *for their current bone pose*. The bone pose is bind-pose
(T) because nobody ever calls `mixer.update`.

---

## Other hypotheses (ranked, lower likelihood)

### #2 — Race against an in-flight `loadModelToScene`
Already covered in the earlier diagnostic. After Fix 1.7
(`f368e56`'s aggressive cleanup), the cleanup runs at
`importGLB`-call time — but if a `loadModelToScene("/models/ybot.glb")`
is already in flight from an earlier workspace switch, its callback
can still fire AFTER cleanup and add Y-Bot to the scene next to the
imported model. This would produce a real two-character situation,
which contradicts the user's most recent DevTools snapshot showing
"only 1" character. So the race is possible but doesn't match the
observed scene state.

### #3 — Stale `meshRef.current` pointing at Y-Bot
`meshRef.current` is updated to the new model inside
`_addLoadedModelToScene` (App.jsx:2418). If something else holds an
older reference (boneHelpersRef, gizmo target, panel-internal ref)
and re-renders that mesh, the user could see Y-Bot. But: the renderer
draws scene.children, not refs. Refs would only matter if a panel
explicitly re-adds them to the scene (none do).

### #4 — Bone helpers from a previous Y-Bot load surviving cleanup
Bone helpers are parented to bones inside Y-Bot. When the parent Y-Bot
Group is removed by Fix 1.7's cleanup, the helpers go with it — they
are detached from the scene tree. `boneHelpersRef.current` array still
holds JS references but they're not rendered (parent is detached).
Not a likely cause.

### #5 — GLTFLoader cache returning wrong mesh
Three.js Cache is keyed by URL. Blob URLs are unique per
`URL.createObjectURL` call. No collision possible.
**Effectively impossible.**

---

## Recommended next diagnostic

**ONE specific test that discriminates between hypotheses #1 and #2-5.**

Open Blender. Open Mixamo Swinging.glb. Manually scrub to **frame 0
only** (don't play the animation). Take a screenshot.

Then in the editor: File → Import GLB → Swinging.glb. Take a
screenshot.

Compare the two screenshots side by side.

- **If they match** (identical Y-Bot in T-pose at frame 0): Hypothesis
  #1 confirmed. The "bug" is that we don't play animations. Fix is
  to wire the AnimationMixer (Fix 3 in the existing roadmap). All the
  GLB import work tonight has been correct; the visible result was
  always going to be a static T-pose because Mixamo files start in
  bind pose and we never advance the mixer.
- **If they differ** (Blender frame 0 shows e.g. half-swing or
  authoring offset, but editor shows different geometry / pose):
  there's actually a substitution / leftover happening. We then
  follow up with hypotheses #2-5.

If the user can't open Blender, the cheaper test is to download
Mixamo's "T-Pose" animation with the Y-Bot avatar
(`mixamo.com → search "T-Pose" → Y-Bot`). Import THAT file. If the
editor renders the same Y-Bot in T-pose, it confirms #1 — because
the file IS Y-Bot in T-pose, deliberately.

---

## Summary inventory

- Y-Bot file: `public/models/ybot.glb` (3 MB, Mixamo Y avatar).
- 11 reference sites in src, all either:
  - inert (labels, dispatcher status strings, comments)
  - user-triggered (`Model Picker`, `Rigging` workspace tool)
  - or in code paths gated behind `open===false` props
    (`MocapWorkspace`, `AutoRigPanel`).
- GLB import pipeline: 5 steps, no auto-effects, no substitution.
- No fallback / template / placeholder / stub Y-Bot mesh anywhere
  in the codebase.
- Animation playback for embedded GLB clips is **not implemented**
  (`createMixer` / `playClip` imported but never invoked,
  `mixer.update` never in any loop).
- The user's "every file looks like Y-Bot" observation matches
  exactly with: every Mixamo download is Y-Bot mesh + a different
  unplayed clip.

The editor is doing exactly what its current code prescribes. The
gap between user expectation (animated swing) and reality (static
T-pose) is the unplayed animation. Fix 3 closes that gap.
