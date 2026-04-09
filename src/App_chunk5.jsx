  // ── Build vertex overlay ───────────────────────────────────────────────────
  const buildVertexOverlay = useCallback((selVerts = selectedVerts) => {
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
      colors.push(sel ? 1 : 0.8, sel ? 0.4 : 0.8, sel ? 0 : 0.8);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, depthTest: false });
    const pts = new THREE.Points(geo, mat);
    pts.position.copy(parent.position);
    scene.add(pts);
    vertDotsRef.current = pts;
  }, [selectedVerts]);

  // ── Build edge overlay ─────────────────────────────────────────────────────
  const buildEdgeOverlay = useCallback((selEdges = selectedEdges) => {
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
      const a = e.vertex, b = e.twin.vertex;
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const sel = selEdges.has(e.id) || selEdges.has(e.twin?.id);
      colors.push(sel ? 1 : 0.2, sel ? 0.4 : 0.4, sel ? 0 : 1, sel ? 1 : 0.2, sel ? 0.4 : 0.4, sel ? 0 : 1);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, linewidth: 2 });
    const lines = new THREE.LineSegments(geo, mat);
    lines.position.copy(parent.position);
    scene.add(lines);
    edgeLinesRef.current = lines;
  }, [selectedEdges]);

  // ── Build face overlay ─────────────────────────────────────────────────────
  const buildFaceOverlay = useCallback((selFaces = selectedFaces) => {
    const scene = sceneRef.current;
    const mesh = meshRef.current;
    if (!scene || !mesh) return;
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
        if (!selFaces.has(faceIdx)) continue;
        for (let k = 0; k < 3; k++) {
          const vi = idx.getX(i + k);
          overlayPositions.push(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
          overlayColors.push(1.0, 0.4, 0.0);
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
  }, [selectedFaces]);

  // ── Build loop cut preview ─────────────────────────────────────────────────
  const buildLoopCutPreview = useCallback((t) => {
    const scene = sceneRef.current;
    const heMesh = heMeshRef.current;
    if (!scene || !heMesh) return;
    if (previewLineRef.current) { scene.remove(previewLineRef.current); previewLineRef.current = null; }
    const edges = [...heMesh.halfEdges.values()];
    const pivot = edges[Math.floor(edges.length / 4)];
    if (!pivot) return;
    const loop = pivot.edgeLoop();
    if (loop.length < 2) return;
    const pts = loop.map((e) => {
      const a = e.vertex, b = e.next?.vertex;
      if (!b) return new THREE.Vector3(a.x, a.y, a.z);
      return new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
    });
    pts.push(pts[0]);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: COLORS.teal, depthTest: false, linewidth: 3 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    previewLineRef.current = line;
  }, []);

  // ── Rebuild mesh geometry from HE mesh ────────────────────────────────────
  const rebuildMeshGeometry = useCallback(() => {
    const heMesh = heMeshRef.current;
    const mesh = meshRef.current;
    if (!heMesh || !mesh) return;
    const { positions, indices } = heMesh.toBufferGeometry();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    if (mesh.isMesh) { mesh.geometry.dispose(); mesh.geometry = geo; }
    if (editMode === "edit") {
      if (selectMode === "vert") buildVertexOverlay();
      if (selectMode === "edge") buildEdgeOverlay();
      if (selectMode === "face") buildFaceOverlay();
    }
  }, [editMode, selectMode, buildVertexOverlay, buildEdgeOverlay, buildFaceOverlay]);

  // ── Raycast helper ────────────────────────────────────────────────────────
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

  // ── Canvas click handler ──────────────────────────────────────────────────
  const onCanvasClick = useCallback((e) => {
    if (editModeRef.current !== "edit" && editModeRef.current !== "object") return;
    if (editModeRef.current === "object") {
      const canvas = canvasRef.current;
      const camera = cameraRef.current;
      if (!canvas || !camera) return;
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
      const objs = sceneObjectsRef.current;
      const sceneHits = raycaster.intersectObjects(sceneRef.current?.children || [], true)
        .filter((h) => h.object.type === "Mesh" && h.object.isMesh);
      if (sceneHits.length > 0) {
        const hitMesh = sceneHits[0].object;
        let matched = objs.find((o) => o.mesh === hitMesh);
        if (!matched) matched = objs.find((o) => o.mesh?.uuid === hitMesh.uuid);
        if (!matched) matched = objs.find((o) => { if (!o.mesh) return false; let found = false; o.mesh.traverse((m) => { if (m === hitMesh) found = true; }); return found; });
        if (!matched && objs.length > 0) {
          let minDist = Infinity;
          objs.forEach((o) => { if (!o.mesh) return; const d = o.mesh.position.distanceTo(sceneHits[0].point); if (d < minDist) { minDist = d; matched = o; } });
        }
        if (matched) selectSceneObject(matched.id);
      } else {
        objs.forEach((o) => { if (o.mesh) o.mesh.traverse((m) => { if (m.isMesh && m.material) { if (m.material.emissive) m.material.emissive.set(0x000000); m.material.emissiveIntensity = 0; } }); });
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
      let closest = null, minDist = Infinity;
      heMesh.vertices.forEach((v) => {
        const wp = new THREE.Vector3(v.x, v.y, v.z);
        const sp = wp.clone().project(cameraRef.current);
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const sx = ((sp.x + 1) / 2) * rect.width + rect.left;
        const sy = ((-sp.y + 1) / 2) * rect.height + rect.top;
        const d = Math.hypot(e.clientX - sx, e.clientY - sy);
        if (d < minDist && d < 20) { minDist = d; closest = v; }
      });
      if (closest) {
        setSelectedVerts((sv) => {
          const next = new Set(sv);
          if (next.has(closest.id)) next.delete(closest.id); else next.add(closest.id);
          buildVertexOverlay(next);
          return next;
        });
        setStatus(`Vertex ${closest.id} selected`);
      }
    } else if (selectModeRef.current === "edge") {
      let closest = null, minDist = Infinity;
      const seen = new Set();
      heMesh.halfEdges.forEach((edge) => {
        if (!edge.twin || seen.has(edge.id) || seen.has(edge.twin.id)) return;
        seen.add(edge.id);
        const a = edge.vertex, b = edge.twin.vertex;
        const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
        const sp = mid.clone().project(cameraRef.current);
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const sx = ((sp.x + 1) / 2) * rect.width + rect.left;
        const sy = ((-sp.y + 1) / 2) * rect.height + rect.top;
        const d = Math.hypot(e.clientX - sx, e.clientY - sy);
        if (d < minDist && d < 25) { minDist = d; closest = edge; }
      });
      if (closest) {
        setSelectedEdges((se) => {
          const next = new Set(se);
          if (next.has(closest.id)) next.delete(closest.id);
          else { next.add(closest.id); if (closest.twin) next.add(closest.twin.id); }
          buildEdgeOverlay(next);
          return next;
        });
        setStatus(`Edge ${closest.id} selected`);
      }
    } else if (selectModeRef.current === "face") {
      const hits = raycaster.intersectObject(meshRef.current, true);
      if (hits.length > 0) {
        const faceIdx = hits[0].faceIndex;
        setSelectedFaces((sf) => {
          const next = new Set(sf);
          if (next.has(faceIdx)) next.delete(faceIdx); else next.add(faceIdx);
          buildFaceOverlay(next);
          return next;
        });
        setStatus(`Face ${faceIdx} selected`);
      }
    }
  }, [raycast, buildVertexOverlay, buildEdgeOverlay, buildFaceOverlay]);

  // ── Knife tool ────────────────────────────────────────────────────────────
  const onKnifeClick = useCallback((e) => {
    if (vcPaintingRef.current && editModeRef.current === "paint") { applyVertexPaint(e); return; }
    if (sculptingRef.current && editModeRef.current === "sculpt") { applySculpt(e); return; }
    if (activeToolRef.current !== "knife" || editModeRef.current !== "edit") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const knife = knifeRef.current;
    knife.points.push({ x, y });
    setKnifePoints([...knife.points]);
    setStatus(`Knife: ${knife.points.length} point(s) — press Enter to cut, Esc to cancel`);
  }, []);

  const executeKnifeCut = useCallback(() => {
    const knife = knifeRef.current;
    const heMesh = heMeshRef.current;
    if (!heMesh || knife.points.length < 2) return;
    pushHistory();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const p1 = knife.points[0], p2 = knife.points[knife.points.length - 1];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const planeNormal = { x: (-dy / rect.width) * 2, y: (dx / rect.height) * 2, z: 0 };
    const midScreen = { x: (((p1.x + p2.x) / 2) / rect.width) * 2 - 1, y: -(((p1.y + p2.y) / 2) / rect.height) * 2 + 1 };
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(midScreen, cameraRef.current);
    const hits = raycaster.intersectObject(meshRef.current, true);
    const planePoint = hits.length > 0 ? hits[0].point : { x: 0, y: 0, z: 0 };
    const newVerts = heMesh.knifeCut(planeNormal, planePoint);
    rebuildMeshGeometry();
    setStats(heMesh.stats());
    knife.points = [];
    setKnifePoints([]);
    setStatus(`Knife cut — added ${newVerts.length} vertices`);
  }, [pushHistory, rebuildMeshGeometry]);

  // ── Sculpt ────────────────────────────────────────────────────────────────
  const applySculpt = useCallback((e) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    let mesh = meshRef.current;
    if (!mesh && sceneObjects.length > 0) {
      const activeObj = sceneObjects.find((o) => o.id === activeObjId) || sceneObjects[0];
      if (activeObj?.mesh) { mesh = activeObj.mesh; meshRef.current = mesh; }
    }
    if (!canvas || !camera || !mesh) return;
    const hit = getSculptHit(e, canvas, camera, mesh);
    if (!hit) return;
    pushHistory();
    applySculptStroke(mesh, hit, {
      type: sculptBrushRef.current,
      radius: sculptRadiusRef.current,
      strength: sculptStrengthRef.current,
      falloffType: sculptFalloffRef.current,
      symmetryX: sculptSymXRef.current,
      symmetryY: false,
      symmetryZ: false,
    });
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    if (mesh.geometry.attributes.normal) mesh.geometry.attributes.normal.needsUpdate = true;
    mesh.geometry.computeBoundingSphere();
    sculptStrokeCountRef.current += 1;
    if (dyntopoEnabled && sculptStrokeCountRef.current % 3 === 0 && typeof window.applyDyntopo === "function") {
      window.applyDyntopo(mesh, hit, { detailSize: 0.05 });
    }
    if (mesh.geometry?.attributes?.position) {
      setStats((s) => ({ ...s, vertices: mesh.geometry.attributes.position.count }));
    }
  }, [sculptBrush, sculptRadius, sculptStrength, sculptFalloff, sculptSymX, dyntopoEnabled, pushHistory]);

  // ── Edge slide ────────────────────────────────────────────────────────────
  const startEdgeSlide = useCallback(() => {
    const heMesh = heMeshRef.current;
    if (!heMesh) return;
    if (selectedEdges.size === 0) { setStatus("Select an edge first (Edge mode), then use G+G"); return; }
    const edgeId = [...selectedEdges][0];
    const edge = heMesh.halfEdges.get(edgeId);
    if (!edge) return;
    slideRef.current = { active: true, edge, startAmount: 0 };
    setStatus("Edge slide active — move mouse left/right, click to confirm");
  }, [selectedEdges]);

  const onSlideMouse = useCallback((e) => {
    if (!slideRef.current?.active) return;
    const dx = (e.movementX || 0) * 0.005;
    const newAmount = Math.max(-0.9, Math.min(0.9, slideRef.current.startAmount + dx));
    slideRef.current.startAmount = newAmount;
    setSlideAmount(newAmount);
    const heMesh = heMeshRef.current;
    if (!heMesh) return;
    heMesh.slideEdge(slideRef.current.edge, newAmount);
    rebuildMeshGeometry();
  }, [rebuildMeshGeometry]);

  const confirmEdgeSlide = useCallback(() => {
    if (!slideRef.current?.active) return;
    slideRef.current = { active: false };
    setStatus(`Edge slide applied — amount: ${slideAmount.toFixed(3)}`);
    setStats(heMeshRef.current?.stats() || stats);
  }, [slideAmount, stats]);

  // ── Loop cut ──────────────────────────────────────────────────────────────
  const applyLoopCut = useCallback(() => {
    const heMesh = heMeshRef.current;
    const mesh = meshRef.current;
    if (!heMesh || !mesh) { setStatus("Add a mesh first"); return; }
    pushHistory();
    const yPos = (loopCutT - 0.5) * 1.8;
    const newVerts = heMesh.planeCut("y", yPos, loopCutT);
    if (!newVerts || newVerts.length === 0) {
      const xPos = (loopCutT - 0.5) * 1.8;
      const xVerts = heMesh.planeCut("x", xPos, loopCutT);
      if (!xVerts || xVerts.length === 0) { setStatus("Loop cut: no edges cross that position — try adjusting t"); return; }
    }
    rebuildMeshGeometry();
    if (previewLineRef.current) { sceneRef.current?.remove(previewLineRef.current); previewLineRef.current = null; }
    const s = heMesh.stats();
    setStats(s);
    setStatus(`Loop cut — +${newVerts.length} verts · ${s.vertices} total · ${s.faces} faces`);
  }, [loopCutT, pushHistory, rebuildMeshGeometry]);

