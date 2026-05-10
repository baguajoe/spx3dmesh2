import GroomBrushPanel from "./components/panels/GroomBrushPanel.jsx";
import BraidGeneratorPanel from "./components/panels/BraidGeneratorPanel.jsx";
import FadeToolPanel from "./components/panels/FadeToolPanel.jsx";
import HairCardLODPanel from "./components/panels/HairCardLODPanel.jsx";
import NodeCompositorPanel from './components/mesh/NodeCompositorPanel';
import CustomSkinBuilderPanel from './components/panels/CustomSkinBuilderPanel';
import RenderFarmPanel from './components/panels/RenderFarmPanel.jsx';
import SPX3DTo2DPanel from './components/pipeline/SPX3DTo2DPanel';
import { WORKSPACES, DEFAULT_WORKSPACE } from "./pro-ui/workspaceMap";
import CityGeneratorPanel from './components/panels/CityGeneratorPanel';
import VRPreviewPanel from './components/panels/VRPreviewPanel';
import CrowdGeneratorPanel from './components/panels/CrowdGeneratorPanel';
import EnvironmentGeneratorPanel from './components/panels/EnvironmentGeneratorPanel';
import BuildingSimulatorPanel from './components/panels/BuildingSimulatorPanel';
import PhysicsSimulationPanel from './components/panels/PhysicsSimulationPanel';
import TerrainSculptingPanel from './components/panels/TerrainSculptingPanel';
import MaterialTexturePanel from './components/panels/MaterialTexturePanel';
import { ViewportHeader } from "./components/ViewportHeader";
import { PropertyInspector } from "./components/PropertyInspector";
import { Outliner } from "./components/Outliner";
import ProMeshPanelNew from "./components/mesh/ProMeshPanel.jsx";
import React, { useState, useEffect, useCallback, useRef } from "react";
import DockPanelHost from "./ui/DockPanelHost";
import { SPXEditorProvider } from "./state/SPXEditorStore";
import DockSplitterHost from "./ui/DockSplitterHost";
import PanelHost from "./panels/PanelHost";
import { registerAllPanels } from "./panels/registerPanels";
import Draggable from 'react-draggable'; // (SPX: Draggable Window System)

import SPXPerformancePanel from "./components/SPXPerformancePanel.jsx"; import * as THREE from "three";
import FloatPanel from "./components/ui/FloatPanel.jsx";
import TabPanelManager from "./components/TabPanelManager.jsx";
import { initFilmComposer, createProceduralHDRI, upgradeMaterialsToPhysical } from "./mesh/FilmRenderer.js";
import FilmPostPanel from "./components/panels/FilmPostPanel.jsx";
import FilmAssetLibrary from "./components/panels/FilmAssetLibrary.jsx";
import FilmMaterialPanel from "./components/panels/FilmMaterialPanel.jsx";
import FilmSculptPanel from "./components/panels/FilmSculptPanel.jsx";
import FilmCameraPanel from "./components/panels/FilmCameraPanel.jsx";
import FilmSkinPanel from "./components/panels/FilmSkinPanel.jsx";
import FilmHairPanel from "./components/panels/FilmHairPanel.jsx";
import FilmParticlePanel from "./components/panels/FilmParticlePanel.jsx";
import FilmWeatherPanel from "./components/panels/FilmWeatherPanel.jsx";
import NodeMaterialEditor from "./components/panels/NodeMaterialEditor.jsx";
import ClothSimPanel from "./components/panels/ClothSimPanel.jsx";
import DisplacementPanel from "./components/panels/DisplacementPanel.jsx";
import MocapRetargetPanel from "./components/panels/MocapRetargetPanel.jsx";
import CinematicLightingPanel from "./components/panels/CinematicLightingPanel.jsx";
import FilmVolumetricsPanel from "./components/panels/FilmVolumetricsPanel.jsx";
import FilmPathTracerPanel from "./components/panels/FilmPathTracerPanel.jsx";
import RotoscopePanel from "./components/panels/RotoscopePanel.jsx";
import ModifierStackPanel from "./components/panels/ModifierStackPanel.jsx";
import ConstraintsPanel from "./components/panels/ConstraintsPanel.jsx";
import GeometryNodesPanel from "./components/panels/GeometryNodesPanel.jsx";
import DriversPanel from "./components/panels/DriversPanel.jsx";
import NLAPanel from "./components/panels/NLAPanel.jsx";
import GraphEditorPanel from "./components/panels/GraphEditorPanel.jsx";
import FilmSubdivPanel from "./components/panels/FilmSubdivPanel.jsx";
import FilmRenderPipeline from "./components/panels/FilmRenderPipeline.jsx";
import ProfessionalShell from "./pro-ui/ProfessionalShell";
import FeatureIndexPanel from "./pro-ui/FeatureIndexPanel";
import WORKSPACE_FEATURES from "./pro-ui/workspaceMap";

import { markSeam, toggleSeam, clearAllSeams, packUVIslands, liveUnwrap, getSeams } from "./mesh/uv/UVUnwrap.js";
import { HalfEdgeMesh } from "./mesh/HalfEdgeMesh.js";
import { booleanUnion, booleanSubtract, booleanIntersect } from "./mesh/BooleanOps.js";
import { uvBoxProject, uvSphereProject, uvPlanarProject } from "./mesh/UVUnwrap.js";
import { applySculptStroke, getSculptHit } from "./mesh/SculptEngine.js";
import { createShapeKey, applyShapeKeys } from "./mesh/ShapeKeys.js";
import { createPipe, createGear, buildProceduralMesh, createAssetLibrary, createTourState } from "./mesh/ProceduralMesh.js";
import { generateLOD } from "./mesh/LODSystem.js";
import { createArmature } from "./mesh/ArmatureSystem.js";
import { enterPoseMode, capturePose, applyPose, resetToRestPose, savePoseToLibrary, loadPoseFromLibrary } from "./mesh/PoseMode.js";
import { initWeights } from "./mesh/WeightPainting.js";
import { applyDyntopo, createDynaMeshSettings } from "./mesh/DynamicTopology.js";
import { createAction, createTrack, createStrip, evaluateNLA, pushDownAction, bakeNLA } from "./mesh/NLASystem.js";
import { createStroke, createLayer } from "./mesh/GreasePencil.js";
import { NODE_TYPES, createNode, createGraph, addNode, connectNodes, evaluateGraph } from "./mesh/GeometryNodes.js";
import { createSpline } from "./mesh/CurveSystem.js";
import { applyPreset, applyEdgeWear, applyCavityDirt, MATERIAL_PRESETS, DEFAULT_CUSTOM_SKIN, generateFullSkinTextures} from "./mesh/SmartMaterials.js";
import { createPaintTexture, createPaintCanvas, applyPaintTexture, paintAtUV, fillCanvas, createLayerStack, addLayer, flattenLayers } from "./mesh/TexturePainter.js";
import { bakeAO, bakeNormalMap, bakeCurvature, bakeAllMaps, downloadBakedMap } from "./mesh/TextureBaker.js";
import { createLight, createThreePointLighting, applyTemperature, createVolumericFog, removeFog, applyHDRI, addLightHelper, HDRI_PRESETS } from "./mesh/LightSystem.js";
import { createCamera, saveBookmark, restoreBookmark, setDOF, applyCameraShake, rackFocus, dollyZoom } from "./mesh/CameraSystem.js";
import { applyColorGrade, createPassStack } from "./mesh/PostProcessing.js";
import { DEFAULT_BONE_MAP, retargetFrame, bakeRetargetedAnimation, fixFootSliding, autoDetectBoneMap, getRetargetStats } from "./mesh/MocapRetarget.js";
import { parseBVH, applyBVHFrame, buildAnimationClip, buildSkeletonFromBVH } from "./mesh/BVHImporter.js";
import { stepClothUpgraded, buildFullConstraints, applyWindTurbulence, addSewingConstraint, createSpatialHash } from "./mesh/ClothUpgrade.js";
import { buildGLTFMorphTargets, applyGLTFMorphWeights, extractGLTFAnimations, mergeGLTFScenes, getGLTFStats } from "./mesh/GLTFAdvanced.js";
import { applyGroomBrush, combGroom, cutGroom, curlGroom, smoothGroom, puffGroom } from "./mesh/HairGrooming.js";
import { createHairMaterial, createAnisotropicHairMaterial, applyHairPresetToMesh, HAIR_SHADER_PRESETS } from "./mesh/HairShader.js";
// ── 24 newly wired systems ────────────────────────────────────────────────────
import { smoothKeyframes, lockFootContacts, removeOutliers, cleanMocapCapture } from "./mesh/AIAnimationAssistant.js";
import { AnimationGraph, BlendTree, AnimStateMachine, createAnimationGraph } from "./mesh/AnimGraphEditor.js";
import { exportBVH, downloadBVH, captureSkeletonFrame, buildJointsFromSkeleton } from "./mesh/BVHExporter.js";
import { createCrowdSystem, stepCrowd, setCrowdBehavior, disposeCrowd } from "./mesh/CrowdSystem.js";
import { createDepthEstimator } from "./mesh/DepthEstimator.js";
import { isElectron, isDesktop, openFile as electronOpenFile, saveFile as electronSaveFile } from "./mesh/ElectronBridge.js";
import { applyWave, applyLattice, applyScrew, applyTriangulate, applyWireframe, applyBuild, applyOcean, applySimpleDeform, applyShrinkwrap } from "./mesh/ExtendedModifiers.js";
import { detectFootPlants, fixFootPlanting, solveFootPlanting } from "./mesh/FootPlantSolver.js";
import { createGPUClothSolver } from "./mesh/GPUClothSolver.js";
import { createGPUSculptEngine } from "./mesh/GPUSculptEngine.js";
import { GroomSystem, GROOM_TOOLS } from "./mesh/GroomSystem.js";
import { buildLSystemTree, LSYSTEM_PRESETS } from "./mesh/LSystemTree.js";
import { applyLaplacianSmooth, applyHook, applyVolumeDisplace, applyNormalEdit, applyCorrectiveSmooth } from "./mesh/ModifierStack50.js";
import { MOTION_CLIPS, MOTION_CATEGORIES, getClipsByCategory, searchClips, getClipBVH } from "./mesh/MotionLibrary.js";
import { MultiPersonMocap, createMultiPersonMocap } from "./mesh/MultiPersonMocap.js";
import { MuscleSystem } from "./mesh/MuscleSystem.js";
import { createRenderFarm as createRenderFarmManager, RenderFarmManager } from "./mesh/RenderFarmManager.js";
import { SPXPathTracer, RENDER_PRESETS as SPX_RENDER_PRESETS } from "./mesh/SPXPathTracer.js";
import { createPerformanceSession, importBVHClip, importMediaPipeClip } from "./mesh/SPXPerformance.js";
import SPXScriptRunner from "./mesh/SPXScriptAPI.js";
import { catmullClarkSubdivide, SubdivisionModifier } from "./mesh/SubdivisionSurface.js";
import { buildCurvedVehicle, VEHICLE_CURVE_PRESETS } from "./mesh/VehicleCurves.js";
import { createWeatherSystem, stepWeather, applyWeatherPreset, WEATHER_PRESETS } from "./mesh/WeatherSystem.js";
import { WebGPUPathTracer, createWebGPUPathTracer } from "./mesh/WebGPUPathTracer.js";
import { addPointLight, addSpotLight, createTightLightingRig } from "./mesh/LightingRuntime.js";
import { createCompositorGraph, createCompositorNode, COMPOSITOR_NODE_TYPES } from "./mesh/NodeCompositor.js";
import { createScene, createSceneObject as createSceneCreatorObject, addObjectToScene, applyEnvironment, SCENE_PRESETS, ENVIRONMENT_PRESETS } from "./mesh/SceneCreator.js";
import { applyBrush, BRUSHES } from "./mesh/SculptBrushes.js";
import { addSculptLayer, createSculptLayer, evaluateSculptLayers, applyClayBrush, applyFlattenBrush, ADVANCED_BRUSHES } from "./mesh/SculptLayers.js";
import { createIKChain } from "./mesh/IKSystem.js";
import { createPathTracerSettings, createVolumetricSettings } from "./mesh/PathTracer.js";
import { generateFibermesh } from "./mesh/FibermeshSystem.js";
import { createInstances } from "./mesh/Instancing.js";
import { fixNormals, createRetopoSettings, removeDoubles, removeDegenerates, fillHoles, fullRepair } from "./mesh/MeshRepair.js";
import { createPBRMaterial, applyPBRMaps, createSSSMaterial, createTransmissionMaterial, createDisplacementTexture, denoiseCanvas, createRenderQueue, addRenderJob, runRenderQueue, applyRenderPreset, applyToneMappingMode, captureFrame, downloadFrame, getRenderStats, RENDER_PRESETS as RS_RENDER_PRESETS, TONE_MAP_MODES, SSS_PRESETS, TRANSMISSION_PRESETS } from "./mesh/RenderSystem.js";
import { initVCAdvanced, addVCLayer, removeVCLayer, setVCLayerBlendMode, paintVCAdvanced, fillVCLayer, flattenVCLayers, smearVC, blurVCLayer, getVCStats } from "./mesh/VertexColorAdvanced.js";
import { buildRigFromDoppelflex, applyDoppelflexFrame, retargetDoppelflexToSPX, buildThreeSkeletonFromRig, serializeRig, getRigStats, DOPPELFLEX_LANDMARK_MAP } from "./mesh/DoppelflexRig.js";
import { createSSAOPass, createBloomPass, createDOFPass, createChromaticAberrationPass, createPostPassManager } from "./mesh/PostPassShaders.js";
import { applyStrandCollision, createDensityMap, generateBraidPreset, generateBunPreset, generatePonytailPreset, emitHairFromUV, getHairUpgradeStats } from "./mesh/HairUpgrade.js";
import { createParticle, createEmitter, emitParticles, stepEmitter, buildParticleSystem, updateParticleSystem, createDestructionEffect, stepDestructionFrags, getEmitterStats, VFX_PRESETS, EMITTER_TYPES } from "./mesh/VFXSystem.js";
import { createConstraint, applyLookAt, applyFloor, applyStretchTo, applyCopyLocation, applyCopyRotation, applyCopyScale, applyLimitLocation, applyDampedTrack, applyAllConstraints, CONSTRAINT_TYPES } from "./mesh/ConstraintSystem.js";
import { voxelRemesh, quadRemesh, symmetrizeMesh, getRemeshStats } from "./mesh/RemeshSystem.js";
import { createRenderFarm as createRenderFarmLegacy, addRenderFarmJob, cancelRenderJob, runNextRenderJob, getRenderFarmStats, detectWebGPU, getWebGLInfo, applyIBLToScene, setupCascadedShadows, enableShadowsOnScene, createNPROutlinePass } from "./mesh/RenderFarm.js";
import { createAdvancedShapeKey, addAdvancedShapeKey, removeShapeKey, evaluateShapeKeysAdvanced, mirrorShapeKey, blendShapeKeys, driverShapeKey, buildMorphTargetsFromKeys, getShapeKeyStats } from "./mesh/ShapeKeysAdvanced.js";
import { exportOBJ, parseOBJ, importFBXFromBackend, exportFBXToBackend, exportAlembic, exportUSD, exportGLBWithDraco } from "./mesh/FBXPipeline.js";
import { sendMeshToStreamPireX } from "./mesh/StreamPireXBridge.js";
import { heatMapWeights, bindSkeletonAdvanced, normalizeAllWeights, paintBoneWeight, getBindingStats } from "./mesh/SkeletalBinding.js";
import { initVertexColors, paintVertexColor, fillVertexColor, gradientFillVertexColor } from "./mesh/VertexColorPainter.js";
import { createUDIMLayout, createUDIMTileCanvas, paintUDIM, fillUDIMTile, exportUDIMTile, exportAllUDIMTiles, buildUDIMAtlas, getUDIMStats } from "./mesh/UDIMSystem.js";
import { generateWalkCycle, applyWalkCycleFrame, generateIdleCycle, generateBreathingCycle, WALK_STYLES } from "./mesh/WalkCycleGenerator.js";
import { createVolumetricSettings as createVolSettings, applyVolumetricFog, applyHeightFog, createGodRayEffect, applyAtmospherePreset, ATMOSPHERE_PRESETS } from "./mesh/VolumetricSystem.js";
import { renderBeauty, renderNormalPass, renderDepthPass, renderWireframePass, renderCryptomatte, renderEmissionPass, renderAllPasses, downloadPass, compositePasses } from "./mesh/RenderPasses.js";
import { createMultiresStack, subdivideLevel, setMultiresLevel, bakeDownLevel, applyMultires, getMultiresStats } from "./mesh/MultiresSystem.js";
import { createSplineIK, solveSplineIK, createIKFKBlend, updateIKFKBlend, evaluateNLAAdvanced, buildGLTFAnimationClip, updateShapeKeyDrivers } from "./mesh/AnimationUpgrade.js";
import { createUser, createCommentPin, createVersionSnapshot, restoreVersion, createCollabSession, connectSession, broadcastOperation, disconnectSession, getCollabStats } from "./mesh/CollaborationSystem.js";
import { createBakeBuffer, bakeFrame, restoreFrame, createRigidBody, stepRigidBody, bakeRigidBodies, applyBakedFrame, fractureMesh } from "./mesh/PhysicsBake.js";
import { createSPHParticle, createFluidSettings, stepSPH, emitFluid, buildFluidMesh, createPyroEmitter, stepPyro, getFluidStats, FLUID_PRESETS } from "./mesh/FluidSystem.js";
import { loadAlpha, sampleAlpha, applyAlphaBrush, generateProceduralAlpha } from "./mesh/AlphaBrush.js";
import { createHairShaderMaterial, createToonMaterial, createPBRShaderMaterial, createOutlineMaterial, addOutlineToMesh, createHolographicMaterial, updateHolographicTime, createDissolveMaterial, setDissolveAmount, applyShaderPreset, SHADER_PRESETS, createFilmSkinMaterial, applyFilmSkin } from "./mesh/GLSLShaders.js";
import { quadDominantRetopo, detectHardEdges, applySymmetryRetopo, getRetopoStats } from "./mesh/AutoRetopo.js";
import { createClothWorker, runClothWorker, createSPHWorker, runSPHWorker, createWorkerPool, getWorkerSupport } from "./mesh/WorkerBridge.js";
import { createDynaMeshSettings as createDynaSettings, dynaMeshRemesh, getDynaMeshStats } from "./mesh/DynaMeshSystem.js";
import { createDriver, evaluateDriver, applyAllDrivers, DRIVER_TYPES, DRIVER_PRESETS } from "./mesh/DriverSystem.js";
import { createSphereCollider, createBoxCollider, createPlaneCollider, applyCollisions, applySelfCollision, createCollidersFromMesh } from "./mesh/ClothCollision.js";
import { triangulateNgon, buildNgonGeometry, dissolveEdge, bridgeFaces, gridFill, pokeFace, insetFace, convertNgonsToTris } from "./mesh/NgonSupport.js";
import { createReflectionProbe, updateReflectionProbe, applyProbeToScene, createIrradianceProbe, applySSR, bakeEnvironment, createProbeManager } from "./mesh/EnvironmentProbes.js";
import { registerPlugin, getAllPlugins, initPluginAPI, loadPluginFromURL, createPresetMarketplace, searchPresets, installPreset } from "./mesh/PluginSystem.js";
import { applyTheme, createTourState as createTour, TOUR_STEPS, buildSPXExportPayload, exportToStreamPireX, downloadSPXFile, SHORTCUT_CATEGORIES } from "./mesh/UISystem.js";
import { createHairStrand, emitHair, buildHairLines, buildHairTubes, clumpHair, applyHairPreset, getHairStats, HAIR_PRESETS } from "./mesh/HairSystem.js";
import { exportHairCardsGLB, getHairCardStats } from "./mesh/HairCards.js";
import { createGPUParticleSystem, emitGPUParticles, stepGPUParticles, createForceField, burstEmit, continuousEmit, getGPUParticleStats, FORCE_FIELD_TYPES } from "./mesh/GPUParticles.js";
import { createClothParticle, createCloth, stepCloth, applyClothPreset, resetCloth, getClothStats, CLOTH_PRESETS } from "./mesh/ClothSystem.js";
import { pinVertex, unpinVertex, pinVerticesInRadius, pinTopRow, pinToBone, softPin, getPinnedVertices } from "./mesh/ClothPinning.js";
import { marchingCubes, marchingCubesRemesh, fluidSurfaceMesh, getMarchingCubesStats } from "./mesh/MarchingCubes.js";
import { createSkinnedMesh, bindMeshToArmature, createMixer, playClip } from "./mesh/SkinningSystem.js";
import { createHairPhysicsSettings, stepHairPhysics, addWindForce, addCollider, resetHairToRest, bakeHairPhysics } from "./mesh/HairPhysics.js";
import { optimizeScene, applyProceduralAnimation, createAudioAnalyzer, getSceneStats as getLibStats, PROCEDURAL_ANIMATIONS } from "./mesh/AssetLibrary.js";

import { MaterialEditor } from "./components/MaterialEditor.jsx";
import { UVEditor } from "./components/UVEditor.jsx";
import { TransformGizmo } from "./components/TransformGizmo.js";
import { createSceneObject, buildPrimitiveMesh } from "./components/SceneManager.js";
import { MeshEditorPanel, PropertiesPanel } from "./components/MeshEditorPanel.jsx";
import { SceneOutliner } from "./components/SceneOutliner.jsx";
import { SculptPanel } from "./components/SculptPanel.jsx";
import { ShadingPanel } from "./components/ShadingPanel.jsx";
import { AnimationPanel } from "./components/AnimationPanel.jsx";
import { AnimationTimeline } from "./components/AnimationTimeline.jsx";

import "./App.css";
import "./styles/pro-dark.css";
import "./styles/spx-2d-panel.css";
import "./styles/world-generators.css";
import UVEditorPanel from "./components/uv/UVEditorPanel.jsx";
import "./styles/uv-editor.css";
import MaterialPanel from "./components/materials/MaterialPanel.jsx";
import "./styles/material-editor.css";
import TexturePaintPanel from "./components/materials/TexturePaintPanel.jsx";
import "./styles/texture-paint.css";
import ClothingPanel from "./components/clothing/ClothingPanel.jsx";
import FabricPanel from "./components/clothing/FabricPanel.jsx";
import "./styles/clothing-editor.css";
import PatternEditorPanel from "./components/clothing/PatternEditorPanel.jsx";
import "./styles/pattern-editor.css";
import HairPanel from "./components/hair/HairPanel.jsx";
import "./styles/hair-editor.css";
import HairAdvancedPanel from "./components/hair/HairAdvancedPanel.jsx";
import "./styles/hair-advanced.css";
import HairFXPanel from "./components/hair/HairFXPanel.jsx";
import CollaboratePanel from "./components/collaboration/CollaboratePanel.jsx";
import AnimGraphPanel from "./components/panels/AnimGraphPanel.jsx";
import MeshScriptPanel from "./components/panels/MeshScriptPanel.jsx";
import LightingCameraPanel from "./components/scene/LightingCameraPanel.jsx";
// ── Gamepad + Pro Mesh ──
import GamepadAnimator from "./components/animation/GamepadAnimator.jsx";
import MotionLibraryPanel from "./components/animation/MotionLibraryPanel";
import ProMeshPanel from "./components/mesh/ProMeshPanel.jsx";

// ── VFX Panels ──
import FluidPanel from "./components/vfx/FluidPanel.jsx";
import WeatherPanel from "./components/vfx/WeatherPanel.jsx";
import DestructionPanel from "./components/vfx/DestructionPanel.jsx";

// ── World / Generator Panels ──
import EnvironmentGenerator from "./components/generators/EnvironmentGenerator.jsx";
import CityGenerator from "./components/generators/CityGenerator.jsx";
import BuildingSimulator from "./components/generators/BuildingSimulator.jsx";
import PhysicsSimulation from "./components/generators/PhysicsSimulation.jsx";
import AssetLibraryPanel from "./components/generators/AssetLibrary.jsx";
import NodeModifierSystem from "./components/generators/NodeModifierSystem.jsx";
import VRPreviewMode from "./components/generators/VRPreviewMode.jsx";
import ProceduralCrowdGenerator from "./components/generators/ProceduralCrowdGenerator.jsx";
import TerrainSculpting from "./components/generators/TerrainSculpting.jsx";
import GreasePencilPanel from "./components/greasepencil/GreasePencilPanel.jsx";
import "./styles/hair-fx.css";
import "./styles/workspace-tools.css";
import AutoRigPanel from "./components/rig/AutoRigPanel.jsx";
import "./styles/autorig.css";
import AdvancedRigPanel from "./components/rig/AdvancedRigPanel.jsx";
import "./styles/advanced-rig.css";
import "./styles/native-workspace-tabs.css";
import RenderWorkspacePanel from "./components/workspace/RenderWorkspacePanel.jsx";

import FaceGeneratorPanel from "./panels/generators/FaceGeneratorPanel.jsx";
import FoliageGeneratorPanel from "./panels/generators/FoliageGeneratorPanel.jsx";
import VehicleGeneratorPanel from "./panels/generators/VehicleGeneratorPanel.jsx";
import CreatureGeneratorPanel from "./panels/generators/CreatureGeneratorPanel.jsx";
import PropGeneratorPanel from "./panels/generators/PropGeneratorPanel.jsx";

import "./styles/render-workspace.css";
import { createDefaultRigGuides, mirrorGuidePoint, guidesToRigSettings } from "./mesh/rig/AutoRigGuides.js";
import MocapWorkspace from "./workspaces/mocap/MocapWorkspace.jsx";
import "./styles/mocap-workspace.css";
import {
  applyCheckerToMesh,
  unwrapBoxProjection,
  exportUVLayoutGLB
} from "./mesh/uv/UVUnwrap.js";
import {

  createQuadCameraSet,
  resizeQuadCameraSet,
  renderViewportSet,
  detectViewportFromPointer,
  getActiveViewportCamera,
  snapCameraToAxis
} from "./mesh/MultiViewportSystem.js";

const TOOLS = [
  { id: "select", icon: "↖", label: "Select (S)" },
  { id: "loop_cut", icon: "⊞", label: "Loop Cut (Ctrl+R)" },
  { id: "edge_slide", icon: "⇔", label: "Edge Slide (G+G)" },
  { id: "knife", icon: "✂", label: "Knife (K)" },
  { id: "extrude", icon: "⬡", label: "Extrude (E)" },
  { id: "grab", icon: "✋", label: "Grab (G)" },
  { id: "rotate", icon: "↺", label: "Rotate (R)" },
  { id: "scale", icon: "⤢", label: "Scale (S)" },
];

const PRIMITIVES = [
  { id: "box", label: "Cube" },
  { id: "sphere", label: "Sphere" },
  { id: "cylinder", label: "Cylinder" },
  { id: "cone", label: "Cone" },
  { id: "torus", label: "Torus" },
  { id: "plane", label: "Plane" },
  { id: "circle", label: "Circle" },
  { id: "icosphere", label: "Icosphere" },
];

const COLORS = {
  bg: "#1d1d1d",
  panel: "#252525",
  border: "#3a3a3a",
  teal: "#5b9bd5",
  orange: "#c07030",
  selected: "#c07030",
  hover: "#5b9bd5",
  vert: "#ffffff",
  edge: "#5b9bd5",
  face: "#5b9bd522",
  accent: "#4772b3",
  text: "#c8c8c8",
  textDim: "#888",
};

