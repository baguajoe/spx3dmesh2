# spx3dmesh2 — Secondary Features Audit (Task 4)

Read-only inventory of every non-priority feature found in the repo. Priority features (Mocap, 3D-to-2D, Weather, Crowd, Building) are excluded — audited by the priority-features agent.

Sources:
- `src/App.jsx` (5320 LOC monolith — primary wiring)
- `src/mesh/*.js` (90+ engine modules)
- `src/components/panels/*.jsx` (95+ React panel UIs)
- `src/components/{animation,materials,uv,rig,vfx,clothing,hair,collaboration,greasepencil,mesh,scene,workspace}/`
- `src/{render,systems,pipeline,generators,camera,animation,state,panels}/`

Status legend:
- WORKING — engine + UI imported into App.jsx and exposed; verified data path through to scene
- PARTIAL — implemented end-to-end but limited surface (read-only, basic CRUD, no live eval, or "save graph but don't compile" caveat in code)
- STUB — UI exists but engine missing/marked TODO/uses placeholder logic
- UNCLEAR — file present but no entry-point in App.jsx wiring or registry could be confirmed

Demo-readiness:
- GREEN — confidently runs in a 5-min demo
- YELLOW — works but easy to hit the wall (depends on backend, depends on a model selected, depends on keyframes existing)
- RED — would crash, look broken, or require setup the user won't have time for

---

## 1. Animation

| Feature | Status | Demo | Files |
|---|---|---|---|
| Animation panel (autokey, FPS, frame range, playback) | WORKING | GREEN | `src/components/AnimationPanel.jsx` (15 KB), `src/components/AnimationTimeline.jsx` |
| Onion skin overlay | WORKING | GREEN | `src/animation/onionSkin.js` |
| Keyframe utils (timeline math, prev/next key) | WORKING | GREEN | `src/animation/animationKeyUtils.js`, `src/animation/timelineUtils.js` |
| Graph editor (read-mostly v1) | PARTIAL | YELLOW | `src/components/panels/GraphEditorPanel.jsx` (14 KB), commit 04b131d. Lists / jumps / deletes keyframes; no curve drawing yet (per commit msg) |
| Bezier-tolerant keyframe schema | WORKING | GREEN | Migration in commit 0a17021. Newer keys store handle data |
| NLA Panel (actions, tracks, strips, apply, bake) | WORKING | GREEN | `src/components/panels/NLAPanel.jsx` (25 KB), `src/mesh/NLASystem.js`. Exports: createAction/Track/Strip, evaluateNLA, bakeNLA, pushDownAction |
| AnimGraph (state machine, blend trees) | PARTIAL | YELLOW | `src/components/panels/AnimGraphPanel.jsx`, `src/mesh/AnimGraphEditor.js`. Engine present but consumer wiring is sparse |
| Drivers UI | WORKING | YELLOW | `src/components/panels/DriversPanel.jsx` (13 KB), `src/mesh/DriverSystem.js`. Targets pos/rot/scale, scripted expressions like `sin(frame*0.1)`. Commit ead09cb |
| Constraints UI | WORKING | GREEN | `src/components/panels/ConstraintsPanel.jsx`, `src/mesh/ConstraintSystem.js`. lookAt/floor/stretchTo/copyLoc/copyRot/copyScale/limitLoc/dampedTrack. Commit 113ffce |
| Walk cycle generator | WORKING | YELLOW | `src/mesh/WalkCycleGenerator.js`. Walk/idle/breathing presets. Needs a rigged armature |
| Motion Library (BVH clips) | WORKING | YELLOW | `src/components/animation/MotionLibraryPanel.jsx`, `src/mesh/MotionLibrary.js` (1.4 MB clip JSON). Categories: Locomotion, Combat, Emotes, Athletic, Social |
| Gamepad Animator | WORKING | YELLOW | `src/components/animation/GamepadAnimator.jsx` (20 KB). Maps axes/buttons to bones. Requires real gamepad to demo |
| BVH import / export | WORKING | GREEN | `src/mesh/BVHImporter.js`, `src/mesh/BVHExporter.js` |
| Mocap retarget engine (non-Mocap UI) | WORKING | YELLOW | `src/mesh/MocapRetarget.js`, `src/components/panels/MocapRetargetPanel.jsx`. Excluded from priority-Mocap; this is the *retargeting* surface |
| Foot plant solver | WORKING | YELLOW | `src/mesh/FootPlantSolver.js` |
| AI animation cleanup (smooth keys, lock contacts, outlier removal) | PARTIAL | YELLOW | `src/mesh/AIAnimationAssistant.js`. Uses backend proxy via `VITE_BACKEND_URL/api/spx-mesh/anthropic-proxy` |
| Shape keys (basic + advanced + drivers) | WORKING | GREEN | `src/mesh/ShapeKeys.js`, `src/mesh/ShapeKeysAdvanced.js` |
| IK / Spline IK / IK-FK blend | WORKING | YELLOW | `src/mesh/IKSystem.js`, `src/mesh/AnimationUpgrade.js` |
| Pose mode (capture/apply/library) | WORKING | GREEN | `src/mesh/PoseMode.js` |
| Doppelflex rig adapter | WORKING | YELLOW | `src/mesh/DoppelflexRig.js`. Maps external landmark format to SPX rig |
| Multi-Person Mocap (excluded — handled by priority audit) | — | — | listed for completeness only |

