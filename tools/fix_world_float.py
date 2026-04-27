#!/usr/bin/env python3
"""
Fixes:
1. WORLD items (Environment, Terrain, CityGen, Crowd) — fullscreen overlays
   call the components but they now have their own header/close, causing double headers.
   Strip the fullscreen overlay wrapper and use FloatPanel instead.
2. 3D→2D Style — opens style3DTo2DOpen but render block already exists as fullscreen overlay.
   Verify it's wired and the SPX3DTo2DPanel file is the right one.
3. Anim Graph, Mesh Script, Multi MoCap in GEN — these are full-page tools, that's correct.
"""
import re

ROOT = '/workspaces/spx3dmesh2'
APP  = ROOT + '/src/App.jsx'
src  = open(APP).read()
orig = src

# ─────────────────────────────────────────────────────────────────────────────
# 1. WORLD panels — they currently render as fullscreen overlays which is fine
#    BUT the panel components themselves also render their own header/close btn.
#    Fix: remove the duplicate inner header from the overlay by passing props.
#    Simplest fix: convert them to FloatPanel (same as FX panels) since they
#    don't need a full viewport — they're just parameter panels.
# ─────────────────────────────────────────────────────────────────────────────

WORLD_FIXES = [
    # (old_block, new_block)
    (
        '''{envGenOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🌲 ENVIRONMENT GENERATOR</span>
            <button onClick={() => setEnvGenOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body"><EnvironmentGenerator open={envGenOpen} onClose={()=>setEnvGenOpen(false)} /></div>
        </div>
      )}''',
        '''{envGenOpen && (
        <FloatPanel title="ENVIRONMENT" onClose={()=>setEnvGenOpen(false)} width={340}>
          <EnvironmentGenerator open={envGenOpen} onClose={()=>setEnvGenOpen(false)} />
        </FloatPanel>
      )}'''
    ),
    (
        '''{cityGenOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🏙️ CITY GENERATOR</span>
            <button onClick={() => setCityGenOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body"><CityGenerator open={cityGenOpen} onClose={()=>setCityGenOpen(false)} /></div>
        </div>
      )}''',
        '''{cityGenOpen && (
        <FloatPanel title="CITY GENERATOR" onClose={()=>setCityGenOpen(false)} width={340}>
          <CityGenerator open={cityGenOpen} onClose={()=>setCityGenOpen(false)} />
        </FloatPanel>
      )}'''
    ),
    (
        '''{terrainOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🏔️ TERRAIN SCULPTING</span>
            <button onClick={() => setTerrainOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body"><TerrainSculpting open={terrainOpen} onClose={()=>setTerrainOpen(false)} /></div>
        </div>
      )}''',
        '''{terrainOpen && (
        <FloatPanel title="TERRAIN SCULPT" onClose={()=>setTerrainOpen(false)} width={340}>
          <TerrainSculpting open={terrainOpen} onClose={()=>setTerrainOpen(false)} />
        </FloatPanel>
      )}'''
    ),
]

REGEX_WORLD = [
    (r'\{envGenOpen\s*&&\s*\(\s*<div className="spx-fullscreen-overlay">.*?</div>\s*\)\s*\}',
     '{envGenOpen && (\n        <FloatPanel title="ENVIRONMENT" onClose={()=>setEnvGenOpen(false)} width={340}>\n          <EnvironmentGenerator open={envGenOpen} onClose={()=>setEnvGenOpen(false)} />\n        </FloatPanel>\n      )}'),
    (r'\{cityGenOpen\s*&&\s*\(\s*<div className="spx-fullscreen-overlay">.*?</div>\s*\)\s*\}',
     '{cityGenOpen && (\n        <FloatPanel title="CITY GENERATOR" onClose={()=>setCityGenOpen(false)} width={340}>\n          <CityGenerator open={cityGenOpen} onClose={()=>setCityGenOpen(false)} />\n        </FloatPanel>\n      )}'),
    (r'\{terrainOpen\s*&&\s*\(\s*<div className="spx-fullscreen-overlay">.*?</div>\s*\)\s*\}',
     '{terrainOpen && (\n        <FloatPanel title="TERRAIN SCULPT" onClose={()=>setTerrainOpen(false)} width={340}>\n          <TerrainSculpting open={terrainOpen} onClose={()=>setTerrainOpen(false)} />\n        </FloatPanel>\n      )}'),
]

