#!/usr/bin/env node
const fs = require('fs');

// ── HairAdvancedPanel.jsx ─────────────────────────────────────────────────────
let ha = fs.readFileSync('src/components/hair/HairAdvancedPanel.jsx', 'utf8');

// Replace Slider sub-component
ha = ha.replace(
`function Slider({ label, value, min=0, max=1, step=0.01, onChange, unit='' }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#888' }}>
        <span>{label}</span>
        <span style={{ color:'#00ffc8', fontWeight:600 }}>
          {typeof value==='number' ? (step<0.1 ? value.toFixed(2) : Math.round(value)) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:'100%', accentColor:'#00ffc8', cursor:'pointer', height:16 }} />
    </div>
  );
}`,
`function Slider({ label, value, min=0, max=1, step=0.01, onChange, unit='' }) {
  return (
    <div className="ha-slider-wrap">
      <div className="ha-slider-row">
        <span>{label}</span>
        <span className="ha-slider-val">
          {typeof value==='number' ? (step<0.1 ? value.toFixed(2) : Math.round(value)) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="ha-slider" />
    </div>
  );
}`
);

// Replace Select sub-component
ha = ha.replace(
`function Select({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom:6 }}>
      {label && <div style={{ fontSize:10, color:'#888', marginBottom:2 }}>{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width:'100%', background:'#0d1117', color:'#e0e0e0',
        border:'1px solid #21262d', padding:'3px 6px', borderRadius:4, fontSize:11, cursor:'pointer',
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}`,
`function Select({ label, value, options, onChange }) {
  return (
    <div className="ha-select-wrap">
      {label && <div className="ha-select-label">{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} className="ha-select">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}`
);

// Replace Check sub-component
ha = ha.replace(
`function Check({ label, value, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:11,
      color:'#ccc', cursor:'pointer', marginBottom:4 }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ accentColor:'#00ffc8', width:12, height:12 }} />
      {label}
    </label>
  );
}`,
`function Check({ label, value, onChange }) {
  return (
    <label className="ha-check">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="ha-check__input" />
      {label}
    </label>
  );
}`
);

// Replace ColorRow sub-component
ha = ha.replace(
`function ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
      <span style={{ fontSize:10, color:'#888', flex:1 }}>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width:32, height:22, border:'none', cursor:'pointer', borderRadius:3 }} />
      <span style={{ fontSize:9, color:'#555', fontFamily:'monospace' }}>{value}</span>
    </div>
  );
}`,
`function ColorRow({ label, value, onChange }) {
  return (
    <div className="ha-color-row">
      <span className="ha-color-label">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="ha-color-input" />
      <span className="ha-color-hex">{value}</span>
    </div>
  );
}`
);

// Replace Section sub-component
ha = ha.replace(
`function Section({ title, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom:6, border:'1px solid #21262d', borderRadius:5, overflow:'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding:'5px 8px', cursor:'pointer', background:'#0d1117',
        display:'flex', justifyContent:'space-between',
        fontSize:11, fontWeight:600, color:'#00ffc8', userSelect:'none',
      }}>
        <span>{title}</span>
        <span style={{ fontSize:9, opacity:0.7 }}>{open ? '\\u25b2' : '\\u25bc'}</span>
      </div>
      {open && <div style={{ padding:'6px 8px', background:'#06060f' }}>{children}</div>}
    </div>
  );
}`,
`function Section({ title, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ha-section">
      <div className="ha-section__header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span className="ha-section__arrow">{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="ha-section__body">{children}</div>}
    </div>
  );
}`
);

// Replace Badges sub-component
ha = ha.replace(
`function Badges({ items, active, onSelect }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:6 }}>
      {items.map(item => (
        <button key={item} onClick={() => onSelect(item)} style={{
          padding:'2px 7px', fontSize:9, borderRadius:4, cursor:'pointer',
          background: active===item ? '#00ffc8' : '#1a1f2c',
          color: active===item ? '#06060f' : '#ccc',
          border: \`1px solid \${active===item ? '#00ffc8' : '#21262d'}\`,
        }}>{item}</button>
      ))}
    </div>
  );
}`,
`function Badges({ items, active, onSelect }) {
  return (
    <div className="ha-badges">
      {items.map(item => (
        <button key={item} onClick={() => onSelect(item)}
          className={\`ha-badge\${active===item?' ha-badge--active':''}\`}>{item}</button>
      ))}
    </div>
  );
}`
);

