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
  // CrowdPanel — close button
  [`style={{cursor:'pointer',color:C.dim,fontSize:14}}`,`className="spnl-close"`],
  // CrowdPanel panel container remainder (dynamic border — keep)
  // Already has className, just need the trailing style to have borderColor

  // FilmRenderPipeline — Toggle component
  [`style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}`,`className="spnl-toggle-row"`],
  [`style={{width:32,height:16,borderRadius:8,cursor:'pointer',position:'relative',background:value?C.teal:C.border}}`,
   `className={\`spnl-toggle\${value?' spnl-toggle--on':''}\`}`],
  [`style={{position:'absolute',top:2,left:value?16:2,width:12,height:12,borderRadius:'50%',background:value?C.bg:'#555',transition:'left 0.15s'}}`,
   `className={\`spnl-toggle-dot\${value?' spnl-toggle-dot--on':''}\`}`],
  // FilmRenderPipeline panel container (width:270)
  [`style={{width:270,background:C.panel,borderRadius:6,border:\`1px solid \${C.border}\`,fontFamily:C.font,color:C.text,fontSize:11,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',maxHeight:700}}`,
   `className="spnl-panel-container" style={{maxWidth:270}}`],
  // Header dot yellow
  [`style={{width:6,height:6,borderRadius:'50%',background:'#ffcc00',boxShadow:'0 0 6px #ffcc00'}}`,`className="spnl-hdr-dot spnl-hdr-dot--yellow"`],
  [`style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#ffcc00'}}`,`className="spnl-hdr-title spnl-hdr-title--yellow"`],
  // FilmRenderPipeline col
  [`style={{display:'flex',flexDirection:'column',gap:3,marginBottom:4}}`,`className="spnl-col"`],
  // marginBottom:12
  [`style={{ marginBottom:12 }}`,`className="spnl-mb-md"`],
  [`style={{marginBottom:12}}`,`className="spnl-mb-md"`],
  // Toggle (CustomSkinBuilderPanel style with spaces)
  [`style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}`,`className="spnl-toggle-row"`],
  // VRPreviewMode — s.btn() and s.tag() calls (dynamic — keep style, add className)
  [`style={{ ...s.btn(), fontSize: 9, padding: "5px 4px" }}`,`className="spnl-btn" style={{fontSize:9,padding:'5px 4px'}}`],
  [`style={{ ...s.tag(C.purple), animation: "none" }}`,`className="spnl-tag" style={{animationName:'none'}}`],
  // VR split screen divider
  [`style={{ position: "relative", flex: 1 }}`,`className="spnl-vr-wrap"`],
  [`style={{ position: "absolute", top: 0, left: "50%", width: 2, height: "100%", background: "#000000", transform: "translateX(-50%)", pointerEvents: "none" }}`,
   `className="spnl-vr-divider"`],
  [`style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, pointerEvents: "none" }}`,
   `className="spnl-vr-overlay"`],
  // EnvironmentGenerator
  [`style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',marginBottom:8,fontSize:10,color:'var(--muted)'}}`,
   `className="spnl-row"`],
  [`style={{accentColor:'var(--teal)'}}`,`className="spnl-check-input"`],
  [`style={{width:'100%',marginBottom:6}}`,`className="spnl-btn-full spnl-btn-mb"`],
  [`style={{width:'100%'}}`,`className="spnl-btn-full"`],
  [`style={{fontSize:10,color:'var(--teal)',marginBottom:2}}`,`className="spnl-teal"`],
  // CustomSkinBuilderPanel Toggle sub-component
  [`style={{width:32,height:16,borderRadius:8,cursor:'pointer',position:'relative',background:value?'#00ffc8':'#21262d'}}`,
   `className={\`spnl-toggle\${value?' spnl-toggle--on':''}\`}`],
  [`style={{position:'absolute',top:2,left:value?16:2,width:12,height:12,borderRadius:'50%',background:value?'#06060f':'#555',transition:'left 0.15s'}}`,
   `className={\`spnl-toggle-dot\${value?' spnl-toggle-dot--on':''}\`}`],
  // Remaining common patterns with various spacing
  [`style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}`,`className="spnl-toggle-row"`],
  [`style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}`,`className="spnl-row spnl-row--between"`],
  [`style={{display:'flex',justifyContent:'space-between'}}`,`className="spnl-row spnl-row--between"`],
  [`style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}`,`className="spnl-row spnl-row--between"`],
  [`style={{ marginBottom: 12 }}`,`className="spnl-mb-md"`],
  [`style={{ marginTop: 12 }}`,`className="spnl-mt-md"`],
  [`style={{ padding: '6px 8px' }}`,`className="spnl-pad"`],
  [`style={{ padding: '8px 10px' }}`,`className="spnl-pad"`],
  [`style={{ flex: 1 }}`,`className="spnl-flex1"`],
  [`style={{flex:1}}`,`className="spnl-flex1"`],
  [`style={{ width: '100%' }}`,`className="spnl-full-w"`],
  [`style={{width:'100%'}}`,`className="spnl-full-w"`],
  // Remaining knob ring (with conic gradient — keep style, already has className)
  // These are unavoidable dynamic values
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
