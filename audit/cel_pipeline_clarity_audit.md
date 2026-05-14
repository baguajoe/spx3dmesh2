# Cel Pipeline Clarity Audit

**Symptom:** 2D cel output looks like "film over it" — softer/blurrier and dimmer than the 3D viewport mirror.

**Scope:** read-only audit. No code changes.

**Primary file:** `src/components/pipeline/SPX3DTo2DPanel.jsx`

---

## 1. Bilateral Blur

**Function:** `bilateralBlurSeparable(srcCanvas, radius, sigmaR)` — defined `SPX3DTo2DPanel.jsx:908`.

**Call sites (cel-family):**
- Body pass: `SPX3DTo2DPanel.jsx:173` — inside `applyStyleFilter`, before posterize.
- Hair pass: `SPX3DTo2DPanel.jsx:1380` — inside `captureHairPass`, before posterize.
- Face pass: `SPX3DTo2DPanel.jsx:1512` — inside `captureFacePass`, before posterize.

**Kernel parameters** (per style, from `CEL_2D_PASS` at `SPX3DTo2DPanel.jsx:1031`):

| Style | bilateralRadius | bilateralSigmaR | spatial sigma (= radius) |
|-------|----------------:|----------------:|-------------------------:|
| anime |               3 |              45 |                        3 |
| manga |               5 |              55 |                        5 |
| comic |               3 |              45 |                        3 |
| cel   |               2 |              35 |                        2 |
| toon  |               3 |              45 |                        3 |
| pixar |               2 |              35 |                        2 |

Face-pass values (`CEL_FACE_PASS`, `SPX3DTo2DPanel.jsx:1067`) and hair-pass values (`CEL_HAIR_PASS`, `SPX3DTo2DPanel.jsx:1084`) are similar magnitudes. Hair uses smaller radii (1–2) to preserve strand transitions.

**Implementation notes:**
- Separable two-pass (X then Y), not true 2D bilateral — ~3× faster but the blur footprint is effectively a cross/diamond rather than a disc.
- `spatial = exp(-i²/(2·sigmaS²))` with `sigmaS = radius`; `range = exp(-Δlum²/(2·sigmaR²))` over 0–255 luminance distance.
- `sigmaR=45` (anime/toon/comic) means luminance differences up to ~45/255 (~18%) are treated as "same region" and averaged together. `sigmaR=55` (manga) is even more permissive.
- Header comment (`SPX3DTo2DPanel.jsx:1024`) says `sigmaR` was deliberately bumped from 25–40 to flatten dense face features.

**Input canvas (cel branch, body):**
- `bilateralBlurSeparable(srcCanvas, ...)` is called on `srcCanvas` — i.e. the **raw MeshToon-rendered frame** that `captureAndProcess` produced (`SPX3DTo2DPanel.jsx:173`).
- It is *not* applied to an already-celled canvas — bilateral comes first, posterize is applied to the bilateral output (`SPX3DTo2DPanel.jsx:176`).

**Estimated brightness / contrast impact:**
- **Brightness:** roughly neutral. An edge-preserving Gaussian preserves local mean.
- **Contrast:** significant drop. Anything finer than the radius (skin pore detail, fabric weave, eyebrow inner edges, hair strand striations) gets averaged out. The high `sigmaR=45` widens the "same region" assumption so even moderate luminance contrast (e.g. between cheek and cheek-shadow) is smoothed. This is the **single biggest source of "smoothed/foggy" feel** before posterize hides the rest under cel bands.

---

## 2. Material Swap (3D materials → MeshToonMaterial)

**Function:** `makeCelMaterial(originalMat, steps)` — defined `SPX3DTo2DPanel.jsx:1142`.

**Swap site:** `SPX3DTo2DPanel.jsx:2036` — inside `applyCelShading`, replaces `obj.material` on every visible non-helper, non-infrastructure mesh in scene traversal.

**Properties copied from original:**
- `color` (`SPX3DTo2DPanel.jsx:1144`) — albedo color
- `map` (`:1145`) — diffuse/albedo texture
- `transparent` (`:1147`)
- `opacity` (`:1148`)
- `side` (`:1149`)

**Properties explicitly nulled / overridden (not copied):**
- `normalMap = null` (`:1153`)
- `aoMap = null` (`:1154`)
- `bumpMap = null` (`:1155`)
- `lightMap = null` (`:1156`)
- `emissiveMap = null` (`:1157`)
- `displacementMap = null` (`:1158`)
- `emissive = Color(0x000000)` (`:1159`)
- `roughnessMap = null`, `metalnessMap = null`, `clearcoat*Map = null` (`:1167–1172`) — MeshToon ignores these in its shader, but they are zeroed defensively.
- `gradientMap` set to a 1×N DataTexture (`makeCelGradientMap(steps)`, `SPX3DTo2DPanel.jsx:1103`) — this is what makes it "cel."

