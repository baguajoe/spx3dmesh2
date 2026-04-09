import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

const C = { bg: "#06060f", bg2: "#0d0d1a", bg3: "#12121f", border: "#1e1e35", teal: "#00ffc8", orange: "#FF6600", white: "#e8e8f0", muted: "#4a4a6a", font: "'JetBrains Mono', monospace" };

const CATEGORIES = {
  props: {
    label: "Props", icon: "📦",
    assets: [
      { id: "barrel", label: "Barrel", icon: "🛢️", build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12), new THREE.MeshLambertMaterial({ color: "#5a3a1a" }))); return g; } },
      { id: "crate", label: "Crate", icon: "📦", build: () => new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: "#8b6914" })) },
      { id: "trash_can", label: "Trash Can", icon: "🗑️", build: () => new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.9, 10), new THREE.MeshLambertMaterial({ color: "#555555" })) },
      { id: "fire_hydrant", label: "Hydrant", icon: "🚒", build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 8), new THREE.MeshLambertMaterial({ color: "#cc2200" }))); return g; } },
      { id: "lamppost", label: "Lamppost", icon: "💡", build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 4, 6), new THREE.MeshLambertMaterial({ color: "#333344" }))); const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshLambertMaterial({ color: "#ffffcc", emissive: "#ffffcc", emissiveIntensity: 1 })); b.position.y = 2.3; g.add(b); return g; } },
      { id: "mailbox", label: "Mailbox", icon: "📬", build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), new THREE.MeshLambertMaterial({ color: "#2244aa" }))); return g; } },
      { id: "bench", label: "Bench", icon: "🪑", build: () => { const g = new THREE.Group(); g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.5), new THREE.MeshLambertMaterial({ color: "#6b3a2a" })), { position: new THREE.Vector3(0, 0.5, 0) })); [-0.6, 0.6].forEach(x => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.4), new THREE.MeshLambertMaterial({ color: "#444444" })); leg.position.set(x, 0.25, 0); g.add(leg); }); return g; } },
    ]
  },
  furniture: {
    label: "Furniture", icon: "🛋️",
    assets: [
      { id: "chair", label: "Chair", icon: "🪑", build: () => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: "#5a3a1a" }); g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), mat), { position: new THREE.Vector3(0, 0.5, 0) })); [[-0.35,-0.35],[-0.35,0.35],[0.35,-0.35],[0.35,0.35]].forEach(([x,z]) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), mat); leg.position.set(x, 0.25, z); g.add(leg); }); const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.08), mat); back.position.set(0, 0.95, -0.36); g.add(back); return g; } },
      { id: "table", label: "Table", icon: "🪑", build: () => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: "#7a5a2a" }); g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 1), mat), { position: new THREE.Vector3(0, 0.8, 0) })); [[-0.9,-0.4],[-0.9,0.4],[0.9,-0.4],[0.9,0.4]].forEach(([x,z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.8,5),mat); l.position.set(x,0.4,z); g.add(l); }); return g; } },
      { id: "sofa", label: "Sofa", icon: "🛋️", build: () => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: "#334488" }); g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.9), mat), { position: new THREE.Vector3(0, 0.2, 0) })); g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 0.25), mat), { position: new THREE.Vector3(0, 0.8, -0.32) })); [-1, 1].forEach(x => { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.9), mat); arm.position.set(x * 1.1, 0.5, 0); g.add(arm); }); return g; } },
      { id: "bed", label: "Bed", icon: "🛏️", build: () => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: "#8b4513" }); const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 2.2), mat); frame.position.y = 0.15; g.add(frame); const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 2.0), new THREE.MeshLambertMaterial({ color: "#ffffff" })); mattress.position.y = 0.42; g.add(mattress); return g; } },
      { id: "bookshelf", label: "Shelf", icon: "📚", build: () => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: "#6b4226" }); g.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.35), mat)); [0.3, 0.9, 1.5].forEach(y => { const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.3), mat); shelf.position.y = y - 0.9; g.add(shelf); }); return g; } },
      { id: "desk", label: "Desk", icon: "🖥️", build: () => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: "#4a4a5a" }); g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.85), mat), { position: new THREE.Vector3(0, 0.75, 0) })); [[-0.85,-0.38],[0.85,-0.38],[-0.85,0.38],[0.85,0.38]].forEach(([x,z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.75,0.05),mat); l.position.set(x,0.375,z); g.add(l); }); return g; } },
    ]
  },
  architecture: {
    label: "Architecture", icon: "🏛️",
    assets: [
      { id: "column", label: "Column", icon: "🏛️", build: () => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: "#ccccbb" }); g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 4, 12), mat), { position: new THREE.Vector3(0, 2, 0) })); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), mat)); g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.7), mat), { position: new THREE.Vector3(0, 4.1, 0) })); return g; } },
      { id: "arch", label: "Arch", icon: "🌉", build: () => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: "#999988" }); [-1.5, 1.5].forEach(x => { const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5), mat); pillar.position.set(x, 1.5, 0); g.add(pillar); }); const top = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.5, 0.5), mat); top.position.set(0, 3.25, 0); g.add(top); return g; } },
      { id: "wall_segment", label: "Wall", icon: "🧱", build: () => new THREE.Mesh(new THREE.BoxGeometry(4, 3, 0.3), new THREE.MeshLambertMaterial({ color: "#888877" })) },
      { id: "stairs_arch", label: "Stairs", icon: "🪜", build: () => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: "#999988" }); for (let i = 0; i < 6; i++) { const step = new THREE.Mesh(new THREE.BoxGeometry(2, 0.25, 0.5), mat); step.position.set(0, 0.125 + i * 0.25, -i * 0.5); g.add(step); } return g; } },
      { id: "dome", label: "Dome", icon: "⛩️", build: () => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: "#ccccbb" }); g.add(new THREE.Mesh(new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat)); g.add(new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.3, 16), mat)); return g; } },
      { id: "fence_post", label: "Fence", icon: "🔲", build: () => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: "#7a5a3a" }); for (let i = 0; i < 5; i++) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), mat); post.position.set(i * 0.8, 0.75, 0); g.add(post); } const rail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.06), mat); rail.position.set(1.6, 1.1, 0); g.add(rail); return g; } },
    ]
  },
  vegetation: {
    label: "Vegetation", icon: "🌿",
    assets: [
      { id: "pine", label: "Pine", icon: "🌲", build: () => { const g = new THREE.Group(); g.add(Object.assign(new THREE.Mesh(new THREE.ConeGeometry(1.5, 4, 8), new THREE.MeshLambertMaterial({ color: "#1a5c1a" })), { position: new THREE.Vector3(0, 3, 0) })); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6), new THREE.MeshLambertMaterial({ color: "#4a2800" }))); return g; } },
      { id: "oak", label: "Oak", icon: "🌳", build: () => { const g = new THREE.Group(); g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6), new THREE.MeshLambertMaterial({ color: "#2a6a2a" })), { position: new THREE.Vector3(0, 4, 0) })); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.5, 6), new THREE.MeshLambertMaterial({ color: "#5a3300" }))); return g; } },
      { id: "bush", label: "Bush", icon: "🌿", build: () => new THREE.Mesh(new THREE.SphereGeometry(0.8, 7, 5), new THREE.MeshLambertMaterial({ color: "#1a5c1a" })) },
      { id: "palm", label: "Palm", icon: "🌴", build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 5, 8), new THREE.MeshLambertMaterial({ color: "#7a5530" }))); g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 5), new THREE.MeshLambertMaterial({ color: "#1a7a2a" })), { position: new THREE.Vector3(0, 4, 0) })); return g; } },
      { id: "flower", label: "Flower", icon: "🌸", build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5), new THREE.MeshLambertMaterial({ color: "#2a7a2a" }))); g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), new THREE.MeshLambertMaterial({ color: "#ff6699" })), { position: new THREE.Vector3(0, 0.4, 0) })); return g; } },
      { id: "rock", label: "Rock", icon: "🪨", build: () => new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), new THREE.MeshLambertMaterial({ color: "#777788" })) },
    ]
  },
  scifi: {
    label: "Sci-Fi", icon: "🚀",
    assets: [
      { id: "console", label: "Console", icon: "🖥️", build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.8), new THREE.MeshLambertMaterial({ color: "#0a1a2a" }))); g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.02), new THREE.MeshLambertMaterial({ color: "#003366", emissive: "#001133", emissiveIntensity: 0.5 })), { position: new THREE.Vector3(0, 0.2, 0.41) })); return g; } },
      { id: "pod", label: "Cryo Pod", icon: "🧬", build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 2.2, 10), new THREE.MeshLambertMaterial({ color: "#1a2a3a" }))); g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.8, 10), new THREE.MeshLambertMaterial({ color: "#00ccff", transparent: true, opacity: 0.3 })), { position: new THREE.Vector3(0, 0, 0) })); return g; } },
      { id: "panel_tech", label: "Tech Panel", icon: "📡", build: () => new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 0.1), new THREE.MeshLambertMaterial({ color: "#0a1a2a", emissive: "#002244", emissiveIntensity: 0.5 })) },
      { id: "turret", label: "Turret", icon: "🎯", build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.5, 8), new THREE.MeshLambertMaterial({ color: "#333344" }))); g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), new THREE.MeshLambertMaterial({ color: "#555566" })), { position: new THREE.Vector3(0, 0.5, 0.3), rotation: new THREE.Euler(-0.5, 0, 0) })); return g; } },
      { id: "antenna_sci", label: "Antenna", icon: "📡", build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 5, 6), new THREE.MeshLambertMaterial({ color: "#888888" }))); g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshLambertMaterial({ color: "#ff4400", emissive: "#ff2200", emissiveIntensity: 1 })), { position: new THREE.Vector3(0, 2.7, 0) })); return g; } },
      { id: "hover_platform", label: "Hover Platform", icon: "🔵", build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.15, 16), new THREE.MeshLambertMaterial({ color: "#1a1a3a" }))); g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.05, 16), new THREE.MeshLambertMaterial({ color: "#0066ff", emissive: "#003399", emissiveIntensity: 0.8 })), { position: new THREE.Vector3(0, -0.1, 0) })); return g; } },
    ]
  },
};

