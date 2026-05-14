# SPX MESH Editor — Read-Only Bug Audit

Date: 2026-05-08
Scope: 4 reported symptoms in the running editor (Y-Bot scene loaded
in the codespace dev server). No code changes performed.

---

## Symptom 1 — Top menu bar items don't fire actions

### Root cause

The menu bar wiring (JSX → state → dispatcher) is **structurally
intact**, but several File-menu items in `handleApplyFunction` have a
broken contract: they require an `arg` that the menu never supplies.

Trace:
1. `src/pro-ui/ProfessionalShell.jsx:230` — dropdown item button
   `onClick={() => { onAction(item.fn); setOpen(false); }}` — only the
   `fn` string is sent, no `arg`.
2. `src/pro-ui/ProfessionalShell.jsx:261` — `onAction={(fn) =>
   onMenuAction?.(fn)}` — still no arg.
3. `src/App.jsx:4283` — `onMenuAction={handleApplyFunction}` — passes
   the dispatcher as the menu callback.
4. `src/App.jsx:3128` — dispatcher branch:
   `if (fn === "importGLB") { if (arg) importGLB(arg); return; }`
   With `arg` undefined this **silently returns** — no file picker is
   opened, no error, no status update.

Same broken pattern applies to:
- `importGLB` (`App.jsx:3128`) — needs arg, returns silently.
- `importSpxScene` (`App.jsx:3125`) — needs arg, returns silently.
- `importOBJ` (`App.jsx:3129`) — only sets a hint status.
- `importFBX` (`App.jsx:3130`) — only sets a hint status.

Items that **do work** mechanically when clicked from the menu but may
appear "dead" because the visible result is subtle or empty:
- `newScene` (`App.jsx:3137`) — empties `sceneObjects` and removes
  their meshes. Y-Bot sits in `sceneObjects` (added at `App.jsx:2351`),
  so this should remove it. If user perceived no change, see Symptom
  3 — `meshRef.current` is left pointing at a removed model and any
  bone helpers parented to bones inside the gltf hierarchy remain in
  memory.
- `exportSpxScene` (`App.jsx:3124,1135`) — triggers an actual JSON
  download via a temporary `<a>` element; the user may have missed the
  browser-level download notification.
- `undo` (`App.jsx:3141,2270`) — operates only on the half-edge mesh
  history stack (primitive edits). Loading a GLB doesn't push
  history, so undo on a freshly-imported Y-Bot is a no-op.
- `prim_*` (`App.jsx:3158`) — calls `addPrimitive(type)`. Should work.

### Severity
DEMO RISK (not BLOCKER) — the model-picker "Upload Custom GLB" path
(`App.jsx:4977-4988`) bypasses the menu and works for GLB import. But
File→Import GLB being dead is a high-visibility quality issue if the
audience explores the menu bar.

### Estimated complexity
S — for the four broken Import items, the fix is to open a programmatic
`<input type="file">` inside the dispatcher branch (the same trick used
at `App.jsx:3308` for HDRI import). ~30 min.

### Shared root cause with other symptoms?
No — independent. The broken contract here is specific to dispatcher
branches that expected the caller to pass a File. Symptoms 2 and 3 are
unrelated systems with their own root causes.

### Recommended fix approach
In `handleApplyFunction`, replace the `if (arg) importGLB(arg)` style
guards for `importGLB` / `importOBJ` / `importFBX` / `importSpxScene`
with code that creates an `<input type="file">`, sets the right
accept filter, calls `.click()`, and on `onchange` invokes the existing
loader. This pattern already lives in the codebase
(`App.jsx:3308-3322` for `hdri_from_file`) — copy and adapt. While
there, audit the rest of the dispatcher for other branches that
silently no-op on missing arg.

---

## Symptom 2 — Uploaded GLB animations don't play

### Root cause

**There is no `THREE.AnimationMixer` anywhere in `App.jsx`**, and
`gltf.animations[]` is never read. Mixamo clips are loaded into memory
by GLTFLoader but discarded. Pressing the timeline play button only
advances a frame counter; nothing reads the GLTF clip data.

Evidence:
- `src/App.jsx:166` imports `createMixer, playClip` from
  `./mesh/SkinningSystem.js` — these helpers exist but a global grep
  shows they are **never invoked** anywhere in `App.jsx`. The only
  other usages are the function definitions themselves
  (`SkinningSystem.js:358`).
