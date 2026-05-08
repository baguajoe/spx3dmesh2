# Task 2 — Complete Feature Inventory

_Read-only audit. Status judged by file size, presence of real implementation vs stubs/TODO markers, and whether the panel is wired into `App.jsx`._

> **Out-of-scope (deep audit elsewhere)**: Mocap, 3D→2D, Weather, Crowd, Building. They are listed below for completeness with the marker `[deep audit elsewhere]` so the parallel agent can take ownership.

---

## A. Application Shell / Entry

| Name | Location | Purpose | Status | UI integration |
|---|---|---|---|---|
| App shell | `src/App.jsx` (5,320 lines) | Monolithic root component — owns scene/camera/renderer refs, registers ~70 panel-open `useState`s, mounts everything | WORKING | the app |
| React root | `src/main.jsx` | Mounts `<App>` in StrictMode | WORKING | — |
| ProfessionalShell (top menu bar) | `src/pro-ui/ProfessionalShell.jsx` | Blender-style File/Edit menus that dispatch fn-name events handled by App | WORKING | top of viewport |
| Workspace map | `src/pro-ui/workspaceMap.js` | Defines 12 workspaces × folders × items (Modeling, Sculpt, Animation, Shading, Surface, Rig, Render, FX, World, Gen, MoCap, Performance) — claims "69 systems · 616 exported functions" | WORKING (data file) | drives tab bar |
| FeatureIndexPanel | `src/pro-ui/FeatureIndexPanel.jsx` | Searchable list view over WORKSPACE_FEATURES | WORKING | panel |
| Dock host system | `src/ui/DockPanelHost.jsx`, `src/ui/DockSplitterHost.jsx`, `src/panels/PanelHost.jsx`, `src/panels/registry/`, `src/panels/registerPanels.js` | Floating + dockable panel framework with `window.openSPXPanel` event bridge. Registry only registers 11 of the 105 panels currently | PARTIAL — most panels are mounted directly in `App.jsx`, not through this registry | dispatcher: `window.openSPXPanel(id)` |
| zustand editor store | `src/state/SPXEditorStore.jsx` | Global selection/scene store | WORKING | wraps app |
| Electron bridge | `main.js`, `preload.js`, `src/mesh/ElectronBridge.js` | IPC for fs read/write, Python proc, menu events; renderer reads `window.electronAPI` | WORKING | desktop only |
| Auto-save | inline in `App.jsx` (≈line 408) | Saves mesh transform JSON to `localStorage.spx_autosave` every 60 s | WORKING | invisible |
| `window.hardResetScene()` | `App.jsx:457` | Dev helper to dispose GPU memory + clear scene | WORKING | dev console |
| `window.__spxScene` | recent commit `08b328d` | Dev hook for skeleton inspection | WORKING | dev console |
| ToolSearchPanel | `src/components/panels/ToolSearchPanel.jsx` | Quick-find UI; sets `window.__SPX_TOOL_SEARCH__` and a status string — does not actually open the searched tool | PARTIAL (cosmetic) | floating panel |

---

## B. Modeling / Mesh Editing

| Name | File(s) | Purpose | Status |
|---|---|---|---|
| HalfEdgeMesh core | `src/mesh/HalfEdgeMesh.js` | Half-edge data structure: select / loop_cut / edge_slide / knife / extrude / bevel / grid_fill / multi_cut / vertex tools | WORKING |
| BooleanOps | `src/mesh/BooleanOps.js` | Union / Subtract / Intersect via three-mesh-bvh | WORKING |
| ProceduralMesh | `src/mesh/ProceduralMesh.js` | Cube / Sphere / Cylinder / Cone / Torus / Plane / Icosphere / Gear / Pipe / Helix / Staircase / Arch / Lathe primitives | WORKING |
| NgonSupport | `src/mesh/NgonSupport.js` | Triangulate ngon, dissolve edge, bridge faces, grid fill, poke face, inset face, convert ngons → tris | WORKING |
| MeshRepair | `src/mesh/MeshRepair.js` | Fix normals, remove doubles/degenerates, fill holes, full repair, retopo settings | WORKING |
| ModifierStack | `src/mesh/ModifierStack.js` + `ModifierStack50.js` + `ExtendedModifiers.js` | Wave / Lattice / Screw / Triangulate / Wireframe / Build / Ocean / SimpleDeform / Shrinkwrap / Laplacian / Hook / VolumeDisplace / NormalEdit / CorrectiveSmooth | WORKING |
| ModifierStackPanel | `src/components/panels/ModifierStackPanel.jsx` | UI: drag-reorder, apply-all, dropdown-add (commit `b41ab6b`); contains `title="params (stub)"` for per-modifier params | PARTIAL — params are stubbed |
| GeometryNodes | `src/mesh/GeometryNodes.js` | NODE_TYPES, createNode, createGraph, addNode, connectNodes, evaluateGraph, scatter | WORKING (engine) |
| GeometryNodesPanel | `src/components/panels/GeometryNodesPanel.jsx` | UI for graph; contains `title="params (stub)"` | PARTIAL — UI v1 |
| GeometryNodePresetPanel / GeometryNodeStylePanel | components/panels | Preset library | UNCLEAR |
| CurveSystem | `src/mesh/CurveSystem.js` | Spline, pipe-along-curve, loft, extrude-along | WORKING |
| Instancing | `src/mesh/Instancing.js` | Scatter/grid/flatten instances | WORKING |
| TransformGizmo | `src/components/TransformGizmo.js` | Move/rotate/scale gizmo wrapper | WORKING |
| MeshEditorPanel | `src/components/MeshEditorPanel.jsx` | Top-of-viewport mesh edit tools + properties | WORKING |
| ProMeshPanel | `src/components/mesh/ProMeshPanel.jsx` | Pro mesh editing dock | WORKING |
| Outliner / SceneOutliner / SceneHierarchyPanel | components + components/panels | Tree of scene objects | WORKING |
| PropertyInspector | `src/components/PropertyInspector.jsx` | Selected-object props | WORKING |

