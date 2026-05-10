import React, { useRef, useState, useEffect } from "react";

const CLICK_THRESHOLD_PX = 3;
const CLICK_THRESHOLD_MS = 200;

function clamp(v, min, max) {
  if (typeof min === "number" && v < min) return min;
  if (typeof max === "number" && v > max) return max;
  return v;
}

function multiplierFromEvent(e) {
  if (e.shiftKey) return 10;
  if (e.ctrlKey || e.metaKey) return 0.1;
  return 1;
}

export function DragNumberInput({
  value,
  onChange,
  step = 0.01,
  precision = 2,
  min,
  max,
  disabled = false,
  className = "",
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  // Stable ref so window-bound listeners always read fresh props (avoids
  // stale-closure bugs when value/min/max change during a drag).
  const propsRef = useRef({ value, onChange, step, min, max, precision });
  propsRef.current = { value, onChange, step, min, max, precision };

  const dragStateRef = useRef(null);

  const formatted =
    typeof value === "number" && Number.isFinite(value)
      ? value.toFixed(precision)
      : "0";

  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  // Listeners bound only while dragging; cleanup guarantees no leak if the
  // component unmounts mid-drag (e.g., parent remount on key change).
  useEffect(() => {
    if (!dragging) return;
    function onMove(e) {
      const ds = dragStateRef.current;
      if (!ds) return;
      const dx = e.pageX - ds.startX;
      if (!ds.moved && Math.abs(dx) >= CLICK_THRESHOLD_PX) ds.moved = true;
      const p = propsRef.current;
      const mul = multiplierFromEvent(e);
      const next = clamp(ds.startValue + dx * p.step * mul, p.min, p.max);
      p.onChange(Number(next.toFixed(6)));
    }
    function onUp() {
      const ds = dragStateRef.current;
      const elapsed = ds ? Date.now() - ds.startedAt : 0;
      const wasClick = ds && !ds.moved && elapsed < CLICK_THRESHOLD_MS;
      dragStateRef.current = null;
      setDragging(false);
      if (wasClick) {
        const p = propsRef.current;
        const v =
          typeof p.value === "number" && Number.isFinite(p.value) ? p.value : 0;
        setEditText(v.toFixed(p.precision));
        setEditing(true);
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  function handleValueMouseDown(e) {
    if (disabled || editing) return;
    if (e.button !== 0) return;
    e.preventDefault();
    const v =
      typeof value === "number" && Number.isFinite(value) ? value : 0;
    dragStateRef.current = {
      startX: e.pageX,
      startValue: v,
      startedAt: Date.now(),
      moved: false,
    };
    setDragging(true);
  }

  function commitEdit() {
    const parsed = parseFloat(editText);
    if (!Number.isFinite(parsed)) {
      // Reject NaN — restore display by exiting edit mode without committing.
      setEditing(false);
      return;
    }
    propsRef.current.onChange(clamp(parsed, min, max));
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function stepBy(dir, e) {
    if (disabled) return;
    const mul = multiplierFromEvent(e);
    const v =
      typeof value === "number" && Number.isFinite(value) ? value : 0;
    propsRef.current.onChange(clamp(v + dir * step * mul, min, max));
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className={`drag-number__edit ${className}`}
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitEdit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
          }
        }}
        onBlur={commitEdit}
      />
    );
  }

  const cls =
    "drag-number" +
    (disabled ? " drag-number--disabled" : "") +
    (dragging ? " drag-number--dragging" : "") +
    (className ? " " + className : "");

  return (
    <div className={cls}>
      <span
        className="drag-number__value"
        onMouseDown={handleValueMouseDown}
        title={disabled ? "" : "Drag to scrub · click to type · Shift ×10 · Ctrl ×0.1"}
      >
        {formatted}
      </span>
      <span className="drag-number__steps">
        <button
          type="button"
          tabIndex={-1}
          className="drag-number__step"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            stepBy(1, e);
          }}
        >
          ▲
        </button>
        <button
          type="button"
          tabIndex={-1}
          className="drag-number__step"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            stepBy(-1, e);
          }}
        >
          ▼
        </button>
      </span>
    </div>
  );
}