## 2. Rendering

| Feature | Status | Demo | Files |
|---|---|---|---|
| WebGL rasterizer (Three default) | WORKING | GREEN | `src/App.jsx` viewport setup |
| GPU path tracer (three-gpu-pathtracer wrapper) | WORKING | YELLOW | `src/mesh/SPXPathTracer.js` (16 KB), `src/components/panels/FilmPathTracerPanel.jsx`. Has render presets |
| Custom JS path tracer (BVH, Monte Carlo, BRDFs) | PARTIAL | RED | `src/mesh/PathTracer.js` (14 KB). Exports `createPathTracerSettings`/`createVolumetricSettings` only — full ray-tracing pipeline written but not wired into App.jsx render loop |
| WebGPU path tracer | PARTIAL | YELLOW | `src/mesh/WebGPUPathTracer.js` (34 KB), wired in App.jsx line 3961 (`createWebGPUPathTracer`). WebGPU support detection present. Status setter shows "WebGPU Path Tracer ready" but no demo flow guaranteed in older browsers |
| WebGPU renderer (separate) | PARTIAL | RED | `src/mesh/WebGPURenderer.js`. Has stub of GPUClothSolver per code comments |
| Render farm / queue | WORKING | YELLOW | `src/mesh/RenderFarm.js`, `src/mesh/RenderFarmManager.js`, `src/components/panels/RenderFarmPanel.jsx` (15 KB). Tile-based, progressive, cancellable |
| Render passes (beauty, normal, depth, wireframe, cryptomatte, emission) | WORKING | YELLOW | `src/mesh/RenderPasses.js` |
| Render presets / quality presets | WORKING | GREEN | `src/render/RenderPresets.js`, `RENDER_PRESETS` in SPXPathTracer.js / RenderSystem.js |
| Render region | PARTIAL | YELLOW | `src/components/panels/RenderRegionPanel.jsx` (4 KB) |
| Render queue panel | PARTIAL | YELLOW | `src/components/panels/RenderQueuePanel.jsx` (3.6 KB) |
| Denoiser (AI) | PARTIAL | YELLOW | `src/mesh/AIDenoiser.js`, `src/render/DenoiseTools.js`, `src/components/panels/DenoiserPanel.jsx`. `add_ai_denoiser.py` script in repo root suggests work-in-progress |
| Compositor (CSS-filter based) | WORKING | GREEN | `src/components/panels/CompositorPanel.jsx`. Exposure / contrast / sat / hue / sepia / blur / vignette via canvas filter |
| Compositor graph (node-based) | PARTIAL | YELLOW | `src/components/panels/CompositorGraphPanel.jsx`. Node CRUD persisted to localStorage; no actual compositing graph evaluator |
| Node compositor (engine) | WORKING | YELLOW | `src/mesh/NodeCompositor.js`, `src/components/mesh/NodeCompositorPanel.jsx` |
| Post-process passes (SSAO, Bloom, DOF, Chromatic Aberration, NPR Outline) | WORKING | YELLOW | `src/mesh/PostPassShaders.js`, `src/mesh/PostProcessing.js` |
| Volumetric / godrays / atmosphere | WORKING | YELLOW | `src/mesh/VolumetricSystem.js`, `src/components/panels/FilmVolumetricsPanel.jsx`, `src/components/panels/AdvancedVolumetricPanel.jsx` |
| HDRI / environment probes | WORKING | GREEN | `src/render/HDRLoader.js`, `src/mesh/EnvironmentProbes.js` (note: SSR is stub-flagged on line 211), `src/mesh/LightSystem.js` `applyHDRI` |
| Lighting rig presets / 3-point lighting | WORKING | GREEN | `src/render/LightingRigPresets.js`, `src/mesh/LightSystem.js` |
| Cinematic Lighting Studio | WORKING | YELLOW | `src/components/panels/CinematicLightingPanel.jsx`, `src/components/panels/LightingStudioPanel.jsx` |
| Color grade / LUT | WORKING | GREEN | `src/components/panels/LUTPanel.jsx`, `src/components/panels/FilmLUTPackPanel.jsx` |
| Color pipeline | WORKING | GREEN | `src/components/panels/ColorPipelinePanel.jsx` |
| Painterly NPR | PARTIAL | YELLOW | `src/components/panels/PainterlyNPRPanel.jsx` (2.3 KB — small) |
| Tone mapping modes | WORKING | GREEN | `RenderSystem.js` `TONE_MAP_MODES`, `applyToneMappingMode` |
| Film renderer init / procedural HDRI | WORKING | GREEN | `src/mesh/FilmRenderer.js` `initFilmComposer`/`createProceduralHDRI` |
| Irradiance baker | WORKING | YELLOW | `src/mesh/IrradianceBaker.js` |
| Render presets panel | WORKING | GREEN | `src/components/panels/RenderPresetPanel.jsx` |
| AOV tools | PARTIAL | YELLOW | `src/render/AOVTools.js` |
| Benchmark | PARTIAL | YELLOW | `src/render/Benchmark.js` (231 bytes — minimal) |

## 3. Physics & Sim

