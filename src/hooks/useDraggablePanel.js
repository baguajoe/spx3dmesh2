import { useEffect, useRef, useState } from "react";

export default function useDraggablePanel(initial = { x: null, y: null }) {
  const [pos, setPos] = useState(initial);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  });

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({
        x: dragRef.current.baseX + dx,
        y: dragRef.current.baseY + dy,
      });
    };

    const onUp = () => {
      dragRef.current.active = false;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const beginDrag = (e) => {
    e.preventDefault();
    dragRef.current.active = true
    dragRef.current.startX = e.clientX
    dragRef.current.startY = e.clientY
    dragRef.current.baseX = pos?.x ?? 0
    dragRef.current.baseY = pos?.y ?? 0
  };

  const style =
    pos?.x == null || pos?.y == null
      ? {}
      : {
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          right: "auto",
        };

  return { pos, setPos, beginDrag, style };
}
