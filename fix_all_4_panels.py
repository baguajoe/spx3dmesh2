#!/usr/bin/env python3
import os, subprocess, re

ROOT = '/workspaces/spx3dmesh2'
APP  = ROOT + '/src/App.jsx'
app  = open(APP).read()
orig = app

# ── 1. Fix Quad z-index bleed ─────────────────────────────────────────────────
layout_css = ROOT + '/src/styles/spx-app-layout.css'
css = open(layout_css).read()
if 'quad-toggle-btn' not in css:
    css += """
/* Prevent viewport UI bleeding through fullscreen overlays */
.viewport-toolbar { z-index: 10 !important; }
.quad-toggle-btn  { z-index: 10 !important; }
.mesh-editor-canvas { z-index: 1; position: relative; }
"""
    open(layout_css, 'w').write(css)
    print('✓ Fixed Quad z-index')
else:
    print('✓ Quad z-index already fixed')

# ── 2. UV Editor — convert to fullscreen ─────────────────────────────────────
# Currently renders as fullscreen overlay but the UVEditorPanel itself
# has its own internal header/close causing double header + small size
# The UVEditorPanel component needs to fill the overlay body
OLD_UV = '''{uvPanelOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">✂ UV EDITOR</span>
            <button onClick={() => setUvPanelOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)} />
          </div>
        </div>
      )}'''

NEW_UV = '''{uvPanelOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">✂ UV EDITOR</span>
            <button onClick={() => setUvPanelOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body" style={{padding:0,overflow:'hidden'}}>
            <UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)}
              style={{width:'100%',height:'100%',border:'none',borderRadius:0}} />
          </div>
        </div>
      )}'''

if OLD_UV in app:
    app = app.replace(OLD_UV, NEW_UV)
    print('✓ UV Editor fullscreen body fixed')
else:
    print('⚠ UV exact match failed — patching overlay-body style')
    app = app.replace(
        '<div className="spx-overlay-body">\n            <UVEditorPanel',
        '<div className="spx-overlay-body" style={{padding:0,overflow:\'hidden\'}}>\n            <UVEditorPanel'
    )

# ── 3. Node Material Editor — convert to fullscreen ──────────────────────────
OLD_NODE = '''{nodeEditorOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🎨 NODE MATERIAL EDITOR</span>
            <button onClick={() => setNodeEditorOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <NodeMaterialEditor open={nodeEditorOpen} onClose={() => setNodeEditorOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} />
          </div>
        </div>
      )}'''

NEW_NODE = '''{nodeEditorOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🎨 NODE MATERIAL EDITOR</span>
            <button onClick={() => setNodeEditorOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body" style={{padding:0,overflow:'hidden'}}>
            <NodeMaterialEditor open={nodeEditorOpen} onClose={() => setNodeEditorOpen(false)}
              meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus}
              style={{width:'100%',height:'100%',border:'none',borderRadius:0}} />
          </div>
        </div>
      )}'''

if OLD_NODE in app:
    app = app.replace(OLD_NODE, NEW_NODE)
    print('✓ Node Material Editor fullscreen body fixed')
else:
    print('⚠ Node Mat exact match failed — patching')
    app = app.replace(
        '<div className="spx-overlay-body">\n            <NodeMaterialEditor',
        '<div className="spx-overlay-body" style={{padding:0,overflow:\'hidden\'}}>\n            <NodeMaterialEditor'
    )

# ── 4. Restore 3D→2D from git history ────────────────────────────────────────
panel_path = ROOT + '/src/components/pipeline/SPX3DTo2DPanel.jsx'
current_size = os.path.getsize(panel_path)
print(f'\nCurrent SPX3DTo2DPanel size: {current_size} bytes')

if current_size < 3000:
    print('Too small — searching git history...')
    for i in range(1, 25):
        result = subprocess.run(
            ['git', 'show', f'HEAD~{i}:src/components/pipeline/SPX3DTo2DPanel.jsx'],
            capture_output=True, text=True, cwd=ROOT
        )
        if result.returncode == 0 and len(result.stdout) > 3000:
            open(panel_path, 'w').write(result.stdout)
            print(f'✓ Restored from HEAD~{i} ({len(result.stdout)} bytes)')
            break
    else:
        print('✗ Not in git history — will rebuild')
        # Show git log to understand history
        log = subprocess.run(['git', 'log', '--oneline', '-15'], capture_output=True, text=True, cwd=ROOT)
        print(log.stdout)
else:
    print('✓ SPX3DTo2DPanel looks OK (large enough)')
    # Still check it has the style grid
    content = open(panel_path).read()
    if 'CINEMATIC_STYLES' in content or 'ALL_STYLES' in content or 'activeStyle' in content:
        print('✓ Has full style system')
    else:
        print('⚠ Missing style system — may need rebuild')

# ── 5. Write App.jsx ──────────────────────────────────────────────────────────
if app != orig:
    open(APP, 'w').write(app)
    print(f'\n✓ App.jsx updated ({len(app)-len(orig):+d} chars)')

print('\nRun: git add -A && git commit -m "fix: UV/NodeMat fullscreen, Quad z-index, 3D→2D restore" && git push')

# ── RESTORE 3D→2D FROM GIT HISTORY ─────────────────────────────────────────

# Check what's actually in the pipeline SPX3DTo2DPanel
result = subprocess.run(['wc', '-l', ROOT+'/src/components/pipeline/SPX3DTo2DPanel.jsx'], capture_output=True, text=True)
print('Pipeline version:', result.stdout.strip())

result2 = subprocess.run(['head', '-5', ROOT+'/src/components/pipeline/SPX3DTo2DPanel.jsx'], capture_output=True, text=True)
print(result2.stdout)

# Check App.jsx import
app = open(ROOT+'/src/App.jsx').read()

# Find which SPX3DTo2DPanel import is active
import re
imports = re.findall(r"import.*SPX3DTo2DPanel.*from.*", app)
print('Current imports:', imports)

# The pipeline version was overwritten by fix_world_gen_panels.py earlier
# We need to restore it. Check git history for the original
result3 = subprocess.run(
    ['git', 'show', 'HEAD~10:src/components/pipeline/SPX3DTo2DPanel.jsx'],
    capture_output=True, text=True, cwd=ROOT
)
if result3.returncode == 0 and len(result3.stdout) > 500:
    print(f'✓ Found original in git history ({len(result3.stdout)} chars) — restoring')
    open(ROOT+'/src/components/pipeline/SPX3DTo2DPanel.jsx', 'w').write(result3.stdout)
    print('✓ Restored original SPX3DTo2DPanel.jsx from git history')
else:
    # Try a few commits back
    for i in range(3, 20):
        result4 = subprocess.run(
            ['git', 'show', f'HEAD~{i}:src/components/pipeline/SPX3DTo2DPanel.jsx'],
            capture_output=True, text=True, cwd=ROOT
        )
        if result4.returncode == 0 and len(result4.stdout) > 1000:
            print(f'✓ Found at HEAD~{i} ({len(result4.stdout)} chars) — restoring')
            open(ROOT+'/src/components/pipeline/SPX3DTo2DPanel.jsx', 'w').write(result4.stdout)
            print('✓ Restored')
            break
    else:
        print('✗ Could not find original in git history')
        print('Checking git log...')
        log = subprocess.run(['git', 'log', '--oneline', '-20'], capture_output=True, text=True, cwd=ROOT)
        print(log.stdout)

print('\nRun: git add -A && git commit -m "fix: restore original SPX3DTo2DPanel" && git push')
