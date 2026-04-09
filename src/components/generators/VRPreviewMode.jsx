import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

const C = { bg: "#06060f", bg2: "#0d0d1a", bg3: "#12121f", border: "#1e1e35", teal: "#00ffc8", orange: "#FF6600", white: "#e8e8f0", muted: "#4a4a6a", red: "#ff4444", yellow: "#ffcc00", purple: "#aa44ff", font: "'JetBrains Mono', monospace" };

const ENVIRONMENTS = [
  { id: "gallery", label: "Art Gallery", icon: "🖼️", floor: "#f0eeee", wall: "#f5f5f5", accent: "#ccbbaa" },
  { id: "showroom", label: "Showroom", icon: "🚗", floor: "#1a1a2a", wall: "#2a2a3a", accent: C.teal },
  { id: "studio", label: "VR Studio", icon: "🎬", floor: "#111111", wall: "#1a1a1a", accent: "#333333" },
  { id: "exterior", label: "Outdoor", icon: "🏞️", floor: "#2a4a1a", wall: null, accent: "#1a8a2a" },
  { id: "abstract", label: "Abstract", icon: "🔷", floor: "#0a0020", wall: "#100030", accent: C.purple },
];

const s = {
  root: { display: "flex", height: "100%", background: C.bg, fontFamily: C.font, color: C.white, overflow: "hidden" },
  sidebar: { width: 240, background: C.bg2, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  sectionLabel: { fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.muted, padding: "12px 12px 6px" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 12px", gap: 6 },
  label: { fontSize: 10, color: C.muted, minWidth: 90 },
  slider: { flex: 1, accentColor: C.teal, cursor: "pointer" },
  val: { fontSize: 9, color: C.teal, width: 40, textAlign: "right" },
  divider: { height: 1, background: C.border, margin: "6px 0" },
  canvas: { flex: 1, display: "block", width: "100%", height: "100%" },
  toolbar: { display: "flex", gap: 6, padding: "7px 10px", background: C.bg2, borderBottom: `1px solid ${C.border}`, alignItems: "center", flexShrink: 0, flexWrap: "wrap" },
  statusBar: { display: "flex", gap: 12, padding: "6px 12px", background: C.bg2, borderTop: `1px solid ${C.border}`, fontSize: 9, color: C.muted, flexShrink: 0 },
  btn: (v) => ({ background: v === "primary" ? C.teal : v === "orange" ? C.orange : v === "purple" ? C.purple : C.bg3, color: v === "primary" || v === "orange" || v === "purple" ? C.bg : C.white, border: `1px solid ${v === "primary" ? C.teal : v === "orange" ? C.orange : v === "purple" ? C.purple : C.border}`, borderRadius: 3, fontFamily: C.font, fontSize: 10, fontWeight: 700, padding: "6px 12px", cursor: "pointer" }),
  btnRow: { display: "flex", gap: 6, padding: "8px 12px", flexWrap: "wrap" },
  envGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, padding: "0 10px 10px" },
  envBtn: (a) => ({ background: a ? `${C.teal}15` : C.bg3, border: `1px solid ${a ? C.teal : C.border}`, borderRadius: 4, padding: "8px 5px", cursor: "pointer", textAlign: "center", fontFamily: C.font, fontSize: 9, color: a ? C.teal : C.white }),
  toggle: (on) => ({ width: 32, height: 16, borderRadius: 8, background: on ? C.teal : C.bg3, border: `1px solid ${on ? C.teal : C.border}`, cursor: "pointer", position: "relative", flexShrink: 0 }),
  toggleDot: (on) => ({ position: "absolute", top: 2, left: on ? 16 : 2, width: 10, height: 10, borderRadius: "50%", background: on ? C.bg : C.muted, transition: "left 0.2s" }),
  tag: (c) => ({ display: "inline-block", fontSize: 8, padding: "2px 6px", borderRadius: 2, background: `${c}20`, color: c, border: `1px solid ${c}40` }),
  headsetOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" },
  vrBtn: { background: `${C.purple}20`, border: `1px solid ${C.purple}`, borderRadius: 6, fontFamily: C.font, fontSize: 11, fontWeight: 700, padding: "10px 20px", cursor: "pointer", color: C.purple, letterSpacing: 2 },
};

function Toggle({ value, onChange }) {
  return <div style={s.toggle(value)} onClick={() => onChange(!value)}><div style={s.toggleDot(value)} /></div>;
}

function SliderRow({ label, value, min, max, step = 0.1, onChange, unit = "" }) {
  return (
    <div style={s.row}>
      <span style={s.label}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} style={s.slider} />
      <span style={s.val}>{value}{unit}</span>
    </div>
  );
}

