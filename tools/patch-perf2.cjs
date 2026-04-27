#!/usr/bin/env node
const fs = require('fs');
let pp = fs.readFileSync('src/components/SPXPerformancePanel.jsx', 'utf8');

// 4 remaining style={S.xxx}
pp = pp.replace(/style=\{S\.btnOrange\}/g, 'className="spp-btn spp-btn--orange"');
pp = pp.replace(/style=\{S\.textarea\}/g, 'className="spp-textarea"');
pp = pp.replace(/style=\{S\.aiBox\}/g, 'className="spp-ai-box"');
pp = pp.replace(/style=\{S\.status\}/g, 'className="spp-status"');

// style={{ ...S.btn, ... }} variants
pp = pp.replace(/style=\{\{ \.\.\.S\.btn, fontSize: 10, padding: "2px 6px" \}\}/g, 'className="spp-btn spp-btn--sm"');
pp = pp.replace(/style=\{\{ \.\.\.S\.btn, padding: "2px 5px" \}\}/g, 'className="spp-btn spp-btn--xs"');
pp = pp.replace(/style=\{\{ \.\.\.S\.btnDanger, padding: "2px 5px" \}\}/g, 'className="spp-btn spp-btn--danger-xs"');
pp = pp.replace(/style=\{\{ \.\.\.S\.row, justifyContent: "space-between" \}\}/g, 'className="spp-row spp-row--between"');
pp = pp.replace(/style=\{\{ \.\.\.S\.input, width: 100 \}\}/g, 'className="spp-input spp-input--w100"');
pp = pp.replace(/style=\{\{ \.\.\.S\.input, width: 60 \}\}/g, 'className="spp-input spp-input--w60"');

// Simple inline styles
pp = pp.replace(/style=\{\{ flex: 1, overflowY: "auto" \}\}/g, 'className="spp-scroll"');
pp = pp.replace(/style=\{\{ color: "#484f58", fontSize: 10, fontStyle: "italic" \}\}/g, 'className="spp-dim-italic"');
pp = pp.replace(/style=\{\{ flex: 1 \}\}/g, 'className="spp-flex1"');
pp = pp.replace(/style=\{\{ color: "#484f58", fontSize: 10 \}\}/g, 'className="spp-dim"');
pp = pp.replace(/style=\{\{ color: "#484f58", fontSize: 9 \}\}/g, 'className="spp-dim-sm"');
pp = pp.replace(/style=\{\{ color: "#484f58", fontSize: 9 \}\}/g, 'className="spp-dim-sm"');
pp = pp.replace(/style=\{\{ color: "#484f58", fontSize: 10, marginLeft: 4 \}\}/g, 'className="spp-dim"');
pp = pp.replace(/style=\{\{ color: "#484f58", fontSize: 9 \}\}/g, 'className="spp-dim-sm"');

// clip name color (dynamic)
pp = pp.replace(
  `style={{ color: clip.id === session.activeClipId ? "#00ffc8" : "#c8c8c8", fontSize: 11 }}`,
  `className={\`spp-clip-name\${clip.id === session.activeClipId ? ' spp-clip-name--active' : ''}\`}`
);

// cleaned checkmark
pp = pp.replace(
  `<span style={{ color: "#00ffc8", marginLeft: 4 }}>✓</span>`,
  `<span className="spp-clean-check">✓</span>`
);

// clip details
pp = pp.replace(
  `<div style={{ color: "#484f58", fontSize: 9 }}>`,
  `<div className="spp-dim-sm">`
);

// empty state
pp = pp.replace(
  `<div style={{ color: "#484f58", fontSize: 10 }}>`,
  `<div className="spp-dim">`
);

// timeline clip bar (dynamic position/width — keep style, add className)
pp = pp.replace(
  `              <div key={clip.id} style={{`,
  `              <div key={clip.id} className="spp-tl-clip" style={{`
);

// timeline empty
pp = pp.replace(
  `            <div style={{`,
  `            <div className="spp-tl-empty" style={{`
);

// timeline empty inner
pp = pp.replace(
  `              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#484f58", fontSize: 10 }}>`,
  `              <div className="spp-tl-empty-label">`
);

// time display spans
pp = pp.replace(
  /(<span style=\{\{ color: "#484f58", fontSize: 10 \}\}>)/g,
  `<span className="spp-dim">`
);

fs.writeFileSync('src/components/SPXPerformancePanel.jsx', pp);
const remaining = (fs.readFileSync('src/components/SPXPerformancePanel.jsx','utf8').match(/style=\{[S{]/g)||[]).length;
console.log(`✓ SPXPerformancePanel.jsx — ${remaining} style= remaining`);