const s = {
  root: { display: "flex", height: "100%", background: C.bg, fontFamily: C.font, color: C.white, overflow: "hidden" },
  left: { width: 220, background: C.bg2, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  right: { width: 200, background: C.bg2, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 },
  sectionLabel: { fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.muted, padding: "12px 12px 6px" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 12px", gap: 6 },
  label: { fontSize: 10, color: C.muted, minWidth: 70 },
  slider: { flex: 1, accentColor: C.teal, cursor: "pointer" },
  val: { fontSize: 9, color: C.teal, width: 36, textAlign: "right" },
  divider: { height: 1, background: C.border, margin: "6px 0" },
  canvas: { flex: 1, display: "block", width: "100%", height: "100%" },
  toolbar: { display: "flex", gap: 6, padding: "7px 10px", background: C.bg2, borderBottom: `1px solid ${C.border}`, alignItems: "center", flexShrink: 0, flexWrap: "wrap" },
  statusBar: { display: "flex", gap: 12, padding: "6px 12px", background: C.bg2, borderTop: `1px solid ${C.border}`, fontSize: 9, color: C.muted, flexShrink: 0 },
  btn: (v) => ({ background: v === "primary" ? C.teal : v === "danger" ? "#ff4444" : C.bg3, color: v === "primary" ? C.bg : C.white, border: `1px solid ${v === "primary" ? C.teal : v === "danger" ? "#ff4444" : C.border}`, borderRadius: 3, fontFamily: C.font, fontSize: 9, fontWeight: 700, padding: "5px 10px", cursor: "pointer" }),
  btnRow: { display: "flex", gap: 4, padding: "6px 12px", flexWrap: "wrap" },
  catBtn: (a) => ({ background: a ? `${C.teal}15` : "none", border: `none`, borderLeft: `2px solid ${a ? C.teal : "transparent"}`, padding: "7px 12px", cursor: "pointer", color: a ? C.teal : C.muted, fontFamily: C.font, fontSize: 10, textAlign: "left", width: "100%", display: "flex", alignItems: "center", gap: 6 }),
  assetGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, padding: "0 10px 10px" },
  assetCard: (placed) => ({ background: placed ? `${C.teal}10` : C.bg3, border: `1px solid ${placed ? C.teal : C.border}`, borderRadius: 4, padding: "8px 5px", cursor: "grab", textAlign: "center", fontFamily: C.font, fontSize: 9, color: placed ? C.teal : C.white, userSelect: "none", transition: "all 0.15s" }),
  searchInput: { background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 3, color: C.white, fontFamily: C.font, fontSize: 10, padding: "5px 10px", width: "calc(100% - 20px)", margin: "0 10px 8px", display: "block" },
  placedItem: (sel) => ({ background: sel ? `${C.teal}15` : C.bg3, border: `1px solid ${sel ? C.teal : C.border}`, borderRadius: 3, padding: "5px 8px", cursor: "pointer", fontSize: 9, marginBottom: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }),
  tag: (c) => ({ display: "inline-block", fontSize: 8, padding: "2px 6px", borderRadius: 2, background: `${c}20`, color: c, border: `1px solid ${c}40` }),
};

function SliderRow({ label, value, min, max, step = 0.1, onChange, unit = "" }) {
  return (
    <div style={s.row}>
      <span style={s.label}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} style={s.slider} />
      <span style={s.val}>{value}{unit}</span>
    </div>
  );
}