function buildVRScene(threeScene, env) {
  const envDef = ENVIRONMENTS.find(e => e.id === env) || ENVIRONMENTS[0];
  // Remove existing scene objects
  const toRemove = [];
  threeScene.traverse(o => { if (o.userData.vrScene) toRemove.push(o); });
  toRemove.forEach(o => threeScene.remove(o));

  const mark = (o) => { o.userData.vrScene = true; return o; };

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshLambertMaterial({ color: envDef.floor }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  threeScene.add(mark(floor));

  if (env === "gallery") {
    // Walls
    [[-10, 3, 0, true], [10, 3, 0, true], [0, 3, -10, false], [0, 3, 10, false]].forEach(([x, y, z, vert]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(vert ? 0.2 : 20, 6, vert ? 20 : 0.2), new THREE.MeshLambertMaterial({ color: envDef.wall }));
      wall.position.set(x, y, z);
      wall.receiveShadow = true;
      threeScene.add(mark(wall));
    });
    // Artwork frames
    [[-9.7, 2.5, -4, false], [-9.7, 2.5, 0, false], [-9.7, 2.5, 4, false]].forEach(([x, y, z, rot]) => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 1.5), new THREE.MeshLambertMaterial({ color: "#8b6914" }));
      frame.position.set(x, y, z);
      threeScene.add(mark(frame));
      const art = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.7), new THREE.MeshLambertMaterial({ color: `hsl(${Math.random() * 360},60%,40%)`, emissive: `hsl(${Math.random() * 360},40%,20%)`, emissiveIntensity: 0.3 }));
      art.position.set(x + 0.06, y, z);
      art.rotation.y = Math.PI / 2;
      threeScene.add(mark(art));
    });
    // Benches
    [[0, 0.3, 0], [0, 0.3, -5]].forEach(([x, y, z]) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.5), new THREE.MeshLambertMaterial({ color: "#5a4a2a" }));
      bench.position.set(x, y, z);
      threeScene.add(mark(bench));
    });
  } else if (env === "showroom") {
    // Display pedestals
    [[-4, 0.5, -3], [0, 0.5, -3], [4, 0.5, -3], [-4, 0.5, 0], [0, 0.5, 0], [4, 0.5, 0]].forEach(([x, y, z]) => {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1, 12), new THREE.MeshLambertMaterial({ color: "#1a1a2a" }));
      ped.position.set(x, y, z);
      threeScene.add(mark(ped));
      const obj = new THREE.Mesh(Math.random() > 0.5 ? new THREE.BoxGeometry(0.8, 0.8, 0.8) : new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshLambertMaterial({ color: envDef.accent, emissive: envDef.accent, emissiveIntensity: 0.2 }));
      obj.position.set(x, y + 0.9, z);
      obj.castShadow = true;
      threeScene.add(mark(obj));
    });
    // Spotlights
    [[-4, 4, -3], [0, 4, -3], [4, 4, -3]].forEach(([x, y, z]) => {
      const spot = new THREE.SpotLight(C.teal, 1.5, 8, 0.4);
      spot.position.set(x, y, z);
      spot.castShadow = true;
      threeScene.add(mark(spot));
    });
  } else if (env === "exterior") {
    // Trees
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 7;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 8), new THREE.MeshLambertMaterial({ color: "#5a3300" }));
      trunk.position.set(Math.cos(angle) * r, 1.5, Math.sin(angle) * r);
      threeScene.add(mark(trunk));
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshLambertMaterial({ color: "#2a6a2a" }));
      leaves.position.set(Math.cos(angle) * r, 4, Math.sin(angle) * r);
      threeScene.add(mark(leaves));
    }
    // Rocks
    for (let i = 0; i < 5; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.4), new THREE.MeshLambertMaterial({ color: "#777788" }));
      rock.position.set((Math.random() - 0.5) * 12, 0.3, (Math.random() - 0.5) * 12);
      threeScene.add(mark(rock));
    }
  } else if (env === "abstract") {
    for (let i = 0; i < 20; i++) {
      const shapes = [new THREE.BoxGeometry(Math.random() + 0.5, Math.random() * 3 + 0.5, Math.random() + 0.5), new THREE.SphereGeometry(Math.random() * 0.8 + 0.2, 12, 8), new THREE.CylinderGeometry(0.2, 0.2, Math.random() * 4 + 1, 8)];
      const mesh = new THREE.Mesh(shapes[Math.floor(Math.random() * shapes.length)], new THREE.MeshLambertMaterial({ color: `hsl(${200 + Math.random() * 60}, 80%, 40%)`, emissive: `hsl(${200 + Math.random() * 60}, 60%, 20%)`, emissiveIntensity: 0.5 }));
      mesh.position.set((Math.random() - 0.5) * 16, Math.random() * 4, (Math.random() - 0.5) * 16);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.castShadow = true;
      threeScene.add(mark(mesh));
    }
  } else if (env === "studio") {
    // Cyclorama / Infinity curve
    const cyc = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 10, 24, 1, true), new THREE.MeshLambertMaterial({ color: "#1a1a1a", side: THREE.BackSide }));
    cyc.position.y = 5;
    threeScene.add(mark(cyc));
    // Light rigs
    [[-4, 6, -3], [4, 6, -3], [0, 8, -6]].forEach(([x, y, z]) => {
      const rig = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.5), new THREE.MeshLambertMaterial({ color: "#333333" }));
      rig.position.set(x, y, z);
      threeScene.add(mark(rig));
    });
  }
}