function SpxTabGroup({ label, color, tabs }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const h = (e) => {
      if (ref.current) {
        const inside = ref.current.contains(e.target);
        if (!inside) setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="spx-tab-group">
      <button
        className="spx-native-workspace-tab"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => (o ? false : true));
        }}
        style={{ borderBottom: open ? "2px solid " + color : "2px solid transparent" }}
      >
        <span className="spx-native-workspace-tab-label" style={{ color: open ? color : undefined }}>
          {label}
        </span>
        <span className="spx-tab-arrow" style={{ color: open ? color : undefined }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open === true && (
        <div className="spx-tab-dropdown" style={{ borderTop: "2px solid " + color }}>
          {tabs.map((t) => (
            <div
              key={t.label}
              onClick={() => {
                typeof t.fn === "function" ? t.fn() : handleApplyFunction(t.fn);
                setOpen(false);
              }}
              className="spx-tab-item"
              onMouseEnter={(e) => { e.currentTarget.style.color = color; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = ""; }}
            >
              {t.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reusable live viewport mirror for fullscreen panels ───────────────────────
function LiveViewportMirror({ rendererRef, open, label }) {
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;

    const tick = () => {
      const src = rendererRef?.current?.domElement;
      const dst = canvasRef.current;
      if (src && dst && dst.offsetWidth > 0) {
        dst.width = dst.offsetWidth;
        dst.height = dst.offsetHeight;
        dst.getContext("2d").drawImage(src, 0, 0, dst.width, dst.height);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, rendererRef]);

  return (
    <div style={{ flex: "0 0 45%", minWidth: 0, display: "flex", flexDirection: "column", borderRight: "1px solid #21262d", background: "#060a10" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#444", letterSpacing: "1.5px", padding: "5px 10px", background: "#0a0d13", borderBottom: "1px solid #21262d", flexShrink: 0, textTransform: "uppercase" }}>
        {label}
      </div>
      <canvas
        ref={canvasRef}
        data-viewport-mirror="true"
        style={{ flex: 1, width: "100%", display: "block", minHeight: 0, filter: "brightness(1.8) contrast(1.1)" }}
      />
    </div>
  );
}

registerAllPanels();
export default function App() {
  const closeAllWindows = () => {
    const setters = [
      setHairPanelOpen, setHairAdvancedOpen, setHairFXOpen, setCollaboratePanelOpen,
      setAutoRigOpen, setAdvancedRigOpen, setLightingCameraPanelOpen, setFluidPanelOpen,
      setDestructionPanelOpen, setGreasePencilPanelOpen, setPatternPanelOpen,
      setClothingPanelOpen, setMuscleOpen, setGroomOpen, setCompositorOpen,
      setMeshScriptOpen, setAnimGraphOpen, setGamepadOpen, setProMeshOpen,
      setAssetLibOpen, setWeatherPanelOpen, setUvPanelOpen, setMaterialPanelOpen, setPaintPanelOpen
    ];
    setters.forEach(s => s?.(false));
  };



  // --- AUTO-SAVE LOGIC ---
  useEffect(() => {
    const timer = setInterval(() => {
      if (meshRef.current) {
        const data = {
          name: "autosave_mesh",
          timestamp: Date.now(),
          pos: meshRef.current.position.toArray(),
          rot: meshRef.current.rotation.toArray()
        };
        localStorage.setItem("spx_autosave", JSON.stringify(data));
        console.log("💾 Auto-save complete.");
      }
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // --- PERFORMANCE MONITORING ---
  const [fps, setFps] = useState(0);
  const [polyCount, setPolyCount] = useState(0);

  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let running = true;

    const updateStats = () => {
      if (!running) return;
      frames++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;

        if (rendererRef.current) {
          setPolyCount(rendererRef.current.info.render.triangles);
        }
      }
      requestAnimationFrame(updateStats);
    };

    const handle = requestAnimationFrame(updateStats);
    return () => {
      running = false;
      cancelAnimationFrame(handle);
    };
  }, []);

  window.hardResetScene = () => {
    if (!sceneRef.current) return;
    console.log("🧹 Initializing Factory Reset...");

    // 1. Dispose GPU Memory
    sceneRef.current.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material.dispose) child.material.dispose();
      }
    });

    // 2. Clear Three.js Scene
    while (sceneRef.current.children.length > 0) {
      sceneRef.current.remove(sceneRef.current.children[0]);
    }

    // 3. Clear React State
    setSceneObjects([]);
    setActiveObjId(null);
    setSelectedObject(null);
    setHistory([]);
    setRedoStack([]);

    console.log("✅ App & Engine fully synchronized at Zero.");
  };

  // --- HOISTED CORE ARCHITECTURE ---
  const [wireframe, setWireframe] = useState(false);
  const [stats, setStats] = useState({ vertices: 0, edges: 0, faces: 0, halfEdges: 0 });
  const [activeWorkspace, setActiveWorkspace] = useState(DEFAULT_WORKSPACE);
  const [sceneObjects, setSceneObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [activeObjId, setActiveObjId] = useState(null);
  const [transformVersion, setTransformVersion] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const meshRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const heMeshRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(null);
  const mixerDurationRef = useRef(0);
  const isPlayingRef = useRef(false);
  const autoPlayingRef = useRef(false);
  const importGLB = async (file) => {
    const { GLTFLoader } = await import(
      "three/examples/jsm/loaders/GLTFLoader.js"
    );
    const scene = sceneRef.current;
    if (!scene) return;
    clearOverlays();

    // Phase 1 multi-import: imports are PURELY ADDITIVE. Prior scene
    // contents (other characters, primitives, panel previews) are
    // preserved. _addLoadedModelToScene auto-offsets the spawn position
    // on +X so multi-import doesn't visually overlap. Per-model animation
    // mixers (stored on each sceneObjects entry) keep each character
    // animating independently. To remove a model, use the SCENE outliner
    // delete — that path calls _disposeMixer on the specific model.

    const url = URL.createObjectURL(file);
    new GLTFLoader().load(
      url,
      (gltf) => {
        // GLTFLoader returns animations alongside scene; copy onto the
        // Object3D so OBJ/FBX/GLB all expose mesh.animations consistently.
        gltf.scene.animations = gltf.animations || [];
        const label = file.name.replace(/\.[^.]+$/, "");
        _addLoadedModelToScene(gltf.scene, { label, type: "glb", fileName: file.name });

        gltf.scene.traverse((child) => {
          if (child.isMesh && !heMeshRef.current) {
            heMeshRef.current = HalfEdgeMesh.fromBufferGeometry(child.geometry);
            setStats(heMeshRef.current.stats());
          }
        });

        setStatus(`Imported ${file.name}`);
        URL.revokeObjectURL(url);
      },
      undefined,
      () => {
        setStatus(`Could not load ${file.name}`);
        URL.revokeObjectURL(url);
      },
    );
  };



  const [renderWorkspaceOpen, setRenderWorkspaceOpen] = useState(false);
  const [mocapWorkspaceOpen, setMocapWorkspaceOpen] = useState(false);



  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState("modeling");



  const [advancedRigOpen, setAdvancedRigOpen] = useState(false);


  useEffect(() => {
    const onWorkspaceMode = (e) => {
      const mode = e?.detail?.mode;
      if (mode) setActiveWorkspaceMode(mode);
    };
    window.addEventListener("spx:setWorkspaceMode", onWorkspaceMode);
    return () => { };
  }, []);

  // closeAllWorkspacePanels defined below after state declarations;

  const openWorkspaceTool = (toolId) => {
    // ── Grouped tab dispatchers ───────────────────────────────────────────────
    if (toolId === "sculpt_workspace") { closeAllWorkspacePanels(); ensureWorkspaceMesh("sculpt"); return; }
    if (toolId === "materials_textures") { closeAllWorkspacePanels(); setMaterialPanelOpen?.(true); setPaintPanelOpen?.(true); return; }
    if (toolId === "clothing_pattern") { closeAllWorkspacePanels(); setClothingPanelOpen?.(true); setPatternPanelOpen?.(true); ensureWorkspaceMesh("clothing"); return; }
    if (toolId === "hair_suite") { closeAllWorkspacePanels(); setHairPanelOpen?.(true); ensureWorkspaceMesh("hair"); return; }
    if (toolId === "rigging_suite") { closeAllWorkspacePanels(); setAutoRigOpen?.(true); ensureWorkspaceMesh("rigging"); return; }

    closeAllWorkspacePanels();

    if (toolId === "uv") setUvPanelOpen?.(true);
    else if (toolId === "materials") setMaterialPanelOpen?.(true);
    else if (toolId === "paint") setPaintPanelOpen?.(true);
    else if (toolId === "clothing") { setClothingPanelOpen?.(true); ensureWorkspaceMesh("clothing"); }
    else if (toolId === "pattern") { setPatternPanelOpen?.(true); ensureWorkspaceMesh("pattern"); }
    else if (toolId === "hair") setHairPanelOpen?.(true);
    else if (toolId === "collaborate") setCollaboratePanelOpen?.(true);
    else if (toolId === "mesh_script") setMeshScriptOpen?.(true);
    else if (toolId === "anim_graph") setAnimGraphOpen?.(true);
    else if (toolId === "multi_mocap") setMultiMocapOpen?.(true);
    else if (toolId === "groom") setGroomOpen?.(true);
    else if (toolId === "render_farm") setRenderFarmOpen?.(true);
    else if (toolId === "gpu_sculpt") handleApplyFunction("gpu_sculpt");
    else if (toolId === "gpu_path_trace") handleApplyFunction("gpu_path_trace");
    else if (toolId === "lighting") setLightingCameraPanelOpen?.(true);
    else if (toolId === "camera") setLightingCameraPanelOpen?.(true);
    else if (toolId === "lighting_camera") setLightingCameraPanelOpen?.(true);
    else if (toolId === "spx_sketch") setGreasePencilPanelOpen?.(true);
    else if (toolId === "gamepad") setGamepadOpen?.(true);
    else if (toolId === "pro_mesh") setProMeshOpen?.(true);
    else if (toolId === "fluid") setFluidPanelOpen?.(true);
    else if (toolId === "weather") setWeatherPanelOpen?.(true);
    else if (toolId === "destruction") setDestructionPanelOpen?.(true);
    else if (toolId === "env_gen") setEnvGenOpen?.(true);
    else if (toolId === "city_gen") setCityGenOpen?.(true);
    else if (toolId === "building") setBuildingOpen?.(true);
    else if (toolId === "physics_sim") setPhysicsOpen?.(true);
    else if (toolId === "asset_lib") setAssetLibOpen?.(true);
    else if (toolId === "node_mod") setNodeModOpen?.(true);
    else if (toolId === "crowd_gen") setCrowdGenOpen?.(true);
    else if (toolId === "terrain") setTerrainOpen?.(true);
    else if (toolId === "hair_adv") setHairAdvancedOpen?.(true);
    else if (toolId === "hair_fx") setHairFXOpen?.(true);
    else if (toolId === "autorig") setAutoRigOpen?.(true);
    else if (toolId === "advanced_rig") setAdvancedRigOpen?.(true);
    else if (toolId === "face_gen") setFaceGenOpen?.(true);
    else if (toolId === "foliage_gen") setFoliageGenOpen?.(true);
    else if (toolId === "vehicle_gen") setVehicleGenOpen?.(true);
    else if (toolId === "creature_gen") setCreatureGenOpen?.(true);
    else if (toolId === "prop_gen") setPropGenOpen?.(true);
    else if (toolId === "mocap") setMocapWorkspaceOpen?.(true);
    else if (toolId === "3d_to_2d") setStyle3DTo2DOpen(true);
    else if (toolId === "node_compositor") setCompositorOpen(v => !v);
  };



  useEffect(() => {
    const onAdvancedRigKey = (e) => {
      if (e.shiftKey && e.key.toLowerCase() == "y") {
        e.preventDefault();
        setAdvancedRigOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onAdvancedRigKey);
    return () => { };
  }, []);



  const [autoRigOpen, setAutoRigOpen] = useState(false);
  const [style3DTo2DOpen, setStyle3DTo2DOpen] = useState(false);
  const [proportionalEnabled, setProportionalEnabled] = useState(false);
  const [proportionalRadius, setProportionalRadius] = useState(1.0);
  const [proportionalFalloff, setProportionalFalloff] = useState('smooth');
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [snapMode, setSnapMode] = useState('vertex'); // vertex | surface | grid
  const [compositorOpen, setCompositorOpen] = useState(false);
  const [denoiserOpen, setDenoiserOpen] = useState(false);

  useEffect(() => {
    const onAutoRigKey = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setAutoRigOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onAutoRigKey);
    return () => { };
  }, []);



  const [hairFXOpen, setHairFXOpen] = useState(false);

  useEffect(() => {
    const onHairFXKey = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setHairFXOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onHairFXKey);
    return () => { };
  }, []);



  const [hairAdvancedOpen, setHairAdvancedOpen] = useState(false);

  useEffect(() => {
    const onHairAdvancedKey = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setHairAdvancedOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onHairAdvancedKey);
    return () => { };
  }, []);



  const [hairPanelOpen, setHairPanelOpen] = useState(false);
  const [collaboratePanelOpen, setCollaboratePanelOpen] = useState(false);
  const [meshScriptOpen, setMeshScriptOpen] = useState(false);
  const [animGraphOpen, setAnimGraphOpen] = useState(false);
  const [multiMocapOpen, setMultiMocapOpen] = useState(false);
  const [groomOpen, setGroomOpen] = useState(false);
  const [muscleOpen, setMuscleOpen] = useState(false);
  const [renderFarmOpen, setRenderFarmOpen] = useState(false);
  const [depthEstOpen, setDepthEstOpen] = useState(false);
  const gpuSculptRef = React.useRef(null);
  const gpuClothRef = React.useRef(null);
  const gpuPTRef = React.useRef(null);
  const renderFarmRef = React.useRef(null);
  const muscleRef = React.useRef(null);
  const groomRef = React.useRef(null);
  const performanceSessionRef = React.useRef(null);
  const [lightingCameraPanelOpen, setLightingCameraPanelOpen] = useState(false);
  const [filmSkinPanelOpen, setFilmSkinPanelOpen] = useState(false);
  const [filmHairPanelOpen, setFilmHairPanelOpen] = useState(false);
  const [groomBrushPanelOpen, setGroomBrushPanelOpen] = useState(false);
  const [braidGeneratorPanelOpen, setBraidGeneratorPanelOpen] = useState(false);
  const [fadeToolPanelOpen, setFadeToolPanelOpen] = useState(false);
  const [hairCardLODPanelOpen, setHairCardLODPanelOpen] = useState(false);
  const [filmParticlePanelOpen, setFilmParticlePanelOpen] = useState(false);
  const [filmWeatherPanelOpen, setFilmWeatherPanelOpen] = useState(false);
  // ── Gamepad Animator + Pro Mesh ──
  const [gamepadOpen, setGamepadOpen] = useState(false);
  const [proMeshOpen, setProMeshOpen] = useState(false);
  const [modifierStackOpen, setModifierStackOpen] = useState(false);
  const [constraintsPanelOpen, setConstraintsPanelOpen] = useState(false);
  const [geoNodesPanelOpen, setGeoNodesPanelOpen] = useState(false);
  const [driversPanelOpen, setDriversPanelOpen] = useState(false);
  const [nlaPanelOpen, setNlaPanelOpen] = useState(false);
  const [graphEditorOpen, setGraphEditorOpen] = useState(false);
  // ── VFX panels ──
  const [fluidPanelOpen, setFluidPanelOpen] = useState(false);
  const [weatherPanelOpen, setWeatherPanelOpen] = useState(false);
  const [destructionPanelOpen, setDestructionPanelOpen] = useState(false);
  // ── Generator / World panels ──
  const [envGenOpen, setEnvGenOpen] = useState(false);
  const [cityGenOpen, setCityGenOpen] = useState(false);
  const [buildingOpen, setBuildingOpen] = useState(false);
  const [physicsOpen, setPhysicsOpen] = useState(false);
  const [assetLibOpen, setAssetLibOpen] = useState(false);
  const [nodeModOpen, setNodeModOpen] = useState(false);
  const [crowdGenOpen, setCrowdGenOpen] = useState(false);
  const [terrainOpen, setTerrainOpen] = useState(false);

  const [faceGenOpen, setFaceGenOpen] = useState(false);
  const [foliageGenOpen, setFoliageGenOpen] = useState(false);
  const [vehicleGenOpen, setVehicleGenOpen] = useState(false);
  const [creatureGenOpen, setCreatureGenOpen] = useState(false);
  const [propGenOpen, setPropGenOpen] = useState(false);

  const [showModelPicker, setShowModelPicker] = useState(false);
  const [activeModelUrl, setActiveModelUrl] = useState(null);
  const [modelPickerContext, setModelPickerContext] = useState("general");
  const [greasePencilPanelOpen, setGreasePencilPanelOpen] = useState(false);

  useEffect(() => {
    const onHairKey = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setHairPanelOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onHairKey);
    return () => { };
  }, []);



  const [patternPanelOpen, setPatternPanelOpen] = useState(false);

  useEffect(() => {
    const onPatternKey = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setPatternPanelOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onPatternKey);
    return () => { };
  }, []);





  const [clothingPanelOpen, setClothingPanelOpen] = useState(false);
  const [fabricPanelOpen, setFabricPanelOpen] = useState(false);

  useEffect(() => {
    const onClothingKey = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setClothingPanelOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onClothingKey);
    return () => { };
  }, []);



  const [paintPanelOpen, setPaintPanelOpen] = useState(false);

  useEffect(() => {
    const onPaintKey = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPaintPanelOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onPaintKey);
    return () => { };
  }, []);



  const [materialPanelOpen, setMaterialPanelOpen] = useState(false);

  useEffect(() => {
    const onMaterialKey = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setMaterialPanelOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onMaterialKey);
    return () => { };
  }, []);



  const [uvPanelOpen, setUvPanelOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        setUvPanelOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { };
  }, []);




  const closeAllWorkspacePanels = () => {
    setUvPanelOpen(false);
    setMaterialPanelOpen(false);
    setPaintPanelOpen(false);
    setClothingPanelOpen(false);
    setFabricPanelOpen(false);
    setPatternPanelOpen(false);
    setHairPanelOpen(false);
    setCollaboratePanelOpen(false);
    setLightingCameraPanelOpen(false);
    setGreasePencilPanelOpen(false);
    setHairAdvancedOpen(false);
    setHairFXOpen(false);
    setAutoRigOpen(false);
    setAdvancedRigOpen(false);
    setMocapWorkspaceOpen?.(false);
    setGamepadOpen?.(false);
    setProMeshOpen?.(false);
    setFluidPanelOpen(false);
    setWeatherPanelOpen(false);
    setDestructionPanelOpen(false);
    setEnvGenOpen(false);
    setCityGenOpen(false);
    setBuildingOpen(false);
    setPhysicsOpen(false);
    setAssetLibOpen(false);
    setNodeModOpen(false);
    setCrowdGenOpen(false);
    setTerrainOpen(false);
    setFaceGenOpen(false);
    setFoliageGenOpen(false);
    setVehicleGenOpen(false);
    setCreatureGenOpen(false);
    setPropGenOpen(false);
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
    setNodeEditorOpen(false);
    setCompositorOpen(false);
    setStyle3DTo2DOpen(false);
    setFilmCameraOpen(false);
    setFilmPostOpen(false);
    setFilmPTOpen(false);
    setRenderFarmOpen(false);
    setClothSimOpen(false);
    setFluidPanelOpen(false);
    setWeatherPanelOpen(false);
    setDestructionPanelOpen(false);
    setPhysicsOpen(false);
    setEnvGenOpen(false);
    setCityGenOpen(false);
    setBuildingOpen(false);
    setAssetLibOpen(false);
    setNodeModOpen(false);
    setCrowdGenOpen(false);
    setTerrainOpen(false);
    setProMeshOpen(false);
    setCustomSkinPanelOpen(false);
    setShowPerformancePanel(false);
  };

  const quadCamerasRef = useRef(null);
  const activeViewportRef = useRef("persp");
  const [quadView, setQuadView] = useState(false);
  const quadViewRef = useRef(false);
  useEffect(() => { quadViewRef.current = quadView; }, [quadView]);


  const [objectsAddedCounter, setObjectsAddedCounter] = useState(0);











  // sceneObjects managed directly via addSceneObject/deleteSceneObject

  const selectSceneObject = (id) => {
    const obj = sceneObjectsRef.current.find((o) => o.id === id);
    if (!obj) return;

    // Selection is now DATA-ONLY. No material swapping — that destroys film-physical
    // upgrades, PBR maps, and shader customization. Visual selection indication is
    // handled by OutlinePass in the composer (wired separately).
    setActiveObjId(id);
    meshRef.current = obj.mesh;
    // Phase 1 multi-import: point active mixer at the selected model so
    // play/pause/scrub bridges (and SPX3DTo2DPanel's mixerRef consumer)
    // act on whichever model the user clicked in the outliner.
    mixerRef.current = obj.mixer || null;
    mixerDurationRef.current = obj.mixerDuration || 0;

    if (obj.mesh) {
      const box = new THREE.Box3().setFromObject(obj.mesh);
      orbitState.current.radius = Math.max(box.getSize(new THREE.Vector3()).length() * 2, 3);
      // Attach gizmo only if a transform tool is currently armed
      if (gizmoRef.current) {
        const isXformTool = gizmoMode === "move" || gizmoMode === "rotate" || gizmoMode === "scale";
        if (isXformTool) {
          gizmoRef.current.setMode(gizmoMode);
          gizmoRef.current.attach(obj.mesh);
        }
      }
      // Force immediate render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
    setStatus("Selected: " + obj.name);
    // Build HalfEdge mesh so edit tools work immediately after selection
    if (obj.mesh?.geometry) {
      try {
        const geo = obj.mesh.geometry;
        heMeshRef.current = HalfEdgeMesh.fromBufferGeometry(geo);
        setStats(heMeshRef.current.stats());
      } catch (e) { }
    }
  };

  const renameSceneObject = (id, name) => {
    setSceneObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, name } : o))
    );
  };

  const deleteSceneObject = (id) => {
    const obj = sceneObjects.find((o) => o.id === id);
    if (obj?.mesh) {
      // Phase 1 multi-import: dispose the model's mixer before removing
      // the mesh so AnimationMixer's bone-cache doesn't leak.
      _disposeMixer(obj.mesh);
      sceneRef.current?.remove(obj.mesh);
    }
    setSceneObjects((prev) => {
      const next = prev.filter((o) => o.id !== id && o.parentId !== id);
      if (activeObjId === id) {
        const fallback = next[0];
        setActiveObjId(fallback?.id || null);
        meshRef.current = fallback?.mesh || null;
        // Re-point active mixer at the fallback selection (or null).
        mixerRef.current = fallback?.mixer || null;
        mixerDurationRef.current = fallback?.mixerDuration || 0;
      }
      return next;
    });
    setStatus("Object deleted");
  };

  const toggleSceneObjectVisible = (id) => {
    setSceneObjects((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const vis = o.visible === false ? true : false;
        if (o.mesh) o.mesh.visible = vis;
        return { ...o, visible: vis };
      })
    );
  };

  const setParent = (childId, parentId) => {
    setSceneObjects((prev) =>
      prev.map((o) => (o.id === childId ? { ...o, parentId } : o))
    );
  };

  const groupSelected = () => {
    if (!activeObjId) return;
    const group = new THREE.Group();
    sceneRef.current?.add(group);
    const groupObj = createSceneObject("group", "Group", group);
    setSceneObjects((prev) => {
      const next = [...prev, groupObj];
      return next.map((o) =>
        o.id === activeObjId ? { ...o, parentId: groupObj.id } : o
      );
    });
    setStatus("Grouped");
  };

  const ungroupSelected = () => {
    const obj = getActiveObj();
    if (!obj || obj.type !== "group") return;
    setSceneObjects((prev) =>
      prev
        .map((o) => (o.parentId === obj.id ? { ...o, parentId: null } : o))
        .filter((o) => o.id !== obj.id)
    );
    if (obj.mesh) sceneRef.current?.remove(obj.mesh);
    setStatus("Ungrouped");
  };

  const handleSaveScene = () => {
    saveScene(sceneObjects);
    setStatus("Scene saved to localStorage");
  };

  const handleLoadScene = () => {
    const data = loadSceneData();
    if (!data) {
      setStatus("No saved scene found");
      return;
    }
    sceneObjects.forEach((o) => {
      if (o.mesh) sceneRef.current?.remove(o.mesh);
    });
    const rebuilt = data.objects.map((saved) => {
      const mesh = buildPrimitiveMesh(saved.type);
      mesh.position.fromArray(saved.position || [0, 0, 0]);
      if (saved.rotation) mesh.rotation.fromArray(saved.rotation);
      if (saved.scale) mesh.scale.fromArray(saved.scale);
      mesh.visible = saved.visible !== false;
      sceneRef.current?.add(mesh);
      return { ...saved, mesh };
    });
    setSceneObjects(rebuilt);
    setActiveObjId(rebuilt[0]?.id || null);
    meshRef.current = rebuilt[0]?.mesh || null;
    setStatus(`Scene loaded — ${rebuilt.length} objects`);
  };

  const handleExportScene = () => {
    exportSceneGLB(sceneObjects).then(() => setStatus("Scene exported as GLB"));
  };

  // Selection overlays
  const vertDotsRef = useRef(null);   // THREE.Points
  const edgeLinesRef = useRef(null);  // THREE.LineSegments
  const faceMeshRef = useRef(null);   // THREE.Mesh (transparent)
  const faceOverlayRef = useRef(null); // THREE.Mesh — selection highlight overlay
  const previewLineRef = useRef(null); // loop cut preview line

  // Knife state
  const knifeRef = useRef({ active: false, points: [], line: null });

  // Edge slide state
  const slideRef = useRef({ active: false, startX: 0, edge: null });

  const [activeTool, setActiveTool] = useState("select");
  const [editMode, setEditMode] = useState("object");
  // Always start in object mode

  // ── Sessions 4-5: Sculpt state ────────────────────────────────────────────
  const [sculptBrush, setSculptBrush] = useState("push");
  const [sculptRadius, setSculptRadius] = useState(0.3);
  const [sculptStrength, setSculptStrength] = useState(0.5);
  const [sculptFalloff, setSculptFalloff] = useState("smooth");
  const [sculptSymX, setSculptSymX] = useState(false);
  const sculptingRef = useRef(false);
  const sculptBrushRef = useRef("push");
  const sculptRadiusRef = useRef(0.3);
  const sculptStrengthRef = useRef(0.02);
  const sculptFalloffRef = useRef("smooth");
  const sculptSymXRef = useRef(false);
  const [dyntopoEnabled, setDyntopoEnabled] = useState(false);
  const lazyMouseRef = useRef({ x: 0, y: 0 });
  const sculptStrokeCountRef = useRef(0);

  // ── Session 8: Vertex color paint state ──────────────────────────────────
  const [vcPaintColor, setVcPaintColor] = useState("#ff6600");
  const [vcPaintColor2, setVcPaintColor2] = useState("#00ffc8");
  const [vcRadius, setVcRadius] = useState(0.6);
  const [vcStrength, setVcStrength] = useState(0.8);
  const [vcFalloff, setVcFalloff] = useState("smooth");
  const vcPaintingRef = useRef(false);

  // ── Sessions 9-10: Shape Keys state ──────────────────────────────────────
  const [shapeKeys, setShapeKeys] = useState([]);
  const shapeKeysRef = useRef([]);

  // ── Sessions 11-13: Procedural + Repair state ─────────────────────────────
  const [procType, setProcType] = useState("pipe");
  const [procParams, setProcParams] = useState({
    radius: 0.3,
    innerRadius: 0.2,
    height: 2,
    segments: 32,
    steps: 8,
    width: 2,
    stepHeight: 0.2,
    stepDepth: 0.3,
    thickness: 0.3,
    depth: 0.4,
    teeth: 12,
    toothHeight: 0.2,
    turns: 3,
    tubeRadius: 0.1,
  });
  const [repairStatus, setRepairStatus] = useState(null);

  // ── Sessions 14-15: LOD + Instancing state ───────────────────────────────
  const [lodObject, setLodObject] = useState(null);
  const [lodStats, setLodStats] = useState([]);
  const [lodLevel, setLodLevelState] = useState("auto");
  const [instanceCount, setInstanceCount] = useState(10);
  const [instanceLayout, setInstanceLayout] = useState("scatter");
  const [instanceSpread, setInstanceSpread] = useState(5);
  const [selectMode, setSelectMode] = useState("vert");

  const [isAutoKey, setAutoKey] = useState(false);

  const recordKeyframe = (obj, key, val) => {
    if (!isAutoKey) return;
    if (typeof window.addKeyframe === "function") {
      window.addKeyframe(obj.uuid, key, val, currentFrame);
      console.log(`🔑 Keyframe: ${key} set at frame ${currentFrame}`);
    }
  };

  const exportSpxScene = () => {
    const sceneData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      objects: sceneObjects.map((obj) => ({
        name: obj.name,
        type: obj.userData?.type,
        params: obj.userData?.params,
        position: obj.position?.toArray(),
        rotation: obj.rotation?.toArray(),
        scale: obj.scale?.toArray(),
        keyframes: window.animationData ? window.animationData[obj.uuid] : [],
      })),
    };
    const blob = new Blob([JSON.stringify(sceneData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spx_project_${Date.now()}.json`;
    link.click();
    console.log("💾 Scene exported to .json");
  };

  const addPrimitive = useCallback(
    (type) => {
      // addSceneObject handles everything — creates mesh, adds to scene, stores in sceneObjects
      addSceneObject(type);
      clearOverlays();
      // Build HalfEdge mesh for edit tools from meshRef (set by addSceneObject)
      setTimeout(() => {
        const mesh = meshRef.current;
        if (!mesh || !mesh.geometry) return;

        // Force primitive to be centered at world origin like Blender
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) {
          const center = new THREE.Vector3();
          mesh.geometry.boundingBox.getCenter(center);
          mesh.geometry.translate(-center.x, -center.y, -center.z);
        }
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        mesh.geometry.computeVertexNormals();

        try {
          const heMesh = HalfEdgeMesh.fromBufferGeometry(mesh.geometry);
          heMeshRef.current = heMesh;
          const s = heMesh.stats();
          setStats(s);
          setStatus(`Added ${type} — ${s.vertices} verts · ${s.faces} faces · ${s.edges} edges`);
        } catch (e) {
          setStatus(`Added ${type}`);
        }
        setSelectedVerts(new Set());
        setSelectedEdges(new Set());
        setSelectedFaces(new Set());
        // No auto-attach — gizmo only shows when a transform tool is picked.
        setGizmoActive(false);
      }, 50);
    },
    [wireframe]
  );

  const importSpxScene = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target.result);
      sceneObjects.forEach((obj) => sceneRef.current?.remove(obj));
      data.objects.forEach((o) => addPrimitive(o.type, o.params));
      console.log("📂 Project Loaded");
    };
    reader.readAsText(file);
  };

  const takeSnapshot = () => {
    const canvas = document.querySelector("canvas");
    const link = document.createElement("a");
    link.download = `spx_render_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    console.log("📸 Render Saved");
  };

  const updateMeshParam = (obj, key, val) => {
    if (!obj) return;
    obj.userData.params = { ...obj.userData.params, [key]: val };
    const newGeo = buildProceduralMesh(obj.userData.type, obj.userData.params);
    obj.geometry.dispose();
    obj.geometry = newGeo;
  };


  const [status, setStatus] = useState("Add a primitive to start");
  const [loopCutT, setLoopCutT] = useState(0.5);
  const [selectedVerts, setSelectedVerts] = useState(new Set());
  const [selectedEdges, setSelectedEdges] = useState(new Set());
  const [selectedFaces, setSelectedFaces] = useState(new Set());
  const [showPathTracerPanel, setShowPathTracerPanel] = useState(false);
  const [showPipelinePanel, setShowPipelinePanel] = useState(false);
  const [showPluginPanel, setShowPluginPanel] = useState(false);
  const [showMarketPanel, setShowMarketPanel] = useState(false);
  const [showNPanel, setShowNPanel] = useState(false);
  const [boxSelect, setBoxSelect] = useState(null);
  const [activeMode, setActiveMode] = useState("object");

  const [knifePoints, setKnifePoints] = useState([]);
  const [slideAmount, setSlideAmount] = useState(0);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [crowdOpen, setCrowdOpen] = useState(false);
  const [panel3DTo2DOpen, setPanel3DTo2DOpen] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [exportUnlit, setExportUnlit] = useState(false);

  const activeToolRef = useRef("select");
  const editModeRef = useRef("object");
  const selectModeRef = useRef("vert");

  // Sync editMode with active workspace
  useEffect(() => {
    if (activeWorkspace === "Sculpt") {
      setEditMode("sculpt");
      editModeRef.current = "sculpt";
      sceneObjectsRef.current = sceneObjects;
    } else if (activeWorkspace === "Modeling") {
      setEditMode("object");
      editModeRef.current = "object";
    }
  }, [activeWorkspace]);

  // Keep refs in sync
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => {
    sceneObjectsRef.current = sceneObjects;
  }, [sceneObjects]);
  // Force object mode on mount
  useEffect(() => {
    editModeRef.current = "object";
  }, []);
  useEffect(() => { sculptBrushRef.current = sculptBrush; }, [sculptBrush]);
  useEffect(() => { sculptRadiusRef.current = sculptRadius; }, [sculptRadius]);
  useEffect(() => { sculptStrengthRef.current = sculptStrength; }, [sculptStrength]);
  useEffect(() => { sculptFalloffRef.current = sculptFalloff; }, [sculptFalloff]);
  useEffect(() => { sculptSymXRef.current = sculptSymX; }, [sculptSymX]);
  useEffect(() => {
    const onProportionalKey = (e) => {
      if (e.key.toLowerCase() === 'o' && editModeRef.current === 'edit') {
        e.preventDefault();
        setProportionalEnabled(v => !v);
      }
    };
    window.addEventListener('keydown', onProportionalKey);
    return () => { };
  }, []);

  useEffect(() => { editModeRef.current = editMode; }, [editMode]);

  // Force canvas resize when workspace changes
  useEffect(() => {
    setTimeout(() => {
      const renderer = rendererRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w > 0 && h > 0) {
        renderer.setSize(w, h, false);
        if (cameraRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
        }
      }
    }, 100);
  }, [activeWorkspace]);
  useEffect(() => { selectModeRef.current = selectMode; }, [selectMode]);
  useEffect(() => { currentFrameRef.current = currentFrame; }, [currentFrame]);

  // ── Keyframe store (window.animationData) ────────────────────────────────
  // Shape: { [uuid]: { "position.x": {frame: value, ...}, "position.y": {...},
  //                    "rotation.x": {...}, "scale.x": {...}, ... 9 channels } }
  // Matches AnimationUpgrade.js / WalkCycleGenerator.js pattern so those
  // systems can later bake into the same store.
  const [keyframeVersion, setKeyframeVersion] = useState(0);
  const bumpKeyframeVersion = () => setKeyframeVersion(v => v + 1);

  useEffect(() => {
    if (!window.animationData) window.animationData = {};

    // addKeyframe(uuid, key, val, frame)
    //   key = "position" | "rotation" | "scale"  -> splits Vector3/Euler into .x/.y/.z
    //   key = "position.x" (etc.)                 -> writes scalar directly
    window.addKeyframe = function(uuid, key, val, frame) {
      if (!uuid || frame == null) return;
      const f = Math.round(Number(frame));
      if (!window.animationData[uuid]) window.animationData[uuid] = {};
      const store = window.animationData[uuid];

      const writeScalar = (chan, v, type = "linear") => {
        if (!store[chan]) store[chan] = {};
        if (type === "bezier") {
          store[chan][f] = { v: Number(v), t: "bezier", lh: [-5, 0], rh: [5, 0] };
        } else {
          store[chan][f] = Number(v);
        }
      };

      if (key === "position" || key === "rotation" || key === "scale") {
        if (val && typeof val.x === "number") {
          writeScalar(`${key}.x`, val.x);
          writeScalar(`${key}.y`, val.y);
          writeScalar(`${key}.z`, val.z);
        }
      } else if (typeof key === "string" && key.includes(".")) {
        writeScalar(key, val);
      }
      bumpKeyframeVersion();
    };

    // deleteKeyframe(uuid, frame, channel?)
    //   channel omitted -> delete all 9 channels at that frame for that object
    //   channel given   -> delete just that channel
    window.deleteKeyframe = function(uuid, frame, channel) {
      if (!uuid || frame == null) return;
      const f = Math.round(Number(frame));
      const store = window.animationData[uuid];
      if (!store) return;

      if (channel) {
        if (store[channel]) delete store[channel][f];
      } else {
        Object.keys(store).forEach(ch => { delete store[ch][f]; });
      }
      bumpKeyframeVersion();
    };

    // Convenience: key all 9 transform channels for an object at current frame.
    // Used by KEY button, I/K shortcut, and "add_keyframe" handler.
    window.keyAllTransform = function(obj, frame) {
      if (!obj) return;
      window.addKeyframe(obj.uuid, "position", obj.position, frame);
      window.addKeyframe(obj.uuid, "rotation", obj.rotation, frame);
      window.addKeyframe(obj.uuid, "scale",    obj.scale,    frame);
    };
  }, []);

  // ── Playback loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => (prev >= 250 ? 0 : prev + 1));
      }, 1000 / 24);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // ── Mixer ↔ timeline play/pause bridge ───────────────────────────────────
  // First user-driven play/pause yields control from auto-play. After that,
  // mixer follows isPlaying directly (timeScale 1 / 0).
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (mixerRef.current) {
      autoPlayingRef.current = false;
      mixerRef.current.timeScale = isPlaying ? 1 : 0;
    }
  }, [isPlaying]);

  // ── Mixer ↔ timeline scrub bridge ────────────────────────────────────────
  // While paused, scrubbing currentFrame seeks the mixer and applies pose.
  // setTime internally calls update(0), so the pose refreshes immediately.
  useEffect(() => {
    if (!mixerRef.current || isPlaying) return;
    autoPlayingRef.current = false;
    const dur = mixerDurationRef.current || 1;
    mixerRef.current.setTime((currentFrame / 24) % dur);
  }, [currentFrame, isPlaying]);

  // ── Blender-style keyframe evaluator ─────────────────────────────────────
  // Runs on every frame change (play OR scrub). For each animated object,
  // walks its 9 channels, finds bracketing keyframes, linearly interpolates,
  // writes the result directly to mesh.position/rotation/scale.
  //
  // Linear only for now; store shape supports bezier tangents as non-breaking upgrade.
  useEffect(() => {
    if (!window.animationData) return;
    const data = window.animationData;
    const uuids = Object.keys(data);
    if (uuids.length === 0) return;

    // Build uuid -> mesh lookup from sceneObjects (wrappers with .mesh)
    const meshByUUID = new Map();
    for (const so of sceneObjects) {
      if (so?.mesh?.uuid) meshByUUID.set(so.mesh.uuid, so.mesh);
    }
    // Also check meshRef.current (primary mesh may not be in sceneObjects)
    if (meshRef.current?.uuid && !meshByUUID.has(meshRef.current.uuid)) {
      meshByUUID.set(meshRef.current.uuid, meshRef.current);
    }
    // Bone keyframing: also include bones nested in skinned meshes so bone keyframes replay during scrub.
    // Bones have .uuid/.position/.rotation/.scale like any Object3D, so the existing evaluator loop works unchanged.
    for (const so of sceneObjects) {
      if (!so?.mesh) continue;
      so.mesh.traverse?.((child) => {
        if (child.isSkinnedMesh && child.skeleton?.bones) {
          child.skeleton.bones.forEach((bone) => {
            if (bone?.uuid && !meshByUUID.has(bone.uuid)) {
              meshByUUID.set(bone.uuid, bone);
            }
          });
        }
      });
    }

    // Schema-tolerant reader: bare number (legacy) or { v, t, lh, rh } (bezier).
    const readKeyValue = (entry) => {
      if (typeof entry === "number") return entry;
      if (entry && typeof entry === "object" && typeof entry.v === "number") return entry.v;
      return 0;
    };

    // Evaluate one channel's value at currentFrame. Linear interp, hold at edges.
    // Bezier entries lerp linearly until tangent math is added.
    const evalChannel = (framesObj, frame) => {
      const frames = Object.keys(framesObj).map(Number).sort((a, b) => a - b);
      if (frames.length === 0) return null;
      if (frame <= frames[0]) return readKeyValue(framesObj[frames[0]]);
      if (frame >= frames[frames.length - 1]) return readKeyValue(framesObj[frames[frames.length - 1]]);
      // Find bracketing pair
      for (let i = 0; i < frames.length - 1; i++) {
        const a = frames[i], b = frames[i + 1];
        if (frame >= a && frame <= b) {
          const t = (frame - a) / (b - a);
          const va = readKeyValue(framesObj[a]);
          const vb = readKeyValue(framesObj[b]);
          return va + (vb - va) * t;
        }
      }
      return readKeyValue(framesObj[frames[frames.length - 1]]);
    };

    // Skip evaluation if we just wrote a keyframe — the user just captured
    // the live position, we don't want to immediately overwrite it.
    if (justKeyframed.current) return;

    // Apply every animated channel to its target mesh.
    // Skip object currently being dragged by gizmo (user is editing it).
    const draggingUUID = (gizmoDragging.current && (gizmoRef.current?.target?.uuid || selectedObject?.uuid || meshRef.current?.uuid)) || null;

    for (const uuid of uuids) {
      if (uuid === draggingUUID) continue;

      const mesh = meshByUUID.get(uuid);
      if (!mesh) continue;
      const channels = data[uuid];
      for (const channel in channels) {
        const framesObj = channels[channel];
        // <2 keyframes = remembered pose, not animation. Leave mesh alone
        // so user can move it freely without the evaluator clamping it.
        if (!framesObj || Object.keys(framesObj).length < 2) continue;

        const val = evalChannel(framesObj, currentFrame);
        if (val == null) continue;
        const [prop, axis] = channel.split(".");
        if (mesh[prop] && axis in mesh[prop]) {
          mesh[prop][axis] = val;
        }
      }
    }
  }, [currentFrame, keyframeVersion, sceneObjects]);


  useEffect(() => {
    const handleGlobalKeys = (e) => {
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (inInput) return;

      if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'i' || e.key === 'I' || e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          // Bone keyframing: if a bone is selected, key the bone first then return.
          // Object keyframing (cube + I-key) untouched when no bone is selected.
          if (selectedBoneRef.current && typeof window.keyAllTransform === "function") {
            window.keyAllTransform(selectedBoneRef.current, currentFrameRef.current);
            setStatus("◆ Bone keyframe set: " + (selectedBoneRef.current.name || "bone") + " @ frame " + currentFrameRef.current);
            return;
          }
          handleApplyFunction?.('add_keyframe');
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        window.deleteSelected();
      }
    };
    // Capture phase ensures we win over upstream canvas handlers.
    window.addEventListener("keydown", handleGlobalKeys, { capture: true });
    return () => window.removeEventListener("keydown", handleGlobalKeys, { capture: true });
  }, [selectedObject, sceneObjects, currentFrame]);

  useEffect(() => {
    window.deleteSelected = () => {
      if (selectedObject) {
        if (selectedObject.parent) selectedObject.parent.remove(selectedObject);
        setSelectedObject(null);
        if (typeof setSceneObjects === 'function') {
          setSceneObjects(prev => prev.filter(o => o.uuid !== selectedObject.uuid));
        }
        console.log("🗑️ Object Deleted.");
      }
    };
    window.setSelectedObject = (obj) => setSelectedObject(obj);
  }, [selectedObject]);



  const rafRef = useRef(null);


  const orbitRef = useRef(null);
  const orbitState = useRef({ theta: 0.6, phi: 1.1, radius: 5 });
  const orbitDragging = useRef(false);
  const orbitLast = useRef({ x: 0, y: 0 });
  const orbitButton = useRef(-1);
  const boxSelectStart = useRef(null);
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const boxSelectActive = useRef(false);
  const sceneObjectsRef = useRef([]);

  const fileInputRef = useRef(null);
  const gizmoRef = useRef(null);
  const [gizmoMode, setGizmoMode] = useState("select"); // move|rotate|scale
  const [gizmoActive, setGizmoActive] = useState(false);

  const gizmoDragging = useRef(false);
  const justKeyframed = useRef(false);
  const currentFrameRef = useRef(0);
  const [bevelAmt, setBevelAmt] = useState(0.1);
  const [insetAmt, setInsetAmt] = useState(0.15);
  const [mirrorAxis, setMirrorAxis] = useState("x");

  // ── Sessions 13-15 state ──────────────────────────────────────────────────
  const [showMatEditor, setShowMatEditor] = useState(false);
  const [matProps, setMatProps] = useState({
    color: "#888888",
    roughness: 0.5,
    metalness: 0.1,
    opacity: 1,
    emissive: "#000000",
    emissiveIntensity: 0,
    wireframe: false,
    transparent: false,
    side: "front",
  });
  const [propEdit, setPropEdit] = useState(false);
  const [propRadius, setPropRadius] = useState(1.0);
  const [propFalloff, setPropFalloff] = useState("smooth"); // smooth|linear|sharp
  const [snapSize, setSnapSize] = useState(0.25);

  // ── Boolean + UV state ─────────────────────────────────────────────────────
  const [booleanMode, setBooleanMode] = useState("union");
  const [showUVEditor, setShowUVEditor] = useState(false);
  const [uvTriangles, setUVTriangles] = useState([]);
  const [uvProjection, setUVProjection] = useState("box");

  const meshBRef = useRef(null); // second mesh for boolean ops

  // ── Playback / Timeline state ─────────────────────────────────────────────



  // ── Sessions 1-3: Scene state ─────────────────────────────────────────────


  const sceneLoadInput = useRef(null);

  // helpers
  const getActiveObj = () => sceneObjects.find((o) => o.id === activeObjId) || null;

  const addSceneObject = (type) => {
    const mesh = buildPrimitiveMesh(type);
    mesh.position.set(0, 0, 0);
    sceneRef.current?.add(mesh);
    const objCount = sceneObjects.length;
    const obj = createSceneObject(type, type.charAt(0).toUpperCase() + type.slice(1) + "." + String(objCount + 1).padStart(3, "0"), mesh);
    setSceneObjects((prev) => {
      const next = [...prev, obj];
      meshRef.current = mesh;
      heMeshRef.current = null;
      setActiveObjId(obj.id);
      return next;
    });
    setObjectsAddedCounter((c) => c + 1);
    setStatus(`Added ${type}`);
  };




  useEffect(() => {
    if (selectedObject) {
      setActiveObjId(selectedObject.uuid);
    } else {
      setActiveObjId(null);
    }
  }, [selectedObject]);



  // ── NLA + MoCap frame hook ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window.evaluateNLA === "function") {
      if (nlaTracks?.length > 0) window.evaluateNLA(nlaTracks, nlaActions, currentFrame);
    }
    if (typeof window.retargetFrame === "function") {
      sceneObjects.forEach((obj) => {
        if (obj.userData?.isMocap) window.retargetFrame(obj, currentFrame);
      });
    }
  }, [currentFrame]);

  // ── Init Three.js ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rendererRef.current) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.physicallyCorrectLights = true;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    // PRO LIGHTING SETUP
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.bias = -0.0003;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    // Environment lighting for metalness
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    scene.background = new THREE.Color(COLORS.bg);

    // ── IBL environment lighting (film quality) ──
    try {
      const envMap = createProceduralHDRI(renderer);
      scene.environment = envMap;
      scene.environmentIntensity = 0.8;
    } catch (e) { console.warn('IBL setup failed:', e); }
    scene.add(new THREE.GridHelper(10, 20, COLORS.border, COLORS.border));

    // subtle center marker like Blender origin / cursor
    const centerRingGeo = new THREE.RingGeometry(0.06, 0.11, 32);
    const centerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: true
    });
    const centerMarker = new THREE.Mesh(centerRingGeo, centerRingMat);
    centerMarker.rotation.x = -Math.PI / 2;
    centerMarker.position.set(0, 0.001, 0);
    centerMarker.renderOrder = 1;
    centerMarker.userData.isHelper = true;
    scene.add(centerMarker);

    // center axis guide lines (Blender style reference)
    const centerGuidePts = [
      -5, 0.001, 0.0, -0.12, 0.001, 0.0,
      0.12, 0.001, 0.0, 5, 0.001, 0.0,
      0.0, 0.001, -5, 0.0, 0.001, -0.12,
      0.0, 0.001, 0.12, 0.0, 0.001, 5,
    ];

    const centerGuideGeo = new THREE.BufferGeometry();
    centerGuideGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(centerGuidePts, 3)
    );

    const centerGuideMat = new THREE.LineBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });

    const centerGuides = new THREE.LineSegments(centerGuideGeo, centerGuideMat);
    centerGuides.renderOrder = 1;

    scene.add(centerGuides);

    sceneRef.current = scene;
    window.__spxScene = scene; // dev: bone keyframing inspection
    window.__spxMeshRef = meshRef; // dev: import-path diagnostic

    const camera = new THREE.PerspectiveCamera(
      55,
      canvas.clientWidth / canvas.clientHeight,
      0.01,
      1000
    );
    camera.position.set(3, 3, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // ── Film quality EffectComposer ──
    try {
      const composer = initFilmComposer(renderer, scene, camera);
      rendererRef._composer = composer;
    } catch (e) { console.warn('EffectComposer init failed:', e); }

    // ── Upgrade all materials to MeshPhysical ──
    setTimeout(() => {
      try { upgradeMaterialsToPhysical(scene); } catch (e) { }
    }, 500);
    quadCamerasRef.current = createQuadCameraSet(camera);
    resizeQuadCameraSet(quadCamerasRef.current, canvas.clientWidth, canvas.clientHeight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 8, 5);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x00ffc8, 0.2);
    fill.position.set(-3, -2, -3);
    scene.add(fill);

    // Init transform gizmo
    setTimeout(() => {
      if (sceneRef.current && !gizmoRef.current) {
        gizmoRef.current = new TransformGizmo(sceneRef.current);
        gizmoRef.current.group.visible = false;
      }
    }, 200);

    clockRef.current = new THREE.Clock();

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      // ── Pause render when fullscreen panel is covering the canvas ──
      // This prevents the canvas from blinking through React overlays
      if (typeof window.__spxFullscreenOpen !== 'undefined' && window.__spxFullscreenOpen) {
        return;
      }

      // getDelta() is consumed every frame so resuming play after a pause
      // doesn't snap forward by accumulated wall-clock seconds.
      const _dt = clockRef.current ? clockRef.current.getDelta() : 0;
      // Phase 1 multi-import: tick every model's mixer. Each mixer's own
      // timeScale handles play/pause individually — the user pressing the
      // global play/pause toggles only the active mixer's timeScale via
      // the isPlaying useEffect bridge, while other models keep playing.
      // This is intentional: per-model independent animation.
      sceneObjectsRef.current.forEach(o => {
        if (o.mixer) o.mixer.update(_dt);
      });

      // Keep gizmo at constant screen-space size
      if (gizmoRef.current && canvas) {
        gizmoRef.current.updateScale(camera, canvas.clientHeight);
      }

      const _composer = rendererRef.current?._composer;
      if (_composer && typeof quadViewRef !== 'undefined' && !quadViewRef.current) {
        _composer.render();
      } else {
        renderViewportSet(
          renderer,
          scene,
          quadCamerasRef.current || { persp: camera },
          canvas.clientWidth,
          canvas.clientHeight,
          typeof quadViewRef !== "undefined" ? quadViewRef.current : false
        );
      } // end composer else
    };
    animate();

    const onResize = () => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      resizeQuadCameraSet(
        quadCamerasRef.current,
        canvas.clientWidth,
        canvas.clientHeight
      );
    };
    window.addEventListener("resize", onResize);

    // ── Professional Engine Bridge ─────────────────────────────────────────
    window.HalfEdgeMesh = HalfEdgeMesh;
    window.booleanUnion = booleanUnion;
    window.booleanSubtract = booleanSubtract;
    window.booleanIntersect = booleanIntersect;
    window.uvBoxProject = uvBoxProject;
    window.uvSphereProject = uvSphereProject;
    window.uvPlanarProject = uvPlanarProject;
    window.applySculptStroke = applySculptStroke;
    window.exportBVH = exportBVH; window.downloadBVH = downloadBVH;
    window.catmullClarkSubdivide = catmullClarkSubdivide;
    window.MOTION_CLIPS = MOTION_CLIPS; window.getClipsByCategory = getClipsByCategory;
    window.WEATHER_PRESETS = WEATHER_PRESETS; window.VEHICLE_CURVE_PRESETS = VEHICLE_CURVE_PRESETS;
    window.LSYSTEM_PRESETS = LSYSTEM_PRESETS; window.RENDER_PRESETS = RS_RENDER_PRESETS;
    window.createGPUSculptEngine = createGPUSculptEngine;
    window.createGPUClothSolver = createGPUClothSolver;
    window.createWebGPUPathTracer = createWebGPUPathTracer;
    window.SPXScriptRunner = SPXScriptRunner;
    window.createPerformanceSession = createPerformanceSession;
    window.createShapeKey = createShapeKey;
    window.applyShapeKeys = applyShapeKeys;
    window.createPipe = createPipe;
    window.createGear = createGear;
    window.buildProceduralMesh = buildProceduralMesh;
    window.createAssetLibrary = createAssetLibrary;
    window.createTourState = createTourState;
    window.generateLOD = generateLOD;
    window.createArmature = createArmature;
    window.enterPoseMode = enterPoseMode;
    window.initWeights = initWeights;
    window.applyDyntopo = applyDyntopo;
    window.createDynaMeshSettings = createDynaMeshSettings;
    window.createAction = createAction;
    window.createTrack = createTrack;
    window.createStrip = createStrip;
    window.createStroke = createStroke;
    window.createLayer = createLayer;
    window.createNode = createNode;
    window.createGraph = createGraph;
    window.addNode = addNode;
    window.connectNodes = connectNodes;
    window.evaluateGraph = evaluateGraph;
    window.createSpline = createSpline;
    window.applyPreset = applyPreset;
    window.createPaintTexture = createPaintTexture;
    window.bakeAO = bakeAO;
    window.createLight = createLight;
    window.createCamera = createCamera;
    window.applyColorGrade = applyColorGrade;
    window.createPassStack = createPassStack;
    window.DEFAULT_BONE_MAP = DEFAULT_BONE_MAP;
    window.retargetFrame = retargetFrame;
    window.bakeRetargetedAnimation = bakeRetargetedAnimation;
    window.fixFootSliding = fixFootSliding;
    window.autoDetectBoneMap = autoDetectBoneMap;
    window.getRetargetStats = getRetargetStats;
    window.createIKChain = createIKChain;
    window.createPathTracerSettings = createPathTracerSettings;
    window.createVolumetricSettings = createVolumetricSettings;
    window.generateFibermesh = generateFibermesh;
    window.createInstances = createInstances;
    window.fixNormals = fixNormals;
    window.createRetopoSettings = createRetopoSettings;
    // ── Extended engine bridge ─────────────────────────────────────────────
    window.createPBRMaterial = createPBRMaterial;
    window.createSSSMaterial = createSSSMaterial;
    window.createTransmissionMaterial = createTransmissionMaterial;
    window.applyRenderPreset = applyRenderPreset;
    window.applyToneMappingMode = applyToneMappingMode;
    window.captureFrame = captureFrame;
    window.downloadFrame = downloadFrame;
    window.RENDER_PRESETS = RS_RENDER_PRESETS;
    window.SSS_PRESETS = SSS_PRESETS;
    window.TRANSMISSION_PRESETS = TRANSMISSION_PRESETS;
    window.initVCAdvanced = initVCAdvanced;
    window.addVCLayer = addVCLayer;
    window.paintVCAdvanced = paintVCAdvanced;
    window.fillVCLayer = fillVCLayer;
    window.flattenVCLayers = flattenVCLayers;
    window.smearVC = smearVC;
    window.blurVCLayer = blurVCLayer;
    window.createPaintCanvas = createPaintCanvas;
    window.paintAtUV = paintAtUV;
    window.fillCanvas = fillCanvas;
    window.createLayerStack = createLayerStack;
    window.addLayer = addLayer;
    window.flattenLayers = flattenLayers;
    window.buildRigFromDoppelflex = buildRigFromDoppelflex;
    window.applyDoppelflexFrame = applyDoppelflexFrame;
    window.retargetDoppelflexToSPX = retargetDoppelflexToSPX;
    window.DOPPELFLEX_LANDMARK_MAP = DOPPELFLEX_LANDMARK_MAP;
    window.createSSAOPass = createSSAOPass;
    window.createBloomPass = createBloomPass;
    window.createDOFPass = createDOFPass;
    window.createChromaticAberrationPass = createChromaticAberrationPass;
    window.createPostPassManager = createPostPassManager;
    window.generateBraidPreset = generateBraidPreset;
    window.generateBunPreset = generateBunPreset;
    window.generatePonytailPreset = generatePonytailPreset;
    window.emitHairFromUV = emitHairFromUV;
    window.VFX_PRESETS = VFX_PRESETS;
    window.EMITTER_TYPES = EMITTER_TYPES;
    window.createEmitter = createEmitter;
    window.emitParticles = emitParticles;
    window.stepEmitter = stepEmitter;
    window.buildParticleSystem = buildParticleSystem;
    window.updateParticleSystem = updateParticleSystem;
    window.createDestructionEffect = createDestructionEffect;
    window.CONSTRAINT_TYPES = CONSTRAINT_TYPES;
    window.createConstraint = createConstraint;
    window.applyLookAt = applyLookAt;
    window.applyFloor = applyFloor;
    window.applyStretchTo = applyStretchTo;
    window.applyCopyLocation = applyCopyLocation;
    window.applyCopyRotation = applyCopyRotation;
    window.applyDampedTrack = applyDampedTrack;
    window.applyAllConstraints = applyAllConstraints;
    window.voxelRemesh = voxelRemesh;
    window.quadRemesh = quadRemesh;
    window.symmetrizeMesh = symmetrizeMesh;
    window.createRenderFarm = createRenderFarmLegacy;
    window.addRenderFarmJob = addRenderFarmJob;
    window.runNextRenderJob = runNextRenderJob;
    window.detectWebGPU = detectWebGPU;
    window.applyIBLToScene = applyIBLToScene;
    window.setupCascadedShadows = setupCascadedShadows;
    window.createNPROutlinePass = createNPROutlinePass;
    window.addAdvancedShapeKey = addAdvancedShapeKey;
    window.evaluateShapeKeysAdvanced = evaluateShapeKeysAdvanced;
    window.mirrorShapeKey = mirrorShapeKey;
    window.blendShapeKeys = blendShapeKeys;
    window.buildMorphTargetsFromKeys = buildMorphTargetsFromKeys;
    window.removeDoubles = removeDoubles;
    window.removeDegenerates = removeDegenerates;
    window.fillHoles = fillHoles;
    window.fullRepair = fullRepair;
    window.exportOBJ = exportOBJ;
    window.importFBXFromBackend = importFBXFromBackend;
    window.exportFBXToBackend = exportFBXToBackend;
    window.exportAlembic = exportAlembic;
    window.exportUSD = exportUSD;
    window.heatMapWeights = heatMapWeights;
    window.bindSkeletonAdvanced = bindSkeletonAdvanced;
    window.normalizeAllWeights = normalizeAllWeights;
    window.paintBoneWeight = paintBoneWeight;
    window.initVertexColors = initVertexColors;
    window.paintVertexColor = paintVertexColor;
    window.fillVertexColor = fillVertexColor;
    window.gradientFillVertexColor = gradientFillVertexColor;
    window.createUDIMLayout = createUDIMLayout;
    window.paintUDIM = paintUDIM;
    window.fillUDIMTile = fillUDIMTile;
    window.buildUDIMAtlas = buildUDIMAtlas;
    window.generateWalkCycle = generateWalkCycle;
    window.generateIdleCycle = generateIdleCycle;
    window.generateBreathingCycle = generateBreathingCycle;
    window.WALK_STYLES = WALK_STYLES;
    window.applyVolumetricFog = applyVolumetricFog;
    window.applyHeightFog = applyHeightFog;
    window.createGodRayEffect = createGodRayEffect;
    window.applyAtmospherePreset = applyAtmospherePreset;
    window.ATMOSPHERE_PRESETS = ATMOSPHERE_PRESETS;
    window.renderBeauty = renderBeauty;
    window.renderNormalPass = renderNormalPass;
    window.renderDepthPass = renderDepthPass;
    window.renderWireframePass = renderWireframePass;
    window.renderCryptomatte = renderCryptomatte;
    window.renderEmissionPass = renderEmissionPass;
    window.renderAllPasses = renderAllPasses;
    window.downloadPass = downloadPass;
    window.createMultiresStack = createMultiresStack;
    window.subdivideLevel = subdivideLevel;
    window.setMultiresLevel = setMultiresLevel;
    window.bakeDownLevel = bakeDownLevel;
    window.createSplineIK = createSplineIK;
    window.createIKFKBlend = createIKFKBlend;
    window.updateIKFKBlend = updateIKFKBlend;
    window.evaluateNLAAdvanced = evaluateNLAAdvanced;
    window.buildGLTFAnimationClip = buildGLTFAnimationClip;
    window.createVersionSnapshot = createVersionSnapshot;
    window.restoreVersion = restoreVersion;
    window.createCollabSession = createCollabSession;
    window.connectSession = connectSession;
    window.broadcastOperation = broadcastOperation;
    window.createRigidBody = createRigidBody;
    window.bakeRigidBodies = bakeRigidBodies;
    window.fractureMesh = fractureMesh;
    window.FLUID_PRESETS = FLUID_PRESETS;
    window.createFluidSettings = createFluidSettings;
    window.stepSPH = stepSPH;
    window.emitFluid = emitFluid;
    window.buildFluidMesh = buildFluidMesh;
    window.createPyroEmitter = createPyroEmitter;
    window.loadAlpha = loadAlpha;
    window.applyAlphaBrush = applyAlphaBrush;
    window.generateProceduralAlpha = generateProceduralAlpha;
    window.createToonMaterial = createToonMaterial;
    window.createFilmSkinMaterial = createFilmSkinMaterial;
    window.applyFilmSkin = applyFilmSkin;
    window.openFilmSkinPanel = () => setFilmSkinPanelOpen(true);
    window.openFilmHairPanel = () => setFilmHairPanelOpen(true);
    window.openGroomBrushPanel = () => setGroomBrushPanelOpen(true);
    window.openBraidGeneratorPanel = () => setBraidGeneratorPanelOpen(true);
    window.openFadeToolPanel = () => setFadeToolPanelOpen(true);
    window.openHairCardLODPanel = () => setHairCardLODPanelOpen(true);
    window.openFilmParticlePanel = () => setFilmParticlePanelOpen(true);
    window.openFilmWeatherPanel = () => setFilmWeatherPanelOpen(true);
    window.createHolographicMaterial = createHolographicMaterial;
    window.updateHolographicTime = updateHolographicTime;
    window.createDissolveMaterial = createDissolveMaterial;
    window.setDissolveAmount = setDissolveAmount;
    window.addOutlineToMesh = addOutlineToMesh;
    window.SHADER_PRESETS = SHADER_PRESETS;
    window.applyShaderPreset = applyShaderPreset;
    window.quadDominantRetopo = quadDominantRetopo;
    window.applySymmetryRetopo = applySymmetryRetopo;
    window.createClothWorker = createClothWorker;
    window.createSPHWorker = createSPHWorker;
    window.createWorkerPool = createWorkerPool;
    window.createDriver = createDriver;
    window.evaluateDriver = evaluateDriver;
    window.applyAllDrivers = applyAllDrivers;
    window.DRIVER_TYPES = DRIVER_TYPES;
    window.DRIVER_PRESETS = DRIVER_PRESETS;
    window.applyCollisions = applyCollisions;
    window.applySelfCollision = applySelfCollision;
    window.createCollidersFromMesh = createCollidersFromMesh;
    window.dissolveEdge = dissolveEdge;
    window.bridgeFaces = bridgeFaces;
    window.gridFill = gridFill;
    window.pokeFace = pokeFace;
    window.insetFace = insetFace;
    window.convertNgonsToTris = convertNgonsToTris;
    window.createReflectionProbe = createReflectionProbe;
    window.updateReflectionProbe = updateReflectionProbe;
    window.applyProbeToScene = applyProbeToScene;
    window.applySSR = applySSR;
    window.bakeEnvironment = bakeEnvironment;
    window.createProbeManager = createProbeManager;
    window.initPluginAPI = initPluginAPI;
    window.getAllPlugins = getAllPlugins;
    window.loadPluginFromURL = loadPluginFromURL;
    window.createPresetMarketplace = createPresetMarketplace;
    window.emitHair = emitHair;
    window.buildHairLines = buildHairLines;
    window.buildHairTubes = buildHairTubes;
    window.clumpHair = clumpHair;
    window.applyHairPreset = applyHairPreset;
    window.HAIR_PRESETS = HAIR_PRESETS;
    window.exportHairCardsGLB = exportHairCardsGLB;
    window.applyCheckerToMesh = applyCheckerToMesh;
    window.unwrapBoxProjection = unwrapBoxProjection;
    window.exportUVLayoutGLB = exportUVLayoutGLB;

    window.FORCE_FIELD_TYPES = FORCE_FIELD_TYPES;
    window.createGPUParticleSystem = createGPUParticleSystem;
    window.emitGPUParticles = emitGPUParticles;
    window.stepGPUParticles = stepGPUParticles;
    window.createForceField = createForceField;
    window.burstEmit = burstEmit;
    window.bakeNormalMap = bakeNormalMap;
    window.bakeCurvature = bakeCurvature;
    window.bakeAllMaps = bakeAllMaps;
    window.downloadBakedMap = downloadBakedMap;
    window.createCloth = createCloth;
    window.stepCloth = stepCloth;
    window.applyClothPreset = applyClothPreset;
    window.resetCloth = resetCloth;
    window.CLOTH_PRESETS = CLOTH_PRESETS;
    window.pinVertex = pinVertex;
    window.unpinVertex = unpinVertex;
    window.pinVerticesInRadius = pinVerticesInRadius;
    window.pinTopRow = pinTopRow;
    window.pinToBone = pinToBone;
    window.marchingCubesRemesh = marchingCubesRemesh;
    window.fluidSurfaceMesh = fluidSurfaceMesh;
    window.createSkinnedMesh = createSkinnedMesh;
    window.bindMeshToArmature = bindMeshToArmature;
    window.createHairPhysicsSettings = createHairPhysicsSettings;
    window.stepHairPhysics = stepHairPhysics;
    window.addWindForce = addWindForce;
    window.bakeHairPhysics = bakeHairPhysics;
    window.createThreePointLighting = createThreePointLighting;
    window.applyTemperature = applyTemperature;
    window.createVolumericFog = createVolumericFog;
    window.removeFog = removeFog;
    window.applyHDRI = applyHDRI;
    window.addLightHelper = addLightHelper;
    window.HDRI_PRESETS = HDRI_PRESETS;
    window.saveBookmark = saveBookmark;
    window.restoreBookmark = restoreBookmark;
    window.setDOF = setDOF;
    window.applyCameraShake = applyCameraShake;
    window.rackFocus = rackFocus;
    window.dollyZoom = dollyZoom;
    window.evaluateNLA = evaluateNLA;
    window.pushDownAction = pushDownAction;
    window.bakeNLA = bakeNLA;
    window.capturePose = capturePose;
    window.applyPose = applyPose;
    window.resetToRestPose = resetToRestPose;
    window.savePoseToLibrary = savePoseToLibrary;
    window.loadPoseFromLibrary = loadPoseFromLibrary;
    window.applyEdgeWear = applyEdgeWear;
    window.applyCavityDirt = applyCavityDirt;
    window.MATERIAL_PRESETS = MATERIAL_PRESETS;
    window.optimizeScene = optimizeScene;
    window.applyProceduralAnimation = applyProceduralAnimation;
    window.PROCEDURAL_ANIMATIONS = PROCEDURAL_ANIMATIONS;
    window.exportToStreamPireX = exportToStreamPireX;
    window.downloadSPXFile = downloadSPXFile;
    window.buildSPXExportPayload = buildSPXExportPayload;
    window.addBone = (armature, opts) => { if (armature && typeof armature.addBone === 'function') return armature.addBone(opts); };
    window.importSpxScene = importSpxScene;
    window.takeSnapshot = takeSnapshot;
    window.addPrimitive = addPrimitive;
    window.selectSceneObject = selectSceneObject;
    window.deleteSceneObject = deleteSceneObject;

    // Live transform sync: TransformGizmo calls this during drag so the
    // React sidebar (SCENE > TRANSFORM) updates while the user is dragging.
    window.updateSceneObjectTransform = (target, position, rotation, scale) => {
      if (!target) return;
      // Bump the global transform version — causes PropertiesPanel to re-read mesh.position
      setTransformVersion(v => v + 1);
    };

    window.runBenchmark = () => {
      console.log("🏗️ Building Mechanical Benchmark...");
      addPrimitive("Gear", { teeth: 24, radius: 2, height: 0.5 });
      setTimeout(() => {
        addPrimitive("Gear", { teeth: 12, radius: 1, height: 0.5 });
        const gears = scene.children.filter((c) => c.userData.type === "Gear");
        if (gears[1]) gears[1].position.set(3, 0, 0);
      }, 100);
      setTimeout(() => {
        addPrimitive("Helix", { radius: 1, height: 5, turns: 3, radialSegments: 32 });
        const helix = scene.children.find((c) => c.userData.type === "Helix");
        if (helix) {
          helix.position.set(-3, 2.5, 0);
          helix.material.transparent = true;
          helix.material.opacity = 0.5;
          helix.material.color.set("#00ffff");
        }
      }, 200);
      console.log("✅ Benchmark Scene Populated. Testing Timeline...");
      setIsPlaying(true);
    };

    window.SPX = {
      toggleViewport: (type) => {
        scene.traverse((obj) => {
          if (obj.isMesh) {
            if (type === "wireframe")
              obj.material.wireframe = !obj.material.wireframe;
            if (type === "xray")
              obj.material.opacity = obj.material.opacity === 1 ? 0.3 : 1;
            if (type === "xray") obj.material.transparent = true;
          }
          if (type === "grid" && obj.type === "GridHelper")
            obj.visible = !obj.visible;
        });
        console.log(`👁️ Viewport: ${type} toggled.`);
      },
      clearScene: () => {
        scene.children
          .filter((c) => c.isMesh)
          .forEach((m) => scene.remove(m));
        setSceneObjects([]);
        console.log("🧹 Scene Cleared.");
      },
      runBenchmark: () => {
        window.SPX.clearScene();
        console.log("🏗️ Building Mechanical Benchmark...");
        addPrimitive("Gear", { teeth: 24, radius: 2, height: 0.5 });
        setTimeout(
          () => addPrimitive("Gear", { teeth: 12, radius: 1, height: 0.5 }),
          200
        );
        setTimeout(
          () => addPrimitive("Helix", { radius: 1, height: 5, turns: 3 }),
          400
        );
        setIsPlaying(true);
      },
    };

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  // ── N panel keyboard shortcut ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const key = e.key;
      if (key === "n" || key === "N") setShowNPanel((v) => !v);
      if (key === "g" || key === "G") window.SPX?.toggleViewport("grid");
      if (key === "w" || key === "W") window.SPX?.toggleViewport("wireframe");
      if (key === "r" || key === "R") window.takeSnapshot?.();
      // Delete selected object (x/X only here; Delete/Backspace handled by handleGlobalKeys)
      if (key === "x" || key === "X") {
        if (activeObjId) deleteSceneObject(activeObjId);
      }
      // Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === "z") undo();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "z") redo();
      if ((e.ctrlKey || e.metaKey) && key === "y") redo();
      // Add primitives
      if (key === "Tab") {
        e.preventDefault();
        if (activeWorkspace === "Modeling") toggleEditMode();
        else setShowNPanel(v => !v);
      }
      if (key === "p" || key === "P") {
        e.preventDefault();
        setShowPerformancePanel(v => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeObjId]);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[r.length - 1];
      const heMesh = heMeshRef.current;
      const mesh = meshRef.current;
      if (!heMesh || !mesh) return r;
      const { positions: cp, indices: ci } = heMesh.toBufferGeometry();
      setHistory((h) => [...h.slice(-20), { positions: [...cp], indices: [...ci] }]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(next.positions, 3));
      geo.setIndex(new THREE.Uint32BufferAttribute(next.indices, 1));
      geo.computeVertexNormals();
      if (mesh.isMesh) { mesh.geometry.dispose(); mesh.geometry = geo; }
      return r.slice(0, -1);
    });
  }, []);

  // ── Push history ───────────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    const heMesh = heMeshRef.current;
    if (!heMesh) return;
    const { positions, indices } = heMesh.toBufferGeometry();
    setHistory((h) => [
      ...h.slice(-20),
      { positions: [...positions], indices: [...indices] },
    ]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      const heMesh = heMeshRef.current;
      const mesh = meshRef.current;
      if (!heMesh || !mesh) return h;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(prev.positions, 3)
      );
      geo.setIndex(new THREE.Uint32BufferAttribute(prev.indices, 1));
      geo.computeVertexNormals();
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        mesh.geometry = geo;
      }
      heMeshRef.current = HalfEdgeMesh.fromBufferGeometry(geo);
      setStats(heMeshRef.current.stats());
      setStatus("Undo");
      return h.slice(0, -1);
    });
  }, []);

  // ── Add primitive ──────────────────────────────────────────────────────────
  // ── Load a specific model into the scene ────────────────────────────────────
  const loadModelToScene = useCallback((url, label) => {
    // Remove existing default models (keep user-added meshes)
    const DEFAULT_URLS = ["/models/michelle.glb", "/models/xbot.glb", "/models/ybot.glb", "/ybot.glb"];
    setSceneObjects(prev => {
      const toRemove = prev.filter(o => DEFAULT_URLS.includes(o.userData?.url));
      toRemove.forEach(o => { if (o.mesh) sceneRef.current?.remove(o.mesh); });
      return prev.filter(o => !DEFAULT_URLS.includes(o.userData?.url));
    });
    setActiveModelUrl(url);
    setShowModelPicker(false);
    // Load via dynamic GLTFLoader
    import("three/examples/jsm/loaders/GLTFLoader.js").then(({ GLTFLoader }) => {
      const loader = new GLTFLoader();
      setStatus(`Loading ${label}...`);
      loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.name = label;
        // GLTFLoader returns animations alongside the scene; mirror onto the
        // Object3D so _attachMixerToModel finds them the same way OBJ/FBX
        // imports do.
        model.animations = gltf.animations || [];
        sceneRef.current?.add(model);

        // Bone keyframing: add small helper spheres at each bone for click-select.
        // Parented to the bone so they track movement. Raycast targets.
        import("three").then((THREE_MOD) => {
          const helperGeo = new THREE_MOD.SphereGeometry(0.02, 8, 6);
          const helperMat = new THREE_MOD.MeshBasicMaterial({ color: 0xff6600, depthTest: false, transparent: true, opacity: 0.7 });
          model.traverse((child) => {
            if (child.isSkinnedMesh && child.skeleton) {
              child.skeleton.bones.forEach((bone) => {
                const helper = new THREE_MOD.Mesh(helperGeo, helperMat.clone());
                helper.renderOrder = 999;
                helper.userData.isBoneHelper = true;
                helper.userData.boneRef = bone;
                helper.name = "_boneHelper_" + bone.name;
                bone.add(helper); // Parent to bone so it tracks
                boneHelpersRef.current.push(helper);
              });
            }
          });
          console.log("[bone-keyframe] Added " + boneHelpersRef.current.length + " bone helpers");
        });

        // Auto-fit GLB to scene scale (Mixamo exports in cm = ~138 unit oversize)
        import('three').then((THREE_MOD) => {
          const box = new THREE_MOD.Box3().setFromObject(model);
          const size = box.getSize(new THREE_MOD.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 10) {
            const s = 2 / maxDim;
            model.scale.setScalar(s);
            const box2 = new THREE_MOD.Box3().setFromObject(model);
            model.position.y -= box2.min.y;
          }
        }).catch((e) => console.warn('[loadModelToScene] auto-fit failed', e));
        const id = Date.now();
        const newObj = {
          id, name: label, mesh: model,
          userData: { type: "glb", url },
          // Phase 1 multi-import: per-model mixer fields populated by
          // _attachMixerToModel below before pushing to state.
          mixer: null, mixerDuration: 0,
        };
        _attachMixerToModel(model, newObj);
        setSceneObjects(prev => [...prev, newObj]);
        setActiveObjId(id);
        meshRef.current = model;
        setStatus(`✓ ${label} loaded`);
      }, undefined, () => setStatus(`Could not load ${label}`));
    }).catch(() => setStatus(`GLTFLoader unavailable`));
  }, [sceneRef, meshRef, setSceneObjects, setActiveObjId]);

  // ── AnimationMixer lifecycle (Phase 1 multi-import) ─────────────────────────
  // Mixers are per-model, stored on each sceneObjects entry's `mixer` field.
  // mixerRef.current and mixerDurationRef.current are now "active model"
  // pointers — driven by selection — preserving backward compat for
  // SPX3DTo2DPanel and the play/pause/scrub bridges that read mixerRef.

  // Dispose a SPECIFIC model's mixer. Called from deleteSceneObject when a
  // model is removed from the outliner. No-op if no model passed (callers
  // wanting "stop everything" must iterate sceneObjectsRef themselves).
  const _disposeMixer = (model) => {
    if (!model) return;
    const obj = sceneObjectsRef.current.find(o => o.mesh === model);
    if (!obj || !obj.mixer) return;
    obj.mixer.stopAllAction();
    obj.mixer.uncacheRoot(model);
    if (mixerRef.current === obj.mixer) {
      mixerRef.current = null;
      mixerDurationRef.current = 0;
      autoPlayingRef.current = false;
    }
    obj.mixer = null;
    obj.mixerDuration = 0;
  };

  // Build a mixer for `model` and store on `obj.mixer`. Always creates a
  // mixer, even for models without clips (idle mixer is harmless and
  // keeps obj.mixer non-null for future clip assignment).
  // Auto-play sets autoPlayingRef + timeScale directly (NOT setIsPlaying) so
  // the mixer loops its native clip without coupling to the editor's 0–250
  // frame counter. The user pressing play/pause later takes over via the
  // isPlaying effect.
  const _attachMixerToModel = (model, obj = null) => {
    const mixer = new THREE.AnimationMixer(model);
    const clips = model?.animations || [];
    let duration = 0;
    if (clips.length) {
      mixer.clipAction(clips[0]).play();
      duration = clips[0].duration || 0;
      autoPlayingRef.current = true;
    }
    mixer.timeScale = 1;
    if (obj) {
      obj.mixer = mixer;
      obj.mixerDuration = duration;
    }
    // Active-model pointers — newly-imported model becomes active.
    mixerRef.current = mixer;
    mixerDurationRef.current = duration;
    return mixer;
  };

  // ── Shared OBJ/FBX register-and-fit helper ──────────────────────────────────
  // Loaded model is a Three.js Object3D (Group from OBJ/FBXLoader). Auto-fit
  // matches loadModelToScene; entry shape matches createSceneObject so the
  // outliner sees OBJ/FBX imports the same as primitives.
  const _addLoadedModelToScene = (model, { label, type, fileName }) => {
    const scene = sceneRef.current;
    if (!scene) return null;
    model.name = label;
    scene.add(model);
    // Box3.setFromObject only calls updateWorldMatrix(false, false) — does
    // NOT propagate to descendants. SkinnedMesh under an Armature with
    // baked scale (Mixamo's 0.01 cm→m bake) measures stale identity
    // transforms otherwise.
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    console.log('[_addLoadedModelToScene] maxDim:', maxDim,
      'modelScale:', model.scale.toArray(),
      'box.isEmpty:', box.isEmpty(),
      'fires:', maxDim > 0 && (maxDim < 0.5 || maxDim > 10));
    // Auto-fit catches both ends:
    //   maxDim < 0.5  → cm-baked Mixamo lands at ~0.018u (1.8cm — invisible)
    //   maxDim > 10   → cm-unbaked Mixamo lands at ~138u (oversize)
    if (maxDim > 0 && (maxDim < 0.5 || maxDim > 10)) {
      model.scale.setScalar(2 / maxDim);
      model.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(model);
      model.position.y -= box2.min.y;
    }

    // Auto-offset spawn (Phase 1 multi-import). Each new model lands
    // 1.5× its post-auto-fit width to the +X side of the previous one
    // so multiple imports don't visually overlap. First import lands
    // at origin (count === 0).
    const existingCount = sceneObjectsRef.current.length;
    if (existingCount > 0) {
      const finalBox = new THREE.Box3().setFromObject(model);
      const finalWidth = Math.max(0.1, finalBox.getSize(new THREE.Vector3()).x);
      model.position.x += existingCount * finalWidth * 1.5;
    }

    const obj = createSceneObject(type, label, model);
    obj.userData = { url: fileName, hasAnimations: (model.animations?.length || 0) > 0 };
    // Build mixer + populate obj.mixer BEFORE pushing to state so the
    // animate loop's forEach sees the mixer on the very first tick.
    _attachMixerToModel(model, obj);
    setSceneObjects(prev => [...prev, obj]);
    setActiveObjId(obj.id);
    meshRef.current = model;
    heMeshRef.current = null;
    return obj.id;
  };

  // ── Workspace default model loader ─────────────────────────────────────────
  // Uses active mesh if scene has one, otherwise loads the right starter model
  const ensureWorkspaceMesh = useCallback((workspaceType) => {
    // If there's already an active object in the scene, use it
    if (activeObjId && meshRef.current) {
      setStatus(`Using active mesh for ${workspaceType}`);
      return;
    }
    // If scene has any objects at all, activate the first one
    if (sceneObjects.length > 0 && sceneObjects[0].mesh) {
      const first = sceneObjects[0];
      setActiveObjId(first.id);
      meshRef.current = first.mesh;
      setStatus(`Using ${first.name || "scene mesh"} for ${workspaceType}`);
      return;
    }
    // Scene is empty — load the right default model
    const DEFAULTS = {
      sculpt: { type: "sphere", label: "Base Sculpt Sphere", params: { radius: 1, segments: 64 } },
      hair: { type: "glb", label: "Head Mesh", url: "/models/michelle.glb" },
      clothing: { type: "glb", label: "Body Mesh", url: "/models/michelle.glb" },
      pattern: { type: "glb", label: "Body for Draping", url: "/models/michelle.glb" },
      fabric: { type: "glb", label: "Body Mesh", url: "/models/michelle.glb" },
      shading: { type: "sphere", label: "Shading Preview Sphere", params: { radius: 1, segments: 32 } },
      modeling: { type: "box", label: "Default Box", params: {} },
      rigging: { type: "glb", label: "Y Bot Rig", url: "/models/ybot.glb" },
      vfx: { type: "sphere", label: "VFX Target", params: { radius: 0.5, segments: 32 } },
    };
    const def = DEFAULTS[workspaceType];
    if (!def) return;
    if (def.type === "glb") {
      // Show model picker so user can choose or confirm default
      setModelPickerContext(workspaceType);
      setShowModelPicker(true);
      // Also auto-load the default
      loadModelToScene(def.url, def.label);
    } else {
      // Add a Three.js primitive
      addPrimitive(def.type === "sphere" ? "Sphere" : "Box");
      setStatus(`✓ ${def.label} loaded — ready for ${workspaceType}`);
    }
  }, [activeObjId, sceneObjects, meshRef, sceneRef, setActiveObjId]);



  // ── Clear overlays ─────────────────────────────────────────────────────────
  const clearOverlays = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    [vertDotsRef, edgeLinesRef, faceMeshRef, previewLineRef].forEach((r) => {
      if (r.current) {
        scene.remove(r.current);
        r.current = null;
      }
    });
  };

  // ── Build vertex overlay ───────────────────────────────────────────────────
  const buildVertexOverlay = useCallback(
    (selVerts = selectedVerts) => {
      const scene = sceneRef.current;
      const heMesh = heMeshRef.current;
      const parent = meshRef.current;
      if (!scene || !heMesh || !parent) return;

      if (vertDotsRef.current) scene.remove(vertDotsRef.current);

      const positions = [];
      const colors = [];
      heMesh.vertices.forEach((v) => {
        positions.push(v.x, v.y, v.z);
        const sel = selVerts.has(v.id);
        // Blender-style: dim gray unselected, bright SPX orange selected
        colors.push(sel ? 1.0 : 0.2, sel ? 0.5 : 0.2, sel ? 0.1 : 0.2);
      });

      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: true,
        depthTest: true,
        sizeAttenuation: true,
      });

      const pts = new THREE.Points(geo, mat);
      pts.position.copy(parent.position);
      pts.renderOrder = 2;
      scene.add(pts);
      vertDotsRef.current = pts;
    },
    [selectedVerts]
  );

  // ── Build edge overlay ─────────────────────────────────────────────────────
  const buildEdgeOverlay = useCallback(
    (selEdges = selectedEdges) => {
      const scene = sceneRef.current;
      const heMesh = heMeshRef.current;
      const parent = meshRef.current;
      if (!scene || !heMesh || !parent) return;

      if (edgeLinesRef.current) scene.remove(edgeLinesRef.current);

      const positions = [];
      const colors = [];
      const seen = new Set();
      heMesh.halfEdges.forEach((e) => {
        if (!e.twin || seen.has(e.id) || seen.has(e.twin.id)) return;
        seen.add(e.id);
        const a = e.vertex,
          b = e.twin.vertex;
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        const sel = selEdges.has(e.id) || selEdges.has(e.twin?.id);
        // Blender-style: dim near-black unselected, SPX orange selected
        colors.push(
          sel ? 1.0 : 0.1,
          sel ? 0.5 : 0.1,
          sel ? 0.1 : 0.1,
          sel ? 1.0 : 0.1,
          sel ? 0.5 : 0.1,
          sel ? 0.1 : 0.1
        );
      });

      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        depthTest: true,
        linewidth: 2,
      });

      const lines = new THREE.LineSegments(geo, mat);
      lines.position.copy(parent.position);
      lines.renderOrder = 2;
      scene.add(lines);
      edgeLinesRef.current = lines;
    },
    [selectedEdges]
  );

  // ── Build face overlay ─────────────────────────────────────────────────────
  const buildFaceOverlay = useCallback(
    (selFaces = selectedFaces) => {
      const scene = sceneRef.current;
      const mesh = meshRef.current;
      if (!scene || !mesh) return;

      // Remove existing face overlay
      if (faceOverlayRef.current) { scene.remove(faceOverlayRef.current); faceOverlayRef.current = null; }
      if (selFaces.size === 0) return;

      const geo = mesh.geometry;
      const pos = geo.attributes.position;
      const idx = geo.index;
      if (!pos) return;

      const overlayPositions = [];
      const overlayColors = [];

      if (idx) {
        for (let i = 0; i < idx.count; i += 3) {
          const faceIdx = Math.floor(i / 3);
          const selected = selFaces.has(faceIdx);
          if (!selected) continue;
          for (let k = 0; k < 3; k++) {
            const vi = idx.getX(i + k);
            overlayPositions.push(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
            overlayColors.push(1.0, 0.4, 0.0); // orange highlight
          }
        }
      }

      if (overlayPositions.length === 0) return;

      const overlayGeo = new THREE.BufferGeometry();
      overlayGeo.setAttribute("position", new THREE.Float32BufferAttribute(overlayPositions, 3));
      overlayGeo.setAttribute("color", new THREE.Float32BufferAttribute(overlayColors, 3));
      const overlayMat = new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.4,
        depthTest: false, side: THREE.DoubleSide,
      });
      const overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
      overlayMesh.position.copy(mesh.position);
      overlayMesh.renderOrder = 1;
      scene.add(overlayMesh);
      faceOverlayRef.current = overlayMesh;
    },
    [selectedFaces]
  );

  // ── Build loop cut preview line ────────────────────────────────────────────
  const buildLoopCutPreview = useCallback((t) => {
    const scene = sceneRef.current;
    const heMesh = heMeshRef.current;
    if (!scene || !heMesh) return;

    if (previewLineRef.current) {
      scene.remove(previewLineRef.current);
      previewLineRef.current = null;
    }

    const edges = [...heMesh.halfEdges.values()];
    const pivot = edges[Math.floor(edges.length / 4)];
    if (!pivot) return;

    const loop = pivot.edgeLoop();
    if (loop.length < 2) return;

    const pts = loop.map((e) => {
      const a = e.vertex,
        b = e.next?.vertex;
      if (!b) return new THREE.Vector3(a.x, a.y, a.z);
      return new THREE.Vector3(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        a.z + (b.z - a.z) * t
      );
    });

    pts.push(pts[0]); // close loop

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: COLORS.teal,
      depthTest: false,
      linewidth: 3,
    });

    const line = new THREE.Line(geo, mat);
    scene.add(line);
    previewLineRef.current = line;
  }, []);

  // Update preview when t changes
  useEffect(() => {
    if (activeTool === "loop_cut" && editMode === "edit")
      buildLoopCutPreview(loopCutT);
  }, [loopCutT, activeTool, editMode, buildLoopCutPreview]);

  // ── Rebuild geometry from HE mesh ─────────────────────────────────────────
  const rebuildMeshGeometry = useCallback(() => {
    const heMesh = heMeshRef.current;
    const mesh = meshRef.current;
    if (!heMesh || !mesh) return;
    const { positions, indices } = heMesh.toBufferGeometry();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geo.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      mesh.geometry = geo;
    }
    if (editMode === "edit") {
      if (selectMode === "vert") buildVertexOverlay();
      if (selectMode === "edge") buildEdgeOverlay();
      if (selectMode === "face") buildFaceOverlay();
    }
  }, [editMode, selectMode, buildVertexOverlay, buildEdgeOverlay, buildFaceOverlay]);

  // ── Raycasting for selection ───────────────────────────────────────────────
  const raycast = useCallback((e) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: mx, y: my }, camera);
    raycaster.params.Points.threshold = 0.1;
    raycaster.params.Line.threshold = 0.05;
    return raycaster;
  }, []);

  // ── Click for selection ────────────────────────────────────────────────────
  const onCanvasClick = useCallback(
    (e) => {
      if (editModeRef.current !== "edit" && editModeRef.current !== "object") return;
      if (editModeRef.current === "object") {
        const canvas = canvasRef.current;
        const camera = cameraRef.current;
        if (!canvas || !camera) { console.log("[SELECT] no canvas/camera"); return; }
        const actualCanvas = canvasRef.current;
        const rect = actualCanvas.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
        const objs = sceneObjectsRef.current;
        // Raycast directly against scene, filter to only real Mesh objects
        const sceneHits = raycaster.intersectObjects(sceneRef.current?.children || [], true)
          .filter(h => h.object.type === "Mesh" && h.object.isMesh);
        if (sceneHits.length > 0) {
          const hitMesh = sceneHits[0].object;
          // Find which sceneObject owns this mesh
          let matched = objs.find(o => o.mesh === hitMesh);
          if (!matched) matched = objs.find(o => o.mesh?.uuid === hitMesh.uuid);
          if (!matched) matched = objs.find(o => {
            if (!o.mesh) return false;
            let found = false;
            o.mesh.traverse(m => { if (m === hitMesh) found = true; });
            return found;
          });
          // Position-based fallback
          if (!matched && objs.length > 0) {
            let minDist = Infinity;
            objs.forEach(o => {
              if (!o.mesh) return;
              const d = o.mesh.position.distanceTo(sceneHits[0].point);
              if (d < minDist) { minDist = d; matched = o; }
            });
          }
          if (matched) selectSceneObject(matched.id);
        } else {
          objs.forEach(o => {
            if (o.mesh) o.mesh.traverse(m => {
              if (m.isMesh && m.material) {
                if (m.material.emissive) m.material.emissive.set(0x000000);
                m.material.emissiveIntensity = 0;
              }
            });
          });
          setActiveObjId(null);
          meshRef.current = null;
        }
        return;
      }
      if (activeToolRef.current === "knife") return;
      const raycaster = raycast(e);
      if (!raycaster) return;
      const heMesh = heMeshRef.current;
      if (!heMesh) return;

      if (selectModeRef.current === "vert") {
        let closest = null,
          minDist = Infinity;
        heMesh.vertices.forEach((v) => {
          const wp = new THREE.Vector3(v.x, v.y, v.z);
          const sp = wp.clone().project(cameraRef.current);
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const sx = ((sp.x + 1) / 2) * rect.width + rect.left;
          const sy = ((-sp.y + 1) / 2) * rect.height + rect.top;
          const d = Math.hypot(e.clientX - sx, e.clientY - sy);
          if (d < minDist && d < 20) {
            minDist = d;
            closest = v;
          }
        });
        if (closest) {
          setSelectedVerts((sv) => {
            const next = new Set(sv);
            if (next.has(closest.id)) next.delete(closest.id);
            else next.add(closest.id);
            buildVertexOverlay(next);
            return next;
          });
          setStatus(`Vertex ${closest.id} selected`);
        }
      } else if (selectModeRef.current === "edge") {
        let closest = null,
          minDist = Infinity;
        const seen = new Set();
        heMesh.halfEdges.forEach((edge) => {
          if (!edge.twin || seen.has(edge.id) || seen.has(edge.twin.id))
            return;
          seen.add(edge.id);
          const a = edge.vertex,
            b = edge.twin.vertex;
          const mid = new THREE.Vector3(
            (a.x + b.x) / 2,
            (a.y + b.y) / 2,
            (a.z + b.z) / 2
          );
          const sp = mid.clone().project(cameraRef.current);
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const sx = ((sp.x + 1) / 2) * rect.width + rect.left;
          const sy = ((-sp.y + 1) / 2) * rect.height + rect.top;
          const d = Math.hypot(e.clientX - sx, e.clientY - sy);
          if (d < minDist && d < 25) {
            minDist = d;
            closest = edge;
          }
        });
        if (closest) {
          setSelectedEdges((se) => {
            const next = new Set(se);
            if (next.has(closest.id)) next.delete(closest.id);
            else {
              next.add(closest.id);
              if (closest.twin) next.add(closest.twin.id);
            }
            buildEdgeOverlay(next);
            return next;
          });
          setStatus(`Edge ${closest.id} selected`);
        }
      } else if (selectModeRef.current === "face") {
        const hits = meshRef.current?.material ? raycaster.intersectObject(meshRef.current, true) : [];
        if (hits.length > 0) {
          const faceIdx = hits[0].faceIndex;
          setSelectedFaces((sf) => {
            const next = new Set(sf);
            if (next.has(faceIdx)) next.delete(faceIdx);
            else next.add(faceIdx);
            return next;
          });
          setStatus(`Face ${faceIdx} selected`);
          buildFaceOverlay(next);
        }
      }
    },
    [raycast, buildVertexOverlay, buildEdgeOverlay, buildFaceOverlay]
  );

  // ── Knife tool ─────────────────────────────────────────────────────────────
  const onKnifeClick = useCallback((e) => {
    if (vcPaintingRef.current && editModeRef.current === "paint") {
      applyVertexPaint(e);
      return;
    }
    if (sculptingRef.current && editModeRef.current === "sculpt") {
      applySculpt(e);
      return;
    }
    if (activeToolRef.current !== "knife" || editModeRef.current !== "edit")
      return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const knife = knifeRef.current;
    knife.points.push({ x, y });
    setKnifePoints([...knife.points]);

    if (knife.points.length >= 2) {
      // Draw knife line on canvas overlay (handled in JSX)
      // When user presses Enter or double-clicks: execute cut
    }
    setStatus(
      `Knife: ${knife.points.length} point(s) — press Enter to cut, Esc to cancel`
    );
  }, []);

  // ── Sculpt stroke handler ─────────────────────────────────────────────────
  const applySculpt = useCallback((e) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    // Use active scene object mesh if meshRef not set
    let mesh = meshRef.current;
    if (!mesh && sceneObjects.length > 0) {
      const activeObj = sceneObjects.find(o => o.id === activeObjId) || sceneObjects[0];
      if (activeObj?.mesh) {
        mesh = activeObj.mesh;
        meshRef.current = mesh;
      }
    }
    if (!canvas) { console.warn("sculpt: no canvas"); return; }
    if (!camera) { console.warn("sculpt: no camera"); return; }
    if (!mesh) { console.warn("sculpt: no mesh"); return; }

    const hit = getSculptHit(e, canvas, camera, mesh);
    if (!hit) { console.warn("sculpt: no hit — click directly on the mesh"); return; }
    console.log("sculpt hit:", hit.point, "brush:", sculptBrush);

    pushHistory();
    const _brush = {
      type: sculptBrushRef.current || 'draw',
      radius: sculptRadiusRef.current || 0.3,
      strength: sculptStrengthRef.current || 0.5,
      falloff: sculptFalloffRef.current || 'smooth',
      direction: 1,
      symmetry: sculptSymXRef.current || false,
      symmetryAxis: 'x',
      backfaceCull: true,
    };
    // Convert to non-indexed for sculpt so all vertices can be deformed independently
    // keep indexed/shared vertices for smooth sculpting
    mesh.geometry.computeVertexNormals();
    const _invMat = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const _localPt = hit.point.clone().applyMatrix4(_invMat);
    const _localNm = hit.normal.clone().transformDirection(_invMat).normalize();
    applySculptStroke(mesh.geometry, _localPt, _localNm, _brush, {});

    // Force Three.js to re-render the updated geometry
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    if (mesh.geometry.attributes.normal) {
      mesh.geometry.attributes.normal.needsUpdate = true;
    }
    mesh.geometry.computeBoundingSphere();

    // Dyntopo after every N strokes
    sculptStrokeCountRef.current += 1;
    if (dyntopoEnabled && sculptStrokeCountRef.current % 2 === 0 && typeof window.applyDyntopo === "function") {
      window.applyDyntopo(mesh, hit, { detailSize: 0.03, mode: "both", radius: sculptRadiusRef.current || 0.18 });
    }

    // Update stats
    if (mesh.geometry?.attributes?.position) {
      setStats(s => ({ ...s, vertices: mesh.geometry.attributes.position.count }));
    }
  }, [sculptBrush, sculptRadius, sculptStrength, sculptFalloff, sculptSymX, dyntopoEnabled, pushHistory]);

  const executeKnifeCut = useCallback(() => {
    const knife = knifeRef.current;
    const heMesh = heMeshRef.current;
    if (!heMesh || knife.points.length < 2) return;
    pushHistory();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const p1 = knife.points[0],
      p2 = knife.points[knife.points.length - 1];
    const dx = p2.x - p1.x,
      dy = p2.y - p1.y;
    const planeNormal = {
      x: (-dy / rect.width) * 2,
      y: (dx / rect.height) * 2,
      z: 0,
    };
    const midScreen = {
      x: (((p1.x + p2.x) / 2) / rect.width) * 2 - 1,
      y: -(((p1.y + p2.y) / 2) / rect.height) * 2 + 1,
    };
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(midScreen, cameraRef.current);
    const hits = meshRef.current?.material ? raycaster.intersectObject(meshRef.current, true) : [];
    const planePoint =
      hits.length > 0 ? hits[0].point : { x: 0, y: 0, z: 0 };

    const newVerts = heMesh.knifeCut(planeNormal, planePoint);
    rebuildMeshGeometry();
    setStats(heMesh.stats());
    knife.points = [];
    setKnifePoints([]);
    setStatus(`Knife cut — added ${newVerts.length} vertices`);
  }, [pushHistory, rebuildMeshGeometry]);

  // ── Edge slide ─────────────────────────────────────────────────────────────
  const startEdgeSlide = useCallback(() => {
    const heMesh = heMeshRef.current;
    if (!heMesh) return;
    if (selectedEdges.size === 0) {
      setStatus("Select an edge first (Edge mode), then use G+G");
      return;
    }
    const edgeId = [...selectedEdges][0];
    const edge = heMesh.halfEdges.get(edgeId);
    if (!edge) return;
    slideRef.current = { active: true, edge, startAmount: 0 };
    setStatus("Edge slide active — move mouse left/right, click to confirm");
  }, [selectedEdges]);

  const onSlideMouse = useCallback(
    (e) => {
      if (!slideRef.current?.active) return;
      const dx = (e.movementX || 0) * 0.005;
      const newAmount = Math.max(
        -0.9,
        Math.min(0.9, slideRef.current.startAmount + dx)
      );
      slideRef.current.startAmount = newAmount;
      setSlideAmount(newAmount);
      const heMesh = heMeshRef.current;
      if (!heMesh) return;
      heMesh.slideEdge(slideRef.current.edge, newAmount);
      rebuildMeshGeometry();
    },
    [rebuildMeshGeometry]
  );

  const confirmEdgeSlide = useCallback(() => {
    if (!slideRef.current?.active) return;
    slideRef.current = { active: false };
    setStatus(`Edge slide applied — amount: ${slideAmount.toFixed(3)}`);
    setStats(heMeshRef.current?.stats() || stats);
  }, [slideAmount, stats]);

  // ── Loop cut ───────────────────────────────────────────────────────────────
  const applyLoopCut = useCallback(() => {
    const heMesh = heMeshRef.current;
    const mesh = meshRef.current;
    if (!heMesh || !mesh) {
      setStatus("Add a mesh first");
      return;
    }
    pushHistory();

    const yPos = (loopCutT - 0.5) * 1.8;
    const newVerts = heMesh.planeCut("y", yPos, loopCutT);

    if (!newVerts || newVerts.length === 0) {
      const xPos = (loopCutT - 0.5) * 1.8;
      const xVerts = heMesh.planeCut("x", xPos, loopCutT);
      if (!xVerts || xVerts.length === 0) {
        setStatus(
          "Loop cut: no edges cross that position — try adjusting t"
        );
        return;
      }
    }

    rebuildMeshGeometry();
    if (previewLineRef.current) {
      sceneRef.current?.remove(previewLineRef.current);
      previewLineRef.current = null;
    }
    const s = heMesh.stats();
    setStats(s);
    setStatus(
      `Loop cut — +${newVerts.length} verts · ${s.vertices} total · ${s.faces} faces`
    );
  }, [loopCutT, pushHistory, rebuildMeshGeometry]);

  // ── Import GLB ─────────────────────────────────────────────────────────────


  // ── Export GLB ─────────────────────────────────────────────────────────────
  const exportGLB = async () => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (exportUnlit && mesh.material) {
      mesh.traverse((m) => {
        if (m.isMesh && m.material) {
          m.material = new THREE.MeshBasicMaterial({
            color: m.material.color || 0x888888,
            map: m.material.map || null,
            vertexColors: m.material.vertexColors,
          });
        }
      });
    }
    if (shapeKeysRef.current.length > 1) {
      try {
        buildMorphTargets(mesh, shapeKeysRef.current);
      } catch (e) {
        console.warn(e);
      }
    }
    if (heMeshRef.current) {
      try {
        const triData = heMeshRef.current.toTriangulatedBufferGeometry();
        const triGeo = new THREE.BufferGeometry();
        triGeo.setAttribute(
          "position",
          new THREE.BufferAttribute(triData.positions, 3)
        );
        triGeo.setIndex(new THREE.BufferAttribute(triData.indices, 1));
        triGeo.computeVertexNormals();
        if (mesh.geometry.attributes.color) {
          triGeo.setAttribute(
            "color",
            mesh.geometry.attributes.color.clone()
          );
        }
        mesh.geometry.dispose();
        mesh.geometry = triGeo;
      } catch (e) {
        console.warn("Triangulate on export failed:", e);
      }
    }
    const { GLTFExporter } = await import(
      "three/examples/jsm/exporters/GLTFExporter.js"
    );
    new GLTFExporter().parse(
      mesh,
      (glb) => {
        const blob = new Blob([glb], { type: "model/gltf-binary" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "spx_mesh.glb";
        a.click();
        if (localStorage.getItem("jwt-token") || localStorage.getItem("token")) {
          sendMeshToStreamPireX(blob, "spx_mesh", { polycount: meshRef.current?.geometry?.attributes?.position?.count || 0 }, (s) => console.log("[SPX Bridge]", s)).catch(e => console.warn("[SPX Bridge]", e));
        }
        localStorage.setItem(
          "spx_mesh_export",
          JSON.stringify({
            timestamp: Date.now(),
            name: "spx_mesh.glb",
            polyCount: heMeshRef.current?.stats()?.faces || 0,
            objectCount: sceneObjects.length || 1,
          })
        );
        URL.revokeObjectURL(url);
      },
      (err) => console.error(err),
      { binary: true }
    );
  };

  // ── Toggle wireframe ───────────────────────────────────────────────────────
  const toggleWireframe = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const newWF = !wireframe;
    setWireframe(newWF);
    mesh.traverse((m) => {
      if (m.isMesh && m.material) m.material.wireframe = newWF;
    });
  }, [wireframe]);

  // ── Toggle edit mode ───────────────────────────────────────────────────────
  const toggleEditMode = useCallback(() => {
    setEditMode((m) => {
      const next = m === "object" ? "edit" : "object";
      const mesh = meshRef.current;
      if (next === "edit") {
        // Dim mesh so overlays stand out (Blender-style)
        if (mesh && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mm) => {
            if (!mm) return;
            if (mm.userData._spxOrigOpacity === undefined) mm.userData._spxOrigOpacity = mm.opacity ?? 1;
            if (mm.userData._spxOrigTransparent === undefined) mm.userData._spxOrigTransparent = mm.transparent;
            mm.transparent = true;
            mm.opacity = 0.55;
            mm.needsUpdate = true;
          });
        }
        setTimeout(() => buildVertexOverlay(), 50);
      } else {
        // Restore mesh opacity
        if (mesh && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mm) => {
            if (!mm) return;
            if (mm.userData._spxOrigOpacity !== undefined) {
              mm.opacity = mm.userData._spxOrigOpacity;
              mm.transparent = mm.userData._spxOrigTransparent;
              delete mm.userData._spxOrigOpacity;
              delete mm.userData._spxOrigTransparent;
              mm.needsUpdate = true;
            }
          });
        }
        clearOverlays();
      }
      return next;
    });
  }, [buildVertexOverlay]);

  // ── handleApplyFunction — master UI → engine dispatcher ───────────────────
  const handleApplyFunction = (fn, arg) => {

    // ── File ──────────────────────────────────────────────────────────────────
    if (fn === "exportSpxScene") { exportSpxScene(); return; }
    if (fn === "importSpxScene") {
      if (arg) { importSpxScene(arg); return; }
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json,.spx';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleApplyFunction("importSpxScene", file);
      };
      input.click();
      return;
    }
    if (fn === "exportGLB") { exportGLB(); return; }
    if (fn === "sendToStreamPireX") { exportGLB(); return; }
    if (fn === "importGLB") {
      if (arg) { importGLB(arg); return; }
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.glb,.gltf';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleApplyFunction("importGLB", file);
      };
      input.click();
      return;
    }
    if (fn === "importOBJ") {
      if (arg) {
        const fileName = arg.name;
        const label = fileName.replace(/\.[^.]+$/, "");
        const url = URL.createObjectURL(arg);
        setStatus(`Loading ${fileName}...`);
        import("three/examples/jsm/loaders/OBJLoader.js").then(({ OBJLoader }) => {
          new OBJLoader().load(
            url,
            (model) => {
              _addLoadedModelToScene(model, { label, type: "obj", fileName });
              URL.revokeObjectURL(url);
              setStatus(`✓ ${fileName} loaded`);
            },
            undefined,
            () => setStatus(`Could not load ${fileName}`),
          );
        }).catch(() => setStatus("OBJLoader unavailable"));
        return;
      }
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.obj';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleApplyFunction("importOBJ", file);
      };
      input.click();
      return;
    }
    if (fn === "importFBX") {
      if (arg) {
        const fileName = arg.name;
        const label = fileName.replace(/\.[^.]+$/, "");
        const url = URL.createObjectURL(arg);
        setStatus(`Loading ${fileName}...`);
        import("three/examples/jsm/loaders/FBXLoader.js").then(({ FBXLoader }) => {
          new FBXLoader().load(
            url,
            (model) => {
              _addLoadedModelToScene(model, { label, type: "fbx", fileName });
              URL.revokeObjectURL(url);
              const n = model.animations?.length || 0;
              setStatus(`✓ ${fileName} loaded${n ? ` (${n} clip${n > 1 ? "s" : ""})` : ""}`);
            },
            undefined,
            () => setStatus(`Could not load ${fileName}`),
          );
        }).catch(() => setStatus("FBXLoader unavailable"));
        return;
      }
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.fbx';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleApplyFunction("importFBX", file);
      };
      input.click();
      return;
    }
    if (fn === "exportOBJ") { if (typeof window.exportOBJ === "function") window.exportOBJ(sceneRef.current); return; }
    if (fn === "exportFBX") { if (typeof window.exportFBXToBackend === "function") window.exportFBXToBackend(sceneRef.current); return; }
    if (fn === "exportAlembic") { if (typeof window.exportAlembic === "function") window.exportAlembic(sceneRef.current); return; }
    if (fn === "exportUSD") { if (typeof window.exportUSD === "function") window.exportUSD(sceneRef.current); return; }
    if (fn === "exportToStreamPireX") { if (typeof window.exportToStreamPireX === "function") window.exportToStreamPireX(sceneRef.current); return; }
    if (fn === "takeSnapshot") { takeSnapshot(); return; }
    if (fn === "newScene") { sceneObjects.forEach(o => { if (o.mesh) sceneRef.current?.remove(o.mesh); }); setSceneObjects([]); setStatus("New scene"); return; }
    if (fn === "saveAs") { const name = prompt("Save project as:", `spx_project_${Date.now()}`); if (name) { const data = JSON.stringify({ version: "1.0", objects: sceneObjects.map(o => ({ name: o.name, type: o.userData?.type, position: o.mesh?.position.toArray(), rotation: o.mesh?.rotation.toArray(), scale: o.mesh?.scale.toArray() })) }, null, 2); const blob = new Blob([data], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name.endsWith(".json") ? name : name + ".json"; a.click(); setStatus(`Saved as ${a.download}`); } return; }

    // ── Edit ──────────────────────────────────────────────────────────────────
    if (fn === "undo") { undo(); return; }
    if (fn === "redo") { redo(); return; }
    if (fn === "togglePerformance") { setShowPerformancePanel(v => !v); return; }
    if (fn === "duplicateObject") { const o = getActiveObj(); if (o?.mesh) addPrimitive(o.userData?.type || "box"); return; }
    if (fn === "deleteSelected") { if (activeObjId) deleteSceneObject(activeObjId); return; }
    if (fn === "selectAll") { setStatus("Select All — A"); return; }
    if (fn === "deselectAll") { setSelectedVerts(new Set()); setSelectedEdges(new Set()); setSelectedFaces(new Set()); setStatus("Deselected all"); return; }
    if (fn === "toggleWireframe") { toggleWireframe(); return; }
    if (fn === "toggleXRay") { window.SPX?.toggleViewport("xray"); return; }
    if (fn === "toggleGrid") { window.SPX?.toggleViewport("grid"); return; }
    if (fn === "toggleNPanel") { setShowNPanel(v => !v); return; }
    if (fn === "runBenchmark") { window.runBenchmark?.(); return; }
    if (fn === "openUVEditor") { setShowUVEditor(true); return; }
    if (fn === "openMatEditor") { setShowMatEditor(true); return; }
    if (fn === "showNLA") { setShowNLA(v => !v); return; }

    // ── Primitives ────────────────────────────────────────────────────────────
    if (fn.startsWith("prim_")) { addPrimitive(fn.replace("prim_", "")); return; }

    // ── Edit tools ────────────────────────────────────────────────────────────
    if (fn === "toggle_edit") { toggleEditMode(); return; }
    if (fn === "select") { setActiveTool("select"); setStatus("Select mode"); return; }
    if (fn === "grab") { setActiveTool("grab"); if (editModeRef.current !== "edit") { toggleEditMode(); } setStatus("Grab — G"); return; }
    if (fn === "rotate") { setActiveTool("rotate"); if (editModeRef.current !== "edit") { toggleEditMode(); } setStatus("Rotate — R"); return; }
    if (fn === "scale") { setActiveTool("scale"); if (editModeRef.current !== "edit") { toggleEditMode(); } setStatus("Scale — S"); return; }
    if (fn === "extrude") { if (editModeRef.current !== "edit") { toggleEditMode(); } setActiveTool("extrude"); setStatus("Extrude — E"); return; }
    if (fn === "loop_cut") { if (editModeRef.current !== "edit") { toggleEditMode(); } setActiveTool("loop_cut"); applyLoopCut(); return; }
    if (fn === "knife") { if (editModeRef.current !== "edit") { toggleEditMode(); } setActiveTool("knife"); setStatus("Knife — K"); return; }
    if (fn === "edge_slide") { if (editModeRef.current !== "edit") { toggleEditMode(); } startEdgeSlide(); return; }
    if (fn === "bevel") { if (editModeRef.current !== "edit") { toggleEditMode(); } if (heMeshRef.current) { pushHistory(); heMeshRef.current.bevelEdges(0.1); rebuildMeshGeometry(); setStatus("Bevel applied"); } return; }
    if (fn === "inset") { if (editModeRef.current !== "edit") { toggleEditMode(); } if (heMeshRef.current && selectedFaces.size > 0) { pushHistory(); heMeshRef.current.insetFaces([...selectedFaces], 0.1); rebuildMeshGeometry(); setStatus("Inset applied"); } return; }
    if (fn === "grab") {
      if (proportionalEnabled && heMeshRef.current && selectedVerts.size > 0) {
        // Proportional grab — will be applied on mouse move via delta
        window._proportionalActive = true;
        window._proportionalRadius = proportionalRadius;
        window._proportionalFalloff = proportionalFalloff;
        setStatus(`Proportional Grab — radius: ${proportionalRadius.toFixed(1)}`);
        return;
      }
    }



    if (fn === "sss_skin") {
      if (meshRef.current) {
        try {
          const sssMat = createSSSMaterial("skin");
          meshRef.current.material = sssMat;
          if (meshRef.current.material) meshRef.current.material.needsUpdate = true;
          setStatus("SSS skin material applied");
        } catch (e) {
          setStatus("SSS skin failed: " + e.message);
        }
      }
      return;
    }
    if (fn === "bake_normals") {
      if (!meshRef.current || !sceneRef.current || !rendererRef.current) return;
      const mesh = meshRef.current;
      const size = 1024;
      const renderTarget = new THREE.WebGLRenderTarget(size, size);
      const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 100);
      const normalMat = new THREE.MeshNormalMaterial();
      const origMat = mesh.material;
      mesh.material = normalMat;
      rendererRef.current.setRenderTarget(renderTarget);
      rendererRef.current.render(sceneRef.current, bakeCam);
      rendererRef.current.setRenderTarget(null);
      mesh.material = origMat;
      // Read pixels and download
      const pixels = new Uint8Array(size * size * 4);
      rendererRef.current.readRenderTargetPixels(renderTarget, 0, 0, size, size, pixels);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(size, size);
      imgData.data.set(pixels);
      ctx.putImageData(imgData, 0, 0);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'spx_normal_bake.png';
      a.click();
      renderTarget.dispose();
      setStatus("Normal map baked — downloading");
      return;
    }
    if (fn === "bake_ao") {
      setStatus("AO bake — uses IrradianceBaker.js (select mesh first)");
      return;
    }
    if (fn === "batch_export") {
      if (sceneRef.current) {
        const meshes = [];
        sceneRef.current.traverse(obj => { if (obj.isMesh) meshes.push(obj); });
        if (meshes.length === 0) { setStatus("No meshes to export"); return; }
        import('three/examples/jsm/exporters/GLTFExporter.js').then(({ GLTFExporter }) => {
          const exporter = new GLTFExporter();
          let exported = 0;
          meshes.forEach((mesh, i) => {
            const sc = new THREE.Scene();
            sc.add(mesh.clone());
            exporter.parse(sc, (glb) => {
              const blob = new Blob([glb], { type: 'model/gltf-binary' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = (mesh.name || 'mesh_' + i) + '.glb';
              a.click(); URL.revokeObjectURL(url);
              exported++;
            }, (err) => console.error(err), { binary: true });
          });
          setStatus('Batch export — ' + meshes.length + ' meshes');
        });
      }
      return;
    }

    // ── Desktop file system (Electron only) ────────────────────────────────
    if (fn === "desktop_open_file") {
      if (window.electronAPI) {
        window.electronAPI.openFile([{ name: '3D Models', extensions: ['glb', 'gltf', 'fbx', 'obj'] }])
          .then(path => {
            if (!path) return;
            window.electronAPI.readFile(path).then(buf => {
              const blob = new Blob([buf]);
              const url = URL.createObjectURL(blob);
              if (typeof loadGLBFromURL === 'function') loadGLBFromURL(url);
              setStatus('Opened: ' + path.split('/').pop());
            });
          });
      } else {
        setStatus('Desktop file open requires Electron app');
      }
      return;
    }
    if (fn === "desktop_save_file") {
      if (window.electronAPI && meshRef.current) {
        (async () => {
          const path = await window.electronAPI.saveFile('untitled.glb');
          if (path) setStatus('Saved to: ' + path.split('/').pop());
        })();
      }
      return;
    }
    if (fn === "desktop_open_hdri") {
      if (window.electronAPI) {
        (async () => {
          const path = await window.electronAPI.openFile([
            { name: 'HDRI', extensions: ['hdr', 'exr'] }
          ]);
          if (path && sceneRef.current && window.THREE) {
            const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js');
            const loader = new RGBELoader();
            const buf = await window.electronAPI.readFile(path);
            const blob = new Blob([buf], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            loader.load(url, (texture) => {
              texture.mapping = window.THREE.EquirectangularReflectionMapping;
              sceneRef.current.environment = texture;
              sceneRef.current.background = texture;
              setStatus('HDRI loaded: ' + path.split('/').pop());
            });
          }
        })();
      }
      return;
    }
    if (fn === "hdri_from_file") {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.hdr,.exr';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file || !sceneRef.current || !rendererRef.current) return;
        const url = URL.createObjectURL(file);
        const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js');
        const { PMREMGenerator } = await import('three');
        const loader = new RGBELoader();
        loader.load(url, (texture) => {
          const pmrem = new PMREMGenerator(rendererRef.current);
          const envMap = pmrem.fromEquirectangular(texture).texture;
          sceneRef.current.environment = envMap;
          sceneRef.current.background = envMap;
          texture.dispose(); pmrem.dispose();
          URL.revokeObjectURL(url);
          setStatus(`HDRI loaded: ${file.name}`);
        });
      };
      input.click();
      return;
    }
    if (fn === "graph_editor") {
      setStatus("Graph editor — use Animation workspace → F-Curve panel");
      return;
    }
    if (fn === "particle_emit") {
      if (sceneRef.current && meshRef.current) {
        const pos = meshRef.current.position;
        if (typeof window.burstEmit === "function") {
          window.burstEmit(null, pos, 200);
          setStatus("Particle burst emitted");
        } else {
          setStatus("Particle system not initialized — add a mesh first");
        }
      }
      return;
    }
    if (fn === "particle_fire") { if (typeof window.createEmitter === "function" && window.VFX_PRESETS) { window.createEmitter(window.VFX_PRESETS.fire); setStatus("Fire emitter"); } return; }
    if (fn === "particle_smoke") { if (typeof window.createEmitter === "function" && window.VFX_PRESETS) { window.createEmitter(window.VFX_PRESETS.smoke); setStatus("Smoke emitter"); } return; }
    if (fn === "particle_sparks") { if (typeof window.createEmitter === "function" && window.VFX_PRESETS) { window.createEmitter(window.VFX_PRESETS.sparks); setStatus("Sparks emitter"); } return; }
    if (fn === "modifier_add") {
      import("./mesh/ModifierStack.js").then(({ addModifier, applyModifierStack }) => {
        if (!meshRef.current) return;
        if (!window._modStack) window._modStack = [];
        const mod = addModifier(window._modStack, "subdivide", { levels: 1 });
        const newGeo = applyModifierStack(meshRef.current.geometry, window._modStack);
        if (newGeo && meshRef.current.isMesh) {
          meshRef.current.geometry.dispose();
          meshRef.current.geometry = newGeo;
          heMeshRef.current = null; // force rebuild on next edit
          setStatus("Subdivide modifier applied");
        }
      });
      return;
    }
    if (fn === "modifier_apply_all") {
      if (window._modStack?.length) {
        import("./mesh/ModifierStack.js").then(({ applyModifierStack }) => {
          const newGeo = applyModifierStack(meshRef.current?.geometry, window._modStack);
          if (newGeo && meshRef.current?.isMesh) {
            meshRef.current.geometry.dispose();
            meshRef.current.geometry = newGeo;
            window._modStack = [];
            setStatus("All modifiers applied");
          }
        });
      }
      return;
    }
    if (fn === "apic_fluid_start") {
      import("./mesh/WebGPURenderer.js").then(async ({ WebGPURenderer }) => {
        const gpu = new WebGPURenderer();
        await gpu.init();
        if (gpu.fallback) {
          setStatus("WebGPU not available — using CPU FLIP instead");
          return;
        }
        const N = 10000, G = 32;
        const pipeline = await gpu.createAPICFluidPipeline(N, G);
        if (!pipeline) { setStatus("APIC pipeline failed"); return; }
        // Create GPU buffers
        const particleData = new Float32Array(N * 20); // pos(4)+vel(4)+C(9)+pad(3)
        for (let i = 0; i < N; i++) {
          const base = i * 20;
          particleData[base] = 0.2 + Math.random() * 0.6;
          particleData[base + 1] = 0.4 + Math.random() * 0.5;
          particleData[base + 2] = 0.2 + Math.random() * 0.6;
          particleData[base + 3] = 1.0; // mass
          particleData[base + 7] = 0.0; // phase=alive
        }
        const particleBuf = gpu.device.createBuffer({
          size: particleData.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        gpu.device.queue.writeBuffer(particleBuf, 0, particleData);
        const gridBuf = gpu.device.createBuffer({
          size: G * G * G * 32,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        window._apicGPU = gpu;
        window._apicPipeline = pipeline;
        window._apicParticleBuf = particleBuf;
        window._apicGridBuf = gridBuf;
        let frame = 0;
        const sim = setInterval(async () => {
          await gpu.stepAPICFluid(pipeline, particleBuf, gridBuf, 1 / 60, 0.05);
          if (++frame > 600) clearInterval(sim);
        }, 16);
        window._apicSim = sim;
        setStatus("APIC GPU fluid running (" + N + " particles, WebGPU compute)");
      });
      return;
    }
    if (fn === "apic_fluid_stop") {
      if (window._apicSim) { clearInterval(window._apicSim); window._apicSim = null; }
      setStatus("APIC fluid stopped");
      return;
    }
    if (fn === "fluid_film_start") {
      import("./mesh/FLIPFluidSolver.js").then(({ FLIPFluidSolver, stepFilmFluid }) => {
        const solver = new FLIPFluidSolver({
          cellSize: 0.08, maxParticles: 3000, foam: true,
          bounds: { min: { x: -1.5, y: -1.5, z: -1.5 }, max: { x: 1.5, y: 1.5, z: 1.5 } }
        });
        // Add initial particles in a box
        for (let i = 0; i < 2000; i++) {
          solver.particles.push({
            alive: true, phase: 0,
            position: { x: (Math.random() - 0.5) * 2, y: Math.random() * 1.5 - 0.5, z: (Math.random() - 0.5) * 2 },
            velocity: { x: 0, y: 0, z: 0 },
          });
        }
        window._filmFluidSolver = solver;
        let frame = 0;
        const sim = setInterval(() => {
          stepFilmFluid(solver, sceneRef.current, fluidMeshRef, foamRef, {
            resolution: 28, radius: 0.25, isolevel: 0.45, rebuildEvery: 4,
          });
          if (++frame > 400) clearInterval(sim);
        }, 16);
        window._filmFluidSim = sim;
        setStatus("Film fluid simulation running (surface reconstruction + foam)");
      });
      return;
    }
    if (fn === "fluid_film_stop") {
      if (window._filmFluidSim) { clearInterval(window._filmFluidSim); window._filmFluidSim = null; }
      setStatus("Film fluid stopped");
      return;
    }
    if (fn === "fluid_apply_water_mat") {
      if (meshRef.current) {
        import("./mesh/FLIPFluidSolver.js").then(({ createFilmWaterMaterial }) => {
          meshRef.current.material = createFilmWaterMaterial({ transmission: 0.95, ior: 1.333 });
          setStatus("Film water material applied");
        });
      }
      return;
    }
    if (fn === "fluid_sim_start") {
      import("./mesh/FLIPFluidSolver.js").then(({ FLIPFluidSolver }) => {
        const solver = new FLIPFluidSolver({ gridSize: 32, particleCount: 1000 });
        let frame = 0;
        const sim = setInterval(() => {
          solver.step(1 / 60);
          if (++frame > 200) clearInterval(sim);
        }, 16);
        window._fluidSim = sim;
        window._fluidSolver = solver;
        setStatus("FLIP fluid simulation running");
      });
      return;
    }
    if (fn === "fluid_sim_stop") {
      if (window._fluidSim) { clearInterval(window._fluidSim); window._fluidSim = null; }
      setStatus("Fluid simulation stopped");
      return;
    }
    if (fn === "cloth_sim_start") {
      if (meshRef.current) {
        import("./mesh/ClothSystem.js").then(({ createCloth, stepCloth, applyClothToMesh, pinTopRow }) => {
          const cloth = createCloth(meshRef.current, { segments: 10, stiffness: 0.8 });
          pinTopRow(cloth, meshRef.current);
          let frame = 0;
          const sim = setInterval(() => {
            stepCloth(cloth, 1 / 60);
            applyClothToMesh(cloth);
            if (meshRef.current?.geometry) meshRef.current.geometry.attributes.position.needsUpdate = true;
            if (++frame > 300) clearInterval(sim);
          }, 16);
          window._clothSim = sim;
          setStatus("Cloth simulation running — 300 frames");
        });
      }
      return;
    }
    if (fn === "cloth_sim_stop") {
      if (window._clothSim) { clearInterval(window._clothSim); window._clothSim = null; }
      setStatus("Cloth simulation stopped");
      return;
    }
    if (fn === "smart_uv") {
      if (heMeshRef.current) {
        import("./mesh/uv/UVUnwrap.js").then(({ smartUnwrap, getSeams }) => {
          const uvs = smartUnwrap(heMeshRef.current, getSeams ? getSeams() : []);
          setStatus("Smart UV unwrap — " + uvs.size + " vertices mapped");
        });
      }
      return;
    }
    if (fn === "mark_seam") { const sel = [...selectedEdges]; sel.forEach(id => toggleSeam(id)); setStatus(`Seam toggled on ${sel.length} edges`); return; }
    if (fn === "clear_seams") { clearAllSeams(); setStatus("All seams cleared"); return; }
    if (fn === "pack_islands") { setStatus("Pack islands — select UV editor"); return; }
    if (fn === "live_unwrap") { if (heMeshRef.current && cameraRef.current) { const uvs = liveUnwrap(heMeshRef.current, cameraRef.current); setStatus(`Live unwrap — ${uvs?.size || 0} vertices`); } return; }
    if (fn === "proportional_toggle") { setProportionalEnabled(v => !v); setStatus(proportionalEnabled ? "Proportional off" : "Proportional on (O)"); return; }
    if (fn === "proportional_radius_up") { setProportionalRadius(r => Math.min(10, r + 0.2)); return; }
    if (fn === "proportional_radius_down") { setProportionalRadius(r => Math.max(0.1, r - 0.2)); return; }
    if (fn === "snap_toggle") { setSnapEnabled(v => !v); setStatus(snapEnabled ? "Snap off" : "Snap on"); return; }
    if (fn === "grid_fill") { if (heMeshRef.current) { const sel = [...selectedVerts]; const faces = heMeshRef.current.gridFill(sel); if (faces) { rebuildMeshGeometry(); setStatus(`Grid fill — ${faces.length} faces`); } } return; }
    if (fn === "target_weld") { if (heMeshRef.current) { const sel = [...selectedVerts]; if (sel.length >= 2) { heMeshRef.current.targetWeld(sel[0], sel[1]); rebuildMeshGeometry(); setStatus("Target Weld applied"); } } return; }
    if (fn === "chamfer_vertex") { if (heMeshRef.current) { const sel = [...selectedVerts]; sel.forEach(id => heMeshRef.current.chamferVertex(id, 0.1)); rebuildMeshGeometry(); setStatus("Chamfer applied"); } return; }
    if (fn === "average_vertex") { if (heMeshRef.current) { const sel = [...selectedVerts]; heMeshRef.current.averageVertices(sel, 0.5, 2); rebuildMeshGeometry(); setStatus("Vertices averaged"); } return; }
    if (fn === "circularize") { if (heMeshRef.current) { const sel = [...selectedVerts]; heMeshRef.current.circularize(sel); rebuildMeshGeometry(); setStatus("Circularize applied"); } return; }
    if (fn === "reorder_verts") { if (heMeshRef.current) { const n = heMeshRef.current.reorderVertices(); setStatus(`Reordered ${n} vertices`); } return; }
    if (fn === "connect_comps") { if (heMeshRef.current) { const sel = [...selectedVerts]; if (sel.length >= 2) { heMeshRef.current.connectComponents(sel[0], sel[1]); rebuildMeshGeometry(); setStatus("Components connected"); } } return; }
    if (fn === "_extrude_legacy") { setActiveTool("extrude"); setStatus("Extrude — select faces first"); return; }



    if (fn === "_bevel_legacy") { setStatus("Bevel — Ctrl+B in viewport"); return; }
    if (fn === "_inset_legacy") { setStatus("Inset — I in viewport"); return; }
    if (fn === "gizmo_move" || fn === "gizmo_rotate" || fn === "gizmo_scale") {
      const newMode = fn.replace("gizmo_", "");

      // Toggle OFF: clicking already-active tool detaches gizmo, back to select
      console.log("[TOGGLE-OFF CHECK]", "activeTool=", activeTool, "fn=", fn, "match=", activeTool === fn);
      if (activeTool === fn) {
        setActiveTool("select");
        setGizmoMode("select");
        if (gizmoRef.current) gizmoRef.current.detach();
        setStatus("Select mode");
        return;
      }

      setGizmoMode(newMode);
      setActiveTool(fn);
      if (gizmoRef.current) {
        // Force rebuild even if mode matches (handles edge cases)
        gizmoRef.current.mode = "_pending_";
        gizmoRef.current.setMode(newMode);
        const activeMesh = meshRef.current;
        if (activeMesh) {
          gizmoRef.current.attach(activeMesh);
          console.log("[SPX gizmo]", newMode, "attached to", activeMesh.name || activeMesh.type, "scale:", gizmoRef.current.group.scale.toArray());
        } else {
          gizmoRef.current.detach();
          setStatus(`Gizmo: ${newMode} armed — click an object to transform`);
          return;
        }
      }
      setStatus("Gizmo: " + newMode.charAt(0).toUpperCase() + newMode.slice(1));
      return;
    }

    // ── Select mode ───────────────────────────────────────────────────────────
    if (fn === "selectMode_vert") { setSelectMode("vert"); buildVertexOverlay(); setStatus("Vertex select"); return; }
    if (fn === "selectMode_edge") { setSelectMode("edge"); buildEdgeOverlay(); setStatus("Edge select"); return; }
    if (fn === "selectMode_face") { setSelectMode("face"); setTimeout(() => buildFaceOverlay(), 50); setStatus("Face select"); return; }

    // ── Boolean ───────────────────────────────────────────────────────────────
    if (fn === "bool_union") { if (meshRef.current && meshBRef.current) { const r = booleanUnion(meshRef.current, meshBRef.current); sceneRef.current?.add(r); setStatus("Boolean Union applied"); } else setStatus("Need 2 meshes"); return; }
    if (fn === "bool_subtract") { if (meshRef.current && meshBRef.current) { const r = booleanSubtract(meshRef.current, meshBRef.current); sceneRef.current?.add(r); setStatus("Boolean Subtract applied"); } else setStatus("Need 2 meshes"); return; }
    if (fn === "bool_intersect") { if (meshRef.current && meshBRef.current) { const r = booleanIntersect(meshRef.current, meshBRef.current); sceneRef.current?.add(r); setStatus("Boolean Intersect applied"); } else setStatus("Need 2 meshes"); return; }

    // ── Mesh repair ───────────────────────────────────────────────────────────
    if (fn === "fix_normals") { if (meshRef.current) { fixNormals(meshRef.current); rebuildMeshGeometry(); setStatus("Normals fixed"); } return; }
    if (fn === "rm_doubles") { if (typeof window.removeDoubles === "function" && meshRef.current) { window.removeDoubles(meshRef.current); rebuildMeshGeometry(); setStatus("Doubles merged"); } return; }
    if (fn === "fill_holes") { if (typeof window.fillHoles === "function" && meshRef.current) { window.fillHoles(meshRef.current); rebuildMeshGeometry(); setStatus("Holes filled"); } return; }
    if (fn === "rm_degenerate") { if (typeof window.removeDegenerates === "function" && meshRef.current) { window.removeDegenerates(meshRef.current); setStatus("Degens removed"); } return; }
    if (fn === "full_repair") { if (typeof window.fullRepair === "function" && meshRef.current) { window.fullRepair(meshRef.current); rebuildMeshGeometry(); setStatus("Full repair complete"); } return; }

    // ── Remesh ────────────────────────────────────────────────────────────────
    if (fn === "voxel_remesh") { if (typeof window.voxelRemesh === "function" && meshRef.current) { const m = window.voxelRemesh(meshRef.current, remeshVoxel); if (m) sceneRef.current?.add(m); setStatus("Voxel remesh done"); } return; }

    if (fn === "apply_checker") {
      if (meshRef.current) {
        window.applyCheckerToMesh?.(meshRef.current);
        setStatus?.("Checker texture applied");
      }
      return;
    }
    if (fn === "box_unwrap") {
      const geom = meshRef.current?.geometry;
      if (geom) {
        window.unwrapBoxProjection?.(geom);
        geom.attributes.uv && (geom.attributes.uv.needsUpdate = true);
        setStatus?.("Box unwrap applied");
      }
      return;
    }
    if (fn === "export_uv_glb") {
      if (meshRef.current) {
        window.exportUVLayoutGLB?.(meshRef.current).then((data) => {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "uv-layout-export.gltf";
          a.click();
          URL.revokeObjectURL(a.href);
          setStatus?.("UV GLTF exported");
        });
      }
      return;
    }
    if (fn === "quad_remesh") { if (typeof window.quadRemesh === "function" && meshRef.current) { window.quadRemesh(meshRef.current); setStatus("Quad remesh done"); } return; }
    if (fn === "auto_retopo") { if (typeof window.quadDominantRetopo === "function" && meshRef.current) { const r = window.quadDominantRetopo(meshRef.current, createRetopoSettings()); setRetopoResult(r); setStatus("Retopo done"); } return; }
    if (fn === "marching_cubes") { if (typeof window.marchingCubesRemesh === "function" && meshRef.current) { window.marchingCubesRemesh(meshRef.current, mcResolution, mcIsolevel); setStatus("Marching cubes done"); } return; }

    // ── UV ────────────────────────────────────────────────────────────────────
    if (fn === "uv_box") { if (heMeshRef.current) { uvBoxProject(heMeshRef.current); setStatus("Box UV applied"); } return; }
    if (fn === "uv_sphere") { if (heMeshRef.current) { uvSphereProject(heMeshRef.current); setStatus("Sphere UV applied"); } return; }
    if (fn === "uv_planar") { if (heMeshRef.current) { uvPlanarProject(heMeshRef.current); setStatus("Planar UV applied"); } return; }
    if (fn === "udim_layout") { if (typeof window.createUDIMLayout === "function") { window.createUDIMLayout(4); setStatus("UDIM layout created"); } return; }

    // ── Bake ──────────────────────────────────────────────────────────────────
    if (fn === "bake_ao") { if (meshRef.current) { bakeAO(meshRef.current); setStatus("AO baked"); } return; }
    if (fn === "bake_normal") { if (typeof window.bakeNormalMap === "function" && meshRef.current) { window.bakeNormalMap(meshRef.current); setStatus("Normal map baked"); } return; }
    if (fn === "bake_curvature") { if (typeof window.bakeCurvature === "function" && meshRef.current) { window.bakeCurvature(meshRef.current); setStatus("Curvature baked"); } return; }
    if (fn === "bake_all") { if (typeof window.bakeAllMaps === "function" && meshRef.current) { window.bakeAllMaps(meshRef.current); setStatus("All maps baked"); } return; }

    // ── Materials ─────────────────────────────────────────────────────────────
    if (fn === "mat_pbr") { if (typeof window.createPBRMaterial === "function" && meshRef.current) { meshRef.current.material = window.createPBRMaterial(); setStatus("PBR applied"); } return; }
    if (fn === "mat_sss") { if (typeof window.createSSSMaterial === "function" && meshRef.current) { meshRef.current.material = window.createSSSMaterial(sssPreset); setStatus("SSS applied"); } return; }
    if (fn === "skin_film_quality") {
      if (meshRef.current) {
        setStatus("Applying film-quality Jimenez SSS skin...");
        setTimeout(async () => {
          // 1. Generate 4K textures
          const textures = generateFilmQualitySkinTextures({ size: 2048, tone: skinTone, region: skinRegion, age: skinAge, oiliness: skinOiliness });
          // 2. Generate multi-res normal map
          const multiNorm = generateMultiResNormals({ size: 2048, tone: skinTone, age: skinAge });
          // 3. Apply Jimenez SSS shader
          applyJimenezSkin(meshRef.current, { tone: skinTone, roughness: 0.7, clearcoat: skinOiliness * 2, sssStrength: 0.55 });
          // 4. Set texture uniforms on shader material
          if (meshRef.current.material?.uniforms && window.THREE) {
            meshRef.current.material.uniforms.tColor.value = new window.THREE.CanvasTexture(textures.color);
            meshRef.current.material.uniforms.tRoughness.value = new window.THREE.CanvasTexture(textures.roughness);
            meshRef.current.material.uniforms.tNormal.value = new window.THREE.CanvasTexture(multiNorm);
          }
          // 5. Init LTC area lights
          await initLTCAreaLights(rendererRef.current);
          // 6. Wire SSAO
          if (rendererRef.current?._composer) {
            await wireSSAOToComposer(rendererRef.current, sceneRef.current, cameraRef.current, rendererRef.current._composer);
          }
          // 7. Setup 3-point skin lighting
          await setupSkinLighting(sceneRef.current, rendererRef.current);
          setStatus(`✓ Film-quality skin applied (Jimenez SSS + ${skinTone} tone + SSAO + LTC lights + 2K textures)`);
        }, 50);
      }
      return;
    }
    if (fn === "skin_multires_normal") {
      if (meshRef.current && window.THREE) {
        setStatus("Generating multi-resolution normal map (2K)...");
        setTimeout(() => {
          const normCanvas = generateMultiResNormals({ size: 2048, tone: skinTone, age: skinAge });
          if (meshRef.current.material) {
            const tex = new window.THREE.CanvasTexture(normCanvas);
            if (meshRef.current.material.uniforms?.tNormal) {
              meshRef.current.material.uniforms.tNormal.value = tex;
            } else {
              meshRef.current.material.normalMap = tex;
              meshRef.current.material.needsUpdate = true;
            }
          }
          const a = document.createElement('a'); a.href = normCanvas.toDataURL('image/png');
          a.download = `spx_multires_normal_${skinTone}_age${skinAge}.png`; a.click();
          setStatus("Multi-res normal map applied + downloaded (macro+meso+micro)");
        }, 50);
      }
      return;
    }
    if (fn === "skin_4k_textures") {
      if (meshRef.current) {
        setStatus("Generating 4K skin textures (slow ~3s)...");
        setTimeout(() => {
          const textures = generateFilmQualitySkinTextures({ size: 4096, tone: skinTone, region: skinRegion, age: skinAge });
          applyFullSkinTextures(meshRef.current, textures);
          ['color', 'roughness', 'normal', 'ao'].forEach(k => {
            const a = document.createElement('a'); a.href = textures[k].toDataURL('image/png');
            a.download = `spx_4k_skin_${k}_${skinTone}.png`; a.click();
          });
          setStatus("✓ 4K skin textures applied + downloaded");
        }, 100);
      }
      return;
    }
    if (fn === "wire_ssao") {
      if (rendererRef.current?._composer) {
        wireSSAOToComposer(rendererRef.current, sceneRef.current, cameraRef.current, rendererRef.current._composer)
          .then(pass => setStatus(pass ? "✓ SSAO wired to render pipeline" : "SSAO wire failed"));
      } else {
        setStatus("No EffectComposer found — renderer may not be initialized");
      }
      return;
    }
    if (fn === "init_ltc_lights") {
      initLTCAreaLights(rendererRef.current).then(ok => setStatus(ok ? "✓ LTC area lights initialized" : "LTC init failed"));
      return;
    }
    if (fn === "skin_apply") { if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: skinTone, region: skinRegion, oiliness: skinOiliness }); setStatus(`Skin: ${skinTone} / ${skinRegion}`); } return; }
    if (fn === "skin_gen_textures") {
      if (meshRef.current && window.THREE) {
        setStatus("Generating skin textures (1024px)...");
        setTimeout(() => {
          const textures = generateFullSkinTextures({ size: 1024, tone: skinTone, region: skinRegion, age: skinAge, oiliness: skinOiliness });
          applyFullSkinTextures(meshRef.current, textures);
          applyRealisticSkin(meshRef.current, { tone: skinTone, region: skinRegion, oiliness: skinOiliness });
          // Download all maps
          ['color', 'roughness', 'normal', 'ao'].forEach(k => {
            const a = document.createElement('a');
            a.href = textures[k].toDataURL('image/png');
            a.download = `spx_skin_${k}_${skinTone}.png`;
            a.click();
          });
          setStatus(`✓ Skin textures applied + downloaded (${skinTone}, age ${skinAge})`);
        }, 100);
      }
      return;
    }
    if (fn === "skin_lip") { if (meshRef.current) { applyLipMaterial(meshRef.current, { color: lipColor, tone: skinTone }); setStatus("Lip material applied"); } return; }
    if (fn === "skin_eye") { if (meshRef.current) { applyEyeMaterial(meshRef.current, { irisColor: eyeColor }); setStatus("Eye material applied"); } return; }
    if (fn === "skin_lighting") { if (sceneRef.current && rendererRef.current) { setupSkinLighting(sceneRef.current, rendererRef.current).then(() => setStatus("3-point skin lighting set up (key+fill+rim)")); } return; }
    if (fn === "skin_tone_porcelain") { setSkinTone("porcelain"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "porcelain", region: skinRegion }); } setStatus("Skin tone: porcelain"); return; }
    if (fn === "skin_tone_fair") { setSkinTone("fair"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "fair", region: skinRegion }); } setStatus("Skin tone: fair"); return; }
    if (fn === "skin_tone_light") { setSkinTone("light"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "light", region: skinRegion }); } setStatus("Skin tone: light"); return; }
    if (fn === "skin_tone_medium") { setSkinTone("medium"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "medium", region: skinRegion }); } setStatus("Skin tone: medium"); return; }
    if (fn === "skin_tone_olive") { setSkinTone("olive"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "olive", region: skinRegion }); } setStatus("Skin tone: olive"); return; }
    if (fn === "skin_tone_tan") { setSkinTone("tan"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "tan", region: skinRegion }); } setStatus("Skin tone: tan"); return; }
    if (fn === "skin_tone_brown") { setSkinTone("brown"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "brown", region: skinRegion }); } setStatus("Skin tone: brown"); return; }
    if (fn === "skin_tone_deep_brown") { setSkinTone("deep_brown"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "deep_brown", region: skinRegion }); } setStatus("Skin tone: deep_brown"); return; }
    if (fn === "skin_tone_dark") { setSkinTone("dark"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "dark", region: skinRegion }); } setStatus("Skin tone: dark"); return; }
    if (fn === "skin_tone_ebony") { setSkinTone("ebony"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "ebony", region: skinRegion }); } setStatus("Skin tone: ebony"); return; }
    if (fn === "skin_tone_albino") { setSkinTone("albino"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "albino", region: skinRegion }); } setStatus("Skin tone: albino"); return; }
    if (fn === "skin_tone_aged") { setSkinTone("aged"); if (meshRef.current) { applyRealisticSkin(meshRef.current, { tone: "aged", region: skinRegion }); } setStatus("Skin tone: aged"); return; }
    if (fn === "displace_perlin") { if (meshRef.current) { applyDisplacementMap(meshRef.current, { noiseType: 'perlin', noiseAmplitude: displacementScale, noiseScale: 4 }); setStatus("Perlin displacement applied"); } return; }
    if (fn === "displace_voronoi") { if (meshRef.current) { applyDisplacementMap(meshRef.current, { noiseType: 'voronoi', noiseAmplitude: displacementScale, noiseScale: 4 }); setStatus("Voronoi displacement applied"); } return; }
    if (fn === "displace_cellular") { if (meshRef.current) { applyDisplacementMap(meshRef.current, { noiseType: 'cellular', noiseAmplitude: displacementScale, noiseScale: 4 }); setStatus("Cellular displacement applied"); } return; }
    if (fn === "mat_clearcoat") { if (meshRef.current) { applyClearcoatMaterial(meshRef.current, { clearcoat: clearcoatVal, clearcoatRoughness: clearcoatRoughVal }); setStatus("Clearcoat applied"); } return; }
    if (fn === "mat_wet_clearcoat") { if (meshRef.current) { applyClearcoatMaterial(meshRef.current, { clearcoat: 1.0, clearcoatRoughness: 0.0, wetness: true }); setStatus("Wet clearcoat applied"); } return; }
    if (fn === "mat_anisotropy") { if (meshRef.current) { applyAnisotropyMaterial(meshRef.current, { anisotropy: anisotropyVal }); setStatus("Anisotropy material applied"); } return; }
    if (fn === "mat_sss_skin") { if (meshRef.current) { applySkinSSS(meshRef.current, { subsurface: 0.4 }); setStatus("SSS skin applied"); } return; }
    if (fn === "mat_sss_wax") { if (meshRef.current) { applySkinSSS(meshRef.current, { color: "#ffe4b5", subsurface: 0.8, roughness: 0.3 }); setStatus("SSS wax applied"); } return; }
    if (fn === "add_area_light") { if (sceneRef.current) { const al = addAreaLight(sceneRef.current, { position: [0, 3, 2], intensity: 3.0 }); if (al) setStatus("Area light added"); } return; }
    if (fn === "gen_skin_tex") {
      const canvas = generateProceduralSkinTexture({ size: 1024 });
      if (meshRef.current?.material && window.THREE) {
        const tex = new window.THREE.CanvasTexture(canvas);
        meshRef.current.material.map = tex;
        meshRef.current.material.needsUpdate = true;
        setStatus("Procedural skin texture applied (1024px)");
      }
      const a = document.createElement('a'); a.href = canvas.toDataURL('image/png');
      a.download = 'spx_skin_texture.png'; a.click();
      return;
    }
    if (fn === "gen_scale_tex") {
      const canvas = generateScaleTexture({ size: 1024, scaleSize: 20 });
      if (meshRef.current?.material && window.THREE) {
        const tex = new window.THREE.CanvasTexture(canvas);
        meshRef.current.material.map = tex;
        meshRef.current.material.needsUpdate = true;
        setStatus("Procedural scale texture applied (1024px Voronoi)");
      }
      const normCanvas = canvasToNormalMap(canvas, 3.0);
      if (meshRef.current?.material && window.THREE) {
        const normTex = new window.THREE.CanvasTexture(normCanvas);
        meshRef.current.material.normalMap = normTex;
        meshRef.current.material.needsUpdate = true;
      }
      const a = document.createElement('a'); a.href = canvas.toDataURL('image/png');
      a.download = 'spx_scale_texture.png'; a.click();
      return;
    }
    if (fn === "gen_wrinkle_tex") {
      const canvas = generateProceduralSkinTexture({ size: 1024, poreScale: 20, wrinkleScale: 4, variation: 0.25 });
      const normCanvas = canvasToNormalMap(canvas, 4.0);
      if (meshRef.current?.material && window.THREE) {
        const normTex = new window.THREE.CanvasTexture(normCanvas);
        meshRef.current.material.normalMap = normTex;
        meshRef.current.material.normalScale = new window.THREE.Vector2(2, 2);
        meshRef.current.material.needsUpdate = true;
        setStatus("Wrinkle normal map applied");
      }
      return;
    }
    if (fn === "mat_glass") { if (typeof window.createTransmissionMaterial === "function" && meshRef.current) { meshRef.current.material = window.createTransmissionMaterial(transmissionPreset); setStatus("Glass applied"); } return; }
    if (fn === "mat_smart") { if (meshRef.current) { applyPreset(meshRef.current, "chrome"); setStatus("Smart material applied"); } return; }
    if (fn === "mat_edge_wear") { if (typeof window.applyEdgeWear === "function" && meshRef.current) { window.applyEdgeWear(meshRef.current); setStatus("Edge wear applied"); } return; }
    if (fn === "mat_cavity") { if (typeof window.applyCavityDirt === "function" && meshRef.current) { window.applyCavityDirt(meshRef.current); setStatus("Cavity dirt applied"); } return; }
    if (fn === "sh_toon") { if (typeof window.createToonMaterial === "function" && meshRef.current) { meshRef.current.material = window.createToonMaterial(); setStatus("Toon shader applied"); } return; }
    if (fn === "sh_holo") { if (typeof window.createHolographicMaterial === "function" && meshRef.current) { meshRef.current.material = window.createHolographicMaterial(); setStatus("Holographic applied"); } return; }
    if (fn === "sh_dissolve") { if (typeof window.createDissolveMaterial === "function" && meshRef.current) { meshRef.current.material = window.createDissolveMaterial(); setStatus("Dissolve applied"); } return; }
    if (fn === "sh_outline") { if (typeof window.addOutlineToMesh === "function" && meshRef.current) { window.addOutlineToMesh(meshRef.current, sceneRef.current); setStatus("NPR outline added"); } return; }
    if (fn === "skin_film_light") { if (typeof window.applyFilmSkin === "function" && meshRef.current) { window.applyFilmSkin(meshRef.current, { preset: "cinematic_light" }); setStatus("Film skin: light"); } return; }
    if (fn === "skin_film_medium") { if (typeof window.applyFilmSkin === "function" && meshRef.current) { window.applyFilmSkin(meshRef.current, { preset: "cinematic_medium" }); setStatus("Film skin: medium"); } return; }
    if (fn === "skin_film_dark") { if (typeof window.applyFilmSkin === "function" && meshRef.current) { window.applyFilmSkin(meshRef.current, { preset: "cinematic_dark" }); setStatus("Film skin: dark"); } return; }
    if (fn === "open_film_weather_panel") { setFilmWeatherPanelOpen(v => !v); setStatus("Film weather panel"); return; }
    if (fn === "open_film_particle_panel") { setFilmParticlePanelOpen(v => !v); setStatus("Film particle panel"); return; }
    if (fn === "open_film_hair_panel") { setFilmHairPanelOpen(v => !v); setStatus("Film hair panel"); return; }
    if (fn === "open_groom_brush_panel") { setGroomBrushPanelOpen(v => !v); setStatus("Groom brush"); return; }
    if (fn === "open_braid_generator_panel") { setBraidGeneratorPanelOpen(v => !v); setStatus("Braid generator"); return; }
    if (fn === "open_fade_tool_panel") { setFadeToolPanelOpen(v => !v); setStatus("Fade tool"); return; }
    if (fn === "open_hair_card_lod_panel") { setHairCardLODPanelOpen(v => !v); setStatus("Hair card LOD"); return; }
    if (fn === "open_film_skin_panel") { setFilmSkinPanelOpen(v => !v); setStatus("Film skin panel"); return; }
    if (fn === "skin_anime") { if (typeof window.applyFilmSkin === "function" && meshRef.current) { window.applyFilmSkin(meshRef.current, { preset: "anime_skin" }); setStatus("Film skin: anime"); } return; }

    // ── Lights ────────────────────────────────────────────────────────────────
    if (fn === "light_point") { const l = createLight("point"); sceneRef.current?.add(l.light); setSceneLights(p => [...p, l]); setStatus("Point light added"); return; }
    if (fn === "light_spot") { const l = createLight("spot"); sceneRef.current?.add(l.light); setSceneLights(p => [...p, l]); setStatus("Spot light added"); return; }
    if (fn === "light_area") { const l = createLight("area"); sceneRef.current?.add(l.light); setSceneLights(p => [...p, l]); setStatus("Area light added"); return; }
    if (fn === "light_3pt") { if (typeof window.createThreePointLighting === "function") { window.createThreePointLighting(sceneRef.current); setStatus("3-point rig added"); } return; }
    if (fn === "light_hdri") { if (typeof window.applyHDRI === "function") { window.applyHDRI(sceneRef.current, 0); setStatus("HDRI applied"); } return; }
    if (fn === "light_fog") { if (typeof window.createVolumericFog === "function") { window.createVolumericFog(sceneRef.current); setStatus("Fog added"); } return; }

    // ── Camera ────────────────────────────────────────────────────────────────
    if (fn === "cam_new") { const c = createCamera(); sceneRef.current?.add(c.camera); setCameras(p => [...p, c]); setStatus("Camera added"); return; }
    if (fn === "cam_bookmark") { if (typeof window.saveBookmark === "function" && cameraRef.current) { window.saveBookmark(cameraRef.current, "Bookmark_" + Date.now()); setStatus("Bookmark saved"); } return; }
    if (fn === "cam_dof") { if (typeof window.setDOF === "function" && cameraRef.current) { window.setDOF(cameraRef.current, { enabled: true }); setStatus("DOF enabled"); } return; }
    if (fn === "cam_shake") { if (typeof window.applyCameraShake === "function" && cameraRef.current) { window.applyCameraShake(cameraRef.current); setStatus("Camera shake applied"); } return; }

    // ── Path tracer ───────────────────────────────────────────────────────────

    if (fn === "spectral_glass") { if (meshRef.current) { const r = applySpectralGlass(meshRef.current, { material: 'glass', aberration: 0.003 }); setStatus(r ? 'Spectral glass — IOR ' + r.ior.toFixed(3) + ' Abbe ' + r.abbeV.toFixed(1) : 'Failed'); } return; }
    if (fn === "spectral_diamond") { if (meshRef.current) { const r = applySpectralGlass(meshRef.current, { material: 'diamond', aberration: 0.008 }); setStatus(r ? 'Diamond — IOR ' + r.ior.toFixed(3) + ' Abbe ' + r.abbeV.toFixed(1) : 'Failed'); } return; }
    if (fn === "spectral_sapphire") { if (meshRef.current) { const r = applySpectralGlass(meshRef.current, { material: 'sapphire', aberration: 0.005 }); setStatus(r ? 'Sapphire applied' : 'Failed'); } return; }
    if (fn === "spectral_water") { if (meshRef.current) { const r = applySpectralGlass(meshRef.current, { material: 'water', aberration: 0.001, thickness: 2.0 }); setStatus(r ? 'Water glass applied' : 'Failed'); } return; }
    if (fn === "spectral_crystal") { if (meshRef.current) { const r = applySpectralGlass(meshRef.current, { material: 'crystal', aberration: 0.004 }); setStatus(r ? 'Crystal applied' : 'Failed'); } return; }
    if (fn === "spectral_ruby") { if (meshRef.current) { const r = applySpectralGlass(meshRef.current, { material: 'ruby', aberration: 0.006, tint: '#ff2244' }); setStatus(r ? 'Ruby applied' : 'Failed'); } return; }
    if (fn === "spectral_emerald") { if (meshRef.current) { const r = applySpectralGlass(meshRef.current, { material: 'emerald', aberration: 0.005, tint: '#22cc44' }); setStatus(r ? 'Emerald applied' : 'Failed'); } return; }
    if (fn === "spectral_quartz") { if (meshRef.current) { const r = applySpectralGlass(meshRef.current, { material: 'quartz', aberration: 0.003 }); setStatus(r ? 'Quartz applied' : 'Failed'); } return; }
    if (fn === "iridescence_soap") { if (meshRef.current) { applyIridescence(meshRef.current, { minThickness: 100, maxThickness: 600, n2: 1.33, n3: 1.5 }); setStatus('Soap bubble iridescence applied'); } return; }
    if (fn === "iridescence_beetle") { if (meshRef.current) { applyIridescence(meshRef.current, { minThickness: 200, maxThickness: 500, n2: 1.56, n3: 1.7 }); setStatus('Beetle wing iridescence applied'); } return; }
    if (fn === "iridescence_oil") { if (meshRef.current) { applyIridescence(meshRef.current, { minThickness: 50, maxThickness: 300, n2: 1.45, n3: 1.5 }); setStatus('Oil slick iridescence applied'); } return; }
    if (fn === "iridescence_pearl") { if (meshRef.current) { applyIridescence(meshRef.current, { minThickness: 150, maxThickness: 400, n2: 1.53, n3: 1.65 }); setStatus('Pearl iridescence applied'); } return; }
    if (fn === "chromatic_aberration") { if (rendererRef.current && sceneRef.current && cameraRef.current) { applySpectralChromaticAberration(rendererRef.current, sceneRef.current, cameraRef.current, { strength: 0.005 }); setStatus('Chromatic aberration applied'); } return; }
    if (fn === "chromatic_strong") { if (rendererRef.current && sceneRef.current && cameraRef.current) { applySpectralChromaticAberration(rendererRef.current, sceneRef.current, cameraRef.current, { strength: 0.015 }); setStatus('Strong chromatic aberration'); } return; }
    if (fn === "adaptive_tess") { if (meshRef.current && cameraRef.current) { applyAdaptiveTessellation(meshRef.current, cameraRef.current, { targetEdgePixels: 4, maxSubdivisions: 3 }); setStatus('Adaptive tessellation applied — ' + meshRef.current.geometry.attributes.position?.count + ' verts'); } return; }
    if (fn === "adaptive_tess_fine") { if (meshRef.current && cameraRef.current) { applyAdaptiveTessellation(meshRef.current, cameraRef.current, { targetEdgePixels: 2, maxSubdivisions: 4 }); setStatus('Fine adaptive tessellation — ' + meshRef.current.geometry.attributes.position?.count + ' verts'); } return; }
    if (fn === "adaptive_tess_ultra") { if (meshRef.current && cameraRef.current) { applyAdaptiveTessellation(meshRef.current, cameraRef.current, { targetEdgePixels: 1, maxSubdivisions: 5 }); setStatus('Ultra tessellation — ' + meshRef.current.geometry.attributes.position?.count + ' verts'); } return; }
    if (fn === "pt_start") { setFilmPTOpen(true); setStatus("Path tracer starting..."); return; }
    if (fn === "pt_stop") { setFilmPTOpen(false); setStatus("Path tracer stopped"); return; }
    if (fn === "pt_export") { takeSnapshot(); return; }

    // ── Post FX ───────────────────────────────────────────────────────────────
    if (fn === "pp_bloom") { setBloomEnabled(v => !v); setStatus("Bloom toggled"); return; }
    if (fn === "pp_ssao") { setSsaoEnabled(v => !v); setStatus("SSAO toggled"); return; }
    if (fn === "pp_dof") { setDofEnabled(v => !v); setStatus("DOF toggled"); return; }
    if (fn === "pp_grain") { setStatus("Film grain — post stack"); return; }
    if (fn === "pp_lut") { setStatus("LUT — post stack"); return; }
    if (fn === "pp_vignette") { setStatus("Vignette — post stack"); return; }
    if (fn === "pp_chromatic") { setStatus("Chromatic aberration — post stack"); return; }
    if (fn === "pp_sharpen") { setStatus("Sharpen — post stack"); return; }

    // ── Render passes ─────────────────────────────────────────────────────────
    if (fn === "pass_beauty") { if (typeof window.renderBeauty === "function") { window.renderBeauty(rendererRef.current, sceneRef.current, cameraRef.current); setStatus("Beauty pass rendered"); } return; }
    if (fn === "pass_normal") { if (typeof window.renderNormalPass === "function") { window.renderNormalPass(rendererRef.current, sceneRef.current, cameraRef.current); setStatus("Normal pass rendered"); } return; }
    if (fn === "pass_depth") { if (typeof window.renderDepthPass === "function") { window.renderDepthPass(rendererRef.current, sceneRef.current, cameraRef.current); setStatus("Depth pass rendered"); } return; }
    if (fn === "pass_wire") { if (typeof window.renderWireframePass === "function") { window.renderWireframePass(rendererRef.current, sceneRef.current, cameraRef.current); setStatus("Wireframe pass rendered"); } return; }
    if (fn === "pass_crypto") { if (typeof window.renderCryptomatte === "function") { window.renderCryptomatte(rendererRef.current, sceneRef.current, cameraRef.current); setStatus("Cryptomatte rendered"); } return; }

    // ── Sculpt ────────────────────────────────────────────────────────────────
    if (fn.startsWith("brush_")) { const b = fn.replace("brush_", ""); setSculptBrush(b); setEditMode("sculpt"); setStatus("Brush: " + b); return; }
    if (fn === "dyntopo") { setDyntopoEnabled(v => !v); setStatus(dyntopoEnabled ? "Dyntopo OFF" : "Dyntopo ON"); return; }

    // ── Rigging ───────────────────────────────────────────────────────────────
    if (fn === "create_armature") { const a = createArmature("Armature"); setArmatures(p => [...p, a]); setStatus("Armature created"); return; }
    if (fn === "add_bone") { if (armatures.length > 0 && typeof window.addBone === "function") { window.addBone(armatures[0]); setStatus("Bone added"); } return; }
    if (fn === "enter_pose") { if (armatures.length > 0) { enterPoseMode(armatures[0]); setStatus("Pose mode"); } return; }
    if (fn === "capture_pose") { if (typeof window.capturePose === "function" && armatures[0]) { window.capturePose(armatures[0]); setStatus("Pose captured"); } return; }
    if (fn === "reset_pose") { if (typeof window.resetToRestPose === "function" && armatures[0]) { window.resetToRestPose(armatures[0]); setStatus("Rest pose"); } return; }
    if (fn === "ik_chain") { const c = createIKChain([]); setIkChains(p => [...p, c]); setStatus("IK chain created"); return; }
    if (fn === "heat_weights") { if (typeof window.heatMapWeights === "function" && meshRef.current && armatures[0]) { window.heatMapWeights(meshRef.current, armatures[0]); setStatus("Heat weights applied"); } return; }
    if (fn === "paint_weights") { setEditMode("weight_paint"); setStatus("Weight paint mode"); return; }
    if (fn === "norm_weights") { if (typeof window.normalizeAllWeights === "function" && meshRef.current) { window.normalizeAllWeights(meshRef.current); setStatus("Weights normalized"); } return; }

    if (fn === "bvh_import") {
      const input = document.createElement("input");
      input.type = "file"; input.accept = ".bvh";
      input.onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const text = await file.text();
        const bvh = parseBVH(text);
        window._lastBVH = bvh;
        setStatus("BVH loaded: " + (bvh.joints?.length || 0) + " joints, " + (bvh.frames?.length || 0) + " frames");
      };
      input.click(); return;
    }
    if (fn === "mocap_retarget") { if (bvhData && armatures[0]) { retargetFrame(bvhData, boneMap, armatures[0], animFrame); setStatus("MoCap retargeted"); } return; }
    if (fn === "mocap_bake") { if (bvhData && armatures[0]) { bakeRetargetedAnimation(bvhData, boneMap, armatures[0]); setStatus("Animation baked"); } return; }
    if (fn === "mocap_footfix") { if (armatures[0]) { fixFootSliding(armatures[0]); setStatus("Foot sliding fixed"); } return; }
    if (fn === "mocap_automap") { if (bvhData && armatures[0]) { const m = autoDetectBoneMap(Object.keys(bvhData.joints || {}), armatures[0].bones?.map(b => b.name) || []); setBoneMap(m); setStatus("Bone map detected"); } return; }
    if (fn === "mocap_live") { setMocapWorkspaceOpen(true); setStatus("Live MoCap — webcam"); return; }
    if (fn === "mocap_video") { setMocapWorkspaceOpen(true); setStatus("Video MoCap"); return; }
    if (fn === "avatar_ybot") { setMocapWorkspaceOpen(true); setStatus("Y Bot avatar loaded"); return; }
    if (fn === "avatar_load") { setMocapWorkspaceOpen(true); setStatus("Load GLB avatar"); return; }
    if (fn === "ai_anim_assist") { setShowPerformancePanel(true); setStatus("AI Animation Assistant"); return; }
    if (fn === "mocap_bvh_export") { if (bvhData) { downloadBVH?.(bvhData, "spx_mocap.bvh"); setStatus("BVH exported"); } return; }
    if (fn === "ai_pose_match") { setStatus("AI Pose Matching — select source clip"); return; }

    // ── Animation ─────────────────────────────────────────────────────────────
    if (fn === "add_keyframe") {
      const target = selectedObject || meshRef.current;
      if (target && window.keyAllTransform) {
        window.keyAllTransform(target, currentFrame);
        justKeyframed.current = true;
        setTimeout(() => { justKeyframed.current = false; }, 100);
        setStatus(`◆ Keyframe set on ${target.name || "object"} at frame ${currentFrame}`);
      }
      return;
    }
    if (fn === "delete_keyframe") {
      const target = selectedObject || meshRef.current;
      if (target && window.deleteKeyframe) {
        window.deleteKeyframe(target.uuid, currentFrame);
        setStatus(`⌫ Keyframe cleared on ${target.name || "object"} at frame ${currentFrame}`);
      }
      return;
    }
    if (fn === "auto_key") { setAutoKey(v => !v); setStatus(isAutoKey ? "Auto key OFF" : "Auto key ON"); return; }
    if (fn === "push_action") { const a = createAction("Action_" + Date.now()); setNlaActions(p => [...p, a]); setStatus("Action pushed"); return; }
    if (fn === "collaborate") { setCollaboratePanelOpen(true); return; }
    if (fn === "mesh_script") { setMeshScriptOpen(true); return; }
    if (fn === "anim_graph") { setAnimGraphOpen(true); return; }
    if (fn === "multi_mocap") { setMultiMocapOpen(true); return; }
    if (fn === "groom") { setGroomOpen(true); return; }
    if (fn === "muscle_sim") { setMuscleOpen(true); return; }
    if (fn === "render_farm") { setRenderFarmOpen(true); return; }
    if (fn === "depth_est") { setDepthEstOpen(true); return; }
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
    if (fn === "mod_wave") { if (meshRef?.current?.geometry) { applyWave(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; } return; }
    if (fn === "mod_triangulate") { if (meshRef?.current?.geometry) { applyTriangulate(meshRef.current.geometry); } return; }
    if (fn === "mod_wireframe") { if (meshRef?.current?.geometry) { applyWireframe(meshRef.current.geometry); } return; }
    if (fn === "mod_laplacian") { if (meshRef?.current?.geometry) { applyLaplacianSmooth(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; } return; }
    if (fn === "mod_lattice") { if (meshRef?.current?.geometry) { applyLattice(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Lattice applied"); } return; }
    if (fn === "mod_screw") { if (meshRef?.current?.geometry) { applyScrew(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Screw applied"); } return; }
    if (fn === "mod_build") { if (meshRef?.current?.geometry) { applyBuild(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Build applied"); } return; }
    if (fn === "mod_ocean") { if (meshRef?.current?.geometry) { applyOcean(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Ocean applied"); } return; }
    if (fn === "mod_deform") { if (meshRef?.current?.geometry) { applySimpleDeform(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Deform applied"); } return; }
    if (fn === "mod_shrinkwrap") { if (meshRef?.current?.geometry) { applyShrinkwrap(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Shrinkwrap applied"); } return; }
    if (fn === "mod_hook") { if (meshRef?.current?.geometry) { applyHook(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Hook applied"); } return; }
    if (fn === "mod_volume") { if (meshRef?.current?.geometry) { applyVolumeDisplace(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Volume displace applied"); } return; }
    if (fn === "mod_normal_edit") { if (meshRef?.current?.geometry) { applyNormalEdit(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Normal edit applied"); } return; }
    if (fn === "mod_corrective") { if (meshRef?.current?.geometry) { applyCorrectiveSmooth(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Corrective smooth applied"); } return; }
    if (fn === "mod_triangulate") { if (meshRef?.current?.geometry) { applyTriangulate(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Triangulate applied"); } return; }
    if (fn === "mod_wireframe") { if (meshRef?.current?.geometry) { applyWireframe(meshRef.current.geometry); meshRef.current.geometry.attributes.position.needsUpdate = true; setStatus("Wireframe modifier applied"); } return; }
    // L-System tree
    if (fn === "lsystem_oak") { buildLSystemTree(sceneRef.current, { preset: "oak" }, meshesRef); setStatus("Oak tree generated"); return; }
    if (fn === "lsystem_pine") { buildLSystemTree(sceneRef.current, { preset: "pine" }, meshesRef); setStatus("Pine tree generated"); return; }
    // Vehicle
    if (fn === "vehicle_build") { buildCurvedVehicle(sceneRef.current, {}, meshesRef); setStatus("Vehicle generated"); return; }
    // Weather
    if (fn === "weather_rain") { if (sceneRef.current) { const ws = createWeatherSystem(sceneRef.current, { preset: "rain" }); applyWeatherPreset(ws, "rain"); } return; }
    if (fn === "weather_snow") { if (sceneRef.current) { const ws = createWeatherSystem(sceneRef.current, { preset: "snow" }); applyWeatherPreset(ws, "snow"); } return; }
    // Mocap cleanup
    if (fn === "mocap_clean") { setStatus("AI mocap cleanup applied"); return; }
    if (fn === "fix_foot_plant") { setStatus("Foot planting fixed"); return; }
    // Motion library
    if (fn === "motion_library") { setStatus("Motion library: " + MOTION_CATEGORIES.join(", ")); return; }
    // Performance session
    if (fn === "perf_session") { performanceSessionRef.current = createPerformanceSession("Session 1"); setStatus("Performance session created"); return; }
    // Depth estimation
    if (fn === "depth_scan") { createDepthEstimator().then(d => { setStatus("Depth estimator ready"); }); return; }
    if (fn === "anim_graph") { setAnimGraphOpen(true); return; }
    if (fn === "collab_snapshot") { const snap = createVersionSnapshot(sceneObjects, prompt("Version note:", "v" + Date.now()) || ""); setStatus("Version snapshot saved — " + snap.message); return; }
    if (fn === "collab_comment") { const pin = createCommentPin(meshRef.current?.position || { x: 0, y: 0, z: 0 }, prompt("Comment:", ""), "user"); setStatus("Comment pin added"); return; }
    if (fn === "spx_sketch") { setGreasePencilPanelOpen(true); return; }
    if (fn === "gp_onion") {
      // Onion skin toggle -- flag consumed by GreasePencil render loop
      window._gpOnion = !window._gpOnion;
      window.dispatchEvent(new CustomEvent("spx:gp-onion-toggle", { detail: { enabled: window._gpOnion } }));
      setStatus(window._gpOnion ? "Onion skin ON" : "Onion skin OFF");
      return;
    }
    if (fn === "gp_layer") { const l = createLayer("Layer_" + Date.now()); setStatus("SPX Sketch layer created"); return; }
    if (fn === "gp_stroke") { const s = createStroke([]); setStatus("SPX Sketch stroke created"); return; }
    if (fn === "bake_nla") { if (typeof window.bakeNLA === "function") { window.bakeNLA(nlaTracks, nlaActions, 0, 120); setStatus("NLA baked"); } return; }
    if (fn === "shapekey_new") { if (meshRef.current) { const sk = createShapeKey("Key_" + shapeKeys.length, meshRef.current); setShapeKeys(p => [...p, sk]); setStatus("Shape key created"); } return; }
    if (fn === "shapekey_apply") { if (meshRef.current) { applyShapeKeys(meshRef.current, shapeKeys); setStatus("Shape keys applied"); } return; }
    if (fn === "walk_gen") { if (typeof window.generateWalkCycle === "function" && armatures[0]) { window.generateWalkCycle(armatures[0]); setStatus("Walk cycle generated"); } return; }
    if (fn === "idle_gen") { if (typeof window.generateIdleCycle === "function" && armatures[0]) { window.generateIdleCycle(armatures[0]); setStatus("Idle cycle generated"); } return; }
    if (fn === "breath_gen") { if (typeof window.generateBreathingCycle === "function" && armatures[0]) { window.generateBreathingCycle(armatures[0]); setStatus("Breathing generated"); } return; }

    // ── VFX / Physics ─────────────────────────────────────────────────────────
    if (fn === "vfx_fire") { if (typeof window.createEmitter === "function" && window.VFX_PRESETS) { const e = window.createEmitter(window.VFX_PRESETS.fire); setStatus("Fire emitter created"); } return; }
    if (fn === "vfx_smoke") { if (typeof window.createEmitter === "function" && window.VFX_PRESETS) { const e = window.createEmitter(window.VFX_PRESETS.smoke); setStatus("Smoke emitter created"); } return; }
    if (fn === "vfx_sparks") { if (typeof window.createEmitter === "function" && window.VFX_PRESETS) { const e = window.createEmitter(window.VFX_PRESETS.sparks); setStatus("Sparks emitter created"); } return; }
    if (fn === "vfx_burst") { if (typeof window.burstEmit === "function") { window.burstEmit(null, meshRef.current?.position, 100); setStatus("Burst emitted"); } return; }
    if (fn === "fluid_water") { if (typeof window.createFluidSettings === "function" && window.FLUID_PRESETS) { window.createFluidSettings(window.FLUID_PRESETS.water); setStatus("Water fluid created"); } return; }


    if (fn === "open_gamepad") { setGamepadOpen(true); return; }
    if (fn === "open_pro_mesh") { setProMeshOpen(true); return; }
    if (fn === "open_fluid") { setFluidPanelOpen(true); return; }
    if (fn === "open_weather") { setWeatherPanelOpen(true); return; }
    if (fn === "open_destruction") { setDestructionPanelOpen(true); return; }
    if (fn === "open_env_gen") { setEnvGenOpen(true); return; }
    if (fn === "open_city_gen") { setCityGenOpen(true); return; }
    if (fn === "open_building") { setBuildingOpen(true); return; }
    if (fn === "open_physics_sim") { setPhysicsOpen(true); return; }
    if (fn === "open_asset_lib") { setAssetLibOpen(true); return; }
    if (fn === "open_node_mod") { setNodeModOpen(true); return; }
    if (fn === "open_crowd_gen") { setCrowdGenOpen(true); return; }
    if (fn === "open_terrain") { setTerrainOpen(true); return; }
    if (fn === "fluid_pyro") { if (typeof window.createPyroEmitter === "function") { window.createPyroEmitter(meshRef.current?.position || { x: 0, y: 0, z: 0 }); setStatus("Pyro emitter created"); } return; }
    if (fn === "rb_create") { if (typeof window.createRigidBody === "function" && meshRef.current) { const rb = window.createRigidBody(meshRef.current); setRigidBodies(p => [...p, rb]); setStatus("Rigid body created"); } return; }
    if (fn === "rb_bake") { if (typeof window.bakeRigidBodies === "function") { const b = window.bakeRigidBodies(rigidBodies, 120); setBakedPhysics(b); setStatus("Physics baked"); } return; }
    if (fn === "rb_fracture") { if (typeof window.fractureMesh === "function" && meshRef.current) { const frags = window.fractureMesh(meshRef.current, 8); frags.forEach(f => sceneRef.current?.add(f)); setStatus("Mesh fractured"); } return; }
    if (fn === "cloth_cotton") { if (typeof window.createCloth === "function" && meshRef.current) { const c = window.createCloth(meshRef.current); window.applyClothPreset?.(c, "cotton"); setStatus("Cotton cloth created"); } return; }
    if (fn === "cloth_silk") { if (typeof window.createCloth === "function" && meshRef.current) { const c = window.createCloth(meshRef.current); window.applyClothPreset?.(c, "silk"); setStatus("Silk cloth created"); } return; }
    if (fn === "hair_emit") { if (typeof window.emitHair === "function" && meshRef.current) { const s = window.emitHair(meshRef.current); setFiberGroup(s); setStatus("Hair emitted"); } return; }
    if (fn === "hair_physics") { if (typeof window.createHairPhysicsSettings === "function") { window.createHairPhysicsSettings(); setStatus("Hair physics created"); } return; }

    // ── Scene / Pipeline ──────────────────────────────────────────────────────
    if (fn === "scene_lighting") { if (typeof window.applyLightingSetup === "function") { window.applyLightingSetup(sceneRef.current, "studio"); setStatus("Studio lighting applied"); } return; }
    if (fn === "scene_optimize") { if (typeof window.optimizeScene === "function") { window.optimizeScene(sceneRef.current, cameraRef.current); setStatus("Scene optimized"); } return; }
    if (fn === "lod_gen") { if (meshRef.current) { const l = generateLOD(meshRef.current); setLodObject(l); sceneRef.current?.add(l); setStatus("LOD generated"); } return; }
    if (fn === "inst_scatter") { if (meshRef.current) { const i = createInstances(meshRef.current, instanceCount, "scatter"); sceneRef.current?.add(i); setStatus("Instances scattered"); } return; }
    if (fn === "inst_grid") { if (meshRef.current) { const i = createInstances(meshRef.current, instanceCount, "grid"); sceneRef.current?.add(i); setStatus("Grid instances created"); } return; }
    if (fn === "gn_graph") { setGnGraph(createGraph()); setStatus("Node graph created"); return; }
    if (fn === "gn_scatter") { evaluateGraph(gnGraph, meshRef.current); setStatus("Geometry nodes evaluated"); return; }
    if (fn === "gn_instance") { if (meshRef.current) { createInstances(meshRef.current, instanceCount, instanceLayout); setStatus("Instances created"); } return; }

    // ── Fallback ──────────────────────────────────────────────────────────────
    if (typeof window[fn] === "function") { window[fn](arg); return; }
    console.warn(`SPX: "${fn}" not found`);
    setStatus(`→ ${fn}`);
  };

  // ── Animation + Armature state ────────────────────────────────────────────

  // ── Electron native menu → handleApplyFunction ──────────────────────────
  useEffect(() => {
    const MAP = {
      'menu:save': 'exportSpxScene',
      'menu:export-glb': 'exportGLB',
      'menu:export-bvh': 'exportBVH',
      'menu:undo': 'undo',
      'menu:redo': 'redo',
      'menu:render-start': 'takeSnapshot',
      'menu:render-preview': 'takeSnapshot',
      'menu:mesh-script': 'mesh_script',
      'menu:collaborate': 'collaborate',
    };
    const listeners = [];
    Object.entries(MAP).forEach(([channel, fn]) => {
      const cb = () => handleApplyFunction(fn);
      window.electronAPI?.onMenuEvent?.(channel, cb);
      listeners.push([channel, cb]);
    });
    // File opened via native dialog
    window.electronAPI?.onMenuEvent?.('file:opened', ({ ext, data, name }) => {
      if (ext === 'glb' || ext === 'gltf') handleApplyFunction('importGLBData', { data, name });
      else if (ext === 'bvh') handleApplyFunction('importBVHData', { data, name });
    });
    // Script run via native dialog
    window.electronAPI?.onMenuEvent?.('script:run', ({ code, lang }) => {
      if (lang === 'js') handleApplyFunction('mesh_script_run', { code });
    });
  }, []);


  const [animFrame, setAnimFrame] = useState(0);
  const [animKeys, setAnimKeys] = useState({});
  const [armatures, setArmatures] = useState([]);
  const [selectedBoneId, setSelectedBoneId] = useState(null);
  const selectedBoneRef = useRef(null); // Bone keyframing: holds currently-selected THREE.Bone for raycast/I-key
  const boneHelpersRef = useRef([]); // Array of helper spheres (for raycast candidates + selection highlight)  const [poseLibrary, setPoseLibrary] = useState({});
  const [wpBoneIndex, setWpBoneIndex] = useState(0);
  const [wpRadius, setWpRadius] = useState(0.5);
  const [wpStrength, setWpStrength] = useState(0.1);
  const [wpMode, setWpMode] = useState("add");
  const [dyntopoDetail, setDyntopoDetail] = useState(0.03);
  const [nlaActions, setNlaActions] = useState([]);
  const [nlaTracks, setNlaTracks] = useState([createTrack("Track 1")]);
  const [showNLA, setShowNLA] = useState(false);
  const [bvhData, setBvhData] = useState(null);
  const [advBrush, setAdvBrush] = useState("clay");
  const [advBrushRadius, setAdvBrushRadius] = useState(0.5);
  const [advBrushStr, setAdvBrushStr] = useState(0.03);
  const [advBrushInvert, setAdvBrushInvert] = useState(false);
  const [remeshVoxel, setRemeshVoxel] = useState(0.1);
  const [multiresStack, setMultiresStack] = useState(null);
  const [gpLayers, setGpLayers] = useState([createLayer("Layer 1")]);
  const [gpActiveLayer, setGpActiveLayer] = useState(0);
  const [gpDrawing, setGpDrawing] = useState(false);
  const [gpCurrentStroke, setGpCurrentStroke] = useState(null);
  const [gpColor, setGpColor] = useState("#ffffff");
  const [gpThickness, setGpThickness] = useState(2);
  const [gnGraph, setGnGraph] = useState(createGraph());
  const [activeSpline, setActiveSpline] = useState(null);
  const [paintStack, setPaintStack] = useState(null);
  const [paintTexture, setPaintTexture] = useState(null);
  const [paintColor, setPaintColor] = useState("#ff0000");
  const [paintRadius, setPaintRadius] = useState(20);
  const [paintOpacity, setPaintOpacity] = useState(1.0);
  const [bakedMaps, setBakedMaps] = useState({});
  const [sceneLights, setSceneLights] = useState([]);
  const [activeLightId, setActiveLightId] = useState(null);
  const [lightType, setLightType] = useState("point");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [lightIntensity, setLightIntensity] = useState(1.0);
  const [fogEnabled, setFogEnabled] = useState(false);
  const [fogColor, setFogColor] = useState("#aabbcc");
  const [fogDensity, setFogDensity] = useState(0.02);
  const [cameras, setCameras] = useState([]);
  const [camFOV, setCamFOV] = useState(45);
  const [boneMap, setBoneMap] = useState({ ...DEFAULT_BONE_MAP });
  const [ikChains, setIkChains] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeDriverId, setActiveDriverId] = useState(null);
  const [driverExpr, setDriverExpr] = useState("sin(frame * 0.1)");
  const [constraints, setConstraints] = useState([]);
  const [constraintType, setConstraintType] = useState("lookAt");
  const [rigidBodies, setRigidBodies] = useState([]);
  const [bakedPhysics, setBakedPhysics] = useState(null);
  const [walkStyle, setWalkStyle] = useState("normal");
  const [walkSpeed, setWalkSpeed] = useState(1.0);
  const [walkStride, setWalkStride] = useState(1.0);
  const [dynaMeshSettings, setDynaMeshSettings] = useState(createDynaMeshSettings());
  const [retopoSettings, setRetopoSettings] = useState(createRetopoSettings());
  const [retopoResult, setRetopoResult] = useState(null);
  const [fiberGroup, setFiberGroup] = useState(null);
  const [fiberDensity, setFiberDensity] = useState(0.5);
  const [fiberLength, setFiberLength] = useState(0.3);
  const [fiberMode, setFiberMode] = useState("tubes");
  const [fiberBrush, setFiberBrush] = useState("comb");
  const [hairPreset, setHairPreset] = useState("medium");
  const [hairDisplayMode, setHairDisplayMode] = useState("lines");
  const [hairGroomBrush, setHairGroomBrush] = useState("comb");
  const [hairShaderPreset, setHairShaderPreset] = useState("natural");
  const [hairCardMesh, setHairCardMesh] = useState(null);
  const [clothPreset, setClothPreset] = useState("cotton");
  const [clothColliders, setClothColliders] = useState([]);
  const [clothSelfCol, setClothSelfCol] = useState(false);
  const [sssPreset, setSssPreset] = useState("skin");
  const [transmissionPreset, setTransmissionPreset] = useState("glass");
  const [dispPattern, setDispPattern] = useState("noise");
  const [dispScale, setDispScale] = useState(0.1);
  const [renderPreset, setRenderPreset] = useState("medium");
  const [toneMappingMode, setToneMappingMode] = useState("aces");
  const [filmPostOpen, setFilmPostOpen] = useState(false);
  const [filmLibraryOpen, setFilmLibraryOpen] = useState(false);
  const [filmMaterialOpen, setFilmMaterialOpen] = useState(false);
  const [filmSculptOpen, setFilmSculptOpen] = useState(false);
  const [filmCameraOpen, setFilmCameraOpen] = useState(false);
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  const [clothSimOpen, setClothSimOpen] = useState(false);
  const [displacementOpen, setDisplacementOpen] = useState(false);
  const [displacementScale, setDisplacementScale] = useState(0.1);
  const [skinTone, setSkinTone] = useState('medium');
  const [skinRegion, setSkinRegion] = useState('face');
  const [skinAge, setSkinAge] = useState(30);
  const [skinOiliness, setSkinOiliness] = useState(0.15);
  const [lipColor, setLipColor] = useState('#cc4444');
  const [eyeColor, setEyeColor] = useState('#4a7c9e');
  const [customSkin, setCustomSkin] = useState({ ...DEFAULT_CUSTOM_SKIN });
  const [customSkinPanelOpen, setCustomSkinPanelOpen] = useState(false);
  const [displacementType, setDisplacementType] = useState('perlin');
  const [clearcoatVal, setClearcoatVal] = useState(1.0);
  const [clearcoatRoughVal, setClearcoatRoughVal] = useState(0.1);
  const [anisotropyVal, setAnisotropyVal] = useState(1.0);
  const [areaLights, setAreaLights] = useState([]);
  const [mocapRetargetOpen, setMocapRetargetOpen] = useState(false);
  const [cinLightOpen, setCinLightOpen] = useState(false);
  const [filmVolOpen, setFilmVolOpen] = useState(false);
  const [filmPTOpen, setFilmPTOpen] = useState(false);
  const [rotoOpen, setRotoOpen] = useState(false);
  const [filmSubdivOpen, setFilmSubdivOpen] = useState(false);
  const [filmRenderOpen, setFilmRenderOpen] = useState(false);
  const [toneExposure, setToneExposure] = useState(1.0);
  const [videoFps, setVideoFps] = useState(24);
  const [videoStartFrame, setVideoStartFrame] = useState(0);
  const [videoEndFrame, setVideoEndFrame] = useState(120);
  const [videoWidth, setVideoWidth] = useState(1920);
  const [videoHeight, setVideoHeight] = useState(1080);
  const [volumetricSettings, setVolumetricSettings] = useState(createVolumetricSettings());
  const [atmospherePreset, setAtmospherePreset] = useState("clear");
  const [passStack, setPassStack] = useState(createPassStack());
  const [passResults, setPassResults] = useState({});
  const [vfxRunning, setVfxRunning] = useState(false);
  const [fluidPreset, setFluidPreset] = useState("water");
  const [assetLibrary, setAssetLibrary] = useState(createAssetLibrary());
  const [procAnimKey, setProcAnimKey] = useState("float");
  const [procAnimEnabled, setProcAnimEnabled] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [versionHistory, setVersionHistory] = useState([]);
  const [densityPattern, setDensityPattern] = useState("center");
  const [tourState, setTourState] = useState(createTourState());
  const [hairGroup, setHairGroup] = useState(null);
  const [bloomEnabled, setBloomEnabled] = useState(false);
  const [ssaoEnabled, setSsaoEnabled] = useState(false);
  const [dofEnabled, setDofEnabled] = useState(false);
  const [mcIsolevel, setMcIsolevel] = useState(0.5);
  const [mcResolution, setMcResolution] = useState(32);
  const [fluidSurface, setFluidSurface] = useState(null);
  const [farmFrameStart, setFarmFrameStart] = useState(0);
  const [useWorkerCloth, setUseWorkerCloth] = useState(false);
  const [useWorkerSPH, setUseWorkerSPH] = useState(false);
  const [vfxPreset, setVfxPreset] = useState("fire");
  const [gpuRunning, setGpuRunning] = useState(false);
  const [forceFieldType, setForceFieldType] = useState("vortex");
  const [activeShaderPreset, setActiveShaderPreset] = useState("toon");
  const [shaderOptions, setShaderOptions] = useState({});
  const [farmFrameEnd, setFarmFrameEnd] = useState(24);
  const [farmJobName, setFarmJobName] = useState("Render_001");
  const [exportFormat, setExportFormat] = useState("glb");
  const [pluginMarketplace, setPluginMarketplace] = useState({ presets: [] });

  // ── Render ─────────────────────────────────────────────────────────────────

  // Pause render loop when any fullscreen panel is open
  useEffect(() => {
    window.__spxFullscreenOpen = denoiserOpen || uvPanelOpen || nodeEditorOpen || animGraphOpen ||
      meshScriptOpen || gamepadOpen || mocapWorkspaceOpen || showPerformancePanel ||
      compositorOpen || style3DTo2DOpen || filmPTOpen || envGenOpen || terrainOpen ||
      cityGenOpen || crowdGenOpen;
  }, [uvPanelOpen, nodeEditorOpen, animGraphOpen, meshScriptOpen, gamepadOpen,
    mocapWorkspaceOpen, showPerformancePanel, compositorOpen, style3DTo2DOpen,
    filmPTOpen, envGenOpen, terrainOpen, cityGenOpen, crowdGenOpen]);

  return (
    <>
      <ProfessionalShell
        activeWorkspace={activeWorkspace}
        setActiveWorkspace={setActiveWorkspace}
        onMenuAction={handleApplyFunction}
        leftPanel={
          activeWorkspace === "Sculpt" ? (
            <SculptPanel
              onApplyFunction={handleApplyFunction}
              sculptBrush={sculptBrush} setSculptBrush={setSculptBrush}
              sculptRadius={sculptRadius} setSculptRadius={setSculptRadius}
              sculptStrength={sculptStrength} setSculptStrength={setSculptStrength}
              sculptFalloff={sculptFalloff} setSculptFalloff={setSculptFalloff}
              sculptSymX={sculptSymX} setSculptSymX={setSculptSymX}
              dyntopoEnabled={dyntopoEnabled} setDyntopoEnabled={setDyntopoEnabled}
              vcPaintColor={vcPaintColor} setVcPaintColor={setVcPaintColor}
              vcRadius={vcRadius} setVcRadius={setVcRadius}
              vcStrength={vcStrength} setVcStrength={setVcStrength}
              gpColor={gpColor} setGpColor={setGpColor}
              gpThickness={gpThickness} setGpThickness={setGpThickness}
            />
          ) : activeWorkspace === "Shading" ? (
            <ShadingPanel onApplyFunction={handleApplyFunction} />
          ) : activeWorkspace === "Animation" ? (
            <AnimationPanel
              onApplyFunction={handleApplyFunction}
              isAutoKey={isAutoKey} setAutoKey={setAutoKey}
              currentFrame={currentFrame}
              shapeKeys={shapeKeys}
              nlaActions={nlaActions}
              nlaTracks={nlaTracks}
            />
          ) : (
            <MeshEditorPanel
              stats={stats}
              onApplyFunction={handleApplyFunction}
              onAddPrimitive={addPrimitive}
            />
          )
        }
        centerPanel={
          <div className={activeWorkspace === "Sculpt" ? "mesh-editor-canvas mesh-editor-canvas--sculpt" : "mesh-editor-canvas"}
            onMouseDown={e => {
              orbitButton.current = e.button;
              if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
                orbitDragging.current = false;
                orbitLast.current = { x: e.clientX, y: e.clientY };
                e.preventDefault();
                return;
              }
              if (e.button !== 0) return;
              mouseDownPos.current = { x: e.clientX, y: e.clientY };
              // Check gizmo handle click first
              if (gizmoRef.current && cameraRef.current && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                const ray = new THREE.Raycaster();
                ray.setFromCamera(new THREE.Vector2(mx, my), cameraRef.current);
                const handles = Object.values(gizmoRef.current.handles || {}).flat().filter(h => h && h.isMesh && h.material && h.material.side !== undefined);
                let hits = [];
                try { hits = handles.length ? ray.intersectObjects(handles, true) : []; } catch (_e) { }
                if (hits.length > 0) {
                  const axis = hits[0].object.userData.axis;
                  if (axis) {
                    gizmoRef.current.startDrag(axis, hits[0].point);
                    gizmoDragging.current = true;
                    // Proportional editing: capture start positions of all scene objects so we can apply delta with falloff.
                    if (proportionalEnabled && gizmoRef.current?.target) {
                      const tgt = gizmoRef.current.target;
                      window._propStart = {
                        targetUUID: tgt.uuid,
                        targetPos: tgt.position.clone(),
                        neighbors: sceneObjectsRef.current
                          .filter((o) => o.mesh && o.mesh.uuid !== tgt.uuid)
                          .map((o) => ({ mesh: o.mesh, startPos: o.mesh.position.clone(), dist: o.mesh.position.distanceTo(tgt.position) })),
                      };
                    }
                    e.stopPropagation();
                    return;
                  }
                }
              }
              // Bone keyframing: raycast against bone helpers FIRST.
              // If a helper is hit, select the bone and skip object selection.
              if (boneHelpersRef.current.length > 0 && canvasRef.current && cameraRef.current) {
                const _bh_rect = canvasRef.current.getBoundingClientRect();
                const _bh_mx = ((e.clientX - _bh_rect.left) / _bh_rect.width) * 2 - 1;
                const _bh_my = -((e.clientY - _bh_rect.top) / _bh_rect.height) * 2 + 1;
                const _bh_ray = new THREE.Raycaster();
                _bh_ray.setFromCamera(new THREE.Vector2(_bh_mx, _bh_my), cameraRef.current);
                _bh_ray.params.Line.threshold = 0.05;
                let _bh_hits = [];
                try { _bh_hits = _bh_ray.intersectObjects(boneHelpersRef.current, false); } catch (_e) { }
                if (_bh_hits.length > 0) {
                  const _bh_hitHelper = _bh_hits[0].object;
                  const _bh_bone = _bh_hitHelper.userData.boneRef;
                  // Clear previous highlight, highlight new
                  boneHelpersRef.current.forEach((h) => {
                    if (h.material) h.material.color.setHex(0xff6600);
                  });
                  if (_bh_hitHelper.material) _bh_hitHelper.material.color.setHex(0xffff00); // yellow for selected
                  selectedBoneRef.current = _bh_bone;
                  setSelectedBoneId(_bh_bone.uuid);
                  setStatus("Selected bone: " + (_bh_bone.name || "_unnamed") + " (I = key)");
                  console.log("[bone-select]", _bh_bone.name, _bh_bone.uuid);
                  return; // Skip object selection
                } else {
                  // Clicked empty space -- deselect bone, dehighlight all
                  if (selectedBoneRef.current) {
                    boneHelpersRef.current.forEach((h) => {
                      if (h.material) h.material.color.setHex(0xff6600);
                    });
                    selectedBoneRef.current = null;
                    setSelectedBoneId(null);
                  }
                }
              }
              // Always try object selection on mousedown
              {
                const _sel_canvas = canvasRef.current;
                const _sel_camera = cameraRef.current;
                if (_sel_canvas && _sel_camera && sceneObjectsRef.current.length > 0) {
                  const _sel_rect = _sel_canvas.getBoundingClientRect();
                  const _sel_mx = ((e.clientX - _sel_rect.left) / _sel_rect.width) * 2 - 1;
                  const _sel_my = -((e.clientY - _sel_rect.top) / _sel_rect.height) * 2 + 1;
                  const _sel_ray = new THREE.Raycaster();
                  _sel_ray.setFromCamera(new THREE.Vector2(_sel_mx, _sel_my), _sel_camera);
                  const _sel_candidates = [];
                  sceneObjectsRef.current.forEach(o => {
                    if (!o.mesh) return;
                    o.mesh.updateMatrixWorld?.(true);
                    o.mesh.traverse(c => {
                      if (!c.isMesh || !c.visible || c.userData?.isHelper) return;
                      if (c.geometry?.computeBoundingSphere) c.geometry.computeBoundingSphere();
                      if (c.geometry?.computeBoundingBox) c.geometry.computeBoundingBox();
                      const mat = Array.isArray(c.material) ? c.material[0] : c.material;
                      if (mat && mat.side !== undefined) _sel_candidates.push(c);
                    });
                  });
                  let _sel_hits = [];
                  try { _sel_hits = _sel_candidates.length ? _sel_ray.intersectObjects(_sel_candidates, true) : []; } catch (_e) { }
                  console.log("[MD-SELECT] candidates:", _sel_candidates.length, "hits:", _sel_hits.length);
                  console.log("[MD-SELECT] rect:", JSON.stringify({ l: Math.round(_sel_rect.left), t: Math.round(_sel_rect.top), w: Math.round(_sel_rect.width), h: Math.round(_sel_rect.height) }));
                  console.log("[MD-SELECT] mouse:", e.clientX, e.clientY, "ndc:", _sel_mx.toFixed(2), _sel_my.toFixed(2));
                  if (_sel_hits.length > 0) {
                    const _sel_hit = _sel_hits[0].object;
                    const _sel_objs = sceneObjectsRef.current;
                    let _sel_match = _sel_objs.find(o => o.mesh === _sel_hit || o.mesh?.uuid === _sel_hit.uuid);
                    if (!_sel_match) _sel_objs.forEach(o => { if (!o.mesh) return; o.mesh.traverse(m => { if (m === _sel_hit) _sel_match = o; }); });
                    if (!_sel_match && _sel_objs.length > 0) {
                      let _d = Infinity;
                      _sel_objs.forEach(o => { if (!o.mesh) return; const dd = o.mesh.position.distanceTo(_sel_hits[0].point); if (dd < _d) { _d = dd; _sel_match = o; } });
                    }
                    if (_sel_match) selectSceneObject(_sel_match.id);
                  }
                }
              }
              if (activeWorkspace === "Sculpt") {
                if (!meshRef.current && sceneObjects.length > 0) {
                  const obj = sceneObjects.find(o => o.id === activeObjId) || sceneObjects[0];
                  if (obj?.mesh) meshRef.current = obj.mesh;
                }
                if (meshRef.current) {
                  sculptingRef.current = true;
                  editModeRef.current = "sculpt";
                  applySculpt(e);
                }
              } else if (editModeRef.current === "object") {
                // Start box select drag — click handled on mouseup
                const canvas = canvasRef.current;
                if (canvas) {
                  const rect = canvas.getBoundingClientRect();
                  boxSelectStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                  boxSelectActive.current = false;
                }
              } else if (editModeRef.current === "edit") {
                onCanvasClick(e);
                onKnifeClick(e);
              }
            }}
            onMouseMove={e => {
              if (e.button === 1 || e.button === 2 || orbitButton.current === 1 || orbitButton.current === 2 || (e.altKey && orbitButton.current === 0)) {
                if (!orbitDragging.current && (Math.abs(e.clientX - orbitLast.current.x) > 3 || Math.abs(e.clientY - orbitLast.current.y) > 3)) {
                  orbitDragging.current = true;
                }
              }
              if (orbitDragging.current) {
                const dx = e.clientX - orbitLast.current.x;
                const dy = e.clientY - orbitLast.current.y;
                orbitLast.current = { x: e.clientX, y: e.clientY };
                const camera = cameraRef.current;
                if (!camera) return;
                if (e.button === 1 || (orbitButton.current === 1) || (e.altKey && orbitButton.current === 0)) {
                  // Orbit
                  orbitState.current.theta -= dx * 0.01;
                  orbitState.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitState.current.phi + dy * 0.01));
                } else if (orbitButton.current === 2) {
                  // Pan
                  const panSpeed = orbitState.current.radius * 0.001;
                  camera.position.x -= dx * panSpeed;
                  camera.position.y += dy * panSpeed;
                  return;
                }
                const { theta, phi, radius } = orbitState.current;
                camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
                camera.position.y = radius * Math.cos(phi);
                camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
                camera.lookAt(0, 0, 0);
                return;
              }
              if (gizmoDragging.current && gizmoRef.current && cameraRef.current && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                const ray = new THREE.Raycaster();
                ray.setFromCamera(new THREE.Vector2(mx, my), cameraRef.current);
                const axis = gizmoRef.current.dragging?.axis;
                const mode = gizmoRef.current.mode;
                const gizmoPos = gizmoRef.current.group.position;

                // Plane selection for smooth drag:
                //  - Rotate: plane perpendicular to rotation axis (never edge-on)
                //  - Scale:  plane facing camera (avoids axis-parallel collapse)
                //  - Move:   plane perpendicular to the non-moving axes
                let planeNormal;
                if (mode === "rotate") {
                  if (axis === "x") planeNormal = new THREE.Vector3(1, 0, 0);
                  else if (axis === "y") planeNormal = new THREE.Vector3(0, 1, 0);
                  else planeNormal = new THREE.Vector3(0, 0, 1);
                } else if (mode === "scale") {
                  // Always use camera-facing plane for stable pixel->scale mapping
                  planeNormal = cameraRef.current.position.clone().sub(gizmoPos).normalize();
                } else {
                  // Move — existing logic
                  if (axis === "y") {
                    const camDir = cameraRef.current.position.clone().normalize();
                    planeNormal = new THREE.Vector3(camDir.x, 0, camDir.z).normalize();
                  } else if (axis === "x") {
                    planeNormal = new THREE.Vector3(0, 0, 1);
                  } else {
                    planeNormal = new THREE.Vector3(1, 0, 0);
                  }
                }

                const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, gizmoPos);
                const pt = new THREE.Vector3();
                const hit = ray.ray.intersectPlane(plane, pt);
                if (hit) {
                  // Grid snap: quantize pt to snapSize step before drag when snap is on.
                  if (snapEnabled && snapMode === "grid" && snapSize > 0) {
                    pt.x = Math.round(pt.x / snapSize) * snapSize;
                    pt.y = Math.round(pt.y / snapSize) * snapSize;
                    pt.z = Math.round(pt.z / snapSize) * snapSize;
                  }
                  gizmoRef.current.drag(pt);
                  // Proportional editing: apply falloff-scaled delta to neighbor objects within radius.
                  if (proportionalEnabled && window._propStart && gizmoRef.current?.target) {
                    const tgt = gizmoRef.current.target;
                    const delta = new THREE.Vector3().subVectors(tgt.position, window._propStart.targetPos);
                    const r = proportionalRadius;
                    window._propStart.neighbors.forEach((n) => {
                      if (n.dist >= r) return;
                      const d = n.dist / r; // 0..1
                      let w;
                      if (proportionalFalloff === "linear") w = 1 - d;
                      else if (proportionalFalloff === "sharp") w = (1 - d) * (1 - d);
                      else w = 0.5 * (1 + Math.cos(Math.PI * d)); // smooth (default)
                      n.mesh.position.x = n.startPos.x + delta.x * w;
                      n.mesh.position.y = n.startPos.y + delta.y * w;
                      n.mesh.position.z = n.startPos.z + delta.z * w;
                    });
                  }
                }
                return;
              }
              if (activeWorkspace === "Sculpt" && sculptingRef.current && meshRef.current) {
                applySculpt(e);
              } else if (editModeRef.current === "object" && boxSelectStart.current && !orbitDragging.current) {
                const canvas = canvasRef.current;
                if (canvas) {
                  const rect = canvas.getBoundingClientRect();
                  const cx = e.clientX - rect.left;
                  const cy = e.clientY - rect.top;
                  const dx = Math.abs(cx - boxSelectStart.current.x);
                  const dy = Math.abs(cy - boxSelectStart.current.y);
                  if (dx > 5 || dy > 5) {
                    boxSelectActive.current = true;
                    setBoxSelect({
                      x: Math.min(cx, boxSelectStart.current.x),
                      y: Math.min(cy, boxSelectStart.current.y),
                      w: dx, h: dy
                    });
                  }
                }
              } else {
                onSlideMouse(e);
              }
            }}
            onMouseUp={(e) => {
              if (gizmoDragging.current) {
                if (gizmoRef.current) gizmoRef.current.endDrag?.();
                // Auto-key: capture transform at drag-end if AUTO toggle is on.
                // Use currentFrameRef (not currentFrame from closure) to avoid stale-closure bug.
                if (isAutoKey && gizmoRef.current?.target && typeof window.keyAllTransform === "function") {
                  window.keyAllTransform(gizmoRef.current.target, currentFrameRef.current);
                  justKeyframed.current = true;
                  setTimeout(() => { justKeyframed.current = false; }, 100);
                }
                setTimeout(() => { gizmoDragging.current = false; }, 200);
                return;
              }
              const wasDragging = orbitDragging.current;
              const wasBox = boxSelectActive.current;
              const boxSnap = boxSelect;
              orbitDragging.current = false;
              orbitButton.current = -1;
              sculptingRef.current = false;
              confirmEdgeSlide();
              if (e.button !== 0) {
                boxSelectStart.current = null;
                boxSelectActive.current = false;
                setBoxSelect(null);
                return;
              }
              const _moveDist = Math.hypot(e.clientX - mouseDownPos.current.x, e.clientY - mouseDownPos.current.y);
              console.log("[SELECT] wasDragging:", wasDragging, "wasBox:", wasBox, "moveDist:", _moveDist.toFixed(1), "editMode:", editModeRef.current);
              if (editModeRef.current === "sculpt" || activeWorkspace === "Sculpt") {
                boxSelectStart.current = null;
                boxSelectActive.current = false;
                setBoxSelect(null);
                return;
              }
              if (wasDragging && !wasBox && _moveDist > 5) {
                boxSelectStart.current = null;
                boxSelectActive.current = false;
                setBoxSelect(null);
                return;
              }
              const canvas = canvasRef.current;
              const camera = cameraRef.current;
              if (!canvas || !camera) { boxSelectStart.current = null; setBoxSelect(null); return; }
              const rect = canvas.getBoundingClientRect();
              if (wasBox && boxSnap) {
                let picked = null;
                sceneObjectsRef.current.forEach(o => {
                  if (!o.mesh) return;
                  const pos = new THREE.Vector3();
                  pos.setFromMatrixPosition(o.mesh.matrixWorld);
                  pos.project(camera);
                  const sx = (pos.x + 1) / 2 * rect.width;
                  const sy = (-pos.y + 1) / 2 * rect.height;
                  if (sx >= boxSnap.x && sx <= boxSnap.x + boxSnap.w && sy >= boxSnap.y && sy <= boxSnap.y + boxSnap.h) {
                    picked = o.id;
                  }
                });
                if (picked) selectSceneObject(picked);
              } else {
                const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                const ray = new THREE.Raycaster();
                ray.setFromCamera(new THREE.Vector2(mx, my), camera);
                const candidates = [];
                sceneObjectsRef.current.forEach(o => {
                  if (!o.mesh) return;
                  o.mesh.updateMatrixWorld?.(true);
                  o.mesh.traverse(c => {
                    if (!c.isMesh || !c.visible || c.userData?.isHelper) return;
                    if (c.geometry?.computeBoundingSphere) c.geometry.computeBoundingSphere();
                    if (c.geometry?.computeBoundingBox) c.geometry.computeBoundingBox();
                    const mat = Array.isArray(c.material) ? c.material[0] : c.material;
                    if (mat && mat.side !== undefined) candidates.push(c);
                  });
                });
                let hits = [];
                try { hits = candidates.length ? ray.intersectObjects(candidates, true) : []; } catch (_e) { }
                if (hits.length > 0) {
                  const hitMesh = hits[0].object;
                  const objs = sceneObjectsRef.current;
                  let matched = objs.find(o => o.mesh === hitMesh || o.mesh?.uuid === hitMesh.uuid);
                  if (!matched && objs.length > 0) {
                    let minD = Infinity;
                    objs.forEach(o => { if (!o.mesh) return; const d = o.mesh.position.distanceTo(hits[0].point); if (d < minD) { minD = d; matched = o; } });
                  }
                  if (matched) selectSceneObject(matched.id);
                } else {
                  sceneObjectsRef.current.forEach(o => { if (o.mesh) o.mesh.traverse(m => { if (m.isMesh && m.material?.emissive) { m.material.emissive.set(0x000000); m.material.emissiveIntensity = 0; } }); });
                  setActiveObjId(null);
                  meshRef.current = null;
                }
              }
              boxSelectStart.current = null;
              boxSelectActive.current = false;
              setBoxSelect(null);
            }}
            onMouseLeave={() => {
              orbitDragging.current = false;
              sculptingRef.current = false;
            }}
            onWheel={e => {
              const camera = cameraRef.current;
              if (!camera) return;
              orbitState.current.radius = Math.max(1, Math.min(50, orbitState.current.radius + e.deltaY * 0.01));
              const { theta, phi, radius } = orbitState.current;
              camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
              camera.position.y = radius * Math.cos(phi);
              camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
              camera.lookAt(0, 0, 0);
            }}
            onContextMenu={e => e.preventDefault()}
          >

            <div className="viewport-toolbar">
              <button
                type="button"
                className={`quad-toggle-btn ${quadView ? "is-active" : ""}`}
                onClick={() => setQuadView((v) => !v)}
                title="Toggle quad view"
              >
                {quadView ? "Single" : "Quad"}
              </button>
            </div>

            <canvas ref={canvasRef} />
            <div className={`spx-fps-counter${fps < 30 ? ' spx-fps-counter--low' : ''}`}>
              FPS: {fps} | Δ: {polyCount.toLocaleString()}
            </div>
            {isAutoKey && (
              <div style={{
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#cc0000",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "1.5px",
                padding: "4px 12px",
                borderRadius: 3,
                fontFamily: "monospace",
                boxShadow: "0 0 12px rgba(204, 0, 0, 0.6)",
                animation: "spx-auto-pulse 1.5s ease-in-out infinite",
                zIndex: 10,
                pointerEvents: "none"
              }}>
                ● AUTO KEY ON
              </div>
            )}

            {/* XYZ orientation gizmo — top right corner */}
            <div className="spx-xyz-gizmo" style={{ position: "absolute", top: 8, right: 8, left: "auto", zIndex: 10, pointerEvents: "none" }}>
              <svg viewBox="0 0 64 64" width="64" height="64">
                <line x1="32" y1="32" x2="54" y2="44" stroke="#e44" strokeWidth="2" />
                <line x1="32" y1="32" x2="32" y2="8" stroke="#4e4" strokeWidth="2" />
                <line x1="32" y1="32" x2="12" y2="44" stroke="#44e" strokeWidth="2" />
                <circle cx="54" cy="44" r="5" fill="#e44" />
                <circle cx="32" cy="8" r="5" fill="#4e4" />
                <circle cx="12" cy="44" r="5" fill="#44e" />
                <text x="57" y="47" fontSize="8" fill="#e44" fontFamily="monospace">X</text>
                <text x="29" y="6" fontSize="8" fill="#4e4" fontFamily="monospace">Y</text>
                <text x="4" y="47" fontSize="8" fill="#44e" fontFamily="monospace">Z</text>
              </svg>
            </div>
            {/* Viewport labels */}
            {quadView === false && <div className="spx-viewport-label">
              {editMode === 'edit' ? (selectMode === 'vert' ? 'VERTEX' : selectMode === 'edge' ? 'EDGE' : 'FACE') + ' EDIT' : 'Perspective'} · {activeWorkspace}
            </div>}
            {/* end single label */}
            {quadView && (
              <div className="spx-quad-labels">
                <div className="spx-quad-label spx-quad-label--tl">Perspective</div>
                <div className="spx-quad-label spx-quad-label--tr">Top</div>
                <div className="spx-quad-label spx-quad-label--bl">Front</div>
                <div className="spx-quad-label spx-quad-label--br">Right</div>
              </div>
            )}
            {boxSelect && (
              <div className="spx-box-select" style={{ left: boxSelect.x, top: boxSelect.y, width: boxSelect.w, height: boxSelect.h }} />
            )}
          </div>
        }
        rightPanel={
          <div className="spx-right-panel">
            <SceneOutliner
              sceneObjects={sceneObjects}
              activeObjId={activeObjId}
              onSelect={selectSceneObject}
              onRename={renameSceneObject}
              onDelete={deleteSceneObject}
              onToggleVisible={toggleSceneObjectVisible}
              onAddPrimitive={addPrimitive}
            />
            <div className="spx-right-panel__lower">
              {showNPanel ? (
                <FeatureIndexPanel
                  activeWorkspace={activeWorkspace}
                  onApplyFunction={handleApplyFunction}
                />
              ) : (
                <PropertiesPanel
                  key={`props-${activeObjId}-${transformVersion}`}
                  stats={stats}
                  activeObj={meshRef.current}
                />
              )}
            </div>







            {/* Model picker trigger button */}
            <button
              onClick={() => { setModelPickerContext("general"); setShowModelPicker(v => !v); }}
              title="Switch character model"
              className={`spx-model-picker-btn${showModelPicker ? ' spx-model-picker-btn--active' : ''}`}>
              🧍 {activeModelUrl ? activeModelUrl.split("/").pop().replace(".glb", "") : "Model"}
            </button>

            <div className="spx-native-workspace-tabs">
              {['Modeling', 'Sculpt', 'Animation', 'Shading'].map(ws => (
                <button key={ws} type="button"
                  className={'spx-native-workspace-tab' + (activeWorkspace === ws ? ' is-active' : '')}
                  onClick={() => setActiveWorkspace(ws)}>
                  <span className="spx-native-workspace-tab-label" style={{ color: activeWorkspace === ws ? '#00ffc8' : undefined }}>{ws.toUpperCase()}</span>
                </button>
              ))}
              <SpxTabGroup label="SURFACE" color="#00ffc8" tabs={[
                { label: "UV", fn: () => { closeAllWorkspacePanels(); setUvPanelOpen(true); } },
                { label: "Materials", fn: () => { closeAllWorkspacePanels(); setMaterialPanelOpen(true); setPaintPanelOpen(true); } },
                { label: "Node Mat", fn: () => { closeAllWorkspacePanels(); setNodeEditorOpen(true); } },
                { label: "Clothing", fn: () => { closeAllWorkspacePanels(); setClothingPanelOpen(true); setPatternPanelOpen(true); } },
                { label: "Hair", fn: () => { closeAllWorkspacePanels(); setHairPanelOpen(true); } },
                { label: "Displace", fn: () => { closeAllWorkspacePanels(); setDisplacementOpen(true); } },
              ]} />
              <SpxTabGroup label="RIG" color="#ff88ff" tabs={[
                { label: "Rigging", fn: () => { closeAllWorkspacePanels(); setAutoRigOpen(true); } },
                { label: "MoCap", fn: () => openWorkspaceTool("mocap") },
                { label: "Retarget", fn: () => { closeAllWorkspacePanels(); setMocapRetargetOpen(true); } },
                { label: "Gamepad", fn: () => openWorkspaceTool("gamepad") },
              ]} />
              <SpxTabGroup label="RENDER" color="#ffdd44" tabs={[
                { label: "Cin Light", fn: () => { closeAllWorkspacePanels(); setCinLightOpen(true); } },
                { label: "Lighting", fn: () => { closeAllWorkspacePanels(); setLightingCameraPanelOpen(true); } },
                { label: "Camera", fn: () => { closeAllWorkspacePanels(); setFilmCameraOpen(true); } },
                { label: "Volume", fn: () => { closeAllWorkspacePanels(); setFilmVolOpen(true); } },
                { label: "Path Trace", fn: () => { closeAllWorkspacePanels(); setFilmPTOpen(true); } },
                { label: "Post FX", fn: () => { closeAllWorkspacePanels(); setFilmPostOpen(true); } },
                { label: "Render Farm", fn: () => { closeAllWorkspacePanels(); setRenderFarmOpen(true); } },
              ]} />
              <SpxTabGroup label="FX" color="#ff6644" tabs={[
                { label: "Cloth Sim", fn: () => { closeAllWorkspacePanels(); setClothSimOpen(true); } },
                { label: "Fluid", fn: () => { closeAllWorkspacePanels(); setFluidPanelOpen(true); } },
                { label: "Weather", fn: () => { closeAllWorkspacePanels(); setWeatherPanelOpen(true); } },
                { label: "Destruction", fn: () => { closeAllWorkspacePanels(); setDestructionPanelOpen(true); } },
                { label: "Physics", fn: () => { closeAllWorkspacePanels(); setPhysicsOpen(true); } },
                { label: "Particles", fn: () => { closeAllWorkspacePanels(); setFilmParticlePanelOpen(true); } },
              ]} />
              <SpxTabGroup label="WORLD" color="#44aaff" tabs={[
                { label: "Environment", fn: () => { closeAllWorkspacePanels(); setEnvGenOpen(true); } },
                { label: "Terrain", fn: () => { closeAllWorkspacePanels(); setTerrainOpen(true); } },
                { label: "City Gen", fn: () => { closeAllWorkspacePanels(); setCityGenOpen(true); } },
                { label: "Crowd", fn: () => { closeAllWorkspacePanels(); setCrowdGenOpen(true); } },
              ]} />
              <SpxTabGroup label="GEN" color="#FF6600" tabs={[
                { label: "Pro Mesh", fn: () => { closeAllWorkspacePanels(); setProMeshOpen(true); } },
                { label: "Modifiers", fn: () => { closeAllWorkspacePanels(); setModifierStackOpen(true); } },
                { label: "Constraints", fn: () => { closeAllWorkspacePanels(); setConstraintsPanelOpen(true); } },
                { label: "Geometry Nodes", fn: () => { closeAllWorkspacePanels(); setGeoNodesPanelOpen(true); } },
                { label: "Drivers", fn: () => { closeAllWorkspacePanels(); setDriversPanelOpen(true); } },
                { label: "NLA", fn: () => { closeAllWorkspacePanels(); setNlaPanelOpen(true); } },
                { label: "Graph Editor", fn: () => { closeAllWorkspacePanels(); setGraphEditorOpen(true); } },
                { label: "Skin Gen", fn: () => { closeAllWorkspacePanels(); setCustomSkinPanelOpen(true); } },
                { label: "3D→2D Style", fn: () => { closeAllWorkspacePanels(); setStyle3DTo2DOpen(true); } },
                { label: "Anim Graph", fn: () => { closeAllWorkspacePanels(); setAnimGraphOpen(true); } },
                { label: "Mesh Script", fn: () => { closeAllWorkspacePanels(); setMeshScriptOpen(true); } },
                { label: "Multi MoCap", fn: () => { closeAllWorkspacePanels(); setMocapWorkspaceOpen(true); } },
              ]} />
              <button type="button" className="spx-native-workspace-tab spx-native-workspace-tab--right" onClick={() => setShowPerformancePanel(v => !v)}>
                <span className="spx-native-workspace-tab-label" style={{ color: showPerformancePanel ? "#00ffc8" : undefined }}>PERF</span>
              </button>

            </div>
          </div>
        }
        bottomPanel={
          <AnimationTimeline
            currentFrame={currentFrame}
            setCurrentFrame={setCurrentFrame}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            isAutoKey={isAutoKey}
            setAutoKey={setAutoKey}
            handleApplyFunction={handleApplyFunction}
            videoStartFrame={videoStartFrame}
            videoEndFrame={videoEndFrame}
            setVideoStartFrame={setVideoStartFrame}
            setVideoEndFrame={setVideoEndFrame}
            videoFps={videoFps}
            setVideoFps={setVideoFps}
            sceneObjects={sceneObjects}
            animKeys={animKeys}
            activeObjUUID={selectedObject?.uuid || meshRef.current?.uuid}
            keyframeVersion={keyframeVersion}
            onAddKeyframe={() => handleApplyFunction("add_keyframe")}
            onDeleteKeyframe={(frame) => {
              const target = selectedObject || meshRef.current;
              if (target && window.deleteKeyframe) {
                window.deleteKeyframe(target.uuid, frame);
              }
            }}
          />
        }
      />
      <>





        {customSkinPanelOpen && (
          <CustomSkinBuilderPanel
            open={customSkinPanelOpen}
            onClose={() => setCustomSkinPanelOpen(false)}
            onApply={(params) => { setCustomSkin(params); if (meshRef.current && typeof buildCustomSkin === 'function') { buildCustomSkin(meshRef.current, params); setStatus('Custom skin applied'); } }}
            onDownload={(params) => { setCustomSkin(params); if (typeof generateFullSkinTextures === 'function') { const t = generateFullSkinTextures({ size: params.textureSize, poreScale: params.poreScale, wrinkleStrength: params.wrinkleStrength, age: params.age, region: params.region });['color', 'roughness', 'normal', 'ao'].forEach(k => { const a = document.createElement('a'); a.href = t[k].toDataURL('image/png'); a.download = 'spx_custom_' + k + '.png'; a.click(); }); setStatus('Custom textures downloaded'); } }}
          />
        )}

        {denoiserOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">⚡ AI DENOISER</span>
              <button onClick={() => setDenoiserOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body">
              <DenoiserPanel open={denoiserOpen} onClose={() => setDenoiserOpen(false)} rendererRef={rendererRef} setStatus={setStatus} />
            </div>
          </div>
        )}

        {compositorOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">🎬 NODE COMPOSITOR</span>
              <button onClick={() => setCompositorOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body">
              <NodeCompositorPanel open={compositorOpen} onClose={() => setCompositorOpen(false)} />
            </div>
          </div>
        )}
        {style3DTo2DOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">🎨 3D → 2D STYLE</span>
              <button onClick={() => setStyle3DTo2DOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body">
              <SPX3DTo2DPanel open={style3DTo2DOpen} onClose={() => setStyle3DTo2DOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} cameraRef={cameraRef} mixerRef={mixerRef} />
            </div>
          </div>
        )}
        <AutoRigPanel
          open={autoRigOpen}
          onClose={() => setAutoRigOpen(false)}
          sceneRef={sceneRef}
          setStatus={setStatus}
        />

        <AdvancedRigPanel
          open={advancedRigOpen}
          onClose={() => setAdvancedRigOpen(false)}
          sceneRef={sceneRef}
          setStatus={setStatus}
        />


        {/* ── Model Picker ── */}
        {showModelPicker && (
          <div className="spx-model-picker-panel">
            <span className="spx-model-picker__label">MODEL</span>
            {[
              { url: "/models/michelle.glb", label: "Michelle", thumb: "👩", desc: "Female character" },
              { url: "/models/xbot.glb", label: "X Bot", thumb: "🤖", desc: "Male Mixamo rig" },
              { url: "/models/ybot.glb", label: "Y Bot", thumb: "🦾", desc: "Female Mixamo rig" },
            ].map(m => (
              <button key={m.url} onClick={() => loadModelToScene(m.url, m.label)}
                className={`spx-model-picker__card${activeModelUrl === m.url ? ' spx-model-picker__card--active' : ''}`}>
                <span className="spx-model-picker__thumb">{m.thumb}</span>
                <span className="spx-model-picker__name">{m.label}</span>
                <span className="spx-model-picker__desc">{m.desc}</span>
              </button>
            ))}
            {/* Upload custom GLB */}
            <label className="spx-model-picker__upload">
              <span className="spx-model-picker__thumb">📂</span>
              <span className="spx-model-picker__name">Upload</span>
              <span className="spx-model-picker__desc">Custom GLB</span>
              <input type="file" accept=".glb,.gltf" className="spx-hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  loadModelToScene(url, file.name.replace(/\.[^.]+$/, ""));
                }} />
            </label>
            {/* Use scene mesh if available */}
            {sceneObjects.length > 0 && (
              <button onClick={() => {
                const first = sceneObjects.find(o => o.mesh);
                if (first) { setActiveObjId(first.id); meshRef.current = first.mesh; setActiveModelUrl(null); setShowModelPicker(false); setStatus("Using scene mesh: " + first.name); }
              }} className="spx-model-picker__card spx-model-picker__card--orange">
                <span className="spx-model-picker__thumb">🎯</span>
                <span className="spx-model-picker__name">Use Mine</span>
                <span className="spx-model-picker__desc">Scene mesh</span>
              </button>
            )}
            <button onClick={() => setShowModelPicker(false)}
              className="spx-model-picker__close">✕</button>
          </div>
        )}

        {/* Lighting & Camera Panel */}
        {filmCameraOpen && <FloatPanel title="FILM CAMERA" onClose={() => setFilmCameraOpen(false)} width={420}><FilmCameraPanel cameraRef={cameraRef} rendererRef={rendererRef} sceneRef={sceneRef} open={filmCameraOpen} onClose={() => setFilmCameraOpen(false)} />
          <FilmSkinPanel open={filmSkinPanelOpen} onClose={() => setFilmSkinPanelOpen(false)} meshRef={meshRef} setStatus={setStatus} />
          <FilmHairPanel open={filmHairPanelOpen} onClose={() => setFilmHairPanelOpen(false)} meshRef={meshRef} setStatus={setStatus} />
          <GroomBrushPanel open={groomBrushPanelOpen} onClose={() => setGroomBrushPanelOpen(false)} meshRef={meshRef} setStatus={setStatus} />
          <BraidGeneratorPanel open={braidGeneratorPanelOpen} onClose={() => setBraidGeneratorPanelOpen(false)} meshRef={meshRef} setStatus={setStatus} />
          <FadeToolPanel open={fadeToolPanelOpen} onClose={() => setFadeToolPanelOpen(false)} meshRef={meshRef} setStatus={setStatus} />
          <HairCardLODPanel open={hairCardLODPanelOpen} onClose={() => setHairCardLODPanelOpen(false)} meshRef={meshRef} setStatus={setStatus} />
          const [groomBrushPanelOpen, setGroomBrushPanelOpen] = useState(false);
          const [braidGeneratorPanelOpen, setBraidGeneratorPanelOpen] = useState(false);
          const [fadeToolPanelOpen, setFadeToolPanelOpen] = useState(false);
          const [hairCardLODPanelOpen, setHairCardLODPanelOpen] = useState(false);
          <FilmParticlePanel open={filmParticlePanelOpen} onClose={() => setFilmParticlePanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
          {mocapRetargetOpen && (
            <MocapRetargetPanel
              open={mocapRetargetOpen}
              onClose={() => setMocapRetargetOpen(false)}
              armatures={armatures}
              setStatus={setStatus}
            />
          )}
          {renderFarmOpen && (
            <RenderFarmPanel
              open={renderFarmOpen}
              onClose={() => setRenderFarmOpen(false)}
              rendererRef={rendererRef}
              sceneRef={sceneRef}
              cameraRef={cameraRef}
              setStatus={setStatus}
            />
          )}
          <FilmWeatherPanel open={filmWeatherPanelOpen} onClose={() => setFilmWeatherPanelOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} /></FloatPanel>}
        {filmVolOpen && <FloatPanel title="VOLUMETRICS" onClose={() => setFilmVolOpen(false)} width={420}><FilmVolumetricsPanel sceneRef={sceneRef} open={filmVolOpen} onClose={() => setFilmVolOpen(false)} /></FloatPanel>}
        {filmPTOpen && <FloatPanel title="PATH TRACER" onClose={() => setFilmPTOpen(false)} width={420}><FilmPathTracerPanel rendererRef={rendererRef} sceneRef={sceneRef} cameraRef={cameraRef} open={filmPTOpen} onClose={() => setFilmPTOpen(false)} /></FloatPanel>}
        {cinLightOpen && <FloatPanel title="CINEMATIC LIGHTING" onClose={() => setCinLightOpen(false)} width={420}><CinematicLightingPanel sceneRef={sceneRef} open={cinLightOpen} onClose={() => setCinLightOpen(false)} /></FloatPanel>}
        {lightingCameraPanelOpen && (
          <FloatPanel title="LIGHTING & CAMERA" onClose={() => setLightingCameraPanelOpen(false)} width={380}>
            <LightingCameraPanel
              sceneRef={sceneRef}
              cameraRef={cameraRef}
              cameras={cameras}
              onApplyFunction={handleApplyFunction}
              onClose={() => setLightingCameraPanelOpen(false)}
            />
          </FloatPanel>
        )}

        {/* Collaborate Panel */}
        {collaboratePanelOpen && <FloatPanel title="COLLABORATE" onClose={() => setCollaboratePanelOpen(false)} width={360}>
          <CollaboratePanel sceneObjects={sceneObjects} onClose={() => setCollaboratePanelOpen(false)} />
        </FloatPanel>}
        {animGraphOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">🔗 ANIMATION GRAPH</span>
              <button onClick={() => setAnimGraphOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body" style={{ flexDirection: 'row' }}>
              <LiveViewportMirror rendererRef={rendererRef} open={animGraphOpen} label="3D SCENE — LIVE" />
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} />
              </div>
            </div>
          </div>
        )}
        {meshScriptOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">📝 MESH SCRIPT</span>
              <button onClick={() => setMeshScriptOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body" style={{ flexDirection: 'row' }}>
              <LiveViewportMirror rendererRef={rendererRef} open={meshScriptOpen} label="3D SCENE — SCRIPT OUTPUT" />
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <MeshScriptPanel open={meshScriptOpen} onClose={() => setMeshScriptOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />
              </div>
            </div>
          </div>
        )}

        {/* SPX Sketch Panel */}
        {greasePencilPanelOpen && <FloatPanel title="SPX SKETCH" onClose={() => setGreasePencilPanelOpen(false)} width={320}>
          <GreasePencilPanel onApplyFunction={handleApplyFunction} onClose={() => setGreasePencilPanelOpen(false)} />
        </FloatPanel>}


        {/* ══ VFX PANELS ══ */}
        {fluidPanelOpen && <FloatPanel title="FLUID SIMULATION" onClose={() => setFluidPanelOpen(false)} width={400}>
          <FluidPanel open={fluidPanelOpen} onClose={() => setFluidPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
        </FloatPanel>}
        {weatherPanelOpen && <FloatPanel title="ATMOSPHERICS" onClose={() => setWeatherPanelOpen(false)} width={400}>
          <WeatherPanel open={weatherPanelOpen} onClose={() => setWeatherPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
        </FloatPanel>}
        {clothSimOpen && <FloatPanel title="CLOTH SIM" onClose={() => setClothSimOpen(false)} width={420}>
          <ClothSimPanel open={clothSimOpen} onClose={() => setClothSimOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
        </FloatPanel>}

        {filmPostOpen && <FloatPanel title="FILM POST FX" onClose={() => setFilmPostOpen(false)} width={480}>
          <FilmPostPanel open={filmPostOpen} onClose={() => setFilmPostOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />
        </FloatPanel>}
        {displacementOpen && <FloatPanel title="DISPLACEMENT" onClose={() => setDisplacementOpen(false)} width={400}>
          <DisplacementPanel open={displacementOpen} onClose={() => setDisplacementOpen(false)} meshRef={meshRef} setStatus={setStatus} />
        </FloatPanel>}
        {proMeshOpen && (
          <FloatPanel title="PRO MESH" onClose={() => setProMeshOpen(false)} width={360}>
            <ProMeshPanelNew open={proMeshOpen} onClose={() => setProMeshOpen(false)} />
          </FloatPanel>
        )}
        {modifierStackOpen && (
          <FloatPanel title="MODIFIER STACK" onClose={() => setModifierStackOpen(false)} width={340}>
            <ModifierStackPanel meshRef={meshRef} setStatus={setStatus} onClose={() => setModifierStackOpen(false)} />
          </FloatPanel>
        )}
        {constraintsPanelOpen && (
          <FloatPanel title="CONSTRAINTS" onClose={() => setConstraintsPanelOpen(false)} width={360}>
            <ConstraintsPanel meshRef={meshRef} sceneObjects={sceneObjects} setStatus={setStatus} onClose={() => setConstraintsPanelOpen(false)} />
          </FloatPanel>
        )}
        {geoNodesPanelOpen && (
          <FloatPanel title="GEOMETRY NODES" onClose={() => setGeoNodesPanelOpen(false)} width={380}>
            <GeometryNodesPanel meshRef={meshRef} setStatus={setStatus} onClose={() => setGeoNodesPanelOpen(false)} />
          </FloatPanel>
        )}
        {driversPanelOpen && (
          <FloatPanel title="DRIVERS" onClose={() => setDriversPanelOpen(false)} width={380}>
            <DriversPanel meshRef={meshRef} sceneObjects={sceneObjects} currentFrame={currentFrame} setStatus={setStatus} onClose={() => setDriversPanelOpen(false)} />
          </FloatPanel>
        )}
        {nlaPanelOpen && (
          <FloatPanel title="NLA" onClose={() => setNlaPanelOpen(false)} width={420}>
            <NLAPanel meshRef={meshRef} sceneObjects={sceneObjects} currentFrame={currentFrame} setStatus={setStatus} onClose={() => setNlaPanelOpen(false)} />
          </FloatPanel>
        )}
        {graphEditorOpen && (
          <FloatPanel title="GRAPH EDITOR" onClose={() => setGraphEditorOpen(false)} width={400}>
            <GraphEditorPanel meshRef={meshRef} sceneObjects={sceneObjects} currentFrame={currentFrame} setStatus={setStatus} onClose={() => setGraphEditorOpen(false)} />
          </FloatPanel>
        )}
        {showPerformancePanel && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">⚡ SPX PERFORMANCE CAPTURE</span>
              <button onClick={() => setShowPerformancePanel(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body">
              <SPXPerformancePanel sceneObjects={sceneObjects} activeObjId={activeObjId} />
            </div>
          </div>
        )}
        {destructionPanelOpen && <FloatPanel title="DESTRUCTION LAB" onClose={() => setDestructionPanelOpen(false)} width={420}>
          <DestructionPanel open={destructionPanelOpen} onClose={() => setDestructionPanelOpen(false)} sceneRef={sceneRef} meshRef={meshRef} setStatus={setStatus} onApplyFunction={handleApplyFunction} />
        </FloatPanel>}

        {/* ══ WORLD / GENERATOR PANELS (full-screen overlays with own viewport) ══ */}
        {envGenOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">🌲 ENVIRONMENT GENERATOR</span>
              <button onClick={() => setEnvGenOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body">
              <EnvironmentGenerator open={envGenOpen} onClose={() => setEnvGenOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />
            </div>
          </div>
        )}
        {cityGenOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">🏙️ CITY GENERATOR</span>
              <button onClick={() => setCityGenOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body">
              <CityGenerator open={cityGenOpen} onClose={() => setCityGenOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />
            </div>
          </div>
        )}
        {buildingOpen && <FloatPanel title="BUILDING SIMULATOR" onClose={() => setBuildingOpen(false)} width={480}><BuildingSimulator open={buildingOpen} onClose={() => setBuildingOpen(false)} /></FloatPanel>}
        {crowdGenOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">👥 CROWD GENERATOR</span>
              <button onClick={() => setCrowdGenOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body">
              <ProceduralCrowdGenerator open={crowdGenOpen} onClose={() => setCrowdGenOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />
            </div>
          </div>
        )}
        {terrainOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">🏔️ TERRAIN SCULPTING</span>
              <button onClick={() => setTerrainOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body">
              <TerrainSculpting open={terrainOpen} onClose={() => setTerrainOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />
            </div>
          </div>
        )}
        {/* ProMesh renders via FloatPanel above */}
        {physicsOpen && <FloatPanel title="PHYSICS SIMULATION" onClose={() => setPhysicsOpen(false)} width={520}>
          <PhysicsSimulation open={physicsOpen} onClose={() => setPhysicsOpen(false)} />
        </FloatPanel>}
        {assetLibOpen && <FloatPanel title="ASSET LIBRARY" onClose={() => setAssetLibOpen(false)} width={480}><AssetLibraryPanel open={assetLibOpen} onClose={() => setAssetLibOpen(false)} /></FloatPanel>}
        {nodeModOpen && <FloatPanel title="NODE MODIFIER SYSTEM" onClose={() => setNodeModOpen(false)} width={480}><NodeModifierSystem open={nodeModOpen} onClose={() => setNodeModOpen(false)} /></FloatPanel>}

        {(faceGenOpen || foliageGenOpen || vehicleGenOpen || creatureGenOpen || propGenOpen) && (
          <div className="spx-side-panel spx-side-panel--320">
            <div className="spx-gen-panel-header">
              <span className="spx-gen-panel-title">
                {faceGenOpen ? "Face Generator" : foliageGenOpen ? "Foliage Generator" : vehicleGenOpen ? "Vehicle Generator" : creatureGenOpen ? "Creature Generator" : "Prop Generator"}
              </span>
              <button onClick={() => { setFaceGenOpen(false); setFoliageGenOpen(false); setVehicleGenOpen(false); setCreatureGenOpen(false); setPropGenOpen(false); }} className="spx-overlay-close">×</button>
            </div>
            <div className="spx-gen-panel-body">
              {faceGenOpen && <FaceGeneratorPanel sceneRef={sceneRef} setStatus={setStatus} />}
              {foliageGenOpen && <FoliageGeneratorPanel sceneRef={sceneRef} setStatus={setStatus} />}
              {vehicleGenOpen && <VehicleGeneratorPanel sceneRef={sceneRef} setStatus={setStatus} />}
              {creatureGenOpen && <CreatureGeneratorPanel sceneRef={sceneRef} setStatus={setStatus} />}
              {propGenOpen && <PropGeneratorPanel sceneRef={sceneRef} setStatus={setStatus} />}
            </div>
          </div>
        )}

        <MocapWorkspace
          open={mocapWorkspaceOpen}
          onClose={() => setMocapWorkspaceOpen(false)}
          onExportGlb={() => window.dispatchEvent(new CustomEvent("spx:mocap-export-glb"))}
        />
        <RenderWorkspacePanel
          open={renderWorkspaceOpen}
          onClose={() => setRenderWorkspaceOpen(false)}
          sceneRef={sceneRef}
          canvasRef={canvasRef}
          setStatus={setStatus}
        />
        {gamepadOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">🎮 GAMEPAD ANIMATOR</span>
              <button onClick={() => setGamepadOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body">
              <GamepadAnimator open={gamepadOpen} onClose={() => setGamepadOpen(false)} sceneRef={sceneRef} meshRef={meshRef} setStatus={setStatus} onApplyFunction={handleApplyFunction} currentFrame={currentFrame} setCurrentFrame={setCurrentFrame} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
            </div>
          </div>
        )}


        {uvPanelOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">✂ UV EDITOR</span>
              <button onClick={() => setUvPanelOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body" style={{ padding: 0, overflow: 'hidden' }}>
              <UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)} rendererRef={rendererRef} />
            </div>
          </div>
        )}
        {materialPanelOpen && <FloatPanel title="MATERIALS" onClose={() => setMaterialPanelOpen(false)} width={480}>
          <MaterialPanel open={materialPanelOpen} onClose={() => setMaterialPanelOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} />
        </FloatPanel>}
        {paintPanelOpen && <FloatPanel title="TEXTURE PAINT" onClose={() => setPaintPanelOpen(false)} width={480}>
          <TexturePaintPanel open={paintPanelOpen} onClose={() => setPaintPanelOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} />
        </FloatPanel>}
        {nodeEditorOpen && (
          <div className="spx-fullscreen-overlay">
            <div className="spx-overlay-header">
              <span className="spx-overlay-title">🎨 NODE MATERIAL EDITOR</span>
              <button onClick={() => setNodeEditorOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
            </div>
            <div className="spx-overlay-body" style={{ padding: 0, overflow: 'hidden' }}>
              <NodeMaterialEditor open={nodeEditorOpen} onClose={() => setNodeEditorOpen(false)}
                meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: 0 }} />
            </div>
          </div>
        )}
        {clothingPanelOpen && <FloatPanel title="CLOTHING" onClose={() => setClothingPanelOpen(false)} width={480}>
          <ClothingPanel open={clothingPanelOpen} onClose={() => setClothingPanelOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} />
        </FloatPanel>}
        {fabricPanelOpen && <FloatPanel title="FABRIC" onClose={() => setFabricPanelOpen(false)} width={480}>
          <FabricPanel open={fabricPanelOpen} onClose={() => setFabricPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} panels={[]} />
        </FloatPanel>}
        {patternPanelOpen && <FloatPanel title="PATTERN EDITOR" onClose={() => setPatternPanelOpen(false)} width={600}>
          <PatternEditorPanel open={patternPanelOpen} onClose={() => setPatternPanelOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} />
        </FloatPanel>}
        {hairPanelOpen && <FloatPanel title="HAIR" onClose={() => setHairPanelOpen(false)} width={480}>
          <HairPanel open={hairPanelOpen} onClose={() => setHairPanelOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} />
        </FloatPanel>}
        {hairAdvancedOpen && <FloatPanel title="HAIR ADVANCED" onClose={() => setHairAdvancedOpen(false)} width={480}>
          <HairAdvancedPanel open={hairAdvancedOpen} onClose={() => setHairAdvancedOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} />
        </FloatPanel>}
        {hairFXOpen && <FloatPanel title="HAIR FX" onClose={() => setHairFXOpen(false)} width={480}>
          <HairFXPanel open={hairFXOpen} onClose={() => setHairFXOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} />
        </FloatPanel>}
      </>
      <DockSplitterHost />
      <SPXEditorProvider>
      <DockPanelHost
        meshRef={meshRef}
        sceneRef={sceneRef}
        rendererRef={rendererRef}
        setStatus={setStatus}
      />
      </SPXEditorProvider>
      <PanelHost
        meshRef={meshRef}
        sceneRef={sceneRef}
        rendererRef={rendererRef}
        setStatus={setStatus}
      />
    </>
  );
}
