import { useEffect, useRef, useState } from "react";
import "../../styles/uv-editor.css";

const C = { bg:"#06060f", border:"#21262d", teal:"#00ffc8", orange:"#FF6600" };

export function UVEditor({ uvTriangles=[], width=300, height=300, onClose }) {
  const canvasRef = useRef(null);
  const [zoom,    setZoom]    = useState(1);
  const [hovTri,  setHovTri]  = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx    = canvas.getContext("2d");
    const W=canvas.width, H=canvas.height;

    ctx.fillStyle = C.bg;
    ctx.fillRect(0,0,W,H);

    // Grid
    ctx.strokeStyle = C.border;
    ctx.lineWidth   = 0.5;
    for (let i=0;i<=10;i++) {
      const x=i/10*W, y=i/10*H;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    }

    // UV border
    ctx.strokeStyle = "#333";
    ctx.lineWidth   = 1;
    ctx.strokeRect(0,0,W,H);

    // Draw UV triangles
    uvTriangles.forEach((tri, i) => {
      const isHov = i === hovTri;
      ctx.beginPath();
      ctx.moveTo(tri[0].u*W*zoom, (1-tri[0].v)*H*zoom);
      ctx.lineTo(tri[1].u*W*zoom, (1-tri[1].v)*H*zoom);
      ctx.lineTo(tri[2].u*W*zoom, (1-tri[2].v)*H*zoom);
      ctx.closePath();
      ctx.fillStyle   = isHov ? "rgba(0,255,200,0.15)" : "rgba(255,102,0,0.05)";
      ctx.strokeStyle = isHov ? C.teal : C.orange;
      ctx.lineWidth   = isHov ? 1.5 : 0.5;
      ctx.fill();
      ctx.stroke();
    });

    // UV vert dots
    const seen = new Set();
    uvTriangles.forEach(tri => {
      tri.forEach(pt => {
        const key = `${pt.u.toFixed(3)}_${pt.v.toFixed(3)}`;
        if (seen.has(key)) return;
        seen.add(key);
        ctx.beginPath();
        ctx.arc(pt.u*W*zoom, (1-pt.v)*H*zoom, 2, 0, Math.PI*2);
        ctx.fillStyle = C.teal;
        ctx.fill();
      });
    });
  }, [uvTriangles, zoom, hovTri]);

  const onMouseMove = (e) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mu = (e.clientX-rect.left)/(rect.width*zoom);
    const mv = 1-(e.clientY-rect.top)/(rect.height*zoom);
    let closest=null, minDist=Infinity;
    uvTriangles.forEach((tri,i) => {
      const cu=(tri[0].u+tri[1].u+tri[2].u)/3;
      const cv=(tri[0].v+tri[1].v+tri[2].v)/3;
      const d=Math.hypot(mu-cu,mv-cv);
      if(d<minDist){minDist=d;closest=i;}
    });
    setHovTri(closest);
  };

  return (
    <div className="uv-editor">
      <div className="uv-editor__header">
        <span className="uv-editor__title">UV Editor</span>
        <span className="uv-editor__count">{uvTriangles.length} triangles</span>
        <div className="uv-editor__spacer" />
        <div className="uv-editor__zoom-wrap">
          <span className="uv-editor__zoom-label">Zoom</span>
          <input
            type="range" min={0.5} max={3} step={0.1} value={zoom}
            className="uv-editor__zoom-slider"
            onChange={e => setZoom(Number(e.target.value))}
          />
          <span className="uv-editor__zoom-val">{zoom.toFixed(1)}x</span>
        </div>
        <button className="uv-editor__close" onClick={onClose}>✕</button>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="uv-editor__canvas"
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHovTri(null)}
      />

      <div className="uv-editor__footer">
        <span className="uv-editor__footer-hint">Hover triangle to highlight · UV space 0-1</span>
        {hovTri !== null && (
          <span className="uv-editor__hov-tri">Triangle {hovTri}</span>
        )}
      </div>
    </div>
  );
}
