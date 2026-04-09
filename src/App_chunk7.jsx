  // ── Viewport mouse handlers ────────────────────────────────────────────────
  const handleMouseDown = (e) => {
    orbitButton.current = e.button;
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      orbitDragging.current = true;
      orbitLast.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    if (gizmoRef.current && cameraRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(mx, my), cameraRef.current);
      const handles = Object.values(gizmoRef.current.handles || {}).flat();
      const hits = ray.intersectObjects(handles, true);
      if (hits.length > 0) {
        const axis = hits[0].object.userData.axis;
        if (axis) {
          gizmoRef.current.startDrag(axis, hits[0].point);
          gizmoDragging.current = true;
          e.stopPropagation();
          return;
        }
      }
    }
    if (activeWorkspace === "Sculpt") {
      if (!meshRef.current && sceneObjects.length > 0) {
        const obj = sceneObjects.find((o) => o.id === activeObjId) || sceneObjects[0];
        if (obj?.mesh) meshRef.current = obj.mesh;
      }
      if (meshRef.current) {
        sculptingRef.current = true;
        editModeRef.current = "sculpt";
        applySculpt(e);
      }
    } else if (editModeRef.current === "object") {
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
  };

  const handleMouseMove = (e) => {
    if (orbitDragging.current) {
      const dx = e.clientX - orbitLast.current.x;
      const dy = e.clientY - orbitLast.current.y;
      orbitLast.current = { x: e.clientX, y: e.clientY };
      const camera = cameraRef.current;
      if (!camera) return;
      if (e.button === 1 || orbitButton.current === 1 || (e.altKey && orbitButton.current === 0)) {
        orbitState.current.theta -= dx * 0.01;
        orbitState.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitState.current.phi + dy * 0.01));
      } else if (orbitButton.current === 2) {
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
      let planeNormal;
      if (axis === "y") {
        const camDir = cameraRef.current.position.clone().normalize();
        planeNormal = new THREE.Vector3(camDir.x, 0, camDir.z).normalize();
      } else if (axis === "x") {
        planeNormal = new THREE.Vector3(0, 0, 1);
      } else {
        planeNormal = new THREE.Vector3(1, 0, 0);
      }
      const gizmoPos = gizmoRef.current.group.position;
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, gizmoPos);
      const pt = new THREE.Vector3();
      ray.ray.intersectPlane(plane, pt);
      if (pt) gizmoRef.current.drag(pt);
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
          setBoxSelect({ x: Math.min(cx, boxSelectStart.current.x), y: Math.min(cy, boxSelectStart.current.y), w: dx, h: dy });
        }
      }
    } else {
      onSlideMouse(e);
    }
  };

  const handleMouseUp = (e) => {
    if (gizmoDragging.current) {
      gizmoDragging.current = false;
      if (gizmoRef.current) gizmoRef.current.endDrag?.();
      return;
    }
    const wasDragging = orbitDragging.current;
    const wasBox = boxSelectActive.current;
    const boxSnap = boxSelect;
    orbitDragging.current = false;
    orbitButton.current = -1;
    sculptingRef.current = false;
    confirmEdgeSlide();
    if (wasDragging || e.button !== 0) {
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
      sceneObjectsRef.current.forEach((o) => {
        if (!o.mesh) return;
        const pos = new THREE.Vector3();
        pos.setFromMatrixPosition(o.mesh.matrixWorld);
        pos.project(camera);
        const sx = (pos.x + 1) / 2 * rect.width;
        const sy = (-pos.y + 1) / 2 * rect.height;
        if (sx >= boxSnap.x && sx <= boxSnap.x + boxSnap.w && sy >= boxSnap.y && sy <= boxSnap.y + boxSnap.h) picked = o.id;
      });
      if (picked) selectSceneObject(picked);
    } else {
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(mx, my), camera);
      const candidates = [];
      sceneRef.current?.traverse((c) => { if (c.isMesh && c.type === "Mesh") candidates.push(c); });
      const hits = ray.intersectObjects(candidates, false);
      if (hits.length > 0) {
        const hitMesh = hits[0].object;
        const objs = sceneObjectsRef.current;
        let matched = objs.find((o) => o.mesh === hitMesh || o.mesh?.uuid === hitMesh.uuid);
        if (!matched && objs.length > 0) {
          let minD = Infinity;
          objs.forEach((o) => { if (!o.mesh) return; const d = o.mesh.position.distanceTo(hits[0].point); if (d < minD) { minD = d; matched = o; } });
        }
        if (matched) selectSceneObject(matched.id);
      } else {
        sceneObjectsRef.current.forEach((o) => { if (o.mesh) o.mesh.traverse((m) => { if (m.isMesh && m.material?.emissive) { m.material.emissive.set(0x000000); m.material.emissiveIntensity = 0; } }); });
        setActiveObjId(null);
        meshRef.current = null;
      }
    }
    boxSelectStart.current = null;
    boxSelectActive.current = false;
    setBoxSelect(null);
  };

  const handleWheel = (e) => {
    const camera = cameraRef.current;
    if (!camera) return;
    orbitState.current.radius = Math.max(1, Math.min(50, orbitState.current.radius + e.deltaY * 0.01));
    const { theta, phi, radius } = orbitState.current;
    camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
    camera.position.y = radius * Math.cos(phi);
    camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
    camera.lookAt(0, 0, 0);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ProfessionalShell
      activeWorkspace={activeWorkspace}
      setActiveWorkspace={setActiveWorkspace}
      onMenuAction={handleApplyFunction}
      leftPanel={
        activeWorkspace === "Surface" ? (
          <HairPanel open={true} onClose={() => setHairPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
        ) : activeWorkspace === "Sculpt" ? (
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
          <MeshEditorPanel stats={stats} onApplyFunction={handleApplyFunction} onAddPrimitive={addPrimitive} />
        )
      }
      centerPanel={
        <div
          className={`mesh-editor-canvas${activeWorkspace === "Sculpt" ? " mesh-editor-canvas--sculpt" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { orbitDragging.current = false; sculptingRef.current = false; }}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="viewport-toolbar">
            <button
              type="button"
              className={`quad-toggle-btn${quadView ? " is-active" : ""}`}
              onClick={() => setQuadView((v) => !v)}
              title="Toggle quad view"
            >
              {quadView ? "Single" : "Quad"}
            </button>
          </div>

          <canvas ref={canvasRef} />

          <div className={`vp-stats${fps < 30 ? " vp-stats--low" : " vp-stats--ok"}`}>
            FPS: {fps} | Δ: {polyCount.toLocaleString()}
          </div>

          <div className="vp-orientation-gizmo">
            <svg viewBox="0 0 64 64" width="64" height="64">
              <line x1="32" y1="32" x2="54" y2="44" stroke="#e44" strokeWidth="2"/>
              <line x1="32" y1="32" x2="32" y2="8"  stroke="#4e4" strokeWidth="2"/>
              <line x1="32" y1="32" x2="12" y2="44" stroke="#44e" strokeWidth="2"/>
              <circle cx="54" cy="44" r="5" fill="#e44"/>
              <circle cx="32" cy="8"  r="5" fill="#4e4"/>
              <circle cx="12" cy="44" r="5" fill="#44e"/>
              <text x="57" y="47" fontSize="8" fill="#e44" fontFamily="monospace">X</text>
              <text x="29" y="6"  fontSize="8" fill="#4e4" fontFamily="monospace">Y</text>
              <text x="4"  y="47" fontSize="8" fill="#44e" fontFamily="monospace">Z</text>
            </svg>
          </div>

          <div className="vp-label">User Perspective</div>

          {boxSelect && (
            <div
              className="vp-box-select"
              style={{ left: boxSelect.x, top: boxSelect.y, width: boxSelect.w, height: boxSelect.h }}
            />
          )}
        </div>
      }
      rightPanel={
        <div className="right-panel-wrap">
          <SceneOutliner
            sceneObjects={sceneObjects}
            activeObjId={activeObjId}
            onSelect={selectSceneObject}
            onRename={renameSceneObject}
            onDelete={deleteSceneObject}
            onToggleVisible={toggleSceneObjectVisible}
            onAddPrimitive={addPrimitive}
          />
          <div className="right-sub-panel">
            {showNPanel ? (
              <FeatureIndexPanel activeWorkspace={activeWorkspace} onApplyFunction={handleApplyFunction} />
            ) : (
              <PropertiesPanel stats={stats} activeObj={meshRef.current} />
            )}
          </div>

          {showPerformancePanel && (
            <div className="perf-panel-overlay">
              <SPXPerformancePanel sceneObjects={sceneObjects} activeObjId={activeObjId} />
            </div>
          )}

          <UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)} />
          <MaterialPanel open={materialPanelOpen} onClose={() => setMaterialPanelOpen(false)} meshRef={meshRef} />
          <TexturePaintPanel open={paintPanelOpen} onClose={() => setPaintPanelOpen(false)} meshRef={meshRef} />
          <ClothingPanel open={clothingPanelOpen} onClose={() => setClothingPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
          <FabricPanel open={fabricPanelOpen} clothStateRef={sceneRef} setStatus={setStatus} panels={[]} />
          <PatternEditorPanel open={patternPanelOpen} onClose={() => setPatternPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
          <HairPanel open={hairPanelOpen} onClose={() => setHairPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
          <HairAdvancedPanel open={hairAdvancedOpen} onClose={() => setHairAdvancedOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
          <HairFXPanel open={hairFXOpen} onClose={() => setHairFXOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />

          <button
            className={`model-picker-btn${showModelPicker ? " model-picker-btn--open" : " model-picker-btn--closed"}`}
            onClick={() => { setModelPickerContext("general"); setShowModelPicker((v) => !v); }}
            title="Switch character model"
          >
            🧍 {activeModelUrl ? activeModelUrl.split("/").pop().replace(".glb", "") : "Model"}
          </button>

          <div className="spx-native-workspace-tabs">
            <SpxTabGroup label="SURFACE" color="#00ffc8" tabs={[
              { label: "UV",          fn: () => openWorkspaceTool("uv") },
              { label: "Materials",   fn: () => openWorkspaceTool("materials_textures") },
              { label: "Node Mat",    fn: () => setNodeEditorOpen((v) => !v) },
              { label: "Clothing",    fn: () => openWorkspaceTool("clothing_pattern") },
              { label: "Hair",        fn: () => { closeAllWorkspacePanels(); setHairPanelOpen(true); setActiveWorkspace("Surface"); } },
              { label: "Displace",    fn: () => setDisplacementOpen((v) => !v) },
            ]} />
            <SpxTabGroup label="RIG" color="#ff88ff" tabs={[
              { label: "Rigging",     fn: () => openWorkspaceTool("rigging_suite") },
              { label: "MoCap",       fn: () => openWorkspaceTool("mocap") },
              { label: "Retarget",    fn: () => setMocapRetargetOpen((v) => !v) },
              { label: "Gamepad",     fn: () => openWorkspaceTool("gamepad") },
            ]} />
            <SpxTabGroup label="RENDER" color="#ffdd44" tabs={[
              { label: "Cin Light",   fn: () => setCinLightOpen((v) => !v) },
              { label: "Lighting",    fn: () => setLightingCameraPanelOpen((v) => !v) },
              { label: "Camera",      fn: () => setFilmCameraOpen((v) => !v) },
              { label: "Volume",      fn: () => setFilmVolOpen((v) => !v) },
              { label: "Path Trace",  fn: () => setFilmPTOpen((v) => !v) },
              { label: "Post FX",     fn: () => setFilmPostOpen((v) => !v) },
            ]} />
            <SpxTabGroup label="FX" color="#ff6644" tabs={[
              { label: "Cloth",       fn: () => setClothSimOpen((v) => !v) },
              { label: "Fluid",       fn: () => setFluidPanelOpen((v) => !v) },
              { label: "Weather",     fn: () => setWeatherPanelOpen((v) => !v) },
              { label: "Destruction", fn: () => setDestructionPanelOpen((v) => !v) },
              { label: "Physics",     fn: () => setPhysicsOpen((v) => !v) },
            ]} />
            <SpxTabGroup label="WORLD" color="#44aaff" tabs={[
              { label: "Environment", fn: () => openWorkspaceTool("env_gen") },
              { label: "Terrain",     fn: () => openWorkspaceTool("terrain") },
              { label: "City Gen",    fn: () => setCityGenOpen((v) => !v) },
              { label: "Foliage",     fn: () => openWorkspaceTool("foliage_gen") },
              { label: "Crowd",       fn: () => setCrowdGenOpen((v) => !v) },
            ]} />
            <SpxTabGroup label="GEN" color="#FF6600" tabs={[
              { label: "Face",        fn: () => openWorkspaceTool("face_gen") },
              { label: "Vehicle",     fn: () => openWorkspaceTool("vehicle_gen") },
              { label: "Creature",    fn: () => openWorkspaceTool("creature_gen") },
              { label: "Pro Mesh",    fn: () => openWorkspaceTool("pro_mesh") },
              { label: "3D→2D Style", fn: () => openWorkspaceTool("3d_to_2d") },
            ]} />
            <button
              type="button"
              className="spx-native-workspace-tab workspace-tabs-perf-btn"
              onClick={() => setShowPerformancePanel((v) => !v)}
            >
              <span className="spx-native-workspace-tab-label">Performance</span>
            </button>
          </div>

          <CustomSkinBuilderPanel
            open={customSkinPanelOpen}
            onClose={() => setCustomSkinPanelOpen(false)}
            onApply={(params) => { setCustomSkin(params); if (meshRef.current && typeof buildCustomSkin === "function") { buildCustomSkin(meshRef.current, params); setStatus("Custom skin applied"); } }}
            onDownload={(params) => { setCustomSkin(params); if (typeof generateFullSkinTextures === "function") { const t = generateFullSkinTextures({ size: params.textureSize, poreScale: params.poreScale, wrinkleStrength: params.wrinkleStrength, age: params.age, region: params.region }); ["color", "roughness", "normal", "ao"].forEach((k) => { const a = document.createElement("a"); a.href = t[k].toDataURL("image/png"); a.download = "spx_custom_" + k + ".png"; a.click(); }); setStatus("Custom textures downloaded"); } }}
          />
          <NodeCompositorPanel open={compositorOpen} onClose={() => setCompositorOpen(false)} />
          <SPX3DTo2DPanel open={style3DTo2DOpen} onClose={() => setStyle3DTo2DOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} cameraRef={cameraRef} />
          <AutoRigPanel open={autoRigOpen} onClose={() => setAutoRigOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
          <AdvancedRigPanel open={advancedRigOpen} onClose={() => setAdvancedRigOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />

          {showModelPicker && (
            <div className="model-picker-popup">
              <span className="model-picker-popup__label">MODEL</span>
              {[
                { url: "/models/michelle.glb", label: "Michelle", thumb: "👩", desc: "Female character" },
                { url: "/models/xbot.glb",     label: "X Bot",    thumb: "🤖", desc: "Male Mixamo rig" },
                { url: "/models/ybot.glb",     label: "Y Bot",    thumb: "🦾", desc: "Female Mixamo rig" },
              ].map((m) => (
                <button
                  key={m.url}
                  className={`model-picker-btn-item${activeModelUrl === m.url ? " model-picker-btn-item--active" : " model-picker-btn-item--inactive"}`}
                  onClick={() => loadModelToScene(m.url, m.label)}
                >
                  <span className="model-picker-btn-item__emoji">{m.thumb}</span>
                  <span className="model-picker-btn-item__name">{m.label}</span>
                  <span className="model-picker-btn-item__desc">{m.desc}</span>
                </button>
              ))}
              <label className="model-picker-upload-label">
                <span className="model-picker-btn-item__emoji">📂</span>
                <span className="model-picker-btn-item__name">Upload</span>
                <span className="model-picker-btn-item__desc">Custom GLB</span>
                <input
                  type="file"
                  accept=".glb,.gltf"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    loadModelToScene(url, file.name.replace(/\.[^.]+$/, ""));
                  }}
                />
              </label>
              {sceneObjects.length > 0 && (
                <button
                  className="model-picker-btn-item model-picker-btn-item--mine"
                  onClick={() => {
                    const first = sceneObjects.find((o) => o.mesh);
                    if (first) { setActiveObjId(first.id); meshRef.current = first.mesh; setActiveModelUrl(null); setShowModelPicker(false); setStatus("Using scene mesh: " + first.name); }
                  }}
                >
                  <span className="model-picker-btn-item__emoji">🎯</span>
                  <span className="model-picker-btn-item__name">Use Mine</span>
                  <span className="model-picker-btn-item__desc">Scene mesh</span>
                </button>
              )}
              <button className="model-picker-close-btn" onClick={() => setShowModelPicker(false)}>✕</button>
            </div>
          )}

          {filmCameraOpen && <div className="float-panel-film-camera"><FilmCameraPanel cameraRef={cameraRef} rendererRef={rendererRef} sceneRef={sceneRef} open={filmCameraOpen} onClose={() => setFilmCameraOpen(false)} /></div>}
          {filmVolOpen    && <div className="float-panel-film-vol"><FilmVolumetricsPanel sceneRef={sceneRef} open={filmVolOpen} onClose={() => setFilmVolOpen(false)} /></div>}
          {filmPTOpen     && <div className="float-panel-film-pt"><FilmPathTracerPanel rendererRef={rendererRef} sceneRef={sceneRef} cameraRef={cameraRef} open={filmPTOpen} onClose={() => setFilmPTOpen(false)} /></div>}
          {cinLightOpen   && <div className="float-panel-cin-light"><CinematicLightingPanel sceneRef={sceneRef} open={cinLightOpen} onClose={() => setCinLightOpen(false)} /></div>}

          {lightingCameraPanelOpen && (
            <div className="float-panel-right-xl">
              <LightingCameraPanel sceneRef={sceneRef} cameraRef={cameraRef} cameras={cameras} onApplyFunction={handleApplyFunction} onClose={() => setLightingCameraPanelOpen(false)} />
            </div>
          )}

          {collaboratePanelOpen && (
            <div className="float-panel-collab">
              <CollaboratePanel sceneObjects={sceneObjects} onClose={() => setCollaboratePanelOpen(false)} />
            </div>
          )}

          {greasePencilPanelOpen && (
            <div className="float-panel-grease">
              <GreasePencilPanel onApplyFunction={handleApplyFunction} onClose={() => setGreasePencilPanelOpen(false)} />
            </div>
          )}

          {fluidPanelOpen && (
            <div className="float-panel-right-md">
              <FluidPanel open={fluidPanelOpen} onClose={() => setFluidPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
            </div>
          )}
          {weatherPanelOpen && (
            <div className="float-panel-right-md">
              <WeatherPanel open={weatherPanelOpen} onClose={() => setWeatherPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />
            </div>
          )}
          {destructionPanelOpen && (
            <div className="float-panel-right-lg">
              <DestructionPanel open={destructionPanelOpen} onClose={() => setDestructionPanelOpen(false)} sceneRef={sceneRef} meshRef={meshRef} setStatus={setStatus} onApplyFunction={handleApplyFunction} />
            </div>
          )}

          {envGenOpen && (
            <div className="fullscreen-overlay">
              <div className="fullscreen-overlay__bar">
                <span className="fullscreen-overlay__title fullscreen-overlay__title--teal">🌲 ENVIRONMENT GENERATOR</span>
                <button className="fullscreen-overlay__close" onClick={() => setEnvGenOpen(false)}>✕ CLOSE</button>
              </div>
              <div className="fullscreen-overlay__body"><EnvironmentGenerator /></div>
            </div>
          )}
          {cityGenOpen && (
            <div className="fullscreen-overlay">
              <div className="fullscreen-overlay__bar">
                <span className="fullscreen-overlay__title fullscreen-overlay__title--teal">🏙️ CITY GENERATOR</span>
                <button className="fullscreen-overlay__close" onClick={() => setCityGenOpen(false)}>✕ CLOSE</button>
              </div>
              <div className="fullscreen-overlay__body"><CityGenerator /></div>
            </div>
          )}
          {buildingOpen && (
            <div className="fullscreen-overlay">
              <div className="fullscreen-overlay__bar">
                <span className="fullscreen-overlay__title fullscreen-overlay__title--teal">🏗️ BUILDING SIMULATOR</span>
                <button className="fullscreen-overlay__close" onClick={() => setBuildingOpen(false)}>✕ CLOSE</button>
              </div>
              <div className="fullscreen-overlay__body"><BuildingSimulator /></div>
            </div>
          )}
          {physicsOpen && (
            <div className="fullscreen-overlay">
              <div className="fullscreen-overlay__bar">
                <span className="fullscreen-overlay__title fullscreen-overlay__title--orange">⚙️ PHYSICS SIMULATION</span>
                <button className="fullscreen-overlay__close" onClick={() => setPhysicsOpen(false)}>✕ CLOSE</button>
              </div>
              <div className="fullscreen-overlay__body"><PhysicsSimulation /></div>
            </div>
          )}
          {assetLibOpen && (
            <div className="fullscreen-overlay">
              <div className="fullscreen-overlay__bar">
                <span className="fullscreen-overlay__title fullscreen-overlay__title--teal">📦 ASSET LIBRARY</span>
                <button className="fullscreen-overlay__close" onClick={() => setAssetLibOpen(false)}>✕ CLOSE</button>
              </div>
              <div className="fullscreen-overlay__body"><AssetLibraryPanel /></div>
            </div>
          )}
          {nodeModOpen && (
            <div className="fullscreen-overlay">
              <div className="fullscreen-overlay__bar">
                <span className="fullscreen-overlay__title fullscreen-overlay__title--teal">🔗 NODE MODIFIER SYSTEM</span>
                <button className="fullscreen-overlay__close" onClick={() => setNodeModOpen(false)}>✕ CLOSE</button>
              </div>
              <div className="fullscreen-overlay__body"><NodeModifierSystem /></div>
            </div>
          )}
          {vrPreviewOpen && (
            <div className="fullscreen-overlay">
              <div className="fullscreen-overlay__bar">
                <span className="fullscreen-overlay__title fullscreen-overlay__title--purple">🥽 VR PREVIEW</span>
                <button className="fullscreen-overlay__close" onClick={() => setVrPreviewOpen(false)}>✕ CLOSE</button>
              </div>
              <div className="fullscreen-overlay__body"><VRPreviewMode /></div>
            </div>
          )}
          {crowdGenOpen && (
            <div className="fullscreen-overlay">
              <div className="fullscreen-overlay__bar">
                <span className="fullscreen-overlay__title fullscreen-overlay__title--teal">👥 CROWD GENERATOR</span>
                <button className="fullscreen-overlay__close" onClick={() => setCrowdGenOpen(false)}>✕ CLOSE</button>
              </div>
              <div className="fullscreen-overlay__body"><ProceduralCrowdGenerator /></div>
            </div>
          )}
          {terrainOpen && (
            <div className="fullscreen-overlay">
              <div className="fullscreen-overlay__bar">
                <span className="fullscreen-overlay__title fullscreen-overlay__title--green">🏔️ TERRAIN SCULPTING</span>
                <button className="fullscreen-overlay__close" onClick={() => setTerrainOpen(false)}>✕ CLOSE</button>
              </div>
              <div className="fullscreen-overlay__body"><TerrainSculpting /></div>
            </div>
          )}
          {proMeshOpen && (
            <div className="fullscreen-overlay">
              <div className="fullscreen-overlay__bar">
                <span className="fullscreen-overlay__title fullscreen-overlay__title--teal">✂ PRO MESH EDITOR</span>
                <span className="promesh-bar-sub">Best-in-class mesh tools</span>
                <button className="fullscreen-overlay__close" onClick={() => setProMeshOpen(false)}>✕ CLOSE</button>
              </div>
              <div className="fullscreen-overlay__body">
                <ProMeshPanel open={proMeshOpen} onClose={() => setProMeshOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} onApplyFunction={handleApplyFunction} />
              </div>
            </div>
          )}

          {gamepadOpen && (
            <div className="float-panel-gamepad">
              <GamepadAnimator open={gamepadOpen} onClose={() => setGamepadOpen(false)} sceneRef={sceneRef} meshRef={meshRef} setStatus={setStatus} onApplyFunction={handleApplyFunction} currentFrame={currentFrame} setCurrentFrame={setCurrentFrame} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
            </div>
          )}

          <MocapWorkspace open={mocapWorkspaceOpen} onClose={() => setMocapWorkspaceOpen(false)} onExportGlb={() => window.dispatchEvent(new CustomEvent("spx:mocap-export-glb"))} />

          {(faceGenOpen || foliageGenOpen || vehicleGenOpen || creatureGenOpen || propGenOpen) && (
            <div className="float-panel-gen">
              <div className="float-panel-gen__header">
                <span className="float-panel-gen__title">
                  {faceGenOpen ? "Face Generator" : foliageGenOpen ? "Foliage Generator" : vehicleGenOpen ? "Vehicle Generator" : creatureGenOpen ? "Creature Generator" : "Prop Generator"}
                </span>
                <button className="float-panel-gen__close" onClick={() => { setFaceGenOpen(false); setFoliageGenOpen(false); setVehicleGenOpen(false); setCreatureGenOpen(false); setPropGenOpen(false); }}>×</button>
              </div>
              <div className="float-panel-gen__body">
                {faceGenOpen     && <FaceGeneratorPanel sceneRef={sceneRef} setStatus={setStatus} />}
                {foliageGenOpen  && <FoliageGeneratorPanel sceneRef={sceneRef} setStatus={setStatus} />}
                {vehicleGenOpen  && <VehicleGeneratorPanel sceneRef={sceneRef} setStatus={setStatus} />}
                {creatureGenOpen && <CreatureGeneratorPanel sceneRef={sceneRef} setStatus={setStatus} />}
                {propGenOpen     && <PropGeneratorPanel sceneRef={sceneRef} setStatus={setStatus} />}
              </div>
            </div>
          )}

          <RenderWorkspacePanel open={renderWorkspaceOpen} onClose={() => setRenderWorkspaceOpen(false)} sceneRef={sceneRef} canvasRef={canvasRef} setStatus={setStatus} />
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
          videoStartFrame={videoStartFrame}
          videoEndFrame={videoEndFrame}
          setVideoStartFrame={setVideoStartFrame}
          setVideoEndFrame={setVideoEndFrame}
          videoFps={videoFps}
          setVideoFps={setVideoFps}
          sceneObjects={sceneObjects}
          animKeys={animKeys}
          onAddKeyframe={() => handleApplyFunction("add_keyframe")}
        />
      }
    />
  );
}
