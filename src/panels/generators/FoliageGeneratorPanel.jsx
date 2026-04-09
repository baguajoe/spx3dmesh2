import React, { useState, useEffect, useRef } from 'react';
import { buildLSystemTree, LSYSTEM_PRESETS } from '../../mesh/LSystemTree.js';
import * as THREE from 'three';

function Slider({label,value,min=0,max=1,step=0.01,onChange,unit=''}) {
  return <div style={{marginBottom:5}}>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#888'}}>
      <span>{label}</span><span style={{color:'#00ffc8',fontWeight:600}}>{step<0.1?value.toFixed(2):Math.round(value)}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{width:'100%',accentColor:'#00ffc8',cursor:'pointer'}}/>
  </div>;
}
function ColorRow({label,value,onChange}) {
  return <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
    <span style={{fontSize:10,color:'#888',flex:1}}>{label}</span>
    <input type="color" value={value} onChange={e=>onChange(e.target.value)} style={{width:32,height:22,border:'none',cursor:'pointer',borderRadius:3}}/>
  </div>;
}
function Section({title,children,defaultOpen=true}) {
  const [open,setOpen]=useState(defaultOpen);
  return <div style={{marginBottom:6,border:'1px solid #21262d',borderRadius:5,overflow:'hidden'}}>
    <div onClick={()=>setOpen(o=>!o)} style={{padding:'5px 8px',cursor:'pointer',background:'#0d1117',display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:600,color:'#00ffc8',userSelect:'none'}}>
      <span>{title}</span><span style={{fontSize:9,opacity:0.7}}>{open?'▲':'▼'}</span>
    </div>
    {open&&<div style={{padding:'6px 8px',background:'#06060f'}}>{children}</div>}
  </div>;
}
function Badges({items,active,onSelect}) {
  return <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:6}}>
    {items.map(item=><button key={item} onClick={()=>onSelect(item)} style={{padding:'2px 7px',fontSize:9,borderRadius:4,cursor:'pointer',background:active===item?'#00ffc8':'#1a1f2c',color:active===item?'#06060f':'#ccc',border:`1px solid ${active===item?'#00ffc8':'#21262d'}`}}>{item}</button>)}
  </div>;
}

const PRESETS = {
  'Oak Tree':    {trunkH:4.5,trunkR:0.22,branchLevels:3,canopySize:2.8,canopyDensity:0.7,leafColor:'#2a7a2a',trunkColor:'#5a3a1a',count:1,scatter:0},
  'Pine Tree':   {trunkH:6.0,trunkR:0.18,branchLevels:5,canopySize:1.4,canopyDensity:0.8,leafColor:'#1a5a2a',trunkColor:'#4a2a10',count:1,scatter:0},
  'Palm Tree':   {trunkH:7.0,trunkR:0.15,branchLevels:1,canopySize:2.2,canopyDensity:0.5,leafColor:'#3a8a2a',trunkColor:'#8a6a3a',count:1,scatter:0},
  'Bush':        {trunkH:0.6,trunkR:0.12,branchLevels:2,canopySize:1.2,canopyDensity:0.9,leafColor:'#3a6a2a',trunkColor:'#4a3a1a',count:1,scatter:0},
  'Dead Tree':   {trunkH:5.0,trunkR:0.20,branchLevels:3,canopySize:0.6,canopyDensity:0.1,leafColor:'#4a3a2a',trunkColor:'#3a2a18',count:1,scatter:0},
  'Forest':      {trunkH:5.0,trunkR:0.20,branchLevels:3,canopySize:2.2,canopyDensity:0.7,leafColor:'#2a6a2a',trunkColor:'#4a2a10',count:12,scatter:0.8},
  'Autumn Tree': {trunkH:4.0,trunkR:0.20,branchLevels:3,canopySize:2.5,canopyDensity:0.65,leafColor:'#cc6622',trunkColor:'#5a3a1a',count:1,scatter:0},
  'Jungle':      {trunkH:8.0,trunkR:0.30,branchLevels:2,canopySize:3.5,canopyDensity:0.9,leafColor:'#1a8a2a',trunkColor:'#3a5a1a',count:8,scatter:0.7},
};

