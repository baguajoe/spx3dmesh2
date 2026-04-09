#!/usr/bin/env node
const fs = require('fs');

// ── LiveMoCapAvatar.jsx — line 321: dynamic width/height (unavoidable) ────────
console.log(`✓ LiveMoCapAvatar.jsx — video size is dynamic prop (unavoidable)`);

// ── MotionCaptureWithRecording.jsx — lines 244, 280: multi-line styles ────────
let mr = fs.readFileSync('src/front/js/component/MotionCaptureWithRecording.jsx', 'utf8');
// These already have className added — the style= part has remaining properties
// Just check what's actually there
const mrLines = mr.split('\n');
console.log('MCR line 244:', mrLines[243]);
console.log('MCR line 280:', mrLines[279]);

// ── VideoMocapSystem.jsx — progress fill (dynamic width — unavoidable) ─────────
console.log(`✓ VideoMocapSystem.jsx — progress width is dynamic (unavoidable)`);

// ── MocapWorkspace.jsx — 4 remaining all dynamic (metric fill, person colors, quality btn, avatar btn)
console.log(`✓ MocapWorkspace.jsx — all 4 are dynamic runtime colors/widths (unavoidable)`);

// ── MotionCaptureSystem.jsx — 7 remaining ─────────────────────────────────────
let ms = fs.readFileSync('src/front/js/component/MotionCaptureSystem.jsx', 'utf8');

// Save button
ms = ms.replace(
  `style={{ padding:'6px 12px', background:'#1e1e2e', color:'#ccc', border:'1px solid #333', borderRadius:'8px', cursor:'pointer' }}>☁ Save</button>`,
  `className="mcs-btn mcs-btn--ghost">☁ Save</button>`
);

// Download link
ms = ms.replace(
  `style={{ padding:'6px 12px', background:'#1e1e2e', color:'#ccc', border:'1px solid #333', borderRadius:'8px', cursor:'pointer', textDecoration:'none' }}>📹 Download Video</a>`,
  `className="mcs-btn mcs-btn--ghost mcs-link">📹 Download Video</a>`
);

// Controls row
ms = ms.replace(
  `<div style={{ display:'flex', alignItems:'center', gap:'12px', fontSize:'13px' }}>`,
  `<div className="mcs-controls-row">`
);

// Label
ms = ms.replace(
  `<label style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer' }}>`,
  `<label className="mcs-label">`
);

// Select
ms = ms.replace(
  `style={{ background:'#1a1a2e', color:'#e0e0e0', border:'1px solid #333', borderRadius:'6px', padding:'4px 8px', fontSize:'12px' }}>`,
  `className="mcs-select">`
);

// Error
ms = ms.replace(
  `{error && <div style={{ color:'#f87171', fontSize:'13px', padding:'8px', background:'#1a0a0a', borderRadius:'6px' }}>{error}</div>}`,
  `{error && <div className="mcs-error">{error}</div>}`
);

// Canvas container
ms = ms.replace(
  `<div style={{ flex:1, borderRadius:'12px', overflow:'hidden', border:'1px solid #1a1a2e', minHeight:'500px' }}>`,
  `<div className="mcs-canvas-wrap">`
);

fs.writeFileSync('src/front/js/component/MotionCaptureSystem.jsx', ms);
const msR = (fs.readFileSync('src/front/js/component/MotionCaptureSystem.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ MotionCaptureSystem.jsx — ${msR} remaining`);
