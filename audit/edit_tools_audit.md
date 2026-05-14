# SPX 3D Mesh Editor — Polygon Editing Tools Audit

**Scope:** Complete inventory and quality assessment of every polygon manipulation tool in the SPX 3D Mesh Editor, prior to a polish pass.

**Date:** 2026-05-13
**Repo:** `/workspaces/spx3dmesh2` (branch `main`)
**Method:** Static read of source. No runtime tests performed except where explicitly noted.

> **Note on paths.** The main editor panel lives at `src/components/MeshEditorPanel.jsx` (NOT `src/components/panels/MeshEditorPanel.jsx`). The sculpt UI lives at `src/components/SculptPanel.jsx` (top-level) and `src/components/panels/FilmSculptPanel.jsx` (extended sculpt UI). Both are wired from `App.jsx`. The main `onApplyFunction(fn)` dispatch table lives in `src/App.jsx` and is the single fan-out point for almost every tool button.

---

## PART 1 — Complete Tool Inventory

### 1.1 Discovery method
- `grep` for `id:` tool definitions in `src/components/MeshEditorPanel.jsx`
- `grep` for `fn === "..."` dispatch arms in `src/App.jsx` (the single dispatch table, ~lines 3340–3925)
- Full read of `src/mesh/HalfEdgeMesh.js`, `src/mesh/BooleanOps.js`, `src/mesh/SculptEngine.js`, `src/mesh/SculptBrushes.js`, `src/mesh/DynamicTopology.js`, `src/mesh/ModifierStack.js`, `src/mesh/ExtendedModifiers.js`, `src/mesh/NgonSupport.js`
- `grep` for `activeTool ===` to determine whether `activeTool` strings actually drive a mouse pipeline

### 1.2 Tool table, by category

Legend for **Status**:
- ✅ **Working** — wired button + implementation + geometry change verified in source
- ⚠️ **Half-wired** — button exists, handler exists, but underlying logic is missing or incomplete
- 🚧 **Stub** — button exists, handler only updates status text or `activeTool`
- ❓ **Needs hands-on testing** — looks plausible in source but I cannot confirm correctness from a static read

---

#### Selection tools

| UI label | Internal id | Button defined | Handler | Operates on | Panel | Status |
|---|---|---|---|---|---|---|
| Select | `select` | `MeshEditorPanel.jsx:129` | `App.jsx:3449` | (mode switch) | Edit | 🚧 — only `setActiveTool("select")`; actual element pick lives in `onCanvasClick` `App.jsx:2843–2996` |
| Vertex mode | `selectMode_vert` | `MeshEditorPanel.jsx:371–373` | `App.jsx:3862` | Vertices | Edit | ✅ |
| Edge mode | `selectMode_edge` | `MeshEditorPanel.jsx:371–373` | `App.jsx:3863` | Edges | Edit | ✅ |
| Face mode | `selectMode_face` | `MeshEditorPanel.jsx:371–373` | `App.jsx:3864` | Faces | Edit | ✅ |
| Select All | `selectAll` | (menu) | `App.jsx:3433` | — | All | 🚧 — handler is `setStatus("Select All — A"); return;`; sets no state |
| Deselect All | `deselectAll` | (menu) | `App.jsx:3434` | All sets | All | ✅ |
| Single-click raycast | (in `onCanvasClick`) | — | `App.jsx:2843–2996` | Verts/Edges/Faces | Edit | ✅ — vertex 20 px tol, edge 25 px tol, face raycast |
| Box select | (drag) | — | `App.jsx:4698–4885` | Whole objects | Object only | ⚠️ — does not work in edit mode for verts/edges/faces |
| Lasso select | — | — | — | — | — | ❌ not implemented |

#### Transform tools — vertex/element

| UI label | Internal id | Button | Handler | Operates on | Status |
|---|---|---|---|---|---|
| Grab | `grab` | `MeshEditorPanel.jsx:130` | `App.jsx:3450` + (proportional branch) `App.jsx:3459–3467` | Verts/Edges/Faces | 🚧 — sets `activeTool` only; **no mouse handler reads `activeTool === "grab"` to translate elements** (grep for `activeTool === "grab"` returns zero hits in `App.jsx`). The proportional branch sets `window._proportionalActive = true` but I could not find the consumer that applies a delta on `onMouseMove`. |
| Rotate | `rotate` | `MeshEditorPanel.jsx:131` | `App.jsx:3451` | (intended verts/edges/faces) | 🚧 — same as Grab: no consumer of `activeTool === "rotate"` |
| Scale | `scale` | `MeshEditorPanel.jsx:132` | `App.jsx:3452` | (intended verts/edges/faces) | 🚧 — same as Grab |

#### Transform tools — object gizmo

| UI label | Internal id | Button | Handler | Operates on | Status |
|---|---|---|---|---|---|
| Gizmo Move | `gizmo_move` | `MeshEditorPanel.jsx:391` | `App.jsx:3828–3859` | Whole object/bone | ✅ — custom `TransformGizmo` (`src/components/TransformGizmo.js:53–352`) |
| Gizmo Rotate | `gizmo_rotate` | `MeshEditorPanel.jsx:391` | `App.jsx:3828–3859` | Whole object/bone | ✅ |
| Gizmo Scale | `gizmo_scale` | `MeshEditorPanel.jsx:391` | `App.jsx:3828–3859` | Whole object/bone | ✅ |

#### Mesh operations (core edit tools)

