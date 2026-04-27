#!/usr/bin/env python3
import os, subprocess

ROOT = '/workspaces/spx3dmesh2'

# Find where viewport-toolbar / quad button CSS is defined
result = subprocess.run(['grep', '-rn', 'viewport-toolbar\|quad-toggle-btn', ROOT+'/src/styles'], capture_output=True, text=True)
print(result.stdout[:2000])

# Fix: ensure the viewport toolbar has z-index lower than 2000
CSS_FIX = """
/* ── Quad/viewport toolbar must stay BELOW fullscreen overlays ── */
.viewport-toolbar {
  z-index: 10 !important;
}
.quad-toggle-btn {
  z-index: 10 !important;
}
/* Ensure canvas wrapper doesn't bleed through */
.mesh-editor-canvas {
  z-index: 1;
}
"""

target = ROOT + '/src/styles/spx-app-layout.css'
content = open(target).read()
if 'viewport-toolbar' not in content or 'z-index: 10' not in content:
    content += '\n' + CSS_FIX
    open(target, 'w').write(content)
    print('✓ Fixed viewport-toolbar z-index')
else:
    print('✓ Already fixed')

print('\nRun: git add -A && git commit -m "fix: viewport toolbar z-index below fullscreen overlay" && git push')
