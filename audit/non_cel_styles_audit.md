# Non-Cel Styles — Behavior & Bug Audit

**Scope:** the 14 non-cel-family styles surfaced in the SPX 2D panel.
Read-only audit; no code changed.

**Primary file:** `src/components/pipeline/SPX3DTo2DPanel.jsx`

**Related audits:** `audit/cel_pipeline_clarity_audit.md`,
`audit/cel_pipeline_rewrite_proposal.md`, `audit/all_styles_audit.md`.

**Styles in scope** (per user's grouping; categorization mismatches with
the actual `STYLES` table at `:44-101` are flagged inline):

| Group (user) | Style | `STYLES.cat` (code) |
|---|---|---|
| Photo | cinematic, film_noir, vintage_film | photo ✓ |
| Paint | oil, watercolor, gouache, impressionist | paint ✓ |
| Sketch | ink_wash, pencil, charcoal | **ink_wash → cartoon** in code; pencil/charcoal → sketch ✓ |
| Stylized | blueprint, linocut, risograph | sketch (all three) — **not stylized in code** |
| Digital | low_poly | **stylized** in code, not digital |

---

## PART 1 — CURRENT BEHAVIOR PER STYLE

Every style is dispatched from the `applyStyleFilter` switch at
`:112-702`. Post-switch trailing operations at `:704-709` apply only to
"fall-through" styles (those ending with `break;`); "early-return" styles
bypass them. Both groups noted below.

### Photo group

#### 1. `cinematic` — `:666-700` (fall-through)
- **Operations** (per pixel, full image):
  1. S-curve contrast on each channel (`sCurve(v) = v<0.5 ? 2v² : 1-2(1-v)²`).
  2. Luminance-weighted color grading: shadows get RGB(0.20, 0.55, 0.65) bias (teal), highlights get RGB(1.00, 0.62, 0.30) bias (orange) — classic film "teal-orange" grade.
  3. Vignette: `vig = 1 - (distFromCenter/maxDist)^2.4 * 0.55`.
  4. Random grain ±0.06.
- **Param source:** all hardcoded magic numbers (`:680-691`). No slider input.
- **Helpers called:** none. After break, `applyPackFinish(dst, 'cinematic')` runs but does nothing (cinematic is in neither mythic nor noir pack list at `:791-792`).

#### 2. `film_noir` — `:139-146` (fall-through)
- **Operations:** monochrome luminance + linear contrast (`(g-128)*1.4 + 128`).
- **Param source:** hardcoded factor 1.4.
- **Helpers:** none. `applyPackFinish` no-op.

#### 3. `vintage_film` — `:284-291` (fall-through)
- **Operations:** per-channel: `R = R*1.1 + 20`, `G = G*0.9 + 10`, `B = B*0.7`. Warm-shift with crushed blues.
- **Param source:** hardcoded.
- **Helpers:** none.

### Paint group

#### 4. `oil` — `:611-664` (early return)
- **Operations:**
  1. 3×3 box blur (full image, single pass) (`:614-630`).
  2. Per-channel posterize at `levels=8` (`:631-638`).
  3. Saturation boost ×1.18 around luminance (`:639-642`).
  4. Ink darkening at edges from `makeLinePass(srcCanvas, 28, 0.7)` — pixels where line<80 get RGB×0.65 (`:648-660`). **Not full black ink** — partial dimming.
  5. `applyPaperTextureOverlay(dst, 0.10)` (`:662`).
- **Param source:** all hardcoded. Slider values not consumed.
- **Helpers:** `makeLinePass` (`:812`), `applyPaperTextureOverlay` (`:713`).

#### 5. `watercolor` — `:571-609` (early return)
- **Operations:**
  1. 3×3 box blur (`:574-590`).
  2. Desaturation ×0.65 (toward luminance) (`:594-598`).
  3. Lift toward white by 18% (`:599-601`) — washed-out feel.
  4. `applyPaperTextureOverlay(dst, 0.18)` — heavier paper grain than oil.
- **Param source:** hardcoded.
- **Helpers:** `applyPaperTextureOverlay`.

#### 6. `gouache` — `:544-569` (early return)
- **Operations:**
  1. Per-channel posterize at `levels=5` (`:546-549`).
  2. Saturation boost ×1.30 (`:550-553`).
  3. CSS `filter: 'blur(1.2px)'` via off-screen canvas (`:559-566`) — different blur kernel from oil/watercolor (CSS shader, not 3×3 box).
  4. `applyPaperTextureOverlay(dst, 0.06)` — light paper.
