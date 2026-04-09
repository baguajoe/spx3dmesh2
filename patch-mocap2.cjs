#!/usr/bin/env node
const fs = require('fs');

// ── MocapWorkspace.jsx remaining ─────────────────────────────────────────────
let mw = fs.readFileSync('src/workspaces/mocap/MocapWorkspace.jsx', 'utf8');

// canvas mirror (second occurrence)
mw = mw.replace(
  `<canvas ref={overlayRef} className="mw-cam-overlay" style={{ transform: 'scaleX(-1)' }} />`,
  `<canvas ref={overlayRef} className="mw-cam-overlay mw-mirror" />`
);

// check inline margin
mw = mw.replace(/className="mw-check" style=\{\{margin:0\}\}/g, 'className="mw-check mw-check--inline"');

// quality btn dynamic active state — keep style for colors, already has className
// hint texts
mw = mw.replace(
  `<div style={{fontSize:10,color:'#888',marginTop:4,lineHeight:1.5}}>`,
  `<div className="mw-hint">`
);
mw = mw.replace(
  `<div style={{color:'#00ffc8',marginTop:2}}>`,
  `<div className="mw-hint-teal">`
);
mw = mw.replace(
  `<div style={{fontSize:10,color:'#888',marginTop:4,lineHeight:1.6}}>`,
  `<div className="mw-hint">`
);
mw = mw.replace(
  `<div style={{fontSize:10,color:'#555',marginTop:2}}>Applied on export / BVH download</div>`,
  `<div className="mw-hint-dim">Applied on export / BVH download</div>`
);

// avatar selector row
mw = mw.replace(
  `<div style={{display:'flex',gap:4,marginBottom:6,flexWrap:'wrap'}}>`,
  `<div className="mw-avatar-row">`
);

// avatar buttons (dynamic active — keep style for colors)
mw = mw.replace(
  `style={{fontSize:10,padding:'3px 8px',background:avatarUrl===p.url?'#00ffc822':'#0a1628',`,
  `className={\`mw-avatar-btn\${avatarUrl===p.url?' mw-avatar-btn--active':''}\`} style={{background:avatarUrl===p.url?'#00ffc822':'#0a1628',`
);

// upload label
mw = mw.replace(
  `<label style={{fontSize:10,padding:'3px 8px',background:'#0a1628',border:'1px solid #1a2a3a',color:'#888',borderRadius:3,cursor:'pointer'}}>`,
  `<label className="mw-avatar-upload-btn">`
);

// hidden file input
mw = mw.replace(
  `<input type="file" accept=".glb,.gltf" style={{display:'none'}} onChange={e => {`,
  `<input type="file" accept=".glb,.gltf" className="spx-hidden" onChange={e => {`
);

// btn-row with marginTop
mw = mw.replace(
  `<div className="mw-btn-row" style={{marginTop:8}}>`,
  `<div className="mw-btn-row mw-btn-row--mt">`
);
mw = mw.replace(
  `<div className="mw-btn-row" style={{flexWrap:'wrap'}}>`,
  `<div className="mw-btn-row mw-btn-row--wrap">`
);

fs.writeFileSync('src/workspaces/mocap/MocapWorkspace.jsx', mw);
const mwR = (fs.readFileSync('src/workspaces/mocap/MocapWorkspace.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ MocapWorkspace.jsx — ${mwR} remaining`);

// ── LiveMoCapAvatar.jsx ───────────────────────────────────────────────────────
let lm = fs.readFileSync('src/front/js/component/LiveMoCapAvatar.jsx', 'utf8');

lm = lm.replace(
  `<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>`,
  `<div className="lmc-root">`
);
lm = lm.replace(
  `<div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>`,
  `<div className="lmc-controls">`
);
lm = lm.replace(
  `<span style={{ marginLeft: 'auto', color: '#666' }}>`,
  `<span className="lmc-status">`
);
lm = lm.replace(
  `<div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>`,
  `<div className="lmc-panels">`
);
lm = lm.replace(
  `<div style={{ position: 'relative' }}>`,
  `<div className="lmc-video-wrap">`
);
lm = lm.replace(
  `<details style={{ fontSize: '12px', color: '#666' }}>`,
  `<details className="lmc-details">`
);
lm = lm.replace(
  `<pre style={{ maxHeight: '200px', overflow: 'auto' }}>`,
  `<pre className="lmc-pre">`
);

fs.writeFileSync('src/front/js/component/LiveMoCapAvatar.jsx', lm);
const lmR = (fs.readFileSync('src/front/js/component/LiveMoCapAvatar.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ LiveMoCapAvatar.jsx — ${lmR} remaining`);

// ── MotionCaptureSystem.jsx + MotionCaptureWithRecording.jsx + VideoMocapSystem.jsx ──
// Read and fix display:none + simple patterns
for (const path of [
  'src/front/js/component/MotionCaptureSystem.jsx',
  'src/front/js/component/MotionCaptureWithRecording.jsx',
  'src/front/js/component/VideoMocapSystem.jsx',
]) {
  let f = fs.readFileSync(path, 'utf8');
  f = f.replace(/style=\{\{\s*display:\s*['"]none['"]\s*\}\}/g, 'className="spx-hidden"');
  f = f.replace(/style=\{\{\s*display:\s*"none"\s*\}\}/g, 'className="spx-hidden"');
  fs.writeFileSync(path, f);
  const r = (fs.readFileSync(path,'utf8').match(/style=\{\{/g)||[]).length;
  console.log(`✓ ${path.split('/').pop()} — ${r} remaining`);
}
