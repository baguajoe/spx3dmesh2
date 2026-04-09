import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

const C = { bg: "#06060f", bg2: "#0d0d1a", bg3: "#12121f", border: "#1e1e35", teal: "#00ffc8", orange: "#FF6600", white: "#e8e8f0", muted: "#4a4a6a", font: "'JetBrains Mono', monospace" };

const TOOLS = [
  { id: "wall", label: "Wall", icon: "🧱", desc: "Place walls" },
  { id: "floor", label: "Floor", icon: "⬛", desc: "Add floors" },
  { id: "window", label: "Window", icon: "🪟", desc: "Add windows" },
  { id: "door", label: "Door", icon: "🚪", desc: "Add doors" },
  { id: "stair", label: "Stair", icon: "🪜", desc: "Build stairs" },
  { id: "roof", label: "Roof", icon: "🏠", desc: "Place roof" },
  { id: "select", label: "Select", icon: "↖️", desc: "Select / move" },
  { id: "erase", label: "Erase", icon: "🗑️", desc: "Delete object" },
];

const MATERIALS_LIST = [
  { id: "concrete", label: "Concrete", color: "#888888" },
  { id: "brick", label: "Brick", color: "#8b4513" },
  { id: "wood", label: "Wood", color: "#8b6914" },
  { id: "glass", label: "Glass", color: "#7ab8d4", transparent: true, opacity: 0.5 },
  { id: "metal", label: "Metal", color: "#556677" },
  { id: "drywall", label: "Drywall", color: "#eeeecc" },
  { id: "marble", label: "Marble", color: "#f0eee8" },
  { id: "tile", label: "Tile", color: "#ccddee" },
];

function SliderRow({ label, value, min, max, step = 0.1, onChange, unit = "" }) {
  return (
    <div className="spnl-row">
      <span className="spnl-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} className="spnl-slider" />
      <span style={s.val}>{value}{unit}</span>
    </div>
  );
}

function makeWall(w, h, d, matDef) {
  const mat = new THREE.MeshLambertMaterial({ color: matDef.color, transparent: !!matDef.transparent, opacity: matDef.opacity || 1 });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

function makeWindow(w, h) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.08), new THREE.MeshLambertMaterial({ color: "#888888" }));
  g.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.1), new THREE.MeshLambertMaterial({ color: "#7ab8d4", transparent: true, opacity: 0.5 }));
  glass.position.z = 0.05;
  g.add(glass);
  return g;
}

function makeDoor(w, h) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, h + 0.1, 0.1), new THREE.MeshLambertMaterial({ color: "#666666" }));
  g.add(frame);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, h - 0.05, 0.06), new THREE.MeshLambertMaterial({ color: "#8b6914" }));
  panel.position.z = 0.02;
  g.add(panel);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshLambertMaterial({ color: "#ddaa44" }));
  knob.position.set(w * 0.35, -h * 0.1, 0.08);
  g.add(knob);
  return g;
}

function makeStairs(steps, w, stepH, stepD) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: "#888888" });
  for (let i = 0; i < steps; i++) {
    const tread = new THREE.Mesh(new THREE.BoxGeometry(w, stepH, stepD), mat);
    tread.position.set(0, stepH * (i + 0.5), -stepD * i);
    g.add(tread);
  }
  return g;
}

function makeRoof(type, w, d) {
  if (type === "flat") {
    return new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), new THREE.MeshLambertMaterial({ color: "#555566" }));
  } else if (type === "gable") {
    const g = new THREE.Group();
    const ridge = w * 0.5;
    const verts = new Float32Array([
      -w / 2, 0, -d / 2,  w / 2, 0, -d / 2,  0, ridge * 0.7, 0,
      -w / 2, 0,  d / 2,  w / 2, 0,  d / 2,  0, ridge * 0.7, 0,
      -w / 2, 0, -d / 2, -w / 2, 0,  d / 2,  0, ridge * 0.7, 0,
       w / 2, 0, -d / 2,  w / 2, 0,  d / 2,  0, ridge * 0.7, 0,
    ]);
    const roofGeo = new THREE.BufferGeometry();
    roofGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    roofGeo.setIndex([0,1,2, 3,4,5, 6,7,8, 9,10,11]);
    roofGeo.computeVertexNormals();
    return new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: "#883322", side: THREE.DoubleSide }));
  } else {
    return new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.6, w * 0.8, 8), new THREE.MeshLambertMaterial({ color: "#883322" }));
  }
}