| UI label | Internal id | Button | Handler | Operates on | Status |
|---|---|---|---|---|---|
| Extrude | `extrude` | `MeshEditorPanel.jsx:133` | `App.jsx:3453` | Faces (intended) | 🚧 — handler is `setActiveTool("extrude"); setStatus("Extrude — E"); return;`. No call to `heMesh.extrudeFaces()` from this path. The HEM method exists at `HalfEdgeMesh.js:464` but is **never invoked from any dispatch arm** (`grep -n "extrudeFaces" src/App.jsx` returns zero). A legacy `_extrude_legacy` arm at `App.jsx:3822` is also a stub. |
| Loop Cut | `loop_cut` | `MeshEditorPanel.jsx:134` | `App.jsx:3454` → `applyLoopCut()` at `App.jsx:3166–3199` | Edges | ✅ — uses `HalfEdgeMesh.loopCut()` `HalfEdgeMesh.js:224`, `pushHistory()` at `App.jsx:3173` |
| Knife | `knife` | `MeshEditorPanel.jsx:135` | `App.jsx:3455` + `executeKnifeCut` ~`App.jsx:3091–3123` | Edges/Faces | ✅ — uses `HalfEdgeMesh.planeCut()` `HalfEdgeMesh.js:345`, `pushHistory()` at `App.jsx:3094` |
| Edge Slide | `edge_slide` | `MeshEditorPanel.jsx:136` | `App.jsx:3456` → `startEdgeSlide()`; confirm at `App.jsx:3158–3163`; mouse hook at `App.jsx:4847` | Edges | ⚠️ — `slideEdge()` runs (`HalfEdgeMesh.js:296`) but **`confirmEdgeSlide()` does NOT call `pushHistory()`** (`App.jsx:3158–3163`) so the operation is non-undoable |
| Bevel | `bevel` | `MeshEditorPanel.jsx:137` | `App.jsx:3457` | Edges | ⚠️ — calls `heMesh.bevelEdges(0.1)`. Hard-coded 0.1 amount, no modal preview, no edge filter (bevels every edge of the mesh, not just selection). `HalfEdgeMesh.js:850` itself returns "newVerts count" — the side-face construction is incomplete (Part 3). |
| Inset | `inset` | `MeshEditorPanel.jsx:138` | `App.jsx:3458` | Faces | ⚠️ — calls `heMesh.insetFaces([...selectedFaces], 0.1)`. Requires face selection; hard-coded 0.1 amount; no modal preview |

#### Mesh repair / cleanup

| UI label | Internal id | Button | Handler | Status |
|---|---|---|---|---|
| Fix Normals | `fix_normals` | `MeshEditorPanel.jsx:420` | `App.jsx:3872` | ✅ |
| Merge by Distance | `rm_doubles` | `MeshEditorPanel.jsx:420` | `App.jsx:3873` → `window.removeDoubles()` | ✅ — but **O(n²)** (Part 2) |
| Fill Holes | `fill_holes` | `MeshEditorPanel.jsx:421` | `App.jsx:3874` | ❓ |
| Remove Degenerate | `rm_degenerate` | `MeshEditorPanel.jsx:421` | `App.jsx:3875` | ❓ |
| Full Repair | `full_repair` | `MeshEditorPanel.jsx:421` | `App.jsx:3876` | ❓ |

#### Half-edge advanced operations (exposed via dispatch)

| UI label | Internal id | Handler | HEM method | Status |
|---|---|---|---|---|
| Grid Fill | `grid_fill` | `App.jsx:3815` | `HalfEdgeMesh.js:793` | ✅ |
| Target Weld | `target_weld` | `App.jsx:3816` | `HalfEdgeMesh.js:532` | ✅ |
| Chamfer Vertex | `chamfer_vertex` | `App.jsx:3817` | `HalfEdgeMesh.js:552` | ✅ |
| Average Vertices | `average_vertex` | `App.jsx:3818` | `HalfEdgeMesh.js:574` | ✅ |
| Circularize | `circularize` | `App.jsx:3819` | `HalfEdgeMesh.js:597` | ✅ |
| Reorder Vertices | `reorder_verts` | `App.jsx:3820` | `HalfEdgeMesh.js:620` | ❓ (utility) |
| Connect Components | `connect_comps` | `App.jsx:3821` | `HalfEdgeMesh.js:660` | ❓ |
| Snap Toggle | `snap_toggle` | `App.jsx:3814` | — | ✅ (state flag) |
| Proportional Toggle | `proportional_toggle` | `App.jsx:3811` | — | ✅ |
| Proportional Radius +/− | `proportional_radius_up/_down` | `App.jsx:3812–3813` | — | ✅ |

**HEM methods that exist but have no dispatch arm** (grep confirms zero callers in `App.jsx`):
- `extrudeFaces` (`HalfEdgeMesh.js:464`) — Extrude tool stubs out instead
- `mirror` (`HalfEdgeMesh.js:818`) — usable only via Mirror modifier
- `subdivide` (`HalfEdgeMesh.js:378`) — exposed only via SubD modifier
- `snapVertexToSurface` / `snapVertexToVertex` (`HalfEdgeMesh.js:763 / 779`)

#### Boolean operations

| UI label | Internal id | Handler | Implementation | Status |
|---|---|---|---|---|
| Boolean Union | `bool_union` | `App.jsx:3867` | `booleanUnion` `BooleanOps.js:39` | ⚠️ — **no `pushHistory()`** call before applying (`App.jsx:3867`); result added to scene but the source meshes are not, and undo will not roll back a union |
| Boolean Subtract | `bool_subtract` | `App.jsx:3868` | `booleanSubtract` `BooleanOps.js:56` | ⚠️ — same undo gap |
| Boolean Intersect | `bool_intersect` | `App.jsx:3869` | `booleanIntersect` `BooleanOps.js:94` | ⚠️ — same undo gap |

#### Remeshing / retopology

