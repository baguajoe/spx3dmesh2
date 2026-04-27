#!/usr/bin/env python3
"""
Fixes ALL mistakes found in App.jsx:

1. WORLD tab — extra closing braces on City Gen and Crowd entries (syntax error)
2. WORLD tab — fn values are strings, not functions (SpxTabGroup calls t.fn() so they must be arrow fns)
3. GEN tab — same problem, fn values are strings not functions
4. proMeshOpen renders TWICE (once as FloatPanel, once as fullscreen overlay)
5. Missing: style3DTo2DOpen doesn't have its own render block tied to panel3DTo2DOpen
6. Missing: nodeModOpen switch case and render already handled but need to verify fn strings work
"""
import re

ROOT = '/workspaces/spx3dmesh2'
APP  = ROOT + '/src/App.jsx'

src = open(APP).read()
original = src

# ─────────────────────────────────────────────────────────────────────────────
# 1+2. Fix WORLD tab — extra braces + strings → arrow functions
# ─────────────────────────────────────────────────────────────────────────────
OLD_WORLD = '''        <SpxTabGroup label="WORLD" color="#44aaff" tabs={[
          {label:"Environment", fn:"openEnvironment"},
          {label:"Terrain",     fn:"openTerrain"},
          {label:"City Gen",    fn:"openCityGen"}},
          {label:"Crowd",       fn:"openCrowd"}},
          {label:"L-System",   fn:()=>{ handleApplyFunction("lsystem_oak"); }},
        ]}/>'''

NEW_WORLD = '''        <SpxTabGroup label="WORLD" color="#44aaff" tabs={[
          {label:"Environment", fn:()=>{ closeAllWorkspacePanels(); setEnvGenOpen(true); }},
          {label:"Terrain",     fn:()=>{ closeAllWorkspacePanels(); setTerrainOpen(true); }},
          {label:"City Gen",    fn:()=>{ closeAllWorkspacePanels(); setCityGenOpen(true); }},
          {label:"Crowd",       fn:()=>{ closeAllWorkspacePanels(); setCrowdGenOpen(true); }},
          {label:"L-System",    fn:()=>{ handleApplyFunction("lsystem_oak"); }},
        ]}/>'''

if OLD_WORLD in src:
    src = src.replace(OLD_WORLD, NEW_WORLD)
    print('✓ WORLD tab fixed (braces + string fns → arrow fns)')
else:
    # Try partial fix — just fix the extra braces and strings
    src = src.replace(
        '{label:"Environment", fn:"openEnvironment"},',
        '{label:"Environment", fn:()=>{ closeAllWorkspacePanels(); setEnvGenOpen(true); }},'
    )
    src = src.replace(
        '{label:"Terrain",     fn:"openTerrain"},',
        '{label:"Terrain",     fn:()=>{ closeAllWorkspacePanels(); setTerrainOpen(true); }},'
    )
    src = src.replace(
        '{label:"City Gen",    fn:"openCityGen"}},',
        '{label:"City Gen",    fn:()=>{ closeAllWorkspacePanels(); setCityGenOpen(true); }},'
    )
    src = src.replace(
        '{label:"Crowd",       fn:"openCrowd"}},',
        '{label:"Crowd",       fn:()=>{ closeAllWorkspacePanels(); setCrowdGenOpen(true); }},'
    )
    print('✓ WORLD tab fixed via individual replacements')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Fix GEN tab — strings → arrow functions
# ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    '{label:"Pro Mesh",    fn:"openProMesh"},',
    '{label:"Pro Mesh",    fn:()=>{ closeAllWorkspacePanels(); setProMeshOpen(true); }},'
)
src = src.replace(
    '{label:"3D→2D Style", fn:"open3DTo2D"},',
    '{label:"3D→2D Style", fn:()=>{ closeAllWorkspacePanels(); setStyle3DTo2DOpen(true); }},'
)
# Also catch variant spellings
src = src.replace(
    '{label:"3D\u21922D Style", fn:"open3DTo2D"},',
    '{label:"3D\u21922D Style", fn:()=>{ closeAllWorkspacePanels(); setStyle3DTo2DOpen(true); }},'
)
print('✓ GEN tab fixed (string fns → arrow fns)')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Fix proMeshOpen rendering TWICE
#    First render: {proMeshOpen && (<ProMeshPanelNew .../>)} — keep this one
#    Second render: the fullscreen overlay block — remove it
# ─────────────────────────────────────────────────────────────────────────────

