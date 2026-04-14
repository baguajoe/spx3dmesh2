#!/usr/bin/env python3
"""
Adds Intel OIDN AI denoiser to SPX 3D Mesh Editor via Electron.

Strategy:
1. Use @intel/oidn-web - WebAssembly version that runs in browser AND Electron
   No native addon needed — OIDN compiled to WASM, works pure JS
2. Wire it into the render pipeline in App.jsx
3. Add UI toggle in the render panel
"""
import os

ROOT = '/workspaces/spx3dmesh2'

# ── 1. Create the OIDN denoiser service ───────────────────────────────────────
DENOISER_JS = r'''/**
 * SPX AI Denoiser — Intel OIDN via WebAssembly
 * Works in both browser and Electron without native addons
 */

let oidnDevice = null;
let oidnReady = false;
let oidnLoading = false;

// Load OIDN WASM (lazy — only when first needed)
async function loadOIDN() {
  if (oidnReady) return true;
  if (oidnLoading) {
    // Wait for existing load
    while (oidnLoading) await new Promise(r => setTimeout(r, 100));
    return oidnReady;
  }
  oidnLoading = true;
  try {
    // Try to load @intel/oidn-web if installed
    const { createDevice } = await import('@intel/oidn-web');
    oidnDevice = await createDevice('cpu');
    oidnReady = true;
    console.log('[SPX Denoiser] Intel OIDN WASM loaded');
  } catch (e) {
    console.warn('[SPX Denoiser] OIDN WASM not available, using bilateral fallback:', e.message);
    oidnReady = false;
  }
  oidnLoading = false;
  return oidnReady;
}

/**
 * Bilateral filter denoiser — pure JS, always available
 * Good enough for most use cases
 */
function bilateralDenoise(imageData, width, height, sigma_s = 3, sigma_r = 0.1) {
  const src  = new Float32Array(imageData.data.length);
  const dst  = new Uint8ClampedArray(imageData.data.length);
  const d    = imageData.data;

  // Convert to float
  for (let i = 0; i < d.length; i++) src[i] = d[i] / 255.0;

  const radius = Math.ceil(sigma_s * 2);
  const ss2 = 2 * sigma_s * sigma_s;
  const sr2 = 2 * sigma_r * sigma_r;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ci = (y * width + x) * 4;
      let sumR = 0, sumG = 0, sumB = 0, sumW = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const nx = Math.max(0, Math.min(width  - 1, x + dx));
          const ni = (ny * width + nx) * 4;

          const spatialW = Math.exp(-(dx*dx + dy*dy) / ss2);
          const dr = src[ci] - src[ni];
          const dg = src[ci+1] - src[ni+1];
          const db = src[ci+2] - src[ni+2];
          const rangeW = Math.exp(-(dr*dr + dg*dg + db*db) / sr2);
          const w = spatialW * rangeW;

          sumR += src[ni]   * w;
          sumG += src[ni+1] * w;
          sumB += src[ni+2] * w;
          sumW += w;
        }
      }

      dst[ci]   = Math.round((sumR / sumW) * 255);
      dst[ci+1] = Math.round((sumG / sumW) * 255);
      dst[ci+2] = Math.round((sumB / sumW) * 255);
      dst[ci+3] = d[ci+3];
    }
  }

  return new ImageData(dst, width, height);
}

/**
 * Main denoise function — uses OIDN if available, falls back to bilateral
 * @param {HTMLCanvasElement} canvas - rendered output canvas
 * @param {Object} options - { strength: 0-1, useAI: true/false }
 * @returns {Promise<HTMLCanvasElement>} denoised canvas
 */
export async function denoiseCanvas(canvas, options = {}) {
  const { strength = 0.8, useAI = true } = options;

  const width  = canvas.width;
  const height = canvas.height;

  // Get pixel data from canvas
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, width, height);

  // Try OIDN first
  if (useAI) {
    const available = await loadOIDN();
    if (available && oidnDevice) {
      try {
        console.log('[SPX Denoiser] Running Intel OIDN AI denoiser...');
        const filter = oidnDevice.newFilter('RT');

        // Convert ImageData to Float32 HDR buffer
        const floatBuf = new Float32Array(width * height * 3);
        const d = imageData.data;
        for (let i = 0, j = 0; i < d.length; i += 4, j += 3) {
          floatBuf[j]   = (d[i]   / 255) ** 2.2; // sRGB to linear
          floatBuf[j+1] = (d[i+1] / 255) ** 2.2;
          floatBuf[j+2] = (d[i+2] / 255) ** 2.2;
        }

        const outputBuf = new Float32Array(floatBuf.length);

        filter.setImage('color',  floatBuf,  'float3', width, height);
        filter.setImage('output', outputBuf, 'float3', width, height);
        filter.set('hdr', false);
        filter.set('srgb', false);
        filter.commit();
        filter.execute();

        // Write back to canvas
        const outData = ctx.createImageData(width, height);
        for (let i = 0, j = 0; i < outData.data.length; i += 4, j += 3) {
          outData.data[i]   = Math.round((outputBuf[j]   ** (1/2.2)) * 255);
          outData.data[i+1] = Math.round((outputBuf[j+1] ** (1/2.2)) * 255);
          outData.data[i+2] = Math.round((outputBuf[j+2] ** (1/2.2)) * 255);
          outData.data[i+3] = 255;
        }
        ctx.putImageData(outData, 0, 0);
        console.log('[SPX Denoiser] OIDN complete');
        return canvas;
      } catch (e) {
        console.warn('[SPX Denoiser] OIDN failed, falling back to bilateral:', e.message);
      }
    }
  }

  // Bilateral fallback
  console.log('[SPX Denoiser] Running bilateral denoiser (strength=' + strength + ')...');
  const sigma_s = 1 + strength * 4; // 1–5
  const sigma_r = 0.05 + strength * 0.15; // 0.05–0.2
  const denoised = bilateralDenoise(imageData, width, height, sigma_s, sigma_r);
  ctx.putImageData(denoised, 0, 0);
  console.log('[SPX Denoiser] Bilateral complete');
  return canvas;
}

/**
 * Denoise a Three.js renderer output
 * @param {THREE.WebGLRenderer} renderer
 * @param {Object} options
 */
export async function denoiseRenderer(renderer, options = {}) {
  const canvas = renderer.domElement;
  return denoiseCanvas(canvas, options);
}

export const isOIDNAvailable = () => oidnReady;
export const loadOIDNAsync   = loadOIDN;
'''

