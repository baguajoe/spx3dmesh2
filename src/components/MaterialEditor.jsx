
import { useState, useRef } from "react";
const C = { bg:"#06060f", panel:"#0d1117", border:"#21262d", teal:"#00ffc8", orange:"#FF6600" };

export function MaterialEditor({ material={}, onChange=()=>{}, onClose=()=>{} }) {
  const [tab,      setTab]      = useState("surface");
  const [texUrl,   setTexUrl]   = useState(material.map || null);
  const fileRef = useRef(null);

  const Field = ({label, type="range", min=0, max=1, step=0.01, value, prop, children}) => (
    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
      <span style={{color:"#666",fontSize:10,width:72,flexShrink:0}}>{label}</span>
      {type==="range" ? <>
        <input type="range" min={min} max={max} step={step} value={value??0}
          onChange={e=>onChange({...material,[prop]:Number(e.target.value)})}
          style={{flex:1,accentColor:C.teal}}/>
        <span style={{color:C.teal,fontSize:10,width:32,textAlign:"right"}}>
          {Number(value??0).toFixed(2)}
        </span>
      </> : children}
    </div>
  );

  return (
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
      background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,width:340,
      zIndex:9999,fontFamily:"JetBrains Mono,monospace",fontSize:12,overflow:"hidden"}}>

      {/* Header */}
      <div style={{height:40,background:"#0a0e1a",borderBottom:`1px solid ${C.border}`,
        display:"flex",alignItems:"center",gap:12,padding:"0 14px"}}>
        <span style={{color:C.orange,fontSize:12,fontWeight:700}}>Material Editor</span>
        <div style={{flex:1}}/>
        <button onClick={onClose}
          style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:18}}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
        {["surface","emission","texture","advanced"].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{flex:1,padding:"6px 0",border:"none",cursor:"pointer",fontSize:10,
              fontWeight:700,textTransform:"uppercase",fontFamily:"JetBrains Mono,monospace",
              background:tab===t?"#1a1f2e":C.panel,
              color:tab===t?C.teal:"#555",
              borderBottom:tab===t?`2px solid ${C.teal}`:"2px solid transparent"}}>
            {t}
          </button>
        ))}
      </div>

      <div style={{padding:14}}>
        {/* SURFACE */}
        {tab==="surface" && <>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
            <span style={{color:"#666",fontSize:10,width:72}}>Color</span>
            <input type="color" value={material.color||"#888888"}
              onChange={e=>onChange({...material,color:e.target.value})}
              style={{width:40,height:28,border:"none",borderRadius:4,cursor:"pointer"}}/>
            <span style={{color:"#555",fontSize:10}}>{material.color||"#888888"}</span>
          </div>
          <Field label="Roughness"  prop="roughness"  value={material.roughness??0.5}/>
          <Field label="Metalness"  prop="metalness"  value={material.metalness??0.0}/>
          <Field label="Opacity"    prop="opacity"    value={material.opacity??1.0}/>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
            <span style={{color:"#666",fontSize:10,width:72}}>Wireframe</span>
            <input type="checkbox" checked={material.wireframe||false}
              onChange={e=>onChange({...material,wireframe:e.target.checked})}/>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
            <span style={{color:"#666",fontSize:10,width:72}}>Transparent</span>
            <input type="checkbox" checked={material.transparent||false}
              onChange={e=>onChange({...material,transparent:e.target.checked})}/>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
            <span style={{color:"#666",fontSize:10,width:72}}>Side</span>
            <select value={material.side||"front"}
              onChange={e=>onChange({...material,side:e.target.value})}
              style={{flex:1,background:"#1a1a1a",border:`1px solid ${C.border}`,
                color:"#dde6ef",borderRadius:3,padding:"3px 6px",fontSize:10}}>
              {["front","back","double"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </>}

        {/* EMISSION */}
        {tab==="emission" && <>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
            <span style={{color:"#666",fontSize:10,width:72}}>Emissive</span>
            <input type="color" value={material.emissive||"#000000"}
              onChange={e=>onChange({...material,emissive:e.target.value})}
              style={{width:40,height:28,border:"none",borderRadius:4,cursor:"pointer"}}/>
          </div>
          <Field label="Intensity" prop="emissiveIntensity"
            min={0} max={5} step={0.1} value={material.emissiveIntensity??0}/>
          <div style={{color:"#555",fontSize:9,marginTop:8,lineHeight:1.5}}>
            High emissive intensity makes the object glow regardless of lighting.
            Combine with bloom post-FX for best results.
          </div>
        </>}

        {/* TEXTURE */}
        {tab==="texture" && <>
          <div style={{color:"#666",fontSize:10,marginBottom:8}}>Diffuse Texture Map</div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
            onChange={e=>{
              const file = e.target.files?.[0]; if (!file) return;
              const url = URL.createObjectURL(file);
              setTexUrl(url);
              onChange({...material, mapUrl:url, mapFile:file.name});
            }}/>
          {texUrl ? (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <img src={texUrl} alt="texture"
                style={{width:"100%",borderRadius:4,border:`1px solid ${C.border}`,maxHeight:120,objectFit:"cover"}}/>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>fileRef.current?.click()}
                  style={{flex:1,background:"#1a1f2e",border:`1px solid ${C.border}`,
                    color:"#aaa",borderRadius:3,padding:"5px",cursor:"pointer",fontSize:10}}>
                  Replace
                </button>
                <button onClick={()=>{ setTexUrl(null); onChange({...material,mapUrl:null}); }}
                  style={{flex:1,background:"none",border:`1px solid #ff4444`,
                    color:"#ff4444",borderRadius:3,padding:"5px",cursor:"pointer",fontSize:10}}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button onClick={()=>fileRef.current?.click()}
              style={{width:"100%",background:"#1a1f2e",border:`2px dashed ${C.border}`,
                color:"#555",borderRadius:4,padding:"20px",cursor:"pointer",fontSize:11}}>
              📁 Upload Texture Image
            </button>
          )}
          <Field label="Repeat X" prop="repeatX" min={0.1} max={10} step={0.1}
            value={material.repeatX??1}/>
          <Field label="Repeat Y" prop="repeatY" min={0.1} max={10} step={0.1}
            value={material.repeatY??1}/>
        </>}

        {/* ADVANCED */}
        {tab==="advanced" && <>
          <Field label="Env Map"    prop="envMapIntensity" min={0} max={2} step={0.05}
            value={material.envMapIntensity??1}/>
          <Field label="AO Inten."  prop="aoMapIntensity"  min={0} max={2} step={0.05}
            value={material.aoMapIntensity??1}/>
          <Field label="Bump Scale" prop="bumpScale"       min={0} max={1} step={0.01}
            value={material.bumpScale??1}/>
          <Field label="Displace"   prop="displacementScale" min={0} max={2} step={0.05}
            value={material.displacementScale??1}/>
          <div style={{color:"#555",fontSize:9,marginTop:8,lineHeight:1.5}}>
            Advanced maps require uploaded normal/AO/displacement textures in the Texture tab.
          </div>
        </>}
      </div>

      {/* Footer */}
      <div style={{padding:"8px 14px",borderTop:`1px solid ${C.border}`,
        display:"flex",justifyContent:"flex-end"}}>
        <button onClick={onClose}
          style={{background:C.teal,border:"none",color:C.bg,borderRadius:4,
            padding:"6px 18px",cursor:"pointer",fontWeight:700,fontSize:11}}>
          ✓ Apply
        </button>
      </div>
    </div>
  );
}
