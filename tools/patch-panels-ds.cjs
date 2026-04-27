#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const SKIP = new Set(['TeethGeneratorPanel.jsx','TattooGeneratorPanel.jsx','EyebrowGeneratorPanel.jsx','EyeGeneratorPanel.jsx','FishGeneratorPanel.jsx','BirdGeneratorPanel.jsx','MorphGeneratorPanel.jsx','CreatureGeneratorPanel.jsx','BodyGeneratorPanel.jsx']);
const FILES = [...fs.readdirSync('src/components/panels').filter(f=>f.endsWith('.jsx')&&!SKIP.has(f)).map(f=>`src/components/panels/${f}`),...fs.readdirSync('src/components/generators').filter(f=>f.endsWith('.jsx')&&!SKIP.has(f)).map(f=>`src/components/generators/${f}`)];
const EXACT = [
  [`style={{ marginBottom: 5 }}`,`className="ha-slider-wrap"`],
  [`style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888' }}`,`className="ha-slider-row"`],
  [`style={{ color: '#00ffc8', fontWeight: 600 }}`,`className="ha-slider-val"`],
  [`style={{ width: '100%', accentColor: '#00ffc8', cursor: 'pointer', height: 16 }}`,`className="ha-slider"`],
  [`style={{ marginBottom: 6 }}`,`className="ha-select-wrap"`],
  [`style={{ fontSize: 10, color: '#888', marginBottom: 2 }}`,`className="ha-select-label"`],
  [`style={{ accentColor: '#00ffc8', width: 12, height: 12 }}`,`className="ha-check__input"`],
  [`style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}`,`className="ha-color-row"`],
  [`style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}`,`className="ha-color-row"`],
  [`style={{ fontSize: 10, color: '#888', flex: 1 }}`,`className="ha-color-label"`],
  [`style={{ width: 32, height: 22, border: 'none', cursor: 'pointer', borderRadius: 3 }}`,`className="ha-color-input"`],
  [`style={{ fontSize: 9, color: '#555', fontFamily: 'monospace' }}`,`className="ha-color-hex"`],
  [`style={{ fontSize: 9, color: '#555' }}`,`className="ha-color-hex"`],
  [`style={{ marginBottom: 6, border: '1px solid #21262d', borderRadius: 5, overflow: 'hidden' }}`,`className="ha-section"`],
  [`style={{ fontSize: 9, opacity: 0.7 }}`,`className="ha-section__arrow"`],
  [`style={{ padding: '6px 8px', background: '#06060f' }}`,`className="ha-section__body"`],
  [`style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}`,`className="ha-badges"`],
  [`style={{...S.input,padding:2,height:32}}`,`className="spnl-input" style={{padding:2,height:32}}`],
  [`style={{...S.label,cursor:"pointer"}}`,`className="spnl-label" style={{cursor:'pointer'}}`],
  [`style={{...S.stat,marginTop:8}}`,`className="spnl-teal" style={{marginTop:8}}`],
  [`style={{ display: 'flex', gap: 6 }}`,`className="spnl-row"`],
  [`style={{ display: 'flex', gap: 8 }}`,`className="spnl-row"`],
  [`style={{ display: 'flex', gap: 4 }}`,`className="spnl-row"`],
  [`style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}`,`className="spnl-row"`],
  [`style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}`,`className="spnl-row"`],
  [`style={{ display: 'flex', flexDirection: 'column', gap: 6 }}`,`className="spnl-col"`],
  [`style={{ display: 'flex', flexDirection: 'column', gap: 8 }}`,`className="spnl-col"`],
  [`style={{ display: 'flex', flexDirection: 'column', gap: 4 }}`,`className="spnl-col"`],
  [`style={{ display:'flex', gap:6 }}`,`className="spnl-row"`],
  [`style={{ display:'flex', gap:8 }}`,`className="spnl-row"`],
  [`style={{ display: 'none' }}`,`className="spx-hidden"`],
  [`style={{ display: "none" }}`,`className="spx-hidden"`],
  [`style={{width:SOCKET_R*2,height:SOCKET_R*2,borderRadius:"50%",background:col,border:"1.5px solid #06060f",marginTop:si*SOCKET_SPACING}}`,`className="nms-socket-dot" style={{background:col,marginTop:si*SOCKET_SPACING}}`],
  [`style={{position:"absolute",right:SOCKET_R*2+4,top:-2,fontSize:8,color:col,whiteSpace:"nowrap"}}`,`className="nms-socket-label" style={{color:col}}`],
];
function patchFile(filePath) {
  let f = fs.readFileSync(filePath,'utf8');
  const before = (f.match(/style=\{\{/g)||[]).length;
  if (before === 0) return 0;
  for (const [from,to] of EXACT) f = f.split(from).join(to);
  fs.writeFileSync(filePath,f);
  const after = (fs.readFileSync(filePath,'utf8').match(/style=\{\{/g)||[]).length;
  if (after < before) console.log('✓ ' + path.basename(filePath) + ': ' + before + ' → ' + after);
  else if (after === before) console.log('  ' + path.basename(filePath) + ': ' + before + ' (no change)');
  else console.log('! ' + path.basename(filePath) + ': ' + before + ' → ' + after + ' (INCREASED)');
  return after;
}
let total = 0;
for (const f of FILES) { if (fs.existsSync(f)) total += patchFile(f); }
console.log('\nTotal remaining: ' + total);
