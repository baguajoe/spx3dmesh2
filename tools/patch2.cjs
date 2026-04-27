#!/usr/bin/env node
const fs = require('fs');
const appPath = 'src/App.jsx';
let app = fs.readFileSync(appPath, 'utf8');

// ── Lines 263-268: SpxTabGroup dynamic color — keep only dynamic parts ────────
app = app.replace(
  `        style={{borderBottom:open?'2px solid '+color:'2px solid transparent'}}>`,
  `        className="spx-native-workspace-tab" style={{borderBottom:open?'2px solid '+color:'2px solid transparent'}}>`
);
// line 264 — color on label (dynamic, keep minimal)
// line 265 — arrow color (dynamic, keep minimal) — already has className
// line 268 — dropdown border top (dynamic, keep)
// These 4 are unavoidable dynamic color bindings — acceptable as data-only style

// ── Line 3954: box select — already has className, just needs style for position ─
// Already handled — acceptable (pure dynamic positioning)

// ── Lines 4135-4196: model picker panel ──────────────────────────────────────
app = app.replace(
  `        <div className="spx-model-picker-panel" style={{`,
  `        <div className="spx-model-picker-panel spx-model-picker-panel--open" style={{`
);

// span MODEL label
app = app.replace(
  `          <span style={{fontSize:10,color:"#5a7088",marginRight:4}}>MODEL</span>`,
  `          <span className="spx-model-picker__label">MODEL</span>`
);

// model card style (the one inside .map)
app = app.replace(
`              style={{`,
`              className={\`spx-model-picker__card\${activeModelUrl===m.url?' spx-model-picker__card--active':''}\`} style={{`
);

// span thumb/name/desc inside card
app = app.replace(
  `              <span style={{fontSize:22}}>{m.thumb}</span>`,
  `              <span className="spx-model-picker__thumb">{m.thumb}</span>`
);
app = app.replace(
  `              <span style={{fontSize:10,fontWeight:700}}>{m.label}</span>`,
  `              <span className="spx-model-picker__name">{m.label}</span>`
);
app = app.replace(
  `              <span style={{fontSize:8,color:"#5a7088"}}>{m.desc}</span>`,
  `              <span className="spx-model-picker__desc">{m.desc}</span>`
);

// upload label
app = app.replace(
  `          <label style={{`,
  `          <label className="spx-model-picker__upload" style={{`
);

// upload spans
app = app.replace(
  `            <span style={{fontSize:22}}>📂</span>`,
  `            <span className="spx-model-picker__thumb">📂</span>`
);
app = app.replace(
  `            <span style={{fontSize:10,fontWeight:700}}>Upload</span>`,
  `            <span className="spx-model-picker__name">Upload</span>`
);
app = app.replace(
  `            <span style={{fontSize:8,color:"#5a7088"}}>Custom GLB</span>`,
  `            <span className="spx-model-picker__desc">Custom GLB</span>`
);

// file input hidden
app = app.replace(
  `            <input type="file" accept=".glb,.gltf" style={{display:"none"}}`,
  `            <input type="file" accept=".glb,.gltf" className="spx-hidden"`
);

// "Use Mine" button
app = app.replace(
  `            }} style={{`,
  `            }} className="spx-model-picker__card" style={{`
);
app = app.replace(
  `              <span style={{fontSize:22}}>🎯</span>`,
  `              <span className="spx-model-picker__thumb">🎯</span>`
);
app = app.replace(
  `              <span style={{fontSize:10,fontWeight:700}}>Use Mine</span>`,
  `              <span className="spx-model-picker__name">Use Mine</span>`
);
app = app.replace(
  `              <span style={{fontSize:8,color:"#5a7088"}}>Scene mesh</span>`,
  `              <span className="spx-model-picker__desc">Scene mesh</span>`
);

// close button
app = app.replace(
  `            style={{alignSelf:"flex-start",background:"none",border:"none",color:"#5a7088",cursor:"pointer",fontSize:16,padding:"2px 6px"}}>✕</button>`,
  `            className="spx-model-picker__close">✕</button>`
);

