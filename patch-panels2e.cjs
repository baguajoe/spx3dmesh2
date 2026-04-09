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
  // CrowdPanel header addon
  [`style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}`,`className="spnl-row spnl-ml-auto"`],
  // VRPreviewMode
  [`style={{ fontSize: 20, marginBottom: 3 }}`,`className="spnl-icon-lg"`],
  [`style={{ padding: "0 12px 8px", fontSize: 9, color: C.muted, lineHeight: 1.6 }}`,`className="spnl-dim spnl-pad-desc"`],
  [`style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "0 10px 10px" }}`,`className="spnl-grid-2 spnl-pad-grid"`],
  // TerrainSculpting
  [`style={{padding:"0 12px 6px",fontSize:9,color:"var(--muted)",fontFamily:"var(--font)"}}`,`className="spnl-dim spnl-pad-desc"`],
  // Dynamic paint color swatch (keep style)
  [`style={{background:paintColor}}`,`className="gen-paint-swatch" style={{background:paintColor}}`],
  // Biome swatch (dynamic — keep style)
  [`className="gen-biome-swatch" style={{background:c}}`,`className="gen-biome-swatch" style={{background:c}}`],
  // Dynamic tag (keep style for dynamic color)
  [`className="gen-tag" style={{background:\`\${currentTool?.color||'#00ffc8'}20\`,color:currentTool?.color||'#00ffc8',border:\`1px solid \${currentTool?.color||'#00ffc8'}40\`}}`,
   `className="gen-tag gen-tag--tool" style={{background:\`\${currentTool?.color||'#00ffc8'}20\`,color:currentTool?.color||'#00ffc8',border:\`1px solid \${currentTool?.color||'#00ffc8'}40\`}}`],
  // Static orange tag
  [`className="gen-tag" style={{background:'rgba(255,102,0,0.12)',color:'#FF6600',border:'1px solid rgba(255,102,0,0.25)'}}`,
   `className="gen-tag spnl-tag--orange"`],
  // More common patterns
  [`style={{ display: "flex", gap: 6, flexWrap: "wrap" }}`,`className="spnl-row"`],
  [`style={{ display: "flex", gap: 8, flexWrap: "wrap" }}`,`className="spnl-row"`],
  [`style={{ display: "flex", gap: 4, flexWrap: "wrap" }}`,`className="spnl-row"`],
  [`style={{ display: "flex", alignItems: "center", gap: 6 }}`,`className="spnl-row"`],
  [`style={{ display: "flex", alignItems: "center", gap: 8 }}`,`className="spnl-row"`],
  [`style={{ display: "flex", alignItems: "center", gap: 4 }}`,`className="spnl-row"`],
  [`style={{ display: "flex", flexDirection: "column", gap: 6 }}`,`className="spnl-col"`],
  [`style={{ display: "flex", flexDirection: "column", gap: 8 }}`,`className="spnl-col"`],
  [`style={{ display: "flex", gap: 6 }}`,`className="spnl-row"`],
  [`style={{ display: "flex", gap: 8 }}`,`className="spnl-row"`],
  [`style={{ display: "flex", gap: 4 }}`,`className="spnl-row"`],
  [`style={{ marginBottom: 6 }}`,`className="spnl-mb-sm"`],
  [`style={{ marginBottom: 8 }}`,`className="spnl-mb-sm"`],
  [`style={{ marginBottom: 4 }}`,`className="spnl-mb-xs"`],
  [`style={{ marginTop: 8 }}`,`className="spnl-mt-sm"`],
  [`style={{ marginTop: 6 }}`,`className="spnl-mt-sm"`],
  [`style={{ marginTop: 4 }}`,`className="spnl-mt-xs"`],
  [`style={{ fontSize: 9, color: C.muted }}`,`className="spnl-dim"`],
  [`style={{ fontSize: 10, color: C.muted }}`,`className="spnl-dim"`],
  [`style={{ fontSize: 9, color: C.dim }}`,`className="spnl-dim"`],
  [`style={{ fontSize: 10, color: C.dim }}`,`className="spnl-dim"`],
  [`style={{ fontSize: 9, color: C.teal }}`,`className="spnl-teal"`],
  [`style={{ fontSize: 10, color: C.teal }}`,`className="spnl-teal"`],
  [`style={{ color: C.teal }}`,`className="spnl-teal"`],
  [`style={{ color: C.muted }}`,`className="spnl-dim"`],
  [`style={{ color: C.dim }}`,`className="spnl-dim"`],
  [`style={{ fontSize: 9 }}`,`className="spnl-text-sm"`],
  [`style={{ fontSize: 10 }}`,`className="spnl-text"`],
  [`style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}`,`className="spnl-grid-2"`],
  [`style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}`,`className="spnl-grid-2"`],
  [`style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}`,`className="spnl-grid-2"`],
  [`style={{ width: "100%", accentColor: C.teal }}`,`className="spnl-slider"`],
  [`style={{ width: "100%", accentColor: "#00ffc8" }}`,`className="spnl-slider"`],
  [`style={{ accentColor: "#00ffc8" }}`,`className="spnl-check-input"`],
  [`style={{ accentColor: C.teal }}`,`className="spnl-check-input"`],
  // display:none
  [`style={{ display: "none" }}`,`className="spx-hidden"`],
  [`style={{display:'none'}}`,`className="spx-hidden"`],
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
