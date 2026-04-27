#!/usr/bin/env node
// run: node patch-all.js  (from /workspaces/spx3dmesh2)
const fs = require('fs');

// ── 1. workspaceMap.js — add 6 new tabs ───────────────────────────────────────
const wmPath = 'src/pro-ui/workspaceMap.js';
let wm = fs.readFileSync(wmPath, 'utf8');

wm = wm.replace(
`export const WORKSPACES_MAP = {
  MODELING:     "Modeling",
  SCULPT:       "Sculpt",
  ANIMATION:    "Animation",
  SHADING:      "Shading",
  PERFORMANCE:  "Performance",
};`,
`export const WORKSPACES_MAP = {
  MODELING:     "Modeling",
  SCULPT:       "Sculpt",
  ANIMATION:    "Animation",
  SHADING:      "Shading",
  SURFACE:      "Surface",
  RIG:          "Rig",
  RENDER:       "Render",
  FX:           "FX",
  WORLD:        "World",
  GEN:          "Gen",
  PERFORMANCE:  "Performance",
};`
);

fs.writeFileSync(wmPath, wm);
console.log('✓ workspaceMap.js updated — 11 workspaces');

// ── 2. ProfessionalShell.jsx — fix 2 inline styles ────────────────────────────
const psPath = 'src/pro-ui/ProfessionalShell.jsx';
let ps = fs.readFileSync(psPath, 'utf8');

// Fix divider
ps = ps.replace(
  `if (t.divider) return <div key={i} style={{width:2,height:1,background:"#3a3a3a",margin:"4px 4px"}} />;`,
  `if (t.divider) return <div key={i} className="spx-tool-divider" />;`
);

// Fix tool buttons (the big style block + onMouseEnter/Leave)
ps = ps.replace(
`              <button key={t.icon} title={t.label}
                onClick={() => onMenuAction?.(t.fn)}
                style={{
                  width:32, height:32, background:"transparent", border:"none",
                  borderRadius:4, cursor:"pointer", display:"flex",
                  alignItems:"center", justifyContent:"center",
                  color:"#aaa", padding:4
                }}
                onMouseEnter={e => e.currentTarget.style.background="#333"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}
              >`,
`              <button key={t.icon} title={t.label}
                className="spx-tool-btn"
                onClick={() => onMenuAction?.(t.fn)}
              >`
);

fs.writeFileSync(psPath, ps);
console.log('✓ ProfessionalShell.jsx — 2 inline styles fixed');

// ── 3. App.jsx — fix remaining inline styles ──────────────────────────────────
const appPath = 'src/App.jsx';
let app = fs.readFileSync(appPath, 'utf8');

// SpxTabGroup — fix 5 inline styles in the dropdown component (lines ~260-272)
app = app.replace(
  `    <div ref={ref} style={{position:'relative',flexShrink:0}}>`,
  `    <div ref={ref} className="spx-tab-group">`
);

app = app.replace(
  `        style={{borderBottom:open?'2px solid '+color:'2px solid transparent'}}>
        <span className='spx-native-workspace-tab-label' style={{color:open?color:undefined}}>{label}</span>
        <span style={{fontSize:7,marginLeft:3,color:open?color:'#8b949e'}}>{open?'▲':'▼'}</span>`,
  `        style={{borderBottom:open?'2px solid '+color:'2px solid transparent'}}>
        <span className='spx-native-workspace-tab-label' style={{color:open?color:undefined}}>{label}</span>
        <span className="spx-tab-arrow" style={{color:open?color:undefined}}>{open?'▲':'▼'}</span>`
);

app = app.replace(
  `        <div style={{position:'absolute',top:'100%',left:0,zIndex:2000,background:'#0d1117',border:'1px solid #21262d',borderTop:'2px solid '+color,borderRadius:'0 0 6px 6px',minWidth:150,boxShadow:'0 8px 24px rgba(0,0,0,0.8)',padding:'4px 0'}}>`,
  `        <div className="spx-tab-dropdown" style={{borderTop:'2px solid '+color}}>`
);