function buildFoliage(scene, p, meshesRef) {
  meshesRef.current.forEach(m=>{scene.remove(m);m.geometry?.dispose();m.material?.dispose();});
  meshesRef.current=[];
  const ms=[];
  if(!scene.getObjectByName('fol_amb')){
    const a=new THREE.AmbientLight(0xffffff,0.6);a.name='fol_amb';scene.add(a);ms.push(a);
    const d=new THREE.DirectionalLight(0xffeedd,1.2);d.name='fol_dir';d.position.set(8,15,8);d.castShadow=true;scene.add(d);ms.push(d);
  }
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshPhysicalMaterial({color:0x1a2a18,roughness:0.95}));
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);ms.push(ground);
  const rng=(a,b)=>a+Math.random()*(b-a);
  const count=Math.max(1,p.count);
  const spread=p.scatter*12;
  for(let i=0;i<count;i++){
    const ox=count>1?rng(-spread,spread):0;
    const oz=count>1?rng(-spread,spread):0;
    const trunkMat=new THREE.MeshPhysicalMaterial({color:new THREE.Color(p.trunkColor),roughness:0.95});
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(p.trunkR*0.6,p.trunkR,p.trunkH,8),trunkMat);
    trunk.position.set(ox,p.trunkH/2,oz);trunk.castShadow=true;scene.add(trunk);ms.push(trunk);
    const leafMat=new THREE.MeshPhysicalMaterial({color:new THREE.Color(p.leafColor),roughness:0.8});
    for(let l=0;l<p.branchLevels;l++){
      const t=(l+1)/p.branchLevels;
      const ly=p.trunkH*(0.45+t*0.5);
      const lr=p.canopySize*(1.1-t*0.35)*(0.4+p.canopyDensity*0.6);
      const geo=p.branchLevels>2&&l<p.branchLevels-1?new THREE.ConeGeometry(lr,lr*0.9,8):new THREE.SphereGeometry(lr,10,7);
      const canopy=new THREE.Mesh(geo,leafMat);
      canopy.position.set(ox,ly,oz);canopy.castShadow=true;scene.add(canopy);ms.push(canopy);
    }
  }
  meshesRef.current=ms;
  return ms.filter(m=>m.isMesh).length;
}

function LSystemTab({ sceneRef }) {
  const meshesRef = useRef([]);
  const [preset, setPreset] = useState('Oak');
  const [grammarType, setGrammarType] = useState('oak');
  const [trunkRadius, setTrunkRadius] = useState(0.22);
  const [trunkColor, setTrunkColor] = useState('#5a3a1a');
  const [leafColor, setLeafColor] = useState('#2a7a2a');
  const [leafSize, setLeafSize] = useState(0.45);
  const [iterations, setIterations] = useState(4);
  const [count, setCount] = useState(1);
  const [scatter, setScatter] = useState(0);

  const build = () => {
    const scene = sceneRef?.current; if(!scene) return;
    buildLSystemTree(scene, { grammarType, trunkRadius, trunkColor, leafColor, leafSize, iterations, count, scatter }, meshesRef);
  };

  useEffect(()=>{ build(); }, []);

  const loadPreset = (name) => {
    const p = LSYSTEM_PRESETS[name]; if(!p) return;
    setPreset(name); setGrammarType(p.grammarType); setTrunkRadius(p.trunkRadius);
    setTrunkColor(p.trunkColor); setLeafColor(p.leafColor); setLeafSize(p.leafSize);
    setIterations(p.iterations); setCount(p.count||1); setScatter(p.scatter||0);
    const scene = sceneRef?.current; if(!scene) return;
    setTimeout(()=>buildLSystemTree(scene, p, meshesRef), 50);
  };

  return <div style={{padding:'0 4px'}}>
    <div style={{fontSize:9,color:'#8b949e',marginBottom:4,letterSpacing:1}}>L-SYSTEM GRAMMAR TREES</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:8}}>
      {Object.keys(LSYSTEM_PRESETS).map(k=><button key={k} onClick={()=>loadPreset(k)} style={{padding:'3px 8px',fontSize:9,borderRadius:4,cursor:'pointer',background:preset===k?'#00ffc8':'#0d1117',color:preset===k?'#06060f':'#8b949e',border:`1px solid ${preset===k?'#00ffc8':'#21262d'}`,fontWeight:700}}>{k}</button>)}
    </div>
    <Slider label="TRUNK RADIUS" value={trunkRadius} min={0.05} max={0.5} step={0.01} onChange={setTrunkRadius}/>
    <Slider label="LEAF SIZE"    value={leafSize}    min={0}    max={1}   step={0.01} onChange={setLeafSize}/>
    <Slider label="ITERATIONS"   value={iterations}  min={2}    max={6}   step={1}    onChange={setIterations}/>
    <Slider label="COUNT"        value={count}       min={1}    max={20}  step={1}    onChange={setCount}/>
    <Slider label="SCATTER"      value={scatter}     min={0}    max={1}   step={0.01} onChange={setScatter}/>
    <ColorRow label="TRUNK" value={trunkColor} onChange={setTrunkColor}/>
    <ColorRow label="LEAF"  value={leafColor}  onChange={setLeafColor}/>
    <button onClick={build} style={{width:'100%',padding:'7px',marginTop:6,background:'rgba(0,255,200,0.1)',border:'1px solid #00ffc8',borderRadius:4,color:'#00ffc8',fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,cursor:'pointer',letterSpacing:1}}>↺ REBUILD TREE</button>
  </div>;
}