denoiser_path = ROOT + '/src/mesh/AIDenoiser.js'
with open(denoiser_path, 'w') as f:
    f.write(DENOISER_JS)
print(f'✓ AIDenoiser.js written ({len(DENOISER_JS)} chars)')

# ── 2. Create DenoiserPanel React component ───────────────────────────────────
PANEL_JSX = r'''import React, { useState, useRef, useCallback } from 'react';
import { denoiseRenderer, denoiseCanvas, isOIDNAvailable, loadOIDNAsync } from '../../mesh/AIDenoiser.js';

export default function DenoiserPanel({ open, onClose, rendererRef, setStatus }) {
  const [strength,    setStrength]    = useState(0.7);
  const [useAI,       setUseAI]       = useState(true);
  const [running,     setRunning]     = useState(false);
  const [oidnStatus,  setOidnStatus]  = useState('unknown'); // unknown | loading | ready | unavailable
  const [lastResult,  setLastResult]  = useState(null);
  const previewRef = useRef(null);

  const checkOIDN = useCallback(async () => {
    setOidnStatus('loading');
    const ok = await loadOIDNAsync();
    setOidnStatus(ok ? 'ready' : 'unavailable');
  }, []);

  const handleDenoise = useCallback(async () => {
    if (!rendererRef?.current) { setStatus?.('⚠ No renderer'); return; }
    setRunning(true);
    setStatus?.('Running denoiser...');
    const start = performance.now();
    try {
      await denoiseRenderer(rendererRef.current, { strength, useAI });
      const ms = Math.round(performance.now() - start);
      const method = (useAI && isOIDNAvailable()) ? 'Intel OIDN AI' : 'Bilateral';
      setLastResult(`${method} — ${ms}ms`);
      setStatus?.(`✓ Denoised (${method}, ${ms}ms)`);
    } catch(e) {
      setStatus?.(`Denoiser error: ${e.message}`);
    }
    setRunning(false);
  }, [strength, useAI, rendererRef, setStatus]);

  if (!open) return null;

  const oidnColor = { unknown:'#666', loading:'#ffaa00', ready:'#00ffc8', unavailable:'#ff4444' };
  const oidnLabel = { unknown:'Not checked', loading:'Loading...', ready:'OIDN Ready', unavailable:'Fallback mode' };

  return (
    <div style={{width:'100%',height:'100%',background:'#0d1117',color:'#ccc',fontFamily:"'JetBrains Mono',monospace",fontSize:11,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'12px 16px',background:'#0a0d13',borderBottom:'1px solid #21262d',flexShrink:0}}>
        <div style={{fontSize:9,fontWeight:700,color:'#444',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:8}}>AI DENOISER</div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:oidnColor[oidnStatus],flexShrink:0}} />
          <span style={{fontSize:10,color:oidnColor[oidnStatus]}}>{oidnLabel[oidnStatus]}</span>
          {oidnStatus === 'unknown' && (
            <button onClick={checkOIDN} style={{marginLeft:'auto',background:'#1a2030',border:'1px solid #21262d',color:'#888',fontFamily:'inherit',fontSize:10,padding:'3px 10px',borderRadius:3,cursor:'pointer'}}>
              Check OIDN
            </button>
          )}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,color:'#444',letterSpacing:'1px',textTransform:'uppercase',marginBottom:8}}>METHOD</div>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom:6}}>
            <input type="radio" checked={useAI} onChange={()=>setUseAI(true)} />
            <span style={{fontSize:11}}>AI Denoiser</span>
            <span style={{fontSize:9,background:'#00ffc811',border:'1px solid #00ffc844',color:'#00ffc8',padding:'1px 6px',borderRadius:3}}>Intel OIDN</span>
          </label>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
            <input type="radio" checked={!useAI} onChange={()=>setUseAI(false)} />
            <span style={{fontSize:11}}>Bilateral Filter</span>
            <span style={{fontSize:9,background:'#1a2030',border:'1px solid #21262d',color:'#666',padding:'1px 6px',borderRadius:3}}>Always available</span>
          </label>
        </div>

        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,color:'#444',letterSpacing:'1px',textTransform:'uppercase',marginBottom:8}}>STRENGTH</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="range" min={0} max={1} step={0.05} value={strength}
              onChange={e=>setStrength(+e.target.value)}
              style={{flex:1,accentColor:'#00ffc8'}} />
            <span style={{fontSize:11,color:'#00ffc8',fontWeight:700,width:32,textAlign:'right'}}>{Math.round(strength*100)}%</span>
          </div>
          <div style={{fontSize:9,color:'#333',marginTop:4}}>
            Higher = more smoothing, may lose fine detail
          </div>
        </div>

        <div style={{marginBottom:16,background:'#060a10',border:'1px solid #21262d',borderRadius:4,padding:'10px 12px'}}>
          <div style={{fontSize:9,color:'#444',letterSpacing:'1px',textTransform:'uppercase',marginBottom:6}}>HOW IT WORKS</div>
          <div style={{fontSize:10,color:'#555',lineHeight:1.6}}>
            {useAI ? (
              <>Intel OIDN is the same AI denoiser used in Blender Cycles. It was trained on millions of renders and removes path tracer noise in milliseconds. Requires OIDN WASM to be loaded.</>
            ) : (
              <>Bilateral filter preserves edges while smoothing noise. Works everywhere with no dependencies. Good for light denoising — increase strength for heavy noise.</>
            )}
          </div>
        </div>

        {lastResult && (
          <div style={{marginBottom:16,background:'#003a2011',border:'1px solid #00ffc833',borderRadius:4,padding:'8px 12px',fontSize:10,color:'#00ffc8'}}>
            ✓ Last run: {lastResult}
          </div>
        )}

        <button
          onClick={handleDenoise}
          disabled={running}
          style={{width:'100%',padding:'10px',background:running?'#1a2030':'#003a20',border:'1px solid #00ffc844',color:running?'#444':'#00ffc8',fontFamily:'inherit',fontSize:12,fontWeight:700,borderRadius:4,cursor:running?'not-allowed':'pointer',letterSpacing:'0.5px',transition:'all 0.15s'}}>
          {running ? '⏳ DENOISING...' : '⚡ DENOISE RENDER'}
        </button>

        <div style={{marginTop:20,fontSize:9,color:'#333',lineHeight:1.8}}>
          <div style={{color:'#444',fontWeight:700,marginBottom:4}}>NOTES</div>
          <div>• Denoise applies to the current rendered frame</div>
          <div>• Run after path trace render for best results</div>
          <div>• OIDN requires npm install @intel/oidn-web</div>
          <div>• Bilateral filter works without any install</div>
        </div>
      </div>
    </div>
  );
}
'''

