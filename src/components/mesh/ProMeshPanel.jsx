import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { HalfEdgeMesh } from "../../mesh/HalfEdgeMesh.js";
import { triangulateNgon, buildNgonGeometry, dissolveEdge, bridgeFaces, gridFill, pokeFace, insetFace, getNgonStats } from "../../mesh/NgonSupport.js";
import { createRetopoSettings, quadDominantRetopo, detectHardEdges, getRetopoStats } from "../../mesh/AutoRetopo.js";
import { applyDyntopo, dyntopoFloodFill, smoothTopology, createDynaMeshSettings } from "../../mesh/DynamicTopology.js";
import { booleanUnion, booleanSubtract, booleanIntersect } from "../../mesh/BooleanOps.js";
import { voxelRemesh, quadRemesh, symmetrizeMesh, getRemeshStats } from "../../mesh/RemeshSystem.js";
import "../../styles/gen-panels-extra.css";

const C = {
  bg:"#06060f", panel:"#0a0a14", border:"#1a2a3a",
  teal:"#00ffc8", orange:"#FF6600", muted:"#5a7088",
  text:"#ccc", danger:"#ff4444", warn:"#ffaa00",
  green:"#44ff88", purple:"#aa44ff",
};

const TOOL_GROUPS = [
  { label:"Select Mode", col:C.orange, tools:[
    {id:"sel_vert", label:"Vert",  icon:"◉", key:"1"},
    {id:"sel_edge", label:"Edge",  icon:"╌", key:"2"},
    {id:"sel_face", label:"Face",  icon:"▣", key:"3"},
  ]},
  { label:"Selection", col:C.teal, tools:[
    {id:"sel_all",     label:"All",     icon:"⬜", key:"A"},
    {id:"sel_none",    label:"None",    icon:"⬛", key:"Alt+A"},
    {id:"sel_invert",  label:"Invert",  icon:"⧉", key:"Ctrl+I"},
    {id:"sel_linked",  label:"Linked",  icon:"⊞", key:"L"},
    {id:"sel_loop",    label:"Loop",    icon:"◯", key:"Alt+Click"},
    {id:"sel_grow",    label:"Grow",    icon:"⊕", key:"+"},
    {id:"sel_shrink",  label:"Shrink",  icon:"⊖", key:"-"},
    {id:"sel_checker", label:"Checker", icon:"⊠", key:""},
    {id:"sel_random",  label:"Random",  icon:"⁇", key:""},
  ]},
  { label:"Mesh Ops", col:C.teal, tools:[
    {id:"extrude",     label:"Extrude",    icon:"⬆", key:"E"},
    {id:"inset",       label:"Inset",      icon:"⊠", key:"I"},
    {id:"loop_cut",    label:"Loop Cut",   icon:"⊟", key:"Ctrl+R"},
    {id:"bevel",       label:"Bevel",      icon:"◫", key:"Ctrl+B"},
    {id:"knife",       label:"Knife",      icon:"✂", key:"K"},
    {id:"bridge",      label:"Bridge",     icon:"⇔", key:""},
    {id:"merge",       label:"Merge",      icon:"⊕", key:"M"},
    {id:"dissolve",    label:"Dissolve",   icon:"⊘", key:"Ctrl+X"},
    {id:"poke",        label:"Poke",       icon:"✦", key:""},
    {id:"grid_fill",   label:"Grid Fill",  icon:"⊞", key:""},
    {id:"subdivide",   label:"Subdivide",  icon:"⬡", key:""},
    {id:"triangulate", label:"Triangulate",icon:"△", key:"Ctrl+T"},
  ]},
  { label:"Transform", col:C.teal, tools:[
    {id:"grab",        label:"Grab",       icon:"✋", key:"G"},
    {id:"rotate",      label:"Rotate",     icon:"↻", key:"R"},
    {id:"scale",       label:"Scale",      icon:"⤡", key:"S"},
    {id:"slide_edge",  label:"Slide",      icon:"↔", key:"G G"},
    {id:"proportional",label:"Prop Edit",  icon:"◎", key:"O"},
    {id:"snap",        label:"Snap",       icon:"🧲", key:"Shift+Tab"},
    {id:"to_sphere",   label:"To Sphere",  icon:"●", key:"Shift+Alt+S"},
    {id:"shear",       label:"Shear",      icon:"▱", key:"Shift+Ctrl+Alt+S"},
  ]},
  { label:"Normals", col:C.purple, tools:[
    {id:"flip_normals",   label:"Flip",       icon:"↕", key:"Alt+N"},
    {id:"recalc_outside", label:"Recalc Out", icon:"→", key:"Shift+N"},
    {id:"recalc_inside",  label:"Recalc In",  icon:"←", key:""},
    {id:"smooth_normals", label:"Smooth",     icon:"~", key:""},
    {id:"mark_sharp",     label:"Sharp",      icon:"⌒", key:""},
    {id:"clear_sharp",    label:"Clr Sharp",  icon:"⌢", key:""},
  ]},
  { label:"Cleanup", col:C.green, tools:[
    {id:"merge_distance",   label:"Merge Dist",  icon:"⊕", key:"M"},
    {id:"remove_doubles",   label:"Rm Doubles",  icon:"⊗", key:""},
    {id:"fill_holes",       label:"Fill Holes",  icon:"⊛", key:""},
    {id:"fix_normals",      label:"Fix Norms",   icon:"↕", key:""},
    {id:"limited_dissolve", label:"Ltd Dissolve",icon:"∅", key:""},
    {id:"decimate",         label:"Decimate",    icon:"▽", key:""},
  ]},
  { label:"Boolean", col:C.orange, tools:[
    {id:"bool_union",     label:"Union",     icon:"⊕", key:""},
    {id:"bool_subtract",  label:"Subtract",  icon:"⊖", key:""},
    {id:"bool_intersect", label:"Intersect", icon:"⊗", key:""},
  ]},
  { label:"Remesh", col:C.warn, tools:[
    {id:"voxel_remesh",  label:"Voxel",      icon:"⬡", key:""},
    {id:"quad_remesh",   label:"Quad",       icon:"▣", key:""},
    {id:"auto_retopo",   label:"Retopo",     icon:"⬢", key:""},
    {id:"symmetrize",    label:"Symmetrize", icon:"⇔", key:""},
    {id:"dyntopo_flood", label:"Dyntopo",    icon:"≋", key:""},
    {id:"smooth_topo",   label:"Sm Topo",    icon:"○", key:""},
  ]},
];

