f = open('src/App.jsx').read()

# ── 1. Fix all 6 tab definitions ─────────────────────────────────────────────
old_tabs = '''        <SpxTabGroup label="SURFACE" color="#00ffc8" tabs={[
          {label:"UV",         fn:()=>openWorkspaceTool("uv")},
          {label:"Materials",  fn:()=>openWorkspaceTool("materials_textures")},
          {label:"Node Mat",   fn:()=>{ closeAllWorkspacePanels(); setNodeEditorOpen(true); }},
          {label:"Clothing",   fn:()=>openWorkspaceTool("clothing_pattern")},
          {label:"Hair",       fn:()=>openWorkspaceTool("hair_suite")},
          {label:"Displace",   fn:()=>{ closeAllWorkspacePanels(); setDisplacementOpen(true); }},
        ]}/>
        <SpxTabGroup label="RIG" color="#ff88ff" tabs={[
          {label:"Rigging",    fn:()=>openWorkspaceTool("rigging_suite")},
          {label:"MoCap",      fn:()=>openWorkspaceTool("mocap")},
          {label:"Retarget",   fn:()=>setMocapRetargetOpen(v=>!v)},
          {label:"Gamepad",    fn:()=>openWorkspaceTool("gamepad")},
        ]}/>
        <SpxTabGroup label="RENDER" color="#ffdd44" tabs={[
          {label:"Cin Light",  fn:()=>setCinLightOpen(v=>!v)},
          {label:"Lighting",   fn:()=>setLightingCameraPanelOpen(v=>!v)},
          {label:"Camera",     fn:()=>setFilmCameraOpen(v=>!v)},
          {label:"Volume",     fn:()=>setFilmVolOpen(v=>!v)},
          {label:"Path Trace", fn:()=>setFilmPTOpen(v=>!v)},
          {label:"Post FX",    fn:()=>setFilmPostOpen(v=>!v)},
        ]}/>
        <SpxTabGroup label="FX" color="#ff6644" tabs={[
          {label:"Cloth",      fn:()=>setClothSimOpen(v=>!v)},
          {label:"Fluid",      fn:()=>setFluidPanelOpen(v=>!v)},
          {label:"Weather",    fn:()=>setWeatherPanelOpen(v=>!v)},
          {label:"Destruction",fn:()=>setDestructionOpen(v=>!v)},
          {label:"Physics",    fn:()=>setPhysicsOpen(v=>!v)},
        ]}/>
        <SpxTabGroup label="WORLD" color="#44aaff" tabs={[
          {label:"Environment",fn:()=>openWorkspaceTool("env_gen")},
          {label:"Terrain",    fn:()=>openWorkspaceTool("terrain")},
          {label:"City Gen",   fn:()=>setCityGenOpen(v=>!v)},
          {label:"Foliage",    fn:()=>openWorkspaceTool("foliage_gen")},
          {label:"Crowd",      fn:()=>setCrowdPanelOpen(v=>!v)},
        ]}/>
        <SpxTabGroup label="GEN" color="#FF6600" tabs={[
          {label:"Face",       fn:()=>openWorkspaceTool("face_gen")},
          {label:"Vehicle",    fn:()=>openWorkspaceTool("vehicle_gen")},
          {label:"Creature",   fn:()=>openWorkspaceTool("creature_gen")},
          {label:"Pro Mesh",   fn:()=>openWorkspaceTool("pro_mesh")},
          {label:"3D→2D Style", fn:()=>openWorkspaceTool("3d_to_2d")},
        ]}/>'''