- **Param source:** hardcoded.
- **Helpers:** `applyPaperTextureOverlay`.

#### 7. `impressionist` — `:504-536` (fall-through)
- **Operations:**
  1. Random offset sampling: each output pixel reads from a random neighbor within ±6 px (`:507-521`).
  2. Saturation boost ×1.20.
  3. RGB additive noise ±18.
- **Param source:** hardcoded (±6 jitter, ±18 noise, 1.20 saturation).
- **Helpers:** none after break (`applyPackFinish` no-op).

### Sketch group (user's grouping)

#### 8. `pencil` — `:113` (early return)
- **Operations:** `return makeLinePass(srcCanvas, params.edgeThreshold ?? 24, params.edgeBias ?? 1.0)`. Single Sobel edge pass on the full rendered frame. Output is binary 0/255 black-on-white.
- **Param source:** reads `params.edgeThreshold` and `params.edgeBias` — **but `captureAndProcess` only passes `edgeThresholdSlider`, never `edgeThreshold`** (`:2113-2117`). So the fallback `?? 24` is always used. The Edge Threshold slider in the UI does **not** affect pencil.
- **Helpers:** `makeLinePass` (`:812`).

#### 9. `charcoal` — `:127-138` (early return)
- **Operations:**
  1. `makeLinePass(srcCanvas, params.edgeThreshold ?? 24, params.edgeBias ?? 1.0)` — same Sobel.
  2. For every pixel: `g = (0.299*r + 0.587*g + 0.114*b) * 0.6` (`:133`). Since line output is `R=G=B` (binary 0/255), luminance equals the channel value, so this is effectively `pixel *= 0.6`. Edges stay 0, non-edges become 153.
- **Param source:** same as pencil — slider has no effect.
- **Helpers:** `makeLinePass`.
- **Effect:** identical edge pattern to pencil, just with a mid-gray background instead of pure white.

#### 10. `ink_wash` — `:115-126` (early return), categorized `cat:"cartoon"` at `:60`
- **Operations:**
  1. `const line = makeLinePass(srcCanvas, params.edgeThreshold ?? 24, params.edgeBias ?? 1.0)` — identical call to pencil.
  2. Greyscale loop (`:120-123`): `g = 0.299*r + 0.587*g + 0.114*b; ld[i]=ld[i+1]=ld[i+2]=g`. **No-op** because `r=g=b` already on the line canvas (binary 0/255 grayscale).
- **Param source:** same as pencil.
- **Helpers:** `makeLinePass`.
- **Effect:** **identical to pencil.** The greyscale conversion does nothing because the input is already grayscale.

### Stylized group (user's grouping)

#### 11. `blueprint` — `:309-324` (early return), categorized `cat:"sketch"` at `:70`
- **Operations:**
  1. `makeLinePass(srcCanvas, params.edgeThreshold ?? 24, params.edgeBias ?? 1.0)`.
  2. Per-pixel recolor: edges (line<128) → RGB(200,235,255) pale cyan; fill → RGB(18,68,180) saturated technical-blue.
- **Param source:** same `?? 24` fallback as pencil — slider has no effect.
- **Helpers:** `makeLinePass`.

