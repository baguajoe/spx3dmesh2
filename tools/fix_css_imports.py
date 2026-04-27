#!/usr/bin/env python3
import os, glob

ROOT = '/workspaces/spx3dmesh2'

# Files in src/components/generators/ and src/components/pipeline/
# need ../../styles/ (2 levels up from generators/ to src/, then into styles/)
# BUT spx-float-panel.css lives at src/styles/ 
# generators/ is at src/components/generators/ → ../../styles/ = src/styles/ ✓
# Wait — let's verify actual path depth:
# src/components/generators/NodeModifierSystem.jsx
# ../../ = src/  → src/styles/ ✓  That IS correct...
# So the file must not exist. Check what the css file is actually named.

import subprocess
result = subprocess.run(['find', ROOT+'/src/styles', '-name', '*.css'], capture_output=True, text=True)
print("CSS files in src/styles/:")
for f in sorted(result.stdout.strip().split('\n')):
    print(' ', os.path.basename(f))

# Check the actual import in the broken file
broken = ROOT + '/src/components/generators/NodeModifierSystem.jsx'
if os.path.exists(broken):
    lines = open(broken).readlines()[:5]
    print("\nNodeModifierSystem.jsx first 5 lines:")
    for l in lines:
        print(' ', l.rstrip())

# Fix: the css file might be named differently or not exist
# The safest fix is to remove the css import from generator files
# and rely on spx-float-panel.css being imported globally in App.jsx

FILES_TO_FIX = glob.glob(ROOT + '/src/components/generators/*.jsx') + \
               glob.glob(ROOT + '/src/components/pipeline/*.jsx') + \
               glob.glob(ROOT + '/src/components/mesh/ProMeshPanel.jsx')

for fpath in FILES_TO_FIX:
    content = open(fpath).read()
    original = content
    
    # Remove any broken css imports — App.jsx already imports spx-float-panel.css globally
    bad_imports = [
        "import '../../styles/spx-float-panel.css';\n",
        'import "../../styles/spx-float-panel.css";\n',
        "import '../../../styles/spx-float-panel.css';\n",
        'import "../../../styles/spx-float-panel.css";\n',
        "import '../../styles/spx-float-panel.css';",
        'import "../../styles/spx-float-panel.css";',
    ]
    for bad in bad_imports:
        content = content.replace(bad, '')
    
    if content != original:
        open(fpath, 'w').write(content)
        print(f'✓ Fixed: {os.path.basename(fpath)}')
    else:
        print(f'  (no change): {os.path.basename(fpath)}')

print('\nDone. Run: git add -A && git commit -m "fix: remove broken CSS imports from generator panels" && git push')
