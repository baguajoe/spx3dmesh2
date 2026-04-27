#!/usr/bin/env node
const fs = require('fs');

// ── LiveMoCapAvatar.jsx — 6 multi-line button/video styles ───────────────────
let lm = fs.readFileSync('src/front/js/component/LiveMoCapAvatar.jsx', 'utf8');

// Start/Stop camera button (dynamic bg color)
lm = lm.replace(
`          style={{
            padding: '10px 20px',
            backgroundColor: isRunning ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}`,
`          className={\`lmc-btn\${isRunning?' lmc-btn--danger':' lmc-btn--success'}\`}`
);

// Record/Stop recording button (dynamic)
lm = lm.replace(
`              style={{
                padding: '10px 20px',
                backgroundColor: recording ? '#ffc107' : '#007bff',
                color: recording ? 'black' : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}`,
`              className={\`lmc-btn\${recording?' lmc-btn--warn':' lmc-btn--info'}\`}`
);

// Download button
lm = lm.replace(
`                style={{
                  padding: '10px 20px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}`,
`                className="lmc-btn lmc-btn--teal"`
);

// Video element (dynamic width/height from prop)
lm = lm.replace(
`              style={{
                width: videoWidth,
                height: videoWidth * 0.75,
                backgroundColor: '#000',
                borderRadius: '8px',
              }}`,
`              className="lmc-video" style={{ width: videoWidth, height: videoWidth * 0.75 }}`
);

// Overlay placeholder
lm = lm.replace(
`                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'white',
                  textAlign: 'center',
                }}`,
`                className="lmc-video-overlay"`
);

// 3D avatar container
lm = lm.replace(
`          style={{
            flex: 1,
            minWidth: '400px',
            height: '400px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #ddd',
          }}`,
`          className="lmc-avatar-wrap"`
);

