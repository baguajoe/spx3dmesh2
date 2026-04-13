#!/usr/bin/env python3
"""
Fixes UV Editor, Node Material Editor, AnimGraph, MeshScript to fill fullscreen.
The panels have internal position:fixed/absolute that fights the overlay.
Solution: force their root elements to fill 100% of the overlay body.
"""
import os, re, subprocess

ROOT = '/workspaces/spx3dmesh2'

# ── 1. CSS — force all fullscreen panel roots to fill overlay ─────────────────
layout_path = ROOT + '/src/styles/spx-app-layout.css'
layout = open(layout_path).read()

FILL_CSS = """
/* ══ Force all fullscreen panel roots to fill overlay body ══════════════════ */

/* Overlay body: no padding, flex column, fills remaining space */
.spx-overlay-body {
  flex: 1 1 auto !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* Every direct child of overlay-body fills it completely */
.spx-overlay-body > div,
.spx-overlay-body > section,
.spx-overlay-body > canvas {
  flex: 1 1 auto !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  min-width: 0 !important;
  position: relative !important;
  overflow: hidden !important;
}

/* UV Editor specific — override its internal fixed positioning */
.uv-editor-panel,
.uv-editor-root,
[class*="uv-editor"],
[class*="UVEditor"] {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
  max-width: none !important;
  max-height: none !important;
}

/* Node Material Editor specific */
.node-mat-panel,
.node-material-root,
.nme-root,
[class*="node-material"],
[class*="NodeMaterial"] {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
  max-width: none !important;
  max-height: none !important;
}

/* AnimGraph panel */
.anim-graph-root,
[class*="anim-graph"],
[class*="AnimGraph"] {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
}

/* MeshScript panel */
.mesh-script-root,
[class*="mesh-script"],
[class*="MeshScript"] {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
}

/* Split layout for panels that want left viewport + right content */
.spx-split-layout {
  display: flex !important;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
}

.spx-split-viewport {
  flex: 1 1 0 !important;
  min-width: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  border-right: 1px solid #21262d !important;
  overflow: hidden !important;
  background: #060a10 !important;
}

.spx-split-viewport-label {
  font-size: 9px !important;
  font-weight: 700 !important;
  color: #444 !important;
  letter-spacing: 1.5px !important;
  padding: 6px 10px !important;
  background: #0a0d13 !important;
  border-bottom: 1px solid #21262d !important;
  flex-shrink: 0 !important;
  text-transform: uppercase !important;
}

.spx-split-viewport-canvas {
  flex: 1 1 auto !important;
  width: 100% !important;
  display: block !important;
  background: #060a10 !important;
  min-height: 0 !important;
}

.spx-split-panel {
  width: 500px !important;
  flex-shrink: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  background: #0d1117 !important;
}

/* Overlay header */
.spx-overlay-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 8px 16px !important;
  background: #0a0d13 !important;
  border-bottom: 1px solid #21262d !important;
  flex-shrink: 0 !important;
  height: 44px !important;
}
.spx-overlay-title {
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #00ffc8 !important;
  letter-spacing: 1.5px !important;
  font-family: 'JetBrains Mono', monospace !important;
}
.spx-overlay-close {
  background: #1a1a2a !important;
  border: 1px solid #2a2a4a !important;
  color: #888 !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  padding: 5px 14px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  transition: all 0.15s !important;
  letter-spacing: 0.5px !important;
}
.spx-overlay-close:hover {
  background: #ff444422 !important;
  border-color: #ff4444 !important;
  color: #ff4444 !important;
}

/* Quad/viewport toolbar stays below overlays */
.viewport-toolbar { z-index: 10 !important; position: absolute !important; }
.quad-toggle-btn  { z-index: 10 !important; }
"""

