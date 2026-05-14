# 3D→2D Style Panel — Read-Only Bug Audit

Scope: `src/components/pipeline/SPX3DTo2DPanel.jsx` and `src/styles/spx-2d-panel.css`
plus the Electron IPC handlers in `main.js:246-279`. No code changes made.

Files inspected
- `src/components/pipeline/SPX3DTo2DPanel.jsx` (1196 lines)
- `src/styles/spx-2d-panel.css` (293 lines)
- `main.js:246-279` (`render:save-image`, `render:export-video` handlers)

---

## BUG 1 — Inactive style buttons unreadable

**Where**: `src/styles/spx-2d-panel.css:154-171`

Current values for `.s2d-style-btn` (the inactive state):
```css
.s2d-style-btn {
  background: #0d1117 !important;   /* near-black panel bg */
  border: 1px solid #21262d !important;
  color: #666 !important;            /* mid-grey on near-black */
  ...
}
```
Inactive text is `#666` (rgb 102,102,102) on background `#0d1117` (rgb 13,17,23).
Contrast ratio ≈ **3.7:1** — fails WCAG AA for normal text (needs 4.5:1) and is the root of
the user's "faded" complaint. The panel font-size is 10px which makes the issue worse —
small text needs *more* contrast, not less.

`.s2d-style-btn--active` (line 168-171) only changes background to `#111827` and
font-weight to `700`; **it does not override `color`**, so the active button's text is
*also* `#666`. The reason "active is readable" is the colored border and inline
`style={{borderColor:s.color, color:s.color}}` injected in the JSX at line 1143
(`color: s.color` overrides the CSS `#666` for the active state only).

Hover state (`.s2d-style-btn:hover`) brightens to `#ccc` — confirming the design wants
near-white text. The static inactive state was just left at `#666`.

**Recommendation**:
- `color: #b8b8b8` (~9.2:1 contrast, comfortable read at 10px)
- Or align with `.s2d-cat-btn:hover` which uses `#ccc` (~11.6:1)
- Optionally bump font-size from 10px to 11px to match button density

**Severity**: DEMO RISK — first thing reviewers see in the styled-pane workflow.
**Complexity**: S (1-line CSS change).
**Files**: `src/styles/spx-2d-panel.css` only.
**Depends on**: none.

---

## BUG 2 — Clicking a style does NOT auto-render

**Where**: `SPX3DTo2DPanel.jsx:1140-1145`

```jsx
{filtered.map(s => (
  <button key={s.id}
    className={"s2d-style-btn" + (activeStyle===s.id ? " s2d-style-btn--active" : "")}
    style={activeStyle===s.id ? {borderColor:s.color, color:s.color} : {}}
    onClick={() => setActiveStyle(s.id)}>{s.label}</button>
))}
```

`onClick` only sets state. `handleRender` (line 927-944) is bound exclusively to the
green RENDER button at line 1114. Nothing else triggers it.

**Recommendation** — pick one:

**Option A (cleanest, idiomatic React)**: useEffect on `activeStyle` change.
```js
useEffect(() => {
  if (!open) return;
  if (!rendererRef?.current) return;
  handleRender();
}, [activeStyle, open]);
```
- Pro: separates concerns, also catches future programmatic style changes
- Con: also fires on `open` first-mount. If a default `cinematic` style is chosen but
  the user hasn't loaded a mesh yet, a "⚠ No renderer" status flashes. Mitigate by
  guarding on `rendererRef?.current` (which `handleRender` already does).
- Con: `handleRender` reference identity changes via useCallback when its deps change —
  add it to the effect's dep array OR ref-pin it.

**Option B (simplest)**: chain into onClick.
```jsx
onClick={() => { setActiveStyle(s.id); handleRender(); }}
```
- Bug: `handleRender` reads `activeStyle` via closure-captured `captureAndProcess`. The
  React state update is async — `handleRender` would render with the *previous*
  `activeStyle`. You'd need to pass the new id explicitly down to `captureAndProcess`,
  refactoring the API. Not as clean.

