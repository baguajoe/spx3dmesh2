# Face Rendering Artifacts in Cel Pipeline — Read-Only Audit

**Symptom:** higher-resolution preview (commit `ffaeda2`) made it visible that the face region of cel-shaded output has soft/melted features, weird shading patterns, and unclear eye/mouth geometry at zoom.

**Scope:** read-only audit. No code changes.

**Primary files:**
- `src/components/pipeline/SPX3DTo2DPanel.jsx`
- `src/components/pipeline/celPostProcess/celPostProcess.js`
- `src/components/pipeline/celPostProcess/celShader.frag.glsl.js`
- `src/components/pipeline/celPostProcess/normalDepthMaterial.js`
- `src/components/pipeline/celPostProcess/regionId.js`
- `src/components/pipeline/celPostProcess/faceOverlay.js` (Stage 5, commit `d71737b`)
- `src/utils/faceDetection.js`

---

## PART 1 — CURRENT FACE RENDERING PATH

### 1.1 What meshes constitute a face on our test avatars?

**Test avatar inventory honesty check.** The repo ships exactly one avatar GLB:

- `public/models/ybot.glb` — a Mixamo "Y-Bot" dummy. Examined directly via the GLB JSON chunk. Asset version 2.0, generator "Open Asset Import Library (assimp v5.3.0)".
  - **2 meshes total**: `Alpha_Surface` (mesh 0, material `Alpha_Body_MAT`) and `Alpha_Joints` (mesh 1, material `Alpha_Joints_MAT`). Both are a single primitive with `POSITION,NORMAL,TEXCOORD_0,JOINTS_0,WEIGHTS_0`. Both bound to the single skin (52 joints).
  - **No `Wolf3D_Head`, no face mesh, no eye mesh, no teeth mesh.** Y-Bot's head is a featureless skull-shaped extension of the body surface mesh.
  - Bone names use the `mixamorig:` prefix (e.g. `mixamorig:Head`), which `HEAD_BONE_PATTERNS` at `src/utils/faceDetection.js:22-26` matches via `/^mixamorig:?head$/i`.
  - 158 nodes total; 156 are bones. Only nodes 156 (`Alpha_Surface`) and 157 (`Alpha_Joints`) carry mesh references.

**Consequence for this audit:** the artifact symptoms the user describes (eye/mouth/eyebrow softening) cannot be reproduced on `ybot.glb` — Y-Bot has no eyes, no mouth, no eyebrows. Anything the user observed about "softened/melted features" is being seen on user-loaded avatars (green-haired armor, mewalk iClone, etc.) that are not in the repo. The audit below documents the pipeline's *expected* face-region behavior based on the code paths and the mesh-name patterns the pipeline actually matches.

**What the pipeline expects for "designed" avatars** (from the patterns in `src/utils/faceDetection.js:28-42`):

| Mesh role | Regex matches | Source |
|-----------|----------------|--------|
| Face mesh | `/_head\b/i`, `/^head$/i`, `/face/i`, `/scalp/i`, `/wolf3d_head/i` | `FACE_MESH_PATTERNS`, `faceDetection.js:28-34` |
| Excluded from face match | `/^garment_/i`, `/^hair_/i`, `/tongue/i`, `/teeth/i`, `/eyelash/i` | `EXCLUDE_MESH_PATTERNS`, `faceDetection.js:36-42` |
| Hair mesh | `/wolf3d_hair/i`, `/^cc_base_hair/i`, `/^hair/i`, `/^scalp/i` | `HAIR_MESH_PATTERNS`, `SPX3DTo2DPanel.jsx:1308` |
| Head bone | `/^head$/i`, `/^cc_base_head$/i`, `/^mixamorig:?head$/i` | `HEAD_BONE_PATTERNS`, `faceDetection.js:22-26` |

**Critical inconsistency on the hair/face boundary.** A "scalp" mesh matches BOTH `FACE_MESH_PATTERNS` (`/scalp/i`, `faceDetection.js:33`) AND `HAIR_MESH_PATTERNS` (`/^scalp/i`, `SPX3DTo2DPanel.jsx:1308`). Iteration order in `scene.traverse` decides which classifier wins, which can flip between asset load orders. This affects both the face-pass camera framing and the hair-cel composite.

**For typical Wolf3D / Ready Player Me avatars** (which the patterns target), a face would split into ~6-8 meshes: `Wolf3D_Head`, `Wolf3D_Hair`, `Wolf3D_Eye_L`, `Wolf3D_Eye_R`, `Wolf3D_Teeth`, `Wolf3D_Eyelashes`, plus optional outfit (`Wolf3D_Outfit_*`). The audit can't verify vertex counts or UV layouts on those without the assets present — flagging as a follow-up: run this inventory step against an actual Wolf3D / Ready Player Me GLB the next time one is loaded.

**Material types:** the pipeline overrides whatever material the GLB ships with — `applyCelShading` at `SPX3DTo2DPanel.jsx:2138-2165` replaces every visible non-helper mesh's material via `makeCelMaterial` (`SPX3DTo2DPanel.jsx:1167-1196`). So whether the source material was MeshStandardMaterial, MeshPhysicalMaterial, or MeshBasicMaterial — by the time the cel pipeline reads pixels, every face mesh is on `MeshToonMaterial` with the same gradient ramp.

### 1.2 What does the cel pipeline do to face pixels specifically?

**There are TWO pipelines** with different face treatment. The GPU path (default-OFF flag, `useShaderCel` at `SPX3DTo2DPanel.jsx:1705`) routes everything through a single fullscreen-quad shader; the CPU path uses ImageData loops and has a dedicated face sub-pass.

#### GPU branch — `runCelPostProcess` at `celPostProcess.js:224`