# Replace or append
if 'spx-overlay-body > div' not in layout:
    # Remove old partial overlay-body definition and replace
    layout = re.sub(
        r'/\* Prevent viewport UI.*?\.quad-toggle-btn\s*\{[^}]*\}',
        '',
        layout,
        flags=re.DOTALL
    )
    layout += FILL_CSS
    open(layout_path, 'w').write(layout)
    print('✓ spx-app-layout.css: comprehensive fullscreen fill CSS added')
else:
    # Update
    layout = re.sub(
        r'/\* ══ Force all fullscreen.*?\.quad-toggle-btn\s*\{[^}]*\}',
        FILL_CSS.strip(),
        layout,
        flags=re.DOTALL
    )
    open(layout_path, 'w').write(layout)
    print('✓ spx-app-layout.css: updated')

# ── 2. Check what CSS classes UV Editor and Node Mat actually use ─────────────
uv_path   = ROOT + '/src/components/uv/UVEditorPanel.jsx'
node_path = ROOT + '/src/components/panels/NodeMaterialEditor.jsx'

for label, path in [('UVEditorPanel', uv_path), ('NodeMaterialEditor', node_path)]:
    if os.path.exists(path):
        content = open(path).read()
        # Find root className
        root_classes = re.findall(r'className=["\']([^"\']+)["\']', content)[:5]
        position_fixed = 'position.*fixed' in content or "'fixed'" in content or '"fixed"' in content
        print(f'\n{label}:')
        print(f'  Root classes: {root_classes[:3]}')
        print(f'  Has position:fixed: {position_fixed}')
        print(f'  Size: {len(content)//1024}KB')
        
        # If it has position:fixed in CSS or inline, patch it
        if position_fixed:
            content_new = re.sub(r"position:\s*['\"]?fixed['\"]?", "position: 'relative'", content)
            content_new = re.sub(r'position:\s*"fixed"', 'position: "relative"', content_new)
            content_new = re.sub(r"position:\s*'fixed'", "position: 'relative'", content_new)
            if content_new != content:
                open(path, 'w').write(content_new)
                print(f'  ✓ Fixed position:fixed → relative')

# ── 3. App.jsx — pass rendererRef to AnimGraph + MeshScript ──────────────────
app_path = ROOT + '/src/App.jsx'
app = open(app_path).read()
orig = app

# AnimGraph
old = '<AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} />'
new = '<AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} />'
if old in app:
    app = app.replace(old, new)
    print('\n✓ AnimGraphPanel: rendererRef added')

# MeshScript  
old2 = '<MeshScriptPanel open={meshScriptOpen} onClose={() => setMeshScriptOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />'
new2 = '<MeshScriptPanel open={meshScriptOpen} onClose={() => setMeshScriptOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />'
if old2 in app:
    app = app.replace(old2, new2)
    print('✓ MeshScriptPanel: rendererRef added')

if app != orig:
    open(app_path, 'w').write(app)

