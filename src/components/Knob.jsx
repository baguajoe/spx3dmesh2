// SPX Knob — rotary control, drag up/down to change value
// Props: label, value, min, max, step, onChange, size, color, unit
import React, { useRef, useCallback } from "react";

export default function Knob({
  label = "", value = 0, min = 0, max = 1, step = 0.01,
  onChange = () => {}, size = 48, color = "#00ffc8", unit = "", accentColor
}) {
  const accent = accentColor || color;
  const dragRef = useRef(null);
  const startRef = useRef(null);

  // Map value → rotation angle (-135° to +135°)
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + norm * 270;

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { y: e.clientY, value };
  }, [value]);

  const onPointerMove = useCallback((e) => {
    if (!startRef.current) return;
    const dy = startRef.current.y - e.clientY; // up = increase
    const range = max - min;
    const sensitivity = range / 200;
    const raw = startRef.current.value + dy * sensitivity;
    const snapped = Math.round(raw / step) * step;
    const clamped = Math.max(min, Math.min(max, snapped));
    onChange(parseFloat(clamped.toFixed(10)));
  }, [min, max, step, onChange]);

  const onPointerUp = useCallback((e) => {
    startRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const displayVal = step < 0.1 ? value.toFixed(2) : Math.round(value);
  const r = size / 2 - 4;
  const cx = size / 2, cy = size / 2;

  // Arc paths
  const arcPath = (startDeg, endDeg, radius) => {
    const toRad = d => (d - 90) * Math.PI / 180;
    const x1 = cx + radius * Math.cos(toRad(startDeg));
    const y1 = cy + radius * Math.sin(toRad(startDeg));
    const x2 = cx + radius * Math.cos(toRad(endDeg));
    const y2 = cy + radius * Math.sin(toRad(endDeg));
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const trackStart = -135 + (-90); // offset to SVG coords
  const fillEnd = -135 + norm * 270 + (-90);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", userSelect:"none", width: size + 8 }}>
      <svg
        width={size} height={size}
        style={{ cursor:"ns-resize", overflow:"visible" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Track ring */}
        <circle cx={cx} cy={cy} r={r} fill="#0d0d1a" stroke="#1a1a2e" strokeWidth={1.5} />

        {/* Background arc */}
        <path
          d={arcPath(-45, 225, r - 3)}
          fill="none" stroke="#1a2030" strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Value arc */}
        <path
          d={arcPath(-45, -45 + norm * 270, r - 3)}
          fill="none" stroke={accent} strokeWidth={3}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${accent}88)` }}
        />

        {/* Pointer dot */}
        <circle
          cx={cx + (r - 3) * Math.cos((angle - 90) * Math.PI / 180)}
          cy={cy + (r - 3) * Math.sin((angle - 90) * Math.PI / 180)}
          r={2.5} fill={accent}
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill="#21262d" stroke={accent} strokeWidth={1} />
      </svg>

      {/* Value readout */}
      <div style={{
        fontSize: 9, color: accent, fontFamily:"JetBrains Mono,monospace",
        fontWeight: 700, marginTop: 1, letterSpacing: 0.5
      }}>
        {displayVal}{unit}
      </div>

      {/* Label */}
      {label && (
        <div style={{
          fontSize: 9, color:"#666", fontFamily:"JetBrains Mono,monospace",
          textAlign:"center", marginTop: 1, maxWidth: size + 8, lineHeight: 1.2
        }}>
          {label}
        </div>
      )}
    </div>
  );
}