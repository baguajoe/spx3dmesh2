import React, { useState } from 'react';
import { convertClipToSPXMotion, convertRawBonesToSPXMotion, downloadSPXMotion } from '../../pipeline/SPX3DTo2DPipeline';

const S = {
  wrap: { display:'inline-flex', flexDirection:'column', gap:6 },
  btn: { background:'#FF6600', color:'#fff', border:'none', borderRadius:4, padding:'8px 18px', fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:700, cursor:'pointer' },
  btnT: { background:'#00ffc8', color:'#06060f', border:'none', borderRadius:4, padding:'6px 14px', fontFamily:'JetBrains Mono,monospace', fontSize:11, fontWeight:700, cursor:'pointer' },
  status: { fontSize:10, color:'#00ffc8', fontFamily:'JetBrains Mono,monospace' },
  modal: { position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 },
  box: { background:'#0d0d1a', border:'2px solid #00ffc8', borderRadius:8, padding:24, minWidth:360, fontFamily:'JetBrains Mono,monospace', color:'#e0e0e0' },
  h3: { color:'#00ffc8', fontSize:14, marginBottom:12 },
  label: { fontSize:11, color:'#aaa', display:'block', marginBottom:4 },
  input: { width:'100%', background:'#06060f', border:'1px solid #1a1a2e', color:'#e0e0e0', padding:'4px 8px', borderRadius:4, fontFamily:'JetBrains Mono,monospace', fontSize:11, marginBottom:10, boxSizing:'border-box' },
  select: { width:'100%', background:'#06060f', border:'1px solid #1a1a2e', color:'#e0e0e0', padding:'4px 8px', borderRadius:4, fontFamily:'JetBrains Mono,monospace', fontSize:11, marginBottom:10, boxSizing:'border-box' },
  row: { display:'flex', gap:8, marginTop:12 },
};

/**
 * ExportToPuppetButton
 * Props:
 *   skeleton   — THREE.Skeleton (optional)
 *   clip       — THREE.AnimationClip (optional)
 *   boneFrames — raw bone frames object (alternative to clip)
 *   clipName   — string name for the exported file
 */
export default function ExportToPuppetButton({ skeleton, clip, boneFrames, clipName = 'animation' }) {
  const [open, setOpen]   = useState(false);
  const [fps, setFps]     = useState(30);
  const [cw, setCw]       = useState(640);
  const [ch, setCh]       = useState(480);
  const [scale, setScale] = useState(6);
  const [offY, setOffY]   = useState(300);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState(null);

  function runExport() {
    try {
      let motion;
      const opts = { fps, canvasW: cw, canvasH: ch, projectionScale: scale, projectionOffsetY: offY };

      if (clip && skeleton) {
        motion = convertClipToSPXMotion(clip, skeleton, opts);
      } else if (boneFrames) {
        motion = convertRawBonesToSPXMotion(boneFrames, opts);
      } else {
        // Demo: generate a walk cycle procedurally
        const demoFrames = {};
        const bones = ['hips','spine','chest','neck','head','l_shoulder','l_upper_arm','l_forearm','l_hand','r_shoulder','r_upper_arm','r_forearm','r_hand','l_thigh','l_shin','l_foot','r_thigh','r_shin','r_foot'];
        const demoFps = fps, duration = 1.0;
        const frameCount = Math.ceil(duration * demoFps);
        bones.forEach(b => {
          demoFrames[b] = [];
          for (let f = 0; f < frameCount; f++) {
            const t  = f / demoFps;
            const ph = (t / duration) * Math.PI * 2;
            let y = 1.0, x = 0;
            if (b === 'hips')     { y = 1.0 + Math.sin(ph*2) * 0.05; }
            if (b === 'l_thigh')  { x = Math.sin(ph) * 0.4; }
            if (b === 'r_thigh')  { x = -Math.sin(ph) * 0.4; }
            if (b === 'l_upper_arm') { x = -Math.sin(ph) * 0.5; }
            if (b === 'r_upper_arm') { x =  Math.sin(ph) * 0.5; }
            demoFrames[b].push({ time: t, x, y, z: 0, qx: 0, qy: 0, qz: Math.sin(x*0.5)*0.2, qw: 1 });
          }
        });
        motion = convertRawBonesToSPXMotion(demoFrames, opts);
        motion.name = clipName + '_demo_walkcycle';
      }

      setPreview({
        name: motion.name,
        fps: motion.fps,
        duration: motion.duration,
        bones: motion.bones.length,
        frames: motion.frames.length,
      });
      downloadSPXMotion(motion, `${clipName}.spxmotion`);
      setStatus(`✓ Exported ${motion.frames.length} frames → ${clipName}.spxmotion`);
    } catch (e) {
      setStatus('Export error: ' + e.message);
    }
  }

  return (
    <div style={S.wrap}>
      <button style={S.btn} onClick={() => setOpen(true)}>
        🎭 Export → SPX Puppet
      </button>
      {status && <div style={S.status}>{status}</div>}

      {open && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={S.box}>
            <div style={S.h3}>Export to SPX Puppet (.spxmotion)</div>

            <label style={S.label}>Frame Rate (fps)</label>
            <select style={S.select} value={fps} onChange={e => setFps(+e.target.value)}>
              {[12,24,30,60].map(f => <option key={f}>{f}</option>)}
            </select>

            <label style={S.label}>Canvas Width: {cw}px</label>
            <input style={S.input} type="range" min={320} max={1920} step={80} value={cw} onChange={e => setCw(+e.target.value)} />

            <label style={S.label}>Canvas Height: {ch}px</label>
            <input style={S.input} type="range" min={240} max={1080} step={60} value={ch} onChange={e => setCh(+e.target.value)} />

            <label style={S.label}>Projection Scale: {scale}</label>
            <input style={S.input} type="range" min={1} max={20} step={0.5} value={scale} onChange={e => setScale(+e.target.value)} />

            <label style={S.label}>Y Offset: {offY}</label>
            <input style={S.input} type="range" min={0} max={ch} step={10} value={offY} onChange={e => setOffY(+e.target.value)} />

            {preview && (
              <div style={{ background:'#06060f', borderRadius:4, padding:8, marginBottom:8, fontSize:10, color:'#00ffc8' }}>
                Last export: {preview.name} | {preview.fps}fps | {preview.duration}s | {preview.bones} bones | {preview.frames} frames
              </div>
            )}

            <div style={S.row}>
              <button style={S.btn} onClick={runExport}>⬇ Export .spxmotion</button>
              <button style={S.btnT} onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}