---

## C. Sculpting

| Name | File(s) | Purpose | Status |
|---|---|---|---|
| SculptEngine | `src/mesh/SculptEngine.js` | Brush dispatch: draw/clay/smooth/crease/flatten/inflate/grab/mask | WORKING |
| SculptBrushes | `src/mesh/SculptBrushes.js` | BRUSHES dict: trim, pose | WORKING |
| SculptLayers | `src/mesh/SculptLayers.js` | Layered sculpt + ADVANCED_BRUSHES | WORKING |
| SculptPanel | `src/components/SculptPanel.jsx` | Brush UI | WORKING |
| AlphaBrush | `src/mesh/AlphaBrush.js` | Load alpha texture, procedural alphas (circle/stars/noise) | WORKING |
| DynamicTopology | `src/mesh/DynamicTopology.js` | applyDyntopo, createDynaMeshSettings | WORKING |
| DynaMeshSystem | `src/mesh/DynaMeshSystem.js` | Sculpt remesh | WORKING |
| MultiresSystem | `src/mesh/MultiresSystem.js` | Subdivide / set level / bake down | WORKING |
| RemeshSystem | `src/mesh/RemeshSystem.js` | Voxel remesh, quad remesh, symmetrize | WORKING |
| AutoRetopo | `src/mesh/AutoRetopo.js` | Quad-dominant retopo, hard edge detection, symmetry retopo | WORKING |
| MarchingCubes | `src/mesh/MarchingCubes.js` | marchingCubesRemesh, fluidSurfaceMesh | WORKING |
| GPUSculptEngine | `src/mesh/GPUSculptEngine.js` | GPU-accelerated sculpt | WORKING |
| FibermeshSystem | `src/mesh/FibermeshSystem.js` | Fiber mesh generation | WORKING |
| Subdivision | `src/mesh/SubdivisionSurface.js` | Catmull-Clark subdivide | WORKING |

---

## D. UV / Unwrap

| Name | File(s) | Purpose | Status |
|---|---|---|---|
| UVUnwrap engine | `src/mesh/UVUnwrap.js`, `src/mesh/uv/UVUnwrap.js` | markSeam, packUVIslands, liveUnwrap, box/sphere/planar projection | WORKING |
| UVEditor | `src/components/UVEditor.jsx`, `src/components/uv/UVEditorPanel.jsx`, `src/components/uv/UVCanvas.jsx` | UV editor canvas | WORKING |
| UV utilities | `src/mesh/uv/UVIsland.js`, `UVMath.js`, `UVPreview.js`, `UVSelection.js`, `UVSnap.js`, `UVTools.js`, `useUVSync.js` | UV tooling library | WORKING |
| UDIMSystem | `src/mesh/UDIMSystem.js` (+ duplicate root `UDIMSystem.js`) | UDIM layout/paint/tile-export/atlas | WORKING |

---

## E. Materials / Textures / Shading

| Name | File(s) | Purpose | Status |
|---|---|---|---|
| RenderSystem (PBR/SSS/Glass + render queue) | `src/mesh/RenderSystem.js` | createPBRMaterial, createSSSMaterial, createTransmissionMaterial, denoise, render queue, RENDER_PRESETS, TONE_MAP_MODES, SSS_PRESETS | WORKING |
| SmartMaterials | `src/mesh/SmartMaterials.js` | Edge wear, cavity dirt, presets, full skin texture gen, displacement, skin tones (Porcelain → Ebony), eye/lip materials, area-light setup | WORKING |
| GLSLShaders | `src/mesh/GLSLShaders.js` | Toon, hair, holographic, dissolve, outline, PBR-advanced, film skin | WORKING |
| TexturePainter | `src/mesh/TexturePainter.js` | Canvas-based paint, layers, fill, paint at UV | WORKING |
| TexturePaintPanel | `src/components/materials/TexturePaintPanel.jsx`, `src/components/panels/TexturePaintProPanel.jsx` | UI | WORKING |
| TextureBaker | `src/mesh/TextureBaker.js` | Bake AO / normal / curvature / all | WORKING |
| MaterialEditor | `src/components/MaterialEditor.jsx` | Material UI | WORKING |
| MaterialPanel | `src/components/materials/MaterialPanel.jsx` | Material browser | WORKING |
| Material/Shader graphs | `src/components/panels/MaterialGraphPanel.jsx`, `MaterialNodePanel.jsx`, `MaterialTexturePanel.jsx`, `NodeMaterialEditor.jsx`, `ShaderGraphPanel.jsx`, `ShaderNodeEditorPanel.jsx` | Node-based shader/material UIs | UNCLEAR — multiple parallel implementations, likely partial |
| VertexColorPainter / VertexColorAdvanced | `src/mesh/VertexColorPainter.js`, `VertexColorAdvanced.js` | Init/paint/fill/gradient + layer stack, smear, blur, flatten, layer blend modes | WORKING |
| ShapeKeys / ShapeKeysAdvanced | `src/mesh/ShapeKeys.js`, `ShapeKeysAdvanced.js` | createShapeKey, mirror, blend, driver, build morph targets | WORKING |
| Hair shaders | `src/mesh/HairShader.js` | Anisotropic hair material, presets | WORKING |
| Skin Studio | `src/components/panels/CharacterSkinStudioPanel.jsx`, `MetaHumanSkinPanel.jsx`, `AdvancedSkinShaderPanel.jsx`, `FilmSkinPanel.jsx`, `CustomSkinBuilderPanel.jsx`, `SkinDepthPanel.jsx` | Skin shader UI suite | WORKING (multiple variants) |
| MaterialLayers | `src/render/MaterialLayers.js` | Layered shading | WORKING |