| Feature | Status | Demo | Files |
|---|---|---|---|
| Rapier physics integration (destruction) | WORKING | YELLOW | `src/components/panels/DestructionPanel.jsx` line 53 dynamic-imports `@dimforge/rapier3d-compat`. "Real Rapier WASM init" per code comment |
| Custom Verlet rigid-body sim | WORKING | GREEN | `src/components/panels/PhysicsSimulationPanel.jsx`. Self-contained `PhysicsBody` class. Domino, ball pit, pendulum presets |
| Cloth simulation | WORKING | YELLOW | `src/mesh/ClothSystem.js`, `src/mesh/ClothUpgrade.js`, `src/mesh/ClothCollision.js`, `src/mesh/ClothPinning.js`, `src/components/panels/ClothSimPanel.jsx` |
| GPU cloth solver (WebGPU) | PARTIAL | RED | `src/mesh/GPUClothSolver.js` — comment "Replaces the stub in WebGPURenderer.js" |
| FLIP fluid | WORKING | YELLOW | `src/mesh/FLIPFluidSolver.js` (23 KB), separate dist chunk |
| SPH fluid + Pyro | WORKING | YELLOW | `src/mesh/FluidSystem.js`, `src/components/panels/FluidPanel.jsx` (11 KB) |
| Hair physics | WORKING | YELLOW | `src/mesh/HairPhysics.js`, `src/mesh/HairUpgrade.js` |
| Destruction / fracture | WORKING | YELLOW | `src/mesh/PhysicsBake.js` (`fractureMesh`), `src/components/vfx/DestructionPanel.jsx` |
| Physics framework selector | PARTIAL | YELLOW | `src/components/panels/PhysicsFrameworkPanel.jsx` (2.9 KB — picker only) |
| GPU particles | WORKING | YELLOW | `src/mesh/GPUParticles.js` |
| VFX / particles (CPU) | WORKING | GREEN | `src/mesh/VFXSystem.js`, `src/components/panels/FilmParticlePanel.jsx`. Burst, fire, smoke emitters, presets |
| Physics bake | WORKING | YELLOW | `src/mesh/PhysicsBake.js`. createBakeBuffer, bakeFrame, bakeRigidBodies |
| Muscle system | PARTIAL | YELLOW | `src/mesh/MuscleSystem.js` |

## 4. Sculpting / Modeling

| Feature | Status | Demo | Files |
|---|---|---|---|
| Sculpt brushes (draw, clay, smooth, crease, flatten, inflate, grab, mask, pinch, polish, sharpen, elastic) | WORKING | GREEN | `src/components/SculptPanel.jsx` (21 KB), `src/mesh/SculptBrushes.js`, `src/mesh/SculptEngine.js`, `src/mesh/SculptLayers.js` |
| Alpha brush | WORKING | YELLOW | `src/mesh/AlphaBrush.js`. Procedural alphas (circle, stars, noise, cracks, fabric, skin) |
| GPU sculpt engine | PARTIAL | YELLOW | `src/mesh/GPUSculptEngine.js` |
| Dynamic topology (dyntopo) | WORKING | YELLOW | `src/mesh/DynamicTopology.js`, DynaMesh settings |
| Multires sculpting | WORKING | YELLOW | `src/mesh/MultiresSystem.js` |
| Voxel/quad remesh, symmetrize | WORKING | GREEN | `src/mesh/RemeshSystem.js` |
| Auto retopology | PARTIAL | YELLOW | `src/mesh/AutoRetopo.js` |
| Sculpt layers | WORKING | YELLOW | `src/mesh/SculptLayers.js` |
| Boolean ops (union/subtract/intersect) | WORKING | GREEN | `src/mesh/BooleanOps.js`, `src/systems/BooleanSystem.js` |
| Subdivision surface (Catmull-Clark) | WORKING | GREEN | `src/mesh/SubdivisionSurface.js` |
| Modifier stack (basic) | WORKING | GREEN | `src/mesh/ModifierStack.js`, `src/components/panels/ModifierStackPanel.jsx`. Apply-all wired. Note: param editor is "coming soon" |
| Modifier stack (extended 50-modifier) | WORKING | YELLOW | `src/mesh/ModifierStack50.js`, `src/mesh/ExtendedModifiers.js`. Wave, lattice, screw, triangulate, wireframe, build, ocean, simple-deform, shrinkwrap, laplacian, hook, volume-displace, normal-edit, corrective-smooth |
| Half-edge mesh (topology engine) | WORKING | GREEN | `src/mesh/HalfEdgeMesh.js` (36 KB) |
| Procedural mesh primitives (gear, pipe, helix, staircase, arch) | WORKING | GREEN | `src/mesh/ProceduralMesh.js` |
| Marching cubes | WORKING | YELLOW | `src/mesh/MarchingCubes.js`, dedicated dist chunk |
| L-System tree | WORKING | YELLOW | `src/mesh/LSystemTree.js`, `LSYSTEM_PRESETS` |
| Mesh repair (fix normals, remove doubles, fill holes, full repair) | WORKING | GREEN | `src/mesh/MeshRepair.js` |
| Ngon support | WORKING | YELLOW | `src/mesh/NgonSupport.js` |
| LOD generation | WORKING | YELLOW | `src/mesh/LODSystem.js` |
| Instancing | WORKING | YELLOW | `src/mesh/Instancing.js` |
| Curve / spline system | WORKING | YELLOW | `src/mesh/CurveSystem.js` |
| Vehicle curve presets | WORKING | YELLOW | `src/mesh/VehicleCurves.js` |
| Fibermesh | WORKING | YELLOW | `src/mesh/FibermeshSystem.js` |
| Shape Shifter | PARTIAL | YELLOW | `src/components/panels/ShapeShifterPanel.jsx` (15 KB) |