#### 12. `linocut` — `:484-502` (fall-through), categorized `cat:"sketch"` at `:73`
- **Operations:**
  1. `makeLinePass(srcCanvas, params.edgeThreshold ?? 32, 1.2)` — note `?? 32` (default differs from pencil's 24) and **hardcoded bias=1.2** ignoring `params.edgeBias`.
  2. Per-pixel: compute lum, add ±12 jitter, threshold at 130 → fill = 245 or 18. Edge pixels (line<128) override fill to 18 (black).
- **Param source:** edge threshold partially honored (`?? 32`), edge bias ignored.
- **Helpers:** `makeLinePass`. Trailing `applyPackFinish` no-op.

#### 13. `risograph` — `:440-482` (early return), categorized `cat:"sketch"` at `:74`
- **Operations:**
  1. Build two color plates from luminance:
     - Blue plate (RGB 30,50,220): alpha = 1.0 where lum<0.45, 0.5 where lum<0.7, 0 otherwise.
     - Pink plate (RGB 245,60,160): alpha scales smoothly from 0 at lum=0.55 to 1 at lum=0.95.
  2. Fill with paper RGB(250,245,235).
  3. Composite blue plate (no offset).
  4. Composite pink plate with `offsetX=2` → 2-pixel misregistration.
  5. `applyPaperTextureOverlay(dst, 0.10)`.
- **Param source:** all hardcoded — plate colors, thresholds, offset, paper amount.
- **Helpers:** `applyPaperTextureOverlay`.

### Digital group (user's grouping)

#### 14. `low_poly` — `:114` (early return), categorized `cat:"stylized"` at `:75`
- **Operations:** `return makeFlatColorPass(srcCanvas, params.toonLevels ?? 4)` — per-channel quantize to `levels` discrete values.
- **Param source:** `params.toonLevels` → reads the "Toon Levels" UI slider value.
- **Helpers:** `makeFlatColorPass` (`:884`). Also has a parallel 3D path: when activeStyle is `low_poly`, the panel calls `applyFlatShading()` (`:1978`) which clones every material and flips `flatShading=true` (`:1989`). Faceted shading without geometry decimation — not actually low-poly geometry.
- **Note:** despite the name, this is **color quantization + flat-shaded materials**, not polygon reduction.

### Post-switch trailing operations (fall-through styles only)

At `:704-709`:
```
ctx.putImageData(id, 0, 0);
if (style === 'manga' || style === 'comic') applyHalftoneOverlay(dst, 0.15, 6);
applyPackFinish(dst, style);
return dst;
```

`applyPackFinish` (`:790-805`) only fires for the "mythic" or "noir" pack
styles. **None of the 14 non-cel visible styles are in those packs.** So
for non-cel fall-through styles (cinematic, film_noir, vintage_film,
impressionist, linocut), `applyPackFinish` is a no-op walk.

### Helper functions used by non-cel styles

| Helper | Defined at | Used by (non-cel) |
|---|---|---|
| `makeLinePass` | `:812-855` | pencil, ink_wash, charcoal, blueprint, linocut, oil |
| `makeFlatColorPass` | `:884-901` | low_poly |
| `applyPaperTextureOverlay` | `:713-727` | oil, watercolor, gouache, risograph |
| `applyHalftoneOverlay` | `:729-748` | (only manga/comic — cel-family — and pack styles) |
| `applyRimGlowFinish` | `:750-769` | (only pack styles, none of the 14) |
| `applyBrushTaperEffect` | `:771-788` | (only pack styles via `applyPackFinish`) |

`applyRimGlowFinish` and `applyBrushTaperEffect` are **dead code** with
respect to the 14 visible non-cel styles. They live only for the
mythic_ink / noir packs, which are listed in `STYLES` (`:89-99`) but the
audit examined are not in user's 14-style list (and may also not be in
`VISIBLE_STYLES` — see `:17-42`, which omits all 10 pack styles).

---

## PART 2 — INTENDED vs ACTUAL

### Photo group

#### cinematic
- **Conventional intent:** color-graded film frame — teal-orange grade, S-curve contrast, vignette, fine grain. Modern Hollywood look.
- **Match:** **close to faithful.** S-curve, teal-orange grade, vignette, and grain are all present and tuned reasonably.
- **Divergence:** none significant. Grain at 0.06 is subtle. Vignette is a bit strong (×0.55 falloff).

#### film_noir
- **Conventional intent:** high-contrast B&W, deep shadows, blown highlights. 1940s detective.
- **Match:** **partially faithful.** Monochrome + linear contrast 1.4 is correct in spirit but it's a single S-less linear ramp — real film noir uses non-linear toe/shoulder curves to crush blacks while preserving highlight detail. Result here may look more "flat grayscale with contrast" than "film noir."
- **Divergence:** no spatial work (no shadow softening, no grain), no color tint (real noir film stock has slight warmth in highlights).

#### vintage_film
- **Conventional intent:** old film stock — faded reds, cyan-shifted, warm shadows, some grain/scratches.
- **Match:** **partial.** The fixed RGB offsets are in the right zone, but there's no grain, no vignette, no scratches. Reads more as "color tinted" than "vintage film."
- **Divergence:** missing grain, missing vignette, missing softness.

### Paint group

