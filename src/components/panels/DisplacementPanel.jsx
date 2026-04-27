import React, { useState, useCallback, useEffect, useRef} from 'react';
import * as THREE from 'three';
import '../../styles/panel-components.css';

function Slider({ label, value, min, max, step=0.01, onChange, unit='' }) {
  return (
    <div className="spx-slider-wrap">
      <div className="spx-slider-header">
        <span>{label}</span>
        <span className="spx-slider-header__val">
          {step<0.1 ? Number(value).toFixed(2) : Math.round(value)}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        className="spx-slider-input"
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function Section({ title, children, defaultOpen=true, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spx-section">
      <div
        className={`spx-section__hdr${accent ? ` spx-section__hdr--${accent}` : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className={`spx-section__arrow${accent ? ` spx-section__arrow--${accent}` : ''}`}>
          {open ? '▾' : '▸'}
        </span>
        <span className="spx-section__title">{title}</span>
      </div>
      {open && <div className="spx-section__body spx-section__body--padleft">{children}</div>}
    </div>
  );
}

const DISP_PRESETS = [
  { label:'Skin Pores', pattern:'noise', scale:40, strength:0.02, octaves:6 },
  { label:'Rock',       pattern:'fbm',   scale:8,  strength:0.15, octaves:8 },
  { label:'Terrain',    pattern:'fbm',   scale:3,  strength:0.4,  octaves:6 },
  { label:'Waves',      pattern:'waves', scale:10, strength:0.08, octaves:2 },
  { label:'Fabric',     pattern:'weave', scale:20, strength:0.03, octaves:2 },
  { label:'Brick',      pattern:'brick', scale:5,  strength:0.05, octaves:1 },
];

const PATTERNS = ['noise','fbm','waves','weave','brick'];

function generateHeightmap(w, h, pattern, scale, octaves, seed) {
  const data = new Float32Array(w*h);
  const hash = (x,y) => { let v = Math.sin(x*127.1+y*311.7)*43758.5453; return v-Math.floor(v); };
  const noise = (x,y) => {
    const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy;
    const ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy);
    return hash(ix,iy)*(1-ux)*(1-uy)+hash(ix+1,iy)*ux*(1-uy)+hash(ix,iy+1)*(1-ux)*uy+hash(ix+1,iy+1)*ux*uy;
  };
  const fbm = (x,y,oct) => { let v=0,a=0.5,f=1; for(let i=0;i<oct;i++){v+=a*noise(x*f+seed,y*f+seed);a*=0.5;f*=2;} return v; };
  for (let y=0; y<h; y++) {
    for (let x=0; x<w; x++) {
      const nx=x/w*scale, ny=y/h*scale; let v=0;
      if (pattern==='noise'||pattern==='fbm') v=fbm(nx,ny,octaves);
      else if (pattern==='waves') v=(Math.sin(nx*6.28)+Math.sin(ny*6.28))*0.5;
      else if (pattern==='weave') v=Math.abs(Math.sin(nx*6.28)*Math.cos(ny*6.28));
      else if (pattern==='brick') { const bx=nx%1,by=ny%1,off=(Math.floor(ny))%2*0.5; v=(bx+off)%1<0.9&&by>0.1&&by<0.9?0:1; }
      data[y*w+x]=v;
    }
  }
  return data;
}

export default function DisplacementPanel({ meshRef, open=true, onClose }) {
  const [pattern,   setPattern]   = useState('fbm');
  const [scale,     setScale]     = useState(8);
  const [strength,  setStrength]  = useState(0.15);
  const [octaves,   setOctaves]   = useState(6);
  const [midlevel,  setMidlevel]  = useState(0.5);
  const [seed,      setSeed]      = useState(42);
  const [imageUrl,  setImageUrl]  = useState(null);
  const [status,    setStatus]    = useState('');

  const applyDisplacement = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh || !mesh.geometry) { setStatus('No mesh'); return; }
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    if (!geo.userData.origPositions) geo.userData.origPositions = new Float32Array(pos.array);
    const orig = geo.userData.origPositions;
    if (!geo.attributes.normal) geo.computeVertexNormals();

    const applyHeightmap = (hmap, w, h) => {
      for (let i=0; i<pos.count; i++) {
        const ox=orig[i*3], oy=orig[i*3+1], oz=orig[i*3+2];
        const nx=geo.attributes.normal.getX(i);
        const ny=geo.attributes.normal.getY(i);
        const nz=geo.attributes.normal.getZ(i);
        const u=geo.attributes.uv ? geo.attributes.uv.getX(i) : 0.5;
        const v=geo.attributes.uv ? geo.attributes.uv.getY(i) : 0.5;
        const hx=Math.min(Math.floor(u*w), w-1);
        const hy=Math.min(Math.floor(v*h), h-1);
        const hval=(hmap[hy*w+hx]-midlevel)*strength;
        pos.setXYZ(i, ox+nx*hval, oy+ny*hval, oz+nz*hval);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      setStatus('Applied: '+pos.count+' verts displaced');
    };

    if (imageUrl) {
      const img = new Image(); img.src = imageUrl;
      img.onload = () => {
        const c = document.createElement('canvas'); c.width=img.width; c.height=img.height;
        const ctx = c.getContext('2d'); ctx.drawImage(img,0,0);
        const d = ctx.getImageData(0,0,c.width,c.height).data;
        const hmap = new Float32Array(c.width*c.height);
        for (let i=0; i<hmap.length; i++) hmap[i]=(d[i*4]+d[i*4+1]+d[i*4+2])/(3*255);
        applyHeightmap(hmap, c.width, c.height);
      };
    } else {
      const hmap = generateHeightmap(256,256,pattern,scale,octaves,seed);
      applyHeightmap(hmap,256,256);
    }
  }, [meshRef, pattern, scale, strength, octaves, midlevel, seed, imageUrl]);

  const resetDisplacement = useCallback(() => {
    const mesh = meshRef?.current; if (!mesh?.geometry) return;
    const geo = mesh.geometry; const orig = geo.userData.origPositions; if (!orig) return;
    const pos = geo.attributes.position;
    for (let i=0; i<pos.count; i++) pos.setXYZ(i, orig[i*3], orig[i*3+1], orig[i*3+2]);
    pos.needsUpdate = true; geo.computeVertexNormals(); setStatus('Reset');
  }, [meshRef]);

  if (!open) return null;

  return (
    <div className="spx-float-panel">
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot spx-float-panel__dot--gold" />
        <span className="spx-float-panel__title spx-float-panel__title--gold">DISPLACEMENT</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      {status && <div className="spx-float-panel__status">{status}</div>}

      <div className="spx-float-panel__body">
        <Section title="PRESETS" accent="gold">
          <div className="spx-preset-grid">
            {DISP_PRESETS.map(p => (
              <button
                key={p.label}
                className="spx-preset-card"
                onClick={() => { setPattern(p.pattern); setScale(p.scale); setStrength(p.strength); setOctaves(p.octaves); }}
              >{p.label}</button>
            ))}
          </div>
        </Section>

        <Section title="PROCEDURAL">
          <div className="spx-pattern-chips">
            {PATTERNS.map(p => (
              <button
                key={p}
                className={`spx-pattern-chip${pattern===p ? ' spx-pattern-chip--active' : ''}`}
                onClick={() => setPattern(p)}
              >{p}</button>
            ))}
          </div>
          <Slider label="SCALE"    value={scale}    min={1}  max={50}  step={0.5} onChange={setScale}    />
          <Slider label="STRENGTH" value={strength} min={0}  max={2}   step={0.01} onChange={setStrength} />
          <Slider label="OCTAVES"  value={octaves}  min={1}  max={12}  step={1}   onChange={setOctaves}  />
          <Slider label="MIDLEVEL" value={midlevel} min={0}  max={1}   step={0.01} onChange={setMidlevel} />
          <Slider label="SEED"     value={seed}     min={0}  max={999} step={1}   onChange={setSeed}     />
        </Section>

        <Section title="IMAGE MAP" accent="orange" defaultOpen={false}>
          <label className="spx-upload-zone">
            <input
              type="file" accept="image/*"
              className="spx-file-input-hidden"
              onChange={e => {
                const f = e.target.files[0];
                if (!f) return;
                // Revoke previous blob URL to prevent memory leak
                if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
                const url = URL.createObjectURL(f);
                imageUrlRef.current = url;
                setImageUrl(url);
              }}
            />
            {imageUrl ? '✓ Image loaded' : '📁 Load Height Map'}
          </label>
          {imageUrl && (
            <button className="spx-upload-clear" onClick={() => {
              if (imageUrlRef.current) {
                URL.revokeObjectURL(imageUrlRef.current);
                imageUrlRef.current = null;
              }
              setImageUrl(null);
            }}>CLEAR IMAGE</button>
          )}
        </Section>

        <div className="spx-action-grid">
          <button className="spx-action-btn spx-action-btn--gold" onClick={applyDisplacement}>DISPLACE</button>
          <button className="spx-action-btn spx-action-btn--muted" onClick={resetDisplacement}>RESET</button>
        </div>
      </div>
    </div>
  );
}