**Recommended: Option A.** Keep `handleRender` unchanged; let useEffect see the new
`activeStyle` after the render commits.

Note: the existing `mirror` rAF effect at line 830-848 mirrors the *raw* viewport every
frame regardless. Adding a useEffect on `activeStyle` only triggers the styled-output
canvas update — perfect.

**Severity**: BLOCKER — single biggest UX papercut. The panel's whole point is "click
style, see result"; users currently have to do 2 clicks per style.
**Complexity**: S (5 lines + a guard).
**Files**: `SPX3DTo2DPanel.jsx` only.
**Depends on**: none. (Fixes for Bug 1, Bug 6 do NOT block this.)

---

## BUG 3 — No way to clear the rendered preview

**Where**: render button JSX at `SPX3DTo2DPanel.jsx:1113-1124`

```jsx
<div className="s2d-output-actions">
  <button className="s2d-btn s2d-btn--render" onClick={handleRender} disabled={rendering}>
    {rendering ? '⏳ RENDERING...' : '▶ RENDER'}
  </button>
  <select className="s2d-select" value={exportFormat} ...>
  <button className="s2d-btn s2d-btn--export" onClick={handleExportBrowser}>⬇ SAVE</button>
</div>
```

The `previewRef` canvas (line 1111) keeps whatever pixels were last drawn into it via
`previewRef.current.getContext('2d').drawImage(...)` at line 939. There is no clear
function and no "select a style" empty state UI element.

**Recommendation — minimum viable Clear button**:
- Sit a "✕ CLEAR" button immediately right of `▶ RENDER` in the existing
  `.s2d-output-actions` row. Same row keeps it discoverable next to the action that
  produced the preview.
- Handler:
  ```js
  const handleClear = () => {
    if (previewRef.current) {
      const c = previewRef.current;
      c.getContext('2d').clearRect(0, 0, c.width, c.height);
    }
    prevFrameRef.current = null;        // reset temporal blend buffer (line 822)
    setStatus('Select a style and click Render');  // matches initial status (line 819)
    // NOTE: do NOT reset activeStyle — user's style choice is independent of preview
  };
  ```
- Disable when there's nothing to clear (track a `hasRendered` boolean, or inspect
  canvas pixels — first option is simpler).

**Subtle interaction**: `prevFrameRef` (line 822) accumulates a temporal blend across
renders. Without resetting it, "Clear → Render new style" would still ghost-blend the
prior style's last frame at 35% alpha. Clearing it fixes that.

**Severity**: NICE TO HAVE — workaround is "click another style and render".
**Complexity**: S (button + 6-line handler).
**Files**: `SPX3DTo2DPanel.jsx` only.
**Depends on**: ideally Bug 6 lands first if you go to live-preview, since "clear" then
means "stop the live loop". With current static preview, Clear is just `clearRect`.

---

## BUG 4 — EXPORT VIDEO appears broken

**Where**: `handleVideoExport` at `SPX3DTo2DPanel.jsx:989-1020`

End-to-end trace:

| Step | Code | What happens |
|---|---|---|
| 1. Capture loop | `for (let i = 0; i < FRAMES; i++)` — `FRAMES = 60` (line 992) | Captures 60 frames |
| 2. NPR setup | `applyNPRIfNeeded(activeStyle, sceneRef)` (line 997) | **Re-applied each frame** — replaces every mesh's material with a fresh `createToonMaterial` and re-adds outlines on every iteration. 60× material churn during export. |
| 3. Capture | `captureAndProcess(1)` (line 998) | `renderer.render(scene, camera)` then `applyStyleFilter` (line 902-918) |
| 4. Encode pixels | `out.toDataURL('image/jpeg', 0.9)` (line 1000) | Each frame becomes a base64 string in JS memory. 60 strings ≈ tens of MB. |
| 5. Wait | `await new Promise(r => setTimeout(r, 16))` (line 1002) | ~16ms yield — lets the `animate` rAF in App.jsx tick once, advancing the mixer. |
| 6. Send to Electron | `await window.electronAPI.invoke('render:export-video', {frames, fps:24, style})` (line 1007-1011) | All 60 frames sent over IPC at once. |
| 7. Encode | `main.js:257-279` writes JPEGs to tmpdir, shells out to system `ffmpeg` | **FFmpeg must be on `$PATH`**. If not, returns `{ok: false, error: 'FFmpeg not found...'}`. |
| 8. Browser fallback | `setStatus('✓ ${frames.length} frames captured (FFmpeg requires desktop app)')` (line 1017) | **Browser users get NO download** — frames are captured, JPEGs sit in JS memory, then the variable goes out of scope and is GC'd. |

