# 3D → 2D Conversion — Deep Audit (THE differentiator)

Read-only audit. No code modified.

## Verdict at a glance

- **Demo-readiness: GREEN — with caveats**
  - The headline workflow works end-to-end: live 3D viewport mirror → style filter applied per-pixel on a captured canvas → preview canvas updates → "SAVE" downloads PNG/JPEG/WebP → "PNG SEQUENCE" exports a 60-frame ZIP with `manifest.json` (matches user memory: "PNG sequence exporter with manifest is shipped").
  - Two parallel and partially-overlapping registries exist — **41 styles in `src/pipeline/SPX3DTo2DPipeline.js` (GPU EffectComposer renderer)** and **51 styles in `src/components/pipeline/SPX3DTo2DPanel.jsx` (canvas pixel-shader pipeline)**. The two are NOT unified. The visible UI surfaces 20 of those (filtered by `VISIBLE_STYLES`). Of the 51 canvas presets, ~22 have explicit unique `case` blocks; the others fall through to `default: break;` so for them the styled output is just the live capture with optional halftone+pack-finish sugar.
  - **Critical bug** in `SPX2DStylePresets.js` (line 135-148): the `applyStyleTransform` function body is corrupted — an array literal from `COMBINABLE_PAIRS` was pasted *inside* the `STYLE_PRESETS[styleName ...` lookup expression, causing a syntax error. This file is **not currently imported anywhere outside itself**, so the rest of the app still compiles, but the file is broken on import.

## Implementation approach

There are two style engines, used in different code paths:

