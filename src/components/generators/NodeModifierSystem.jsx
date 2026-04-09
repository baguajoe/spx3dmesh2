import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import "../../styles/gen-panels-extra.css";

const NODE_TYPES = {
  geo_cube:      { label:"Cube",       cat:"geometry", color:"#1a5a2a", out:["geometry"],                           in:[] },
  geo_sphere:    { label:"Sphere",     cat:"geometry", color:"#1a5a2a", out:["geometry"],                           in:[] },
  geo_plane:     { label:"Plane",      cat:"geometry", color:"#1a5a2a", out:["geometry"],                           in:[] },
  geo_cylinder:  { label:"Cylinder",   cat:"geometry", color:"#1a5a2a", out:["geometry"],                           in:[] },
  mod_subdivide: { label:"Subdivide",  cat:"modifier", color:"#1a2a5a", out:["geometry"],                           in:["geometry","level"] },
  mod_displace:  { label:"Displace",   cat:"modifier", color:"#1a2a5a", out:["geometry"],                           in:["geometry","strength","texture"] },
  mod_twist:     { label:"Twist",      cat:"modifier", color:"#1a2a5a", out:["geometry"],                           in:["geometry","angle"] },
  mod_wave:      { label:"Wave",       cat:"modifier", color:"#1a2a5a", out:["geometry"],                           in:["geometry","amplitude","freq"] },
  mod_inflate:   { label:"Inflate",    cat:"modifier", color:"#1a2a5a", out:["geometry"],                           in:["geometry","amount"] },
  mod_taper:     { label:"Taper",      cat:"modifier", color:"#1a2a5a", out:["geometry"],                           in:["geometry","factor"] },
  val_float:     { label:"Float",      cat:"value",    color:"#3a2a1a", out:["float"],                              in:[] },
  val_vector:    { label:"Vector",     cat:"value",    color:"#3a2a1a", out:["vector"],                             in:[] },
  math_add:      { label:"Add",        cat:"math",     color:"#2a1a3a", out:["float"],                              in:["A","B"] },
  math_mul:      { label:"Multiply",   cat:"math",     color:"#2a1a3a", out:["float"],                              in:["A","B"] },
  math_sin:      { label:"Sine",       cat:"math",     color:"#2a1a3a", out:["float"],                              in:["value"] },
  mat_principled:{ label:"Principled", cat:"material", color:"#3a1a1a", out:["shader"],                             in:["base_color","roughness","metalness"] },
  mat_emission:  { label:"Emission",   cat:"material", color:"#3a1a1a", out:["shader"],                             in:["color","strength"] },
  out_viewer:    { label:"Output",     cat:"output",   color:"#1a1a3a", out:[],                                     in:["geometry","shader"] },
};

const SOCKET_COLORS = { geometry:"#00ffc8",float:"#ffcc00",vector:"#6688ff",shader:"#ff6688",level:"#ffcc00",strength:"#ffcc00",amplitude:"#ffcc00",freq:"#ffcc00",angle:"#ffcc00",amount:"#ffcc00",factor:"#ffcc00",texture:"#aa44ff",A:"#ffcc00",B:"#ffcc00",value:"#ffcc00",base_color:"#ff8866",roughness:"#ffcc00",metalness:"#ffcc00",color:"#ff8866",strength2:"#ffcc00" };
const socketColor = name => SOCKET_COLORS[name] || "#888888";

let _nodeId = 1;
const makeNode = (type, x, y) => {
  const params = {};
  if(type==="val_float") params.value=0.5;
  if(type==="val_vector"){params.x=0;params.y=0;params.z=1;}
  if(type==="mod_subdivide") params.level=2;
  if(type==="mod_displace") params.strength=0.5;
  if(type==="mod_twist") params.angle=45;
  if(type==="mod_wave"){params.amplitude=0.3;params.freq=2;}
  if(type==="mod_inflate") params.amount=0.2;
  if(type==="mod_taper") params.factor=0.5;
  if(type==="mat_principled"){params.roughness=0.5;params.metalness=0;params.base_color="#00ffc8";}
  if(type==="mat_emission"){params.color="#00ffc8";params.strength=1;}
  return { id:`n${_nodeId++}`, type, x, y, params, inputs:{}, selected:false };
};

const NODE_W=160, SOCKET_R=5, NODE_H_BASE=28, SOCKET_SPACING=22;

function getNodeHeight(node) {
  const def=NODE_TYPES[node.type];
  return NODE_H_BASE+Math.max(Math.max(def.in.length,def.out.length),1)*SOCKET_SPACING+Object.keys(node.params).length*20+12;
}

