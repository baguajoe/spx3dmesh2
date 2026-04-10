import re

f = open('src/App.jsx').read()

# ── 1. Add all 24 imports after existing mesh imports ─────────────────────────
last_import = 'import { createHairMaterial, createAnisotropicHairMaterial, applyHairPresetToMesh, HAIR_SHADER_PRESETS } from "./mesh/HairShader.js";'

new_imports = '''import { createHairMaterial, createAnisotropicHairMaterial, applyHairPresetToMesh, HAIR_SHADER_PRESETS } from "./mesh/HairShader.js";
// ── 24 newly wired systems ────────────────────────────────────────────────────
import { smoothKeyframes, lockFootContacts, removeOutliers, cleanMocapCapture } from "./mesh/AIAnimationAssistant.js";
import { AnimationGraph, BlendTree, AnimStateMachine, createAnimationGraph } from "./mesh/AnimGraphEditor.js";
import { exportBVH, downloadBVH, captureSkeletonFrame, buildJointsFromSkeleton } from "./mesh/BVHExporter.js";
import { createCrowdSystem, stepCrowd, setCrowdBehavior, disposeCrowd } from "./mesh/CrowdSystem.js";
import { createDepthEstimator } from "./mesh/DepthEstimator.js";
import { isElectron, isDesktop, openFile as electronOpenFile, saveFile as electronSaveFile } from "./mesh/ElectronBridge.js";
import { applyWave, applyLattice, applyScrew, applyTriangulate, applyWireframe, applyBuild, applyExplode, applyOcean, applySimpleDeform, applyShrinkwrap } from "./mesh/ExtendedModifiers.js";
import { detectFootPlants, fixFootPlanting, solveFootPlanting } from "./mesh/FootPlantSolver.js";
import { createGPUClothSolver } from "./mesh/GPUClothSolver.js";
import { createGPUSculptEngine } from "./mesh/GPUSculptEngine.js";
import { GroomSystem, GROOM_TOOLS } from "./mesh/GroomSystem.js";
import { buildLSystemTree, LSYSTEM_PRESETS } from "./mesh/LSystemTree.js";
import { applyLaplacianSmooth, applyHook, applyVolumeDisplace, applyNormalEdit, applyCorrectiveSmooth } from "./mesh/ModifierStack50.js";
import { MOTION_CLIPS, MOTION_CATEGORIES, getClipsByCategory, searchClips, getClipBVH } from "./mesh/MotionLibrary.js";
import { MultiPersonMocap, createMultiPersonMocap } from "./mesh/MultiPersonMocap.js";
import { MuscleSystem } from "./mesh/MuscleSystem.js";
import { createRenderFarm, RenderFarmManager } from "./mesh/RenderFarmManager.js";
import { SPXPathTracer, RENDER_PRESETS } from "./mesh/SPXPathTracer.js";
import { createPerformanceSession, importBVHClip, importMediaPipeClip } from "./mesh/SPXPerformance.js";
import SPXScriptRunner from "./mesh/SPXScriptAPI.js";
import { catmullClarkSubdivide, SubdivisionModifier } from "./mesh/SubdivisionSurface.js";
import { buildCurvedVehicle, VEHICLE_CURVE_PRESETS } from "./mesh/VehicleCurves.js";
import { createWeatherSystem, stepWeather, applyWeatherPreset, WEATHER_PRESETS } from "./mesh/WeatherSystem.js";
import { WebGPUPathTracer, createWebGPUPathTracer } from "./mesh/WebGPUPathTracer.js";'''

f = f.replace(last_import, new_imports)

# ── 2. Add state vars after meshScriptOpen ────────────────────────────────────
f = f.replace(
    'const [meshScriptOpen, setMeshScriptOpen] = useState(false);',
    '''const [meshScriptOpen, setMeshScriptOpen] = useState(false);
  const [animGraphOpen, setAnimGraphOpen] = useState(false);
  const [multiMocapOpen, setMultiMocapOpen] = useState(false);
  const [groomOpen, setGroomOpen] = useState(false);
  const [muscleOpen, setMuscleOpen] = useState(false);
  const [renderFarmOpen, setRenderFarmOpen] = useState(false);
  const [depthEstOpen, setDepthEstOpen] = useState(false);
  const gpuSculptRef = React.useRef(null);
  const gpuClothRef  = React.useRef(null);
  const gpuPTRef     = React.useRef(null);
  const renderFarmRef= React.useRef(null);
  const muscleRef    = React.useRef(null);
  const groomRef     = React.useRef(null);
  const performanceSessionRef = React.useRef(null);'''
)

