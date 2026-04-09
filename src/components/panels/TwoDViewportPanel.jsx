
import React, { useEffect, useRef, useState } from "react";
import STYLE_PRESETS, { STYLE_NAMES, applyStyleTransform, blendStyles, COMBINABLE_PAIRS } from "../pipeline/SPX2DStylePresets";

const T={bg:"#06060f",panel:"#0d0d1a",border:"#1a1a2e",teal:"#00ffc8",orange:"#FF6600",text:"#e0e0e0",muted:"#aaa",font:"JetBrains Mono,monospace"};
const S={
  root:{background:T.bg,color:T.text,fontFamily:T.font,padding:16,height:"100%",overflowY:"auto"},
  h2:{color:T.teal,fontSize:14,marginBottom:12,letterSpacing:1},
  lbl:{fontSize:11,color:T.muted,display:"block",marginBottom:4},
  sel:{width:"100%",background:T.panel,border:"1px solid "+T.border,color:T.text,padding:"4px 8px",borderRadius:4,fontFamily:T.font,fontSize:11,marginBottom:8,boxSizing:"border-box"},
  btn:{background:T.teal,color:T.bg,border:"none",borderRadius:4,padding:"7px 16px",fontFamily:T.font,fontSize:12,fontWeight:700,cursor:"pointer",marginRight:8,marginBottom:8},
  btnO:{background:T.orange,color:"#fff",border:"none",borderRadius:4,padding:"7px 16px",fontFamily:T.font,fontSize:12,fontWeight:700,cursor:"pointer",marginRight:8,marginBottom:8},
  btnSm:{background:T.panel,color:T.teal,border:"1px solid "+T.teal,borderRadius:4,padding:"3px 10px",fontFamily:T.font,fontSize:10,cursor:"pointer",marginRight:4,marginBottom:4},
  sec:{background:T.panel,border:"1px solid "+T.border,borderRadius:6,padding:12,marginBottom:12},
  stat:{fontSize:11,color:T.teal,marginBottom:4},
  canvas:{width:"100%",borderRadius:6,border:"2px solid "+T.border,background:"#000",display:"block"},
  inp:{width:"100%",background:T.panel,border:"1px solid "+T.border,color:T.text,padding:"4px 8px",borderRadius:4,fontFamily:T.font,fontSize:11,marginBottom:8,boxSizing:"border-box"},
};

// Demo skeleton keyframes (stand pose)
const DEMO_KF = {
  head:      {x:320,y:80},  neck:{x:320,y:110},
  chest:     {x:320,y:155}, spine:{x:320,y:185}, hips:{x:320,y:220},
  l_shoulder:{x:290,y:130}, l_upper_arm:{x:265,y:155}, l_forearm:{x:248,y:185}, l_hand:{x:240,y:210},
  r_shoulder:{x:350,y:130}, r_upper_arm:{x:375,y:155}, r_forearm:{x:392,y:185}, r_hand:{x:400,y:210},
  l_thigh:   {x:305,y:255}, l_shin:{x:300,y:295}, l_foot:{x:295,y:325},
  r_thigh:   {x:335,y:255}, r_shin:{x:340,y:295}, r_foot:{x:345,y:325},
};

const SKELETON_CONNECTIONS = [
  ["head","neck"],["neck","chest"],["chest","spine"],["spine","hips"],
  ["chest","l_shoulder"],["l_shoulder","l_upper_arm"],["l_upper_arm","l_forearm"],["l_forearm","l_hand"],
  ["chest","r_shoulder"],["r_shoulder","r_upper_arm"],["r_upper_arm","r_forearm"],["r_forearm","r_hand"],
  ["hips","l_thigh"],["l_thigh","l_shin"],["l_shin","l_foot"],
  ["hips","r_thigh"],["r_thigh","r_shin"],["r_shin","r_foot"],
];

function getStyleColor(styleName) {
  const colors = {
    "Marvel What If":"#FF6600","Spider-Verse":"#ff00ff","Manga B&W":"#ffffff",
    "Manga Color":"#ff4444","90s Saturday Morning":"#ffaa00","90s Anime":"#00aaff",
    "Synthwave Retro":"#00ffc8","Noir Cinematic":"#888888","Shadow Puppet":"#111111",
    "Arcane Painterly":"#aa6644"
    "Fleischer Rubber Hose":"#f5e6c0", "UPA Flat 50s":"#ff9966",
    "Soviet Soyuzmultfilm":"#8899aa", "Moebius / Heavy Metal":"#cc9944",
    "CalArts / Adventure Time":"#ff66aa", "Ralph Bakshi Adult":"#885522",
    "Rankin Bass Stop Motion":"#ffcc66", "Adult Swim Surreal":"#00ff88",
    "Wayang Kulit Shadow":"#ff8800", "South Park Cutout":"#ff4400",,"Studio Ghibli":"#88cc88",
  };
  return colors[styleName] || "#00ffc8";
}