| UI label | Internal id | Handler | Status |
|---|---|---|---|
| Voxel Remesh | `voxel_remesh` | `App.jsx:3879` | ❓ |
| Quad Remesh | `quad_remesh` | `App.jsx:3911` | ❓ |
| Auto Retopo | `auto_retopo` | `App.jsx:3912` → `window.quadDominantRetopo()` (uses `AutoRetopo.js`) | ❓ |
| Marching Cubes | `marching_cubes` | `App.jsx:3913` | ❓ |

#### UV projection (from edit panel)

| UI label | Internal id | Handler | Status |
|---|---|---|---|
| Box Project | `uv_box` | `App.jsx:3916` | ❓ |
| Sphere Project | `uv_sphere` | `App.jsx:3917` | ❓ |
| Planar Project | `uv_planar` | `App.jsx:3918` | ❓ |

#### Object primitives (creation)

`MeshEditorPanel.jsx:113–125` lists 12 primitives, all routed through `onAddPrimitive(type)` to `App.jsx`:
`box`, `sphere`, `cylinder`, `torus`, `plane`, `icosphere`, `gear`, `pipe`, `helix`, `staircase`, `arch`, `lathe`. Status: ✅ for the standard six (cube, sphere, cylinder, torus, plane, icosphere); ❓ for the more exotic primitives.

#### Sculpt brushes (CPU — `SculptEngine.js`)

`SculptEngine.js:114–128` defines `BRUSH_TYPES`. The handler is `App.jsx:3051` (sculpt stroke) which calls `pushHistory()` before the first stroke sample.

| Brush | Status | Note |
|---|---|---|
| `draw` | ✅ | `SculptEngine.js:114` |
| `flatten` | ✅ | `:115` |
| `smooth` | ✅ | `:116`, uses `smoothVertices` `:271` |
| `pinch` | ✅ | `:117` |
| `inflate` | ✅ | `:118` |
| `grab` | ✅ | `:119` |
| `clay` | ✅ | `:121` |
| `trim` | ✅ | `:122` |
| `crease` | ✅ | `:123` |
| `scrape` | ✅ | `:125` |
| `fill` | ✅ | `:126` |
| `nudge` | ✅ | `:127` |
| `mask` | ✅ | `:128`, `paintMask` `:318` |
| `rotate` | ⚠️ | listed in UI but I could not find the per-stroke kernel for it in `SculptEngine.js` |
| `elastic` | ⚠️ | same — UI option, no kernel located |
| `clayStrips` | ✅ | `SculptBrushes.js:6 / :61` |
| `faceSets` | ✅ | `:11 / :153` |
| `boundary` | ✅ | `:12 / :186` |
| `multiplane` | ✅ | `:13 / :167` |

#### Sculpt features (modal)

| Feature | UI | Implementation | Status |
|---|---|---|---|
| Dynamic Topology | `FilmSculptPanel.jsx:87` | `applyDyntopo` `DynamicTopology.js:101` | ✅ |
| Brush Falloff (9 types) | `FilmSculptPanel.jsx:74` | `getFalloff` `SculptEngine.js:74` | ✅ |
| Symmetry X/Y/Z | `FilmSculptPanel.jsx:77` | `SculptEngine.js:163–180` | ✅ |
| Lazy Mouse | `FilmSculptPanel.jsx:81` | `LazyMouse` class `SculptEngine.js:367` | ✅ |
| Accumulate | `FilmSculptPanel.jsx:83` | state flag | ✅ |
| Backface Cull | `FilmSculptPanel.jsx:84` | state flag | ✅ |
| GPU Sculpt fallback | — | `GPUSculptEngine.js` — only 6 of the CPU brushes | ⚠️ (incomplete parity) |

#### N-gon helper operations (`NgonSupport.js`)

The file defines `dissolveEdge` (`:46`), `bridgeFaces` (`:53`), `gridFill` (`:64`), `pokeFace` (`:79`), `insetFace` (`:98`), `convertNgonsToTris` (`:125`). **None of these are wired to a dispatch arm in `App.jsx`** (verified by grep). They are library functions only.

#### Modifier stack — non-destructive

`ModifierStack.js:10–22` defines 13 base modifiers (SUBDIVISION, MIRROR, BOOLEAN, SOLIDIFY, BEVEL, ARRAY, WARP, DISPLACE, SMOOTH, DECIMATE, CAST, TWIST, BEND). `ExtendedModifiers.js:449–465` adds 16 more (WAVE, LATTICE, SCREW, TRIANGULATE, WIREFRAME_MOD, REMESH, SIMPLE_DEFORM, OCEAN, SHRINKWRAP, EDGE_SPLIT, WEIGHTED_NORMAL, BUILD, MASK, MULTIRES, MESH_DEFORM, SKIN). Status of each modifier as a stack entry is ❓ — the dispatch UI and the modifier-stack UI/panel were not part of this audit.

#### File operations (delete/duplicate)

| UI label | Internal id | Handler | Status |
|---|---|---|---|
| Delete Selected | `deleteSelected` | `App.jsx:3432` → `deleteSceneObject()` | ✅ (whole-object) |
| Duplicate Object | `duplicateObject` | `App.jsx:3431` | ✅ (whole-object) |

---

## PART 2 — Underlying Topology Data Structure

### 2.1 Architecture: **hybrid HalfEdgeMesh + BufferGeometry**

Edit-time canonical representation is a custom half-edge structure defined at `src/mesh/HalfEdgeMesh.js:111` with three `Map`s:

- `vertices: Map<id, Vertex>` — each vertex stores `x, y, z`
- `halfEdges: Map<id, HalfEdge>` — each half-edge has `vertex, face, next, prev, twin, selected` (`HalfEdgeMesh.js:19–28`)
- `faces: Map<id, Face>` — each face has `halfEdge` and an iterator (`face.vertices()` walks `face.halfEdge.next.next…`, `HalfEdgeMesh.js:89`)
- Stable monotonically-increasing IDs via `_vid`, `_eid`, `_fid`

