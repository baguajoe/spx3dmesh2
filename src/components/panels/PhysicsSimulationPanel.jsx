import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";

const S = {
  root: { background:"#06060f", color:"#e0e0e0", fontFamily:"JetBrains Mono,monospace", padding:16, height:"100%", overflowY:"auto" },
  h2: { color:"#00ffc8", fontSize:14, marginBottom:12, letterSpacing:1 },
  label: { fontSize:11, color:"#aaa", display:"block", marginBottom:4 },
  input: { width:"100%", background:"#0d0d1a", border:"1px solid #1a1a2e", color:"#e0e0e0", padding:"4px 8px", borderRadius:4, fontFamily:"JetBrains Mono,monospace", fontSize:11, marginBottom:10, boxSizing:"border-box" },
  select: { width:"100%", background:"#0d0d1a", border:"1px solid #1a1a2e", color:"#e0e0e0", padding:"4px 8px", borderRadius:4, fontFamily:"JetBrains Mono,monospace", fontSize:11, marginBottom:10, boxSizing:"border-box" },
  btn: { background:"#00ffc8", color:"#06060f", border:"none", borderRadius:4, padding:"7px 16px", fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:700, cursor:"pointer", marginRight:8, marginBottom:8 },
  btnO: { background:"#FF6600", color:"#fff", border:"none", borderRadius:4, padding:"7px 16px", fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:700, cursor:"pointer", marginRight:8, marginBottom:8 },
  btnRed: { background:"#cc2200", color:"#fff", border:"none", borderRadius:4, padding:"7px 16px", fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:700, cursor:"pointer", marginRight:8, marginBottom:8 },
  section: { background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:6, padding:12, marginBottom:12 },
  stat: { fontSize:11, color:"#00ffc8", marginBottom:4 },
};

const SIM_TYPES = ["Rigid Body Drop","Domino Chain","Ball Pit","Cloth Simulation","Spring Chain","Pendulum Array","Wrecking Ball","Avalanche"];
const SHAPES = ["Box","Sphere","Cylinder","Cone","Torus"];