export default function BuildingSimulator({ scene }) {
  const canvasRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const sceneRef = useRef();
  const animRef = useRef();
  const objectsRef = useRef([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const gridHelperRef = useRef(null);

  const [tool, setTool] = useState("wall");
  const [matId, setMatId] = useState("concrete");
  const [wallW, setWallW] = useState(4);
  const [wallH, setWallH] = useState(3);
  const [wallD, setWallD] = useState(0.3);
  const [winW, setWinW] = useState(1.2);
  const [winH, setWinH] = useState(1.5);
  const [doorW, setDoorW] = useState(1.0);
  const [doorH, setDoorH] = useState(2.2);
  const [stairSteps, setStairSteps] = useState(8);
  const [stairW, setStairW] = useState(2);
  const [roofType, setRoofType] = useState("gable");
  const [floorLevel, setFloorLevel] = useState(0);
  const [gridSnap, setGridSnap] = useState(1);
  const [selected, setSelected] = useState(null);
  const [objList, setObjList] = useState([]);
  const [stats, setStats] = useState({ objects: 0, tris: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(C.bg);
    sceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    camera.position.set(15, 15, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    threeScene.add(new THREE.AmbientLight("#8899aa", 0.7));
    const sun = new THREE.DirectionalLight("#ffffff", 1.2);
    sun.position.set(20, 30, 20);
    sun.castShadow = true;
    threeScene.add(sun);

    const gridHelper = new THREE.GridHelper(60, 60, C.border, C.border);
    gridHelper.position.y = 0;
    threeScene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshLambertMaterial({ color: "#0a0a14", transparent: true, opacity: 0.8 }));
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.01;
    groundPlane.name = "ground";
    groundPlane.receiveShadow = true;
    threeScene.add(groundPlane);

    // Orbit
    let isDragging = false, isRight = false, lastX = 0, lastY = 0, theta = 0.5, phi = 0.6, radius = 35;
    const down = e => { isDragging = true; isRight = e.button === 2; lastX = e.clientX; lastY = e.clientY; };
    const up = () => { isDragging = false; };
    const move = e => {
      if (!isDragging) return;
      if (isRight) {
        theta -= (e.clientX - lastX) * 0.01;
        phi = Math.max(0.05, Math.min(1.5, phi - (e.clientY - lastY) * 0.01));
        camera.position.set(radius * Math.sin(theta) * Math.cos(phi), radius * Math.sin(phi), radius * Math.cos(theta) * Math.cos(phi));
        camera.lookAt(0, 0, 0);
      }
      lastX = e.clientX; lastY = e.clientY;
    };
    const wheel = e => {
      radius = Math.max(5, Math.min(100, radius + e.deltaY * 0.05));
      camera.position.set(radius * Math.sin(theta) * Math.cos(phi), radius * Math.sin(phi), radius * Math.cos(theta) * Math.cos(phi));
      camera.lookAt(0, 0, 0);
    };
    canvas.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    canvas.addEventListener("wheel", wheel, { passive: true });
    canvas.addEventListener("contextmenu", e => e.preventDefault());

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (renderer.domElement.width !== w || renderer.domElement.height !== h) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      renderer.render(threeScene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mousemove", move);
      canvas.removeEventListener("wheel", wheel);
      renderer.dispose();
    };
  }, []);

  const getClickPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const ground = sceneRef.current.getObjectByName("ground");
    if (!ground) return null;
    const hits = raycasterRef.current.intersectObject(ground);
    if (!hits.length) return null;
    const pt = hits[0].point;
    const snap = gridSnap;
    return new THREE.Vector3(Math.round(pt.x / snap) * snap, floorLevel, Math.round(pt.z / snap) * snap);
  }, [gridSnap, floorLevel]);

  const placeObject = useCallback((e) => {
    if (e.button !== 0) return;
    const threeScene = sceneRef.current;
    if (!threeScene) return;

    if (tool === "select" || tool === "erase") {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const hits = raycasterRef.current.intersectObjects(objectsRef.current.map(o => o.mesh), true);
      if (hits.length) {
        const hitObj = hits[0].object;
        const found = objectsRef.current.find(o => o.mesh === hitObj || o.mesh.getObjectById(hitObj.id));
        if (found) {
          if (tool === "erase") {
            threeScene.remove(found.mesh);
            objectsRef.current = objectsRef.current.filter(o => o !== found);
            setObjList([...objectsRef.current]);
          } else {
            setSelected(found.id);
          }
        }
      }
      return;
    }

    const pos = getClickPos(e);
    if (!pos) return;

    const matDef = MATERIALS_LIST.find(m => m.id === matId) || MATERIALS_LIST[0];
    let mesh;
    let label = tool;

    if (tool === "wall") {
      mesh = makeWall(wallW, wallH, wallD, matDef);
      mesh.position.set(pos.x, pos.y + wallH / 2, pos.z);
    } else if (tool === "floor") {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(wallW, 0.2, wallW), new THREE.MeshLambertMaterial({ color: matDef.color }));
      mesh.position.set(pos.x, pos.y, pos.z);
    } else if (tool === "window") {
      mesh = makeWindow(winW, winH);
      mesh.position.set(pos.x, pos.y + wallH * 0.6, pos.z);
    } else if (tool === "door") {
      mesh = makeDoor(doorW, doorH);
      mesh.position.set(pos.x, pos.y + doorH / 2, pos.z);
    } else if (tool === "stair") {
      mesh = makeStairs(stairSteps, stairW, 0.2, 0.35);
      mesh.position.set(pos.x, pos.y, pos.z);
      label = `Stairs (${stairSteps})`;
    } else if (tool === "roof") {
      mesh = makeRoof(roofType, wallW * 1.2, wallW * 1.2);
      mesh.position.set(pos.x, pos.y + wallH + 0.1, pos.z);
      label = `Roof (${roofType})`;
    }

    if (!mesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const id = `${tool}_${Date.now()}`;
    const entry = { id, mesh, type: tool, label: `${label} @ (${Math.round(pos.x)},${Math.round(pos.y)},${Math.round(pos.z)})`, pos };
    threeScene.add(mesh);
    objectsRef.current.push(entry);
    setObjList([...objectsRef.current]);

    let tris = 0;
    threeScene.traverse(o => { if (o.isMesh && o.geometry) tris += (o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position?.count / 3 || 0); });
    setStats({ objects: objectsRef.current.length, tris: Math.round(tris) });
  }, [tool, matId, wallW, wallH, wallD, winW, winH, doorW, doorH, stairSteps, stairW, roofType, getClickPos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("click", placeObject);
    return () => canvas.removeEventListener("click", placeObject);
  }, [placeObject]);

  const clearAll = () => {
    const threeScene = sceneRef.current;
    if (!threeScene) return;
    objectsRef.current.forEach(o => threeScene.remove(o.mesh));
    objectsRef.current = [];
    setObjList([]);
    setStats({ objects: 0, tris: 0 });
    setSelected(null);
  };

  const exportBuilding = () => {
    const data = { objects: objectsRef.current.map(o => ({ id: o.id, type: o.type, label: o.label, position: o.pos })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "building.json"; a.click();
  };

  return (
    <div className="spnl-root">
      {/* Tool strip */}
      <div style={s.left}>
        {TOOLS.map(t => (
          <button key={t.id} style={s.toolBtn(tool === t.id)} onClick={() => setTool(t.id)} title={t.desc}>
            {t.icon}
          </button>
        ))}
      </div>

      {/* Sidebar */}
      <div style={s.sidebar}>
        <div className="spnl-section-label">Active Tool: {TOOLS.find(t => t.id === tool)?.label}</div>

        {(tool === "wall" || tool === "floor") && (
          <>
            <SliderRow label="Width" value={wallW} min={0.5} max={20} step={0.5} onChange={setWallW} unit="u" />
            <SliderRow label="Height" value={wallH} min={1} max={20} step={0.5} onChange={setWallH} unit="u" />
            {tool === "wall" && <SliderRow label="Thickness" value={wallD} min={0.1} max={1} step={0.1} onChange={setWallD} unit="u" />}
          </>
        )}
        {tool === "window" && (
          <>
            <SliderRow label="Width" value={winW} min={0.4} max={4} step={0.1} onChange={setWinW} unit="u" />
            <SliderRow label="Height" value={winH} min={0.4} max={3} step={0.1} onChange={setWinH} unit="u" />
          </>
        )}
        {tool === "door" && (
          <>
            <SliderRow label="Width" value={doorW} min={0.6} max={3} step={0.1} onChange={setDoorW} unit="u" />
            <SliderRow label="Height" value={doorH} min={1.5} max={4} step={0.1} onChange={setDoorH} unit="u" />
          </>
        )}
        {tool === "stair" && (
          <>
            <SliderRow label="Steps" value={stairSteps} min={2} max={24} step={1} onChange={setStairSteps} />
            <SliderRow label="Width" value={stairW} min={0.5} max={6} step={0.5} onChange={setStairW} unit="u" />
          </>
        )}
        {tool === "roof" && (
          <div style={{ padding: "0 12px 8px" }}>
            {["flat", "gable", "cone"].map(r => (
              <button key={r} onClick={() => setRoofType(r)} style={{ ...s.btn(roofType === r ? "primary" : ""), margin: "2px", fontSize: 9, padding: "4px 8px" }}>{r}</button>
            ))}
          </div>
        )}

        <div style={s.divider} />
        <SliderRow label="Floor Level" value={floorLevel} min={0} max={40} step={3} onChange={setFloorLevel} unit="u" />
        <SliderRow label="Snap Grid" value={gridSnap} min={0.25} max={4} step={0.25} onChange={setGridSnap} unit="u" />

        <div style={s.divider} />
        <div className="spnl-section-label">Material</div>
        <div style={s.matGrid}>
          {MATERIALS_LIST.map(m => (
            <div key={m.id} style={s.matBtn(matId === m.id, m.color)} onClick={() => setMatId(m.id)}>
              <div style={s.matSwatch(m.color)} />
              <div>{m.label}</div>
            </div>
          ))}
        </div>

        <div style={s.divider} />
        <div className="spnl-section-label">Objects ({objList.length})</div>
        <div style={s.objList}>
          {objList.slice(-8).reverse().map(o => (
            <div key={o.id} style={s.objItem(selected === o.id)} onClick={() => setSelected(o.id)}>
              <span>{o.label.substring(0, 22)}</span>
              <button style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); sceneRef.current?.remove(o.mesh); objectsRef.current = objectsRef.current.filter(x => x.id !== o.id); setObjList([...objectsRef.current]); }}>×</button>
            </div>
          ))}
        </div>

        <div style={s.divider} />
        <div className="spnl-btn-row">
          <button style={s.btn("primary")} onClick={exportBuilding}>💾 EXPORT</button>
          <button style={s.btn("danger")} onClick={clearAll}>🗑️ CLEAR</button>
        </div>
      </div>

      {/* Viewport */}
      <div style={s.main}>
        <div style={s.toolbar}>
          <span className="spnl-dim">BUILDING SIMULATOR</span>
          <span style={{ fontSize: 9, color: C.teal, marginLeft: 8 }}>LEFT CLICK: Place  |  RIGHT DRAG: Orbit  |  SCROLL: Zoom</span>
          <div className="spnl-ml-auto">
            <span style={s.tag(C.teal)}>TOOL: {tool.toUpperCase()}</span>
            <span style={s.tag(C.orange)}>LVL: {floorLevel}u</span>
          </div>
        </div>
        <canvas ref={canvasRef} style={s.canvas} />
        <div style={s.statusBar}>
          <span>OBJECTS: {stats.objects}</span>
          <span>TRIANGLES: {stats.tris.toLocaleString()}</span>
          <span className="spnl-ml-auto">MAT: {matId.toUpperCase()} | SNAP: {gridSnap}u</span>
        </div>
      </div>
    </div>
  );
}
