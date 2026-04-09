
import React, { useState, useRef } from "react";
import { PolyQualityBar, Q, estimateTris, formatTris } from './PolyQualityUtil';
import * as THREE from "three";

const T={bg:"#06060f",panel:"#0d0d1a",border:"#1a1a2e",teal:"#00ffc8",orange:"#FF6600",text:"#e0e0e0",muted:"#aaa",font:"JetBrains Mono,monospace"};
const S={root:{background:T.bg,color:T.text,fontFamily:T.font,padding:16,height:"100%",overflowY:"auto"},h2:{color:T.teal,fontSize:14,marginBottom:12,letterSpacing:1},h3:{color:T.orange,fontSize:12,marginBottom:8,marginTop:8},lbl:{fontSize:11,color:T.muted,display:"block",marginBottom:4},inp:{width:"100%",background:T.panel,border:"1px solid "+T.border,color:T.text,padding:"4px 8px",borderRadius:4,fontFamily:T.font,fontSize:11,marginBottom:8,boxSizing:"border-box"},btn:{background:T.teal,color:T.bg,border:"none",borderRadius:4,padding:"7px 16px",fontFamily:T.font,fontSize:12,fontWeight:700,cursor:"pointer",marginRight:8,marginBottom:8},btnO:{background:T.orange,color:"#fff",border:"none",borderRadius:4,padding:"7px 16px",fontFamily:T.font,fontSize:12,fontWeight:700,cursor:"pointer",marginRight:8,marginBottom:8},btnSm:{background:T.panel,color:T.teal,border:"1px solid "+T.teal,borderRadius:4,padding:"3px 10px",fontFamily:T.font,fontSize:10,cursor:"pointer",marginRight:6,marginBottom:6},sec:{background:T.panel,border:"1px solid "+T.border,borderRadius:6,padding:12,marginBottom:12},stat:{fontSize:11,color:T.teal,marginBottom:4}};

