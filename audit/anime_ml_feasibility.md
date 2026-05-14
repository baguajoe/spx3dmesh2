# AnimeGANv3 Browser Feasibility Audit — Phase A

**Date**: 2026-05-10  •  **Scope**: read-only investigation, 30-min budget  •  **Status**: NO-GO (with caveats)

---

## TL;DR

**NO-GO on AnimeGANv3 as-spec'd for a Techstars production demo.** Single hard blocker: the AnimeGAN family (v2 and v3) is licensed for **non-commercial use only**. The README explicitly: *"This repo is made freely available to academic and non-academic entities for non-commercial purposes such as academic research, teaching, scientific publications."* Commercial use requires written authorization from the author (Tachibana Yoshino).

Everything below the license blocker — runtime, model size, browser support, output quality on 3D rendered input — is otherwise viable. So if (a) you secure a commercial-use letter, OR (b) you reframe the demo as research/eval (not productized), the technical path is real. Recommendation at the bottom.

---

## 1. License — the blocker

### AnimeGANv3 (TachibanaYoshino/AnimeGANv3)
> "This repo is made freely available to academic and non-academic entities for non-commercial purposes such as academic research, teaching, scientific publications."
> "Regarding the request for commercial use, please contact us via email to help you obtain the authorization letter."

### AnimeGANv2 (TachibanaYoshino/AnimeGANv2) — same author, same restriction
Same wording. Generator is 8.17 MB.

### White-box-Cartoonization (proposed `comic` alternative)
**CC BY-NC-SA 4.0** — explicitly prohibits commercial application.

### Net effect
A Techstars-stage company shipping this in a paid product or even a demo positioned for fundraising counts as commercial under standard interpretation of these licenses. Without an authorization letter, **all three of the proposed AI-powered cel options (anime, manga, comic, cel) inherit a hard legal block**. Same likely applies to your `oil_painting` (Van Gogh weights) and `impressionist` (Monet weights) Fast-Style-Transfer plan if those weights derive from the same family — needs separate license check.

---

## 2. Available models (if license is resolved)

### AnimeGANv3 styles (from upstream README)
17+ style "tails" via Double-Tail GAN architecture, including:
- **Hayao** (`AnimeGANv3_Hayao_36.onnx`)
- **Shinkai**, **Ghibli-c1** (`AnimeGANv3_large_Ghibli_c1_e299.onnx`), **Ghibli-o1**
- **Disney** (v1.0, v1.9, v2.0), **Pixar**, **Comic**, **USA Cartoon**, **K-pop**
- **Arcane**, **Cute**, **Sketch-0**, **Portrait Sketch**, **Oil-painting**, **8bit**
- **Nordic Myth** (tiny variant 2.4 MB → 50 FPS @ 512² on iPhone 14)