### Likely failure points (most → least probable)

1. **Browser mode silent failure** (line 1016-1018): Most browser users will perceive
   this as "broken". The button finishes with a status message but no file appears.
   This is by design but undocumented. Not a bug per se, but UX is misleading.

2. **FFmpeg not installed on host** (`main.js:271-274`): In Electron mode, if the user's
   system doesn't have `ffmpeg` binary, `execSync` throws and the IPC returns
   `{ok: false, error: '...'}`. The frontend reads `result?.outputPath` (line 1012) —
   when ok is false, outputPath is undefined, so it sets the cheerful "✓ Video exported"
   fallback even on failure. **Status message is misleading on FFmpeg-missing systems.**

3. **Animation-mismatch slow motion** (CRITICAL post-Fix 3 interaction):
   - The capture loop yields 16ms per iteration via `setTimeout(16)`.
   - The mixer's wall-clock advance during 60×16ms = 960ms of real time.
   - But frames are encoded as 24fps → 60 frames / 24fps = 2.5 seconds of playback.
   - **Result: exported MP4 plays animation in ~38% real-time speed** (slow motion).
   - Fix would require driving `mixer.setTime(i / fps)` per iteration to capture exact
     frames spaced 1/fps apart, NOT relying on wall-clock advance during setTimeout.
   - This bug existed before Fix 3 but wasn't observable because mixer wasn't running.
     Now that mixer runs, the speed mismatch becomes visible to the user.

4. **JSON over IPC payload size**: 60 JPEGs at 0.9 quality, 1080p, base64-encoded ≈
   30-60 MB. Single `ipcRenderer.invoke` call must serialize all of it. Electron will
   handle it but slowly; large enough to look hung for 1-3 seconds before main process
   responds.

5. **NPR re-application** (line 997, also lines 933, 960, 1036): `applyNPRIfNeeded`
   replaces materials on every traversal. If the user later closes the panel, meshes
   remain with toon materials and outlines — **leaks toon state into the rest of the
   editor.** No restoration code anywhere. Visible bug if user goes 3D→2D → back to
   modeling: meshes look toon-shaded.

6. **No error swallowing**, but no aggregate error reporting either: try/catch around
   the IPC call (line 1006-1015) catches FFmpeg errors and surfaces them; the capture
   loop has no try/catch, so a `captureAndProcess` exception (e.g., context loss) would
   leave `setExporting(true)` and break the button forever until panel re-mount.

### Summary
- **In-browser users: broken** (no file output at all).
- **Electron users without FFmpeg: broken** (IPC returns error, but UI says "✓ Video exported").
- **Electron users with FFmpeg: works, but at ~0.4× speed** post-mixer-fix.

**Severity**: BLOCKER — one of the core export paths and reportedly the user's pain point.
**Complexity**: M (browser fallback via mp4-muxer or canvas→GIF; OR ship-with-FFmpeg detection;
plus `mixer.setTime` per-frame; plus correct error status). Could stretch to L if you
also fix the material-leak side effect.
**Files**: `SPX3DTo2DPanel.jsx`, `main.js` (ipc handler error-path), maybe a new
browser-side encoder dep.
**Depends on**: nothing blocks this; but Bug 6 (live preview) shares the per-frame
mixer-time-driven pattern, so fixing them together is natural.

