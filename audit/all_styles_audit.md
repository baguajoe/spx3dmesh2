# All 20 Styles — Read-Only Audit

Scope: `src/components/pipeline/SPX3DTo2DPanel.jsx`. Maps each of the 20
user-visible styles in `VISIBLE_STYLES` (line 16-41) to its current pipeline,
result class, and recommended architectural change. No code modifications.

`applyNPRIfNeeded` is currently a no-op (commit `e1615fb`). Every style today
runs through `applyStyleFilter` only — a 2D image-domain filter on the
already-rendered PBR frame.

Helpers cited below:
- `applyStyleFilter` — line 102-600
- `applyPaperTextureOverlay` — line 603-617 (additive grain)
- `applyHalftoneOverlay` — line 619-638 (per-Nth-pixel darken)
- `applyPackFinish` — line 680-702 (only triggers on mythic/noir packs — none in visible list)
- `makeLinePass` — line 708-751 (Sobel edge → binary B&W)
- `makeFlatColorPass` — line 780-797 (per-channel posterize, NOT geometric)

---

## PHOTO

### CINEMATIC (id `cinematic`)
- **Code**: line 556-590
- **Pipeline**: pure 2D filter (multi-pass)
- **What it does**: per-pixel S-curve tone map → blend with shadow tint (warm) and highlight tint (cyan-teal) weighted by luminance → radial vignette → ±0.06 noise
- **Intent**: cinematic film look — orange-and-teal grade, vignette, grain
- **Visual**: 3D-WITH-FILTER — *intentionally* photographic; the 3D shading IS the subject
- **Recommendation**: WORKS AS-IS
- **Severity**: WORKS

### FILM NOIR (id `film_noir`)
- **Code**: line 138-145
- **Pipeline**: pure 2D filter (single pass)
- **What it does**: convert to luminance, apply contrast curve `(g-128)*1.4+128`
- **Intent**: high-contrast B&W
- **Visual**: 3D-WITH-FILTER — *intentionally* photographic
- **Recommendation**: WORKS AS-IS — could add grain + vignette as polish
- **Severity**: WORKS (POLISH possible)

### VINTAGE FILM (id `vintage_film`)
- **Code**: line 198-205
- **Pipeline**: pure 2D filter (single pass)
- **What it does**: bump R, slightly damp G, kill B → warm faded tint
- **Intent**: vintage film stock
- **Visual**: 3D-WITH-FILTER — *intentionally* photographic
- **Recommendation**: WORKS AS-IS
- **Severity**: WORKS

---

## CARTOON

### TOON SHADING (id `toon`)
- **Code**: line 146-174 (shared toon/cel/pixar/anime/manga/comic branch)
- **Pipeline**: pure 2D filter
- **What it does**: per-channel posterize to 5 levels + tonal banding boost
- **Intent**: cel-shaded toon look (flat fills, hard transitions)
- **Visual**: 3D-WITH-FILTER — PBR gradient quantized to 5 steps; specular and AO bleed through
- **Recommendation**: NEEDS CEL-SHADER (3D pipeline — `MeshToonMaterial` + outline)
- **Severity**: BROKEN

### CEL ANIMATION (id `cel`)
- **Code**: line 146-174 (shared branch, `lv = 4` for cel)
- **Pipeline**: pure 2D filter
- **What it does**: per-channel posterize to 4 levels + banding boost
- **Intent**: traditional cel animation — hardest 2-tone fills, bold lines
- **Visual**: 3D-WITH-FILTER — same problem as toon, slightly fewer color levels
- **Recommendation**: NEEDS CEL-SHADER (with 2-step gradient — hardest binary shadow/light)
- **Severity**: BROKEN

### ANIME (id `anime`)
- **Code**: line 146-174 (shared branch)
- **Pipeline**: pure 2D filter
- **What it does**: same as toon — posterize 5 + boost
- **Intent**: anime drawing — flat skin tones, hard shadow, bold black outline (Genshin/Arcane reference per user)
- **Visual**: 3D-WITH-FILTER — user-confirmed broken
- **Recommendation**: NEEDS CEL-SHADER (3-step gradient, bold outline)
- **Severity**: BROKEN — user-flagged

