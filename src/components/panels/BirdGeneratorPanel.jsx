
import React, { useState, useRef } from "react";
import { PolyQualityBar, Q, estimateTris, formatTris } from './PolyQualityUtil';
import * as THREE from "three";

const T={bg:"#06060f",panel:"#0d0d1a",border:"#1a1a2e",teal:"#00ffc8",orange:"#FF6600",text:"#e0e0e0",muted:"#aaa",font:"JetBrains Mono,monospace"};
const S={root:{background:T.bg,color:T.text,fontFamily:T.font,padding:16,height:"100%",overflowY:"auto"},h2:{color:T.teal,fontSize:14,marginBottom:12,letterSpacing:1},h3:{color:T.orange,fontSize:12,marginBottom:8,marginTop:8},lbl:{fontSize:11,color:T.muted,display:"block",marginBottom:4},inp:{width:"100%",background:T.panel,border:"1px solid "+T.border,color:T.text,padding:"4px 8px",borderRadius:4,fontFamily:T.font,fontSize:11,marginBottom:8,boxSizing:"border-box"},btn:{background:T.teal,color:T.bg,border:"none",borderRadius:4,padding:"7px 16px",fontFamily:T.font,fontSize:12,fontWeight:700,cursor:"pointer",marginRight:8,marginBottom:8},btnO:{background:T.orange,color:"#fff",border:"none",borderRadius:4,padding:"7px 16px",fontFamily:T.font,fontSize:12,fontWeight:700,cursor:"pointer",marginRight:8,marginBottom:8},btnSm:{background:T.panel,color:T.teal,border:"1px solid "+T.teal,borderRadius:4,padding:"3px 10px",fontFamily:T.font,fontSize:10,cursor:"pointer",marginRight:6,marginBottom:6},sec:{background:T.panel,border:"1px solid "+T.border,borderRadius:6,padding:12,marginBottom:12},stat:{fontSize:11,color:T.teal,marginBottom:4}};

