import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import "../../styles/world-generators.css";

const PRESETS = {
  forest:   { label:"Forest",   icon:"🌲", groundCol:0x2d4a1e, skyCol:0x1a3a28, fogCol:0x2d5a27, fogDen:0.015, ambCol:0x3a6b30, ambInt:0.6, sunCol:0xffe4b5, sunInt:1.2, sunPos:[40,60,30],  trees:25, treeCol:0x2a7a2a, trunkCol:0x5a3a1a, rocks:8,  water:false, cactus:0, grass:true,  snowCap:false },
  desert:   { label:"Desert",   icon:"🏜️", groundCol:0xc2955a, skyCol:0x87ceeb, fogCol:0xd2b48c, fogDen:0.005, ambCol:0xffd700, ambInt:0.9, sunCol:0xfff8dc, sunInt:2.0, sunPos:[80,80,40],  trees:2,  treeCol:0x2d6b2d, trunkCol:0x7a5530, rocks:15, water:false, cactus:8, grass:false, snowCap:false },
  arctic:   { label:"Arctic",   icon:"🏔️", groundCol:0xddeeff, skyCol:0x8899bb, fogCol:0xaabbcc, fogDen:0.02,  ambCol:0xaaccee, ambInt:0.5, sunCol:0xffffff, sunInt:0.8, sunPos:[20,40,60],  trees:5,  treeCol:0x1a5a2a, trunkCol:0x4a2a10, rocks:12, water:false, cactus:0, grass:false, snowCap:true  },
  jungle:   { label:"Jungle",   icon:"🌴", groundCol:0x1a3a10, skyCol:0x0a2a18, fogCol:0x1a4a20, fogDen:0.025, ambCol:0x2a5a20, ambInt:0.5, sunCol:0xffeebb, sunInt:0.9, sunPos:[30,50,20],  trees:40, treeCol:0x1a8a2a, trunkCol:0x3a5a1a, rocks:5,  water:true,  cactus:0, grass:true,  snowCap:false },
  beach:    { label:"Beach",    icon:"🏖️", groundCol:0xf4d090, skyCol:0x4a88dd, fogCol:0x8aaccc, fogDen:0.008, ambCol:0xffffff, ambInt:0.8, sunCol:0xfff0cc, sunInt:1.8, sunPos:[60,70,40],  trees:6,  treeCol:0x2a7a2a, trunkCol:0x8a6a3a, rocks:4,  water:true,  cactus:0, grass:false, snowCap:false },
  volcanic: { label:"Volcanic", icon:"🌋", groundCol:0x2a1a10, skyCol:0x1a0808, fogCol:0x3a1a10, fogDen:0.03,  ambCol:0xff4400, ambInt:0.4, sunCol:0xff8800, sunInt:0.6, sunPos:[20,40,10],  trees:0,  treeCol:0x1a1a1a, trunkCol:0x1a1a1a, rocks:20, water:false, cactus:0, grass:false, snowCap:false },
  savanna:  { label:"Savanna",  icon:"🦁", groundCol:0xc8a840, skyCol:0x88aacc, fogCol:0xccaa88, fogDen:0.006, ambCol:0xffdd88, ambInt:0.8, sunCol:0xffee88, sunInt:1.6, sunPos:[70,65,50],  trees:8,  treeCol:0x8a7a1a, trunkCol:0x6a4a10, rocks:6,  water:false, cactus:0, grass:true,  snowCap:false },
  swamp:    { label:"Swamp",    icon:"🌿", groundCol:0x2a3a18, skyCol:0x1a2a18, fogCol:0x2a3a20, fogDen:0.04,  ambCol:0x4a6a30, ambInt:0.4, sunCol:0xaabb88, sunInt:0.5, sunPos:[20,30,20],  trees:15, treeCol:0x3a5a20, trunkCol:0x3a3a18, rocks:3,  water:true,  cactus:0, grass:true,  snowCap:false },
};