const FISH_PRESETS = {
  "Tropical Fish":    {bodyL:.45,bodyW:.1,bodyH:.4,headSc:.32,tailL:.25,tailFan:.7,dorsalH:.3,dorsalL:.35,pectoralSz:.18,pelvicSz:.1,analFinH:.15,jawL:.08,jawGape:.2,mouthPos:.5,eyeSz:.1,spines:false,barbels:false,color:"#ff8800",stripeColor:"#ffffff",finColor:"#ff4400",eyeColor:"#000000",transparent:false,biolum:false},
  "Shark":            {bodyL:2.0,bodyW:.35,bodyH:.4,headSc:.55,tailL:.7,tailFan:.4,dorsalH:.45,dorsalL:.4,pectoralSz:.55,pelvicSz:.22,analFinH:.12,jawL:.28,jawGape:.6,mouthPos:.3,eyeSz:.1,spines:false,barbels:false,color:"#778899",stripeColor:"#445566",finColor:"#556677",eyeColor:"#1a1a1a",transparent:false,biolum:false},
  "Clownfish":        {bodyL:.18,bodyW:.06,bodyH:.18,headSc:.16,tailL:.1,tailFan:.55,dorsalH:.18,dorsalL:.2,pectoralSz:.1,pelvicSz:.06,analFinH:.1,jawL:.04,jawGape:.15,mouthPos:.55,eyeSz:.08,spines:true,barbels:false,color:"#ff5500",stripeColor:"#ffffff",finColor:"#ff3300",eyeColor:"#000000",transparent:false,biolum:false},
  "Anglerfish":       {bodyL:.5,bodyW:.22,bodyH:.45,headSc:.52,tailL:.18,tailFan:.35,dorsalH:.15,dorsalL:.25,pectoralSz:.25,pelvicSz:.12,analFinH:.12,jawL:.35,jawGape:.8,mouthPos:.35,eyeSz:.12,spines:false,barbels:true,color:"#3a2a1a",stripeColor:"#220a00",finColor:"#552a00",eyeColor:"#ffaa00",transparent:false,biolum:true},
  "Betta/Siamese":    {bodyL:.22,bodyW:.06,bodyH:.2,headSc:.18,tailL:.35,tailFan:.9,dorsalH:.35,dorsalL:.3,pectoralSz:.12,pelvicSz:.18,analFinH:.3,jawL:.06,jawGape:.25,mouthPos:.55,eyeSz:.08,spines:false,barbels:false,color:"#2244cc",stripeColor:"#cc2244",finColor:"#8844ff",eyeColor:"#ff4400",transparent:false,biolum:false},
  "Pufferfish":       {bodyL:.3,bodyW:.28,bodyH:.28,headSc:.38,tailL:.12,tailFan:.3,dorsalH:.12,dorsalL:.2,pectoralSz:.12,pelvicSz:.0,analFinH:.1,jawL:.08,jawGape:.1,mouthPos:.6,eyeSz:.14,spines:true,barbels:false,color:"#cc8822",stripeColor:"#884400",finColor:"#aa6600",eyeColor:"#000000",transparent:false,biolum:false},
  "Manta Ray":        {bodyL:.5,bodyW:2.0,bodyH:.15,headSc:.3,tailL:1.2,tailFan:.05,dorsalH:.08,dorsalL:.15,pectoralSz:0,pelvicSz:0,analFinH:0,jawL:.12,jawGape:.4,mouthPos:.45,eyeSz:.07,spines:false,barbels:false,color:"#223344",stripeColor:"#112233",finColor:"#112233",eyeColor:"#1a1a1a",transparent:false,biolum:false},
  "Seahorse":         {bodyL:.06,bodyW:.05,bodyH:.35,headSc:.14,tailL:.4,tailFan:.05,dorsalH:.1,dorsalL:.12,pectoralSz:.06,pelvicSz:0,analFinH:.04,jawL:.12,jawGape:.05,mouthPos:.9,eyeSz:.06,spines:true,barbels:false,color:"#cc8833",stripeColor:"#aa5500",finColor:"#ffaa44",eyeColor:"#000000",transparent:false,biolum:false},
  "Koi":              {bodyL:.7,bodyW:.18,bodyH:.28,headSc:.28,tailL:.35,tailFan:.65,dorsalH:.28,dorsalL:.4,pectoralSz:.2,pelvicSz:.1,analFinH:.15,jawL:.06,jawGape:.2,mouthPos:.55,eyeSz:.08,spines:false,barbels:true,color:"#ff6600",stripeColor:"#ffffff",finColor:"#ff4400",eyeColor:"#000000",transparent:false,biolum:false},
  "Deep Sea Creature":{bodyL:.8,bodyW:.18,bodyH:.3,headSc:.45,tailL:.3,tailFan:.4,dorsalH:.2,dorsalL:.3,pectoralSz:.22,pelvicSz:.1,analFinH:.15,jawL:.3,jawGape:.75,mouthPos:.35,eyeSz:.18,spines:false,barbels:true,color:"#050510",stripeColor:"#0a0a1a",finColor:"#001133",eyeColor:"#00aaff",transparent:true,biolum:true},
  "Jellyfish":        {bodyL:.02,bodyW:.5,bodyH:.5,headSc:.5,tailL:1.2,tailFan:.02,dorsalH:0,dorsalL:0,pectoralSz:0,pelvicSz:0,analFinH:0,jawL:0,jawGape:0,mouthPos:.5,eyeSz:0,spines:false,barbels:true,color:"#aaccff",stripeColor:"#8899ff",finColor:"#aaaaff",eyeColor:"#ffffff",transparent:true,biolum:true},
  "Eel":              {bodyL:2.5,bodyW:.06,bodyH:.12,headSc:.22,tailL:.5,tailFan:.15,dorsalH:.08,dorsalL:2.0,pectoralSz:.06,pelvicSz:0,analFinH:.07,jawL:.18,jawGape:.4,mouthPos:.4,eyeSz:.07,spines:false,barbels:false,color:"#334422",stripeColor:"#223311",finColor:"#445533",eyeColor:"#ffaa00",transparent:false,biolum:false},
};

