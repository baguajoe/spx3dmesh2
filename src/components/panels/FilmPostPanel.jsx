import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import '../../styles/panel-components.css';
import '../../styles/film-post.css';

function Slider({ label, value, min, max, step=0.01, onChange, unit='' }) {
  return (
    <div className="spx-slider-wrap">
      <div className="spx-slider-header">
        <span>{label}</span>
        <span className="spx-slider-header__val">{step<0.1?Number(value).toFixed(2):Math.round(value)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        className="spx-slider-input" onChange={e=>onChange(parseFloat(e.target.value))}/>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="rpnl-toggle-row">
      <span className="rpnl-toggle-label">{label}</span>
      <div className={`rpnl-toggle${value?' rpnl-toggle--on':' rpnl-toggle--off'}`} onClick={()=>onChange(!value)}>
        <div className={`rpnl-toggle__dot${value?' rpnl-toggle__dot--on':' rpnl-toggle__dot--off'}`}/>
      </div>
    </div>
  );
}

function Section({ title, color='#00ffc8', children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spx-section">
      <div className="spx-section__hdr" style={{borderLeftColor:color}} onClick={()=>setOpen(v=>!v)}>
        <span className="spx-section__arrow" style={{color}}>{open?'▾':'▸'}</span>
        <span className="spx-section__title">{title}</span>
      </div>
      {open && <div className="spx-section__body">{children}</div>}
    </div>
  );
}

const TONE_MODES = [
  { key:'aces',     label:'ACES Filmic', val: THREE.ACESFilmicToneMapping },
  { key:'reinhard', label:'Reinhard',    val: THREE.ReinhardToneMapping },
  { key:'cineon',   label:'Cineon',      val: THREE.CineonToneMapping },
  { key:'agx',      label:'AgX',         val: THREE.AgXToneMapping || THREE.ACESFilmicToneMapping },
  { key:'linear',   label:'Linear',      val: THREE.LinearToneMapping },
];

const HDRI_PRESETS = [
  { key:'sunset',   label:'Sunset',       top:'#0d1b3e', mid:'#e8c090', bot:'#1a1208', sunY:1.35 },
  { key:'overcast', label:'Overcast',     top:'#1a2030', mid:'#8090a0', bot:'#404850', sunY:0.0  },
  { key:'studio',   label:'Studio',       top:'#111318', mid:'#2a2e38', bot:'#0a0a0a', sunY:0.0  },
  { key:'day',      label:'Daylight',     top:'#0a1a3a', mid:'#5090d0', bot:'#1a3010', sunY:1.6  },
  { key:'night',    label:'Night',        top:'#000008', mid:'#050510', bot:'#020202', sunY:0.0  },
  { key:'golden',   label:'Golden Hour',  top:'#0d1020', mid:'#ff8830', bot:'#200800', sunY:1.45 },
];

function buildHDRI(renderer, preset) {
  const size=512, c=document.createElement('canvas');
  c.width=size*4; c.height=size*2;
  const ctx=c.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,size*2);
  g.addColorStop(0, preset.top); g.addColorStop(0.5, preset.mid); g.addColorStop(1, preset.bot);
  ctx.fillStyle=g; ctx.fillRect(0,0,size*4,size*2);
  if(preset.sunY>0){
    const sx=size*2,sy=size*preset.sunY;
    const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,90);
    sg.addColorStop(0,'rgba(255,240,200,1)'); sg.addColorStop(0.3,'rgba(255,180,80,0.6)'); sg.addColorStop(1,'rgba(255,80,0,0)');
    ctx.fillStyle=sg; ctx.fillRect(0,0,size*4,size*2);
  }
  const tex=new THREE.CanvasTexture(c);
  tex.mapping=THREE.EquirectangularReflectionMapping;
  tex.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env=pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose(); tex.dispose();
  return env;
}

