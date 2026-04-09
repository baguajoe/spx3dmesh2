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

// Common regex-based replacements that work across ALL files
function patchFile(filePath) {
  let f = fs.readFileSync(filePath, 'utf8');
  const before = (f.match(/style=\{\{/g)||[]).length;
  if (before === 0) return 0;

  // Remove S const objects (style dictionaries)
  f = f.replace(/^const [Ss] = \{[\s\S]*?\};\n\n/gm, '');
  f = f.replace(/^const s = \{[\s\S]*?\};\n\n/gm, '');

  // ── Common sub-component patterns (same across many files) ──────────────────

  // Knob outer div (various flavors)
  f = f.replace(/style=\{\{display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:52\}\}/g,
    'className="spnl-knob"');
  f = f.replace(/style=\{\{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"ns-resize", userSelect:"none", minWidth:52 \}\}/g,
    'className="spnl-knob"');
  f = f.replace(/style=\{\{display:'flex',flexDirection:'column',alignItems:'center',gap:\d,cursor:'ns-resize',userSelect:'none'\}\}/g,
    'className="spnl-knob"');

  // Knob value/label text
  f = f.replace(/style=\{\{fontSize:[89],color:C\.dim,letterSpacing:[\d.]+,textTransform:'uppercase',textAlign:'center',fontFamily:C\.font\}\}/g,
    'className="spnl-knob-label"');
  f = f.replace(/style=\{\{ fontSize:8, color:C\.t2, fontFamily:C\.font, textAlign:"center", maxWidth:52 \}\}/g,
    'className="spnl-knob-label"');
  f = f.replace(/style=\{\{ fontSize:9, color:color, fontFamily:C\.font, letterSpacing:"0.05em" \}\}/g,
    'className="spnl-knob-val"');
  f = f.replace(/style=\{\{fontSize:[78],fontWeight:700,color,fontFamily:C\.font\}\}/g,
    'className="spnl-knob-val"');

  // Knob ring divs (conic gradient — dynamic, keep style but add className)
  f = f.replace(
    /style=\{\{width:44,height:44,borderRadius:'50%',\s*background:`conic-gradient\(\$\{color\}[^`]*`,[^}]*\}\}/g,
    (m) => `className="spnl-knob-ring" ${m}`
  );
  f = f.replace(
    /style=\{\{width:30,height:30,borderRadius:'50%',background:C\.panel,display:'flex',alignItems:'center',justifyContent:'center'\}\}/g,
    'className="spnl-knob-inner"'
  );

  // Section headers
  f = f.replace(/style=\{\{[^}]*fontSize:1[01],[^}]*color:C\.teal[^}]*fontWeight:[67]00[^}]*\}\}/g,
    'className="spnl-section-title"');
  f = f.replace(/style=\{\{[^}]*color:C\.teal[^}]*fontSize:1[01][^}]*fontWeight:[67]00[^}]*\}\}/g,
    'className="spnl-section-title"');

  // Row layouts
  f = f.replace(/style=\{\{display:'flex',gap:\d+,flexWrap:'wrap'\}\}/g, 'className="spnl-row"');
  f = f.replace(/style=\{\{display:'flex',gap:\d+,alignItems:'center',flexWrap:'wrap'\}\}/g, 'className="spnl-row"');
  f = f.replace(/style=\{\{display:'flex',alignItems:'center',gap:\d+\}\}/g, 'className="spnl-row"');
  f = f.replace(/style=\{\{ display:'flex', gap:\d+, flexWrap:'wrap' \}\}/g, 'className="spnl-row"');
  f = f.replace(/style=\{\{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:\d+ \}\}/g,
    'className="spnl-row spnl-row--between"');

  // Buttons
  f = f.replace(/style=\{\{[^}]*background:C\.teal[^}]*color:'#0[0-9a-f]+'[^}]*border:'none'[^}]*borderRadius:\d+[^}]*\}\}/g,
    'className="spnl-btn-accent"');
  f = f.replace(/style=\{\{[^}]*background:C\.orange[^}]*color:'#fff'[^}]*border:'none'[^}]*\}\}/g,
    'className="spnl-btn-orange"');
  f = f.replace(/style=\{\{[^}]*background:C\.panel[^}]*border:`1px solid \$\{C\.border\}`[^}]*\}\}/g,
    'className="spnl-btn"');
  f = f.replace(/style=\{\{[^}]*background:'#1a[12][ef][0-9a-f]+'[^}]*border:'1px solid #[23][01][23][23][23][de]'[^}]*\}\}/g,
    'className="spnl-btn"');

  // Input/select
  f = f.replace(/style=\{\{[^}]*background:C\.bg[^}]*border:`1px solid \$\{C\.border\}`[^}]*color:C\.t[01][^}]*\}\}/g,
    'className="spnl-input"');
  f = f.replace(/style=\{\{[^}]*background:C\.panel[^}]*border:`1px solid \$\{C\.border\}`[^}]*color:C\.t[01][^}]*borderRadius:\d[^}]*\}\}/g,
    'className="spnl-select"');

  // Color swatch picker outer
  f = f.replace(/style=\{\{ display:"flex", flexDirection:"column", gap:3 \}\}/g,
    'className="spnl-color-wrap"');
  f = f.replace(/style=\{\{ fontSize:9, color:C\.t2, fontFamily:C\.font \}\}/g,
    'className="spnl-label"');
  f = f.replace(/style=\{\{ display:"flex", alignItems:"center", gap:6 \}\}/g,
    'className="spnl-row"');

  // Hidden color input inside swatch
  f = f.replace(/style=\{\{ opacity:0, position:"absolute", inset:0, cursor:"pointer", width:"100%", height:"100%" \}\}/g,
    'className="spnl-color-input-hidden"');

  // Swatch color div (dynamic background — keep style)
  f = f.replace(
    /style=\{\{ width:28, height:28, background:value, border:`1px solid \$\{C\.border\}`,\s*borderRadius:3, cursor:"pointer", position:"relative" \}\}/g,
    'className="spnl-swatch" style={{ background:value }}'
  );

  // Text styles
  f = f.replace(/style=\{\{fontSize:[89],color:C\.t[12],fontFamily:C\.font\}\}/g, 'className="spnl-dim"');
  f = f.replace(/style=\{\{ fontSize:9, color:C\.t1, fontFamily:C\.font \}\}/g, 'className="spnl-text"');
  f = f.replace(/style=\{\{fontSize:9,color:C\.dim[^}]*\}\}/g, 'className="spnl-dim"');
  f = f.replace(/style=\{\{fontSize:10,color:C\.dim[^}]*\}\}/g, 'className="spnl-dim"');
  f = f.replace(/style=\{\{color:C\.teal[^}]*\}\}/g, 'className="spnl-teal"');
  f = f.replace(/style=\{\{ color: C\.teal[^}]*\}\}/g, 'className="spnl-teal"');
  f = f.replace(/style=\{\{color:C\.dim[^}]*\}\}/g, 'className="spnl-dim"');
  f = f.replace(/style=\{\{ color: C\.muted[^}]*\}\}/g, 'className="spnl-dim"');
  f = f.replace(/style=\{\{color:C\.muted[^}]*\}\}/g, 'className="spnl-dim"');
  f = f.replace(/style=\{\{ fontSize: 22, marginBottom: 3 \}\}/g, 'className="spnl-icon-lg"');
  f = f.replace(/style=\{\{ fontSize: 9 \}\}/g, 'className="spnl-text-sm"');
  f = f.replace(/style=\{\{ fontSize: 8, marginTop: 2 \}\}/g, 'className="spnl-text-xs"');
  f = f.replace(/style=\{\{ fontSize: 10, color: C\.muted \}\}/g, 'className="spnl-dim"');
  f = f.replace(/style=\{\{ marginLeft: "auto", fontSize: 8, color: C\.muted \}\}/g, 'className="spnl-dim spnl-ml-auto"');
  f = f.replace(/style=\{\{ marginLeft: "auto"[^}]*\}\}/g, 'className="spnl-ml-auto"');
  f = f.replace(/style=\{\{ marginLeft: "auto", display: "flex", gap: \d+ \}\}/g, 'className="spnl-row spnl-ml-auto"');

  // Section label pattern (common)
  f = f.replace(/style=\{\{[^}]*\.sectionLabel[^}]*\}\}/g, 'className="spnl-section-label"');
  f = f.replace(/style=\{\{\s*\.\.\.[Ss]\.sectionLabel[^}]*\}\}/g, 'className="spnl-section-label"');

  // accentColor checkbox
  f = f.replace(/style=\{\{ accentColor: C\.teal \}\}/g, 'className="spnl-check-input"');
  f = f.replace(/style=\{\{accentColor:C\.teal\}\}/g, 'className="spnl-check-input"');

  // display:none
  f = f.replace(/style=\{\{display:'none'\}\}/g, 'className="spx-hidden"');
  f = f.replace(/style=\{\{ display: 'none' \}\}/g, 'className="spx-hidden"');
  f = f.replace(/style=\{\{display:"none"\}\}/g, 'className="spx-hidden"');

  // S.xxx object references
  f = f.replace(/style=\{[Ss]\.panel\}/g, 'className="spnl-panel"');
  f = f.replace(/style=\{[Ss]\.row\}/g, 'className="spnl-row"');
  f = f.replace(/style=\{[Ss]\.label\}/g, 'className="spnl-label"');
  f = f.replace(/style=\{[Ss]\.btn\}/g, 'className="spnl-btn"');
  f = f.replace(/style=\{[Ss]\.btnAccent\}/g, 'className="spnl-btn-accent"');
  f = f.replace(/style=\{[Ss]\.input\}/g, 'className="spnl-input"');
  f = f.replace(/style=\{[Ss]\.select\}/g, 'className="spnl-select"');
  f = f.replace(/style=\{[Ss]\.section\}/g, 'className="spnl-section"');
  f = f.replace(/style=\{[Ss]\.sectionTitle\}/g, 'className="spnl-section-title"');
  f = f.replace(/style=\{[Ss]\.sectionLabel\}/g, 'className="spnl-section-label"');
  f = f.replace(/style=\{[Ss]\.header\}/g, 'className="spnl-header"');
  f = f.replace(/style=\{[Ss]\.slider\}/g, 'className="spnl-slider"');
  f = f.replace(/style=\{[Ss]\.title\}/g, 'className="spnl-title"');
  f = f.replace(/style=\{[Ss]\.dim\}/g, 'className="spnl-dim"');
  f = f.replace(/style=\{[Ss]\.muted\}/g, 'className="spnl-dim"');
  f = f.replace(/style=\{[Ss]\.body\}/g, 'className="spnl-body"');
  f = f.replace(/style=\{[Ss]\.close\}/g, 'className="spnl-close"');
  f = f.replace(/style=\{[Ss]\.root\}/g, 'className="spnl-root"');
  f = f.replace(/style=\{[Ss]\.btnRow\}/g, 'className="spnl-btn-row"');
  f = f.replace(/style=\{[Ss]\.btnFull\}/g, 'className="spnl-btn-full"');
  f = f.replace(/style=\{[Ss]\.btnFullAccent\}/g, 'className="spnl-btn-full spnl-btn-accent"');

  fs.writeFileSync(filePath, f);
  const after = (fs.readFileSync(filePath,'utf8').match(/style=\{\{/g)||[]).length;
  const sDotAfter = (fs.readFileSync(filePath,'utf8').match(/style=\{[Ss]\./g)||[]).length;
  console.log(`✓ ${path.basename(filePath)}: ${before} → ${after + sDotAfter} remaining`);
  return after + sDotAfter;
}

let total = 0;
for (const f of FILES) {
  if (fs.existsSync(f)) total += patchFile(f);
}
console.log(`\nTotal remaining: ${total}`);