### MANGA (id `manga`)
- **Code**: line 146-174 (shared) + line 595 `applyHalftoneOverlay(dst, 0.15, 6)`
- **Pipeline**: 2D filter (posterize) + 2D overlay (halftone darken every 6 px)
- **What it does**: posterize 5 + boost + halftone dot pattern
- **Intent**: B&W manga panel — flat fills, halftone screens for shadow, ink lines
- **Visual**: 3D-WITH-FILTER + dots — halftone dots help, but underlying posterize is still PBR-derived. Also color is preserved (manga is canonically B&W)
- **Recommendation**: NEEDS CEL-SHADER (2-step) + B&W conversion + halftone overlay (already exists) + outline
- **Severity**: BROKEN — user-flagged

### COMIC BOOK (id `comic`)
- **Code**: line 146-174 (shared) + line 595 `applyHalftoneOverlay(dst, 0.15, 6)`
- **Pipeline**: 2D filter + halftone overlay
- **What it does**: posterize 5 + boost + halftone (same as manga but keeps color)
- **Intent**: comic-book panel — bold flat colors, ink lines, halftone shadows
- **Visual**: 3D-WITH-FILTER + dots
- **Recommendation**: NEEDS CEL-SHADER (3-step) + outline (heavier than anime) + halftone overlay
- **Severity**: BROKEN — user-flagged

### PIXAR / 3D CARTOON (id `pixar`)
- **Code**: line 146-174 (shared, but `if (style !== 'pixar')` skips per-channel posterize at line 159)
- **Pipeline**: pure 2D filter (gentlest)
- **What it does**: skips posterize entirely; only the tonal banding boost runs (±8% contrast lift)
- **Intent**: Pixar soft-toon — softer falloff than anime
- **Visual**: 3D-WITH-FILTER — almost identical to source frame; the filter barely changes anything
- **Recommendation**: NEEDS CEL-SHADER (5-step softer gradient — many steps to keep softness while killing specular)
- **Severity**: BROKEN — current implementation is essentially a no-op

### INK WASH (id `ink_wash`, category cartoon)
- **Code**: line 114-125
- **Pipeline**: line pass + greyscale
- **What it does**: `makeLinePass` Sobel edge detection (binary B&W, edges black, fill white) → greyscale conversion of the fill
- **Intent**: brush-and-ink wash drawing — pure linework
- **Visual**: GENUINE 2D — PBR colors discarded entirely; output is pure edge data
- **Recommendation**: WORKS AS-IS — user-confirmed reads as 2D
- **Severity**: WORKS

---

## PAINT

### OIL PAINTING (id `oil`)
- **Code**: line 501-554
- **Pipeline**: 2D filter (multi-pass)
- **What it does**: 3x3 box blur → posterize 8 levels → saturation boost 1.18 → overlay edge lines from `makeLinePass(28, 0.7)` (darkens by 0.65 where line detected) → paper texture overlay
- **Intent**: oil painting — slightly blurred, posterized colors, visible brush strokes, canvas grain
- **Visual**: PARTIALLY 2D — blur softens specular, edge overlay adds 2D character, but PBR form-shading still readable underneath
- **Recommendation**: UNCLEAR — likely passable for demo. Could be elevated to NEEDS PAINTERLY MATERIAL (flat-shaded base + brush canvas alpha) but current implementation isn't broken-broken
- **Severity**: POLISH

### WATERCOLOR (id `watercolor`)
- **Code**: line 461-499
- **Pipeline**: 2D filter (multi-pass)
- **What it does**: 3x3 box blur → desaturate (mix toward grey by 0.65) → lift toward white (18% white blend) → paper texture overlay
- **Intent**: watercolor — soft, light-saturated, pigment bleed
- **Visual**: PARTIALLY 2D — heavy desaturation + lift gives wash feel, but PBR form is still visible through the haze
- **Recommendation**: UNCLEAR — could upgrade with NEEDS PAINTERLY MATERIAL (flat material + bleed canvas filter). Current is acceptable
- **Severity**: POLISH