Render-time representation is Three.js `BufferGeometry`. Sync is **explicit and one-way per operation**:

- `HalfEdgeMesh.fromBufferGeometry(geo)` rebuilds from positions+index (`HalfEdgeMesh.js:138`)
- `HalfEdgeMesh.toBufferGeometry()` emits fresh `positions` and `indices` arrays (`HalfEdgeMesh.js:197`)

Storage at runtime: a React `useRef` named `heMeshRef` in `App.jsx:499`. Lifecycle:
- Built on scene load — `App.jsx:533`
- Rebuilt on mesh import — `App.jsx:989`
- Replaced after boolean ops — `App.jsx:1233`
- Cleared on object deletion — `App.jsx:1678`
- Cleared when switching out of edit mode — `App.jsx:2565`

**Implication: only one mesh can be edited at a time** (single global ref, no per-mesh HEM caching).

### 2.2 Edge representation

Edges are **persisted as `HalfEdge` objects with stable IDs**, not derived per-frame from the index buffer.

- Manifold edges: `e.twin` points to the opposite half-edge
- Boundary / non-manifold: `e.twin === null` — handled throughout (`HalfEdgeMesh.js:54, :282, :311`)
- Edge IDs are stable for the life of the HEM but **become invalid after any `from/toBufferGeometry` round-trip**

### 2.3 Selection survival across topology-changing edits

**Selection state lives in three React `Set`s** (`App.jsx:1281–1283`):
```
selectedVerts, selectedEdges, selectedFaces  // keys = HEM IDs
```

After loop-cut / knife / bevel / inset / merge-by-distance, the HEM IDs may shift but **no per-tool remapping logic exists**. Selection survives in memory (the sets are not cleared by these handlers — verified by reading `App.jsx:3457–3458` and `:3173`) but the IDs no longer reference what the user had selected. The overlay rebuild functions (`buildVertexOverlay` `App.jsx:2627`, `buildEdgeOverlay` `:2668`, `buildFaceOverlay` `:2720`) iterate fresh HEM data, which means old selections silently point at wrong elements.

### 2.4 Triangulation policy

- **Edit time: n-gon / quad-preserving.** `Face.vertices()` walks an arbitrary-length loop.
- **Render time: fan-triangulated** in `toBufferGeometry` (`HalfEdgeMesh.js:197`+).
- Dedicated `toTriangulatedBufferGeometry()` (`HalfEdgeMesh.js:957`) for explicit triangulation on export.
- `faceLoop()` has a hard guard `< 100` edges per face (`HalfEdgeMesh.js:33`) — **will silently truncate faces with >100 edges**.

### 2.5 Per-tool data pathway

All implemented edit tools follow the same pattern (canonical example at `ProMeshPanel.jsx:151–157`, also seen in `App.jsx:3457–3458`, `:3187–3199`, `:3094–3123`):
1. Read `heMeshRef.current`
2. Call HEM method (`bevelEdges`, `insetFaces`, `loopCut`, `planeCut`, etc.)
3. Call `rebuildMeshGeometry()` (`App.jsx:2819`) — does a full `toBufferGeometry` rebuild
4. (Sometimes) call `pushHistory()` first

### 2.6 Performance notes

- **O(n²)** in `mergeByDistance` — nested pairwise distance test (`HalfEdgeMesh.js:512–519`), no spatial hash / KD-tree
- **O(n·m)** in `proportionalTransform` — every vertex vs. every selected vertex (`HalfEdgeMesh.js:728–735`)
- **Full BufferGeometry rebuild per edit** — every operation triggers `rebuildMeshGeometry`. There is no incremental / dirty-region path. For meshes >100k verts this will be visibly stuttery.
- `bevelEdges` itself is incomplete: returns `newVerts` count but the side-face construction is not finished (`HalfEdgeMesh.js:850–865`).

### 2.7 Manifold / robustness

- Non-manifold geometry is **passively tolerated** but never enforced or repaired.
- `knifeCut` (`HalfEdgeMesh.js:308`) and `planeCut` (`:345`) can create boundary edges with `twin === null`.
- No "is manifold?" check is called before / after destructive operations.
- `edgeLoop()` has an iteration guard of 500 (`HalfEdgeMesh.js:76`) — sufficient for normal meshes but silently truncates pathological loops.

---

## PART 3 — Per-Tool Quality Assessment

### Selection
- **Single-click raycast (`App.jsx:2843–2996`)** — vertex 20 px, edge 25 px, face true raycast. Works. Modal UX: none — click only, no preview. Undo: no (selection is not a tracked edit). Edge case: with very dense meshes the 20 px screen tolerance picks the wrong vertex.
- **Box select** — exists for object mode only (`App.jsx:4698–4885`). No box select for verts/edges/faces in edit mode.
- **Lasso** — not implemented.
- **Select All (`A`)** — `App.jsx:3433` is a status-text-only stub.

### Transform — element-level (Grab/Rotate/Scale)
- **All three are broken** in edit mode. `App.jsx:3450–3452` only call `setActiveTool(...)`. A grep for `activeTool === "grab"`, `"rotate"`, `"scale"` in `App.jsx` returns **zero** consumers. There is no mouse-move pipeline that reads `activeTool` and applies a delta to selected verts.
- The "proportional grab" branch at `App.jsx:3459–3467` sets `window._proportionalActive = true` but I could not locate the consumer that translates that flag into vertex motion on mouse drag.
- Modal UX (Blender-style "drag to move, click to commit, Esc to cancel, X/Y/Z to constrain axis"): **none**.
- Undo: N/A — no motion happens.

