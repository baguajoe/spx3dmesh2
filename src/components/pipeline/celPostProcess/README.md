# celPostProcess — GPU Cel Post-Process Pipeline

GPU replacement for the CPU bilateral + posterize + Sobel + ink chain that
currently runs in `SPX3DTo2DPanel.jsx` (`applyStyleFilter` cel branch at `:147-230`,
plus `captureFacePass` / `captureHairPass` / their compositors).

See `audit/cel_pipeline_rewrite_proposal.md` for the full design rationale.

## Current state — Stage 1 (scaffold only)

Infrastructure is in place; the fragment shader is a passthrough. Toggling the
`useShaderCel` feature flag in the panel logs `[GPU_CEL_PATH]` to the console
but does **not** alter visual output — the existing CPU pipeline still runs.

The flag default is `false`. With the flag off, this module is inert (loaded but
not invoked).

## Files

- **`celShader.vert.glsl.js`** — full-screen quad vertex shader. Standard
  `gl_Position = vec4(position, 1.0)` with a passthrough `vUv` varying.
- **`celShader.frag.glsl.js`** — fragment shader. Stage 1: passthrough
  (`texture2D(tInput, vUv)`). Stage 2: real cel logic.
- **`celPostProcess.js`** — pipeline driver. Exports `createCelPostProcessPipeline`,
  `runCelPostProcess`, `disposeCelPostProcessPipeline`, `isWebGL2Supported`.
- **`regionId.js`** — region-ID resolver stub. Maps a mesh to a region (body /
  face / hair) for per-region cel parameters in the post-process pass. Stage 1
  returns body for everything.

## Roadmap

| Stage | Goal | LOC delta |
|-------|------|----------:|
| 1 (this) | Scaffold module, feature flag, WebGL2 detect, passthrough shader | +scaffold |
| 2 | Implement anime style — bilateral + posterize + Sobel(normal) + ink in one fragment | +~200 |
| 3 | Add manga/comic/cel/toon/pixar via per-style uniform tables | +~50 |
| 4 | Wire region-ID for face/hair sub-tuning (replaces `captureFacePass` / `captureHairPass`) | +~80, -~250 |
| 5 | Default flag ON, deprecate CPU cel branch, delete after stable | -~550 |

## WebGL2 requirement

The pipeline targets WebGL2. The existing CPU path remains the WebGL1 fallback.
`isWebGL2Supported()` is exported for the panel to gate the toggle UI.

## Non-goals

- Non-cel styles (pencil, blueprint, oil, watercolor, etc.) continue to run
  through the existing `applyStyleFilter` switch. This module only owns the
  cel-family path.
- Inverted-hull outline shells remain in scene (added by `applyCelShading`).
  Screen-space outline is an open question (see PART 5 Q5 of the proposal).
