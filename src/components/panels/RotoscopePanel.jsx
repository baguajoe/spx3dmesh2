import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
const C={bg:'#06060f',panel:'#0d1117',border:'#21262d',teal:'#00ffc8',orange:'#FF6600',text:'#e0e0e0',dim:'#8b949e',font:'JetBrains Mono,monospace'};
export default function RotoscopePanel({sceneRef,rendererRef,currentFrame,setCurrentFrame,open=true,onClose}){
  const [videoFile,setVideoFile]=useState(null);
  const [videoURL,setVideoURL]=useState(null);
  const [fps,setFps]=useState(24);
  const [totalFrames,setTotalFrames]=useState(0);
  const [opacity,setOpacity]=useState(0.5);
  const [scale,setScale]=useState(4);
  const [posX,setPosX]=useState(0);
  const [posY,setPosY]=useState(1);
  const [posZ,setPosZ]=useState(-3);
  const [playing,setPlaying]=useState(false);
  const [onionSkin,setOnionSkin]=useState(false);
  const [onionFrames,setOnionFrames]=useState(2);
  const videoRef=useRef(null);
  const planeRef=useRef(null);
  const texRef=useRef(null);
  const playRef=useRef(null);
  const onionMeshes=useRef([]);

  // Load video file
  const loadVideo=useCallback((file)=>{
    const url=URL.createObjectURL(file);
    setVideoURL(url); setVideoFile(file);
    const vid=document.createElement('video');
    vid.src=url; vid.crossOrigin='anonymous'; vid.muted=true; vid.playsInline=true;
    vid.onloadedmetadata=()=>{
      const frames=Math.floor(vid.duration*fps);
      setTotalFrames(frames);
      videoRef.current=vid;
      buildPlane(vid);
    };
    vid.load();
  },[fps]);

  // Build Three.js video plane in scene
  const buildPlane=useCallback((vid)=>{
    const scene=sceneRef?.current; if(!scene) return;
    // Remove old plane
    if(planeRef.current){scene.remove(planeRef.current);planeRef.current.geometry.dispose();planeRef.current.material.dispose();}
    const tex=new THREE.VideoTexture(vid);
    tex.colorSpace=THREE.SRGBColorSpace;
    texRef.current=tex;
    const aspect=vid.videoWidth/vid.videoHeight||16/9;
    const geo=new THREE.PlaneGeometry(scale*aspect,scale);
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false});
    const plane=new THREE.Mesh(geo,mat);
    plane.position.set(posX,posY,posZ);
    plane.userData.isRotoPlane=true;
    scene.add(plane);
    planeRef.current=plane;
  },[sceneRef,scale,opacity,posX,posY,posZ]);

  // Sync video to current frame
  useEffect(()=>{
    const vid=videoRef.current; if(!vid||!totalFrames) return;
    vid.currentTime=currentFrame/fps;
  },[currentFrame,fps,totalFrames]);

  // Update plane opacity live
  useEffect(()=>{
    if(planeRef.current) planeRef.current.material.opacity=opacity;
  },[opacity]);

  // Update plane position live
  useEffect(()=>{
    if(planeRef.current) planeRef.current.position.set(posX,posY,posZ);
  },[posX,posY,posZ]);

  // Playback
  useEffect(()=>{
    if(playRef.current) clearInterval(playRef.current);
    if(!playing) return;
    playRef.current=setInterval(()=>{
      setCurrentFrame(f=>{ const next=f+1; if(next>=totalFrames){setPlaying(false);return f;} return next; });
    },1000/fps);
    return ()=>clearInterval(playRef.current);
  },[playing,fps,totalFrames]);

  const removeFromScene=useCallback(()=>{
    const scene=sceneRef?.current; if(!scene) return;
    if(planeRef.current){scene.remove(planeRef.current);planeRef.current=null;}
    onionMeshes.current.forEach(m=>scene.remove(m));
    onionMeshes.current=[];
    if(videoRef.current){videoRef.current.pause();videoRef.current=null;}
    setVideoURL(null); setVideoFile(null);
  },[sceneRef]);

  function Slider({label,value,min,max,step=0.01,onChange,unit=''}){return(<div style={{marginBottom:5}}><div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.dim,marginBottom:1}}><span>{label}</span><span style={{color:C.teal,fontWeight:700}}>{step<0.1?Number(value).toFixed(2):Math.round(value)}{unit}</span></div><input type='range' min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{width:'100%',accentColor:C.teal,cursor:'pointer',height:3}}/></div>);}
  function Toggle({label,value,onChange}){return(<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}><span style={{fontSize:9,color:C.dim}}>{label}</span><div onClick={()=>onChange(!value)} style={{width:32,height:16,borderRadius:8,cursor:'pointer',position:'relative',background:value?C.teal:C.border}}><div style={{position:'absolute',top:2,left:value?16:2,width:12,height:12,borderRadius:'50%',background:value?C.bg:'#555',transition:'left 0.15s'}}/></div></div>);}
  function Section({title,color=C.teal,children,defaultOpen=true}){const [open,setOpen]=useState(defaultOpen);return(<div style={{marginBottom:6}}><div onClick={()=>setOpen(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 8px',background:'#0a0f1a',borderRadius:4,cursor:'pointer',borderLeft:`2px solid ${color}`,marginBottom:open?5:0}}><span style={{color,fontSize:9}}>{open?'▾':'▸'}</span><span style={{fontSize:9,fontWeight:700,color:C.text,letterSpacing:1}}>{title}</span></div>{open&&<div style={{paddingLeft:8}}>{children}</div>}</div>);}

  if(!open) return null;
  return(<div style={{width:260,background:C.panel,borderRadius:6,border:`1px solid ${C.border}`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:680}}>
    <div style={{background:'linear-gradient(90deg,#0a1520,#0d1117)',borderBottom:`1px solid ${C.border}`,padding:'8px 12px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
      <div style={{width:6,height:6,borderRadius:'50%',background:'#ff44aa',boxShadow:'0 0 6px #ff44aa'}}/><span style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#ff44aa'}}>ROTOSCOPE</span>
      {onClose&&<span onClick={onClose} style={{marginLeft:'auto',cursor:'pointer',color:C.dim}}>×</span>}
    </div>
    <div style={{flex:1,overflowY:'auto',padding:'10px 12px'}}>

      {/* Video load */}
      <Section title='VIDEO SOURCE' color='#ff44aa'>
        {!videoURL?(<label style={{display:'block',padding:'10px',border:`2px dashed ${C.border}`,borderRadius:6,textAlign:'center',cursor:'pointer',color:C.dim,fontSize:9,letterSpacing:1}}>
          <input type='file' accept='video/*' style={{display:'none'}} onChange={e=>e.target.files[0]&&loadVideo(e.target.files[0])}/>
          ▶ CLICK TO LOAD VIDEO<br/><span style={{fontSize:8,opacity:0.6}}>MP4 / WebM / MOV</span>
        </label>):(
          <div>
            <div style={{fontSize:9,color:C.teal,marginBottom:4,fontWeight:700}}>✓ {videoFile?.name}</div>
            <div style={{fontSize:9,color:C.dim,marginBottom:6}}>{totalFrames} frames @ {fps}fps</div>
            <button onClick={removeFromScene} style={{width:'100%',padding:'5px',background:'rgba(255,68,170,0.1)',border:'1px solid #ff44aa',borderRadius:4,color:'#ff44aa',fontFamily:C.font,fontSize:9,cursor:'pointer'}}>✕ REMOVE</button>
          </div>
        )}
      </Section>

      {/* Transport */}
      {videoURL&&<Section title='TRANSPORT' color={C.teal}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
          <button onClick={()=>setCurrentFrame(0)} style={{padding:'4px 8px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,color:C.dim,cursor:'pointer',fontSize:10}}>⏮</button>
          <button onClick={()=>setCurrentFrame(f=>Math.max(0,f-1))} style={{padding:'4px 8px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,color:C.dim,cursor:'pointer',fontSize:10}}>◀</button>
          <button onClick={()=>setPlaying(p=>!p)} style={{flex:1,padding:'6px',background:playing?'rgba(255,102,0,0.15)':'rgba(0,255,200,0.1)',border:`1px solid ${playing?C.orange:C.teal}`,borderRadius:4,color:playing?C.orange:C.teal,cursor:'pointer',fontSize:12,fontWeight:700}}>{playing?'⏸':'▶'}</button>
          <button onClick={()=>setCurrentFrame(f=>Math.min(totalFrames-1,f+1))} style={{padding:'4px 8px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,color:C.dim,cursor:'pointer',fontSize:10}}>▶</button>
          <button onClick={()=>setCurrentFrame(totalFrames-1)} style={{padding:'4px 8px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,color:C.dim,cursor:'pointer',fontSize:10}}>⏭</button>
        </div>
        <input type='range' min={0} max={Math.max(0,totalFrames-1)} step={1} value={currentFrame} onChange={e=>setCurrentFrame(parseInt(e.target.value))} style={{width:'100%',accentColor:C.teal,cursor:'pointer',marginBottom:4}}/>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.dim}}>
          <span>Frame {currentFrame}</span><span>{totalFrames} total</span><span>{(currentFrame/fps).toFixed(2)}s</span>
        </div>
        <Slider label='FPS' value={fps} min={12} max={60} step={1} onChange={setFps} unit='fps'/>
      </Section>}

      {/* Plane controls */}
      {videoURL&&<Section title='VIEWPORT PLANE' color={C.orange}>
        <Slider label='OPACITY'  value={opacity} min={0}   max={1}   step={0.01} onChange={setOpacity}/>
        <Slider label='SCALE'    value={scale}   min={0.5} max={10}  step={0.1}  onChange={v=>{setScale(v);if(planeRef.current&&videoRef.current){const a=videoRef.current.videoWidth/videoRef.current.videoHeight||1.78;planeRef.current.geometry.dispose();planeRef.current.geometry=new THREE.PlaneGeometry(v*a,v);}}}/>
        <Slider label='POS X'    value={posX}    min={-10} max={10}  step={0.1}  onChange={setPosX}/>
        <Slider label='POS Y'    value={posY}    min={-5}  max={10}  step={0.1}  onChange={setPosY}/>
        <Slider label='POS Z'    value={posZ}    min={-20} max={0}   step={0.1}  onChange={setPosZ}/>
        <button onClick={()=>buildPlane(videoRef.current)} style={{width:'100%',marginTop:4,padding:'5px',background:'rgba(255,102,0,0.1)',border:`1px solid ${C.orange}`,borderRadius:4,color:C.orange,fontFamily:C.font,fontSize:9,cursor:'pointer',fontWeight:700}}>↺ REBUILD PLANE</button>
      </Section>}

      {/* Onion skin */}
      {videoURL&&<Section title='ONION SKIN' color='#aaffcc' defaultOpen={false}>
        <Toggle label='ONION SKIN' value={onionSkin} onChange={setOnionSkin}/>
        <Slider label='FRAMES' value={onionFrames} min={1} max={5} step={1} onChange={setOnionFrames}/>
        <div style={{fontSize:9,color:C.dim}}>Shows ghost frames ±{onionFrames} around current frame</div>
      </Section>}

      {/* Tips */}
      <div style={{padding:'8px',background:C.bg,borderRadius:4,border:`1px solid ${C.border}`,fontSize:8,color:C.dim,lineHeight:1.6}}>
        <div style={{color:C.teal,fontWeight:700,marginBottom:4}}>HOW TO USE</div>
        1. Load video — appears as plane in viewport<br/>
        2. Scrub timeline to match reference frame<br/>
        3. Move/rotate your mesh to match<br/>
        4. Press I to set keyframe<br/>
        5. Advance frame, repeat
      </div>
    </div>
  </div>);
}