panel_path = ROOT + '/src/components/panels/DenoiserPanel.jsx'
with open(panel_path, 'w') as f:
    f.write(PANEL_JSX)
print(f'✓ DenoiserPanel.jsx written')

# ── 3. Wire into App.jsx ──────────────────────────────────────────────────────
app_path = ROOT + '/src/App.jsx'
app = open(app_path).read()
orig = app

# Add import
if 'DenoiserPanel' not in app:
    app = app.replace(
        "import UVEditorPanel from './components/uv/UVEditorPanel';",
        "import UVEditorPanel from './components/uv/UVEditorPanel';\nimport DenoiserPanel from './components/panels/DenoiserPanel';"
    )
    print('✓ DenoiserPanel import added')

# Add state
if 'denoiserOpen' not in app:
    app = app.replace(
        'const [compositorOpen, setCompositorOpen] = useState(false);',
        'const [compositorOpen, setCompositorOpen] = useState(false);\n  const [denoiserOpen, setDenoiserOpen] = useState(false);'
    )
    print('✓ denoiserOpen state added')

# Add to RENDER tab
if 'DENOISE' not in app and 'denoiserOpen' in app:
    app = app.replace(
        "{ label: 'COMPOSITOR', action: () => { closeAllWorkspacePanels(); setCompositorOpen(true); } }",
        "{ label: 'COMPOSITOR', action: () => { closeAllWorkspacePanels(); setCompositorOpen(true); } },\n          { label: 'AI DENOISE', action: () => { closeAllWorkspacePanels(); setDenoiserOpen(true); } }"
    )
    print('✓ AI DENOISE added to RENDER tab')

