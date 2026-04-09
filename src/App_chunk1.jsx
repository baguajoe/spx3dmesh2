import NodeCompositorPanel from './components/mesh/NodeCompositorPanel';
import CustomSkinBuilderPanel from './components/panels/CustomSkinBuilderPanel';
import SPX3DTo2DPanel from './components/pipeline/SPX3DTo2DPanel';
import { WORKSPACES, DEFAULT_WORKSPACE } from "./pro-ui/workspaceMap";
import CityGeneratorPanel from './components/panels/CityGeneratorPanel';
import VRPreviewPanel from './components/panels/VRPreviewPanel';
import CrowdGeneratorPanel from './components/panels/CrowdGeneratorPanel';
import EnvironmentGeneratorPanel from './components/panels/EnvironmentGeneratorPanel';
import BuildingSimulatorPanel from './components/panels/BuildingSimulatorPanel';
import PhysicsSimulationPanel from './components/panels/PhysicsSimulationPanel';
import TerrainSculptingPanel from './components/panels/TerrainSculptingPanel';
import LightingStudioPanel from './components/panels/LightingStudioPanel';
import MaterialTexturePanel from './components/panels/MaterialTexturePanel';
import { ViewportHeader } from "./components/ViewportHeader";
import { PropertyInspector } from "./components/PropertyInspector";
import { Outliner } from "./components/Outliner";
import React, { useRef, useEffect, useState, useCallback } from "react";
import SPXPerformancePanel from "./components/SPXPerformancePanel.jsx";
import * as THREE from "three";
import { initFilmComposer, createProceduralHDRI, upgradeMaterialsToPhysical } from "./mesh/FilmRenderer.js";
import FilmPostPanel from "./components/panels/FilmPostPanel.jsx";
import FilmAssetLibrary from "./components/panels/FilmAssetLibrary.jsx";
import FilmMaterialPanel from "./components/panels/FilmMaterialPanel.jsx";
import FilmSculptPanel from "./components/panels/FilmSculptPanel.jsx";
import FilmCameraPanel from "./components/panels/FilmCameraPanel.jsx";
import NodeMaterialEditor from "./components/panels/NodeMaterialEditor.jsx";
import ClothSimPanel from "./components/panels/ClothSimPanel.jsx";
import DisplacementPanel from "./components/panels/DisplacementPanel.jsx";
import MocapRetargetPanel from "./components/panels/MocapRetargetPanel.jsx";
import CinematicLightingPanel from "./components/panels/CinematicLightingPanel.jsx";
import FilmVolumetricsPanel from "./components/panels/FilmVolumetricsPanel.jsx";
import FilmPathTracerPanel from "./components/panels/FilmPathTracerPanel.jsx";
import RotoscopePanel from "./components/panels/RotoscopePanel.jsx";
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
import { applyPreset, applyEdgeWear, applyCavityDirt, MATERIAL_PRESETS, DEFAULT_CUSTOM_SKIN } from "./mesh/SmartMaterials.js";
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
import { createPBRMaterial, applyPBRMaps, createSSSMaterial, createTransmissionMaterial, createDisplacementTexture, denoiseCanvas, createRenderQueue, addRenderJob, runRenderQueue, applyRenderPreset, applyToneMappingMode, captureFrame, downloadFrame, getRenderStats, RENDER_PRESETS, TONE_MAP_MODES, SSS_PRESETS, TRANSMISSION_PRESETS } from "./mesh/RenderSystem.js";
import { initVCAdvanced, addVCLayer, removeVCLayer, setVCLayerBlendMode, paintVCAdvanced, fillVCLayer, flattenVCLayers, smearVC, blurVCLayer, getVCStats } from "./mesh/VertexColorAdvanced.js";
import { buildRigFromDoppelflex, applyDoppelflexFrame, retargetDoppelflexToSPX, buildThreeSkeletonFromRig, serializeRig, getRigStats, DOPPELFLEX_LANDMARK_MAP } from "./mesh/DoppelflexRig.js";
import { createSSAOPass, createBloomPass, createDOFPass, createChromaticAberrationPass, createPostPassManager } from "./mesh/PostPassShaders.js";
import { applyStrandCollision, createDensityMap, generateBraidPreset, generateBunPreset, generatePonytailPreset, emitHairFromUV, getHairUpgradeStats } from "./mesh/HairUpgrade.js";
import { createParticle, createEmitter, emitParticles, stepEmitter, buildParticleSystem, updateParticleSystem, createDestructionEffect, stepDestructionFrags, getEmitterStats, VFX_PRESETS, EMITTER_TYPES } from "./mesh/VFXSystem.js";
import { createConstraint, applyLookAt, applyFloor, applyStretchTo, applyCopyLocation, applyCopyRotation, applyCopyScale, applyLimitLocation, applyDampedTrack, applyAllConstraints, CONSTRAINT_TYPES } from "./mesh/ConstraintSystem.js";
import { voxelRemesh, quadRemesh, symmetrizeMesh, getRemeshStats } from "./mesh/RemeshSystem.js";
import { createRenderFarm, addRenderFarmJob, cancelRenderJob, runNextRenderJob, getRenderFarmStats, detectWebGPU, getWebGLInfo, applyIBLToScene, setupCascadedShadows, enableShadowsOnScene, createNPROutlinePass } from "./mesh/RenderFarm.js";
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
import { createHairShaderMaterial, createToonMaterial, createPBRShaderMaterial, createOutlineMaterial, addOutlineToMesh, createHolographicMaterial, updateHolographicTime, createDissolveMaterial, setDissolveAmount, applyShaderPreset, SHADER_PRESETS } from "./mesh/GLSLShaders.js";
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
import LightingCameraPanel from "./components/scene/LightingCameraPanel.jsx";
import GamepadAnimator from "./components/animation/GamepadAnimator.jsx";
import MotionLibraryPanel from "./components/animation/MotionLibraryPanel";
import ProMeshPanel from "./components/mesh/ProMeshPanel.jsx";
import FluidPanel from "./components/vfx/FluidPanel.jsx";
import WeatherPanel from "./components/vfx/WeatherPanel.jsx";
import DestructionPanel from "./components/vfx/DestructionPanel.jsx";
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
import { applyCheckerToMesh, unwrapBoxProjection, exportUVLayoutGLB } from "./mesh/uv/UVUnwrap.js";
import { createQuadCameraSet, resizeQuadCameraSet, renderViewportSet, detectViewportFromPointer, getActiveViewportCamera, snapCameraToAxis } from "./mesh/MultiViewportSystem.js";
import "./styles/spx-app.css";