# ── 4. AnimGraphPanel — inject viewport mirror + split layout ─────────────────
anim_path = ROOT + '/src/components/panels/AnimGraphPanel.jsx'
if os.path.exists(anim_path):
    anim = open(anim_path).read()
    if 'spx-split-layout' not in anim:
        # Add useRef/useEffect imports
        anim = re.sub(
            r"import React(.*?)from ['\"]react['\"]",
            "import React, { useRef, useEffect } from 'react'",
            anim, count=1
        )
        # Add rendererRef to destructured props
        anim = re.sub(
            r'(export default function AnimGraphPanel|function AnimGraphPanel)\(\s*\{([^}]*)\}',
            lambda m: f'{m.group(1)}({{ {m.group(2).strip()}, rendererRef }}',
            anim, count=1
        )
        # Add mirror hook before return
        MIRROR = """
  const _liveRef = useRef(null);
  const _mirrorAF = useRef(null);
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const src = rendererRef?.current?.domElement;
      const dst = _liveRef.current;
      if (src && dst && dst.offsetWidth > 0) {
        dst.width = dst.offsetWidth; dst.height = dst.offsetHeight;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      _mirrorAF.current = requestAnimationFrame(tick);
    };
    _mirrorAF.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(_mirrorAF.current);
  }, [open, rendererRef]);
"""
        # Find first return statement in component and add before it
        # Wrap return with split layout
        anim = re.sub(
            r'(  if \(!open\) return null;\n)',
            MIRROR + r'\1',
            anim, count=1
        )
        # Wrap the JSX return
        anim = re.sub(
            r'(  return \()\n(\s*)(<)',
            r'\1\n\2<div className="spx-split-layout">\n\2  <div className="spx-split-viewport">\n\2    <div className="spx-split-viewport-label">3D SCENE — LIVE</div>\n\2    <canvas ref={_liveRef} className="spx-split-viewport-canvas" />\n\2  </div>\n\2  <div className="spx-split-panel">\n\2  \3',
            anim, count=1
        )
        # Close the wrappers before the final );
        anim = re.sub(
            r'(\n  \);?\n\}?\s*)$',
            '\n  </div>\n  </div>\n  );\n}\n',
            anim, count=1
        )
        open(anim_path, 'w').write(anim)
        print('✓ AnimGraphPanel: split layout injected')
    else:
        print('✓ AnimGraphPanel: already has split layout')

# ── 5. MeshScriptPanel — inject viewport mirror + split layout ────────────────
mesh_path = ROOT + '/src/components/panels/MeshScriptPanel.jsx'
if os.path.exists(mesh_path):
    mesh = open(mesh_path).read()
    if 'spx-split-layout' not in mesh:
        mesh = re.sub(
            r"import React(.*?)from ['\"]react['\"]",
            "import React, { useRef, useEffect } from 'react'",
            mesh, count=1
        )
        mesh = re.sub(
            r'(export default function MeshScriptPanel|function MeshScriptPanel)\(\s*\{([^}]*)\}',
            lambda m: f'{m.group(1)}({{ {m.group(2).strip()}, rendererRef }}',
            mesh, count=1
        )
        MIRROR2 = """
  const _liveRef2 = useRef(null);
  const _mirrorAF2 = useRef(null);
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const src = rendererRef?.current?.domElement;
      const dst = _liveRef2.current;
      if (src && dst && dst.offsetWidth > 0) {
        dst.width = dst.offsetWidth; dst.height = dst.offsetHeight;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      _mirrorAF2.current = requestAnimationFrame(tick);
    };
    _mirrorAF2.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(_mirrorAF2.current);
  }, [open, rendererRef]);
"""
        mesh = re.sub(
            r'(  if \(!open\) return null;\n)',
            MIRROR2 + r'\1',
            mesh, count=1
        )
        mesh = re.sub(
            r'(  return \()\n(\s*)(<)',
            r'\1\n\2<div className="spx-split-layout">\n\2  <div className="spx-split-viewport">\n\2    <div className="spx-split-viewport-label">3D SCENE — SCRIPT OUTPUT</div>\n\2    <canvas ref={_liveRef2} className="spx-split-viewport-canvas" />\n\2  </div>\n\2  <div className="spx-split-panel">\n\2  \3',
            mesh, count=1
        )
        mesh = re.sub(
            r'(\n  \);?\n\}?\s*)$',
            '\n  </div>\n  </div>\n  );\n}\n',
            mesh, count=1
        )
        open(mesh_path, 'w').write(mesh)
        print('✓ MeshScriptPanel: split layout injected')
    else:
        print('✓ MeshScriptPanel: already has split layout')

# ── 6. Performance panel CSS ──────────────────────────────────────────────────
pro_dark_path = ROOT + '/src/styles/pro-dark.css'
pro_dark = open(pro_dark_path).read()