export default function FoliageGeneratorPanel({sceneRef,setStatus,onGenerate}) {
  const scene=sceneRef?.current;
  const meshesRef=useRef([]);
  const [activePreset,setActivePreset]=useState('Oak Tree');
  const [trunkH,setTrunkH]=useState(4.5);
  const [trunkR,setTrunkR]=useState(0.22);
  const [branchLevels,setBranchLevels]=useState(3);
  const [canopySize,setCanopySize]=useState(2.8);
  const [canopyDensity,setCanopyDensity]=useState(0.7);
  const [leafColor,setLeafColor]=useState('#2a7a2a');
  const [trunkColor,setTrunkColor]=useState('#5a3a1a');
  const [count,setCount]=useState(1);
  const [scatter,setScatter]=useState(0);

  function getParams(){return{trunkH,trunkR,branchLevels,canopySize,canopyDensity,leafColor,trunkColor,count,scatter};}

  function applyPreset(name){
    const p=PRESETS[name];if(!p)return;setActivePreset(name);
    setTrunkH(p.trunkH);setTrunkR(p.trunkR);setBranchLevels(p.branchLevels);
    setCanopySize(p.canopySize);setCanopyDensity(p.canopyDensity);
    setLeafColor(p.leafColor);setTrunkColor(p.trunkColor);
    setCount(p.count);setScatter(p.scatter);
  }

  function generate(){
    if(!scene){setStatus?.('No scene');return;}
    const n=buildFoliage(scene,getParams(),meshesRef);
    setStatus?.(`✓ ${activePreset} — ${n} meshes`);
    onGenerate?.(getParams());
  }

  function clear(){meshesRef.current.forEach(m=>{scene?.remove(m);m.geometry?.dispose();m.material?.dispose();});meshesRef.current=[];setStatus?.('Cleared');}

  useEffect(()=>{applyPreset('Oak Tree');},[]);

  const P={fontFamily:'JetBrains Mono,monospace',color:'#e0e0e0',fontSize:12,userSelect:'none',width:'100%'};
  return (
    <div style={P}>
      <Section title="🌳 Presets"><Badges items={Object.keys(PRESETS)} active={activePreset} onSelect={applyPreset}/></Section>
      <Section title="🪵 Trunk">
        <Slider label="Trunk Height" value={trunkH} min={0.5} max={12} step={0.1} onChange={setTrunkH}/>
        <Slider label="Trunk Radius" value={trunkR} min={0.05} max={1} step={0.01} onChange={setTrunkR}/>
        <ColorRow label="Trunk Color" value={trunkColor} onChange={setTrunkColor}/>
      </Section>
      <Section title="🍃 Canopy">
        <Slider label="Branch Levels" value={branchLevels} min={1} max={6} step={1} onChange={setBranchLevels}/>
        <Slider label="Canopy Size"   value={canopySize}   min={0.5} max={6} step={0.1} onChange={setCanopySize}/>
        <Slider label="Density"       value={canopyDensity} onChange={setCanopyDensity}/>
        <ColorRow label="Leaf Color"  value={leafColor}    onChange={setLeafColor}/>
      </Section>
      <Section title="🌲 Forest Mode" defaultOpen={false}>
        <Slider label="Tree Count" value={count}   min={1} max={30} step={1} onChange={setCount}/>
        <Slider label="Scatter"    value={scatter} onChange={setScatter}/>
      </Section>
      <div style={{display:'flex',gap:6,marginTop:8}}>
        <button onClick={generate} style={{flex:1,background:'#00ffc8',color:'#06060f',border:'none',borderRadius:4,padding:'7px 0',cursor:'pointer',fontWeight:700,fontSize:12}}>⚡ Generate Foliage</button>
      </div>
      <button onClick={clear} style={{width:'100%',marginTop:6,background:'#1a1f2c',color:'#ff4444',border:'1px solid #ff4444',borderRadius:4,padding:'5px 0',cursor:'pointer',fontSize:11}}>🗑 Clear</button>
    </div>
  );
}
