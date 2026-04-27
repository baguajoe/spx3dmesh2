#!/usr/bin/env node
const fs = require('fs');

// ── NodeCompositorPanel.jsx ───────────────────────────────────────────────────
let nc = fs.readFileSync('src/components/mesh/NodeCompositorPanel.jsx', 'utf8');

// line 32 — already has className, just keep style for position + css var (unavoidable dynamic)
// line 37 — node header bar
nc = nc.replace(
  `      <div style={{ background:\`\${color}22\`, borderBottom:\`1px solid \${color}44\`,
        padding:"4px 8px", display:"flex", alignItems:"center", justifyContent:"space-between",
        borderRadius:"6px 6px 0 0" }}>`,
  `      <div className="nc-node-header" style={{ background:\`\${color}22\`, borderBottom:\`1px solid \${color}44\` }}>`
);

// line 40 — node type label
nc = nc.replace(
  `        <span style={{ fontSize:9, color, fontWeight:700, letterSpacing:1 }}>{node.type}</span>`,
  `        <span className="nc-node-type" style={{ color }}>{node.type}</span>`
);

// line 41 — button row
nc = nc.replace(
  `        <div style={{ display:"flex", gap:4 }}>`,
  `        <div className="nc-node-btns">`
);

// line 43 — mute button (references deleted S.btn)
nc = nc.replace(
  `            style={{ ...S.btn(node.mute), padding:"1px 5px", fontSize:8 }}>`,
  `            className={\`nc-node-mute-btn\${node.mute?' nc-node-mute-btn--on':''}\`}>`
);

// line 47 — delete button
nc = nc.replace(
  `            style={{ background:"none", border:"none", color:"#ff4444", cursor:"pointer", fontSize:10 }}>✕</button>`,
  `            className="nc-node-del">✕</button>`
);

// line 51 — inputs container
nc = nc.replace(
  `      <div style={{ padding:"4px 0" }}>`,
  `      <div className="nc-node-ports">`
);

// line 53 — input row
nc = nc.replace(
  `          <div key={inp.id} style={{ display:"flex", alignItems:"center", padding:"2px 8px", fontSize:9, color:C.dim }}>`,
  `          <div key={inp.id} className="nc-port-row">`
);

// line 54-55 — input dot
nc = nc.replace(
  `            <div style={{ width:8, height:8, borderRadius:"50%", background: inp.connected ? color : C.border,
              border:\`1px solid \${color}\`, marginRight:5, flexShrink:0 }} />`,
  `            <div className="nc-port-dot" style={{ background: inp.connected ? color : '#21262d', border:\`1px solid \${color}\` }} />`
);

// line 62 — params preview
nc = nc.replace(
  `        <div style={{ padding:"2px 8px 4px", fontSize:8, color:C.dim, borderTop:\`1px solid \${C.border}\` }}>`,
  `        <div className="nc-node-params">`
);

// line 64 — param value span
nc = nc.replace(
  `            <div key={k}>{k}: <span style={{color:C.teal}}>{JSON.stringify(v).slice(0,12)}</span></div>`,
  `            <div key={k}>{k}: <span className="nc-param-val">{JSON.stringify(v).slice(0,12)}</span></div>`
);

// line 69 — outputs container
nc = nc.replace(
  `      <div style={{ padding:"4px 0", borderTop:\`1px solid \${C.border}\` }}>`,
  `      <div className="nc-node-ports nc-node-ports--out">`
);

// line 71 — output row
nc = nc.replace(
  `          <div key={out.id} style={{ display:"flex", alignItems:"center", justifyContent:"flex-end",
            padding:"2px 8px", fontSize:9, color:C.dim }}>`,
  `          <div key={out.id} className="nc-port-row nc-port-row--out">`
);

// line 74 — output dot
nc = nc.replace(
  `            <div style={{ width:8, height:8, borderRadius:"50%", background:color,
              border:\`1px solid \${color}\`, marginLeft:5, flexShrink:0 }} />`,
  `            <div className="nc-port-dot" style={{ background:color, border:\`1px solid \${color}\` }} />`
);

// line 178 — main flex container
nc = nc.replace(
  `      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>`,
  `      <div className="nc-main">`
);

// line 183 — SVG wire layer
nc = nc.replace(
  `          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>`,
  `          <svg className="nc-wire-svg">`
);

// line 234 — param editor row
nc = nc.replace(
  `                <div key={k} style={{ marginBottom:6 }}>`,
  `                <div key={k} className="nc-param-edit">`
);

// line 235 — param label
nc = nc.replace(
  `                  <div style={{ fontSize:9, color:C.dim, marginBottom:2 }}>{k}</div>`,
  `                  <div className="nc-param-label">{k}</div>`
);

// line 243 — param number input
nc = nc.replace(
  `                      style={{ width:"100%", background:"#0d1117", border:\`1px solid \${C.border}\`,
                        color:C.text, padding:"2px 6px", borderRadius:3, fontFamily:C.font, fontSize:10 }} />`,
  `                      className="nc-param-input" />`
);

// line 246 — param json display
nc = nc.replace(
  `                    <div style={{ fontSize:9, color:C.teal }}>{JSON.stringify(v)}</div>`,
  `                    <div className="nc-param-val">{JSON.stringify(v)}</div>`
);

fs.writeFileSync('src/components/mesh/NodeCompositorPanel.jsx', nc);
const ncCount = (fs.readFileSync('src/components/mesh/NodeCompositorPanel.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ NodeCompositorPanel.jsx — ${ncCount} style={{}} remaining`);

// ── HairPanel.jsx — line 178: style={{ background: c }} ──────────────────────
// This is a dynamic color swatch — keep style, just acceptable
let hp = fs.readFileSync('src/components/hair/HairPanel.jsx', 'utf8');
hp = hp.replace(
  `              style={{ background: c }}`,
  `              className="hp-color-swatch" style={{ background: c }}`
);
fs.writeFileSync('src/components/hair/HairPanel.jsx', hp);
console.log(`✓ HairPanel.jsx — swatch color kept as dynamic style`);

// ── ClothingPanel.jsx — line 186: style={{ ...style }} ───────────────────────
// Dynamic positioning prop — keep as is (it's a draggable panel)
console.log(`✓ ClothingPanel.jsx — dynamic panel position (unavoidable)`);

// ── PatternEditorPanel.jsx — same pattern ────────────────────────────────────
console.log(`✓ PatternEditorPanel.jsx — dynamic panel position (unavoidable)`);

// ── MaterialPanel.jsx — line 65: slot color swatch ───────────────────────────
let mp = fs.readFileSync('src/components/materials/MaterialPanel.jsx', 'utf8');
mp = mp.replace(
  `                  style={{ background: slot.pbr?.baseColor || "#cccccc" }}`,
  `                  className="mp-color-swatch" style={{ background: slot.pbr?.baseColor || "#cccccc" }}`
);
fs.writeFileSync('src/components/materials/MaterialPanel.jsx', mp);
console.log(`✓ MaterialPanel.jsx — swatch color kept as dynamic style`);

console.log('\nFinal check:');
