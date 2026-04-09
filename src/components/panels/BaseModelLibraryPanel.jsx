
import React, { useState, useRef } from "react";
import * as THREE from "three";

const T={bg:"#06060f",panel:"#0d0d1a",border:"#1a1a2e",teal:"#00ffc8",orange:"#FF6600",text:"#e0e0e0",muted:"#aaa",font:"JetBrains Mono,monospace"};
const S={root:{background:T.bg,color:T.text,fontFamily:T.font,padding:16,height:"100%",overflowY:"auto"},h2:{color:T.teal,fontSize:14,marginBottom:12,letterSpacing:1},h3:{color:T.orange,fontSize:12,marginBottom:8,marginTop:8},lbl:{fontSize:11,color:T.muted,display:"block",marginBottom:4},btn:{background:T.teal,color:T.bg,border:"none",borderRadius:4,padding:"7px 16px",fontFamily:T.font,fontSize:12,fontWeight:700,cursor:"pointer",marginRight:8,marginBottom:8},btnO:{background:T.orange,color:"#fff",border:"none",borderRadius:4,padding:"7px 16px",fontFamily:T.font,fontSize:12,fontWeight:700,cursor:"pointer",marginRight:8,marginBottom:8},sec:{background:T.panel,border:"1px solid "+T.border,borderRadius:6,padding:12,marginBottom:12},stat:{fontSize:11,color:T.teal,marginBottom:4},card:{background:"#06060f",border:"1px solid #1a1a2e",borderRadius:6,padding:10,marginBottom:8,cursor:"pointer",transition:"border-color .15s"},cardH:{color:T.teal,fontSize:12,fontWeight:700,marginBottom:2},cardD:{fontSize:10,color:"#888",lineHeight:1.5},badge:{display:"inline-block",background:"#1a1a2e",color:T.orange,fontSize:9,padding:"1px 5px",borderRadius:3,marginRight:4,marginTop:3}};

const CATEGORIES = [
  {
    label:"🧍 Humanoid",
    models:[
      {id:"human_neutral",  name:"Human Neutral",    desc:"Gender-neutral bipedal base. Animation-ready topology.",         tags:["biped","animation","rigging"]},
      {id:"human_male",     name:"Human Male",        desc:"Masculine proportions. 8-head heroic ratio.",                    tags:["biped","male","hero"]},
      {id:"human_female",   name:"Human Female",      desc:"Feminine proportions. Realistic ratio.",                         tags:["biped","female","realistic"]},
      {id:"human_child",    name:"Child",             desc:"4-head ratio. Large head, short limbs.",                         tags:["biped","child","chibi-adjacent"]},
      {id:"human_elder",    name:"Elder",             desc:"Aged proportions. Slight stoop, thinner limbs.",                 tags:["biped","elder","aged"]},
      {id:"human_hero",     name:"Hero Build",        desc:"Exaggerated heroic. Wide shoulders, narrow waist.",             tags:["biped","hero","stylized"]},
      {id:"human_heavyset", name:"Heavyset",          desc:"Full-figured proportions. Grounded, solid build.",              tags:["biped","heavyset","realistic"]},
      {id:"human_athletic", name:"Athletic",          desc:"Lean, muscular. Runner/fighter proportions.",                    tags:["biped","athletic","fit"]},
    ]
  },
  {
    label:"🐾 Quadruped",
    models:[
      {id:"quad_canine",    name:"Canine Base",       desc:"Dog/wolf proportions. 4-legged, medium build.",                 tags:["quad","animal","canine"]},
      {id:"quad_feline",    name:"Feline Base",       desc:"Cat/lion proportions. Lithe, flexible spine.",                  tags:["quad","animal","feline"]},
      {id:"quad_equine",    name:"Equine Base",       desc:"Horse proportions. Long legs, deep chest.",                     tags:["quad","animal","horse"]},
      {id:"quad_reptile",   name:"Reptile Base",      desc:"Crocodile/lizard. Low body, long tail, short legs.",            tags:["quad","reptile","low"]},
      {id:"quad_heavy",     name:"Heavy Beast",       desc:"Bear/rhino proportions. Massive, stocky.",                      tags:["quad","animal","heavy"]},
    ]
  },
  {
    label:"🐉 Creature",
    models:[
      {id:"cre_dragon",     name:"Dragon Base",       desc:"Winged, 4-legged dragon. Long neck and tail.",                  tags:["creature","dragon","wings"]},
      {id:"cre_wyvern",     name:"Wyvern Base",       desc:"2-legged dragon with wings. Smaller than dragon.",              tags:["creature","wyvern","wings"]},
      {id:"cre_kaiju",      name:"Kaiju Base",        desc:"Massive bipedal monster. Thick, heavy proportions.",            tags:["creature","kaiju","giant"]},
      {id:"cre_serpent",    name:"Serpent/Naga",      desc:"Long body, no legs. Coiled or extended pose.",                  tags:["creature","serpent","naga"]},
    ]
  },
  {
    label:"🧬 Hybrid",
    models:[
      {id:"hyb_werewolf",   name:"Werewolf Base",     desc:"60% human, 40% wolf. Digitigrade legs, muzzle.",               tags:["hybrid","werewolf","wolf"]},
      {id:"hyb_dragonman",  name:"Dragon Humanoid",   desc:"Bipedal dragon. Tail, wings, horns, scales.",                  tags:["hybrid","dragon","humanoid"]},
      {id:"hyb_demon",      name:"Demon Humanoid",    desc:"Human with wings, horns, and tail. Dark fantasy.",             tags:["hybrid","demon","dark"]},
      {id:"hyb_lizardman",  name:"Lizard Man",        desc:"Reptile humanoid. Scales, claws, digitigrade legs.",            tags:["hybrid","lizard","reptile"]},
    ]
  },
];