---

## BUG 5 — EXPORT VIDEO has no options dialog

Currently hardcoded values for `handleVideoExport` (`SPX3DTo2DPanel.jsx:989-1020`):

| Setting | Hardcoded at | Value |
|---|---|---|
| Frame count | line 992 | `60` |
| Frame format | line 1000 | `'image/jpeg', 0.9` (jpeg, 90% quality) |
| FPS | line 1009 | `24` |
| Container | `main.js:271` | MP4 (`-c:v libx264 -pix_fmt yuv420p`) |
| Resolution | `captureAndProcess(1)` line 998 | renderer's native size, no scaling |
| Output filename | `main.js:269` | `spx_${style}_${Date.now()}.mp4` (random timestamp) |
| Output location | `main.js:269` | always `os.homedir()` (no chooser) |
| Crf/quality | `main.js:271` | not specified — FFmpeg default 23 |
| Cancel | none | no AbortController, no UI-side stop |

To make these configurable, you'd need:

**State** (add to component, ~line 815-820):
```js
const [exportOpts, setExportOpts] = useState({
  format: 'mp4',           // mp4 | webm | gif | png_seq
  width: 1920, height: 1080,
  fps: 30,
  duration: 60,            // frames OR seconds (toggle)
  durationMode: 'frames',  // 'frames' | 'seconds' | 'loop' | 'range'
  loopCount: 2,
  startFrame: 0, endFrame: 60,
  filename: `spx_${activeStyle}`,
  saveDir: '',             // electron only, default ~/Movies
  quality: 80,             // 0-100 for jpeg/webp/h264 crf-mapped
});
const [showExportDialog, setShowExportDialog] = useState(false);
const [exportProgress, setExportProgress] = useState({ current: 0, total: 60, cancelled: false });
const exportAbortRef = useRef(false);
```

**New modal component** (could be inline `<div className="s2d-export-modal">…</div>`
gated on `showExportDialog`). Fields:
- `<select>` for format
- two `<input type="number">` or preset chips for resolution
- `<select>` for fps (24/30/60)
- duration mode tabs + per-mode inputs
- `<input>` for filename
- "Choose location…" button → `window.electronAPI.invoke('render:choose-folder')` (new IPC handler)
- `<input type="range">` for quality
- progress bar `<progress value={progress.current} max={progress.total}>` (only during export)
- "Cancel" button setting `exportAbortRef.current = true`

**Handler refactor** — `handleVideoExport` becomes "open dialog"; new
`handleVideoExportConfirm(opts)` does the actual capture, parameterized by `opts`.
Inside the loop: `if (exportAbortRef.current) break;`

**Server-side IPC additions** (`main.js`):
- `render:choose-folder` → `dialog.showOpenDialog({properties:['openDirectory']})`
- `render:export-video` accept `width`, `height`, `fps`, `crf`, `outputDir`, `outputName`,
  `format` (mp4/webm) and pass through to FFmpeg flags
- Add a streaming variant if you want progress on the encode (currently it's all-or-nothing
  via execSync).

**Severity**: NICE TO HAVE for a working demo, BLOCKER for "production-ready video tool".
The Techstars demo can ship with hardcoded 60 frames @ 24fps if it actually *works*.
**Complexity**: M (modal + state + parameterized IPC call) or L (also full filename/location
chooser, real progress reporting via streaming).
**Files**: `SPX3DTo2DPanel.jsx`, `main.js`, possibly new CSS for the modal.
**Depends on**: Bug 4 should be solid first — no point making the broken export
configurable. Tackle Bug 4 (correctness) → then Bug 5 (configurability).

---

## BUG 6 — No live styled preview with playback

**Where**: `SPX3DTo2DPanel.jsx:830-848` (live raw mirror) and `1110-1112` (static
styled preview).