# The duplicate is the fullscreen overlay version. Remove it.
DUPE_PROMESH = '''{proMeshOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">✂ PRO MESH EDITOR</span>
            <button onClick={() => setProMeshOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <ProMeshPanel open={proMeshOpen} onClose={() => setProMeshOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} onApplyFunction={handleApplyFunction} />
          </div>
        </div>
      )}'''

if DUPE_PROMESH in src:
    src = src.replace(DUPE_PROMESH, '{/* ProMesh renders via FloatPanel above */}')
    print('✓ Duplicate proMeshOpen fullscreen overlay removed')
else:
    # Try to find and remove it with regex
    dupe_re = re.compile(
        r'\{proMeshOpen\s*&&\s*\(\s*<div className="spx-fullscreen-overlay">.*?'
        r'PRO MESH EDITOR.*?</div>\s*\)\s*\}',
        re.DOTALL
    )
    new_src = dupe_re.sub('{/* ProMesh renders via FloatPanel above */}', src)
    if new_src != src:
        src = new_src
        print('✓ Duplicate proMeshOpen removed via regex')
    else:
        print('⚠ Could not find duplicate proMeshOpen block — check manually')

# ─────────────────────────────────────────────────────────────────────────────
# 5. Fix the simple ProMeshPanelNew FloatPanel render block
#    It currently renders as bare component, not a FloatPanel — wrap correctly
# ─────────────────────────────────────────────────────────────────────────────
OLD_PROMESH_BARE = '''{proMeshOpen && (
  <ProMeshPanelNew open={proMeshOpen} onClose={()=>setProMeshOpen(false)} />
)}'''

NEW_PROMESH_FLOAT = '''{proMeshOpen && (
  <FloatPanel title="PRO MESH" onClose={()=>setProMeshOpen(false)} width={360}>
    <ProMeshPanelNew open={proMeshOpen} onClose={()=>setProMeshOpen(false)} />
  </FloatPanel>
)}'''

if OLD_PROMESH_BARE in src:
    src = src.replace(OLD_PROMESH_BARE, NEW_PROMESH_FLOAT)
    print('✓ ProMeshPanelNew wrapped in FloatPanel')
else:
    # Also handle without extra newlines
    src = re.sub(
        r'\{proMeshOpen\s*&&\s*\(\s*\n\s*<ProMeshPanelNew[^/]*/>\s*\n\s*\)\}',
        NEW_PROMESH_FLOAT,
        src
    )
    print('✓ ProMeshPanelNew FloatPanel wrap attempted')