### AnimeGANv2 (smaller, fewer styles, same license)
- Generator size: **8.17 MB** (much smaller than v3's full models)
- Three styles trained: Hayao / Shinkai / Paprika
- Filename pattern: `AnimeGANv2_Hayao.onnx`, etc. (community ONNX exports)

### Distribution
- **Direct ONNX URLs**: NOT available as raw GitHub files. Upstream repo's `deploy/` folder contains test scripts (`test_by_onnx.py`) but the `.onnx` weight files are distributed via Patreon-style channels per the README, not publicly committed.
- **PINTO Model Zoo** (PINTO0309/PINTO_model_zoo) hosts converted ONNX/TFLite/TFJS weights for AnimeGANv2 (folder `050_AnimeGANv2`) via S3 mirror: `https://s3.ap-northeast-2.wasabisys.com/pinto-model-zoo/050_AnimeGANv2/resources.tar.gz`. Note: PINTO is a re-host, not a re-license — the original non-commercial restriction passes through.
- **Hugging Face Spaces**: `TachibanaYoshino/AnimeGANv3` exists but the public Space currently throws `AttributeError: module 'numpy' has no attribute 'bool8'` and is broken. `hysts/AnimeGANv3_PortraitSketch` is a working third-party wrapper of the portrait-sketch tail.

---

## 3. Input / output specs

### AnimeGANv2 (well-documented across community ports)
- Input size: **256² or 512²** — both supported, 512² is the typical inference choice. Aspect-ratio is preserved by letterboxing or center-crop, not by stretching.
- Channel order: **RGB**
- Normalization: `x / 127.5 - 1.0` → tensor in `[-1, 1]`, NCHW layout (`[1, 3, H, W]`)
- Output: same shape, in `[-1, 1]`, RGB. Denormalize with `(x + 1) * 127.5`.

### AnimeGANv3 (less consistently documented in upstream README)
- Most published examples use **512²** input. The "Nordic Myth tiny" benchmark is reported at 512² @ 50 FPS on iPhone 14 (Apple Neural Engine). Upstream README does NOT explicitly state the preprocessing recipe; standard practice (and what `test_by_onnx.py` does) is the same v2 recipe: RGB, `/127.5 - 1`, NCHW.
- Each "tail" is its own .onnx file; no shared backbone deployment.

---

## 4. Browser runtime

### Two options

| Runtime | Backend | Verdict |
|---|---|---|
| **onnxruntime-web** (`npm: onnxruntime-web` 1.25.x) | **WASM** (default) | ✅ Full op coverage. ~2-5 fps for 512² AnimeGANv2 on a typical M2/Ryzen laptop. CPU-bound. |
| onnxruntime-web | **WebGL** | ⚠️ Subset of ops only. Open issues confirm common GAN ops (e.g. `LSTM`, `DynamicQuantizeLinear`, some convolution variants) silently fall back or fail to compile. AnimeGAN's resblocks + IN/LN ops are mostly supported, but it's a coin-flip until you actually try. |
| onnxruntime-web | **WebGPU** (newer) | ✅ Best perf when supported (Chrome 113+, Safari 18+). Op coverage growing fast. Reported 3-5× over WASM. Falls back to WASM gracefully when WebGPU unavailable. |
| TensorFlow.js (`@tensorflow/tfjs`) | WebGL / WebGPU | ✅ Same story — works with TFJS-converted weights. Conversion adds a step. |

### Recommended: **onnxruntime-web with WebGPU primary, WASM fallback.**
- AnimeGANv2 at 512² on WebGPU: realistic 5-10 fps. AnimeGANv3 (deeper Double-Tail arch) likely 2-4 fps.
- For a **single-frame styled preview** (your panel's existing output mode), inference time of 200-500ms is acceptable — user clicks a style, they wait half a second, frame refreshes.
- For **24fps preview rAF** (current panel design), AI-powered styles would need to drop to 1-2 fps update cadence and accept the slideshow effect, OR use a smaller model (Nordic Myth tiny at 2.4MB hits 50fps on phone-class GPU and would likely sustain 20fps in browser WebGPU).

---

## 5. The CRITICAL risk — does it work on iClone 3D character input?

**Likely degraded vs. real photos. Not catastrophic, but expect tuning pain.**

AnimeGAN was trained on real photographs paired with anime film stills (Hayao = Studio Ghibli frames; Shinkai = "Your Name" frames). The discriminator learned to distinguish "photo of real human" from "anime drawing." Feeding it a **3D-rendered character that already has cel-shaded materials applied** is double-stylization in the wrong direction:

1. The model's expectation is "photo with PBR-like skin, complex lighting, subsurface scattering" → it tries to flatten and abstract those.
2. A MeshToon-rendered iClone avatar has none of those features; it's already partially flat. The model's "abstract this" pass has nothing to remove and may hallucinate features (extra hair tufts, manga eye exaggeration, color shifts) that don't fit your subject.

**Confirmed mitigations from public examples:**
- Run AnimeGAN on the **raw PBR pass** (before MeshToon swap), not the cel-shaded pass — gives the model the "photo-like" input it expects. Means we'd RE-render without the cel-shader rig for AI styles.
- Use the **Portrait** / **Face** tails (`AnimeGANv3_FacePortraitV2`, `AnimeGANv3_PortraitSketch`) for face-centric framing — these are tuned for human faces specifically and tend to handle non-photo input better than the landscape-trained tails.
- Pre-resize input to 512² with letterbox (preserves face proportions) before inference.

**Actual quality comparison** (AnimeGAN on 3D rendered input): no first-party benchmarks found in 30 min. SyncedReview / arxiv NOVA-3D / GANime literature talks about anime character GENERATION from sketches, not photo→anime applied to 3D renders. Expect **POC needed** to confirm output quality on iClone characters specifically. This is the largest unknown in the technical path.

---

## 6. Bundle size + lazy-load

- **onnxruntime-web** runtime: ~3 MB gzipped (WASM module + JS). Lazy-loadable via dynamic `import()`.
- **Per-style weights**: 8 MB (AnimeGANv2) to ~50 MB (AnimeGANv3 full Double-Tail) per style. Cached in IndexedDB after first download.
- Plan: code-split the AI-powered style branch into a chunk that loads on first AI-style click, not at app boot. Existing Vite config already produces `panels-*.js` and `generators-*.js` split chunks — adding `ml-runtime-*.js` is a one-line `vite.config.js` change.
- On the original Techstars demo machine (assumed laptop on conference WiFi): a 50MB weight download is ~5-10s. Show a "Downloading anime model… (one-time, then instant)" spinner.

---

## 7. POC implementation plan (if greenlit despite license)

Roughly half a day to a working anime style on one model:

1. Pick **AnimeGANv3 Hayao** as the proof-of-concept model (most stable, best community reference).
2. Add `onnxruntime-web` as a dep. Lazy-load on first AI-style click.
3. Host the .onnx file on the project's CDN (or HuggingFace as an LFS file) — re-hosting from PINTO is technically allowed under their re-distribution but the underlying license still gates usage.
4. New helper `runAnimeGANInference(srcCanvas, sessionPromise)`:
   - Resize src to 512² with letterbox (preserve aspect)
   - Convert to NCHW Float32Array, normalize `/127.5 - 1`
   - Run through ORT InferenceSession
   - Denormalize, write to output canvas, undo letterbox
5. Plug into `applyStyleFilter` cel-family branch as an OPTIONAL replacement: check `params.useAI`, route through ML pass instead of bilateral+posterize+sobel. Keep existing pipeline as fallback.
6. **Re-render source frame WITHOUT MeshToonMaterial swap** for AI styles (use the raw PBR frame). Means the panel's `applyCelShading` / `restoreNPRMaterials` toggle has to flip when going from "shader cel" styles to "AI cel" styles.
7. Show a per-frame timing badge during dev to validate runtime.

Halfway-house option: **single-frame mode only** for AI styles — drop the 24fps live preview when an AI style is active, replace with a "Render" button that produces one frame, ~500ms. User clicks Render again for next frame. Removes the rAF performance pressure entirely.

---

## 8. Recommendation

**NO-GO on this approach as currently scoped, for licensing reasons. Three viable pivots, ranked:**

### Option A (recommended) — **drop the AI-powered tier from Techstars demo**
Ship 9 shader-based styles (`ink_wash`, `pencil`, `charcoal`, `cinematic`, `film_noir`, `vintage_film`, `risograph`, `blueprint`, `low_poly`) plus the **6 cel-family styles already working via the MeshToon + bilateral + edge pipeline** (anime, manga, comic, cel, toon, pixar). That's already 15 styles, all original work, zero license risk, all native to the panel. Demo narrative is cleaner: "every style runs locally, no cloud calls, no model downloads, ships in the binary." That's a Techstars-friendly story.

### Option B — request commercial-use letters (parallel track)
Email Tachibana Yoshino (per AnimeGANv3 README) and SystemErrorWang (per White-box-Cartoonization README) **today**. Best case: response within a week with terms; worst case: silence. Can't gate a Saturday-deadline demo on this. Pursue in parallel only.

### Option C — train your own
Train a small AnimeGAN-arch model on a permissively-licensed dataset (Danbooru-tagged community art under CC0 / appropriate licenses). Weeks, not days. Out of weekend scope.

### Avoid: cloud API workaround
Replicate / Hugging Face Inference / Modal could host AnimeGANv3 server-side and let you call it. **This does not solve the license problem** — the upstream non-commercial restriction applies to outputs in commercial contexts regardless of where inference runs. Plus adds network latency, ongoing cost, and a "your demo broke when wifi flickered" failure mode.

---

## Sources

- [AnimeGANv3 README (license + model list)](https://github.com/TachibanaYoshino/AnimeGANv3)
- [AnimeGANv2 README (license + 8.17 MB generator)](https://github.com/TachibanaYoshino/AnimeGANv2)
- [PINTO_model_zoo / 050_AnimeGANv2 (re-host of converted ONNX)](https://github.com/PINTO0309/PINTO_model_zoo/tree/main/050_AnimeGANv2)
- [White-box-Cartoonization (CC BY-NC-SA 4.0)](https://github.com/SystemErrorWang/White-box-Cartoonization)
- [onnxruntime-web npm (1.25.x)](https://www.npmjs.com/package/onnxruntime-web)
- [onnxruntime-web WebGL backend op coverage discussion](https://github.com/microsoft/onnxruntime/issues/11872)
- [HuggingFace Space TachibanaYoshino/AnimeGANv3 (currently broken)](https://huggingface.co/spaces/TachibanaYoshino/AnimeGANv3)
- [Working portrait-sketch wrapper (hysts)](https://huggingface.co/spaces/hysts/AnimeGANv3_PortraitSketch)
- [Synced/AnimeGAN evolution writeup (v2 → v3 architecture notes)](https://medium.com/syncedreview/new-white-box-framework-will-cartoonize-your-world-efb31780f6a9)
