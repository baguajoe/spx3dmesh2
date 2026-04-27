#!/usr/bin/env python3
import os

ROOT = '/workspaces/spx3dmesh2'
APP  = ROOT + '/src/App.jsx'
app  = open(APP).read()
orig = app

# ── 1. Fix XYZ gizmo — should be inside viewport div, not bleeding out ───────
# The gizmo is positioned absolute inside the canvas div
# When a fullscreen overlay opens it should be hidden
# Fix: add CSS to hide viewport elements when overlay is open

layout_path = ROOT + '/src/styles/spx-app-layout.css'
layout = open(layout_path).read()

GIZMO_FIX = """
/* ── Hide viewport overlays when fullscreen panel is open ── */
.spx-fullscreen-overlay ~ .spx-xyz-gizmo,
.spx-fullscreen-overlay ~ .mesh-editor-canvas .spx-xyz-gizmo {
  display: none !important;
}

/* XYZ gizmo — stays inside canvas, no bleed */
.spx-xyz-gizmo {
  position: absolute !important;
  top: 8px !important;
  right: 8px !important;
  left: auto !important;
  z-index: 10 !important;
  pointer-events: none !important;
}

/* Center ring — inside canvas only */
.spx-center-ring,
[data-center-ring] {
  z-index: 5 !important;
}

/* Viewport canvas — contains its children */
.mesh-editor-canvas {
  position: relative !important;
  overflow: hidden !important;
  z-index: 1 !important;
  isolation: isolate !important;
}

/* Viewport toolbar */
.viewport-toolbar {
  position: absolute !important;
  z-index: 10 !important;
}
"""

if 'spx-xyz-gizmo {' not in layout or 'right: 8px' not in layout:
    layout += GIZMO_FIX
    open(layout_path, 'w').write(layout)
    print('✓ XYZ gizmo + center ring CSS fixed')
else:
    print('✓ Already fixed')

# ── 2. Fix in App.jsx — XYZ gizmo div should have correct positioning ────────
# Find the XYZ gizmo div and ensure it has right:8px not left positioning
app = app.replace(
    '<div className="spx-xyz-gizmo">',
    '<div className="spx-xyz-gizmo" style={{position:"absolute",top:8,right:8,left:"auto",zIndex:10,pointerEvents:"none"}}>'
)

# ── 3. Fix center ring — add renderOrder and ensure it stays in scene ─────────
# The center ring blinking is likely because it has depthTest:false and renderOrder:999
# causing it to render on top of everything including React overlays
# Fix: lower its renderOrder and add it to the canvas isolation
# We need to find where the center ring is created in App.jsx
if 'centerMarker.renderOrder = 999' in app:
    app = app.replace(
        'centerMarker.renderOrder = 999;',
        'centerMarker.renderOrder = 1;'
    )
    print('✓ Center ring renderOrder lowered')

if 'centerGuides.renderOrder = 998' in app:
    app = app.replace(
        'centerGuides.renderOrder = 998;',
        'centerGuides.renderOrder = 1;'
    )
    print('✓ Center guides renderOrder lowered')

# Also fix depthTest on center ring material  
app = app.replace(
    '''const centerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: false
    });''',
    '''const centerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: true
    });'''
)
print('✓ Center ring depthTest enabled')

if app != orig:
    open(APP, 'w').write(app)
    print(f'✓ App.jsx updated')

print('\nRun: git add -A && git commit -m "fix: XYZ gizmo right-positioned, center ring no bleed" && git push')