// Maps model IDs to generator panel + preset to launch
const MODEL_ROUTES = {
  "human_neutral":  {panel:"ModelGenerator",   preset:"Realistic Human",   gender:"Neutral/Androgynous"},
  "human_male":     {panel:"ModelGenerator",   preset:"Realistic Human",   gender:"Masculine"},
  "human_female":   {panel:"ModelGenerator",   preset:"Realistic Human",   gender:"Feminine"},
  "human_child":    {panel:"BodyGenerator",    preset:"Child"},
  "human_elder":    {panel:"BodyGenerator",    preset:"Elderly"},
  "human_hero":     {panel:"ModelGenerator",   preset:"Hero/Superhero",    gender:"Masculine"},
  "human_heavyset": {panel:"BodyGenerator",    preset:"Heavyset"},
  "human_athletic": {panel:"BodyGenerator",    preset:"Athletic"},
  "quad_canine":    {panel:"QuadrupedGenerator",preset:"Dog/Wolf"},
  "quad_feline":    {panel:"QuadrupedGenerator",preset:"Cat"},
  "quad_equine":    {panel:"QuadrupedGenerator",preset:"Horse"},
  "quad_reptile":   {panel:"QuadrupedGenerator",preset:"Crocodile"},
  "quad_heavy":     {panel:"QuadrupedGenerator",preset:"Bear"},
  "cre_dragon":     {panel:"CreatureGenerator", preset:"Dragon"},
  "cre_wyvern":     {panel:"CreatureGenerator", preset:"Wyvern"},
  "cre_kaiju":      {panel:"CreatureGenerator", preset:"Kaiju"},
  "cre_serpent":    {panel:"HybridGenerator",   preset:"Naga"},
  "hyb_werewolf":   {panel:"HybridGenerator",   preset:"Werewolf"},
  "hyb_dragonman":  {panel:"HybridGenerator",   preset:"Dragon Humanoid"},
  "hyb_demon":      {panel:"HybridGenerator",   preset:"Demon Beast"},
  "hyb_lizardman":  {panel:"HybridGenerator",   preset:"Lizard Man"},
};

function buildQuickMesh(scene, id) {
  // Lightweight placeholder mesh so user sees something immediately
  // Full model built when they open the specific generator
  const mat = new THREE.MeshStandardMaterial({color:0x00ffc8,roughness:.7,wireframe:false});
  const meshes = [];
  const add=(geo,x,y,z)=>{const m=new THREE.Mesh(geo,mat.clone());m.position.set(x,y,z);m.castShadow=true;scene.add(m);meshes.push(m);};

  if(id.startsWith("human")||id.startsWith("hyb")){
    // Simple humanoid T-pose
    add(new THREE.SphereGeometry(.22,8,6),0,1.75,0); // head
    add(new THREE.BoxGeometry(.38,.55,.22),0,1.25,0); // torso
    add(new THREE.BoxGeometry(.32,.4,.18),0,.78,0);   // hips
    [-.25,.25].forEach(x=>{
      add(new THREE.CylinderGeometry(.07,.06,.5,6),x,1.0,0); // upper arm
      add(new THREE.CylinderGeometry(.06,.05,.45,6),x,.48,0); // forearm
      add(new THREE.CylinderGeometry(.09,.08,.45,6),x*.7,.42,0); // thigh
      add(new THREE.CylinderGeometry(.07,.06,.42,6),x*.7,.0,0);   // shin
    });
  } else if(id.startsWith("quad")){
    add(new THREE.BoxGeometry(.5,.38,1.2),0,.65,0);
    add(new THREE.SphereGeometry(.22,7,5),0,.75,.65);
    [-.2,.2].forEach(x=>[-.45,.45].forEach(z=>{add(new THREE.CylinderGeometry(.07,.06,.55,6),x,.28,z);}));
  } else if(id.startsWith("cre")){
    add(new THREE.BoxGeometry(.9,.8,2.5),0,.9,0);
    add(new THREE.SphereGeometry(.38,8,6),0,1.1,1.4);
    add(new THREE.CylinderGeometry(.12,.08,1.2,6),0,.9,-1.6,0,.4,0);
    [-.5,.5].forEach(x=>{add(new THREE.CylinderGeometry(.12,.1,.65,6),x,.6,.8);});
    [-.5,.5].forEach(x=>{add(new THREE.CylinderGeometry(.12,.1,.65,6),x,.6,-.8);});
  }

  // Ground + lights
  const gnd=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.MeshStandardMaterial({color:0x0a0a14}));
  gnd.rotation.x=-Math.PI/2;scene.add(gnd);meshes.push(gnd);
  if(!scene.getObjectByName("lib_amb")){
    const a=new THREE.AmbientLight(0xffffff,.7);a.name="lib_amb";scene.add(a);meshes.push(a);
    const d=new THREE.DirectionalLight(0xffeedd,1);d.position.set(10,20,10);d.castShadow=true;scene.add(d);meshes.push(d);
  }
  return meshes;
}