// Replace GenBtn
ha = ha.replace(
`function GenBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', background:'#00ffc8', color:'#06060f', border:'none',
      borderRadius:4, padding:'7px 0', cursor:'pointer', fontWeight:700,
      fontSize:12, marginTop:6, letterSpacing:0.5, fontFamily:'JetBrains Mono, monospace',
    }}>{label}</button>
  );
}`,
`function GenBtn({ label, onClick }) {
  return <button onClick={onClick} className="ha-gen-btn">{label}</button>;
}`
);

// Replace RandBtn
ha = ha.replace(
`function RandBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background:'#1a1f2c', color:'#888', border:'1px solid #21262d',
      borderRadius:4, padding:'6px 10px', cursor:'pointer', fontSize:11,
    }}>🎲</button>
  );
}`,
`function RandBtn({ onClick }) {
  return <button onClick={onClick} className="ha-rand-btn">🎲</button>;
}`
);

// Replace P const and root div
ha = ha.replace(
  `const P = { fontFamily:'JetBrains Mono, monospace', color:'#e0e0e0', fontSize:12, userSelect:'none', width:'100%' };`,
  ``
);
ha = ha.replace(
  `    <div style={P}>`,
  `    <div className="ha-root">`
);

// Tool grid
ha = ha.replace(
  `        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:3, marginBottom:6 }}>
          {GROOM_TOOLS.map(tool => (
            <button key={tool} onClick={() => handleToolChange(tool)} style={{
              padding:'4px 0', fontSize:9, borderRadius:4, cursor:'pointer',
              background: activeTool===tool ? '#00ffc8' : '#1a1f2c',
              color: activeTool===tool ? '#06060f' : '#ccc',
              border: \`1px solid \${activeTool===tool ? '#00ffc8' : '#21262d'}\`,
            }}>{tool}</button>
          ))}
        </div>`,
  `        <div className="ha-tool-grid">
          {GROOM_TOOLS.map(tool => (
            <button key={tool} onClick={() => handleToolChange(tool)}
              className={\`ha-tool-btn\${activeTool===tool?' ha-tool-btn--active':''}\`}>{tool}</button>
          ))}
        </div>`
);

// Layer rows
ha = ha.replace(
  `        {layers.map(layer => (
          <div key={layer.type} style={{
            display:'flex', alignItems:'center', gap:4, marginBottom:4, padding:'3px 6px',
            background: activeLayer===layer.type ? '#0d1117' : 'transparent',
            borderRadius:3, cursor:'pointer', border:\`1px solid \${activeLayer===layer.type?'#21262d':'transparent'}\`
          }} onClick={() => setActiveLayer(layer.type)}>
            <button onClick={e => { e.stopPropagation(); updateLayer(layer.type,'visible',!layer.visible); }} style={{
              background:'none', border:'none', color: layer.visible ? '#00ffc8' : '#444', cursor:'pointer', fontSize:11, padding:0,
            }}>{layer.visible ? '👁' : '🕶'}</button>
            <button onClick={e => { e.stopPropagation(); updateLayer(layer.type,'locked',!layer.locked); }} style={{
              background:'none', border:'none', color: layer.locked ? '#FF6600' : '#555', cursor:'pointer', fontSize:11, padding:0,
            }}>{layer.locked ? '🔒' : '🔓'}</button>
            <span style={{ flex:1, fontSize:10, color: activeLayer===layer.type ? '#e0e0e0' : '#888' }}>{layer.type}</span>
            <span style={{ fontSize:9, color:'#555' }}>{Math.round(layer.density*100)}%</span>
          </div>
        ))}`,
  `        {layers.map(layer => (
          <div key={layer.type}
            className={\`ha-layer-row\${activeLayer===layer.type?' ha-layer-row--active':''}\`}
            onClick={() => setActiveLayer(layer.type)}>
            <button onClick={e => { e.stopPropagation(); updateLayer(layer.type,'visible',!layer.visible); }}
              className={\`ha-layer-vis\${layer.visible?' ha-layer-vis--on':' ha-layer-vis--off'}\`}>
              {layer.visible ? '👁' : '🕶'}</button>
            <button onClick={e => { e.stopPropagation(); updateLayer(layer.type,'locked',!layer.locked); }}
              className={\`ha-layer-lock\${layer.locked?' ha-layer-lock--on':' ha-layer-lock--off'}\`}>
              {layer.locked ? '🔒' : '🔓'}</button>
            <span className={\`ha-layer-name\${activeLayer===layer.type?' ha-layer-name--active':''}\`}>{layer.type}</span>
            <span className="ha-layer-density">{Math.round(layer.density*100)}%</span>
          </div>
        ))}`
);

