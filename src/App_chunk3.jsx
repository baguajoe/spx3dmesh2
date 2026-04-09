  // ── Sync refs ─────────────────────────────────────────────────────────────
  useEffect(() => { quadViewRef.current = quadView; }, [quadView]);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);
  useEffect(() => { selectModeRef.current = selectMode; }, [selectMode]);
  useEffect(() => { sculptBrushRef.current = sculptBrush; }, [sculptBrush]);
  useEffect(() => { sculptRadiusRef.current = sculptRadius; }, [sculptRadius]);
  useEffect(() => { sculptStrengthRef.current = sculptStrength; }, [sculptStrength]);
  useEffect(() => { sculptFalloffRef.current = sculptFalloff; }, [sculptFalloff]);
  useEffect(() => { sculptSymXRef.current = sculptSymX; }, [sculptSymX]);
  useEffect(() => { sceneObjectsRef.current = sceneObjects; }, [sceneObjects]);

  // ── Sync editMode with workspace ──────────────────────────────────────────
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

  // Force object mode on mount
  useEffect(() => { editModeRef.current = "object"; }, []);

  // ── Workspace mode event ──────────────────────────────────────────────────
  useEffect(() => {
    const onWorkspaceMode = (e) => {
      const mode = e?.detail?.mode;
      if (mode) setActiveWorkspaceMode(mode);
    };
    window.addEventListener("spx:setWorkspaceMode", onWorkspaceMode);
    return () => window.removeEventListener("spx:setWorkspaceMode", onWorkspaceMode);
  }, []);

  // ── Force canvas resize on workspace change ───────────────────────────────
  useEffect(() => {
    setTimeout(() => {
      const renderer = rendererRef.current;
      const canvas = canvasRef.current;
      if (!renderer || !canvas) return;
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

  // ── Proportional editing key ──────────────────────────────────────────────
  useEffect(() => {
    const onProportionalKey = (e) => {
      if (e.key.toLowerCase() === "o" && editModeRef.current === "edit") {
        e.preventDefault();
        setProportionalEnabled((v) => !v);
      }
    };
    window.addEventListener("keydown", onProportionalKey);
    return () => window.removeEventListener("keydown", onProportionalKey);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const key = e.key;
      if (key === "n" || key === "N") setShowNPanel((v) => !v);
      if (key === "Tab") { e.preventDefault(); setShowNPanel((v) => !v); }
      if (key === "g" || key === "G") window.SPX?.toggleViewport("grid");
      if (key === "w" || key === "W") window.SPX?.toggleViewport("wireframe");
      if (key === "r" || key === "R") window.takeSnapshot?.();
      if (key === "p" || key === "P") { e.preventDefault(); setShowPerformancePanel((v) => !v); }
      if (key === "Delete" || key === "Backspace" || key === "x" || key === "X") {
        if (activeObjId) deleteSceneObject(activeObjId);
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === "z") undo();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "z") redo();
      if ((e.ctrlKey || e.metaKey) && key === "y") redo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeObjId]);

  // ── Panel keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const onUVKey = (e) => { if (e.shiftKey && e.key.toLowerCase() === "u") { e.preventDefault(); setUvPanelOpen((v) => !v); } };
    const onMatKey = (e) => { if (e.shiftKey && e.key.toLowerCase() === "m") { e.preventDefault(); setMaterialPanelOpen((v) => !v); } };
    const onPaintKey = (e) => { if (e.shiftKey && e.key.toLowerCase() === "p") { e.preventDefault(); setPaintPanelOpen((v) => !v); } };
    const onClothKey = (e) => { if (e.shiftKey && e.key.toLowerCase() === "g") { e.preventDefault(); setClothingPanelOpen((v) => !v); } };
    const onPatternKey = (e) => { if (e.shiftKey && e.key.toLowerCase() === "d") { e.preventDefault(); setPatternPanelOpen((v) => !v); } };
    const onHairKey = (e) => { if (e.shiftKey && e.key.toLowerCase() === "h") { e.preventDefault(); setHairPanelOpen((v) => !v); } };
    const onHairAdvKey = (e) => { if (e.shiftKey && e.key.toLowerCase() === "j") { e.preventDefault(); setHairAdvancedOpen((v) => !v); } };
    const onHairFXKey = (e) => { if (e.shiftKey && e.key.toLowerCase() === "k") { e.preventDefault(); setHairFXOpen((v) => !v); } };
    const onAutoRigKey = (e) => { if (e.shiftKey && e.key.toLowerCase() === "r") { e.preventDefault(); setAutoRigOpen((v) => !v); } };
    const onAdvRigKey = (e) => { if (e.shiftKey && e.key.toLowerCase() === "y") { e.preventDefault(); setAdvancedRigOpen((v) => !v); } };
    window.addEventListener("keydown", onUVKey);
    window.addEventListener("keydown", onMatKey);
    window.addEventListener("keydown", onPaintKey);
    window.addEventListener("keydown", onClothKey);
    window.addEventListener("keydown", onPatternKey);
    window.addEventListener("keydown", onHairKey);
    window.addEventListener("keydown", onHairAdvKey);
    window.addEventListener("keydown", onHairFXKey);
    window.addEventListener("keydown", onAutoRigKey);
    window.addEventListener("keydown", onAdvRigKey);
    return () => {
      window.removeEventListener("keydown", onUVKey);
      window.removeEventListener("keydown", onMatKey);
      window.removeEventListener("keydown", onPaintKey);
      window.removeEventListener("keydown", onClothKey);
      window.removeEventListener("keydown", onPatternKey);
      window.removeEventListener("keydown", onHairKey);
      window.removeEventListener("keydown", onHairAdvKey);
      window.removeEventListener("keydown", onHairFXKey);
      window.removeEventListener("keydown", onAutoRigKey);
      window.removeEventListener("keydown", onAdvRigKey);
    };
  }, []);

  // ── Delete selected global handler ────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement.tagName !== "INPUT") window.deleteSelected();
      }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [selectedObject, sceneObjects]);

  useEffect(() => {
    window.deleteSelected = () => {
      if (selectedObject) {
        if (selectedObject.parent) selectedObject.parent.remove(selectedObject);
        setSelectedObject(null);
        setSceneObjects((prev) => prev.filter((o) => o.uuid !== selectedObject.uuid));
        console.log("🗑️ Object Deleted.");
      }
    };
    window.setSelectedObject = (obj) => setSelectedObject(obj);
  }, [selectedObject]);

  // ── Sync selectedObject → activeObjId ─────────────────────────────────────
  useEffect(() => {
    if (selectedObject) setActiveObjId(selectedObject.uuid);
    else setActiveObjId(null);
  }, [selectedObject]);

  // ── Playback loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => (prev >= 250 ? 0 : prev + 1));
      }, 1000 / 24);
    }
    const snapViewToAxis = (axis) => {
      const cam = getActiveViewportCamera(
        quadCamerasRef.current || { persp: cameraRef.current },
        activeViewportRef.current
      ) || cameraRef.current;
      snapCameraToAxis(cam, axis);
    };
    return () => clearInterval(interval);
  }, [isPlaying]);

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

  // ── Loop cut preview ──────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTool === "loop_cut" && editMode === "edit")
      buildLoopCutPreview(loopCutT);
  }, [loopCutT, activeTool, editMode]);

  // ── Close all workspace panels ────────────────────────────────────────────
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
    setMocapWorkspaceOpen(false);
    setGamepadOpen(false);
    setProMeshOpen(false);
    setFluidPanelOpen(false);
    setWeatherPanelOpen(false);
    setDestructionPanelOpen(false);
    setEnvGenOpen(false);
    setCityGenOpen(false);
    setBuildingOpen(false);
    setPhysicsOpen(false);
    setAssetLibOpen(false);
    setNodeModOpen(false);
    setVrPreviewOpen(false);
    setCrowdGenOpen(false);
    setTerrainOpen(false);
    setFaceGenOpen(false);
    setFoliageGenOpen(false);
    setVehicleGenOpen(false);
    setCreatureGenOpen(false);
    setPropGenOpen(false);
  };

  // ── Open workspace tool ───────────────────────────────────────────────────
  const openWorkspaceTool = (toolId) => {
    if (toolId === "sculpt_workspace")   { closeAllWorkspacePanels(); ensureWorkspaceMesh("sculpt"); return; }
    if (toolId === "materials_textures") { closeAllWorkspacePanels(); setMaterialPanelOpen(true); setPaintPanelOpen(true); return; }
    if (toolId === "clothing_pattern")   { closeAllWorkspacePanels(); setClothingPanelOpen(true); setPatternPanelOpen(true); setFabricPanelOpen(true); ensureWorkspaceMesh("clothing"); return; }
    if (toolId === "hair_suite")         { closeAllWorkspacePanels(); setHairPanelOpen(true); setHairAdvancedOpen(true); setHairFXOpen(true); ensureWorkspaceMesh("hair"); return; }
    if (toolId === "rigging_suite")      { closeAllWorkspacePanels(); setAutoRigOpen(true); setAdvancedRigOpen(true); ensureWorkspaceMesh("rigging"); return; }
    closeAllWorkspacePanels();
    const map = {
      uv: () => setUvPanelOpen(true),
      materials: () => setMaterialPanelOpen(true),
      paint: () => setPaintPanelOpen(true),
      clothing: () => { setClothingPanelOpen(true); ensureWorkspaceMesh("clothing"); },
      pattern: () => { setPatternPanelOpen(true); ensureWorkspaceMesh("pattern"); },
      hair: () => setHairPanelOpen(true),
      collaborate: () => setCollaboratePanelOpen(true),
      lighting: () => setLightingCameraPanelOpen(true),
      camera: () => setLightingCameraPanelOpen(true),
      lighting_camera: () => setLightingCameraPanelOpen(true),
      grease_pencil: () => setGreasePencilPanelOpen(true),
      gamepad: () => setGamepadOpen(true),
      pro_mesh: () => setProMeshOpen(true),
      fluid: () => setFluidPanelOpen(true),
      weather: () => setWeatherPanelOpen(true),
      destruction: () => setDestructionPanelOpen(true),
      env_gen: () => setEnvGenOpen(true),
      city_gen: () => setCityGenOpen(true),
      building: () => setBuildingOpen(true),
      physics_sim: () => setPhysicsOpen(true),
      asset_lib: () => setAssetLibOpen(true),
      node_mod: () => setNodeModOpen(true),
      vr_preview: () => setVrPreviewOpen(true),
      crowd_gen: () => setCrowdGenOpen(true),
      terrain: () => setTerrainOpen(true),
      hair_adv: () => setHairAdvancedOpen(true),
      hair_fx: () => setHairFXOpen(true),
      autorig: () => setAutoRigOpen(true),
      advanced_rig: () => setAdvancedRigOpen(true),
      face_gen: () => setFaceGenOpen(true),
      foliage_gen: () => setFoliageGenOpen(true),
      vehicle_gen: () => setVehicleGenOpen(true),
      creature_gen: () => setCreatureGenOpen(true),
      prop_gen: () => setPropGenOpen(true),
      mocap: () => setMocapWorkspaceOpen(true),
      "3d_to_2d": () => setStyle3DTo2DOpen(true),
      node_compositor: () => setCompositorOpen((v) => !v),
    };
    map[toolId]?.();
  };

  // ── Scene object handlers ─────────────────────────────────────────────────
  const addSceneObject = (type) => {
    const mesh = buildPrimitiveMesh(type);
    if (mesh.geometry && mesh.geometry.index) {
      mesh.geometry = mesh.geometry.toNonIndexed();
      mesh.geometry.computeVertexNormals();
    }
    mesh.position.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
    sceneRef.current?.add(mesh);
    const objCount = sceneObjects.length;
    const obj = createSceneObject(
      type,
      type.charAt(0).toUpperCase() + type.slice(1) + "." + String(objCount + 1).padStart(3, "0"),
      mesh
    );
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

  const selectSceneObject = (id) => {
    const obj = sceneObjectsRef.current.find((o) => o.id === id);
    if (!obj) return;
    sceneObjectsRef.current.forEach((o) => {
      if (!o.mesh) return;
      o.mesh.traverse((m) => {
        if (m.isMesh) {
          const oldMat = m.material;
          m.material = new THREE.MeshStandardMaterial({
            color: oldMat.color || new THREE.Color(0x888888),
            roughness: oldMat.roughness ?? 0.5,
            metalness: oldMat.metalness ?? 0.1,
            wireframe: oldMat.wireframe ?? false,
          });
          m.material.needsUpdate = true;
          if (oldMat.dispose) oldMat.dispose();
        }
      });
    });
    setActiveObjId(id);
    meshRef.current = obj.mesh;
    if (obj.mesh) {
      if (obj.mesh.geometry?.index) {
        obj.mesh.geometry = obj.mesh.geometry.toNonIndexed();
        obj.mesh.geometry.computeVertexNormals();
      }
      obj.mesh.traverse((m) => {
        if (m.isMesh) {
          const oldMat = m.material;
          m.material = new THREE.MeshStandardMaterial({
            color: oldMat.color || new THREE.Color(0x888888),
            emissive: new THREE.Color(0xff6600),
            emissiveIntensity: 0.4,
            roughness: oldMat.roughness ?? 0.5,
            metalness: oldMat.metalness ?? 0.1,
            wireframe: oldMat.wireframe ?? false,
          });
          m.material.needsUpdate = true;
          if (oldMat.dispose) oldMat.dispose();
        }
      });
      const box = new THREE.Box3().setFromObject(obj.mesh);
      orbitState.current.radius = Math.max(box.getSize(new THREE.Vector3()).length() * 2, 3);
      if (gizmoRef.current) {
        gizmoRef.current.attach(obj.mesh);
        gizmoRef.current.group.visible = true;
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
    setStatus("Selected: " + obj.name);
  };

  const renameSceneObject = (id, name) => {
    setSceneObjects((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)));
  };

  const deleteSceneObject = (id) => {
    const obj = sceneObjects.find((o) => o.id === id);
    if (obj?.mesh) sceneRef.current?.remove(obj.mesh);
    setSceneObjects((prev) => {
      const next = prev.filter((o) => o.id !== id && o.parentId !== id);
      if (activeObjId === id) {
        const fallback = next[0];
        setActiveObjId(fallback?.id || null);
        meshRef.current = fallback?.mesh || null;
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

  const groupSelected = () => {
    if (!activeObjId) return;
    const group = new THREE.Group();
    sceneRef.current?.add(group);
    const groupObj = createSceneObject("group", "Group", group);
    setSceneObjects((prev) => {
      const next = [...prev, groupObj];
      return next.map((o) => (o.id === activeObjId ? { ...o, parentId: groupObj.id } : o));
    });
    setStatus("Grouped");
  };

  const ungroupSelected = () => {
    const obj = getActiveObj();
    if (!obj || obj.type !== "group") return;
    setSceneObjects((prev) =>
      prev.map((o) => (o.parentId === obj.id ? { ...o, parentId: null } : o))
          .filter((o) => o.id !== obj.id)
    );
    if (obj.mesh) sceneRef.current?.remove(obj.mesh);
    setStatus("Ungrouped");
  };

  // ── Model loading ─────────────────────────────────────────────────────────
  const loadModelToScene = useCallback((url, label) => {
    const DEFAULT_URLS = ["/models/michelle.glb", "/models/xbot.glb", "/models/ybot.glb", "/ybot.glb"];
    setSceneObjects((prev) => {
      const toRemove = prev.filter((o) => DEFAULT_URLS.includes(o.userData?.url));
      toRemove.forEach((o) => { if (o.mesh) sceneRef.current?.remove(o.mesh); });
      return prev.filter((o) => !DEFAULT_URLS.includes(o.userData?.url));
    });
    setActiveModelUrl(url);
    setShowModelPicker(false);
    import("three/examples/jsm/loaders/GLTFLoader.js").then(({ GLTFLoader }) => {
      const loader = new GLTFLoader();
      setStatus(`Loading ${label}...`);
      loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.name = label;
        sceneRef.current?.add(model);
        const id = Date.now();
        const newObj = { id, name: label, mesh: model, userData: { type: "glb", url } };
        setSceneObjects((prev) => [...prev, newObj]);
        setActiveObjId(id);
        meshRef.current = model;
        setStatus(`✓ ${label} loaded`);
      }, undefined, () => setStatus(`Could not load ${label}`));
    }).catch(() => setStatus("GLTFLoader unavailable"));
  }, []);

  const ensureWorkspaceMesh = useCallback((workspaceType) => {
    if (activeObjId && meshRef.current) { setStatus(`Using active mesh for ${workspaceType}`); return; }
    if (sceneObjects.length > 0 && sceneObjects[0].mesh) {
      const first = sceneObjects[0];
      setActiveObjId(first.id);
      meshRef.current = first.mesh;
      setStatus(`Using ${first.name || "scene mesh"} for ${workspaceType}`);
      return;
    }
    const DEFAULTS = {
      sculpt:   { type: "sphere", label: "Base Sculpt Sphere" },
      hair:     { type: "glb",    label: "Head Mesh",       url: "/models/michelle.glb" },
      clothing: { type: "glb",    label: "Body Mesh",       url: "/models/michelle.glb" },
      pattern:  { type: "glb",    label: "Body for Draping",url: "/models/michelle.glb" },
      fabric:   { type: "glb",    label: "Body Mesh",       url: "/models/michelle.glb" },
      shading:  { type: "sphere", label: "Shading Preview Sphere" },
      modeling: { type: "box",    label: "Default Box" },
      rigging:  { type: "glb",    label: "Y Bot Rig",       url: "/models/ybot.glb" },
      vfx:      { type: "sphere", label: "VFX Target" },
    };
    const def = DEFAULTS[workspaceType];
    if (!def) return;
    if (def.type === "glb") {
      setModelPickerContext(workspaceType);
      setShowModelPicker(true);
      loadModelToScene(def.url, def.label);
    } else {
      addPrimitive(def.type === "sphere" ? "Sphere" : "Box");
      setStatus(`✓ ${def.label} loaded — ready for ${workspaceType}`);
    }
  }, [activeObjId, sceneObjects]);

  // ── Import GLB ────────────────────────────────────────────────────────────
  const importGLB = async (file) => {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const scene = sceneRef.current;
    if (!scene) return;
    clearOverlays();
    if (meshRef.current) scene.remove(meshRef.current);
    const url = URL.createObjectURL(file);
    new GLTFLoader().load(url, (gltf) => {
      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      obj.position.sub(center);
      obj.scale.setScalar(3 / Math.max(size.x, size.y, size.z));
      scene.add(obj);
      meshRef.current = obj;
      obj.traverse((child) => {
        if (child.isMesh && !heMeshRef.current) {
          heMeshRef.current = HalfEdgeMesh.fromBufferGeometry(child.geometry);
          setStats(heMeshRef.current.stats());
        }
      });
      setStatus(`Imported ${file.name}`);
      URL.revokeObjectURL(url);
    });
  };

  // ── Export GLB ────────────────────────────────────────────────────────────
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
      try { buildMorphTargetsFromKeys(mesh, shapeKeysRef.current); } catch (e) { console.warn(e); }
    }
    if (heMeshRef.current) {
      try {
        const triData = heMeshRef.current.toTriangulatedBufferGeometry();
        const triGeo = new THREE.BufferGeometry();
        triGeo.setAttribute("position", new THREE.BufferAttribute(triData.positions, 3));
        triGeo.setIndex(new THREE.BufferAttribute(triData.indices, 1));
        triGeo.computeVertexNormals();
        if (mesh.geometry.attributes.color) {
          triGeo.setAttribute("color", mesh.geometry.attributes.color.clone());
        }
        mesh.geometry.dispose();
        mesh.geometry = triGeo;
      } catch (e) { console.warn("Triangulate on export failed:", e); }
    }
    const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
    new GLTFExporter().parse(
      mesh,
      (glb) => {
        const blob = new Blob([glb], { type: "model/gltf-binary" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "spx_mesh.glb"; a.click();
        if (localStorage.getItem("jwt-token") || localStorage.getItem("token")) {
          sendMeshToStreamPireX(blob, "spx_mesh", { polycount: meshRef.current?.geometry?.attributes?.position?.count || 0 }, (s) => console.log("[SPX Bridge]", s)).catch((e) => console.warn("[SPX Bridge]", e));
        }
        localStorage.setItem("spx_mesh_export", JSON.stringify({
          timestamp: Date.now(), name: "spx_mesh.glb",
          polyCount: heMeshRef.current?.stats()?.faces || 0,
          objectCount: sceneObjects.length || 1,
        }));
        URL.revokeObjectURL(url);
      },
      (err) => console.error(err),
      { binary: true }
    );
  };

  const exportSpxScene = () => {
    const sceneData = {
      version: "1.0", timestamp: new Date().toISOString(),
      objects: sceneObjects.map((obj) => ({
        name: obj.name, type: obj.userData?.type, params: obj.userData?.params,
        position: obj.position?.toArray(), rotation: obj.rotation?.toArray(),
        scale: obj.scale?.toArray(),
        keyframes: window.animationData ? window.animationData[obj.uuid] : [],
      })),
    };
    const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `spx_project_${Date.now()}.json`; link.click();
    console.log("💾 Scene exported to .json");
  };

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

  const recordKeyframe = (obj, key, val) => {
    if (!isAutoKey) return;
    if (typeof window.addKeyframe === "function") {
      window.addKeyframe(obj.uuid, key, val, currentFrame);
      console.log(`🔑 Keyframe: ${key} set at frame ${currentFrame}`);
    }
  };

  const updateMeshParam = (obj, key, val) => {
    if (!obj) return;
    obj.userData.params = { ...obj.userData.params, [key]: val };
    const newGeo = buildProceduralMesh(obj.userData.type, obj.userData.params);
    obj.geometry.dispose();
    obj.geometry = newGeo;
  };

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    const heMesh = heMeshRef.current;
    if (!heMesh) return;
    const { positions, indices } = heMesh.toBufferGeometry();
    setHistory((h) => [...h.slice(-20), { positions: [...positions], indices: [...indices] }]);
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
      geo.setAttribute("position", new THREE.Float32BufferAttribute(prev.positions, 3));
      geo.setIndex(new THREE.Uint32BufferAttribute(prev.indices, 1));
      geo.computeVertexNormals();
      if (mesh.isMesh) { mesh.geometry.dispose(); mesh.geometry = geo; }
      heMeshRef.current = HalfEdgeMesh.fromBufferGeometry(geo);
      setStats(heMeshRef.current.stats());
      setStatus("Undo");
      return h.slice(0, -1);
    });
  }, []);

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

  // ── Clear overlays ────────────────────────────────────────────────────────
  const clearOverlays = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    [vertDotsRef, edgeLinesRef, faceMeshRef, previewLineRef].forEach((r) => {
      if (r.current) { scene.remove(r.current); r.current = null; }
    });
  };

  // ── Add primitive ─────────────────────────────────────────────────────────
  const addPrimitive = useCallback((type) => {
    addSceneObject(type);
    clearOverlays();
    setTimeout(() => {
      const mesh = meshRef.current;
      if (!mesh || !mesh.geometry) return;
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
      } catch (e) { setStatus(`Added ${type}`); }
      setSelectedVerts(new Set());
      setSelectedEdges(new Set());
      setSelectedFaces(new Set());
      if (gizmoRef.current) gizmoRef.current.attach(mesh);
      setGizmoActive(true);
    }, 50);
  }, [wireframe]);

  // ── Toggle wireframe ──────────────────────────────────────────────────────
  const toggleWireframe = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const newWF = !wireframe;
    setWireframe(newWF);
    mesh.traverse((m) => { if (m.isMesh && m.material) m.material.wireframe = newWF; });
  }, [wireframe]);

  // ── Toggle edit mode ──────────────────────────────────────────────────────
  const toggleEditMode = useCallback(() => {
    setEditMode((m) => {
      const next = m === "object" ? "edit" : "object";
      if (next === "edit") setTimeout(() => buildVertexOverlay(), 50);
      else clearOverlays();
      return next;
    });
  }, []);