- `loadModelToScene` (`App.jsx:2297-2357`) — the success callback
  receives the full `gltf` object, but only reads `gltf.scene`. It
  parents bone helpers, auto-fits scale, registers the model in
  `sceneObjects`. It **does not** create a mixer, does not call
  `clipAction(clip).play()`, and does not store any clip reference on
  the model.
- The single-purpose `importGLB` at `App.jsx:500-527` (used by the
  MeshEditorPanel "Import GLB" button — different code path from the
  menu item) has the same omission.
- Playback loop at `App.jsx:1384-1394`:
  ```
  if (isPlaying) {
    interval = setInterval(() => {
      setCurrentFrame((prev) => (prev >= 250 ? 0 : prev + 1));
    }, 1000 / 24);
  }
  ```
  Frame counter only. No `mixer.update(dt)`.
- The render loop `animate()` at `App.jsx:1771-1798` does not call any
  mixer.update either. The only loop-side animation work is gizmo
  scale and the renderer.render call.
- The "frame change" effect at `App.jsx:1402-1487` is a Blender-style
  evaluator that walks `window.animationData` (manually-keyframed
  position/rotation/scale per object). It is unrelated to GLTF clip
  data.

This explains the user's observation: the file is good (gltf-viewer
plays it), it imports as a Mesh in the scene (mesh ID assigned), the
frame counter advances when Play is pressed (the setInterval works),
but the character stays in rest pose because nothing is binding the
clip to the SkinnedMesh's bones.

The same issue applies to **built-in** Y-Bot if you tried to play its
embedded animation — it goes through the same `loadModelToScene` path,
so its clips would also be discarded.

### Severity
DEMO BLOCKER if the demo includes animation playback for character
GLBs. If the demo only shows static character poses, this drops to
DEMO RISK.

### Estimated complexity
M — needs a small subsystem, not a one-line fix. Approximate work:
- Add `mixerRef = useRef(null)` and (optionally) `actionsRef`.
- In `loadModelToScene` after `meshRef.current = model`, create
  `mixerRef.current = new THREE.AnimationMixer(model)` and for each
  `clip` in `gltf.animations` call `mixerRef.current.clipAction(clip).play()`
  (or store actions and play the first one). Track previous mixer to
  dispose when reloading.
- In the `animate()` render loop add `mixerRef.current?.update(dt)`,
  computing dt via a `THREE.Clock`.
- Gate updates on `isPlaying` if the play/pause button should control
  clip playback (otherwise mix-and-go).
- Disconnect the bone-helper sphere cloning when a SkinnedMesh is
  going to be driven by a clip — bones will move and helpers track,
  which is fine, but make sure mixer fires before render.
~1-2 hours including verification with the user's Mixamo file.

### Shared root cause with other symptoms?
No — this is a missing system, not an off-by-one wiring bug. Independent
from menu and deletion.

### Recommended fix approach
Add a mixer subsystem in `App.jsx`. Reuse the existing imports of
`createMixer` / `playClip` from `SkinningSystem.js` if their API
matches; otherwise call `THREE.AnimationMixer` directly. The single
critical insertion point is `loadModelToScene` — after the model is
parented, iterate `gltf.animations` and create actions. Add one
`mixer.update(dt)` line at the top of the render loop's non-paused
branch.

---

## Symptom 3 — Y-Bot cannot be deleted

### Root cause

There is no explicit "protect built-in models" check. The bug is an
**identity-confusion bug** between two object-id schemes that are used
interchangeably across the delete code paths. SkinnedMesh hierarchies
expose this; flat primitives accidentally hide it.

Evidence:
- `loadModelToScene` (`App.jsx:2349-2352`) registers the model with
  `id: Date.now()` (a **numeric** id) and calls `setActiveObjId(id)`.
  Good so far.
- `App.jsx:1619-1625` — an effect overwrites that id whenever
  `selectedObject` (a Three.js object reference, set by viewport
  raycast) changes:
  ```
  useEffect(() => {
    if (selectedObject) setActiveObjId(selectedObject.uuid);
    else setActiveObjId(null);
  }, [selectedObject]);
  ```
  After the first viewport click, `activeObjId` is no longer the
  numeric Date.now() id — it's a Three.js UUID string.
- `deleteSceneObject` (`App.jsx:960-973`) looks up via `find(o => o.id === id)`.
  With `id` now a Three.js UUID string but `sceneObjects[i].id` a
  number, the lookup **fails**. `obj` is undefined, so the
  `sceneRef.current?.remove(obj.mesh)` line is skipped. The
  `setSceneObjects` filter still removes any entry with matching id,
  but there is no match — so nothing is removed.