#### oil
- **Conventional intent:** thick brushstrokes, visible texture, simplified palette, dark outline at form edges, varnished sheen.
- **Match:** **moderate.** Blur + posterize + saturation + edge-darkening + paper covers the major bases. Edge-darkening is partial-strength (×0.65) which avoids the harsh "cel ink" look — appropriate for oil.
- **Divergence:** no brushstroke direction simulation (would need anisotropic kernel or stroke-based painting algorithm). 3×3 blur kernel is small; real oil simplifies more. Posterize at 8 levels barely visible.

#### watercolor
- **Conventional intent:** soft edges, paper bleed, granulation, lifted/lighter tones, occasional darker pooling at edges.
- **Match:** **weak.** Blur + desaturate + lift-toward-white is the right direction but watercolor's signature *edge pooling* (where pigment dries darker at stroke edges) is absent. The lift-toward-white at 18% is uniform — real watercolor lifts midtones but preserves shadow density.
- **Divergence:** no edge pooling, no granulation noise, no color bleed/wet-on-wet simulation.

#### gouache
- **Conventional intent:** opaque flat color, more saturated than watercolor, matte finish, visible brushstrokes but less blended.
- **Match:** **moderate.** Posterize + saturation + soft blur + paper grain captures the flat-opaque feel. CSS blur(1.2px) is a different kernel from oil/watercolor's 3×3 box (Gaussian-ish vs box average).
- **Divergence:** no brushstroke texture. The light paper grain reads more as TV-style "vintage cartoon" than as physical gouache.

#### impressionist
- **Conventional intent:** visible discrete brushstrokes (dabs), broken color, vibrant atmospheric light. Monet/Renoir.
- **Match:** **weak.** ±6 px random sampling produces *noise-like scattering* not *brushstroke dabs*. Real impressionist NPR uses oriented brush strokes (along gradient direction) with stroke-shaped kernels.
- **Divergence:** stroke direction missing; per-pixel offsetting is closer to "shuffled pixels" than "painted dabs." Saturation +20% and RGB noise ±18 contribute texture but not stroke geometry.

### Sketch group

#### pencil
- **Conventional intent:** graphite line drawing — variable line weight, hatching for shadow, lift/erasure highlights, paper texture.
- **Match:** **weak.** Single Sobel pass at binary threshold = hard 1-bit line. No variable weight, no hatching for tonal value, no paper texture, no lift/erasure. Reads as "edge detection on a 3D render" not "pencil drawing."
- **Divergence:** missing hatching, missing paper, missing line variation. The output is what you'd get from a Sobel filter applied to a photograph — not a pencil sketch.

#### charcoal
- **Conventional intent:** soft smudgy black marks, blendable mid-tones, paper grain, eraser highlights, gestural quality.
- **Match:** **broken.** Current implementation is **pencil × 0.6 brightness**. No softening, no smudging, no tonal blending, no charcoal stick texture. Just edges on a 60% gray background.
- **Divergence:** missing every defining trait of charcoal (smudging, soft tonal variation, gestural marks).

#### ink_wash
- **Conventional intent:** brush ink + diluted wash for tonal value. East-Asian painting tradition — Sumi-e. Variable line weight (brush-driven), large flat tonal areas from wash, deep blacks against off-white paper.
- **Match:** **broken — identical to pencil.** The greyscale conversion loop (`:120-123`) is a no-op on already-grayscale data. Has no wash (gradient tonal areas), no brush dynamics, no paper. Output is bit-for-bit identical to pencil.
- **Divergence:** missing wash, missing brush weight variation, missing paper. **Currently indistinguishable from pencil — matches user's report.**

### Stylized group (user's grouping)

#### blueprint
- **Conventional intent:** technical drawing reproduction — pale white/cyan lines on saturated blue background. Imitates blueprint reprographic prints.
- **Match:** **close to faithful.** Edges → pale cyan, fill → saturated blue. Color values are reasonable.
- **Divergence:** no line-weight variation, no white-fade scratching, no scale-rule markings — those would be hard NPR features.

#### linocut
- **Conventional intent:** carved relief print — bold flat black/cream shapes, thick rough-edged ink, single-color, irregularity from hand carving.
- **Match:** **moderate.** Edges + binary luminance threshold + jitter is the right structure. Hardcoded edge bias=1.2 and threshold=130 are fixed regardless of slider.
- **Divergence:** no chunky stroke widening (real linocut has thick gouge marks, not fine Sobel edges). Output is more "stencil" than "linocut."

