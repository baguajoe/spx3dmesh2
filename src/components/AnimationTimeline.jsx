import React, { useRef, useCallback, useEffect } from "react";

export function AnimationTimeline({
  currentFrame, setCurrentFrame,
  isPlaying, setIsPlaying,
  isAutoKey, setAutoKey,
  videoStartFrame, videoEndFrame,
  setVideoStartFrame, setVideoEndFrame,
  videoFps, setVideoFps,
  sceneObjects = [],
  animKeys = {},
  onAddKeyframe,
}) {
  const trackRef = useRef(null);
  const totalFrames = videoEndFrame - videoStartFrame || 250;

  // Scrub on click/drag
  const scrub = useCallback((e) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentFrame(Math.round(videoStartFrame + t * totalFrames));
  }, [videoStartFrame, totalFrames, setCurrentFrame]);

  const onTrackMouseDown = useCallback((e) => {
    scrub(e);
    const onMove = (me) => scrub(me);
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [scrub]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === " ") { e.preventDefault(); setIsPlaying(v => !v); }
      if (e.key === "ArrowLeft")  setCurrentFrame(f => Math.max(videoStartFrame, f - 1));
      if (e.key === "ArrowRight") setCurrentFrame(f => Math.min(videoEndFrame, f + 1));
      if (e.key === "ArrowLeft" && e.shiftKey)  setCurrentFrame(videoStartFrame);
      if (e.key === "ArrowRight" && e.shiftKey) setCurrentFrame(videoEndFrame);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setIsPlaying, setCurrentFrame, videoStartFrame, videoEndFrame]);

  const pct = totalFrames > 0 ? ((currentFrame - videoStartFrame) / totalFrames) * 100 : 0;

  // Collect all keyframe positions across all objects
  const keyPositions = new Set();
  Object.values(animKeys).forEach(keys => {
    Object.values(keys).forEach(frames => {
      if (Array.isArray(frames)) frames.forEach(f => keyPositions.add(f));
      else if (typeof frames === "object") Object.keys(frames).forEach(f => keyPositions.add(Number(f)));
    });
  });

  // Build frame ruler ticks
  const tickInterval = totalFrames <= 50 ? 5 : totalFrames <= 120 ? 10 : totalFrames <= 250 ? 25 : 50;
  const ticks = [];
  for (let f = videoStartFrame; f <= videoEndFrame; f += tickInterval) {
    ticks.push(f);
  }

  return (
    <div className="tl-root">
      {/* Controls row */}
      <div className="tl-controls">
        {/* Transport */}
        <div className="tl-transport">
          <button className="tl-btn" title="Go to start"
            onClick={() => setCurrentFrame(videoStartFrame)}>⏮</button>
          <button className="tl-btn" title="Step back"
            onClick={() => setCurrentFrame(f => Math.max(videoStartFrame, f - 1))}>◂</button>
          <button className={`tl-btn tl-btn--play${isPlaying ? " tl-btn--playing" : ""}`}
            title="Play/Pause (Space)"
            onClick={() => setIsPlaying(v => !v)}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button className="tl-btn" title="Step forward"
            onClick={() => setCurrentFrame(f => Math.min(videoEndFrame, f + 1))}>▸</button>
          <button className="tl-btn" title="Go to end"
            onClick={() => setCurrentFrame(videoEndFrame)}>⏭</button>
        </div>

        {/* Frame display */}
        <div className="tl-frame-display">
          <span className="tl-frame-label">Frame</span>
          <input className="tl-frame-input" type="number"
            value={currentFrame}
            onChange={e => setCurrentFrame(Number(e.target.value))}
            min={videoStartFrame} max={videoEndFrame} />
        </div>

        {/* Range */}
        <div className="tl-range">
          <input className="tl-range-input" type="number" title="Start frame"
            value={videoStartFrame}
            onChange={e => setVideoStartFrame(Number(e.target.value))} />
          <span className="tl-range-sep">–</span>
          <input className="tl-range-input" type="number" title="End frame"
            value={videoEndFrame}
            onChange={e => setVideoEndFrame(Number(e.target.value))} />
        </div>

        {/* FPS */}
        <div className="tl-fps">
          <select className="tl-select" value={videoFps}
            onChange={e => setVideoFps(Number(e.target.value))}>
            {[12,24,25,30,60].map(f => <option key={f} value={f}>{f} fps</option>)}
          </select>
        </div>

        {/* Auto key */}
        <button className={`tl-btn tl-btn--autokey${isAutoKey ? " tl-btn--autokey-on" : ""}`}
          title="Auto Keyframe"
          onClick={() => setAutoKey(v => !v)}>
          ⬤ AUTO
        </button>

        {/* Add keyframe */}
        <button className="tl-btn tl-btn--addkey" title="Insert keyframe (I)"
          onClick={onAddKeyframe}>
          ◆ KEY
        </button>
      </div>

      {/* Track area */}
      <div className="tl-track-area" ref={trackRef} onMouseDown={onTrackMouseDown}>
        {/* Ruler */}
        <div className="tl-ruler">
          {ticks.map(f => (
            <div key={f} className="tl-tick"
              style={{ left: `${((f - videoStartFrame) / totalFrames) * 100}%` }}>
              <span className="tl-tick-label">{f}</span>
            </div>
          ))}
        </div>

        {/* Keyframe dots */}
        <div className="tl-keyframes">
          {[...keyPositions].map(f => (
            <div key={f} className="tl-keyframe-dot"
              style={{ left: `${((f - videoStartFrame) / totalFrames) * 100}%` }}
              title={`Frame ${f}`} />
          ))}
        </div>

        {/* Playhead */}
        <div className="tl-playhead" style={{ left: `${pct}%` }}>
          <div className="tl-playhead-head" />
          <div className="tl-playhead-line" />
        </div>
      </div>
    </div>
  );
}