- The 'x'/'X' shortcut path at `App.jsx:2218-2220` and Edit→Delete
  menu at `App.jsx:3145` both call `deleteSceneObject(activeObjId)`,
  so both fail the same way after a viewport click on Y-Bot.
- The Delete/Backspace path at `App.jsx:1511-1513` calls
  `window.deleteSelected()` (`App.jsx:1521-1530`):
  ```
  if (selectedObject.parent) selectedObject.parent.remove(selectedObject);
  setSceneObjects(prev => prev.filter(o => o.uuid !== selectedObject.uuid));
  ```
  `o.uuid` is undefined on every entry (sceneObjects entries have `id`,
  not `uuid`), so the filter keeps everything. Visually,
  `parent.remove(selectedObject)` only unparents the specific Three.js
  node that was raycast-picked — for a SkinnedMesh hierarchy under
  `gltf.scene`, that is typically a single child mesh, leaving the rest
  of the model rendered.

Why primitives appear to delete correctly:
- Primitives are simple `THREE.Mesh` objects with no nested children.
- Raycast on a primitive returns the primitive itself; `parent.remove`
  removes the whole primitive from the scene, so the user sees it
  vanish.
- The `sceneObjects` filter still keeps the dangling entry (the
  `o.uuid` mismatch applies to primitives too), so the outliner could
  show a phantom row — but if the user only checks the viewport, it
  looks like a successful delete.

So the user's observation that "primitives delete, Y-Bot doesn't" is
the visible tip of a single iceberg: deletion is broken for everything
in the data layer; it just happens to look right for flat single-mesh
primitives.

### Severity
DEMO RISK — the user almost certainly will try to swap Y-Bot for a
custom upload during the demo and find Y-Bot won't go away.

### Estimated complexity
M — multiple small fixes, all in `App.jsx`:
1. Stop the auto-overwrite of `activeObjId` from `selectedObject.uuid`
   (`App.jsx:1619-1625`). Either remove that effect, or store the
   three.js uuid in a separate state (`selectedObjUUID`) and keep
   `activeObjId` strictly the sceneObjects.id.
2. Fix `window.deleteSelected` (`App.jsx:1521-1530`) to filter
   sceneObjects by matching `o.mesh === selectedObject` (or the model
   root) instead of by uuid.
3. In viewport click selection logic, when raycast hits a child of a
   gltf hierarchy, walk up to the registered sceneObjects entry's
   `mesh` (the gltf root) and select that — so Delete removes the
   whole model, not a body part.
~1-2 hours.

### Shared root cause with other symptoms?
Partially — same family of bug as Symptom 1 (the "wiring built but
contract mismatched" pattern the user noted from the 3D→2D panel
work). Specifically, sceneObjects.id (numeric) vs Three.js uuid
(string) are conflated in three places:
- `App.jsx:1621` — overwrites activeObjId with uuid
- `App.jsx:1526` — filters by `o.uuid` which doesn't exist
- `App.jsx:960` — finds by `o.id` after the type was switched

But it is independent of Symptoms 1 and 2 in terms of mechanism — they
are different broken contracts in different subsystems.

### Recommended fix approach
Pick one canonical id scheme. The cleanest is: keep
`sceneObjects[i].id` as the only "scene-object id", and store the
three.js uuid only on `mesh.uuid` if needed. Decouple the
`selectedObject` Three.js reference from `activeObjId` — they are
different concerns. Then re-test viewport-click → Delete on Y-Bot,
primitives, and a generic uploaded GLB.

---

## Symptom 4 — Shared root cause / global wiring issues

### Root cause analysis

There is **no single global guard or flag** that disables all four
symptoms. I checked:

- `window.__spxFullscreenOpen` (the guard found earlier today) is
  set in the effect at `App.jsx:4269-4276` and consumed only inside
  the `animate()` render loop at `App.jsx:1771-1778`. It pauses the
  3D render but does not gate any input handlers, dispatcher branches,
  or React event delivery. It is unrelated to the menu, animation
  playback, and deletion symptoms.
- `React.StrictMode` is active in `src/main.jsx`. StrictMode
  double-mounts in dev, but the menu wiring uses plain React state
  and event handlers (no manual subscription that needs explicit
  cleanup), so this does not produce the menu-dead behavior.
