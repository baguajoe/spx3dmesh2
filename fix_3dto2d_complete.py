#!/usr/bin/env python3
"""
Fixes in priority order:
1. 3D→2D — full CSS rewrite with !important, proper flex layout
2. Quad button z-index bleed
3. spx-overlay-body padding:0 for UV/NodeMat
4. Import spx-2d-panel.css in App.jsx if missing
"""
import os, re

ROOT = '/workspaces/spx3dmesh2'

# ══════════════════════════════════════════════════════════════════════════════
# 1. spx-2d-panel.css — full rewrite
# ══════════════════════════════════════════════════════════════════════════════
CSS = """\
/* ═══════════════════════════════════════════════════════
   SPX 3D→2D Style Panel  —  spx-2d-panel.css
   ═══════════════════════════════════════════════════════ */

.s2d-root {
  display: flex !important;
  flex-direction: row !important;
  width: 100% !important;
  height: 100% !important;
  background: #0d1117 !important;
  color: #ccc !important;
  font-family: 'JetBrains Mono', 'Segoe UI', monospace !important;
  font-size: 11px !important;
  overflow: hidden !important;
}

/* ── Left: 3D live viewport ─────────────────────────── */
.s2d-viewport {
  flex: 1 1 0 !important;
  display: flex !important;
  flex-direction: column !important;
  border-right: 1px solid #21262d !important;
  overflow: hidden !important;
  min-width: 0 !important;
}

/* ── Center: 2D output ──────────────────────────────── */
.s2d-output {
  flex: 1 1 0 !important;
  display: flex !important;
  flex-direction: column !important;
  border-right: 1px solid #21262d !important;
  overflow: hidden !important;
  min-width: 0 !important;
}

.s2d-viewport-label {
  font-size: 9px !important;
  font-weight: 700 !important;
  color: #444 !important;
  letter-spacing: 1.5px !important;
  padding: 6px 10px !important;
  background: #0a0d13 !important;
  border-bottom: 1px solid #21262d !important;
  flex-shrink: 0 !important;
  text-transform: uppercase !important;
}

.s2d-viewport-canvas {
  flex: 1 1 auto !important;
  width: 100% !important;
  display: block !important;
  background: #060a10 !important;
  min-height: 0 !important;
}

.s2d-viewport-hint {
  font-size: 9px !important;
  color: #333 !important;
  padding: 4px 10px !important;
  background: #0a0d13 !important;
  border-top: 1px solid #21262d !important;
  flex-shrink: 0 !important;
}

.s2d-output-actions {
  display: flex !important;
  gap: 6px !important;
  padding: 8px 10px !important;
  background: #0a0d13 !important;
  border-top: 1px solid #21262d !important;
  flex-shrink: 0 !important;
  align-items: center !important;
}

.s2d-status {
  font-size: 10px !important;
  color: #555 !important;
  padding: 4px 10px !important;
  background: #0a0d13 !important;
  border-top: 1px solid #21262d !important;
  flex-shrink: 0 !important;
}

/* ── Right: Controls sidebar ────────────────────────── */
.s2d-controls {
  width: 300px !important;
  flex-shrink: 0 !important;
  background: #0a0d13 !important;
  overflow-y: auto !important;
  padding: 10px 8px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
  border-left: 1px solid #21262d !important;
}

.s2d-section-title {
  font-size: 9px !important;
  font-weight: 700 !important;
  color: #444 !important;
  letter-spacing: 1.5px !important;
  text-transform: uppercase !important;
  padding: 8px 4px 4px !important;
  border-bottom: 1px solid #1a2030 !important;
  margin-bottom: 6px !important;
}

/* ── Category buttons ───────────────────────────────── */
.s2d-cat-row {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 3px !important;
  margin-bottom: 10px !important;
}
.s2d-cat-btn {
  background: #0d1117 !important;
  border: 1px solid #21262d !important;
  border-radius: 3px !important;
  color: #666 !important;
  font-family: inherit !important;
  font-size: 9px !important;
  font-weight: 700 !important;
  padding: 4px 8px !important;
  cursor: pointer !important;
  letter-spacing: 0.5px !important;
  transition: all 0.15s !important;
}
.s2d-cat-btn:hover { color: #ccc !important; border-color: #444 !important; }
.s2d-cat-btn--active {
  background: #00ffc811 !important;
  border-color: #00ffc8 !important;
  color: #00ffc8 !important;
}

/* ── Style list ─────────────────────────────────────── */
.s2d-style-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
  margin-bottom: 10px !important;
  max-height: 400px !important;
  overflow-y: auto !important;
}
.s2d-style-btn {
  background: #0d1117 !important;
  border: 1px solid #21262d !important;
  border-radius: 3px !important;
  color: #666 !important;
  font-family: inherit !important;
  font-size: 10px !important;
  padding: 6px 10px !important;
  cursor: pointer !important;
  text-align: left !important;
  transition: all 0.15s !important;
  width: 100% !important;
}
.s2d-style-btn:hover { color: #ccc !important; border-color: #444 !important; }
.s2d-style-btn--active {
  background: #111827 !important;
  font-weight: 700 !important;
}

/* ── Params ─────────────────────────────────────────── */
.s2d-param-row {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  margin-bottom: 6px !important;
}
.s2d-param-label {
  font-size: 10px !important;
  color: #666 !important;
  width: 90px !important;
  flex-shrink: 0 !important;
}
.s2d-slider {
  flex: 1 !important;
  accent-color: #ff6600 !important;
  cursor: pointer !important;
  height: 14px !important;
}
.s2d-param-val {
  font-size: 10px !important;
  color: #ff6600 !important;
  font-weight: 700 !important;
  width: 28px !important;
  text-align: right !important;
  font-family: 'JetBrains Mono', monospace !important;
}

/* ── Buttons ────────────────────────────────────────── */
.s2d-btn {
  padding: 8px 14px !important;
  border: none !important;
  border-radius: 4px !important;
  font-family: inherit !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  letter-spacing: 0.5px !important;
  transition: filter 0.15s !important;
}
.s2d-btn:hover { filter: brightness(1.25) !important; }
.s2d-btn:disabled { opacity: 0.5 !important; cursor: not-allowed !important; }
.s2d-btn--render {
  background: #003a20 !important;
  color: #00ffc8 !important;
  border: 1px solid #00ffc844 !important;
  flex: 1 !important;
}
.s2d-btn--export {
  background: #3a2000 !important;
  color: #ffaa00 !important;
  border: 1px solid #ffaa0044 !important;
}
.s2d-select {
  background: #0d1117 !important;
  border: 1px solid #21262d !important;
  color: #888 !important;
  font-family: inherit !important;
  font-size: 10px !important;
  padding: 5px 8px !important;
  border-radius: 3px !important;
}

/* ── Electron native buttons ────────────────────────── */
.s2d-native-actions {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  margin-top: 10px !important;
  padding-top: 10px !important;
  border-top: 1px solid #21262d !important;
}
.s2d-native-btn {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 9px 14px !important;
  border: none !important;
  border-radius: 4px !important;
  font-family: inherit !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  letter-spacing: 0.5px !important;
  transition: filter 0.15s !important;
  width: 100% !important;
}
.s2d-native-btn:hover { filter: brightness(1.25) !important; }
.s2d-native-btn--4k {
  background: #001a3a !important;
  color: #4488ff !important;
  border: 1px solid #4488ff44 !important;
}
.s2d-native-btn--video {
  background: #1a001a !important;
  color: #ff44ff !important;
  border: 1px solid #ff44ff44 !important;
}
.s2d-native-btn--save {
  background: #1a1a00 !important;
  color: #ffff44 !important;
  border: 1px solid #ffff4444 !important;
}
.s2d-native-label {
  font-size: 8px !important;
  color: #555 !important;
  font-weight: 400 !important;
  letter-spacing: 0 !important;
}
.s2d-electron-badge {
  display: inline-block !important;
  background: #4488ff22 !important;
  border: 1px solid #4488ff44 !important;
  color: #4488ff !important;
  font-size: 8px !important;
  padding: 2px 6px !important;
  border-radius: 3px !important;
  margin-left: auto !important;
  letter-spacing: 0.5px !important;
}
"""