// Footer buttons
ha = ha.replace(
  `      <div style={{ display:'flex', gap:4, marginTop:4 }}>
        <button onClick={() => { setUndoStack(s => s.slice(0,-1)); onUpdate?.({ type:'undo' }); }}
          disabled={undoStack.length===0} style={{
          flex:1, background:'#1a1f2c', color: undoStack.length>0?'#ccc':'#444',
          border:'1px solid #21262d', borderRadius:4, padding:'5px 0', cursor:'pointer', fontSize:10,
        }}>↩ Undo ({undoStack.length})</button>
        <button onClick={() => onUpdate?.({ type:'rebuild' })} style={{
          flex:1, background:'#1a1f2c', color:'#888', border:'1px solid #21262d',
          borderRadius:4, padding:'5px 0', cursor:'pointer', fontSize:10,
        }}>Rebuild</button>
        <button onClick={() => onUpdate?.({ type:'export' })} style={{
          flex:1, background:'#1a1f2c', color:'#888', border:'1px solid #21262d',
          borderRadius:4, padding:'5px 0', cursor:'pointer', fontSize:10,
        }}>Export</button>
      </div>`,
  `      <div className="ha-footer">
        <button onClick={() => { setUndoStack(s => s.slice(0,-1)); onUpdate?.({ type:'undo' }); }}
          disabled={undoStack.length===0} className="ha-footer-btn">↩ Undo ({undoStack.length})</button>
        <button onClick={() => onUpdate?.({ type:'rebuild' })} className="ha-footer-btn">Rebuild</button>
        <button onClick={() => onUpdate?.({ type:'export' })} className="ha-footer-btn">Export</button>
      </div>`
);

