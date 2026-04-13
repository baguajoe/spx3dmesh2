import React, { useState, useRef } from "react";

export default function FloatPanel({ title, onClose, children, defaultX = 210, defaultY = 80, width = 480 }) {
  const [pos, setPos] = useState({ x: defaultX, y: defaultY });
  const drag = useRef({ active: false, ox: 0, oy: 0 });

  const onMouseDown = (e) => {
    drag.current = { active: true, ox: e.clientX - pos.x, oy: e.clientY - pos.y };
    const onMove = (e) => {
      if (!drag.current.active) return;
      setPos({ x: e.clientX - drag.current.ox, y: e.clientY - drag.current.oy });
    };
    const onUp = () => { drag.current.active = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, width, zIndex: 500, background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.7)", maxHeight: "calc(100vh - 100px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div onMouseDown={onMouseDown} style={{ padding: "7px 12px", background: "#0d1117", borderBottom: "2px solid #00ffc8", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "move", userSelect: "none", fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 700, color: "#00ffc8", letterSpacing: "0.12em", borderRadius: "8px 8px 0 0", flexShrink: 0, textTransform: "uppercase" }}>
        <span>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