`captureAndProcess` at `SPX3DTo2DPanel.jsx:2196` enters here when `useShaderCel === true` (line ~2265). The flow for a face pixel is identical to a body pixel — there is no face-vs-body branching:

| Step | Operation | File / line | What it does to face pixels |
|------|-----------|-------------|-----------------------------|
| (a) | Cel render → `colorTarget` | `celPostProcess.js:258-259` | MeshToonMaterial samples gradient map per pixel; face skin gets the same N-step ramp as body. |
| (b) | Normal+depth render → `normalTarget` | `celPostProcess.js:267-270` | `_normalMaterial` (custom `MeshNormalMaterial` patched to also write linear view-Z into alpha; `normalDepthMaterial.js:32-66`). Face writes view-space normals exactly like any other mesh. |
| (c) | 5×5 bilateral on `tCelColor` | `celShader.frag.glsl.js:54-78` | Spatial Gaussian × range Gaussian on luminance; smooths together any 5×5 region whose luminance variation falls within `uBilateralSigmaRange/255` (~18% for `sigmaR=45`). Face features that are darker than skin but within that threshold get averaged into the surrounding skin. |
| (d) | Luminance posterize (ceil round-up) | `celShader.frag.glsl.js:85-88` | `lumQ = ceil(lum * N) / N`. For anime, N=5 → 5 luminance bands. Face eye whites + skin + eye sockets all collapse onto the same 5 bands. |
| (e) | 3×3 Sobel on `tNormalDepth` | `celShader.frag.glsl.js:94-125` | Combines normal-channel Sobel and depth-channel Sobel. Picks up geometric creases (eye sockets, lip line, nose ridge IF the mesh has separate geometry for them; otherwise picks up nothing). |
| (f) | Variable line weight gate | `celShader.frag.glsl.js:140-150` | `step(scaledThreshold, edgeMag)` — binary 0/1. Threshold lowered on shadow side and at silhouettes via `lineWeight` factor. |
| (g) | Ink composite | `celShader.frag.glsl.js:155` | `inked = posterized * (1.0 - edge)` — pure black where `edge=1`, posterized color elsewhere. |
| (h) | Optional manga desaturate | `celShader.frag.glsl.js:160-163` | luminance-to-grayscale; applied after ink so ink stays pure black. |
| Return | Draw `renderer.domElement` → `dstCanvas` | `celPostProcess.js:285-291` | `drawImage` with smoothing into the caller's `tmp` canvas. |
| Early return | `if (out) { applyFaceOverlayIfEnabled(out, ...); return out; }` | `SPX3DTo2DPanel.jsx:2306-2313` | **GPU branch exits captureAndProcess here.** The CPU branch's face sub-pass (step 1.2 below) is skipped entirely. Stage 5's `applyFaceOverlayIfEnabled` draws optional 2D feature primitives on top if `useFaceOverlay === true`. |

**Key observation:** in the GPU branch, face pixels are processed with **`CEL_2D_PASS[style]` parameters** (`SPX3DTo2DPanel.jsx:1056-1063`) — i.e. body params. The tighter `CEL_FACE_PASS` params (`SPX3DTo2DPanel.jsx:1092-1099`) are read at `SPX3DTo2DPanel.jsx:2356` but only consumed by the CPU path's `captureFacePass`. The GPU shader has a `tRegionId` uniform reserved at `celShader.frag.glsl.js:34` but it is unused — `regionId.js:27-29`'s `resolveRegionId` returns `REGION_BODY` for every mesh (the file documents itself as a Stage 1 stub).

#### CPU branch — `captureAndProcess` body, `SPX3DTo2DPanel.jsx:2202-2403`

When `useShaderCel === false` (default), or when the GPU pipeline failed init (caught at `SPX3DTo2DPanel.jsx:2309-2313`):

1. Body cel render: `renderer.render(scene, camera)` → `src = renderer.domElement` (`SPX3DTo2DPanel.jsx:2229-2230`), `drawImage` to `tmp` (`SPX3DTo2DPanel.jsx:2237`).
2. Normal-edge ink pass via `captureNormalEdges` (`SPX3DTo2DPanel.jsx:2314`) — separate render with `_normalMaterialForEdges`, then `makeLinePass` Sobel (defined ~`SPX3DTo2DPanel.jsx:765`).
3. Silhouette mask via `captureSilhouetteMask` (`SPX3DTo2DPanel.jsx:2315`).
4. `applyStyleFilter(tmp, activeStyle, …)` (`SPX3DTo2DPanel.jsx:2343`). The cel branch inside this dispatcher is at `SPX3DTo2DPanel.jsx:178-249`:
   - Bilateral on the raw cel render (line 192).
   - Posterize luminance (line 195).
   - Multiply-composite the pre-computed normal-edge lines (lines 213-216).
   - Silhouette wipe (lines 233-245).
5. **Face sub-pass** — `captureFacePass` at `SPX3DTo2DPanel.jsx:1556-1635`:
   - `setViewOffset` clones the body camera and crops to the face rect.
   - Resizes the renderer to `FACE_PASS_SCALE × faceRect` (= 4× linear, 16× pixel area; `FACE_PASS_SCALE` at `SPX3DTo2DPanel.jsx:1123`).
   - Renders cel materials → `celSrc`.
   - Renders normal materials → `normalSrc` → Sobel via `makeLinePass`.
   - Runs the **face-tuned** `bilateralBlurSeparable` + `posterizeLuminance` chain using `CEL_FACE_PASS[style]` params (`SPX3DTo2DPanel.jsx:1605-1606`).
   - Multiply-composites lines.
   - Downsamples to face-rect dims for compositing.