// Simple Verlet physics engine (no external lib needed)
class PhysicsBody {
  constructor(mesh, mass=1, restitution=0.5, friction=0.4){
    this.mesh=mesh; this.mass=mass; this.restitution=restitution; this.friction=friction;
    this.vel=new THREE.Vector3(); this.acc=new THREE.Vector3(); this.isStatic=mass===0;
    this.angVel=new THREE.Vector3((Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2);
  }
  step(dt, gravity=-9.81){
    if(this.isStatic) return;
    this.acc.y = gravity;
    this.vel.addScaledVector(this.acc, dt);
    this.vel.multiplyScalar(0.995); // damping
    this.mesh.position.addScaledVector(this.vel, dt);
    this.mesh.rotation.x += this.angVel.x*dt;
    this.mesh.rotation.y += this.angVel.y*dt;
    this.mesh.rotation.z += this.angVel.z*dt;
    this.angVel.multiplyScalar(0.98);
    // Floor collision
    const r = this.mesh.geometry?.boundingSphere?.radius||0.5;
    if(this.mesh.position.y - r < 0){
      this.mesh.position.y = r;
      this.vel.y = -this.vel.y * this.restitution;
      this.vel.x *= (1-this.friction);
      this.vel.z *= (1-this.friction);
      this.angVel.multiplyScalar(0.7);
    }
  }
}

class ClothNode {
  constructor(x,y,z,pinned=false){
    this.pos=new THREE.Vector3(x,y,z); this.prev=this.pos.clone(); this.pinned=pinned;
  }
  integrate(dt,gravity=-9.81){
    if(this.pinned) return;
    const vel=this.pos.clone().sub(this.prev);
    this.prev.copy(this.pos);
    this.pos.add(vel.multiplyScalar(0.99));
    this.pos.y+=gravity*dt*dt;
  }
  constrain(other, restLen){
    const delta=other.pos.clone().sub(this.pos);
    const dist=delta.length();
    if(dist===0) return;
    const diff=(dist-restLen)/dist*0.5;
    const corr=delta.multiplyScalar(diff);
    if(!this.pinned) this.pos.add(corr);
    if(!other.pinned) other.pos.sub(corr);
  }
}

export default function PhysicsSimulationPanel({ scene }){
  const [simType, setSimType] = useState("Rigid Body Drop");
  const [shape, setShape] = useState("Box");
  const [count, setCount] = useState(20);
  const [gravity, setGravity] = useState(-9.81);
  const [restitution, setRestitution] = useState(0.5);
  const [friction, setFriction] = useState(0.4);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [frameCount, setFrameCount] = useState(0);
  const bodies = useRef([]);
  const clothNodes = useRef([]);
  const clothMesh = useRef(null);
  const simMeshes = useRef([]);
  const raf = useRef(null);
  const lastT = useRef(0);
  const fc = useRef(0);

  function geoForShape(sh){
    switch(sh){
      case "Sphere": return new THREE.SphereGeometry(0.5,8,8);
      case "Cylinder": return new THREE.CylinderGeometry(0.4,0.4,1,8);
      case "Cone": return new THREE.ConeGeometry(0.5,1,8);
      case "Torus": return new THREE.TorusGeometry(0.4,0.15,6,12);
      default: return new THREE.BoxGeometry(1,1,1);
    }
  }

  function clearSim(){
    cancelAnimationFrame(raf.current);
    bodies.current=[];
    clothNodes.current=[];
    simMeshes.current.forEach(m=>{scene.remove(m);m.geometry?.dispose();m.material?.dispose();});
    simMeshes.current=[];
    clothMesh.current=null;
    setRunning(false); setStatus(""); setFrameCount(0); fc.current=0;
  }

  function setupRigidDrop(){
    const ms=[];
    // Floor
    const flGeo=new THREE.BoxGeometry(30,0.5,30);
    const fl=new THREE.Mesh(flGeo,new THREE.MeshStandardMaterial({color:0x1a1a2e}));
    fl.position.y=-0.25; fl.receiveShadow=true; scene.add(fl); ms.push(fl);
    bodies.current.push(new PhysicsBody(fl,0)); // static
    // Objects
    for(let i=0;i<count;i++){
      const geo=geoForShape(shape);
      geo.computeBoundingSphere();
      const col=new THREE.Color().setHSL(i/count,0.8,0.5);
      const mat=new THREE.MeshStandardMaterial({color:col,roughness:0.6});
      const m=new THREE.Mesh(geo,mat);
      m.position.set((Math.random()-0.5)*8,10+i*1.5,(Math.random()-0.5)*8);
      m.castShadow=true;
      scene.add(m); ms.push(m);
      const b=new PhysicsBody(m,1,restitution,friction);
      b.vel.set((Math.random()-0.5)*2,0,(Math.random()-0.5)*2);
      bodies.current.push(b);
    }
    return ms;
  }

  function setupDomino(){
    const ms=[];
    const flGeo=new THREE.BoxGeometry(40,0.5,10);
    const fl=new THREE.Mesh(flGeo,new THREE.MeshStandardMaterial({color:0x1a1a2e}));
    fl.position.y=-0.25; scene.add(fl); ms.push(fl);
    bodies.current.push(new PhysicsBody(fl,0));
    for(let i=0;i<Math.min(count,30);i++){
      const geo=new THREE.BoxGeometry(0.5,2,1);
      const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(i/30,0.8,0.5)}));
      m.position.set(-15+i*1.1,1,0);
      scene.add(m); ms.push(m);
      const b=new PhysicsBody(m,1,restitution*0.3,0.6);
      bodies.current.push(b);
    }
    // Tip first domino
    if(bodies.current.length>1){ bodies.current[1].vel.x=3; bodies.current[1].angVel.z=-2; }
    return ms;
  }

  function setupCloth(){
    const ms=[];
    const res=12; const restLen=0.5;
    const nodes=[];
    for(let y=0;y<res;y++){
      for(let x=0;x<res;x++){
        const pinned=y===0;
        nodes.push(new ClothNode((x-res/2)*restLen, 6-(y*restLen), 0, pinned));
      }
    }
    clothNodes.current=nodes;
    // Cloth mesh via BufferGeometry
    const geo=new THREE.BufferGeometry();
    const positions=new Float32Array(res*res*3);
    const indices=[];
    for(let y=0;y<res-1;y++) for(let x=0;x<res-1;x++){
      const a=y*res+x, b=a+1, c=a+res, d=c+1;
      indices.push(a,b,c, b,d,c);
    }
    geo.setAttribute("position",new THREE.BufferAttribute(positions,3));
    geo.setIndex(indices);
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x4488cc,side:THREE.DoubleSide,wireframe:false}));
    scene.add(m); ms.push(m);
    clothMesh.current=m;
    return ms;
  }

  function start(){
    if(!scene){ setStatus("No scene"); return; }
    clearSim();
    setStatus(`Starting ${simType}…`);
    let ms=[];
    if(simType==="Cloth Simulation"){ ms=setupCloth(); }
    else if(simType==="Domino Chain"){ ms=setupDomino(); }
    else { ms=setupRigidDrop(); }
    // Ball Pit override
    if(simType==="Ball Pit"){ bodies.current.forEach(b=>{ if(!b.isStatic){ b.vel.y=0; b.mesh.position.y=8; } }); }
    const amb=new THREE.AmbientLight(0xffffff,0.7); scene.add(amb); ms.push(amb);
    const dir=new THREE.DirectionalLight(0xffeedd,1); dir.position.set(20,40,15); dir.castShadow=true; scene.add(dir); ms.push(dir);
    simMeshes.current=ms;
    setRunning(true);
    const tick=(t)=>{
      const dt=Math.min((t-lastT.current)/1000,0.033);
      lastT.current=t;
      // Rigid bodies
      bodies.current.forEach(b=>b.step(dt,gravity));
      // Cloth
      if(clothMesh.current && clothNodes.current.length){
        clothNodes.current.forEach(n=>n.integrate(dt,gravity));
        // Constraints (iterations)
        const res=12;
        for(let iter=0;iter<5;iter++){
          for(let y=0;y<res;y++) for(let x=0;x<res;x++){
            const i=y*res+x;
            if(x<res-1) clothNodes.current[i].constrain(clothNodes.current[i+1],0.5);
            if(y<res-1) clothNodes.current[i].constrain(clothNodes.current[i+res],0.5);
          }
          // Floor
          clothNodes.current.forEach(n=>{ if(n.pos.y<0.1) n.pos.y=0.1; });
        }
        const pos=clothMesh.current.geometry.attributes.position;
        clothNodes.current.forEach((n,i)=>{ pos.setXYZ(i,n.pos.x,n.pos.y,n.pos.z); });
        pos.needsUpdate=true;
        clothMesh.current.geometry.computeVertexNormals();
      }
      fc.current++;
      if(fc.current%10===0) setFrameCount(fc.current);
      raf.current=requestAnimationFrame(tick);
    };
    raf.current=requestAnimationFrame(tick);
    setStatus(`✓ ${simType} running`);
  }

  function pause(){ cancelAnimationFrame(raf.current); setRunning(false); setStatus("Paused"); }

  useEffect(()=>()=>cancelAnimationFrame(raf.current),[]);

  return (
    <div style={S.root}>
      <div style={S.h2}>⚛ PHYSICS SIMULATION</div>
      <div style={S.section}>
        <label style={S.label}>Simulation Type</label>
        <select style={S.select} value={simType} onChange={e=>setSimType(e.target.value)}>
          {SIM_TYPES.map(s=><option key={s}>{s}</option>)}
        </select>
        <label style={S.label}>Shape</label>
        <select style={S.select} value={shape} onChange={e=>setShape(e.target.value)}>
          {SHAPES.map(s=><option key={s}>{s}</option>)}
        </select>
        <label style={S.label}>Object Count: {count}</label>
        <input style={S.input} type="range" min={2} max={100} value={count} onChange={e=>setCount(+e.target.value)}/>
        <label style={S.label}>Gravity: {gravity.toFixed(2)} m/s²</label>
        <input style={S.input} type="range" min={-30} max={5} step={0.1} value={gravity} onChange={e=>setGravity(+e.target.value)}/>
        <label style={S.label}>Restitution (Bounce): {restitution.toFixed(2)}</label>
        <input style={S.input} type="range" min={0} max={1} step={0.01} value={restitution} onChange={e=>setRestitution(+e.target.value)}/>
        <label style={S.label}>Friction: {friction.toFixed(2)}</label>
        <input style={S.input} type="range" min={0} max={1} step={0.01} value={friction} onChange={e=>setFriction(+e.target.value)}/>
      </div>
      {!running
        ? <button style={S.btn} onClick={start}>▶ Start Sim</button>
        : <button style={S.btnRed} onClick={pause}>⏸ Pause</button>
      }
      <button style={S.btnO} onClick={clearSim}>🗑 Reset</button>
      {status && <div style={{...S.stat,marginTop:8}}>{status}</div>}
      {running && <div style={S.stat}>Frame: {frameCount}</div>}
    </div>
  );
}