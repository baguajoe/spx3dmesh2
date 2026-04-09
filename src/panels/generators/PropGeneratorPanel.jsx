import React, { useState, useEffect, useRef } from 'react';
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

const PROP_TYPES = ['Barrel','Crate','Trash Can','Street Light','Fire Hydrant','Mailbox','Bench','Dumpster','Lamppost','Rock','Fence'];

function buildProp(scene, type, p, meshesRef) {
  meshesRef.current.forEach(m=>{scene.remove(m);m.geometry?.dispose();m.material?.dispose();});
  meshesRef.current=[];
  const ms=[];
  if(!scene.getObjectByName('prop_amb')){
    const a=new THREE.AmbientLight(0xffffff,0.6);a.name='prop_amb';scene.add(a);ms.push(a);
    const d=new THREE.DirectionalLight(0xffeedd,1.2);d.name='prop_dir';d.position.set(8,15,8);d.castShadow=true;scene.add(d);ms.push(d);
  }
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshPhysicalMaterial({color:0x111811,roughness:0.95}));
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);ms.push(ground);

  const col=new THREE.Color(p.color);
  const mat=(c=col,r=p.roughness,me=p.metalness)=>new THREE.MeshPhysicalMaterial({color:c,roughness:r,metalness:me});
  const rng=(a,b)=>a+Math.random()*(b-a);
  const n=Math.max(1,p.count), sp=p.scatter*6;

  for(let i=0;i<n;i++){
    const ox=n>1?rng(-sp,sp):0, oz=n>1?rng(-sp,sp):0;
    const add=(geo,x,y,z,m=mat())=>{const mesh=new THREE.Mesh(geo,m);mesh.position.set(ox+x,y,oz+z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);ms.push(mesh);return mesh;};
    const w=p.width, h=p.height, d=p.depth;

    if(type==='Barrel'){
      add(new THREE.CylinderGeometry(w*0.5,w*0.45,h,16),0,h/2,0);
      add(new THREE.TorusGeometry(w*0.5,0.04,6,16),0,h*0.25,0,mat(0x888888,0.3,0.7));
      add(new THREE.TorusGeometry(w*0.5,0.04,6,16),0,h*0.75,0,mat(0x888888,0.3,0.7));
    } else if(type==='Crate'){
      add(new THREE.BoxGeometry(w,h,d),0,h/2,0);
      for(const sx of[-1,1]){
        add(new THREE.BoxGeometry(0.05,h*1.01,d*1.01),sx*w*0.35,h/2,0,mat(new THREE.Color('#5a3a1a'),0.9));
        add(new THREE.BoxGeometry(w*1.01,h*1.01,0.05),0,h/2,sx*d*0.35,mat(new THREE.Color('#5a3a1a'),0.9));
      }
    } else if(type==='Trash Can'){
      add(new THREE.CylinderGeometry(w*0.42,w*0.38,h*0.92,14),0,h*0.46,0);
      add(new THREE.CylinderGeometry(w*0.46,w*0.44,h*0.08,14),0,h*0.96,0,mat(0x444444,0.5,0.5));
    } else if(type==='Street Light'){
      add(new THREE.CylinderGeometry(0.06,0.1,h*0.9,8),0,h*0.45,0,mat(0x888899,0.4,0.6));
      add(new THREE.CylinderGeometry(0.04,0.04,w*0.6,8),0,h*0.92,w*0.15,mat(0x888899,0.4,0.6));
      add(new THREE.SphereGeometry(0.12,8,6),0,h*0.94,w*0.28,mat(0xffffcc,0.1,0.0));
    } else if(type==='Fire Hydrant'){
      add(new THREE.CylinderGeometry(w*0.38,w*0.42,h*0.7,10),0,h*0.35,0);
      add(new THREE.CylinderGeometry(w*0.32,w*0.35,h*0.22,10),0,h*0.78,0);
      add(new THREE.SphereGeometry(w*0.22,8,6),0,h*0.92,0);
      for(const sx of[-1,1]) add(new THREE.CylinderGeometry(0.06,0.06,w*0.35,8),sx*w*0.48,h*0.42,0,mat(0xcccc00,0.4,0.5));
    } else if(type==='Mailbox'){
      add(new THREE.CylinderGeometry(0.05,0.05,h*0.7,6),0,h*0.35,0,mat(0x444444,0.6));
      add(new THREE.BoxGeometry(w,h*0.5,d),0,h*0.8,0);
      add(new THREE.CylinderGeometry(w*0.5,w*0.5,d,12,1,false,0,Math.PI),0,h*0.8,0,mat(col));
      add(new THREE.BoxGeometry(w*0.5,0.05,0.06),0,h*0.72,d*0.51,mat(0x111111,0.9));
    } else if(type==='Bench'){
      for(let bi=-1;bi<=1;bi++) add(new THREE.BoxGeometry(w,0.06,0.14),0,h,bi*0.12,mat(col,0.85));
      for(const sx of[-1,1]){
        add(new THREE.BoxGeometry(0.06,h,0.04),sx*w*0.42,h/2,-0.18);
        add(new THREE.BoxGeometry(0.06,h,0.04),sx*w*0.42,h/2,0.18);
        add(new THREE.BoxGeometry(0.06,0.04,0.4),sx*w*0.42,h*0.3,0);
      }
      for(let bi=0;bi<2;bi++) add(new THREE.BoxGeometry(w,0.05,0.08),0,h+0.12+bi*0.14,-0.28);
    } else if(type==='Dumpster'){
      add(new THREE.BoxGeometry(w,h*0.85,d),0,h*0.42,0,mat(col,0.6,0.3));
      add(new THREE.BoxGeometry(w*0.48,0.06,d*1.01),w*0.25,h*0.87,0,mat(0x333333,0.5));
      add(new THREE.BoxGeometry(w*0.48,0.06,d*1.01),-w*0.25,h*0.87,0,mat(0x333333,0.5));
    } else if(type==='Lamppost'){
      add(new THREE.CylinderGeometry(0.08,0.12,h,8),0,h/2,0,mat(0x556677,0.4,0.6));
      add(new THREE.BoxGeometry(w*0.5,0.08,0.08),0,h,w*0.12,mat(0x556677,0.4,0.6));
      add(new THREE.CylinderGeometry(0.15,0.12,0.2,8),0,h+0.1,w*0.24,mat(0xffffaa,0.1));
    } else if(type==='Rock'){
      add(new THREE.DodecahedronGeometry(w*0.6,0),0,h*0.3,0,mat(col,0.95));
      add(new THREE.DodecahedronGeometry(w*0.35,0),w*0.2,h*0.15,w*0.15,mat(new THREE.Color(p.color).multiplyScalar(0.8),0.95));
    } else if(type==='Fence'){
      for(let fi=0;fi<5;fi++){
        add(new THREE.BoxGeometry(0.08,h,0.08),fi*w*0.5-w,h/2,0);
      }
      add(new THREE.BoxGeometry(w*2.4,0.06,0.06),0,h*0.65,0);
      add(new THREE.BoxGeometry(w*2.4,0.06,0.06),0,h*0.35,0);
    }
  }
  meshesRef.current=ms;
  return ms.filter(m=>m.isMesh).length;
}