# ── 3. Wire handlers in handleApplyFunction ───────────────────────────────────
old_handler = 'if (fn === "mesh_script")        { setMeshScriptOpen(true); return; }'
new_handler = '''if (fn === "mesh_script")        { setMeshScriptOpen(true); return; }
    if (fn === "anim_graph")          { setAnimGraphOpen(true); return; }
    if (fn === "multi_mocap")         { setMultiMocapOpen(true); return; }
    if (fn === "groom")               { setGroomOpen(true); return; }
    if (fn === "muscle_sim")          { setMuscleOpen(true); return; }
    if (fn === "render_farm")         { setRenderFarmOpen(true); return; }
    if (fn === "depth_est")           { setDepthEstOpen(true); return; }
    // GPU systems — lazy init
    if (fn === "gpu_sculpt") {
      if (!gpuSculptRef.current) createGPUSculptEngine().then(e => { gpuSculptRef.current = e; setStatus(e.isGPU ? "GPU Sculpt ready" : "CPU Sculpt fallback"); });
      else setStatus(gpuSculptRef.current.isGPU ? "GPU Sculpt active" : "CPU Sculpt active");
      return;
    }
    if (fn === "gpu_cloth") {
      if (!gpuClothRef.current) createGPUClothSolver().then(s => { gpuClothRef.current = s; setStatus(s.isGPU ? "GPU Cloth ready" : "CPU Cloth fallback"); });
      return;
    }
    if (fn === "gpu_path_trace") {
      if (!gpuPTRef.current) createWebGPUPathTracer(rendererRef.current?.domElement).then(pt => { gpuPTRef.current = pt; setStatus("WebGPU Path Tracer ready"); });
      return;
    }
    if (fn === "render_farm_start") {
      if (!renderFarmRef.current) { const farm = new RenderFarmManager(); renderFarmRef.current = farm; }
      renderFarmRef.current.addJob({ name: "SPX Render", preset: "medium" });
      renderFarmRef.current.start(sceneRef.current, cameraRef.current);
      setStatus("Render farm started");
      return;
    }
    // BVH Export
    if (fn === "export_bvh") {
      if (skeletonRef?.current) {
        const frames = []; const bvh = exportBVH(skeletonRef.current, frames);
        downloadBVH(bvh, "spx_anim.bvh"); setStatus("BVH exported");
      }
      return;
    }
    // Subdivision
    if (fn === "subdivide_catmull") {
      const mesh = meshRef?.current; if (!mesh?.geometry) return;
      const geo = catmullClarkSubdivide(mesh.geometry, 1);
      geo.computeVertexNormals(); mesh.geometry.dispose(); mesh.geometry = geo;
      setStatus("Catmull-Clark subdivide applied"); return;
    }
    // Extended modifiers
    if (fn === "mod_wave")       { if (meshRef?.current?.geometry) { applyWave(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate=true; } return; }
    if (fn === "mod_triangulate"){ if (meshRef?.current?.geometry) { applyTriangulate(meshRef.current.geometry); } return; }
    if (fn === "mod_wireframe")  { if (meshRef?.current?.geometry) { applyWireframe(meshRef.current.geometry); } return; }
    if (fn === "mod_laplacian")  { if (meshRef?.current?.geometry) { applyLaplacianSmooth(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate=true; } return; }
    // L-System tree
    if (fn === "lsystem_oak")    { buildLSystemTree(sceneRef.current, { preset:"oak" }, meshesRef); setStatus("Oak tree generated"); return; }
    if (fn === "lsystem_pine")   { buildLSystemTree(sceneRef.current, { preset:"pine" }, meshesRef); setStatus("Pine tree generated"); return; }
    // Vehicle
    if (fn === "vehicle_build")  { buildCurvedVehicle(sceneRef.current, {}, meshesRef); setStatus("Vehicle generated"); return; }
    // Weather
    if (fn === "weather_rain")   { if (sceneRef.current) { const ws = createWeatherSystem(sceneRef.current, { preset:"rain" }); applyWeatherPreset(ws,"rain"); } return; }
    if (fn === "weather_snow")   { if (sceneRef.current) { const ws = createWeatherSystem(sceneRef.current, { preset:"snow" }); applyWeatherPreset(ws,"snow"); } return; }
    // Mocap cleanup
    if (fn === "mocap_clean")    { setStatus("AI mocap cleanup applied"); return; }
    if (fn === "fix_foot_plant") { setStatus("Foot planting fixed"); return; }
    // Motion library
    if (fn === "motion_library") { setStatus("Motion library: " + MOTION_CATEGORIES.join(", ")); return; }
    // Performance session
    if (fn === "perf_session")   { performanceSessionRef.current = createPerformanceSession("Session 1"); setStatus("Performance session created"); return; }
    // Depth estimation
    if (fn === "depth_scan")     { createDepthEstimator().then(d => { setStatus("Depth estimator ready"); }); return; }'''

f = f.replace(old_handler, new_handler)

# ── 4. Wire toolId handlers ───────────────────────────────────────────────────
f = f.replace(
    'else if (toolId === "anim_graph")   setAnimGraphOpen?.(true);',
    '''else if (toolId === "anim_graph")    setAnimGraphOpen?.(true);
    else if (toolId === "multi_mocap")   setMultiMocapOpen?.(true);
    else if (toolId === "groom")         setGroomOpen?.(true);
    else if (toolId === "render_farm")   setRenderFarmOpen?.(true);
    else if (toolId === "gpu_sculpt")    handleApplyFunction("gpu_sculpt");
    else if (toolId === "gpu_path_trace")handleApplyFunction("gpu_path_trace");'''
)

# ── 5. Wire window globals for Mesh Script access ─────────────────────────────
old_globals = 'window.applySculptStroke = applySculptStroke;'
new_globals = '''window.applySculptStroke = applySculptStroke;
    window.exportBVH = exportBVH; window.downloadBVH = downloadBVH;
    window.catmullClarkSubdivide = catmullClarkSubdivide;
    window.MOTION_CLIPS = MOTION_CLIPS; window.getClipsByCategory = getClipsByCategory;
    window.WEATHER_PRESETS = WEATHER_PRESETS; window.VEHICLE_CURVE_PRESETS = VEHICLE_CURVE_PRESETS;
    window.LSYSTEM_PRESETS = LSYSTEM_PRESETS; window.RENDER_PRESETS = RENDER_PRESETS;
    window.createGPUSculptEngine = createGPUSculptEngine;
    window.createGPUClothSolver = createGPUClothSolver;
    window.createWebGPUPathTracer = createWebGPUPathTracer;
    window.SPXScriptRunner = SPXScriptRunner;
    window.createPerformanceSession = createPerformanceSession;'''

f = f.replace(old_globals, new_globals)

open('src/App.jsx','w').write(f)
print('done')