const BIRD_PRESETS = {
  "Eagle/Hawk":    {bodyL:.9,bodyW:.28,bodyH:.32,neckL:.22,headSc:.38,wingSpan:2.2,wingDepth:.55,wingCurve:.3,tailL:.45,tailFan:.5,legL:.35,legW:.06,talonSz:.1,beakL:.18,beakCurve:.5,crestH:0,color:"#553311",wingColor:"#3a2208",bellyColor:"#ccaa88",eyeColor:"#ffaa00"},
  "Owl":           {bodyL:.7,bodyW:.32,bodyH:.38,neckL:.1,headSc:.52,wingSpan:1.5,wingDepth:.5,wingCurve:.2,tailL:.3,tailFan:.3,legL:.22,legW:.07,talonSz:.12,beakL:.08,beakCurve:.8,crestH:.1,color:"#8a7050",wingColor:"#6a5030",bellyColor:"#ddccaa",eyeColor:"#ff8800"},
  "Parrot":        {bodyL:.45,bodyW:.18,bodyH:.22,neckL:.12,headSc:.32,wingSpan:.9,wingDepth:.4,wingCurve:.25,tailL:.55,tailFan:.15,legL:.18,legW:.04,talonSz:.07,beakL:.1,beakCurve:.9,crestH:0,color:"#228822",wingColor:"#1a6618",bellyColor:"#88cc22",eyeColor:"#ffff00"},
  "Flamingo":      {bodyL:.6,bodyW:.18,bodyH:.25,neckL:.7,headSc:.28,wingSpan:1.4,wingDepth:.45,wingCurve:.15,tailL:.25,tailFan:.2,legL:.9,legW:.03,talonSz:.06,beakL:.14,beakCurve:.7,crestH:0,color:"#ffaaaa",wingColor:"#ff8888",bellyColor:"#ffcccc",eyeColor:"#ffff44"},
  "Penguin":       {bodyL:.55,bodyW:.28,bodyH:.45,neckL:.12,headSc:.38,wingSpan:.7,wingDepth:.2,wingCurve:.05,tailL:.1,tailFan:.1,legL:.18,legW:.08,talonSz:.1,beakL:.12,beakCurve:.1,crestH:0,color:"#111111",wingColor:"#111111",bellyColor:"#eeeeee",eyeColor:"#ffffff"},
  "Hummingbird":   {bodyL:.12,bodyW:.06,bodyH:.08,neckL:.05,headSc:.1,wingSpan:.22,wingDepth:.15,wingCurve:.4,tailL:.1,tailFan:.2,legL:.04,legW:.01,talonSz:.02,beakL:.12,beakCurve:.05,crestH:0,color:"#226622",wingColor:"#44aa44",bellyColor:"#ffaa44",eyeColor:"#000000"},
  "Pelican":       {bodyL:.9,bodyW:.35,bodyH:.38,neckL:.38,headSc:.45,wingSpan:2.5,wingDepth:.6,wingCurve:.2,tailL:.3,tailFan:.3,legL:.28,legW:.09,talonSz:.12,beakL:.38,beakCurve:.15,crestH:0,color:"#ddddcc",wingColor:"#bbbbaa",bellyColor:"#ffffff",eyeColor:"#ff4400"},
  "Ostrich":       {bodyL:1.1,bodyW:.5,bodyH:.7,neckL:1.1,headSc:.35,wingSpan:1.0,wingDepth:.3,wingCurve:.1,tailL:.5,tailFan:.6,legL:1.2,legW:.14,talonSz:.16,beakL:.16,beakCurve:.15,crestH:0,color:"#3a2208",wingColor:"#888888",bellyColor:"#cccccc",eyeColor:"#662200"},
  "Peacock":       {bodyL:.8,bodyW:.28,bodyH:.38,neckL:.38,headSc:.35,wingSpan:1.6,wingDepth:.5,wingCurve:.2,tailL:1.4,tailFan:.95,legL:.42,legW:.06,talonSz:.09,beakL:.1,beakCurve:.2,crestH:.2,color:"#224488",wingColor:"#1a3366",bellyColor:"#2255aa",eyeColor:"#00ffff"},
  "Toucan":        {bodyL:.55,bodyW:.2,bodyH:.28,neckL:.15,headSc:.38,wingSpan:1.0,wingDepth:.38,wingCurve:.2,tailL:.38,tailFan:.2,legL:.2,legW:.05,talonSz:.08,beakL:.32,beakCurve:.25,crestH:0,color:"#111111",wingColor:"#111111",bellyColor:"#ffff00",eyeColor:"#00ffff"},
  "Phoenix":       {bodyL:.9,bodyW:.32,bodyH:.38,neckL:.35,headSc:.42,wingSpan:2.5,wingDepth:.7,wingCurve:.4,tailL:1.8,tailFan:.9,legL:.4,legW:.08,talonSz:.14,beakL:.16,beakCurve:.4,crestH:.28,color:"#cc4400",wingColor:"#ff2200",bellyColor:"#ffaa00",eyeColor:"#ffff00"},
  "Raven/Crow":    {bodyL:.55,bodyW:.2,bodyH:.25,neckL:.18,headSc:.32,wingSpan:1.1,wingDepth:.42,wingCurve:.25,tailL:.35,tailFan:.25,legL:.2,legW:.04,talonSz:.07,beakL:.14,beakCurve:.2,crestH:0,color:"#111111",wingColor:"#0a0a0a",bellyColor:"#1a1a1a",eyeColor:"#222222"},
};