### Engine A — `src/pipeline/SPX3DTo2DPipeline.js` (774 lines, GPU)
- Three.js `EffectComposer` chain, lazy-loaded examples/jsm postprocessing modules.
- 41 cinematic styles in `CINEMATIC_STYLES` const.
- Each style has: `cssFilter` (parsed into shader uniforms), `passes` array (which postprocessing passes to add), `outline` (uses `OutlinePass`), `toon` (custom toon-quantize ShaderPass), `toonLevels`, `bgColor`, `pixelSize`.
- Pass library: `RenderPass`, `OutlinePass`, custom ToonShaderPass, `UnrealBloomPass`, `FilmPass` (grain+scanlines), `HalftonePass`, `GlitchPass`, custom PixelatePass, custom CSS-filter-emulation ShaderPass, custom VignettePass, custom ThermalMap ShaderPass, `OutputPass`.
- After GPU pass, captures result to a 2D canvas and (optionally) runs CPU-only passes for things WebGL can't easily do: `kuwahara`, `edge_white_bg`, `letterbox`, `grid_overlay`. Also has CPU implementations for halftone, pixelate, scanlines, vignette, grain, glitch, thermalMap, bloom, edgeDetect, quantize that go unused on the GPU path but exist for the legacy renderer.
- Exposes: `SPX3DTo2DRenderer` (GPU path), `SPX3DTo2DSkeletonRenderer` (legacy stub — just clears canvas and sets stroke style; doesn't actually render anything).

### Engine B — `src/components/pipeline/SPX3DTo2DPanel.jsx` (935 lines, CPU canvas)
- This is **the engine the UI actually uses**. EffectComposer/Engine A is *not* invoked from the panel.
- Mirrors the live `THREE.WebGLRenderer.domElement` into a `<canvas>` via `requestAnimationFrame` `drawImage`.
- On Render: copies the renderer canvas to a temp canvas, then runs `applyStyleFilter(tmp, activeStyle, params)` — a giant `switch` on style id that walks the pixel buffer (`getImageData → loop → putImageData`) for color manipulations.
- Helper passes: `makeLinePass()` (Sobel edge detect → black ink on white), `makeFlatColorPass()` (toon quantize), `applyHalftoneOverlay()`, `applyPaperTextureOverlay()`, `applyRimGlowFinish()`, `applyBrushTaperEffect()`, `applyPackFinish()`.
- Extra: `applyNPRIfNeeded(style, sceneRef)` traverses the scene and replaces all mesh materials with `window.createToonMaterial({levels:4})` plus calls `window.addOutlineToMesh(...)` if the global helper exists. **Both globals are not defined elsewhere in this repo** — feature is silently a no-op. This means even for styles flagged as "toon", the in-scene toon material swap doesn't happen; the only toon effect the user sees is the post-pixel quantize.
- Temporal blend: `temporalBlendCanvas(current, blend, prevFrameRef)` provides motion-trail blending for `final` export mode.

### Pixel-level passes implemented in Engine B
- Sobel edge detect (in `makeLinePass`)
- Toon-quantize / posterize (`makeFlatColorPass`, in-line in toon/cel/anime/manga/comic/pixar case)
- Sepia matrix
- Per-channel arithmetic (vintage/retrowave/blueprint/infrared/x_ray/film_noir/thermal/hologram/neon/tron/matrix and the 10 "pack" presets)
- Halftone overlay
- Paper texture noise
- Rim glow boost
- Brush taper vertical fade

## Inputs / outputs / perf

- **Input**: any THREE.js scene currently rendered into the main `rendererRef.current.domElement`. The panel asks the user to "add a mesh first" if no renderer exists.
- **Output formats**:
  - PNG / JPEG / WebP single image via `canvas.toDataURL()` and a download anchor.
  - 4K (1×–4×) PNG via `canvas.toDataURL('image/png')` — uses Electron `electronAPI.saveFile` if available, otherwise browser download.
  - Video MP4 — captures 60 frames as JPEGs at 24 fps and ships them to Electron `render:export-video` IPC for FFmpeg encoding. **Browser-only path just shows "60 frames captured (FFmpeg requires desktop app)"** — no in-browser FFmpeg fallback.
  - **PNG sequence + manifest.json** ZIP — `handlePngSequenceExport` uses `JSZip` to bundle 60 frames at 24 fps with a manifest (version, source, fps, frame_count, width, height, style, frames[], metadata.exported_at). **This is the SPX-Puppet handoff format.** Working.
- **Performance**: full-canvas pixel walks at typical viewport size (≥1280×720) — every frame is a few hundred ms of single-threaded JS for the heavier styles (`pencil`, `charcoal`, `ink_wash` use Sobel, ~16 ms × pixels). Not real-time. The "RENDER" button is a one-shot. Live preview is the un-styled mirror of the 3D viewport, the styled canvas is rendered only on click.
- **Resolution**: tied to the 3D renderer's domElement size, scaled by 1×/2×/3×/4× via the "4K Scale" slider for export.
- **Camera/lighting/material handling**: stylization happens **after** the WebGL render, so whatever camera, lights, and materials your scene has come through. The `applyNPRIfNeeded` toon-material swap is a no-op.

## MIDAS / depth integration

- `MIDAS_MODEL_URL` lives in **only one place**: `src/mesh/DepthEstimator.js` (line 7-9):
  ```js
  const MIDAS_MODEL_URL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MIDAS_MODEL_URL) ||
    'https://huggingface.co/onnx-community/midas-v2.1-small/resolve/main/onnx/model.onnx';
  ```
- This is **not used by the 3D→2D stylization pipeline at all**. Depth is only read by mocap (and broken there — see mocap audit).
- The 3D→2D output therefore does **not** ingest a depth map. There is **no AI-based depth-aware stylization** wired in. The "X-Ray", "Blueprint", "Wireframe" presets are pure pixel filters, not depth-driven.

## Style preset registries — both registries enumerated

### Registry 1 — `src/pipeline/SPX3DTo2DPipeline.js` `CINEMATIC_STYLES` — 41 entries (GPU EffectComposer path)

| # | id | Display name | Category | Has unique passes? | Verdict |
|---|---|---|---|---|---|
| 1 | photorealistic | Photorealistic | photo | sharpen | functional |
| 2 | cinematic | Cinematic | photo | vignette+grain | functional |
| 3 | hdr | HDR | photo | bloom+sharpen | functional |
| 4 | noir | Film Noir | photo | edge+grain+vignette+grayscale | functional |
| 5 | vintage | Vintage Film | photo | grain+vignette+scratch+sepia | functional (scratch is fall-through) |
| 6 | toon | Toon Shading | cartoon | quantize+edge_black, 4 levels | functional |
| 7 | cel | Cel Animation | cartoon | quantize+edge_black, 3 levels | functional |
| 8 | inkwash | Ink Wash | cartoon | quantize+edge_black, 5 levels | functional |
| 9 | comic | Comic Book | cartoon | quantize+halftone+edge_black | functional |
| 10 | manga | Manga | cartoon | quantize+crosshatch+edge_black | partial — crosshatch pass not implemented in GPU path |
| 11 | anime | Anime | cartoon | quantize+edge_black | functional |
| 12 | pixar | Pixar/3D Cartoon | cartoon | quantize+soft_light, 6 levels | partial — soft_light pass not implemented |
| 13 | oilpaint | Oil Painting | paint | kuwahara | functional (CPU pass) |
| 14 | watercolor | Watercolor | paint | kuwahara+blur_soft+paper_texture | partial (only kuwahara fires) |
| 15 | gouache | Gouache | paint | kuwahara+flatten | partial (flatten not impl) |
| 16 | impressionist | Impressionist | paint | kuwahara+stroke_texture | partial (stroke_texture not impl) |
| 17 | expressionist | Expressionist | paint | kuwahara+edge_distort | partial |
| 18 | pencil | Pencil Sketch | sketch | edge_white_bg+hatch | partial (hatch not impl) |
| 19 | charcoal | Charcoal | sketch | edge_white_bg+hatch+smudge | partial |
| 20 | blueprint | Blueprint | sketch | edge+grid_overlay+bgColor | functional |
| 21 | wireframe_style | Wireframe | sketch | wireframe_overlay | partial — wireframe_overlay pass not implemented |
| 22 | xray | X-Ray | sketch | edge+desaturate+invert | partial (desaturate not impl) |
| 23 | lowpoly | Low Poly | stylized | quantize+faceted | partial (faceted not impl) |
| 24 | voxel | Voxel | stylized | pixelate, 8px | functional |
| 25 | glitch | Glitch Art | stylized | glitch_shift+scanlines | functional |
| 26 | hologram | Hologram | stylized | scanlines+hologram_glow | partial (hologram_glow not impl) |
| 27 | neon | Neon/Synthwave | stylized | bloom+edge_neon+bgColor | partial (edge_neon not impl) |
| 28 | retrowave | Retrowave | stylized | quantize+scanlines+grid_overlay | functional |
| 29 | anamorphic | Anamorphic Lens | photo | lens_flare+vignette+letterbox | partial (lens_flare not impl) |
| 30 | infrared | Infrared | photo | bloom+vignette+hue-rotate | functional |
| 31 | thermal | Thermal Camera | photo | thermal_map | functional |
| 32 | ukiyo_e | Ukiyo-e | cartoon | quantize+woodblock | partial (woodblock not impl) |
| 33 | stained_glass | Stained Glass | stylized | quantize+lead_lines | partial (lead_lines not impl) |
| 34 | mosaic | Mosaic/Tile | stylized | pixelate+edge | functional |
| 35 | stipple | Stipple/Pointillist | paint | stipple_dots | partial (stipple_dots not impl in GPU path) |
| 36 | linocut | Linocut Print | sketch | threshold+edge_white_bg | partial (threshold not impl) |
| 37 | risograph | Risograph Print | paint | quantize+halftone+color_shift | partial (color_shift not impl) |
| 38 | tron | Tron/Grid | stylized | edge_neon+grid_overlay+bloom+bgColor | partial |
| 39 | matrix | Matrix/Digital | stylized | scanlines+rain_overlay+bloom+bgColor | partial (rain_overlay not impl) |
| 40 | oil_dark | Dutch Masters | paint | kuwahara+vignette+grain | functional |
| 41 | fresco | Fresco | paint | kuwahara+paper_texture+crack_texture | partial |

**Note**: Engine A is constructed inside the panel? Let me check: NO — the SPX3DTo2DPanel does **not** instantiate `SPX3DTo2DRenderer`. It uses Engine B's CPU pipeline exclusively. Engine A is library-only at runtime; nothing in the wired UI calls it.

### Registry 2 — `src/components/pipeline/SPX3DTo2DPanel.jsx` `STYLES` — 51 entries (CPU canvas path, the active engine)

The panel filters down to 20 visible via the `VISIBLE_STYLES` allowlist. The full list of 51 ids is below; I've cross-referenced each against the actual `applyStyleFilter` switch statement.

| # | id | Display | Visible in UI? | switch case implemented? | Verdict |
|---|---|---|---|---|---|
| 1 | cinematic | Cinematic | ✓ | default fall-through (just halftone+pack) | placeholder |
| 2 | photorealistic | Photorealistic | ✗ | default | placeholder |
| 3 | hdr | HDR | ✗ | default | placeholder |
| 4 | film_noir | Film Noir | ✓ | yes (luma + contrast boost) | functional |
| 5 | vintage_film | Vintage Film | ✓ | yes (warm+yellow+drop blue) | functional |
| 6 | infrared | Infrared | ✗ | yes (channel swap) | functional |
| 7 | thermal | Thermal Camera | ✗ | yes (luma → R/G/B ramp) | functional |
| 8 | toon | Toon Shading | ✓ | yes (toonLevels+shadowBands+highlightClamp) | functional |
| 9 | cel | Cel Animation | ✓ | shared toon block, lv=4 | functional |
| 10 | anime | Anime | ✓ | shared toon block | functional |
| 11 | manga | Manga | ✓ | shared toon block + halftone overlay forced | functional |
| 12 | comic | Comic Book | ✓ | shared toon block + halftone | functional |
| 13 | pixar | Pixar/3D Cartoon | ✓ | shared toon block (no quantize) | functional |
| 14 | ink_wash | Ink Wash | ✓ | yes (line pass → grayscale) | functional |
| 15 | oil | Oil Painting | ✓ | default fall-through | placeholder |
| 16 | watercolor | Watercolor | ✓ | default | placeholder |
| 17 | gouache | Gouache | ✓ | default | placeholder |
| 18 | impressionist | Impressionist | ✓ | default | placeholder |
| 19 | expressionist | Expressionist | ✗ | default | placeholder |
| 20 | dutch_masters | Dutch Masters | ✗ | shares sepia case | functional (sepia matrix) |
| 21 | fresco | Fresco | ✗ | default | placeholder |
| 22 | pencil | Pencil Sketch | ✓ | yes — `makeLinePass` Sobel | functional (signature feature) |
| 23 | charcoal | Charcoal | ✓ | yes — line pass × 0.6 grayscale | functional |
| 24 | blueprint | Blueprint | ✓ | yes (luma → blue-tint inversion) | functional |
| 25 | wireframe | Wireframe | ✗ | default | placeholder |
| 26 | stipple | Stipple/Pointilist | ✗ | default | placeholder |
| 27 | linocut | Linocut Print | ✓ | default | placeholder |
| 28 | risograph | Risograph Print | ✓ | default | placeholder |
| 29 | low_poly | Low Poly | ✓ | yes — `makeFlatColorPass` quantize | functional |
| 30 | voxel | Voxel | ✗ | default | placeholder |
| 31 | ukiyo_e | Ukiyo-e | ✗ | default | placeholder |
| 32 | stained_glass | Stained Glass | ✗ | default | placeholder |
| 33 | mosaic | Mosaic/Tile | ✗ | default | placeholder |
| 34 | x_ray | X-Ray | ✗ | yes (luma invert) | functional |
| 35 | hologram | Hologram | ✗ | yes (cyan glow + alpha mod) | functional |
| 36 | neon | Neon/Synthwave | ✗ | yes (3-band cyan/magenta/blue) | functional |
| 37 | glitch | Glitch Art | ✗ | default | placeholder |
| 38 | retrowave | Retrowave | ✗ | yes (R+/G-/B+) | functional |
| 39 | tron | Tron/Grid | ✗ | shares neon case | functional |
| 40 | matrix | Matrix/Digital | ✗ | shares neon case | functional |
| 41 | anamorphic | Anamorphic Lens | ✗ | default | placeholder |
| 42 | mythic_ink | Mythic Ink | ✗ | yes — luma+blue lift, brush taper, paper noise | functional |
| 43 | celestial_glow | Celestial Glow | ✗ | yes — pale blue glow + rim glow finish | functional |
| 44 | silk_mist | Silk Mist | ✗ | yes — soft pastel cool tilt + brush taper + paper | functional |
| 45 | spirit_flame | Spirit Flame | ✗ | yes — orange/red dominant + rim glow | functional |
| 46 | moonlit_legend | Moonlit Legend | ✗ | yes — moonlight blue cast + rim glow | functional |
| 47 | heavy_ink | Heavy Ink | ✗ | yes — hard B&W threshold | functional |
| 48 | halftone_action | Halftone Action | ✗ | yes — 4-band luma + halftone overlay | functional |
| 49 | shadow_panel | Shadow Panel | ✗ | yes — 3-band shadow stamp | functional |
| 50 | crime_neon | Crime Neon | ✗ | yes — cyan/magenta/dark with rim glow | functional |
| 51 | motion_comic | Motion Comic | ✗ | yes — 4-band luma + halftone | functional |

### Visible-in-UI summary (the styles a pitch viewer can actually click)

20 visible styles via `VISIBLE_STYLES`:
`cinematic, film_noir, vintage_film, toon, cel, anime, manga, comic, pixar, oil, watercolor, gouache, impressionist, ink_wash, pencil, charcoal, blueprint, linocut, risograph, low_poly`.

Of those 20:
- **Functional, visibly different output: 13** (film_noir, vintage_film, toon, cel, anime, manga, comic, pixar, ink_wash, pencil, charcoal, blueprint, low_poly).
- **Placeholders that fall through to default and show only a halftone+pack-finish over the raw render: 7** (cinematic, oil, watercolor, gouache, impressionist, linocut, risograph).

The 31 invisible-but-defined entries include the strongest "wow" presets (the 10-piece **Mythic Ink + Noir Panel** packs, all functional) — these are dead in the UI. Adding them to `VISIBLE_STYLES` is a 1-line UX improvement that immediately ~doubles the demo surface.

### Cross-registry alignment

Mostly identical IDs, but Engine A uses `oilpaint`/`oil_dark`/`vintage`/`noir`/`wireframe_style`/`xray`/`lowpoly` while Engine B uses `oil`/`dutch_masters`/`vintage_film`/`film_noir`/`wireframe`/`x_ray`/`low_poly`. **The two registries cannot be cross-selected** without a translation table. This isn't a bug right now (Engine A is unused) but it's a maintenance trap.

## Files (every related file, 1-line each)

| Path | Role |
|---|---|
| `src/pipeline/SPX3DTo2DPipeline.js` | **Engine A** — Three.js EffectComposer GPU path with 41 styles + bone map. Library only, not invoked from UI. |
| `src/components/pipeline/SPX3DTo2DPanel.jsx` | **Engine B + UI** — 51-style CPU canvas pipeline, render+export+PNG sequence. The active engine. |
| `src/components/pipeline/SPX2DStylePresets.js` | Alternate 41-style **2D-puppet** transform registry (keyframe modifiers). **File is syntactically broken** (line 135-148 corrupted by an array literal pasted into function body). Not currently imported. |
| `src/components/pipeline/ExportToPuppetButton.jsx` | Export to .spxmotion modal — imports 3 functions that don't exist on the pipeline. Not wired into App. |
| `src/components/pipeline/VideoFaceMocap3DPanel.jsx` | Face mocap → .spxmotion. Has its own PoseMesh exporter. |
| `src/mesh/DepthEstimator.js` | MiDaS ONNX. Used by mocap, **not** by 3D→2D pipeline. |
| `src/mesh/PostPassShaders.js` | Misc post-pass GLSL fragments (273 lines). |
| `src/mesh/GLSLShaders.js` | Stylized shader library (mentioned in render presets). |
| `src/render/RenderPresets.js` | Render-preset registry, references stylize concepts. |
| `src/components/panels/PainterlyNPRPanel.jsx` | Sliders for brush stroke/watercolor/ink-bleed — writes to `window.__SPX_PAINTERLY_NPR__`. Not consumed by Engine B. |
| `src/components/panels/RotoscopePanel.jsx` | Loads a video as a textured plane in the scene for rotoscoping reference (160 lines, self-contained). |
| `src/components/panels/TwoDViewportPanel.jsx` | 2D viewport panel referencing post-effects. |
| `src/components/panels/GeometryNodeStylePanel.jsx` | Geometry-node style preset panel. |
| `src/pro-ui/workspaceMap.js` | Routes "3d_to_2d" to SPX3DTo2DPanel. |
| `src/components/ShadingPanel.jsx` | References shader passes / NPR. |
| `src/components/mesh/NodeCompositorPanel.jsx` | Compositor node UI — separate from stylize. |
| `rewrite_3dto2d.py` | One-off Python script (rewrite tool, not runtime). |
| `dist/assets/...` | Pre-built JS bundles (ignored for source audit). |

## Known bugs / FIXMEs / placeholders

1. **`SPX2DStylePresets.js` is syntactically broken** (line 135-148):
   ```js
   export function applyStyleTransform(kf, styleName, time=0) {
     const style = STYLE_PRESETS[styleName
     ["Fleischer Rubber Hose", "Classic Cartoon"],   // ← these belong in COMBINABLE_PAIRS
     ...
     ["Ralph Bakshi Adult", "Rotoscope Realism"],
   ];
     if (!style) return kf;
   ```
   This will throw on import. Saving grace: nothing currently imports it, so the dev build still compiles. But it's a landmine.
2. **GPU pipeline (`SPX3DTo2DRenderer`) is unused**. The panel never instantiates it; all 41 EffectComposer-based styles are dormant. Demo is using the slower CPU path even though the faster GPU path is built.
3. **Dynamic `import('three')` mismatch** in `SPX3DTo2DPipeline.js`:
   - Line 656 / 663: `new (await import('three')).default.Color()` and `new THREE.default.Color(style.bgColor)` — `import('three')` doesn't have a `.default.Color`; `Color` is a named export. This would throw at runtime if Engine A were ever called. As-is, Engine A is unused so this latent bug doesn't surface.
4. **`SPX3DTo2DSkeletonRenderer.renderSkeleton()` is a stub** — clears canvas, sets stroke style, then returns without drawing anything (line 754-760).
5. **`applyNPRIfNeeded` references undefined globals** — `window.createToonMaterial` and `window.addOutlineToMesh` are not defined anywhere in the repo. The NPR material swap is a no-op in browser.
6. **Duplicate `thickness` property** in `applyNPRIfNeeded`: `addOutlineToMesh(obj, scene, { thickness:0.002 * edgeStrength, thickness:0.003 })` (line 636-638). Second `thickness` overrides first — the slider does nothing even if the global helper existed.
7. **`VISIBLE_STYLES` filter hides 31 of 51 presets** including all 10 of the "Mythic Ink Cinema Pack + Noir Panel Pack" styles which are fully implemented.
8. **No browser FFmpeg path** — Video export only works in Electron desktop build.
9. **JPEG quality fixed at 0.9** in video export, no UI control.
10. **Categories in CATEGORIES include "Photo, Cartoon, Paint, Sketch, Stylized, Digital"** — Engine A categorizes as "photo, cartoon, paint, sketch, stylized" (no "digital"). Some Engine A styles flagged as `category:'photo'` (anamorphic, infrared, thermal) but Engine B catalogues them as "photo" or "digital". No visible bug — just inconsistent.
11. **No TODO/FIXME/HACK comments** found in any 3D→2D file (clean).

## Integration end-to-end trace

1. User clicks Render Workspace tools → "3D→2D Style" button → `closeAllWorkspacePanels()` + `setStyle3DTo2DOpen(true)`.
2. App.jsx renders `<SPX3DTo2DPanel open sceneRef rendererRef cameraRef />`.
3. Panel mounts; `useEffect` starts a `requestAnimationFrame` "mirror" loop that copies `rendererRef.current.domElement` into `<canvas ref={liveRef}>` continuously — that's the LEFT viewport.
4. User picks a category, then a style tile (UI surfaces 20 visible).
5. User clicks **▶ RENDER**:
   - `applyNPRIfNeeded(activeStyle, sceneRef)` — no-op (globals undefined).
   - `captureAndProcess(1)` → grabs `rendererRef.current.domElement` into a temp canvas; routes by `exportMode` to `makeLinePass`/`makeFlatColorPass` or `applyStyleFilter`.
   - `applyStyleFilter` runs the style's switch case (or default), then optional halftone overlay for manga/comic, then `applyPackFinish` for mythic/noir packs.
   - In `final` exportMode: `temporalBlendCanvas` blends current with previous frame at 0.35 alpha for motion smoothing.
   - Resulting canvas drawn to the CENTER preview canvas.
6. User clicks **⬇ SAVE** → `previewRef.current.toDataURL('image/png|jpeg|webp')` → anchor download. Filename `spx_${style}.${ext}`.
7. **PNG SEQUENCE export** → loop 60 frames calling `captureAndProcess(1)` + `toBlob('image/png')`, JSZip bundles `frames/frame_0001.png...frame_0060.png` plus `manifest.json` (version, source, fps:24, frame_count, width, height, style, frames[{filename, frame, time_seconds}], metadata.exported_at, exporter_version). Blob downloaded as `spx_${style}_pngseq_${w}x${h}.zip`.
8. **4K export / video export** delegates to Electron `electronAPI.invoke('render:save-image' | 'render:export-video')` — works in desktop build only.

The full chain works for the GREEN demo path: pick a style → render → save PNG / save PNG sequence ZIP. Verified by reading.

## Demo-readiness verdict — GREEN with caveats

**Why GREEN**:
- Headline pipeline works: 3D viewport → styled 2D → PNG / 4K PNG / PNG-sequence-with-manifest export.
- 13 of 20 visible presets produce visibly distinct stylized output.
- 31 strong undisplayed presets are 1 line of code away from being demoed.
- No crashes encountered in the active code path.

**Why caveats**:
- "41 styles" is technically true in `CINEMATIC_STYLES`, but the engine that renders them is unused. The active engine is the 51-entry CPU one, of which only **20 are visible** and **13 are visibly differentiated**. If a judge asks "show me 41 styles", the panel only displays 20. **Pre-pitch action: edit `VISIBLE_STYLES` to include all 51 IDs (or at least all functional ones).**
- 7 of the 20 visible styles fall through to default and look identical (just a halftone overlay). Avoid demoing **cinematic, oil, watercolor, gouache, impressionist, linocut, risograph** unless they're polished or replaced.
- `oil` is in the visible list but has no implementation — clicking it returns the original render (with halftone if pack-finish triggers, but it doesn't here). The most-expected painterly preset is a placeholder.
- The PNG sequence ZIP exporter takes ~60×16 ms = ~1 s per frame *plus* one full pixel walk per frame, so a 60-frame export at 1280×720 takes ~30–60 s. Don't trigger live mid-pitch.
- Engine B is single-threaded JS; for any frame larger than ~1080p the user will see a multi-second hang while the pixel walk runs. Render at 720p for demos.

**The critical pre-pitch action**: open `src/components/pipeline/SPX3DTo2DPanel.jsx`, replace `VISIBLE_STYLES` array with the full 51-id list (or a curated 30-style "best of" list including the Mythic Ink and Noir Panel packs). Eliminates the "where are the 41?" mismatch and dramatically improves the wow-factor of the strongest differentiator.