export default function FilmPostPanel({ rendererRef, sceneRef, open=true }) {
  const [bloomOn,       setBloomOn]       = useState(true);
  const [bloomStrength, setBloomStrength] = useState(0.4);
  const [bloomRadius,   setBloomRadius]   = useState(0.5);
  const [bloomThresh,   setBloomThresh]   = useState(0.85);
  const [ssaoOn,        setSsaoOn]        = useState(true);
  const [ssaoRadius,    setSsaoRadius]    = useState(0.6);
  const [ssaoMin,       setSsaoMin]       = useState(0.001);
  const [ssaoMax,       setSsaoMax]       = useState(0.08);
  const [toneMode,      setToneMode]      = useState('aces');
  const [exposure,      setExposure]      = useState(1.1);
  const [hdriPreset,    setHdriPreset]    = useState('sunset');
  const [envIntensity,  setEnvIntensity]  = useState(0.8);
  const [vigOn,         setVigOn]         = useState(true);
  const [vigIntensity,  setVigIntensity]  = useState(0.35);
  const [caOn,          setCaOn]          = useState(false);
  const [grainOn,       setGrainOn]       = useState(true);
  const [grainAmt,      setGrainAmt]      = useState(0.04);

  const vigRef       = useRef(null);
  const grainRef     = useRef(null);
  const grainAnimRef = useRef(null);

  const getComposer = useCallback(()=> rendererRef?.current?._composer, [rendererRef]);
  const getPass     = useCallback((idx)=> getComposer()?.passes?.[idx], [getComposer]);

  useEffect(()=>{
    const p=getPass(2); if(!p) return;
    p.enabled=bloomOn; p.strength=bloomStrength; p.radius=bloomRadius; p.threshold=bloomThresh;
  },[bloomOn,bloomStrength,bloomRadius,bloomThresh]);

  useEffect(()=>{
    const p=getPass(1); if(!p) return;
    p.enabled=ssaoOn; p.kernelRadius=ssaoRadius; p.minDistance=ssaoMin; p.maxDistance=ssaoMax;
  },[ssaoOn,ssaoRadius,ssaoMin,ssaoMax]);

  useEffect(()=>{
    const r=rendererRef?.current; if(!r) return;
    const mode=TONE_MODES.find(m=>m.key===toneMode);
    if(mode) r.toneMapping=mode.val;
    r.toneMappingExposure=exposure;
  },[toneMode,exposure]);

  const applyHDRI = useCallback(()=>{
    const r=rendererRef?.current, s=sceneRef?.current; if(!r||!s) return;
    const preset=HDRI_PRESETS.find(h=>h.key===hdriPreset); if(!preset) return;
    try {
      const env=buildHDRI(r,preset);
      if(s.environment) s.environment.dispose?.();
      s.environment=env; s.environmentIntensity=envIntensity;
    } catch(e){ console.warn('HDRI swap failed',e); }
  },[hdriPreset,envIntensity,rendererRef,sceneRef]);

  useEffect(()=>{ applyHDRI(); },[hdriPreset]);
  useEffect(()=>{ const s=sceneRef?.current; if(!s) return; s.environmentIntensity=envIntensity; },[envIntensity]);

  useEffect(()=>{
    const el=vigRef.current; if(!el) return;
    el.style.display=vigOn?'block':'none';
    el.style.opacity=vigIntensity;
  },[vigOn,vigIntensity]);

  useEffect(()=>{
    if(grainAnimRef.current) cancelAnimationFrame(grainAnimRef.current);
    const el=grainRef.current; if(!el) return;
    el.style.display=grainOn?'block':'none';
    if(!grainOn) return;
    const ctx=el.getContext('2d');
    const draw=()=>{
      const w=el.width||el.offsetWidth||800,h=el.height||el.offsetHeight||600;
      if(w!==el.width||h!==el.height){el.width=w;el.height=h;}
      const img=ctx.createImageData(w,h);
      for(let i=0;i<img.data.length;i+=4){
        const v=(Math.random()-0.5)*grainAmt*255;
        img.data[i]=img.data[i+1]=img.data[i+2]=128+v;
        img.data[i+3]=Math.abs(v)*2.5;
      }
      ctx.putImageData(img,0,0);
      grainAnimRef.current=requestAnimationFrame(draw);
    };
    draw();
    return ()=>cancelAnimationFrame(grainAnimRef.current);
  },[grainOn,grainAmt]);

  if(!open) return null;

  return (
    <div className="fpost-panel">
      <div className="fpost-header">
        <div className="fpost-header__dot"/>
        <span className="fpost-header__title">FILM POST</span>
        <span className="fpost-header__badge">DAY 2</span>
      </div>

      <div className="fpost-body">
        <Section title="HDRI ENVIRONMENT" color="#00ffc8">
          <div className="fpost-preset-grid">
            {HDRI_PRESETS.map(h=>(
              <div key={h.key} className={`fpost-preset-btn${hdriPreset===h.key?' fpost-preset-btn--teal':''}`}
                onClick={()=>setHdriPreset(h.key)}>{h.label}</div>
            ))}
          </div>
          <Slider label="ENV INTENSITY" value={envIntensity} min={0} max={3} step={0.05} onChange={setEnvIntensity}/>
          <button className="fpost-apply-btn fpost-apply-btn--teal" onClick={applyHDRI}>↺ REBUILD HDRI</button>
        </Section>

        <Section title="TONE MAPPING" color="#FF6600">
          <div className="fpost-preset-grid">
            {TONE_MODES.map(m=>(
              <div key={m.key} className={`fpost-preset-btn${toneMode===m.key?' fpost-preset-btn--orange':''}`}
                onClick={()=>setToneMode(m.key)}>{m.label}</div>
            ))}
          </div>
          <Slider label="EXPOSURE" value={exposure} min={0.1} max={3} step={0.05} onChange={setExposure}/>
        </Section>

        <Section title="BLOOM" color="#ff88ff">
          <Toggle label="ENABLED"   value={bloomOn}       onChange={setBloomOn}/>
          <Slider label="STRENGTH"  value={bloomStrength} min={0} max={3}   step={0.05} onChange={setBloomStrength}/>
          <Slider label="RADIUS"    value={bloomRadius}   min={0} max={1}   step={0.01} onChange={setBloomRadius}/>
          <Slider label="THRESHOLD" value={bloomThresh}   min={0} max={1}   step={0.01} onChange={setBloomThresh}/>
        </Section>

        <Section title="AMBIENT OCCLUSION" color="#88aaff">
          <Toggle label="ENABLED"  value={ssaoOn}     onChange={setSsaoOn}/>
          <Slider label="RADIUS"   value={ssaoRadius} min={0.1}    max={4}   step={0.05}   onChange={setSsaoRadius}/>
          <Slider label="MIN DIST" value={ssaoMin}    min={0.0001} max={0.01} step={0.0001} onChange={setSsaoMin}/>
          <Slider label="MAX DIST" value={ssaoMax}    min={0.01}   max={0.5}  step={0.005}  onChange={setSsaoMax}/>
        </Section>

        <Section title="VIGNETTE" color="#aaffcc" defaultOpen={false}>
          <Toggle label="ENABLED"   value={vigOn}        onChange={setVigOn}/>
          <Slider label="INTENSITY" value={vigIntensity} min={0} max={1} step={0.01} onChange={setVigIntensity}/>
        </Section>

        <Section title="FILM GRAIN" color="#ffcc44" defaultOpen={false}>
          <Toggle label="ENABLED" value={grainOn}   onChange={setGrainOn}/>
          <Slider label="AMOUNT"  value={grainAmt}  min={0} max={0.2} step={0.005} onChange={setGrainAmt}/>
        </Section>
      </div>

      {/* Vignette CSS overlay */}
      <div ref={vigRef} className="fpost-vignette-overlay"
        style={{opacity:vigIntensity, background:`radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${vigIntensity}) 100%)`}}/>
      {/* Film grain canvas overlay */}
      <canvas ref={grainRef} className="fpost-grain-overlay"/>
    </div>
  );
}
