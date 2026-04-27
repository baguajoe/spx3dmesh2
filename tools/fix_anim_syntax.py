#!/usr/bin/env python3
import subprocess, os, re

ROOT = '/workspaces/spx3dmesh2'

# ── 1. Restore AnimGraphPanel and MeshScriptPanel from git ───────────────────
for fname in ['src/components/panels/AnimGraphPanel.jsx', 'src/components/panels/MeshScriptPanel.jsx']:
    result = subprocess.run(['git', 'checkout', 'HEAD~1', '--', fname], capture_output=True, text=True, cwd=ROOT)
    if result.returncode == 0:
        print(f'✓ Restored {fname} from HEAD~1')
    else:
        # Try HEAD
        result2 = subprocess.run(['git', 'checkout', 'HEAD', '--', fname], capture_output=True, text=True, cwd=ROOT)
        if result2.returncode == 0:
            print(f'✓ Restored {fname} from HEAD')
        else:
            print(f'⚠ Could not restore {fname}: {result.stderr}')

# ── 2. Verify they parse (check line count is reasonable) ────────────────────
for fname in ['src/components/panels/AnimGraphPanel.jsx', 'src/components/panels/MeshScriptPanel.jsx']:
    path = os.path.join(ROOT, fname)
    if os.path.exists(path):
        lines = len(open(path).readlines())
        print(f'  {fname}: {lines} lines')

# ── 3. Safe CSS-only approach — don't touch JSX files ────────────────────────
# Instead of injecting JSX, use CSS to make the panels fill the overlay
# and pass rendererRef via App.jsx only

app_path = ROOT + '/src/App.jsx'
app = open(app_path).read()
orig = app

# Just pass rendererRef — no JSX changes to panel files
app = app.replace(
    '<AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} />',
    '<AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} />'
)
app = app.replace(
    '<MeshScriptPanel open={meshScriptOpen} onClose={() => setMeshScriptOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />',
    '<MeshScriptPanel open={meshScriptOpen} onClose={() => setMeshScriptOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />'
)

if app != orig:
    open(app_path, 'w').write(app)
    print('✓ App.jsx: rendererRef passed safely')

print('\nRun: git add -A && git commit -m "fix: restore AnimGraphPanel/MeshScript from bad regex, safe rendererRef pass" && git push')
