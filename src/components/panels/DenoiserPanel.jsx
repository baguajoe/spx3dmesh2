import React, { useState, useRef, useCallback } from 'react';
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
