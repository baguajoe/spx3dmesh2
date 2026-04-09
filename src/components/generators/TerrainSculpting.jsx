import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import "../../styles/world-generators.css";

const TOOLS = [
  { id:"raise",   label:"Raise",   icon:"⬆",  desc:"Lift terrain up",        color:"#00ffc8" },
  { id:"lower",   label:"Lower",   icon:"⬇",  desc:"Push terrain down",       color:"#FF6600" },
  { id:"flatten", label:"Flatten", icon:"━",  desc:"Level to average height", color:"#ffcc00" },
  { id:"smooth",  label:"Smooth",  icon:"~",  desc:"Blur height variation",   color:"#4488ff" },
  { id:"paint",   label:"Paint",   icon:"🎨", desc:"Paint vertex colors",     color:"#44bb77" },
  { id:"noise",   label:"Noise",   icon:"⸪",  desc:"Add fractal noise",       color:"#aa44ff" },
  { id:"plateau", label:"Plateau", icon:"▬",  desc:"Create flat plateau",     color:"#888888" },
  { id:"valley",  label:"Valley",  icon:"⌣",  desc:"Carve a valley",          color:"#553311" },
];

const BIOMES = [
  { id:"highlands", label:"Highlands", colors:["#2a5a1a","#4a7a2a","#8b8b6b","#ccccaa","#ffffff"] },
  { id:"desert",    label:"Desert",    colors:["#c2955a","#d4a86a","#e8c080","#f0d890","#ffffff"] },
  { id:"volcanic",  label:"Volcanic",  colors:["#1a0a00","#3a1a00","#881800","#cc3300","#ff6600"] },
  { id:"arctic",    label:"Arctic",    colors:["#aabbcc","#bbccdd","#ccddee","#ddeeff","#ffffff"] },
  { id:"jungle",    label:"Jungle",    colors:["#0a2a00","#1a4a00","#2a6a00","#3a8a00","#4aaa00"] },
];

const TERRAIN_RES  = 64;
const TERRAIN_SIZE = 20;

function createHeightmap(res) { return new Float32Array(res*res); }

function applyFractalNoise(hm,res,scale=1,octaves=4,seed=0){
  for(let i=0;i<res;i++) for(let j=0;j<res;j++){
    let val=0,amp=1,freq=1,max=0;
    for(let o=0;o<octaves;o++){
      const nx=(i/res)*freq*scale+seed,nz=(j/res)*freq*scale+seed*1.3;
      val+=(Math.sin(nx*3.7+nz*2.1)*Math.cos(nz*4.3-nx*1.7)+Math.sin(nx*1.1*freq+nz*2.3*freq)*0.5)*amp;
      max+=amp; amp*=0.5; freq*=2;
    }
    hm[i*res+j]=Math.max(0,(val/max+0.5)*0.6);
  }
}

