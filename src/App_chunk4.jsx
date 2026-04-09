  // ── Init Three.js ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rendererRef.current) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.physicallyCorrectLights = true;
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);

    // Pro lighting
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
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // IBL environment
    try {
      const envMap = createProceduralHDRI(renderer);
      scene.environment = envMap;
      scene.environmentIntensity = 0.8;
    } catch (e) { console.warn("IBL setup failed:", e); }

    // Grid
    scene.add(new THREE.GridHelper(10, 20, COLORS.border, COLORS.border));

    // Center marker (Blender-style origin)
    const centerRingGeo = new THREE.RingGeometry(0.06, 0.11, 32);
    const centerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff6600, side: THREE.DoubleSide,
      transparent: true, opacity: 0.9, depthTest: false,
    });
    const centerMarker = new THREE.Mesh(centerRingGeo, centerRingMat);
    centerMarker.rotation.x = -Math.PI / 2;
    centerMarker.position.set(0, 0.001, 0);
    centerMarker.renderOrder = 999;
    centerMarker.userData.isHelper = true;
    scene.add(centerMarker);

    // Center axis guides
    const centerGuidePts = [
      -5, 0.001, 0.0, -0.12, 0.001, 0.0,
       0.12, 0.001, 0.0, 5, 0.001, 0.0,
       0.0, 0.001, -5, 0.0, 0.001, -0.12,
       0.0, 0.001, 0.12, 0.0, 0.001, 5,
    ];
    const centerGuideGeo = new THREE.BufferGeometry();
    centerGuideGeo.setAttribute("position", new THREE.Float32BufferAttribute(centerGuidePts, 3));
    const centerGuideMat = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.8, depthTest: false });
    const centerGuides = new THREE.LineSegments(centerGuideGeo, centerGuideMat);
    centerGuides.renderOrder = 998;
    scene.add(centerGuides);

    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.01, 1000);
    camera.position.set(3, 3, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Film quality EffectComposer
    try {
      const composer = initFilmComposer(renderer, scene, camera);
      rendererRef._composer = composer;
    } catch (e) { console.warn("EffectComposer init failed:", e); }

    // Upgrade materials to MeshPhysical
    setTimeout(() => { try { upgradeMaterialsToPhysical(scene); } catch (e) {} }, 500);

    // Quad viewport cameras
    quadCamerasRef.current = createQuadCameraSet(camera);
    resizeQuadCameraSet(quadCamerasRef.current, canvas.clientWidth, canvas.clientHeight);

    // Fill + rim lights
    const dir2 = new THREE.DirectionalLight(0xffffff, 1.2);
    dir2.position.set(5, 8, 5);
    dir2.castShadow = true;
    scene.add(dir2);
    const fill = new THREE.DirectionalLight(0x00ffc8, 0.2);
    fill.position.set(-3, -2, -3);
    scene.add(fill);

    // Transform gizmo
    setTimeout(() => {
      if (sceneRef.current && !gizmoRef.current) {
        gizmoRef.current = new TransformGizmo(sceneRef.current);
        gizmoRef.current.group.visible = false;
      }
    }, 200);

    // Animate loop
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const _composer = rendererRef.current?._composer;
      if (_composer && !quadViewRef.current) {
        _composer.render();
      } else {
        renderViewportSet(
          renderer, scene,
          quadCamerasRef.current || { persp: camera },
          canvas.clientWidth, canvas.clientHeight,
          quadViewRef.current
        );
      }
    };
    animate();

    // Resize handler
    const onResize = () => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      resizeQuadCameraSet(quadCamerasRef.current, canvas.clientWidth, canvas.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Engine bridge ──────────────────────────────────────────────────────
    window.HalfEdgeMesh = HalfEdgeMesh;
    window.booleanUnion = booleanUnion;
    window.booleanSubtract = booleanSubtract;
    window.booleanIntersect = booleanIntersect;
    window.uvBoxProject = uvBoxProject;
    window.uvSphereProject = uvSphereProject;
    window.uvPlanarProject = uvPlanarProject;
    window.applySculptStroke = applySculptStroke;
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
    window.createIKChain = createIKChain;
    window.createPathTracerSettings = createPathTracerSettings;
    window.createVolumetricSettings = createVolumetricSettings;
    window.generateFibermesh = generateFibermesh;
    window.createInstances = createInstances;
    window.fixNormals = fixNormals;
    window.createRetopoSettings = createRetopoSettings;
    window.createPBRMaterial = createPBRMaterial;
    window.createSSSMaterial = createSSSMaterial;
    window.createTransmissionMaterial = createTransmissionMaterial;
    window.applyRenderPreset = applyRenderPreset;
    window.applyToneMappingMode = applyToneMappingMode;
    window.captureFrame = captureFrame;
    window.downloadFrame = downloadFrame;
    window.RENDER_PRESETS = RENDER_PRESETS;
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
    window.createRenderFarm = createRenderFarm;
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
    window.addBone = (armature, opts) => { if (armature && typeof armature.addBone === "function") return armature.addBone(opts); };
    window.importSpxScene = importSpxScene;
    window.takeSnapshot = takeSnapshot;
    window.addPrimitive = addPrimitive;
    window.selectSceneObject = selectSceneObject;
    window.deleteSceneObject = deleteSceneObject;

    window.runBenchmark = () => {
      console.log("🏗️ Building Mechanical Benchmark...");
      addPrimitive("Gear");
      setTimeout(() => { addPrimitive("Gear"); const gears = scene.children.filter((c) => c.userData.type === "Gear"); if (gears[1]) gears[1].position.set(3, 0, 0); }, 100);
      setTimeout(() => { addPrimitive("Helix"); const helix = scene.children.find((c) => c.userData.type === "Helix"); if (helix) { helix.position.set(-3, 2.5, 0); helix.material.transparent = true; helix.material.opacity = 0.5; helix.material.color.set("#00ffff"); } }, 200);
      console.log("✅ Benchmark Scene Populated.");
      setIsPlaying(true);
    };

    window.SPX = {
      toggleViewport: (type) => {
        scene.traverse((obj) => {
          if (obj.isMesh) {
            if (type === "wireframe") obj.material.wireframe = !obj.material.wireframe;
            if (type === "xray") { obj.material.opacity = obj.material.opacity === 1 ? 0.3 : 1; obj.material.transparent = true; }
          }
          if (type === "grid" && obj.type === "GridHelper") obj.visible = !obj.visible;
        });
        console.log(`👁️ Viewport: ${type} toggled.`);
      },
      clearScene: () => {
        scene.children.filter((c) => c.isMesh).forEach((m) => scene.remove(m));
        setSceneObjects([]);
        console.log("🧹 Scene Cleared.");
      },
      runBenchmark: () => {
        window.SPX.clearScene();
        addPrimitive("Gear");
        setTimeout(() => addPrimitive("Gear"), 200);
        setTimeout(() => addPrimitive("Helix"), 400);
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

