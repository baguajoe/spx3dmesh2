import React, { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import '../../styles/panel-components.css';

const NODE_TYPES = {
  Output:      { color:'#ff6600', inputs:['Surface','Volume','Displacement'], outputs:[] },
  Principled:  { color:'#4488ff', inputs:['BaseColor','Metallic','Roughness','IOR','Alpha','Normal','Clearcoat','ClearcoatRoughness','Emission','EmissionStrength','Transmission','Sheen'], outputs:['BSDF'] },
  Emission:    { color:'#ffaa00', inputs:['Color','Strength'], outputs:['Emission'] },
  Diffuse:     { color:'#44aa44', inputs:['Color','Roughness','Normal'], outputs:['BSDF'] },
  Glossy:      { color:'#aaaaff', inputs:['Color','Roughness','Normal'], outputs:['BSDF'] },
  Glass:       { color:'#88ccff', inputs:['Color','Roughness','IOR','Normal'], outputs:['BSDF'] },
  MixShader:   { color:'#ff44aa', inputs:['Fac','Shader1','Shader2'], outputs:['Shader'] },
  AddShader:   { color:'#ffaaff', inputs:['Shader1','Shader2'], outputs:['Shader'] },
  ImageTex:    { color:'#aa44aa', inputs:['Vector'], outputs:['Color','Alpha'] },
  NoiseTex:    { color:'#884400', inputs:['Vector','Scale','Detail','Roughness'], outputs:['Fac','Color'] },
  MixRGB:      { color:'#226622', inputs:['Fac','Color1','Color2'], outputs:['Color'] },
  Math:        { color:'#446644', inputs:['Value1','Value2'], outputs:['Value'] },
  NormalMap:   { color:'#4466aa', inputs:['Color','Strength'], outputs:['Normal'] },
  Bump:        { color:'#445566', inputs:['Height','Distance','Normal'], outputs:['Normal'] },
  Fresnel:     { color:'#66aaff', inputs:['IOR'], outputs:['Fac'] },
  ColorRamp:   { color:'#aa6622', inputs:['Fac'], outputs:['Color','Alpha'] },
  RGB:         { color:'#cc4444', inputs:[], outputs:['Color'] },
  Value:       { color:'#888844', inputs:[], outputs:['Value'] },
  Displacement:{ color:'#cc8844', inputs:['Height','Midlevel','Scale','Normal'], outputs:['Displacement'] },
};

let _nid = 0;
function mkNode(type, x, y) {
  const def = NODE_TYPES[type] || { color:'#888', inputs:[], outputs:[] };
  return {
    id: ++_nid, type, x, y, w: 160, color: def.color,
    inputs: def.inputs.map((n,i) => ({ id:`${_nid}_i${i}`, name:n, connected:null, value:type==='RGB'?'#ffffff':type==='Value'?1.0:null })),
    outputs: def.outputs.map((n,i) => ({ id:`${_nid}_o${i}`, name:n })),
    params: { color:'#ffffff', value:1.0, scale:5, blend:'MIX', imageUrl:null },
  };
}


// ── Live viewport wrapper — mirrors main renderer on left side ────────────
function WithViewport({ rendererRef, open, children }) {
  const _vref = React.useRef(null);
  const _vaf  = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const tick = () => {
      const src = rendererRef?.current?.domElement;
      const dst = _vref.current;
      if (src && dst && dst.offsetWidth > 0) {
        dst.width  = dst.offsetWidth;
        dst.height = dst.offsetHeight;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      _vaf.current = requestAnimationFrame(tick);
    };
    _vaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(_vaf.current);
  }, [open, rendererRef]);
  return (
    <WithViewport rendererRef={rendererRef} open={open}>
    <div style={{display:'flex',width:'100%',height:'100%',overflow:'hidden'}}>
      <div style={{flex:'0 0 45%',minWidth:0,display:'flex',flexDirection:'column',borderRight:'1px solid #21262d',background:'#060a10'}}>
        <div style={{fontSize:9,fontWeight:700,color:'#444',letterSpacing:'1.5px',padding:'5px 10px',background:'#0a0d13',borderBottom:'1px solid #21262d',flexShrink:0,textTransform:'uppercase'}}>3D Scene — Live</div>
        <canvas ref={_vref} style={{flex:1,width:'100%',display:'block',minHeight:0}} />
      </div>
      <div style={{flex:1,minWidth:0,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {children}
      </div>
    </div>
  );
}

export default function NodeMaterialEditor({meshRef, open=true, onClose, rendererRef}) {
  const [nodes,    setNodes]    = useState(() => [mkNode('Output',400,200), mkNode('Principled',100,150)]);
  const [links,    setLinks]    = useState([]);
  const [drag,     setDrag]     = useState(null);
  const [linkDrag, setLinkDrag] = useState(null);
  const [selected, setSelected] = useState(null);
  const [pan,      setPan]      = useState({ x:0, y:0 });

  const addNode    = useCallback((type) => { setNodes(n => [...n, mkNode(type, 200-pan.x, 200-pan.y)]); }, [pan]);
  const deleteNode = useCallback((id)   => { setNodes(n => n.filter(x => x.id!==id)); setLinks(l => l.filter(x => x.fromNode!==id && x.toNode!==id)); }, []);

  const onMouseDown = useCallback((e, node) => {
    e.stopPropagation();
    setSelected(node.id);
    setDrag({ id:node.id, ox:e.clientX-node.x, oy:e.clientY-node.y });
  }, []);

  const onMouseMove = useCallback((e) => {
    if (drag)     setNodes(n => n.map(x => x.id===drag.id ? {...x, x:e.clientX-drag.ox, y:e.clientY-drag.oy} : x));
    if (linkDrag) setLinkDrag(l => ({...l, ex:e.clientX, ey:e.clientY}));
  }, [drag, linkDrag]);

  const onMouseUp = useCallback(() => { setDrag(null); setLinkDrag(null); }, []);

  const startLink = useCallback((e, nodeId, outId) => {
    e.stopPropagation();
    const r = e.target.getBoundingClientRect();
    setLinkDrag({ fromNode:nodeId, fromOut:outId, sx:r.left+r.width/2, sy:r.top+r.height/2, ex:r.left, ey:r.top });
  }, []);

  const finishLink = useCallback((e, nodeId, inId) => {
    e.stopPropagation();
    if (!linkDrag) return;
    setLinks(l => [...l, { id:Date.now(), fromNode:linkDrag.fromNode, fromOut:linkDrag.fromOut, toNode:nodeId, toIn:inId }]);
    setLinkDrag(null);
  }, [linkDrag]);

  const applyToMesh = useCallback(() => {
    const mesh = meshRef?.current; if (!mesh) return;
    const principled = nodes.find(n => n.type==='Principled');
    if (!principled) return;
    const mat = new THREE.MeshPhysicalMaterial({
      color:           new THREE.Color(principled.params.color || '#ffffff'),
      roughness:       parseFloat(principled.params.roughness || 0.5),
      metalness:       parseFloat(principled.params.metalness || 0),
      clearcoat:       parseFloat(principled.params.clearcoat || 0),
      envMapIntensity: 1.2,
    });
    links.forEach(lk => {
      const fromNode = nodes.find(n => n.id===lk.fromNode);
      if (fromNode?.type==='ImageTex' && fromNode.params.imageUrl) {
        const tex = new THREE.TextureLoader().load(fromNode.params.imageUrl);
        const toNode = nodes.find(n => n.id===lk.toNode);
        const inSlot = toNode?.inputs.find(i => i.id===lk.toIn);
        if (inSlot?.name==='BaseColor')  mat.map          = tex;
        else if (inSlot?.name==='Normal')    mat.normalMap    = tex;
        else if (inSlot?.name==='Roughness') mat.roughnessMap = tex;
        else if (inSlot?.name==='Metallic')  mat.metalnessMap = tex;
      }
    });
    mat.needsUpdate = true;
    mesh.material = mat;
  }, [nodes, links, meshRef]);

  const selNode = nodes.find(n => n.id===selected);
  if (!open) return null;

  return (
    <div className="nme-overlay">
      <div className="nme-header">
        <div className="nme-header__dot" />
        <span className="nme-header__title">NODE MATERIAL EDITOR</span>
        <div className="nme-header__nodes">
          {Object.keys(NODE_TYPES).map(t => (
            <button
              key={t}
              className="nme-node-btn"
              style={{ border:`1px solid ${NODE_TYPES[t].color}`, color:NODE_TYPES[t].color }}
              onClick={() => addNode(t)}
            >{t}</button>
          ))}
        </div>
        <div className="nme-header__actions">
          <button className="nme-apply-btn" onClick={applyToMesh}>APPLY TO MESH</button>
          <button className="nme-close-btn" onClick={onClose}>CLOSE</button>
        </div>
      </div>

      <div className="nme-canvas" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
        <svg className="nme-svg" ref={useRef(null)}>
          <defs>
            <pattern id="nme-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a1a2a" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#nme-grid)"/>
          {links.map(lk => {
            const fn = nodes.find(n => n.id===lk.fromNode);
            const tn = nodes.find(n => n.id===lk.toNode);
            if (!fn || !tn) return null;
            const oi = fn.outputs.findIndex(o => o.id===lk.fromOut);
            const ii = tn.inputs.findIndex(i => i.id===lk.toIn);
            const x1=fn.x+fn.w, y1=fn.y+32+oi*22;
            const x2=tn.x,      y2=tn.y+32+ii*22;
            const cx=(x1+x2)/2;
            return (
              <g key={lk.id}>
                <path d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`} fill="none" stroke="#00ffc8" strokeWidth="1.5" opacity="0.7"/>
                <circle cx={x1} cy={y1} r="4" fill="#00ffc8"/>
                <circle cx={x2} cy={y2} r="4" fill="#00ffc8"/>
              </g>
            );
          })}
          {linkDrag && (
            <path
              d={`M${linkDrag.sx},${linkDrag.sy} C${(linkDrag.sx+linkDrag.ex)/2},${linkDrag.sy} ${(linkDrag.sx+linkDrag.ex)/2},${linkDrag.ey} ${linkDrag.ex},${linkDrag.ey}`}
              fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="4"
            />
          )}
        </svg>

        {nodes.map(node => (
          <div
            key={node.id}
            className="nme-node"
            style={{
              left: node.x, top: node.y, width: node.w,
              background: '#0d1117',
              border: `1px solid ${selected===node.id ? node.color : '#21262d'}`,
              boxShadow: selected===node.id ? `0 0 8px ${node.color}40` : 'none',
            }}
            onMouseDown={e => onMouseDown(e, node)}
          >
            <div
              className="nme-node__header"
              style={{ background:`${node.color}22`, borderBottom:`1px solid ${node.color}44` }}
            >
              <span className="nme-node__title" style={{ color:node.color }}>{node.type.toUpperCase()}</span>
              <button className="nme-node__delete" onClick={e => { e.stopPropagation(); deleteNode(node.id); }}>×</button>
            </div>

            {node.inputs.map((inp) => (
              <div key={inp.id} className="nme-socket-row" onMouseUp={e => finishLink(e, node.id, inp.id)}>
                <div className="nme-socket nme-socket--in" />
                <span className="nme-socket__label">{inp.name}</span>
              </div>
            ))}

            {node.outputs.map((out) => (
              <div key={out.id} className="nme-socket-row nme-socket-row--out">
                <span className="nme-socket__label">{out.name}</span>
                <div
                  className="nme-socket"
                  style={{ background:node.color }}
                  onMouseDown={e => startLink(e, node.id, out.id)}
                />
              </div>
            ))}

            {(node.type==='RGB'||node.type==='Value'||node.type==='ImageTex'||node.type==='NoiseTex') && (
              <div className="nme-node__params">
                {node.type==='RGB' && (
                  <input type="color" className="nme-param-color" value={node.params.color}
                    onChange={e => { const v=e.target.value; setNodes(n=>n.map(x=>x.id===node.id?{...x,params:{...x.params,color:v}}:x)); }}
                  />
                )}
                {node.type==='Value' && (
                  <input type="range" min={0} max={1} step={0.01} value={node.params.value}
                    className="nme-param-range"
                    onChange={e => { const v=parseFloat(e.target.value); setNodes(n=>n.map(x=>x.id===node.id?{...x,params:{...x.params,value:v}}:x)); }}
                  />
                )}
                {node.type==='ImageTex' && (
                  <label className="nme-param-file-label">
                    <input type="file" accept="image/*" className="spx-file-input-hidden"
                      onChange={e => { const f=e.target.files[0]; if(f){const url=URL.createObjectURL(f);setNodes(n=>n.map(x=>x.id===node.id?{...x,params:{...x.params,imageUrl:url}}:x));} }}
                    />
                    📁 Load Image
                  </label>
                )}
                {node.type==='NoiseTex' && (
                  <input type="range" min={0.1} max={20} step={0.1} value={node.params.scale}
                    className="nme-param-range"
                    onChange={e => { const v=parseFloat(e.target.value); setNodes(n=>n.map(x=>x.id===node.id?{...x,params:{...x.params,scale:v}}:x)); }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {selNode && selNode.type==='Principled' && (
        <div className="nme-props">
          <div className="nme-props__title">PRINCIPLED BSDF</div>
          {[
            ['color','Base Color','color'],
            ['roughness','Roughness','range'],
            ['metalness','Metalness','range'],
            ['clearcoat','Clearcoat','range'],
            ['transmission','Transmission','range'],
            ['ior','IOR','number'],
            ['emissiveIntensity','Emit Strength','range'],
          ].map(([key,label,type]) => (
            <div key={key} className="nme-prop-row">
              <div className="nme-prop-label">{label}</div>
              {type==='color' ? (
                <input type="color" className="nme-prop-color"
                  value={selNode.params[key]||'#ffffff'}
                  onChange={e => { const v=e.target.value; setNodes(n=>n.map(x=>x.id===selNode.id?{...x,params:{...x.params,[key]:v}}:x)); }}
                />
              ) : (
                <input type="range" min={type==='number'?1:0} max={type==='number'?3:1} step={0.01}
                  value={selNode.params[key]||0}
                  className="nme-prop-range"
                  onChange={e => { const v=parseFloat(e.target.value); setNodes(n=>n.map(x=>x.id===selNode.id?{...x,params:{...x.params,[key]:v}}:x)); }}
                />
              )}
            </div>
          ))}
          <button className="nme-props__apply" onClick={applyToMesh}>APPLY</button>
        </div>
      )}
    </div>
  </WithViewport>
  );
}