function sculptHM(hm,res,size,cx,cz,radius,strength,mode,maxH,paintColor,vertexColors){
  const cr=Math.ceil(radius/size*res);
  const ci=Math.round((cx/size+0.5)*(res-1));
  const ck=Math.round((cz/size+0.5)*(res-1));
  let sum=0,cnt=0;
  for(let di=-cr;di<=cr;di++) for(let dk=-cr;dk<=cr;dk++){
    const ni=ci+di,nk=ck+dk;
    if(ni<0||ni>=res||nk<0||nk>=res) continue;
    if(Math.sqrt(di*di+dk*dk)>cr) continue;
    sum+=hm[nk*res+ni]; cnt++;
  }
  const avgH=cnt>0?sum/cnt:0;
  for(let di=-cr;di<=cr;di++) for(let dk=-cr;dk<=cr;dk++){
    const ni=ci+di,nk=ck+dk;
    if(ni<0||ni>=res||nk<0||nk>=res) continue;
    const d=Math.sqrt(di*di+dk*dk);
    if(d>cr) continue;
    const falloff=Math.pow(1-d/cr,2),idx=nk*res+ni;
    if(mode==="raise") hm[idx]=Math.min(1,hm[idx]+strength*0.02*falloff);
    else if(mode==="lower") hm[idx]=Math.max(0,hm[idx]-strength*0.02*falloff);
    else if(mode==="flatten") hm[idx]+=(avgH-hm[idx])*strength*0.1*falloff;
    else if(mode==="smooth"){let s=0,c2=0;for(let si=-1;si<=1;si++) for(let sk=-1;sk<=1;sk++){const sni=ni+si,snk=nk+sk;if(sni>=0&&sni<res&&snk>=0&&snk<res){s+=hm[snk*res+sni];c2++;}}hm[idx]+=(s/c2-hm[idx])*strength*0.2*falloff;}
    else if(mode==="noise") hm[idx]=Math.max(0,Math.min(1,hm[idx]+(Math.random()-0.5)*strength*0.05*falloff));
    else if(mode==="plateau"){const target=Math.max(hm[idx],avgH+0.1);hm[idx]+=(target-hm[idx])*strength*0.15*falloff;}
    else if(mode==="valley") hm[idx]=Math.max(0,hm[idx]-strength*0.03*falloff*Math.pow(1-d/(cr*0.4),2));
    else if(mode==="paint"&&vertexColors){const pr=parseInt(paintColor.slice(1,3),16)/255,pg=parseInt(paintColor.slice(3,5),16)/255,pb=parseInt(paintColor.slice(5,7),16)/255;vertexColors[idx*3]+=(pr-vertexColors[idx*3])*strength*0.15*falloff;vertexColors[idx*3+1]+=(pg-vertexColors[idx*3+1])*strength*0.15*falloff;vertexColors[idx*3+2]+=(pb-vertexColors[idx*3+2])*strength*0.15*falloff;}
  }
}

function Toggle({ value, onChange }) {
  return (
    <div className={`gen-toggle${value?' gen-toggle--on':' gen-toggle--off'}`} onClick={()=>onChange(!value)}>
      <div className={`gen-toggle__dot${value?' gen-toggle__dot--on':' gen-toggle__dot--off'}`}/>
    </div>
  );
}

function SliderRow({ label, value, min, max, step=0.1, onChange, unit="" }) {
  return (
    <div className="gen-slider-row">
      <span className="gen-slider-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        className="gen-slider" onChange={e=>onChange(+e.target.value)}/>
      <span className="gen-slider-val">{value}{unit}</span>
    </div>
  );
}

