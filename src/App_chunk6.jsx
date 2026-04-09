  // ── handleApplyFunction — master UI → engine dispatcher ───────────────────
  const handleApplyFunction = (fn, arg) => {

    // ── File ──────────────────────────────────────────────────────────────────
    if (fn === "exportSpxScene")      { exportSpxScene(); return; }
    if (fn === "importSpxScene")      { if (arg) importSpxScene(arg); return; }
    if (fn === "exportGLB")           { exportGLB(); return; }
    if (fn === "sendToStreamPireX")   { exportGLB(); return; }
    if (fn === "importGLB")           { if (arg) importGLB(arg); return; }
    if (fn === "importOBJ")           { setStatus("OBJ import — select a .obj file"); return; }
    if (fn === "importFBX")           { setStatus("FBX import via backend"); return; }
    if (fn === "exportOBJ")           { if (typeof window.exportOBJ === "function") window.exportOBJ(sceneRef.current); return; }
    if (fn === "exportFBX")           { if (typeof window.exportFBXToBackend === "function") window.exportFBXToBackend(sceneRef.current); return; }
    if (fn === "exportAlembic")       { if (typeof window.exportAlembic === "function") window.exportAlembic(sceneRef.current); return; }
    if (fn === "exportUSD")           { if (typeof window.exportUSD === "function") window.exportUSD(sceneRef.current); return; }
    if (fn === "exportToStreamPireX") { if (typeof window.exportToStreamPireX === "function") window.exportToStreamPireX(sceneRef.current); return; }
    if (fn === "takeSnapshot")        { takeSnapshot(); return; }
    if (fn === "newScene")            { sceneObjects.forEach((o) => { if (o.mesh) sceneRef.current?.remove(o.mesh); }); setSceneObjects([]); setStatus("New scene"); return; }
    if (fn === "saveAs")              {
      const name = prompt("Save project as:", `spx_project_${Date.now()}`);
      if (name) {
        const data = JSON.stringify({ version: "1.0", objects: sceneObjects.map((o) => ({ name: o.name, type: o.userData?.type, position: o.mesh?.position.toArray(), rotation: o.mesh?.rotation.toArray(), scale: o.mesh?.scale.toArray() })) }, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = name.endsWith(".json") ? name : name + ".json"; a.click();
        setStatus(`Saved as ${a.download}`);
      }
      return;
    }

    // ── Edit ──────────────────────────────────────────────────────────────────
    if (fn === "undo")                { undo(); return; }
    if (fn === "redo")                { redo(); return; }
    if (fn === "togglePerformance")   { setShowPerformancePanel((v) => !v); return; }
    if (fn === "duplicateObject")     { const o = getActiveObj(); if (o?.mesh) addPrimitive(o.userData?.type || "box"); return; }
    if (fn === "deleteSelected")      { if (activeObjId) deleteSceneObject(activeObjId); return; }
    if (fn === "selectAll")           { setStatus("Select All — A"); return; }
    if (fn === "deselectAll")         { setSelectedVerts(new Set()); setSelectedEdges(new Set()); setSelectedFaces(new Set()); setStatus("Deselected all"); return; }
    if (fn === "toggleWireframe")     { toggleWireframe(); return; }
    if (fn === "toggleXRay")          { window.SPX?.toggleViewport("xray"); return; }
    if (fn === "toggleGrid")          { window.SPX?.toggleViewport("grid"); return; }
    if (fn === "toggleNPanel")        { setShowNPanel((v) => !v); return; }
    if (fn === "runBenchmark")        { window.runBenchmark?.(); return; }
    if (fn === "openUVEditor")        { setShowUVEditor(true); return; }
    if (fn === "openMatEditor")       { setShowMatEditor(true); return; }
    if (fn === "showNLA")             { setShowNLA((v) => !v); return; }

    // ── Primitives ────────────────────────────────────────────────────────────
    if (fn.startsWith("prim_"))       { addPrimitive(fn.replace("prim_", "")); return; }

    // ── Edit tools ────────────────────────────────────────────────────────────
    if (fn === "select")              { setActiveTool("select"); setStatus("Select mode"); return; }
    if (fn === "grab")                {
      if (proportionalEnabled && heMeshRef.current && selectedVerts.size > 0) {
        window._proportionalActive = true;
        window._proportionalRadius = proportionalRadius;
        window._proportionalFalloff = proportionalFalloff;
        setStatus(`Proportional Grab — radius: ${proportionalRadius.toFixed(1)}`);
        return;
      }
    }
    if (fn === "_grab_legacy")        { setActiveTool("grab"); setStatus("Grab — G"); return; }
    if (fn === "rotate")              { setActiveTool("rotate"); setStatus("Rotate — R"); return; }
    if (fn === "scale")               { setActiveTool("scale"); setStatus("Scale — S"); return; }
    if (fn === "extrude")             {
      if (heMeshRef.current && selectedFaces.size > 0) {
        pushHistory();
        heMeshRef.current.extrudeFaces([...selectedFaces], 0.3);
        rebuildMeshGeometry();
        setStatus(`Extruded ${selectedFaces.size} face(s)`);
      }
      return;
    }
    if (fn === "loop_cut")            { setActiveTool("loop_cut"); applyLoopCut(); return; }
    if (fn === "knife")               { setActiveTool("knife"); setEditMode("edit"); setStatus("Knife — click points, Enter to cut"); return; }
    if (fn === "edge_slide")          { startEdgeSlide(); return; }
    if (fn === "bevel")               {
      if (heMeshRef.current) { pushHistory(); heMeshRef.current.bevelEdges(0.1); rebuildMeshGeometry(); setStatus("Bevel applied"); }
      return;
    }
    if (fn === "inset")               {
      if (heMeshRef.current && selectedFaces.size > 0) {
        pushHistory();
        heMeshRef.current.insetFaces([...selectedFaces], 0.1);
        rebuildMeshGeometry();
        setStatus(`Inset ${selectedFaces.size} face(s)`);
      }
      return;
    }
    if (fn === "gizmo_move")          { setGizmoMode("move"); setStatus("Gizmo: Move"); return; }
    if (fn === "gizmo_rotate")        { setGizmoMode("rotate"); setStatus("Gizmo: Rotate"); return; }
    if (fn === "gizmo_scale")         { setGizmoMode("scale"); setStatus("Gizmo: Scale"); return; }

    // ── Select mode ───────────────────────────────────────────────────────────
    if (fn === "selectMode_vert")     { setSelectMode("vert"); buildVertexOverlay(); setStatus("Vertex select"); return; }
    if (fn === "selectMode_edge")     { setSelectMode("edge"); buildEdgeOverlay(); setStatus("Edge select"); return; }
    if (fn === "selectMode_face")     { setSelectMode("face"); setTimeout(() => buildFaceOverlay(), 50); setStatus("Face select"); return; }

    // ── Proportional / Snap ───────────────────────────────────────────────────
    if (fn === "proportional_toggle")     { setProportionalEnabled((v) => !v); setStatus(proportionalEnabled ? "Proportional off" : "Proportional on (O)"); return; }
    if (fn === "proportional_radius_up")  { setProportionalRadius((r) => Math.min(10, r + 0.2)); return; }
    if (fn === "proportional_radius_down"){ setProportionalRadius((r) => Math.max(0.1, r - 0.2)); return; }
    if (fn === "snap_toggle")             { setSnapEnabled((v) => !v); setStatus(snapEnabled ? "Snap off" : "Snap on"); return; }

    // ── Advanced edit ops ─────────────────────────────────────────────────────
    if (fn === "grid_fill")      { if (heMeshRef.current) { const faces = heMeshRef.current.gridFill([...selectedVerts]); if (faces) { rebuildMeshGeometry(); setStatus(`Grid fill — ${faces.length} faces`); } } return; }
    if (fn === "target_weld")    { if (heMeshRef.current) { const sel = [...selectedVerts]; if (sel.length >= 2) { heMeshRef.current.targetWeld(sel[0], sel[1]); rebuildMeshGeometry(); setStatus("Target Weld applied"); } } return; }
    if (fn === "chamfer_vertex") { if (heMeshRef.current) { [...selectedVerts].forEach((id) => heMeshRef.current.chamferVertex(id, 0.1)); rebuildMeshGeometry(); setStatus("Chamfer applied"); } return; }
    if (fn === "average_vertex") { if (heMeshRef.current) { heMeshRef.current.averageVertices([...selectedVerts], 0.5, 2); rebuildMeshGeometry(); setStatus("Vertices averaged"); } return; }
    if (fn === "circularize")    { if (heMeshRef.current) { heMeshRef.current.circularize([...selectedVerts]); rebuildMeshGeometry(); setStatus("Circularize applied"); } return; }
    if (fn === "reorder_verts")  { if (heMeshRef.current) { const n = heMeshRef.current.reorderVertices(); setStatus(`Reordered ${n} vertices`); } return; }
    if (fn === "connect_comps")  { if (heMeshRef.current) { const sel = [...selectedVerts]; if (sel.length >= 2) { heMeshRef.current.connectComponents(sel[0], sel[1]); rebuildMeshGeometry(); setStatus("Components connected"); } } return; }

    // ── Boolean ───────────────────────────────────────────────────────────────
    if (fn === "bool_union")     { if (meshRef.current && meshBRef.current) { const r = booleanUnion(meshRef.current, meshBRef.current); sceneRef.current?.add(r); setStatus("Boolean Union applied"); } else setStatus("Need 2 meshes"); return; }
    if (fn === "bool_subtract")  { if (meshRef.current && meshBRef.current) { const r = booleanSubtract(meshRef.current, meshBRef.current); sceneRef.current?.add(r); setStatus("Boolean Subtract applied"); } else setStatus("Need 2 meshes"); return; }
    if (fn === "bool_intersect") { if (meshRef.current && meshBRef.current) { const r = booleanIntersect(meshRef.current, meshBRef.current); sceneRef.current?.add(r); setStatus("Boolean Intersect applied"); } else setStatus("Need 2 meshes"); return; }

    // ── Mesh repair ───────────────────────────────────────────────────────────
    if (fn === "fix_normals")    { if (meshRef.current) { fixNormals(meshRef.current); rebuildMeshGeometry(); setStatus("Normals fixed"); } return; }
    if (fn === "rm_doubles")     { if (typeof window.removeDoubles === "function" && meshRef.current) { window.removeDoubles(meshRef.current); rebuildMeshGeometry(); setStatus("Doubles merged"); } return; }
    if (fn === "fill_holes")     { if (typeof window.fillHoles === "function" && meshRef.current) { window.fillHoles(meshRef.current); rebuildMeshGeometry(); setStatus("Holes filled"); } return; }
    if (fn === "rm_degenerate")  { if (typeof window.removeDegenerates === "function" && meshRef.current) { window.removeDegenerates(meshRef.current); setStatus("Degens removed"); } return; }
    if (fn === "full_repair")    { if (typeof window.fullRepair === "function" && meshRef.current) { window.fullRepair(meshRef.current); rebuildMeshGeometry(); setStatus("Full repair complete"); } return; }

    // ── Remesh ────────────────────────────────────────────────────────────────
    if (fn === "voxel_remesh")   { if (typeof window.voxelRemesh === "function" && meshRef.current) { const m = window.voxelRemesh(meshRef.current, remeshVoxel); if (m) sceneRef.current?.add(m); setStatus("Voxel remesh done"); } return; }
    if (fn === "quad_remesh")    { if (typeof window.quadRemesh === "function" && meshRef.current) { window.quadRemesh(meshRef.current); setStatus("Quad remesh done"); } return; }
    if (fn === "auto_retopo")    { if (typeof window.quadDominantRetopo === "function" && meshRef.current) { const r = window.quadDominantRetopo(meshRef.current, createRetopoSettings()); setRetopoResult(r); setStatus("Retopo done"); } return; }
    if (fn === "marching_cubes") { if (typeof window.marchingCubesRemesh === "function" && meshRef.current) { window.marchingCubesRemesh(meshRef.current, mcResolution, mcIsolevel); setStatus("Marching cubes done"); } return; }

    // ── UV ────────────────────────────────────────────────────────────────────
    if (fn === "uv_box")         { if (heMeshRef.current) { uvBoxProject(heMeshRef.current); setStatus("Box UV applied"); } return; }
    if (fn === "uv_sphere")      { if (heMeshRef.current) { uvSphereProject(heMeshRef.current); setStatus("Sphere UV applied"); } return; }
    if (fn === "uv_planar")      { if (heMeshRef.current) { uvPlanarProject(heMeshRef.current); setStatus("Planar UV applied"); } return; }
    if (fn === "udim_layout")    { if (typeof window.createUDIMLayout === "function") { window.createUDIMLayout(4); setStatus("UDIM layout created"); } return; }
    if (fn === "mark_seam")      { const sel = [...selectedEdges]; sel.forEach((id) => toggleSeam(id)); setStatus(`Seam toggled on ${sel.length} edges`); return; }
    if (fn === "clear_seams")    { clearAllSeams(); setStatus("All seams cleared"); return; }
    if (fn === "smart_uv")       { if (heMeshRef.current) { import("./mesh/uv/UVUnwrap.js").then(({ smartUnwrap, getSeams }) => { const uvs = smartUnwrap(heMeshRef.current, getSeams ? getSeams() : []); setStatus("Smart UV unwrap — " + uvs.size + " vertices mapped"); }); } return; }
    if (fn === "live_unwrap")    { if (heMeshRef.current && cameraRef.current) { const uvs = liveUnwrap(heMeshRef.current, cameraRef.current); setStatus(`Live unwrap — ${uvs?.size || 0} vertices`); } return; }
    if (fn === "apply_checker")  { if (meshRef.current) { window.applyCheckerToMesh?.(meshRef.current); setStatus("Checker texture applied"); } return; }
    if (fn === "box_unwrap")     { const geom = meshRef.current?.geometry; if (geom) { window.unwrapBoxProjection?.(geom); if (geom.attributes.uv) geom.attributes.uv.needsUpdate = true; setStatus("Box unwrap applied"); } return; }
    if (fn === "export_uv_glb")  { if (meshRef.current) { window.exportUVLayoutGLB?.(meshRef.current).then((data) => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "uv-layout-export.gltf"; a.click(); setStatus("UV GLTF exported"); }); } return; }

    // ── Bake ──────────────────────────────────────────────────────────────────
    if (fn === "bake_ao")        { if (meshRef.current) { bakeAO(meshRef.current); setStatus("AO baked"); } return; }
    if (fn === "bake_normal")    { if (typeof window.bakeNormalMap === "function" && meshRef.current) { window.bakeNormalMap(meshRef.current); setStatus("Normal map baked"); } return; }
    if (fn === "bake_curvature") { if (typeof window.bakeCurvature === "function" && meshRef.current) { window.bakeCurvature(meshRef.current); setStatus("Curvature baked"); } return; }
    if (fn === "bake_all")       { if (typeof window.bakeAllMaps === "function" && meshRef.current) { window.bakeAllMaps(meshRef.current); setStatus("All maps baked"); } return; }
    if (fn === "bake_normals")   {
      if (!meshRef.current || !sceneRef.current || !rendererRef.current) return;
      const mesh = meshRef.current;
      const size = 1024;
      const renderTarget = new THREE.WebGLRenderTarget(size, size);
      const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 100);
      const origMat = mesh.material;
      mesh.material = new THREE.MeshNormalMaterial();
      rendererRef.current.setRenderTarget(renderTarget);
      rendererRef.current.render(sceneRef.current, bakeCam);
      rendererRef.current.setRenderTarget(null);
      mesh.material = origMat;
      const pixels = new Uint8Array(size * size * 4);
      rendererRef.current.readRenderTargetPixels(renderTarget, 0, 0, size, size, pixels);
      const c = document.createElement("canvas"); c.width = c.height = size;
      const ctx = c.getContext("2d"); const imgData = ctx.createImageData(size, size); imgData.data.set(pixels); ctx.putImageData(imgData, 0, 0);
      const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = "spx_normal_bake.png"; a.click();
      renderTarget.dispose(); setStatus("Normal map baked — downloading");
      return;
    }

    // ── Materials ─────────────────────────────────────────────────────────────
    if (fn === "mat_pbr")        { if (typeof window.createPBRMaterial === "function" && meshRef.current) { meshRef.current.material = window.createPBRMaterial(); setStatus("PBR applied"); } return; }
    if (fn === "mat_sss")        { if (typeof window.createSSSMaterial === "function" && meshRef.current) { meshRef.current.material = window.createSSSMaterial(sssPreset); setStatus("SSS applied"); } return; }
    if (fn === "mat_glass")      { if (typeof window.createTransmissionMaterial === "function" && meshRef.current) { meshRef.current.material = window.createTransmissionMaterial(transmissionPreset); setStatus("Glass applied"); } return; }
    if (fn === "mat_smart")      { if (meshRef.current) { applyPreset(meshRef.current, "chrome"); setStatus("Smart material applied"); } return; }
    if (fn === "mat_edge_wear")  { if (typeof window.applyEdgeWear === "function" && meshRef.current) { window.applyEdgeWear(meshRef.current); setStatus("Edge wear applied"); } return; }
    if (fn === "mat_cavity")     { if (typeof window.applyCavityDirt === "function" && meshRef.current) { window.applyCavityDirt(meshRef.current); setStatus("Cavity dirt applied"); } return; }
    if (fn === "mat_clearcoat")  { if (meshRef.current) { applyClearcoatMaterial?.(meshRef.current, { clearcoat: clearcoatVal, clearcoatRoughness: clearcoatRoughVal }); setStatus("Clearcoat applied"); } return; }
    if (fn === "mat_anisotropy") { if (meshRef.current) { applyAnisotropyMaterial?.(meshRef.current, { anisotropy: anisotropyVal }); setStatus("Anisotropy material applied"); } return; }
    if (fn === "mat_sss_skin")   { if (meshRef.current) { applySkinSSS?.(meshRef.current, { subsurface: 0.4 }); setStatus("SSS skin applied"); } return; }
    if (fn === "sh_toon")        { if (typeof window.createToonMaterial === "function" && meshRef.current) { meshRef.current.material = window.createToonMaterial(); setStatus("Toon shader applied"); } return; }
    if (fn === "sh_holo")        { if (typeof window.createHolographicMaterial === "function" && meshRef.current) { meshRef.current.material = window.createHolographicMaterial(); setStatus("Holographic applied"); } return; }
    if (fn === "sh_dissolve")    { if (typeof window.createDissolveMaterial === "function" && meshRef.current) { meshRef.current.material = window.createDissolveMaterial(); setStatus("Dissolve applied"); } return; }
    if (fn === "sh_outline")     { if (typeof window.addOutlineToMesh === "function" && meshRef.current) { window.addOutlineToMesh(meshRef.current, sceneRef.current); setStatus("NPR outline added"); } return; }

    // ── Displacement ──────────────────────────────────────────────────────────
    if (fn === "displace_perlin")   { if (meshRef.current) { applyDisplacementMap?.(meshRef.current, { noiseType: "perlin",   noiseAmplitude: displacementScale, noiseScale: 4 }); setStatus("Perlin displacement applied"); } return; }
    if (fn === "displace_voronoi")  { if (meshRef.current) { applyDisplacementMap?.(meshRef.current, { noiseType: "voronoi",  noiseAmplitude: displacementScale, noiseScale: 4 }); setStatus("Voronoi displacement applied"); } return; }
    if (fn === "displace_cellular") { if (meshRef.current) { applyDisplacementMap?.(meshRef.current, { noiseType: "cellular", noiseAmplitude: displacementScale, noiseScale: 4 }); setStatus("Cellular displacement applied"); } return; }

    // ── Skin ──────────────────────────────────────────────────────────────────
    if (fn === "skin_apply")        { if (meshRef.current) { applyRealisticSkin?.(meshRef.current, { tone: skinTone, region: skinRegion, oiliness: skinOiliness }); setStatus(`Skin: ${skinTone} / ${skinRegion}`); } return; }
    if (fn === "skin_lighting")     { if (sceneRef.current && rendererRef.current) { setupSkinLighting?.(sceneRef.current, rendererRef.current).then(() => setStatus("3-point skin lighting set up")); } return; }
    if (fn.startsWith("skin_tone_")) {
      const tone = fn.replace("skin_tone_", "");
      setSkinTone(tone);
      if (meshRef.current) applyRealisticSkin?.(meshRef.current, { tone, region: skinRegion });
      setStatus(`Skin tone: ${tone}`);
      return;
    }

    // ── Lights ────────────────────────────────────────────────────────────────
    if (fn === "light_point")  { const l = createLight("point"); sceneRef.current?.add(l.light); setSceneLights((p) => [...p, l]); setStatus("Point light added"); return; }
    if (fn === "light_spot")   { const l = createLight("spot");  sceneRef.current?.add(l.light); setSceneLights((p) => [...p, l]); setStatus("Spot light added"); return; }
    if (fn === "light_area")   { const l = createLight("area");  sceneRef.current?.add(l.light); setSceneLights((p) => [...p, l]); setStatus("Area light added"); return; }
    if (fn === "light_3pt")    { if (typeof window.createThreePointLighting === "function") { window.createThreePointLighting(sceneRef.current); setStatus("3-point rig added"); } return; }
    if (fn === "light_hdri")   { if (typeof window.applyHDRI === "function") { window.applyHDRI(sceneRef.current, 0); setStatus("HDRI applied"); } return; }
    if (fn === "light_fog")    { if (typeof window.createVolumericFog === "function") { window.createVolumericFog(sceneRef.current); setStatus("Fog added"); } return; }
    if (fn === "hdri_from_file") {
      const input = document.createElement("input"); input.type = "file"; input.accept = ".hdr,.exr";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file || !sceneRef.current || !rendererRef.current) return;
        const url = URL.createObjectURL(file);
        const { RGBELoader } = await import("three/examples/jsm/loaders/RGBELoader.js");
        const { PMREMGenerator } = await import("three");
        const loader = new RGBELoader();
        loader.load(url, (texture) => {
          const pmrem = new PMREMGenerator(rendererRef.current);
          const envMap = pmrem.fromEquirectangular(texture).texture;
          sceneRef.current.environment = envMap;
          sceneRef.current.background = envMap;
          texture.dispose(); pmrem.dispose(); URL.revokeObjectURL(url);
          setStatus(`HDRI loaded: ${file.name}`);
        });
      };
      input.click(); return;
    }

    // ── Camera ────────────────────────────────────────────────────────────────
    if (fn === "cam_new")      { const c = createCamera(); sceneRef.current?.add(c.camera); setCameras((p) => [...p, c]); setStatus("Camera added"); return; }
    if (fn === "cam_bookmark") { if (typeof window.saveBookmark === "function" && cameraRef.current) { window.saveBookmark(cameraRef.current, "Bookmark_" + Date.now()); setStatus("Bookmark saved"); } return; }
    if (fn === "cam_dof")      { if (typeof window.setDOF === "function" && cameraRef.current) { window.setDOF(cameraRef.current, { enabled: true }); setStatus("DOF enabled"); } return; }
    if (fn === "cam_shake")    { if (typeof window.applyCameraShake === "function" && cameraRef.current) { window.applyCameraShake(cameraRef.current); setStatus("Camera shake applied"); } return; }

    // ── Path tracer ───────────────────────────────────────────────────────────
    if (fn === "pt_start")     { setFilmPTOpen(true); setStatus("Path tracer starting..."); return; }
    if (fn === "pt_stop")      { setFilmPTOpen(false); setStatus("Path tracer stopped"); return; }
    if (fn === "pt_export")    { takeSnapshot(); return; }

    // ── Post FX ───────────────────────────────────────────────────────────────
    if (fn === "pp_bloom")     { setBloomEnabled((v) => !v); setStatus("Bloom toggled"); return; }
    if (fn === "pp_ssao")      { setSsaoEnabled((v) => !v); setStatus("SSAO toggled"); return; }
    if (fn === "pp_dof")       { setDofEnabled((v) => !v); setStatus("DOF toggled"); return; }
    if (fn === "pp_grain")     { setStatus("Film grain — post stack"); return; }
    if (fn === "pp_lut")       { setStatus("LUT — post stack"); return; }
    if (fn === "pp_vignette")  { setStatus("Vignette — post stack"); return; }
    if (fn === "pp_chromatic") { setStatus("Chromatic aberration — post stack"); return; }
    if (fn === "pp_sharpen")   { setStatus("Sharpen — post stack"); return; }

    // ── Render passes ─────────────────────────────────────────────────────────
    if (fn === "pass_beauty")  { if (typeof window.renderBeauty === "function") { window.renderBeauty(rendererRef.current, sceneRef.current, cameraRef.current); setStatus("Beauty pass rendered"); } return; }
    if (fn === "pass_normal")  { if (typeof window.renderNormalPass === "function") { window.renderNormalPass(rendererRef.current, sceneRef.current, cameraRef.current); setStatus("Normal pass rendered"); } return; }
    if (fn === "pass_depth")   { if (typeof window.renderDepthPass === "function") { window.renderDepthPass(rendererRef.current, sceneRef.current, cameraRef.current); setStatus("Depth pass rendered"); } return; }
    if (fn === "pass_wire")    { if (typeof window.renderWireframePass === "function") { window.renderWireframePass(rendererRef.current, sceneRef.current, cameraRef.current); setStatus("Wireframe pass rendered"); } return; }
    if (fn === "pass_crypto")  { if (typeof window.renderCryptomatte === "function") { window.renderCryptomatte(rendererRef.current, sceneRef.current, cameraRef.current); setStatus("Cryptomatte rendered"); } return; }

    // ── Sculpt ────────────────────────────────────────────────────────────────
    if (fn.startsWith("brush_")) { const b = fn.replace("brush_", ""); setSculptBrush(b); setEditMode("sculpt"); setStatus("Brush: " + b); return; }
    if (fn === "dyntopo")        { setDyntopoEnabled((v) => !v); setStatus(dyntopoEnabled ? "Dyntopo OFF" : "Dyntopo ON"); return; }

    // ── Rigging ───────────────────────────────────────────────────────────────
    if (fn === "create_armature") { const a = createArmature("Armature"); setArmatures((p) => [...p, a]); setStatus("Armature created"); return; }
    if (fn === "add_bone")        { if (armatures.length > 0 && typeof window.addBone === "function") { window.addBone(armatures[0]); setStatus("Bone added"); } return; }
    if (fn === "enter_pose")      { if (armatures.length > 0) { enterPoseMode(armatures[0]); setStatus("Pose mode"); } return; }
    if (fn === "capture_pose")    { if (typeof window.capturePose === "function" && armatures[0]) { window.capturePose(armatures[0]); setStatus("Pose captured"); } return; }
    if (fn === "reset_pose")      { if (typeof window.resetToRestPose === "function" && armatures[0]) { window.resetToRestPose(armatures[0]); setStatus("Rest pose"); } return; }
    if (fn === "ik_chain")        { const c = createIKChain([]); setIkChains((p) => [...p, c]); setStatus("IK chain created"); return; }
    if (fn === "heat_weights")    { if (typeof window.heatMapWeights === "function" && meshRef.current && armatures[0]) { window.heatMapWeights(meshRef.current, armatures[0]); setStatus("Heat weights applied"); } return; }
    if (fn === "paint_weights")   { setEditMode("weight_paint"); setStatus("Weight paint mode"); return; }
    if (fn === "norm_weights")    { if (typeof window.normalizeAllWeights === "function" && meshRef.current) { window.normalizeAllWeights(meshRef.current); setStatus("Weights normalized"); } return; }
    if (fn === "bvh_import")      {
      const input = document.createElement("input"); input.type = "file"; input.accept = ".bvh";
      input.onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const text = await file.text();
        const bvh = parseBVH(text);
        window._lastBVH = bvh;
        setStatus("BVH loaded: " + (bvh.joints?.length || 0) + " joints, " + (bvh.frames?.length || 0) + " frames");
      };
      input.click(); return;
    }
    if (fn === "mocap_retarget")  { if (bvhData && armatures[0]) { retargetFrame(bvhData, boneMap, armatures[0], animFrame); setStatus("MoCap retargeted"); } return; }
    if (fn === "mocap_bake")      { if (bvhData && armatures[0]) { bakeRetargetedAnimation(bvhData, boneMap, armatures[0]); setStatus("Animation baked"); } return; }
    if (fn === "mocap_footfix")   { if (armatures[0]) { fixFootSliding(armatures[0]); setStatus("Foot sliding fixed"); } return; }
    if (fn === "mocap_automap")   { if (bvhData && armatures[0]) { const m = autoDetectBoneMap(Object.keys(bvhData.joints || {}), armatures[0].bones?.map((b) => b.name) || []); setBoneMap(m); setStatus("Bone map detected"); } return; }
    if (fn === "mocap_live")      { setMocapWorkspaceOpen(true); setStatus("Live MoCap — webcam"); return; }
    if (fn === "mocap_video")     { setMocapWorkspaceOpen(true); setStatus("Video MoCap"); return; }
    if (fn === "avatar_ybot")     { setMocapWorkspaceOpen(true); setStatus("Y Bot avatar loaded"); return; }
    if (fn === "avatar_load")     { setMocapWorkspaceOpen(true); setStatus("Load GLB avatar"); return; }
    if (fn === "ai_anim_assist")  { setShowPerformancePanel(true); setStatus("AI Animation Assistant"); return; }

    // ── Animation ─────────────────────────────────────────────────────────────
    if (fn === "add_keyframe")    { if (meshRef.current) { recordKeyframe(meshRef.current, "position", meshRef.current.position.clone()); setStatus("Keyframe at frame " + currentFrame); } return; }
    if (fn === "auto_key")        { setAutoKey((v) => !v); setStatus(isAutoKey ? "Auto key OFF" : "Auto key ON"); return; }
    if (fn === "push_action")     { const a = createAction("Action_" + Date.now()); setNlaActions((p) => [...p, a]); setStatus("Action pushed"); return; }
    if (fn === "bake_nla")        { if (typeof window.bakeNLA === "function") { window.bakeNLA(nlaTracks, nlaActions, 0, 120); setStatus("NLA baked"); } return; }
    if (fn === "shapekey_new")    { if (meshRef.current) { const sk = createShapeKey("Key_" + shapeKeys.length, meshRef.current); setShapeKeys((p) => [...p, sk]); setStatus("Shape key created"); } return; }
    if (fn === "shapekey_apply")  { if (meshRef.current) { applyShapeKeys(meshRef.current, shapeKeys); setStatus("Shape keys applied"); } return; }
    if (fn === "walk_gen")        { if (typeof window.generateWalkCycle === "function" && armatures[0]) { window.generateWalkCycle(armatures[0]); setStatus("Walk cycle generated"); } return; }
    if (fn === "idle_gen")        { if (typeof window.generateIdleCycle === "function" && armatures[0]) { window.generateIdleCycle(armatures[0]); setStatus("Idle cycle generated"); } return; }
    if (fn === "breath_gen")      { if (typeof window.generateBreathingCycle === "function" && armatures[0]) { window.generateBreathingCycle(armatures[0]); setStatus("Breathing generated"); } return; }

    // ── Collaborate ───────────────────────────────────────────────────────────
    if (fn === "collaborate")     { setCollaboratePanelOpen(true); return; }
    if (fn === "collab_snapshot") { const snap = createVersionSnapshot(sceneObjects, prompt("Version note:", "v" + Date.now()) || ""); setStatus("Version snapshot saved"); return; }
    if (fn === "collab_comment")  { const pin = createCommentPin(meshRef.current?.position || { x: 0, y: 0, z: 0 }, prompt("Comment:", "") || "", "user"); setStatus("Comment pin added"); return; }
    if (fn === "grease_pencil")   { setGreasePencilPanelOpen(true); return; }
    if (fn === "gp_layer")        { createLayer("Layer_" + Date.now()); setStatus("Grease Pencil layer created"); return; }
    if (fn === "gp_stroke")       { createStroke([]); setStatus("Grease Pencil stroke created"); return; }

    // ── VFX / Physics ─────────────────────────────────────────────────────────
    if (fn === "vfx_fire")        { if (typeof window.createEmitter === "function" && window.VFX_PRESETS) { window.createEmitter(window.VFX_PRESETS.fire); setStatus("Fire emitter created"); } return; }
    if (fn === "vfx_smoke")       { if (typeof window.createEmitter === "function" && window.VFX_PRESETS) { window.createEmitter(window.VFX_PRESETS.smoke); setStatus("Smoke emitter created"); } return; }
    if (fn === "vfx_sparks")      { if (typeof window.createEmitter === "function" && window.VFX_PRESETS) { window.createEmitter(window.VFX_PRESETS.sparks); setStatus("Sparks emitter created"); } return; }
    if (fn === "vfx_burst")       { if (typeof window.burstEmit === "function") { window.burstEmit(null, meshRef.current?.position, 100); setStatus("Burst emitted"); } return; }
    if (fn === "fluid_water")     { if (typeof window.createFluidSettings === "function" && window.FLUID_PRESETS) { window.createFluidSettings(window.FLUID_PRESETS.water); setStatus("Water fluid created"); } return; }
    if (fn === "fluid_pyro")      { if (typeof window.createPyroEmitter === "function") { window.createPyroEmitter(meshRef.current?.position || { x: 0, y: 0, z: 0 }); setStatus("Pyro emitter created"); } return; }
    if (fn === "rb_create")       { if (typeof window.createRigidBody === "function" && meshRef.current) { const rb = window.createRigidBody(meshRef.current); setRigidBodies((p) => [...p, rb]); setStatus("Rigid body created"); } return; }
    if (fn === "rb_bake")         { if (typeof window.bakeRigidBodies === "function") { const b = window.bakeRigidBodies(rigidBodies, 120); setBakedPhysics(b); setStatus("Physics baked"); } return; }
    if (fn === "rb_fracture")     { if (typeof window.fractureMesh === "function" && meshRef.current) { const frags = window.fractureMesh(meshRef.current, 8); frags.forEach((f) => sceneRef.current?.add(f)); setStatus("Mesh fractured"); } return; }
    if (fn === "cloth_cotton")    { if (typeof window.createCloth === "function" && meshRef.current) { const c = window.createCloth(meshRef.current); window.applyClothPreset?.(c, "cotton"); setStatus("Cotton cloth created"); } return; }
    if (fn === "cloth_silk")      { if (typeof window.createCloth === "function" && meshRef.current) { const c = window.createCloth(meshRef.current); window.applyClothPreset?.(c, "silk"); setStatus("Silk cloth created"); } return; }
    if (fn === "hair_emit")       { if (typeof window.emitHair === "function" && meshRef.current) { const s = window.emitHair(meshRef.current); setFiberGroup(s); setStatus("Hair emitted"); } return; }
    if (fn === "hair_physics")    { if (typeof window.createHairPhysicsSettings === "function") { window.createHairPhysicsSettings(); setStatus("Hair physics created"); } return; }

    // ── Panel openers ─────────────────────────────────────────────────────────
    if (fn === "open_gamepad")      { setGamepadOpen(true); return; }
    if (fn === "open_pro_mesh")     { setProMeshOpen(true); return; }
    if (fn === "open_fluid")        { setFluidPanelOpen(true); return; }
    if (fn === "open_weather")      { setWeatherPanelOpen(true); return; }
    if (fn === "open_destruction")  { setDestructionPanelOpen(true); return; }
    if (fn === "open_env_gen")      { setEnvGenOpen(true); return; }
    if (fn === "open_city_gen")     { setCityGenOpen(true); return; }
    if (fn === "open_building")     { setBuildingOpen(true); return; }
    if (fn === "open_physics_sim")  { setPhysicsOpen(true); return; }
    if (fn === "open_asset_lib")    { setAssetLibOpen(true); return; }
    if (fn === "open_node_mod")     { setNodeModOpen(true); return; }
    if (fn === "open_vr_preview")   { setVrPreviewOpen(true); return; }
    if (fn === "open_crowd_gen")    { setCrowdGenOpen(true); return; }
    if (fn === "open_terrain")      { setTerrainOpen(true); return; }

    // ── Scene / Pipeline ──────────────────────────────────────────────────────
    if (fn === "scene_optimize")  { if (typeof window.optimizeScene === "function") { window.optimizeScene(sceneRef.current, cameraRef.current); setStatus("Scene optimized"); } return; }
    if (fn === "lod_gen")         { if (meshRef.current) { const l = generateLOD(meshRef.current); setLodObject(l); sceneRef.current?.add(l); setStatus("LOD generated"); } return; }
    if (fn === "inst_scatter")    { if (meshRef.current) { const i = createInstances(meshRef.current, instanceCount, "scatter"); sceneRef.current?.add(i); setStatus("Instances scattered"); } return; }
    if (fn === "inst_grid")       { if (meshRef.current) { const i = createInstances(meshRef.current, instanceCount, "grid"); sceneRef.current?.add(i); setStatus("Grid instances created"); } return; }
    if (fn === "gn_graph")        { setGnGraph(createGraph()); setStatus("Node graph created"); return; }
    if (fn === "gn_scatter")      { evaluateGraph(gnGraph, meshRef.current); setStatus("Geometry nodes evaluated"); return; }
    if (fn === "batch_export")    {
      if (sceneRef.current) {
        const meshes = [];
        sceneRef.current.traverse((obj) => { if (obj.isMesh) meshes.push(obj); });
        if (meshes.length === 0) { setStatus("No meshes to export"); return; }
        import("three/examples/jsm/exporters/GLTFExporter.js").then(({ GLTFExporter }) => {
          const exporter = new GLTFExporter();
          meshes.forEach((mesh, i) => {
            const sc = new THREE.Scene(); sc.add(mesh.clone());
            exporter.parse(sc, (glb) => { const blob = new Blob([glb], { type: "model/gltf-binary" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = (mesh.name || "mesh_" + i) + ".glb"; a.click(); URL.revokeObjectURL(url); }, (err) => console.error(err), { binary: true });
          });
          setStatus("Batch export — " + meshes.length + " meshes");
        });
      }
      return;
    }

    // ── Fallback ──────────────────────────────────────────────────────────────
    if (typeof window[fn] === "function") { window[fn](arg); return; }
    console.warn(`SPX: "${fn}" not found`);
    setStatus(`→ ${fn}`);
  };

