import React, { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { PASS_TYPES } from '../../mesh/RenderPasses.js';
const C={bg:'#06060f',panel:'#0d1117',border:'#21262d',teal:'#00ffc8',orange:'#FF6600',text:'#e0e0e0',dim:'#8b949e',font:'JetBrains Mono,monospace'};
function Slider({label,value,min,max,step=0.01,onChange,unit=''}){return(<div className="ha-slider-wrap"><div className="ha-slider-row"><span>{label}</span><span className="ha-slider-val">{step<0.1?Number(value).toFixed(2):Math.round(value)}{unit}</span></div><input type='range' min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} className="ha-slider"/></div>);}
function Toggle({label,value,onChange}){return(<div className="spnl-toggle-row"><span className="spnl-dim">{label}</span><div onClick={()=>onChange(!value)} className={`spnl-toggle${value?' spnl-toggle--on':''}`}><div className={`spnl-toggle-dot${value?' spnl-toggle-dot--on':''}`}/></div></div>);}
function Section({title,color=C.teal,children,defaultOpen=true}){const [open,setOpen]=useState(defaultOpen);return(<div className="spnl-section-wrap"><div onClick={()=>setOpen(v=>!v)} className="spnl-section-hdr" style={{borderLeftColor:color}}><span className="spnl-section-arrow" style={{color}}>{open?'▾':'▸'}</span><span className="spnl-section-name">{title}</span></div>{open&&<div className="spnl-section-body-pl">{children}</div>}</div>);}
const RESOLUTIONS=[{label:'Preview 960p',w:960,h:540},{label:'HD 1080p',w:1920,h:1080},{label:'2K',w:2048,h:1152},{label:'4K UHD',w:3840,h:2160},{label:'Square 1080',w:1080,h:1080},{label:'Portrait 9:16',w:1080,h:1920}];
export default function FilmRenderPipeline({rendererRef,sceneRef,cameraRef,open=true,onClose}){
  const [resolution,setResolution]=useState(1);
  const [samples,setSamples]=useState(64);
  const [passes,setPasses]=useState(Object.keys(PASS_TYPES).reduce((a,k)=>({...a,[k]:k==='beauty'}),{}));
  const [rendering,setRendering]=useState(false);
  const [progress,setProgress]=useState(0);
  const [lastRender,setLastRender]=useState(null);
  const [frameStart,setFrameStart]=useState(0);
  const [frameEnd,setFrameEnd]=useState(24);
  const [fps,setFps]=useState(24);
  const [seqMode,setSeqMode]=useState(false);
  const renderPass=useCallback((passType)=>{
    const r=rendererRef?.current; const s=sceneRef?.current; const c=cameraRef?.current;
    if(!r||!s||!c) return null;
    const origMats=new Map();
    if(passType==='normal'){s.traverse(o=>{if(o.isMesh){origMats.set(o,o.material);o.material=new THREE.MeshNormalMaterial();}});}
    else if(passType==='depth'){s.traverse(o=>{if(o.isMesh){origMats.set(o,o.material);o.material=new THREE.MeshDepthMaterial();}});}
    else if(passType==='wireframe'){s.traverse(o=>{if(o.isMesh){origMats.set(o,o.material);o.material=new THREE.MeshBasicMaterial({color:0x00ffc8,wireframe:true});}});}
    r.render(s,c);
    const url=r.domElement.toDataURL('image/png');
    origMats.forEach((m,o)=>{o.material=m;});
    return url;
  },[rendererRef,sceneRef,cameraRef]);
  const renderBeauty=useCallback(async()=>{
    const r=rendererRef?.current; const s=sceneRef?.current; const c=cameraRef?.current;
    if(!r||!s||!c){alert('No renderer/scene/camera found');return;}
    setRendering(true); setProgress(0);
    const res=RESOLUTIONS[resolution];
    const origSize=new THREE.Vector2(); r.getSize(origSize);
    r.setSize(res.w,res.h);
    r.render(s,c);
    setProgress(50);
    await new Promise(res2=>setTimeout(res2,100));
    const url=r.domElement.toDataURL('image/png');
    setLastRender(url); setProgress(100);
    r.setSize(origSize.x,origSize.y);
    setRendering(false);
  },[rendererRef,sceneRef,cameraRef,resolution]);
  const downloadRender=useCallback(()=>{
    if(!lastRender)return;
    const a=document.createElement('a');
    a.href=lastRender; a.download=`spx_render_${Date.now()}.png`; a.click();
  },[lastRender]);
  const renderAllPasses=useCallback(async()=>{
    setRendering(true);
    const enabledPasses=Object.entries(passes).filter(([k,v])=>v).map(([k])=>k);
    for(let i=0;i<enabledPasses.length;i++){
      const url=renderPass(enabledPasses[i]);
      if(url){const a=document.createElement('a');a.href=url;a.download=`spx_${enabledPasses[i]}_${Date.now()}.png`;a.click();}
      setProgress(Math.round((i+1)/enabledPasses.length*100));
      await new Promise(r=>setTimeout(r,200));
    }
    setRendering(false); setProgress(0);
  },[passes,renderPass]);
  if(!open)return null;
  return(<div className="spnl-panel-container" style={{maxWidth:270}}>
    <div className="spnl-panel-hdr">
      <div className="spnl-hdr-dot spnl-hdr-dot--yellow"/><span className="spnl-hdr-title spnl-hdr-title--yellow">RENDER PIPELINE</span>
      {onClose&&<span onClick={onClose} className="spnl-close">×</span>}
    </div>
    <div className="spnl-panel-scroll">
      <Section title='RESOLUTION' color='#ffcc00'>
        <div className="spnl-col">
          {RESOLUTIONS.map((r,i)=><div key={i} onClick={()=>setResolution(i)} style={{padding:'4px 8px',borderRadius:4,cursor:'pointer',fontSize:9,fontWeight:700,border:`1px solid ${resolution===i?'#ffcc00':C.border}`,background:resolution===i?'rgba(255,204,0,0.1)':C.bg,color:resolution===i?'#ffcc00':C.dim,display:'flex',justifyContent:'space-between'}}><span>{r.label}</span><span style={{color:C.dim}}>{r.w}×{r.h}</span></div>)}
        </div>
      </Section>
      <Section title='RENDER PASSES' color='#ff88aa'>
        <div className="spnl-level-list">
          {Object.entries(PASS_TYPES).map(([k,v])=><div key={k} onClick={()=>setPasses(p=>({...p,[k]:!p[k]}))} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 6px',borderRadius:4,cursor:'pointer',border:`1px solid ${passes[k]?'#ff88aa':C.border}`,background:passes[k]?'rgba(255,136,170,0.08)':C.bg}}><div className="spnl-row"><div style={{width:8,height:8,borderRadius:2,background:v.color}}/><span style={{fontSize:9,color:passes[k]?C.text:C.dim,fontWeight:passes[k]?700:400}}>{v.label}</span></div><span className="spnl-dim">{passes[k]?'ON':'OFF'}</span></div>)}
        </div>
        <button onClick={renderAllPasses} disabled={rendering} style={{width:'100%',padding:'6px 0',background:'rgba(255,136,170,0.1)',border:'1px solid #ff88aa',borderRadius:4,color:'#ff88aa',fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer',letterSpacing:1,opacity:rendering?0.5:1}}>RENDER ALL PASSES</button>
      </Section>
      <Section title='BEAUTY RENDER' color={C.teal}>
        <Slider label='SAMPLES' value={samples} min={1} max={512} step={1} onChange={setSamples}/>
        {rendering&&<div style={{height:4,background:C.border,borderRadius:2,marginBottom:6,overflow:'hidden'}}><div style={{height:'100%',width:`${progress}%`,background:C.teal,transition:'width 0.2s'}}/></div>}
        {lastRender&&<img src={lastRender} style={{width:'100%',borderRadius:4,marginBottom:6,border:`1px solid ${C.border}`}} alt='render preview'/>}
        <div className="spnl-grid-2">
          <button onClick={renderBeauty} disabled={rendering} style={{padding:'7px 0',background:'rgba(0,255,200,0.1)',border:`1px solid ${C.teal}`,borderRadius:4,color:C.teal,fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer',opacity:rendering?0.5:1}}>▶ RENDER</button>
          <button onClick={downloadRender} disabled={!lastRender} style={{padding:'7px 0',background:'rgba(255,102,0,0.1)',border:`1px solid ${C.orange}`,borderRadius:4,color:C.orange,fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer',opacity:lastRender?1:0.4}}>↓ SAVE PNG</button>
        </div>
      </Section>
      <Section title='FRAME SEQUENCE' color={C.dim} defaultOpen={false}>
        <Toggle label='SEQUENCE MODE' value={seqMode} onChange={setSeqMode}/>
        <Slider label='FRAME START' value={frameStart} min={0} max={240} step={1} onChange={setFrameStart}/>
        <Slider label='FRAME END'   value={frameEnd}   min={1} max={240} step={1} onChange={setFrameEnd}/>
        <Slider label='FPS'         value={fps}        min={12} max={60} step={1} onChange={setFps}/>
        <div style={{fontSize:9,color:C.dim,marginTop:4}}>{frameEnd-frameStart} frames @ {fps}fps = {((frameEnd-frameStart)/fps).toFixed(1)}s</div>
      </Section>
    </div>
  </div>);
}