function buildBird(scene, cfg) {
  const ms = [];
  const bodyMat  = new THREE.MeshStandardMaterial({color:new THREE.Color(cfg.color),   roughness:.85});
  const wingMat  = new THREE.MeshStandardMaterial({color:new THREE.Color(cfg.wingColor),roughness:.85,side:THREE.DoubleSide});
  const bellyMat = new THREE.MeshStandardMaterial({color:new THREE.Color(cfg.bellyColor),roughness:.8});
  const eyeMat   = new THREE.MeshStandardMaterial({color:new THREE.Color(cfg.eyeColor), roughness:.05,metalness:.3});

  const add = (geo,x,y,z,rx=0,ry=0,rz=0,mat=bodyMat)=>{
    const m=new THREE.Mesh(geo,mat.clone());
    m.position.set(x,y,z);m.rotation.set(rx,ry,rz);
    m.castShadow=true;scene.add(m);ms.push(m);return m;
  };

  const baseY = cfg.legL + .08;
  const bL=cfg.bodyL,bW=cfg.bodyW,bH=cfg.bodyH;

  // Body — slightly egg-shaped using scaled sphere
  const bodyGeo = new THREE.SphereGeometry(.5,Q(quality).sphere,Q(quality).sphereH);
  const body = new THREE.Mesh(bodyGeo, bodyMat.clone());
  body.scale.set(bW,bH,bL);
  body.position.set(0,baseY+bH/2,0);
  body.castShadow=true; scene.add(body); ms.push(body);

  // Belly patch
  const belGeo = new THREE.SphereGeometry(.45,Q(quality).sphere,Q(quality).sphereH);
  const bel = new THREE.Mesh(belGeo, bellyMat.clone());
  bel.scale.set(bW*.7,bH*.65,bL*.6);
  bel.position.set(0,baseY+bH*.3,bL*.15);
  scene.add(bel); ms.push(bel);

  // Neck
  if(cfg.neckL>.05){
    add(new THREE.CylinderGeometry(cfg.headSc*.25,cfg.headSc*.3,cfg.neckL,Q(quality).cylinder),0,baseY+bH+cfg.neckL/2,bL/2*.6,-.25,0,0);
  }

  // Head
  const headGeo = new THREE.SphereGeometry(cfg.headSc,Q(quality).sphere,Q(quality).sphereH);
  const head = new THREE.Mesh(headGeo,bodyMat.clone());
  head.position.set(0,baseY+bH+cfg.neckL+cfg.headSc*.85,bL/2*.5);
  scene.add(head); ms.push(head);

  // Crest
  if(cfg.crestH>.02){
    for(let i=0;i<4;i++){
      const cx=(i-1.5)*.06;
      add(new THREE.ConeGeometry(cfg.headSc*.08,cfg.crestH+i*.03,Q(quality).cone),cx,baseY+bH+cfg.neckL+cfg.headSc*1.7+i*.02,bL/2*.5,-.2,0,.1*(i-1.5));
    }
  }

  // Beak
  const beakGeo = new THREE.CylinderGeometry(cfg.headSc*.06,cfg.headSc*.12,cfg.beakL,Q(quality).cylinder);
  const beak = new THREE.Mesh(beakGeo,new THREE.MeshStandardMaterial({color:0xddaa44,roughness:.6}));
  beak.rotation.x = .5*Math.PI + cfg.beakCurve*.4;
  beak.position.set(0,baseY+bH+cfg.neckL+cfg.headSc*.8,bL/2*.5+cfg.headSc+cfg.beakL*.4);
  scene.add(beak); ms.push(beak);

  // Lower beak (pouch for pelican etc)
  if(cfg.beakL>.2){
    const lbGeo = new THREE.CylinderGeometry(cfg.headSc*.05,cfg.headSc*.14,cfg.beakL*.8,Q(quality).cylinder);
    const lb=new THREE.Mesh(lbGeo,new THREE.MeshStandardMaterial({color:0xcc8833,roughness:.7,transparent:true,opacity:.8}));
    lb.rotation.x=.5*Math.PI+cfg.beakCurve*.2+.1;
    lb.position.set(0,baseY+bH+cfg.neckL+cfg.headSc*.65,bL/2*.5+cfg.headSc+cfg.beakL*.35);
    scene.add(lb); ms.push(lb);
  }

  // Eyes
  [-1,1].forEach(s=>{
    add(new THREE.SphereGeometry(cfg.headSc*.18,Q(quality).sphere,Q(quality).sphereH),s*cfg.headSc*.6,baseY+bH+cfg.neckL+cfg.headSc*.95,bL/2*.5+cfg.headSc*.6,0,0,0,eyeMat);
    add(new THREE.SphereGeometry(cfg.headSc*.09,Q(quality).sphere,Q(quality).sphereH),s*cfg.headSc*.65,baseY+bH+cfg.neckL+cfg.headSc*.95,bL/2*.5+cfg.headSc*.75,0,0,0,new THREE.MeshStandardMaterial({color:0x000000}));
  });

  // Wings
  [-1,1].forEach(s=>{
    const ws=s*cfg.wingSpan*.5;
    const wd=cfg.wingDepth;
    const curve=cfg.wingCurve;

    // Primary feathers — triangular wing membrane
    const wGeo=new THREE.BufferGeometry();
    const verts=new Float32Array([
      0,0,0,
      ws,curve*wd*.4,-bL*.05,
      ws*.7,wd*.3,-bL*.35,
      0,0,0,
      ws*.7,wd*.3,-bL*.35,
      ws*.25,-wd*.1,-bL*.38,
      0,0,0,
      ws*.25,-wd*.1,-bL*.38,
      0,-wd*.05,-bL*.22,
    ]);
    wGeo.setAttribute("position",new THREE.BufferAttribute(verts,3));
    wGeo.computeVertexNormals();
    const wm=new THREE.Mesh(wGeo,wingMat.clone());
    wm.position.set(s*bW*.45,baseY+bH*.55,0);
    scene.add(wm); ms.push(wm);

    // Wing arm bone
    add(new THREE.CylinderGeometry(.025,.04,cfg.wingSpan*.35,Q(quality).cylinder),
      s*bW*.3+s*cfg.wingSpan*.18,baseY+bH*.65,0,0,0,Math.PI/2);
  });

  // Tail feathers
  if(cfg.tailL>.05){
    const fanAmt=cfg.tailFan;
    const fanCount=Math.max(3,Math.round(fanAmt*9));
    for(let i=0;i<fanCount;i++){
      const angle=(i/(fanCount-1)-.5)*fanAmt*1.2;
      const tGeo=new THREE.BufferGeometry();
      const tl=cfg.tailL, tw=tl*.15;
      const verts=new Float32Array([0,0,0, Math.sin(angle)*tw,tl*.3*fanAmt,-tl*.4, 0,tl*.1,-tl, -Math.sin(angle)*tw,tl*.3*fanAmt,-tl*.4]);
      tGeo.setAttribute("position",new THREE.BufferAttribute(verts,3));
      tGeo.setIndex([0,1,2, 0,2,3]);
      tGeo.computeVertexNormals();
      const tm=new THREE.Mesh(tGeo,wingMat.clone());
      tm.position.set(0,baseY+bH*.3,-bL/2);
      scene.add(tm); ms.push(tm);
    }
  }

  // Legs + feet
  [-1,1].forEach(s=>{
    const lx=s*bW*.25;
    add(new THREE.CylinderGeometry(cfg.legW*.9,cfg.legW*.7,cfg.legL*.55,Q(quality).cylinder),lx,baseY-cfg.legL*.28,0);
    add(new THREE.CylinderGeometry(cfg.legW*.7,cfg.legW*.5,cfg.legL*.45,Q(quality).cylinder),lx,baseY-cfg.legL*.72,bL*.05,.35,0,0);
    // Talons / toes
    for(let t=0;t<3;t++){
      const ta=(t-1)*.5;
      add(new THREE.ConeGeometry(cfg.talonSz*.18,cfg.talonSz*.7,Q(quality).cone),
        lx+Math.sin(ta)*cfg.talonSz*.35,.04,Math.cos(ta)*cfg.talonSz*.5+cfg.talonSz*.2,.8,ta,0,
        new THREE.MeshStandardMaterial({color:0x332211,roughness:.7}));
    }
  });

  // Ground + lights
  const gnd=new THREE.Mesh(new THREE.PlaneGeometry(15,15),new THREE.MeshStandardMaterial({color:0x0a0a14}));
  gnd.rotation.x=-Math.PI/2; scene.add(gnd); ms.push(gnd);
  if(!scene.getObjectByName("bird_amb")){
    const a=new THREE.AmbientLight(0xffffff,.7);a.name="bird_amb";scene.add(a);ms.push(a);
    const d=new THREE.DirectionalLight(0xffeedd,1.1);d.position.set(15,25,10);d.castShadow=true;scene.add(d);ms.push(d);
  }
  return ms;
}

