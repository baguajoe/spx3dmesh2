#!/usr/bin/env node
const fs = require('fs');
const appPath = 'src/App.jsx';
let app = fs.readFileSync(appPath, 'utf8');

// ── Model picker panel — remove static style, keep only truly dynamic ─────────
// The panel itself (fixed position — move to CSS, remove style)
app = app.replace(
`        <div className="spx-model-picker-panel spx-model-picker-panel--open" style={{
          position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)",
          zIndex:200, background:"#0a0a14", border:"1px solid #1a2a3a",
          borderRadius:8, padding:"12px 16px", display:"flex", gap:10,
          alignItems:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.8)",
          fontFamily:"JetBrains Mono,monospace",
        }}>`,
`        <div className="spx-model-picker-panel">`
);

// Model card buttons — dynamic active border/bg/color kept as CSS classes
app = app.replace(
`              style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                padding:"8px 12px", borderRadius:6, cursor:"pointer",
                border:\`1px solid \${activeModelUrl===m.url?"#00ffc8":"#1a2a3a"}\`,
                background:activeModelUrl===m.url?"#00ffc822":"#070f1a",
                color:activeModelUrl===m.url?"#00ffc8":"#ccc",
                fontFamily:"inherit",
              }}>`,
`              className={\`spx-model-picker__card\${activeModelUrl===m.url?' spx-model-picker__card--active':''}\`}>`
);

// Upload label — remove static style
app = app.replace(
`          <label className="spx-model-picker__upload" style={{
            display:"flex", flexDirection:"column", alignItems:"center", gap:3,
            padding:"8px 12px", borderRadius:6, cursor:"pointer",
            border:"1px solid #1a2a3a", background:"#070f1a", color:"#ccc",
            fontFamily:"inherit",
          }}>`,
`          <label className="spx-model-picker__upload">`
);

// "Use Mine" button — remove static style, keep orange via CSS class
app = app.replace(
`            }} className="spx-model-picker__card" style={{
              display:"flex", flexDirection:"column", alignItems:"center", gap:3,
              padding:"8px 12px", borderRadius:6, cursor:"pointer",
              border:"1px solid #FF6600", background:"#FF660011", color:"#FF6600", fontFamily:"inherit",
            }}>`,
`            }} className="spx-model-picker__card spx-model-picker__card--orange">`
);

// ── Fix line 3954: box select className collision (patch2 wrongly applied className to wrong element) ─
app = app.replace(
`              className={\`spx-model-picker__card\${activeModelUrl===m.url?' spx-model-picker__card--active':''}\`} style={{left:boxSelect.x,top:boxSelect.y,width:boxSelect.w,height:boxSelect.h}}`,
`              className="spx-box-select" style={{left:boxSelect.x,top:boxSelect.y,width:boxSelect.w,height:boxSelect.h}}`
);

fs.writeFileSync(appPath, app);
const remaining = (fs.readFileSync(appPath,'utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ Final patch done — ${remaining} style={{}} remaining in App.jsx`);