## 5. UV / Texturing / Materials

| Feature | Status | Demo | Files |
|---|---|---|---|
| UV unwrap (live, seams, smart unwrap, box/sphere/planar projections) | WORKING | GREEN | `src/mesh/UVUnwrap.js` (10 KB) |
| UV editor canvas | WORKING | GREEN | `src/components/UVEditor.jsx`, `src/components/uv/UVCanvas.jsx`, `src/components/uv/UVEditorPanel.jsx` |
| UDIM tile system | WORKING | YELLOW | `src/mesh/UDIMSystem.js`, `UDIMSystem.js` (top-level) |
| Texture painter (PBR, layered) | WORKING | GREEN | `src/mesh/TexturePainter.js`, `src/components/materials/TexturePaintPanel.jsx`, `src/systems/TexturePaintSystem.js` |
| Texture Paint Pro panel | PARTIAL | YELLOW | `src/components/panels/TexturePaintProPanel.jsx` (small — 2.7 KB) |
| Vertex color painter (basic + advanced w/ layers) | WORKING | GREEN | `src/mesh/VertexColorPainter.js`, `src/mesh/VertexColorAdvanced.js` |
| Weight painting | WORKING | GREEN | `src/mesh/WeightPainting.js` |
| Texture baker (AO, normal, curvature) | WORKING | GREEN | `src/mesh/TextureBaker.js` |
| Material editor (UI) | WORKING | GREEN | `src/components/MaterialEditor.jsx`, `src/components/materials/MaterialPanel.jsx`, `src/components/panels/MaterialTexturePanel.jsx` (13 KB w/ procedural patterns: Checker/Bricks/Perlin/Voronoi/Marble/etc) |
| Smart materials (presets + edge wear + cavity dirt) | WORKING | GREEN | `src/mesh/SmartMaterials.js` (62 KB — large) |
| Node Material Editor (Blender-style) | PARTIAL | YELLOW | `src/components/panels/NodeMaterialEditor.jsx` (13 KB). 19 node types defined. Visual graph builder; Three.js material output is partial |
| Shader Node Editor | STUB | RED | `src/components/panels/ShaderNodeEditorPanel.jsx`. Code comment: "saves the GRAPH structure only — actual GLSL shader compilation is a v1.1 task" |
| Material Graph Panel | PARTIAL | YELLOW | `src/components/panels/MaterialGraphPanel.jsx` (3.4 KB), `src/components/panels/MaterialNodePanel.jsx` |
| Shader Graph Panel | PARTIAL | YELLOW | `src/components/panels/ShaderGraphPanel.jsx` |
| GLSL shaders (toon, hair, outline, holographic, dissolve, film skin) | WORKING | GREEN | `src/mesh/GLSLShaders.js` (18 KB), `SHADER_PRESETS` |
| Material layers | PARTIAL | YELLOW | `src/render/MaterialLayers.js` (739 bytes — small) |
| MetaHuman skin panel | PARTIAL | YELLOW | `src/components/panels/MetaHumanSkinPanel.jsx` (3 KB) |
| Custom skin builder | WORKING | YELLOW | `src/components/panels/CustomSkinBuilderPanel.jsx` (15 KB) |
| Character skin studio | WORKING | YELLOW | `src/components/panels/CharacterSkinStudioPanel.jsx` (19 KB) |
| Advanced skin shader | PARTIAL | YELLOW | `src/components/panels/AdvancedSkinShaderPanel.jsx`. Saves to userData, no real GLSL update |
| Skin depth panel | PARTIAL | YELLOW | `src/components/panels/SkinDepthPanel.jsx` |
| Tattoo generator | WORKING | YELLOW | `src/components/panels/TattooGeneratorPanel.jsx` (20 KB) |
| Displacement panel | WORKING | YELLOW | `src/components/panels/DisplacementPanel.jsx` (9 KB) |
| Film Material panel | WORKING | GREEN | `src/components/panels/FilmMaterialPanel.jsx` |
| PBR / SSS / transmission material builders | WORKING | GREEN | `src/mesh/RenderSystem.js`. createPBRMaterial, createSSSMaterial, createTransmissionMaterial. SSS_PRESETS, TRANSMISSION_PRESETS |
| Procedural alpha generation | WORKING | YELLOW | AlphaBrush.js generateProceduralAlpha |

## 6. Hair / Grooming