---

## F. Rigging / Skinning

| Name | File(s) | Purpose | Status |
|---|---|---|---|
| ArmatureSystem | `src/mesh/ArmatureSystem.js` | createArmature, addBone, parentBone, display | WORKING |
| PoseMode | `src/mesh/PoseMode.js` | Enter pose, capture/apply, rest, library, FK chain | WORKING |
| IKSystem | `src/mesh/IKSystem.js` | createIKChain, FABRIK, two-bone | WORKING |
| AnimationUpgrade | `src/mesh/AnimationUpgrade.js` | createSplineIK, IK/FK blend, NLA-advanced, GLTF clip build, shape-key drivers | WORKING |
| ConstraintSystem | `src/mesh/ConstraintSystem.js` | LookAt, Floor, StretchTo, CopyLoc/Rot/Scale, LimitLoc, DampedTrack, applyAll | WORKING |
| ConstraintsPanel | `src/components/panels/ConstraintsPanel.jsx` | UI with target picker + apply-all (commit `113ffce`) | WORKING |
| DriverSystem | `src/mesh/DriverSystem.js` | createDriver, expression, presets, applyAll | WORKING |
| DriversPanel | `src/components/panels/DriversPanel.jsx` | UI (commit `ead09cb`) | WORKING |
| SkeletalBinding | `src/mesh/SkeletalBinding.js` | heatMapWeights, bindSkeletonAdvanced, normalize, paintBoneWeight | WORKING |
| WeightPainting | `src/mesh/WeightPainting.js` | initWeights | WORKING |
| SkinningSystem | `src/mesh/SkinningSystem.js` | createSkinnedMesh, bind, mixer, playClip | WORKING |
| AutoRig | `src/mesh/rig/AutoRigSystem.js`, `AdvancedRigging.js`, `AutoRigGuides.js` | Default rig guides, mirror, settings | WORKING |
| AutoRigPanel / AdvancedRigPanel / RiggingPanel | `src/components/rig/*.jsx` | Rig UI | WORKING |
| RigSystem | `src/systems/RigSystem.js` | Higher-level rig system | WORKING |
| DoppelflexRig | `src/mesh/DoppelflexRig.js` | Build rig from MediaPipe landmarks, apply frame, retarget to SPX, build three-skeleton | WORKING |
| MuscleSystem | `src/mesh/MuscleSystem.js` | Muscle simulation | WORKING |
| FootPlantSolver | `src/mesh/FootPlantSolver.js` | Detect foot plants, fix planting, solve | WORKING |
| RiggingToolsPanel | `src/components/panels/RiggingToolsPanel.jsx` | UI | WORKING |
| CharacterTargetingPanel | `src/components/panels/CharacterTargetingPanel.jsx` | Mesh-filter target picker | WORKING |

---

## G. Animation

| Name | File(s) | Purpose | Status |
|---|---|---|---|
| NLASystem | `src/mesh/NLASystem.js` | createAction, createTrack, createStrip, evaluateNLA, pushDownAction, bakeNLA | WORKING |
| NLAPanel | `src/components/panels/NLAPanel.jsx` | Actions, tracks, strips, apply, bake (commit `f7626af`) | WORKING |
| GraphEditorPanel | `src/components/panels/GraphEditorPanel.jsx`, `src/components/GraphEditor.jsx` | Read-mostly v1: list / jump / delete keyframes (commit `04b131d`) + bezier-tolerant schema (commit `0a17021`) | PARTIAL — read-mostly |
| AnimationPanel | `src/components/AnimationPanel.jsx` | Keyframe + driver UI | WORKING |
| AnimationTimeline | `src/components/AnimationTimeline.jsx` | Timeline scrubber | WORKING |
| animationKeyUtils | `src/animation/animationKeyUtils.js` | Bezier-tolerant key utilities (commit `0a17021`) | WORKING |
| timelineUtils | `src/animation/timelineUtils.js` | Timeline math | WORKING |
| onionSkin | `src/animation/onionSkin.js` | OnionSkin class — `attach/detach/update/dispose` are explicit `// TODO: implement next session` | **STUB** |
| WalkCycleGenerator | `src/mesh/WalkCycleGenerator.js`, `src/generators/WalkCycleGenerator.js` (duplicate) | Walk / idle / breathing / WALK_STYLES | WORKING |
| AssetLibrary procedural anim | `src/mesh/AssetLibrary.js` | Float, spin, pulse, audio-reactive PROCEDURAL_ANIMATIONS | WORKING |
| AnimGraphEditor | `src/mesh/AnimGraphEditor.js` | AnimationGraph, BlendTree, AnimStateMachine | WORKING |
| AnimGraphPanel | `src/components/panels/AnimGraphPanel.jsx` | UI | WORKING |
| GamepadAnimator | `src/components/animation/GamepadAnimator.jsx` | Gamepad-driven animation | WORKING |
| MotionLibraryPanel | `src/components/animation/MotionLibraryPanel.jsx` | Search MOTION_CLIPS / categories | WORKING |
| MotionLibrary | `src/mesh/MotionLibrary.js` | MOTION_CLIPS, MOTION_CATEGORIES, getClipBVH | WORKING |
| Bone keyframing | inline App.jsx + commit `25153ef` | Click-select, evaluator replay, helpers | WORKING |