fs.writeFileSync('src/front/js/component/LiveMoCapAvatar.jsx', lm);
const lmR = (fs.readFileSync('src/front/js/component/LiveMoCapAvatar.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ LiveMoCapAvatar.jsx — ${lmR} remaining`);

// ── MocapWorkspace.jsx remaining 13 ──────────────────────────────────────────
let mw = fs.readFileSync('src/workspaces/mocap/MocapWorkspace.jsx', 'utf8');

// canvas mirror already has className, drop style
mw = mw.replace(
  `className="mw-cam-overlay" style={{ transform: 'scaleX(-1)' }}`,
  `className="mw-cam-overlay mw-mirror"`
);
// check inline
mw = mw.replace(/className="mw-check" style=\{\{margin:0\}\}/g, 'className="mw-check mw-check--inline"');
// person badge — keep dynamic style (unavoidable colors)
// quality btn — keep dynamic style
// avatar btn — keep dynamic style
// depth span
mw = mw.replace(
  `style={{color:'#4fc3f7'}}`,
  `className="mw-badge-blue"`
);
// hidden file input
mw = mw.replace(
  `style={{ display: 'none' }} onChange={loadFile}`,
  `className="spx-hidden" onChange={loadFile}`
);
// SectionLabel margin top
mw = mw.replace(/style=\{\{ marginTop: '12px' \}\}/g, 'className="mw-section-mt"');
mw = mw.replace(/style=\{\{ marginTop: '16px' \}\}/g, 'className="mw-section-mt"');
// marginTop div
mw = mw.replace(
  `<div style={{ marginTop: '8px' }}>`,
  `<div className="mw-mt">`
);
// btn with marginTop + width
mw = mw.replace(
  `className="mw-btn" style={{marginTop:6,width:'100%'}}`,
  `className="mw-btn mw-btn--full mw-btn--mt"`
);
mw = mw.replace(
  `className="mw-btn mw-btn--ghost" style={{ marginTop: '4px',width:'100%' }}`,
  `className="mw-btn mw-btn--ghost mw-btn--full mw-btn--mt-sm"`
);
// video tab
mw = mw.replace(
  `<div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>`,
  `<div className="mw-tab-content">`
);

fs.writeFileSync('src/workspaces/mocap/MocapWorkspace.jsx', mw);
const mwR = (fs.readFileSync('src/workspaces/mocap/MocapWorkspace.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ MocapWorkspace.jsx — ${mwR} remaining`);

// ── MotionCaptureWithRecording.jsx ────────────────────────────────────────────
let mr = fs.readFileSync('src/front/js/component/MotionCaptureWithRecording.jsx', 'utf8');
mr = mr.replace(`<p style={{ color: '#888', fontSize: '13px' }}>{status}</p>`, `<p className="mcr-status">{status}</p>`);
mr = mr.replace(/style=\{\{ textDecoration: 'none' \}\}/g, 'className="mcr-link"');
mr = mr.replace(`<p style={{`, `<p className="mcr-hint" style={{`);
// div with display flex
mr = mr.replace(`<div style={{`, `<div className="mcr-row" style={{`);
fs.writeFileSync('src/front/js/component/MotionCaptureWithRecording.jsx', mr);
const mrR = (fs.readFileSync('src/front/js/component/MotionCaptureWithRecording.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ MotionCaptureWithRecording.jsx — ${mrR} remaining`);

// ── VideoMocapSystem.jsx ──────────────────────────────────────────────────────
let vm = fs.readFileSync('src/front/js/component/VideoMocapSystem.jsx', 'utf8');
vm = vm.replace(`<span style={{ fontSize: '12px', color: '#4ade80' }}>{videoFile?.name}</span>`, `<span className="vms-filename">{videoFile?.name}</span>`);
vm = vm.replace(`style={{ padding: '4px 10px', fontSize: '11px' }}`, `className="vms-btn-sm"`);
// progress bar (dynamic width — unavoidable)
vm = vm.replace(
  `style={{ width: \`\${progress * 100}%\` }}`,
  `className="vms-progress-fill" style={{ width: \`\${progress * 100}%\` }}`
);
fs.writeFileSync('src/front/js/component/VideoMocapSystem.jsx', vm);
const vmR = (fs.readFileSync('src/front/js/component/VideoMocapSystem.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ VideoMocapSystem.jsx — ${vmR} remaining`);

// ── MotionCaptureSystem.jsx — bulk replace button/layout styles ───────────────
let ms = fs.readFileSync('src/front/js/component/MotionCaptureSystem.jsx', 'utf8');

// Main layout
ms = ms.replace(
  `<div style={{ display:'flex', gap:'16px', height:'100%', minHeight:'600px', padding:'16px', backgroundColor:'#0a0a0f', color:'#e0e0e0' }}>`,
  `<div className="mcs-root">`
);
ms = ms.replace(
  `<div style={{ width:'360px', flexShrink:0, display:'flex', flexDirection:'column', gap:'12px' }}>`,
  `<div className="mcs-sidebar">`
);
ms = ms.replace(
  `<div style={{ position:'relative', borderRadius:'12px', overflow:'hidden', backgroundColor:'#111', border:'1px solid #1a1a2e' }}>`,
  `<div className="mcs-video-wrap">`
);
ms = ms.replace(
  `<video ref={videoRef} style={{ width:'100%', borderRadius:'12px', transform:'scaleX(-1)' }} autoPlay muted playsInline />`,
  `<video ref={videoRef} className="mcs-video mw-mirror" autoPlay muted playsInline />`
);
ms = ms.replace(
  `<div style={{ position:'absolute', top:'8px', left:'8px', right:'8px', display:'flex', gap:'8px', alignItems:'center', fontSize:'11px', color:'#aaa', backgroundColor:'rgba(0,0,0,0.6)', padding:'4px 8px', borderRadius:'6px' }}>`,
  `<div className="mcs-overlay-bar">`
);
ms = ms.replace(
  `<span style={{ width:'8px', height:'8px', borderRadius:'50%', backgroundColor: landmarkCount > 20 ? '#4ade80' : '#f87171' }} />`,
  `<span className={\`mcs-dot\${landmarkCount>20?' mcs-dot--on':' mcs-dot--off'}\`} />`
);
ms = ms.replace(
  `{isRecording && <span style={{ color:'#f87171' }}>● REC</span>}`,
  `{isRecording && <span className="mcs-rec">● REC</span>}`
);
ms = ms.replace(
  `{!isCapturing && <div style={{ width:'100%', height:'270px', display:'flex', alignItems:'center', justifyContent:'center', color:'#555' }}>Press Start to begin</div>}`,
  `{!isCapturing && <div className="mcs-placeholder">Press Start to begin</div>}`
);
ms = ms.replace(
  `<div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>`,
  `<div className="mcs-btns">`
);
// Buttons
ms = ms.replace(`style={{ padding:'8px 16px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' }}>▶ Start Capture</button>`, `className="mcs-btn mcs-btn--start">▶ Start Capture</button>`);
ms = ms.replace(`style={{ padding:'8px 16px', background:'#dc2626', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' }}>■ Stop</button>`, `className="mcs-btn mcs-btn--stop">■ Stop</button>`);
ms = ms.replace(`style={{ padding:'8px 16px', background:'#b91c1c', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' }}>⏺ Record</button>`, `className="mcs-btn mcs-btn--rec">⏺ Record</button>`);
ms = ms.replace(`style={{ padding:'8px 16px', background:'#dc2626', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' }}>⏹ Stop Recording</button>`, `className="mcs-btn mcs-btn--stop">⏹ Stop Recording</button>`);
ms = ms.replace(`style={{ padding:'6px 12px', background:'#1e1e2e', color:'#ccc', border:'1px solid #333', borderRadius:'8px', cursor:'pointer' }}>{isPlaying ? '⏹ Stop Playback' : '▶ Play Recording'}</button>`, `className="mcs-btn mcs-btn--ghost">{isPlaying ? '⏹ Stop Playback' : '▶ Play Recording'}</button>`);
ms = ms.replace(`style={{ padding:'6px 12px', background:'#1e1e2e', color:'#ccc', border:'1px solid #333', borderRadius:'8px', cursor:'pointer' }}>💾 Export JSON</button>`, `className="mcs-btn mcs-btn--ghost">💾 Export JSON</button>`);

fs.writeFileSync('src/front/js/component/MotionCaptureSystem.jsx', ms);
const msR = (fs.readFileSync('src/front/js/component/MotionCaptureSystem.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ MotionCaptureSystem.jsx — ${msR} remaining`);
