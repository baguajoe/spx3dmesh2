#!/usr/bin/env python3
import os, re

ROOT = '/workspaces/spx3dmesh2'

# ── 1. Fix Mesh Script viewport brightness via CSS ────────────────────────────
layout_path = ROOT + '/src/styles/spx-app-layout.css'
layout = open(layout_path).read()

BRIGHT_CSS = """
/* Mesh Script viewport — brighter to show grid */
.spx-split-layout .spx-split-viewport,
.live-viewport-mirror {
  background: #0d1117 !important;
}
.live-viewport-mirror canvas {
  opacity: 1 !important;
  filter: brightness(1.4) contrast(1.1) !important;
}
"""

if 'live-viewport-mirror' not in layout:
    layout += BRIGHT_CSS
    open(layout_path, 'w').write(layout)
    print('✓ Brightness CSS added')

# ── 2. UV Editor — remove FloatPanel wrapper directly ────────────────────────
uv_path = ROOT + '/src/components/uv/UVEditorPanel.jsx'
uv = open(uv_path).read()

if '<FloatPanel' in uv:
    # Remove FloatPanel wrapper - keep everything inside
    lines = uv.split('\n')
    new_lines = []
    skip_float_close = False
    float_depth = 0
    
    for i, line in enumerate(lines):
        if '<FloatPanel' in line:
            # Skip this opening line
            float_depth = 1
            continue
        elif float_depth > 0:
            if '</FloatPanel>' in line:
                float_depth -= 1
                if float_depth == 0:
                    continue  # Skip closing FloatPanel tag
            elif '<FloatPanel' in line:
                float_depth += 1
            new_lines.append(line)
        else:
            new_lines.append(line)
    
    uv = '\n'.join(new_lines)
    open(uv_path, 'w').write(uv)
    print('✓ UV Editor: FloatPanel wrapper removed')
else:
    print('✓ UV Editor: no FloatPanel wrapper')

# ── 3. Fix UV Editor CSS — header styling ────────────────────────────────────
uv_css_path = ROOT + '/src/styles/uv-editor.css'
uv_css = open(uv_css_path).read()

UV_HEADER_FIX = """
/* ── UV Editor fullscreen fixes ── */
.uv-panel {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  background: #0d1117 !important;
  font-family: 'JetBrains Mono', monospace !important;
}

.uv-stats {
  background: #0a0d13 !important;
  border-bottom: 1px solid #21262d !important;
  padding: 4px 10px !important;
  font-size: 10px !important;
  color: #666 !important;
  flex-shrink: 0 !important;
}

.uv-toolbar {
  background: #0a0d13 !important;
  border-bottom: 1px solid #21262d !important;
  padding: 4px 8px !important;
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 4px !important;
  align-items: center !important;
  flex-shrink: 0 !important;
}

.uv-btn {
  background: #0d1117 !important;
  border: 1px solid #21262d !important;
  border-radius: 3px !important;
  color: #888 !important;
  font-size: 10px !important;
  padding: 3px 8px !important;
  cursor: pointer !important;
  font-family: inherit !important;
  transition: all 0.15s !important;
}
.uv-btn:hover { border-color: #00ffc8 !important; color: #00ffc8 !important; }

.uv-input {
  background: #060a10 !important;
  border: 1px solid #21262d !important;
  border-radius: 3px !important;
  color: #ccc !important;
  font-size: 10px !important;
  padding: 3px 6px !important;
  width: 40px !important;
  font-family: inherit !important;
}

.uv-canvas-wrap {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
  position: relative !important;
}

canvas.uv-canvas, .uv-canvas {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
}

.uv-toolbar select {
  background: #060a10 !important;
  border: 1px solid #21262d !important;
  color: #888 !important;
  font-size: 10px !important;
  padding: 3px 6px !important;
  border-radius: 3px !important;
}
"""

if 'uv-panel {' not in uv_css or 'fullscreen fixes' not in uv_css:
    uv_css += '\n' + UV_HEADER_FIX
    open(uv_css_path, 'w').write(uv_css)
    print('✓ uv-editor.css: fullscreen + header styles added')
else:
    print('✓ uv-editor.css: styles already present')

# ── 4. Node Material Editor — force nme-overlay to fill via CSS ──────────────
# Check what CSS file it uses
nme_path = ROOT + '/src/components/panels/NodeMaterialEditor.jsx'
nme = open(nme_path).read()
css_imports = re.findall(r"import ['\"]([^'\"]*\.css)['\"]", nme)
print(f'NodeMaterialEditor CSS imports: {css_imports}')

# Add to pro-dark.css since that's the global override file
pro_dark_path = ROOT + '/src/styles/pro-dark.css'
pro_dark = open(pro_dark_path).read()

NME_FIX = """
/* ── Node Material Editor fullscreen ── */
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
  transform: none !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
}

.nme-svg {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  width: 100% !important;
  height: 100% !important;
}
"""

if '.nme-overlay {' not in pro_dark:
    pro_dark += '\n' + NME_FIX
    open(pro_dark_path, 'w').write(pro_dark)
    print('✓ pro-dark.css: nme-overlay fullscreen fix added')
else:
    pro_dark = re.sub(
        r'/\* ── Node Material Editor fullscreen.*?\.nme-svg \{[^}]*\}',
        NME_FIX.strip(), pro_dark, flags=re.DOTALL
    )
    open(pro_dark_path, 'w').write(pro_dark)
    print('✓ pro-dark.css: nme-overlay updated')

print('\nRun: git add -A && git commit -m "fix: UV fullscreen+CSS, NodeMat fullscreen, viewport brightness" && git push')
