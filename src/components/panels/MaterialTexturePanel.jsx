import React, { useState, useRef } from "react";
import * as THREE from "three";

const S = {
  root: { background:"#06060f", color:"#e0e0e0", fontFamily:"JetBrains Mono,monospace", padding:16, height:"100%", overflowY:"auto" },
  h2: { color:"#00ffc8", fontSize:14, marginBottom:12, letterSpacing:1 },
  label: { fontSize:11, color:"#aaa", display:"block", marginBottom:4 },
  input: { width:"100%", background:"#0d0d1a", border:"1px solid #1a1a2e", color:"#e0e0e0", padding:"4px 8px", borderRadius:4, fontFamily:"JetBrains Mono,monospace", fontSize:11, marginBottom:10, boxSizing:"border-box" },
  select: { width:"100%", background:"#0d0d1a", border:"1px solid #1a1a2e", color:"#e0e0e0", padding:"4px 8px", borderRadius:4, fontFamily:"JetBrains Mono,monospace", fontSize:11, marginBottom:10, boxSizing:"border-box" },
  btn: { background:"#00ffc8", color:"#06060f", border:"none", borderRadius:4, padding:"7px 16px", fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:700, cursor:"pointer", marginRight:8, marginBottom:8 },
  btnO: { background:"#FF6600", color:"#fff", border:"none", borderRadius:4, padding:"7px 16px", fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:700, cursor:"pointer", marginRight:8, marginBottom:8 },
  section: { background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:6, padding:12, marginBottom:12 },
  stat: { fontSize:11, color:"#00ffc8", marginBottom:4 },
  prev: { width:80, height:80, borderRadius:6, border:"2px solid #00ffc8", display:"inline-block", verticalAlign:"middle", marginRight:10 },
};

const MAT_PRESETS = {
  "PBR Metal": { color:"#667788", roughness:0.1, metalness:1.0, envMapIntensity:1.0 },
  "Rough Stone": { color:"#667766", roughness:0.95, metalness:0.0 },
  "Glossy Plastic": { color:"#ff4444", roughness:0.2, metalness:0.0 },
  "Gold": { color:"#ffd700", roughness:0.15, metalness:1.0 },
  "Skin": { color:"#e8a87c", roughness:0.7, metalness:0.0 },
  "Glass": { color:"#88ccff", roughness:0.0, metalness:0.0, transparent:true, opacity:0.25 },
  "Carbon Fiber": { color:"#111122", roughness:0.3, metalness:0.8 },
  "Velvet": { color:"#6633aa", roughness:1.0, metalness:0.0 },
  "Neon Teal": { color:"#00ffc8", roughness:0.4, metalness:0.5, emissive:"#00ffc8", emissiveIntensity:0.4 },
  "Lava": { color:"#ff4400", roughness:0.8, metalness:0.0, emissive:"#ff2200", emissiveIntensity:0.6 },
  "Ice": { color:"#aaddff", roughness:0.05, metalness:0.0, transparent:true, opacity:0.8 },
  "Wood Oak": { color:"#8b6340", roughness:0.85, metalness:0.0 },
};

const TEXTURE_PATTERNS = ["Checker","Bricks","Perlin Noise","Grid","Voronoi","Gradient","Marble","Hexagons","Wood Grain","Circuit Board"];

