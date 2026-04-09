import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import "../../styles/world-generators.css";

const CITY_STYLES = {
  downtown:   { label:"Downtown",   icon:"🏙️", buildingHeight:[8,40],  buildingDensity:0.85, hasSkyscrapers:true,  groundColor:"#1a1a1a", roadColor:"#222222", sidewalkColor:"#333333" },
  suburban:   { label:"Suburban",   icon:"🏘️", buildingHeight:[2,6],   buildingDensity:0.4,  hasSkyscrapers:false, groundColor:"#2a3a1a", roadColor:"#2a2a2a", sidewalkColor:"#3a3a3a" },
  industrial: { label:"Industrial", icon:"🏭", buildingHeight:[4,14],  buildingDensity:0.6,  hasSkyscrapers:false, groundColor:"#1a1a18", roadColor:"#1e1e1e", sidewalkColor:"#282828" },
  futuristic: { label:"Futuristic", icon:"🌆", buildingHeight:[10,60], buildingDensity:0.7,  hasSkyscrapers:true,  groundColor:"#060614", roadColor:"#0a0a1e", sidewalkColor:"#0f0f28" },
};

function Toggle({ value, onChange }) {
  return (
    <div className={`gen-toggle${value?' gen-toggle--on':' gen-toggle--off'}`} onClick={()=>onChange(!value)}>
      <div className={`gen-toggle__dot${value?' gen-toggle__dot--on':' gen-toggle__dot--off'}`}/>
    </div>
  );
}

function SliderRow({ label, value, min, max, step=1, onChange, unit="" }) {
  return (
    <div className="gen-slider-row">
      <span className="gen-slider-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        className="gen-slider" onChange={e=>onChange(+e.target.value)}/>
      <span className="gen-slider-val">{value}{unit}</span>
    </div>
  );
}