function drawStickFigure(ctx, kf, style, w, h, time) {
  const sp = STYLE_PRESETS[style] || {};
  ctx.clearRect(0,0,w,h);

  // Background effects
  if (sp.feltTexture || sp.snapMovement) {
    ctx.fillStyle = "#ffe8cc"; ctx.fillRect(0,0,w,h);
    // Felt texture dots
    ctx.globalAlpha=0.08;
    for(let i=0;i<200;i++){ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,Math.random()*3,0,Math.PI*2);ctx.fillStyle="#aa6633";ctx.fill();}
    ctx.globalAlpha=1;
  } else if (sp.vhsDistort) {
    ctx.fillStyle="#050510";ctx.fillRect(0,0,w,h);
    // VHS scanlines
    ctx.globalAlpha=0.15;
    for(let y=0;y<h;y+=3){ctx.fillStyle=y%6===0?"#ffffff":"#000000";ctx.fillRect(0,y,w,1);}
    // Color fringe
    ctx.globalAlpha=0.05;ctx.fillStyle="#ff0000";ctx.fillRect(-2,0,w,h);
    ctx.fillStyle="#0000ff";ctx.fillRect(2,0,w,h);
    ctx.globalAlpha=1;
  } else if (sp.rubberLimbs) {
    ctx.fillStyle="#f5e6b0";ctx.fillRect(0,0,w,h);
    // Film grain
    ctx.globalAlpha=0.06;
    for(let i=0;i<300;i++){ctx.fillStyle="#000";ctx.fillRect(Math.random()*w,Math.random()*h,1,1);}
    ctx.globalAlpha=1;
  } else if (sp.crosshatch) {
    ctx.fillStyle="#f8f4e8";ctx.fillRect(0,0,w,h);
  } else if (sp.wobbleLines) {
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,w,h);
  } else if (sp.silhouette && sp.profileOnly) {
    // Amber backlit for Wayang
    const bg=ctx.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,"#2a1500");bg.addColorStop(0.5,"#ff8800");bg.addColorStop(1,"#2a1500");
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  }
  if (sp.neonGlow) {
    ctx.fillStyle = "#050510"; ctx.fillRect(0,0,w,h);
    // grid lines
    ctx.strokeStyle = "#220044"; ctx.lineWidth = 0.5;
    for(let i=0;i<w;i+=20){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,h);ctx.stroke();}
    for(let j=0;j<h;j+=20){ctx.beginPath();ctx.moveTo(0,j);ctx.lineTo(w,j);ctx.stroke();}
  } else if (sp.grayscale && sp.highContrast) {
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,h);
  } else if (sp.halftone) {
    ctx.fillStyle = "#fffef0"; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "#e0d8c0";
    for(let i=0;i<w;i+=8) for(let j=0;j<h;j+=8) {
      ctx.beginPath(); ctx.arc(i,j,1.5,0,Math.PI*2); ctx.fill();
    }
  } else if (sp.filmGrain) {
    ctx.fillStyle = "#0a0820"; ctx.fillRect(0,0,w,h);
  } else {
    ctx.fillStyle = "#06060f"; ctx.fillRect(0,0,w,h);
  }

  // Speed lines (manga)
  if (sp.speedLines) {
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth=1;
    for(let i=0;i<20;i++){
      ctx.beginPath(); ctx.moveTo(w/2,h/2);
      const a=i/20*Math.PI*2; ctx.lineTo(w/2+Math.cos(a)*w, h/2+Math.sin(a)*h); ctx.stroke();
    }
  }

  // Transform keyframes by style
  const transformed = applyStyleTransform(kf, style, time);

  
  // Rubber hose — draw wavy curves instead of straight lines for Fleischer
  if (sp.rubberLimbs) {
    SKELETON_CONNECTIONS.forEach(([a,b]) => {
      const pa = transformed[a], pb = transformed[b];
      if (!pa || !pb) return;
      const mx=(pa.x+pb.x)/2+(Math.sin(t.current*3+pa.x))*8;
      const my=(pa.y+pb.y)/2+(Math.cos(t.current*3+pa.y))*8;
      ctx.beginPath();ctx.moveTo(pa.x,pa.y);
      ctx.quadraticCurveTo(mx,my,pb.x,pb.y);
      ctx.strokeStyle=jColor;ctx.lineWidth=4;ctx.stroke();
    });
    // Draw joints as circles only
    Object.entries(transformed).forEach(([bone,pos])=>{
      const r=bone==="head"?(sp.headScale||1)*16:5;
      ctx.beginPath();ctx.arc(pos.x,pos.y,r,0,Math.PI*2);
      ctx.fillStyle=jColor;ctx.fill();
    });
    return; // Skip normal drawing
  }
  // South Park — static body, only mouth area moves
  if (sp.staticLimbs) {
    const torso=["chest","spine","hips","l_shoulder","r_shoulder"];
    SKELETON_CONNECTIONS.forEach(([a,b])=>{
      if(!torso.includes(a)&&!torso.includes(b)) return;
      const pa=transformed[a],pb=transformed[b];
      if(!pa||!pb)return;
      ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);
      ctx.strokeStyle=jColor;ctx.lineWidth=3;ctx.stroke();
    });
    if(transformed.head){
      ctx.beginPath();ctx.arc(transformed.head.x,transformed.head.y,(sp.headScale||1)*14,0,Math.PI*2);
      ctx.fillStyle=jColor;ctx.fill();
    }
    return;
  }
  // Wayang — pure silhouette profile
  if (sp.profileOnly) {
    const sortedBones=Object.entries(transformed).sort((a,b)=>a[1].y-b[1].y);
    ctx.fillStyle="#000000";
    sortedBones.forEach(([bone,pos])=>{
      const r=bone==="head"?18:bone.includes("thigh")||bone.includes("chest")?10:6;
      ctx.beginPath();ctx.arc(pos.x*0.3+w*0.5,pos.y,r,0,Math.PI*2);ctx.fill();
    });
    return;
  }
  const lineW  = sp.inkOutline ? 3 : 2;
  const jColor = getStyleColor(style);

  // Draw connections
  SKELETON_CONNECTIONS.forEach(([a,b]) => {
    const pa = transformed[a], pb = transformed[b];
    if (!pa || !pb) return;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
    if (sp.grayscale)    ctx.strokeStyle = sp.highContrast ? "#fff" : "#aaa";
    else if (sp.neonGlow) { ctx.shadowBlur=8; ctx.shadowColor=jColor; ctx.strokeStyle=jColor; }
    else                  ctx.strokeStyle = jColor;
    ctx.lineWidth = lineW;
    if (sp.inkOutline) {
      // Double stroke for ink outline feel
      ctx.lineWidth = lineW+2; ctx.strokeStyle = "#000"; ctx.stroke();
      ctx.lineWidth = lineW;   ctx.strokeStyle = jColor;
    }
    ctx.stroke();
    ctx.shadowBlur=0;
  });

  // Draw joints
  Object.entries(transformed).forEach(([bone, pos]) => {
    const r = bone==="head" ? (sp.headScale||1)*14 : 4;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI*2);
    if (bone==="head") {
      ctx.fillStyle = sp.grayscale?"#888": (sp.neonGlow?"#000":T.bg);
      ctx.fill();
      ctx.strokeStyle = jColor; ctx.lineWidth=lineW; ctx.stroke();
    } else {
      ctx.fillStyle = jColor; ctx.fill();
    }
  });

  // Overlay effects
  if (sp.filmGrain) {
    ctx.globalAlpha=0.05;
    for(let i=0;i<500;i++){
      ctx.fillStyle="#fff";
      ctx.fillRect(Math.random()*w, Math.random()*h, 1, 1);
    }
    ctx.globalAlpha=1;
  }
  if (sp.lensFlare) {
    ctx.globalAlpha=0.15;
    const lg=ctx.createRadialGradient(w*0.8,h*0.2,0,w*0.8,h*0.2,80);
    lg.addColorStop(0,"#ffffff"); lg.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=lg; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=1;
  }

  // Style label
  ctx.fillStyle="rgba(0,255,200,0.7)"; ctx.font="10px JetBrains Mono,monospace";
  ctx.fillText(style, 8, h-8);
}