// ── Line 4245: extra side panel (physics sim?) ────────────────────────────────
app = app.replace(
  `        <div style={{position:"fixed",top:0,right:0,width:340,height:"100vh",zIndex:60,overflow:"hidden",display:"flex",flexDirection:"column"}}>`,
  `        <div className="spx-side-panel spx-side-panel--340">`
);

// ── Lines 4286, 4313, 4331: overlay titles ────────────────────────────────────
app = app.replace(
  `            <span style={{color:"#FF6600",fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:700}}>⚙️ PHYSICS SIMULATION</span>`,
  `            <span className="spx-overlay-title" style={{color:"#FF6600"}}>⚙️ PHYSICS SIMULATION</span>`
);
app = app.replace(
  `            <span style={{color:"#aa44ff",fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:700}}>🥽 VR PREVIEW</span>`,
  `            <span className="spx-overlay-title" style={{color:"#aa44ff"}}>🥽 VR PREVIEW</span>`
);
app = app.replace(
  `            <span style={{color:"#44bb77",fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:700}}>🏔️ TERRAIN SCULPTING</span>`,
  `            <span className="spx-overlay-title" style={{color:"#44bb77"}}>🏔️ TERRAIN SCULPTING</span>`
);

// ── Line 4346: another side panel 360 ────────────────────────────────────────
app = app.replace(
  `        <div style={{position:"fixed",top:0,right:0,width:360,height:"100vh",zIndex:65,overflow:"hidden",display:"flex",flexDirection:"column"}}>`,
  `        <div className="spx-side-panel spx-side-panel--360-65">`
);

// ── Line 4365: pro mesh header ────────────────────────────────────────────────
app = app.replace(
  `          <div style={{display:"flex",alignItems:"center",padding:"6px 12px",background:"#0a0a14",borderBottom:"1px solid #1a2a3a",gap:8,flexShrink:0}}>`,
  `          <div className="spx-overlay-header">`
);
app = app.replace(
  `            <span style={{fontSize:9,color:"#5a7088"}}>Best-in-class mesh tools</span>`,
  `            <span className="spx-overlay-subtitle">Best-in-class mesh tools</span>`
);

// ── Line 4390: generator side panel 320 ──────────────────────────────────────
app = app.replace(
  `        <div style={{position:"fixed",top:148,right:0,width:320,height:"calc(100vh - 148px)",zIndex:55,background:"#0d1117",borderLeft:"1px solid #21262d",display:"flex",flexDirection:"column",overflow:"hidden"}}>`,
  `        <div className="spx-side-panel spx-side-panel--320">`
);

// ── Line 4391: generator panel header ────────────────────────────────────────
app = app.replace(
  `          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderBottom:"1px solid #21262d",background:"#161b22"}}>`,
  `          <div className="spx-gen-panel-header">`
);
app = app.replace(
  `            <span style={{color:"#00ffc8",fontWeight:700,fontSize:12,fontFamily:"JetBrains Mono,monospace"}}>`,
  `            <span className="spx-gen-panel-title">`
);
app = app.replace(
  `            <button onClick={()=>{setFaceGenOpen(false);setFoliageGenOpen(false);setVehicleGenOpen(false);setCreatureGenOpen(false);setPropGenOpen(false);}} style={{background:"none",border:"none",color:"#8b949e",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>`,
  `            <button onClick={()=>{setFaceGenOpen(false);setFoliageGenOpen(false);setVehicleGenOpen(false);setCreatureGenOpen(false);setPropGenOpen(false);}} className="spx-overlay-close">×</button>`
);
app = app.replace(
  `          <div style={{flex:1,overflowY:"auto",padding:8}}>`,
  `          <div className="spx-gen-panel-body">`
);

fs.writeFileSync(appPath, app);
const remaining = (fs.readFileSync(appPath,'utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ App.jsx patched — ${remaining} style={{}} remaining`);