### Mesh ops
- **Extrude** — 🚧 **stubbed**. `App.jsx:3453` only sets `activeTool`. `HalfEdgeMesh.extrudeFaces` (`HalfEdgeMesh.js:464`) is implemented but never called from any dispatch arm.
- **Loop Cut** — ✅ wired, undo OK (`App.jsx:3173`). Uses a numeric `loopCutT` slider; no live ghost preview of the cut line.
- **Knife** — ✅ wired, undo OK (`App.jsx:3094`). 2-click plane definition. No multi-segment / freehand knife.
- **Edge Slide** — ⚠️ ⚠️ **no undo push** in `confirmEdgeSlide` (`App.jsx:3158–3163`). Operation succeeds but is non-undoable.
- **Bevel** — ⚠️ hard-coded 0.1, no segment count, no modal preview, no selection filter (bevels the entire mesh edge set). Underlying `bevelEdges` is incomplete on side-face construction (`HalfEdgeMesh.js:850–865`).
- **Inset** — ⚠️ hard-coded 0.1, no individual/group toggle, no modal preview.

### Booleans
- ⚠️ **No `pushHistory()`** before any of the three ops (`App.jsx:3867–3869`). The result mesh is added to the scene; the source meshes remain. The whole operation cannot be undone. Also: result is parented to scene root rather than replacing the active mesh, which is a confusing UX.

### Repair / cleanup
- Fix Normals, Merge by Distance, Fill Holes, Remove Degenerate, Full Repair — all dispatch via `window.*` globals (`App.jsx:3872–3876`). I did not trace the implementations; ❓ for correctness. Merge by Distance is known O(n²) (Part 2.6).

### HEM advanced ops
- Grid Fill, Target Weld, Chamfer Vertex, Average, Circularize, Connect Components — all call HEM methods that look correct from a quick read. None of them call `pushHistory()` (verified — `App.jsx:3815–3821` are one-line handlers with no history push). ⚠️ **no undo** for any of these.

### Remesh / Retopo / UV
- Not assessed in source — ❓ needs hands-on testing. Voxel/Quad/Marching-Cubes remesh routes through `window.*` globals (`App.jsx:3879, :3911, :3913`). UV projections similarly route through `App.jsx:3916–3918`.

### Sculpt
- Stroke handler at `App.jsx:3051` calls `pushHistory()` before each stroke — ✅ good.
- 13 brushes have implementations; `rotate` and `elastic` appear in UI but I could not find kernels in `SculptEngine.js` — ⚠️.
- DynTopo, symmetry, lazy-mouse, falloff: all backed by code — ✅.
- GPU engine (`GPUSculptEngine.js`) implements only 6 of the CPU brushes — ⚠️ parity gap.

### Gizmo
- ✅ — custom Blender-style three-axis gizmo (`TransformGizmo.js:53–352`). Modes: move / rotate / scale. Hooks: `startDrag → drag → endDrag`. Drag-end fires `window.keyAllTransform` if `isAutoKey` is on (`App.jsx:4833–4836`). Object-level only — no per-element gizmo.

### Comparison to Blender (deferred to Part 9).

---

## PART 4 — Keyframe Safety

### 4.1 Markers verified present

| Marker | Defined at | Read at |
|---|---|---|
| `window.animationData` | `App.jsx:1373` | `App.jsx:1511+` (evaluator) |
| `window.addKeyframe` | `App.jsx:1378–1403` | `:1178, :1571, :4834, :4211–4214` |
| `window.deleteKeyframe` | `App.jsx:1408–1420` | `:4221, :5153` |
| `window.keyAllTransform` | `App.jsx:1424–1429` | gizmo drag-end `:4833–4836`, bone I-key `:1571–1572` |
| `evalChannel` | `App.jsx:1511–1527` | per-frame effect `:1549` |
| `justKeyframed` (ref) | `App.jsx:1625` | `:1531` (gates evalChannel) |
| `keyframeVersion` (state) | `App.jsx:1369` | timeline + evaluator deps |

All seven markers are intact in `App.jsx`. None of the editing tools inspected modify or shadow them.

### 4.2 Which edit tools write keyframes?

**None of the polygon editing tools write keyframes.**

`grep` for `addKeyframe`, `keyAllTransform` across mesh-edit paths returns zero hits — every keyframe write today comes from one of three places:
1. **Gizmo drag-end** with auto-key on — `App.jsx:4833–4836`
2. **Bone I-key** — `App.jsx:1571–1572`
3. **Object I-key** — `App.jsx:1576` (fallback) and `:4211–4214` (handler)

This is consistent: keyframes today are object-level transform channels (`position.x/y/z`, `rotation.x/y/z`, `scale.x/y/z`) per UUID. There is no concept of a "mesh shape keyframe" or vertex-channel keyframe in the data model.

### 4.3 Is this a problem?

- If the user **rigs / animates whole meshes** by translating them, the auto-keyframe pipeline works correctly (gizmo path).
- If the user **edits geometry while a frame is selected** expecting shape-keys / per-frame topology, **nothing is captured**. This is not a regression — it was never wired — but it's a real product gap if shape-keyframes are intended to exist. Out of scope for "polish editing tools" unless explicitly requested.

### 4.4 Tools that bypass / interfere with the keyframe system

None found. No editing tool mutates `animationData`, redefines `addKeyframe`, or clobbers `justKeyframed`.

---

## PART 5 — Dependency Map