app = app.replace(
  `              style={{padding:'6px 14px',cursor:'pointer',fontSize:10,color:'#8b949e',fontFamily:'JetBrains Mono,monospace',fontWeight:600,whiteSpace:'nowrap'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.color=color;}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#8b949e';}}`,
  `              className="spx-tab-item"
              onMouseEnter={e=>{e.currentTarget.style.color=color;}}
              onMouseLeave={e=>{e.currentTarget.style.color='';}}`
);

// native workspace tabs bar inline
app = app.replace(
  `      <div className="spx-native-workspace-tabs" style={{left:0,justifyContent:"center",display:"flex",alignItems:"center"}}>`,
  `      <div className="spx-native-workspace-tabs">`
);

// Performance button inline
app = app.replace(
  `        <button type="button" className="spx-native-workspace-tab" onClick={()=>setShowPerformancePanel(v=>!v)} style={{marginLeft:"auto",flexShrink:0}}>`,
  `        <button type="button" className="spx-native-workspace-tab spx-native-workspace-tab--right" onClick={()=>setShowPerformancePanel(v=>!v)}>`
);

// canvas cursor inline
app = app.replace(
  `          style={{ cursor: activeWorkspace === "Sculpt" ? "crosshair" : "default" }}`,
  `          className={activeWorkspace === "Sculpt" ? "mesh-editor-canvas--sculpt" : ""}`
);

// FPS counter overlay
app = app.replace(
`          <div style={{
            position: 'absolute', bottom: 10, left: 10, 
            background: 'rgba(0,0,0,0.5)', padding: '4px 8px', 
            borderRadius: '4px', color: fps < 30 ? '#ff4444' : '#00ffc8',
            fontSize: '10px', fontFamily: 'monospace', pointerEvents: 'none', zIndex: 100
          }}>`,
`          <div className={\`spx-fps-counter\${fps < 30 ? ' spx-fps-counter--low' : ''}\`}>`
);

// XYZ gizmo container
app = app.replace(
`          <div style={{
            position:"absolute", top:8, right:8,
            width:64, height:64, pointerEvents:"none", zIndex:10
          }}>`,
`          <div className="spx-xyz-gizmo">`
);

// Viewport label
app = app.replace(
`          <div style={{
            position:"absolute", top:8, left:"50%", transform:"translateX(-50%)",
            fontSize:10, color:"#888", fontFamily:"monospace",
            pointerEvents:"none", zIndex:10
          }}>`,
`          <div className="spx-viewport-label">`
);

// Box select
app = app.replace(
`            <div style={{
              position: "absolute",
              left: boxSelect.x, top: boxSelect.y,
              width: boxSelect.w, height: boxSelect.h,
              border: "1px solid #ff6600",
              background: "rgba(255,102,0,0.08)",
              pointerEvents: "none"
            }} />`,
`            <div className="spx-box-select"
              style={{left:boxSelect.x,top:boxSelect.y,width:boxSelect.w,height:boxSelect.h}}
            />`
);

// Right panel outer div
app = app.replace(
  `        <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>`,
  `        <div className="spx-right-panel">`
);

// Right panel inner div (borderTop)
app = app.replace(
  `          <div style={{ flex:1, overflow:"auto", borderTop:"1px solid #202020" }}>`,
  `          <div className="spx-right-panel__lower">`
);

// Performance panel overlay
app = app.replace(
  `{showPerformancePanel && (<div style={{position:"absolute",top:0,left:0,width:320,height:"100%",zIndex:30,background:"#0d1117",borderRight:"1px solid #21262d",display:"flex",flexDirection:"column",overflow:"hidden"}}><SPXPerformancePanel sceneObjects={sceneObjects} activeObjId={activeObjId} /></div>)}`,
  `{showPerformancePanel && (<div className="spx-perf-overlay"><SPXPerformancePanel sceneObjects={sceneObjects} activeObjId={activeObjId} /></div>)}`
);

// Model picker button
app = app.replace(
`        style={{
          position:"fixed", bottom:44, left:8, zIndex:100,
          background: showModelPicker ? "#00ffc822" : "#0a0a14",
          border:\`1px solid \${showModelPicker ? "#00ffc8" : "#1a2a3a"}\`,
          borderRadius:6, color: showModelPicker ? "#00ffc8" : "#5a7088",
          padding:"5px 10px", fontSize:10, cursor:"pointer",
          fontFamily:"JetBrains Mono,monospace", display:"flex", gap:5, alignItems:"center",
        }}>`,
`        className={\`spx-model-picker-btn\${showModelPicker?' spx-model-picker-btn--active':''}\`}>`
);

