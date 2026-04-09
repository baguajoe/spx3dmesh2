import React, { useState, useCallback } from 'react';
import * as THREE from 'three';
import '../../styles/panel-components.css';
import '../../styles/render-panels.css';

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

function Section({ title, children, defaultOpen=true, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spx-section">
      <div className={`spx-section__hdr${accent?` spx-section__hdr--${accent}`:''}`} onClick={()=>setOpen(v=>!v)}>
        <span className={`spx-section__arrow${accent?` spx-section__arrow--${accent}`:''}`}>{open?'▾':'▸'}</span>
        <span className="spx-section__title">{title}</span>
      </div>
      {open && <div className="spx-section__body">{children}</div>}
    </div>
  );
}

const RIGS = [
  { label:'3-Point',     desc:'Key + Fill + Rim. Standard film setup.',     lights:[{type:'dir',color:'#fff5e0',intensity:3,pos:[3,5,3],name:'Key'},{type:'dir',color:'#c0d8ff',intensity:1,pos:[-3,2,2],name:'Fill'},{type:'dir',color:'#ffffff',intensity:2,pos:[-2,3,-4],name:'Rim'}] },
  { label:'Rembrandt',   desc:'Single key at 45° above. Classic dramatic.',  lights:[{type:'dir',color:'#fff0d0',intensity:4,pos:[3,4,2],name:'Key'},{type:'dir',color:'#101820',intensity:0.3,pos:[-2,1,2],name:'Fill'}] },
  { label:'Butterfly',   desc:'Key above nose. Beauty/glamour lighting.',    lights:[{type:'dir',color:'#fff8f0',intensity:4,pos:[0,5,3],name:'Key'},{type:'dir',color:'#d0e8ff',intensity:0.8,pos:[0,-2,2],name:'Fill'}] },
  { label:'Split',       desc:'Half face lit, half dark. Dramatic.',         lights:[{type:'dir',color:'#fff0e0',intensity:4,pos:[4,2,0],name:'Key'}] },
  { label:'Loop',        desc:'Shadow of nose loops to corner of mouth.',    lights:[{type:'dir',color:'#fff5e0',intensity:3.5,pos:[2,4,2],name:'Key'},{type:'dir',color:'#c8d8ff',intensity:0.6,pos:[-2,1,2],name:'Fill'}] },
  { label:'Neon Night',  desc:'Cyberpunk dual color fill.',                  lights:[{type:'point',color:'#ff00aa',intensity:3,pos:[3,2,2],name:'Neon1'},{type:'point',color:'#00aaff',intensity:3,pos:[-3,2,2],name:'Neon2'},{type:'amb',color:'#050510',intensity:0.2,pos:[0,0,0],name:'Amb'}] },
  { label:'Golden Hour', desc:'Warm low sun. Cinematic outdoor.',            lights:[{type:'dir',color:'#ff9933',intensity:2,pos:[5,1,2],name:'Sun'},{type:'dir',color:'#4466aa',intensity:0.5,pos:[-3,3,-2],name:'Sky'},{type:'amb',color:'#331a00',intensity:0.3,pos:[0,0,0],name:'Amb'}] },
  { label:'Horror',      desc:'Under-lighting. Eerie upward shadows.',       lights:[{type:'point',color:'#00ff44',intensity:2,pos:[0,-2,2],name:'Under'},{type:'amb',color:'#050505',intensity:0.1,pos:[0,0,0],name:'Amb'}] },
  { label:'Studio White',desc:'Clean even lighting. Product/portrait.',      lights:[{type:'dir',color:'#ffffff',intensity:2,pos:[3,5,3],name:'Key'},{type:'dir',color:'#f0f8ff',intensity:1.5,pos:[-3,4,3],name:'Fill'},{type:'amb',color:'#e8f0ff',intensity:0.8,pos:[0,0,0],name:'Amb'}] },
  { label:'Noir',        desc:'High contrast single source. Deep shadows.',  lights:[{type:'spot',color:'#fff8e0',intensity:5,pos:[2,6,2],name:'Key'},{type:'amb',color:'#000000',intensity:0.0,pos:[0,0,0],name:'Amb'}] },
];