#### risograph
- **Conventional intent:** Japanese mimeograph print — limited palette (often 2-3 spot colors), grainy texture, slight ink-plate misregistration, paper-stock background.
- **Match:** **faithful.** Blue + pink plates with 2-px offset misregistration, paper RGB(250,245,235) background, paper texture overlay. Hits the visual signature well.
- **Divergence:** only two plates (real riso has 1-5 plates per print). Plate colors fixed — no user choice.

### Digital group

#### low_poly
- **Conventional intent:** geometric flat-shaded polygons, visible facets, simplified silhouette, retro PS1/N64 look.
- **Match:** **weak.** The 3D path enables `flatShading=true` on existing materials → faceted shading per polygon. But the mesh polycount is unchanged, so a 50k-triangle character produces 50k tiny flat facets — looks like "noisy gradient," not "low-poly." The 2D path applies `makeFlatColorPass` which is just per-channel color quantization, unrelated to polygons.
- **Divergence:** name suggests *geometric* low-poly (decimation), implementation is *flat shading + color quantize*. Visual result depends entirely on source mesh density.

---

## PART 3 — KNOWN OR SUSPECTED BUGS

### B1. `ink_wash` is bit-for-bit identical to `pencil` *(user-reported)*
- **Where:** `ink_wash` greyscale loop at `:120-123`.
- **Cause:** The loop computes `g = 0.299r + 0.587g + 0.114b` and assigns `R=G=B=g`. Since `makeLinePass` already emits `R=G=B` (binary 0/255 monochrome), the luminance equals the channel value and the assignment is a no-op.
- **Severity:** **high.** User-facing duplicate. The CATEGORY UI even routes ink_wash and pencil into different filter buttons but the visual output is identical.
- **Fix complexity:** medium. To make ink_wash actually different, it needs a tonal wash (gradient gray fill modulated by source luminance) layered behind the lines, not just luminance-conversion of already-monochrome lines.

### B2. `charcoal` is `pencil × 0.6 brightness`
- **Where:** `:127-138`.
- **Cause:** Same as B1 — the `* 0.6` is applied to already-monochrome line output. No spatial dilation, no smudge, no tonal blending. The only difference from pencil is the gray fill instead of white fill.
- **Severity:** **medium-high.** Doesn't *look* identical to pencil (gray bg ≠ white bg) but reads as "pencil on gray paper" not "charcoal."
- **Fix complexity:** medium. Real charcoal needs spatial blur of the line layer + paper texture + tonal modulation from luminance.

### B3. "Edge Threshold" slider does not affect pencil / ink_wash / charcoal / blueprint
- **Where:**
  - `captureAndProcess` params at `:2113-2117` passes `edgeThresholdSlider`, **not** `edgeThreshold`.
  - The non-cel sketch cases read `params.edgeThreshold ?? 24` (`:113`, `:116`, `:128`, `:313`). `params.edgeThreshold` is always `undefined` from this call path, so the fallback always wins.
  - The state variable `edgeThreshold` (`:1585`, `useState(24)`) is initialized but I see no `setEdgeThreshold` call from any UI control in the panel.
- **Severity:** **medium.** A slider that doesn't do anything is a confusing user experience, but at least the styles still render with a reasonable default.
- **Fix complexity:** trivial. Either pass `edgeThreshold` from the slider state alongside `edgeThresholdSlider`, or unify the two slider names.

### B4. `linocut` ignores `params.edgeBias`
- **Where:** `:489` — `makeLinePass(srcCanvas, params.edgeThreshold ?? 32, 1.2)`. The third arg is hardcoded `1.2`.
- **Severity:** low. The hardcoded value isn't unreasonable.
- **Fix complexity:** trivial (one-line).

### B5. `applyRimGlowFinish` and `applyBrushTaperEffect` are dead code w.r.t. visible styles
- **Where:** defined at `:750` and `:771`. Called only from `applyPackFinish` (`:790-805`) for mythic/noir packs.
- **`VISIBLE_STYLES`** (`:17-42`) **does not include any pack styles.** So these helpers never run in the production-visible style set.
- **Severity:** low (dead code, but harmless).
- **Fix complexity:** trivial to delete, or to wire pack styles into VISIBLE_STYLES if intended.

