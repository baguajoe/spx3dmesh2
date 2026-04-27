#!/usr/bin/env python3
"""
Fix spx-fullscreen-overlay CSS so it covers the ENTIRE screen including
left toolbar, and the backdrop dim effect looks intentional not broken.
"""
import os

ROOT = '/workspaces/spx3dmesh2'

# Find the CSS file that has spx-fullscreen-overlay
import subprocess
result = subprocess.run(
    ['grep', '-rl', 'spx-fullscreen-overlay', ROOT+'/src'],
    capture_output=True, text=True
)
files = result.stdout.strip().split('\n')
print("Files with spx-fullscreen-overlay:", files)

# The fix needs to go in pro-dark.css or spx-app.css
# Check which one has it
for f in files:
    if f.endswith('.css'):
        content = open(f).read()
        idx = content.find('.spx-fullscreen-overlay')
        if idx >= 0:
            print(f"\nFound in {f}:")
            print(content[idx:idx+300])

# Write the correct CSS
CSS_FIX = """
/* ── Fullscreen overlay — covers EVERYTHING including toolbars ── */
.spx-fullscreen-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2000 !important;
  background: #0d1117 !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.spx-overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #0a0d13;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
  height: 44px;
}

.spx-overlay-title {
  font-size: 13px;
  font-weight: 700;
  color: #00ffc8;
  letter-spacing: 1.5px;
  font-family: 'JetBrains Mono', monospace;
}

.spx-overlay-close {
  background: #1a1a2a;
  border: 1px solid #2a2a4a;
  color: #888;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: all 0.15s;
}

.spx-overlay-close:hover {
  background: #ff444422;
  border-color: #ff4444;
  color: #ff4444;
}

.spx-overlay-body {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
"""

# Find the right CSS file to add/update this in
target_css = ROOT + '/src/styles/pro-dark.css'
if os.path.exists(target_css):
    content = open(target_css).read()
    if '.spx-fullscreen-overlay' in content:
        # Replace existing block
        import re
        content = re.sub(
            r'/\* ── Fullscreen overlay.*?\.spx-overlay-body \{.*?\}',
            CSS_FIX.strip(),
            content,
            flags=re.DOTALL
        )
        # If regex didn't match, just append
        if '.spx-fullscreen-overlay {' not in content or 'position: fixed !important' not in content:
            # Remove old block and add new
            start = content.find('.spx-fullscreen-overlay')
            # Find the end by counting braces
            i = content.find('{', start)
            depth = 0
            while i < len(content):
                if content[i] == '{': depth += 1
                elif content[i] == '}':
                    depth -= 1
                    if depth == 0:
                        # Find next block that's part of this component
                        content = content[:start] + content[i+1:]
                        break
                i += 1
            content += '\n' + CSS_FIX
    else:
        content += '\n' + CSS_FIX
    
    open(target_css, 'w').write(content)
    print(f'✓ Updated {target_css}')
else:
    # Try spx-app.css
    target_css = ROOT + '/src/styles/spx-app.css'
    content = open(target_css).read() if os.path.exists(target_css) else ''
    content += '\n' + CSS_FIX
    open(target_css, 'w').write(content)
    print(f'✓ Updated {target_css}')

print('\nRun: git add -A && git commit -m "fix: fullscreen overlay covers entire screen" && git push')

# ─────────────────────────────────────────────────────────────────────────────
# Also fix App.jsx — convert MeshScript FloatPanel to fullscreen overlay
# ─────────────────────────────────────────────────────────────────────────────
import re as _re

app_path = ROOT + '/src/App.jsx'
app = open(app_path).read()
app_orig = app

OLD_MESH_SCRIPT = '''{meshScriptOpen && <FloatPanel title="MESH SCRIPT" onClose={() => setMeshScriptOpen(false)} width={600}>
        <MeshScriptPanel open={meshScriptOpen} onClose={() => setMeshScriptOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
      </FloatPanel>}'''

NEW_MESH_SCRIPT = '''{meshScriptOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">📝 MESH SCRIPT</span>
            <button onClick={() => setMeshScriptOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <MeshScriptPanel open={meshScriptOpen} onClose={() => setMeshScriptOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
          </div>
        </div>
      )}'''

if OLD_MESH_SCRIPT in app:
    app = app.replace(OLD_MESH_SCRIPT, NEW_MESH_SCRIPT)
    print('✓ MeshScript converted to fullscreen overlay')
else:
    new_app = _re.sub(
        r'\{meshScriptOpen\s*&&\s*<FloatPanel[^>]*title="MESH SCRIPT".*?</FloatPanel>\s*\}',
        NEW_MESH_SCRIPT,
        app,
        flags=_re.DOTALL
    )
    if new_app != app:
        app = new_app
        print('✓ MeshScript converted via regex')
    else:
        print('⚠ MeshScript FloatPanel not found — may already be fullscreen')

if app != app_orig:
    open(app_path, 'w').write(app)
    print('✓ App.jsx updated')

print('\nRun: git add -A && git commit -m "fix: fullscreen overlay z-index 2000, MeshScript fullscreen" && git push')
