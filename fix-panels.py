import re

f = open('src/App.jsx').read()

# 1. Fix closeAllWorkspacePanels - add missing new systems
f = f.replace(
    "    setPropGenOpen(false);\n  };",
    """    setPropGenOpen(false);
    setGroomOpen(false);
    setMuscleOpen(false);
    setRenderFarmOpen(false);
    setDepthEstOpen(false);
    setAnimGraphOpen(false);
    setMultiMocapOpen(false);
    setMeshScriptOpen(false);
    setCinLightOpen(false);
    setFilmVolOpen(false);
    setDisplacementOpen(false);
    setMocapRetargetOpen(false);
    setNodeEditorOpen(false);
    setCompositorOpen(false);
    setFilmCameraOpen(false);
    setFilmPTOpen(false);
  };"""
)

# 2. Fix hair - only open one panel from tab
f = f.replace(
    'if (toolId === "hair_suite")         { closeAllWorkspacePanels(); setHairPanelOpen?.(true); setHairAdvancedOpen?.(true); setHairFXOpen?.(true); ensureWorkspaceMesh("hair"); return; }',
    'if (toolId === "hair_suite")         { closeAllWorkspacePanels(); setHairPanelOpen?.(true); ensureWorkspaceMesh("hair"); return; }'
)

# 3. Fix Hair tab in SURFACE dropdown to use openWorkspaceTool
f = f.replace(
    '{label:"Hair",       fn:()=>{ closeAllWorkspacePanels(); setHairPanelOpen(true); setActiveWorkspace(\'Surface\'); }}',
    '{label:"Hair",       fn:()=>openWorkspaceTool("hair_suite")}'
)

# 4. Fix rigging - only open one panel
f = f.replace(
    'if (toolId === "rigging_suite")      { closeAllWorkspacePanels(); setAutoRigOpen?.(true); setAdvancedRigOpen?.(true); ensureWorkspaceMesh("rigging"); return; }',
    'if (toolId === "rigging_suite")      { closeAllWorkspacePanels(); setAutoRigOpen?.(true); ensureWorkspaceMesh("rigging"); return; }'
)

# 5. Fix FabricPanel - add onClose prop
f = f.replace(
    '      <FabricPanel\n        open={fabricPanelOpen}\n        clothStateRef={sceneRef}\n        setStatus={setStatus}\n        panels={[]}\n      />',
    '      <FabricPanel\n        open={fabricPanelOpen}\n        onClose={() => setFabricPanelOpen(false)}\n        clothStateRef={sceneRef}\n        setStatus={setStatus}\n        panels={[]}\n      />'
)

# 6. Rename Grease Pencil to SPX Sketch everywhere
f = f.replace('Grease Pencil', 'SPX Sketch')
f = f.replace('GREASE\nPENCIL', 'SPX\nSKETCH')
f = f.replace('grease_pencil', 'spx_sketch')

open('src/App.jsx','w').write(f)
print('done App.jsx')

# 7. Fix FabricPanel hooks - move early return AFTER all hooks
fc = open('src/components/clothing/FabricPanel.jsx').read()
lines = fc.split('\n')

# Find the early return line and move it after all useState calls
early_return_idx = None
last_usestate_idx = None
for i, line in enumerate(lines):
    if 'if (!open)' in line and 'return' in line and early_return_idx is None:
        early_return_idx = i
    if 'useState(' in line:
        last_usestate_idx = i

if early_return_idx and last_usestate_idx and early_return_idx < last_usestate_idx:
    # Remove early return from current position
    early_return_line = lines.pop(early_return_idx)
    # Re-find last useState after removal
    last_usestate_idx = max(i for i, l in enumerate(lines) if 'useState(' in l)
    # Insert after last useState
    lines.insert(last_usestate_idx + 1, early_return_line)
    open('src/components/clothing/FabricPanel.jsx','w').write('\n'.join(lines))
    print(f'fixed FabricPanel: moved early return from {early_return_idx} to after line {last_usestate_idx}')
else:
    print(f'FabricPanel: early_return={early_return_idx}, last_useState={last_usestate_idx} - no fix needed or already correct')

# 8. Add consistent floating panel CSS
css = open('src/styles/pro-dark.css').read()
if 'spx-float-film' not in css:
    css += """
/* ── Consistent floating workspace panels ──────────────────────────────── */
.spx-float-film {
  position: fixed;
  top: 60px;
  left: 220px;
  z-index: 200;
  width: 300px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}
.spx-float-film--left  { left: 220px; }
.spx-float-film--left2 { left: 530px; }
.spx-float-film--left3 { left: 840px; }
.spx-float-film--right { right: 160px; left: auto; }
"""
    open('src/styles/pro-dark.css','w').write(css)
    print('added spx-float-film CSS')
else:
    print('spx-float-film CSS already exists')
