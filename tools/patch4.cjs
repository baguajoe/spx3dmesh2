#!/usr/bin/env node
const fs = require('fs');
const appPath = 'src/App.jsx';
let app = fs.readFileSync(appPath, 'utf8');

// ── Fix duplicate className on centerPanel div (line ~3930) ───────────────────
app = app.replace(
  `        <div className="mesh-editor-canvas"
          className={activeWorkspace === "Sculpt" ? "mesh-editor-canvas--sculpt" : ""}`,
  `        <div className={activeWorkspace === "Sculpt" ? "mesh-editor-canvas mesh-editor-canvas--sculpt" : "mesh-editor-canvas"}`
);

// ── Fix duplicate className on box select div ─────────────────────────────────
app = app.replace(
  `            <div className="spx-box-select"
              className="spx-box-select" style={{left:boxSelect.x,top:boxSelect.y,width:boxSelect.w,height:boxSelect.h}}
            />`,
  `            <div className="spx-box-select" style={{left:boxSelect.x,top:boxSelect.y,width:boxSelect.w,height:boxSelect.h}}/>`
);

// ── Physics overlay title (dynamic color — keep minimal) ──────────────────────
// Already has spx-overlay-title class, just needs color var
app = app.replace(
  `            <span className="spx-overlay-title" style={{color:"#FF6600"}}>⚙️ PHYSICS SIMULATION</span>`,
  `            <span className="spx-overlay-title spx-overlay-title--orange">⚙️ PHYSICS SIMULATION</span>`
);
app = app.replace(
  `            <span className="spx-overlay-title" style={{color:"#aa44ff"}}>🥽 VR PREVIEW</span>`,
  `            <span className="spx-overlay-title spx-overlay-title--purple">🥽 VR PREVIEW</span>`
);
app = app.replace(
  `            <span className="spx-overlay-title" style={{color:"#44bb77"}}>🏔️ TERRAIN SCULPTING</span>`,
  `            <span className="spx-overlay-title spx-overlay-title--green">🏔️ TERRAIN SCULPTING</span>`
);

fs.writeFileSync(appPath, app);
const remaining = (fs.readFileSync(appPath,'utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ Final patch done — ${remaining} style={{}} remaining in App.jsx`);
console.log('  (remaining are only dynamic positioning: boxSelect x/y/w/h)');