export default function CinematicLightingPanel({ sceneRef, open=true, onClose }) {
  const [activeRig,  setActiveRig]  = useState(null);
  const [intensity,  setIntensity]  = useState(1.0);
  const [warmth,     setWarmth]     = useState(0);
  const [shadowSoft, setShadowSoft] = useState(4096);

  const applyRig = useCallback((rig, idx) => {
    const scene = sceneRef?.current; if (!scene) return;
    const toRemove = [];
    scene.traverse(obj => { if (obj.userData.cinLight) toRemove.push(obj); });
    toRemove.forEach(obj => scene.remove(obj));
    rig.lights.forEach(l => {
      let light;
      const col = new THREE.Color(l.color);
      if (warmth !== 0) { col.r = Math.min(1, col.r+warmth*0.1); col.b = Math.max(0, col.b-warmth*0.1); }
      const intens = l.intensity * intensity;
      if (l.type==='dir')   { light=new THREE.DirectionalLight(col,intens); light.castShadow=true; light.shadow.mapSize.setScalar(shadowSoft); light.shadow.bias=-0.0003; }
      else if (l.type==='point') { light=new THREE.PointLight(col,intens,50); light.castShadow=true; light.shadow.mapSize.setScalar(1024); }
      else if (l.type==='spot')  { light=new THREE.SpotLight(col,intens,50,Math.PI/6,0.3); light.castShadow=true; light.shadow.mapSize.setScalar(2048); }
      else if (l.type==='amb')   { light=new THREE.AmbientLight(col,intens); }
      if (light) { light.position.set(l.pos[0],l.pos[1],l.pos[2]); light.name=l.name; light.userData.cinLight=true; light.userData.rigName=rig.label; scene.add(light); }
    });
    setActiveRig(idx);
  }, [sceneRef, intensity, warmth, shadowSoft]);

  const updateIntensity = useCallback((v) => {
    setIntensity(v);
    const scene = sceneRef?.current; if (!scene) return;
    scene.traverse(obj => { if (obj.userData.cinLight && obj.intensity!==undefined) obj.intensity *= (v/intensity); });
  }, [sceneRef, intensity]);

  if (!open) return null;

  return (
    <div className="spx-float-panel cin-panel">
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot cin-dot" />
        <span className="spx-float-panel__title cin-title">CINEMATIC LIGHTING</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <Section title="LIGHTING RIGS" accent="gold">
          <div className="cin-rig-list">
            {RIGS.map((rig, i) => (
              <div
                key={rig.label}
                className={`cin-rig-card${activeRig===i?' cin-rig-card--active':''}`}
                onClick={() => applyRig(rig, i)}
              >
                <div className="cin-rig-header">
                  <span className={`cin-rig-name${activeRig===i?' cin-rig-name--active':''}`}>{rig.label}</span>
                  <span className="cin-rig-count">{rig.lights.length} lights</span>
                </div>
                <div className="cin-rig-desc">{rig.desc}</div>
                <div className="cin-rig-swatches">
                  {rig.lights.map(l => <div key={l.name} className="cin-swatch" style={{background:l.color}} title={l.name}/>)}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="ADJUST" accent="orange">
          <Slider label="OVERALL INTENSITY" value={intensity} min={0.1} max={5} step={0.05} onChange={updateIntensity}/>
          <Slider label="WARMTH" value={warmth} min={-1} max={1} step={0.05} onChange={setWarmth}/>
          <div className="cin-shadow-quality">SHADOW QUALITY</div>
          <div className="cin-shadow-chips">
            {[512,1024,2048,4096].map(s => (
              <button
                key={s}
                className={`cin-shadow-chip${shadowSoft===s?' cin-shadow-chip--active':''}`}
                onClick={() => setShadowSoft(s)}
              >{s}</button>
            ))}
          </div>
        </Section>

        <button
          className="cin-clear-btn"
          onClick={() => { const scene=sceneRef?.current; if(!scene) return; const tr=[]; scene.traverse(o=>{if(o.userData.cinLight)tr.push(o);}); tr.forEach(o=>scene.remove(o)); setActiveRig(null); }}
        >CLEAR ALL LIGHTS</button>
      </div>
    </div>
  );
}