function buildFish(scene, cfg) {
  const ms=[];
  const col=new THREE.Color(cfg.color);
  const finCol=new THREE.Color(cfg.finColor);
  const mat=new THREE.MeshStandardMaterial({color:col,roughness:.4,metalness:.2,transparent:cfg.transparent,opacity:cfg.transparent?.6:1,
    emissive:cfg.biolum?new THREE.Color(cfg.eyeColor):new THREE.Color(0),emissiveIntensity:cfg.biolum?.3:0});
  const finMat=new THREE.MeshStandardMaterial({color:finCol,roughness:.3,side:THREE.DoubleSide,transparent:true,opacity:.8});

  const add=(geo,x,y,z,rx=0,ry=0,rz=0,m=mat)=>{
    const mesh=new THREE.Mesh(geo,m.clone());
    mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);
    mesh.castShadow=true;scene.add(mesh);ms.push(mesh);return mesh;
  };

  // Jellyfish special case
  if(cfg.bodyW>1 && cfg.bodyH>.4 && cfg.bodyL<.1){
    // Bell
    const bellGeo=new THREE.SphereGeometry(cfg.bodyW*.5,14,8,0,Math.PI*2,0,Math.PI*.55);
    add(bellGeo,0,.5,0,0,0,0,new THREE.MeshStandardMaterial({color:col,transparent:true,opacity:.5,side:THREE.DoubleSide,emissive:new THREE.Color(cfg.eyeColor),emissiveIntensity:.4}));
    // Tentacles
    for(let t=0;t<12;t++){
      const a=t/12*Math.PI*2, r=cfg.bodyW*.38;
      for(let s=0;s<8;s++){
        const tGeo=new THREE.SphereGeometry(.015,Q(quality).sphere,Q(quality).sphereH);
        const tm=add(tGeo,Math.cos(a)*r*.8,-.2-s*.14,Math.sin(a)*r*.8,0,0,0,new THREE.MeshStandardMaterial({color:finCol,transparent:true,opacity:.6+Math.random()*.3,emissive:new THREE.Color(cfg.eyeColor),emissiveIntensity:.2}));
      }
    }
    if(scene.getObjectByName("fish_amb"))return ms;
    const a=new THREE.AmbientLight(0x112233,.5);a.name="fish_amb";scene.add(a);ms.push(a);
    const d=new THREE.DirectionalLight(0x4488aa,.8);d.position.set(5,10,5);scene.add(d);ms.push(d);
    if(cfg.biolum){const pl=new THREE.PointLight(new THREE.Color(cfg.eyeColor),.6,3);pl.position.set(0,.5,0);scene.add(pl);ms.push(pl);}
    return ms;
  }

  // Seahorse special case — vertical body
  const isSeahorse = cfg.bodyH > cfg.bodyL*3;
  const bL=cfg.bodyL, bW=cfg.bodyW, bH=cfg.bodyH;

  if(isSeahorse){
    // Vertical body segments
    for(let i=0;i<8;i++){
      const y=i*.045+.1, r=.025*(1-i/8*.5)+.01;
      const bumpX=Math.sin(i*.5)*.02;
      add(new THREE.SphereGeometry(r,Q(quality).sphere,Q(quality).sphereH),bumpX,y,0,0,0,0,mat);
    }
    // Curved neck
    add(new THREE.CylinderGeometry(.018,.025,.12,Q(quality).cylinder),.04,.52,0,0,0,.3);
    // Head
    add(new THREE.BoxGeometry(.06,.05,.08),.06,.6,0);
    // Snout
    add(new THREE.CylinderGeometry(.006,.012,cfg.jawL,Q(quality).cylinder),.06,.61,cfg.jawL*.5+.04,Math.PI/2,0,0);
    // Dorsal fin
    const dfGeo=new THREE.PlaneGeometry(cfg.dorsalH*.5,cfg.dorsalL*.5);
    add(dfGeo,.03+cfg.dorsalH*.25,.3,0,0,Math.PI/2,0,finMat);
    // Tail curl
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*.7, r=.06;
      add(new THREE.SphereGeometry(.015*(1-i/6*.5),5,4),Math.cos(a)*r,-.02-Math.sin(a)*r,0);
    }
    if(!scene.getObjectByName("fish_amb")){const a=new THREE.AmbientLight(0xffffff,.7);a.name="fish_amb";scene.add(a);ms.push(a);const d=new THREE.DirectionalLight(0xffeedd,1);d.position.set(8,15,8);d.castShadow=true;scene.add(d);ms.push(d);}
    return ms;
  }

  // Standard fish — body
  const bodyGeo=new THREE.SphereGeometry(.5,Q(quality).sphere,Q(quality).sphereH);
  const body=new THREE.Mesh(bodyGeo,mat.clone());
  body.scale.set(bW,bH,bL); body.position.set(0,.3,0); body.castShadow=true; scene.add(body); ms.push(body);

  // Head
  const headGeo=new THREE.SphereGeometry(cfg.headSc,Q(quality).sphere,Q(quality).sphereH);
  const head=new THREE.Mesh(headGeo,mat.clone());
  head.scale.set(1,1,1.15); head.position.set(0,.3,bL*.45); scene.add(head); ms.push(head);

  // Jaw/mouth
  if(cfg.jawL>.02){
    // Upper jaw
    add(new THREE.BoxGeometry(cfg.headSc*.9,cfg.headSc*.15,cfg.jawL),0,.3+cfg.headSc*(cfg.mouthPos-.5)*.4,bL*.45+cfg.headSc+cfg.jawL/2);
    // Lower jaw
    add(new THREE.BoxGeometry(cfg.headSc*.85,cfg.headSc*.12,cfg.jawL*.9),0,.3+cfg.headSc*(cfg.mouthPos-.5)*.4-cfg.headSc*cfg.jawGape*.25,bL*.45+cfg.headSc+cfg.jawL*.45);
  }

  // Eyes
  if(cfg.eyeSz>.02){
    [-1,1].forEach(s=>{
      add(new THREE.SphereGeometry(cfg.eyeSz,Q(quality).sphere,Q(quality).sphereH),s*cfg.headSc*.65,.3+cfg.headSc*.18,bL*.45+cfg.headSc*.55,0,0,0,
        new THREE.MeshStandardMaterial({color:0xffffff,roughness:.05,emissive:cfg.biolum?new THREE.Color(cfg.eyeColor):new THREE.Color(0),emissiveIntensity:cfg.biolum?.6:0}));
      add(new THREE.SphereGeometry(cfg.eyeSz*.55,Q(quality).sphere,Q(quality).sphereH),s*cfg.headSc*.7,.3+cfg.headSc*.18,bL*.45+cfg.headSc*.65,0,0,0,
        new THREE.MeshStandardMaterial({color:new THREE.Color(cfg.eyeColor)}));
    });
  }

  // Dorsal fin
  if(cfg.dorsalH>.02){
    const dGeo=new THREE.BufferGeometry();
    const dl=cfg.dorsalL, dh=cfg.dorsalH;
    const spk=cfg.spines?4:0;
    const verts=[];
    for(let i=0;i<=8;i++){
      const t=i/8;
      verts.push(-dl/2+t*dl,0,0, -dl/2+t*dl,dh*Math.sin(t*Math.PI)*(1+Math.random()*.1*(spk>0?1:0)),0);
    }
    for(let i=0;i<8;i++) { const b=i*2; dGeo.setIndex([...(dGeo.index?.array||[]),b,b+1,b+2,b+1,b+3,b+2]); }
    const pArr=new Float32Array(verts);
    dGeo.setAttribute("position",new THREE.BufferAttribute(pArr,3));
    // Simple plane instead
    const dfGeo=new THREE.PlaneGeometry(cfg.dorsalL,cfg.dorsalH);
    add(dfGeo,0,.3+bH/2+cfg.dorsalH/2,0,0,0,0,finMat);
  }

  // Pectoral fins
  if(cfg.pectoralSz>.02){
    [-1,1].forEach(s=>{
      const pfGeo=new THREE.EllipseCurve ? new THREE.PlaneGeometry(cfg.pectoralSz,cfg.pectoralSz*.55) : new THREE.PlaneGeometry(cfg.pectoralSz,cfg.pectoralSz*.55);
      add(pfGeo,s*(bW/2+cfg.pectoralSz*.4),.3,bL*.1,s*.4,0,s*.3,finMat);
    });
  }

  // Pelvic fins
  if(cfg.pelvicSz>.02){
    [-1,1].forEach(s=>add(new THREE.PlaneGeometry(cfg.pelvicSz*.7,cfg.pelvicSz),s*(bW/2+cfg.pelvicSz*.25),.3-bH*.2,-bL*.05,s*.5,0,s*.2,finMat));
  }

  // Anal fin
  if(cfg.analFinH>.02){
    add(new THREE.PlaneGeometry(bL*.3,cfg.analFinH),0,.3-bH/2-cfg.analFinH*.4,-bL*.15,0,0,0,finMat);
  }

  // Tail fin
  if(cfg.tailL>.05){
    const fan=cfg.tailFan;
    const tGeo=new THREE.BufferGeometry();
    const verts=new Float32Array([
      0,0,0, -cfg.tailL*fan*.5,cfg.tailL*.55,-cfg.tailL*.3,  cfg.tailL*fan*.5,cfg.tailL*.55,-cfg.tailL*.3,
      0,0,0, -cfg.tailL*fan*.45,-cfg.tailL*.5,-cfg.tailL*.3, cfg.tailL*fan*.45,-cfg.tailL*.5,-cfg.tailL*.3,
    ]);
    tGeo.setAttribute("position",new THREE.BufferAttribute(verts,3));
    tGeo.setIndex([0,1,2,3,4,5]);
    tGeo.computeVertexNormals();
    const tm=new THREE.Mesh(tGeo,finMat.clone());
    tm.position.set(0,.3,-bL*.5);
    scene.add(tm); ms.push(tm);
  }

  // Spine spikes
  if(cfg.spines){
    for(let i=0;i<5;i++){
      const sz=-bL*.1+i*bL*.08;
      add(new THREE.ConeGeometry(bW*.04,cfg.dorsalH*.4,Q(quality).cone),0,.3+bH/2+cfg.dorsalH*.5+i*.01,sz,.1,0,0,
        new THREE.MeshStandardMaterial({color:new THREE.Color(cfg.finColor),roughness:.6}));
    }
  }

  // Barbels (whiskers — catfish, koi, anglerfish lure)
  if(cfg.barbels){
    const isAnglerfish = cfg.biolum && cfg.jawGape>.7;
    if(isAnglerfish){
      // Lure on dorsal spine
      add(new THREE.CylinderGeometry(.01,.008,.35,Q(quality).cylinder),0,.3+bH/2+.4,bL*.2,.3,0,0);
      add(new THREE.SphereGeometry(.04,Q(quality).sphere,Q(quality).sphereH),0,.3+bH/2+.75,bL*.2+.05,0,0,0,
        new THREE.MeshStandardMaterial({color:0x00ffaa,emissive:new THREE.Color(0x00ffaa),emissiveIntensity:.8,roughness:.1}));
      if(cfg.biolum){const pl=new THREE.PointLight(0x00ffaa,.5,1.2);pl.position.set(0,.3+bH/2+.78,bL*.2+.06);scene.add(pl);ms.push(pl);}
    } else {
      // Barbels around mouth
      for(let b=0;b<4;b++){
        const bx=(b%2===0?-1:1)*(b<2?.06:.03), blen=.08+Math.random()*.06;
        add(new THREE.CylinderGeometry(.004,.003,blen,Q(quality).cylinder),bx,.3+cfg.headSc*(cfg.mouthPos-.5)*.4-.03,bL*.45+cfg.headSc+cfg.jawL*.5+blen*.3,-.2,0,.2*(b<2?1:-1),
          new THREE.MeshStandardMaterial({color:new THREE.Color(cfg.color),roughness:.9}));
      }
    }
  }

  // Stripe pattern overlay
  if(cfg.stripeColor !== cfg.color){
    for(let s=0;s<2;s++){
      const sg=new THREE.SphereGeometry(.49,Q(quality).sphere,Q(quality).sphereH);
      const sm=new THREE.Mesh(sg,new THREE.MeshStandardMaterial({color:new THREE.Color(cfg.stripeColor),transparent:true,opacity:.7,roughness:.4,metalness:.2}));
      sm.scale.set(bW*.85,bH*.3,bL*.25);
      sm.position.set(0,.3,bL*(s-.25)*.6);
      scene.add(sm); ms.push(sm);
    }
  }

  // Water ambient lighting
  if(!scene.getObjectByName("fish_amb")){
    const a=new THREE.AmbientLight(0x112244,.6);a.name="fish_amb";scene.add(a);ms.push(a);
    const d=new THREE.DirectionalLight(0x88ccff,.9);d.position.set(5,15,8);d.castShadow=true;scene.add(d);ms.push(d);
    if(cfg.biolum){const pl=new THREE.PointLight(new THREE.Color(cfg.eyeColor),.5,3);pl.position.set(0,.3,bL*.3);scene.add(pl);ms.push(pl);}
  }
  return ms;
}