### GOUACHE (id `gouache`)
- **Code**: line 434-459
- **Pipeline**: 2D filter (multi-pass)
- **What it does**: posterize 5 levels per channel → saturation boost 1.30 → 1.2px Gaussian blur → paper texture overlay
- **Intent**: opaque gouache — flat color fills with painted/textured surface
- **Visual**: 3D-WITH-FILTER — posterize + blur is essentially the anime treatment with paper grain. Same root problem: PBR shading drives the color steps
- **Recommendation**: NEEDS CEL-SHADER OR NEEDS PAINTERLY MATERIAL — overlaps architecturally with anime/manga/comic. Could share the cel-shader rig with a different gradient + paper overlay
- **Severity**: BROKEN

### IMPRESSIONIST (id `impressionist`)
- **Code**: line 400-432
- **Pipeline**: 2D filter (multi-pass)
- **What it does**: random pixel offset displacement (±3 px) → saturation boost 1.20 → ±9 brightness noise per pixel
- **Intent**: impressionist painting — visible brush dabs, color noise, broken-color technique
- **Visual**: PARTIALLY 2D — pixel jitter creates a textured surface that masks the smoothness of PBR. Decent painterly result. Form is still readable but feels painterly, not photographic
- **Recommendation**: UNCLEAR — clever existing implementation. Could stack a NEEDS PAINTERLY MATERIAL upgrade for hard-mode but the current dab effect already works conceptually
- **Severity**: POLISH (arguably WORKS)

---

## SKETCH

### PENCIL SKETCH (id `pencil`)
- **Code**: line 112 `return makeLinePass(srcCanvas, params.edgeThreshold ?? 24, params.edgeBias ?? 1.0)`
- **Pipeline**: pure line pass
- **What it does**: Sobel edge detect → binary B&W (edges black, fill white). PBR colors discarded
- **Intent**: pencil sketch — pure linework
- **Visual**: GENUINE 2D
- **Recommendation**: WORKS AS-IS
- **Severity**: WORKS

### CHARCOAL (id `charcoal`)
- **Code**: line 126-137
- **Pipeline**: line pass + greyscale dim
- **What it does**: `makeLinePass` → greyscale conversion with 0.6 darkening factor
- **Intent**: charcoal drawing — soft greyscale linework, slightly heavier than pencil
- **Visual**: GENUINE 2D
- **Recommendation**: WORKS AS-IS — could add smudge/noise polish for richer texture
- **Severity**: WORKS

### BLUEPRINT (id `blueprint`)
- **Code**: line 223-229
- **Pipeline**: pure 2D filter (single pass)
- **What it does**: convert to greyscale → remap to blue palette: `r = max(0, 30-g*0.1)`, `g = max(0, 60-g*0.1)`, `b = min(255, 100+g)`. Produces blue-on-blue with luminance-driven highlights
- **Intent**: technical blueprint — white/cyan lines on blue background
- **Visual**: 3D-WITH-FILTER — the smooth 3D form is preserved as a gradient blue tint. Looks like blue-tinted PBR, NOT a blueprint drawing
- **Recommendation**: NEEDS LINE-PASS — should run `makeLinePass` first to extract pure edges, then color-map (background → blue, edges → white/cyan). Current is a tint pass, not a blueprint
- **Severity**: BROKEN

### LINOCUT PRINT (id `linocut`)
- **Code**: line 389-398
- **Pipeline**: pure 2D filter (single pass)
- **What it does**: per-pixel — luminance + ±15 jitter → threshold to 245 (white) or 18 (black) — high-contrast binary
- **Intent**: linocut print — extreme B&W, rough threshold edge
- **Visual**: PARTIALLY 2D — binary threshold gives 2D feel, but the threshold edge follows PBR shading regions, so 3D form is still readable
- **Recommendation**: NEEDS LINE-PASS overlay — should layer Sobel edge over the binary threshold for true linocut feel (sharp, gouged-edge linework)
- **Severity**: POLISH

