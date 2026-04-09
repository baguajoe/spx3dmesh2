export default function App() {

  // ── Auto-save ────────────────────────────────────────────────────────────
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

  // ── Performance monitoring ────────────────────────────────────────────────
  const [fps, setFps] = useState(0);
  const [polyCount, setPolyCount] = useState(0);

  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    const updateStats = () => {
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

    window.hardResetScene = () => {
      if (!sceneRef.current) return;
      console.log("🧹 Initializing Factory Reset...");
      sceneRef.current.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (child.material.dispose) child.material.dispose();
        }
      });
      while (sceneRef.current.children.length > 0) {
        sceneRef.current.remove(sceneRef.current.children[0]);
      }
      setSceneObjects([]);
      setActiveObjId(null);
      setSelectedObject(null);
      setHistory([]);
      setRedoStack([]);
      console.log("✅ App & Engine fully synchronized at Zero.");
    };

    return () => cancelAnimationFrame(handle);
  }, []);

  // ── Core architecture state ───────────────────────────────────────────────
  const [wireframe, setWireframe] = useState(false);
  const [stats, setStats] = useState({ vertices: 0, edges: 0, faces: 0, halfEdges: 0 });
  const [activeWorkspace, setActiveWorkspace] = useState(DEFAULT_WORKSPACE);
  const [sceneObjects, setSceneObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [activeObjId, setActiveObjId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  // ── Core refs ─────────────────────────────────────────────────────────────
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const meshRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const heMeshRef = useRef(null);
  const rafRef = useRef(null);
  const orbitRef = useRef(null);
  const orbitState = useRef({ theta: 0.6, phi: 1.1, radius: 5 });
  const orbitDragging = useRef(false);
  const orbitLast = useRef({ x: 0, y: 0 });
  const orbitButton = useRef(-1);
  const boxSelectStart = useRef(null);
  const boxSelectActive = useRef(false);
  const sceneObjectsRef = useRef([]);
  const fileInputRef = useRef(null);
  const gizmoRef = useRef(null);
  const gizmoDragging = useRef(false);
  const quadCamerasRef = useRef(null);
  const activeViewportRef = useRef("persp");
  const sceneLoadInput = useRef(null);
  const vertDotsRef = useRef(null);
  const edgeLinesRef = useRef(null);
  const faceMeshRef = useRef(null);
  const faceOverlayRef = useRef(null);
  const previewLineRef = useRef(null);
  const knifeRef = useRef({ active: false, points: [], line: null });
  const slideRef = useRef({ active: false, startX: 0, edge: null });
  const activeToolRef = useRef("select");
  const editModeRef = useRef("object");
  const selectModeRef = useRef("vert");
  const sculptingRef = useRef(false);
  const sculptBrushRef = useRef("push");
  const sculptRadiusRef = useRef(0.8);
  const sculptStrengthRef = useRef(0.02);
  const sculptFalloffRef = useRef("smooth");
  const sculptSymXRef = useRef(false);
  const lazyMouseRef = useRef({ x: 0, y: 0 });
  const sculptStrokeCountRef = useRef(0);
  const vcPaintingRef = useRef(false);
  const shapeKeysRef = useRef([]);
  const meshBRef = useRef(null);
  const quadViewRef = useRef(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState("Add a primitive to start");
  const [quadView, setQuadView] = useState(false);
  const [objectsAddedCounter, setObjectsAddedCounter] = useState(0);
  const [gizmoMode, setGizmoMode] = useState("move");
  const [gizmoActive, setGizmoActive] = useState(false);
  const [activeTool, setActiveTool] = useState("select");
  const [editMode, setEditMode] = useState("object");
  const [selectMode, setSelectMode] = useState("vert");
  const [activeMode, setActiveMode] = useState("object");
  const [showNPanel, setShowNPanel] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [showMatEditor, setShowMatEditor] = useState(false);
  const [showUVEditor, setShowUVEditor] = useState(false);
  const [showPathTracerPanel, setShowPathTracerPanel] = useState(false);
  const [showPipelinePanel, setShowPipelinePanel] = useState(false);
  const [showPluginPanel, setShowPluginPanel] = useState(false);
  const [showMarketPanel, setShowMarketPanel] = useState(false);
  const [showNLA, setShowNLA] = useState(false);
  const [boxSelect, setBoxSelect] = useState(null);
  const [exportUnlit, setExportUnlit] = useState(false);
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState("modeling");

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedVerts, setSelectedVerts] = useState(new Set());
  const [selectedEdges, setSelectedEdges] = useState(new Set());
  const [selectedFaces, setSelectedFaces] = useState(new Set());

  // ── Edit tool state ───────────────────────────────────────────────────────
  const [loopCutT, setLoopCutT] = useState(0.5);
  const [knifePoints, setKnifePoints] = useState([]);
  const [slideAmount, setSlideAmount] = useState(0);
  const [bevelAmt, setBevelAmt] = useState(0.1);
  const [insetAmt, setInsetAmt] = useState(0.15);
  const [mirrorAxis, setMirrorAxis] = useState("x");
  const [booleanMode, setBooleanMode] = useState("union");
  const [uvTriangles, setUVTriangles] = useState([]);
  const [uvProjection, setUVProjection] = useState("box");
  const [proportionalEnabled, setProportionalEnabled] = useState(false);
  const [proportionalRadius, setProportionalRadius] = useState(1.0);
  const [proportionalFalloff, setProportionalFalloff] = useState("smooth");
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [snapMode, setSnapMode] = useState("vertex");
  const [snapSize, setSnapSize] = useState(0.25);
  const [propEdit, setPropEdit] = useState(false);
  const [propRadius, setPropRadius] = useState(1.0);
  const [propFalloff, setPropFalloff] = useState("smooth");

  // ── Material state ────────────────────────────────────────────────────────
  const [matProps, setMatProps] = useState({
    color: "#888888", roughness: 0.5, metalness: 0.1,
    opacity: 1, emissive: "#000000", emissiveIntensity: 0,
    wireframe: false, transparent: false, side: "front",
  });
  const [sssPreset, setSssPreset] = useState("skin");
  const [transmissionPreset, setTransmissionPreset] = useState("glass");
  const [dispPattern, setDispPattern] = useState("noise");
  const [dispScale, setDispScale] = useState(0.1);
  const [clearcoatVal, setClearcoatVal] = useState(1.0);
  const [clearcoatRoughVal, setClearcoatRoughVal] = useState(0.1);
  const [anisotropyVal, setAnisotropyVal] = useState(1.0);
  const [activeShaderPreset, setActiveShaderPreset] = useState("toon");
  const [shaderOptions, setShaderOptions] = useState({});

  // ── Skin state ────────────────────────────────────────────────────────────
  const [skinTone, setSkinTone] = useState("medium");
  const [skinRegion, setSkinRegion] = useState("face");
  const [skinAge, setSkinAge] = useState(30);
  const [skinOiliness, setSkinOiliness] = useState(0.15);
  const [lipColor, setLipColor] = useState("#cc4444");
  const [eyeColor, setEyeColor] = useState("#4a7c9e");
  const [customSkin, setCustomSkin] = useState({ ...DEFAULT_CUSTOM_SKIN });

  // ── Displacement state ────────────────────────────────────────────────────
  const [displacementType, setDisplacementType] = useState("perlin");
  const [displacementScale, setDisplacementScale] = useState(0.1);

  // ── Sculpt state ──────────────────────────────────────────────────────────
  const [sculptBrush, setSculptBrush] = useState("push");
  const [sculptRadius, setSculptRadius] = useState(0.8);
  const [sculptStrength, setSculptStrength] = useState(0.5);
  const [sculptFalloff, setSculptFalloff] = useState("smooth");
  const [sculptSymX, setSculptSymX] = useState(false);
  const [dyntopoEnabled, setDyntopoEnabled] = useState(false);
  const [dyntopoDetail, setDyntopoDetail] = useState(0.05);
  const [advBrush, setAdvBrush] = useState("clay");
  const [advBrushRadius, setAdvBrushRadius] = useState(0.5);
  const [advBrushStr, setAdvBrushStr] = useState(0.03);
  const [advBrushInvert, setAdvBrushInvert] = useState(false);
  const [remeshVoxel, setRemeshVoxel] = useState(0.1);
  const [multiresStack, setMultiresStack] = useState(null);
  const [mcIsolevel, setMcIsolevel] = useState(0.5);
  const [mcResolution, setMcResolution] = useState(32);

  // ── Vertex color state ────────────────────────────────────────────────────
  const [vcPaintColor, setVcPaintColor] = useState("#ff6600");
  const [vcPaintColor2, setVcPaintColor2] = useState("#00ffc8");
  const [vcRadius, setVcRadius] = useState(0.6);
  const [vcStrength, setVcStrength] = useState(0.8);
  const [vcFalloff, setVcFalloff] = useState("smooth");

  // ── Shape keys state ──────────────────────────────────────────────────────
  const [shapeKeys, setShapeKeys] = useState([]);

  // ── Procedural state ──────────────────────────────────────────────────────
  const [procType, setProcType] = useState("pipe");
  const [procParams, setProcParams] = useState({
    radius: 0.3, innerRadius: 0.2, height: 2, segments: 32,
    steps: 8, width: 2, stepHeight: 0.2, stepDepth: 0.3,
    thickness: 0.3, depth: 0.4, teeth: 12, toothHeight: 0.2,
    turns: 3, tubeRadius: 0.1,
  });
  const [repairStatus, setRepairStatus] = useState(null);

  // ── LOD + Instancing state ────────────────────────────────────────────────
  const [lodObject, setLodObject] = useState(null);
  const [lodStats, setLodStats] = useState([]);
  const [lodLevel, setLodLevelState] = useState("auto");
  const [instanceCount, setInstanceCount] = useState(10);
  const [instanceLayout, setInstanceLayout] = useState("scatter");
  const [instanceSpread, setInstanceSpread] = useState(5);

  // ── Animation state ───────────────────────────────────────────────────────
  const [isAutoKey, setAutoKey] = useState(false);
  const [animFrame, setAnimFrame] = useState(0);
  const [animKeys, setAnimKeys] = useState({});
  const [currentFrameState, setCurrentFrameState] = useState(0);
  const [nlaActions, setNlaActions] = useState([]);
  const [nlaTracks, setNlaTracks] = useState([createTrack("Track 1")]);
  const [bvhData, setBvhData] = useState(null);
  const [procAnimKey, setProcAnimKey] = useState("float");
  const [procAnimEnabled, setProcAnimEnabled] = useState(false);
  const [videoFps, setVideoFps] = useState(24);
  const [videoStartFrame, setVideoStartFrame] = useState(0);
  const [videoEndFrame, setVideoEndFrame] = useState(120);
  const [videoWidth, setVideoWidth] = useState(1920);
  const [videoHeight, setVideoHeight] = useState(1080);

  // ── Rig state ─────────────────────────────────────────────────────────────
  const [armatures, setArmatures] = useState([]);
  const [selectedBoneId, setSelectedBoneId] = useState(null);
  const [poseLibrary, setPoseLibrary] = useState({});
  const [wpBoneIndex, setWpBoneIndex] = useState(0);
  const [wpRadius, setWpRadius] = useState(0.5);
  const [wpStrength, setWpStrength] = useState(0.1);
  const [wpMode, setWpMode] = useState("add");
  const [boneMap, setBoneMap] = useState({ ...DEFAULT_BONE_MAP });
  const [ikChains, setIkChains] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeDriverId, setActiveDriverId] = useState(null);
  const [driverExpr, setDriverExpr] = useState("sin(frame * 0.1)");
  const [constraints, setConstraints] = useState([]);
  const [constraintType, setConstraintType] = useState("lookAt");
  const [walkStyle, setWalkStyle] = useState("normal");
  const [walkSpeed, setWalkSpeed] = useState(1.0);
  const [walkStride, setWalkStride] = useState(1.0);

  // ── Physics state ─────────────────────────────────────────────────────────
  const [rigidBodies, setRigidBodies] = useState([]);
  const [bakedPhysics, setBakedPhysics] = useState(null);
  const [dynaMeshSettings, setDynaMeshSettings] = useState(createDynaMeshSettings());
  const [retopoSettings, setRetopoSettings] = useState(createRetopoSettings());
  const [retopoResult, setRetopoResult] = useState(null);

  // ── Hair state ────────────────────────────────────────────────────────────
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
  const [hairGroup, setHairGroup] = useState(null);

  // ── Cloth state ───────────────────────────────────────────────────────────
  const [clothPreset, setClothPreset] = useState("cotton");
  const [clothColliders, setClothColliders] = useState([]);
  const [clothSelfCol, setClothSelfCol] = useState(false);

  // ── Render state ──────────────────────────────────────────────────────────
  const [renderPreset, setRenderPreset] = useState("medium");
  const [toneMappingMode, setToneMappingMode] = useState("aces");
  const [toneExposure, setToneExposure] = useState(1.0);
  const [bloomEnabled, setBloomEnabled] = useState(false);
  const [ssaoEnabled, setSsaoEnabled] = useState(false);
  const [dofEnabled, setDofEnabled] = useState(false);
  const [passStack, setPassStack] = useState(createPassStack());
  const [passResults, setPassResults] = useState({});

  // ── Lighting state ────────────────────────────────────────────────────────
  const [sceneLights, setSceneLights] = useState([]);
  const [activeLightId, setActiveLightId] = useState(null);
  const [lightType, setLightType] = useState("point");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [lightIntensity, setLightIntensity] = useState(1.0);
  const [areaLights, setAreaLights] = useState([]);
  const [fogEnabled, setFogEnabled] = useState(false);
  const [fogColor, setFogColor] = useState("#aabbcc");
  const [fogDensity, setFogDensity] = useState(0.02);

  // ── Camera state ──────────────────────────────────────────────────────────
  const [cameras, setCameras] = useState([]);
  const [camFOV, setCamFOV] = useState(45);

  // ── Volumetrics state ─────────────────────────────────────────────────────
  const [volumetricSettings, setVolumetricSettings] = useState(createVolumetricSettings());
  const [atmospherePreset, setAtmospherePreset] = useState("clear");

  // ── VFX state ─────────────────────────────────────────────────────────────
  const [vfxRunning, setVfxRunning] = useState(false);
  const [vfxPreset, setVfxPreset] = useState("fire");
  const [fluidPreset, setFluidPreset] = useState("water");
  const [fluidSurface, setFluidSurface] = useState(null);
  const [gpuRunning, setGpuRunning] = useState(false);
  const [forceFieldType, setForceFieldType] = useState("vortex");
  const [useWorkerCloth, setUseWorkerCloth] = useState(false);
  const [useWorkerSPH, setUseWorkerSPH] = useState(false);

  // ── Grease pencil state ───────────────────────────────────────────────────
  const [gpLayers, setGpLayers] = useState([createLayer("Layer 1")]);
  const [gpActiveLayer, setGpActiveLayer] = useState(0);
  const [gpDrawing, setGpDrawing] = useState(false);
  const [gpCurrentStroke, setGpCurrentStroke] = useState(null);
  const [gpColor, setGpColor] = useState("#ffffff");
  const [gpThickness, setGpThickness] = useState(2);

  // ── Geometry nodes state ──────────────────────────────────────────────────
  const [gnGraph, setGnGraph] = useState(createGraph());
  const [activeSpline, setActiveSpline] = useState(null);

  // ── Paint state ───────────────────────────────────────────────────────────
  const [paintStack, setPaintStack] = useState(null);
  const [paintTexture, setPaintTexture] = useState(null);
  const [paintColor, setPaintColor] = useState("#ff0000");
  const [paintRadius, setPaintRadius] = useState(20);
  const [paintOpacity, setPaintOpacity] = useState(1.0);
  const [bakedMaps, setBakedMaps] = useState({});

  // ── Asset / scene state ───────────────────────────────────────────────────
  const [assetLibrary, setAssetLibrary] = useState(createAssetLibrary());
  const [commentText, setCommentText] = useState("");
  const [versionHistory, setVersionHistory] = useState([]);
  const [densityPattern, setDensityPattern] = useState("center");
  const [tourState, setTourState] = useState(createTourState());
  const [pluginMarketplace, setPluginMarketplace] = useState({ presets: [] });

  // ── Render farm state ─────────────────────────────────────────────────────
  const [farmFrameStart, setFarmFrameStart] = useState(0);
  const [farmFrameEnd, setFarmFrameEnd] = useState(24);
  const [farmJobName, setFarmJobName] = useState("Render_001");
  const [exportFormat, setExportFormat] = useState("glb");

  // ── Panel open/close state ────────────────────────────────────────────────
  const [uvPanelOpen, setUvPanelOpen] = useState(false);
  const [materialPanelOpen, setMaterialPanelOpen] = useState(false);
  const [paintPanelOpen, setPaintPanelOpen] = useState(false);
  const [clothingPanelOpen, setClothingPanelOpen] = useState(false);
  const [fabricPanelOpen, setFabricPanelOpen] = useState(false);
  const [patternPanelOpen, setPatternPanelOpen] = useState(false);
  const [hairPanelOpen, setHairPanelOpen] = useState(false);
  const [hairAdvancedOpen, setHairAdvancedOpen] = useState(false);
  const [hairFXOpen, setHairFXOpen] = useState(false);
  const [collaboratePanelOpen, setCollaboratePanelOpen] = useState(false);
  const [lightingCameraPanelOpen, setLightingCameraPanelOpen] = useState(false);
  const [gamepadOpen, setGamepadOpen] = useState(false);
  const [proMeshOpen, setProMeshOpen] = useState(false);
  const [fluidPanelOpen, setFluidPanelOpen] = useState(false);
  const [weatherPanelOpen, setWeatherPanelOpen] = useState(false);
  const [destructionPanelOpen, setDestructionPanelOpen] = useState(false);
  const [envGenOpen, setEnvGenOpen] = useState(false);
  const [cityGenOpen, setCityGenOpen] = useState(false);
  const [buildingOpen, setBuildingOpen] = useState(false);
  const [physicsOpen, setPhysicsOpen] = useState(false);
  const [assetLibOpen, setAssetLibOpen] = useState(false);
  const [nodeModOpen, setNodeModOpen] = useState(false);
  const [vrPreviewOpen, setVrPreviewOpen] = useState(false);
  const [crowdGenOpen, setCrowdGenOpen] = useState(false);
  const [terrainOpen, setTerrainOpen] = useState(false);
  const [faceGenOpen, setFaceGenOpen] = useState(false);
  const [foliageGenOpen, setFoliageGenOpen] = useState(false);
  const [vehicleGenOpen, setVehicleGenOpen] = useState(false);
  const [creatureGenOpen, setCreatureGenOpen] = useState(false);
  const [propGenOpen, setPropGenOpen] = useState(false);
  const [greasePencilPanelOpen, setGreasePencilPanelOpen] = useState(false);
  const [autoRigOpen, setAutoRigOpen] = useState(false);
  const [advancedRigOpen, setAdvancedRigOpen] = useState(false);
  const [mocapWorkspaceOpen, setMocapWorkspaceOpen] = useState(false);
  const [renderWorkspaceOpen, setRenderWorkspaceOpen] = useState(false);
  const [mocapRetargetOpen, setMocapRetargetOpen] = useState(false);
  const [cinLightOpen, setCinLightOpen] = useState(false);
  const [filmVolOpen, setFilmVolOpen] = useState(false);
  const [filmPTOpen, setFilmPTOpen] = useState(false);
  const [rotoOpen, setRotoOpen] = useState(false);
  const [filmSubdivOpen, setFilmSubdivOpen] = useState(false);
  const [filmRenderOpen, setFilmRenderOpen] = useState(false);
  const [filmPostOpen, setFilmPostOpen] = useState(false);
  const [filmLibraryOpen, setFilmLibraryOpen] = useState(false);
  const [filmMaterialOpen, setFilmMaterialOpen] = useState(false);
  const [filmSculptOpen, setFilmSculptOpen] = useState(false);
  const [filmCameraOpen, setFilmCameraOpen] = useState(false);
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  const [clothSimOpen, setClothSimOpen] = useState(false);
  const [displacementOpen, setDisplacementOpen] = useState(false);
  const [customSkinPanelOpen, setCustomSkinPanelOpen] = useState(false);
  const [compositorOpen, setCompositorOpen] = useState(false);
  const [style3DTo2DOpen, setStyle3DTo2DOpen] = useState(false);

  // ── Model picker state ────────────────────────────────────────────────────
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [activeModelUrl, setActiveModelUrl] = useState(null);
  const [modelPickerContext, setModelPickerContext] = useState("general");

  // ── History state ─────────────────────────────────────────────────────────
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getActiveObj = () => sceneObjects.find((o) => o.id === activeObjId) || null;