const CTRL=[
  {id:"bodyL",lbl:"Body Length",min:.02,max:3,step:.01},
  {id:"bodyW",lbl:"Body Width",min:.02,max:2.5,step:.01},
  {id:"bodyH",lbl:"Body Height",min:.02,max:1,step:.01},
  {id:"headSc",lbl:"Head Scale",min:.05,max:.8,step:.01},
  {id:"tailL",lbl:"Tail Length",min:0,max:1.5,step:.01},
  {id:"tailFan",lbl:"Tail Fan",min:.02,max:1,step:.01},
  {id:"dorsalH",lbl:"Dorsal Fin Height",min:0,max:.7,step:.01},
  {id:"dorsalL",lbl:"Dorsal Fin Length",min:0,max:1,step:.01},
  {id:"pectoralSz",lbl:"Pectoral Fin",min:0,max:.8,step:.01},
  {id:"pelvicSz",lbl:"Pelvic Fin",min:0,max:.4,step:.01},
  {id:"analFinH",lbl:"Anal Fin",min:0,max:.4,step:.01},
  {id:"jawL",lbl:"Jaw Length",min:0,max:.5,step:.01},
  {id:"jawGape",lbl:"Jaw Gape",min:0,max:1,step:.01},
  {id:"mouthPos",lbl:"Mouth Position",min:.2,max:.8,step:.01},
  {id:"eyeSz",lbl:"Eye Size",min:0,max:.25,step:.01},
];