---

## H. Rendering

| Name | File(s) | Purpose | Status |
|---|---|---|---|
| FilmRenderer | `src/mesh/FilmRenderer.js` | initFilmComposer, createProceduralHDRI, upgradeMaterialsToPhysical | WORKING |
| PathTracer | `src/mesh/PathTracer.js` | Path tracer settings | WORKING |
| SPXPathTracer | `src/mesh/SPXPathTracer.js` | SPX path tracer + RENDER_PRESETS | WORKING |
| WebGPUPathTracer | `src/mesh/WebGPUPathTracer.js` | createWebGPUPathTracer | WORKING |
| WebGPURenderer | `src/mesh/WebGPURenderer.js` | (note: `GPUClothSolver.js` says "replaces stub in WebGPURenderer.js" — historic stub flag) | UNCLEAR |
| FilmPathTracerPanel | `src/components/panels/FilmPathTracerPanel.jsx` | UI; lazy-imports `three-gpu-pathtracer` | WORKING |
| RenderSystem | `src/mesh/RenderSystem.js` | createRenderQueue, runRenderQueue, RENDER_PRESETS, TONE_MAP_MODES, captureFrame, downloadFrame, getRenderStats | WORKING |
| RenderQueuePanel | `src/components/panels/RenderQueuePanel.jsx` | UI | WORKING |
| RenderRegionPanel | `src/components/panels/RenderRegionPanel.jsx` | UI | WORKING |
| RenderPresetPanel / RenderPresets | `src/components/panels/RenderPresetPanel.jsx`, `src/render/RenderPresets.js` | Quality presets | WORKING |
| RenderPasses | `src/mesh/RenderPasses.js` | Beauty / normal / depth / wireframe / cryptomatte / emission / composite | WORKING |
| RenderFarm + RenderFarmManager | `src/mesh/RenderFarm.js`, `RenderFarmManager.js` | Job queue, WebGPU detect, IBL, cascade shadows, NPR outline | WORKING |
| RenderFarmPanel | `src/components/panels/RenderFarmPanel.jsx` | UI | WORKING |
| BatchRenderQueue / Benchmark | `src/render/BatchRenderQueue.js`, `Benchmark.js` | Render-tier helpers | WORKING |
| AOVTools | `src/render/AOVTools.js` | AOV passes | WORKING |
| DenoiseTools / AIDenoiser | `src/render/DenoiseTools.js`, `src/mesh/AIDenoiser.js` | Denoise | WORKING |
| DenoiserPanel | `src/components/panels/DenoiserPanel.jsx` | UI | WORKING |
| PostProcessing + PostPassShaders | `src/mesh/PostProcessing.js`, `PostPassShaders.js` | SSAO, Bloom, DOF, Chromatic, Vignette, Grain, LUT, Sharpen | WORKING |
| FilmPostPanel | `src/components/panels/FilmPostPanel.jsx` | UI | WORKING |
| LUTPanel + FilmLUTPackPanel | components/panels | LUT controls | WORKING |
| ColorPipelinePanel | `src/components/panels/ColorPipelinePanel.jsx` | Color pipeline | WORKING |
| LightSystem + LightingRuntime + LightingRigPresets | `src/mesh/LightSystem.js`, `LightingRuntime.js`, `src/render/LightingRigPresets.js` | createLight, three-point, area, HDRI, fog, temperature, helpers | WORKING |
| LightingStudioPanel / LightingPresetPanel / CinematicLightingPanel / LightingCameraPanel | components | UI variants | WORKING |
| HDRLoader | `src/render/HDRLoader.js` | HDRI loader | WORKING |
| EnvironmentSystem + EnvironmentProbes + IrradianceBaker | `src/systems/EnvironmentSystem.js`, `src/mesh/EnvironmentProbes.js`, `src/mesh/IrradianceBaker.js` | Reflection probe, irradiance probe, SSR (note: `// SSR requires post-processing pass — stub`), bake | PARTIAL — SSR is stub |
| EnvironmentPresetPanel | components/panels | UI | WORKING |
| VolumetricSystem + AdvancedVolumetric | `src/mesh/VolumetricSystem.js` | Fog, height fog, god rays, atmosphere, light shafts | WORKING |
| VolumetricPanel + AdvancedVolumetricPanel + FilmVolumetricsPanel | components/panels | UI | WORKING |
| CameraSystem (×2) | `src/mesh/CameraSystem.js`, `src/camera/CameraSystem.js` | createCamera, bookmarks, DOF, shake, dolly, rack focus | WORKING |
| CameraMath / CameraPresets / CameraRig | `src/camera/*` | Camera math | WORKING |
| CameraPanel + FilmCameraPanel | components/camera + components/panels | UI | WORKING |
| MultiViewportSystem | `src/mesh/MultiViewportSystem.js` | createQuadCameraSet, resize, render set, detect from pointer, snap to axis | WORKING |
| RenderWorkspacePanel | `src/components/workspace/RenderWorkspacePanel.jsx` | Render workspace | WORKING |
| FilmRenderPipeline | `src/components/panels/FilmRenderPipeline.jsx` | Film output pipeline | WORKING |
| SceneAnalyzer / SceneOptimizer | `src/render/SceneAnalyzer.js`, `src/components/panels/SceneOptimizerPanel.jsx` | Stats | WORKING |
| PerformanceStatsPanel | `src/components/panels/PerformanceStatsPanel.jsx` | FPS / poly stats | WORKING |
| SkinShader | `src/render/SkinShader.js` | Skin shader | WORKING |
| FilmAssetLibrary | `src/components/panels/FilmAssetLibrary.jsx` | Asset library | WORKING |

