import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

const C = { bg: "#06060f", bg2: "#0d0d1a", bg3: "#12121f", border: "#1e1e35", teal: "#00ffc8", orange: "#FF6600", white: "#e8e8f0", muted: "#4a4a6a", font: "'JetBrains Mono', monospace" };

const SCENARIOS = {
  falling_boxes: { label: "Falling Boxes", icon: "📦" },
  domino: { label: "Domino Chain", icon: "🁢" },
  cloth: { label: "Cloth Sim", icon: "🪡" },
  wrecking_ball: { label: "Wrecking Ball", icon: "⚫" },
  stacking: { label: "Stacking", icon: "🗼" },
  explosion: { label: "Explosion", icon: "💥" },
};

const s = {
  root: { display: "flex", height: "100%", background: C.bg, fontFamily: C.font, color: C.white, overflow: "hidden" },
  sidebar: { width: 250, background: C.bg2, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  sectionLabel: { fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.muted, padding: "12px 12px 6px" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 12px", gap: 6 },
  label: { fontSize: 10, color: C.muted, minWidth: 90 },
  slider: { flex: 1, accentColor: C.teal, cursor: "pointer" },
  val: { fontSize: 9, color: C.teal, width: 40, textAlign: "right" },
  divider: { height: 1, background: C.border, margin: "6px 0" },
  canvas: { flex: 1, display: "block", width: "100%", height: "100%" },
  toolbar: { display: "flex", gap: 6, padding: "7px 10px", background: C.bg2, borderBottom: `1px solid ${C.border}`, alignItems: "center", flexShrink: 0 },
  statusBar: { display: "flex", gap: 12, padding: "6px 12px", background: C.bg2, borderTop: `1px solid ${C.border}`, fontSize: 9, color: C.muted, flexShrink: 0 },
  btn: (v) => ({ background: v === "primary" ? C.teal : v === "orange" ? C.orange : v === "danger" ? "#ff4444" : C.bg3, color: v === "primary" || v === "orange" ? C.bg : C.white, border: `1px solid ${v === "primary" ? C.teal : v === "orange" ? C.orange : v === "danger" ? "#ff4444" : C.border}`, borderRadius: 3, fontFamily: C.font, fontSize: 10, fontWeight: 700, padding: "6px 12px", cursor: "pointer" }),
  btnRow: { display: "flex", gap: 6, padding: "8px 12px", flexWrap: "wrap" },
  scenarioGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, padding: "0 10px 10px" },
  scenarioBtn: (a) => ({ background: a ? `${C.orange}15` : C.bg3, border: `1px solid ${a ? C.orange : C.border}`, borderRadius: 4, padding: "8px 5px", cursor: "pointer", textAlign: "center", fontFamily: C.font, fontSize: 9, color: a ? C.orange : C.white }),
  toggle: (on) => ({ width: 32, height: 16, borderRadius: 8, background: on ? C.teal : C.bg3, border: `1px solid ${on ? C.teal : C.border}`, cursor: "pointer", position: "relative", flexShrink: 0 }),
  toggleDot: (on) => ({ position: "absolute", top: 2, left: on ? 16 : 2, width: 10, height: 10, borderRadius: "50%", background: on ? C.bg : C.muted, transition: "left 0.2s" }),
  tag: (c) => ({ display: "inline-block", fontSize: 8, padding: "2px 6px", borderRadius: 2, background: `${c}20`, color: c, border: `1px solid ${c}40` }),
  objRow: { display: "flex", justifyContent: "space-between", padding: "3px 12px", fontSize: 9, borderBottom: `1px solid ${C.border}10` },
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

function Toggle({ value, onChange }) {
  return <div style={s.toggle(value)} onClick={() => onChange(!value)}><div style={s.toggleDot(value)} /></div>;
}

// Simple physics body
class PhysBody {
  constructor(mesh, { mass = 1, restitution = 0.4, friction = 0.8, isStatic = false } = {}) {
    this.mesh = mesh;
    this.mass = isStatic ? 0 : mass;
    this.isStatic = isStatic;
    this.restitution = restitution;
    this.friction = friction;
    this.vel = new THREE.Vector3();
    this.angVel = new THREE.Vector3();
    this.force = new THREE.Vector3();
    this.sleeping = false;
    this.sleepTimer = 0;
    this.radius = 0;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    this.halfSize = size.clone().multiplyScalar(0.5);
    this.radius = size.length() * 0.5;
  }
  applyForce(f) { if (!this.isStatic) { this.force.add(f); this.sleeping = false; this.sleepTimer = 0; } }
  integrate(dt, gravity) {
    if (this.isStatic || this.sleeping) return;
    const gravForce = new THREE.Vector3(0, gravity * this.mass, 0);
    this.force.add(gravForce);
    const accel = this.force.clone().divideScalar(this.mass);
    this.vel.addScaledVector(accel, dt);
    this.vel.multiplyScalar(0.998); // damping
    this.angVel.multiplyScalar(0.97);
    this.mesh.position.addScaledVector(this.vel, dt);
    this.mesh.rotation.x += this.angVel.x * dt;
    this.mesh.rotation.z += this.angVel.z * dt;
    this.force.set(0, 0, 0);
    // Sleep check
    if (this.vel.lengthSq() < 0.001 && this.angVel.lengthSq() < 0.001) {
      this.sleepTimer += dt;
      if (this.sleepTimer > 1.5) this.sleeping = true;
    } else {
      this.sleepTimer = 0;
    }
  }
  groundCollide(groundY) {
    const bottom = this.mesh.position.y - this.halfSize.y;
    if (bottom < groundY) {
      this.mesh.position.y = groundY + this.halfSize.y;
      this.vel.y = -this.vel.y * this.restitution;
      this.vel.x *= (1 - this.friction * 0.1);
      this.vel.z *= (1 - this.friction * 0.1);
      this.angVel.multiplyScalar(0.85);
      if (Math.abs(this.vel.y) < 0.05) this.vel.y = 0;
    }
  }
  aabbCollide(other) {
    if (this.isStatic && other.isStatic) return;
    const dx = this.mesh.position.x - other.mesh.position.x;
    const dy = this.mesh.position.y - other.mesh.position.y;
    const dz = this.mesh.position.z - other.mesh.position.z;
    const ox = this.halfSize.x + other.halfSize.x - Math.abs(dx);
    const oy = this.halfSize.y + other.halfSize.y - Math.abs(dy);
    const oz = this.halfSize.z + other.halfSize.z - Math.abs(dz);
    if (ox <= 0 || oy <= 0 || oz <= 0) return;
    const minO = Math.min(ox, oy, oz);
    const nx = minO === ox ? Math.sign(dx) : 0;
    const ny = minO === oy ? Math.sign(dy) : 0;
    const nz = minO === oz ? Math.sign(dz) : 0;
    const rest = (this.restitution + other.restitution) * 0.5;
    const totalMass = this.mass + other.mass;
    if (!this.isStatic && !other.isStatic) {
      const push = minO * 0.5;
      this.mesh.position.x += nx * push;
      this.mesh.position.y += ny * push;
      this.mesh.position.z += nz * push;
      other.mesh.position.x -= nx * push;
      other.mesh.position.y -= ny * push;
      other.mesh.position.z -= nz * push;
      const relVel = this.vel.dot(new THREE.Vector3(nx, ny, nz)) - other.vel.dot(new THREE.Vector3(nx, ny, nz));
      if (relVel < 0) {
        const impulse = -(1 + rest) * relVel / totalMass;
        this.vel.addScaledVector(new THREE.Vector3(nx, ny, nz), impulse * other.mass / totalMass);
        other.vel.addScaledVector(new THREE.Vector3(nx, ny, nz), -impulse * this.mass / totalMass);
        this.angVel.addScaledVector(new THREE.Vector3(nz, 0, -nx), impulse * 0.3);
        other.angVel.addScaledVector(new THREE.Vector3(nz, 0, -nx), -impulse * 0.3);
      }
    } else if (!this.isStatic) {
      this.mesh.position.x += nx * minO;
      this.mesh.position.y += ny * minO;
      this.mesh.position.z += nz * minO;
      const n = new THREE.Vector3(nx, ny, nz);
      const dot = this.vel.dot(n);
      if (dot < 0) this.vel.addScaledVector(n, -(1 + rest) * dot);
    } else {
      other.mesh.position.x -= nx * minO;
      other.mesh.position.y -= ny * minO;
      other.mesh.position.z -= nz * minO;
      const n = new THREE.Vector3(-nx, -ny, -nz);
      const dot = other.vel.dot(n);
      if (dot < 0) other.vel.addScaledVector(n, -(1 + rest) * dot);
    }
    this.sleeping = false; other.sleeping = false;
    this.sleepTimer = 0; other.sleepTimer = 0;
  }
}

// Cloth simulation
class ClothSim {
  constructor(w, h, group) {
    this.w = w; this.h = h;
    this.particles = [];
    this.group = group;
    for (let y = 0; y <= h; y++) {
      for (let x = 0; x <= w; x++) {
        this.particles.push({
          pos: new THREE.Vector3((x - w / 2) * 0.5, 5 - y * 0.5, 0),
          prev: new THREE.Vector3((x - w / 2) * 0.5, 5 - y * 0.5, 0),
          pinned: y === 0 && (x === 0 || x === w || x === Math.floor(w / 2)),
        });
      }
    }
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array((w + 1) * (h + 1) * 3);
    const indices = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = y * (w + 1) + x, b = a + 1, c = a + (w + 1), d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.setIndex(indices);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: "#9966cc", side: THREE.DoubleSide, wireframe: false }));
    group.add(this.mesh);
    this.updateMesh();
  }
  step(dt, gravity, wind) {
    const g = new THREE.Vector3(wind * 0.3, gravity, 0);
    this.particles.forEach(p => {
      if (p.pinned) return;
      const vel = p.pos.clone().sub(p.prev);
      p.prev.copy(p.pos);
      p.pos.add(vel).addScaledVector(g, dt * dt);
    });
    // Constraints
    for (let iter = 0; iter < 5; iter++) {
      for (let y = 0; y <= this.h; y++) {
        for (let x = 0; x <= this.w; x++) {
          const i = y * (this.w + 1) + x;
          const neighbors = [];
          if (x < this.w) neighbors.push(i + 1);
          if (y < this.h) neighbors.push(i + (this.w + 1));
          neighbors.forEach(j => {
            const a = this.particles[i], b = this.particles[j];
            const diff = b.pos.clone().sub(a.pos);
            const len = diff.length();
            const rest = 0.5;
            if (len === 0) return;
            const correction = diff.multiplyScalar((len - rest) / len * 0.5);
            if (!a.pinned) a.pos.add(correction);
            if (!b.pinned) b.pos.sub(correction);
          });
        }
      }
      // Ground
      this.particles.forEach(p => { if (!p.pinned && p.pos.y < 0.05) p.pos.y = 0.05; });
    }
    this.updateMesh();
  }
  updateMesh() {
    const pos = this.mesh.geometry.attributes.position;
    this.particles.forEach((p, i) => { pos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z); });
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
  addWind(amt) { this.particles.forEach(p => { if (!p.pinned) { p.pos.x += (Math.random() - 0.5) * amt; p.pos.z += (Math.random() - 0.5) * amt; } }); }
}