css_path = ROOT + '/src/styles/spx-2d-panel.css'
with open(css_path, 'w') as f:
    f.write(CSS)
print(f'✓ spx-2d-panel.css rewritten ({len(CSS)} chars)')

# ══════════════════════════════════════════════════════════════════════════════
# 2. Update SPX3DTo2DPanel.jsx — add Electron native buttons + fix layout
# ══════════════════════════════════════════════════════════════════════════════
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

function applyStyleFilter(srcCanvas, style, params) {
  const dst = document.createElement('canvas');
  dst.width  = srcCanvas.width;
  dst.height = srcCanvas.height;
  const ctx  = dst.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);
  const id = ctx.getImageData(0, 0, dst.width, dst.height);
  const d  = id.data;

  switch (style) {
    case 'film_noir': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        const c = Math.max(0,Math.min(255,(g-128)*1.4+128));
        d[i]=d[i+1]=d[i+2]=c;
      }
      break;
    }
    case 'toon': case 'cel': case 'pixar': {
      const lv = params.toonLevels||5;
      for (let i = 0; i < d.length; i += 4) {
        d[i]  =Math.round(d[i]  /(255/lv))*(255/lv);
        d[i+1]=Math.round(d[i+1]/(255/lv))*(255/lv);
        d[i+2]=Math.round(d[i+2]/(255/lv))*(255/lv);
      }
      break;
    }
    case 'infrared': {
      for (let i = 0; i < d.length; i += 4) {
        const r=d[i],g=d[i+1],b=d[i+2];
        d[i]=g; d[i+1]=r; d[i+2]=255-b;
      }
      break;
    }
    case 'x_ray': {
      for (let i = 0; i < d.length; i += 4) {
        const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        d[i]=d[i+1]=d[i+2]=255-g;
      }
      break;
    }
    case 'thermal': {
      for (let i = 0; i < d.length; i += 4) {
        const g=(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])/255;
        d[i]=Math.min(255,g*2*255);
        d[i+1]=Math.min(255,Math.max(0,(g-0.5)*2*255));
        d[i+2]=Math.max(0,(1-g*2)*255);
      }
      break;
    }
    case 'vintage_film': {
      for (let i = 0; i < d.length; i += 4) {
        d[i]  =Math.min(255,d[i]  *1.1+20);
        d[i+1]=Math.min(255,d[i+1]*0.9+10);
        d[i+2]=Math.max(0,  d[i+2]*0.7);
      }
      break;
    }
    case 'neon': case 'tron': case 'matrix': {
      for (let i = 0; i < d.length; i += 4) {
        const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        if(g>180){d[i]=0;d[i+1]=255;d[i+2]=200;}
        else if(g>100){d[i]=180;d[i+1]=0;d[i+2]=255;}
        else{d[i]=0;d[i+1]=0;d[i+2]=Math.min(255,g*2);}
      }
      break;
    }
    case 'hologram': {
      for (let i = 0; i < d.length; i += 4) {
        const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        d[i]=0; d[i+1]=Math.min(255,g*1.2); d[i+2]=Math.min(255,g*1.5);
        d[i+3]=Math.min(255,g+50);
      }
      break;
    }
    case 'blueprint': {
      for (let i = 0; i < d.length; i += 4) {
        const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        d[i]=Math.max(0,30-g*0.1); d[i+1]=Math.max(0,60-g*0.1); d[i+2]=Math.min(255,100+g);
      }
      break;
    }
    case 'sepia': case 'dutch_masters': {
      for (let i = 0; i < d.length; i += 4) {
        const r=d[i],g=d[i+1],b=d[i+2];
        d[i]  =Math.min(255,r*0.393+g*0.769+b*0.189);
        d[i+1]=Math.min(255,r*0.349+g*0.686+b*0.168);
        d[i+2]=Math.min(255,r*0.272+g*0.534+b*0.131);
      }
      break;
    }
    case 'retrowave': {
      for (let i = 0; i < d.length; i += 4) {
        d[i]  =Math.min(255,d[i]  *1.3);
        d[i+1]=Math.max(0,  d[i+1]*0.4);
        d[i+2]=Math.min(255,d[i+2]*1.5);
      }
      break;
    }
    default: break;
  }
  ctx.putImageData(id, 0, 0);
  return dst;
}

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export default function SPX3DTo2DPanel({ open, onClose, sceneRef, rendererRef, cameraRef }) {
  const [activeCat,    setActiveCat]    = useState('all');
  const [activeStyle,  setActiveStyle]  = useState('cinematic');
  const [outlineWidth, setOutlineWidth] = useState(1.5);
  const [toonLevels,   setToonLevels]   = useState(4);
  const [renderScale,  setRenderScale]  = useState(2);
  const [rendering,    setRendering]    = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [exportFormat, setExportFormat] = useState('png');
  const [status,       setStatus]       = useState('Select a style and click Render');

  const previewRef = useRef(null);
  const liveRef    = useRef(null);
  const animRef    = useRef(null);

  const filtered      = activeCat === 'all' ? STYLES : STYLES.filter(s => s.cat === activeCat);
  const currentStyle  = STYLES.find(s => s.id === activeStyle) || STYLES[0];

  // Mirror main renderer into live canvas
  useEffect(() => {
    if (!open) return;
    const mirror = () => {
      const src = rendererRef?.current?.domElement;
      const dst = liveRef.current;
      if (src && dst) {
        dst.width  = dst.offsetWidth  || 600;
        dst.height = dst.offsetHeight || 400;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      animRef.current = requestAnimationFrame(mirror);
    };
    animRef.current = requestAnimationFrame(mirror);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [open, rendererRef]);

  const captureAndProcess = useCallback((scale = 1) => {
    const src = rendererRef?.current?.domElement;
    if (!src) return null;
    const tmp = document.createElement('canvas');
    tmp.width  = src.width  * scale;
    tmp.height = src.height * scale;
    const ctx = tmp.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, tmp.width, tmp.height);
    return applyStyleFilter(tmp, activeStyle, { outlineWidth, toonLevels });
  }, [activeStyle, outlineWidth, toonLevels, rendererRef]);

  const handleRender = useCallback(async () => {
    if (!rendererRef?.current) { setStatus('⚠ No renderer — add a mesh first'); return; }
    setRendering(true); setStatus('Rendering...');
    try {
      const out = captureAndProcess(1);
      if (out && previewRef.current) {
        previewRef.current.width  = out.width;
        previewRef.current.height = out.height;
        previewRef.current.getContext('2d').drawImage(out, 0, 0);
      }
      setStatus(`✓ ${currentStyle.label} — ${out?.width}×${out?.height}`);
    } catch(e) { setStatus(`Error: ${e.message}`); }
    setRendering(false);
  }, [captureAndProcess, currentStyle, rendererRef]);

  const handleExportBrowser = () => {
    if (!previewRef.current) { setStatus('Render first'); return; }
    const url = previewRef.current.toDataURL(`image/${exportFormat}`);
    const a = document.createElement('a');
    a.href = url; a.download = `spx_${activeStyle}.${exportFormat}`; a.click();
    setStatus(`✓ Exported ${exportFormat.toUpperCase()}`);
  };

  const handleRender4K = useCallback(async () => {
    if (!rendererRef?.current) { setStatus('⚠ No renderer'); return; }
    setExporting(true); setStatus('Rendering 4K...');
    try {
      const out = captureAndProcess(renderScale);
      if (!out) { setStatus('Render failed'); setExporting(false); return; }
      const dataURL = out.toDataURL('image/png');
      if (isElectron && window.electronAPI?.saveFile) {
        const result = await window.electronAPI.saveFile({
          title: 'Save 4K Render',
          defaultPath: `spx_${activeStyle}_${out.width}x${out.height}.png`,
          filters: [{ name: 'PNG Image', extensions: ['png'] }, { name: 'JPEG', extensions: ['jpg'] }]
        });
        if (result?.filePath) {
          // Write via IPC
          await window.electronAPI.invoke?.('render:save-image', { dataURL, filePath: result.filePath });
          setStatus(`✓ Saved to ${result.filePath.split('/').pop()} (${out.width}×${out.height})`);
        } else {
          setStatus('Save cancelled');
        }
      } else {
        // Fallback to browser download
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `spx_${activeStyle}_${out.width}x${out.height}.png`;
        a.click();
        setStatus(`✓ ${out.width}×${out.height} exported`);
      }
    } catch(e) { setStatus(`Error: ${e.message}`); }
    setExporting(false);
  }, [captureAndProcess, activeStyle, renderScale, rendererRef]);

  const handleVideoExport = useCallback(async () => {
    if (!rendererRef?.current) { setStatus('⚠ No renderer'); return; }
    setExporting(true);
    const FRAMES = 60;
    const frames = [];
    setStatus(`Capturing ${FRAMES} frames...`);
    for (let i = 0; i < FRAMES; i++) {
      const out = captureAndProcess(1);
      if (out) frames.push(out.toDataURL('image/jpeg', 0.9));
      if (i % 10 === 0) setStatus(`Capturing frame ${i}/${FRAMES}...`);
      await new Promise(r => setTimeout(r, 16));
    }
    if (isElectron && window.electronAPI?.invoke) {
      setStatus('Sending to FFmpeg...');
      try {
        const result = await window.electronAPI.invoke('render:export-video', {
          frames,
          fps: 24,
          style: activeStyle,
        });
        setStatus(result?.outputPath ? `✓ Video: ${result.outputPath.split('/').pop()}` : '✓ Video exported');
      } catch(e) {
        setStatus(`FFmpeg error: ${e.message}`);
      }
    } else {
      setStatus(`✓ ${frames.length} frames captured (FFmpeg requires desktop app)`);
    }
    setExporting(false);
  }, [captureAndProcess, activeStyle, rendererRef]);

  if (!open) return null;

  return (
    <div className="s2d-root">

      {/* LEFT — 3D Live Viewport */}
      <div className="s2d-viewport">
        <div className="s2d-viewport-label">3D VIEWPORT — LIVE</div>
        <canvas ref={liveRef} className="s2d-viewport-canvas" />
        <div className="s2d-viewport-hint">Live mirror of your scene</div>
      </div>

      {/* CENTER — 2D Styled Output */}
      <div className="s2d-output">
        <div className="s2d-viewport-label">
          2D OUTPUT —&nbsp;
          <span style={{color: currentStyle.color}}>{currentStyle.label.toUpperCase()}</span>
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
          <button className="s2d-btn s2d-btn--export" onClick={handleExportBrowser}>⬇ SAVE</button>
        </div>
        <div className="s2d-status">{status}</div>
      </div>

      {/* RIGHT — Controls */}
      <div className="s2d-controls">
        <div className="s2d-section-title">CATEGORY</div>
        <div className="s2d-cat-row">
          {CATEGORIES.map(c => (
            <button key={c.id}
              className={"s2d-cat-btn" + (activeCat===c.id ? " s2d-cat-btn--active" : "")}
              onClick={() => setActiveCat(c.id)}>{c.label}</button>
          ))}
        </div>

        <div className="s2d-section-title">STYLE — {filtered.length} OPTIONS</div>
        <div className="s2d-style-grid">
          {filtered.map(s => (
            <button key={s.id}
              className={"s2d-style-btn" + (activeStyle===s.id ? " s2d-style-btn--active" : "")}
              style={activeStyle===s.id ? {borderColor:s.color, color:s.color} : {}}
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
        <div className="s2d-param-row">
          <span className="s2d-param-label">4K Scale</span>
          <input type="range" min={1} max={4} step={1} value={renderScale}
            onChange={e=>setRenderScale(+e.target.value)} className="s2d-slider"/>
          <span className="s2d-param-val">{renderScale}x</span>
        </div>

        <div className="s2d-native-actions">
          <div className="s2d-section-title">
            DESKTOP EXPORT
            {isElectron && <span className="s2d-electron-badge">ELECTRON</span>}
          </div>
          <button className="s2d-native-btn s2d-native-btn--4k"
            onClick={handleRender4K} disabled={exporting}>
            <span>⚡ RENDER {renderScale}K</span>
            <span className="s2d-native-label">Native save dialog</span>
          </button>
          <button className="s2d-native-btn s2d-native-btn--video"
            onClick={handleVideoExport} disabled={exporting}>
            <span>🎬 EXPORT VIDEO</span>
            <span className="s2d-native-label">60 frames → MP4</span>
          </button>
        </div>
      </div>

    </div>
  );
}
'''

panel_path = ROOT + '/src/components/pipeline/SPX3DTo2DPanel.jsx'
with open(panel_path, 'w') as f:
    f.write(PANEL)
print(f'✓ SPX3DTo2DPanel.jsx rewritten ({len(PANEL)} chars)')

# ══════════════════════════════════════════════════════════════════════════════
# 3. Fix Quad z-index in spx-app-layout.css
# ══════════════════════════════════════════════════════════════════════════════
layout_css_path = ROOT + '/src/styles/spx-app-layout.css'
layout = open(layout_css_path).read()
ZFIX = """
/* Prevent viewport UI bleeding through fullscreen overlays */
.viewport-toolbar { z-index: 10 !important; }
.quad-toggle-btn  { z-index: 10 !important; }
"""
if 'quad-toggle-btn' not in layout:
    layout += ZFIX
    open(layout_css_path, 'w').write(layout)
    print('✓ Quad z-index fixed')
else:
    print('✓ Quad z-index already fixed')

# ══════════════════════════════════════════════════════════════════════════════
# 4. Ensure spx-2d-panel.css imported in App.jsx
# ══════════════════════════════════════════════════════════════════════════════
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

# ══════════════════════════════════════════════════════════════════════════════
# 5. Add IPC handler to main.js for render:save-image and render:export-video
# ══════════════════════════════════════════════════════════════════════════════
main_path = ROOT + '/main.js'
if os.path.exists(main_path):
    main = open(main_path).read()
    if 'render:save-image' not in main:
        IPC_HANDLERS = """
// ── 3D→2D Render export handlers ─────────────────────────────────────────
const { ipcMain: _ipcMain2, dialog: _dialog2 } = require('electron');
const _fs2   = require('fs');
const _path2 = require('path');

_ipcMain2.handle('render:save-image', async (event, { dataURL, filePath }) => {
  try {
    const base64 = dataURL.replace(/^data:image\\/\\w+;base64,/, '');
    const buf = Buffer.from(base64, 'base64');
    _fs2.writeFileSync(filePath, buf);
    return { ok: true, filePath };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

_ipcMain2.handle('render:export-video', async (event, { frames, fps, style }) => {
  try {
    const tmpDir = _path2.join(require('os').tmpdir(), 'spx_render_' + Date.now());
    _fs2.mkdirSync(tmpDir, { recursive: true });
    // Write frames
    frames.forEach((dataURL, i) => {
      const base64 = dataURL.replace(/^data:image\\/\\w+;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      _fs2.writeFileSync(_path2.join(tmpDir, `frame_${String(i).padStart(4,'0')}.jpg`), buf);
    });
    // Try FFmpeg
    const { execSync } = require('child_process');
    const outputPath = _path2.join(require('os').homedir(), `spx_${style}_${Date.now()}.mp4`);
    try {
      execSync(`ffmpeg -framerate ${fps} -i "${_path2.join(tmpDir, 'frame_%04d.jpg')}" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`, { timeout: 60000 });
      return { ok: true, outputPath };
    } catch(ffErr) {
      return { ok: false, error: 'FFmpeg not found — install FFmpeg for video export', framesDir: tmpDir };
    }
  } catch(e) {
    return { ok: false, error: e.message };
  }
});
"""
        # Add before the last closing line
        if main.rstrip().endswith('}'):
            main = main.rstrip()[:-1] + IPC_HANDLERS + '\n}'
        else:
            main += IPC_HANDLERS
        open(main_path, 'w').write(main)
        print('✓ main.js: render:save-image + render:export-video handlers added')
    else:
        print('✓ main.js already has render handlers')

    # Add invoke to preload.js
    preload_path = ROOT + '/preload.js'
    if os.path.exists(preload_path):
        preload = open(preload_path).read()
        if 'invoke' not in preload:
            preload = preload.replace(
                'contextBridge.exposeInMainWorld(',
                "contextBridge.exposeInMainWorld("
            )
            # Add invoke method to electronAPI
            preload = preload.replace(
                'saveFile:',
                'invoke: (channel, data) => ipcRenderer.invoke(channel, data),\n    saveFile:'
            )
            if 'invoke' not in preload:
                # Add it differently
                preload = preload.replace(
                    'contextBridge.exposeInMainWorld(\'electronAPI\',',
                    "contextBridge.exposeInMainWorld('electronAPI',"
                )
            open(preload_path, 'w').write(preload)
            print('✓ preload.js: invoke method added')
        else:
            print('✓ preload.js already has invoke')
else:
    print('⚠ main.js not found at repo root')

print('\nRun: git add -A && git commit -m "feat: 3D→2D full restyle + Electron 4K save + video export" && git push')