export default function TerrainSculpting({ scene }) {
  const canvasRef    = useRef();
  const rendererRef  = useRef();
  const cameraRef    = useRef();
  const sceneRef     = useRef();
  const animRef      = useRef();
  const meshRef      = useRef();
  const waterRef     = useRef();
  const raycasterRef = useRef(new THREE.Raycaster());
  const hmRef        = useRef(createHeightmap(TERRAIN_RES));
  const vcRef        = useRef(new Float32Array(TERRAIN_RES*TERRAIN_RES*3).fill(0.4));
  const isSculpting  = useRef(false);

  const [tool,          setTool]          = useState("raise");
  const [brushRadius,   setBrushRadius]   = useState(3);
  const [brushStrength, setBrushStrength] = useState(0.5);
  const [maxHeight,     setMaxHeight]     = useState(6);
  const [biome,         setBiome]         = useState("highlands");
  const [showWater,     setShowWater]     = useState(true);
  const [waterLevel,    setWaterLevel]    = useState(0.15);
  const [paintColor,    setPaintColor]    = useState("#44bb77");
  const [stats,         setStats]         = useState({ verts:TERRAIN_RES*TERRAIN_RES, tris:(TERRAIN_RES-1)*(TERRAIN_RES-1)*2, maxH:0 });

  const toolRef       = useRef("raise");
  const brushRef      = useRef({ radius:3, strength:0.5 });
  const maxHRef       = useRef(6);
  const paintColorRef = useRef("#44bb77");
  const biomeRef      = useRef("highlands");

  useEffect(()=>{ toolRef.current=tool; },[tool]);
  useEffect(()=>{ brushRef.current.radius=brushRadius; },[brushRadius]);
  useEffect(()=>{ brushRef.current.strength=brushStrength; },[brushStrength]);
  useEffect(()=>{ maxHRef.current=maxHeight; },[maxHeight]);
  useEffect(()=>{ paintColorRef.current=paintColor; },[paintColor]);
  useEffect(()=>{ biomeRef.current=biome; },[biome]);

  const updateTerrainMesh = useCallback(()=>{
    const mesh=meshRef.current; if(!mesh) return;
    const hm=hmRef.current,maxH=maxHRef.current,geo=mesh.geometry,pos=geo.attributes.position;
    const vc=vcRef.current,bm=BIOMES.find(b=>b.id===biomeRef.current)||BIOMES[0];
    for(let i=0;i<TERRAIN_RES;i++) for(let j=0;j<TERRAIN_RES;j++){
      const idx=i*TERRAIN_RES+j,h=hm[idx];
      pos.setY(idx,h*maxH);
      if(toolRef.current!=="paint"){
        const t=h,ci=Math.min(4,Math.floor(t*5)),ct=(t*5)%1;
        const c1=new THREE.Color(bm.colors[ci]),c2=new THREE.Color(bm.colors[Math.min(4,ci+1)]);
        const c=c1.lerp(c2,ct);
        vc[idx*3]=c.r; vc[idx*3+1]=c.g; vc[idx*3+2]=c.b;
      }
    }
    pos.needsUpdate=true;
    if(!geo.attributes.color){geo.setAttribute("color",new THREE.BufferAttribute(vc.slice(),3));}
    else{const ca=geo.attributes.color;for(let i=0;i<ca.count;i++) ca.setXYZ(i,vc[i*3],vc[i*3+1],vc[i*3+2]);ca.needsUpdate=true;}
    geo.computeVertexNormals();
    if(waterRef.current) waterRef.current.position.y=maxH*waterLevel;
    let maxHVal=0;
    hm.forEach(h=>{if(h>maxHVal)maxHVal=h;});
    setStats({verts:TERRAIN_RES*TERRAIN_RES,tris:(TERRAIN_RES-1)*(TERRAIN_RES-1)*2,maxH:(maxHVal*maxH).toFixed(1)});
  },[waterLevel]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled=true; rendererRef.current=renderer;
    const threeScene=new THREE.Scene();
    threeScene.background=new THREE.Color("#0a0a14");
    threeScene.fog=new THREE.FogExp2("#0a0a14",0.012);
    sceneRef.current=threeScene;
    const camera=new THREE.PerspectiveCamera(55,1,0.1,500);
    camera.position.set(0,12,18); camera.lookAt(0,2,0); cameraRef.current=camera;
    threeScene.add(new THREE.AmbientLight("#778899",0.7));
    const sun=new THREE.DirectionalLight("#fff8e8",1.5);
    sun.position.set(15,25,10); sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left=-20; sun.shadow.camera.right=20;
    sun.shadow.camera.top=20; sun.shadow.camera.bottom=-20;
    threeScene.add(sun);
    const hm=hmRef.current;
    applyFractalNoise(hm,TERRAIN_RES,2,4,Math.random()*100);
    const geo=new THREE.PlaneGeometry(TERRAIN_SIZE,TERRAIN_SIZE,TERRAIN_RES-1,TERRAIN_RES-1);
    geo.rotateX(-Math.PI/2);
    const mat=new THREE.MeshLambertMaterial({vertexColors:true});
    const mesh=new THREE.Mesh(geo,mat);
    mesh.castShadow=true; mesh.receiveShadow=true; mesh.name="terrain";
    threeScene.add(mesh); meshRef.current=mesh;
    const water=new THREE.Mesh(new THREE.PlaneGeometry(TERRAIN_SIZE,TERRAIN_SIZE),new THREE.MeshLambertMaterial({color:"#1a55aa",transparent:true,opacity:0.6}));
    water.rotation.x=-Math.PI/2; water.position.y=0.9; threeScene.add(water); waterRef.current=water;
    let isDragging=false,isRight=false,lastX=0,lastY=0,theta=0.3,phi=0.5,radius=22;
    const down=e=>{isDragging=true;isRight=e.button===2;lastX=e.clientX;lastY=e.clientY;if(e.button===0)isSculpting.current=true;};
    const up=()=>{isDragging=false;isSculpting.current=false;};
    const move=e=>{
      if(!isDragging) return;
      if(isRight){theta-=(e.clientX-lastX)*0.01;phi=Math.max(0.05,Math.min(1.5,phi-(e.clientY-lastY)*0.01));camera.position.set(radius*Math.sin(theta)*Math.cos(phi),radius*Math.sin(phi),radius*Math.cos(theta)*Math.cos(phi));camera.lookAt(0,2,0);}
      else if(isSculpting.current){const rect=canvas.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycasterRef.current.setFromCamera(mouse,camera);const hits=raycasterRef.current.intersectObject(mesh);if(hits.length){const pt=hits[0].point;sculptHM(hmRef.current,TERRAIN_RES,TERRAIN_SIZE,pt.x,pt.z,brushRef.current.radius,brushRef.current.strength,toolRef.current,maxHRef.current,paintColorRef.current,vcRef.current);updateTerrainMesh();}}
      lastX=e.clientX; lastY=e.clientY;
    };
    const wheel=e=>{radius=Math.max(5,Math.min(60,radius+e.deltaY*0.05));camera.position.set(radius*Math.sin(theta)*Math.cos(phi),radius*Math.sin(phi),radius*Math.cos(theta)*Math.cos(phi));camera.lookAt(0,2,0);};
    canvas.addEventListener("mousedown",down); window.addEventListener("mouseup",up);
    window.addEventListener("mousemove",move); canvas.addEventListener("wheel",wheel,{passive:true});
    canvas.addEventListener("contextmenu",e=>e.preventDefault());
    const animate=()=>{
      animRef.current=requestAnimationFrame(animate);
      const w=canvas.clientWidth,h=canvas.clientHeight;
      if(renderer.domElement.width!==w||renderer.domElement.height!==h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
      renderer.render(threeScene,camera);
    };
    animate(); updateTerrainMesh();
    return()=>{cancelAnimationFrame(animRef.current);canvas.removeEventListener("mousedown",down);window.removeEventListener("mouseup",up);window.removeEventListener("mousemove",move);canvas.removeEventListener("wheel",wheel);renderer.dispose();};
  },[updateTerrainMesh]);

  useEffect(()=>{if(waterRef.current) waterRef.current.position.y=maxHeight*waterLevel;},[waterLevel,maxHeight]);
  useEffect(()=>{if(waterRef.current) waterRef.current.visible=showWater;},[showWater]);
  useEffect(()=>{updateTerrainMesh();},[biome,updateTerrainMesh]);

  const resetTerrain=()=>{hmRef.current=createHeightmap(TERRAIN_RES);vcRef.current=new Float32Array(TERRAIN_RES*TERRAIN_RES*3).fill(0.4);applyFractalNoise(hmRef.current,TERRAIN_RES,2,4,Math.random()*100);updateTerrainMesh();};
  const flattenAll=()=>{hmRef.current.fill(0.1);updateTerrainMesh();};
  const addErosion=()=>{const hm=hmRef.current,res=TERRAIN_RES;for(let iter=0;iter<50;iter++){const i=Math.floor(Math.random()*(res-2))+1,j=Math.floor(Math.random()*(res-2))+1;const dirs=[[0,1],[0,-1],[1,0],[-1,0]];let minH=hm[i*res+j],minDi=0,minDj=0;dirs.forEach(([di,dj])=>{const h=hm[(i+di)*res+(j+dj)];if(h<minH){minH=h;minDi=di;minDj=dj;}});if(minDi!==0||minDj!==0){const erosion=(hm[i*res+j]-minH)*0.3;hm[i*res+j]-=erosion;hm[(i+minDi)*res+(j+minDj)]+=erosion*0.8;}}updateTerrainMesh();};
  const exportTerrain=()=>{const data={resolution:TERRAIN_RES,size:TERRAIN_SIZE,maxHeight,biome,heightmap:Array.from(hmRef.current)};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`terrain_${biome}.json`;a.click();};

  const currentTool=TOOLS.find(t=>t.id===tool);

  return (
    <div className="gen-root">
      <div className="gen-tool-strip">
        {TOOLS.map(t=>(
          <button
            key={t.id}
            className={`gen-tool-btn${tool===t.id?' gen-tool-btn--active':''}`}
            style={tool===t.id?{borderColor:t.color,background:`${t.color}25`,color:t.color}:{}}
            onClick={()=>setTool(t.id)} title={t.desc}
          >
            <span className="gen-tool-icon">{t.icon}</span>
            <span className="gen-tool-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="gen-sidebar">
        <div className="gen-sec-label">Tool — {currentTool?.label}</div>
        <div className="spnl-dim spnl-pad-desc">{currentTool?.desc}</div>
        <SliderRow label="Brush Radius"  value={brushRadius}   min={0.5} max={8}  step={0.5}  onChange={setBrushRadius}   unit="m"/>
        <SliderRow label="Strength"      value={brushStrength} min={0.1} max={2}  step={0.05} onChange={setBrushStrength}/>

        {tool==="paint" && (
          <div className="gen-paint-row">
            <span className="gen-row-label">Paint Color</span>
            <div
              className="gen-paint-swatch"
              className="gen-paint-swatch" style={{background:paintColor}}
              onClick={()=>{const inp=document.createElement("input");inp.type="color";inp.value=paintColor;inp.onchange=e=>setPaintColor(e.target.value);inp.click();}}
            />
            <span className="gen-paint-hex">{paintColor}</span>
          </div>
        )}

        <div className="gen-divider"/>
        <div className="gen-sec-label">Terrain</div>
        <SliderRow label="Max Height" value={maxHeight} min={1} max={15} step={0.5} onChange={setMaxHeight} unit="m"/>

        <div className="gen-divider"/>
        <div className="gen-sec-label">Biome</div>
        <div className="gen-biome-grid">
          {BIOMES.map(b=>(
            <button key={b.id} className={`gen-biome-btn${biome===b.id?' gen-biome-btn--active':''}`}
              onClick={()=>{setBiome(b.id);biomeRef.current=b.id;updateTerrainMesh();}}>
              <div className="gen-biome-swatches">
                {b.colors.map((c,i)=><div key={i} className="gen-biome-swatch" style={{background:c}}/>)}
              </div>
              {b.label}
            </button>
          ))}
        </div>

        <div className="gen-divider"/>
        <div className="gen-sec-label">Water</div>
        <div className="gen-row">
          <span className="gen-row-label">Show Water</span>
          <Toggle value={showWater} onChange={setShowWater}/>
        </div>
        {showWater && <SliderRow label="Water Level" value={waterLevel} min={0} max={0.8} step={0.01} onChange={setWaterLevel}/>}

        <div className="gen-divider"/>
        <div className="gen-sec-label">Operations</div>
        <div className="gen-btn-row">
          <button className="gen-btn" onClick={resetTerrain}>🌍 NEW</button>
          <button className="gen-btn" onClick={flattenAll}>━ FLAT</button>
          <button className="gen-btn" onClick={addErosion}>💧 ERODE</button>
        </div>
        <div className="gen-btn-row">
          <button className="gen-btn gen-btn--primary" onClick={exportTerrain}>💾 EXPORT</button>
        </div>

        <div className="gen-stats">
          <div className="gen-stats__label">STATS</div>
          {[["Verts",stats.verts.toLocaleString()],["Tris",stats.tris.toLocaleString()],["Max Height",`${stats.maxH}m`]].map(([l,v])=>(
            <div key={l} className="gen-stats__row">
              <span className="gen-stats__key">{l}</span>
              <span className="gen-stats__val">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="gen-main">
        <div className="gen-toolbar">
          <span className="gen-toolbar__label">TERRAIN SCULPTING</span>
          <span className="gen-toolbar__hint">LEFT DRAG: Sculpt | RIGHT DRAG: Orbit | SCROLL: Zoom</span>
          <div className="gen-toolbar__right">
            <span className="gen-tag gen-tag--tool" style={{background:`${currentTool?.color||'#00ffc8'}20`,color:currentTool?.color||'#00ffc8',border:`1px solid ${currentTool?.color||'#00ffc8'}40`}}>
              TOOL: {currentTool?.label.toUpperCase()}
            </span>
            <span className="gen-tag spnl-tag--orange">
              R: {brushRadius}m
            </span>
          </div>
        </div>
        <canvas ref={canvasRef} className="gen-canvas"/>
        <div className="gen-statusbar">
          <span>VERTS: {stats.verts.toLocaleString()}</span>
          <span>TRIS: {stats.tris.toLocaleString()}</span>
          <span>MAX H: {stats.maxH}m</span>
          <span className="gen-statusbar__right">BIOME: {biome.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
