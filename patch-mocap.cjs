#!/usr/bin/env node
const fs = require('fs');

// ── LiveMoCapAvatar.jsx ───────────────────────────────────────────────────────
let lm = fs.readFileSync('src/front/js/component/LiveMoCapAvatar.jsx', 'utf8');
// Replace all common patterns
lm = lm.replace(/style=\{\{display:'none'\}\}/g, 'className="spx-hidden"');
lm = lm.replace(/style=\{\{ display: 'none' \}\}/g, 'className="spx-hidden"');
lm = lm.replace(/style=\{\{display:"none"\}\}/g, 'className="spx-hidden"');
fs.writeFileSync('src/front/js/component/LiveMoCapAvatar.jsx', lm);
const lmCount = (fs.readFileSync('src/front/js/component/LiveMoCapAvatar.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ LiveMoCapAvatar.jsx — ${lmCount} remaining`);

// ── MotionCaptureSystem.jsx ───────────────────────────────────────────────────
let ms = fs.readFileSync('src/front/js/component/MotionCaptureSystem.jsx', 'utf8');
ms = ms.replace(/style=\{\{display:'none'\}\}/g, 'className="spx-hidden"');
ms = ms.replace(/style=\{\{ display: 'none' \}\}/g, 'className="spx-hidden"');
ms = ms.replace(/style=\{\{display:"none"\}\}/g, 'className="spx-hidden"');
fs.writeFileSync('src/front/js/component/MotionCaptureSystem.jsx', ms);
const msCount = (fs.readFileSync('src/front/js/component/MotionCaptureSystem.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ MotionCaptureSystem.jsx — ${msCount} remaining`);

// ── MotionCaptureWithRecording.jsx ────────────────────────────────────────────
let mr = fs.readFileSync('src/front/js/component/MotionCaptureWithRecording.jsx', 'utf8');
mr = mr.replace(/style=\{\{display:'none'\}\}/g, 'className="spx-hidden"');
mr = mr.replace(/style=\{\{ display: 'none' \}\}/g, 'className="spx-hidden"');
mr = mr.replace(/style=\{\{display:"none"\}\}/g, 'className="spx-hidden"');
fs.writeFileSync('src/front/js/component/MotionCaptureWithRecording.jsx', mr);
const mrCount = (fs.readFileSync('src/front/js/component/MotionCaptureWithRecording.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ MotionCaptureWithRecording.jsx — ${mrCount} remaining`);

// ── VideoMocapSystem.jsx ──────────────────────────────────────────────────────
let vm = fs.readFileSync('src/front/js/component/VideoMocapSystem.jsx', 'utf8');
vm = vm.replace(/style=\{\{display:'none'\}\}/g, 'className="spx-hidden"');
vm = vm.replace(/style=\{\{ display: 'none' \}\}/g, 'className="spx-hidden"');
vm = vm.replace(/style=\{\{display:"none"\}\}/g, 'className="spx-hidden"');
fs.writeFileSync('src/front/js/component/VideoMocapSystem.jsx', vm);
const vmCount = (fs.readFileSync('src/front/js/component/VideoMocapSystem.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ VideoMocapSystem.jsx — ${vmCount} remaining`);

// ── MocapWorkspace.jsx — patch S object patterns ──────────────────────────────
let mw = fs.readFileSync('src/workspaces/mocap/MocapWorkspace.jsx', 'utf8');

// Remove S const if present
mw = mw.replace(/^const S = \{[\s\S]*?\};\n\n/m, '');

// Common dynamic patterns — keep style for runtime values, add className
mw = mw.replace(
  `<div className="mw-metric-fill" style={{ width: \`\${Math.round(value * 100)}%\`, background: color }} />`,
  `<div className="mw-metric-fill" style={{ width: \`\${Math.round(value * 100)}%\`, background: color }} />`
); // already has className — keep dynamic style

// Mirror transform (unavoidable)
mw = mw.replace(
  `style={{ transform: 'scaleX(-1)' }}`,
  `className="mw-mirror"`
);

// Person color badges (dynamic colors — keep style, add className)
mw = mw.replace(
  `<span key={s.id} style={{fontSize:10,padding:'2px 6px',borderRadius:3,background:PERSON_COLORS[i]+'22',border:\`1px solid \${PERSON_COLORS[i]}\`,color:PERSON_COLORS[i]}}>`,
  `<span key={s.id} className="mw-person-badge" style={{background:PERSON_COLORS[i]+'22',border:\`1px solid \${PERSON_COLORS[i]}\`,color:PERSON_COLORS[i]}}>`
);

// Multi-person label
mw = mw.replace(
  `<span style={{color:'#00ffc8'}}>👥 {personCount}P</span>`,
  `<span className="mw-badge-teal">👥 {personCount}P</span>`
);

// Depth label
mw = mw.replace(
  `<span style={{color:'#4fc3f7'}}>📐 3D</span>`,
  `<span className="mw-badge-blue">📐 3D</span>`
);

// SectionLabel with marginTop
mw = mw.replace(/style=\{\{marginTop:10\}\}/g, 'className="mw-section-mt"');

// Row wrappers
mw = mw.replace(
  `<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>`,
  `<div className="mw-row">`
);
mw = mw.replace(
  `<label className="mw-check" style={{margin:0}}>`,
  `<label className="mw-check mw-check--inline">`
);
mw = mw.replace(
  `<span style={{fontSize:11,color:'#00ffc8'}}>👥 {personCount} detected</span>`,
  `<span className="mw-badge-teal mw-badge-teal--lg">👥 {personCount} detected</span>`
);
mw = mw.replace(
  `<div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:6}}>`,
  `<div className="mw-badge-wrap">`
);
mw = mw.replace(
  `<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>`,
  `<div className="mw-row">`
);
mw = mw.replace(
  `<span style={{fontSize:10,color: depthReady ? '#00ffc8' : '#888'}}>`,
  `<span className={\`mw-depth-status\${depthReady?' mw-depth-status--ready':''}\`}>`
);
mw = mw.replace(
  `<div style={{display:'flex',gap:4}}>`,
  `<div className="mw-quality-btns">`
);
// Model quality buttons (dynamic active state — keep style for that)
mw = mw.replace(
  `              style={{flex:1,fontSize:10,padding:'3px 0',borderRadius:3,cursor:'pointer',`,
  `              className="mw-quality-btn" style={{`
);

fs.writeFileSync('src/workspaces/mocap/MocapWorkspace.jsx', mw);
const mwCount = (fs.readFileSync('src/workspaces/mocap/MocapWorkspace.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ MocapWorkspace.jsx — ${mwCount} remaining`);