6. `compositeFaceOntoBody(result, faceCanvas, faceRect)` (`SPX3DTo2DPanel.jsx:1641` onward) — feathered alpha composite into the body result.
7. Hair sub-pass via `captureHairPass` (`SPX3DTo2DPanel.jsx:1444-1492`) → `compositeHairOntoBody`.
8. Optional temporal blend, return.

**So the two pipelines diverge significantly on face treatment:**
- GPU: face = body params, no high-res pass.
- CPU: face = tighter `CEL_FACE_PASS` params, rendered at 4× linear over the face rect.

### 1.3 What does `src/utils/faceDetection.js` actually do?

**Function:** `detectFaceRect(scene, camera, canvasW, canvasH, cache)` at `faceDetection.js:109`.

**Method:** head-bone-anchored AABB projection. The bone supplies the live world-space center (animation-respecting, `faceDetection.js:130-131`); the rest-pose head mesh supplies the AABB extents (`faceDetection.js:124-126`, `measureRestPoseFaceSize` at `:92-99`). Extents are then shrunk per axis (`SHRINK = { x: 0.85, y: 0.55, z: 0.85 }` at `:50`) and the center is offset up by `0.25 × restPoseSize.y` (`:51`, applied `:150`) to bias from the neck-base bone toward the face.

**Output shape:** `{ x, y, w, h, featherPx }` in pixel coords of the target canvas, top-left origin (`:201-207`). `featherPx = min(w,h) * 0.1`. Returns `null` when:
- No `scene`, `camera`, dims, or `cache` arg (`:110`).
- No head bone AND no head mesh found (`:140`).
- No rest-pose size measurable (`:144`).
- AABB fully off-screen / behind near plane (`:183`).
- Resulting rect < 4×4 px (`:199`).

**Cache shape:** caller-owned plain object (`useRef({}).current`). First call populates `{scene, headBone, headMesh, restPoseSize}`. Subsequent calls reuse. Invalidates on scene swap or detached bone/mesh (`:112-120`).

**Current call sites in cel pipeline:**

| Site | File / line | Purpose |
|------|-------------|---------|
| rAF face overlay debug | `SPX3DTo2DPanel.jsx:1992` | Populates `faceRectRef`; only drawn when `window.__SPX_DEBUG_FACE_RECT` is set. |
| CPU face sub-pass | `SPX3DTo2DPanel.jsx:2357` | Drives `captureFacePass` framing via `setViewOffset`. |
| Stage 5 feature overlay | `SPX3DTo2DPanel.jsx:2226` (inside `applyFaceOverlayIfEnabled`) | Positions stylized 2D feature drawing. |

**Not currently used to drive the GPU cel pipeline.** The shader has `tRegionId` reserved (`celShader.frag.glsl.js:34`) but `regionId.js` is a stub. There is no "if this pixel is in the face rect, use different bilateral params" branch anywhere in the GPU shader. So the rect detector exists, has callers, but cannot affect the most-recent (GPU) pipeline's per-pixel processing without new wiring.

---

## PART 2 — WHY FACE LOOKS BROKEN AT HIGH ZOOM

### 2.1 Bilateral filter on the face region

**Body params (GPU + CPU body path):** `CEL_2D_PASS` at `SPX3DTo2DPanel.jsx:1056-1063`. For anime: `bilateralRadius: 3, bilateralSigmaR: 45`.

**Face params (CPU only, via `captureFacePass`):** `CEL_FACE_PASS` at `SPX3DTo2DPanel.jsx:1092-1099`. For anime: `bilateralRadius: 2, bilateralSigmaR: 35`. The header comment at `:1088-1091` says these were tuned for "tighter edge threshold so eye/lip detail renders, higher posterize lv for skin gradient, smaller bilateral radius to preserve fine facial detail."

**What body params do on face pixels in the GPU branch.** A 5×5 bilateral with `sigmaR=45/255 ≈ 0.176` treats any 5×5 neighborhood with luminance variation ≤ ~18% as "same region." Skin-to-iris and skin-to-lip transitions usually fall inside this band — eye iris brightness vs surrounding skin is often only 20-40 luminance units on a 0-255 scale, depending on lighting and skin tone. The bilateral averages them.

At preview resolution this happens at viewport×renderScale pixels. With renderScale=2 and viewport=766, the face rect is typically 80-120 px wide (for a head occupying ~⅓ of frame height). At that size, an entire eye (iris+pupil+sclera) is 15-25 px wide; the bilateral's 5×5 footprint covers roughly half the eye's width in a single tap. Net effect: eye features blend into surrounding skin and read as a luminance dip rather than a discrete shape.