export default function PropGeneratorPanel({sceneRef,setStatus,onGenerate}) {
  const scene=sceneRef?.current;
  const meshesRef=useRef([]);
  const [activeProp,setActiveProp]=useState('Barrel');
  const [width,setWidth]=useState(0.6);
  const [height,setHeight]=useState(1.0);
  const [depth,setDepth]=useState(0.6);
  const [color,setColor]=useState('#8a5a2a');
  const [count,setCount]=useState(1);
  const [scatter,setScatter]=useState(0.0);
  const [roughness,setRoughness]=useState(0.6);
  const [metalness,setMetalness]=useState(0.1);

  function getParams(){return{width,height,depth,color,count,scatter,roughness,metalness};}

  function generate(){
    if(!scene){setStatus?.('No scene');return;}
    const n=buildProp(scene,activeProp,getParams(),meshesRef);
    setStatus?.(`✓ ${count}x ${activeProp} — ${n} parts`);
    onGenerate?.(getParams());
  }

  function clear(){meshesRef.current.forEach(m=>{scene?.remove(m);m.geometry?.dispose();m.material?.dispose();});meshesRef.current=[];setStatus?.('Cleared');}

  useEffect(()=>{if(scene) buildProp(scene,activeProp,getParams(),meshesRef);},[activeProp]);

  const P={fontFamily:'JetBrains Mono,monospace',color:'#e0e0e0',fontSize:12,userSelect:'none',width:'100%'};
  return (
    <div style={P}>
      <Section title="📦 Prop Type">
        <Badges items={PROP_TYPES} active={activeProp} onSelect={setActiveProp}/>
      </Section>
      <Section title="📐 Dimensions">
        <Slider label="Width"  value={width}  min={0.1} max={4} step={0.05} onChange={setWidth}/>
        <Slider label="Height" value={height} min={0.1} max={6} step={0.05} onChange={setHeight}/>
        <Slider label="Depth"  value={depth}  min={0.1} max={4} step={0.05} onChange={setDepth}/>
      </Section>
      <Section title="🎨 Material">
        <ColorRow label="Color"    value={color}    onChange={setColor}/>
        <Slider label="Roughness"  value={roughness} onChange={setRoughness}/>
        <Slider label="Metalness"  value={metalness} onChange={setMetalness}/>
      </Section>
      <Section title="🔢 Scatter" defaultOpen={false}>
        <Slider label="Count"   value={count}   min={1} max={20} step={1} onChange={setCount}/>
        <Slider label="Scatter" value={scatter} onChange={setScatter}/>
      </Section>
      <div style={{display:'flex',gap:6,marginTop:8}}>
        <button onClick={generate} style={{flex:1,background:'#00ffc8',color:'#06060f',border:'none',borderRadius:4,padding:'7px 0',cursor:'pointer',fontWeight:700,fontSize:12}}>⚡ Generate Prop</button>
      </div>
      <button onClick={clear} style={{width:'100%',marginTop:6,background:'#1a1f2c',color:'#ff4444',border:'1px solid #ff4444',borderRadius:4,padding:'5px 0',cursor:'pointer',fontSize:11}}>🗑 Clear</button>
    </div>
  );
}