// Film panel fixed overlays — replace all 6 with className
const filmPanelReplacements = [
  [`<div style={{position:"fixed",left:16,top:60,zIndex:1200}}>`, `<div className="spx-float-film spx-float-film--left">`],
  [`<div style={{position:"fixed",left:280,top:60,zIndex:1200}}>`, `<div className="spx-float-film spx-float-film--left2">`],
  [`<div style={{position:"fixed",left:540,top:60,zIndex:1200}}>`, `<div className="spx-float-film spx-float-film--left3">`],
  [`<div style={{position:"fixed",right:16,top:60,zIndex:1200}}>`, `<div className="spx-float-film spx-float-film--right">`],
  [`<div style={{position:"fixed",top:0,right:0,width:380,height:"100vh",zIndex:60,overflow:"hidden",display:"flex",flexDirection:"column"}}>`, `<div className="spx-side-panel spx-side-panel--380">`],
  [`<div style={{position:"fixed",top:60,right:0,width:360,height:"calc(100vh - 60px)",zIndex:50,background:"#0d1117",borderLeft:"1px solid #21262d",display:"flex",flexDirection:"column",overflow:"hidden"}}>`, `<div className="spx-side-panel spx-side-panel--360">`],
  [`<div style={{position:"fixed",top:148,right:0,width:320,height:"calc(100vh - 148px)",zIndex:55,background:"#0d1117",borderLeft:"1px solid #21262d",display:"flex",flexDirection:"column",overflow:"hidden"}}>`, `<div className="spx-side-panel spx-side-panel--320">`],
  [`<div style={{position:"fixed",top:0,right:0,width:340,height:"100vh",zIndex:60,overflow:"hidden",display:"flex",flexDirection:"column"}}>`, `<div className="spx-side-panel spx-side-panel--340">`],
  [`<div style={{position:"fixed",top:0,right:0,width:360,height:"100vh",zIndex:60,overflow:"hidden",display:"flex",flexDirection:"column"}}>`, `<div className="spx-side-panel spx-side-panel--360-full">`],
];

for (const [from, to] of filmPanelReplacements) {
  app = app.replace(from, to);
}

// Full screen overlays (env gen, terrain, etc)
app = app.replace(
  /\<div style\=\{\{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:80,background:"#06060f",display:"flex",flexDirection:"column"\}\}\>/g,
  `<div className="spx-fullscreen-overlay">`
);

app = app.replace(
  /\<div style\=\{\{display:"flex",alignItems:"center",padding:"6px 12px",background:"#0a0a14",borderBottom:"1px solid #1a2a3a",gap:8\}\}\>/g,
  `<div className="spx-overlay-header">`
);

app = app.replace(
  /style\=\{\{color:"#00ffc8",fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:700\}\}/g,
  `className="spx-overlay-title"`
);

app = app.replace(
  /onClick=\{([^}]+)\} style=\{\{marginLeft:"auto",background:"none",border:"1px solid #1a2a3a",borderRadius:3,color:"#5a7088",cursor:"pointer",padding:"3px 10px",fontFamily:"JetBrains Mono,monospace",fontSize:10\}\}>✕ CLOSE/g,
  `onClick={$1} className="spx-overlay-close">✕ CLOSE`
);

app = app.replace(
  /<div style=\{\{flex:1,overflow:"hidden"\}\}>/g,
  `<div className="spx-overlay-body">`
);

// Model picker panel
app = app.replace(
`        <div style={{`,
`        <div className="spx-model-picker-panel" style={{` // keep the style only for dynamic values, handle static below
);

fs.writeFileSync(appPath, app);
console.log('✓ App.jsx inline styles replaced');

// Count remaining
const remaining = (fs.readFileSync(appPath,'utf8').match(/style=\{\{/g)||[]).length;
console.log(`  → ${remaining} style={{}} remaining in App.jsx`);
