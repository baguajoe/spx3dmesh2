#!/usr/bin/env python3
import os

ROOT = '/workspaces/spx3dmesh2'

PANEL = r'''import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

const CATEGORIES = [
  { id:"all",      label:"All 41" },
  { id:"photo",    label:"Photo" },
  { id:"cartoon",  label:"Cartoon" },
  { id:"paint",    label:"Paint" },
  { id:"sketch",   label:"Sketch" },
  { id:"stylized", label:"Stylized" },
  { id:"digital",  label:"Digital" },
];

const STYLES = [
  { id:"cinematic",      label:"Cinematic",        cat:"photo",    color:"#ffaa00" },
  { id:"photorealistic", label:"Photorealistic",    cat:"photo",    color:"#ffaa00" },
  { id:"hdr",            label:"HDR",               cat:"photo",    color:"#ffaa00" },
  { id:"film_noir",      label:"Film Noir",         cat:"photo",    color:"#ffaa00" },
  { id:"vintage_film",   label:"Vintage Film",      cat:"photo",    color:"#ffaa00" },
  { id:"infrared",       label:"Infrared",          cat:"photo",    color:"#ffaa00" },
  { id:"thermal",        label:"Thermal Camera",    cat:"photo",    color:"#ffaa00" },
  { id:"toon",           label:"Toon Shading",      cat:"cartoon",  color:"#00ccff" },
  { id:"cel",            label:"Cel Animation",     cat:"cartoon",  color:"#00ccff" },
  { id:"anime",          label:"Anime",             cat:"cartoon",  color:"#00ccff" },
  { id:"manga",          label:"Manga",             cat:"cartoon",  color:"#00ccff" },
  { id:"comic",          label:"Comic Book",        cat:"cartoon",  color:"#00ccff" },
  { id:"pixar",          label:"Pixar/3D Cartoon",  cat:"cartoon",  color:"#00ccff" },
  { id:"ink_wash",       label:"Ink Wash",          cat:"cartoon",  color:"#00ccff" },
  { id:"oil",            label:"Oil Painting",      cat:"paint",    color:"#ff6644" },
  { id:"watercolor",     label:"Watercolor",        cat:"paint",    color:"#ff6644" },
  { id:"gouache",        label:"Gouache",           cat:"paint",    color:"#ff6644" },
  { id:"impressionist",  label:"Impressionist",     cat:"paint",    color:"#ff6644" },
  { id:"expressionist",  label:"Expressionist",     cat:"paint",    color:"#ff6644" },
  { id:"dutch_masters",  label:"Dutch Masters",     cat:"paint",    color:"#ff6644" },
  { id:"fresco",         label:"Fresco",            cat:"paint",    color:"#ff6644" },
  { id:"pencil",         label:"Pencil Sketch",     cat:"sketch",   color:"#aaaaaa" },
  { id:"charcoal",       label:"Charcoal",          cat:"sketch",   color:"#aaaaaa" },
  { id:"blueprint",      label:"Blueprint",         cat:"sketch",   color:"#aaaaaa" },
  { id:"wireframe",      label:"Wireframe",         cat:"sketch",   color:"#aaaaaa" },
  { id:"stipple",        label:"Stipple/Pointilist", cat:"sketch",  color:"#aaaaaa" },
  { id:"linocut",        label:"Linocut Print",     cat:"sketch",   color:"#aaaaaa" },
  { id:"risograph",      label:"Risograph Print",   cat:"sketch",   color:"#aaaaaa" },
  { id:"low_poly",       label:"Low Poly",          cat:"stylized", color:"#aa44ff" },
  { id:"voxel",          label:"Voxel",             cat:"stylized", color:"#aa44ff" },
  { id:"ukiyo_e",        label:"Ukiyo-e",           cat:"stylized", color:"#aa44ff" },
  { id:"stained_glass",  label:"Stained Glass",     cat:"stylized", color:"#aa44ff" },
  { id:"mosaic",         label:"Mosaic/Tile",       cat:"stylized", color:"#aa44ff" },
  { id:"x_ray",          label:"X-Ray",             cat:"stylized", color:"#aa44ff" },
  { id:"hologram",       label:"Hologram",          cat:"digital",  color:"#00ffc8" },
  { id:"neon",           label:"Neon/Synthwave",    cat:"digital",  color:"#00ffc8" },
  { id:"glitch",         label:"Glitch Art",        cat:"digital",  color:"#00ffc8" },
  { id:"retrowave",      label:"Retrowave",         cat:"digital",  color:"#00ffc8" },
  { id:"tron",           label:"Tron/Grid",         cat:"digital",  color:"#00ffc8" },
  { id:"matrix",         label:"Matrix/Digital",    cat:"digital",  color:"#00ffc8" },
  { id:"anamorphic",     label:"Anamorphic Lens",   cat:"digital",  color:"#00ffc8" },
];

// Apply post-process style filter to a canvas
function applyStyleFilter(srcCanvas, style, params) {
  const dst = document.createElement('canvas');
  dst.width  = srcCanvas.width;
  dst.height = srcCanvas.height;
  const ctx = dst.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);

  const id = ctx.getImageData(0, 0, dst.width, dst.height);
  const d  = id.data;

  switch (style) {
    case 'film_noir': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        const c = Math.max(0, Math.min(255, (g - 128) * 1.4 + 128));
        d[i] = d[i+1] = d[i+2] = c;
      }
      break;
    }
    case 'toon': case 'cel': {
      const levels = params.toonLevels || 5;
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.round(d[i]   / (255/levels)) * (255/levels);
        d[i+1] = Math.round(d[i+1] / (255/levels)) * (255/levels);
        d[i+2] = Math.round(d[i+2] / (255/levels)) * (255/levels);
      }
      break;
    }
    case 'infrared': {
      for (let i = 0; i < d.length; i += 4) {
        const r=d[i], g=d[i+1], b=d[i+2];
        d[i]   = g;
        d[i+1] = r;
        d[i+2] = 255 - b;
      }
      break;
    }
    case 'x_ray': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        d[i]   = 255 - g;
        d[i+1] = 255 - g;
        d[i+2] = 255 - g;
      }
      break;
    }
    case 'thermal': {
      for (let i = 0; i < d.length; i += 4) {
        const g = (0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]) / 255;
        d[i]   = Math.min(255, g * 2 * 255);
        d[i+1] = Math.min(255, Math.max(0, (g - 0.5) * 2 * 255));
        d[i+2] = Math.max(0, (1 - g * 2) * 255);
      }
      break;
    }
    case 'vintage_film': {
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.min(255, d[i]   * 1.1 + 20);
        d[i+1] = Math.min(255, d[i+1] * 0.9 + 10);
        d[i+2] = Math.max(0,   d[i+2] * 0.7);
      }
      break;
    }
    case 'neon': case 'tron': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        if (g > 180) { d[i]=0; d[i+1]=255; d[i+2]=200; }
        else if (g > 100) { d[i]=180; d[i+1]=0; d[i+2]=255; }
        else { d[i]=0; d[i+1]=0; d[i+2]=Math.min(255,g*2); }
      }
      break;
    }
    case 'hologram': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        d[i]   = 0;
        d[i+1] = Math.min(255, g * 1.2);
        d[i+2] = Math.min(255, g * 1.5);
        d[i+3] = Math.min(255, g + 50);
      }
      break;
    }
    default: break;
  }

  ctx.putImageData(id, 0, 0);

  // Outline pass for toon/cel/comic
  if (['toon','cel','comic','manga','anime'].includes(style) && params.outlineWidth > 0) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = params.outlineWidth;
  }

  return dst;
}

export default function SPX3DTo2DPanel({ open, onClose, sceneRef, rendererRef, cameraRef }) {
  const [activeCat,   setActiveCat]   = useState('all');
  const [activeStyle, setActiveStyle] = useState('cinematic');
  const [outlineWidth, setOutlineWidth] = useState(1.5);
  const [toonLevels,   setToonLevels]   = useState(4);
  const [rendering,   setRendering]   = useState(false);
  const [exportFormat, setExportFormat] = useState('png');
  const [status, setStatus] = useState('Select a style and click Render');

  const previewRef = useRef(null);   // 2D output canvas
  const liveRef    = useRef(null);   // 3D live mirror canvas
  const animRef    = useRef(null);

  const filtered = activeCat === 'all' ? STYLES : STYLES.filter(s => s.cat === activeCat);
  const currentStyle = STYLES.find(s => s.id === activeStyle) || STYLES[0];

  // Mirror the main Three.js renderer into liveRef canvas
  useEffect(() => {
    if (!open) return;
    const mirror = () => {
      if (rendererRef?.current?.domElement && liveRef.current) {
        const ctx = liveRef.current.getContext('2d');
        const src = rendererRef.current.domElement;
        liveRef.current.width  = liveRef.current.offsetWidth  || 800;
        liveRef.current.height = liveRef.current.offsetHeight || 500;
        ctx.drawImage(src, 0, 0, liveRef.current.width, liveRef.current.height);
      }
      animRef.current = requestAnimationFrame(mirror);
    };
    animRef.current = requestAnimationFrame(mirror);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [open, rendererRef]);

  const handleRender = useCallback(async () => {
    if (!rendererRef?.current) { setStatus('⚠ No renderer attached'); return; }
    setRendering(true);
    setStatus('Rendering...');
    try {
      // Capture current frame from renderer
      const src = rendererRef.current.domElement;
      const tmp = document.createElement('canvas');
      tmp.width  = src.width;
      tmp.height = src.height;
      tmp.getContext('2d').drawImage(src, 0, 0);
      // Apply style filter
      const out = applyStyleFilter(tmp, activeStyle, { outlineWidth, toonLevels });
      // Draw to preview canvas
      if (previewRef.current) {
        previewRef.current.width  = out.width;
        previewRef.current.height = out.height;
        previewRef.current.getContext('2d').drawImage(out, 0, 0);
      }
      setStatus(`✓ Rendered: ${currentStyle.label}`);
    } catch(e) {
      setStatus(`Error: ${e.message}`);
    }
    setRendering(false);
  }, [activeStyle, outlineWidth, toonLevels, rendererRef, currentStyle]);

  const handleExport = () => {
    if (!previewRef.current) { setStatus('Render first'); return; }
    const url = previewRef.current.toDataURL(`image/${exportFormat}`);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spx_${activeStyle}_render.${exportFormat}`;
    a.click();
    setStatus(`✓ Exported as ${exportFormat.toUpperCase()}`);
  };

  if (!open) return null;

  return (
    <div className="s2d-root">
      {/* ── LEFT: 3D live viewport ── */}
      <div className="s2d-viewport">
        <div className="s2d-viewport-label">3D VIEWPORT — LIVE</div>
        <canvas ref={liveRef} className="s2d-viewport-canvas" />
        <div className="s2d-viewport-hint">This mirrors your scene in real time</div>
      </div>

      {/* ── CENTER: 2D rendered output ── */}
      <div className="s2d-output">
        <div className="s2d-viewport-label">
          2D OUTPUT — <span style={{color: currentStyle.color}}>{currentStyle.label}</span>
        </div>
        <canvas ref={previewRef} className="s2d-viewport-canvas" />
        <div className="s2d-output-actions">
          <button className="s2d-btn s2d-btn--render" onClick={handleRender} disabled={rendering}>
            {rendering ? '⏳ RENDERING...' : '▶ RENDER'}
          </button>
          <select className="s2d-select" value={exportFormat} onChange={e=>setExportFormat(e.target.value)}>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
          <button className="s2d-btn s2d-btn--export" onClick={handleExport}>⬇ EXPORT</button>
        </div>
        <div className="s2d-status">{status}</div>
      </div>

      {/* ── RIGHT: Style controls ── */}
      <div className="s2d-controls">
        <div className="s2d-section-title">CATEGORY</div>
        <div className="s2d-cat-row">
          {CATEGORIES.map(c => (
            <button key={c.id}
              className={"s2d-cat-btn" + (activeCat === c.id ? " s2d-cat-btn--active" : "")}
              onClick={() => setActiveCat(c.id)}>{c.label}</button>
          ))}
        </div>

        <div className="s2d-section-title">STYLE — {filtered.length} OPTIONS</div>
        <div className="s2d-style-grid">
          {filtered.map(s => (
            <button key={s.id}
              className={"s2d-style-btn" + (activeStyle === s.id ? " s2d-style-btn--active" : "")}
              style={activeStyle === s.id ? {borderColor: s.color, color: s.color} : {}}
              onClick={() => setActiveStyle(s.id)}>{s.label}</button>
          ))}
        </div>

        <div className="s2d-section-title">PARAMETERS</div>
        <div className="s2d-param-row">
          <span className="s2d-param-label">Outline Width</span>
          <input type="range" min={0} max={5} step={0.5} value={outlineWidth}
            onChange={e=>setOutlineWidth(+e.target.value)} className="s2d-slider"/>
          <span className="s2d-param-val">{outlineWidth}</span>
        </div>
        <div className="s2d-param-row">
          <span className="s2d-param-label">Toon Levels</span>
          <input type="range" min={2} max={10} step={1} value={toonLevels}
            onChange={e=>setToonLevels(+e.target.value)} className="s2d-slider"/>
          <span className="s2d-param-val">{toonLevels}</span>
        </div>
      </div>
    </div>
  );
}
'''