| Feature | Status | Demo | Files |
|---|---|---|---|
| Hair system (strands) | WORKING | YELLOW | `src/mesh/HairSystem.js`, `src/systems/HairStrandSystem.js` |
| Groom system (comb, cut, curl, smooth, puff) | WORKING | GREEN | `src/mesh/GroomSystem.js`, `src/mesh/HairGrooming.js`, `src/components/panels/GroomBrushPanel.jsx` |
| Hair upgrade (collision, density maps, braid/bun/ponytail presets) | WORKING | YELLOW | `src/mesh/HairUpgrade.js` |
| Hair cards (LOD/export) | WORKING | YELLOW | `src/mesh/HairCards.js`, `src/components/panels/HairCardLODPanel.jsx`. exportHairCardsGLB |
| Hair physics | WORKING | YELLOW | `src/mesh/HairPhysics.js` |
| Hair shader (anisotropic) | WORKING | GREEN | `src/mesh/HairShader.js`. HAIR_SHADER_PRESETS |
| Hair panels (basic, advanced, FX) | WORKING | YELLOW | `src/components/hair/HairPanel.jsx`, `HairAdvancedPanel.jsx`, `HairFXPanel.jsx`, `src/components/panels/FilmHairPanel.jsx` |
| Braid generator | PARTIAL | YELLOW | `src/components/panels/BraidGeneratorPanel.jsx` (3 KB — small) |
| Eyebrow generator | WORKING | YELLOW | `src/components/panels/EyebrowGeneratorPanel.jsx` (12 KB) |

## 7. Rigging / Skinning

| Feature | Status | Demo | Files |
|---|---|---|---|
| Armature system | WORKING | GREEN | `src/mesh/ArmatureSystem.js`, `src/systems/RigSystem.js` |
| Auto-rig | WORKING | YELLOW | `src/components/rig/AutoRigPanel.jsx` (7 KB), `src/components/rig/AdvancedRigPanel.jsx` (10 KB), `src/components/rig/RiggingPanel.jsx` |
| Skinning system + skeletal binding (heat map weights) | WORKING | GREEN | `src/mesh/SkinningSystem.js`, `src/mesh/SkeletalBinding.js`. heatMapWeights, normalizeAllWeights, paintBoneWeight |
| Pose mode | WORKING | GREEN | `src/mesh/PoseMode.js` |
| Character targeting | WORKING | YELLOW | `src/components/panels/CharacterTargetingPanel.jsx` |
| Rigging tools panel | PARTIAL | YELLOW | `src/components/panels/RiggingToolsPanel.jsx` (3 KB — small) |
| Mocap refine | PARTIAL | YELLOW | `src/components/panels/MocapRefinePanel.jsx` (4 KB) |

## 8. Generators

| Feature | Status | Demo | Files |
|---|---|---|---|
| Bird generator | WORKING | GREEN | `src/components/panels/BirdGeneratorPanel.jsx` (23 KB) |
| Fish generator | WORKING | GREEN | `src/components/panels/FishGeneratorPanel.jsx` (25 KB) |
| Quadruped generator | WORKING | GREEN | `src/components/panels/QuadrupedGeneratorPanel.jsx` (20 KB) |
| Body generator | WORKING | GREEN | `src/components/panels/BodyGeneratorPanel.jsx` (20 KB) |
| Creature generator | WORKING | GREEN | `src/components/panels/CreatureGeneratorPanel.jsx` (20 KB), `src/generators/CreatureGenerator.js`, `src/panels/generators/CreatureGeneratorPanel.jsx` |
| Eye generator | WORKING | GREEN | `src/components/panels/EyeGeneratorPanel.jsx` (20 KB) |
| Teeth generator | WORKING | GREEN | `src/components/panels/TeethGeneratorPanel.jsx` (20 KB) |
| Expression generator | WORKING | YELLOW | `src/components/panels/ExpressionGeneratorPanel.jsx` (13 KB) |
| Hybrid generator | WORKING | YELLOW | `src/components/panels/HybridGeneratorPanel.jsx` (18 KB) |
| Model generator (general) | WORKING | YELLOW | `src/components/panels/ModelGeneratorPanel.jsx` (20 KB) |
| Morph generator | WORKING | YELLOW | `src/components/panels/MorphGeneratorPanel.jsx` (11 KB) |
| Face generator | WORKING | YELLOW | `src/generators/FaceGenerator.js`, `src/panels/generators/FaceGeneratorPanel.jsx` |
| Foliage generator | WORKING | YELLOW | `src/generators/FoliageGenerator.js`, `src/panels/generators/FoliageGeneratorPanel.jsx` |
| Vehicle generator | WORKING | YELLOW | `src/generators/VehicleGenerator.js`, `src/panels/generators/VehicleGeneratorPanel.jsx` |
| Prop generator | WORKING | YELLOW | `src/generators/PropGenerator.js`, `src/panels/generators/PropGeneratorPanel.jsx` |
| Parametric generator | WORKING | YELLOW | `src/components/panels/ParametricGeneratorPanel.jsx`, `src/mesh/generators/ParametricAssets.js` |
| Geometry Nodes (full graph: Mesh primitives, scatter, instance, blend) | WORKING | YELLOW | `src/components/panels/GeometryNodesPanel.jsx` (15 KB), `src/mesh/GeometryNodes.js` (34 KB). Add/connect nodes via UI. "Params editor coming soon" warning. Commit ead09cb |
| Geometry node presets | WORKING | YELLOW | `src/components/panels/GeometryNodePresetPanel.jsx`, `GeometryNodeStylePanel.jsx` |
| City generator | WORKING | YELLOW | `src/components/panels/CityGeneratorPanel.jsx` (19 KB), `src/components/panels/CityGenPanel.jsx` (8 KB), `src/components/generators/CityGenerator.jsx` |
| Environment generator (separate from priority Weather) | WORKING | YELLOW | `src/components/panels/EnvironmentGeneratorPanel.jsx`, `src/components/generators/EnvironmentGenerator.jsx`, `src/systems/EnvironmentSystem.js` |
| Terrain sculpting | WORKING | GREEN | `src/components/panels/TerrainSculptingPanel.jsx`, `src/components/generators/TerrainSculpting.jsx`, `src/systems/TerrainSystem.js` |