export default function BaseModelLibraryPanel({ scene, onLaunchGenerator }) {
  const [filter, setFilter]     = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const [status, setStatus]     = useState("");
  const meshes = useRef([]);

  function clear(){ meshes.current.forEach(m=>{scene.remove(m);m.geometry?.dispose();m.material?.dispose();}); meshes.current=[]; }

  function selectModel(model) {
    setSelected(model.id);
    if (!scene) { setStatus("No scene"); return; }
    clear();
    const ms = buildQuickMesh(scene, model.id);
    meshes.current = ms;
    setStatus(`Preview: ${model.name} — open generator to build full version`);
  }

  function launchGenerator(modelId) {
    const route = MODEL_ROUTES[modelId];
    if (!route) return;
    onLaunchGenerator && onLaunchGenerator(route);
    setStatus(`✓ Launching ${route.panel} with ${route.preset} preset`);
  }

  const cats = ["All", ...CATEGORIES.map(c=>c.label)];
  const allModels = CATEGORIES.flatMap(c=>c.models.map(m=>({...m,category:c.label})));
  const shown = allModels.filter(m=>{
    const matchCat = category==="All" || m.category===category;
    const matchFilter = !filter || m.name.toLowerCase().includes(filter.toLowerCase()) || m.tags.some(t=>t.includes(filter.toLowerCase()));
    return matchCat && matchFilter;
  });

  return(
    <div style={S.root}>
      <div style={S.h2}>📚 BASE MODEL LIBRARY</div>
      <div style={{fontSize:10,color:"#888",marginBottom:12,lineHeight:1.6}}>
        Don't know where to start? Pick a base model below.<br/>
        Click Preview to see it, then Open Generator to fully customize.
      </div>

      <div style={S.sec}>
        <input
          style={{width:"100%",background:T.panel,border:"1px solid "+T.border,color:T.text,padding:"5px 8px",borderRadius:4,fontFamily:T.font,fontSize:11,marginBottom:8,boxSizing:"border-box"}}
          placeholder="Search models, tags..."
          value={filter} onChange={e=>setFilter(e.target.value)}
        />
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {cats.map(c=>(
            <button key={c} style={{...S.btnO,padding:"2px 8px",fontSize:10,background:category===c?T.teal:T.panel,color:category===c?T.bg:T.muted,border:"1px solid "+(category===c?T.teal:"#333")}} onClick={()=>setCategory(c)}>
              {c.replace(/[🧍🐾🐉🧬]\s/,"")}
            </button>
          ))}
        </div>
      </div>

      {shown.map(model=>(
        <div key={model.id} style={{...S.card,borderColor:selected===model.id?T.teal:T.border}} onClick={()=>selectModel(model)}>
          <div style={S.cardH}>{model.name}</div>
          <div style={S.cardD}>{model.desc}</div>
          <div style={{marginTop:4}}>
            {model.tags.map(t=><span key={t} style={S.badge}>{t}</span>)}
          </div>
          {selected===model.id && (
            <button style={{...S.btn,marginTop:8,padding:"4px 12px",fontSize:11}}
              onClick={e=>{e.stopPropagation();launchGenerator(model.id);}}>
              ⚡ Open Generator
            </button>
          )}
        </div>
      ))}

      {status && <div style={{...S.stat,marginTop:4}}>{status}</div>}
    </div>
  );
}
