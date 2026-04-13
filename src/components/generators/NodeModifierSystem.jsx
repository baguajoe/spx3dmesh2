import React, { useState } from 'react';


const Section = ({ title, children }) => (
  <div className="spx-fp-section">
    <div className="spx-fp-section-title">{title}</div>
    {children}
  </div>
);

const Row = ({ label, value, min=0, max=1, step=0.01, onChange }) => (
  <div className="spx-fp-row">
    <span className="spx-fp-label">{label}</span>
    <input type="range" min={min} max={max} step={step}
      value={value} onChange={e => onChange(parseFloat(e.target.value))}
      className="spx-fp-slider" />
    <span className="spx-fp-val">{typeof value === 'number' ? value.toFixed(2) : value}</span>
  </div>
);
const NODE_TYPES = {
  Geometry: ['Cube','Sphere','Plane','Cylinder','Torus','Cone'],
  Modifier:  ['Subdivide','Displace','Twist','Wave','Bend','Taper'],
  Math:      ['Add','Subtract','Multiply','Mix','Clamp','Map Range'],
  Material:  ['PBR Output','Emission','Glass','Metal','Skin'],
};

export default function NodeModifierSystem({ open, onClose }) {
  const [nodes, setNodes]   = useState([]);
  const [selected, setSelected] = useState(null);

  const addNode = (type, name) => {
    setNodes(prev => [...prev, { id: Date.now(), type, name, x: 60 + prev.length * 40, y: 60 + (prev.length % 4) * 60 }]);
  };

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:420, minHeight:480}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#ff6600'}}/>
        <span className="spx-float-panel__title">NODE MODIFIER</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body" style={{display:'flex',gap:8,height:'calc(100% - 36px)',overflow:'hidden'}}>
        {/* Sidebar */}
        <div style={{width:130,flexShrink:0,overflowY:'auto',borderRight:'1px solid #1a2a3a',paddingRight:6}}>
          {Object.entries(NODE_TYPES).map(([cat, items]) => (
            <div key={cat}>
              <div className="spx-fp-section-title" style={{marginTop:8}}>{cat}</div>
              {items.map(name => (
                <button key={name} className="spx-fp-btn" style={{display:'block',width:'100%',marginBottom:3,fontSize:9,padding:'4px 6px',textAlign:'left'}}
                  onClick={()=>addNode(cat,name)}>{name}</button>
              ))}
            </div>
          ))}
        </div>
        {/* Graph area */}
        <div style={{flex:1,position:'relative',background:'#080c10',borderRadius:4,overflow:'hidden'}}>
          {nodes.length === 0 && (
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontSize:11}}>
              Add nodes from the sidebar
            </div>
          )}
          {nodes.map(n => (
            <div key={n.id}
              style={{position:'absolute',left:n.x,top:n.y,background:'#0d1117',border:`1px solid ${selected===n.id?'#00ffc8':'#1a2a3a'}`,borderRadius:4,padding:'6px 10px',cursor:'pointer',minWidth:90,fontSize:10,color:'#ccc'}}
              onClick={()=>setSelected(n.id)}>
              <div style={{fontSize:8,color:'#555',marginBottom:2}}>{n.type}</div>
              {n.name}
            </div>
          ))}
        </div>
      </div>
      <div className="spx-fp-actions" style={{padding:'8px 10px'}}>
        <button className="spx-fp-btn spx-fp-btn--bake"
          onClick={()=>console.log('[NodeMod] apply',nodes)}>APPLY</button>
        <button className="spx-fp-btn spx-fp-btn--reset" onClick={()=>setNodes([])}>CLEAR</button>
      </div>
    </div>
  );
}