export default function FishGeneratorPanel({ scene }) {
  const [preset,setPreset] = useState("Tropical Fish");
  const [quality, setQuality] = useState('Mid');
  const [cfg,setCfg]       = useState({...FISH_PRESETS["Tropical Fish"]});
  const [colors,setColors] = useState({color:"#ff8800",stripeColor:"#ffffff",finColor:"#ff4400",eyeColor:"#000000"});
  const [spines,setSpines] = useState(false);
  const [barbels,setBarbels]= useState(false);
  const [transparent,setTransparent]=useState(false);
  const [biolum,setBiolum] = useState(false);
  const [status,setStatus] = useState("");
  const meshes = useRef([]);

  function loadPreset(p){
    setPreset(p);const pr=FISH_PRESETS[p];setCfg({...pr});
    setColors({color:pr.color,stripeColor:pr.stripeColor,finColor:pr.finColor,eyeColor:pr.eyeColor});
    setSpines(pr.spines||false);setBarbels(pr.barbels||false);
    setTransparent(pr.transparent||false);setBiolum(pr.biolum||false);
  }
  function clear(){ meshes.current.forEach(m=>{scene.remove(m);m.geometry?.dispose();m.material?.dispose();}); meshes.current=[]; setStatus(""); }
  function generate(){
    if(!scene){setStatus("No scene");return;}
    clear();
    const ms=buildFish(scene,{...cfg,...colors,spines,barbels,transparent,biolum});
    meshes.current=ms;
    setStatus(`✓ ${preset} built — ${ms.filter(m=>m.isMesh).length} parts`);
  }

  return(
    <div style={S.root}>
      <div style={S.h2}>🐟 FISH GENERATOR</div>
      
      <PolyQualityBar quality={quality} onChange={setQuality}/>
<div style={S.sec}>
        <label style={S.lbl}>Fish/Aquatic Preset</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
          {Object.keys(FISH_PRESETS).map(p=><button key={p} style={{...S.btnSm,background:preset===p?T.teal:T.panel,color:preset===p?T.bg:T.teal}} onClick={()=>loadPreset(p)}>{p}</button>)}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
          {[["color","Body"],["stripeColor","Stripe"],["finColor","Fin"],["eyeColor","Eye"]].map(([k,lbl])=>(
            <div key={k}><label style={{...S.lbl,fontSize:9}}>{lbl}</label>
            <input type="color" value={colors[k]} onChange={e=>setColors(c=>({...c,[k]:e.target.value}))} style={{width:40,height:28,border:"none",background:"none",cursor:"pointer"}}/></div>
          ))}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
          {[["spines","Dorsal Spines",spines,setSpines],["barbels","Barbels/Lure",barbels,setBarbels],["transparent","Transparent",transparent,setTransparent],["biolum","Bioluminescent",biolum,setBiolum]].map(([k,lbl,val,set])=>(
            <label key={k} style={{...S.lbl,cursor:"pointer"}}><input type="checkbox" checked={val} onChange={e=>set(e.target.checked)}/> {lbl}</label>
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
