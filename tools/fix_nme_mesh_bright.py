#!/usr/bin/env python3
import os

ROOT = '/workspaces/spx3dmesh2'

# ── 1. Node Material Editor — make SVG canvas fill available space ────────────
pro_dark_path = ROOT + '/src/styles/pro-dark.css'
pro_dark = open(pro_dark_path).read()

NME_SVG_FIX = """
/* ── Node Material Editor — SVG canvas fills container ── */
.nme-overlay {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  background: #0d1117 !important;
  overflow: hidden !important;
  top: auto !important; left: auto !important;
  right: auto !important; bottom: auto !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
}

/* Header row — keep compact */
.nme-header {
  flex-shrink: 0 !important;
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  padding: 6px 10px !important;
  gap: 4px !important;
  background: #0a0d13 !important;
  border-bottom: 1px solid #21262d !important;
}

/* SVG canvas — fill remaining space */
.nme-svg {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  overflow: visible !important;
}

/* Node graph area wrapper */
.nme-graph,
.nme-canvas,
.nme-body {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
  position: relative !important;
}
"""

# Replace or add
if '.nme-overlay {' in pro_dark:
    import re
    pro_dark = re.sub(
        r'/\* ── Node Material Editor.*?\.nme-body \{[^}]*\}',
        NME_SVG_FIX.strip(),
        pro_dark, flags=re.DOTALL
    )
    if '.nme-body' not in pro_dark:
        pro_dark += '\n' + NME_SVG_FIX
else:
    pro_dark += '\n' + NME_SVG_FIX

open(pro_dark_path, 'w').write(pro_dark)
print('✓ Node Material Editor: SVG canvas fill fixed')

# ── 2. Mesh Script viewport brightness — stronger filter ─────────────────────
layout_path = ROOT + '/src/styles/spx-app-layout.css'
layout = open(layout_path).read()

# Update brightness filter to be stronger
layout = layout.replace(
    'filter: brightness(1.4) contrast(1.1) !important;',
    'filter: brightness(2.0) contrast(1.2) saturate(1.1) !important;'
)

# Also add a direct rule for the LiveViewportMirror canvas
if 'LiveViewportMirror' not in layout:
    layout += """
/* LiveViewportMirror — brighter canvas rendering */
.live-viewport-mirror canvas,
[data-viewport-mirror] canvas {
  filter: brightness(2.0) contrast(1.2) !important;
}
"""

open(layout_path, 'w').write(layout)
print('✓ Mesh Script: viewport brightness increased to 2.0')

# ── 3. Also update LiveViewportMirror in App.jsx to add a class ──────────────
app_path = ROOT + '/src/App.jsx'
app = open(app_path).read()
orig = app

# Add data attribute to the canvas for targeting
app = app.replace(
    "<canvas ref={canvasRef} style={{flex:1,width:'100%',display:'block',minHeight:0}} />",
    "<canvas ref={canvasRef} data-viewport-mirror=\"true\" style={{flex:1,width:'100%',display:'block',minHeight:0,filter:'brightness(1.8) contrast(1.1)'}} />"
)

if app != orig:
    open(app_path, 'w').write(app)
    print('✓ App.jsx: LiveViewportMirror canvas brightness inline style added')

print('\nRun: git add -A && git commit -m "fix: NodeMat SVG fills canvas, MeshScript brighter viewport" && git push')