PERF_CSS = """
/* ══ SPX Performance Capture Panel ══════════════════════════════════════════ */
.spx-perf-root {
  background: #0d1117 !important; color: #ccc !important;
  font-family: 'JetBrains Mono', monospace !important; font-size: 11px !important;
  height: 100% !important; display: flex !important; flex-direction: column !important;
  overflow: hidden !important;
}
.spx-perf-tabs {
  display: flex !important; gap: 2px !important; padding: 8px 12px 0 !important;
  background: #0a0d13 !important; border-bottom: 1px solid #21262d !important; flex-shrink: 0 !important;
}
.spx-perf-tab {
  background: none !important; border: none !important; border-bottom: 2px solid transparent !important;
  color: #555 !important; font-family: inherit !important; font-size: 11px !important;
  font-weight: 700 !important; padding: 6px 14px !important; cursor: pointer !important;
  letter-spacing: 0.5px !important; transition: all 0.15s !important;
}
.spx-perf-tab:hover { color: #888 !important; }
.spx-perf-tab--active { color: #00ffc8 !important; border-bottom-color: #00ffc8 !important; }
.spx-perf-body { flex: 1 !important; overflow-y: auto !important; }
.spx-perf-section { border-bottom: 1px solid #21262d !important; }
.spx-perf-section-header {
  display: flex !important; align-items: center !important; justify-content: space-between !important;
  padding: 10px 14px !important; cursor: pointer !important; background: #0a0d13 !important;
  transition: background 0.15s !important;
}
.spx-perf-section-header:hover { background: #0f1520 !important; }
.spx-perf-section-title {
  font-size: 11px !important; font-weight: 700 !important; color: #00ffc8 !important;
  letter-spacing: 1px !important; text-transform: uppercase !important;
}
.spx-perf-section-body { padding: 10px 14px 14px !important; background: #0d1117 !important; }
.spx-perf-import-btn {
  display: inline-flex !important; align-items: center !important; gap: 8px !important;
  background: #003a20 !important; border: 1px solid #00ffc844 !important; color: #00ffc8 !important;
  font-family: inherit !important; font-size: 11px !important; font-weight: 700 !important;
  padding: 8px 16px !important; border-radius: 4px !important; cursor: pointer !important;
  margin-bottom: 8px !important; transition: all 0.15s !important;
}
.spx-perf-import-btn:hover { background: #005a30 !important; border-color: #00ffc8 !important; }
.spx-perf-empty { color: #444 !important; font-size: 10px !important; font-style: italic !important; }
.spx-perf-timeline {
  background: #060a10 !important; border: 1px solid #21262d !important;
  border-radius: 4px !important; height: 60px !important; margin-bottom: 10px !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
}
.spx-perf-transport {
  display: flex !important; gap: 6px !important; align-items: center !important;
  margin-bottom: 8px !important; flex-wrap: wrap !important;
}
.spx-perf-btn {
  padding: 6px 12px !important; border: 1px solid #21262d !important; border-radius: 4px !important;
  background: #0d1117 !important; color: #888 !important; font-family: inherit !important;
  font-size: 10px !important; font-weight: 700 !important; cursor: pointer !important;
  transition: all 0.15s !important;
}
.spx-perf-btn--play { background: #003a20 !important; color: #00ffc8 !important; border-color: #00ffc844 !important; }
.spx-perf-btn--stop { background: #2a0000 !important; color: #ff4444 !important; border-color: #ff444444 !important; }
.spx-perf-btn--active { background: #00ffc822 !important; border-color: #00ffc8 !important; color: #00ffc8 !important; }
"""

if 'spx-perf-root' not in pro_dark:
    pro_dark += '\n' + PERF_CSS
    open(pro_dark_path, 'w').write(pro_dark)
    print('✓ pro-dark.css: Performance panel styles added')
else:
    print('✓ pro-dark.css: Performance styles already present')

print('\nRun: git add -A && git commit -m "fix: UV/NodeMat/AnimGraph/MeshScript fullscreen fill, perf CSS" && git push')