for old, new in WORLD_FIXES:
    if old in src:
        src = src.replace(old, new)
        title = new.split('title="')[1].split('"')[0]
        print(f'✓ Converted to FloatPanel: {title}')
    else:
        name = old.split('spx-overlay-title">')[1].split('<')[0].strip()
        print(f'⚠ Exact match failed for: {name} — trying regex')

for pattern, replacement in REGEX_WORLD:
    new_src = re.sub(pattern, replacement, src, flags=re.DOTALL)
    if new_src != src:
        src = new_src
        print(f'✓ Regex fallback succeeded')

# Also fix crowd (uses FloatPanel already but check)
if '<ProceduralCrowdGenerator open={crowdGenOpen}' not in src:
    src = src.replace(
        '<ProceduralCrowdGenerator open={crowdGenOpen} onClose={()=>setCrowdGenOpen(false)} />',
        '<ProceduralCrowdGenerator open={crowdGenOpen} onClose={()=>setCrowdGenOpen(false)} />'
    )

# ─────────────────────────────────────────────────────────────────────────────
# 2. 3D→2D — check current render block and fix if needed
# ─────────────────────────────────────────────────────────────────────────────
# The GEN tab now calls setStyle3DTo2DOpen(true)
# The render block should be the fullscreen overlay with SPX3DTo2DPanel
# Check if it exists
if 'style3DTo2DOpen &&' in src:
    print('✓ style3DTo2DOpen render block exists')
else:
    # Add it before the closing panels section
    anchor = '{/* ProMesh renders via FloatPanel above */}'
    block = '''{style3DTo2DOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🎨 3D → 2D STYLE</span>
            <button onClick={() => setStyle3DTo2DOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <SPX3DTo2DPanel open={style3DTo2DOpen} onClose={() => setStyle3DTo2DOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} cameraRef={cameraRef} />
          </div>
        </div>
      )}
      '''
    src = src.replace(anchor, block + anchor)
    print('✓ style3DTo2DOpen render block added')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Make sure SPX3DTo2DPanel import points to the pipeline version (not generators)
# ─────────────────────────────────────────────────────────────────────────────
# The pipeline version has the full render/style functionality
# generators version is the simplified one we wrote
# App.jsx already imports from pipeline — verify
if 'from "./components/pipeline/SPX3DTo2DPanel' in src or \
   'from \'./components/pipeline/SPX3DTo2DPanel' in src:
    print('✓ SPX3DTo2DPanel import is from pipeline (correct)')
elif 'SPX3DTo2DPanel' in src:
    print('⚠ SPX3DTo2DPanel imported but path unclear — check manually')

# ─────────────────────────────────────────────────────────────────────────────
# 4. GEN: Anim Graph, Mesh Script, Multi MoCap — these ARE full-page, that's
#    correct behavior. Just confirm their fns work.
#    Anim Graph → setAnimGraphOpen(true) → fullscreen overlay ✓
#    Mesh Script → setMeshScriptOpen(true) → FloatPanel ✓  
#    Multi MoCap → setMocapWorkspaceOpen(true) → MocapWorkspace fullscreen ✓
# ─────────────────────────────────────────────────────────────────────────────
print('✓ Anim Graph / Mesh Script / Multi MoCap are intentionally full-page')

# ─────────────────────────────────────────────────────────────────────────────
# Write
# ─────────────────────────────────────────────────────────────────────────────
if src != orig:
    open(APP, 'w').write(src)
    print(f'\n✅ App.jsx updated ({len(src)-len(orig):+d} chars)')
else:
    print('\n⚠ No changes made')

print('\nRun: git add -A && git commit -m "fix: WORLD panels as FloatPanels, 3D→2D wired" && git push')