Current architecture:

```
3D scene (App.jsx)
   │
   │ rAF tick (60Hz)
   ▼
renderer.domElement (single canvas, owned by App.jsx)
   │
   │ ── panel rAF reads it (line 832-846), drawImage to liveRef ──▶ LEFT pane (live raw)
   │
   │ ── handleRender click ─▶ captureAndProcess ─▶ applyStyleFilter ─▶ drawImage to previewRef ──▶ CENTER pane (one-shot styled)
```

The middle pane is single-shot. There's no rAF loop styling each frame, no playback
controls under it, no link to the timeline state.

What's needed for "right pane mirrors left pane in real-time, with chosen style applied":

**Architecture change**:
```
existing rAF in panel (line 832-846)
   │
   │ already draws to liveRef
   ▼
NEW: same rAF tick also calls captureAndProcess (or a lighter version)
     and drawImage(out, ...) into previewRef
```

Or a separate rAF loop driven by an `enableLivePreview` toggle:
```js
const livePreviewRef = useRef(null);
useEffect(() => {
  if (!livePreview || !open) return;
  let raf;
  const tick = () => {
    const out = captureAndProcess(0.5);  // half-res preview
    if (out && previewRef.current) {
      const c = previewRef.current;
      c.getContext('2d').drawImage(out, 0, 0, c.width, c.height);
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, [livePreview, open, captureAndProcess]);
```

**Performance considerations**

`applyStyleFilter` is per-pixel JavaScript (no GPU). At 1920×1080 = 2.07M pixels,
each filter is one or more passes through `id.data` (8.3M bytes). Rough cost on a
modern laptop:
- Simple filters (`film_noir`, `vintage_film`, single pass mul/add): ~5-15ms / frame
- Multi-pass + paper overlay (`watercolor`, `oil`): ~30-80ms / frame
- Edge-detection passes (`pencil`, `ink_wash`, `charcoal`): ~25-50ms / frame
- Heavy stochastic (`impressionist` with 6px random sampling, `risograph` with two
  plates and offset blend): ~60-120ms / frame

At 24fps target you have a 41ms budget. **Half the styles can't keep up at 1080p.**

Throttling options (in priority order):
1. **Half-resolution preview canvas**: pass `0.5` to `captureAndProcess`, halves pixel
   count to ~520k → 4× speed-up → most styles fit in budget.
2. **Throttle to 12fps for preview**: skip every other rAF tick. User-facing animation
   smoothness drops but stays "live".
3. **Skip filter pass when activeStyle hasn't changed AND viewport hasn't changed**:
   diff-based, complex.
4. **Move filters to GLSL fragment shaders**: would solve the perf issue completely
   but is a multi-day rewrite — out of scope for an audit-driven fix.
5. **Web Worker offload**: marginal — `getImageData`/`putImageData` are main-thread
   APIs and the data transfer cost is real.

**Playback controls under the preview**: the timeline already exists in the main editor
(`AnimationTimeline` mounted at App.jsx:5018). Adding a duplicate inside the panel
would compete for `currentFrame` state ownership. Two cleaner options:
- **Don't add controls to the panel.** Tell users to use the main timeline; the
  styled preview will follow because it reads the same scene state via the renderer.
- **Add a thin "synced with timeline" indicator + scrub bar** that reads `currentFrame`
  via a prop and dispatches `setCurrentFrame` via callback. Requires plumbing those
  through `<SPX3DTo2DPanel>` props (currently only takes `sceneRef, rendererRef, cameraRef`).