### 5.1 Foundation systems
1. **HalfEdgeMesh topology** (`src/mesh/HalfEdgeMesh.js`, single `heMeshRef`) — required by **every** mesh-editing tool except sculpt-on-BufferGeometry and Boolean Ops (which operate on Three.js `Mesh` directly).
2. **Selection state** (`selectedVerts/Edges/Faces` Sets in `App.jsx:1281–1283`) — required by Inset, Grid Fill, Target Weld, Chamfer, Average, Connect Comps, proportional-Grab. **Stale-ID problem** affects all of these.
3. **Gizmo** (`TransformGizmo.js`) — used by object-mode transform only. Edit tools don't use it.
4. **Undo stack** (`pushHistory`/`undo`/`redo` at `App.jsx:2333–2386`) — full-snapshot model, capped at 20. Used inconsistently (see Part 6).
5. **Keyframe system** — independent of editing tools; only the gizmo path touches it.
6. **`rebuildMeshGeometry`** (`App.jsx:2819`) — single hot path that every HEM edit calls. Any perf win here multiplies across every tool.

### 5.2 Shared-code clusters
- **Single dispatch table** at `App.jsx:3340–3925`. One bug-fix here can affect many tools.
- **Single HEM** singleton via `heMeshRef`. Any topology bug propagates.
- **Single `rebuildMeshGeometry`**. Any rebuild bug or perf improvement is shared.
- **Boolean Ops** are isolated — separate codepath (`BooleanOps.js`), don't touch HEM.
- **Sculpt** has its own engine (`SculptEngine.js` / `GPUSculptEngine.js`) but writes back through `rebuildMeshGeometry` via `pushHistory()` flow.

### 5.3 If we fix X, what benefits?

| Fix | Benefits |
|---|---|
| Wire `Grab/Rotate/Scale/Extrude` mouse handlers | Unblocks the four most-used edit tools; they are currently 🚧 stubs |
| Add `pushHistory()` to Edge Slide, Booleans, all HEM advanced ops | All ⚠️ undo gaps closed in one PR |
| Add selection-ID remapping in `rebuildMeshGeometry` | Selection survives every topology change for **every** tool that uses selection |
| Replace `mergeByDistance` n² with spatial hash | All cleanup / repair ops benefit; chains used by Full Repair |
| Replace full geometry rebuild with dirty-attribute updates | Every tool gets faster, especially sculpt |
| Finish `bevelEdges` side-face construction | Bevel becomes correct geometry |
| Add modal preview / numeric input to Bevel & Inset | Two tools instantly Blender-comparable |

---

## PART 6 — Ranked Problem List

### CRITICAL — tool produces broken geometry, crashes, or data loss

| # | Issue | File:line |
|---|---|---|
| C1 | **Grab tool has no mouse pipeline** — clicking the button only sets `activeTool`; no consumer translates vertices. | `App.jsx:3450, :3459–3467` (no `activeTool === "grab"` consumer anywhere) |
| C2 | **Rotate tool has no mouse pipeline** — same as Grab. | `App.jsx:3451` |
| C3 | **Scale tool has no mouse pipeline** — same as Grab. | `App.jsx:3452` |
| C4 | **Extrude tool is a stub** — handler sets `activeTool` only; `HalfEdgeMesh.extrudeFaces` exists (`HalfEdgeMesh.js:464`) but is never called from dispatch. | `App.jsx:3453, :3822` |
| C5 | **`HalfEdgeMesh.bevelEdges` returns count only** — side-face construction is incomplete; user-facing Bevel will produce malformed topology on non-trivial meshes. | `HalfEdgeMesh.js:850–865` |
| C6 | **Booleans don't push undo** — destructive operation with no recovery path. | `App.jsx:3867–3869` |
| C7 | **Edge Slide doesn't push undo** — destructive with no recovery. | `App.jsx:3158–3163` |
| C8 | **Selection becomes stale silently after every topology edit** — every tool that relies on selectedVerts/Edges/Faces (Inset, Grid Fill, Target Weld, Chamfer, Average, Circularize, Connect Components, proportional-Grab) sees the wrong elements after a previous edit. No remap, no clear, no warning. | `App.jsx:2627, :2668, :2720` (overlays rebuild) and all HEM ops |

### HIGH — works but UX is rough, blocks productivity

| # | Issue | File:line |
|---|---|---|
| H1 | **Bevel uses hard-coded 0.1, no preview, no segments, no selection filter** | `App.jsx:3457` |
| H2 | **Inset uses hard-coded 0.1, no preview** | `App.jsx:3458` |
| H3 | **HEM advanced ops (Grid Fill, Target Weld, Chamfer, Average, Circularize, Connect Comps) all skip `pushHistory()`** | `App.jsx:3815–3821` |
| H4 | **No element-level gizmo** — vertex/edge/face translate has no visible handle; Blender users will expect one even after Grab is fixed | `TransformGizmo.js:53–352` (object-only) |
| H5 | **No modal X/Y/Z axis constraint** for Grab/Rotate/Scale — Blender's "G then X" workflow is impossible | (no consumer exists) |
| H6 | **`Select All` (`A`) is a status-text stub** | `App.jsx:3433` |
| H7 | **No box-select / lasso-select in edit mode** — only single-click | `App.jsx:4698–4885` (object mode only) |
| H8 | **Boolean result added as new scene child, source meshes remain** — UX confusion: user expects A=A∪B. | `App.jsx:3867–3869` |

### MEDIUM — works but polish needed, edge cases

