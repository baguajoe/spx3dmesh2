import React, { useEffect, useRef, useState } from "react";
import "../styles/spx-docking.css";

export default function DockSplitterHost() {
  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(360);
  const [bottomHeight, setBottomHeight] = useState(220);
  const dragRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      const { type } = dragRef.current;

      if (type === "left") setLeftWidth(Math.max(220, Math.min(520, e.clientX)));
      if (type === "right") setRightWidth(Math.max(260, Math.min(620, window.innerWidth - e.clientX)));
      if (type === "bottom") setBottomHeight(Math.max(120, Math.min(420, window.innerHeight - e.clientY - 40)));
    };

    const onUp = () => {
      dragRef.current = null;
      document.body.classList.remove("spx-dragging");
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    window.__SPX_DOCK_LAYOUT__ = { leftWidth, rightWidth, bottomHeight };
  }, [leftWidth, rightWidth, bottomHeight]);

  const startDrag = (type) => {
    dragRef.current = { type };
    document.body.classList.add("spx-dragging");
  };

  return (
    <>
      <div className="spx-dock-splitter spx-dock-splitter--left" style={{ left: leftWidth }} onMouseDown={() => startDrag("left")} />
      <div className="spx-dock-splitter spx-dock-splitter--right" style={{ right: rightWidth }} onMouseDown={() => startDrag("right")} />
      <div className="spx-dock-splitter spx-dock-splitter--bottom" style={{ bottom: bottomHeight + 44 }} onMouseDown={() => startDrag("bottom")} />
    </>
  );
}
