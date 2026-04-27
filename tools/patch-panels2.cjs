#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SKIP = new Set([
  'TeethGeneratorPanel.jsx','TattooGeneratorPanel.jsx','EyebrowGeneratorPanel.jsx',
  'EyeGeneratorPanel.jsx','FishGeneratorPanel.jsx','BirdGeneratorPanel.jsx',
  'MorphGeneratorPanel.jsx','CreatureGeneratorPanel.jsx','BodyGeneratorPanel.jsx',
]);

const FILES = [
  ...fs.readdirSync('src/components/panels').filter(f=>f.endsWith('.jsx')&&!SKIP.has(f)).map(f=>`src/components/panels/${f}`),
  ...fs.readdirSync('src/components/generators').filter(f=>f.endsWith('.jsx')&&!SKIP.has(f)).map(f=>`src/components/generators/${f}`),
];

// Only exact literal replacements — no broad regex
const EXACT = [
  // Knob outer (CrowdPanel style)
  [`style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:52}}`,
   `className="spnl-knob"`],
  // Knob outer (CustomSkinBuilder style with spaces)
  [`style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"ns-resize", userSelect:"none", minWidth:52 }}`,
   `className="spnl-knob"`],
  // Knob ring (conic gradient — dynamic, add className alongside)
  [`style={{width:44,height:44,borderRadius:'50%',`,
   `className="spnl-knob-ring-wrap" style={{width:44,height:44,borderRadius:'50%',`],
  // Knob inner
  [`style={{width:30,height:30,borderRadius:'50%',background:C.panel,display:'flex',alignItems:'center',justifyContent:'center'}}`,
   `className="spnl-knob-inner"`],
  // Knob val span
  [`style={{fontSize:8,fontWeight:700,color,fontFamily:C.font}}`,
   `className="spnl-knob-val" style={{color}}`],
  // Knob label span
  [`style={{fontSize:7,color:C.dim,letterSpacing:0.3,textTransform:'uppercase',textAlign:'center',fontFamily:C.font}}`,
   `className="spnl-knob-label"`],
  // CustomSkinBuilder knob val
  [`style={{ fontSize:9, color:color, fontFamily:C.font, letterSpacing:"0.05em" }}`,
   `className="spnl-knob-val" style={{color:color}}`],
  // CustomSkinBuilder knob label
  [`style={{ fontSize:8, color:C.t2, fontFamily:C.font, textAlign:"center", maxWidth:52 }}`,
   `className="spnl-knob-label"`],
  // ColorPicker wrap
  [`style={{ display:"flex", flexDirection:"column", gap:3 }}`,
   `className="spnl-color-wrap"`],
  // ColorPicker label
  [`style={{ fontSize:9, color:C.t2, fontFamily:C.font }}`,
   `className="spnl-label"`],
  // ColorPicker row
  [`style={{ display:"flex", alignItems:"center", gap:6 }}`,
   `className="spnl-row"`],
  // ColorPicker swatch (dynamic bg — keep style)
  [`style={{ width:28, height:28, background:value, border:\`1px solid \${C.border}\`,\n          borderRadius:3, cursor:"pointer", position:"relative" }}`,
   `className="spnl-swatch" style={{background:value}}`],
  // ColorPicker hidden input
  [`style={{ opacity:0, position:"absolute", inset:0, cursor:"pointer", width:"100%", height:"100%" }}`,
   `className="spnl-color-input-hidden"`],
  // ColorPicker val span
  [`style={{ fontSize:9, color:C.t1, fontFamily:C.font }}`,
   `className="spnl-text"`],

  // Slider (FilmSubdivPanel inline style)
  [`style={{marginBottom:5}}`,`className="ha-slider-wrap"`],
  [`style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.dim,marginBottom:1}}`,
   `className="ha-slider-row"`],
  [`style={{color:C.teal,fontWeight:700}}`,`className="ha-slider-val"`],
  [`style={{width:'100%',accentColor:C.teal,cursor:'pointer',height:3}}`,`className="ha-slider"`],

  // Section (FilmSubdivPanel)
  [`style={{marginBottom:6}}`,`className="spnl-section-wrap"`],
  [`style={{display:'flex',alignItems:'center',gap:6,padding:'4px 8px',background:'#0a0f1a',borderRadius:4,cursor:'pointer',borderLeft:\`2px solid \${color}\`,marginBottom:open?5:0}}`,
   `className="spnl-section-hdr" style={{borderLeftColor:color}}`],
  [`style={{color,fontSize:9}}`,`className="spnl-section-arrow" style={{color}}`],
  [`style={{fontSize:9,fontWeight:700,color:C.text,letterSpacing:1}}`,`className="spnl-section-name"`],
  [`style={{paddingLeft:8}}`,`className="spnl-section-body-pl"`],

  // display:none
  [`style={{display:'none'}}`,`className="spx-hidden"`],
  [`style={{ display: 'none' }}`,`className="spx-hidden"`],
  [`style={{display:"none"}}`,`className="spx-hidden"`],
];

function patchFile(filePath) {
  let f = fs.readFileSync(filePath, 'utf8');
  const before = (f.match(/style=\{\{/g)||[]).length;
  if (before === 0) return 0;

  for (const [from, to] of EXACT) {
    f = f.split(from).join(to);
  }

  fs.writeFileSync(filePath, f);
  const after = (fs.readFileSync(filePath,'utf8').match(/style=\{\{/g)||[]).length;
  if (after < before) console.log(`✓ ${path.basename(filePath)}: ${before} → ${after}`);
  else if (after === before) console.log(`  ${path.basename(filePath)}: ${before} (no change)`);
  else console.log(`! ${path.basename(filePath)}: ${before} → ${after} (INCREASED - check)`);
  return after;
}

let total = 0;
for (const f of FILES) {
  if (fs.existsSync(f)) total += patchFile(f);
}
console.log(`\nTotal remaining: ${total}`);