function buildCity(threeScene, cfg) {
  const toRemove = [];
  threeScene.traverse(o => { if (o.userData.cityObject) toRemove.push(o); });
  toRemove.forEach(o => threeScene.remove(o));

  const style = CITY_STYLES[cfg.style];
  const gridW=cfg.blocksX, gridH=cfg.blocksZ;
  const blockSize=cfg.blockSize, roadWidth=cfg.roadWidth;
  const cellSize=blockSize+roadWidth;
  const totalW=gridW*cellSize, totalH=gridH*cellSize;
  const ox=-totalW/2, oz=-totalH/2;
  const mark = obj => { obj.userData.cityObject=true; return obj; };

  const groundMat   = new THREE.MeshLambertMaterial({ color:style.groundColor });
  const roadMat     = new THREE.MeshLambertMaterial({ color:style.roadColor });
  const sidewalkMat = new THREE.MeshLambertMaterial({ color:style.sidewalkColor });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(totalW+roadWidth, totalH+roadWidth), groundMat);
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; threeScene.add(mark(ground));

  for (let z=0; z<=gridH; z++) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(totalW+roadWidth, roadWidth), roadMat);
    road.rotation.x=-Math.PI/2; road.position.set(ox+totalW/2,0.01,oz+z*cellSize); threeScene.add(mark(road));
    [-1,1].forEach(side=>{
      const sw=new THREE.Mesh(new THREE.PlaneGeometry(totalW+roadWidth,0.8),sidewalkMat);
      sw.rotation.x=-Math.PI/2; sw.position.set(ox+totalW/2,0.02,oz+z*cellSize+side*(roadWidth/2+0.4)); threeScene.add(mark(sw));
    });
  }
  for (let x=0; x<=gridW; x++) {
    const road=new THREE.Mesh(new THREE.PlaneGeometry(roadWidth,totalH+roadWidth),roadMat);
    road.rotation.x=-Math.PI/2; road.position.set(ox+x*cellSize,0.01,oz+totalH/2); threeScene.add(mark(road));
    [-1,1].forEach(side=>{
      const sw=new THREE.Mesh(new THREE.PlaneGeometry(0.8,totalH+roadWidth),sidewalkMat);
      sw.rotation.x=-Math.PI/2; sw.position.set(ox+x*cellSize+side*(roadWidth/2+0.4),0.02,oz+totalH/2); threeScene.add(mark(sw));
    });
  }

  const MATS = [
    new THREE.MeshLambertMaterial({color:"#8a8a9a"}),
    new THREE.MeshLambertMaterial({color:"#6a6a7a"}),
    new THREE.MeshLambertMaterial({color:"#9a9aaa"}),
    new THREE.MeshLambertMaterial({color:"#7a8a9a"}),
    new THREE.MeshLambertMaterial({color:style.groundColor==="060614"?"#0a0a2a":"#5a6a7a"}),
  ];

  for (let bx=0; bx<gridW; bx++) {
    for (let bz=0; bz<gridH; bz++) {
      const cx=ox+bx*cellSize+roadWidth/2+blockSize/2;
      const cz=oz+bz*cellSize+roadWidth/2+blockSize/2;
      const padding=0.5, usable=blockSize-padding*2;

      for (let i=0; i<cfg.buildingsPerBlock; i++) {
        if (Math.random()>style.buildingDensity) continue;
        const [minH,maxH]=style.buildingHeight;
        let h=minH+Math.random()*(maxH-minH);
        if (style.hasSkyscrapers&&Math.random()<0.15) h*=2.5;
        const bw=(usable/Math.ceil(Math.sqrt(cfg.buildingsPerBlock)))*(0.6+Math.random()*0.3);
        const bd=bw*(0.8+Math.random()*0.4);
        const px=cx+(Math.random()-0.5)*(usable-bw);
        const pz=cz+(Math.random()-0.5)*(usable-bd);
        const mat=MATS[Math.floor(Math.random()*MATS.length)];
        const building=new THREE.Mesh(new THREE.BoxGeometry(bw,h,bd),mat);
        building.position.set(px,h/2,pz); building.castShadow=true; building.receiveShadow=true;
        threeScene.add(mark(building));

        if (cfg.showWindows&&h>3) {
          const floors=Math.floor(h/2), wRows=Math.max(2,Math.floor(bw/1.2));
          const winMat=Math.random()>0.3
            ?new THREE.MeshLambertMaterial({color:"#ffeeaa",emissive:"#ffcc44",emissiveIntensity:0.6,transparent:true,opacity:0.9})
            :new THREE.MeshLambertMaterial({color:"#7ab8d4",transparent:true,opacity:0.7});
          for (let f=0;f<floors;f++) for (let w=0;w<wRows;w++) if (Math.random()<0.7) {
            const win=new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.5),winMat);
            win.position.set(px-bw/2-0.01,1+f*2,pz-bd/2+0.5+w*(bd/wRows)); win.rotation.y=Math.PI/2;
            threeScene.add(mark(win));
          }
        }

        if (cfg.showRoofDetails&&h>5&&Math.random()>0.5) {
          const rd=new THREE.Mesh(new THREE.BoxGeometry(bw*0.3,1.5,bd*0.3),new THREE.MeshLambertMaterial({color:"#555566"}));
          rd.position.set(px,h+0.75,pz); threeScene.add(mark(rd));
        }
      }

      if (cfg.showStreetLights) {
        [[cx-blockSize/2,cz-blockSize/2],[cx+blockSize/2,cz-blockSize/2],[cx-blockSize/2,cz+blockSize/2],[cx+blockSize/2,cz+blockSize/2]].forEach(([lx,lz])=>{
          const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,4,5),new THREE.MeshLambertMaterial({color:"#444444"}));
          pole.position.set(lx,2,lz); threeScene.add(mark(pole));
          const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.15,6,5),new THREE.MeshLambertMaterial({color:"#ffeecc",emissive:"#ffeecc",emissiveIntensity:2}));
          bulb.position.set(lx,4.2,lz); threeScene.add(mark(bulb));
          if (cfg.showLightGlow) {
            const light=new THREE.PointLight("#ffeecc",0.5,6); light.position.set(lx,4,lz); threeScene.add(mark(light));
          }
        });
      }
    }
  }
}