- HMR could leave orphaned listeners if a useEffect didn't return a
  cleanup. Several effects in `App.jsx` (e.g. `App.jsx:549, 619, 642,
  657, 672, 744, 759, 777, 792, 807, 822, 1291, 1391`) return `() => {}`
  empty cleanup, which is a code smell — but the listeners they add
  are scene/keyboard listeners that don't gate menus. Still worth
  noting as a separate audit item once these four are fixed; a fresh
  hard reload should reset state if HMR ever produces double-firing.
- The single global event listener that pauses input is
  `window.addEventListener("keydown", handleGlobalKeys, { capture: true })`
  at `App.jsx:1516`. Inspecting its body (`App.jsx:1490-1518`) shows
  it only intercepts `i`/`k` for keyframes and `Delete`/`Backspace`.
  It does not block menu clicks.

What IS shared across the four symptoms is a **common architectural
pattern**: features were built and the JSX is correctly wired to a
dispatcher, but the dispatcher's contract drifted from what the caller
provides (Symptom 1: arg expected, none sent), or the loader path
omits a downstream subsystem (Symptom 2: no mixer hooked up), or two
id schemes were conflated (Symptom 3: `id` vs `uuid`). This is the
same family of breakage we saw in `SPX3DTo2DPanel.jsx` — features
built, glue between layers missing.

### Severity
ARCHITECTURAL — not a single bug to fix, but a tagging signal that the
code has accreted a few mismatched contracts. After the demo, a
broader pass on the dispatcher (and on `selectedObject` vs
`activeObjId`) is worth doing.

### Estimated complexity
N/A — covered by fixing the three concrete symptoms.

### Shared root cause with other symptoms?
Yes, with all three — the **pattern** is shared (drifted contracts
between layers); the **mechanisms** are not.

### Recommended fix approach
None as a standalone item. After Symptoms 1, 2, 3 are patched, do a
quick follow-up read-through of `handleApplyFunction` looking for
other branches with `if (arg)` guards or calls into `window.foo` that
may also silently no-op.

---

## Summary

### Are these all one bug or 4 separate bugs?

**Three independent bugs plus a pattern-level concern.**
- Symptom 1 (menu Import items dead): broken dispatcher contract for
  Import* fns.
- Symptom 2 (GLB animations don't play): missing AnimationMixer
  subsystem.
- Symptom 3 (Y-Bot can't delete): conflation of sceneObjects.id (number)
  vs Three.js uuid (string) in delete code paths.
- Symptom 4 (shared root cause): no — different mechanisms. Common
  pattern (drifted contracts between layers), but no single fix.

### Recommended fix order

Order by demo impact × dependency:
1. **Bug 2 — GLB animation playback** (M, ~1.5 h). Highest demo
   visibility; if the demo shows Mixamo dancing, this is a BLOCKER.
   No dependencies on the others.
2. **Bug 1 — Menu Import GLB / OBJ / FBX / project-open** (S, ~30 min).
   Quick to ship; opens a programmatic file picker. Independent of
   the other fixes.
3. **Bug 3 — Y-Bot deletion** (M, ~1.5 h). Decouple selectedObject
   from activeObjId; pick one id scheme. Independent of the other
   two.
4. **Bonus pass** (~30 min). Sweep `handleApplyFunction` for other
   branches that no-op silently; verify with one round of menu
   clicks.

### Which fixes can be done in parallel?

All three primary fixes are independent — they touch different parts
of `App.jsx`:
- Bug 1 → dispatcher branches at `App.jsx:3128-3138`.
- Bug 2 → `App.jsx:2297-2357` (loadModelToScene) and the animate loop
  at `App.jsx:1771`.
- Bug 3 → `App.jsx:1619-1625, 1521-1530, 960-973`, and the viewport
  click selection.

They can be applied in any order or in parallel branches. Recommend
serial in one session for cleanliness, since all three patch the same
file.

### Total estimated time

~3.5 hours of focused work + ~30 min for the bonus dispatcher sweep =
**~4 hours** to resolve all four symptom areas, including verification.

### What was explicitly NOT touched

Per scope:
- `SPX3DTo2DPanel.jsx` and the seven 3D→2D style implementations.
- `VISIBLE_STYLES`, `STYLES`, and any 3D→2D panel code.
- The recent fixes to `SPX3DTo2DPanel.jsx`.

### Read-only confirmation

This audit only inspected files. No code was modified. Awaiting user
review before proposing patches.