function generateTextureCanvas(pattern, col1, col2, size=256){
  const canvas=document.createElement("canvas"); canvas.width=canvas.height=size;
  const ctx=canvas.getContext("2d");
  const c1=col1||"#00ffc8", c2=col2||"#06060f";
  ctx.fillStyle=c2; ctx.fillRect(0,0,size,size);
  switch(pattern){
    case "Checker": {
      const s=size/8;
      for(let y=0;y<8;y++) for(let x=0;x<8;x++){
        if((x+y)%2===0){ ctx.fillStyle=c1; ctx.fillRect(x*s,y*s,s,s); }
      }
      break;
    }
    case "Bricks": {
      ctx.fillStyle=c1;
      const bw=size/6, bh=size/10;
      for(let row=0;row<10;row++){
        const offset=(row%2)*bw/2;
        for(let col=-1;col<7;col++){
          ctx.fillRect(offset+col*bw+1, row*bh+1, bw-2, bh-2);
        }
      }
      break;
    }
    case "Grid": {
      ctx.strokeStyle=c1; ctx.lineWidth=1;
      const step=size/16;
      for(let i=0;i<=size;i+=step){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,size); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(size,i); ctx.stroke(); }
      break;
    }
    case "Perlin Noise": {
      const id=ctx.createImageData(size,size);
      for(let i=0;i<size*size;i++){
        const x=i%size, y=Math.floor(i/size);
        const v=(Math.sin(x*0.05)*Math.cos(y*0.05)*0.5+Math.sin(x*0.1+y*0.08)*0.3+Math.sin(x*0.02+1)*Math.cos(y*0.03+0.5)*0.2+1)*0.5;
        const r=parseInt(c1.slice(1,3),16)*v+parseInt(c2.slice(1,3),16)*(1-v);
        const g=parseInt(c1.slice(3,5),16)*v+parseInt(c2.slice(3,5),16)*(1-v);
        const b=parseInt(c1.slice(5,7),16)*v+parseInt(c2.slice(5,7),16)*(1-v);
        id.data[i*4]=r; id.data[i*4+1]=g; id.data[i*4+2]=b; id.data[i*4+3]=255;
      }
      ctx.putImageData(id,0,0);
      break;
    }
    case "Gradient": {
      const grad=ctx.createLinearGradient(0,0,size,size);
      grad.addColorStop(0,c1); grad.addColorStop(1,c2);
      ctx.fillStyle=grad; ctx.fillRect(0,0,size,size);
      break;
    }
    case "Marble": {
      const id=ctx.createImageData(size,size);
      for(let i=0;i<size*size;i++){
        const x=i%size,y=Math.floor(i/size);
        const v=Math.sin((x+y*Math.sin(y*0.02))*0.05+Math.sin(x*0.03)*3)*0.5+0.5;
        id.data[i*4]=200+v*55; id.data[i*4+1]=200+v*55; id.data[i*4+2]=210+v*45; id.data[i*4+3]=255;
      }
      ctx.putImageData(id,0,0);
      break;
    }
    case "Hexagons": {
      const hw=size/8, hh=hw*Math.sqrt(3)/2;
      ctx.strokeStyle=c1; ctx.lineWidth=2;
      for(let row=0;row<12;row++) for(let col=0;col<12;col++){
        const cx=(col+(row%2)*0.5)*hw*2; const cy=row*hh*2;
        ctx.beginPath();
        for(let i=0;i<6;i++){ const a=i*Math.PI/3; ctx.lineTo(cx+hw*Math.cos(a),cy+hw*Math.sin(a)); }
        ctx.closePath(); ctx.stroke();
      }
      break;
    }
    case "Circuit Board": {
      ctx.strokeStyle=c1; ctx.lineWidth=2;
      const step=size/12;
      for(let i=0;i<12;i++){
        ctx.beginPath(); ctx.moveTo(i*step,0); ctx.lineTo(i*step,size); ctx.stroke();
        if(Math.random()>0.4){ ctx.beginPath(); ctx.moveTo(i*step,Math.random()*size); ctx.lineTo((i+Math.round(Math.random()*4))*step,Math.random()*size); ctx.stroke(); }
      }
      for(let j=0;j<20;j++){
        const x=Math.random()*size,y=Math.random()*size,r=2+Math.random()*4;
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=c1; ctx.fill();
      }
      break;
    }
    default: { ctx.fillStyle=c1; ctx.fillRect(0,0,size,size); }
  }
  return canvas;
}