| # | Issue | File:line |
|---|---|---|
| M1 | **`mergeByDistance` is O(n²)** — perceptible stall on meshes >10k verts | `HalfEdgeMesh.js:512–519` |
| M2 | **`proportionalTransform` is O(n·m)** | `HalfEdgeMesh.js:728–735` |
| M3 | **Full BufferGeometry rebuild on every edit** — sculpting + frequent edits feel stuttery | `App.jsx:2819` (`rebuildMeshGeometry`) |
| M4 | **`faceLoop()` silently truncates faces with >100 edges** | `HalfEdgeMesh.js:33` |
| M5 | **Sculpt `rotate` and `elastic` brushes appear in UI but have no kernel** | `SculptEngine.js` (kernels missing) |
| M6 | **GPU sculpt engine has only 6 of 14 brushes** | `GPUSculptEngine.js:159` |
| M7 | **N-gon helpers (`dissolveEdge`, `bridgeFaces`, `pokeFace`, `triangulate`) are not wired to any UI button** | `NgonSupport.js:46, :53, :64, :79, :125` (no caller in `App.jsx`) |
| M8 | **Vertex 20-px screen tolerance picks the wrong vertex on dense meshes** | `App.jsx:2916–2941` |
| M9 | **HEM `subdivide` / `mirror` / `snapVertexToSurface` are not exposed as one-click ops** (only available via modifiers) | `HalfEdgeMesh.js:378, :818, :763` |

### LOW — nice-to-have

| # | Issue | File:line |
|---|---|---|
| L1 | Loop Cut has no live ghost preview line | `App.jsx:3166–3199` |
| L2 | Knife is plane-only — no multi-segment / freehand | `App.jsx:3091–3123` |
| L3 | Undo stack capped at 20 with no user setting | `App.jsx:2357` (`.slice(-20)`) |
| L4 | No keyboard shortcuts visible for HEM advanced ops | dispatch arms `App.jsx:3815–3821` |
| L5 | No "auto-merge by distance after extrude/bevel" toggle | — |

---

## PART 7 — ROI Analysis

Effort = engineering days (1d ≈ 6 productive hours). Impact / risk are subjective. ROI = `impact / (effort × risk)`, with impact and (1/risk) on a 1–3 scale.

| # | Item | Effort | Impact | Risk | ROI |
|---|---|---|---|---|---|
| C1–C3 | Wire Grab/Rotate/Scale mouse pipeline (modal: G/R/S → drag → click commit / Esc cancel / X/Y/Z axis constrain) | 2–3 d | **Large** (the three most-used edit tools start working) | Low | **★★★★★** |
| C4 | Wire Extrude (modal: select faces → E → drag normal → click commit) — reuse the same modal infra from C1–C3 | 0.5–1 d | Large | Low | **★★★★★** |
| C6 | Add `pushHistory()` to bool_union/subtract/intersect dispatch arms | 15 min | Medium | Very low | **★★★★★** |
| C7 | Add `pushHistory()` in `confirmEdgeSlide` | 5 min | Medium | Very low | **★★★★★** |
| H3 | Add `pushHistory()` to the six HEM advanced ops | 30 min | Medium | Very low | **★★★★★** |
| C8 | Selection-ID remap inside `rebuildMeshGeometry` (build oldId→newId table during `to/fromBufferGeometry`, rewrite selectedSets) | 1–2 d | Large | Medium (touches every edit tool) | ★★★★ |
| H1 / H2 | Add modal preview + numeric input + segments to Bevel and Inset (reuse C1–C3 modal scaffolding) | 1 d each | Medium | Low | ★★★★ |
| C5 | Finish `bevelEdges` side-face construction in HalfEdgeMesh | 1–2 d | Medium (depends on H1 being there) | Medium | ★★★ |
| H6 | Wire `Select All` to populate the appropriate set | 30 min | Small but expected | Very low | ★★★★ |
| H7 | Edit-mode box-select for verts/edges/faces (reuse object-mode box rect, project per-element) | 1 d | Medium | Low | ★★★★ |
| M1 / M2 | Spatial-hash for mergeByDistance + proportional | 1–2 d | Medium (perf on big meshes) | Medium | ★★★ |
| M5 | Implement `rotate` + `elastic` sculpt kernels (or remove from UI) | 0.5–1 d each | Small | Low | ★★ |
| H4 | Per-element gizmo for vertex/edge/face mode | 2–3 d | Medium | Medium | ★★ |
| M3 | Replace full rebuild with dirty-attribute updates | 3–5 d | Medium-Large (sculpt + frequent edits) | High (subtle bugs around indexing) | ★★ |
| M6 | Port remaining 8 brushes to GPU engine | 3–5 d | Small (CPU path works) | Medium | ★ |
| L1 | Loop cut ghost preview | 0.5 d | Small | Low | ★★★ |
| L2 | Multi-segment knife | 2–3 d | Small-Medium | Medium | ★★ |
| H8 | Booleans replace active mesh instead of adding to scene root | 0.5 d | Medium | Low | ★★★★ |

---

## PART 8 — Recommended Work Order

### Wave 1 — quick wins, very high ROI (do first)
1. **Undo gaps fix-up** (C6, C7, H3, H8 — ~1 day total). Add `pushHistory()` calls to the seven dispatch arms that currently lack them. Also make Booleans replace the active mesh rather than parent to scene root. Single small PR.
2. **Wire Grab / Rotate / Scale modal** (C1–C3, ~2–3 days). Implement one modal-transform helper:
   - press G/R/S → enter modal
   - mouse-move applies a delta to `selectedVerts` (and recomputes for edge/face mode)
   - click commits + `pushHistory`; Esc / RMB cancels + restores
   - X/Y/Z keys constrain to axis; Shift+X for plane
   This is the single biggest UX win — it makes the editor feel like a real polygon modeler.