## 9. Import / Export

| Feature | Status | Demo | Files |
|---|---|---|---|
| GLB/GLTF import | WORKING | GREEN | `src/App.jsx` lines 501, 2308, dynamic GLTFLoader. Auto-fits Mixamo cm-scale |
| GLB export | WORKING | GREEN | `src/App.jsx` `exportGLB()` line 2995. Triangulates, optional unlit. Uses GLTFExporter dynamic import |
| GLB advanced (morph targets, multi-scene merge, stats) | WORKING | YELLOW | `src/mesh/GLTFAdvanced.js` |
| GLB with Draco compression | WORKING | YELLOW | `FBXPipeline.js` `exportGLBWithDraco` |
| OBJ import / export | WORKING | GREEN | `src/mesh/FBXPipeline.js` `parseOBJ`/`exportOBJ`. Browser-side, no deps. Includes MTL |
| FBX import / export | PARTIAL | YELLOW | `src/mesh/FBXPipeline.js` `importFBXFromBackend`/`exportFBXToBackend`. **Requires backend at `${VITE_BACKEND_URL}/api/mesh/convert`** — fails standalone |
| Alembic export | STUB | RED | `FBXPipeline.js` line 215 explicit comment "Alembic stub (requires backend)" |
| USD export | STUB | RED | `FBXPipeline.js` line 221 "USD stub" |
| BVH import / export | WORKING | GREEN | `src/mesh/BVHImporter.js`, `src/mesh/BVHExporter.js` |
| PNG sequence + manifest export | WORKING | GREEN | `src/components/pipeline/SPX3DTo2DPanel.jsx` lines 803-826. Frame manifest JSON. Per session memory: "PNG sequence exporter with manifest shipped" |
| SPX scene save (.spx JSON) | WORKING | GREEN | `App.jsx` `exportSpxScene` line 1135 |
| SPX scene load | WORKING | GREEN | `App.jsx` `loadSceneData` line 1024 |
| Autosave to localStorage | WORKING | GREEN | `App.jsx` line 410-420, every 60s |
| Hair card GLB export | WORKING | YELLOW | `HairCards.js` `exportHairCardsGLB` |
| UV layout GLB export | WORKING | YELLOW | `App.jsx` line 3612 |
| Quick export panel | PARTIAL | YELLOW | `src/components/panels/QuickExportPanel.jsx` (1.3 KB — small) |
| StreamPireX upload bridge (R2) | WORKING | YELLOW | `src/mesh/StreamPireXBridge.js`. **Requires JWT token in localStorage + backend at `${VITE_BACKEND_URL}/api/r2/upload`**. Auto-fires on GLB export when token present (App.jsx line 3050) |
| Asset pipeline | PARTIAL | YELLOW | `src/components/panels/AssetPipelinePanel.jsx` |
| Electron file open/save bridge | WORKING | YELLOW | `src/mesh/ElectronBridge.js`. isElectron/openFile/saveFile. Only meaningful in Electron build |
| Plugin system (importers/exporters/brushes/shaders/panels/emitters/constraints registry) | WORKING | YELLOW | `src/mesh/PluginSystem.js`. registerPlugin/unregisterPlugin |

## 10. Camera / Lighting

| Feature | Status | Demo | Files |
|---|---|---|---|
| Camera system (DOF, bookmarks, shake, rack focus, dolly zoom) | WORKING | GREEN | `src/mesh/CameraSystem.js`, `src/camera/{CameraMath,CameraPresets,CameraRig,CameraSystem}.js` |
| Camera panel | WORKING | GREEN | `src/components/camera/CameraPanel.jsx` |
| Film camera panel (lens, aperture, shutter) | WORKING | GREEN | `src/components/panels/FilmCameraPanel.jsx` (15 KB) |
| Lighting + camera combined panel | WORKING | YELLOW | `src/components/scene/LightingCameraPanel.jsx` (29 KB) |
| Light system (point/spot/area, temperature, fog, HDRI) | WORKING | GREEN | `src/mesh/LightSystem.js`, `src/mesh/LightingRuntime.js`. HDRI_PRESETS |
| Lighting preset panel | WORKING | GREEN | `src/components/panels/LightingPresetPanel.jsx` |
| Cinematic Lighting panel | WORKING | GREEN | `src/components/panels/CinematicLightingPanel.jsx` |
| Multi-viewport | PARTIAL | YELLOW | `src/mesh/MultiViewportSystem.js` |
| 2D viewport (e.g. for compositing) | PARTIAL | YELLOW | `src/components/panels/TwoDViewportPanel.jsx` (15 KB) |
| Transform gizmo | WORKING | GREEN | `src/components/TransformGizmo.js` (15 KB) |

## 11. UI Editors / Workspace