export default function MaterialTexturePanel({ scene }){
  const [selectedPreset, setSelectedPreset] = useState("PBR Metal");
  const [color, setColor] = useState("#667788");
  const [roughness, setRoughness] = useState(0.1);
  const [metalness, setMetalness] = useState(1.0);
  const [emissive, setEmissive] = useState("#000000");
  const [emissiveInt, setEmissiveInt] = useState(0);
  const [transparent, setTransparent] = useState(false);
  const [opacity, setOpacity] = useState(1.0);
  const [wireframe, setWireframe] = useState(false);
  const [flatShade, setFlatShade] = useState(false);
  const [pattern, setPattern] = useState("Checker");
  const [texCol1, setTexCol1] = useState("#00ffc8");
  const [texCol2, setTexCol2] = useState("#06060f");
  const [texPreview, setTexPreview] = useState(null);
  const [status, setStatus] = useState("");
  const previewRef = useRef(null);
  const previewScene = useRef(null);
  const previewMesh = useRef(null);

  function loadPreset(p){
    setSelectedPreset(p);
    const cfg=MAT_PRESETS[p];
    if(!cfg) return;
    setColor(cfg.color||"#888888");
    setRoughness(cfg.roughness??0.5);
    setMetalness(cfg.metalness??0);
    setEmissive(cfg.emissive||"#000000");
    setEmissiveInt(cfg.emissiveIntensity||0);
    setTransparent(cfg.transparent||false);
    setOpacity(cfg.opacity??1);
  }

  function buildMaterial(tex=null){
    const mat=new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness, metalness,
      emissive: new THREE.Color(emissive),
      emissiveIntensity: emissiveInt,
      transparent, opacity, wireframe,
      flatShading: flatShade,
    });
    if(tex) mat.map=tex;
    return mat;
  }

  function applyToSelected(){
    if(!scene){ setStatus("No scene"); return; }
    let count=0;
    scene.traverse(obj=>{
      if(obj.isMesh && obj.userData.selected){
        obj.material=buildMaterial();
        obj.material.needsUpdate=true;
        count++;
      }
    });
    if(count===0){
      // Apply to all meshes if nothing selected
      scene.traverse(obj=>{ if(obj.isMesh){ obj.material=buildMaterial(); obj.material.needsUpdate=true; count++; } });
    }
    setStatus(`✓ Material applied to ${count} mesh(es)`);
  }

  function generateTexture(){
    const canvas=generateTextureCanvas(pattern,texCol1,texCol2);
    const url=canvas.toDataURL();
    setTexPreview(url);
    setStatus(`✓ ${pattern} texture generated`);
    return canvas;
  }

  function applyTexture(){
    const canvas=generateTextureCanvas(pattern,texCol1,texCol2);
    const tex=new THREE.CanvasTexture(canvas);
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(2,2);
    if(!scene){ setStatus("No scene"); return; }
    let count=0;
    scene.traverse(obj=>{
      if(obj.isMesh){ obj.material=buildMaterial(tex); obj.material.needsUpdate=true; count++; }
    });
    setStatus(`✓ ${pattern} texture applied to ${count} mesh(es)`);
  }

  function downloadTexture(){
    const canvas=generateTextureCanvas(pattern,texCol1,texCol2,512);
    const a=document.createElement("a"); a.href=canvas.toDataURL("image/png"); a.download=`spx_${pattern.replace(/ /g,"_").toLowerCase()}.png`; a.click();
  }

  return (
    <div style={S.root}>
      <div style={S.h2}>🎨 MATERIAL & TEXTURE STUDIO</div>
      <div style={S.section}>
        <label style={S.label}>Material Preset</label>
        <select style={S.select} value={selectedPreset} onChange={e=>loadPreset(e.target.value)}>
          {Object.keys(MAT_PRESETS).map(p=><option key={p}>{p}</option>)}
        </select>
        <label style={S.label}>Base Color</label>
        <input style={{...S.input,padding:2,height:32}} type="color" value={color} onChange={e=>setColor(e.target.value)}/>
        <label style={S.label}>Roughness: {roughness.toFixed(2)}</label>
        <input style={S.input} type="range" min={0} max={1} step={0.01} value={roughness} onChange={e=>setRoughness(+e.target.value)}/>
        <label style={S.label}>Metalness: {metalness.toFixed(2)}</label>
        <input style={S.input} type="range" min={0} max={1} step={0.01} value={metalness} onChange={e=>setMetalness(+e.target.value)}/>
        <label style={S.label}>Emissive Color</label>
        <input style={{...S.input,padding:2,height:32}} type="color" value={emissive} onChange={e=>setEmissive(e.target.value)}/>
        <label style={S.label}>Emissive Intensity: {emissiveInt.toFixed(2)}</label>
        <input style={S.input} type="range" min={0} max={3} step={0.01} value={emissiveInt} onChange={e=>setEmissiveInt(+e.target.value)}/>
        <div style={{display:"flex",gap:16,marginBottom:8}}>
          <label style={{...S.label,cursor:"pointer"}}><input type="checkbox" checked={transparent} onChange={e=>setTransparent(e.target.checked)}/> Transparent</label>
          <label style={{...S.label,cursor:"pointer"}}><input type="checkbox" checked={wireframe} onChange={e=>setWireframe(e.target.checked)}/> Wireframe</label>
          <label style={{...S.label,cursor:"pointer"}}><input type="checkbox" checked={flatShade} onChange={e=>setFlatShade(e.target.checked)}/> Flat Shade</label>
        </div>
        {transparent && <>
          <label style={S.label}>Opacity: {opacity.toFixed(2)}</label>
          <input style={S.input} type="range" min={0} max={1} step={0.01} value={opacity} onChange={e=>setOpacity(+e.target.value)}/>
        </>}
        <button style={S.btn} onClick={applyToSelected}>✓ Apply Material</button>
      </div>
      <div style={S.section}>
        <label style={S.label}>Procedural Texture</label>
        <select style={S.select} value={pattern} onChange={e=>setPattern(e.target.value)}>
          {TEXTURE_PATTERNS.map(p=><option key={p}>{p}</option>)}
        </select>
        <div style={{display:"flex",gap:12,marginBottom:8}}>
          <div>
            <label style={{...S.label,fontSize:10}}>Color A</label>
            <input type="color" value={texCol1} onChange={e=>setTexCol1(e.target.value)} style={{width:48,height:28,border:"none",background:"none"}}/>
          </div>
          <div>
            <label style={{...S.label,fontSize:10}}>Color B</label>
            <input type="color" value={texCol2} onChange={e=>setTexCol2(e.target.value)} style={{width:48,height:28,border:"none",background:"none"}}/>
          </div>
        </div>
        {texPreview && <img src={texPreview} style={{width:80,height:80,borderRadius:4,border:"2px solid #00ffc8",marginBottom:8,display:"block"}} alt="preview"/>}
        <button style={S.btn} onClick={generateTexture}>👁 Preview</button>
        <button style={S.btn} onClick={applyTexture}>✓ Apply Texture</button>
        <button style={S.btnO} onClick={downloadTexture}>💾 Download PNG</button>
      </div>
      {status && <div style={{...S.stat,marginTop:4}}>{status}</div>}
    </div>
  );
}