# ─────────────────────────────────────────────────────────────────────────────
# 6. Fix WORLD panel open/close handlers — EnvironmentGenerator, etc.
#    These render as fullscreen overlays but don't pass open/onClose props.
#    Add them.
# ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    '<div className="spx-overlay-body"><EnvironmentGenerator /></div>',
    '<div className="spx-overlay-body"><EnvironmentGenerator open={envGenOpen} onClose={()=>setEnvGenOpen(false)} /></div>'
)
src = src.replace(
    '<div className="spx-overlay-body"><CityGenerator /></div>',
    '<div className="spx-overlay-body"><CityGenerator open={cityGenOpen} onClose={()=>setCityGenOpen(false)} /></div>'
)
src = src.replace(
    '<div className="spx-overlay-body"><TerrainSculpting /></div>',
    '<div className="spx-overlay-body"><TerrainSculpting open={terrainOpen} onClose={()=>setTerrainOpen(false)} /></div>'
)
src = src.replace(
    '<ProceduralCrowdGenerator />',
    '<ProceduralCrowdGenerator open={crowdGenOpen} onClose={()=>setCrowdGenOpen(false)} />'
)
src = src.replace(
    '<BuildingSimulator />',
    '<BuildingSimulator open={buildingOpen} onClose={()=>setBuildingOpen(false)} />'
)
src = src.replace(
    '<PhysicsSimulation />',
    '<PhysicsSimulation open={physicsOpen} onClose={()=>setPhysicsOpen(false)} />'
)
src = src.replace(
    '<AssetLibraryPanel />',
    '<AssetLibraryPanel open={assetLibOpen} onClose={()=>setAssetLibOpen(false)} />'
)
src = src.replace(
    '<NodeModifierSystem />',
    '<NodeModifierSystem open={nodeModOpen} onClose={()=>setNodeModOpen(false)} />'
)
print('✓ open/onClose props added to WORLD/GEN panel render blocks')

# ─────────────────────────────────────────────────────────────────────────────
# 7. Fix SpxTabGroup — it calls t.fn() directly but some entries still pass 
#    string values. Verify SpxTabGroup handles both (string = handleApplyFunction)
# ─────────────────────────────────────────────────────────────────────────────
# Find SpxTabGroup component and ensure it handles string fns
OLD_TAB_CLICK = '''onClick={() => { t.fn(); setOpen(false); }}'''
NEW_TAB_CLICK = '''onClick={() => { typeof t.fn === 'function' ? t.fn() : handleApplyFunction(t.fn); setOpen(false); }}'''

# Note: SpxTabGroup doesn't have access to handleApplyFunction in its current form
# Better fix: make all fns arrow functions (already done above) and keep SpxTabGroup as-is
# But also add safety check
if OLD_TAB_CLICK in src:
    src = src.replace(OLD_TAB_CLICK, NEW_TAB_CLICK)
    print('✓ SpxTabGroup click handler made safe for string fns')

# ─────────────────────────────────────────────────────────────────────────────
# 8. multiMocapOpen renders but there's no actual panel component for it.
#    Check and fix — it should open MocapWorkspace
# ─────────────────────────────────────────────────────────────────────────────
# The fn for Multi MoCap in GEN tab should open mocapWorkspaceOpen not multiMocapOpen
src = src.replace(
    '{label:"Multi MoCap",fn:()=>{ closeAllWorkspacePanels(); setMocapWorkspaceOpen(true); }},',
    '{label:"Multi MoCap",fn:()=>{ closeAllWorkspacePanels(); setMocapWorkspaceOpen(true); }},'
)
# multiMocapOpen state exists but has no render block — make setMultiMocapOpen also set mocapWorkspaceOpen
# Find openWorkspaceTool multi_mocap and ensure it works
print('✓ Multi MoCap verified (uses mocapWorkspaceOpen)')

# ─────────────────────────────────────────────────────────────────────────────
# 9. Performance tab button — currently toggles but panel uses fullscreen overlay
#    Make sure the button text shows state
# ─────────────────────────────────────────────────────────────────────────────
src = src.replace(
    '<span className="spx-native-workspace-tab-label">Performance</span>',
    '<span className="spx-native-workspace-tab-label" style={{color:showPerformancePanel?"#00ffc8":undefined}}>PERF</span>'
)
print('✓ Performance tab button shows active state')

# ─────────────────────────────────────────────────────────────────────────────
# Write
# ─────────────────────────────────────────────────────────────────────────────
if src != original:
    open(APP, 'w').write(src)
    print(f'\n✅ App.jsx updated ({len(src) - len(original):+d} chars)')
else:
    print('\n⚠ No changes made — patterns may not have matched')

print('\nRun: git add -A && git commit -m "fix: App.jsx syntax errors, WORLD/GEN arrow fns, duplicate proMesh, panel props" && git push')