function buildTerrain(scene, preset, size, roughness, heightScale) {
  const res=64, geo=new THREE.PlaneGeometry(size,size,res,res), pos=geo.attributes.position;
  const p=PRESETS[preset];
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i);
    let h=0;
    h+=Math.sin(x*0.08)*Math.cos(z*0.06)*3; h+=Math.sin(x*0.18+1.2)*Math.cos(z*0.15+0.8)*1.5;
    h+=Math.sin(x*0.35+2.1)*Math.cos(z*0.32+1.4)*0.8; h+=Math.sin(x*0.7+0.5)*Math.cos(z*0.65+2.2)*0.3;
    h*=roughness*heightScale*0.5;
    const dx=Math.abs(x)/(size/2),dz=Math.abs(z)/(size/2),edge=Math.max(0,Math.max(dx,dz)-0.7)/0.3;
    h*=Math.max(0,1-edge*edge);
    if(p.snowCap&&h>heightScale*0.3) h=heightScale*0.35+(h-heightScale*0.3)*0.2;
    pos.setY(i,h);
  }
  geo.computeVertexNormals(); geo.rotateX(-Math.PI/2);
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:p.groundCol,roughness:0.9,metalness:0.0}));
  mesh.receiveShadow=true; mesh.castShadow=false; mesh.name="env_terrain"; scene.add(mesh); return mesh;
}

function buildTree(scene,x,z,p,variant,snowCap){
  const g=new THREE.Group();
  const trunkH=1.5+Math.random()*3,trunkR=0.12+Math.random()*0.12;
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(trunkR*0.7,trunkR,trunkH,7),new THREE.MeshStandardMaterial({color:p.trunkCol,roughness:0.95}));
  trunk.position.y=trunkH/2; trunk.castShadow=true; g.add(trunk);
  const foliageCol=snowCap?0xddeeff:p.treeCol;
  if(variant==='pine'){for(let l=0;l<3;l++){const lr=(1.2-l*0.3)*(0.8+Math.random()*0.4);const cone=new THREE.Mesh(new THREE.ConeGeometry(lr,lr*1.2,8),new THREE.MeshStandardMaterial({color:foliageCol,roughness:0.8}));cone.position.y=trunkH+l*lr*0.7;cone.castShadow=true;g.add(cone);}}
  else if(variant==='palm'){const fronds=new THREE.Mesh(new THREE.SphereGeometry(1.4,8,5,0,Math.PI*2,0,Math.PI*0.6),new THREE.MeshStandardMaterial({color:foliageCol,roughness:0.8}));fronds.position.y=trunkH+0.5;fronds.castShadow=true;g.add(fronds);}
  else{const canopy=new THREE.Mesh(new THREE.SphereGeometry(0.8+Math.random()*0.8,9,7),new THREE.MeshStandardMaterial({color:foliageCol,roughness:0.8}));canopy.position.y=trunkH+0.6;canopy.castShadow=true;g.add(canopy);if(Math.random()>0.4){const extra=canopy.clone();extra.position.set(0.4,trunkH+0.3,0.3);extra.scale.setScalar(0.7);g.add(extra);}}
  g.position.set(x,0,z); g.rotation.y=Math.random()*Math.PI*2; scene.add(g); return g;
}

function buildRock(scene,x,z,size){
  const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(size*(0.3+Math.random()*0.4),Math.random()>0.5?1:0),new THREE.MeshStandardMaterial({color:0x666677,roughness:0.95}));
  rock.position.set(x,size*0.2,z); rock.rotation.set(Math.random(),Math.random()*Math.PI,Math.random());
  rock.castShadow=true; rock.receiveShadow=true; scene.add(rock); return rock;
}

