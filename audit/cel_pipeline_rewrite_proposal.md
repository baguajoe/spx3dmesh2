# Cel Pipeline — Architectural Audit + Rewrite Proposal

**Scope:** read-only architectural audit and forward-looking rewrite proposal.
No code changes were made for this document.

**Primary file:** `src/components/pipeline/SPX3DTo2DPanel.jsx` (2636 lines).

**Related existing audits** (already on disk; this document builds on them, doesn't restate):
- `audit/cel_pipeline_clarity_audit.md` — operation-by-operation softness/dimming trace
- `audit/3dto2d_panel_audit.md` — panel UX/export bug audit
- `audit/anime_ml_feasibility.md` — ML-based stylization feasibility

---

## PART 1 — CURRENT STATE FULL TRACE

### 1.1 Click → Pixel: full call chain

When the user clicks the "Anime" style chip in the right-rail style grid, the
following functions fire in order. Each step's file:line citation is the entry
point in `SPX3DTo2DPanel.jsx` unless noted.

#### Step 0 — Button click (UI)
- `<button onClick={() => setActiveStyle(s.id)}>` at `:2545`. Single React state set; no other work.

#### Step 1 — Material swap effect
- `useEffect([open, activeStyle, outlineWidth])` at `:1706-1711`. Dispatches to one of:
  - `applyCelShading(activeStyle)` for the 6 cel-family styles (anime/manga/comic/cel/toon/pixar)
  - `applyFlatShading()` for `low_poly`
  - `restoreNPRMaterials()` for every other style
- `applyCelShading(style)` at `:1997-2046`:
  1. Calls `restoreNPRMaterials()` first (`:1998`) — wipes prior cel state.
  2. Reads `cfg = CEL_SHADED_STYLES[style]` (table at `:1011-1018`) — gets `steps`, `outlineMul`.
  3. Computes `scaleFactor = 1 + (outlineWidth * cfg.outlineMul * 0.04)` (`:2015`) — outline shell expansion.
  4. `scene.traverse(obj => …)` (`:2017`) for each `obj.isMesh`:
     - Skip `_spxNprOutline`, `isHelper`, parentless.
     - Backup original material into `materialBackupRef` (`:2023`).
     - **Swap material:** `obj.material = makeCelMaterial(obj.material, cfg.steps)` (`:2024`).
     - Build a `BackSide` `MeshBasicMaterial(color=0x000000)` outline shell:
       - SkinnedMesh → new SkinnedMesh + `.bind(skeleton, bindMatrix)` (`:2032-2034`)
       - else → new Mesh (`:2036`)
       - Scaled by `scaleFactor` (`:2042`), parented under `obj.parent`, `renderOrder = (obj.renderOrder||0)-1`.
       - Tracked in `outlineMeshesRef` for later cleanup (`:2044`).
- `makeCelMaterial(originalMat, steps)` at `:1142-1181`:
  - Constructs `new THREE.MeshToonMaterial({color, map, gradientMap, transparent, opacity, side, aoMap=null, bumpMap=null, lightMap=null, emissiveMap=null, displacementMap=null, emissive=black})` (`:1143-1160`).
  - **Recent fix (commit 47e14a8):** `normalMap` now preserved from original (`:1163-1170` post-edit).
  - PBR-only properties zeroed defensively (`:1172-1179`).
  - `envMapIntensity = 1.0` (was 0.6 pre-47e14a8) (`:1181-1187` post-edit).
- `makeCelGradientMap(steps)` at `:1103-1129` returns a 1×N `THREE.DataTexture` with `NearestFilter` so the toon shader snaps Lambert N·L to discrete bands. Bottom stop lifted to 0.45 (`:1108`) to prevent shadow crush after the downstream 2D posterize.

#### Step 2 — Auto-render effect
- `useEffect([activeStyle, open, handleRender])` at `:2194-2198` → calls `handleRender()`.
- `handleRender` at `:2172-2189`:
  1. Calls `applyNPRIfNeeded(activeStyle, sceneRef)` — currently a no-op (`:1900-1914`; documented as disabled because the prior implementation generated rest-pose-frozen 70×-oversized outline shells on SkinnedMeshes).
  2. `out = captureAndProcess(1, previewCameraRef.current)` (`:2178`) — full-resolution one-shot.
  3. Draws `out` into `previewRef.current` 2D canvas via `drawImage` at canvas CSS size (`:2180-2185`).

#### Step 3 — Preview rAF loop (lives in parallel)
- `useEffect([open, rendererRef, sceneRef, cameraRef])` at `:1765-1897`. Runs continuously while panel is open.
- Per tick (24fps capped at `:1772-1774`):
  1. Wall-clock advance `previewFrame` if `previewPlayingRef.current` (`:1788-1796`).
  2. Iterate every `sceneObjects` mixer (`:1807-1817`) — for each: `a.time = previewSeconds % c.duration; m.update(0)`. Phase 1 multi-import gave each model its own mixer; this is how multi-avatar scenes stay in sync.
  3. `reframePreviewCamera()` (`:1919-1954`): Box3 over non-infra scene children, set `previewCamera` position to `center + (0,0,1.8·maxDim)`. Stable across animation (uses SkinnedMesh rest-pose bbox).
  4. **Styled capture:** `out = captureRef.current(0.33, previewCameraRef.current)` (`:1842`) — `0.33` is the preview capture scale per commit `61faa8b`.
  5. Resize `previewRef` canvas to CSS px size; `drawImage(out, 0, 0, c.width, c.height)` (`:1844-1848`) — bilinear upscale from ~0.33× back to CSS display size.
  6. `detectFaceRect(scene, previewCamera, c.width, c.height, faceDetectCacheRef)` (`:1854`) and update debug overlay if `__SPX_DEBUG_FACE_RECT` flag set.
  7. **Raw mirror:** `renderer.render(scene, userCam); drawImage(src, 0, 0, dst.width, dst.height)` into `liveRef` (`:1883-1890`) — the LEFT pane.
- Note: this rAF calls `renderer.render(scene, camera)` itself, while `App.jsx`'s `animate` loop also renders. Two GPU renders per tick — wasteful but not broken.

#### Step 4 — `captureAndProcess(scale, cameraOverride)`
The hot path. Defined as `useCallback` at `:2049-2162`.

1. `renderer.render(scene, camera)` (`:2057`) — cel-shaded backbuffer.
2. Allocate `tmp` canvas at `src.width*scale × src.height*scale`; `drawImage(src, 0, 0, tmp.w, tmp.h)` with `imageSmoothingQuality='high'` (`:2060-2066`). **First GPU→CPU readback.**
3. Branch on `exportMode`:
   - `'line'` → return `makeLinePass(tmp, edgeThreshold, edgeBias)` (`:2068`).
   - `'flat'` → return `makeFlatColorPass(tmp, toonLevels)` (`:2071`).
   - else fall through to cel-family path.
4. **If cel-family style** (`CEL_SHADED_STYLES[activeStyle]`, `:2081`):
   - `precomputedLines = captureNormalEdges(renderer, scene, camera, threshold, edgeBias)` (`:2084`):
     - `_swapAllMeshes(scene, _normalMaterialForEdges)` (`:1253`) — temporarily replace every mesh's material with shared module-level `MeshNormalMaterial`.
     - `renderer.render(scene, camera)` (`:1254`).
     - `drawImage(renderer.domElement, 0, 0)` into `tmp` (`:1259`). **Second GPU→CPU readback.**
     - `makeLinePass(tmp, threshold, bias)` (`:1260`) — Sobel.
     - `try/finally` restores every mesh's original material (`:1261-1265`).
   - `silhouetteMask = captureSilhouetteMask(renderer, scene, camera)` (`:2085`):
     - Swap to shared `_whiteMaterialForMask` (`:1280`), `setClearColor(0,0,0,1)`, render.
     - **Third GPU→CPU readback** at `:1287`.
     - Restore materials + clearColor.
   - Resize both helpers to tmp dims if needed via `drawImage` (`:2091-2104`). **Two more drawImage operations.**
   - `renderer.render(scene, camera)` again (`:2108`) — restore cel backbuffer.
   - `clearRect; drawImage(src, 0, 0, tmp.w, tmp.h)` into `tmp` (`:2109-2110`). **Fourth GPU→CPU readback.**
5. `result = applyStyleFilter(tmp, activeStyle, {…, precomputedLines, silhouetteMask})` (`:2113`):
   - Cel branch (`:147-230`) is the meat. Detailed below.
6. **Face sub-pass** if cel-family (`:2125-2136`):
   - `detectFaceRect(scene, camera, tmp.width, tmp.height, faceDetectCacheRef)` (`:2127`).
   - If a rect is found:
     - `captureFacePass(renderer, scene, camera, faceRect, faceCelParams, tmp.w, tmp.h)` (`:2129`):
       - Clone camera, `setViewOffset(viewW, viewH, faceRect.x, .y, .w, .h)` (`:1478`).
       - `renderer.setSize(FACE_PASS_SCALE × faceRect dims)` — `FACE_PASS_SCALE=4` (`:1098`).
       - Render cel materials, drawImage backbuffer → `celCanvas` (`:1488-1492`). **Fifth GPU→CPU readback.**
       - Swap normal material, render, drawImage → `normalCanvas` (`:1497-1503`). **Sixth.**
       - `makeLinePass(normalCanvas)` (`:1504`).
       - `bilateralBlurSeparable(celCanvas, …)` (`:1512`).
       - `posterizeLuminance(blurred, …)` (`:1513`).
       - `blurred.ctx.globalCompositeOperation='multiply'; drawImage(lines, 0, 0)` (`:1515-1517`).
       - `drawImage(blurred, 0, 0, faceRect.w, faceRect.h)` to `final` canvas (downsample, `:1527`). **Seventh.**
       - `try/finally` restores `setSize`, `pixelRatio`, clearColor (`:1538-1540`).
     - `compositeFaceOntoBody(result, faceCanvas, faceRect)` (`:2133`):
       - `drawImage(faceCanvas, 0, 0, w, h)` into `masked` canvas.
       - `getImageData; per-pixel alpha modulation in `feather`-px edge band; putImageData` (`:1562-1574`).
       - `drawImage(masked, faceRect.x, faceRect.y)` onto bodyCanvas (`:1576`).
7. **Hair sub-pass** if cel-family (`:2143-2155`):
   - `captureHairMask(renderer, scene, camera)` (`:2146`):
     - `_findHairMeshes(scene)` matches `HAIR_MESH_PATTERNS = [/wolf3d_hair/i, /^cc_base_hair/i, /^hair/i, /^scalp/i]` (`:1227`).
     - Returns null if no hair → composite skips.
     - Otherwise: manual swap (hair → white, others → black), render, drawImage. **Eighth GPU→CPU readback.**
   - `captureHairPass(renderer, scene, camera, hairCelParams)` (`:2148`):
     - Render normally → `celCanvas` drawImage. **Ninth.**
     - Swap normal material, render → `normalCanvas` drawImage. **Tenth.**
     - `makeLinePass`, `bilateralBlurSeparable`, `posterizeLuminance`, multiply ink — same recipe as body, with hair-tuned params (`CEL_HAIR_PASS` table at `:1084-1091`).
   - `compositeHairOntoBody(result, hairCanvas, hairMask)` (`:2150`):
     - Scale hair + mask to body dims via `drawImage` (`:1416, :1424`).
     - `getImageData × 3 (body, hair, mask); per-pixel replace where md[i]>128; putImageData` (`:1427-1446`).
   - `renderer.render(scene, camera)` final restore (`:2153`).
8. **Temporal blend** if `exportMode === 'final'` (`:2157-2159`):
   - `temporalBlendCanvas(result, temporalBlend, prevFrameRef)` (`:858-882`):
     - First call: stores currentCanvas in prevFrameRef, returns currentCanvas.
     - Subsequent: `drawImage(prev, …, alpha=1-blend); drawImage(current, …, alpha=blend)`. Stores composite in prevFrameRef.
   - **Note:** the `temporalBlend` default of `0.35` is still in state (`:1602`). Commit `b703251` is described as "disable temporal blend in preview by default" — verify the gating actually neutralizes the preview path. As of this audit, `exportMode` defaults to `'final'` (`:1601`), so the conditional fires unless the state has been changed elsewhere.

#### Step 5 — Cel branch of `applyStyleFilter` (`:147-230`)
The post-pass that turns the cel-shaded 3D frame into a "2D" image:
1. Resolve `cfg = CEL_SHADED_STYLES[style]`, `pass = CEL_2D_PASS[style]` (`:159-161`).
2. Resolve `threshold = params.edgeThresholdSlider ?? pass.edgeThreshold` (`:170`).
3. Resolve `lines = params.precomputedLines || makeLinePass(srcCanvas, threshold, pass.edgeBias)` (`:171-172`).
4. `blurred = bilateralBlurSeparable(srcCanvas, pass.bilateralRadius, pass.bilateralSigmaR)` (`:173`).
5. `posterizeLuminance(blurred, params.toonLevels ?? pass.posterizeLv)` (`:176`).
6. Optional exposure mul (`:181-192`) — skipped if `exposure === 1.0`.
7. `blurred.ctx.globalCompositeOperation = 'multiply'; drawImage(lines, 0, 0)` (`:194-197`).
8. Optional monochrome (`:201-206`, manga only).
9. Silhouette mask wipe (`:214-226`): pixels where `mask < 32` → forced to RGB(20,20,20).
10. `id.data.set(bid.data)` (`:228`), break — result lands in `dst` canvas.

#### Step 6 — Display
- Preview rAF: `drawImage(out, 0, 0, c.width, c.height)` to `previewRef` (`:1848`). Bilinear upscale from ~0.33× capture scale to CSS display dims. Often anisotropic (capture aspect ≠ display aspect).

### Branch differences

| Branch | Capture scale | Camera | Mixer seek | Temporal blend |
|--------|--------------:|:------:|:----------:|:--------------:|
| Preview (rAF) | 0.33 | `previewCameraRef` (auto-framed) | per-tick, all `sceneObjects` | yes (if exportMode='final') |
| `handleRender` (RENDER button) | 1.0 | `previewCameraRef` | none (one-shot) | yes |
| `handleRender4K` | `renderScale` (1-4) | `previewCameraRef` | none | yes |
| `handleVideoExport` | 1.0 | `previewCameraRef` | `action.time = i/FPS` per frame (`:2354-2357`) | yes — each frame ghosts prior export frame |
| `handlePngSequenceExport` | 1.0 | `previewCameraRef` | none — relies on wall-clock setTimeout(16) (`:2435`) | yes |

Single-avatar vs multi-avatar diverges only in the rAF mixer loop (`:1807-1817`) — same materials, same passes, same canvas ops. The capture scale 0.33 was tuned for multi-avatar (commit `61faa8b`). Detail loss is identical per-avatar.

### 1.2 CPU canvas operations (GPU→CPU round trips)

Each canvas operation below forces the GPU to flush, copy pixels back to system RAM, and lose float precision (output clamped to 8-bit unorm). The JS loop then runs on `Uint8ClampedArray` and pushes back via `putImageData`. Order of magnitude: a single `getImageData` on a 1280×800 buffer transfers ~4 MB and stalls the GPU.

**Per cel-family frame in preview (`captureAndProcess(0.33, ...)`):**

| # | Op | Site | Bytes (1280×800 base, 0.33 scale) |
|--:|----|------|---:|
| 1 | `drawImage(domElement→tmp)` downsample | `:2066` | ~1.4 MB |
| 2 | `captureNormalEdges`: `drawImage(domElement→tmp)` | `:1259` | ~4 MB (full res before makeLinePass) |
| 3 | `makeLinePass`: `getImageData` of normal frame | `:818` | 4 MB |
| 4 | `makeLinePass`: `putImageData` of binary lines | `:853` | 4 MB |
| 5 | `captureSilhouetteMask`: `drawImage(domElement→tmp)` | `:1287` | 4 MB |
| 6 | `drawImage(precomputedLines→scaled)` resize | `:2095` | 1.4 MB |
| 7 | `drawImage(silhouetteMask→scaled)` resize | `:2102` | 1.4 MB |
| 8 | `clearRect; drawImage(src→tmp)` restore | `:2110` | 1.4 MB |
| 9 | `applyStyleFilter`: `getImageData` initial | `:109` | 1.4 MB |
| 10 | `bilateralBlurSeparable`: `getImageData` src | `:911` | 1.4 MB |
| 11 | `bilateralBlurSeparable`: 2× passes write `Uint8ClampedArray` (CPU only) | — | — |
| 12 | `bilateralBlurSeparable`: `createImageData; putImageData` | `:975-977` | 1.4 MB |
| 13 | `posterizeLuminance`: `getImageData; putImageData` | `:993, :1005` | 2.8 MB |
| 14 | `drawImage(lines, 'multiply')` composite | `:195-196` | 1.4 MB |
| 15 | `getImageData` post-multiply | `:199` | 1.4 MB |
| 16 | Final `putImageData` | inside `applyStyleFilter` driver | 1.4 MB |
| 17 | `captureFacePass`: 2× `drawImage(domElement→canvas)` | `:1492, :1503` | varies (face rect × FACE_PASS_SCALE) |
| 18 | Face: `makeLinePass; bilateral; posterize; multiply` | `:1504-1517` | 4 ImageData ops |
| 19 | Face: `drawImage(blurred→final)` downsample | `:1527` | varies |
| 20 | `compositeFaceOntoBody`: `getImageData; mutate; putImageData` | `:1562-1574` | 2× face rect |
| 21 | `captureHairMask`: `drawImage(domElement→tmp)` | `:1338` | 4 MB |
| 22 | `captureHairPass`: 2× `drawImage(domElement→canvas)` | `:1365, :1373` | 8 MB |
| 23 | Hair: `makeLinePass; bilateral; posterize; multiply` | `:1374-1386` | 4 ImageData ops |
| 24 | `compositeHairOntoBody`: 2× resize drawImage + 3× `getImageData` + `putImageData` | `:1416-1446` | ~6 MB |
| 25 | `temporalBlendCanvas`: 2× alpha-`drawImage` | `:872-875` | 1.4 MB |

**Totals per preview frame** (rough): ~9 renderer.render() calls + ~25 GPU→CPU canvas operations + 8 `getImageData` + 6 `putImageData`. At 24 fps that's ~50 readbacks/sec, ~50 MB/sec sustained CPU↔GPU traffic before any JS pixel work. Single hot core for the bilateral nested loop.

### 1.3 Information-loss inventory

Per operation, estimated information loss. "% lost" is a qualitative estimate of high-frequency content / brightness / detail removed compared to the source the operation reads.

| Op | Site | Removes | Estimated loss |
|---|---|---|---|
| `normalMap=null` in cel material (PRE-FIX) | `:1153` | All baked surface detail — pores, fabric weave, musculature | Visible — Mixamo avatars looked flat. **FIXED** in commit 47e14a8. |
| `aoMap=null` | `:1154` | Baked ambient occlusion crevices | ~10% mid-tone modulation on iClone/RPM |
| `bumpMap=null` | `:1155` | Procedural bump (rare on PBR exports) | <5% |
| `lightMap=null` | `:1156` | Baked indirect lighting | <5% for character meshes |
| `emissiveMap=null; emissive=black` | `:1157, :1159` | Glowing zones (LED suits, eyes) | Loss is 100% for emissive content — but typically desired for cel look |
| `displacementMap=null` | `:1158` | Geometry displacement (already vertex-baked) | 0% (MeshToon ignores anyway) |
| `envMapIntensity=0.6` (PRE-FIX) | `:1179` | IBL fill ~40% on smooth surfaces | **FIXED** in commit 47e14a8 → 1.0 |
| Outline shell (BackSide inflated) | `:2042` | Adds ~1-3 px black perimeter, occludes background | ~0-2% screen area, intentional |
| Capture downsample to 0.33× | `:2066` | 91% of pixels (9× area reduction) | Nyquist: ~80% of high frequencies gone before any filter |
| `bilateralBlurSeparable` body | `:173` | Fine luminance variation < sigmaR (45 for anime → 18% lum diff treated as same region) | Major — single biggest perceived softness contributor (per `cel_pipeline_clarity_audit.md`) |
| `posterizeLuminance` | `:176` | Sub-band luminance variation; with levels=2-5, 50-80% of luminance values get quantized away | Intentional (cel bands), but eliminates all detail finer than band width |
| Multiply ink composite | `:195-196` | Replaces all edge pixels with pure black; no soft AA | Sharp visual punch; soft-edge information lost |
| `makeLinePass` binary threshold | `:845` | Sobel magnitude → 0 or 255, no analog values | All edge strength info quantized to 1-bit |
| Silhouette mask wipe | `:219-225` | Background pixels forced to RGB(20,20,20) regardless of original | 100% of bg detail, intentional |
| Face composite feather alpha | `:1564-1574` | `feather`-px alpha gradient seam | Soft fade at face rect edges (intentional softness) |
| Hair composite hard mask | `:1438-1444` | None (replace, no blend) | 0% loss; just replacement |
| `temporalBlendCanvas(0.35)` (when active) | `:872-875` | Mixes 65% prior frame with 35% current → moving content carries 65% ghost | Major softness on animation per `cel_pipeline_clarity_audit.md` §6.A |
| Bilinear upscale to display | `:1848` | Anisotropic stretch from ~0.33× capture to CSS dims | Adds final blur on top of all prior softening |

---

## PART 2 — WHY CURRENT ARCHITECTURE HAS LIMITS

### 2.1 Brightness loss chain (post-fix state, after commit 47e14a8)

| Stage | Effect on luminance |
|---|---|
| `MeshToonMaterial` gradientMap stops `[0.45, 0.7, 1.0]` (3-step) | Floor lifted to 0.45, no longer collapses to black. **Brightness preserving** for shadow side. |
| `envMapIntensity=1.0` (post-fix) | IBL fill at PBR default. **Brightness preserving.** |
| `aoMap=null` | Mid-tones slightly brighter than with AO bake. **+5-10%** versus original PBR. |
| `bilateralBlurSeparable` | Local mean preserving. **Neutral.** |
| `posterizeLuminance` Math.ceil round-up | Mid-tones round UP into next band — brightens by up to half a band step. Skin at lum 110/255 with levels=4 → band 2 (~170/255) versus band 1 (~85/255). **+50% locally** for mid-tone regions just above a band threshold. |
| Optional exposure slider (default 1.0) | No-op. |
| Multiply ink (binary) | Edge pixels forced to 0. **Local 100% darkening at edge pixels only.** Aggregate impact small (~2-5% screen area). |
| Silhouette mask wipe to RGB(20,20,20) | Background forced dark — but avatar pixels untouched. |
| Temporal blend 0.35 (if active) | If prior frame is darker, current frame averages down. Persistent on motion. **~5-15% perceived dim during animation.** |
| Bilinear upscale | Neutral on average. |

**Net:** post-fix, the cel pipeline should produce a *slightly brighter* mid-tone than the 3D viewport in most regions (due to Math.ceil round-up). The only systemic dimming left is temporal blend during animation.

### 2.2 Sharpness loss chain

This is where the current architecture is structurally limited. Even with every CPU softening step removed, two unavoidable stages destroy ~80% of the source's high-frequency content:

| Stage | Frequency content removed |
|---|---|
| Capture scale 0.33× | Per Nyquist: spatial frequencies above 0.165 cycles/source-px are aliased or lost. ~80% of high-freq energy gone before any filter runs. |
| `bilateralBlurSeparable` radius 2-5 | Frequencies near 1/(2·radius) cycles/px attenuated. At radius=3, sigmaR=45 (anime), most surface texture below 6-px wavelength gone. |
| `posterizeLuminance` levels=2-5 | All luminance variation finer than 1/levels eliminated — by design. |
| `makeLinePass` binary | Anti-aliased edge falloff replaced by hard 1-bit transition. Ink lines lose smoothness, gain stair-step at upscale. |
| Bilinear upscale to display | Adds bilinear-interp soft halo on every transition. |

**Net:** even removing bilateral entirely, the 0.33× capture scale alone caps the achievable sharpness at ~33% of native renderer resolution.

### 2.3 Multi-avatar / per-rig divergence

The cel pipeline doesn't branch on avatar source. It applies one global ink threshold, one bilateral radius, one posterize level table — to every mesh in scene. Per-rig differences emerge purely from the *source material's* contribution to the cel-shaded render:

| Rig | Original material content | Pre-fix cel behavior | Post-fix |
|---|---|---|---|
| **Mixamo** | Heavy reliance on baked **normalMap** for skin/clothing detail (geometry is low-poly) | normalMap=null nuked all detail → flat skin, no musculature | **FIXED:** normalMap preserved, detail restored. |
| **ReadyPlayerMe (RPM)** | Lower normalMap detail; combined PBR + minimal AO; uses opacity for hair cards | Lost subtle normal detail but RPM didn't depend on it heavily | Mild improvement |
| **iClone / CC4** | Heavy specular/clearcoat/AO baking; baked-in roughnessMap variation; complex face textures | aoMap+envMapIntensity=0.6 was specifically protecting against face-hotspot blowout | Need to validate that 1.0 envMapIntensity doesn't re-introduce hotspots |
| **Custom rigs** | Vary widely | Indeterminate | Indeterminate |

The face sub-pass (`captureFacePass`, FACE_PASS_SCALE=4) was added to compensate for losing iClone's high-detail face textures during downsample. With the normalMap fix it's *less* critical for Mixamo, *equally* critical for iClone.

The hair sub-pass uses regex matching on `name` (`HAIR_MESH_PATTERNS` at `:1227`) — only RPM (`Wolf3D_Hair`), CC4 (`CC_Base_Hair`), and generic (`^hair`, `^scalp`) match. Mixamo avatars typically have hair as part of the body skinned mesh with no separate name → **hair sub-pass silently skipped on Mixamo.**

---

## PART 3 — REWRITE DESIGN PROPOSAL

### Goal

Eliminate the CPU pixel pipeline. Move bilateral, posterize, edge detection, ink composite, and face/hair sub-region tuning into a single GPU fragment-shader post-process pass operating at full renderer resolution. Preserve every input information channel (albedo, normalMap, IBL, vertex colors) until the final compositing step.

### 3.1 Target architecture

**Rendering model:**
1. Render scene **once** to a multi-target framebuffer (MRT):
   - Target 0: cel-shaded color (RGBA, half-float ideally)
   - Target 1: view-space normal (RGBA8, normal+linearDepth packed)
   - Target 2: object/material ID (R8 — anime/hair/face/background regions)
2. Run **one** full-screen quad post-process pass that reads all three targets and outputs the styled image:
   - Sample color buffer + apply optional bilateral-style cross filter in the fragment (small radius, GPU-cheap)
   - Sobel on the normal+depth buffer for ink edges
   - Posterize-by-luminance with `ceil` bias (matches current math)
   - Multiply ink composite
   - Region-aware parameters: face region uses higher posterize levels, hair region uses fewer cel bands, body uses defaults — all driven by the material ID texture in a single uniform table lookup
3. Output goes directly to a canvas (via `renderTarget.texture` → `texImage2D` to onscreen, or `WebGLRenderTarget` → `readRenderTargetPixels` for export).

**No CPU pixel loops. No getImageData/putImageData on the hot path. No per-region re-renders.**

### 3.2 Material strategy

**Option A (recommended): ShaderMaterial with hand-rolled cel logic.**
- Vertex stage: standard skinned/static transform.
- Fragment stage:
  - Sample albedo `map`, multiply by `color`.
  - Sample `normalMap` if present, perturb normal in tangent space.
  - Compute Lambert N·L for each scene light.
  - Use a 1×N gradient lookup (uniform texture) to quantize the diffuse term to N steps — *same gradient stops as today*.
  - Add IBL contribution from `scene.environment` at full intensity (or scaled by a uniform).
  - Output color to MRT 0, view-space normal+linearDepth packed to MRT 1, region ID to MRT 2.
- **Preserves:** albedo+map+normalMap+gradientMap+IBL+vertex colors+envMapIntensity as a uniform.
- **Eliminates:** material swap to MeshNormalMaterial for edge detection (normals already in MRT 1).
- **Risk:** custom shader = custom maintenance. Three.js MRT support varies; targets WebGL2 (97% of WebGL contexts in 2026).

**Option B: extend MeshToonMaterial via `onBeforeCompile`.**
- Inject shader chunks for region-ID output to MRT 2. Lighter touch, but doesn't get us view-space normal output without further injection.
- Less flexibility for per-region post-process behavior.

**Option C: full deferred shading.**
- Overkill. The scene is small (1-3 avatars + bg helpers). Single-pass forward is fine.

**Decision needed (PART 5).** Recommend A.

### 3.3 Multi-avatar strategy

The new pipeline renders the scene **once** for cel pass. All meshes in the scene write to the same render targets simultaneously. Per-avatar work is identical to single-avatar — the GPU rasterizes them all in one draw-call batch. No per-avatar canvas pass, no per-avatar getImageData. Multi-avatar cost is purely vertex/fragment shader cost, which scales with on-screen pixel coverage, not avatar count.

**Outline strategy:** keep the inverted-hull `BackSide` shell (it works) OR replace with screen-space normal-edge Sobel in the post-process pass (cleaner, screen-space-constant thickness, no per-mesh shell allocation). Defer the decision: ship with hull shell first since it's already there.

### 3.4 Face/hair sub-pass strategy

In the new architecture:
- **Face sub-pass becomes optional.** With full-resolution post-process and preserved normalMap, the dominant motivator (compensating for 0.33× downsample on iClone faces) disappears. Face *region* identification can stay — it's useful to use a higher posterize level on face pixels — but it's now a *uniform table lookup driven by material ID*, not a separate render+composite.
- **Hair sub-pass becomes a region rule.** Same mechanism: hair material assignment writes a different region ID; the post-process pass uses different posterize levels and edge threshold for hair pixels. No re-render needed.

**Net code change:** `captureFacePass` (~80 lines) and `captureHairPass` (~50 lines) and their compositors (~70 lines) are replaced by ~30 lines of region-ID uniform table + ~20 lines of fragment shader branching.

### 3.5 Export path

Export flow becomes:
1. Set render target to `renderScale × renderer dims`.
2. Run cel pass → MRT.
3. Run post-process pass → final output target.
4. `renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels)` into a `Uint8Array`.
5. `putImageData(new ImageData(pixels, w, h))` to an offscreen canvas.
6. `toDataURL` / `toBlob` for download.

**Exactly two CPU touches**: one readback at full export resolution, one putImageData. Compare to current: ~25 readbacks per export frame.

Video export: same path per frame, feed canvas directly to `VideoFrame` (already does this at `:2371`).

### 3.6 Effort estimate

| Bucket | LOC delta | Risk |
|---|---:|---|
| New `celShader.vert` / `celShader.frag` (GLSL) | +200 | Medium — shader bugs are hard to debug |
| New `celPostProcess.js` (full-screen quad, MRT setup, parameter uniforms) | +250 | Medium |
| Modify `applyCelShading` to install ShaderMaterial | +30 / -20 | Low |
| Modify `captureAndProcess` to route cel-family styles through new path | +50 / -120 | Medium |
| Delete `bilateralBlurSeparable` | -75 | Low |
| Delete `posterizeLuminance` (CPU version) | -16 | Low |
| Delete `captureNormalEdges` | -19 | Low (subsumed by MRT 1) |
| Delete `captureSilhouetteMask` | -24 | Low (region ID = 0 in MRT 2 for bg) |
| Delete `captureFacePass` + `compositeFaceOntoBody` | -130 | Medium — need to confirm region-ID logic gives same fidelity |
| Delete `captureHairPass` + `compositeHairOntoBody` + `captureHairMask` | -120 | Medium — same |
| Delete `temporalBlendCanvas` (if dropped — see PART 5) | -25 | Low |
| Keep `makeLinePass` for non-cel `pencil`/`charcoal`/`blueprint`/`ink_wash`/`linocut` paths | 0 | n/a |
| **Net** | ~+100 LOC | Replaces ~550 LOC of CPU pipeline with GPU pipeline. |

**Test surface:**
- 6 cel-family styles × 4 rig types (Mixamo, RPM, iClone, custom) × 3 scenes (single, 2-avatar, 3-avatar) × 2 modes (preview, export) = ~144 visual cases. Most can be smoke-tested in <1 min each with a fixed test scene per rig type.
- Shader compile sanity on integrated Intel GPU (worst case), AMD, NVIDIA, Apple Silicon, mobile WebGL2.

**Risk areas:**
- Shader compile failures on older mobile / integrated GPUs. Mitigation: WebGL1 fallback path or graceful "cel style requires WebGL2" status message.
- Color-space matching: current pipeline operates in sRGB-ish 8-bit canvas space; new pipeline does math in linear and converts at the end. Cel band positions will be slightly different unless the gradient table is recomputed in linear space.
- IBL contribution may render too bright with `envMapIntensity=1.0` on iClone PBR exports (the original 0.6 was protective). Address via per-style override or detection (e.g. drop to 0.85 when iClone-pattern materials are present).
- Outline width currently scales with mesh world size (constant world-space thickness). Screen-space outline (if we go that route) will look visibly different.

---

## PART 4 — MIGRATION PLAN

### Stage 1: Build behind a feature flag (Weeks 1-2)

**New files:**
- `src/components/pipeline/celShader.glsl.js` — vertex + fragment shader strings.
- `src/components/pipeline/celPostProcess.js` — `WebGLRenderTarget` setup, full-screen quad helper, post-pass driver.
- `src/components/pipeline/celRegionId.js` — material → region-ID mapping (face/hair/body/bg).

**Modified files:**
- `src/components/pipeline/SPX3DTo2DPanel.jsx`:
  - Add `useShaderCel` state (default `false`).
  - Add `applyCelShadingShader` next to existing `applyCelShading`.
  - In `captureAndProcess`, route based on flag.
  - DEBUG toggle in PARAMETERS sidebar.

**Backward compatibility:** every existing path stays untouched while flag is false. The current pipeline continues to run in production until flag flips.

### Stage 2: A/B test (Weeks 3-4)

- Internal QA: toggle on for development. Run all 144 visual cases against the existing pipeline as reference.
- For each cel style × rig combo, compare preview side-by-side using the panel's LEFT (raw 3D) + CENTER (styled). The styled output is the variable.
- Specific regressions to watch:
  - Outline thickness consistency
  - Skin tone (iClone hotspots, Mixamo flatness)
  - Hair banding count
  - Face detail at preview scale
  - Animation smoothness (frame-to-frame consistency without temporal blend)
- Performance benchmark: capture per-frame ms for both paths on 1-, 2-, 3-avatar scenes. Confirm new path is ≥2× faster.

### Stage 3: Default-on + deprecation (Week 5+)

- Flip `useShaderCel` default to `true`.
- After 2 weeks of stable use, mark `bilateralBlurSeparable`, `posterizeLuminance` (CPU), `captureNormalEdges`, `captureSilhouetteMask`, `captureFacePass`, `compositeFaceOntoBody`, `captureHairPass`, `compositeHairOntoBody`, `captureHairMask`, `_swapAllMeshes`, and the cel branch of `applyStyleFilter` (`:147-230`) as deprecated.
- After 4 weeks, delete the deprecated code. Cel branch of `applyStyleFilter` becomes a thin "the cel pipeline runs on GPU, this branch is unreachable" guard.

### Rollback strategy

The feature flag remains in place through Stage 3. Any user-visible regression flips the flag back to `false` and reinstates the old path with zero file changes. Once Stage 3 deletes the old code, rollback requires `git revert` — at that point we've shipped the new pipeline for 6+ weeks with no reported issues, so risk is low.

A more conservative variant: keep the CPU pipeline files in the repo permanently under a `legacy/` subdir, importable only when flag=false. Costs ~600 LOC of dead-code maintenance but eliminates the revert step.

---

## PART 5 — OPEN QUESTIONS / DECISIONS NEEDED

These determine implementation direction. Each is a binary or small-choice decision that materially changes the rewrite.

### Q1. Temporal blend: kill, preserve-for-export, or rebuild?
- **Kill entirely:** simplest. No temporal coherence. Cel bands may flicker frame-to-frame on near-threshold pixels.
- **Preserve for export only:** current `exportMode === 'final'` gate, but default `temporalBlend` to 0 in preview and small (~0.15) in export.
- **Rebuild as GPU temporal AA:** sample a history buffer in the post-process pass, jitter sub-pixel per frame, blend with motion-rejection. Significantly more work but eliminates flicker without ghosting.
- **Recommendation:** kill in preview, optional 0.1-0.2 in export. Cel bands rarely flicker if the source render is stable.

### Q2. Face sub-pass: keep as region-ID rule, or eliminate entirely?
- **Keep:** higher posterize levels on face pixels via region-ID lookup. Cheap (no extra render, just a fragment branch).
- **Eliminate:** rely on full-res post-process + preserved normalMap to give enough face detail. One fewer code path.
- **Recommendation:** keep as region-ID. Free fidelity win.

### Q3. Hair sub-pass: same question.
- **Recommendation:** keep as region-ID. Anime hair benefits from fewer bands; region-ID lookup is the right tool.

### Q4. Ink edges: keep object-space Sobel (current) or move to screen-space normal+depth edge?
- **Current (object-space normal Sobel):** `MeshNormalMaterial` render → Sobel. Catches geometric creases; misses depth discontinuities (e.g., one avatar in front of another at the same orientation).
- **New (screen-space normal+depth edge in post-process):** sample MRT 1 normal+depth, apply 3×3 edge kernel on both, OR the results. Catches creases AND silhouettes between separately-shaded objects.
- **Recommendation:** screen-space normal+depth. More accurate, same shader cost.

### Q5. Outline: keep inverted-hull shell, or move to screen-space?
- **Inverted hull (current):** works, scales with world distance, no extra pass. Memory overhead: 1 extra mesh per visible mesh.
- **Screen-space (in post-process):** consistent thickness regardless of distance, no extra geometry, but requires depth buffer (already in MRT 1).
- **Recommendation:** ship Stage 1 with inverted hull (no migration risk). Add screen-space as a Stage 2 alternative behind a sub-toggle.

### Q6. Halftone overlay (manga/comic): GPU or stay 2D?
- Current: applied as a post-step via `applyHalftoneOverlay` (in the `:710-806` style finish code, not detailed in this audit).
- **Recommendation:** port to GPU as part of the post-process fragment shader for the styles that need it. Tile-based, cheap. Eliminates one more CPU pass.

### Q7. Render target precision: float16 vs RGBA8?
- **Float16:** preserves linear-space precision, eliminates 8-bit banding in posterize math, costs ~2× memory bandwidth.
- **RGBA8:** matches current pipeline precision (8-bit canvas), cheaper.
- **Recommendation:** float16 for the cel pass output buffer, RGBA8 for normal+depth buffer. Final output to RGBA8 canvas anyway, so precision is preserved through the math but truncates at the end (matching `toDataURL` semantics).

### Q8. WebGL1 fallback?
- WebGL1 doesn't support MRT without `WEBGL_draw_buffers` extension (well-supported but not universal). No `vec4` interpolation precision guarantees.
- **Recommendation:** require WebGL2. Fall back to old CPU pipeline with a status message on the rare WebGL1-only client. Affects <3% of users in 2026.

### Q9. Should `applyStyleFilter` cel-branch survive at all?
- Current: cel-family routes through cel branch in `applyStyleFilter`, plus the upstream cel material swap. Two cel paths interleaved.
- **Proposed:** all cel work in the GPU pass. `applyStyleFilter` cel branch becomes a noop / not entered for cel styles.
- **Recommendation:** yes, eliminate the cel branch of `applyStyleFilter`. Reduces conceptual surface.

### Q10. iClone PBR hotspot regression risk (post envMapIntensity=1.0 fix)
- Pre-fix `envMapIntensity=0.6` was specifically protective against iClone baked-specular blowout. The fix raised it to 1.0 — needs validation across iClone test scenes.
- **Decision:** if hotspots return, drop to 0.85 globally OR add per-style/per-rig override. Don't bake the assumption into shader code.

### Q11. ML-based pipeline (parallel option from `anime_ml_feasibility.md`)
- The audit folder contains an ML feasibility doc proposing a NN-based stylizer instead of shader-based. Different cost profile, different visual result.
- **Decision:** is the rewrite proposed here the chosen direction, or is the ML path the chosen direction? They're alternatives, not stages of the same plan.

---

## Aspects of the current pipeline worth preserving (post-rewrite)

These design choices are correct and should carry into the new pipeline:

1. **Normal-edge Sobel for ink lines** — finds geometric creases, not cel-band transitions. Was the right call (see commit history around skinning-topology "x-ray bone lines" issue). New path: screen-space normal+depth Sobel keeps this principle.
2. **Per-style CEL_2D_PASS / CEL_FACE_PASS / CEL_HAIR_PASS tables** at `:1031-1091` — clean tuning surface. New path: same tables, now uniform buffer entries indexed by region ID.
3. **Math.ceil rounding in posterize** (`:999`) — biases mid-tones up, prevents skin from looking underexposed. Carry forward into fragment shader.
4. **Bottom gradient stop lifted to 0.45** (`:1108`) — prevents shadow-band collapse to black. Keep the gradient texture data as-is.
5. **Auto-frame preview camera** (`:1919-1954`) — stable framing across animation via Box3.setFromObject on SkinnedMesh rest pose. Orthogonal to the rewrite; keep.
6. **NPR material restoration on panel close** (`:1646-1650, :1959-1972`) — clean teardown. Critical for not leaking cel materials into the rest of the editor. Carry forward.
7. **Per-frame mixer seek in preview rAF** (`:1807-1817`) — enables multi-avatar animation in styled preview. Orthogonal to cel work; keep.
8. **Preset system** (`CEL_PRESETS` at `:1048-1057`) — user-tunable cel styles per name. Carry forward unchanged.
9. **Frame-driven seek in video export** (`:2354-2357`) — correctly drives mixer by frame index, not wall-clock. Critical for export timing. Keep.

---

## Summary

The current cel pipeline does **a lot of CPU pixel work** to compensate for a fundamentally lossy 0.33× downsample, with a separate face sub-pass and hair sub-pass each running the same bilateral+posterize+ink recipe at extra cost. Recent fixes (normal-map preservation, envMapIntensity=1.0) addressed the most visible regressions, but the structural limits remain — sharpness is capped at ~33% of native, ~25 GPU→CPU readbacks per preview frame, and per-rig variance is invisible to the pipeline.

A GPU-shader-based rewrite at full resolution is feasible at ~100 LOC net (replacing ~550 LOC of CPU pipeline), achievable in 4-5 weeks of focused work with feature-flag rollout. The dominant uncertainty is shader portability across GPUs; mitigation is a WebGL1 / CPU-path fallback. The decision points in PART 5 — especially Q11 (this proposal vs the parallel ML proposal) — should be answered before Stage 1 starts.
