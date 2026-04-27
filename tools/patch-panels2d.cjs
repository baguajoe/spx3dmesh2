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

const EXACT = [
  // CustomSkinBuilderPanel remaining
  [`style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}`,
   `className="spnl-row spnl-row--between"`],
  [`style={{ fontSize:10, color:C.t1, fontFamily:C.font }}`,`className="spnl-text"`],
  [`style={{ fontSize:10, color:C.t0, fontFamily:C.font, fontWeight:600 }}`,`className="spnl-text spnl-text--bold"`],
  [`style={{ display:"flex", gap:6, flexWrap:"wrap" }}`,`className="spnl-row"`],
  [`style={{ display:"flex", gap:8, flexWrap:"wrap" }}`,`className="spnl-row"`],
  [`style={{ display:"flex", gap:4, flexWrap:"wrap" }}`,`className="spnl-row"`],
  [`style={{ display:"flex", gap:6 }}`,`className="spnl-row"`],
  [`style={{ display:"flex", gap:8 }}`,`className="spnl-row"`],
  [`style={{ display:"flex", gap:4 }}`,`className="spnl-row"`],
  [`style={{ display:"flex", alignItems:"center", gap:6 }}`,`className="spnl-row"`],
  [`style={{ display:"flex", alignItems:"center", gap:8 }}`,`className="spnl-row"`],
  [`style={{ display:"flex", alignItems:"center", gap:4 }}`,`className="spnl-row"`],
  [`style={{ display:"flex", flexDirection:"column", gap:6 }}`,`className="spnl-col"`],
  [`style={{ display:"flex", flexDirection:"column", gap:8 }}`,`className="spnl-col"`],
  [`style={{ display:"flex", flexDirection:"column", gap:4 }}`,`className="spnl-col"`],
  [`style={{ marginBottom:6 }}`,`className="spnl-mb-sm"`],
  [`style={{ marginBottom:8 }}`,`className="spnl-mb-sm"`],
  [`style={{ marginTop:8 }}`,`className="spnl-mt-sm"`],
  [`style={{ marginTop:6 }}`,`className="spnl-mt-sm"`],
  [`style={{ fontSize:10, color:C.t2, fontFamily:C.font }}`,`className="spnl-dim"`],
  [`style={{ fontSize:9, color:C.t2, fontFamily:C.font, fontWeight:600 }}`,`className="spnl-dim"`],

  // NodeModifierSystem — tag badges (dynamic colors — keep style, add className)
  [`style={{background:'rgba(0,255,200,0.12)',color:'var(--teal)',border:'1px solid rgba(0,255,200,0.25)'}}`,
   `className="spnl-tag spnl-tag--teal"`],
  [`style={{background:'rgba(255,102,0,0.12)',color:'var(--orange)',border:'1px solid rgba(255,102,0,0.25)'}}`,
   `className="spnl-tag spnl-tag--orange"`],
  // NodeModifierSystem SVG canvas (dynamic — keep style)
  [`style={{position:"absolute",top:40,left:0,width:"100%",height:"calc(100% - 40px)",pointerEvents:"none"}}`,
   `className="nms-svg"`],
  [`style={{position:"absolute",top:40,left:0,right:0,bottom:0}}`,
   `className="nms-canvas"`],

  // ShapeShifter / sequence patterns
  [`style={{display:"flex",gap:8,marginBottom:8}}`,`className="spnl-row"`],
  [`style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}`,`className="spnl-row"`],
  [`style={{display:"flex",flexWrap:"wrap",gap:4}}`,`className="spnl-row"`],
  [`style={{display:"flex",gap:4,flexWrap:"wrap"}}`,`className="spnl-row"`],
  [`style={{display:"flex",gap:6,flexWrap:"wrap"}}`,`className="spnl-row"`],
  [`style={{display:"flex",gap:8,flexWrap:"wrap"}}`,`className="spnl-row"`],
  [`style={{display:"flex",alignItems:"center",gap:6}}`,`className="spnl-row"`],
  [`style={{display:"flex",alignItems:"center",gap:4}}`,`className="spnl-row"`],
  [`style={{display:"flex",gap:6}}`,`className="spnl-row"`],
  [`style={{display:"flex",gap:4}}`,`className="spnl-row"`],
  [`style={{display:'flex',gap:6,flexWrap:'wrap'}}`,`className="spnl-row"`],
  [`style={{display:'flex',gap:8,flexWrap:'wrap'}}`,`className="spnl-row"`],
  [`style={{display:'flex',alignItems:'center',gap:6}}`,`className="spnl-row"`],
  [`style={{display:'flex',alignItems:'center',gap:8}}`,`className="spnl-row"`],
  [`style={{display:'flex',gap:6}}`,`className="spnl-row"`],
  [`style={{display:'flex',gap:8}}`,`className="spnl-row"`],
  [`style={{display:'flex',gap:4}}`,`className="spnl-row"`],
  [`style={{display:'flex',flexDirection:'column',gap:6}}`,`className="spnl-col"`],
  [`style={{display:'flex',flexDirection:'column',gap:8}}`,`className="spnl-col"`],
  // Dynamic color sequence label
  [`style={{fontSize:11,color:seqIdx===i?T.teal:T.muted,flex:1}}`,
   `className={\`spnl-seq-label\${seqIdx===i?' spnl-seq-label--active':''}\`}`],
  // Common text
  [`style={{fontSize:9,color:C.dim}}`,`className="spnl-dim"`],
  [`style={{fontSize:10,color:C.dim}}`,`className="spnl-dim"`],
  [`style={{fontSize:9,color:C.text}}`,`className="spnl-text-sm"`],
  [`style={{fontSize:10,color:C.text}}`,`className="spnl-text"`],
  [`style={{fontSize:9,color:C.teal}}`,`className="spnl-teal"`],
  [`style={{fontSize:10,color:C.teal}}`,`className="spnl-teal"`],
  [`style={{color:C.teal}}`,`className="spnl-teal"`],
  [`style={{marginBottom:6}}`,`className="spnl-mb-sm"`],
  [`style={{marginBottom:8}}`,`className="spnl-mb-sm"`],
  [`style={{marginBottom:4}}`,`className="spnl-mb-xs"`],
  [`style={{marginTop:8}}`,`className="spnl-mt-sm"`],
  [`style={{marginTop:4}}`,`className="spnl-mt-xs"`],
  // TerrainSculpting / TerrainSculptingPanel
  [`style={{width:'100%',accentColor:C.teal}}`,`className="spnl-slider"`],
  [`style={{width:'100%',accentColor:'#00ffc8'}}`,`className="spnl-slider"`],
  // Weather/FluidPanel ValueKnob
  [`style={{fontSize:9,color:C.teal,fontFamily:C.font,fontWeight:700,textAlign:'center'}}`,
   `className="spnl-knob-val"`],
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
  else console.log(`! ${path.basename(filePath)}: ${before} → ${after} (INCREASED)`);
  return after;
}

let total = 0;
for (const f of FILES) {
  if (fs.existsSync(f)) total += patchFile(f);
}
console.log(`\nTotal remaining: ${total}`);
