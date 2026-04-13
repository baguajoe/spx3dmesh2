#!/usr/bin/env python3
import re

ROOT = '/workspaces/spx3dmesh2'
APP  = ROOT + '/src/App.jsx'
src  = open(APP).read()
orig = src

# ── 1. Remove L-System from WORLD tab ────────────────────────────────────────
src = re.sub(
    r"\s*\{label:\"L-System\",\s*fn:\(\)=>\{[^}]*\}\},?\n?",
    '\n',
    src
)
print('✓ L-System removed from WORLD tab')

# ── 2. Add Skin Generator to GEN tab ─────────────────────────────────────────
# Find the GEN SpxTabGroup and add Skin Generator after Pro Mesh
OLD_GEN = '{label:"Pro Mesh",    fn:()=>{ closeAllWorkspacePanels(); setProMeshOpen(true); }},'
NEW_GEN = (
    '{label:"Pro Mesh",    fn:()=>{ closeAllWorkspacePanels(); setProMeshOpen(true); }},\n'
    '          {label:"Skin Gen",     fn:()=>{ closeAllWorkspacePanels(); setCustomSkinPanelOpen(true); }},'
)
if OLD_GEN in src:
    src = src.replace(OLD_GEN, NEW_GEN)
    print('✓ Skin Generator added to GEN tab')
else:
    print('⚠ Could not find Pro Mesh entry in GEN tab')

# ── 3. Ensure CustomSkinBuilderPanel open state is not closed by closeAllWorkspacePanels
#    It already is in closeAllWorkspacePanels — verify
if 'setCustomSkinPanelOpen(false)' in src:
    print('✓ CustomSkinBuilderPanel already in closeAll')
else:
    src = src.replace(
        'setShowPerformancePanel(false);',
        'setShowPerformancePanel(false);\n    setCustomSkinPanelOpen(false);'
    )
    print('✓ Added CustomSkinBuilderPanel to closeAll')

# ── 4. Make sure CustomSkinBuilderPanel renders when open ────────────────────
if 'customSkinPanelOpen &&' in src:
    print('✓ CustomSkinBuilderPanel render block exists')
else:
    print('⚠ CustomSkinBuilderPanel render block missing — it should already be in App.jsx')

# ── 5. Write ──────────────────────────────────────────────────────────────────
if src != orig:
    open(APP, 'w').write(src)
    print(f'\n✅ App.jsx updated ({len(src)-len(orig):+d} chars)')
else:
    print('\n⚠ No changes made')

print('\nRun: git add -A && git commit -m "feat: add Skin Generator to GEN tab, remove L-System from WORLD" && git push')
