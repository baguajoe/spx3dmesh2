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
  [`style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#888' }}`,`className="ha-slider-row"`],
  [`style={{ color:'#00ffc8', fontWeight:600 }}`,`className="ha-slider-val"`],
  [`style={{ width:'100%', accentColor:'#00ffc8', cursor:'pointer', height:16 }}`,`className="ha-slider"`],
  [`style={{ fontSize:10, color:'#888', marginBottom:2 }}`,`className="ha-select-label"`],
  [`style={{ accentColor:'#00ffc8', width:12, height:12 }}`,`className="ha-check__input"`],
  [`style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}`,`className="ha-color-row"`],
  [`style={{ fontSize:10, color:'#888', flex:1 }}`,`className="ha-color-label"`],
  [`style={{ width:32, height:22, border:'none', cursor:'pointer', borderRadius:3 }}`,`className="ha-color-input"`],
  [`style={{ fontSize:9, color:'#555', fontFamily:'monospace' }}`,`className="ha-color-hex"`],
  [`style={{ marginBottom:6, border:'1px solid #21262d', borderRadius:5, overflow:'hidden' }}`,`className="ha-section"`],
  [`style={{ fontSize:9, opacity:0.7 }}`,`className="ha-section__arrow"`],
  [`style={{ padding:'6px 8px', background:'#06060f' }}`,`className="ha-section__body"`],
  [`style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:6 }}`,`className="ha-badges"`],
  [`style={{width:260,background:C.panel,borderRadius:6,border:\`1px solid \${C.border}\`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:680}}`,`className="spnl-panel-container" style={{maxWidth:260}}`],
  [`style={{width:260,background:C.panel,borderRadius:6,border:\`1px solid \${C.border}\`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:600}}`,`className="spnl-panel-container" style={{maxWidth:260}}`],
  [`style={{width:320,background:C.panel,borderRadius:8,border:\`1px solid \${C.border}\`,fontFamily:C.font,color:C.text,boxShadow:'0 16px 48px rgba(0,0,0,0.8)',display:'flex',flexDirection:'column',maxHeight:680}}`,`className="spnl-panel-container" style={{maxWidth:320}}`],
  [`style={{width:300,background:C.panel,borderRadius:6,border:\`1px solid \${C.border}\`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:680}}`,`className="spnl-panel-container" style={{maxWidth:300}}`],
  [`style={{width:280,background:C.panel,borderRadius:6,border:\`1px solid \${C.border}\`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:680}}`,`className="spnl-panel-container" style={{maxWidth:280}}`],
  [`style={{width:280,background:C.panel,borderRadius:6,border:\`1px solid \${C.border}\`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:600}}`,`className="spnl-panel-container" style={{maxWidth:280}}`],
  [`style={{width:8,height:8,borderRadius:'50%',background:'#ff44aa',boxShadow:'0 0 6px #ff44aa'}}`,`className="spnl-hdr-dot" style={{background:'#ff44aa'}}`],
  [`style={{width:8,height:8,borderRadius:'50%',background:'#44ff88',boxShadow:'0 0 6px #44ff88'}}`,`className="spnl-hdr-dot" style={{background:'#44ff88'}}`],
  [`style={{width:8,height:8,borderRadius:'50%',background:'#ffaa44',boxShadow:'0 0 6px #ffaa44'}}`,`className="spnl-hdr-dot" style={{background:'#ffaa44'}}`],
  [`style={{width:8,height:8,borderRadius:'50%',background:'#aa44ff',boxShadow:'0 0 6px #aa44ff'}}`,`className="spnl-hdr-dot" style={{background:'#aa44ff'}}`],
  [`style={{width:8,height:8,borderRadius:'50%',background:C.teal,boxShadow:\`0 0 6px \${C.teal}\`}}`,`className="spnl-hdr-dot" style={{background:'#00ffc8'}}`],
  [`style={{width:8,height:8,borderRadius:'50%',background:C.orange,boxShadow:\`0 0 6px \${C.orange}\`}}`,`className="spnl-hdr-dot" style={{background:'#FF6600'}}`],
  [`style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#ff44aa'}}`,`className="spnl-hdr-title" style={{color:'#ff44aa'}}`],
  [`style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#44ff88'}}`,`className="spnl-hdr-title" style={{color:'#44ff88'}}`],
  [`style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#ffaa44'}}`,`className="spnl-hdr-title" style={{color:'#ffaa44'}}`],
  [`style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#aa44ff'}}`,`className="spnl-hdr-title" style={{color:'#aa44ff'}}`],
  [`style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}`,`className="spnl-panel-hdr"`],
  [`style={{width:8,height:8,borderRadius:'50%',background:'#44aaff',boxShadow:'0 0 10px #44aaff'}}`,`className="spnl-hdr-dot spnl-hdr-dot--blue"`],
  [`style={{display:'flex',gap:4,marginBottom:12,padding:'3px',background:'#0a0f1a',borderRadius:6}}`,`className="spnl-tab-row"`],
  [`style={{fontSize:8,color:C.dim}}`,`className="spnl-dim"`],
  [`style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:b.color}}`,`className="spnl-behavior-dot" style={{background:b.color}}`],
  [`style={{fontSize:9,fontWeight:700,color:C.dim,letterSpacing:2,marginBottom:10}}`,`className="spnl-section-label"`],
  [`style={{display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:8,marginBottom:10}}`,`className="spnl-row spnl-row--around"`],
  [`style={{display:'block',padding:'10px',border:\`2px dashed \${C.border}\`,borderRadius:6,textAlign:'center',cursor:'pointer',color:C.dim,fontSize:9,letterSpacing:1}}`,`className="spnl-drop-zone"`],
  [`style={{fontSize:8,opacity:0.6}}`,`className="spnl-dim"`],
  [`style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}`,`className="spnl-row"`],
  [`style={{fontSize:9,color:C.dim,marginBottom:4}}`,`className="spnl-dim"`],
  [`style={{fontSize:9,color:C.dim,marginBottom:2}}`,`className="spnl-dim"`],
  [`style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:2}}`,`className="spnl-row spnl-row--between"`],
  [`style={{width:28,height:28,borderRadius:'50%',background:C.panel,display:'flex',alignItems:'center',justifyContent:'center'}}`,`className="spnl-knob-inner"`],
  [`style={{fontSize:7,fontWeight:700,color,fontFamily:C.font}}`,`className="spnl-knob-val" style={{color}}`],
  [`style={{display:'flex',flexDirection:'column',gap:4,marginBottom:8}}`,`className="spnl-col"`],
  [`style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}`,`className="spnl-row"`],
  [`style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}`,`className="spnl-row"`],
  [`style={{display:'flex',flexDirection:'column',gap:6,marginBottom:8}}`,`className="spnl-col"`],
  [`style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}`,`className="spnl-row"`],
  [`style={{display:'flex',alignItems:'center',gap:4,marginBottom:4}}`,`className="spnl-row"`],
  [`style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}`,`className="spnl-row"`],
  [`style={{display:'flex',gap:8,marginBottom:6}}`,`className="spnl-row"`],
  [`style={{display:'flex',gap:4,marginBottom:4}}`,`className="spnl-row"`],
  [`style={{display:'flex',gap:6,marginBottom:4}}`,`className="spnl-row"`],
  [`style={{fontSize:9,color:C.teal,marginBottom:4,fontWeight:700}}`,`className="spnl-teal"`],
  [`style={{display:'flex',flexDirection:'column',gap:3}}`,`className="spnl-col"`],
  [`style={{display:'flex',flexDirection:'column',gap:4}}`,`className="spnl-col"`],
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