**`envMapIntensity`:**
- **NOT copied from original.** Hardcoded to `0.6` at `SPX3DTo2DPanel.jsx:1179`.
- Inline comment (`:1174–1178`) calls this out as a deliberate choice: `0.6` was picked to lift IBL fill enough that mid-tones read correctly without crushing shadow-side mid-tones into the bottom band. Tunable via the "Exposure" slider.
- Net effect: if the original material had `envMapIntensity >= 1.0` (typical for PBR), the cel-shaded result reads **~40% dimmer** in regions dominated by IBL contribution (rim lighting, smooth fabric, eye whites).

**Properties dropped on swap (silent loss):**
- `envMap` reference is not assigned to the new MeshToonMaterial (only `envMapIntensity` is set). If the scene environment provides IBL via a global env map, the new toon material won't receive it unless three.js's scene-level env is wired in elsewhere. **Verify:** if `scene.environment` is set, MeshToonMaterial will pick it up via that path — but per-material `envMap` overrides on the original would be lost.
- `emissiveIntensity` (defaults to 1, but `emissive` is zeroed anyway so moot)
- `flatShading` (originals with intentionally faceted shading get smoothed)
- Custom `onBeforeCompile` shader hooks, if any
- Vertex colors (`vertexColors` not copied) — could matter for stylized assets with baked color
- `alphaMap`, `alphaTest`, `alphaToCoverage`
- `color/map` — both copied, but `map.encoding`/`colorSpace`, `wrapS/wrapT`, `anisotropy` etc. are inherited because the texture reference itself is shared.

**Inverted-hull outline** (`SPX3DTo2DPanel.jsx:2038–2056`): a BackSide black `MeshBasicMaterial` clone scaled by `1 + outlineWidth · outlineMul · 0.04`. Renders before the main mesh (`renderOrder - 1`). This adds a black halo silhouette that takes up screen-space pixels — for thin features it can perceptibly dim the overall avatar by occluding bright background pixels along its perimeter. Mostly neutral, but at large outline widths it visibly thickens dark zones.

---

## 3. Ink Multiply (Sobel edge → composite)

**Composite sites (cel-family):**
- Body: `SPX3DTo2DPanel.jsx:194–197` — inside `applyStyleFilter` cel branch.
- Hair: `SPX3DTo2DPanel.jsx:1383–1386` — inside `captureHairPass`.
- Face: `SPX3DTo2DPanel.jsx:1515–1518` — inside `captureFacePass`.

All three use the same pattern:
```
bctx.globalCompositeOperation = 'multiply';
bctx.drawImage(lines, 0, 0);
bctx.globalCompositeOperation = 'source-over';
```

**Line canvas content** (`makeLinePass`, `SPX3DTo2DPanel.jsx:812`):
- Sobel gradient magnitude vs `threshold`. Where `edge > threshold`: pixel = `0` (pure black). Otherwise: pixel = `255` (pure white). Output is hard-binary 0/255, no soft edges. RGB all set to the same value.

**Multiply math:**
- White ink pixel (255) × cel pixel (c) = c · (255/255) = c → **no change**.
- Black ink pixel (0) × cel pixel = `0` → **pure black**.

So the multiply is a full-black ink stamp wherever Sobel fired, and a true no-op everywhere else. There is **no partial-strength ink** — edges go to 0, full stop. This is "harsh" not "dimming" in aggregate (most pixels are not edges), but it does mean every detected edge produces hard black with no softness — combined with the bilateral blur and 0.33× upscale, the binary black edge gets bilinear-smeared into a gray fringe on display, which contributes to the "muddy" feel.

**Source canvas the multiply runs against:**
- Body branch: `blurred` (`SPX3DTo2DPanel.jsx:173`) — the canvas that has been **bilateral-blurred AND luminance-posterized**, in that order (`:173, :176`). So it is the **blurred-then-celled** canvas. Multiply is applied last in the cel pipeline.
- Face / hair: same order — bilateral → posterize → multiply ink.

