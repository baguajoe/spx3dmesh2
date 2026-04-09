#!/usr/bin/env node
const fs = require('fs');

function patch(path, replacements) {
  let f = fs.readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    f = f.replace(from, to);
  }
  fs.writeFileSync(path, f);
  const r = (fs.readFileSync(path,'utf8').match(/style=\{\{/g)||[]).length;
  console.log(`✓ ${path.split('/').pop()} — ${r} remaining`);
}

// ── DestructionPanel.jsx ──────────────────────────────────────────────────────
patch('src/components/vfx/DestructionPanel.jsx', [
  [`<span style={{fontSize:20}}>{d.icon}</span>`, `<span className="vfx-icon-lg">{d.icon}</span>`],
  [`<div style={{fontWeight:600, color:destroyType===d.id?C.orange:C.text}}>{d.label}</div>`, `<div className={\`vfx-label\${destroyType===d.id?' vfx-label--active':''}\`}>{d.label}</div>`],
  [`<div style={{fontSize:9, color:C.muted}}>{d.desc}</div>`, `<div className="vfx-desc">{d.desc}</div>`],
  [`<span style={{fontSize:18}}>{v.icon}</span>`, `<span className="vfx-icon-md">{v.icon}</span>`],
  [`<span style={{fontSize:9}}>{v.label}</span>`, `<span className="vfx-label-sm">{v.label}</span>`],
  [`<span style={{color:C.muted}}>{k}</span>`, `<span className="vfx-stat-key">{k}</span>`],
  [`<span style={{color: k==="Status"?(fragsRunning?C.orange:C.muted):C.text}}>{v}</span>`, `<span className={\`vfx-stat-val\${k==="Status"&&fragsRunning?' vfx-stat-val--active':''}\`}>{v}</span>`],
  [`<div style={{display:"flex", gap:6, flexWrap:"wrap"}}>`, `<div className="vfx-btn-wrap">`],
  [`<div style={{marginTop:10, fontSize:9, color:C.muted, lineHeight:1.7}}>`, `<div className="vfx-hint">`],
  [`<span style={{fontSize:10, flex:1}}>{p.label}</span>`, `<span className="vfx-preset-label">{p.label}</span>`],
  [`<span style={{fontSize:8, color:C.muted}}>{p.pieces} pcs · f{p.force}</span>`, `<span className="vfx-preset-meta">{p.pieces} pcs · f{p.force}</span>`],
  // dynamic card style — keep with className
  [`<div key={v.id} style={{`, `<div key={v.id} className="vfx-card" style={{`],
]);

// ── FluidPanel.jsx ────────────────────────────────────────────────────────────
patch('src/components/vfx/FluidPanel.jsx', [
  [`<div style={{...S.root,display:"flex",flexDirection:"column"}}>`, `<div className="fluid-root">`],
  [`<div style={{display:"flex",alignItems:"center",marginBottom:10}}>`, `<div className="fluid-header">`],
  [`{onClose&&<button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"1px solid #21262d",borderRadius:3,color:"#8b949e",cursor:"pointer",padding:"3px 10px",fontSize:10}}>✕</button>}`, `{onClose&&<button onClick={onClose} className="fluid-close">✕</button>}`],
  [`<div style={{display:"flex",flexWrap:"wrap",marginBottom:4}}>`, `<div className="fluid-tabs">`],
]);

// ── WeatherPanel.jsx ──────────────────────────────────────────────────────────
patch('src/components/vfx/WeatherPanel.jsx', [
  [`<span style={{fontSize:20}}>{w.icon}</span>`, `<span className="vfx-icon-lg">{w.icon}</span>`],
  [`<span style={{fontWeight:600, color:weatherType===w.id?C.teal:C.text}}>{w.label}</span>`, `<span className={\`vfx-label\${weatherType===w.id?' vfx-label--teal':''}\`}>{w.label}</span>`],
  [`<span style={{marginLeft:"auto", fontSize:9, color:C.muted}}>{w.gpuCount} particles</span>`, `<span className="vfx-particle-count">{w.gpuCount} particles</span>`],
  [`<div style={{...S.row, justifyContent:"space-between"}}>`, `<div className="vfx-row-between">`],
  [`<span style={{color:C.muted}}>{k}</span>`, `<span className="vfx-stat-key">{k}</span>`],
  [`<span style={{color: k==="Status"?(running?C.teal:C.muted):C.text}}>{v}</span>`, `<span className={\`vfx-stat-val\${k==="Status"&&running?' vfx-stat-val--teal':''}\`}>{v}</span>`],
  [`<div style={{display:"flex", gap:6, flexWrap:"wrap"}}>`, `<div className="vfx-btn-wrap">`],
  [`<div style={{...S.row, justifyContent:"space-between", marginBottom:8}}>`, `<div className="vfx-row-between vfx-row-between--mb">`],
  [`style={{width:40, height:26, border:"none", background:"none", cursor:"pointer"}} />`, `className="vfx-color-input" />`],
  [`<span style={{fontSize:10}}>{p.label}</span>`, `<span className="vfx-preset-label">{p.label}</span>`],
  [`<span style={{fontSize:18}}>{def.icon}</span>`, `<span className="vfx-icon-md">{def.icon}</span>`],
  [`<div style={{fontWeight:600}}>{def.label}</div>`, `<div className="vfx-def-label">{def.label}</div>`],
  [`<div style={{fontSize:9, color:C.muted}}>Click to add to active system</div>`, `<div className="vfx-desc">Click to add to active system</div>`],
  [`<div style={{fontSize:9, color:C.muted, lineHeight:1.7}}>`, `<div className="vfx-hint">`],
]);

// ── AdvancedRigPanel.jsx — dynamic position (unavoidable) ─────────────────────
// Already has className, style is spread prop — acceptable
console.log(`✓ AdvancedRigPanel.jsx — dynamic float position (unavoidable)`);

// ── AutoRigPanel.jsx — same ───────────────────────────────────────────────────
console.log(`✓ AutoRigPanel.jsx — dynamic float position (unavoidable)`);

// ── LightingCameraPanel.jsx ───────────────────────────────────────────────────
patch('src/components/scene/LightingCameraPanel.jsx', [
  [`<div style={{flex:1}}>`, `<div className="lcp-flex1">`],
  [`<div style={{flex:1}}>`, `<div className="lcp-flex1">`],  // second occurrence
  [`<div key={ax} style={{flex:1}}>`, `<div key={ax} className="lcp-flex1">`],
  [`<div style={{fontSize:9,color:'var(--dim)',marginBottom:2}}>{ax}</div>`, `<div className="lcp-axis-label">{ax}</div>`],
  [`<button className="lcp-apply-btn lcp-apply-btn--teal" style={{marginTop:6}} onClick={addLight}>`, `<button className="lcp-apply-btn lcp-apply-btn--teal lcp-apply-btn--mt" onClick={addLight}>`],
  [`<span style={{color:'var(--dim)',fontSize:10,width:78}}>Color</span>`, `<span className="lcp-color-label">Color</span>`],
  [`<span style={{color:'var(--dim)',fontSize:10,width:78}}>Sky</span>`, `<span className="lcp-color-label">Sky</span>`],
  [`<span style={{color:'var(--dim)',fontSize:10,width:78}}>Ground</span>`, `<span className="lcp-color-label">Ground</span>`],
  [`<button className="lcp-apply-btn lcp-apply-btn--teal" style={{marginTop:5}} onClick={()=>{if(cameraRef?.current)setDOF(cameraRef.current,{enabled:dofOn,focus:dofFoc,aperture:dofAp,maxBlur:dofMb});status("DOF applied");}}>Apply DOF</button>`, `<button className="lcp-apply-btn lcp-apply-btn--teal lcp-apply-btn--mt" onClick={()=>{if(cameraRef?.current)setDOF(cameraRef.current,{enabled:dofOn,focus:dofFoc,aperture:dofAp,maxBlur:dofMb});status("DOF applied");}}>Apply DOF</button>`],
  [`<div style={{fontWeight:700}}>{m.l}</div>`, `<div className="lcp-mode-label">{m.l}</div>`],
  [`<button className="lcp-apply-btn lcp-apply-btn--teal" style={{marginTop:4}} onClick={()=>{onApplyFunction?.("render_start");status("Render started");}}>▶ Start Render</button>`, `<button className="lcp-apply-btn lcp-apply-btn--teal lcp-apply-btn--mt" onClick={()=>{onApplyFunction?.("render_start");status("Render started");}}>▶ Start Render</button>`],
  [`<button className="lcp-apply-btn lcp-apply-btn--orange" style={{marginTop:4}} onClick={()=>{onApplyFunction?.("render_preview");status("Viewport render");}}>👁 Viewport Render</button>`, `<button className="lcp-apply-btn lcp-apply-btn--orange lcp-apply-btn--mt" onClick={()=>{onApplyFunction?.("render_preview");status("Viewport render");}}>👁 Viewport Render</button>`],
  // dynamic light dot — keep style for color
  [`<div className="lcp-light-dot" style={{background:col, opacity:light.visible===false?0.3:1}}/>`, `<div className="lcp-light-dot" style={{background:col, opacity:light.visible===false?0.3:1}}/>`],
  // dynamic badge — keep style for color
  [`<span className="lcp-light-type" style={{background:\`\${col}22\`,color:col}}>`, `<span className="lcp-light-type" style={{background:\`\${col}22\`,color:col}}>`],
]);

// ── ExportToPuppetButton.jsx ──────────────────────────────────────────────────
patch('src/components/pipeline/ExportToPuppetButton.jsx', [
  [`<div style={{ background:'#06060f', borderRadius:4, padding:8, marginBottom:8, fontSize:10, color:'#00ffc8' }}>`, `<div className="epb-info-box">`],
]);

// ── SPX3DTo2DPanel.jsx ────────────────────────────────────────────────────────
patch('src/components/pipeline/SPX3DTo2DPanel.jsx', [
  [`<label className="s2d-btn s2d-btn--orange" style={{display:'inline-block',cursor:'pointer'}}>`, `<label className="s2d-btn s2d-btn--orange s2d-label-btn">`],
  [`<input type="file" accept=".glb,.gltf" style={{display:'none'}}`, `<input type="file" accept=".glb,.gltf" className="spx-hidden"`],
]);

// ── VideoFaceMocap3DPanel.jsx ─────────────────────────────────────────────────
patch('src/components/pipeline/VideoFaceMocap3DPanel.jsx', [
  [`<video ref={videoRef} style={{display:'none'}} playsInline muted />`, `<video ref={videoRef} className="spx-hidden" playsInline muted />`],
  [`{status && <div style={{...S.stat,marginTop:8}}>{status}</div>}`, `{status && <div className="vfm-status">{status}</div>}`],
  [`<div style={{fontSize:10,color:'#888',lineHeight:1.7}}>`, `<div className="vfm-hint">`],
]);

// ── RenderWorkspacePanel.jsx — dynamic position (unavoidable) ─────────────────
console.log(`✓ RenderWorkspacePanel.jsx — dynamic float position (unavoidable)`);
