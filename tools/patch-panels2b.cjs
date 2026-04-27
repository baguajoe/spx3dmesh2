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

// Spaced versions of the same sub-component patterns (HairAdvancedPanel style)
const EXACT = [
  // Slider sub-component (spaced)
  [`style={{ marginBottom: 5 }}`, `className="ha-slider-wrap"`],
  [`style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888' }}`,
   `className="ha-slider-row"`],
  [`style={{ color: '#00ffc8', fontWeight: 600 }}`, `className="ha-slider-val"`],
  [`style={{ width: '100%', accentColor: '#00ffc8', cursor: 'pointer', height: 16 }}`,
   `className="ha-slider"`],
  // Select sub-component (spaced)
  [`style={{ marginBottom: 6 }}`, `className="ha-select-wrap"`],
  [`style={{ fontSize: 10, color: '#888', marginBottom: 2 }}`, `className="ha-select-label"`],
  [`style={{\n        width:'100%', background:'#0d1117', color:'#e0e0e0',\n        border:'1px solid #21262d', padding:'3px 6px', borderRadius:4, fontSize:11, cursor:'pointer',\n      }}`, `className="ha-select"`],
  // Check sub-component (spaced)
  [`style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,\n      color: '#ccc', cursor: 'pointer', marginBottom: 4 }}`,
   `className="ha-check"`],
  [`style={{ accentColor: '#00ffc8', width: 12, height: 12 }}`, `className="ha-check__input"`],
  // Section sub-component (spaced)
  [`style={{ marginBottom: 6, border: '1px solid #21262d', borderRadius: 5, overflow: 'hidden' }}`,
   `className="ha-section"`],
  [`style={{ fontSize: 9, opacity: 0.7 }}`, `className="ha-section__arrow"`],
  [`style={{ padding: '6px 8px', background: '#06060f' }}`, `className="ha-section__body"`],
  // ColorRow (spaced)
  [`style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}`,
   `className="ha-color-row"`],
  [`style={{ fontSize: 10, color: '#888', flex: 1 }}`, `className="ha-color-label"`],
  [`style={{ width: 32, height: 22, border: 'none', cursor: 'pointer', borderRadius: 3 }}`,
   `className="ha-color-input"`],
  [`style={{ fontSize: 9, color: '#555', fontFamily: 'monospace' }}`, `className="ha-color-hex"`],
  // Badges (spaced)
  [`style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}`, `className="ha-badges"`],
  // GenBtn (spaced)
  [`style={{ width: '100%', background: '#00ffc8', color: '#06060f', border: 'none',\n      borderRadius: 4, padding: '7px 0', cursor: 'pointer', fontWeight: 700,\n      fontSize: 12, marginTop: 6, letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace',\n    }}`, `className="ha-gen-btn"`],

  // AssetLibrary S object patterns
  [`style={{ marginLeft: "auto", fontSize: 8, color: C.muted }}`, `className="spnl-dim spnl-ml-auto"`],
  [`style={{ fontSize: 22, marginBottom: 3 }}`, `className="spnl-icon-lg"`],
  [`style={{ fontSize: 9 }}`, `className="spnl-text-sm"`],
  [`style={{ color: C.teal, fontSize: 8, marginTop: 2 }}`, `className="spnl-teal spnl-text-xs"`],
  [`style={{ fontSize: 10, color: C.muted }}`, `className="spnl-dim"`],
  [`style={{ marginLeft: "auto", display: "flex", gap: 6 }}`, `className="spnl-row spnl-ml-auto"`],
  [`style={{ marginLeft: "auto", color: C.teal }}`, `className="spnl-teal spnl-ml-auto"`],
  [`style={{ accentColor: C.teal }}`, `className="spnl-check-input"`],
  // S.xxx references
  [`style={s.panel}`,`className="spnl-panel"`],
  [`style={s.row}`,`className="spnl-row"`],
  [`style={s.label}`,`className="spnl-label"`],
  [`style={s.btn}`,`className="spnl-btn"`],
  [`style={s.input}`,`className="spnl-input"`],
  [`style={s.select}`,`className="spnl-select"`],
  [`style={s.section}`,`className="spnl-section"`],
  [`style={s.sectionTitle}`,`className="spnl-section-title"`],
  [`style={s.header}`,`className="spnl-header"`],
  [`style={s.slider}`,`className="spnl-slider"`],
  [`style={s.title}`,`className="spnl-title"`],
  [`style={s.close}`,`className="spnl-close"`],
  [`style={s.root}`,`className="spnl-root"`],
  [`style={s.body}`,`className="spnl-body"`],
  // display none variants
  [`style={{display:'none'}}`,`className="spx-hidden"`],
  [`style={{ display: 'none' }}`,`className="spx-hidden"`],
  [`style={{display:"none"}}`,`className="spx-hidden"`],
];

function patchFile(filePath) {
  let f = fs.readFileSync(filePath, 'utf8');
  const before = (f.match(/style=\{\{/g)||[]).length;
  const beforeS = (f.match(/style=\{s\./g)||[]).length;
  const total = before + beforeS;
  if (total === 0) return 0;

  for (const [from, to] of EXACT) {
    f = f.split(from).join(to);
  }

  fs.writeFileSync(filePath, f);
  const after = (fs.readFileSync(filePath,'utf8').match(/style=\{\{/g)||[]).length;
  const afterS = (fs.readFileSync(filePath,'utf8').match(/style=\{s\./g)||[]).length;
  const totalAfter = after + afterS;
  if (totalAfter < total) console.log(`✓ ${path.basename(filePath)}: ${total} → ${totalAfter}`);
  else if (totalAfter === total) console.log(`  ${path.basename(filePath)}: ${total} (no change)`);
  else console.log(`! ${path.basename(filePath)}: ${total} → ${totalAfter} (INCREASED)`);
  return totalAfter;
}

let total = 0;
for (const f of FILES) {
  if (fs.existsSync(f)) total += patchFile(f);
}
console.log(`\nTotal remaining: ${total}`);
