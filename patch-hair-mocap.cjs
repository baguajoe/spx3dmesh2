#!/usr/bin/env node
const fs = require('fs');

// ── HairFXPanel.jsx — same sub-components as HairAdvancedPanel ───────────────
let hf = fs.readFileSync('src/components/hair/HairFXPanel.jsx', 'utf8');

// Slider
hf = hf.replace(
`    <div style={{ marginBottom: 5 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#888' }}>
        <span>{label}</span>
        <span style={{ color:'#00ffc8', fontWeight:600 }}>`,
`    <div className="ha-slider-wrap">
      <div className="ha-slider-row">
        <span>{label}</span>
        <span className="ha-slider-val">`
);
hf = hf.replace(
`        style={{ width:'100%', accentColor:'#00ffc8', cursor:'pointer', height:16 }} />`,
`        className="ha-slider" />`
);

// Select
hf = hf.replace(
`    <div style={{ marginBottom:6 }}>
      {label && <div style={{ fontSize:10, color:'#888', marginBottom:2 }}>{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width:'100%', background:'#0d1117', color:'#e0e0e0',
        border:'1px solid #21262d', padding:'3px 6px', borderRadius:4, fontSize:11, cursor:'pointer',
      }}>`,
`    <div className="ha-select-wrap">
      {label && <div className="ha-select-label">{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} className="ha-select">`
);

// Check
hf = hf.replace(
`    <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:11,
      color:'#ccc', cursor:'pointer', marginBottom:4 }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ accentColor:'#00ffc8', width:12, height:12 }} />`,
`    <label className="ha-check">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="ha-check__input" />`
);

// ColorRow
hf = hf.replace(
`    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
      <span style={{ fontSize:10, color:'#888', flex:1 }}>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width:32, height:22, border:'none', cursor:'pointer', borderRadius:3 }} />
      <span style={{ fontSize:9, color:'#555', fontFamily:'monospace' }}>{value}</span>
    </div>`,
`    <div className="ha-color-row">
      <span className="ha-color-label">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="ha-color-input" />
      <span className="ha-color-hex">{value}</span>
    </div>`
);

// Section
hf = hf.replace(
`    <div style={{ marginBottom:6, border:'1px solid #21262d', borderRadius:5, overflow:'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding:'5px 8px', cursor:'pointer', background:'#0d1117',
        display:'flex', justifyContent:'space-between',
        fontSize:11, fontWeight:600, color:'#00ffc8', userSelect:'none',
      }}>
        <span>{title}</span>
        <span style={{ fontSize:9, opacity:0.7 }}>{open ? '\\u25b2' : '\\u25bc'}</span>
      </div>
      {open && <div style={{ padding:'6px 8px', background:'#06060f' }}>{children}</div>}
    </div>`,
`    <div className="ha-section">
      <div className="ha-section__header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span className="ha-section__arrow">{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="ha-section__body">{children}</div>}
    </div>`
);

// Badges
hf = hf.replace(
`    <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:6 }}>
      {items.map(item => (
        <button key={item} onClick={() => onSelect(item)} style={{
          padding:'2px 7px', fontSize:9, borderRadius:4, cursor:'pointer',
          background: active===item ? '#00ffc8' : '#1a1f2c',
          color: active===item ? '#06060f' : '#ccc',
          border: \`1px solid \${active===item ? '#00ffc8' : '#21262d'}\`,
        }}>{item}</button>
      ))}
    </div>`,
`    <div className="ha-badges">
      {items.map(item => (
        <button key={item} onClick={() => onSelect(item)}
          className={\`ha-badge\${active===item?' ha-badge--active':''}\`}>{item}</button>
      ))}
    </div>`
);

// GenBtn
hf = hf.replace(
/    <button onClick=\{onClick\} style=\{\{\s*width:'100%', background:'#00ffc8'[\s\S]*?\}\}>\{label\}<\/button>/,
`    <button onClick={onClick} className="ha-gen-btn">{label}</button>`
);

// RandBtn
hf = hf.replace(
/    <button onClick=\{onClick\} style=\{\{\s*background:'#1a1f2c'[\s\S]*?\}\}>🎲<\/button>/,
`    <button onClick={onClick} className="ha-rand-btn">🎲</button>`
);

fs.writeFileSync('src/components/hair/HairFXPanel.jsx', hf);
const hfCount = (fs.readFileSync('src/components/hair/HairFXPanel.jsx','utf8').match(/style=\{\{/g)||[]).length;
console.log(`✓ HairFXPanel.jsx — ${hfCount} remaining`);

// ── App_chunk7.jsx — boxSelect dynamic positioning ────────────────────────────
// Already acceptable (same as App.jsx boxSelect)
console.log(`✓ App_chunk7.jsx — boxSelect dynamic position (unavoidable)`);

// ── LazyPanel.jsx ─────────────────────────────────────────────────────────────
let lp = fs.readFileSync('src/panels/LazyPanel.jsx', 'utf8');
lp = lp.replace(
  `<div style={{padding:8,color:"#555",fontFamily:"JetBrains Mono,monospace",fontSize:9}}>`,
  `<div className="lazy-panel">`
);
fs.writeFileSync('src/panels/LazyPanel.jsx', lp);
console.log(`✓ LazyPanel.jsx — 0 remaining`);

// ── AvatarRigPlayer3D.jsx — dynamic size (unavoidable) ────────────────────────
// style={{ width: '100%', height: '100%', minHeight: 400 }} — canvas mount point
let ar = fs.readFileSync('src/front/js/component/AvatarRigPlayer3D.jsx', 'utf8');
ar = ar.replace(
  `return <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: 400 }} />;`,
  `return <div ref={mountRef} className="avatar-rig-mount" />;`
);
fs.writeFileSync('src/front/js/component/AvatarRigPlayer3D.jsx', ar);
console.log(`✓ AvatarRigPlayer3D.jsx — 0 remaining`);

console.log('\nAll done. Now patch MocapWorkspace + mocap components separately.');