fs.writeFileSync('src/components/hair/HairAdvancedPanel.jsx', ha);
const haCount = (fs.readFileSync('src/components/hair/HairAdvancedPanel.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ HairAdvancedPanel.jsx — ${haCount} style={{}} remaining`);

// ── NodeCompositorPanel.jsx — replace S object usage with classNames ──────────
let nc = fs.readFileSync('src/components/mesh/NodeCompositorPanel.jsx', 'utf8');

// Remove S const and C const (keep C for color refs in JS logic only)
nc = nc.replace(/^const S = \{[\s\S]*?\};\n\n/m, '');

// Root div
nc = nc.replace(`    <div style={S.root}>`, `    <div className="nc-root">`);
nc = nc.replace(`      <div style={S.header}>`, `      <div className="nc-header">`);
nc = nc.replace(`        <span style={S.title}>⬡ NODE COMPOSITOR</span>`, `        <span className="nc-title">⬡ NODE COMPOSITOR</span>`);
nc = nc.replace(`        <span style={{ fontSize:9, color:C.dim }}>{graph.nodes.length} nodes</span>`, `        <span className="nc-node-count">{graph.nodes.length} nodes</span>`);
nc = nc.replace(`        <button style={S.close} onClick={onClose}>✕</button>`, `        <button className="nc-close" onClick={onClose}>✕</button>`);
nc = nc.replace(`      <div style={S.toolbar}>`, `      <div className="nc-toolbar">`);
nc = nc.replace(`        <button style={S.btn(false)} onClick={evaluate}>▶ Evaluate</button>`, `        <button className="nc-btn" onClick={evaluate}>▶ Evaluate</button>`);
nc = nc.replace(`        <button style={S.btn(false)} onClick={() => setGraph(createCompositorGraph())}>Clear</button>`, `        <button className="nc-btn" onClick={() => setGraph(createCompositorGraph())}>Clear</button>`);
nc = nc.replace(`        {status && <span style={{ fontSize:9, color:C.teal, marginLeft:8 }}>{status}</span>}`, `        {status && <span className="nc-status">{status}</span>}`);
nc = nc.replace(`        <select value={preset} onChange={e => loadPreset(e.target.value)}
          style={{ background:"#0d1117", border:\`1px solid \${C.border}\`, color:C.text,
            padding:"4px 8px", borderRadius:4, fontFamily:C.font, fontSize:10, cursor:"pointer" }}>`, `        <select value={preset} onChange={e => loadPreset(e.target.value)} className="nc-select">`);
nc = nc.replace(`        <div ref={canvasRef} style={S.canvas}>`, `        <div ref={canvasRef} className="nc-canvas">`);
nc = nc.replace(`        <div style={S.sidebar}>`, `        <div className="nc-sidebar">`);
nc = nc.replace(/style=\{S\.sideSection\}/g, `className="nc-side-section"`);
nc = nc.replace(/style=\{S\.sideTitle\}/g, `className="nc-side-title"`);
nc = nc.replace(/style=\{S\.nodeItem\}/g, `className="nc-node-item"`);
nc = nc.replace(/style=\{S\.nodeCard\}/g, `className="nc-node-card"`);
nc = nc.replace(/style=\{S\.stat\}/g, `className="nc-stat"`);
nc = nc.replace(`              <div style={{ display:"flex", flex:1, overflow:"hidden" }}>`, `              <div className="nc-main">`);

// NodeWidget inline styles
nc = nc.replace(
`    style={{
        position:"absolute", left:node.position.x, top:node.position.y,
        width:160, background:C.node, border:\`1px solid \${selected ? color : C.border}\`,
        borderRadius:6, boxShadow: selected ? \`0 0 10px \${color}44\` : "0 2px 8px rgba(0,0,0,0.5)",
        userSelect:"none", opacity: node.mute ? 0.4 : 1,
      }}`,
`      className={\`nc-node-widget\${selected?' nc-node-widget--selected':''}\${node.mute?' nc-node-widget--muted':''}\`}
      style={{ left:node.position.x, top:node.position.y, '--node-color': color }}`
);

// Empty state
nc = nc.replace(
`            <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
              fontSize:11, color:C.dim, textAlign:"center" }}>`,
`            <div className="nc-empty">`
);

fs.writeFileSync('src/components/mesh/NodeCompositorPanel.jsx', nc);
const ncCount = (fs.readFileSync('src/components/mesh/NodeCompositorPanel.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ NodeCompositorPanel.jsx — ${ncCount} style={{}} remaining`);

// ── Single-line fixes for the small files ────────────────────────────────────
// HairPanel.jsx, ClothingPanel.jsx, PatternEditorPanel.jsx, MaterialPanel.jsx
for (const [path, desc] of [
  ['src/components/hair/HairPanel.jsx', 'HairPanel'],
  ['src/components/clothing/ClothingPanel.jsx', 'ClothingPanel'],
  ['src/components/clothing/PatternEditorPanel.jsx', 'PatternEditorPanel'],
  ['src/components/materials/MaterialPanel.jsx', 'MaterialPanel'],
]) {
  let f = fs.readFileSync(path, 'utf8');
  const before = (f.match(/style=\{\{/g)||[]).length;
  // Replace common single inline style patterns
  f = f.replace(/style=\{\{display:"none"\}\}/g, 'className="spx-hidden"');
  f = f.replace(/style=\{\{display:'none'\}\}/g, 'className="spx-hidden"');
  f = f.replace(/style=\{\{ display: "none" \}\}/g, 'className="spx-hidden"');
  fs.writeFileSync(path, f);
  const after = (fs.readFileSync(path,'utf8').match(/style=\{\{/g)||[]).length;
  console.log(`✓ ${desc} — ${before} → ${after} style={{}} remaining`);
}

console.log('\nDone! Run: grep -c "style={{" src/components/hair/HairAdvancedPanel.jsx src/components/mesh/NodeCompositorPanel.jsx src/components/hair/HairPanel.jsx src/components/clothing/ClothingPanel.jsx src/components/clothing/PatternEditorPanel.jsx src/components/materials/MaterialPanel.jsx');