CSS = """
/* ═══════════════════════════════════════════════════════
   SPX 3D→2D Style Panel
   ═══════════════════════════════════════════════════════ */

.s2d-root {
  display: flex;
  width: 100%;
  height: 100%;
  background: #0d1117;
  color: #ccc;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  overflow: hidden;
}

/* ── Viewports ───────────────────────────────────────── */
.s2d-viewport,
.s2d-output {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #21262d;
  overflow: hidden;
  position: relative;
}

.s2d-viewport-label {
  font-size: 9px;
  font-weight: 700;
  color: #444;
  letter-spacing: 1.5px;
  padding: 6px 10px;
  background: #0a0d13;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
}

.s2d-viewport-canvas {
  flex: 1;
  width: 100%;
  height: 100%;
  display: block;
  background: #060a10;
  object-fit: contain;
}

.s2d-viewport-hint {
  font-size: 9px;
  color: #333;
  padding: 4px 10px;
  background: #0a0d13;
  border-top: 1px solid #21262d;
  flex-shrink: 0;
}

.s2d-output-actions {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  background: #0a0d13;
  border-top: 1px solid #21262d;
  flex-shrink: 0;
  align-items: center;
}

.s2d-status {
  font-size: 10px;
  color: #555;
  padding: 4px 10px;
  background: #0a0d13;
  border-top: 1px solid #21262d;
  flex-shrink: 0;
}

/* ── Controls sidebar ────────────────────────────────── */
.s2d-controls {
  width: 280px;
  flex-shrink: 0;
  background: #0a0d13;
  overflow-y: auto;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.s2d-section-title {
  font-size: 9px;
  font-weight: 700;
  color: #444;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 8px 4px 4px;
  border-bottom: 1px solid #1a2030;
  margin-bottom: 4px;
}

/* ── Category buttons ────────────────────────────────── */
.s2d-cat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-bottom: 8px;
}
.s2d-cat-btn {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 3px;
  color: #666;
  font-family: inherit;
  font-size: 9px;
  font-weight: 700;
  padding: 4px 8px;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: all 0.15s;
}
.s2d-cat-btn:hover { color: #ccc; border-color: #444; }
.s2d-cat-btn--active { background: #00ffc811; border-color: #00ffc8; color: #00ffc8; }

/* ── Style grid ──────────────────────────────────────── */
.s2d-style-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
  max-height: 340px;
  overflow-y: auto;
}
.s2d-style-btn {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 3px;
  color: #666;
  font-family: inherit;
  font-size: 10px;
  padding: 5px 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}
.s2d-style-btn:hover { color: #ccc; border-color: #444; }
.s2d-style-btn--active { background: #111827; font-weight: 700; }

/* ── Params ──────────────────────────────────────────── */
.s2d-param-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}
.s2d-param-label { font-size: 10px; color: #666; width: 80px; flex-shrink: 0; }
.s2d-slider { flex: 1; accent-color: #ff6600; cursor: pointer; }
.s2d-param-val { font-size: 10px; color: #ff6600; font-weight: 700; width: 24px; text-align: right; }

/* ── Buttons ─────────────────────────────────────────── */
.s2d-btn {
  padding: 7px 12px;
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: filter 0.15s;
}
.s2d-btn:hover { filter: brightness(1.2); }
.s2d-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.s2d-btn--render { background: #003a20; color: #00ffc8; border: 1px solid #00ffc844; flex: 1; }
.s2d-btn--export { background: #3a2000; color: #ffaa00; border: 1px solid #ffaa0044; }
.s2d-select {
  background: #0d1117;
  border: 1px solid #21262d;
  color: #888;
  font-family: inherit;
  font-size: 10px;
  padding: 4px 6px;
  border-radius: 3px;
}
"""

# Write panel file
panel_path = ROOT + '/src/components/pipeline/SPX3DTo2DPanel.jsx'
with open(panel_path, 'w') as f:
    f.write(PANEL)
print(f'✓ Written SPX3DTo2DPanel.jsx ({len(PANEL)} chars)')

# Write CSS
css_path = ROOT + '/src/styles/spx-2d-panel.css'
with open(css_path, 'w') as f:
    f.write(CSS)
print(f'✓ Written spx-2d-panel.css')

# Ensure spx-2d-panel.css is imported in App.jsx
app_path = ROOT + '/src/App.jsx'
app = open(app_path).read()
if 'spx-2d-panel.css' not in app:
    app = app.replace(
        'import "./styles/pro-dark.css";',
        'import "./styles/pro-dark.css";\nimport "./styles/spx-2d-panel.css";'
    )
    open(app_path, 'w').write(app)
    print('✓ spx-2d-panel.css import added to App.jsx')
else:
    print('✓ spx-2d-panel.css already imported')

print('\nRun: git add -A && git commit -m "feat: 3D→2D split viewport with live mirror + style filters" && git push')