export default function AssetLibrary({ scene }) {
  const canvasRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const sceneRef = useRef();
  const animRef = useRef();
  const placedRef = useRef([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const [category, setCategory] = useState("props");
  const [search, setSearch] = useState("");
  const [placedList, setPlacedList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [placeScale, setPlaceScale] = useState(1.0);
  const [placeRotY, setPlaceRotY] = useState(0);
  const [randomize, setRandomize] = useState(true);
  const [stats, setStats] = useState({ objects: 0, tris: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color("#0a0a14");
    threeScene.fog = new THREE.FogExp2("#0a0a14", 0.01);
    sceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    threeScene.add(new THREE.AmbientLight("#7788aa", 0.7));
    const sun = new THREE.DirectionalLight("#ffffff", 1.5);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    threeScene.add(sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: "#111118" }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = "ground";
    threeScene.add(ground);
    threeScene.add(new THREE.GridHelper(80, 40, C.border, C.border));

    let isDragging = false, lastX = 0, lastY = 0, theta = 0.3, phi = 0.4, radius = 22;
    const down = e => { isDragging = true; lastX = e.clientX; lastY = e.clientY; };
    const up = () => { isDragging = false; };
    const move = e => {
      if (!isDragging) return;
      theta -= (e.clientX - lastX) * 0.01;
      phi = Math.max(0.05, Math.min(1.4, phi - (e.clientY - lastY) * 0.01));
      lastX = e.clientX; lastY = e.clientY;
      camera.position.set(radius * Math.sin(theta) * Math.cos(phi), radius * Math.sin(phi), radius * Math.cos(theta) * Math.cos(phi));
      camera.lookAt(0, 0, 0);
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

  const placeAsset = useCallback((assetDef) => {
    const threeScene = sceneRef.current;
    if (!threeScene) return;
    const mesh = assetDef.build();
    const sc = randomize ? placeScale * (0.8 + Math.random() * 0.4) : placeScale;
    mesh.scale.setScalar(sc);
    const spread = 8;
    mesh.position.set((Math.random() - 0.5) * spread, 0, (Math.random() - 0.5) * spread);
    mesh.rotation.y = randomize ? Math.random() * Math.PI * 2 : (placeRotY * Math.PI / 180);
    const castShadow = o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } o.children?.forEach(castShadow); };
    castShadow(mesh);
    threeScene.add(mesh);
    const id = `${assetDef.id}_${Date.now()}`;
    const entry = { id, mesh, assetId: assetDef.id, label: `${assetDef.label} #${placedRef.current.length + 1}` };
    placedRef.current.push(entry);
    setPlacedList([...placedRef.current]);
    // Update stats
    let tris = 0;
    threeScene.traverse(o => { if (o.isMesh && o.geometry) tris += (o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes?.position?.count / 3 || 0); });
    setStats({ objects: placedRef.current.length, tris: Math.round(tris) });
  }, [placeScale, placeRotY, randomize]);

  const removeSelected = () => {
    if (!selected) return;
    const threeScene = sceneRef.current;
    const entry = placedRef.current.find(e => e.id === selected);
    if (entry && threeScene) threeScene.remove(entry.mesh);
    placedRef.current = placedRef.current.filter(e => e.id !== selected);
    setPlacedList([...placedRef.current]);
    setSelected(null);
    setStats(prev => ({ ...prev, objects: placedRef.current.length }));
  };

  const clearAll = () => {
    const threeScene = sceneRef.current;
    placedRef.current.forEach(e => threeScene?.remove(e.mesh));
    placedRef.current = [];
    setPlacedList([]);
    setSelected(null);
    setStats({ objects: 0, tris: 0 });
  };

  const exportLibrary = () => {
    const data = { assets: placedRef.current.map(e => ({ id: e.assetId, label: e.label, position: e.mesh.position.toArray(), rotation: [e.mesh.rotation.x, e.mesh.rotation.y, e.mesh.rotation.z], scale: e.mesh.scale.x })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "asset_layout.json"; a.click();
  };

  const filteredAssets = Object.entries(CATEGORIES).flatMap(([catId, cat]) =>
    search ? cat.assets.filter(a => a.label.toLowerCase().includes(search.toLowerCase())).map(a => ({ ...a, catId })) : []
  );

  const currentAssets = search ? filteredAssets : CATEGORIES[category]?.assets || [];

  return (
    <div style={s.root}>
      {/* Left: Categories + Assets */}
      <div style={s.left}>
        <input style={s.searchInput} placeholder="🔍 Search assets..." value={search} onChange={e => setSearch(e.target.value)} />
        {!search && (
          <>
            <div style={s.sectionLabel}>Categories</div>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <button key={k} style={s.catBtn(category === k)} onClick={() => setCategory(k)}>
                <span>{v.icon}</span><span>{v.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 8, color: C.muted }}>{v.assets.length}</span>
              </button>
            ))}
            <div style={s.divider} />
          </>
        )}
        <div style={{ ...s.sectionLabel, paddingTop: search ? 12 : 4 }}>{search ? `Results (${currentAssets.length})` : CATEGORIES[category]?.label}</div>
        <div style={s.assetGrid}>
          {currentAssets.map(a => {
            const cnt = placedRef.current.filter(p => p.assetId === a.id).length;
            return (
              <div key={a.id} style={s.assetCard(cnt > 0)} onClick={() => placeAsset(a)} title={`Click to place ${a.label}`}>
                <div style={{ fontSize: 22, marginBottom: 3 }}>{a.icon}</div>
                <div style={{ fontSize: 9 }}>{a.label}</div>
                {cnt > 0 && <div style={{ color: C.teal, fontSize: 8, marginTop: 2 }}>×{cnt}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Viewport */}
      <div style={s.main}>
        <div style={s.toolbar}>
          <span style={{ fontSize: 10, color: C.muted }}>ASSET LIBRARY VIEWPORT</span>
          <span style={{ fontSize: 9, color: C.muted }}>CLICK ASSET → PLACE | DRAG → ORBIT | SCROLL → ZOOM</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <span style={s.tag(C.teal)}>OBJECTS: {stats.objects}</span>
          </div>
        </div>
        <canvas ref={canvasRef} style={s.canvas} />
        <div style={s.statusBar}>
          <span>OBJECTS: {stats.objects}</span>
          <span>TRIANGLES: {stats.tris.toLocaleString()}</span>
          <span style={{ marginLeft: "auto", color: C.teal }}>CAT: {CATEGORIES[category]?.label.toUpperCase()}</span>
        </div>
      </div>

      {/* Right: Controls + Placed */}
      <div style={s.right}>
        <div style={s.sectionLabel}>Placement</div>
        <SliderRow label="Scale" value={placeScale} min={0.1} max={5} step={0.05} onChange={setPlaceScale} />
        <SliderRow label="Rotation Y" value={placeRotY} min={0} max={360} step={5} onChange={setPlaceRotY} unit="°" />
        <div style={s.row}>
          <span style={s.label}>Randomize</span>
          <input type="checkbox" checked={randomize} onChange={e => setRandomize(e.target.checked)} style={{ accentColor: C.teal }} />
        </div>

        <div style={s.divider} />
        <div style={s.btnRow}>
          <button style={s.btn("primary")} onClick={exportLibrary}>💾 EXPORT</button>
          <button style={s.btn("danger")} onClick={clearAll}>🗑️ CLEAR</button>
        </div>

        <div style={s.divider} />
        <div style={s.sectionLabel}>Placed ({placedList.length})</div>
        <div style={{ padding: "0 8px 8px", overflowY: "auto", flex: 1 }}>
          {placedList.slice().reverse().map(e => (
            <div key={e.id} style={s.placedItem(selected === e.id)} onClick={() => setSelected(e.id === selected ? null : e.id)}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{e.label}</span>
              <button style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", fontSize: 12, flexShrink: 0 }} onClick={(ev) => { ev.stopPropagation(); sceneRef.current?.remove(e.mesh); placedRef.current = placedRef.current.filter(x => x.id !== e.id); setPlacedList([...placedRef.current]); if (selected === e.id) setSelected(null); }}>×</button>
            </div>
          ))}
        </div>
        {selected && (
          <div style={s.btnRow}>
            <button style={s.btn("danger")} onClick={removeSelected}>DELETE SELECTED</button>
          </div>
        )}
      </div>
    </div>
  );
}
