#!/usr/bin/env python3
import subprocess, os

ROOT = '/workspaces/spx3dmesh2'

# Restore both files cleanly
for f in [
    'src/components/panels/AnimGraphPanel.jsx',
    'src/components/panels/MeshScriptPanel.jsx',
]:
    result = subprocess.run(
        ['git', 'show', 'HEAD~2:' + f],
        capture_output=True, text=True, cwd=ROOT
    )
    if result.returncode == 0 and len(result.stdout) > 500:
        open(os.path.join(ROOT, f), 'w').write(result.stdout)
        print(f'✓ Restored {f} ({len(result.stdout)} chars)')
    else:
        # Try HEAD~1
        result2 = subprocess.run(
            ['git', 'show', 'HEAD~1:' + f],
            capture_output=True, text=True, cwd=ROOT
        )
        if result2.returncode == 0 and len(result2.stdout) > 500:
            open(os.path.join(ROOT, f), 'w').write(result2.stdout)
            print(f'✓ Restored {f} from HEAD~1')
        else:
            print(f'✗ Could not restore {f}')

# Verify line counts
for f in ['src/components/panels/AnimGraphPanel.jsx', 'src/components/panels/MeshScriptPanel.jsx']:
    path = os.path.join(ROOT, f)
    lines = len(open(path).readlines())
    print(f'  {f}: {lines} lines')

print('\nNote: AnimGraph and MeshScript viewport mirrors will be added differently')
print('      They use ms-overlay/ms-panel with fixed width — need CSS approach only')
print('\nRun: git add -A && git commit -m "fix: restore AnimGraph+MeshScript, stop JSX injection" && git push')