**Source canvas the Sobel itself runs against (where ink is FOUND):**
- Body: `params.precomputedLines` when present (`SPX3DTo2DPanel.jsx:171`), which is the **normal-edge pass** from `captureNormalEdges` (`:1249`) — Sobel of a MeshNormalMaterial render. Edges follow geometric creases, not cel bands. Threshold default is per-style (60–90), bumped explicitly in the comment at `:1027–1030` because earlier thresholds (22–36) inked mesh seams and skinning topology as "x-ray creepy bone lines."
- Fallback (no precomputedLines): legacy Sobel on the original cel `srcCanvas` (`SPX3DTo2DPanel.jsx:172`).
- Face / hair: Sobel runs on a per-pass MeshNormalMaterial render at sub-region scale (`SPX3DTo2DPanel.jsx:1374, :1504`).

---

## 4. Preview Capture Scale

**Current value:** `0.33` (set in commit `61faa8b`, "perf(2d-panel): drop preview capture scale to 0.33 for multi-avatar smoothness").

**Set at:** `SPX3DTo2DPanel.jsx:1842` — `captureRef.current(0.33, previewCameraRef.current)` inside the `mirror` rAF loop.

**Comment (`SPX3DTo2DPanel.jsx:1832–1839`):** scale=0.33 = ~9× fewer pixels than full; chosen so bilateral / posterize / Sobel / face composite / hair composite fit the per-frame budget with 2–3 animated avatars. Export path uses scale=1 (or user's `renderScale` multiplier) for full quality. **Tuned for performance, not maximum visual fidelity.**

**How it's applied** (`captureAndProcess`, `SPX3DTo2DPanel.jsx:2061`):
```
tmp.width  = src.width  * scale;   // src = renderer.domElement
tmp.height = src.height * scale;
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';
ctx.drawImage(src, 0, 0, tmp.width, tmp.height);
```
The 3D backbuffer is downsampled to ~33% linear (~11% area) using browser bilinear, then **all** of bilateral / posterize / Sobel / face / hair composite operate at this reduced resolution.

**Display size in panel:**
- Preview canvas: `<canvas ref={previewRef} className="s2d-viewport-canvas" />` at `SPX3DTo2DPanel.jsx:2505`.
- CSS (`src/styles/spx-2d-panel.css:57–64`): `.s2d-viewport-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }` — fills its `.s2d-canvas-wrap` parent.
- Layout: `.s2d-root` is `flex-direction: row`, with `.s2d-viewport` (live mirror), `.s2d-output` (styled preview), and a parameters sidebar each as flex children. The styled output column is `flex: 1 1 0`.
- Pixel-buffer assignment (`SPX3DTo2DPanel.jsx:1846–1848`): `c.width = c.offsetWidth || out.width; c.height = c.offsetHeight || out.height; c.getContext('2d').drawImage(out, 0, 0, c.width, c.height);`
- Canvas pixel buffer is set to CSS pixel size **without** device-pixel-ratio multiplier. Then the 0.33-scale `out` is bilinear-stretched to fill it.

**Upscale ratio (estimate):**
- Renderer.domElement is sized to the main 3D viewport (App.jsx-owned). Realistic example: in a 1920×1080 window with sidebar UI, main viewport ≈ 1280×800. At scale=0.33 → `out` ≈ 422×264.
- Styled-output column display ≈ 1/3 of window width × full panel height → ≈ 640×800 CSS px.
- Effective upscale on the preview canvas: **~1.5× horizontally, ~3× vertically**, with aspect-ratio mismatch (the styled canvas is the renderer's aspect, the display column is a different aspect). Anisotropic bilinear stretch is a known source of softness and is **compounded** with the bilateral blur.

This stage (0.33× downsample, then ~1.5–3× bilinear upscale on display) is by itself a meaningful contributor to the "foggy/softer than 3D mirror" perception — note that the 3D mirror (`liveRef`) draws the renderer.domElement directly with no downsample/upscale stage (`SPX3DTo2DPanel.jsx:1886–1890`), so it does **not** pay this cost.

---

## 5. Order of Operations in `applyStyleFilter` (Cel-Family Branch)

Cel branch matches `case 'toon': case 'cel': case 'pixar': case 'anime': case 'manga': case 'comic':` at `SPX3DTo2DPanel.jsx:147`.

Pre-pipeline preparation (in `captureAndProcess`, `SPX3DTo2DPanel.jsx:2061`):
1. `applyCelShading(style)` — has already swapped scene materials to MeshToonMaterial (3D pre-pass, runs on style change, *not* every frame). **Dims via envMapIntensity=0.6; flattens via nulled secondary maps.**
2. `renderer.render(scene, camera)` → cel-shaded 3D backbuffer.
3. Downsample backbuffer to `tmp` at scale=0.33. **Softens via bilinear downsample.**
4. `captureNormalEdges` → `precomputedLines` (normal-pass Sobel). **Hard binary ink lines.**
5. `captureSilhouetteMask` → `silhouetteMask` (white-on-black mask). Neutral.
6. Re-render scene normally to restore the backbuffer; redraw `src` into `tmp`. Neutral.

Inside `applyStyleFilter` (`SPX3DTo2DPanel.jsx:147–229`):
7. Resolve config (`CEL_SHADED_STYLES[style]`, `CEL_2D_PASS[style]`). Neutral.
8. Resolve edge threshold = slider override or per-style default. Neutral.
9. Resolve `lines` = `precomputedLines` (or fallback Sobel on `srcCanvas`). Neutral (already computed).
10. `blurred = bilateralBlurSeparable(srcCanvas, radius, sigmaR)` (`:173`) — **BLURS heavily; mild contrast loss; brightness neutral.**
11. `posterizeLuminance(blurred, levels)` (`:176`) — quantizes lum to N bands using `Math.ceil` (rounds UP, see `:998–1003`). **LIGHTENS overall mid-tones; sharpens band transitions; flattens detail within bands.**
12. Optional exposure multiplier (`:181–192`) — default 1.0, no-op unless user drags slider. **Lightens or dims** when active.
13. `globalCompositeOperation = 'multiply'; drawImage(lines, 0, 0)` (`:195–196`) — **DARKENS at edge pixels (full black); no-op elsewhere.**
14. Optional monochrome luminance pass (`:201–206`, manga only). **Desaturates** (perceived dimming of color but luminance preserved).
15. `silhouetteMask` wipe (`:214–226`) — pixels where mask < 32 get forced to RGB(20,20,20). **Darkens background**, avatar pixels untouched.
16. `id.data.set(bid.data); break;` — result lands in `dst`.

Post-`applyStyleFilter` (back in `captureAndProcess`):
17. Face composite (`:2137–2148`): `captureFacePass` runs cel→bilateral→posterize→ink ink on a 4×-upsampled face sub-render, then `compositeFaceOntoBody` downsamples with `imageSmoothingQuality='high'` and feathers alpha within `featherPx` of the rect edge (`:1564–1574`). **Adds more softness on face; feather alpha causes face/body seam to gradient-fade.**
18. Hair composite (`:2155–2167`): `captureHairPass` runs cel→bilateral→posterize→ink on full scene at hair-tuned params, then `compositeHairOntoBody` replaces body RGB at hair-mask>128. **Hard-replace, no feather** — generally clean.
19. `temporalBlendCanvas(result, 0.35, prevFrameRef)` (`:2169–2171`) — when `exportMode === 'final'`, blends `0.65 × previous frame + 0.35 × current frame` into the result canvas (`SPX3DTo2DPanel.jsx:858–882`). **MAJOR softening source during animation: each rendered frame is only 35% "new," so moving content carries a 65% ghost of the prior frame. Static frames re-converge after a few rAF ticks; moving avatars never do.**

Pre-display (in `mirror` rAF):
20. Bilinear upscale of the 0.33-scale `out` to preview-canvas display size via `drawImage` (`SPX3DTo2DPanel.jsx:1848`). **Softens via bilinear interpolation, often anisotropically.**

**Cumulative effect:** the user is seeing a frame that has been blurred (bilateral), quantized (posterize), pasted-over with hard black edges (multiply ink), composited with two more bilateral/posterize/ink sub-passes (face, hair), **temporally cross-faded at 35% with the previous frame** (ghost halo on motion), then bilinear-upscaled from 33% resolution to display size. Every step except posterize is softening.

---

## 6. Recommended Fix Order

Ranked by expected impact on "clean and bright" with risk noted. **No changes have been made; this is recommendation only.**

### A. Disable or sharply reduce `temporalBlend` default (Highest impact, lowest risk)

- **Location:** initial state at `SPX3DTo2DPanel.jsx:1602` (`useState(0.35)`); applied at `:2170`.
- **Why this is #1:** the user is watching animation (preview rAF auto-plays on panel open, `:2264–2278`). At blend=0.35, every visible moving pixel is 65% ghost of the prior frame. This is the single largest contributor to the "film over it" feel because it literally adds a translucent ghost overlay to motion.
- **Expected visual effect:** immediately sharper moving content, ghost halos around limbs disappear, perceived brightness rises (you're no longer averaging current bright pixels with a darker ghost trail).
- **Risk:** very low. Frame-to-frame flicker may become visible on flat color bands if the cel banding is unstable across frames. Mitigation: keep the slider, just change the default — e.g. default 0.0–0.15 for preview, the user can still raise it for export smoothing.
- **Concrete tweak ideas:** default `0.35 → 0.0`, or split into `previewTemporalBlend` (0) vs `exportTemporalBlend` (0.35).

### B. Raise `previewCaptureScale` from 0.33 to 0.5 — possibly only when scene has ≤ 1 animated avatar (High impact, moderate risk)

- **Location:** `SPX3DTo2DPanel.jsx:1842`.
- **Why:** at 0.33 the per-frame buffer is ~11% area of full; bilateral/posterize/Sobel work on that buffer and the result is bilinear-stretched to display, producing soft output. Raising to 0.5 is **2.25× more pixels** but ~half the upscale-blur penalty.
- **Expected visual effect:** noticeably sharper preview, ink lines look thinner and crisper, posterize bands look like flat color blocks instead of slightly-blurred regions.
- **Risk:** moderate. Per-frame work scales with pixel area. The 0.33 was chosen explicitly to keep multi-avatar scenes smooth (per commit `61faa8b`). On a 3-avatar scene this could halve framerate. Mitigation: adaptive scale — start at 0.5, drop to 0.33 if `requestAnimationFrame` interval exceeds ~50ms for several frames, or pick scale based on `sceneObjectsRef.current.length`.

### C. Loosen bilateral or apply it only to face/hair, not whole body (Moderate impact, moderate risk)

- **Location:** `CEL_2D_PASS` at `SPX3DTo2DPanel.jsx:1031`; the actual call at `:173`.
- **Why:** at `sigmaR=45` and `radius=3` the bilateral is aggressive — it smooths out cheek shading, hair-shaft contrast, fabric folds. The whole point per the header comment (`:1024`) is to flatten gradient before posterize, but the values were tuned when face/hair didn't have their own dedicated sub-passes. Now that face/hair are independently captured + cel-styled (`captureFacePass`/`captureHairPass`), the body bilateral can be lighter.
- **Expected visual effect:** more readable surface detail (clothing wrinkles, hand articulation, prop edges). Mid-tones come back. Posterize boundaries snap on actual silhouette contrast instead of bilateral-flattened regions.
- **Risk:** moderate. With weaker bilateral, posterize will quantize noisier input → cel bands may speckle along their boundaries instead of being clean blocks. Mitigation: lower `bilateralRadius` from 3 → 2 first (cheaper change), see if speckle is acceptable; only drop `sigmaR` if needed.

### D. Reconsider `envMapIntensity = 0.6` hardcode in `makeCelMaterial` (Moderate impact, higher risk)

- **Location:** `SPX3DTo2DPanel.jsx:1179`.
- **Why:** this hardcode is responsible for ~40% of the perceived dimming of mid-tones on smooth, IBL-lit surfaces (skin, eye whites, lacquered props). The inline comment justifies it as preventing crushed shadow-side mid-tones, but the fix was applied before the new posterize `Math.ceil` round-up bias (`:991`) was in place, and before the bottom gradient stop was lifted to 0.45 (`:1108`). Both changes already address the original "crushed shadow" problem the 0.6 was set to fix.
- **Expected visual effect:** brighter overall avatar, especially highlights on hair / skin, brighter eye whites, more "pop."
- **Risk:** higher. The inline comments at `:1024` (sigmaR bump) and `:1108` (gradient-stop lift) are explicit about specific bugs this dimming once worked around. Raising envMapIntensity may re-introduce baked-specular hotspots on iClone PBR exports (the original problem). Mitigation: raise to 0.8 first, test on iClone/RPM avatars, fall back to 0.6 if hotspots return; OR expose as a slider and leave the default conservative.

### Summary of expected ROI

| Fix | Effort | Impact on "clean+bright" | Risk |
|-----|--------|--------------------------|------|
| A — kill temporal blend default | 1-line | **Largest** (animation only — but that's what the user is watching) | Low |
| B — capture scale 0.33 → 0.5 | 1-line + perf testing | High | Moderate (perf) |
| C — loosen bilateral on body | per-style table tweak | Moderate | Moderate (speckle) |
| D — raise envMapIntensity | 1-line | Moderate | Higher (PBR re-bleed) |

**Recommended order to try:** A, then B, then C. Defer D unless A+B+C are insufficient. The user's "film over it" description strongly matches the temporal-blend symptom — A alone may resolve the perception entirely.
