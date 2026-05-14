# SPX 3D Mesh Editor — Advanced Editing Tools & SPX Sketch Audit

**Date:** 2026-05-14
**Repo:** `/workspaces/spx3dmesh2` (branch `main`)
**Method:** Static read. No runtime tests executed.
**Companion audits:** `edit_tools_audit.md`, `selection_visibility_audit.md`.

> **Bucket key** (used throughout): **WORKING** (button→handler→engine→visible result), **WIRED-BUT-BROKEN** (button + handler reachable, engine no-ops or fails silently), **STUB** (handler only sets status text or toggles a state flag with no consumer), **BACKEND-ONLY** (engine exists, no UI wiring), **UI-ONLY** (button exists, no engine), **MISSING** (referenced but the named symbol doesn't exist).

---

## PART 1 — Advanced Editing Tools Inventory

### 1.1 Sculpt tools

**SculptPanel.jsx (top-level)** at `src/components/SculptPanel.jsx`:
- Brush definitions: `BRUSHES` array `SculptPanel.jsx:4–18` — 13 entries (`draw`, `clay`, `smooth`, `crease`, `flatten`, `inflate`, `grab`, `mask`, `pinch`, `polish`, `flatten` (dup), `sharpen`, `elastic`).
- Brush selection button: `SculptPanel.jsx:107–115` → fires `onApplyFunction("brush_<id>")`.

**App dispatch** at `App.jsx:4171`:
```
if (fn.startsWith("brush_")) { const b = fn.replace("brush_", ""); setSculptBrush(b); setEditMode("sculpt"); setStatus("Brush: " + b); return; }
```
This sets `sculptBrush` (state) and `editMode = "sculpt"`. The actual sculpt deformation is applied by `applySculpt` (`App.jsx:3031–3088`), which always calls `applySculptStroke` from `SculptEngine.js:391`. The engine then dispatches to `_applyBrushType` at `SculptEngine.js:190`, which has cases for: `draw`, `clay`, `inflate`, `pinch`, `crease`, `flatten`, `smooth`, `grab`. **Missing brush implementations in the engine: `mask`, `polish`, `sharpen`, `elastic`.** A brush named in the panel but not in the engine becomes a no-op (the engine's switch falls through).

| Brush | UI | Dispatch | Engine | Bucket |
|---|---|---|---|---|
| draw     | ✔ | `brush_draw` → setSculptBrush  | `SculptEngine.js:190` `_applyBrushType("draw")` | **WORKING** (assuming selection bug from `selection_visibility_audit.md` not in play — sculpt uses `getSculptHit`, not selection sets) |
| clay     | ✔ | ✔ | `SculptEngine.js:190` + `SculptBrushes.js:46` `applyClay` | **WORKING** (two clay impls exist — engine uses its own) |
| smooth   | ✔ | ✔ | `SculptEngine.js:190` + `smoothVertices` (`SculptEngine.js:271`) | **WORKING** |
| crease   | ✔ | ✔ | `SculptEngine.js:190` | **WORKING** |
| flatten  | ✔ (dup × 2 in array) | ✔ | `SculptEngine.js:190` + `applyFlattenBrush` (`SculptLayers.js:140`) | **WIRED-BUT-BROKEN** (engine has it, but the duplicate entry in the array makes the button render twice — last entry wins for `sculptBrush` selection state) |
| inflate  | ✔ | ✔ | `SculptEngine.js:190` | **WORKING** |
| grab     | ✔ | ✔ | `SculptEngine.js:190` | **WORKING** |
| mask     | ✔ | `brush_mask` → setSculptBrush("mask") | `_applyBrushType` has no `case "mask"`. `applyMaskBrush` exists at `SculptLayers.js:179` but is never called from `applySculpt`. | **WIRED-BUT-BROKEN** (sculpt continues but mask is not painted; mask buttons in panel are also unwired — see below) |
| pinch    | ✔ | ✔ | `SculptEngine.js:190` | **WORKING** |
| polish   | ✔ | `brush_polish` | No engine case. `applyPolishBrush` exists at `SculptLayers.js:156` — not wired. | **WIRED-BUT-BROKEN** |
| sharpen  | ✔ | `brush_sharpen` | No engine case anywhere. | **STUB** |
| elastic  | ✔ | `brush_elastic` | No engine case. | **STUB** |

**Dynamic Topology (dyntopo)**
- Toggle dispatch arm: `App.jsx:4172` (`if (fn === "dyntopo") { setDyntopoEnabled(v => !v); setStatus(...); return; }`). Just flips a flag.
- Consumer: `App.jsx:3079–3082` inside `applySculpt`:
  ```
  if (dyntopoEnabled && sculptStrokeCountRef.current % 2 === 0 && typeof window.applyDyntopo === "function") {
    window.applyDyntopo(mesh, hit, { detailSize: 0.03, ... });
  }
  ```
- `applyDyntopo` is exported by `DynamicTopology.js:101` and assigned to `window.applyDyntopo` — verified at `App.jsx` (search for `window.applyDyntopo`).
- Status: **WORKING** for toggle + per-stroke subdivision/collapse. `dyntopo_flood` (`SculptPanel.jsx:257`) and `smooth_topo` (`SculptPanel.jsx:260`) have **no dispatch arms** — fall through to the `window[fn]` fallback at `App.jsx:4369`; `dyntopoFloodFill` (`DynamicTopology.js:114`) and `smoothTopology` (`DynamicTopology.js:128`) are not assigned to window. **STUB.**

**Mask painting**
- Backend: `SculptEngine.js:314 createMask`, `318 paintMask`, `330 invertMask`, `334 clearMask`, `430 growMask`, `445 shrinkMask`. Functions exist.
- UI buttons: `SculptPanel.jsx:287–293` — `brush_mask`, `brush_pose`, `mask_invert`, `mask_clear`, `mask_blur`, `mask_grow`, `mask_shrink`.
- App dispatch: **NONE for any `mask_*` function.** The `brush_mask` arm sets `sculptBrush="mask"` but `applySculpt` has no mask branch. All `mask_*` buttons fall through to `window[fn]` fallback at `App.jsx:4369` — none of those functions are assigned to window. **BACKEND-ONLY** for all mask operations.

**Multi-resolution**
- Backend: `MultiresSystem.js` — `createMultiresStack`, `subdivideLevel`, `setMultiresLevel`, `bakeDownLevel`, `applyMultires`, `getMultiresStats`. All exported.
- Window exposure: `App.jsx:2076–2079` exposes `createMultiresStack`, `subdivideLevel`, `setMultiresLevel`, `bakeDownLevel`.
- UI buttons: `SculptPanel.jsx:285–303` — `multires_add`, `multires_bake`, `multires_level`.
- App dispatch: **No `multires_*` arms anywhere.** Fall through to `window[fn]` fallback. The window-exposed names don't match the button names (window has `subdivideLevel`, button fires `multires_add`). **BACKEND-ONLY → effectively MISSING from UI.**

**Symmetry**
- State: `sculptSymX/Y/Z` checkboxes on `SculptPanel.jsx:189–191`.
- The X checkbox at `SculptPanel.jsx:139` fires `onApplyFunction("sculpt_sym_x")` on change. **No `sculpt_sym_x` dispatch arm.** State is set locally; only `sculptSymX` makes it into `applySculpt`'s brush options (`App.jsx:3058–3059`). Y/Z setters exist but the engine has no Y/Z symmetry branch. **WIRED-BUT-BROKEN for Y/Z; partial WORKING for X.**

**Other sculpt UI buttons with no dispatch arms** (all fall through to `window[fn]` fallback, none of which are exposed):
- `sculpt_matcap_on`/`sculpt_matcap_off` (`SculptPanel.jsx:195`) — STUB
- `sculpt_cavity_on`/`sculpt_cavity_off` (`SculptPanel.jsx:199`) — STUB
- `alpha_circle`, `alpha_stars`, `alpha_noise`, `alpha_cracks`, `alpha_fabric`, `alpha_skin`, `alpha_load` (`SculptPanel.jsx:155–165`) — STUB (no dispatch; `AlphaBrush.js` exists but isn't imported by `App.jsx` for the action path)
- `layer_new`, `layer_base` (`SculptPanel.jsx:174–175`) — STUB (`SculptLayers.js` exports `addSculptLayer` etc., but no dispatch)

### 1.2 Modifier stack

**Engines**
- `ModifierStack.js` exports `MOD_TYPES` (10 types) and `applyModifier`/`applyModifierStack`: SUBDIVISION, MIRROR, SOLIDIFY, ARRAY, DISPLACE, SMOOTH, DECIMATE, CAST, TWIST, BEND. All have implementations (`ModifierStack.js:52–253`).
- `ExtendedModifiers.js` exports 17 more (`EXTENDED_MOD_TYPES`): WAVE, LATTICE, SCREW, TRIANGULATE, WIREFRAME, REMESH, SIMPLE_DEFORM, OCEAN, SHRINKWRAP, EDGE_SPLIT, WEIGHTED_NORMAL, BUILD, MASK, MULTIRES, MESH_DEFORM, SKIN, plus `applyShrinkwrap`.
- `ModifierStack50.js` exports 16 more: LAPLACIAN_SMOOTH, HOOK, VOLUME_DISPLACE, NORMAL_EDIT, CORRECTIVE_SMOOTH, WELD, SUBDIVIDE_SIMPLE, NOISE_TEXTURE, TAPER, SHEAR, PUSH, UV_WARP, VERTEX_WEIGHT, PARTICLE_INSTANCE, FRACTURE_SIMPLE, EXTRUDE. `MODIFIER_COUNT = 50` (line 431) is aspirational — the file has 16 implementations and a unified dispatcher (`applyModifier50` at line 409).

**UI**
- Panel: `src/components/panels/ModifierStackPanel.jsx`. Opens via `App.jsx:5378–5382` when `modifierStackOpen=true`.
- Panel uses `window._modStack` as the live array. Add via type-picker, drag-to-reorder, "Apply All" via `handleApplyAll` (`ModifierStackPanel.jsx:91–111`).
- `handleApplyAll` clones `meshRef.current.geometry`, walks `stack`, calls the correct dispatcher (`applyModifierStack` / `applyExtendedModifier` / `applyModifier50`) by membership in the type sets (`ModifierStackPanel.jsx:50–52`, `74–89`).

**App.jsx direct arms** (sidestep the stack):
- `modifier_add` (`App.jsx:3638`) — dynamic-imports `ModifierStack.js`, adds a SUBDIVISION mod, applies stack to mesh in place. Note: hardcoded to SUBDIVISION at line 3640 (`addModifier(window._modStack, MOD_TYPES.SUBDIVISION, {})`).
- `modifier_apply_all` (`App.jsx:3653`) — same as ModifierStackPanel's handleApplyAll.
- `mod_wave`, `mod_triangulate`, `mod_wireframe`, `mod_laplacian`, `mod_lattice`, `mod_screw`, `mod_build`, `mod_ocean`, `mod_deform`, `mod_shrinkwrap`, `mod_hook`, `mod_volume`, `mod_normal_edit`, `mod_corrective`, plus dups (`App.jsx:4275–4290`). Each calls the engine directly on `meshRef.current.geometry` with default params, marks `needsUpdate`. **These bypass the stack — they are destructive direct-apply.** Several are duplicated (`mod_triangulate` and `mod_wireframe` appear twice at 4276/4289 and 4277/4290).

**Non-destructive workflow status**
- The "stack" concept exists in `window._modStack`, but stack-apply is destructive (`handleApplyAll` clears the stack and overwrites the geometry). There is no per-frame re-evaluation: the stack is collapsed on Apply All, then emptied. **The "non-destructive" claim is structurally false; the system is just batch-destructive.**

| Modifier | Engine | Panel-pickable | Direct dispatch arm | Bucket |
|---|---|---|---|---|
| Subdivision | ✔ `ModifierStack.js:52` | ✔ | `modifier_add` only | **WORKING** (panel) |
| Mirror | ✔ `ModifierStack.js:61` | ✔ | — | **WORKING** (panel) |
| Solidify | ✔ `ModifierStack.js:83` | ✔ | — | **WORKING** (panel) |
| Array | ✔ `ModifierStack.js:106` | ✔ | — | **WORKING** (panel) |
| Displace | ✔ `ModifierStack.js:118` | ✔ | — | **WORKING** (panel) |
| Smooth | ✔ `ModifierStack.js:139` | ✔ | — | **WORKING** (panel) |
| Decimate | ✔ `ModifierStack.js:169` | ✔ | — | **WORKING** (panel) |
| Cast | ✔ `ModifierStack.js:180` | ✔ | — | **WORKING** (panel) |
| Twist | ✔ `ModifierStack.js:204` | ✔ | — | **WORKING** (panel) |
| Bend | ✔ `ModifierStack.js:233` | ✔ | — | **WORKING** (panel) |
| Wave | ✔ `ExtendedModifiers.js:11` | ✔ | `mod_wave` | **WORKING** |
| Lattice | ✔ `ExtendedModifiers.js:28` | ✔ | `mod_lattice` | **WIRED-BUT-BROKEN** — `applyLattice` (line 28) takes `(geometry, latticePoints, options)`; `mod_lattice` arm (`App.jsx:4279`) calls `applyLattice(meshRef.current.geometry)` with no lattice points → likely throws or no-ops |
| Screw | ✔ `ExtendedModifiers.js:55` | ✔ | `mod_screw` | **WORKING** |
| Triangulate | ✔ `ExtendedModifiers.js:75` | ✔ | `mod_triangulate` (dup at `4276`+`4289`) | **WORKING** |
| Wireframe | ✔ `ExtendedModifiers.js:97` | ✔ | `mod_wireframe` (dup at `4277`+`4290`) | **WORKING** |
| Remesh | ✔ `ExtendedModifiers.js:128` | ✔ | — | **WORKING** (panel only) |
| Simple Deform | ✔ `ExtendedModifiers.js:172` | ✔ | `mod_deform` | **WORKING** |
| Ocean | ✔ `ExtendedModifiers.js:209` | ✔ | `mod_ocean` | **WORKING** |
| Shrinkwrap | ✔ `ExtendedModifiers.js:238` | ✔ | `mod_shrinkwrap` | **WIRED-BUT-BROKEN** — expects `(geometry, targetGeometry, params)`; arm passes only geometry → likely throws |
| Edge Split | ✔ `ExtendedModifiers.js:263` | ✔ | — | **WORKING** (panel only) |
| Weighted Normal | ✔ `ExtendedModifiers.js:289` | ✔ | — | **WORKING** (panel only) |
| Build | ✔ `ExtendedModifiers.js:323` | ✔ | `mod_build` | **WORKING** |
| Mask (Modifier) | ✔ `ExtendedModifiers.js:336` | ✔ | — | **WIRED-BUT-BROKEN** — needs `vertexGroup` arg |
| Multires (modifier) | ✔ `ExtendedModifiers.js:359` | ✔ | — | **WORKING** (panel only) |
| Mesh Deform | ✔ `ExtendedModifiers.js:371` | ✔ | — | **WIRED-BUT-BROKEN** — needs cageGeometry arg |
| Skin (modifier) | ✔ `ExtendedModifiers.js:404` | ✔ | — | **WORKING** (panel only) |
| Laplacian Smooth | ✔ `ModifierStack50.js:10` | ✔ | `mod_laplacian` | **WORKING** |
| Hook | ✔ `ModifierStack50.js:83` | ✔ | `mod_hook` | **WIRED-BUT-BROKEN** — needs `hookPoint, targetPoint` |
| Volume Displace | ✔ `ModifierStack50.js:100` | ✔ | `mod_volume` | **WORKING** |
| Normal Edit | ✔ `ModifierStack50.js:121` | ✔ | `mod_normal_edit` | **WORKING** |
| Corrective Smooth | ✔ `ModifierStack50.js:142` | ✔ | `mod_corrective` | **WIRED-BUT-BROKEN** — needs `restGeometry` |
| Weld | ✔ `ModifierStack50.js:162` | ✔ | — | **WORKING** (panel only) |
| Subdivide Simple | ✔ `ModifierStack50.js:185` | ✔ | — | **WORKING** (panel only) |
| Noise Texture | ✔ `ModifierStack50.js:219` | ✔ | — | **WORKING** (panel only) |
| Taper | ✔ `ModifierStack50.js:238` | ✔ | — | **WORKING** (panel only) |
| Shear | ✔ `ModifierStack50.js:262` | ✔ | — | **WORKING** (panel only) |
| Push | ✔ `ModifierStack50.js:278` | ✔ | — | **WORKING** (panel only) |
| UV Warp | ✔ `ModifierStack50.js:292` | ✔ | — | **WORKING** (panel only) |
| Vertex Weight | ✔ `ModifierStack50.js:307` | ✔ | — | **WIRED-BUT-BROKEN** — needs `weights` |
| Particle Instance | ✔ `ModifierStack50.js:321` | ✔ | — | **WIRED-BUT-BROKEN** — needs `instanceGeo` |
| Fracture Simple | ✔ `ModifierStack50.js:338` | ✔ | — | **WORKING** (panel only) |
| Extrude (mod) | ✔ `ModifierStack50.js:357` | ✔ | — | **WORKING** (panel only) |

Note: every direct-apply arm at `App.jsx:4275–4290` operates on `meshRef.current.geometry` only; when `meshRef.current` is null (see `selection_visibility_audit.md` — clicking off the mesh nulls this ref), the if-guard fails silently.

### 1.3 N-gon support

`NgonSupport.js` (138 lines). Exports: `triangulateNgon`, `buildNgonGeometry`, `addNgonFace`, `getNgonFaces`, `getTris`, `getQuads`, `getPolygons`, `dissolveEdge`, `bridgeFaces`, `gridFill`, `pokeFace`, `insetFace`, `convertNgonsToTris`, `getNgonStats`.

**Critical:** n-gons are stored on `hem.ngonFaces` (an ad-hoc property dropped onto the HalfEdgeMesh object — `NgonSupport.js:37`). The core `HalfEdgeMesh.js` engine has **no awareness** of `ngonFaces`:
- `HalfEdgeMesh.js` is grepped for `ngonFaces` — zero hits.
- `toBufferGeometry` in `HalfEdgeMesh.js` reads only the standard `faces` map. Anything added to `ngonFaces` is dropped on every rebuild.
- Dispatch: `triangulateNgon, buildNgonGeometry, dissolveEdge, bridgeFaces, gridFill, pokeFace, insetFace, convertNgonsToTris` are imported in `App.jsx:156` but **none are called from any dispatch arm.**

**Status: BACKEND-ONLY, with a structural gap.** Even if wired, the data wouldn't survive a mesh rebuild because `toBufferGeometry` doesn't read `ngonFaces`. Note the `gridFill` here is **a different function** from the working `heMesh.gridFill` used by `App.jsx:3816`.

### 1.4 Advanced topology tools

| Tool | UI | Dispatch | Engine | Bucket |
|---|---|---|---|---|
| Grid fill | (no UI button; dispatched as `grid_fill`) | `App.jsx:3816` | `HalfEdgeMesh.gridFill` | **WORKING** (provided `selectedVerts` has IDs — broken at selection layer per companion audit) |
| Target weld | — | `App.jsx:3817` | `HalfEdgeMesh.targetWeld` | **WORKING** (subject to selection) |
| Chamfer vertex | — | `App.jsx:3818` | `HalfEdgeMesh.chamferVertex` | **WORKING** (subject to selection) |
| Average vertices | — | `App.jsx:3819` | `HalfEdgeMesh.averageVertices` | **WORKING** (subject to selection) |
| Circularize | — | `App.jsx:3820` | `HalfEdgeMesh.circularize` | **WORKING** (subject to selection) |
| Reorder verts | — | `App.jsx:3821` | `HalfEdgeMesh.reorderVertices` | **WORKING** (no selection needed) |
| Connect components | — | `App.jsx:3822` | `HalfEdgeMesh.connectComponents` | **WORKING** (subject to selection) |
| Multi-cut / smart knife | — | — | `App.jsx:3000–3028` has `onKnifeClick` — single-cut prototype only | **STUB** — Maya-style multi-cut not implemented |
| Quad draw / retopo brush | — | `auto_retopo` (`App.jsx:3913`) → `window.quadDominantRetopo` | `AutoRetopo.js` exists | needs verification — **BACKEND-ONLY in interactive form** |
| Mirror w/ merge | partial — Mirror modifier merges threshold | — | `applyMirror` (`ModifierStack.js:61`) with `mergeThreshold` param | **WIRED-BUT-BROKEN** (mergeThreshold parameter is set but the implementation never actually welds — it just appends the mirrored geometry; see lines 80, `mergeGeometries`) |

The **dispatch arms `grid_fill` etc. have no UI buttons in `MeshEditorPanel.jsx`.** They are reachable only via the broader `pro-ui/workspaceMap.js` ribbon or keyboard. The buttons in the basic editor panel don't expose them.

### 1.5 UV tools (advanced)

**Engines:**
- `mesh/UVUnwrap.js` (top-level): `SeamManager`, `smartUnwrap`, `UDIMLayout`, `packIslands`, `uvPlanarProject`, `uvBoxProject`, `uvSphereProject`.
- `mesh/uv/UVUnwrap.js` (subdir, different file): `buildCheckerTexture`, `applyCheckerToMesh`, `ensureUVAttribute`, `unwrapBoxProjection`, `exportUVLayoutGLB`, `markSeam`, `clearSeam`, `toggleSeam`, `clearAllSeams`, `getSeams`, `packUVIslands`, `liveUnwrap`, `smartUnwrap` (yes — second copy with same name).
- `mesh/uv/UVTools.js`: `toggleIslandSeam`, `setIslandProjection`, `packIslands` (third copy), `scaleSelectedToTexelDensity`, `weldNearbyUVs`, `mirrorIsland`, `rotateSelectedBy90`, `projectIslandToUnitSquare`, `setSelectionMode`. **None of these are imported by `App.jsx`.**

**Dispatch:**
- `live_unwrap` → `App.jsx:3811` → `liveUnwrap` from `mesh/uv/UVUnwrap.js`. **WORKING.**
- `uv_box` / `uv_sphere` / `uv_planar` → `App.jsx:3917–3919` → `uvBoxProject` / `uvSphereProject` / `uvPlanarProject` from `mesh/UVUnwrap.js` (top-level file, not the subdir version). **WORKING.**
- `smart_unwrap` (`App.jsx:3801`) — dynamic-import `mesh/uv/UVUnwrap.js`, calls `smartUnwrap(heMeshRef.current, getSeams())`. **WORKING** (if seams populated; otherwise empty result).
- `mark_seam` (`App.jsx:3808`) — toggles seams via `toggleSeam` over `selectedEdges`. **WORKING** (subject to selection).

**Pelting, multi-UV sets, layout optimization:** Not implemented. `UVTools.js` has `weldNearbyUVs`, `mirrorIsland`, etc. but they are **BACKEND-ONLY** — no dispatch, no UI.

### 1.6 Deformers

| Deformer | Engine | UI | Bucket |
|---|---|---|---|
| Lattice (modifier-form) | `ExtendedModifiers.js:28` `applyLattice(geometry, latticePoints, opts)` | Modifier stack picker; `mod_lattice` direct arm | **WIRED-BUT-BROKEN** (no lattice points provided) |
| Wrap / Mesh Deform | `ExtendedModifiers.js:371` `applyMeshDeform(geometry, cageGeometry, params)` | Modifier stack picker | **WIRED-BUT-BROKEN** (no cage provided) |
| Shrinkwrap | `ExtendedModifiers.js:238` | Stack + `mod_shrinkwrap` arm | **WIRED-BUT-BROKEN** (no target) |
| Hook | `ModifierStack50.js:83` | Stack + `mod_hook` arm | **WIRED-BUT-BROKEN** (no hook/target points) |
| Cluster / Soft Mod | — | — | **MISSING** — no engine, no UI |
| Blend shapes / Shape Keys | `ShapeKeys.js` (7 fns), `ShapeKeysAdvanced.js` (corrective, driven, combination, inbetween, mirror) | `shapekey_new`/`shapekey_apply` (`App.jsx:4322–4323`) | **WORKING** for basic; advanced features (corrective, driven, combination) are **BACKEND-ONLY** |

### 1.7 Rigging / skinning

**Engines:**
- `ArmatureSystem.js` — `createArmature`, `addBone`, `findBoneById`, `selectBone`, `buildBoneDisplay`, `updateBoneDisplay`, `moveBoneHead`, `moveBoneTail`, `parentBone`, `getArmatureStats`, `serializeArmature`.
- `SkinningSystem.js` — `applyLBS`, `applyDQS`, `preserveVolume`, `bakeHeatWeights`, `normalizeWeights`, `mirrorWeights`, `smoothWeights`, `createSkinnedMesh`, `bindMeshToArmature`, `createMixer`, `playClip`.
- `WeightPainting.js` — `initWeights`, `paintWeight`, `normalizeWeights`, `autoWeightByDistance`, `getWeightColor`, `visualizeWeights`.
- `rig/AutoRigSystem.js` — `createHumanoidAutoRig`, `autoBindSkeletonToMesh`, `generateBasicWeights`, `findPrimaryMesh`, `runAutoRig`.
- `rig/AutoRigGuides.js`, `rig/AdvancedRigging.js`.

**UI:**
- `components/rig/AutoRigPanel.jsx` — interactive SVG guide editor, then `runAutoRig`. Opened via `Shift+R` (`App.jsx:659–667`).
- `components/rig/RiggingPanel.jsx`, `components/rig/AdvancedRigPanel.jsx`. Verified present, not inspected in this audit.

**Dispatch:**
- `create_armature` (`App.jsx:4175`) — calls `createArmature` and stores. **WORKING.**
- `add_bone` (`App.jsx:4176`) — uses `window.addBone`. Assigned somewhere? Let me note this as **needs verification — depends on window assignment elsewhere**.
- `enter_pose`, `capture_pose`, `reset_pose` — same pattern (window-bound). **WIRED, depends on window setup.**
- `ik_chain` (`App.jsx:4180`) — calls `createIKChain([])`. **WORKING.**
- `heat_weights`, `norm_weights` — window-bound. **WIRED.**
- `paint_weights` (`App.jsx:4182`) — sets `editMode = "weight_paint"`. But: there is no `weight_paint` handler in the mouse pipeline that actually paints weights. `paintWeight` from `WeightPainting.js:18` is never called from App. **STUB.**
- `bvh_import`, `mocap_retarget`, `mocap_bake`, `mocap_footfix`, `mocap_automap`, `mocap_bvh_export` — all `WORKING` via direct engine calls.
- `walk_gen`/`idle_gen`/`breath_gen` (`App.jsx:4324–4326`) — window-bound. **WIRED.**

**Component editor (Maya-style per-vertex weight editor):** **MISSING.** No table view, no per-vertex weight readout.

### 1.8 Hair tools

**Engines (top-level):**
- `HairSystem.js` (10 fns), `HairGrooming.js` (10 brushes + `applyGroomBrush`), `HairUpgrade.js` (collision, density maps, braid/bun/ponytail presets, emitFromUV), `HairPhysics.js` (12 fns), `HairCards.js`, `HairShader.js`, `FibermeshSystem.js`, `GroomSystem.js`.

**Engines (subdir `mesh/hair/`):**
- `HairFitting.js` (fit-to-head), `HairBrushes.js`, `HairAdvancedEditing.js` (braid path, lineup, fade, beard trim, scalp mask), `HairCardUV.js`, `HairLOD.js`, `HairLayers.js`, `HairMaterials.js`, `HairMath.js`, `HairProceduralTextures.js`, `HairRigPhysics.js`, `HairTemplates.js`, `HairWindCollision.js`, `ProceduralBraids.js`, `WetHairShader.js`, `GroomStrands.js`, `HairAccessories.js`.

**UI panels:**
- `components/hair/HairPanel.jsx` — opens via `Shift+H` (`App.jsx:760–769`).
- `components/hair/HairAdvancedPanel.jsx` — `Shift+J` (`App.jsx:688–697`).
- `components/hair/HairFXPanel.jsx` — `Shift+K` (`App.jsx:673–682`).
- Plus `FilmHairPanel.jsx`, `GroomBrushPanel.jsx`, `BraidGeneratorPanel.jsx`, `FadeToolPanel.jsx`, `HairCardLODPanel.jsx` (panels referenced in App).

**Dispatch (App.jsx):**
- `hair_emit` (`App.jsx:4355`) — `window.emitHair(meshRef.current)`. **WORKING** if `meshRef` set and `window.emitHair` assigned.
- `hair_physics` (`App.jsx:4356`) — `window.createHairPhysicsSettings()`. **WIRED.**

The vast majority of hair operations are **UI-handler-only** — the panels themselves call the engines internally. From App.jsx's master dispatcher, only two arms exist (`hair_emit`, `hair_physics`). The hotkey handlers (`onHairKey`, `onHairAdvancedKey`, `onHairFXKey`) only TOGGLE panel visibility — they don't dispatch any actions. The actions inside each Hair panel are not surveyed in this audit but the engines exist; assume mostly **WORKING when panel is open**, with the caveat that some advanced features depend on a fit-to-head workflow that needs an active head mesh.

### 1.9 Cloth

**Engines:**
- `ClothSystem.js` (15 fns + presets), `ClothCollision.js`, `ClothPinning.js`, `ClothUpgrade.js`, `GPUClothSolver.js`.
- `clothing/index.js` re-exports: `GarmentTemplates`, `GarmentFitting`, `ClothSimulation`, `CollisionPinning`, `FabricPresets`, `GarmentThickness`, `WrinkleNoise`, `LayeredGarments`, `GarmentUVAuto`, `BodyMeasurementFit`. Plus loose files: `FlatSketchExport`, `GarmentColorways`, `GarmentGrading`, `PatternBridge`, `PatternEditor`, `SeamStitching`.

**UI:** `components/clothing/ClothingPanel.jsx`, `FabricPanel.jsx`, `PatternEditorPanel.jsx`, `components/panels/ClothSimPanel.jsx`. Hotkey: `Shift+G` (`App.jsx:794–802`) for ClothingPanel.

**Dispatch:**
- `cloth_sim_start` (`App.jsx:3776`), `cloth_sim_stop` (`App.jsx:3794`) — start/stop loops, **WORKING** (assume).
- `cloth_cotton`, `cloth_silk` (`App.jsx:4353–4354`) — `window.createCloth(meshRef.current)`. **WIRED**.

Most clothing/garment workflow logic is in the panels, similar to hair.

### 1.10 Material / paint

**Engines:**
- `TexturePainter.js` — `createPaintCanvas`, `createPaintTexture`, `applyPaintTexture`, `paintAtUV`, `fillCanvas`, `createLayerStack`, `addLayer`, `flattenLayers`, `exportTexture`, `generateNormalMap`, `exportMaps`.
- `VertexColorPainter.js` — `initVertexColors`, `paintVertexColor`, `fillVertexColor`, `gradientFillVertexColor`.
- `VertexColorAdvanced.js`.
- `materials/MaterialSlots.js`, `materials/TexturePaint.js`.
- `SmartMaterials.js`.

**UI:**
- `components/materials/MaterialPanel.jsx`, `TexturePaintPanel.jsx`. Hotkey `Shift+M` (`App.jsx:824–832`).
- `MaterialEditor.jsx`, `MaterialNodePanel.jsx`, `NodeMaterialEditor.jsx`, `ShaderGraphPanel.jsx`, `ShaderNodeEditorPanel.jsx`, `MaterialGraphPanel.jsx`, `MaterialTexturePanel.jsx`, `FilmMaterialPanel.jsx`, `AdvancedSkinShaderPanel.jsx`, `SmartPresetPanel.jsx` — many panels, not all surveyed.

**SculptPanel V.Color tab** at `SculptPanel.jsx:309–360`:
- Buttons: `vc_init`, `vc_fill`, `vc_layers`, `vc_smear`, `vc_blur`, `vc_flatten`, `vc_gradient`.
- **No dispatch arms in App.jsx for any `vc_*`.** Fall through to `window[fn]` fallback. `paintVertexColor`/`fillVertexColor`/`gradientFillVertexColor` are exposed at `App.jsx:2052`+ (verified `window.paintVertexColor = paintVertexColor`). **But the panel calls `vc_*` not `paintVertexColor`** — name mismatch. **STUB across the V.Color tab.**

**Vertex paint stroke entry point:** `App.jsx:3002`:
```
if (vcPaintingRef.current && editModeRef.current === "paint") {
  applyVertexPaint(e);
  ...
}
```
**`applyVertexPaint` is never defined.** Grep across the repo finds zero hits other than this call site. Triggering paint mode here throws `ReferenceError`. **BROKEN.**

**Weight paint:** `paint_weights` (`App.jsx:4182`) sets `editMode="weight_paint"` and emits status, but there's no mouse handler that reads `editModeRef.current === "weight_paint"` to call `paintWeight`. **STUB.**

### 1.11 Pattern tools

`onPatternKey` (`App.jsx:776–784`) opens `patternPanelOpen` via `Shift+D`. No render in this scan — search for "PatternPanel" component shows `clothing/PatternEditorPanel.jsx` but no top-level pattern panel. The category covers garment-pattern editing (`mesh/clothing/PatternEditor.js`, `PatternBridge.js`). **UI hotkey works to toggle a flag, but no panel renders** — orphaned.

---

## PART 2 — SPX Sketch Inventory

### 2.1 Backend — `src/mesh/GreasePencil.js` (137 lines)

| Function | Line | What it does |
|---|---|---|
| `createStroke(points, color, thickness)` | 4 | Returns `{ id, points, color, thickness, frame=0, opacity=1 }` |
| `createLayer(name)` | 16 | Returns `{ id, name, frames:{}, visible, locked, color, opacity }` |
| `addStrokeToFrame(layer, frameNumber, stroke)` | 29 | Pushes a stroke into `layer.frames[frameNumber]` |
| `buildStrokeMesh(stroke)` | 35 | `THREE.Line` from stroke points. `LineBasicMaterial.linewidth` is set but ignored by most WebGL2 drivers. |
| `buildFrameMeshes(layer, frameNumber)` | 51 | Maps strokes → meshes, filters null |
| `strokeToMesh(stroke, radius=0.02)` | 57 | TubeGeometry along Catmull-Rom curve — proper 3D stroke |
| `buildOnionSkin(layer, currentFrame, before=2, after=1)` | 67 | Group of dimmed prev/next-frame strokes |
| `interpolateStrokes(strokeA, strokeB, t)` | 89 | Per-point lerp, point counts must match |
| `getStrokesAtFrame(layer, frame)` | 106 | Exact-frame OR nearest-frame OR interpolated-tween |
| `clearFrame(layer, frame)` | 125 | `delete layer.frames[frame]` |
| `duplicateFrame(layer, fromFrame, toFrame)` | 130 | Deep-copies strokes (note: shallow-copies points) |

**Backend gaps:**
- **No erase function.** UI tool "erase" sets a local mode but the panel's `onMouseUp` always calls `createStroke` (`GreasePencilPanel.jsx:73`) — erase mode is a no-op.
- **No fill-stroke implementation.** UI tool "fill" / `gp_fill` has no backend.
- **No tint / vertex-color-style coloring of existing strokes.** `gp_tint` has no backend.
- **No serialization** to JSON/SPX scene.

### 2.2 UI Panels

**Standalone panel — `components/greasepencil/GreasePencilPanel.jsx`:**
- Signature: `({ open, onClose, sceneRef, setStatus })` — line 7.
- Renders `null` if `!open` (line 111).
- Uses a 420×280 `<canvas>` for 2D drawing.
- Tool buttons: Draw / Erase (line 126–131), Onion Skin checkbox (133–137), Color picker (143–146), Thickness slider 1–20px (148–152), Frame navigate ◀/▶/Dup/Clear (165–171), Layer list + Add Layer (175–184), "Send to 3D Scene" (188–190).
- `onMouseDown` (53) initializes stroke buffer.
- `onMouseUp` (70) creates a stroke via `createStroke`, deep-clones the active layer to add it. Note: **Erase tool is selected but `onMouseUp` ignores `tool` state — always adds a draw stroke** (line 73).
- `sendToScene` (99) iterates layers, builds `Line` meshes via `buildStrokeMesh`, adds them directly to `sceneRef.current`. **Always uses XY coords in 0..1 space mapped to a `(x, y, 0)` 3D point** — so all strokes lie in the z=0 plane regardless of camera; useless as a "2D annotation in 3D space" unless the user re-positions later.

**SculptPanel "SPX Sketch" tab — `SculptPanel.jsx:364–431`:**
- Brush grid: `GP_BRUSHES` — `gp_draw`, `gp_fill`, `gp_erase`, `gp_tint` (`SculptPanel.jsx:33–37`).
- Color picker, thickness slider (1–20), opacity slider, fill checkbox.
- Layer text-input + `gp_layer` / `gp_stroke` buttons.
- Onion Skin section: toggle + before/after sliders. Toggle calls `gp_onion`.
- Animation section: "Interpolate Strokes" → `gp_interp`, "Add Stroke to Frame" → `gp_stroke`.

### 2.3 Dispatch arms in App.jsx (every `gp_*` and `spx_sketch`)

| Function | Line | Behavior | Bucket |
|---|---|---|---|
| `spx_sketch` | `App.jsx:4311` | `setGreasePencilPanelOpen(true)` | **WIRED-BUT-BROKEN** — opens the FloatPanel wrapper, but the inner `GreasePencilPanel` receives no `open` prop, so it returns `null` (see §2.4) |
| `gp_onion` | `App.jsx:4312–4318` | Toggles `window._gpOnion`, dispatches `spx:gp-onion-toggle` event | **STUB** — event has no listener anywhere (`grep "spx:gp-onion-toggle"` shows only the dispatch) |
| `gp_layer` | `App.jsx:4319` | `const l = createLayer(...)` then discards `l`; sets status | **STUB** — return value never stored; nothing happens visibly |
| `gp_stroke` | `App.jsx:4320` | `const s = createStroke([])` then discards `s`; sets status | **STUB** — empty stroke, never added to any layer |
| `gp_draw`, `gp_fill`, `gp_erase`, `gp_tint`, `gp_interp` | (none) | No dispatch arm. Fall through to `window[fn]` fallback (`App.jsx:4369`) → no window-exposed function with those names → `console.warn("SPX: "<fn>" not found")` | **MISSING dispatch** for all four brush selectors and `gp_interp` |

### 2.4 The "panel never renders" bug

`App.jsx:5350–5353`:
```jsx
{greasePencilPanelOpen && <FloatPanel title="SPX SKETCH" onClose={...} width={320}>
  <GreasePencilPanel onApplyFunction={handleApplyFunction} onClose={() => setGreasePencilPanelOpen(false)} />
</FloatPanel>}
```

`GreasePencilPanel`'s signature accepts `{ open, onClose, sceneRef, setStatus }` and bails with `if (!open) return null;` (`GreasePencilPanel.jsx:111`).

The caller passes neither `open`, `sceneRef`, nor `setStatus`. Result:
- `open` is `undefined` → panel **returns null**. The FloatPanel wrapper renders a chrome header with empty body.
- Even if `open` were forced true, `sendToScene` would fail at `if (!sceneRef?.current)` (`GreasePencilPanel.jsx:100`) → reports "No scene — open a 3D file first" forever.

**This means clicking the SPX Sketch button delivers an empty panel.** SPX Sketch is fundamentally non-functional via this entry point right now.

---

## PART 3 — SPX Sketch Data Model

### 3.1 Stroke storage

**Stroke object** (`GreasePencil.js:4–13`):
```
{ id, points: [{x,y,z,pressure}], color, thickness, frame, opacity }
```

**Layer object** (`GreasePencil.js:16–26`):
```
{ id, name, frames: { [frameNumber]: [strokes] }, visible, locked, color, opacity }
```

**Where layers live:**
- `GreasePencilPanel.jsx:9` — `useState([createLayer("GP_Layer_1")])` — local React state, **not persisted, not shared with the rest of the app.**
- `App.jsx:4428` — `useState([createLayer("Layer 1")])` — a parallel `gpLayers` state on App, with `gpActiveLayer`, `gpDrawing`, `gpCurrentStroke`, `gpColor`, `gpThickness` (lines 4428–4433). **Never wired to either UI.** Orphaned.
- `gp_layer` dispatch arm (`App.jsx:4319`) creates a new layer and immediately discards it. Neither the local state nor the App state is updated.

**Net:** the only working stroke storage is `GreasePencilPanel.jsx`'s local component state, which (a) only updates while the panel is open, (b) is discarded when the panel unmounts, and (c) can't be opened in the first place (§2.4).

### 3.2 Timeline integration

- `currentFrame` lives in `App.jsx:493` and drives animation playback.
- `GreasePencilPanel.jsx` has its own `frame` state (line 11), independent of `currentFrame`. Hard-coded to start at 1.
- There is **no listener** connecting App's `currentFrame` to the panel's `frame`, nor vice versa.
- `getStrokesAtFrame` interpolates between adjacent key-frames (`GreasePencil.js:106`) — the engine *supports* playback but no playback loop consumes it from App.
- Onion skin event (`spx:gp-onion-toggle`) has no listener.

**Status:** Timeline integration is **MISSING**. The data model anticipates playback; the wiring doesn't exist.

---

## PART 4 — Feature State Buckets

### Advanced editing tools — summary

| Bucket | Approximate count |
|---|---|
| **WORKING** | ~30 (most modifier-stack types via the panel, basic sculpt brushes, basic topology ops on selection, basic UV projections, BVH/mocap pipeline, basic shape keys) |
| **WIRED-BUT-BROKEN** | ~10 (Lattice/Shrinkwrap/Mesh Deform/Hook/Vertex Weight/Particle Instance/Mask modifier direct arms — all missing required args; Mirror modifier doesn't actually merge; symmetry Y/Z; flatten dup; sculpt mask brush) |
| **STUB** | ~25 (entire V.Color tab `vc_*`, entire mask tools `mask_*`, multires panel `multires_*`, alpha presets `alpha_*`, layer ops `layer_*`, dyntopo flood/smooth, matcap/cavity toggles, paint_weights mode, sharpen/elastic brushes) |
| **BACKEND-ONLY** | ~40 (NgonSupport entirely, advanced shape keys, weight painting, texture painter, much of `mesh/uv/UVTools.js`, `mesh/clothing/*`, `mesh/hair/*` subdirs — engines exist, dispatch arms or panels are partial) |
| **UI-ONLY** | a handful (panels open but never call engines: pattern panel hotkey toggle) |
| **MISSING** | Cluster/Soft Mod deformer, Maya-style component editor, multi-cut/smart knife, lasso/loop select, pelting UV, hover highlight (cross-cut with selection audit) |

**Honest summary:** of ~110 surveyed advanced tool entry points, roughly **30% are WORKING end-to-end**, ~10% **WIRED-BUT-BROKEN** with cheap fixes, ~25% **STUBS**, and ~40% **BACKEND-ONLY** or worse. The "50 modifiers" claim (`ModifierStack50.js:431`) inflates `MODIFIER_COUNT` — actual implementations are 10 + 17 + 16 = 43, of which 5–7 require args the dispatch arms don't supply.

### SPX Sketch — summary

| Surface | Bucket | Notes |
|---|---|---|
| `spx_sketch` (open panel) | **WIRED-BUT-BROKEN** | Wrapper opens, inner panel returns null (missing `open` prop) |
| `GreasePencilPanel.jsx` (standalone) | **BROKEN at wiring** | Inner component is correct, props aren't passed |
| `SculptPanel.jsx` SPX Sketch tab | **STUB-heavy** | None of the brush buttons (`gp_draw`/`fill`/`erase`/`tint`) have dispatch arms |
| `gp_onion` | **STUB** | Toggle works, no listener |
| `gp_layer` | **STUB** | Creates a layer, discards it |
| `gp_stroke` | **STUB** | Creates an empty stroke, discards it |
| `gp_interp` | **MISSING dispatch** | Falls through; `interpolateStrokes` engine works but isn't called |
| Onion skin rendering | **BACKEND-ONLY** | `buildOnionSkin` exists; nothing renders it in the 3D viewport |
| Sending strokes to 3D scene | **BACKEND-ONLY** | `sendToScene` works in code but `sceneRef` isn't passed |
| Frame interpolation playback | **MISSING wiring** | Engine supports it, no loop consumes |
| Erase tool | **MISSING backend** | UI sets mode; no erase impl in engine |
| Fill stroke | **MISSING backend** | No impl |
| Tint stroke | **MISSING backend** | No impl |

**Honest summary:** As shipped today, **SPX Sketch does not work for any user flow.** A user clicks the button, gets an empty panel header, and cannot draw anything. The backend engine is well-structured and salvageable (~130 lines), but the wiring is broken at multiple layers.

---

## PART 5 — Dependency Map

| Subsystem | Depends on | Blocked-from-testing impact if dependency broken |
|---|---|---|
| HE topology tools (grid_fill, weld, chamfer, etc.) | Selection sets (`selectedVerts`) — **broken** per companion audit | All seven topology tools cannot be exercised end-to-end. Backend is fine; UX is gated. |
| Inset, mark_seam, loop cut, knife | Selection sets — **broken** | Same. |
| Bevel | (no selection — already a no-op per companion audit) | Cannot be visually verified even with fix to selection. |
| Sculpt brushes (`brush_*`) | `meshRef.current` + working sculpt mouse loop | Selection bug nulls `meshRef.current` on every off-mesh click. Sculpt has its own `getSculptHit` so it may survive — needs runtime test. |
| Vertex color (`vc_*`) | `applyVertexPaint` (**missing**) + `editMode === "paint"` (mode setter unwired) | Entire V.Color tab BROKEN regardless of selection fixes. |
| Weight paint | `editMode === "weight_paint"` mouse handler — **missing** | Entire weight paint flow BROKEN regardless of selection fixes. |
| Modifier stack (panel) | `meshRef.current.geometry` | Selection bug nulls `meshRef.current` → "No mesh selected." Selection fix unlocks panel testing. |
| Modifier stack (direct `mod_*` arms) | `meshRef.current?.geometry` | Same. |
| UV projections + smart unwrap | `heMeshRef.current` (separate from `meshRef`) | Less affected — `heMeshRef` is preserved across selection deselect (see companion audit §4.2). |
| Hair tools | `meshRef.current` for emit; head mesh for fit | Hair-emit needs `meshRef`. Fit-to-head can find its own target. |
| Cloth tools | `meshRef.current` | Affected. |
| SPX Sketch | Independent of selection — uses its own 2D canvas | **Not blocked by selection.** The blockers are wiring (open prop, sceneRef, missing dispatches). |
| SPX Sketch + cel pipeline | `SPX3DTo2DPipeline.js` + onion-skin render-loop | Both ends BACKEND-ONLY. Integration is a green-field build. |

**The selection bug from `selection_visibility_audit.md` blocks testing for virtually every HE-mesh, modifier, and paint flow.** SPX Sketch is the rare subsystem that isn't selection-dependent — but it has its own independent set of blockers.

---

## PART 6 — Integration Opportunities

### 6.1 SPX Sketch + cel pipeline

**Premise:** convert a 3D character to 2D via `SPX3DTo2DPipeline.js`, render frames, overlay user-drawn SPX Sketch strokes on top in screen space, export as animated 2D film.

**What exists:**
- 3D-to-2D pipeline at `src/pipeline/SPX3DTo2DPipeline.js` — full cel shader, normal/depth/silhouette outline, OutlinePass (the only place OutlinePass *is* used).
- SPX Sketch can produce per-frame strokes (engine supports it).
- Onion skin engine exists.

**What's missing:**
1. A **screen-space overlay layer** that composites Sketch strokes after the cel pipeline output. Today's `sendToScene` puts strokes in *world space* at z=0 — they'd be hidden behind/in front of the model unpredictably.
2. **Camera-locked stroke transform.** Strokes need to be in NDC (or attached to the viewport) so they ride along with the camera-locked cel output.
3. **Frame sync** — when 3D-to-2D pipeline renders frame N, request `getStrokesAtFrame(layer, N)` and composite.
4. **Pressure-sensitive stroke rendering** — current `LineBasicMaterial.linewidth` is ignored; you'd want a tubed/quad-strip mesh (`strokeToMesh` is closer but produces 3D tubes, not screen-aligned strokes).

**Effort estimate:** 3–5 days for a credible MVP, assuming the cel pipeline already produces reliable frames. The killer demo lives or dies on the cel pipeline working end-to-end first (see `cel_pipeline_clarity_audit.md`).

### 6.2 SPX Sketch + the 11 hidden sketch-style presets

These presets (Pencil, Charcoal, Blueprint, etc., referenced in `cel_pipeline_*` audits) modify the cel output's line style. SPX Sketch could complement them:
- Cel pipeline draws the auto silhouette in the chosen style.
- SPX Sketch adds **hand-drawn correction strokes** on top (gestural, expressive lines that the algorithm can't produce).

**Required to make this meaningful:** brush style must inherit from the chosen sketch preset (a pencil-style preset needs a pencil-grit brush; a blueprint preset wants a clean monoline brush). Today's SPX Sketch only has solid `LineBasicMaterial` — there's no brush stamp / texture / grain.

**Effort:** another 2–3 days on top of the cel integration above.

### 6.3 Advanced tools blocked by shared infrastructure

- **V.Color** is blocked by the missing `applyVertexPaint` function. Cheap fix once the function is implemented.
- **Weight paint** is blocked by the missing `weight_paint` mouse handler. Implementable in a day using existing `paintWeight` from `WeightPainting.js`.
- **Mask tools across sculpt** are blocked by `_applyBrushType` lacking a mask branch — but `applyMaskBrush` exists in `SculptLayers.js:179`. Single-line wiring fix.
- **Several Extended/Modifier50 deformers** are blocked by missing args in direct dispatch arms — choose either to expose param dialogs or remove the direct arms in favor of the modifier-stack panel which provides the form.

---

## PART 7 — Ranked Critical Issues

| # | Severity | Issue | Citation |
|---|---|---|---|
| 1 | **BLOCKING (SPX Sketch)** | `GreasePencilPanel` rendered without `open`, `sceneRef`, `setStatus` props. Component returns `null`. Entire SPX Sketch standalone panel is non-functional. | `App.jsx:5352` vs `GreasePencilPanel.jsx:7,111` |
| 2 | **BLOCKING (V.Color paint)** | `applyVertexPaint(e)` called at `App.jsx:3002`; function is never defined anywhere in the repo. Triggers ReferenceError when V.Color mode active. | `App.jsx:3002` |
| 3 | **HIGH (Sketch dispatch)** | `gp_draw`, `gp_fill`, `gp_erase`, `gp_tint`, `gp_interp` are emitted by SculptPanel SPX Sketch tab but have **no dispatch arms** — fall through to `window[fn]` warning. | `SculptPanel.jsx:368–375, 423–426` vs `App.jsx:4311–4320` |
| 4 | **HIGH (Sketch state)** | `gp_layer` and `gp_stroke` dispatch arms create-and-discard objects without storing them anywhere. Status text lies. | `App.jsx:4319–4320` |
| 5 | **HIGH (V.Color)** | Entire `vc_*` button set in SculptPanel V.Color tab has no dispatch arms. | `SculptPanel.jsx:339–358` |
| 6 | **HIGH (sculpt mask)** | `brush_mask` selects "mask" as `sculptBrush`, but `applySculpt` → `_applyBrushType` has no mask case. `applyMaskBrush` (`SculptLayers.js:179`) is never wired. All `mask_*` buttons are stubs. | `SculptEngine.js:190`; `SculptPanel.jsx:287–294` |
| 7 | **HIGH (NgonSupport)** | N-gon data is stored on an ad-hoc `hem.ngonFaces` property that `HalfEdgeMesh.toBufferGeometry` ignores. Even when n-gon operations are wired, the data is destroyed on every rebuild. | `NgonSupport.js:37`; `HalfEdgeMesh.js` has zero `ngonFaces` references |
| 8 | **HIGH (modifier args)** | `mod_lattice`, `mod_shrinkwrap`, `mod_hook`, `mod_corrective`, `mod_mask` direct arms call engines with missing required arguments → throw or silent no-op. | `App.jsx:4279–4288`, vs `ExtendedModifiers.js:28,238,371`; `ModifierStack50.js:83,142` |
| 9 | **HIGH (weight paint)** | `paint_weights` arm sets `editMode="weight_paint"`, no mouse handler reads that mode, no painting happens. | `App.jsx:4182` |
| 10 | **MEDIUM (panel desync)** | `App.jsx` declares `gpLayers`, `gpActiveLayer`, `gpDrawing`, `gpCurrentStroke`, `gpColor`, `gpThickness` (`4428–4433`); they're orphans — never referenced after declaration. Dead state. |
| 11 | **MEDIUM (modifier dups)** | `mod_triangulate` and `mod_wireframe` arms each declared twice (`4276`/`4289`, `4277`/`4290`) — only the first wins. |
| 12 | **MEDIUM (brush dup)** | `BRUSHES` array has `flatten` twice (`SculptPanel.jsx:9`, `15`) — renders two buttons. |
| 13 | **MEDIUM (symmetry)** | Sym X dispatches `sculpt_sym_x` (no arm); Sym Y/Z store local state with no engine consumer. Symmetry stroke only honors X. | `SculptPanel.jsx:139, 189–191`; `SculptEngine.js` lacks Y/Z |
| 14 | **MEDIUM (Mirror modifier)** | `applyMirror` accepts `mergeThreshold` param but never actually welds vertices — just appends mirrored geometry. Inverted indices fix winding, but duplicate vertices remain. | `ModifierStack.js:61–81` |
| 15 | **MEDIUM (multires)** | UI buttons emit `multires_add` / `multires_bake` / `multires_level`; no arms. Engine exposed on window with different names. | `SculptPanel.jsx:285–303` |
| 16 | **MEDIUM (alpha textures)** | `alpha_circle/stars/noise/cracks/fabric/skin/load` — no dispatch, no AlphaBrush import for the action path. | `SculptPanel.jsx:155–165` |
| 17 | **MEDIUM (sculpt layers)** | `layer_new` / `layer_base` — no dispatch. `SculptLayers.js:15` `addSculptLayer` exists. | `SculptPanel.jsx:174–175` |
| 18 | **MEDIUM (matcap/cavity)** | UI toggles `sculpt_matcap_on/off`, `sculpt_cavity_on/off` — no dispatch. | `SculptPanel.jsx:195–199` |
| 19 | **LOW (onion-skin event)** | `gp_onion` dispatches `spx:gp-onion-toggle`; no listener. | `App.jsx:4314–4315` |
| 20 | **LOW (pattern panel)** | `Shift+D` toggles `patternPanelOpen` — no panel render found. | `App.jsx:776–784` |
| 21 | **LOW (knife)** | Knife UI exists; engine is single-cut prototype. Multi-cut/smart-knife not implemented. | `App.jsx:3000–3028` |
| 22 | **LOW (cel listener)** | Many panels register hotkeys that just toggle flags; the panel implementations weren't verified for correctness in this audit. |

---

## PART 8 — TechStars Demo Analysis

### 8.1 Advanced tools — demo-critical

The Maya/Blender positioning needs **at least one polished, undeniably professional workflow**. Candidates:

1. **Sculpt** — draw/clay/smooth/grab/crease/flatten/pinch + symmetry X + dyntopo. Already mostly WORKING. The story "we have professional sculpt in the browser" is credible.
2. **Modifier stack (via panel)** — most modifier types apply correctly. The drag-to-reorder UX in `ModifierStackPanel.jsx` is genuinely nice. Note: the "Apply All" model is destructive, not the live Blender-style stack — demos must avoid claiming live re-evaluation.
3. **Auto-rig with guides** — `AutoRigPanel.jsx` is interactive and ties into `runAutoRig`. If it produces a usable rig, this is a strong demo moment.
4. **Mocap retarget (BVH)** — full chain exists, easy to demo with a pre-recorded BVH.
5. **Boolean ops** — wired and shown working in the basic editor audit.

**Demo-critical, do not show:**
- V.Color (broken at definition)
- Weight paint (mode flag with no consumer)
- N-gon ops (data evaporates on rebuild)
- Most direct `mod_*` deformer arms (missing args)

**Story risk:** if the user clicks anything in the V.Color or mask sections during a demo, the broken-ness is immediate and visible.

### 8.2 SPX Sketch — demo impact

If SPX Sketch worked end-to-end, the headline pitch becomes:

> "We turn 3D into anime-style 2D, then let you draw over it like Procreate, then animate frame-by-frame with onion skinning — all in the browser."

That is a **distinctive** positioning vs Maya/Blender/After Effects. Maya has Grease Pencil, but the 3D→2D→hand-drawn loop is differentiated by SPX's cel pipeline.

Today, the audit finds Sketch is closer to **two days of wiring work + one week of cel-pipeline integration** away from being demo-worthy — pending the cel pipeline itself being demo-ready (see `cel_pipeline_clarity_audit.md`).

### 8.3 Killer demo flow

**"Convert 3D character → add Sketch strokes → animate → export"** — what would have to be true:

| Step | Today | Gap |
|---|---|---|
| 1. Load a 3D character | WORKING (GLTF import) | None |
| 2. Convert to 2D cel | **needs cel pipeline working** — outside this audit | See cel pipeline audit |
| 3. Open SPX Sketch panel | **BROKEN** — empty panel | Fix `open`/`sceneRef`/`setStatus` props |
| 4. Draw strokes on top of cel output | needs camera-locked overlay | Stroke transform + composite layer |
| 5. Onion-skin between frames | engine ready, no consumer | Subscribe to `currentFrame`, render onion meshes |
| 6. Animate playback | partial — App has `currentFrame`, Sketch has its own `frame` | Sync the two frames; on tick, request `getStrokesAtFrame` |
| 7. Export | **MISSING** — no exporter for sketch frames | Add per-frame rasterize + PNG/MP4 export |

**Minimum viable demo path** (in audit recommendation form, not as a plan): land #3, #5, #6 with the existing engine. Step #4 is the differentiator and the hardest. Step #7 can be a manual screen-record for the demo, deferred.

---

## PART 9 — Recommended Paths

### Advanced tools

**Recommendation: CRITICAL FOR TECHSTARS — POLISH 3 FLOWS, IGNORE THE REST.**

- **Polish** Sculpt (8 brushes that work, plus dyntopo), Modifier Stack panel (focus on the ~22 panel-only working types), and Auto-Rig + BVH retarget. Together these cover the "credible Maya/Blender competitor" claim with reasonable evidence.
- **Hide or remove** broken surfaces from the UI during demo: V.Color tab, mask buttons, multires, alpha presets, sym Y/Z, direct `mod_*` arms with broken signatures. Either gate behind a "Lab" toggle or comment-out for the demo branch.
- **Defer post-TechStars**: NgonSupport rebuild, advanced shape keys, real component editor, smart knife / multi-cut, all of `mesh/uv/UVTools.js`.

**Reasoning:** the codebase has impressive depth, but breadth-without-polish hurts demos. Better to show 25 fully-working tools than 110 partially-working ones. The biggest demo risk is a curious VC clicking V.Color and getting a runtime error.

### SPX Sketch

**Recommendation: PATH A — INCLUDE IN TECHSTARS DEMO, WITH SCOPED FIXES.**

- Effort estimate: **2–3 days** for a basic demo-ready Sketch (open panel, draw strokes, frame navigation, "send to scene"). Wiring fixes, not new engine work.
- Effort estimate: **+3–5 days** for the killer cel+Sketch overlay flow — *only* if the cel pipeline itself is demo-ready by then.
- **Why include:** It's the most differentiated story the codebase tells. Maya/Blender both have grease pencil — neither has the cel pipeline + grease pencil combo that SPX is positioned to demo.
- **Why not Path B (defer):** The wiring fixes are cheap and the differentiation payoff is high. Deferring loses the headline.
- **Why not Path C (cut):** Engine code is clean (~130 lines), well-factored, and salvageable. Cutting wastes existing work.

**Caveat:** if cel pipeline isn't demo-ready, Sketch standalone is still useful — just less differentiated. Position it as "draw on top of any frame" rather than "the future of animation."

---

## PART 10 — Unified Fix Order (across 4 audits)

Drawing from `edit_tools_audit.md` (Wave 1 pushHistory), `selection_visibility_audit.md` (selection blockers), `editor_bugs_audit.md`, and this audit:

| # | Effort | Impact | Source audit | Fix |
|---|---|---|---|---|
| 1 | 0.5d | Unblocks ~all edit-mode testing | Selection §1 | Add `editModeRef.current === "edit"` early-return to `onMouseUp` so missed clicks stop nulling `meshRef.current`. |
| 2 | 0.5d | Visible object selection in demos | Selection §2 | Add emissive set/reset in `selectSceneObject` (and matching deselect) for object-mode selection feedback. |
| 3 | 0.5d | Vert/Edge/Face buttons functional | Selection §4 | Auto-enter Edit mode on `selectMode_*` if not in edit mode. |
| 4 | 0.5d | SPX Sketch panel actually opens | This audit §1 | Pass `open`, `sceneRef`, `setStatus` props from `App.jsx:5352` to `GreasePencilPanel`. |
| 5 | 1d | Bevel does something visible | Selection §3 + edit_tools | Either: gate Bevel button on `selectedEdges.size > 0` and call a real face-rebuilding bevel; or remove from demo UI. |
| 6 | 1d | Sculpt mask brush works | This audit §6 | In `_applyBrushType` (`SculptEngine.js:190`), add `case "mask"` calling `applyMaskBrush`. Wire `mask_invert`/`mask_clear`/`mask_blur`/`mask_grow`/`mask_shrink` arms. |
| 7 | 1d | SPX Sketch SculptPanel tab actually does anything | This audit §3 | Add dispatch arms for `gp_draw`/`gp_fill`/`gp_erase`/`gp_tint`/`gp_interp`. Make `gp_layer`/`gp_stroke` actually store the created object on a real state. |
| 8 | 1d | Wave 1 pushHistory work testable | edit_tools §Wave 1 | Land remaining pushHistory adds, now testable once #1–#3 are in. |
| 9 | 1–2d | V.Color tab safe to demo | This audit §10 | Define `applyVertexPaint`. Add `vc_init`/`vc_fill`/`vc_gradient`/`vc_smear`/`vc_blur`/`vc_flatten`/`vc_layers` arms calling `VertexColorPainter.js` + `VertexColorAdvanced.js`. OR hide the tab. |
| 10 | 2–3d | Killer demo: SPX Sketch over cel output | This audit §6.1 + cel_pipeline | Camera-locked stroke overlay, `currentFrame` ↔ Sketch `frame` sync, onion-skin in 3D viewport, per-frame fetch. Requires cel pipeline to be demo-ready first. |

**Beyond top 10:** weight-paint mouse handler (~0.5d), brush dup cleanup (~5 min), modifier dup cleanup (~5 min), multires UI wiring (~1d), alpha texture wiring (~1d), and hiding the irrecoverably-broken surfaces from the demo build (~0.5d total — much faster than fixing them).

**Total focused effort for a credible TechStars demo: ~9–12 days of well-targeted wiring work** (with the cel-pipeline integration being the riskiest line item).

---

## VERIFY

```
$ ls audit/advanced_tools_and_sketch_audit.md
audit/advanced_tools_and_sketch_audit.md
```