export default function VRPreviewMode({ scene }) {
  const canvasRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const sceneRef = useRef();
  const animRef = useRef();

  const [environment, setEnvironment] = useState("gallery");
  const [avatarHeight, setAvatarHeight] = useState(1.7);
  const [avatarScale, setAvatarScale] = useState(1.0);
  const [fov, setFov] = useState(90);
  const [showAvatar, setShowAvatar] = useState(true);
  const [headTracking, setHeadTracking] = useState(true);
  const [vrMode, setVrMode] = useState(false);
  const [showComfort, setShowComfort] = useState(true);
  const [moveSpeed, setMoveSpeed] = useState(3);
  const [stats, setStats] = useState({ pos: [0, 0, 0], fps: 0 });

  const keysRef = useRef({});
  const posRef = useRef(new THREE.Vector3(0, avatarHeight, 5));
  const headRef = useRef({ yaw: 0, pitch: 0 });
  const avatarMeshRef = useRef(null);
  const avatarHeightRef = useRef(avatarHeight);
  const fovRef = useRef(90);
  const moveSpeedRef = useRef(3);
  const headTrackingRef = useRef(true);
  const vrModeRef = useRef(false);

  useEffect(() => { avatarHeightRef.current = avatarHeight; posRef.current.y = avatarHeight; }, [avatarHeight]);
  useEffect(() => { fovRef.current = fov; if (cameraRef.current) { cameraRef.current.fov = fov; cameraRef.current.updateProjectionMatrix(); } }, [fov]);
  useEffect(() => { moveSpeedRef.current = moveSpeed; }, [moveSpeed]);
  useEffect(() => { headTrackingRef.current = headTracking; }, [headTracking]);
  useEffect(() => { vrModeRef.current = vrMode; }, [vrMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color("#0a0a14");
    sceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(90, 1, 0.05, 200);
    camera.position.copy(posRef.current);
    cameraRef.current = camera;

    threeScene.add(new THREE.AmbientLight("#8899aa", 0.7));
    const sun = new THREE.DirectionalLight("#ffffff", 1.2);
    sun.position.set(5, 15, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    threeScene.add(sun);

    // Avatar mesh
    const avatarGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CylinderGeometry(0.2, 0.2, 1.4, 10) : new THREE.CylinderGeometry(0.2, 0.2, 1.4, 10), new THREE.MeshLambertMaterial({ color: C.teal, transparent: true, opacity: 0.5 }));
    body.position.y = -0.7;
    avatarGroup.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshLambertMaterial({ color: C.orange, transparent: true, opacity: 0.5 }));
    avatarGroup.add(head);
    const axisHelper = new THREE.AxesHelper(0.5);
    avatarGroup.add(axisHelper);
    threeScene.add(avatarGroup);
    avatarMeshRef.current = avatarGroup;

    buildVRScene(threeScene, "gallery");

    // Mouse look
    let isPointerLocked = false;
    const onPointerLock = () => { isPointerLocked = document.pointerLockElement === canvas; };
    const onMouseMove = (e) => {
      if (!headTrackingRef.current) return;
      if (isPointerLocked) {
        headRef.current.yaw -= e.movementX * 0.002;
        headRef.current.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, headRef.current.pitch - e.movementY * 0.002));
      } else {
        headRef.current.yaw -= e.movementX * 0.001;
        headRef.current.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, headRef.current.pitch - e.movementY * 0.001));
      }
    };
    const onClick = () => { if (!isPointerLocked) canvas.requestPointerLock?.(); };
    document.addEventListener("pointerlockchange", onPointerLock);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);

    const onKey = (e, down) => { keysRef.current[e.key.toLowerCase()] = down; };
    window.addEventListener("keydown", e => onKey(e, true));
    window.addEventListener("keyup", e => onKey(e, false));

    let lastTime = performance.now(), frameCount = 0, fpsTimer = 0;
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      frameCount++;
      fpsTimer += dt;
      if (fpsTimer > 0.5) {
        setStats({ pos: posRef.current.toArray().map(v => +v.toFixed(1)), fps: Math.round(frameCount / fpsTimer) });
        frameCount = 0; fpsTimer = 0;
      }

      // Movement
      const speed = moveSpeedRef.current * dt;
      const keys = keysRef.current;
      const yaw = headRef.current.yaw;
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      if (keys["w"] || keys["arrowup"]) posRef.current.addScaledVector(forward, speed);
      if (keys["s"] || keys["arrowdown"]) posRef.current.addScaledVector(forward, -speed);
      if (keys["a"] || keys["arrowleft"]) posRef.current.addScaledVector(right, -speed);
      if (keys["d"] || keys["arrowright"]) posRef.current.addScaledVector(right, speed);
      if (keys[" "]) posRef.current.y = Math.min(posRef.current.y + speed * 0.5, 10);
      if (keys["c"]) posRef.current.y = Math.max(posRef.current.y - speed * 0.5, 0.3);
      // Clamp to room
      posRef.current.x = Math.max(-9, Math.min(9, posRef.current.x));
      posRef.current.z = Math.max(-9, Math.min(9, posRef.current.z));

      const camera = cameraRef.current;
      camera.position.copy(posRef.current);
      camera.rotation.order = "YXZ";
      camera.rotation.y = headRef.current.yaw;
      camera.rotation.x = headRef.current.pitch;
      camera.fov = fovRef.current;
      camera.updateProjectionMatrix();

      // Avatar follows pos
      if (avatarMeshRef.current) {
        avatarMeshRef.current.position.set(posRef.current.x, posRef.current.y - avatarHeightRef.current, posRef.current.z);
        avatarMeshRef.current.rotation.y = headRef.current.yaw;
        avatarMeshRef.current.visible = showAvatar && !vrModeRef.current;
      }

      // VR mode: split screen simulation
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (renderer.domElement.width !== w || renderer.domElement.height !== h) {
        renderer.setSize(w, h, false);
        camera.aspect = vrModeRef.current ? 0.5 : w / h;
        camera.updateProjectionMatrix();
      }

      if (vrModeRef.current) {
        // Left eye
        renderer.setViewport(0, 0, w / 2, h);
        renderer.setScissor(0, 0, w / 2, h);
        renderer.setScissorTest(true);
        camera.setViewOffset(w, h, -20, 0, w, h);
        renderer.render(threeScene, camera);
        // Right eye
        renderer.setViewport(w / 2, 0, w / 2, h);
        renderer.setScissor(w / 2, 0, w / 2, h);
        camera.setViewOffset(w, h, 20, 0, w, h);
        renderer.render(threeScene, camera);
        renderer.setScissorTest(false);
        camera.clearViewOffset();
      } else {
        renderer.setViewport(0, 0, w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.render(threeScene, camera);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      document.removeEventListener("pointerlockchange", onPointerLock);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("keydown", e => onKey(e, true));
      window.removeEventListener("keyup", e => onKey(e, false));
      renderer.dispose();
    };
  }, [showAvatar]);

  const changeEnvironment = (envId) => {
    setEnvironment(envId);
    if (sceneRef.current) buildVRScene(sceneRef.current, envId);
    const envDef = ENVIRONMENTS.find(e => e.id === envId);
    if (sceneRef.current && envDef) {
      sceneRef.current.background = new THREE.Color(envId === "exterior" ? "#87ceeb" : "#0a0a14");
      if (envId === "exterior") sceneRef.current.fog = new THREE.FogExp2("#87ceeb", 0.02);
      else sceneRef.current.fog = null;
    }
  };

  const teleport = (x, z) => {
    posRef.current.set(x, avatarHeight, z);
  };

  return (
    <div style={s.root}>
      <div style={s.sidebar}>
        <div style={s.sectionLabel}>Environment</div>
        <div style={s.envGrid}>
          {ENVIRONMENTS.map(env => (
            <button key={env.id} style={s.envBtn(environment === env.id)} onClick={() => changeEnvironment(env.id)}>
              <div style={{ fontSize: 20, marginBottom: 3 }}>{env.icon}</div>
              {env.label}
            </button>
          ))}
        </div>

        <div style={s.divider} />
        <div style={s.sectionLabel}>Avatar</div>
        <SliderRow label="Height" value={avatarHeight} min={0.5} max={2.5} step={0.05} onChange={setAvatarHeight} unit="m" />
        <SliderRow label="Scale" value={avatarScale} min={0.5} max={2} step={0.05} onChange={setAvatarScale} />
        <div style={s.row}><span style={s.label}>Show Avatar</span><Toggle value={showAvatar} onChange={setShowAvatar} /></div>

        <div style={s.divider} />
        <div style={s.sectionLabel}>VR Camera</div>
        <SliderRow label="FOV" value={fov} min={60} max={120} step={1} onChange={setFov} unit="°" />
        <div style={s.row}><span style={s.label}>Head Tracking</span><Toggle value={headTracking} onChange={setHeadTracking} /></div>

        <div style={s.divider} />
        <div style={s.sectionLabel}>Movement</div>
        <SliderRow label="Walk Speed" value={moveSpeed} min={0.5} max={10} step={0.5} onChange={setMoveSpeed} unit="m/s" />
        <div style={{ padding: "0 12px 8px", fontSize: 9, color: C.muted, lineHeight: 1.6 }}>
          WASD / ARROWS — Move<br />
          MOUSE MOVE — Look<br />
          SPACE — Up | C — Down<br />
          CLICK viewport to capture mouse
        </div>

        <div style={s.divider} />
        <div style={s.sectionLabel}>Comfort Zone</div>
        <div style={s.row}><span style={s.label}>Show Grid</span><Toggle value={showComfort} onChange={setShowComfort} /></div>

        <div style={s.divider} />
        <div style={s.sectionLabel}>Teleport</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "0 10px 10px" }}>
          {[["Center", 0, 0], ["North", 0, -6], ["South", 0, 6], ["East", 6, 0], ["West", -6, 0], ["Corner", 6, 6]].map(([label, x, z]) => (
            <button key={label} style={{ ...s.btn(), fontSize: 9, padding: "5px 4px" }} onClick={() => teleport(x, z)}>{label}</button>
          ))}
        </div>

        <div style={s.divider} />
        <div style={s.btnRow}>
          <button style={s.btn(vrMode ? "orange" : "purple")} onClick={() => setVrMode(!vrMode)}>
            {vrMode ? "EXIT VR" : "🥽 VR MODE"}
          </button>
        </div>
      </div>

      <div style={s.main}>
        <div style={s.toolbar}>
          <span style={{ fontSize: 10, color: C.muted }}>VR PREVIEW — {ENVIRONMENTS.find(e => e.id === environment)?.label.toUpperCase()}</span>
          {vrMode && <span style={{ ...s.tag(C.purple), animation: "none" }}>VR SPLIT-SCREEN</span>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <span style={s.tag(C.teal)}>H: {avatarHeight}m</span>
            <span style={s.tag(C.orange)}>FOV: {fov}°</span>
          </div>
        </div>

        <div style={{ position: "relative", flex: 1 }}>
          <canvas ref={canvasRef} style={s.canvas} />
          {vrMode && (
            <div style={{ position: "absolute", top: 0, left: "50%", width: 2, height: "100%", background: "#000000", transform: "translateX(-50%)", pointerEvents: "none" }} />
          )}
          {showComfort && (
            <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, pointerEvents: "none" }}>
              <div style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${C.border}`, borderRadius: 3, padding: "4px 10px", fontSize: 9, fontFamily: C.font, color: C.muted }}>
                POS: {stats.pos.join(", ")} | HEIGHT: {avatarHeight}m
              </div>
            </div>
          )}
          {headTracking && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 16, height: 16, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: 7, left: 0, right: 0, height: 2, background: `${C.teal}80` }} />
            <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 2, background: `${C.teal}80` }} />
          </div>}
        </div>

        <div style={s.statusBar}>
          <span>POS: [{stats.pos.join(", ")}]</span>
          <span>FPS: {stats.fps}</span>
          <span>HEIGHT: {avatarHeight}m</span>
          <span style={{ marginLeft: "auto", color: vrMode ? C.purple : C.teal }}>{vrMode ? "VR ACTIVE" : "DESKTOP MODE"}</span>
        </div>
      </div>
    </div>
  );
}
