import React, { useState, useRef } from "react";
import { CINEMATIC_STYLES, SPX3DTo2DRenderer } from "../../pipeline/SPX3DTo2DPipeline";
import "../../styles/panel-components.css";
import "../../styles/spx-2d-panel.css";

const CATEGORIES = [
  { id:"photo",    label:"Photo",    color:"#4a9eff" },
  { id:"cartoon",  label:"Cartoon",  color:"#ff6b6b" },
  { id:"paint",    label:"Paint",    color:"#ffd93d" },
  { id:"sketch",   label:"Sketch",   color:"#c3cfe2" },
  { id:"stylized", label:"Stylized", color:"#a29bfe" },
  { id:"all",      label:"All 41",   color:"#00ffc8" },
];

const ALL_STYLES = Object.values(CINEMATIC_STYLES);

export default function SPX3DTo2DPanel({ open, onClose, sceneRef, rendererRef, cameraRef }) {
  const [activeStyle,    setActiveStyle]    = useState("cinematic");
  const [activeCategory, setActiveCategory] = useState("all");
  const [rendering,      setRendering]      = useState(false);
  const [status,         setStatus]         = useState("");
  const [outlineWidth,   setOutlineWidth]   = useState(1.5);
  const [toonLevels,     setToonLevels]     = useState(4);
  const [exportFormat,   setExportFormat]   = useState("png");

  const canvasRef = useRef(null);

  const filtered = activeCategory==="all"
    ? ALL_STYLES
    : ALL_STYLES.filter(s=>s.category===activeCategory);

  const currentStyle = CINEMATIC_STYLES[activeStyle] || ALL_STYLES[0];

  const handleRender = async () => {
    if(!sceneRef?.current||!rendererRef?.current||!cameraRef?.current){ setStatus("⚠ No scene attached"); return; }
    setRendering(true); setStatus("Rendering...");
    try {
      const renderer = new SPX3DTo2DRenderer(rendererRef.current, { style:activeStyle, outlineWidth, toonLevels });
      const canvas = await renderer.render(sceneRef.current, cameraRef.current);
      if(canvasRef.current&&canvas){
        const ctx=canvasRef.current.getContext("2d");
        canvasRef.current.width=canvas.width; canvasRef.current.height=canvas.height;
        ctx.drawImage(canvas,0,0);
      }
      setStatus(`✓ Rendered: ${currentStyle.name}`);
    } catch(e){ setStatus(`Error: ${e.message}`); }
    setRendering(false);
  };

  const handleExport = () => {
    if(!canvasRef.current){ setStatus("Render first"); return; }
    const url=canvasRef.current.toDataURL(`image/${exportFormat}`);
    const a=document.createElement("a"); a.href=url; a.download=`spx_${activeStyle}_render.${exportFormat}`; a.click();
    setStatus(`✓ Exported as ${exportFormat.toUpperCase()}`);
  };

  if(!open) return null;

  return (
    <div className="s2d-panel">
      <div className="s2d-header">
        <span className="s2d-header__title">🎬 3D → 2D STYLE</span>
        <button className="s2d-header__close" onClick={onClose}>✕</button>
      </div>

      <div className="s2d-body">

        {/* Category filter */}
        <div className="s2d-section">
          <div className="s2d-section-title">Category</div>
          <div className="s2d-cat-row">
            {CATEGORIES.map(cat=>(
              <button key={cat.id}
                className={`s2d-cat-btn${activeCategory===cat.id?' s2d-cat-btn--active':''}`}
                style={activeCategory===cat.id?{background:cat.color,color:'#06060f',borderColor:cat.color}:{borderColor:'var(--border)'}}
                onClick={()=>setActiveCategory(cat.id)}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style grid */}
        <div className="s2d-section">
          <div className="s2d-section-title">Style — {filtered.length} options</div>
          <div className="s2d-style-grid">
            {filtered.map(style=>(
              <button key={style.id}
                className={`s2d-style-btn${activeStyle===style.id?' s2d-style-btn--active':''}`}
                onClick={()=>setActiveStyle(style.id)}>
                {style.name}
              </button>
            ))}
          </div>
        </div>

        {/* Active style info */}
        {currentStyle && (
          <div className="s2d-style-info">
            <div className="s2d-style-info__name">{currentStyle.name}</div>
            <div className="s2d-style-info__tags">
              {currentStyle.outline    && <span className="s2d-tag s2d-tag--teal">Outline</span>}
              {currentStyle.toon       && <span className="s2d-tag s2d-tag--red">Toon</span>}
              {currentStyle.shadows    && <span className="s2d-tag s2d-tag--yellow">Shadows</span>}
              {currentStyle.ao         && <span className="s2d-tag s2d-tag--purple">AO</span>}
              {currentStyle.paintStroke&& <span className="s2d-tag s2d-tag--orange">Paint</span>}
              {currentStyle.sketch     && <span className="s2d-tag s2d-tag--light">Sketch</span>}
              {currentStyle.halftone   && <span className="s2d-tag s2d-tag--red">Halftone</span>}
              {currentStyle.neon       && <span className="s2d-tag s2d-tag--neon">Neon</span>}
              {currentStyle.voxel      && <span className="s2d-tag s2d-tag--teal">Voxel</span>}
            </div>
            {currentStyle.filter!=="none" && (
              <div className="s2d-style-info__filter">filter: {currentStyle.filter}</div>
            )}
          </div>
        )}

        {/* Parameters */}
        <div className="s2d-section">
          <div className="s2d-section-title">Parameters</div>
          <div className="s2d-param-row">
            <span className="s2d-param-label">Outline Width</span>
            <input type="range" min={0.5} max={4} step={0.5} value={outlineWidth}
              className="s2d-param-slider" onChange={e=>setOutlineWidth(parseFloat(e.target.value))}/>
            <span className="s2d-param-val">{outlineWidth}</span>
          </div>
          <div className="s2d-param-row">
            <span className="s2d-param-label">Toon Levels</span>
            <input type="range" min={2} max={8} step={1} value={toonLevels}
              className="s2d-param-slider" onChange={e=>setToonLevels(parseInt(e.target.value))}/>
            <span className="s2d-param-val">{toonLevels}</span>
          </div>
        </div>

        {/* GLB import */}
        <div className="s2d-import-row">
          <label className="s2d-btn s2d-btn--orange s2d-label-btn">
            ↑ Load GLB
            <input type="file" accept=".glb,.gltf" className="spx-hidden"
              onChange={e=>{
                const file=e.target.files[0]; if(!file) return;
                window.dispatchEvent(new CustomEvent("spx:importGLB",{detail:{url:URL.createObjectURL(file),name:file.name}}));
                setStatus("✓ Loaded: "+file.name);
              }}/>
          </label>
        </div>

        <canvas ref={canvasRef} className="s2d-preview" width={320} height={180}/>

        {/* Actions */}
        <div className="s2d-actions">
          <button className="s2d-btn s2d-btn--teal" onClick={handleRender} disabled={rendering}>
            {rendering?"⏳ Rendering...":"▶ Render"}
          </button>
          <button className="s2d-btn s2d-btn--orange" onClick={handleExport}>⬇ Export</button>
          <select className="s2d-select" value={exportFormat} onChange={e=>setExportFormat(e.target.value)}>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </div>

        {status && <div className="s2d-status">{status}</div>}
      </div>
    </div>
  );
}