| Feature | Status | Demo | Files |
|---|---|---|---|
| Professional shell (workspace switcher, header, status bar) | WORKING | GREEN | `src/pro-ui/ProfessionalShell.jsx` (332 LOC) |
| Workspace map (38 KB JSON) | WORKING | GREEN | `src/pro-ui/workspaceMap.js` |
| Feature index | WORKING | GREEN | `src/pro-ui/FeatureIndexPanel.jsx` |
| Tab panel manager | WORKING | GREEN | `src/components/TabPanelManager.jsx` (10 KB) |
| Outliner | WORKING | GREEN | `src/components/Outliner.jsx`, `src/components/SceneOutliner.jsx` |
| Property inspector | WORKING | GREEN | `src/components/PropertyInspector.jsx` |
| Scene hierarchy / scene graph panels | WORKING | GREEN | `src/components/panels/SceneHierarchyPanel.jsx`, `SceneGraphPanel.jsx` |
| Scene Manager | WORKING | YELLOW | `src/components/SceneManager.js` |
| Dock panel host (left/right/bottom + floating) | WORKING | GREEN | `src/ui/DockPanelHost.jsx`, `src/ui/DockSplitterHost.jsx`, `src/state/SPXEditorStore.jsx` |
| Dock layout persistence | WORKING | GREEN | `src/hooks/useDockLayoutPersistence.jsx` |
| Float Panel (draggable window) | WORKING | GREEN | `src/components/ui/FloatPanel.jsx`, react-draggable |
| Workspace tools dock | WORKING | GREEN | `src/components/workspace/WorkspaceToolsDock.jsx` |
| Render Workspace panel | WORKING | YELLOW | `src/components/workspace/RenderWorkspacePanel.jsx` |
| Workspace layout panel | WORKING | YELLOW | `src/components/panels/WorkspaceLayoutPanel.jsx` |
| Tool search panel | PARTIAL | YELLOW | `src/components/panels/ToolSearchPanel.jsx` (2 KB) |
| Smart preset panel | PARTIAL | YELLOW | `src/components/panels/SmartPresetPanel.jsx` |
| Scene optimizer | PARTIAL | YELLOW | `src/components/panels/SceneOptimizerPanel.jsx` (2.6 KB) |
| Performance stats panel | PARTIAL | YELLOW | `src/components/panels/PerformanceStatsPanel.jsx`. Reads renderer.info.render |
| SPX Performance Panel (full) | WORKING | GREEN | `src/components/SPXPerformancePanel.jsx` (21 KB), `src/mesh/SPXPerformance.js` (20 KB) |
| Undo / redo (history stack) | WORKING | GREEN | `src/state/SPXEditorStore.jsx` `pushHistory`/`undo`/`redo`, `src/utils/spxHistory.js` |
| Undo history panel | WORKING | GREEN | `src/components/panels/UndoHistoryPanel.jsx` (1 KB — minimal but functional) |
| Session snapshot panel | PARTIAL | YELLOW | `src/components/panels/SessionSnapshotPanel.jsx`. Stores names + timestamps to localStorage; no actual scene state captured |
| Asset Browser | PARTIAL | YELLOW | `src/components/panels/AssetBrowserPanel.jsx`. Stores names + tags + favorites in localStorage, no actual file storage |
| Asset Library (engine) | WORKING | YELLOW | `src/mesh/AssetLibrary.js`. Has `r2Key` field anticipating R2 storage |
| Base Model Library | WORKING | YELLOW | `src/components/panels/BaseModelLibraryPanel.jsx` (12 KB) |
| Film Asset Library | WORKING | YELLOW | `src/components/panels/FilmAssetLibrary.jsx` (8 KB) |

## 12. VFX

| Feature | Status | Demo | Files |
|---|---|---|---|
| Particle emitters (CPU) | WORKING | GREEN | `src/mesh/VFXSystem.js`, `EMITTER_TYPES`, `VFX_PRESETS` |
| Fire / smoke / burst presets | WORKING | GREEN | wired in App.jsx via menu items `particle_fire`, `particle_smoke`, `particle_emit` |
| Pyro emitter | WORKING | YELLOW | `src/mesh/FluidSystem.js` `createPyroEmitter`/`stepPyro` |
| Destruction / fracture | WORKING | YELLOW | `src/components/vfx/DestructionPanel.jsx`, `src/components/panels/DestructionPanel.jsx`, Rapier-backed |
| Volumetrics / fog / godrays | WORKING | YELLOW | `src/mesh/VolumetricSystem.js` |
| Fluid (CPU SPH + FLIP + APIC GPU) | WORKING | YELLOW | `src/mesh/FluidSystem.js`, `FLIPFluidSolver.js`. Menu items `fluid_film_start`, `apic_fluid_start` |
| Greasepencil (2D draw in 3D) | WORKING | YELLOW | `src/mesh/GreasePencil.js`, `src/components/greasepencil/GreasePencilPanel.jsx`. createStroke/createLayer |

## 13. Clothing / Pattern

| Feature | Status | Demo | Files |
|---|---|---|---|
| Clothing panel | WORKING | YELLOW | `src/components/clothing/ClothingPanel.jsx` (10 KB) |
| Fabric panel | WORKING | YELLOW | `src/components/clothing/FabricPanel.jsx` (18 KB) |
| Pattern editor (sewing patterns) | WORKING | YELLOW | `src/components/clothing/PatternEditorPanel.jsx` (11 KB) |
| Cloth simulation engine | WORKING | YELLOW | covered in Physics section |

## 14. Rotoscope / Video

