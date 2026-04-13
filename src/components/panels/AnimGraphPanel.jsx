import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimationGraph, BlendTree, AnimStateMachine, ANIM_NODE_TYPES } from '../../mesh/AnimGraphEditor.js';
import '../../styles/panel-components.css';
import '../../styles/mesh-script.css';

const C = { bg:'#06060f', panel:'#0d1117', border:'#21262d', teal:'#00ffc8', orange:'#FF6600', text:'#e0e0e0', dim:'#8b949e', font:'JetBrains Mono,monospace' };

function Section({ title, color=C.teal, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spnl-section-wrap">
      <div className="spnl-section-hdr" style={{borderLeftColor:color}} onClick={()=>setOpen(v=>!v)}>
        <span className="spnl-section-arrow" style={{color}}>{open?'▾':'▸'}</span>
        <span className="spnl-section-name">{title}</span>
      </div>
      {open && <div className="spnl-section-body-pl">{children}</div>}
    </div>
  );
}

const NODE_COLORS = { clip:'#0066cc', blend2:'#006644', blend3:'#006644', additive:'#884400', stateMachine:'#440088', output:'#00ffc8', twobone_ik:'#cc0044', layeredBlend:'#664488' };

export default function AnimGraphPanel({ open, onClose, sceneRef, rendererRef }) {

  // ── Live 3D viewport mirror ──────────────────────────────────────────────
  const _vpRef    = useRef(null);
  const _vpMirror = useRef(null);
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const src = rendererRef?.current?.domElement;
      const dst = _vpRef.current;
      if (src && dst && dst.offsetWidth > 0) {
        dst.width  = dst.offsetWidth;
        dst.height = dst.offsetHeight;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      _vpMirror.current = requestAnimationFrame(tick);
    };
    _vpMirror.current = requestAnimationFrame(tick);
    return () => { if (_vpMirror.current) cancelAnimationFrame(_vpMirror.current); };
  }, [open, rendererRef]);

  const _vpCanvas = (
    <div style={{display:'flex',flexDirection:'column',flex:'0 0 45%',minWidth:0,borderRight:'1px solid #21262d',overflow:'hidden',background:'#060a10'}}>
      <div style={{fontSize:9,fontWeight:700,color:'#444',letterSpacing:'1.5px',padding:'5px 10px',background:'#0a0d13',borderBottom:'1px solid #21262d',flexShrink:0}}>3D SCENE — LIVE</div>
      <canvas ref={_vpRef} style={{flex:1,width:'100%',display:'block',minHeight:0}} />
    </div>
  );

  const [nodes, setNodes] = useState([
    { id:'clip1',  type:'clip',   x:60,  y:80,  params:{ clipName:'Idle' }},
    { id:'clip2',  type:'clip',   x:60,  y:180, params:{ clipName:'Walk' }},
    { id:'blend1', type:'blend2', x:240, y:120, params:{ alphaParam:'speed' }},
    { id:'out',    type:'output', x:420, y:120, params:{} },
  ]);
  const [connections, setConnections] = useState([
    { from:'clip1', fromOutput:'pose', to:'blend1', toInput:'A' },
    { from:'clip2', fromOutput:'pose', to:'blend1', toInput:'B' },
    { from:'blend1',fromOutput:'pose', to:'out',    toInput:'pose' },
  ]);
  const [states, setStates] = useState([
    { id:'idle',  name:'Idle',  clip:'Idle',  loop:true },
    { id:'walk',  name:'Walk',  clip:'Walk',  loop:true },
    { id:'run',   name:'Run',   clip:'Run',   loop:true },
    { id:'jump',  name:'Jump',  clip:'Jump',  loop:false },
  ]);
  const [transitions, setTransitions] = useState([
    { from:'idle', to:'walk',  condition:'isWalking',  blend:0.2 },
    { from:'walk', to:'run',   condition:'isRunning',  blend:0.15 },
    { from:'walk', to:'idle',  condition:'isStopped',  blend:0.3 },
    { from:'any',  to:'jump',  condition:'isJumping',  blend:0.1 },
  ]);
  const [params, setParams] = useState({ speed:0.5, isWalking:false, isRunning:false, isStopped:false, isJumping:false });
  const [activeTab, setActiveTab] = useState('graph'); // graph | states | params
  const [selectedNode, setSelectedNode] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [currentState, setCurrentState] = useState('idle');
  const [connecting, setConnecting] = useState(null);
  const svgRef = useRef(null);
  const graphRef = useRef(null);

  const onNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    setSelectedNode(nodeId);
    const startX = e.clientX, startY = e.clientY;
    const node = nodes.find(n => n.id === nodeId);
    const origX = node.x, origY = node.y;
    const onMove = (me) => {
      const dx = me.clientX - startX, dy = me.clientY - startY;
      setNodes(prev => prev.map(n => n.id === nodeId ? {...n, x:origX+dx, y:origY+dy} : n));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [nodes]);

  const addNode = useCallback((type) => {
    const id = type + '_' + Math.random().toString(36).slice(2,6);
    setNodes(prev => [...prev, { id, type, x:200+Math.random()*100, y:100+Math.random()*100, params:{} }]);
  }, []);

  const deleteNode = useCallback((id) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
    if (selectedNode === id) setSelectedNode(null);
  }, [selectedNode]);

  if (!open) return null;
  const selNode = nodes.find(n => n.id === selectedNode);

  return (
    <div className="ms-overlay" onClick={onClose} style={{display:"flex",flexDirection:"row",alignItems:"stretch"}}>
      <>{_vpCanvas}<div className="ms-panel" style={{flex:1,minWidth:0,width:"auto"}} onClick={e=>e.stopPropagation()}>

        <div className="ms-header">
          <div className="ms-header-dot" style={{background:C.orange}}/>
          <span className="ms-header-title" style={{color:C.orange}}>ANIM GRAPH</span>
          <span className="ms-header-sub">Visual animation blending</span>
          <span className="spnl-tag spnl-tag--teal" style={{marginLeft:'auto'}}>{currentState.toUpperCase()}</span>
          <button className="ms-close" onClick={onClose}>✕</button>
        </div>

        <div className="ms-tabs">
          {[['graph','Graph'],['states','State Machine'],['params','Parameters']].map(([id,label])=>(
            <button key={id} className={`ms-tab${activeTab===id?' ms-tab--active':''}`} onClick={()=>setActiveTab(id)}>{label}</button>
          ))}
        </div>

        <div className="ms-body">

          {/* ── Graph tab ── */}
          {activeTab === 'graph' && (
            <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
              {/* Toolbar */}
              <div style={{display:'flex',gap:4,padding:'6px 8px',borderBottom:`1px solid ${C.border}`,flexShrink:0,flexWrap:'wrap'}}>
                <span className="spnl-dim" style={{fontSize:9,alignSelf:'center'}}>ADD NODE:</span>
                {Object.entries(ANIM_NODE_TYPES).filter(([k])=>k!=='output').map(([type,def])=>(
                  <button key={type} className="ms-btn ms-btn--xs" onClick={()=>addNode(type)}
                    style={{borderColor:NODE_COLORS[type]??C.border,color:NODE_COLORS[type]??C.dim}}>
                    {def.label}
                  </button>
                ))}
              </div>

              {/* Canvas */}
              <div ref={graphRef} className="ms-output" style={{flex:1,position:'relative',overflow:'hidden',background:'#030308',cursor:'default'}}>
                {/* SVG connections */}
                <svg ref={svgRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
                  {connections.map((c,i) => {
                    const fromNode = nodes.find(n=>n.id===c.from);
                    const toNode   = nodes.find(n=>n.id===c.to);
                    if (!fromNode||!toNode) return null;
                    const x1=fromNode.x+120, y1=fromNode.y+18;
                    const x2=toNode.x,       y2=toNode.y+18;
                    const cx=(x1+x2)/2;
                    return <path key={i} d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                      fill="none" stroke={C.teal} strokeWidth="1.5" opacity="0.7"/>;
                  })}
                </svg>
                {/* Nodes */}
                {nodes.map(node => {
                  const def = ANIM_NODE_TYPES[node.type] ?? ANIM_NODE_TYPES.clip;
                  const color = NODE_COLORS[node.type] ?? C.border;
                  const isSel = selectedNode === node.id;
                  return (
                    <div key={node.id}
                      style={{position:'absolute',left:node.x,top:node.y,width:120,background:C.panel,
                        border:`1.5px solid ${isSel?C.teal:color}`,borderRadius:5,cursor:'move',
                        fontFamily:C.font,userSelect:'none',zIndex:isSel?10:1}}
                      onMouseDown={e=>onNodeMouseDown(e,node.id)}
                      onClick={e=>{e.stopPropagation();setSelectedNode(node.id);}}>
                      <div style={{background:color+'33',padding:'4px 8px',borderRadius:'3px 3px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:9,fontWeight:700,color,letterSpacing:1}}>{def.label}</span>
                        {node.id !== 'out' && <span style={{fontSize:9,color:C.dim,cursor:'pointer'}} onClick={e=>{e.stopPropagation();deleteNode(node.id);}}>×</span>}
                      </div>
                      <div style={{padding:'4px 8px'}}>
                        <div style={{fontSize:8,color:C.dim}}>{node.params.clipName ?? node.id}</div>
                        <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                          <div style={{fontSize:7,color:C.dim}}>{def.inputs.map(i=><span key={i} style={{display:'block'}}>← {i}</span>)}</div>
                          <div style={{fontSize:7,color:color}}>{def.outputs.map(o=><span key={o} style={{display:'block'}}>{o} →</span>)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!nodes.length && <div className="ms-output-empty">Add nodes to build your animation graph</div>}
              </div>

              {/* Node properties */}
              {selNode && (
                <div style={{borderTop:`1px solid ${C.border}`,padding:'8px',flexShrink:0,background:C.panel}}>
                  <div style={{fontSize:9,color:C.teal,marginBottom:4}}>{ANIM_NODE_TYPES[selNode.type]?.label} — {selNode.id}</div>
                  {selNode.type === 'clip' && (
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{fontSize:9,color:C.dim}}>Clip:</span>
                      <input className="ms-save-input" value={selNode.params.clipName??''}
                        onChange={e=>setNodes(prev=>prev.map(n=>n.id===selNode.id?{...n,params:{...n.params,clipName:e.target.value}}:n))}/>
                    </div>
                  )}
                  {selNode.type === 'blend2' && (
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{fontSize:9,color:C.dim}}>Alpha param:</span>
                      <input className="ms-save-input" value={selNode.params.alphaParam??'alpha'}
                        onChange={e=>setNodes(prev=>prev.map(n=>n.id===selNode.id?{...n,params:{...n.params,alphaParam:e.target.value}}:n))}/>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── State Machine tab ── */}
          {activeTab === 'states' && (
            <div className="ms-library">
              <div className="ms-lib-section-title">States</div>
              {states.map(s => (
                <div key={s.id} className="ms-script-card">
                  <span className={`spnl-hdr-dot${s.id===currentState?' spnl-hdr-dot--green':''}`} style={{background:s.id===currentState?C.teal:C.border}}/>
                  <span className="ms-script-name">{s.name}</span>
                  <span className="ms-script-date">{s.clip} · {s.loop?'loop':'once'}</span>
                  <button className="ms-btn ms-btn--xs ms-btn--run" onClick={()=>setCurrentState(s.id)}>▶ Set</button>
                </div>
              ))}
              <div className="ms-lib-section-title ms-lib-section-title--mt">Transitions</div>
              {transitions.map((t,i) => (
                <div key={i} className="ms-script-card">
                  <span className="ms-script-name">{t.from} → {t.to}</span>
                  <span className="ms-script-date">{t.condition} · {t.blend}s</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Parameters tab ── */}
          {activeTab === 'params' && (
            <div className="ms-macros">
              <div className="ms-lib-section-title">Runtime Parameters</div>
              {Object.entries(params).map(([key, val]) => (
                <div key={key} className="ms-script-card">
                  <span className="ms-script-name">{key}</span>
                  {typeof val === 'boolean'
                    ? <button className={`ms-btn ms-btn--xs${val?' ms-btn--run':''}`}
                        onClick={()=>setParams(p=>({...p,[key]:!val}))}>
                        {val ? 'true' : 'false'}
                      </button>
                    : <input className="ms-save-input" type="number" step="0.1" value={val}
                        style={{width:60}} onChange={e=>setParams(p=>({...p,[key]:parseFloat(e.target.value)}))}/>
                  }
                </div>
              ))}
              <div className="ms-lib-section-title ms-lib-section-title--mt">Two-Bone IK</div>
              <div className="ms-script-card">
                <span className="ms-script-name">Right Hand IK</span>
                <button className="ms-btn ms-btn--xs">Configure</button>
              </div>
              <div className="ms-script-card">
                <span className="ms-script-name">Left Foot IK</span>
                <button className="ms-btn ms-btn--xs">Configure</button>
              </div>
              <div className="ms-script-card">
                <span className="ms-script-name">Right Foot IK</span>
                <button className="ms-btn ms-btn--xs">Configure</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </></div>
  );
}
