# SPX 3D Mesh Editor — Selection & Visibility Audit

**Date:** 2026-05-13
**Repo:** `/workspaces/spx3dmesh2` (branch `main`)
**Method:** Static read. No runtime tests executed.
**Why this audit:** Wave 1 from `edit_tools_audit.md` (the missing-`pushHistory` fixes) cannot be validated until the user can actually select geometry and see what they selected. Reports say Vert/Face buttons do nothing, Edge does something but with no highlight, Object mode has no visible selection indicator, and Bevel "appears to do nothing."

> **Note on paths.** Editor panel: `src/components/MeshEditorPanel.jsx`. Master engine: `src/App.jsx`. Primitive factory: `src/components/SceneManager.js`. Half-edge engine: `src/mesh/HalfEdgeMesh.js`. Composer: `src/mesh/FilmRenderer.js`.

---

## PART 1 — Selection System State

### 1.1 Object Mode

**Selection state**
- `selectedObject` — `App.jsx:489` — top-level state, but barely used (transform-row plumbing only; `App.jsx:1588–1602`, `1690–1695`).
- `activeObjId` — `App.jsx:490` — the *real* identifier for the active scene object.
- `meshRef.current` — `App.jsx:496` — the Three.js mesh node for the active object.
- `sceneObjects` — `App.jsx:488` — array of `{ id, name, mesh, ... }` entries from `createSceneObject` (`SceneManager.js:26`).

**Click handler — the path actually fires on object-mode click**
- Mouse-down only seeds drag/box-select state in object mode (`App.jsx:4698–4705`).
- The pick happens in **`onMouseUp`** (`App.jsx:4829–4938`):
  - Bail on right/middle-button release (`4849–4854`).
  - Bail on drag-orbit (`4863–4868`).
  - Otherwise raycast `sceneObjectsRef` candidates (`4887–4911`).
  - On hit: walk parent chain to find the matching `sceneObjects` entry, call `selectSceneObject(matched.id)` (`4922–4928`).
  - On miss: `selectSceneObject(null)` (`4928–4932`).

There is also a parallel object-mode branch inside `onCanvasClick` (`App.jsx:2861–2909`), but it is unreachable from the JSX path: `onCanvasClick` is only invoked when `editModeRef.current === "edit"` (`App.jsx:4706–4709`). The branch is dead code in object mode.

**`selectSceneObject` — what actually happens**
- `App.jsx:941–993`.
- Sets `activeObjId`, `meshRef.current`, attaches gizmo if a transform tool is armed (`972–978`), rebuilds `heMeshRef` from the new mesh geometry (`986–992`).
- **Does NOT toggle any material, emissive color, or outline.** A comment at `App.jsx:957–959` says:
  > Selection is now DATA-ONLY. No material swapping … Visual selection indication is handled by `OutlinePass` in the composer (wired separately).