### B6. GridHelper (scene floor grid) contaminates all Sobel-based styles
- **Where:** `makeLinePass(srcCanvas, …)` runs on `renderer.domElement` which contains everything visible — including the `GridHelper` and `AxesHelper`.
- The cel pipeline's `captureNormalEdges` filters helpers via `_swapAllMeshes` (`:1208-1219`) which skips `userData.isHelper === true`. But `GridHelper` is identified by `type === 'GridHelper'` (see `reframePreviewCamera` filter at `:1926`), not by `userData.isHelper`. The cel filter may or may not skip it depending on how the helper was constructed.
- The non-cel `makeLinePass` path doesn't filter anything — it just Sobels the rendered framebuffer. So pencil / ink_wash / charcoal / blueprint / linocut / oil all ink the grid lines.
- **Severity:** **high** for the affected styles. User-reported as "heavy black silhouette on cross-hatched grid floor." The grid is a cross-hatched pattern, so Sobel correctly inks every grid line, producing a busy hatched floor in the output.
- **Fix complexity:** medium. Either:
  - Render Sobel against a scene-without-helpers backbuffer (mirror the cel pipeline's `_swapAllMeshes` for non-cel paths), or
  - Render a silhouette mask (also from the cel pipeline) and zero-out the line canvas where mask is empty.

### B7. Most paint/sketch styles ignore the `Toon Levels` slider
- **Where:** `oil` levels=8 (`:631`), `gouache` levels=5 (`:546`), `low_poly` does honor `params.toonLevels` (`:114`). `watercolor` has no posterize step. `pencil`/`ink_wash`/`charcoal` are binary, no quantization.
- **Severity:** low. The slider is named "Toon Levels" so users may expect it to only affect toon/cel.
- **Fix complexity:** trivial if desired (pull from `params.toonLevels`).

### B8. Style categorization inconsistencies between `STYLES.cat` and user expectation
- `ink_wash` is `cat:"cartoon"` at `:60` — user expected `sketch`.
- `blueprint`, `linocut`, `risograph` are `cat:"sketch"` at `:70-74` — user expected `stylized`.
- `low_poly` is `cat:"stylized"` at `:75` — user expected `digital`.
- The category dropdown in the UI (`:2532-2536`) filters by `STYLES.cat`, so users browsing "Sketch" won't find ink_wash.
- **Severity:** medium. Affects discoverability.
- **Fix complexity:** trivial (update the `cat` field).

### B9. `applyPackFinish` runs unconditionally on every fall-through style but does nothing for the 14 visible ones
- **Where:** `:708`. Walks two arrays and matches `style` against them; for the 14 non-cel styles, both checks fail and the function returns immediately. ~5 ns wasted per render — irrelevant. Just dead branching.
- **Severity:** none (cosmetic). Logged for completeness.

### B10. Hardcoded magic numbers throughout the paint pipeline
- Examples: oil blur=3×3, levels=8, saturation=1.18, edge_threshold=28, paper=0.10; watercolor blur=3×3, desat=0.65, lift=0.18, paper=0.18; gouache levels=5, sat=1.30, blur=1.2px, paper=0.06.
- **Severity:** low. Limits user customization but defaults are reasonable.
- **Fix complexity:** medium. Would need new sliders or per-style config tables (parallel to CEL_2D_PASS).

### B11. No paper texture for pencil/charcoal/ink_wash despite the genre demanding it
- **Where:** pencil, charcoal, ink_wash all skip `applyPaperTextureOverlay`. Real pencil/charcoal sketches rely heavily on paper grain showing through.
- **Severity:** medium. Sketch styles read as "edge detection" without paper grain.
- **Fix complexity:** low (one-line addition per style, but the styles early-return so the call must be made before the return).

---

## PART 4 — IMPACT RANKING

Score columns: 1 = best, 5 = worst (for broken & frequency); 1 = easiest, 5 = hardest (for effort).
Impact = (broken × frequency) / effort. Higher score = fix first.

| Style | Broken | Frequency | Effort | Impact | Notes |
|---|---:|---:|---:|---:|---|
| `ink_wash`     | 5 | 4 | 2 | 10.0 | Identical to pencil — user-reported, easy fix |
| `pencil`       | 4 | 5 | 3 |  6.7 | Edge-only, no paper/hatching — high use frequency |
| `charcoal`     | 4 | 3 | 3 |  4.0 | Pencil × 0.6, no smudging |
| `oil`          | 3 | 4 | 3 |  4.0 | Recognizable but lacks brushstrokes |
| `watercolor`   | 3 | 4 | 3 |  4.0 | Lacks edge pooling, no granulation |
| `impressionist`| 4 | 2 | 4 |  2.0 | Random shuffle ≠ brush dabs |
| `blueprint`    | 2 | 3 | 2 |  3.0 | Mostly works, slider broken |
| `linocut`      | 3 | 2 | 2 |  3.0 | Reads as stencil not lino |
| `gouache`      | 2 | 3 | 3 |  2.0 | Decent flat look |
| `risograph`    | 1 | 3 | 2 |  1.5 | Faithful, minor tweaks possible |
| `low_poly`     | 4 | 2 | 5 |  1.6 | True fix needs geometry decimation |
| `cinematic`    | 1 | 4 | 2 |  2.0 | Looks good already |
| `film_noir`    | 2 | 3 | 2 |  3.0 | Linear contrast is rough |
| `vintage_film` | 3 | 2 | 2 |  3.0 | Missing grain/scratches |

**Ranked top-down:** `ink_wash` (10.0), `pencil` (6.7), `charcoal` (4.0), `oil` (4.0), `watercolor` (4.0), `blueprint` / `linocut` / `film_noir` / `vintage_film` / `cinematic` (~2-3), then the long tail.

**Cross-cutting Bug B6 (GridHelper)** affects every Sobel-based style (pencil / ink_wash / charcoal / blueprint / linocut / oil) at the *same* severity. Fixing it once raises the apparent quality of 6 styles simultaneously — high leverage.

---

## PART 5 — RECOMMENDED FIX ORDER

### Tier 1: Quick wins (under 1 hour each)

1. **Fix B6 — exclude scene helpers from `makeLinePass` source.** Mirror the cel pipeline's `_swapAllMeshes` pattern (or render a silhouette mask and AND it with the line canvas). One change benefits **6 styles**. Highest leverage. *Effort: M (need to add a helper-skipping render before the Sobel).*

2. **Differentiate `ink_wash` from `pencil`.** Add a luminance-driven gray wash layer behind the line canvas: `wash[i] = 255 * (1 - sourceLum/255)^0.6` to give it tonal mid-grays. The line layer composites on top. *Effort: S, ~15 lines.*

3. **Wire the Edge Threshold slider into non-cel styles** (Bug B3). Pass `edgeThreshold` alongside `edgeThresholdSlider` in `captureAndProcess`'s params object. *Effort: S, 1-line.*

4. **Fix category mismatches (Bug B8):** move `ink_wash` to `cat:"sketch"`, `low_poly` to `cat:"digital"`, blueprint/linocut/risograph to `cat:"stylized"`. *Effort: S, 4-line edit.*

5. **Add paper texture to pencil / charcoal / ink_wash** (Bug B11). One `applyPaperTextureOverlay` call before each early return. *Effort: S, 3 lines.*

### Tier 2: Medium fixes (1-3 hours each)

6. **Real charcoal:** softer line via radial blur of the makeLinePass output + paper texture + tonal modulation from source luminance (so charcoal has light/dark "smudge" zones, not just edges). *Effort: M, ~30 lines.*

7. **Real pencil hatching:** generate two sets of diagonal hatching lines (NE/SE) with density proportional to (255 - sourceLum). Composite under the ink edges. Adds the missing "shadow hatching" character. *Effort: M, ~40 lines.*

8. **Watercolor edge pooling:** detect color region boundaries, darken pixels adjacent to a boundary by ~20%. Approximates the wet-pigment pooling effect. *Effort: M, ~30 lines.*

9. **vintage_film grain + light vignette:** add ±0.04 grain and 0.3-strength vignette to match the missing aging artifacts. *Effort: S, ~20 lines.*

### Tier 3: Heavy work (would benefit from GPU port)

10. **Impressionist brushstroke dabs:** real impressionist NPR uses gradient-aligned stroke kernels (Hertzmann's painterly rendering). Hard in canvas pixel loops; ideal candidate for a fragment shader. *Effort: L, possibly multi-day.*

11. **True low_poly geometry path:** would need vertex clustering / quadric edge collapse on the source meshes — non-trivial, and the panel doesn't own mesh data. The current `flatShading` fake is the cheap proxy. *Effort: L. Probably leave as-is.*

12. **Oil brushstroke direction:** anisotropic kernel aligned to local gradient. GPU shader preferred. *Effort: L.*

### Tier 4: GPU port path (parallel to cel rewrite)

The same GPU-shader architecture used for cel-family styles (Stages 1-3,
commits 3c2d381 / bc4855d / 04d2a71) would benefit the paint and sketch
styles too — particularly the painterly ones (oil, watercolor, impressionist)
where directional brush kernels are easy in fragment shaders and slow in
pixel loops. **Not recommended until cel rewrite stabilizes** through
Stage 4 (region-ID) and Stage 5 (CPU deprecation).

---

## PART 6 — TEST AVATAR DEPENDENCY

I examined whether any of the 14 styles have avatar-specific behavior.

### Avatar-agnostic operations (everything in this audit)

Every non-cel style operates on the **2D rendered frame** — i.e. it
processes `renderer.domElement` pixels regardless of which avatar produced
them. None of the 14 styles inspect mesh names, bone structures, or
material maps. They are pure 2D image filters applied after the renderer
produces the cel-or-PBR-rendered pixel buffer.

This means:
- **No style is broken specifically on Mixamo, RPM, iClone, or custom rigs** by virtue of being non-cel.
- The pre-fix Mixamo `normalMap=null` issue (addressed in commit 47e14a8)
  affected **cel-family only** because `makeCelMaterial` was the path
  that stripped the normal map. Non-cel styles render through the
  original PBR materials and have always preserved normal maps.

### Pose-dependent visual effects (not avatar-specific bugs)

- **Sobel-based styles** (pencil, ink_wash, charcoal, blueprint, linocut, oil) ink any silhouette edge. A swing-pose avatar with arms raised has more silhouette per pixel-area, so ink density appears higher than for a T-pose. This is the operation working correctly; not a bug.
- **Vignette in cinematic** darkens equally regardless of subject pose.
- **Random jitter in impressionist** is uncorrelated with pose.

### The "swing avatar arms-up" report

If swing's specific pose looks worse than other avatars in pencil / ink_wash:
- It's likely **B6 (GridHelper contamination)** + the avatar's extended pose silhouette. The grid lines plus the long arm silhouettes together produce a much busier ink mesh than a compact T-pose avatar would.
- Fixing B6 (helper exclusion from Sobel) would let the avatar's actual silhouette dominate.

### Style-specific cross-rig checks worth running post-fix

| Style | Test pose / rig | Why |
|---|---|---|
| oil/watercolor/gouache | Mixamo (heavy normalMap) vs RPM | Paint styles read from PBR-shaded frame; normalMap detail informs blur and posterize differently. May reveal "muddier" output on Mixamo than RPM. |
| pencil/charcoal/ink_wash | Any avatar with hair cards | Hair cards have alpha-tested edges that Sobel can fire on irregularly. Worth confirming hair doesn't ink as solid black blob. |
| low_poly (3D path) | High-poly iClone | `flatShading=true` on 50k-triangle mesh produces noisy facets, not retro look. Expected. |
| risograph | Bright vs dark scenes | Plate thresholds are absolute luminance — dark scenes may produce only blue plate, light scenes only pink. |

---

## Summary

- **14 non-cel styles**, all running through CPU pixel loops in `applyStyleFilter`.
- **One catastrophic duplicate** (ink_wash ≡ pencil, B1). User-reported.
- **One cross-cutting bug** (B6: GridHelper contamination) affecting 6 Sobel-based styles.
- **One slider misalignment** (B3: Edge Threshold doesn't affect non-cel sketch styles).
- **Most styles are recognizable but thin** — they hit one defining trait of the genre but miss the secondary characteristics (paper grain, brush direction, edge pooling, hatching).
- **No avatar-specific bugs** in the non-cel set. Pose-dependent visual differences are the styles working as designed; bug B6 amplifies them.

**Recommended first day of work** (Tier 1, ~3-4 hours):
1. Fix B6 (helper exclusion from Sobel) — benefits 6 styles
2. Differentiate ink_wash from pencil (add tonal wash)
3. Wire Edge Threshold slider into non-cel styles
4. Fix category mismatches in `STYLES`
5. Add paper texture to sketch styles

After Tier 1, the most-broken style (ink_wash) becomes distinct, the
floor-grid contamination is gone, and the slider does what it says.
That's the demo-floor fix list.