function socketPos(node, isOut, index) {
  return { x:isOut?node.x+NODE_W:node.x, y:node.y+NODE_H_BASE+index*SOCKET_SPACING+SOCKET_SPACING/2 };
}

export default function NodeModifierSystem({ scene }) {
  const canvasRef   = useRef();
  const rendererRef = useRef();
  const cameraRef   = useRef();
  const sceneRef    = useRef();
  const animRef     = useRef();
  const meshRef     = useRef();
  const svgRef      = useRef();

  const [nodes, setNodes] = useState(()=>{
    const cube=makeNode("geo_cube",40,80), subdiv=makeNode("mod_subdivide",250,60);
    const wave=makeNode("mod_wave",460,60), mat=makeNode("mat_principled",460,260), out=makeNode("out_viewer",680,120);
    subdiv.inputs["geometry"]={fromNode:cube.id,fromSocket:0};
    wave.inputs["geometry"]={fromNode:subdiv.id,fromSocket:0};
    out.inputs["geometry"]={fromNode:wave.id,fromSocket:0};
    out.inputs["shader"]={fromNode:mat.id,fromSocket:0};
    return [cube,subdiv,wave,mat,out];
  });

  const [connections, setConnections] = useState([
    {from:"n1",fromSock:0,to:"n2",toSock:0},{from:"n2",fromSock:0,to:"n3",toSock:0},
    {from:"n3",fromSock:0,to:"n5",toSock:0},{from:"n4",fromSock:0,to:"n5",toSock:1},
  ]);

  const [dragging,    setDragging]    = useState(null);
  const [wiring,      setWiring]      = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [graphOffset, setGraphOffset] = useState({x:0,y:0});
  const [graphPan,    setGraphPan]    = useState(null);

  const nodesRef = useRef(nodes);
  useEffect(()=>{ nodesRef.current=nodes; },[nodes]);

  // 3D Preview
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled=true; rendererRef.current=renderer;
    const threeScene=new THREE.Scene(); threeScene.background=new THREE.Color("#08080f"); sceneRef.current=threeScene;
    const camera=new THREE.PerspectiveCamera(50,1,0.1,100); camera.position.set(0,2,5); camera.lookAt(0,0,0); cameraRef.current=camera;
    threeScene.add(new THREE.AmbientLight("#667799",0.7));
    const key=new THREE.DirectionalLight("#ffffff",1.5); key.position.set(5,8,5); key.castShadow=true; threeScene.add(key);
    const geo=new THREE.BoxGeometry(2,2,2,4,4,4);
    const mat=new THREE.MeshStandardMaterial({color:"#00ffc8",roughness:0.5,metalness:0.1});
    const mesh=new THREE.Mesh(geo,mat); mesh.castShadow=true; threeScene.add(mesh); meshRef.current=mesh;
    let isDragging=false,lastX=0,lastY=0,theta=0.5,phi=0.4,radius=5;
    const down=e=>{isDragging=true;lastX=e.clientX;lastY=e.clientY;};
    const up=()=>{isDragging=false;};
    const move=e=>{if(!isDragging) return;theta-=(e.clientX-lastX)*0.01;phi=Math.max(0.05,Math.min(1.5,phi-(e.clientY-lastY)*0.01));lastX=e.clientX;lastY=e.clientY;camera.position.set(radius*Math.sin(theta)*Math.cos(phi),radius*Math.sin(phi),radius*Math.cos(theta)*Math.cos(phi));camera.lookAt(0,0,0);};
    const wheel=e=>{radius=Math.max(2,Math.min(20,radius+e.deltaY*0.02));camera.position.set(radius*Math.sin(theta)*Math.cos(phi),radius*Math.sin(phi),radius*Math.cos(theta)*Math.cos(phi));camera.lookAt(0,0,0);};
    canvas.addEventListener("mousedown",down); window.addEventListener("mouseup",up); window.addEventListener("mousemove",move); canvas.addEventListener("wheel",wheel,{passive:true});
    const animate=()=>{animRef.current=requestAnimationFrame(animate);if(mesh)mesh.rotation.y+=0.005;const w=canvas.clientWidth,h=canvas.clientHeight;if(renderer.domElement.width!==w||renderer.domElement.height!==h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}renderer.render(threeScene,camera);};
    animate();
    return()=>{cancelAnimationFrame(animRef.current);canvas.removeEventListener("mousedown",down);window.removeEventListener("mouseup",up);window.removeEventListener("mousemove",move);canvas.removeEventListener("wheel",wheel);renderer.dispose();};
  },[]);

  // Rebuild 3D mesh from node graph
  useEffect(()=>{
    const mesh=meshRef.current,threeScene=sceneRef.current; if(!mesh||!threeScene) return;
    const outNode=nodes.find(n=>n.type==="out_viewer"); if(!outNode) return;
    const traceGeo=(nodeId)=>{
      const node=nodes.find(n=>n.id===nodeId); if(!node) return null;
      if(node.type==="geo_cube") return new THREE.BoxGeometry(2,2,2,4,4,4);
      if(node.type==="geo_sphere") return new THREE.SphereGeometry(1.5,24,16);
      if(node.type==="geo_plane") return new THREE.PlaneGeometry(3,3,12,12);
      if(node.type==="geo_cylinder") return new THREE.CylinderGeometry(1,1,2,24,4);
      if(node.type==="mod_subdivide"){const sc=connections.find(c=>c.to===nodeId&&c.toSock===0);return sc?traceGeo(sc.from):new THREE.BoxGeometry(2,2,2,4,4,4);}
      if(node.type==="mod_wave"){const sc=connections.find(c=>c.to===nodeId&&c.toSock===0);const geo=sc?traceGeo(sc.from):new THREE.BoxGeometry(2,2,2,4,4,4);if(!geo)return null;const pos=geo.attributes.position,amp=parseFloat(node.params.amplitude)||0.3,freq=parseFloat(node.params.freq)||2;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,pos.getY(i)+Math.sin(x*freq+z*freq)*amp);}pos.needsUpdate=true;geo.computeVertexNormals();return geo;}
      if(node.type==="mod_twist"){const sc=connections.find(c=>c.to===nodeId&&c.toSock===0);const geo=sc?traceGeo(sc.from):new THREE.BoxGeometry(2,2,2,8,8,8);if(!geo)return null;const pos=geo.attributes.position,angle=(parseFloat(node.params.angle)||45)*Math.PI/180;for(let i=0;i<pos.count;i++){const y=pos.getY(i),a=y*angle,x=pos.getX(i),z=pos.getZ(i);pos.setX(i,x*Math.cos(a)-z*Math.sin(a));pos.setZ(i,x*Math.sin(a)+z*Math.cos(a));}pos.needsUpdate=true;geo.computeVertexNormals();return geo;}
      if(node.type==="mod_inflate"){const sc=connections.find(c=>c.to===nodeId&&c.toSock===0);const geo=sc?traceGeo(sc.from):new THREE.BoxGeometry(2,2,2,4,4,4);if(!geo)return null;const pos=geo.attributes.position,norm=geo.attributes.normal,amt=parseFloat(node.params.amount)||0.2;for(let i=0;i<pos.count;i++)pos.setXYZ(i,pos.getX(i)+norm.getX(i)*amt,pos.getY(i)+norm.getY(i)*amt,pos.getZ(i)+norm.getZ(i)*amt);pos.needsUpdate=true;geo.computeVertexNormals();return geo;}
      if(node.type==="mod_taper"){const sc=connections.find(c=>c.to===nodeId&&c.toSock===0);const geo=sc?traceGeo(sc.from):new THREE.BoxGeometry(2,2,2,4,8,4);if(!geo)return null;const pos=geo.attributes.position,factor=parseFloat(node.params.factor)||0.5;let maxY=0;for(let i=0;i<pos.count;i++)maxY=Math.max(maxY,Math.abs(pos.getY(i)));for(let i=0;i<pos.count;i++){const t=(pos.getY(i)+maxY)/(maxY*2),sc2=1-t*factor;pos.setX(i,pos.getX(i)*sc2);pos.setZ(i,pos.getZ(i)*sc2);}pos.needsUpdate=true;geo.computeVertexNormals();return geo;}
      if(node.type==="mod_displace"){const sc=connections.find(c=>c.to===nodeId&&c.toSock===0);const geo=sc?traceGeo(sc.from):new THREE.BoxGeometry(2,2,2,8,8,8);if(!geo)return null;const pos=geo.attributes.position,norm=geo.attributes.normal,strength=parseFloat(node.params.strength)||0.5;for(let i=0;i<pos.count;i++){const noise=(Math.sin(pos.getX(i)*3.7)*Math.cos(pos.getY(i)*4.3)*Math.sin(pos.getZ(i)*2.9))*strength;pos.setXYZ(i,pos.getX(i)+norm.getX(i)*noise,pos.getY(i)+norm.getY(i)*noise,pos.getZ(i)+norm.getZ(i)*noise);}pos.needsUpdate=true;geo.computeVertexNormals();return geo;}
      return null;
    };
    const traceMat=(nodeId)=>{const node=nodes.find(n=>n.id===nodeId);if(!node)return new THREE.MeshStandardMaterial({color:"#00ffc8",roughness:0.5,metalness:0.1});if(node.type==="mat_principled")return new THREE.MeshStandardMaterial({color:node.params.base_color||"#00ffc8",roughness:parseFloat(node.params.roughness)||0.5,metalness:parseFloat(node.params.metalness)||0});if(node.type==="mat_emission")return new THREE.MeshStandardMaterial({color:node.params.color||"#00ffc8",emissive:node.params.color||"#00ffc8",emissiveIntensity:parseFloat(node.params.strength)||1});return new THREE.MeshStandardMaterial({color:"#00ffc8"});};
    const geoConn=connections.find(c=>c.to===outNode.id&&c.toSock===0);
    const matConn=connections.find(c=>c.to===outNode.id&&c.toSock===1);
    const newGeo=geoConn?traceGeo(geoConn.from):new THREE.BoxGeometry(2,2,2,4,4,4);
    const newMat=matConn?traceMat(matConn.from):new THREE.MeshStandardMaterial({color:"#00ffc8",roughness:0.5});
    if(mesh){mesh.geometry.dispose();if(mesh.material)mesh.material.dispose();mesh.geometry=newGeo||new THREE.BoxGeometry(2,2,2);mesh.material=newMat;}
  },[nodes,connections]);

  const addNode=(type)=>{ setNodes(prev=>[...prev,makeNode(type,100+Math.random()*200,80+Math.random()*200)]); };
  const deleteNode=(id)=>{ setNodes(prev=>prev.filter(n=>n.id!==id)); setConnections(prev=>prev.filter(c=>c.from!==id&&c.to!==id)); if(selected===id)setSelected(null); };
  const updateParam=(nodeId,key,value)=>{ setNodes(prev=>prev.map(n=>n.id===nodeId?{...n,params:{...n.params,[key]:value}}:n)); };

  const handleGraphMouseDown=useCallback((e,nodeId)=>{
    if(e.button===1||(e.button===0&&e.altKey)){setGraphPan({startX:e.clientX,startY:e.clientY,startOX:graphOffset.x,startOY:graphOffset.y});}
    else if(nodeId){setDragging({nodeId,startX:e.clientX,startY:e.clientY,startNX:nodes.find(n=>n.id===nodeId)?.x||0,startNY:nodes.find(n=>n.id===nodeId)?.y||0});setSelected(nodeId);}
    e.stopPropagation();
  },[graphOffset,nodes]);

  const handleGraphMouseMove=useCallback((e)=>{
    if(graphPan)setGraphOffset({x:graphPan.startOX+(e.clientX-graphPan.startX),y:graphPan.startOY+(e.clientY-graphPan.startY)});
    if(dragging){const dx=e.clientX-dragging.startX,dy=e.clientY-dragging.startY;setNodes(prev=>prev.map(n=>n.id===dragging.nodeId?{...n,x:dragging.startNX+dx,y:dragging.startNY+dy}:n));}
  },[graphPan,dragging]);

  const handleGraphMouseUp=useCallback(()=>{setDragging(null);setGraphPan(null);},[]);
  const cats=[...new Set(Object.values(NODE_TYPES).map(n=>n.cat))];

  return (
    <div className="nms-root">
      <div className="nms-sidebar">
        {cats.map(cat=>(
          <React.Fragment key={cat}>
            <div className="nms-cat-label">{cat}</div>
            {Object.entries(NODE_TYPES).filter(([,d])=>d.cat===cat).map(([type,def])=>(
              <div key={type} className={`nms-node-btn nms-node-btn--${cat}`} onClick={()=>addNode(type)} title={`Add ${def.label}`}>
                <span>{def.label}</span>
                <span className="nms-node-btn__plus">+</span>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <div className="nms-graph" onMouseMove={handleGraphMouseMove} onMouseUp={handleGraphMouseUp}>
        <div className="nms-toolbar">
          <span className="nms-toolbar__label">NODE GRAPH</span>
          <span className="nms-toolbar__hint">DRAG NODES | ALT+DRAG PAN | CLICK OUTPUT SOCKET → INPUT TO CONNECT</span>
          <div className="nms-toolbar__right">
            <span className="nms-tag" className="spnl-tag spnl-tag--teal">NODES: {nodes.length}</span>
            <span className="nms-tag" className="spnl-tag spnl-tag--orange">WIRES: {connections.length}</span>
          </div>
        </div>

        <svg className="nms-svg" ref={svgRef}>
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#00ffc8" opacity="0.6"/>
            </marker>
          </defs>
          {connections.map((conn,ci)=>{
            const fromNode=nodes.find(n=>n.id===conn.from),toNode=nodes.find(n=>n.id===conn.to);
            if(!fromNode||!toNode) return null;
            const toDef=NODE_TYPES[toNode.type];
            const fp=socketPos(fromNode,true,conn.fromSock),tp=socketPos(toNode,false,conn.toSock);
            const ox=graphOffset.x,oy=graphOffset.y;
            const fx=fp.x+ox,fy=fp.y+oy,tx=tp.x+ox,ty=tp.y+oy,mx=(fx+tx)/2;
            const col=socketColor(toDef?.in?.[conn.toSock]||"geometry");
            return <path key={ci} d={`M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}`} stroke={col} strokeWidth="2" fill="none" opacity="0.8" markerEnd="url(#arrowhead)"/>;
          })}
        </svg>

        <div className="nms-canvas" onMouseDown={e=>{if(!e.target.closest(".graph-node"))handleGraphMouseDown(e,null);}}>
          {nodes.map(node=>{
            const def=NODE_TYPES[node.type];
            return (
              <div key={node.id} className="graph-node"
                style={{position:"absolute",left:node.x+graphOffset.x,top:node.y+graphOffset.y,width:NODE_W,background:def.color,border:`1.5px solid ${selected===node.id?"#00ffc8":"#1e1e35"}`,zIndex:selected===node.id?10:1}}
                onMouseDown={e=>handleGraphMouseDown(e,node.id)}>
                <div className="nms-node-header" style={{background:`${def.color}cc`}}>
                  <span className="nms-node-header__label">{def.label}</span>
                  <button className="nms-node-header__del" onMouseDown={e=>e.stopPropagation()} onClick={()=>deleteNode(node.id)}>×</button>
                </div>
                {Math.max(def.in.length,def.out.length)>0&&(
                  <div className="nms-node-sockets">
                    {def.out.map((sock,si)=>{
                      const col=socketColor(sock);
                      return (
                        <div key={`out-${si}`} style={{position:"absolute",right:-SOCKET_R,top:NODE_H_BASE-node.y+si*SOCKET_SPACING+SOCKET_SPACING/2-node.y,cursor:"crosshair"}}
                          onMouseDown={e=>{e.stopPropagation();setWiring({fromNode:node.id,fromSock:si});}}>
                          <div style={{width:SOCKET_R*2,height:SOCKET_R*2,borderRadius:"50%",background:col,border:"1.5px solid #06060f",marginTop:si*SOCKET_SPACING}}/>
                          <span style={{position:"absolute",right:SOCKET_R*2+4,top:-2,fontSize:8,color:col,whiteSpace:"nowrap"}}>{sock}</span>
                        </div>
                      );
                    })}
                    {def.in.map((sock,si)=>{
                      const col=socketColor(sock);
                      const connected=connections.some(c=>c.to===node.id&&c.toSock===si);
                      return (
                        <div key={`in-${si}`} style={{display:"flex",alignItems:"center",padding:`${SOCKET_SPACING/2-6}px 0`,marginLeft:-SOCKET_R,cursor:"crosshair"}}
                          onMouseUp={e=>{e.stopPropagation();if(wiring&&wiring.fromNode!==node.id){setConnections(prev=>[...prev.filter(c=>!(c.to===node.id&&c.toSock===si)),{from:wiring.fromNode,fromSock:wiring.fromSock,to:node.id,toSock:si}]);setWiring(null);}}}>
                          <div style={{width:SOCKET_R*2,height:SOCKET_R*2,borderRadius:"50%",background:connected?col:"#12121f",border:`1.5px solid ${col}`,flexShrink:0}}/>
                          <span style={{marginLeft:4,fontSize:8,color:col}}>{sock}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {Object.entries(node.params).map(([k,v])=>(
                  <div key={k} className="nms-node-param">
                    <span className="nms-node-param__label">{k}</span>
                    {k.includes("color")||k==="base_color"
                      ?<input type="color" value={v} onChange={e=>updateParam(node.id,k,e.target.value)} className="nms-node-param__color" onMouseDown={e=>e.stopPropagation()}/>
                      :<input type="number" value={v} onChange={e=>updateParam(node.id,k,e.target.value)} step={0.1} className="nms-node-param__number" onMouseDown={e=>e.stopPropagation()}/>
                    }
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="nms-viewport">
        <div className="nms-viewport__header">3D PREVIEW</div>
        <canvas ref={canvasRef} className="nms-canvas3d"/>
        <div className="nms-statusbar">
          <span className="nms-statusbar__live">LIVE UPDATE</span>
          <span>{nodes.length} nodes</span>
        </div>
      </div>
    </div>
  );
}