export default function CityGenerator({ scene }) {
  const canvasRef   = useRef();
  const rendererRef = useRef();
  const cameraRef   = useRef();
  const sceneRef    = useRef();
  const animRef     = useRef();

  const [style,             setStyle]             = useState("downtown");
  const [blocksX,           setBlocksX]           = useState(4);
  const [blocksZ,           setBlocksZ]           = useState(4);
  const [blockSize,         setBlockSize]         = useState(12);
  const [roadWidth,         setRoadWidth]         = useState(4);
  const [buildingsPerBlock, setBuildingsPerBlock] = useState(4);
  const [showWindows,       setShowWindows]       = useState(true);
  const [showStreetLights,  setShowStreetLights]  = useState(true);
  const [showRoofDetails,   setShowRoofDetails]   = useState(true);
  const [showLightGlow,     setShowLightGlow]     = useState(true);
  const [nightMode,         setNightMode]         = useState(false);
  const [stats,             setStats]             = useState({ buildings:0, blocks:0, tris:0 });
  const [building,          setBuilding]          = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color("#0a0a1a");
    threeScene.fog = new THREE.FogExp2("#0a0a1a",0.008);
    sceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(55,1,0.1,2000);
    camera.position.set(0,30,60); camera.lookAt(0,0,0);
    cameraRef.current = camera;

    const ambient=new THREE.AmbientLight("#6688aa",0.5); ambient.name="ambient"; threeScene.add(ambient);
    const sun=new THREE.DirectionalLight("#fff8f0",1.5); sun.name="sun"; sun.position.set(30,60,30);
    sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left=-80; sun.shadow.camera.right=80;
    sun.shadow.camera.top=80; sun.shadow.camera.bottom=-80;
    threeScene.add(sun);

    let isDragging=false,lastX=0,lastY=0,theta=0.3,phi=0.5,radius=70;
    const down=e=>{isDragging=true;lastX=e.clientX;lastY=e.clientY;};
    const up=()=>{isDragging=false;};
    const move=e=>{
      if(!isDragging) return;
      theta-=(e.clientX-lastX)*0.01; phi=Math.max(0.1,Math.min(1.4,phi-(e.clientY-lastY)*0.01));
      lastX=e.clientX; lastY=e.clientY;
      camera.position.set(radius*Math.sin(theta)*Math.cos(phi),radius*Math.sin(phi),radius*Math.cos(theta)*Math.cos(phi));
      camera.lookAt(0,0,0);
    };
    const wheel=e=>{
      radius=Math.max(10,Math.min(300,radius+e.deltaY*0.1));
      camera.position.set(radius*Math.sin(theta)*Math.cos(phi),radius*Math.sin(phi),radius*Math.cos(theta)*Math.cos(phi));
      camera.lookAt(0,0,0);
    };
    canvas.addEventListener("mousedown",down);
    window.addEventListener("mouseup",up);
    window.addEventListener("mousemove",move);
    canvas.addEventListener("wheel",wheel,{passive:true});

    const animate=()=>{
      animRef.current=requestAnimationFrame(animate);
      const w=canvas.clientWidth,h=canvas.clientHeight;
      if(renderer.domElement.width!==w||renderer.domElement.height!==h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
      renderer.render(threeScene,camera);
    };
    animate();

    return ()=>{
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousedown",down);
      window.removeEventListener("mouseup",up);
      window.removeEventListener("mousemove",move);
      canvas.removeEventListener("wheel",wheel);
      renderer.dispose();
    };
  },[]);

  useEffect(()=>{
    const threeScene=sceneRef.current; if(!threeScene) return;
    const ambient=threeScene.getObjectByName("ambient");
    const sun=threeScene.getObjectByName("sun");
    if(nightMode){
      threeScene.background=new THREE.Color("#010106"); threeScene.fog=new THREE.FogExp2("#010106",0.01);
      if(ambient){ambient.color.set("#1122aa");ambient.intensity=0.15;} if(sun) sun.intensity=0;
    } else {
      threeScene.background=new THREE.Color("#0a0a1a"); threeScene.fog=new THREE.FogExp2("#0a0a1a",0.008);
      if(ambient){ambient.color.set("#6688aa");ambient.intensity=0.5;} if(sun) sun.intensity=1.5;
    }
  },[nightMode]);

  const generate = useCallback(()=>{
    const threeScene=sceneRef.current; if(!threeScene||building) return;
    setBuilding(true);
    setTimeout(()=>{
      buildCity(threeScene,{style,blocksX,blocksZ,blockSize,roadWidth,buildingsPerBlock,showWindows,showStreetLights,showRoofDetails,showLightGlow});
      let bCount=0,tris=0;
      threeScene.traverse(obj=>{
        if(obj.userData.cityObject&&obj.isMesh){
          bCount++;
          if(obj.geometry) tris+=(obj.geometry.index?obj.geometry.index.count/3:obj.geometry.attributes.position?.count/3||0);
        }
      });
      setStats({buildings:bCount,blocks:blocksX*blocksZ,tris:Math.round(tris)});
      setBuilding(false);
    },10);
  },[style,blocksX,blocksZ,blockSize,roadWidth,buildingsPerBlock,showWindows,showStreetLights,showRoofDetails,showLightGlow,building]);

  const exportCity=()=>{
    const data={style,grid:{blocksX,blocksZ},blockSize,roadWidth,buildingsPerBlock,features:{showWindows,showStreetLights,showRoofDetails,showLightGlow}};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`city_${style}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const FEATURES = [
    ["Windows",showWindows,setShowWindows],["Street Lights",showStreetLights,setShowStreetLights],
    ["Roof Details",showRoofDetails,setShowRoofDetails],["Light Glow",showLightGlow,setShowLightGlow],
    ["Night Mode",nightMode,setNightMode],
  ];

  return (
    <div className="gen-root">
      <div className="gen-sidebar">
        <div className="gen-sec-label">City Style</div>
        <div className="gen-style-grid">
          {Object.entries(CITY_STYLES).map(([k,v])=>(
            <button key={k} className={`gen-style-btn${style===k?' gen-style-btn--active':''}`} onClick={()=>setStyle(k)}>
              <div className="gen-style-icon">{v.icon}</div>
              {v.label}
            </button>
          ))}
        </div>

        <div className="gen-divider"/>
        <div className="gen-sec-label">Grid Layout</div>
        <SliderRow label="Blocks X"       value={blocksX}           min={1} max={10} onChange={setBlocksX}/>
        <SliderRow label="Blocks Z"       value={blocksZ}           min={1} max={10} onChange={setBlocksZ}/>
        <SliderRow label="Block Size"     value={blockSize}         min={6} max={30} onChange={setBlockSize}         unit="u"/>
        <SliderRow label="Road Width"     value={roadWidth}         min={2} max={10} onChange={setRoadWidth}         unit="u"/>
        <SliderRow label="Buildings/Block"value={buildingsPerBlock} min={1} max={9}  onChange={setBuildingsPerBlock}/>

        <div className="gen-divider"/>
        <div className="gen-sec-label">Features</div>
        {FEATURES.map(([label,val,setter])=>(
          <div key={label} className="gen-row">
            <span className="gen-row-label">{label}</span>
            <Toggle value={val} onChange={setter}/>
          </div>
        ))}

        <div className="gen-divider"/>
        <div className="gen-btn-row">
          <button className="gen-btn gen-btn--primary" onClick={generate} disabled={building}>
            {building?"⏳ BUILDING...":"🏗️ GENERATE"}
          </button>
          <button className="gen-btn gen-btn--orange" onClick={exportCity}>💾 EXPORT</button>
        </div>

        <div className="gen-stats">
          <div className="gen-stats__label">STATS</div>
          <div className="gen-stats__row"><span className="gen-stats__key">Blocks</span><span className="gen-stats__val">{stats.blocks}</span></div>
          <div className="gen-stats__row"><span className="gen-stats__key">Objects</span><span className="gen-stats__val--white">{stats.buildings}</span></div>
          <div className="gen-stats__row"><span className="gen-stats__key">Triangles</span><span className="gen-stats__val">{stats.tris.toLocaleString()}</span></div>
        </div>
      </div>

      <div className="gen-main">
        <div className="gen-toolbar">
          <span className="gen-toolbar__label">CITY VIEWPORT — {CITY_STYLES[style].label.toUpperCase()}</span>
          <div className="gen-toolbar__right">
            <span className="gen-tag" style={{background:'rgba(0,255,200,0.12)',color:'var(--teal)',border:'1px solid rgba(0,255,200,0.25)'}}>DRAG ORBIT</span>
            <span className="gen-tag" style={{background:'rgba(255,102,0,0.12)',color:'var(--orange)',border:'1px solid rgba(255,102,0,0.25)'}}>SCROLL ZOOM</span>
            {nightMode && <span className="gen-tag" style={{background:'rgba(170,68,255,0.12)',color:'#aa44ff',border:'1px solid rgba(170,68,255,0.25)'}}>NIGHT MODE</span>}
          </div>
        </div>
        <canvas ref={canvasRef} className="gen-canvas"/>
        <div className="gen-statusbar">
          <span>BLOCKS: {stats.blocks}</span>
          <span>OBJECTS: {stats.buildings}</span>
          <span>TRIANGLES: {stats.tris.toLocaleString()}</span>
          <span className="gen-statusbar__right">STYLE: {CITY_STYLES[style].label.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