new_tabs = '''        <SpxTabGroup label="SURFACE" color="#00ffc8" tabs={[
          {label:"UV",         fn:()=>{ closeAllWorkspacePanels(); setUvPanelOpen(true); }},
          {label:"Materials",  fn:()=>{ closeAllWorkspacePanels(); setMaterialPanelOpen(true); setPaintPanelOpen(true); }},
          {label:"Node Mat",   fn:()=>{ closeAllWorkspacePanels(); setNodeEditorOpen(true); }},
          {label:"Clothing",   fn:()=>{ closeAllWorkspacePanels(); setClothingPanelOpen(true); setPatternPanelOpen(true); }},
          {label:"Hair",       fn:()=>{ closeAllWorkspacePanels(); setHairPanelOpen(true); }},
          {label:"Displace",   fn:()=>{ closeAllWorkspacePanels(); setDisplacementOpen(true); }},
        ]}/>
        <SpxTabGroup label="RIG" color="#ff88ff" tabs={[
          {label:"Rigging",    fn:()=>{ closeAllWorkspacePanels(); setAutoRigOpen(true); }},
          {label:"MoCap",      fn:()=>openWorkspaceTool("mocap")},
          {label:"Retarget",   fn:()=>{ closeAllWorkspacePanels(); setMocapRetargetOpen(true); }},
          {label:"Gamepad",    fn:()=>openWorkspaceTool("gamepad")},
        ]}/>
        <SpxTabGroup label="RENDER" color="#ffdd44" tabs={[
          {label:"Cin Light",  fn:()=>{ closeAllWorkspacePanels(); setCinLightOpen(true); }},
          {label:"Lighting",   fn:()=>{ closeAllWorkspacePanels(); setLightingCameraPanelOpen(true); }},
          {label:"Camera",     fn:()=>{ closeAllWorkspacePanels(); setFilmCameraOpen(true); }},
          {label:"Volume",     fn:()=>{ closeAllWorkspacePanels(); setFilmVolOpen(true); }},
          {label:"Path Trace", fn:()=>{ closeAllWorkspacePanels(); setFilmPTOpen(true); }},
          {label:"Post FX",    fn:()=>{ closeAllWorkspacePanels(); setFilmPostOpen(true); }},
          {label:"Render Farm",fn:()=>{ closeAllWorkspacePanels(); setRenderFarmOpen(true); }},
        ]}/>
        <SpxTabGroup label="FX" color="#ff6644" tabs={[
          {label:"Cloth Sim",  fn:()=>{ closeAllWorkspacePanels(); setClothSimOpen(true); }},
          {label:"Fluid",      fn:()=>{ closeAllWorkspacePanels(); setFluidPanelOpen(true); }},
          {label:"Weather",    fn:()=>{ closeAllWorkspacePanels(); setWeatherPanelOpen(true); }},
          {label:"Destruction",fn:()=>{ closeAllWorkspacePanels(); setDestructionPanelOpen(true); }},
          {label:"Physics",    fn:()=>{ closeAllWorkspacePanels(); setPhysicsOpen(true); }},
          {label:"Particles",  fn:()=>{ closeAllWorkspacePanels(); setPhysicsOpen(true); }},
        ]}/>
        <SpxTabGroup label="WORLD" color="#44aaff" tabs={[
          {label:"Environment",fn:()=>openWorkspaceTool("env_gen")},
          {label:"Terrain",    fn:()=>openWorkspaceTool("terrain")},
          {label:"City Gen",   fn:()=>{ closeAllWorkspacePanels(); setCityGenOpen(true); }},
          {label:"Crowd",      fn:()=>{ closeAllWorkspacePanels(); setCrowdGenOpen(true); }},
          {label:"L-System",   fn:()=>{ handleApplyFunction("lsystem_oak"); }},
        ]}/>
        <SpxTabGroup label="GEN" color="#FF6600" tabs={[
          {label:"Pro Mesh",   fn:()=>openWorkspaceTool("pro_mesh")},
          {label:"3D→2D",      fn:()=>openWorkspaceTool("3d_to_2d")},
          {label:"Anim Graph", fn:()=>{ closeAllWorkspacePanels(); setAnimGraphOpen(true); }},
          {label:"Mesh Script",fn:()=>{ closeAllWorkspacePanels(); setMeshScriptOpen(true); }},
          {label:"Multi MoCap",fn:()=>{ closeAllWorkspacePanels(); setMultiMocapOpen(true); }},
        ]}/>'''

f = f.replace(old_tabs, new_tabs)

# ── 2. Fix Rigging - remove AdvancedRigPanel auto-open, add close to AutoRig ─
# AutoRig already has onClose. AdvancedRig opens separately — keep it closeable
# The rigging panel can't close because physicsOpen renders in an overlay without proper close
# Fix physics to render as float panel not overlay
f = f.replace(
    "    setDestructionOpen(v=>!v)",
    "    setDestructionPanelOpen(v=>!v)"
)

# ── 3. Fix Grease Pencil → SPX Sketch in any remaining string ────────────────
f = f.replace('Grease Pencil', 'SPX Sketch')
f = f.replace('grease pencil', 'spx sketch')
f = f.replace('GREASE PENCIL', 'SPX SKETCH')
f = f.replace('"GREASE\\nPENCIL"', '"SPX\\nSKETCH"')
f = f.replace("'Grease\\nPencil'", "'SPX\\nSketch'")

# ── 4. Fix Performance panel - setShowPerformancePanel ───────────────────────
# Already wired, but SPXPerformancePanel renders as overlay with no content check
# Wrap it properly
f = f.replace(
    '{showPerformancePanel && (<div className="spx-perf-overlay"><SPXPerformancePanel sceneObjects={sceneObjects} activeObjId={activeObjId} /></div>)}',
    '{showPerformancePanel && (<div className="spx-perf-overlay"><div className="spx-perf-overlay-header"><span>PERFORMANCE</span><button onClick={()=>setShowPerformancePanel(false)} className="spx-overlay-close">✕</button></div><SPXPerformancePanel sceneObjects={sceneObjects} activeObjId={activeObjId} /></div>)}'
)

open('src/App.jsx','w').write(f)
print('done')
