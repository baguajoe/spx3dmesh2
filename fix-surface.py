import re

# ── Fix 1: FabricPanel — move early return AFTER all hooks ─────────────────
fc = open('src/components/clothing/FabricPanel.jsx').read()
lines = fc.split('\n')

# Find ALL hook lines and the early return
hook_lines = []
early_return_idx = None
for i, line in enumerate(lines):
    stripped = line.strip()
    if any(h in stripped for h in ['useState(', 'useCallback(', 'useMemo(', 'useRef(', 'useEffect(']):
        hook_lines.append(i)
    if 'if (!open)' in stripped and 'return' in stripped and early_return_idx is None:
        early_return_idx = i

print(f"FabricPanel: early_return={early_return_idx}, last_hook={max(hook_lines) if hook_lines else 'none'}")

if early_return_idx is not None and hook_lines:
    last_hook = max(hook_lines)
    if early_return_idx < last_hook:
        early_return_line = lines.pop(early_return_idx)
        # recalculate after removal
        hook_lines2 = [i for i, l in enumerate(lines) if any(h in l for h in ['useState(', 'useCallback(', 'useMemo(', 'useRef(', 'useEffect('])]
        last_hook2 = max(hook_lines2)
        lines.insert(last_hook2 + 1, early_return_line)
        open('src/components/clothing/FabricPanel.jsx','w').write('\n'.join(lines))
        print(f'Fixed: moved early return after line {last_hook2}')
    else:
        print('Already correct order')

# ── Fix 2: App.jsx — make Surface tab panels open consistently ─────────────
f = open('src/App.jsx').read()

# Fix Node Mat - state is declared at line 3773, far from component render
# Fix Displacement - same issue
# These use toggle (v=>!v) which is fine but state init is late
# Move their toggle calls to use closeAllWorkspacePanels first
f = f.replace(
    '{label:"Node Mat",   fn:()=>setNodeEditorOpen(v=>!v)}',
    '{label:"Node Mat",   fn:()=>{ closeAllWorkspacePanels(); setNodeEditorOpen(true); }}'
)
f = f.replace(
    '{label:"Displace",   fn:()=>setDisplacementOpen(v=>!v)}',
    '{label:"Displace",   fn:()=>{ closeAllWorkspacePanels(); setDisplacementOpen(true); }}'
)

# Fix clothing_pattern - remove FabricPanel from suite (it crashes)
f = f.replace(
    'if (toolId === "clothing_pattern")   { closeAllWorkspacePanels(); setClothingPanelOpen?.(true); setPatternPanelOpen?.(true); setFabricPanelOpen?.(true); ensureWorkspaceMesh("clothing"); return; }',
    'if (toolId === "clothing_pattern")   { closeAllWorkspacePanels(); setClothingPanelOpen?.(true); setPatternPanelOpen?.(true); ensureWorkspaceMesh("clothing"); return; }'
)

# Fix FabricPanel render - only show when open AND not crashing
f = f.replace(
    '      <FabricPanel\n        open={fabricPanelOpen}\n        onClose={() => setFabricPanelOpen(false)}\n        clothStateRef={sceneRef}\n        setStatus={setStatus}\n        panels={[]}\n      />',
    '      {fabricPanelOpen && <FabricPanel\n        open={fabricPanelOpen}\n        onClose={() => setFabricPanelOpen(false)}\n        clothStateRef={sceneRef}\n        setStatus={setStatus}\n        panels={[]}\n      />}'
)

open('src/App.jsx','w').write(f)
print('done App.jsx')