---

## I. VFX / Simulation

| Name | File(s) | Purpose | Status |
|---|---|---|---|
| VFXSystem | `src/mesh/VFXSystem.js` | createParticle, createEmitter, particle system, destruction effect, VFX_PRESETS, EMITTER_TYPES | WORKING |
| GPUParticles | `src/mesh/GPUParticles.js` | createGPUParticleSystem, force fields, burst/continuous emit | WORKING |
| FluidSystem + FLIPFluidSolver | `src/mesh/FluidSystem.js`, `src/mesh/FLIPFluidSolver.js` | SPH fluid, FLIP, pyro emitter, fluid mesh | WORKING |
| FluidPanel | `src/components/vfx/FluidPanel.jsx`, `src/components/panels/FluidPanel.jsx`, `src/mesh/FluidPanel.js` | UI (multiple copies) | WORKING |
| WeatherSystem | `src/mesh/WeatherSystem.js` | createWeatherSystem, stepWeather, applyWeatherPreset, WEATHER_PRESETS | WORKING (engine) |
| **WeatherPanel** | `src/components/vfx/WeatherPanel.jsx`, `src/components/panels/WeatherPanel.jsx`, `FilmWeatherPanel.jsx`, `src/mesh/WeatherPanel.js` | **[deep audit elsewhere]** |
| **CrowdSystem / CrowdPanel / CrowdGeneratorPanel / ProceduralCrowdGenerator** | `src/mesh/CrowdSystem.js`, `src/components/panels/CrowdPanel.jsx`, `CrowdGeneratorPanel.jsx`, `src/components/generators/ProceduralCrowdGenerator.jsx` | **[deep audit elsewhere]** |
| **BuildingSimulator / BuildingSimulatorPanel** | `src/components/generators/BuildingSimulator.jsx`, `src/components/panels/BuildingSimulatorPanel.jsx` | **[deep audit elsewhere]** |
| ClothSystem + ClothUpgrade + GPUClothSolver + ClothCollision + ClothPinning | `src/mesh/ClothSystem.js`, `ClothUpgrade.js`, `GPUClothSolver.js`, `ClothCollision.js`, `ClothPinning.js` | Spring constraints, GPU solver, colliders, self-collision, pin/soft-pin/pin-to-bone | WORKING |
| ClothSimPanel | `src/components/panels/ClothSimPanel.jsx` | UI | WORKING |
| HairSystem + HairUpgrade + HairCards + HairPhysics + HairGrooming + HairShader | `src/mesh/HairSystem.js`, `HairUpgrade.js`, `HairCards.js`, `HairPhysics.js`, `HairGrooming.js`, `HairShader.js` | Strand/tube hair, braid/bun/ponytail presets, hair cards, physics, grooming brushes | WORKING |
| Hair sub-modules | `src/mesh/hair/` (18 files: ProceduralBraids, HairCards, HairCardUV, HairLOD, HairLayers, HairAccessories, HairAdvancedEditing, HairBrushes, HairFitting, HairMaterials, HairMath, HairProceduralTextures, HairRigPhysics, HairTemplates, HairWindCollision, GroomStrands, WetHairShader, index) | Detailed hair systems | WORKING |
| HairStrandSystem | `src/systems/HairStrandSystem.js` | Higher-level hair | WORKING |
| HairPanel + HairAdvancedPanel + HairFXPanel + GroomBrushPanel + HairCardLODPanel + BraidGeneratorPanel + FilmHairPanel + FadeToolPanel | components/hair + components/panels | UI suite | WORKING |
| GroomSystem | `src/mesh/GroomSystem.js` | GROOM_TOOLS dispatcher | WORKING |
| Cloth + Garment systems | `src/mesh/clothing/` (16 files: BodyMeasurementFit, ClothSimulation, CollisionPinning, FabricPresets, FlatSketchExport, GarmentColorways, GarmentFitting, GarmentGrading, GarmentTemplates, GarmentThickness, GarmentUVAuto, LayeredGarments, PatternBridge, PatternEditor, SeamStitching, WrinkleNoise) | Garment workflow | WORKING |
| ClothingPanel + FabricPanel + PatternEditorPanel | components/clothing | UI | WORKING |
| DestructionPanel | `src/components/vfx/DestructionPanel.jsx`, `src/mesh/DestructionPanel.js`, `src/components/panels/DestructionPanel.jsx` | Lazy-imports `@dimforge/rapier3d-compat` for fracture/rigidbody | WORKING |
| PhysicsBake | `src/mesh/PhysicsBake.js` | createBakeBuffer, bakeFrame, restoreFrame, createRigidBody, fractureMesh | WORKING |
| PhysicsFrameworkPanel + PhysicsSimulation + PhysicsSimulationPanel | components | Physics UI | WORKING |
| MarchingCubes | `src/mesh/MarchingCubes.js` | Surface from voxel field | WORKING |
| WorkerBridge | `src/mesh/WorkerBridge.js` | createClothWorker, createSPHWorker, createWorkerPool, getWorkerSupport | WORKING |
| SimCache | `src/render/SimCache.js` | Simulation caching | WORKING |