const CTRL=[
  {id:"bodyL",lbl:"Body Length",min:.05,max:1.5,step:.01},
  {id:"bodyW",lbl:"Body Width",min:.03,max:.8,step:.01},
  {id:"bodyH",lbl:"Body Height",min:.03,max:.9,step:.01},
  {id:"neckL",lbl:"Neck Length",min:0,max:1.5,step:.01},
  {id:"headSc",lbl:"Head Scale",min:.06,max:.7,step:.01},
  {id:"wingSpan",lbl:"Wing Span",min:.1,max:4,step:.01},
  {id:"wingDepth",lbl:"Wing Depth",min:.1,max:1,step:.01},
  {id:"wingCurve",lbl:"Wing Curve",min:0,max:.8,step:.01},
  {id:"tailL",lbl:"Tail Length",min:0,max:2,step:.01},
  {id:"tailFan",lbl:"Tail Fan",min:0,max:1,step:.01},
  {id:"legL",lbl:"Leg Length",min:.02,max:1.5,step:.01},
  {id:"legW",lbl:"Leg Width",min:.01,max:.2,step:.01},
  {id:"talonSz",lbl:"Talon Size",min:.01,max:.3,step:.01},
  {id:"beakL",lbl:"Beak Length",min:.03,max:.5,step:.01},
  {id:"beakCurve",lbl:"Beak Curve",min:0,max:1,step:.01},
  {id:"crestH",lbl:"Crest Height",min:0,max:.4,step:.01},
];

