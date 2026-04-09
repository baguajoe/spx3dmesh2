import React, { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import '../../styles/panel-components.css';
import '../../styles/render-panels.css';

function Slider({ label, value, min, max, step=1, onChange, unit='' }) {
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

const RESOLUTIONS = [
  { label:'Preview', w:960,  h:540  },
  { label:'1080p',   w:1920, h:1080 },
  { label:'2K',      w:2048, h:1152 },
  { label:'4K',      w:3840, h:2160 },
];

export default function FilmPathTracerPanel({ rendererRef, sceneRef, cameraRef, open=true, onClose }) {
  const [samples,    setSamples]    = useState(256);
  const [bounces,    setBounces]    = useState(8);
  const [rendering,  setRendering]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [preview,    setPreview]    = useState(null);
  const [renderTime, setRenderTime] = useState(null);
  const [resolution, setResolution] = useState(1);
  const [denoise,    setDenoise]    = useState(true);
  const [gi,         setGi]         = useState(true);
  const [caustics,   setCaustics]   = useState(false);
  const ptRef = useRef(null);

  const startRender = useCallback(async () => {
    const r=rendererRef?.current; const s=sceneRef?.current; const c=cameraRef?.current;
    if (!r||!s||!c) return;
    setRendering(true); setProgress(0); setRenderTime(null);
    const t0 = performance.now();
    const res = RESOLUTIONS[resolution];
    const origSize = new THREE.Vector2(); r.getSize(origSize);
    r.setSize(res.w, res.h);
    try {
      const { PathTracingRenderer, PhysicalCamera } = await import('three-gpu-pathtracer');
      if (ptRef.current) { ptRef.current.dispose?.(); ptRef.current=null; }
      const pt = new PathTracingRenderer({ renderer:r });
      pt.camera=c; pt.alpha=false; pt.material.bounces=bounces;
      pt.material.physicalCamera=new PhysicalCamera();
      pt.setScene(s, c).then(() => {
        let sampleCount = 0;
        const tick = () => {
          if (sampleCount >= samples) {
            const url = r.domElement.toDataURL('image/png');
            setPreview(url); setRendering(false);
            setRenderTime(((performance.now()-t0)/1000).toFixed(1)); setProgress(100);
            r.setSize(origSize.x, origSize.y); return;
          }
          pt.update(); sampleCount++;
          setProgress(Math.round(sampleCount/samples*100));
          requestAnimationFrame(tick);
        };
        tick();
      });
      ptRef.current = pt;
    } catch(e) {
      console.warn('GPU path tracer failed, falling back:', e);
      r.render(s, c);
      const url = r.domElement.toDataURL('image/png');
      setPreview(url); setRendering(false);
      setRenderTime(((performance.now()-t0)/1000).toFixed(1)); setProgress(100);
      r.setSize(origSize.x, origSize.y);
    }
  }, [rendererRef, sceneRef, cameraRef, samples, bounces, resolution]);

  const cancelRender = useCallback(() => {
    ptRef.current?.dispose?.(); ptRef.current=null;
    setRendering(false); setProgress(0);
  }, []);

  const downloadRender = useCallback(() => {
    if (!preview) return;
    const a = document.createElement('a'); a.href=preview;
    a.download=`spx_pathrender_${Date.now()}.png`; a.click();
  }, [preview]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fpt-panel">
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fpt-dot"/>
        <span className="spx-float-panel__title fpt-title">PATH TRACER</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="RENDER SETTINGS" accent="yellow">
          <Slider label="SAMPLES" value={samples} min={16} max={2048} step={16} onChange={setSamples}/>
          <Slider label="BOUNCES" value={bounces} min={1}  max={32}   step={1}  onChange={setBounces}/>
          <div className="fpt-res-list">
            {RESOLUTIONS.map((res, i) => (
              <button key={i} className={`fpt-res-item${resolution===i?' fpt-res-item--active':''}`} onClick={()=>setResolution(i)}>
                <span>{res.label}</span>
                <span className="fpt-res-dims">{res.w}×{res.h}</span>
              </button>
            ))}
          </div>
          <Toggle label="GLOBAL ILLUMINATION" value={gi}       onChange={setGi}/>
          <Toggle label="CAUSTICS"             value={caustics} onChange={setCaustics}/>
          <Toggle label="DENOISE"              value={denoise}  onChange={setDenoise}/>
        </Section>

        {rendering && (
          <div className="fpt-progress-wrap">
            <div className="fpt-progress-hdr">
              <span>RENDERING...</span>
              <span className="fpt-progress-val">{progress}%</span>
            </div>
            <div className="fpt-progress-bar">
              <div className="fpt-progress-fill" style={{ width:`${progress}%` }}/>
            </div>
          </div>
        )}

        {preview && <img src={preview} className="fpt-preview" alt="path trace preview"/>}
        {renderTime && <div className="fpt-render-time">Rendered in {renderTime}s</div>}

        <div className="fpt-action-grid">
          {!rendering
            ? <button className="fpt-render-btn fpt-render-btn--start"  onClick={startRender}>▶ RENDER</button>
            : <button className="fpt-render-btn fpt-render-btn--cancel" onClick={cancelRender}>■ CANCEL</button>
          }
          <button className="fpt-render-btn fpt-render-btn--save" onClick={downloadRender} disabled={!preview}>↓ SAVE</button>
        </div>
      </div>
    </div>
  );
}