---

## J. World / Generators

> Building, Crowd marked elsewhere. The rest live mostly under two parallel directories: `src/components/generators/` (React panels) and `src/generators/` (engines), plus `src/panels/generators/` (LazyPanel wrappers).

| Name | File(s) | Purpose | Status |
|---|---|---|---|
| EnvironmentGenerator | `src/components/generators/EnvironmentGenerator.jsx` + `src/components/panels/EnvironmentGeneratorPanel.jsx` + `src/systems/EnvironmentSystem.js` | World env | WORKING |
| CityGenerator | `src/components/generators/CityGenerator.jsx` + `src/components/panels/CityGeneratorPanel.jsx` + `CityGenPanel.jsx` | Procedural city | WORKING |
| TerrainSculpting / TerrainSculptingPanel / TerrainSystem | `src/components/generators/TerrainSculpting.jsx`, `src/components/panels/TerrainSculptingPanel.jsx`, `src/systems/TerrainSystem.js` | Terrain | WORKING |
| FoliageGenerator | `src/generators/FoliageGenerator.js` + `src/generators/foliage/`, `src/panels/generators/FoliageGeneratorPanel.jsx` | Foliage | WORKING |
| VehicleGenerator | `src/generators/VehicleGenerator.js`, `src/generators/vehicle/`, `src/panels/generators/VehicleGeneratorPanel.jsx`, `src/mesh/VehicleCurves.js` | Vehicles + curve presets | WORKING |
| CreatureGenerator | `src/generators/CreatureGenerator.js`, `src/generators/creature/`, `src/panels/generators/CreatureGeneratorPanel.jsx`, `src/components/panels/CreatureGeneratorPanel.jsx`, `QuadrupedGeneratorPanel.jsx` | Creatures | WORKING |
| FaceGenerator | `src/generators/FaceGenerator.js`, `src/generators/face/`, `src/panels/generators/FaceGeneratorPanel.jsx`, `src/components/panels/EyeGeneratorPanel.jsx`, `EyebrowGeneratorPanel.jsx`, `TeethGeneratorPanel.jsx`, `ExpressionGeneratorPanel.jsx`, `MorphGeneratorPanel.jsx`, `TattooGeneratorPanel.jsx` | Faces + features | WORKING |
| PropGenerator | `src/generators/PropGenerator.js`, `src/generators/prop/`, `src/panels/generators/PropGeneratorPanel.jsx` | Props | WORKING |
| BirdGeneratorPanel | `src/components/panels/BirdGeneratorPanel.jsx` | Birds | WORKING |
| FishGeneratorPanel | `src/components/panels/FishGeneratorPanel.jsx` | Fish | WORKING |
| BodyGeneratorPanel | `src/components/panels/BodyGeneratorPanel.jsx` | Bodies | WORKING |
| ModelGeneratorPanel | `src/components/panels/ModelGeneratorPanel.jsx` | Generic | WORKING |
| HybridGeneratorPanel | `src/components/panels/HybridGeneratorPanel.jsx` | Hybrid | WORKING |
| ShapeShifterPanel | `src/components/panels/ShapeShifterPanel.jsx` | Shape blend | WORKING |
| BaseModelLibraryPanel | `src/components/panels/BaseModelLibraryPanel.jsx` | Has explicit "Lightweight placeholder mesh so user sees something immediately" comment — uses placeholder stand-in | PARTIAL |
| ParametricGeneratorPanel + ParametricAssets | `src/components/panels/ParametricGeneratorPanel.jsx`, `src/mesh/generators/ParametricAssets.js` | Parametric | WORKING |
| LSystemTree | `src/mesh/LSystemTree.js` | buildLSystemTree, LSYSTEM_PRESETS | WORKING |
| AssetLibrary + AssetLibraryPanel + AssetBrowserPanel + FilmAssetLibrary | `src/mesh/AssetLibrary.js`, `src/components/generators/AssetLibrary.jsx`, `src/components/panels/AssetBrowserPanel.jsx`, `FilmAssetLibrary.jsx` | Asset browse / favorites / R2 upload (R2 is referenced; backend handler not in repo) | WORKING (frontend) |
| AssetPipelinePanel + mesh/pipeline/AssetPipeline | components/panels + mesh | Asset pipeline | WORKING |
| NodeModifierSystem | `src/components/generators/NodeModifierSystem.jsx` | Node modifier graph | WORKING |
| VRPreviewMode + VRPreviewPanel | `src/components/generators/VRPreviewMode.jsx`, `src/components/panels/VRPreviewPanel.jsx` | VR preview | UNCLEAR |
| Tour / Theme | `src/mesh/UISystem.js` (createTourState, TOUR_STEPS, applyTheme) | Onboarding tour, themes | WORKING |
| **Crowd** features | `src/mesh/CrowdSystem.js`, `CrowdPanel.jsx`, `CrowdGeneratorPanel.jsx`, `ProceduralCrowdGenerator.jsx` | **[deep audit elsewhere]** |
| **Building** features | `src/components/generators/BuildingSimulator.jsx`, `src/components/panels/BuildingSimulatorPanel.jsx` | **[deep audit elsewhere]** |