**For a 20-30 pixel cluster containing eye + glasses + eyebrow (the user's example):** sigmaR=45 essentially flattens it. Eyebrow (dark) + eye iris (dark) + glasses frame (dark) get merged into one "dark band"; skin (light) becomes another band. Posterize then snaps the dark band to a single luminance level. Result: a single dark blob where there were three distinct features.

**Quantified estimate.** At renderScale=2 with the new ffaeda2 fix, face rect ≈ 100×120. Eyes sit at ≈0.30 down × 0.10 inset (per `faceOverlay.js:90-96` positioning convention) — width ≈ 100×0.20 = 20 px, height ≈ 120×0.06 = 7 px. The bilateral's 5×5 footprint (covering 5×5=25 px²) is ~half the eye's pixel count. Sigma=45 makes it "same region" with the surrounding skin within ~18% luminance. Eye-vs-skin luminance gap is typically 15-30%; some of it gets averaged, some doesn't, producing a noisy partial-average that posterize then snaps to a band edge → the "softened/melted" look.

### 2.2 Posterize on the face region

**Body params:** `posterizeLevels: 5` for anime (`CEL_2D_PASS[anime]`, `SPX3DTo2DPanel.jsx:1057`). `posterizeLuminance` at `SPX3DTo2DPanel.jsx:1010-1022`. Algorithm: `newLum = ceil(lum / 255 * (levels-1)) / (levels-1) * 255`. With levels=5, lvSteps=4 → 4 discrete bands: `~64, ~128, ~192, ~255`. `lum<1` pixels short-circuit (stay black).

**On face pixels (GPU path = body params):** with 4 bands, a face's luminance range is highly compressed. Skin tone luminance varies roughly across a 0.3-0.7 range under typical lighting → 0.3 * 4 = 1.2 (band 2) and 0.7 * 4 = 2.8 (band 3). So most of the face collapses onto **two bands**. Eye iris (~0.2 lum) collapses to band 1. Eye highlight (~0.9 lum) collapses to band 4. Eyebrow shadow may collapse to band 1 or 2 depending on lighting.

**On face pixels (CPU path with `CEL_FACE_PASS[anime]`):** `posterizeLv: 7` → 6 bands. Quarter-step finer granularity. Skin variation can span 3-4 bands. Eye-vs-skin separation is more likely to remain visible.

**The "feature falls into same band as skin" failure mode:** GPU path with body params (anime `posterizeLv=5`). After bilateral pre-smooth (2.1 above), a feature that started 30% darker than skin can come out only 10-15% darker, which is now well within one band's width (band width = 255/4 ≈ 64). Result: feature and surrounding skin posterize to identical luminance values → feature invisible.

### 2.3 Sobel edge detection on the face region

**GPU path** — Sobel runs on `tNormalDepth` (`celShader.frag.glsl.js:94-125`):

- **Normal-channel Sobel** picks up geometric normal discontinuities. Eye sockets are a real geometric feature on most face meshes → normals flip across the upper/lower lid; the Sobel picks this up if the geometry is dense enough. On low-poly Mixamo/Wolf3D heads (typical eye region = 20-40 triangles), the normal transition is mostly captured by 2-3 triangle edges → Sobel sees them, but only as fragments.
- **Depth-channel Sobel** picks up silhouettes and depth discontinuities. For a head mesh, the only depth-Sobel hits in the face region come from glasses (separate mesh, distinct depth), eyelashes (separate, very thin), and around the nose ridge silhouette. Bare skin features (lip corners, eye corners) do not produce depth discontinuities — same mesh, continuous depth gradient.
- `lineWeight` modulation (`celShader.frag.glsl.js:140-150`) lowers the threshold on shadow side and at silhouettes — boosts inking around the silhouette of the head but **does NOT specifically lower it inside the face region**. So an eye in the well-lit zone of the face gets the unmodulated threshold (90/255 for anime); it has to overcome the same bar a body feature does.

**Threshold math.** Per-style `edgeThreshold` is given in 0-255 units and divided by 255 in `runCelPostProcess` at `celPostProcess.js:242`. Anime body threshold = 90 → 0.353 in shader space. Normal-Sobel magnitude is `(length(gxN) + length(gyN)) * 0.125 * uEdgeBias` — for a fully-perpendicular face triangle in a moderately textured normal map this is usually ~0.4-0.7 at hard creases, ~0.1-0.3 at soft creases. So eye sockets often barely cross the threshold; mouth-line creases often don't.

**CPU path** — `captureFacePass` (`SPX3DTo2DPanel.jsx:1597`) does its own `makeLinePass` Sobel on the normal render at the face rect (4× linear scale → 16× pixel density). With `CEL_FACE_PASS[anime].edgeThreshold = 60` (vs body 90), the threshold is 33% lower → more face creases ink as lines.

**Net face-feature edge behavior:**
- GPU path: edges fire on hard creases (eye sockets sometimes, jaw line, lip silhouette) and miss most fine detail (eyelid edges, mouth interior, eyebrow hairs). The user-visible "weird shading patterns" likely include partial Sobel hits on these creases that don't form clean lines, creating dotted/broken ink that posterize then exposes against flat skin bands.
- CPU path: edges fire on more face features but at higher source resolution (4×). Then downsampled into the face rect for composite — preserving more detail.

### 2.4 Multi-mesh compositing

**For Wolf3D-style avatars** (Wolf3D_Eye_L, Wolf3D_Eye_R, Wolf3D_Teeth as separate meshes):

- Each mesh material is replaced with MeshToonMaterial via `applyCelShading` (`SPX3DTo2DPanel.jsx:2138-2165`) — **including eye meshes**. So a separate eye-iris mesh, which should have a distinct iris color/texture, gets cel-shaded the same way as skin. If the original eye material had `map=eye_texture` it gets carried over (`makeCelMaterial:1170`) but the cel gradient ramp now applies to it too — so eye texture is posterized.
- The normal-edge pass (GPU `tNormalDepth` / CPU `_normalMaterialForEdges`) swaps EVERY non-helper mesh to a normal material. This means the boundary between Wolf3D_Eye_L and surrounding Wolf3D_Head **does generate a depth-channel discontinuity** at the eye perimeter (they are not the same mesh; depth-z differs slightly because of separate geometry). The Sobel picks this up — eye perimeters get inked. This is one of the few face features that the GPU pipeline currently inks reliably for Wolf3D meshes.
- Teeth: `EXCLUDE_MESH_PATTERNS` at `faceDetection.js:39` skips them for face detection, but `applyCelShading` does NOT skip them. So teeth render as cel-shaded geometry, but the face rect doesn't include them. If teeth are visible (open mouth) they composite separately under the body cel params.
- Eyelashes (Wolf3D_Eyelashes): similar — excluded from face mesh match but still cel-shaded. Usually rendered as a thin alpha-tested geometry. The cel pipeline doesn't currently special-case alpha-tested materials → eyelash transparency might break against MeshToonMaterial replacement.

**Z-fighting / sorting risk:**
- Wolf3D eyes are typically modeled as separate spherical meshes inside the head's eye sockets. They have a small depth offset (~0.005-0.01 units) from the inner socket surface. At the GPU's normal+depth target this is captured as a depth gradient, which the Sobel reads as an edge — net positive for ink. No z-fight reported in code that handles this.
- The `outline` mesh added by `applyCelShading` (`SPX3DTo2DPanel.jsx:2167+` (inverted-hull pass)) is BackSide-scaled and parented to the eye sockets too. If the outline scale factor (`1 + outlineWidth * outlineMul * 0.04` per `:2156`) inflates an eye mesh enough to poke through the eyelid, you'd get a stripe of black across the eye. Should not happen at default `outlineWidth=1.5, outlineMul=0.6` (anime) → scale = 1.036, ≈3.6% inflation. On a 1cm-radius eye, that's 0.036cm — within typical eye/eyelid clearance.

---

## PART 3 — WHY THE BODY LOOKS CLEAN

The body has fundamentally different statistical properties from the face:

| Property | Body | Face | Why it matters |
|----------|------|------|----------------|
| Feature size relative to capture pixels | Garment regions = 100s of px wide | Eye/mouth = 5-30 px wide | Bilateral footprint (5×5) is ~25% of a face feature, <1% of a body region. |
| Luminance variation | Large flat regions (sleeve, torso) span 10s of pixels at near-uniform luminance | Adjacent pixels can jump 50-100 in luminance (skin → iris → highlight) | Posterize-to-flat-bands is **what we want** for body; it destroys structure on faces. |
| Geometric edge density | Sparse hard creases (sleeve seam, collar, belt) | Dense soft creases (eyelid fold, nostril, lip line) at small pixel scale | Sobel threshold tuned for body misses face creases. |
| Color-vs-luma distribution | High chroma variation (red shirt vs blue pants) | Low chroma variation (skin everywhere) | Luminance-only posterize crushes face into single chroma; body keeps multiple colored "blocks." |
| Mesh / material count | 1-3 garment meshes | 4-8 separate meshes (eye L, eye R, teeth, eyelash, hair, scalp, head) | Cel-shading every face mesh uniformly destroys distinctions the source material made. |

**The pipeline's design is body-first:** the header comment at `SPX3DTo2DPanel.jsx:1042-1049` describes `sigmaR` being "bumped (was 25-40) to flatten dense face features that the smaller range was leaving as mottled noise." That tuning prioritized "no noise" over "feature preservation" — i.e. the code deliberately chose to wipe face detail because the alternative was speckle. The current GPU pipeline inherits that decision.

---

## PART 4 — POTENTIAL FIXES, RANKED

For each candidate, ROI = (expected visual improvement) / (risk × effort).

### Ranking table (best to worst)

| Rank | Candidate | Visual gain | Body regression risk | Effort | Infra exists? | ROI |
|------|-----------|-------------|----------------------|--------|----------------|-----|
| 1 | **C. Face-region render at tighter params** | High | Very low | Small-medium | Mostly — `captureFacePass` already exists for CPU; needs GPU equivalent | **Highest** |
| 2 | **A. Region-ID per-pixel branching** | Highest | Low | Large | Partially — `tRegionId` uniform reserved, `regionId.js` is a stub | Best long-term |
| 3 | **E. Posterize boost only when face detected** | Medium | Low (face only) | Small | Yes — face detector already wired | Good |
| 4 | **F. Disable bilateral on face region** | Medium-high | Low (face only) | Small-medium | Partial — would need a face-region mask | Good |
| 5 | **D. Hand-drawn feature overlay (Stage 5)** | Visually obvious, stylistically debatable | None | Already done (commit `d71737b`) | Yes — shipped behind a flag | Already paid for |
| 6 | **B. Global bilateral aggressiveness reduction** | Low-medium on face | **High** on body | Small | n/a | **Worst** — body regresses |

### A. Region-ID shader with per-region bilateral/posterize override

**What changes:** wire the third MRT (`tRegionId`, already reserved at `celShader.frag.glsl.js:34`) so each mesh writes its region ID at render time. The fragment shader picks per-region params from uniform arrays. `regionId.js:27-29`'s `resolveRegionId` becomes a real classifier (face / hair / body) using the mesh name patterns from `faceDetection.js` + `HAIR_MESH_PATTERNS`.

**Expected visual impact on face:** the largest possible — face pixels can use posterize=7, bilateral radius=2, sigmaR=30, edgeThreshold=60 (matching `CEL_FACE_PASS`) while body keeps its `CEL_2D_PASS` defaults. The CPU branch's face sub-pass becomes redundant.

**Risk of regression on body:** very low if the region classifier defaults to BODY for everything unmatched. The body code path is untouched.

**Implementation effort:** large. Requires:
- A new mesh-region material that writes the region byte to a second render target. Or extending `_normalMaterial` to also output region into alpha (giving up depth-in-alpha unless a 4-target MRT is set up).
- Multi-render-target setup in `createCelPostProcessPipeline` at `celPostProcess.js:54-140` (currently only `colorTarget` and `normalTarget`; would need a third).
- Per-region uniform arrays in the fragment shader. GLSL ES 3.0 (which Three.js's `WebGLRenderer` reaches via `renderer.outputColorSpace=...`) supports uniform arrays cleanly; current shader at `celShader.frag.glsl.js` is ES 1.0 grammar (uses `texture2D`, `precision highp`).
- A region-classifier pass in `applyCelShading` so each cel-material gets its region uniform set at the same time it gets its gradient map.

**Existing infrastructure supports it partially:** `regionId.js` is the stub already in place. The shader has the `tRegionId` uniform declared. MRT plumbing in three.js is `WebGLMultipleRenderTargets` (deprecated) or `WebGLRenderTarget({ count: N })` (current). Neither is wired yet.

### B. Bilateral aggressiveness reduction globally

**What changes:** lower `bilateralSigmaR` in `CEL_2D_PASS` from 45 → ~25, lower `bilateralRadius` 3 → 2 for anime / toon / comic.

**Expected face impact:** medium. Reduces the over-smoothing problem but doesn't eliminate it — even at sigmaR=25, a 5×5 footprint still hits an entire small eye.

**Body risk:** **high.** The current sigmaR=45 was chosen because lower values produced "mottled noise" on body skin (header comment `SPX3DTo2DPanel.jsx:1042-1049`). Going back to 25 reintroduces that noise on every body cel.

**Effort:** small (data-only edit).

**Verdict:** worst ROI — fixes the face slightly at significant body cost.

### C. Face-specific render pass with different shader params

**What changes:** for the GPU branch, after the main cel render+composite, do a second smaller render of just the face rect with tighter params, then composite into `tmp` at the right location. Mirrors what `captureFacePass` already does for CPU.

**Expected face impact:** high. Same gain as A for the face region. The face rect is detected, the renderer is resized to face-rect dims (already done by `captureFacePass`; pattern is reusable), `runCelPostProcess` is called with `CEL_FACE_PASS[style]` params instead of `CEL_2D_PASS[style]`.

**Body risk:** very low — body cel render is unchanged.

**Effort:** small-medium. Plumbing already exists:
- `detectFaceRect` is called in `applyFaceOverlayIfEnabled` (`SPX3DTo2DPanel.jsx:2226`) so the rect is available.
- `captureFacePass`'s renderer-resize / viewOffset pattern is reusable.
- `runCelPostProcess` accepts a `dstCanvas` (`celPostProcess.js:218-220`) — pass a face-sized scratch canvas, then composite into `tmp` at face-rect location.
- `compositeFaceOntoBody` (`SPX3DTo2DPanel.jsx:1641+`) gives feathered alpha composite, ready to use.

**Existing infrastructure:** yes, almost all of it.

**Caveats:**
- The face-pass camera uses `setViewOffset` which means the face is rendered at the SAME world camera but with a clipped projection — there is NO independent face camera framing. So features come out at the same orientation as the body view.
- Each preview frame does 2 renders for cel + 2 for normal (= 4 GPU renders per frame). Current GPU branch already does 2 renders. CPU branch already does 4-8 (depending on hair). Adding 2-4 more is comparable to CPU baseline.
- Requires a face-aware variant of `runCelPostProcess` OR — simpler — calls `runCelPostProcess` twice with different `dstCanvas` and different params, plus a separate render-target-resize step.

### D. Hand-drawn feature overlay over rendered face (Stage 5)

**What changes:** already done, commit `d71737b`. Stylized 2D primitives (oval eyes, line eyebrows, curve mouths) drawn on top of cel output when `useFaceOverlay` flag is on.

**Expected face impact:** visually obvious but stylistically debatable — the drawn features are static and fixed-position; they don't follow head rotation, don't react to expression, and overdraw whatever the underlying mesh painted. On avatars whose 3D face is actually well-drawn (designed characters), this is a regression. The `MIN_FACE_RECT_PX=20` gate at `faceOverlay.js:54` skips tiny faces; below that the overlay can't be drawn at all.

**Body risk:** none. Body pixels untouched.

**Effort:** zero — already shipped.

**Verdict:** kept as the demo-friendly opt-in for mannequin avatars (Mixamo Y-Bot has no face at all → overlay is the only way to give it features). Not a substitute for fixing the underlying cel pipeline.

### E. Higher posterize levels only when face detected

**What changes:** when `detectFaceRect` returns a non-null rect, bump `uPosterizeLevels` from `CEL_2D_PASS[style].posterizeLv` to `CEL_FACE_PASS[style].posterizeLv` for the whole frame.

**Expected face impact:** medium. From 5 → 7 bands the eye-vs-skin separation has a better chance of surviving posterize. But the bilateral pre-smooth still kills most of it before posterize gets there.

**Body risk:** low. From 5 → 7 bands the body gains finer gradation; mostly invisible at normal viewing distance, mildly less "graphic" at zoom.

**Effort:** small. One uniform value swap, gated on the rect.

**Verdict:** cheap and useful but doesn't address the bilateral problem, which is the larger issue.

### F. Disable bilateral entirely on face region

**What changes:** add a face-mask texture to the GPU shader (rendered via material swap, faces white / body black) or sample a CPU-uploaded mask. Inside the bilateral block at `celShader.frag.glsl.js:59-78`, skip when the face mask is set.

**Expected face impact:** medium-high. Eliminates the over-smoothing root cause. The cost: cel render's residual gradient survives → face gets visible cel-band stepping on the bare skin. Posterize then snaps to bands without bilateral pre-smoothing the seams. May look "stair-step" on cheek shading.

**Body risk:** zero (body still gets bilateral).

**Effort:** small-medium. Adds a face-region mask render pass.

**Verdict:** worth pairing with E. Both are simpler than C and could be combined.

---

## PART 5 — RECOMMENDED PATH

### Minimum viable fix: Candidate C (face-specific GPU pass)

The CPU branch already proves this approach works — `captureFacePass` at `SPX3DTo2DPanel.jsx:1556-1635` renders the face rect at 4× scale with `CEL_FACE_PASS` params, then feathered-composites. The fix is to do the same for the GPU branch — `runCelPostProcess` already accepts a `dstCanvas` and runs to completion in one shader pass; calling it a second time with face params + a face-sized scratch canvas + `setViewOffset` on the camera is a self-contained addition.

**Why this over A (region-ID shader):**
- C is incremental — adds one face pass to the GPU branch, reuses everything else.
- A requires MRT plumbing, GLSL uniform arrays, and a region-classifier pass at material-setup. Larger commit, larger blast radius.
- C produces the same visual result for the face region (it IS a face-only pass with face params); the only thing A does better is amortize the cost (one pass instead of two). For now, two passes is acceptable.

**Edge cases the fix must handle:**

1. **No face detected (Y-Bot, faceless characters):** skip the face pass entirely — only do the body pass. `detectFaceRect` already returns `null` (`faceDetection.js:140-199`); a single early-return is sufficient.
2. **Face rect too small (< 20-30 px):** below this size, even tightened params don't help — the feature pixels are smaller than the bilateral footprint. Skip the face pass. The current Stage 5 overlay uses `MIN_FACE_RECT_PX=20` (`faceOverlay.js:54`); reuse that constant.
3. **Face rect extends past canvas edge:** detect this and clamp, OR skip if the visible portion is < 50% of the rect. `detectFaceRect` already clamps to canvas bounds at `faceDetection.js:192-195`.
4. **Animation drift between body and face passes:** the body pass and the face pass must use **the same camera** AND the **same animation frame** (no mixer advance between them). The CPU branch's `captureFacePass` already nests inside `captureAndProcess` so this is fine — replicate the structure for GPU.
5. **Face composite seam:** `compositeFaceOntoBody` uses a feathered alpha at the rect edges (`SPX3DTo2DPanel.jsx:1641+`). Reuse for the GPU branch.
6. **Performance budget:** the GPU branch currently does 2 renders (cel + normal). Adding face = 2 more = 4 renders/frame. At rs=2 default, viewport×2 + face×4 ≈ 1.4 megapixels/frame for cel render. Should remain at 24 fps on integrated GPU. At rs=4 + face×4, ≈ 9 megapixels/frame — likely below 24 fps on integrated GPU. Acceptable trade-off; the rs=4 mode is already documented as "slow" in commit `ffaeda2`.
7. **Stage 5 overlay interaction:** if both face-pass and `useFaceOverlay` are on, the overlay should draw on top of the high-quality face cel — which is what `applyFaceOverlayIfEnabled` already does (it's called after the cel work).

### Testing surface needed

| Avatar archetype | What to verify | Why |
|------------------|----------------|-----|
| Y-Bot (`public/models/ybot.glb`) | Face pass correctly skipped (no head mesh, no head bone with name matching `HEAD_BONE_PATTERNS`) | Wait — `mixamorig:Head` DOES match `/^mixamorig:?head$/i`. So `detectFaceRect` will return SOMETHING for Y-Bot. The fallback at `faceDetection.js:132-139` uses the mesh bbox — for Y-Bot's body-as-head, this projects the whole body. Verify the size guard catches it. |
| Mixamo with a real head (swing) | Face pass framed correctly; no double-inking artifacts | Mixamo non-Y-Bot avatars typically have full body mesh with head as part of it. Need to verify naming. |
| Wolf3D / Ready Player Me | All face features inked, no z-fight on eye/eyelid boundary | This is the target avatar archetype the cel pipeline was tuned for. |
| iClone / CC4 (mewalk) | `cc_base_*` mesh patterns match → face pass runs; no cosmetic regressions | iClone uses different naming (`CC_Base_Head`, etc.). Verify `FACE_MESH_PATTERNS` covers it. |
| Glasses-wearing avatar (green-haired armor) | Glasses lenses don't get the face params applied (they're at a different depth) | Face rect is 2D — glasses inside the rect get rendered as part of face. Verify whether this is acceptable. |

### Risks of the recommended path

1. **`captureFacePass` for the GPU branch doesn't yet exist.** Adding it touches `captureAndProcess`, `celPostProcess.js`, and possibly `regionId.js`. Estimated 100-200 LOC.
2. **CPU and GPU branches diverge further.** CPU has `captureFacePass` which is a CPU-only pixel pipeline; the new GPU `captureFacePass` would use the GPU shader. Two implementations of the same concept.
3. **Tests:** the only avatar in-repo is Y-Bot (no face). The fix can't be visually verified without loading external avatars. Need to clip an in-repo test avatar (Wolf3D / iClone) — see Part 6.

---

## PART 6 — TEST AVATAR ANALYSIS

### Available avatars

**In-repo:** `public/models/ybot.glb` only (Mixamo Y-Bot, confirmed from GLB inspection in Part 1.1).

**Referenced in task brief but not in-repo:**
- Green-haired armor avatar (designed character with glasses)
- Swing Mixamo (real-face Mixamo character)
- Mewalk iClone (CC4 export)

These are loaded at runtime through the panel's import path — none of them are committed. **Action item for the fix PR:** drop one Wolf3D / Ready Player Me GLB into `public/models/` for visual regression testing, or stand up an automated smoke test that requires a designated test avatar path.

### Per-avatar analysis (based on naming patterns the pipeline matches)

| Avatar | Face would benefit? | Likely to regress? | Naming concerns |
|--------|---------------------|--------------------|-----------------|
| Y-Bot (in-repo) | No — no face geometry; face rect would still detect (head bone exists with `mixamorig:Head` name) but the size guard catches it | No — face is featureless; even an over-smoothed Y-Bot face looks the same as a clean one | The `mixamorig:Head` bone exists, but `findFaceMesh` returns null because there's no `_head` / `face` / `wolf3d_head` mesh. Path falls through to `cache.headBone && !cache.headMesh && !cache.restPoseSize` → returns null at `faceDetection.js:144`. **Y-Bot will not trigger the face pass.** |
| Swing Mixamo | Yes — has a real head/face mesh | Low | Mixamo characters typically use generic mesh names like `Alpha_Surface` or `Body_Geo` (matches none of `FACE_MESH_PATTERNS`) → `findFaceMesh` returns null. Pipeline falls through to head-bone-only path with no rest-pose mesh; `restPoseSize` is null → null rect. **Mixamo non-Wolf3D may not trigger face pass either.** |
| Mewalk iClone | Yes — has a `CC_Base_Head` mesh in the typical CC4 export | Low | `CC_Base_Head` should match `/^head$/i`? No — `^head$` requires the entire name be "head". Does NOT match. `face/i` substring? No — name is `CC_Base_Head`. Closest match: `cc_base_head` is in `HEAD_BONE_PATTERNS` for the BONE not the mesh. **`FACE_MESH_PATTERNS` is missing a `cc_base_head` entry — iClone avatars don't trigger face detection.** |
| Wolf3D / Ready Player Me | Yes — `Wolf3D_Head` mesh matches `wolf3d_head/i` at `faceDetection.js:33` | Low | The face mesh patterns were tuned for Wolf3D. Should work. Verify Wolf3D_Eyelashes alpha-test doesn't break against MeshToonMaterial swap. |
| Green-haired armor | Depends on rigging — if Wolf3D-base or iClone-base | Depends — glasses inside face rect are at a different depth and may get cel-shaded incorrectly | Need to inspect the actual avatar to know. |

### Mesh-naming inconsistencies that would break region detection

**Major issue: `findFaceMesh` is brittle.** The patterns at `faceDetection.js:28-34` cover:
- `/_head\b/i` (matches "X_Head", "X_head_Y" but not "Head" alone)
- `/^head$/i` (matches exactly "Head" / "HEAD" / etc.)
- `/face/i` (substring match anywhere)
- `/scalp/i` (substring; also conflicts with hair patterns)
- `/wolf3d_head/i` (Wolf3D-specific)

**Missing for common asset pipelines:**
- iClone CC4: `CC_Base_Head` — doesn't match `/^head$/i` (full string) or `/_head\b/i` (the `_` is followed by capital "Head" which is fine BUT the regex `/_head\b/i` requires the `_head` boundary — does `CC_Base_Head` match? Let me re-check. The regex is `/_head\b/i` — case-insensitive. `CC_Base_Head` contains `_Head` followed by end-of-string (`\b` matches end of word). With the `i` flag, `_head` would match `_Head` — YES this matches. ✓ Correct: `CC_Base_Head` matches `/_head\b/i`. iClone avatars trigger face mesh detection.
- Daz Genesis: `Genesis8FemaleHead` — no underscore separator. Doesn't match `_head\b`, doesn't match `^head$`, contains "Head" not "head" — case-insensitive substring `/face/i`? No, name is "Genesis8FemaleHead" with no "face" or "scalp" substring. **Daz avatars don't trigger face detection.**
- Generic Maya/Blender export: `head_geo`, `head_skin`, `Head_Mesh` — `/^head$/i` requires exact match → fails. `/_head\b/i` requires `_head` boundary → "head_geo" has `head_` not `_head`, doesn't match. Only `/face/i` substring would catch one of these. **Generic head-mesh names mostly don't trigger face detection.**

**Hair/face conflict:** `/scalp/i` is in both `FACE_MESH_PATTERNS` (`faceDetection.js:33`) AND `HAIR_MESH_PATTERNS` (`SPX3DTo2DPanel.jsx:1308`). For an avatar with a "Scalp" mesh, the cel pipeline would classify it as hair (for hair pass) AND the face detector would match it as the face mesh — its bounding box becomes the face rect. Likely produces a tall narrow rect that includes hair above the head. Worth a follow-up regex narrowing: `/scalp/i` → `/scalp_skin/i` for face, or removing it from face patterns entirely.

---

## Summary

**What's broken:** the GPU cel pipeline (commit `ffaeda2`'s default GPU path when `useShaderCel` is on) treats face pixels with body-tuned bilateral + posterize + Sobel parameters. The same parameters that produce clean flat cel bands on body surfaces (where features are larger than the filter footprint) destroy fine facial detail (where features are smaller than the filter footprint). The CPU pipeline has a dedicated `captureFacePass` that uses tighter `CEL_FACE_PASS` params, but the GPU pipeline does not.

**Recommended fix:** Candidate **C** — add a face-region pass to the GPU branch using existing `detectFaceRect` + `runCelPostProcess` with `CEL_FACE_PASS` params + `compositeFaceOntoBody`. Reuses the CPU branch's design.

**Known blockers for testing:**
1. The only in-repo GLB (`ybot.glb`) has no face — visual verification requires loading external avatars.
2. `FACE_MESH_PATTERNS` is brittle for non-Wolf3D rigs (Daz, generic Maya/Blender) — pattern audit recommended as a side fix.
3. `/scalp/i` in both face and hair pattern tables — name conflict, narrow or remove.

**Avoid:** Candidate **B** (global bilateral aggressiveness reduction) — fixes face slightly while regressing body significantly, opposite of what the existing `sigmaR=45` tuning was chosen for.

**Already shipped:** Candidate **D** (Stage 5 overlay, commit `d71737b`) covers featureless mannequins (Y-Bot) which the face-pass fix would still skip. Keep as opt-in flag.