# Add render block
if 'denoiserOpen &&' not in app:
    RENDER_BLOCK = '''
      {denoiserOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">⚡ AI DENOISER</span>
            <button onClick={() => setDenoiserOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <DenoiserPanel open={denoiserOpen} onClose={() => setDenoiserOpen(false)} rendererRef={rendererRef} setStatus={setStatus} />
          </div>
        </div>
      )}'''

    # Insert before closing of render section
    app = app.replace(
        '{compositorOpen && (',
        RENDER_BLOCK + '\n\n      {compositorOpen && ('
    )
    print('✓ DenoiserPanel render block added')

# Add to fullscreen pause list
if 'denoiserOpen' not in app.split('window.__spxFullscreenOpen')[1][:200]:
    app = app.replace(
        'window.__spxFullscreenOpen = uvPanelOpen || nodeEditorOpen',
        'window.__spxFullscreenOpen = denoiserOpen || uvPanelOpen || nodeEditorOpen'
    )
    print('✓ denoiserOpen added to render pause flag')

if app != orig:
    open(app_path, 'w').write(app)
    print(f'✓ App.jsx updated')

# ── 4. Install @intel/oidn-web ────────────────────────────────────────────────
print('\nTo install Intel OIDN WASM, run in your codespace:')
print('  cd /workspaces/spx3dmesh2 && npm install @intel/oidn-web')
print('\nRun: git add -A && git commit -m "feat: AI denoiser (Intel OIDN + bilateral fallback)" && git push')