---

## K. Mocap (deep audit elsewhere — listed for completeness only)

> All marked **[deep audit elsewhere]**.

| Name | File(s) |
|---|---|
| SPXPerformance (full mocap pipeline) | `src/mesh/SPXPerformance.js` (~34 exports: import/retarget/clean/blend/sequence/export, `createPerformanceSession`, `importBVHClip`, `importMediaPipeClip`, `tickPerformance`) |
| MocapRetarget | `src/mesh/MocapRetarget.js` (DEFAULT_BONE_MAP, retargetFrame, bakeRetargetedAnimation, fixFootSliding, autoDetectBoneMap, getRetargetStats) |
| MultiPersonMocap | `src/mesh/MultiPersonMocap.js` (loads `@mediapipe/pose` + `@mediapipe/holistic` from CDN; comment "For now, simulate with placeholder data") |
| BVHImporter / BVHExporter | `src/mesh/BVHImporter.js`, `BVHExporter.js` |
| MocapWorkspace | `src/workspaces/mocap/MocapWorkspace.jsx` (770 lines), `src/pages/mocap/MocapWorkspace.jsx` (duplicate) |
| MocapRefinePanel / MocapRetargetPanel | `src/components/panels/MocapRefinePanel.jsx`, `MocapRetargetPanel.jsx` |
| Legacy mocap components | `src/front/js/component/LiveMoCapAvatar.jsx`, `MotionCapture.jsx`, `MotionCaptureSystem.jsx`, `MotionCaptureWithRecording.jsx`, `MotionFromVideo.jsx`, `VideoMocapSystem.jsx`, `AvatarRigPlayer3D.jsx`, `AvatarWithPose.jsx`, `PoseVisualization.jsx` (uses `@mediapipe/pose` import — package NOT installed → likely dead) |
| AIAnimationAssistant | `src/mesh/AIAnimationAssistant.js` (smoothKeyframes, lockFootContacts, removeOutliers, cleanMocapCapture; calls `/api/spx-mesh/anthropic-proxy` on backend) |
| useFaceMocap / useHandMocap | (referenced from `index.html` comment; not yet found in repo — check `src/hooks/`) |
| VideoFaceMocap3DPanel | `src/components/pipeline/VideoFaceMocap3DPanel.jsx` |

---

## L. 3D → 2D Pipeline (deep audit elsewhere)

> The user's "platform's strongest Techstars differentiator" — full deep audit by the parallel agent.

- `src/pipeline/SPX3DTo2DPipeline.js` (774 lines, exports `BONE_MAP_3D_TO_2D`, `CINEMATIC_STYLES`, `SPX3DTo2DRenderer`, `SPX3DTo2DSkeletonRenderer`, `getStylesByCategory`, `getStyleCount`)
- `src/components/pipeline/SPX3DTo2DPanel.jsx` (935 lines, ~40+ visible cinematic styles, JSZip-powered PNG sequence + manifest exporter — confirmed the "PNG sequence with manifest" feature)
- `src/components/pipeline/SPX2DStylePresets.js`
- `src/components/pipeline/ExportToPuppetButton.jsx` (StreamPireX SPX Puppet handoff)
- `src/components/panels/TwoDViewportPanel.jsx`
- `src/components/panels/RotoscopePanel.jsx`
- `src/mesh/DepthEstimator.js` (MiDaS ONNX, env-driven model URL, 196 lines)

---

## M. Pipeline / IO / Collaboration / Plugins