### RISOGRAPH (id `risograph`)
- **Code**: line 344-388
- **Pipeline**: pure 2D filter (multi-pass, very involved)
- **What it does**: derives blue plate intensity from low luminance, pink plate intensity from high luminance → blends with paper-color background → offsets pink plate by 2px (registration error simulation) → paper texture overlay
- **Intent**: 2-plate riso print — limited palette, slight registration offset
- **Visual**: GENUINE 2D — colors are radically remapped, paper/blue/pink only; PBR information barely shows through
- **Recommendation**: WORKS AS-IS — surprisingly effective implementation
- **Severity**: WORKS

---

## STYLIZED

### LOW POLY (id `low_poly`)
- **Code**: line 113 `return makeFlatColorPass(srcCanvas, params.toonLevels ?? 4)`
- **Pipeline**: pure 2D filter (color quantize)
- **What it does**: per-channel quantize to 4 levels — *identical to posterize*, named misleadingly
- **Intent**: low-poly look — faceted geometry with flat triangle colors (think Polycount, Pinterest "low poly hero" art)
- **Visual**: 3D-WITH-FILTER — color quantization without geometric decimation doesn't look low-poly at all; reads as a coarse posterize
- **Recommendation**: NEEDS GEOMETRY-DECIMATION — this is a fundamentally different pipeline (mesh modifier, not material/2D filter). Either:
  1. Implement a true low-poly modifier (decimate vertex count + flat-shade) — full-day work
  2. Substitute with `MeshNormalMaterial` + flat-shading flag (`material.flatShading = true`) so triangle normals don't interpolate. Half-day, gives faux low-poly without changing geometry
  3. Remove from `VISIBLE_STYLES` until properly implemented (5 min)
- **Severity**: BROKEN — most architecturally divergent of all broken styles

---

## BUCKET COUNTS

| Class | Count | Styles |
|---|---|---|
| **WORKS** (intentionally photographic) | 3 | cinematic, film_noir, vintage_film |
| **WORKS** (genuine 2D) | 4 | ink_wash, pencil, charcoal, risograph |
| **POLISH** (acceptable, can improve) | 4 | oil, watercolor, impressionist, linocut |
| **BROKEN** (needs architectural fix) | 9 | toon, cel, anime, manga, comic, pixar, gouache, blueprint, low_poly |
| **TOTAL** | 20 | |

7 styles ship as-is. 4 styles are passable. 9 styles need real work.

---

## ARCHITECTURE PROPOSAL — three rendering pipelines cover the territory

### Pipeline A — Cel-shader rig (3D material replacement)
**Components**:
- `MeshToonMaterial` swap with custom gradient map (1×N DataTexture, NearestFilter for hard steps)
- Inverted-hull outline via `SkinnedMesh` clone bound to the same skeleton, BackSide material with clip-space normal extrusion in `onBeforeCompile`
- Material restoration ref already in place (commit `6f4b880`)

**Covers (6 styles)**: toon, cel, anime, manga, comic, pixar
- toon: 3-step gradient
- cel: 2-step (hardest)
- anime: 3-step + bold outline
- manga: 2-step + B&W conversion + halftone overlay (already exists)
- comic: 3-step + heavier outline + halftone overlay
- pixar: 5-step softer gradient + thinner outline

Could optionally extend to **gouache** with 4-step gradient + paper overlay.

**Effort**: 3-4 hours to build the rig + per-style tuning.

### Pipeline B — Line-pass override (2D filter pipeline replacement)
**Components**:
- `makeLinePass` already exists (line 708)
- Add color-mapping post-pass per style: white→bg, black→ink-color
- Optionally layer the line-pass over an existing filtered output (for linocut polish)