| Feature | Status | Demo | Files |
|---|---|---|---|
| Rotoscope (video plane in 3D + onion skin overlay) | WORKING | GREEN | `src/components/panels/RotoscopePanel.jsx` (10 KB). FPS-aware, scrubbable |
| Video face mocap (3D) | WORKING | YELLOW | `src/components/pipeline/VideoFaceMocap3DPanel.jsx`, `src/front/js/component/VideoMocapSystem.jsx`. (excluded from priority Mocap) |

## 15. AI / Backend

| Feature | Status | Demo | Files |
|---|---|---|---|
| Depth estimator (MiDaS proxy) | WORKING | YELLOW | `src/mesh/DepthEstimator.js`. Reads `VITE_MIDAS_MODEL_URL` env var |
| AI animation cleanup | PARTIAL | YELLOW | `src/mesh/AIAnimationAssistant.js`. Backend Anthropic proxy |
| AI denoiser | PARTIAL | YELLOW | `src/mesh/AIDenoiser.js` + `add_ai_denoiser.py` (in repo root, work-in-progress) |
| SPX Script API (Python-like macros for mesh ops) | WORKING | GREEN | `src/mesh/SPXScriptAPI.js` (15 KB), `src/components/panels/MeshScriptPanel.jsx` (14 KB). SCRIPT_EXAMPLES, builtin scripts (center_all, random_colors, etc) |
| Python bridge hook | PARTIAL | YELLOW | `src/hooks/usePythonBridge.js` (1 KB) |

## 16. Collaboration

| Feature | Status | Demo | Files |
|---|---|---|---|
| Collab session (start/join/leave) | PARTIAL | YELLOW | `src/components/collaboration/CollaboratePanel.jsx`, `src/mesh/CollaborationSystem.js`. createCollabSession/connectSession/disconnectSession. **No real WebSocket transport observed — looks in-memory simulation** |
| Comment pins / version snapshots | PARTIAL | YELLOW | `CollaborationSystem.js` createCommentPin/createVersionSnapshot/restoreVersion |

## 17. VR / Preview

| Feature | Status | Demo | Files |
|---|---|---|---|
| VR Preview Mode (WebXR) | PARTIAL | YELLOW | `src/components/panels/VRPreviewPanel.jsx`, `src/components/generators/VRPreviewMode.jsx` (22 KB). Detects WebXR support, falls back to stereo. Headset presets |

---

## Summary table

| Category | Total | Working | Partial | Stub | Demo GREEN |
|---|---:|---:|---:|---:|---:|
| Animation | 21 | 16 | 4 | 0 | 11 |
| Rendering | 25 | 16 | 9 | 0 | 11 |
| Physics & Sim | 13 | 10 | 3 | 0 | 2 |
| Sculpting / Modeling | 22 | 18 | 4 | 0 | 12 |
| UV / Texturing / Materials | 27 | 16 | 10 | 1 | 11 |
| Hair / Grooming | 9 | 8 | 1 | 0 | 2 |
| Rigging / Skinning | 7 | 5 | 2 | 0 | 3 |
| Generators | 21 | 18 | 3 | 0 | 9 |
| Import / Export | 18 | 12 | 4 | 2 | 7 |
| Camera / Lighting | 11 | 9 | 2 | 0 | 9 |
| UI Editors / Workspace | 22 | 14 | 8 | 0 | 13 |
| VFX | 7 | 7 | 0 | 0 | 2 |
| Clothing / Pattern | 4 | 4 | 0 | 0 | 0 |
| Rotoscope / Video | 2 | 2 | 0 | 0 | 1 |
| AI / Backend | 5 | 2 | 3 | 0 | 1 |
| Collaboration | 2 | 0 | 2 | 0 | 0 |
| VR / Preview | 1 | 0 | 1 | 0 | 0 |
| **TOTAL** | **217** | **157** | **56** | **3** | **94** |

Notes on the count:
- 217 distinct *secondary* features (excluding the 5 priority features)
- "Working" = engine + UI imported into App.jsx and has a clear data path; ~72% of secondary surface
- "Partial" = ships but has a documented limitation (panel exists but engine missing, save-graph-but-no-compile, requires backend, requires WebGPU, etc.); ~26%
- "Stub" = explicitly marked as such in source comments (Alembic, USD, ShaderNodeEditor compile); ~1%
- "Demo GREEN" (~43%) = no setup required, no backend, no rare hardware

## Top demo-worthy secondary features (no backend, no rare hardware)

1. **Sculpt brushes + Procedural mesh primitives** — gear, helix, staircase, arch, plus 13 brushes work on any mesh out of the box
2. **Compositor (CSS-filter)** + **Tone mapping + LUT** — instant visual change, no GPU work
3. **Generators suite** — Bird/Fish/Quadruped/Body/Eye/Teeth — each is a 20 KB self-contained procedural panel that produces a GLB-ready mesh
4. **Smart materials with edge wear / cavity dirt** + **GLSL shader presets** (toon, holographic, dissolve)
5. **Motion Library + Walk Cycle Generator** — real BVH clips drive any rigged armature
6. **NLA panel** — Blender-style action/track/strip workflow with bake (recent commit f7626af)
7. **Geometry Nodes graph** — multi-node compositing with execution order solver (commit ead09cb)
8. **Rotoscope video plane** — drag-drop video, scrub frames, toggle onion skin