function buildCactus(scene,x,z){
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0x2d6b2d,roughness:0.8});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,2.5+Math.random(),8),mat);
  body.position.y=1.3; body.castShadow=true; g.add(body);
  if(Math.random()>0.4){const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.14,1.2,7),mat.clone());arm.rotation.z=0.6;arm.position.set(0.5,1.8,0);g.add(arm);const armTop=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.6,7),mat.clone());armTop.position.set(1.0,2.2,0);g.add(armTop);}
  g.position.set(x,0,z); g.rotation.y=Math.random()*Math.PI*2; scene.add(g); return g;
}

function buildWater(scene,size,waterColor){
  const geo=new THREE.PlaneGeometry(size*0.6,size*0.6,20,20); geo.rotateX(-Math.PI/2);
  const mat=new THREE.MeshStandardMaterial({color:waterColor||0x1a4a8a,transparent:true,opacity:0.78,roughness:0.05,metalness:0.1});
  const mesh=new THREE.Mesh(geo,mat); mesh.position.y=-0.5; scene.add(mesh); return mesh;
}

function buildGrass(scene,size,count,groundCol){
  const positions=new Float32Array(count*3);
  for(let i=0;i<count;i++){positions[i*3]=(Math.random()-0.5)*size*0.9;positions[i*3+1]=0.2+Math.random()*0.8;positions[i*3+2]=(Math.random()-0.5)*size*0.9;}
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const mat=new THREE.PointsMaterial({color:groundCol,size:0.15,sizeAttenuation:true});
  const points=new THREE.Points(geo,mat); scene.add(points); return points;
}