**Subtle correctness note (post Fix 3)**: the panel's existing mirror loop at line 832-846
calls `renderer.render(scene, camera)` itself. Now that App.jsx's animate also calls
`renderer.render`, you have **two renders per rAF tick**. The mixer state advances only
once (in App.jsx's animate), but pixels get drawn twice. Wasteful but not broken. Worth
flagging in the live-preview rewrite — better to read pixels off the renderer's existing
backbuffer than to call render again.

**Severity**: NICE TO HAVE — the static "click style → render" flow is acceptable for a
demo. Live preview is the "wow" feature.
**Complexity**: M (basic live loop + half-res throttle); L (filter optimization, GLSL
ports for the heavy ones).
**Files**: `SPX3DTo2DPanel.jsx` (mostly); CSS small additions.
**Depends on**: Bug 4 (`captureAndProcess` is the same hot path as export — same mixer-
sync concerns), Bug 2 (auto-render becomes redundant once preview is live), Bug 3 (Clear
also stops the live loop).

---

## SUMMARY

### Recommended fix order

1. **Bug 1 (CSS contrast)** — 5-min CSS edit. Independent, immediate readability win.
2. **Bug 2 (auto-render on style click)** — Single useEffect. Removes the panel's worst
   UX papercut. Independent of all others.
3. **Bug 4 (export video correctness)** — Browser fallback + FFmpeg-missing status fix
   + mixer.setTime per-frame. Without this, the rest of the export work is built on
   sand.
4. **Bug 6 (live styled preview)** — Once Bug 4 is solid, the same `captureAndProcess`
   pattern flips into a rAF tick. Half-res preview keeps perf reasonable. Auto-render
   from Bug 2 becomes redundant — switch the activeStyle effect to enable live mode
   instead of one-shot render.
5. **Bug 3 (clear button)** — Trivial *after* Bug 6 lands, because Clear semantics shift
   from "wipe canvas" to "stop live loop AND wipe canvas". Build it last so you only
   write the handler once.
6. **Bug 5 (export options dialog)** — Configurable wrapper around now-correct Bug 4.
   Last because it's UI breadth on top of fixed core.

### Parallelism

- **Bug 1, Bug 2, Bug 3** can be done in parallel by separate hands (different sub-areas
  of the file, no overlap).
- **Bug 4 + Bug 6** are tightly coupled (share `captureAndProcess`, share mixer-sync
  concerns) — same hand, sequential.
- **Bug 5** depends on Bug 4 being correct. Could be parallelized with Bug 6 by a
  different hand once Bug 4 lands.

### Minimum viable for Techstars-quality demo

| Bug | Demo-required? | Why |
|---|---|---|
| Bug 1 | **YES** | First-impression readability |
| Bug 2 | **YES** | "Click style, see effect" is the panel's pitch — broken without this |
| Bug 3 | no | Workaround: click another style |
| Bug 4 | **YES** | Export Video is a headline feature; must produce a file |
| Bug 5 | no | Hardcoded 60-frame MP4 acceptable if it works |
| Bug 6 | **STRETCH** | Killer demo feature ("watch it animate stylized in real-time"), but static preview is defensible if Bug 2 lands |

**Demo-floor**: Bugs 1, 2, 4 must ship. Total estimate: **~3-4 hours.**

### Total estimated time, all 6 bugs

| Bug | Estimate | Cumulative |
|---|---|---|
| 1 | 15 min | 0:15 |
| 2 | 30 min | 0:45 |
| 3 | 30 min | 1:15 |
| 4 | 2-3 hr | 3:15 - 4:15 |
| 5 | 2-3 hr | 5:15 - 7:15 |
| 6 | 2-3 hr | 7:15 - 10:15 |

**Total: 7-10 hours of focused work.** Single dev, one full day with overflow.

### Cross-cutting issue worth a future audit pass

`applyNPRIfNeeded` (lines 851-894) replaces every mesh's material globally on the scene
when a toon-family style is rendered. There is **no restoration path** — closing the
panel leaves meshes with toon materials & outlines bleeding into the rest of the editor.
Not in scope for the 6 bugs above, but if the user has noticed "my ybot looks wrong
after I open the 3D→2D panel and close it", this is the cause. Worth a follow-up
ticket: snapshot original materials on panel-open or before NPR application, restore on
panel-close.