3. **Wire Extrude** (C4, ~0.5 d on top of wave-1 #2). Reuses the modal helper: face-extrude pushes verts along the face normal.

### Wave 2 — after wave 1 validates the modal pattern (do second)
1. **Selection-ID remap** (C8, ~1–2 days). Inside `rebuildMeshGeometry`, build oldId→newId map and rewrite the selection Sets. Eliminates the entire class of "did the right thing to the wrong elements" bugs.
2. **Bevel & Inset polish** (H1, H2, ~2 days). Modal preview, numeric input, segments. Now they match Blender muscle memory.
3. **Edit-mode box select** (H7, ~1 day). The other half of the "feels like a modeler" upgrade.

### Defer / skip
- **M3 (incremental rebuild)** — high risk, only worthwhile after the above are done and the user is hitting perf walls.
- **M6 (GPU brush parity)** — low ROI; CPU path covers all features.
- **L2 (multi-segment knife)** — niche.
- **Finish `bevelEdges` side faces (C5)** — gated by H1 being in place; do as part of Wave 2 if the modal-bevel preview reveals the topology bug visibly.
- **Per-element gizmo (H4)** — defer until after modal G/R/S lands; modal may make a gizmo unnecessary for many users.

---

## PART 9 — Comparison to Blender / Maya

| Tool | Blender equivalent | Feature parity | UX | Performance |
|---|---|---|---|---|
| Select verts/edges/faces | 1/2/3 | yes (vert/edge/face modes match) | behind (no Shift toggle, no lasso, no box in edit mode) | matches on small meshes |
| Grab (G) | G | **no — not functional today** | n/a | n/a |
| Rotate (R) | R | **no — not functional today** | n/a | n/a |
| Scale (S) | S | **no — not functional today** | n/a | n/a |
| Extrude (E) | E | **no — stub** | n/a | n/a |
| Loop Cut (Ctrl+R) | Ctrl+R | yes | behind (no ghost line, no mouse-wheel for cut count) | matches |
| Knife (K) | K | partial — plane-only | behind (no multi-segment, no per-edge confirm) | matches |
| Edge Slide (G,G) | G,G | yes | behind (no even/flip, no undo) | matches |
| Bevel (Ctrl+B) | Ctrl+B | partial — runs but side faces incomplete | behind (no segments, no preview, hard-coded amount) | matches |
| Inset (I) | I | yes | behind (no preview, hard-coded amount, no individual mode) | matches |
| Boolean U/S/I | Boolean modifier or Bool Tool | yes | behind (no live modifier; destructive only; no undo) | unknown |
| Sculpt brushes | Sculpt Mode | most CPU brushes present | matches for present brushes; behind (no remesh-in-place button, GPU parity gap) | matches; GPU path is ahead for the 6 brushes it supports |
| DynTopo | Dynamic Topology | yes | matches | matches |
| Subdivide / SubD modifier | Ctrl+1..5 / SubD | partial — only via modifier stack, not as a one-key op | behind | unknown |
| Modifier stack | Properties → modifiers | yes — 29 modifiers across base+extended | unknown — modifier UI not in this audit | unknown |
| Gizmo (object) | TransformControls | yes | matches | matches |
| Per-element gizmo | yes in Blender 3.x | **no** | behind | n/a |
| Mirror | Ctrl+M / Mirror modifier | only via modifier | behind (no instant Mirror op) | n/a |
| Snap | Shift+Tab | yes (toggle exists) | unknown — snap behavior not audited | unknown |
| Auto-keyframe of mesh edits | Shape keys / drivers | **no** | behind | n/a — by design, only object transforms keyframe today |

**What's missing entirely that Blender users would expect:**
- Working G/R/S/E with modal axis constraint (the #1 gap)
- Vertex/edge/face box-select & lasso in edit mode
- Bevel segments + width preview
- Live modifier stack preview (the modifiers exist but their UX coupling to edit mode is unverified)
- Shape keys / vertex animation
- Subdivide as a one-key operation (Ctrl+1..5)
- Per-element gizmo
- Smart Select (loop / ring / shortest path)
- Merge submenu (At Center / At Cursor / Collapse / By Distance) with hotkeys
- Mirror as instant operation, not just as modifier
- Snap-during-drag with element/edge/face targets

---

## Appendix A — Files inspected

- `src/App.jsx` (5584 lines) — dispatch table at `:3340–3925`, selection state, undo, keyframe markers, mouse handlers
- `src/components/MeshEditorPanel.jsx` (464 lines) — tool button definitions and labels
- `src/components/panels/FilmSculptPanel.jsx` — sculpt UI
- `src/components/SculptPanel.jsx` — sculpt UI (top-level component)
- `src/components/mesh/ProMeshPanel.jsx` — alternative pro mesh panel (canonical HEM-edit pattern at `:151–157`)
- `src/components/TransformGizmo.js` — object gizmo
- `src/mesh/HalfEdgeMesh.js` — topology core
- `src/mesh/BooleanOps.js` — booleans
- `src/mesh/SculptEngine.js` — CPU sculpt
- `src/mesh/SculptBrushes.js` — extended sculpt brushes
- `src/mesh/GPUSculptEngine.js` — WebGPU sculpt
- `src/mesh/DynamicTopology.js` — dyntopo
- `src/mesh/NgonSupport.js` — unwired n-gon helpers
- `src/mesh/ModifierStack.js`, `src/mesh/ExtendedModifiers.js` — modifier definitions

## Appendix B — Items flagged as "needs hands-on testing"
- Mesh repair ops: `fix_normals`, `fill_holes`, `rm_degenerate`, `full_repair`
- Remesh ops: `voxel_remesh`, `quad_remesh`, `auto_retopo`, `marching_cubes`
- UV projections: `uv_box`, `uv_sphere`, `uv_planar`
- All 29 modifier stack entries
- Exotic primitives: `gear`, `pipe`, `helix`, `staircase`, `arch`, `lathe`
- Whether single-click vertex pick works correctly on very dense meshes
- Whether sculpt overlays / dyntopo interact correctly with HEM edit mode after switching back