**Covers (1 broken + 1 polish)**: blueprint (broken), linocut (polish)
- blueprint: line-pass → background = `#1144ff` (saturated blue), edges = `#ffffff` (white) → cyan grid optional
- linocut: line-pass overlay on top of the existing high-contrast binary threshold for sharper gouged-edge feel

**Effort**: 30 min for blueprint, 30 min for linocut polish.

### Pipeline C — Painterly material rig (3D + 2D hybrid)
**Components**:
- Replace materials with `MeshLambertMaterial` (flat + diffuse only, no specular) OR `MeshToonMaterial` with a soft 5-step gradient
- Run existing 2D painterly filter passes on top (blur, paper overlay, brush stroke patterns)
- Material restore lifecycle reuses `materialBackupRef` from commit `6f4b880`

**Covers (1 broken + 3 polish, optional)**: gouache (broken), oil/watercolor/impressionist (polish-tier upgrade)

**Effort**: 4-6 hours if we tackle all four. 1 hour for gouache only.

### Pipeline D — Geometry decimation (low_poly only)
**Components**: a mesh modifier that re-tessellates with reduced vertex count + flat normals, OR a one-line `material.flatShading = true` substitute on the existing geometry.

**Covers (1 style)**: low_poly

**Effort**:
- Faux: 30 min (`flatShading = true` on a basic material)
- Real: full day (decimation, hard-edge normal recomputation, parameter exposure)
- Cheat: 5 min (remove from VISIBLE_STYLES, document as roadmap)

---

## RECOMMENDED FIX ORDER

### Template-first strategy
**Build Pipeline A on Anime first.** It's:
- The style the user most clearly tested as broken
- Has the strongest reference points (Genshin/Arcane)
- The cel-shader rig built for Anime trivially extends to manga/comic/cel/toon/pixar via gradient + outline parameters

After Anime works, the same rig drops in for the other 5 cartoon-family styles in ~30 min each.

### Phase plan

| Phase | Work | Styles fixed | Cumulative WORKS count | Time |
|---|---|---|---|---|
| Baseline (today) | — | — | 7 / 20 | — |
| **Phase 1** | Pipeline A on anime + 5 siblings | toon, cel, anime, manga, comic, pixar | 13 / 20 | 3-4 hr |
| **Phase 2** | Pipeline B on blueprint + linocut polish; pick low_poly cheat or faux | blueprint, linocut, low_poly | 16 / 20 | 1-2 hr |
| **Phase 3** | Pipeline C on gouache; optional polish on oil/watercolor/impressionist | gouache (+ optional 3) | 17-20 / 20 | 1-6 hr |

### Demo-floor recommendation
**Ship Phase 1 + Phase 2.** That's:
- 13/20 styles in WORKS state (genuine 2D or intentionally photographic)
- 4/20 in POLISH (oil, watercolor, gouache, impressionist — passable, 3D-with-filter on painterly themes is forgivable)
- low_poly handled via cheat (removed) or faux (`flatShading = true`)
- **Total: 4-6 hours of focused work for demo-quality coverage.**

Phase 3 is post-demo cleanup — gouache being marginal is not a Techstars-killing problem.

### Skip / defer
- low_poly real implementation — defer (geometry modifiers are out of scope for the panel)
- Painterly upgrades (oil/watercolor/impressionist) — defer if time-constrained; they aren't broken, just stylized-3D
- film_noir polish (grain/vignette) — defer, not a quality blocker

---

## TOTAL ESTIMATED TIME

| Target | Estimate |
|---|---|
| Demo-floor (Phase 1 + Phase 2 with low_poly cheat) | **4-6 hours** |
| Demo-good (above + faux low_poly) | 4-7 hours |
| Comprehensive (all 20 fully polished) | 8-12 hours |

The cel-shader rig (Pipeline A) carries the most weight — 6 of the 9 broken
styles fixed by one architecture. Building it well as the template is the
single highest-leverage piece of work in this audit.
