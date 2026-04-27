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
  // Panel container (FilmSubdivPanel, CrowdPanel style)
  [`style={{width:250,background:C.panel,borderRadius:6,border:\`1px solid \${C.border}\`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:600}}`,
   `className="spnl-panel-container"`],
  [`style={{width:340,background:C.panel,borderRadius:8,border:\`1px solid \${C.border}\`,`,
   `className="spnl-panel-container-lg" style={{`],
  // Panel header gradient (common across many panels)
  [`style={{background:'linear-gradient(90deg,#0a1520,#0d1117)',borderBottom:\`1px solid \${C.border}\`,padding:'8px 12px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}`,
   `className="spnl-panel-hdr"`],
  [`style={{background:'linear-gradient(135deg,#0a1020,#0d1117)',borderBottom:\`1px solid \${C.border}\`,`,
   `className="spnl-panel-hdr" style={{`],
  // Panel body scroll
  [`style={{flex:1,overflowY:'auto',padding:'10px 12px'}}`,`className="spnl-panel-scroll"`],
  [`style={{flex:1,overflowY:'auto',padding:'12px 14px'}}`,`className="spnl-panel-scroll"`],
  [`style={{padding:'5px 14px',fontSize:9,color:C.dim,borderBottom:\`1px solid \${C.border}\`}}`,
   `className="spnl-status-bar"`],
  // Close button
  [`style={{marginLeft:'auto',cursor:'pointer',color:C.dim}}`,`className="spnl-close"`],
  [`style={{marginLeft:'auto',cursor:'pointer',color:C.dim,fontSize:14}}`,`className="spnl-close"`],
  // Stats box
  [`style={{background:C.bg,borderRadius:4,padding:'6px 10px',marginBottom:8,border:\`1px solid \${C.border}\`}}`,
   `className="spnl-stats-box"`],
  [`style={{fontSize:9,color:C.dim,letterSpacing:1}}`,`className="spnl-stats-label"`],
  // Grid layout
  [`style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}`,`className="spnl-grid-2"`],
  [`style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}`,`className="spnl-grid-2"`],
  [`style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}`,`className="spnl-grid-2"`],
  // Button variants
  [`style={{padding:'6px 0',background:C.bg,border:\`1px solid \${C.border}\`,borderRadius:4,color:C.dim,fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer'}}`,
   `className="spnl-btn"`],
  [`style={{width:'100%',padding:'7px 0',marginTop:4,background:'rgba(0,255,200,0.1)',border:\`1px solid \${C.teal}\`,borderRadius:4,color:C.teal,fontFamily:C.font,fontSize:9,fontWeight:700,cursor:'pointer',letterSpacing:1}}`,
   `className="spnl-btn-full spnl-btn-accent"`],
  [`style={{width:'100%',padding:'5px 0',marginTop:4,background:'transparent',border:\`1px solid \${C.border}\`,borderRadius:4,color:C.dim,fontFamily:C.font,fontSize:9,cursor:'pointer'}}`,
   `className="spnl-btn-full"`],
  // Level items (dynamic active state — keep style, add className)
  [`style={{display:'flex',flexDirection:'column',gap:3,marginBottom:6}}`,`className="spnl-level-list"`],
  // Behavior cards (dynamic color — keep style)
  [`style={{display:'flex',flexDirection:'column',gap:4}}`,`className="spnl-col"`],
  [`style={{marginBottom:14}}`,`className="spnl-mb"`],
  [`style={{fontSize:9,fontWeight:700,color:C.dim,letterSpacing:2,marginBottom:8}}`,`className="spnl-section-label"`],
  // Icon + status in header
  [`style={{width:8,height:8,borderRadius:'50%',background:'#88ffaa',boxShadow:'0 0 10px #88ffaa'}}`,
   `className="spnl-hdr-dot spnl-hdr-dot--green"`],
  [`style={{width:6,height:6,borderRadius:'50%',background:'#44aaff',boxShadow:'0 0 6px #44aaff'}}`,
   `className="spnl-hdr-dot spnl-hdr-dot--blue"`],
  [`style={{fontSize:12,fontWeight:700,letterSpacing:3,color:'#88ffaa'}}`,`className="spnl-hdr-title spnl-hdr-title--green"`],
  [`style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#44aaff'}}`,`className="spnl-hdr-title spnl-hdr-title--blue"`],
  // Agent count
  [`style={{fontSize:9,color:running?C.teal:C.dim}}`,`className={\`spnl-agent-count\${running?' spnl-agent-count--on':''}\`}`],
  // EnvironmentGenerator gen-sec-label with padding
  [`className="gen-sec-label" style={{padding:'0 0 6px'}}`,`className="gen-sec-label gen-sec-label--pb"`],
  [`className="gen-sec-label" style={{padding:'8px 0 4px'}}`,`className="gen-sec-label gen-sec-label--mt"`],
  // s.sectionLabel spread
  [`style={{ ...s.sectionLabel, paddingTop: search ? 12 : 4 }}`,
   `className="spnl-section-label"`],
  // Common text patterns
  [`style={{fontSize:9,color:C.dim,marginBottom:6}}`,`className="spnl-dim"`],
  [`style={{fontSize:16,fontWeight:700,color:polyCount>500000?C.orange:C.teal}}`,
   `className="spnl-poly-count" style={{color:polyCount>500000?'#FF6600':'#00ffc8'}}`],
  [`style={{fontSize:10,fontWeight:700,color:behavior===b.id?b.color:C.text}}`,
   `className="spnl-behavior-label" style={{color:behavior===b.id?b.color:'#e0e0e0'}}`],
  [`style={{fontSize:16}}`,`className="spnl-icon-md"`],
  [`style={{fontSize:18}}`,`className="spnl-icon-lg"`],
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