**Why no outline is visible**
- The composer is built in `initFilmComposer` (`FilmRenderer.js:94–137`). Its passes are: `RenderPass`, `SSAOPass`, `UnrealBloomPass`, `SMAAPass`, `OutputPass`. **No `OutlinePass`.**
- `createNPROutlinePass` is imported (`App.jsx:134`) and stashed on `window.createNPROutlinePass` (`App.jsx:2032`), but it is never instantiated or added to a composer anywhere in `App.jsx` or `FilmRenderer.js`. (`SPX3DTo2DPipeline.js:374–449` does use `OutlinePass`, but that's an offline export pipeline, not the live viewport.)
- `selectSceneObject` *does* iterate sceneObjects to reset emissive on object-mode empty-space click via `onCanvasClick` (`App.jsx:2898–2906`), but again — that path is unreachable in object mode, and there is no corresponding **set** of emissive at any other code point.
- Net result: **object selection is invisible.** The status bar text changes, the gizmo (if armed) attaches, but the user has no visual feedback in the viewport.

### 1.2 Edit Mode

**Selection state**
- `selectMode` — `App.jsx:1172` — `"vert" | "edge" | "face"`. Default `"vert"`.
- `selectModeRef.current` — `App.jsx:1304`, synced via effect at `1361`.
- `selectedVerts`, `selectedEdges`, `selectedFaces` — `App.jsx:1281–1283` — `Set<number>` of half-edge-mesh element IDs.

**Click handler — `onCanvasClick`**
- Bound from `onMouseDown` only when `editModeRef.current === "edit"` (`App.jsx:4706–4709`).
- Defined at `App.jsx:2858–2997`.
- Vertex branch (`2916–2941`): iterates all `heMesh.vertices`, projects each to screen, picks the closest within **20px** screen distance. On hit: toggles `selectedVerts` and rebuilds the vert overlay.
- Edge branch (`2942–2980`): iterates half-edges (deduped), projects midpoint, threshold **25px**. On hit: toggles `selectedEdges` (also adds the twin id) and rebuilds the edge overlay.
- Face branch (`2981–2994`): true Three.js `Raycaster.intersectObject(meshRef.current, true)` and uses `hit.faceIndex`.

**Are they being populated?**
Looking at the code in isolation, yes. But there is a **fatal interaction with `onMouseUp`**: `onMouseUp` (`App.jsx:4829–4938`) has no `editModeRef.current === "edit"` early-return (`4857` only short-circuits for sculpt). So after every edit-mode click, the **same release** re-runs the object-mode raycast (`4887–4933`):
- If the click hit the mesh body → calls `selectSceneObject(matched.id)`. That rebuilds `heMeshRef.current` from scratch (`App.jsx:989`). New IDs are minted, so any `selectedVerts/Edges/Faces` IDs captured by the just-fired `onCanvasClick` now point at nothing. Edge overlay still renders (because the rebuild assigns new IDs starting from 0 too, which sometimes overlap), but selection sets are semantically garbage.
- If the click missed the mesh body (very common — vertices are picked within 20px, so most vertex clicks fall *outside* the mesh silhouette) → calls `selectSceneObject(null)` (`4928–4932`). That sets **`meshRef.current = null`** (`App.jsx:946`). The next `buildVertexOverlay` call bails (`App.jsx:2632`: `if (!scene || !heMesh || !parent) return;`). The next face-mode click bails at `App.jsx:2982` (`meshRef.current?.material ? ... : []`).
- This is the most likely root cause of the symptom "Vert button doesn't work" / "Edge shows nothing." Even when overlays were drawn, the next stationary click in space wipes `meshRef.current` and the system goes silent. *This is BLOCKING* — see Part 5.

**Used-by — selectedVerts/Edges/Faces**
- Inset: `App.jsx:3459` reads `selectedFaces`.
- Grid Fill / Target Weld / Chamfer Vertex / Avg Vertex / Circularize / Connect Components: `App.jsx:3816–3822` read `selectedVerts`.
- Mark Seam: `App.jsx:3808` reads `selectedEdges`.
- Loop Cut: `App.jsx:3127–3139` reads `selectedEdges`.
- Bevel: **`App.jsx:3458` reads no selection** — it calls `heMeshRef.current.bevelEdges(0.1)` with no edge list. `HalfEdgeMesh.bevelEdges` at `HalfEdgeMesh.js:850–866` operates on **every** half-edge in the mesh and only inserts new vertices (no face/edge topology rebuild). Its return value is `newVerts.length`. The mesh is then re-tessellated by `rebuildMeshGeometry` from `heMesh.toBufferGeometry` (`App.jsx:2819`), which only uses faces — so the unconnected new vertices don't change the rendered geometry at all. **This is why Bevel appears to do nothing even when selection works.**

### 1.3 SELECT MODE buttons (Vert/Edge/Face)

- Button row defined: `MeshEditorPanel.jsx:370–376`.
- Click fires `onApplyFunction("selectMode_" + label.toLowerCase())`.
- Dispatch arms: `App.jsx:3863–3865`:
  ```
  selectMode_vert → setSelectMode("vert"); buildVertexOverlay();
  selectMode_edge → setSelectMode("edge"); buildEdgeOverlay();
  selectMode_face → setSelectMode("face"); setTimeout(() => buildFaceOverlay(), 50);
  ```
- They toggle `selectMode` and (re)build the appropriate overlay. They **do not** auto-enter Edit mode if the user is currently in Object mode. If the user clicks "Vert" while in Object mode, `selectMode` flips but no overlay appears (the build calls bail on missing `heMesh`/`parent`) and `onCanvasClick` is never called from Object-mode mouseDown. The button appears dead.
- They are consumed only via `selectModeRef.current` inside `onCanvasClick` (`App.jsx:2916/2942/2981`) — that is the entire downstream consumer.

---

## PART 2 — Visual Feedback

### 2.1 Object outline rendering
- **Does not exist** in the live viewport. The comment at `App.jsx:957–959` documents a plan that was never wired. `OutlinePass` is imported only in the offline 3D-to-2D pipeline (`SPX3DTo2DPipeline.js:374`). No emissive flash, no scale-bump, no wireframe overlay, no edge silhouette helper.
- The only "selection emissive" code is a *reset to black* inside the unreachable Object-mode branch of `onCanvasClick` (`App.jsx:2898–2906`) — i.e., it can clear emissive but nothing ever sets it.
- **Missing feature.** This is BLOCKING for Object-mode UX.

### 2.2 Element highlight rendering (edit mode)

**Vertex overlay** — `buildVertexOverlay` (`App.jsx:2627–2665`).
- Builds a `THREE.Points` cloud with per-vertex color: selected = `(1.0, 0.5, 0.1)` (orange), unselected = `(0.2, 0.2, 0.2)` (dim gray). Size = 0.02, size-attenuated.
- Stored on `vertDotsRef.current`, replaced on every rebuild.
- Bails early if `scene`, `heMesh`, or `parent` (= `meshRef.current`) is missing (`2632`).
- Works *when prerequisites are intact* — but see PART 1.2: a single missed-click wipes `meshRef.current` via the `onMouseUp` deselect path, which silently breaks subsequent rebuilds.

**Edge overlay** — `buildEdgeOverlay` (`App.jsx:2668–2717`).
- Builds a `THREE.LineSegments` with per-vertex color. Selected = orange `(1.0, 0.5, 0.1)`, unselected = `(0.1, 0.1, 0.1)`.
- Selection contrast against an unselected line is faint (1.0/0.5/0.1 vs 0.1/0.1/0.1) — both end up close to background black after tone-mapping/SSAO, so even when an edge IS selected the highlight may be visually swallowed. Likely "Edge button works but no highlight" report.
- `linewidth: 2` (`2707`) is ignored on WebGL2 — Three.js `LineBasicMaterial` only honors width 1 on most platforms. Selected and unselected edges render at the same pixel width.

**Face overlay** — `buildFaceOverlay` (`App.jsx:2720–2767`).
- Builds an overlay `THREE.Mesh` from the indexed positions of selected faces, color `(1.0, 0.4, 0.0)`, `transparent: true, opacity: 0.4, depthTest: false, side: DoubleSide`.
- Returns silently if `selFaces.size === 0` (`2728`) — so an empty selection produces no overlay at all (which is correct, but it means clicking Face button before clicking a face shows nothing).
- Face hit-test at `onCanvasClick:2982` requires `meshRef.current?.material` to exist — yet another point that breaks once mouseUp nulls `meshRef.current`.

### 2.3 Hover feedback
- **None.** There is no `onMouseMove` hover-pick path in `App.jsx`. The viewport `onMouseMove` handler (`App.jsx:4711–4828`) handles orbit, gizmo drag, sculpt, box-select rectangle, edge-slide — nothing related to hover-highlight for verts/edges/faces. Blender-style pre-click hover indicator is **missing**.

---

## PART 3 — Raycasting / Picking

### 3.1 Click-to-select
- `raycast` factory at `App.jsx:2843–2855` — builds a fresh `THREE.Raycaster` per click, configures `Points.threshold = 0.1` and `Line.threshold = 0.05`.
- No GPU/pixel-perfect picking (no readPixels from an ID buffer). All picking is via Three.js raycaster math + screen-space distance for verts/edges.
- For face-mode and object-mode, hit-testing uses real geometry via `intersectObject(mesh, true)`.

### 3.2 Edit mode granularity
- **Verts** — projected to screen-space pixels, picked by Euclidean distance ≤ 20px (`App.jsx:2927`). Works on raw HE-mesh vertex positions, not on the rendered `BufferGeometry` (so duplicated rendering verts like the 24-vert default `BoxGeometry` aren't an issue at this layer).
- **Edges** — same idea, midpoint-of-edge projection, ≤ 25px (`App.jsx:2963`). Twin half-edge is also added to the set on toggle-on (`2974`).
- **Faces** — actual triangle hit via `Raycaster.intersectObject` (`2982`). `hit.faceIndex` is used as the selection key — this is the index into the indexed `BufferGeometry`, not the HE face id. `insetFaces` consumes those indices at `App.jsx:3459`. The HE mesh's face index ordering matches `toBufferGeometry`'s ordering at build time, but any rebuild reassigns IDs (note at PART 4).

---

## PART 4 — Regressions From Scene Load

### 4.1 Adding a primitive
- Click path: `MeshEditorPanel.jsx:406–411 → onAddPrimitive(p.id) → addPrimitive` (`App.jsx:1209`).
- `addPrimitive` calls `addSceneObject(type)` (`App.jsx:1212`), then a `setTimeout(50)` block that builds `heMeshRef` from `meshRef.current.geometry` (`1215–1245`).
- `addSceneObject` (`App.jsx:1669–1684`):
  1. Builds mesh via `buildPrimitiveMesh(type)` (`SceneManager.js:5`).
  2. Adds to scene root.
  3. Stores wrapper in `sceneObjects`.
  4. Synchronously inside the state setter mutates `meshRef.current = mesh; heMeshRef.current = null;` (`1677–1678`).
  5. Sets `activeObjId`.

The HE mesh **does** get rebuilt in `addPrimitive`'s setTimeout (`1232–1235`). So a freshly added primitive *is* editable… **only** while it remains the active object. If the user clicks anywhere off it, `selectSceneObject(null)` nulls `meshRef.current` (see 1.2) and the next edit-mode build bails.

### 4.2 `heMeshRef.current` lifecycle — exhaustive
| Code site | Action |
|---|---|
| `App.jsx:499` | created (ref, `null`) |
| `App.jsx:533` | set when an imported GLTF resolves and a child mesh is found |
| `App.jsx:989` | set inside `selectSceneObject` from `obj.mesh.geometry` |
| `App.jsx:1233` | set inside `addPrimitive`'s setTimeout from `meshRef.current.geometry` |
| `App.jsx:1678` | **cleared to null** inside `addSceneObject` (always) |
| `App.jsx:2381` | set after marching-cubes remesh |
| `App.jsx:2565` | **cleared to null** after loading a GLTF model |
| `App.jsx:3647` | **cleared to null** "force rebuild on next edit" |

`heMeshRef` is NOT cleared on `selectSceneObject(null)` (the deselect path). So the previous HE mesh hangs around with valid vertex IDs, but the renderer has lost the link to `meshRef.current`, so the overlay can't be rebuilt and the rendered mesh can't accept face raycasts. This is the bug-shaped silent state.

There is **no single "active mesh" concept** that ties `meshRef` + `heMeshRef` + `selectedVerts/Edges/Faces` together. Each is mutated independently; the invariants between them are never asserted.

---

## PART 5 — Ranked Critical Issues

| # | Severity | Issue | File:line |
|---|---|---|---|
| 1 | **BLOCKING** | `onMouseUp` runs the object-mode pick path even when `editModeRef.current === "edit"`. A missed click in edit mode calls `selectSceneObject(null)` → `meshRef.current = null` → all subsequent overlay builds and face-raycasts silently bail. | `App.jsx:4829–4938` (esp. no edit-mode early-return at `4857`); `selectSceneObject` null-path `941–952` |
| 2 | **BLOCKING** | No object-mode visual selection indicator exists. Comment says outline is "handled by OutlinePass (wired separately)" but no `OutlinePass` is registered in `initFilmComposer` or anywhere else live. User can never confirm an object is selected in object mode. | `App.jsx:957–959`; `FilmRenderer.js:94–137` |
| 3 | **BLOCKING** | `Bevel` button (`App.jsx:3458`) calls `heMeshRef.current.bevelEdges(0.1)` with no edge list. `bevelEdges` (`HalfEdgeMesh.js:850–866`) operates on **all** edges and only adds floating verts — it doesn't rebuild faces, so `toBufferGeometry` produces an identical mesh. Even after fixing selection, Bevel will continue to be a no-op. |
| 4 | HIGH | Vert/Edge/Face buttons don't auto-enter Edit mode (compare with Grab/Rotate/Scale at `3451–3453` which do call `toggleEditMode()` when needed). Click "Vert" in object mode → flips `selectMode` silently, no overlay because `editMode !== "edit"`. | `App.jsx:3863–3865` |
| 5 | HIGH | Edge overlay color contrast is poor (unselected `0.1/0.1/0.1` blends with the dimmed mesh + tone-mapping). `linewidth: 2` is honored on almost no WebGL2 driver. Even when selection works, the highlight is hard to see. | `App.jsx:2688–2708` |
| 6 | HIGH | No hover highlight. Blender's default behavior — pre-click feedback of what would be picked — is entirely absent. Without it, the 20px vertex tolerance is the user's only cue, and they can't tell which vertex they're about to grab. | (missing feature) |
| 7 | HIGH | Face-mode hit test depends on `meshRef.current?.material` (`App.jsx:2982`). Same null-out as #1 silently breaks face selection. |
| 8 | MEDIUM | `MeshEditorPanel.jsx:113–126` lists 12 primitive labels (gear, pipe, helix, staircase, arch, lathe, etc.). `buildPrimitiveMesh` (`SceneManager.js:5–24`) supports 7 (sphere, cylinder, cone, torus, plane, circle, icosphere) — everything else falls into the default `BoxGeometry(1,1,1)`. Adding "Gear" silently produces a cube. Confusing for testing. |
| 9 | MEDIUM | `selectSceneObject` rebuilds `heMeshRef` from scratch on every selection (`App.jsx:989`), invalidating any in-flight `selectedVerts/Edges/Faces` IDs from the previous selection. After a click-on-mesh in edit mode (see #1), the just-set selection IDs reference a now-destroyed HE mesh. |
| 10 | MEDIUM | `MeshEditorPanel.jsx`'s local `mode` state (`284`) is independent of `App.jsx`'s `editMode` (`1114`). `switchMode("object")` calls `onApplyFunction("select"); onApplyFunction("toggle_edit");` (`294–295`) — the second call only toggles to object if currently edit, otherwise it flips to edit. The two states can desync (open editor → edit mode is global "object", panel local "object"; click EDIT once → both edit; click OBJECT → panel "object" but `toggle_edit` flips to edit again). |
| 11 | LOW | Dead code: object-mode branch of `onCanvasClick` (`App.jsx:2861–2909`) is unreachable because the JSX only calls `onCanvasClick` when `editModeRef.current === "edit"` (`4706–4709`). Object mode is handled in `onMouseUp` instead. Worth removing to reduce confusion. |
| 12 | LOW | The "Select" button (`MeshEditorPanel.jsx:129 → App.jsx:3450`) is a no-op apart from setting `activeTool="select"` and a status string. There is no exclusive "selection" mode — selection is always available implicitly when in edit/object mode. The button doesn't do anything visible. |

---

## PART 6 — Recommended Fix Order

To get **Wave 1 (`pushHistory` additions) testable**, the user needs:
1. Click a cube → see it is selected.
2. Switch to edit → see vertices/edges/faces.
3. Click an element → see it stay selected after the click ends.
4. Apply a tool that does something visible.
5. Ctrl+Z → revert.

Without those, the `pushHistory` work cannot be regression-tested.

**Minimum fix set (do these before any Wave 1 verification):**

1. **Gate `onMouseUp` object-pick on edit mode.** Add an `if (editModeRef.current === "edit") { /* clean up box-select but skip object-pick */ return; }` near `App.jsx:4857`. Without this, every edit-mode click destroys the selection it just made. *Fix issue #1.*
2. **Make Vert/Edge/Face auto-enter edit mode.** Mirror Grab/Rotate/Scale's pattern at `App.jsx:3863–3865`:
   ```
   if (editModeRef.current !== "edit") toggleEditMode();
   ```
   *Fix issue #4.*
3. **Add an object-mode visual selection indicator.** Cheapest: in `selectSceneObject`, traverse the mesh and set `material.emissive = COLORS.orange; material.emissiveIntensity = 0.25;` (and reset on deselect). The reset path already exists at `App.jsx:2898–2906`; mirror the set on selection. *Fix issue #2.*
   - A proper `OutlinePass` wired into `FilmRenderer.initFilmComposer` is the better long-term fix but requires passing the renderer/scene/camera + `selectedObjects` array reactively.
4. **Brighten edge overlay unselected color.** Bump unselected color to ~`0.5/0.5/0.55` so the selected orange has real contrast — or use a second `LineSegments` for selected only (rendering on top, no depth test). *Fix issue #5.*
5. **Replace `Bevel` dispatch with a real bevel** or at least gate the button: if no operation occurs, set status `"Bevel: select edges first"`. Currently the button confuses testing — a click reports success but nothing changes. *Fix issue #3.* (The real fix likely needs a working `bevelEdges` impl with face rebuild, which is outside this audit's scope but is the headline broken tool.)

**Can wait until later passes:**
- Hover highlight (#6) — UX nice-to-have.
- Primitive labels mismatch (#8) — only confusing for less-common shapes.
- ID-stability across re-selects (#9) — only matters once selection survives a click; address as part of a broader "active mesh state" cleanup.
- Panel-local mode desync (#10) — annoying but not blocking; works fine if you only touch the EDIT button.
- Dead code / "Select" no-op (#11/#12) — cleanup.

---

## PART 7 — End-to-End Test Scenario

| Step | Expected | Current State | Citations |
|---|---|---|---|
| 1. Add a cube | Cube appears at origin, mesh + HE mesh active, status `Added box — 8 verts · 6 faces · 12 edges` | **Works.** `addPrimitive` (`App.jsx:1209–1245`) calls `addSceneObject` then builds `heMeshRef` 50 ms later. Note: setTimeout race — see #4.2. | `App.jsx:1209`, `1669`, `SceneManager.js:5` |
| 2. See deselected state | Mesh visible with no outline; nothing emissive | **Partially.** The mesh renders. There is no concept of "deselected appearance" because there is no concept of "selected appearance" either. | `App.jsx:957–959`; `FilmRenderer.js:94–137` |
| 3. Click cube → see selection outline | Visible outline / emissive flash / colored silhouette | **Broken.** No outline pass, no emissive, no scale bump, no wireframe. Status text "Selected: …" is the *only* indicator. Gizmo attaches only if a transform tool is armed (`App.jsx:972–978`). | `App.jsx:941`, `957–959` |
| 4. Switch to edit mode → see vertices as dots | Orange/gray vertex dots overlay; mesh dimmed | **Partial.** `toggleEditMode` dims the mesh material to opacity 0.55 and after 50 ms calls `buildVertexOverlay` (`App.jsx:3292–3329`). Dots are 0.02-unit `Points` with size attenuation — small but visible. Will appear *if* `meshRef.current` and `heMeshRef.current` are intact at the time. | `App.jsx:3292`, `2627` |
| 5. Click a vertex → see it highlighted | Clicked vertex turns orange, others gray | **Broken in practice.** `onCanvasClick` correctly picks the vertex and rebuilds the overlay (`App.jsx:2916–2941`), **but** the same release triggers `onMouseUp`'s object-mode raycast (`4829–4938`) with no edit-mode guard. If the click hit the mesh body, `selectSceneObject(matched.id)` rebuilds `heMeshRef` and invalidates the IDs. If it missed the body (typical for off-center vertices), `selectSceneObject(null)` nulls `meshRef.current`, breaking the next overlay build. **Issue #1.** | `App.jsx:2916`, `4829–4938`, `941` |
| 6. Click Bevel → see the operation apply | Sharp edges become small chamfers; mesh poly count increases | **Broken.** `App.jsx:3458` doesn't pass any selection. `HalfEdgeMesh.bevelEdges` (`HalfEdgeMesh.js:850–866`) operates on every edge but only adds floating vertices — it never rebuilds faces, so the rendered mesh is identical. **Issue #3.** | `App.jsx:3458`, `HalfEdgeMesh.js:850` |
| 7. Press Ctrl+Z → revert | Mesh returns to pre-bevel geometry | **Unverifiable.** Bevel didn't change anything to revert. `pushHistory` exists (`App.jsx:2352`) and is called by the bevel dispatch arm (`3458`), but since the operation is a no-op, undo is also a no-op. After Wave 1, with bevel fixed, this should be re-tested. | `App.jsx:2352`, `3458` |

---

## VERIFY

```
$ ls audit/selection_visibility_audit.md
audit/selection_visibility_audit.md
```