export default function EnvironmentGenerator() {
  const mountRef    = useRef(null);
  const sceneRef    = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef   = useRef(null);
  const frameRef    = useRef(null);
  const clockRef    = useRef(new THREE.Clock());
  const meshesRef   = useRef([]);
  const waterRef    = useRef(null);

  const [activePreset, setActivePreset] = useState("forest");
  const [size,         setSize]         = useState(100);
  const [roughness,    setRoughness]    = useState(0.7);
  const [heightScale,  setHeightScale]  = useState(12);
  const [treeDensity,  setTreeDensity]  = useState(0.7);
  const [rockDensity,  setRockDensity]  = useState(0.6);
  const [showWater,    setShowWater]    = useState(true);
  const [waterColor,   setWaterColor]   = useState("#1a6aaa");
  const [stats,        setStats]        = useState(null);

  useEffect(() => {
    const mount=mountRef.current; if(!mount) return;
    const scene=new THREE.Scene(); sceneRef.current=scene;
    const camera=new THREE.PerspectiveCamera(55,1,0.5,2000);
    camera.position.set(0,60,100); camera.lookAt(0,0,0); cameraRef.current=camera;
    const renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement); rendererRef.current=renderer;

    let isDragging=false,lastX=0,lastY=0,theta=0.5,phi=0.35,radius=100;
    const onDown=e=>{isDragging=true;lastX=e.clientX;lastY=e.clientY;};
    const onUp=()=>isDragging=false;
    const onMove=e=>{
      if(!isDragging) return;
      theta-=(e.clientX-lastX)*0.005; phi=Math.max(0.1,Math.min(1.4,phi-(e.clientY-lastY)*0.005));
      lastX=e.clientX; lastY=e.clientY;
      camera.position.set(Math.sin(theta)*Math.cos(phi)*radius,Math.sin(phi)*radius,Math.cos(theta)*Math.cos(phi)*radius);
      camera.lookAt(0,0,0);
    };
    const onWheel=e=>{radius=Math.max(20,Math.min(300,radius+e.deltaY*0.1));camera.position.setLength(radius);};
    mount.addEventListener('mousedown',onDown); mount.addEventListener('mouseup',onUp);
    mount.addEventListener('mousemove',onMove); mount.addEventListener('wheel',onWheel);

    function animate(){
      frameRef.current=requestAnimationFrame(animate);
      const w=mount.clientWidth,h=mount.clientHeight;
      if(renderer.domElement.width!==w||renderer.domElement.height!==h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
      const t=clockRef.current.getElapsedTime();
      if(waterRef.current){const pos=waterRef.current.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,Math.sin(x*0.3+t)*0.08+Math.sin(z*0.25+t*0.8)*0.06);}pos.needsUpdate=true;waterRef.current.geometry.computeVertexNormals();}
      renderer.render(scene,camera);
    }
    animate();
    generate(scene);

    return ()=>{
      cancelAnimationFrame(frameRef.current);
      mount.removeEventListener('mousedown',onDown); mount.removeEventListener('mouseup',onUp);
      mount.removeEventListener('mousemove',onMove); mount.removeEventListener('wheel',onWheel);
      renderer.dispose(); if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  },[]);

  function clearScene(scene){
    meshesRef.current.forEach(m=>{scene.remove(m);m.traverse?.(child=>{child.geometry?.dispose();child.material?.dispose();});});
    meshesRef.current=[]; waterRef.current=null; scene.fog=null; scene.background=null;
  }

  function generate(sc){
    const scene=sc||sceneRef.current; if(!scene) return;
    clearScene(scene);
    const ms=[], p=PRESETS[activePreset];
    scene.background=new THREE.Color(p.skyCol);
    if(p.fogDen>0) scene.fog=new THREE.FogExp2(p.fogCol,p.fogDen);
    const amb=new THREE.AmbientLight(p.ambCol,p.ambInt); scene.add(amb); ms.push(amb);
    const sun=new THREE.DirectionalLight(p.sunCol,p.sunInt);
    sun.position.set(...p.sunPos); sun.castShadow=true;
    sun.shadow.mapSize.width=2048; sun.shadow.mapSize.height=2048;
    sun.shadow.camera.near=1; sun.shadow.camera.far=500;
    sun.shadow.camera.left=-size; sun.shadow.camera.right=size;
    sun.shadow.camera.top=size; sun.shadow.camera.bottom=-size;
    scene.add(sun); ms.push(sun);
    const hemi=new THREE.HemisphereLight(p.skyCol,p.groundCol,0.3); scene.add(hemi); ms.push(hemi);
    const terrain=buildTerrain(scene,activePreset,size,roughness,heightScale); ms.push(terrain);
    if(p.water&&showWater){const water=buildWater(scene,size,parseInt(waterColor.replace('#',''),16));waterRef.current=water;ms.push(water);}
    const rng=(a,b)=>a+Math.random()*(b-a);
    const treeCount=Math.round(p.trees*treeDensity*1.5);
    const variant=activePreset==='jungle'||activePreset==='beach'?'palm':activePreset==='arctic'?'pine':Math.random()>0.5?'oak':'pine';
    for(let i=0;i<treeCount;i++){ms.push(buildTree(scene,rng(-size*0.45,size*0.45),rng(-size*0.45,size*0.45),p,variant,p.snowCap));}
    for(let i=0;i<p.cactus;i++){ms.push(buildCactus(scene,rng(-size*0.4,size*0.4),rng(-size*0.4,size*0.4)));}
    const rockCount=Math.round(p.rocks*rockDensity*1.5);
    for(let i=0;i<rockCount;i++){ms.push(buildRock(scene,rng(-size*0.45,size*0.45),rng(-size*0.45,size*0.45),1+Math.random()*2));}
    if(p.grass){ms.push(buildGrass(scene,size,800,p.groundCol));}
    if(activePreset==='volcanic'){for(let i=0;i<8;i++){const lava=new THREE.Mesh(new THREE.DodecahedronGeometry(2+Math.random()*3,1),new THREE.MeshStandardMaterial({color:0xff4400,emissive:0xff2200,emissiveIntensity:0.5,roughness:0.9}));lava.position.set(rng(-size*0.3,size*0.3),0.5,rng(-size*0.3,size*0.3));scene.add(lava);ms.push(lava);}}
    meshesRef.current=ms;
    setStats({preset:p.label,trees:ms.filter(m=>m.isGroup).length,rocks:ms.filter(m=>m.isMesh&&m.geometry?.type==='DodecahedronGeometry').length,meshes:ms.length});
  }

  return (
    <div className="gen-root">
      <div className="gen-sidebar">
        <div className="gen-env-title">🌍 ENVIRONMENT</div>

        <div className="gen-sec-label gen-sec-label--pb">BIOME PRESET</div>
        <div className="gen-env-preset-grid">
          {Object.entries(PRESETS).map(([id,p])=>(
            <div key={id} className={`gen-env-preset${activePreset===id?' gen-env-preset--active':''}`} onClick={()=>setActivePreset(id)}>
              <div className="gen-env-preset-icon">{p.icon}</div>
              {p.label}
            </div>
          ))}
        </div>

        <div className="gen-sec-label gen-sec-label--mt">TERRAIN</div>
        <label className="gen-sec-box-label">Size: {size}m</label>
        <input className="gen-sec-box-slider" type="range" min={40} max={300} value={size} onChange={e=>setSize(+e.target.value)}/>
        <label className="gen-sec-box-label">Roughness: {roughness.toFixed(2)}</label>
        <input className="gen-sec-box-slider" type="range" min={0} max={1} step={0.01} value={roughness} onChange={e=>setRoughness(+e.target.value)}/>
        <label className="gen-sec-box-label">Height Scale: {heightScale}m</label>
        <input className="gen-sec-box-slider" type="range" min={1} max={40} value={heightScale} onChange={e=>setHeightScale(+e.target.value)}/>

        <div className="gen-sec-label gen-sec-label--mt">VEGETATION</div>
        <label className="gen-sec-box-label">Tree Density: {treeDensity.toFixed(2)}</label>
        <input className="gen-sec-box-slider" type="range" min={0} max={1} step={0.01} value={treeDensity} onChange={e=>setTreeDensity(+e.target.value)}/>
        <label className="gen-sec-box-label">Rock Density: {rockDensity.toFixed(2)}</label>
        <input className="gen-sec-box-slider" type="range" min={0} max={1} step={0.01} value={rockDensity} onChange={e=>setRockDensity(+e.target.value)}/>

        <div className="gen-sec-label gen-sec-label--mt">WATER</div>
        <label className="gen-row-label" style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',marginBottom:8,fontSize:10,color:'var(--muted)'}}>
          <input type="checkbox" checked={showWater} onChange={e=>setShowWater(e.target.checked)} style={{accentColor:'var(--teal)'}}/>
          Show Water
        </label>
        <label className="gen-sec-box-label">Water Color</label>
        <input type="color" value={waterColor} onChange={e=>setWaterColor(e.target.value)} className="gen-color-full"/>

        <button className="gen-btn gen-btn--primary" style={{width:'100%',marginBottom:6}} onClick={()=>generate()}>⚡ Generate</button>
        <button className="gen-btn gen-btn--orange" style={{width:'100%'}} onClick={()=>clearScene(sceneRef.current)}>🗑 Clear</button>

        {stats && (
          <div className="gen-water-box">
            <div style={{fontSize:10,color:'var(--teal)',marginBottom:2}}>🌍 {stats.preset}</div>
            <div style={{fontSize:10,color:'var(--teal)',marginBottom:2}}>🌲 Trees: {stats.trees}</div>
            <div style={{fontSize:10,color:'var(--teal)',marginBottom:2}}>🪨 Rocks: {stats.rocks}</div>
            <div style={{fontSize:10,color:'var(--teal)'}}>📦 Total: {stats.meshes}</div>
          </div>
        )}

        <div className="gen-hint">🖱 Drag to orbit<br/>🖱 Scroll to zoom</div>
      </div>

      <div ref={mountRef} className="gen-main" style={{flex:1,position:'relative',overflow:'hidden'}}/>
    </div>
  );
}