// ── Constants ──────────────────────────────────────────────────────────────
const TOOLS = [
  { id: "select",     icon: "↖", label: "Select (S)" },
  { id: "loop_cut",   icon: "⊞", label: "Loop Cut (Ctrl+R)" },
  { id: "edge_slide", icon: "⇔", label: "Edge Slide (G+G)" },
  { id: "knife",      icon: "✂", label: "Knife (K)" },
  { id: "extrude",    icon: "⬡", label: "Extrude (E)" },
  { id: "grab",       icon: "✋", label: "Grab (G)" },
  { id: "rotate",     icon: "↺", label: "Rotate (R)" },
  { id: "scale",      icon: "⤢", label: "Scale (S)" },
];

const PRIMITIVES = [
  { id: "box",       label: "Cube" },
  { id: "sphere",    label: "Sphere" },
  { id: "cylinder",  label: "Cylinder" },
  { id: "cone",      label: "Cone" },
  { id: "torus",     label: "Torus" },
  { id: "plane",     label: "Plane" },
  { id: "circle",    label: "Circle" },
  { id: "icosphere", label: "Icosphere" },
];

const COLORS = {
  bg:       "#1d1d1d",
  panel:    "#252525",
  border:   "#3a3a3a",
  teal:     "#5b9bd5",
  orange:   "#c07030",
  selected: "#c07030",
  hover:    "#5b9bd5",
  vert:     "#ffffff",
  edge:     "#5b9bd5",
  face:     "#5b9bd522",
  accent:   "#4772b3",
  text:     "#c8c8c8",
  textDim:  "#888",
};

// ── SpxTabGroup ────────────────────────────────────────────────────────────
// Dynamic color is handled via data-color attribute + CSS attribute selectors
// Zero inline styles
function SpxTabGroup({ label, color, tabs }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Map color hex to a semantic token class
  const colorClass = {
    "#00ffc8": "color--teal",
    "#ff88ff": "color--pink",
    "#ffdd44": "color--yellow",
    "#ff6644": "color--red",
    "#44aaff": "color--blue",
    "#FF6600": "color--orange",
  }[color] || "color--teal";

  return (
    <div ref={ref} className="spx-tab-group">
      <button
        className={`spx-native-workspace-tab spx-tab-group__trigger ${colorClass}${open ? " is-open" : ""}`}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <span className="spx-native-workspace-tab-label spx-tab-group__label">{label}</span>
        <span className="spx-tab-group__arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className={`spx-tab-group__menu ${colorClass}`}>
          {tabs.map((t) => (
            <div
              key={t.label}
              className={`spx-tab-group__item ${colorClass}`}
              onClick={() => { t.fn(); setOpen(false); }}
            >
              {t.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