export default function TwoDViewportPanel({ liveKeyframes }) {
  const canvasA = useRef(null);
  const canvasB = useRef(null);
  const [styleA, setStyleA]   = useState("Marvel What If");
  const [styleB, setStyleB]   = useState("Manga B&W");
  const [blending, setBlending] = useState(false);
  const [blendAmt, setBlendAmt] = useState(0.5);
  const [playing, setPlaying] = useState(true);
  const [fps, setFps]         = useState(24);
  const [splitMode, setSplitMode] = useState("Side by Side");
  const [status, setStatus]   = useState("");
  const raf = useRef(null);
  const t   = useRef(0);
  const lastT = useRef(0);

  const KF = liveKeyframes || DEMO_KF;

  const splitModes = ["Side by Side","Style A Only","Style B Only","Blend Preview","Quad View"];

  useEffect(() => {
    const tick = (now) => {
      const dt = Math.min((now - lastT.current)/1000, 0.05);
      lastT.current = now;
      if (playing) t.current += dt;

      const w=320, h=360;
      const kf = { ...KF };
      Object.keys(kf).forEach(b => {
        if (!kf[b].rotation) kf[b] = { ...kf[b], rotation:0, scale:1 };
      });

      if (canvasA.current) {
        canvasA.current.width = w; canvasA.current.height = h;
        drawStickFigure(canvasA.current.getContext("2d"), kf, styleA, w, h, t.current);
      }
      if (canvasB.current && splitMode !== "Style A Only") {
        canvasB.current.width = w; canvasB.current.height = h;
        if (blending) {
          const kfA = applyStyleTransform(kf, styleA, t.current);
          const kfB2 = applyStyleTransform(kf, styleB, t.current);
          const blended = blendStyles(kfA, kfB2, blendAmt);
          // Draw blended on canvas B using style A rendering
          drawStickFigure(canvasB.current.getContext("2d"), blended, styleA, w, h, t.current);
        } else {
          drawStickFigure(canvasB.current.getContext("2d"), kf, styleB, w, h, t.current);
        }
      }

      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [styleA, styleB, blending, blendAmt, playing, splitMode, liveKeyframes]);

  function exportFrame() {
    if (!canvasA.current) return;
    const a = document.createElement("a");
    a.href = canvasA.current.toDataURL("image/png");
    a.download = `spx_2d_${styleA.replace(/ /g,"_")}.png`;
    a.click();
    setStatus("Frame exported");
  }

  const canPair = COMBINABLE_PAIRS.some(([a,b]) => (a===styleA&&b===styleB)||(a===styleB&&b===styleA));

  return (
    <div style={S.root}>
      <div style={S.h2}>🎬 2D VIEWPORT</div>
      <div style={S.sec}>
        <label style={S.lbl}>Style A</label>
        <select style={S.sel} value={styleA} onChange={e=>setStyleA(e.target.value)}>
          {STYLE_NAMES.map(s=><option key={s}>{s}</option>)}
        </select>
        <label style={S.lbl}>Style B</label>
        <select style={S.sel} value={styleB} onChange={e=>setStyleB(e.target.value)}>
          {STYLE_NAMES.map(s=><option key={s}>{s}</option>)}
        </select>
        {canPair && <div style={{...S.stat,color:T.orange}}>✓ Compatible pair — blending supported</div>}
        <label style={S.lbl}>View Mode</label>
        <select style={S.sel} value={splitMode} onChange={e=>setSplitMode(e.target.value)}>
          {splitModes.map(s=><option key={s}>{s}</option>)}
        </select>
        <label style={S.lbl}><input type="checkbox" checked={blending} onChange={e=>setBlending(e.target.checked)}/> Blend Styles</label>
        {blending && <>
          <label style={S.lbl}>Blend: {(blendAmt*100).toFixed(0)}% B</label>
          <input style={S.inp} type="range" min={0} max={1} step={0.01} value={blendAmt} onChange={e=>setBlendAmt(+e.target.value)}/>
        </>}
        <label style={S.lbl}>FPS: {fps}</label>
        <input style={S.inp} type="range" min={8} max={60} step={1} value={fps} onChange={e=>setFps(+e.target.value)}/>
        <label style={S.lbl}><input type="checkbox" checked={playing} onChange={e=>setPlaying(e.target.checked)}/> Animate</label>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {splitMode !== "Style B Only" && (
          <div>
            <div style={{...S.lbl,color:T.teal}}>{blending?"Blended":styleA}</div>
            <canvas ref={canvasA} style={{...S.canvas,width:splitMode==="Side by Side"?"calc(50% - 4px)":"100%",height:360}}/>
          </div>
        )}
        {splitMode !== "Style A Only" && splitMode !== "Blend Preview" && (
          <div>
            <div style={{...S.lbl,color:T.orange}}>{styleB}</div>
            <canvas ref={canvasB} style={{...S.canvas,width:splitMode==="Side by Side"?"calc(50% - 4px)":"100%",height:360}}/>
          </div>
        )}
      </div>
      <div style={{marginTop:8}}>
        <button style={S.btn} onClick={()=>setPlaying(!playing)}>{playing?"⏸ Pause":"▶ Play"}</button>
        <button style={S.btnO} onClick={exportFrame}>💾 Export Frame</button>
      </div>
      {status && <div style={{...S.stat,marginTop:8}}>{status}</div>}
      <div style={S.sec}>
        <div style={S.lbl}>Combinable Style Pairs</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {COMBINABLE_PAIRS.map(([a,b])=>(
            <button key={a+b} style={S.btnSm} onClick={()=>{setStyleA(a);setStyleB(b);setBlending(true);}}>
              {a} + {b}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