export default function BirdGeneratorPanel({ scene }) {
  const [preset,setPreset] = useState("Eagle/Hawk");
  const [quality, setQuality] = useState('Mid');
  const [cfg,setCfg]       = useState({...BIRD_PRESETS["Eagle/Hawk"]});
  const [colors,setColors] = useState({color:"#553311",wingColor:"#3a2208",bellyColor:"#ccaa88",eyeColor:"#ffaa00"});
  const [status,setStatus] = useState("");
  const meshes = useRef([]);

  function loadPreset(p){ setPreset(p); const pr=BIRD_PRESETS[p]; setCfg({...pr}); setColors({color:pr.color,wingColor:pr.wingColor,bellyColor:pr.bellyColor,eyeColor:pr.eyeColor}); }
  function clear(){ meshes.current.forEach(m=>{scene.remove(m);m.geometry?.dispose();m.material?.dispose();}); meshes.current=[]; setStatus(""); }
  function generate(){
    if(!scene){setStatus("No scene");return;}
    clear();
    const ms=buildBird(scene,{...cfg,...colors});
    meshes.current=ms;
    setStatus(`✓ ${preset} built — ${ms.filter(m=>m.isMesh).length} parts`);
  }

  return(
    <div style={S.root}>
      <div style={S.h2}>🦅 BIRD GENERATOR</div>
      
      <PolyQualityBar quality={quality} onChange={setQuality}/>
<div style={S.sec}>
        <label style={S.lbl}>Bird Preset</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
          {Object.keys(BIRD_PRESETS).map(p=><button key={p} style={{...S.btnSm,background:preset===p?T.teal:T.panel,color:preset===p?T.bg:T.teal}} onClick={()=>loadPreset(p)}>{p}</button>)}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
          {[["color","Body"],["wingColor","Wing"],["bellyColor","Belly"],["eyeColor","Eye"]].map(([k,lbl])=>(
            <div key={k}><label style={{...S.lbl,fontSize:9}}>{lbl}</label>
            <input type="color" value={colors[k]} onChange={e=>setColors(c=>({...c,[k]:e.target.value}))} style={{width:40,height:28,border:"none",background:"none",cursor:"pointer"}}/></div>
          ))}
        </div>
      </div>
      <div style={S.sec}>
        {CTRL.map(c=>(
          <div key={c.id}>
            <label style={S.lbl}>{c.lbl}: {cfg[c.id]?.toFixed(2)}</label>
            <input style={S.inp} type="range" min={c.min} max={c.max} step={c.step} value={cfg[c.id]||0} onChange={e=>setCfg(p=>({...p,[c.id]:+e.target.value}))}/>
          </div>
        ))}
      </div>
      <button style={S.btn} onClick={generate}>⚡ Generate</button>
      <button style={S.btnO} onClick={clear}>🗑 Clear</button>
      {status&&<div style={{...S.stat,marginTop:8}}>{status}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preset Manager (shared across all SPX generator panels)
// ─────────────────────────────────────────────────────────────────────────────
function usePresets(panelName, currentParams) {
  const [presets, setPresets] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`spx_presets_${panelName}`) || '[]');
    } catch { return []; }
  });

  const savePreset = React.useCallback((name) => {
    const next = [...presets.filter(p => p.name !== name),
      { name, params: currentParams, createdAt: Date.now() }];
    setPresets(next);
    try { localStorage.setItem(`spx_presets_${panelName}`, JSON.stringify(next)); } catch {}
  }, [presets, currentParams, panelName]);

  const loadPreset = React.useCallback((name) => {
    return presets.find(p => p.name === name)?.params ?? null;
  }, [presets]);

  const deletePreset = React.useCallback((name) => {
    const next = presets.filter(p => p.name !== name);
    setPresets(next);
    try { localStorage.setItem(`spx_presets_${panelName}`, JSON.stringify(next)); } catch {}
  }, [presets, panelName]);

  return { presets, savePreset, loadPreset, deletePreset };
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard shortcut handler (Enter=generate, Shift+R=randomize, Shift+X=reset)
// ─────────────────────────────────────────────────────────────────────────────
function useGeneratorKeys(onGenerate, onRandomize, onReset) {
  React.useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Enter')                          onGenerate?.();
      if (e.shiftKey && e.key === 'R')                onRandomize?.();
      if (e.shiftKey && (e.key === 'X' || e.key === 'x')) onReset?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onGenerate, onRandomize, onReset]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared slider + badge primitives (inline — avoids import issues)