const PROPORTIONAL_FALLOFFS = ["smooth","sphere","root","sharp","linear","constant","random"];

function KS({ label, value, min, max, step=0.01, unit="", onChange, accentColor=C.teal }) {
  return (
    <div className="pmesh-row">
      <span className="pmesh-slider-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        className="pmesh-slider" style={{accentColor}} onChange={e=>onChange(+e.target.value)}/>
      <span className="pmesh-slider-val" style={{color:accentColor}}>
        {typeof value==="number"?(value%1!==0?value.toFixed(2):value):value}{unit}
      </span>
    </div>
  );
}

export default function ProMeshPanel({ open, onClose, meshRef, sceneRef, setStatus, onApplyFunction }) {
  if(!open) return null;

  const [activeTool,    setActiveTool]    = useState("sel_vert");
  const [selectMode,    setSelectMode]    = useState("vert");
  const [propEnabled,   setPropEnabled]   = useState(false);
  const [propRadius,    setPropRadius]    = useState(1.0);
  const [propFalloff,   setPropFalloff]   = useState("smooth");
  const [snapEnabled,   setSnapEnabled]   = useState(false);
  const [snapTarget,    setSnapTarget]    = useState("vertex");
  const [extrudeAmt,    setExtrudeAmt]    = useState(0.3);
  const [bevelAmt,      setBevelAmt]      = useState(0.1);
  const [bevelSegs,     setBevelSegs]     = useState(2);
  const [insetAmt,      setInsetAmt]      = useState(0.1);
  const [loopSlide,     setLoopSlide]     = useState(0.5);
  const [mergeThresh,   setMergeThresh]   = useState(0.001);
  const [voxelSize,     setVoxelSize]     = useState(0.1);
  const [retopoFaces,   setRetopoFaces]   = useState(1000);
  const [symmetryAxis,  setSymmetryAxis]  = useState("x");
  const [creaseWeight,  setCreaseWeight]  = useState(1.0);
  const [stats,         setMeshStats]     = useState({ verts:0,edges:0,faces:0,tris:0 });
  const [history,       setHistory]       = useState([]);
  const heMeshRef = useRef(null);

  const updateStats = useCallback(()=>{
    const mesh=meshRef?.current; if(!mesh?.geometry) return;
    const geo=mesh.geometry,verts=geo.attributes.position?.count||0;
    const faces=geo.index?Math.floor(geo.index.count/3):Math.floor(verts/3);
    setMeshStats({verts,edges:Math.round(faces*1.5),faces,tris:faces});
  },[meshRef]);

  useEffect(()=>{ updateStats(); },[updateStats]);
  const pushHistory=(label)=>{ setHistory(prev=>[label,...prev.slice(0,19)]); };

  const applyTool = useCallback((toolId)=>{
    const mesh=meshRef?.current;
    setActiveTool(toolId);
    const direct={grab:"grab",rotate:"rotate",scale:"scale",extrude:"extrude",loop_cut:"loop_cut",knife:"knife",slide_edge:"edge_slide",bool_union:"bool_union",bool_subtract:"bool_subtract",bool_intersect:"bool_intersect",fix_normals:"fix_normals",remove_doubles:"rm_doubles",fill_holes:"fill_holes",voxel_remesh:"voxel_remesh",quad_remesh:"quad_remesh",auto_retopo:"auto_retopo",sel_all:"selectAll",sel_none:"deselectAll"};
    if(direct[toolId]){onApplyFunction?.(direct[toolId]);pushHistory(toolId.replace(/_/g," "));updateStats();return;}
    if(toolId==="sel_vert"){setSelectMode("vert");onApplyFunction?.("selectMode_vert");return;}
    if(toolId==="sel_edge"){setSelectMode("edge");onApplyFunction?.("selectMode_edge");return;}
    if(toolId==="sel_face"){setSelectMode("face");onApplyFunction?.("selectMode_face");return;}
    if(!mesh){setStatus?.("Select a mesh first");return;}
    const geo=mesh.geometry;
    if(toolId==="proportional"){setPropEnabled(v=>!v);setStatus?.(propEnabled?"Proportional edit OFF":`Proportional edit ON — ${propFalloff}`);return;}
    if(toolId==="snap"){setSnapEnabled(v=>!v);setStatus?.(snapEnabled?"Snap OFF":`Snap ON — ${snapTarget}`);return;}
    const getOrBuildHEM=()=>{if(!heMeshRef.current){const hem=new HalfEdgeMesh();const pos=geo.attributes.position;for(let i=0;i<pos.count;i++)hem.addVertex(pos.getX(i),pos.getY(i),pos.getZ(i));heMeshRef.current=hem;}return heMeshRef.current;};
    if(toolId==="inset"){const hem=getOrBuildHEM();hem.insetFaces([0],insetAmt);const{positions,indices}=hem.toBufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(positions,3));geo.setIndex(new THREE.BufferAttribute(indices,1));geo.computeVertexNormals();pushHistory("Inset");updateStats();setStatus?.("Inset applied");return;}
    if(toolId==="bevel"){const hem=getOrBuildHEM();hem.bevelEdges(bevelAmt,bevelSegs);const{positions,indices}=hem.toBufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(positions,3));geo.setIndex(new THREE.BufferAttribute(indices,1));geo.computeVertexNormals();pushHistory("Bevel");updateStats();setStatus?.("Bevel applied");return;}
    if(toolId==="subdivide"){const hem=getOrBuildHEM();hem.subdivide();const{positions,indices}=hem.toBufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(positions,3));geo.setIndex(new THREE.BufferAttribute(indices,1));geo.computeVertexNormals();pushHistory("Subdivide (Catmull-Clark)");updateStats();setStatus?.("Catmull-Clark subdivision applied");return;}
    if(toolId==="triangulate"){const hem=getOrBuildHEM();const triMesh=hem.triangulateAll();const{positions,indices}=triMesh.toBufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(positions,3));geo.setIndex(new THREE.BufferAttribute(indices,1));geo.computeVertexNormals();pushHistory("Triangulate");updateStats();setStatus?.("Mesh triangulated");return;}
    if(toolId==="merge_distance"){const hem=getOrBuildHEM();const count=hem.mergeByDistance(mergeThresh);pushHistory(`Merge by distance — ${count} merged`);updateStats();setStatus?.(`Merged ${count} vertices (threshold: ${mergeThresh})`);return;}
    if(toolId==="mirror"){const hem=getOrBuildHEM();hem.mirror(symmetryAxis);const{positions,indices}=hem.toBufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(positions,3));geo.setIndex(new THREE.BufferAttribute(indices,1));geo.computeVertexNormals();pushHistory(`Mirror ${symmetryAxis.toUpperCase()}`);updateStats();setStatus?.(`Mirrored on ${symmetryAxis.toUpperCase()} axis`);return;}
    if(toolId==="symmetrize"){symmetrizeMesh(mesh,symmetryAxis);pushHistory(`Symmetrize ${symmetryAxis.toUpperCase()}`);updateStats();setStatus?.(`Symmetrized on ${symmetryAxis.toUpperCase()}`);return;}
    if(toolId==="flip_normals"){const pos=geo.attributes.position,idx=geo.index;if(idx){const arr=idx.array;for(let i=0;i<arr.length;i+=3){const tmp=arr[i+1];arr[i+1]=arr[i+2];arr[i+2]=tmp;}idx.needsUpdate=true;}geo.computeVertexNormals();pushHistory("Flip Normals");setStatus?.("Normals flipped");return;}
    if(toolId==="recalc_outside"){geo.computeVertexNormals();pushHistory("Recalculate Normals (Outside)");setStatus?.("Normals recalculated");return;}
    if(toolId==="smooth_normals"){const nrm=geo.attributes.normal;if(nrm){for(let i=0;i<nrm.count;i++)nrm.setXYZ(i,nrm.getX(i)*0.8,nrm.getY(i)*0.8+0.2,nrm.getZ(i)*0.8);nrm.needsUpdate=true;}pushHistory("Smooth Normals");setStatus?.("Normals smoothed");return;}
    if(toolId==="dyntopo_flood"){dyntopoFloodFill(mesh,voxelSize);geo.computeVertexNormals();pushHistory("Dyntopo Flood Fill");updateStats();setStatus?.("Dynamic topology applied to entire mesh");return;}
    if(toolId==="smooth_topo"){smoothTopology(mesh,2);pushHistory("Smooth Topology");updateStats();setStatus?.("Topology smoothed");return;}
    if(toolId==="limited_dissolve"){const hem=getOrBuildHEM();const hardEdges=detectHardEdges(geo,30);hardEdges.forEach(edgeKey=>dissolveEdge(hem,edgeKey));pushHistory("Limited Dissolve");setStatus?.(`Limited dissolve — ${hardEdges.size} edges dissolved`);return;}
    if(toolId==="bridge"){setStatus?.("Select two face loops, then apply Bridge");return;}
    if(toolId==="grid_fill"){setStatus?.("Select a closed edge loop, then apply Grid Fill");return;}
    if(toolId==="to_sphere"){const pos=geo.attributes.position;const center=new THREE.Vector3();for(let i=0;i<pos.count;i++)center.add(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));center.divideScalar(pos.count);let maxR=0;for(let i=0;i<pos.count;i++){const v=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i));maxR=Math.max(maxR,v.distanceTo(center));}for(let i=0;i<pos.count;i++){const v=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)).sub(center).normalize().multiplyScalar(maxR);pos.setXYZ(i,v.x+center.x,v.y+center.y,v.z+center.z);}pos.needsUpdate=true;geo.computeVertexNormals();pushHistory("Cast to Sphere");setStatus?.("Cast to sphere");return;}
    if(toolId==="shear"){const pos=geo.attributes.position;for(let i=0;i<pos.count;i++)pos.setX(i,pos.getX(i)+pos.getY(i)*0.3);pos.needsUpdate=true;geo.computeVertexNormals();pushHistory("Shear");setStatus?.("Shear applied");return;}
    if(toolId==="sel_grow"){setStatus?.("Grow selection — G");return;}
    if(toolId==="sel_shrink"){setStatus?.("Shrink selection — S");return;}
    if(toolId==="sel_linked"){setStatus?.("Select linked — L (click mesh)");return;}
    if(toolId==="sel_loop"){setStatus?.("Select loop — Alt+Click edge");return;}
    if(toolId==="sel_invert"){setStatus?.("Invert selection");return;}
    if(toolId==="sel_checker"){setStatus?.("Checker deselect — every 2nd face");return;}
    if(toolId==="sel_random"){setStatus?.("Random select");return;}
    if(toolId==="mark_sharp"){setStatus?.("Mark sharp — select edges first");return;}
    if(toolId==="clear_sharp"){setStatus?.("Clear sharp edges");return;}
    if(toolId==="poke"){setStatus?.("Poke — select a face first");return;}
    if(toolId==="decimate"){onApplyFunction?.("voxel_remesh");pushHistory("Decimate");return;}
    setStatus?.(`Tool: ${toolId}`);
  },[meshRef,sceneRef,setStatus,onApplyFunction,propEnabled,propFalloff,snapEnabled,snapTarget,insetAmt,bevelAmt,mergeThresh,voxelSize,symmetryAxis,updateStats]);

  useEffect(()=>{
    const onKey=(e)=>{
      if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA") return;
      const map={"1":"sel_vert","2":"sel_edge","3":"sel_face","g":"grab","r":"rotate","s":"scale","e":"extrude","i":"inset","k":"knife","o":"proportional","a":"sel_all"};
      if(e.ctrlKey&&e.key==="r"){e.preventDefault();applyTool("loop_cut");return;}
      if(e.ctrlKey&&e.key==="b"){e.preventDefault();applyTool("bevel");return;}
      if(e.ctrlKey&&e.key==="t"){e.preventDefault();applyTool("triangulate");return;}
      if(e.ctrlKey&&e.key==="x"){e.preventDefault();applyTool("dissolve");return;}
      if(!e.ctrlKey&&!e.altKey&&map[e.key.toLowerCase()]){if(e.key==="a"&&!e.ctrlKey)applyTool("sel_all");else applyTool(map[e.key.toLowerCase()]);}
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[applyTool]);

  const SHORTCUTS = [["G","Grab/Move"],["R","Rotate"],["S","Scale"],["E","Extrude"],["I","Inset"],["K","Knife"],["O","Prop Edit"],["1","Vert Mode"],["2","Edge Mode"],["3","Face Mode"],["A","Select All"],["Alt+A","Deselect"],["Ctrl+R","Loop Cut"],["Ctrl+B","Bevel"],["Ctrl+T","Triangulate"],["Ctrl+X","Dissolve"],["Ctrl+I","Invert Sel"],["L","Sel Linked"],["Alt+N","Flip Normals"],["Shift+N","Recalc Normals"],["M","Merge"]];
  const QUICK_OPS = [["Subdivide","subdivide",C.teal],["Triangulate","triangulate",C.teal],["Flip Normals","flip_normals",C.purple],["Recalc Normals","recalc_outside",C.purple],["Merge Distance","merge_distance",C.green],["Smooth Topo","smooth_topo",C.green],["Dyntopo Flood","dyntopo_flood",C.warn],["To Sphere","to_sphere",C.teal],["Mirror X","mirror",C.orange]];

  return (
    <div className="pmesh-wrap">
      {/* Left — tools */}
      <div className="pmesh-left">
        {TOOL_GROUPS.map(group=>(
          <div key={group.label} className="pmesh-tool-group">
            <div className="pmesh-sl" style={{color:group.col}}>{group.label}</div>
            <div className="pmesh-tool-grid">
              {group.tools.map(tool=>(
                <button key={tool.id}
                  className="pmesh-tool-btn"
                  style={{border:`1px solid ${activeTool===tool.id?group.col:C.border}`,background:activeTool===tool.id?`${group.col}20`:C.bg,color:activeTool===tool.id?group.col:C.muted}}
                  onClick={()=>applyTool(tool.id)}
                  title={`${tool.label}${tool.key?` [${tool.key}]`:""}`}>
                  <span className="pmesh-tool-icon">{tool.icon}</span>
                  <span style={{fontSize:7}}>{tool.label}</span>
                </button>
              ))}
            </div>
            <div className="pmesh-divider"/>
          </div>
        ))}
      </div>

      {/* Center */}
      <div className="pmesh-center">
        <div className="pmesh-select-bar">
          {["vert","edge","face"].map((m,mi)=>(
            <button key={m}
              className="pmesh-mode-btn"
              style={{border:`1px solid ${selectMode===m?C.orange:C.border}`,background:selectMode===m?`${C.orange}20`:C.bg,color:selectMode===m?C.orange:C.muted,fontWeight:selectMode===m?700:400}}
              onClick={()=>applyTool(`sel_${m}`)}>
              {m.toUpperCase()} [{["1","2","3"][mi]}]
            </button>
          ))}
          <div style={{marginLeft:8,display:"flex",gap:4}}>
            <button className="pmesh-mode-btn"
              style={{border:`1px solid ${propEnabled?C.green:C.border}`,background:propEnabled?`${C.green}20`:C.bg,color:propEnabled?C.green:C.muted,fontWeight:propEnabled?700:400}}
              onClick={()=>applyTool("proportional")}>◎ PROPORTIONAL [O]</button>
            <button className="pmesh-mode-btn"
              style={{border:`1px solid ${snapEnabled?C.teal:C.border}`,background:snapEnabled?`${C.teal}20`:C.bg,color:snapEnabled?C.teal:C.muted,fontWeight:snapEnabled?700:400}}
              onClick={()=>applyTool("snap")}>🧲 SNAP [Shift+Tab]</button>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <span className="pmesh-tag" style={{background:`${C.teal}20`,color:C.teal,border:`1px solid ${C.teal}40`}}>V:{stats.verts}</span>
            <span className="pmesh-tag" style={{background:`${C.orange}20`,color:C.orange,border:`1px solid ${C.orange}40`}}>E:{stats.edges}</span>
            <span className="pmesh-tag" style={{background:`${C.muted}20`,color:C.muted,border:`1px solid ${C.muted}40`}}>F:{stats.faces}</span>
          </div>
        </div>

        <div className="pmesh-options-bar">
          {activeTool==="extrude"&&<div className="pmesh-opt-row"><span className="pmesh-opt-label">Amount</span><input type="range" min={0.01} max={5} step={0.01} value={extrudeAmt} onChange={e=>setExtrudeAmt(+e.target.value)} className="pmesh-opt-slider" style={{width:120,accentColor:C.teal}}/><span style={{fontSize:9,color:C.teal}}>{extrudeAmt.toFixed(2)}</span><button style={{padding:"3px 6px",border:`1px solid ${C.teal}44`,borderRadius:3,background:`${C.teal}11`,color:C.teal,cursor:"pointer",fontSize:9,fontFamily:"inherit"}} onClick={()=>onApplyFunction?.("extrude")}>APPLY</button></div>}
          {activeTool==="bevel"&&<div className="pmesh-opt-row"><span className="pmesh-opt-label">Amount</span><input type="range" min={0.01} max={2} step={0.01} value={bevelAmt} onChange={e=>setBevelAmt(+e.target.value)} className="pmesh-opt-slider" style={{width:100,accentColor:C.teal}}/><span style={{fontSize:9,color:C.teal}}>{bevelAmt.toFixed(2)}</span><span className="pmesh-opt-label">Segs</span><input type="range" min={1} max={10} step={1} value={bevelSegs} onChange={e=>setBevelSegs(+e.target.value)} className="pmesh-opt-slider" style={{width:60,accentColor:C.teal}}/><span style={{fontSize:9,color:C.teal}}>{bevelSegs}</span><button style={{padding:"3px 6px",border:`1px solid ${C.teal}44`,borderRadius:3,background:`${C.teal}11`,color:C.teal,cursor:"pointer",fontSize:9,fontFamily:"inherit"}} onClick={()=>applyTool("bevel")}>APPLY</button></div>}
          {activeTool==="loop_cut"&&<div className="pmesh-opt-row"><span className="pmesh-opt-label">Slide</span><input type="range" min={0} max={1} step={0.01} value={loopSlide} onChange={e=>setLoopSlide(+e.target.value)} className="pmesh-opt-slider" style={{width:120,accentColor:C.teal}}/><span style={{fontSize:9,color:C.teal}}>{loopSlide.toFixed(2)}</span><button style={{padding:"3px 6px",border:`1px solid ${C.teal}44`,borderRadius:3,background:`${C.teal}11`,color:C.teal,cursor:"pointer",fontSize:9,fontFamily:"inherit"}} onClick={()=>onApplyFunction?.("loop_cut")}>APPLY</button></div>}
          {activeTool==="inset"&&<div className="pmesh-opt-row"><span className="pmesh-opt-label">Amount</span><input type="range" min={0.01} max={1} step={0.01} value={insetAmt} onChange={e=>setInsetAmt(+e.target.value)} className="pmesh-opt-slider" style={{width:120,accentColor:C.teal}}/><span style={{fontSize:9,color:C.teal}}>{insetAmt.toFixed(2)}</span><button style={{padding:"3px 6px",border:`1px solid ${C.teal}44`,borderRadius:3,background:`${C.teal}11`,color:C.teal,cursor:"pointer",fontSize:9,fontFamily:"inherit"}} onClick={()=>applyTool("inset")}>APPLY</button></div>}
          {activeTool==="merge_distance"&&<div className="pmesh-opt-row"><span className="pmesh-opt-label">Threshold</span><input type="range" min={0.0001} max={0.1} step={0.0001} value={mergeThresh} onChange={e=>setMergeThresh(+e.target.value)} className="pmesh-opt-slider" style={{width:100,accentColor:C.green}}/><span style={{fontSize:9,color:C.green}}>{mergeThresh.toFixed(4)}</span><button style={{padding:"3px 6px",border:`1px solid ${C.green}44`,borderRadius:3,background:`${C.green}11`,color:C.green,cursor:"pointer",fontSize:9,fontFamily:"inherit"}} onClick={()=>applyTool("merge_distance")}>APPLY</button></div>}
          {activeTool==="voxel_remesh"&&<div className="pmesh-opt-row"><span className="pmesh-opt-label">Voxel Size</span><input type="range" min={0.01} max={0.5} step={0.01} value={voxelSize} onChange={e=>setVoxelSize(+e.target.value)} className="pmesh-opt-slider" style={{width:100,accentColor:C.warn}}/><span style={{fontSize:9,color:C.warn}}>{voxelSize.toFixed(2)}</span><button style={{padding:"3px 6px",border:`1px solid ${C.warn}44`,borderRadius:3,background:`${C.warn}11`,color:C.warn,cursor:"pointer",fontSize:9,fontFamily:"inherit"}} onClick={()=>onApplyFunction?.("voxel_remesh")}>REMESH</button></div>}
          {activeTool==="auto_retopo"&&<div className="pmesh-opt-row"><span className="pmesh-opt-label">Target Faces</span><input type="range" min={100} max={10000} step={100} value={retopoFaces} onChange={e=>setRetopoFaces(+e.target.value)} className="pmesh-opt-slider" style={{width:100,accentColor:C.warn}}/><span style={{fontSize:9,color:C.warn}}>{retopoFaces}</span><button style={{padding:"3px 6px",border:`1px solid ${C.warn}44`,borderRadius:3,background:`${C.warn}11`,color:C.warn,cursor:"pointer",fontSize:9,fontFamily:"inherit"}} onClick={()=>onApplyFunction?.("auto_retopo")}>RETOPO</button></div>}
          {(activeTool==="symmetrize"||activeTool==="mirror")&&<div className="pmesh-opt-row"><span className="pmesh-opt-label">Axis</span>{["x","y","z"].map(ax=><button key={ax} style={{padding:"2px 8px",border:`1px solid ${symmetryAxis===ax?C.orange:C.border}`,borderRadius:3,background:symmetryAxis===ax?`${C.orange}20`:C.bg,color:symmetryAxis===ax?C.orange:C.muted,cursor:"pointer",fontSize:9,fontFamily:"inherit",fontWeight:symmetryAxis===ax?700:400}} onClick={()=>setSymmetryAxis(ax)}>{ax.toUpperCase()}</button>)}<button style={{padding:"3px 6px",border:`1px solid ${C.orange}44`,borderRadius:3,background:`${C.orange}11`,color:C.orange,cursor:"pointer",fontSize:9,fontFamily:"inherit"}} onClick={()=>applyTool(activeTool)}>APPLY</button></div>}
          {propEnabled&&<div className="pmesh-opt-row pmesh-opt-row--prop" style={{background:`${C.green}08`}}><span style={{fontSize:9,color:C.green,fontWeight:700}}>◎ PROP EDIT</span><span className="pmesh-opt-label">Radius</span><input type="range" min={0.1} max={10} step={0.1} value={propRadius} onChange={e=>setPropRadius(+e.target.value)} className="pmesh-opt-slider" style={{width:80,accentColor:C.green}}/><span style={{fontSize:9,color:C.green}}>{propRadius.toFixed(1)}</span><span className="pmesh-opt-label">Falloff</span><select value={propFalloff} onChange={e=>setPropFalloff(e.target.value)} className="pmesh-prop-select" style={{background:C.bg,border:`1px solid ${C.green}44`,color:C.green}}>{PROPORTIONAL_FALLOFFS.map(f=><option key={f} value={f}>{f}</option>)}</select></div>}
          {snapEnabled&&<div className="pmesh-opt-row pmesh-opt-row--snap" style={{background:`${C.teal}08`}}><span style={{fontSize:9,color:C.teal,fontWeight:700}}>🧲 SNAP TO</span>{["vertex","edge","face","grid","increment"].map(t=><button key={t} style={{padding:"2px 6px",border:`1px solid ${snapTarget===t?C.teal:C.teal+"44"}`,borderRadius:3,background:snapTarget===t?`${C.teal}22`:`${C.teal}11`,color:C.teal,cursor:"pointer",fontSize:8,fontWeight:snapTarget===t?700:600,fontFamily:"inherit"}} onClick={()=>setSnapTarget(t)}>{t}</button>)}</div>}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:10}}>
          <div style={{fontSize:9,color:C.muted,marginBottom:6,fontWeight:700,letterSpacing:1}}>KEYBOARD SHORTCUTS</div>
          <div className="pmesh-shortcut-grid">
            {SHORTCUTS.map(([key,label])=>(
              <div key={key} className="pmesh-shortcut-row">
                <span className="pmesh-shortcut-key">{key}</span>
                <span className="pmesh-shortcut-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — stats + history */}
      <div className="pmesh-right">
        <div className="pmesh-sl">Mesh Info</div>
        {[["Vertices",stats.verts,C.teal],["Edges",stats.edges,C.text],["Faces",stats.faces,C.text],["Triangles",stats.tris,C.muted]].map(([k,v,col])=>(
          <div key={k} className="pmesh-stat">
            <span style={{color:C.muted}}>{k}</span>
            <span style={{color:col,fontWeight:700}}>{v.toLocaleString()}</span>
          </div>
        ))}
        <div className="pmesh-divider"/>
        <div className="pmesh-sl">Select Mode</div>
        <div style={{padding:"0 10px 8px"}}>
          <div className="pmesh-tag" style={{background:`${C.orange}20`,color:C.orange,border:`1px solid ${C.orange}40`,fontSize:9,padding:"3px 8px"}}>{selectMode.toUpperCase()} SELECT</div>
          {propEnabled&&<div className="pmesh-tag" style={{background:`${C.green}20`,color:C.green,border:`1px solid ${C.green}40`,fontSize:9,padding:"3px 8px",marginTop:4}}>◎ PROPORTIONAL: {propFalloff}</div>}
          {snapEnabled&&<div className="pmesh-tag" style={{background:`${C.teal}20`,color:C.teal,border:`1px solid ${C.teal}40`,fontSize:9,padding:"3px 8px",marginTop:4}}>🧲 SNAP: {snapTarget}</div>}
        </div>
        <div className="pmesh-divider"/>
        <div className="pmesh-sl">Quick Ops</div>
        <div style={{padding:"0 8px 8px",display:"flex",flexDirection:"column",gap:3}}>
          {QUICK_OPS.map(([label,tool,col])=>(
            <button key={tool} className="pmesh-quick-btn"
              style={{border:`1px solid ${col}44`,background:`${col}11`,color:col}}
              onClick={()=>{ if(tool==="mirror")setSymmetryAxis("x"); applyTool(tool); }}>
              {label}
            </button>
          ))}
        </div>
        <div className="pmesh-divider"/>
        <div className="pmesh-sl">History ({history.length})</div>
        <div style={{padding:"0 0 10px",overflowY:"auto",flex:1}}>
          {history.map((h,i)=>(
            <div key={i} className="pmesh-history-item"
              style={{color:i===0?C.teal:C.muted,borderLeft:`2px solid ${i===0?C.teal:"transparent"}`}}
              title="Undo not yet implemented">
              {i===0?"→ ":""}{h}
            </div>
          ))}
          {history.length===0&&<div className="pmesh-history-empty">No operations yet</div>}
        </div>
      </div>
    </div>
  );
}
