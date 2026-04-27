#!/usr/bin/env node
const fs = require('fs');

// ── SPXPerformancePanel.jsx — replace all style={S.xxx} with className ────────
let pp = fs.readFileSync('src/components/SPXPerformancePanel.jsx', 'utf8');

// Remove the S const object entirely
pp = pp.replace(/^const S = \{[\s\S]*?\};\n\n/m, '');

// Replace all style={S.xxx} patterns with className
const mappings = [
  ['style={S.panel}',        'className="spp-panel"'],
  ['style={S.header}',       'className="spp-header"'],
  ['style={S.btnPrimary}',   'className="spp-btn spp-btn--primary"'],
  ['style={S.btn}',          'className="spp-btn"'],
  ['style={S.row}',          'className="spp-row"'],
  ['style={S.label}',        'className="spp-label"'],
  ['style={S.section}',      'className="spp-section"'],
  ['style={S.sectionHeader}','className="spp-section-header"'],
  ['style={S.sectionBody}',  'className="spp-section-body"'],
  ['style={S.timeline}',     'className="spp-timeline"'],
  ['style={S.slider}',       'className="spp-slider"'],
  ['style={S.analysisBox}',  'className="spp-analysis-box"'],
];

for (const [from, to] of mappings) {
  pp = pp.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
}

// S.score(x) is a function — replace with className + dynamic color
pp = pp.replace(
  `<span style={S.score(analysisResult.score)}>Score: {analysisResult.score}/100</span>`,
  `<span className="spp-score" style={{color: analysisResult.score>=80?'#00ffc8':analysisResult.score>=50?'#ffaa00':'#ff4444'}}>Score: {analysisResult.score}/100</span>`
);

fs.writeFileSync('src/components/SPXPerformancePanel.jsx', pp);
const ppCount = (fs.readFileSync('src/components/SPXPerformancePanel.jsx','utf8').match(/style=\{S\./g)||[]).length;
const ppInline = (fs.readFileSync('src/components/SPXPerformancePanel.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ SPXPerformancePanel.jsx — ${ppCount} style={S.} + ${ppInline} style={{}} remaining`);

// ── SceneOutliner.jsx — line 36: dynamic indent (unavoidable) ─────────────────
// style={{ paddingLeft: `${8 + depth * 14}px` }} — this is runtime computed
// Just add className alongside it
let so = fs.readFileSync('src/components/SceneOutliner.jsx', 'utf8');
so = so.replace(
  `        style={{ paddingLeft: \`\${8 + depth * 14}px\` }}`,
  `        className="outliner-row-indent" style={{ paddingLeft: \`\${8 + depth * 14}px\` }}`
);
fs.writeFileSync('src/components/SceneOutliner.jsx', so);
console.log(`✓ SceneOutliner.jsx — dynamic indent kept (unavoidable)`);