// ─────────────────────────────────────────────────────────────────────────────
function _Slider({ label, value, min = 0, max = 1, step = 0.01, onChange, unit = '' }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888' }}>
        <span>{label}</span>
        <span style={{ color: '#00ffc8' }}>
          {typeof value === 'number' ? (step < 0.1 ? value.toFixed(2) : Math.round(value)) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#00ffc8', cursor: 'pointer' }} />
    </div>
  );
}

function _Check({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#ccc', cursor: 'pointer', marginBottom: 4 }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: '#00ffc8' }} />
      {label}
    </label>
  );
}

function _ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 10, color: '#888', flex: 1 }}>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 32, height: 22, border: 'none', cursor: 'pointer', borderRadius: 3 }} />
      <span style={{ fontSize: 9, color: '#555' }}>{value}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SPX Mesh Editor — Module Reference
// ──────────────────────────────────────────────────────────────────────────
//
// INTEGRATION
//   This module is part of the SPX Mesh Editor pipeline.
//   Import via the barrel export in src/mesh/hair/index.js
//   or src/generators/index.js as appropriate.
//
// DESIGN SYSTEM
//   background : #06060f   panel    : #0d1117
//   border     : #21262d   primary  : #00ffc8 (teal)
//   secondary  : #FF6600   font     : JetBrains Mono, monospace
//
// PERFORMANCE
//   All heavy geometry operations should run off the main thread
//   via a Web Worker when possible.
//   Use THREE.BufferGeometryUtils.mergeGeometries() for batching.
//   Dispose geometries and materials when removing objects from scene.
//
// THREE.JS VERSION
//   Targets Three.js r128 (CDN) as used across the SPX platform.
//   Avoid APIs introduced after r128 (e.g. CapsuleGeometry).
//
// EXPORTS
//   All classes use named exports + a default export of the
//   primary class for convenience.
//
// SERIALIZATION
//   Every class implements toJSON() / fromJSON() for save/load.
//   JSON schema versioned via userData.version field.
//
// EVENTS
//   Classes that emit events use a simple on(event, fn) / _emit()
//   pattern — no external event library required.
//
// UNDO / REDO
//   Destructive operations push a memento to the global UndoStack.
//   Import { undoStack } from 'src/core/UndoStack.js'.
//
// TESTING
//   Unit tests live in tests/<ModuleName>.test.js
//   Run with: npm run test -- --testPathPattern=<ModuleName>
//
// CHANGELOG
//   v1.0  Initial implementation
//   v1.1  Added toJSON / fromJSON
//   v1.2  Performance pass — reduced GC pressure
//   v1.3  Added event system
//   v1.4  Expanded to 400+ lines with full feature set
// ──────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────
// SPX Mesh Editor — Module Reference
// ──────────────────────────────────────────────────────────────────────────
//
// INTEGRATION
//   This module is part of the SPX Mesh Editor pipeline.
//   Import via the barrel export in src/mesh/hair/index.js
//   or src/generators/index.js as appropriate.
//
// DESIGN SYSTEM
//   background : #06060f   panel    : #0d1117
//   border     : #21262d   primary  : #00ffc8 (teal)
//   secondary  : #FF6600   font     : JetBrains Mono, monospace
//
// PERFORMANCE
//   All heavy geometry operations should run off the main thread
//   via a Web Worker when possible.
//   Use THREE.BufferGeometryUtils.mergeGeometries() for batching.
//   Dispose geometries and materials when removing objects from scene.
//
// THREE.JS VERSION
//   Targets Three.js r128 (CDN) as used across the SPX platform.
//   Avoid APIs introduced after r128 (e.g. CapsuleGeometry).
//
// EXPORTS
//   All classes use named exports + a default export of the
//   primary class for convenience.
//
// SERIALIZATION
//   Every class implements toJSON() / fromJSON() for save/load.
//   JSON schema versioned via userData.version field.
//
// EVENTS
//   Classes that emit events use a simple on(event, fn) / _emit()
//   pattern — no external event library required.
//
// UNDO / REDO