| Name | File(s) | Purpose | Status |
|---|---|---|---|
| FBXPipeline | `src/mesh/FBXPipeline.js` | exportOBJ, parseOBJ, importFBXFromBackend, exportFBXToBackend, exportAlembic, exportUSD, exportGLBWithDraco | WORKING (FBX/Alembic/USD route through backend; in-file comment marks Alembic + USD as "stub (requires backend)") |
| StreamPireXBridge | `src/mesh/StreamPireXBridge.js` | sendMeshToStreamPireX (defaults to railway URL) | WORKING |
| UISystem | `src/mesh/UISystem.js` | applyTheme, createTour, TOUR_STEPS, buildSPXExportPayload, exportToStreamPireX, downloadSPXFile, SHORTCUT_CATEGORIES | WORKING |
| LODSystem | `src/mesh/LODSystem.js` | generateLOD | WORKING |
| SceneCreator | `src/mesh/SceneCreator.js` | createScene, addObjectToScene, applyEnvironment, SCENE_PRESETS, ENVIRONMENT_PRESETS | WORKING |
| SceneManager | `src/components/SceneManager.js` | createSceneObject, buildPrimitiveMesh | WORKING |
| CollaborationSystem | `src/mesh/CollaborationSystem.js` | createUser, comment pin, version snapshot, restore, broadcast (mock WebSocket; no real signalling backend in this repo) | PARTIAL (frontend only) |
| CollaboratePanel | `src/components/collaboration/CollaboratePanel.jsx` | UI | PARTIAL |
| PluginSystem | `src/mesh/PluginSystem.js` | registerPlugin, loadPluginFromURL, createPresetMarketplace, searchPresets, installPreset | UNCLEAR — present, no marketplace backend wired |
| GLTFAdvanced | `src/mesh/GLTFAdvanced.js` | morph targets, weight apply, extract animations, merge scenes, stats | WORKING |
| ElectronBridge | `src/mesh/ElectronBridge.js` | isElectron, isDesktop, openFile, saveFile | WORKING |
| QuickExportPanel | `src/components/panels/QuickExportPanel.jsx` | One-click export | WORKING |
| SessionSnapshotPanel | `src/components/panels/SessionSnapshotPanel.jsx` | Session save | WORKING |
| UndoHistoryPanel + spxHistory util | `src/components/panels/UndoHistoryPanel.jsx`, `src/utils/spxHistory.js` | History | WORKING |
| SmartPresetPanel | `src/components/panels/SmartPresetPanel.jsx` | Smart presets | WORKING |
| WorkspaceLayoutPanel | `src/components/panels/WorkspaceLayoutPanel.jsx` | Save/load layouts | WORKING |
| MeshScriptPanel + SPXScriptAPI / SPXScriptRunner | `src/components/panels/MeshScriptPanel.jsx`, `src/mesh/SPXScriptAPI.js` | JS scripting console (Ctrl+Enter to run) | WORKING |
| GreasePencilPanel + GreasePencil engine | `src/components/greasepencil/GreasePencilPanel.jsx`, `src/mesh/GreasePencil.js` | Strokes, layers, onion, interpolate | WORKING |

---

## N. Notable Stubs / Partial / Suspicious

| Item | Location | Note |
|---|---|---|
| OnionSkin | `src/animation/onionSkin.js` | All four lifecycle methods are explicit `// TODO` — only the constructor and class shell exist |
| GeometryNodesPanel — params | `src/components/panels/GeometryNodesPanel.jsx:271` | `title="params (stub)"` per-node param editor |
| ModifierStackPanel — params | `src/components/panels/ModifierStackPanel.jsx:241` | `title="params (stub)"` per-modifier param editor |
| GraphEditorPanel | commit `04b131d` reads "read-mostly v1, list/jump/delete keyframes" | No bezier-handle drag yet |
| FBXPipeline (Alembic / USD) | `src/mesh/FBXPipeline.js:215, 221` | "// ── Alembic stub (requires backend) ──" / "// ── USD stub ──" |
| EnvironmentProbes SSR | `src/mesh/EnvironmentProbes.js:211` | "SSR requires post-processing pass — stub for shader pipeline integration" |
| MultiPersonMocap | `src/mesh/MultiPersonMocap.js:213` | "For now, simulate with placeholder data" |
| ToolSearchPanel | `src/components/panels/ToolSearchPanel.jsx` | `activate()` only sets `window.__SPX_TOOL_SEARCH__` and a status message — does not actually open the searched panel |
| BaseModelLibraryPanel | `src/components/panels/BaseModelLibraryPanel.jsx:78` | "Lightweight placeholder mesh so user sees something immediately" |
| CollaborationSystem | `src/mesh/CollaborationSystem.js` | Mock WebSocket connect — no signalling backend in this repo |
| `LiveMoCapAvatar.jsx` | `src/front/js/component/LiveMoCapAvatar.jsx` | Imports `@mediapipe/pose` package not in `package.json` → would throw if rendered |
| Legacy duplicates | many | Several systems live in 3+ places: `WeatherPanel` (vfx + panels + mesh), `FluidPanel` (vfx + panels + mesh), `WalkCycleGenerator` (mesh + generators), `UDIMSystem` (root + mesh), `MocapWorkspace` (workspaces + pages) |
| `App.jsx` backups in repo | `src/App.jsx.bak_*`, `App.jsx.before_*` (×4 files, committed) | Should not ship |
| Loose root files | `App_chunk7.jsx` (30 KB), `UDIMSystem.js`, ~15 stray CSS files at root, ~10 Python migration scripts, `wire24.py`, `wire-all.cjs` | Likely orphaned from older organisation pre-`tools/` |

---

## O. Top-level Feature Counts

| Category | Count |
|---|---|
| `src/components/panels/*.jsx` panels | **105** |
| `src/mesh/*.js` engine modules (top level) | **115** |
| Workspaces (workspaceMap) | **12** |
| Workspace items (folders × items, total leaf entries in `WORKSPACE_TREE`) | ~250 (declared) |
| Workspace map self-description | "69 systems · 616 exported functions" |
| Total `*.jsx` files in `src/` | **188** |
| Total `*.js` files in `src/` | **224** |
| Generator categories (face / foliage / vehicle / creature / prop + city / environment / terrain / building / crowd / asset library / VR / parametric) | 13+ |
| Distinct render-related panels | ~25 |
| Hair-related panels | 8 |
| Skin/face panels | 10+ |
| MoCap-related files | 18+ (deep audit elsewhere) |

**Gross app-level feature surface** (engines + panels + workspace items, deduplicated): roughly **180–200 distinct user-facing features** spread across **~340 source files** — consistent with the "80+ mesh files" memory and likely undercount.