const RANDOM_COLORS = ["#ff4444", "#44ff44", "#4444ff", "#ffaa00", "#aa44ff", "#44ffff", "#ff44aa", "#aaffaa"];

export default function PhysicsSimulation({ scene }) {
  const canvasRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const sceneRef = useRef();
  const animRef = useRef();
  const bodiesRef = useRef([]);
  const clothRef = useRef(null);
  const wreckerRef = useRef(null);
  const wreckerAngleRef = useRef(0);

  const [scenario, setScenario] = useState("falling_boxes");
  const [running, setRunning] = useState(false);
  const [gravity, setGravity] = useState(-9.8);
  const [restitution, setRestitution] = useState(0.4);
  const [friction, setFriction] = useState(0.8);
  const [showWireframe, setShowWireframe] = useState(false);
  const [wind, setWind] = useState(0);
  const [stats, setStats] = useState({ bodies: 0, sleeping: 0, fps: 0 });

  const runningRef = useRef(false);
  const gravityRef = useRef(-9.8);
  const windRef = useRef(0);
  const showWireframeRef = useRef(false);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { gravityRef.current = gravity; }, [gravity]);
  useEffect(() => { windRef.current = wind; }, [wind]);
  useEffect(() => {
    showWireframeRef.current = showWireframe;
    bodiesRef.current.forEach(b => { if (b.mesh.material) b.mesh.material.wireframe = showWireframe; });
  }, [showWireframe]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color("#0a0a14");
    threeScene.fog = new THREE.FogExp2("#0a0a14", 0.015);
    sceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    camera.position.set(0, 10, 25);
    camera.lookAt(0, 3, 0);
    cameraRef.current = camera;

    threeScene.add(new THREE.AmbientLight("#6688aa", 0.6));
    const sun = new THREE.DirectionalLight("#ffffff", 1.5);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
    threeScene.add(sun);

    // Ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshLambertMaterial({ color: "#1a1a2a" }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    threeScene.add(ground);
    const gridHelper = new THREE.GridHelper(60, 30, C.border, C.border);
    threeScene.add(gridHelper);

    // Walls
    [[30, 5, 0, 0.2, 10, 60], [-30, 5, 0, 0.2, 10, 60], [0, 5, 30, 60, 10, 0.2], [0, 5, -30, 60, 10, 0.2]].forEach(([x, y, z, w, h, d]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.2), h, Math.max(d, 0.2)), new THREE.MeshLambertMaterial({ color: "#222233", transparent: true, opacity: 0.3 }));
      wall.position.set(x, y, z);
      threeScene.add(wall);
    });

    let isDragging = false, lastX = 0, lastY = 0, theta = 0.3, phi = 0.35, radius = 28;
    const down = e => { isDragging = true; lastX = e.clientX; lastY = e.clientY; };
    const up = () => { isDragging = false; };
    const move = e => {
      if (!isDragging) return;
      theta -= (e.clientX - lastX) * 0.01;
      phi = Math.max(0.05, Math.min(1.4, phi - (e.clientY - lastY) * 0.01));
      lastX = e.clientX; lastY = e.clientY;
      camera.position.set(radius * Math.sin(theta) * Math.cos(phi), radius * Math.sin(phi), radius * Math.cos(theta) * Math.cos(phi));
      camera.lookAt(0, 3, 0);
    };
    const wheel = e => {
      radius = Math.max(8, Math.min(80, radius + e.deltaY * 0.05));
      camera.position.set(radius * Math.sin(theta) * Math.cos(phi), radius * Math.sin(phi), radius * Math.cos(theta) * Math.cos(phi));
      camera.lookAt(0, 3, 0);
    };
    canvas.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    canvas.addEventListener("wheel", wheel, { passive: true });

    let lastTime = performance.now();
    let frameCount = 0, fpsTimer = 0;
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      frameCount++;
      fpsTimer += dt;
      if (fpsTimer > 0.5) {
        const fps = Math.round(frameCount / fpsTimer);
        const sleeping = bodiesRef.current.filter(b => b.sleeping).length;
        setStats({ bodies: bodiesRef.current.length, sleeping, fps });
        frameCount = 0; fpsTimer = 0;
      }

      if (runningRef.current) {
        // Physics step
        bodiesRef.current.forEach(b => {
          if (windRef.current !== 0) b.applyForce(new THREE.Vector3(windRef.current * 2, 0, 0));
          b.integrate(dt, gravityRef.current);
          b.groundCollide(0);
          // Wall bounce
          const p = b.mesh.position;
          const hs = b.halfSize;
          if (p.x + hs.x > 29) { p.x = 29 - hs.x; b.vel.x = -Math.abs(b.vel.x) * b.restitution; }
          if (p.x - hs.x < -29) { p.x = -29 + hs.x; b.vel.x = Math.abs(b.vel.x) * b.restitution; }
          if (p.z + hs.z > 29) { p.z = 29 - hs.z; b.vel.z = -Math.abs(b.vel.z) * b.restitution; }
          if (p.z - hs.z < -29) { p.z = -29 + hs.z; b.vel.z = Math.abs(b.vel.z) * b.restitution; }
        });
        // Broadphase AABB collisions
        for (let i = 0; i < bodiesRef.current.length; i++) {
          for (let j = i + 1; j < bodiesRef.current.length; j++) {
            bodiesRef.current[i].aabbCollide(bodiesRef.current[j]);
          }
        }
        // Cloth
        if (clothRef.current) clothRef.current.step(dt, gravityRef.current, windRef.current);
        // Wrecking ball
        if (wreckerRef.current && wreckerRef.current.pivotMesh) {
          wreckerAngleRef.current += dt * 1.2;
          const angle = wreckerAngleRef.current;
          const r = 8;
          wreckerRef.current.mesh.position.set(Math.sin(angle) * r, 6 + Math.cos(angle * 0.3) * 1.5, 0);
          bodiesRef.current.forEach(b => {
            if (!b.isStatic && b.mesh !== wreckerRef.current.mesh) {
              const diff = b.mesh.position.clone().sub(wreckerRef.current.mesh.position);
              if (diff.length() < 2.5) {
                b.vel.add(diff.normalize().multiplyScalar(12));
                b.vel.y = 5;
                b.sleeping = false;
              }
            }
          });
        }
      }

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

  const clearScene = useCallback(() => {
    const threeScene = sceneRef.current;
    if (!threeScene) return;
    bodiesRef.current.forEach(b => threeScene.remove(b.mesh));
    bodiesRef.current = [];
    if (clothRef.current) { threeScene.remove(clothRef.current.group); clothRef.current = null; }
    wreckerRef.current = null;
    wreckerAngleRef.current = 0;
  }, []);

  const setupScenario = useCallback((key) => {
    clearScene();
    setScenario(key);
    const threeScene = sceneRef.current;
    if (!threeScene) return;
    setRunning(false);

    const addBox = (x, y, z, w = 1, h = 1, d = 1, color = null, mass = 1, isStatic = false) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: color || RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)], wireframe: showWireframeRef.current })
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true; mesh.receiveShadow = true;
      threeScene.add(mesh);
      const body = new PhysBody(mesh, { mass, restitution, friction, isStatic });
      bodiesRef.current.push(body);
      return body;
    };

    if (key === "falling_boxes") {
      for (let i = 0; i < 20; i++) {
        addBox((Math.random() - 0.5) * 10, 5 + Math.random() * 20, (Math.random() - 0.5) * 10,
          0.5 + Math.random() * 1.5, 0.5 + Math.random() * 1.5, 0.5 + Math.random() * 1.5);
      }
    } else if (key === "domino") {
      for (let i = 0; i < 14; i++) {
        const b = addBox(-8 + i * 1.2, 0.6, 0, 0.25, 1.2, 0.8);
        if (i === 0) { b.vel.x = 0; }
      }
      addBox(-9, 1, 0, 0.8, 2, 0.8, "#ff4444", 5);
    } else if (key === "stacking") {
      const w = 3, d = 3;
      for (let layer = 0; layer < 7; layer++) {
        for (let i = 0; i < 3; i++) {
          addBox((i - 1) * (w + 0.1), layer * 1.1 + 0.55, 0, w, 1, d, null, 1);
        }
      }
    } else if (key === "wrecking_ball") {
      // Build a wall
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 6; x++) {
          addBox(2 + x * 1.2, y * 1.1 + 0.55, 0, 1, 1, 1);
        }
      }
      // Wrecking ball pivot
      const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshLambertMaterial({ color: "#222222" }));
      ballMesh.castShadow = true;
      ballMesh.position.set(-8, 6, 0);
      threeScene.add(ballMesh);
      const pivotMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), new THREE.MeshLambertMaterial({ color: "#444444" }));
      pivotMesh.position.set(0, 10, 0);
      threeScene.add(pivotMesh);
      wreckerRef.current = { mesh: ballMesh, pivotMesh };
    } else if (key === "cloth") {
      const group = new THREE.Group();
      threeScene.add(group);
      clothRef.current = new ClothSim(10, 8, group);
    } else if (key === "explosion") {
      const center = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < 30; i++) {
        const b = addBox((Math.random() - 0.5) * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 4,
          0.5 + Math.random(), 0.5 + Math.random(), 0.5 + Math.random());
        const dir = b.mesh.position.clone().sub(center).normalize();
        if (dir.lengthSq() === 0) dir.set(Math.random() - 0.5, 1, Math.random() - 0.5).normalize();
        b.vel.copy(dir.multiplyScalar(8 + Math.random() * 8));
        b.vel.y += 5;
      }
    }
  }, [restitution, friction, clearScene]);

  useEffect(() => { setupScenario("falling_boxes"); }, []);

  const spawnRandom = () => {
    const threeScene = sceneRef.current;
    if (!threeScene) return;
    const mesh = new THREE.Mesh(
      Math.random() > 0.5 ? new THREE.BoxGeometry(1, 1, 1) : new THREE.SphereGeometry(0.6, 12, 8),
      new THREE.MeshLambertMaterial({ color: RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)], wireframe: showWireframeRef.current })
    );
    mesh.position.set((Math.random() - 0.5) * 8, 15, (Math.random() - 0.5) * 8);
    mesh.castShadow = true;
    threeScene.add(mesh);
    bodiesRef.current.push(new PhysBody(mesh, { mass: 1, restitution, friction }));
  };

  const applyExplosion = () => {
    bodiesRef.current.forEach(b => {
      if (b.isStatic) return;
      const dir = b.mesh.position.clone().normalize();
      dir.y = 1;
      dir.normalize();
      b.vel.addScaledVector(dir, 10 + Math.random() * 8);
      b.sleeping = false;
    });
  };

  return (
    <div style={s.root}>
      <div style={s.sidebar}>
        <div style={s.sectionLabel}>Scenario</div>
        <div style={s.scenarioGrid}>
          {Object.entries(SCENARIOS).map(([k, v]) => (
            <button key={k} style={s.scenarioBtn(scenario === k)} onClick={() => setupScenario(k)}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{v.icon}</div>
              {v.label}
            </button>
          ))}
        </div>

        <div style={s.divider} />
        <div style={s.sectionLabel}>Physics</div>
        <SliderRow label="Gravity" value={gravity} min={-30} max={0} step={0.1} onChange={v => { setGravity(v); gravityRef.current = v; }} unit=" m/s²" />
        <SliderRow label="Restitution" value={restitution} min={0} max={1} step={0.05} onChange={setRestitution} />
        <SliderRow label="Friction" value={friction} min={0} max={1} step={0.05} onChange={setFriction} />
        <SliderRow label="Wind Force" value={wind} min={-10} max={10} step={0.5} onChange={v => { setWind(v); windRef.current = v; }} />

        <div style={s.divider} />
        <div style={s.row}><span style={s.label}>Wireframe</span><Toggle value={showWireframe} onChange={setShowWireframe} /></div>

        <div style={s.divider} />
        <div style={s.sectionLabel}>Controls</div>
        <div style={s.btnRow}>
          <button style={s.btn(running ? "orange" : "primary")} onClick={() => setRunning(!running)}>
            {running ? "⏸ PAUSE" : "▶ RUN"}
          </button>
          <button style={s.btn()} onClick={() => setupScenario(scenario)}>↺ RESET</button>
        </div>
        <div style={s.btnRow}>
          <button style={s.btn()} onClick={spawnRandom}>+ SPAWN</button>
          <button style={s.btn("danger")} onClick={applyExplosion}>💥 BLAST</button>
        </div>

        <div style={s.divider} />
        <div style={s.sectionLabel}>Stats</div>
        <div style={{ padding: "0 12px 12px" }}>
          {[["Bodies", stats.bodies, C.white], ["Sleeping", stats.sleeping, C.muted], ["FPS", stats.fps, C.teal]].map(([l, v, c]) => (
            <div key={l} style={s.objRow}>
              <span style={{ color: C.muted }}>{l}</span>
              <span style={{ color: c, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={s.main}>
        <div style={s.toolbar}>
          <span style={{ fontSize: 10, color: C.muted }}>PHYSICS — {SCENARIOS[scenario]?.label.toUpperCase()}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <span style={s.tag(running ? C.orange : C.muted)}>{running ? "SIMULATING" : "PAUSED"}</span>
            <span style={s.tag(C.teal)}>{stats.fps} FPS</span>
          </div>
        </div>
        <canvas ref={canvasRef} style={s.canvas} />
        <div style={s.statusBar}>
          <span>BODIES: {stats.bodies}</span>
          <span>SLEEPING: {stats.sleeping}</span>
          <span>GRAVITY: {gravity} m/s²</span>
          <span>WIND: {wind}</span>
          <span style={{ marginLeft: "auto", color: C.teal }}>FPS: {stats.fps}</span>
        </div>
      </div>
    </div>
  );
}
