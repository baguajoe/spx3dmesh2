import { clampFrame, getFrameFromClientX, getNextKeyframe, getPreviousKeyframe, hasKeyframeAtFrame } from "../animation/timelineUtils.js";
import { getAutoKeyLabel } from "../animation/animationKeyUtils.js";
import React, { useRef, useCallback, useEffect, useState } from "react";

export function AnimationTimeline({
  currentFrame, setCurrentFrame,
  isPlaying, setIsPlaying,
  isAutoKey, setAutoKey, autoKeyMode,
  videoStartFrame, videoEndFrame,
  setVideoStartFrame, setVideoEndFrame,
  videoFps, setVideoFps,
  sceneObjects = [],
  animKeys = {},
  activeObjUUID,
  keyframeVersion,
  onAddKeyframe,
  onDeleteKeyframe,
  handleApplyFunction,
}) {
  const tlTrackRef = useRef(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const jumpToFrame = (frame) => {
    setCurrentFrame?.(clampFrame(frame, videoStartFrame, videoEndFrame));
  };

  const handleTimelinePointer = (clientX) => {
    if (!tlTrackRef.current) return;
    const rect = tlTrackRef.current.getBoundingClientRect();
    const frame = getFrameFromClientX(clientX, rect, videoStartFrame, videoEndFrame);
    jumpToFrame(frame);
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const onMove = (e) => handleTimelinePointer(e.clientX);
    const onUp = () => setIsScrubbing(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isScrubbing, videoStartFrame, videoEndFrame]);

  const trackRef = useRef(null);
  const [draggedKeyFrame, setDraggedKeyFrame] = useState(null);
  const totalFrames = videoEndFrame - videoStartFrame || 250;

  const keyPositions = new Set();
  Object.values(animKeys).forEach(keys => {
    Object.values(keys).forEach(frames => {
      if (Array.isArray(frames)) frames.forEach(f => keyPositions.add(f));
      else if (typeof frames === "object") Object.keys(frames).forEach(f => keyPositions.add(Number(f)));
    });
  });

  const frameFromClientX = (clientX) => {
    const track = trackRef.current;
    if (!track) return currentFrame;
    const rect = track.getBoundingClientRect();
    return clampFrame(
      getFrameFromClientX(clientX, rect, videoStartFrame, videoEndFrame),
      videoStartFrame,
      videoEndFrame
    );
  };

  const beginKeyDrag = (e, frame) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggedKeyFrame(Number(frame));
    setCurrentFrame(Number(frame));
  };

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

  useEffect(() => {
    const h = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying(v => !v);
      }

      if (e.key === "ArrowLeft" && !e.shiftKey) {
        e.preventDefault();
        setCurrentFrame(f => Math.max(videoStartFrame, f - 1));
      }

      if (e.key === "ArrowRight" && !e.shiftKey) {
        e.preventDefault();
        setCurrentFrame(f => Math.min(videoEndFrame, f + 1));
      }

      if (e.key === "ArrowLeft" && e.shiftKey) {
        e.preventDefault();
        setCurrentFrame(videoStartFrame);
      }

      if (e.key === "ArrowRight" && e.shiftKey) {
        e.preventDefault();
        setCurrentFrame(videoEndFrame);
      }

      if (e.key === ",") {
        e.preventDefault();
        setCurrentFrame(f => getPreviousKeyframe([...keyPositions], f));
      }

      if (e.key === ".") {
        e.preventDefault();
        setCurrentFrame(f => getNextKeyframe([...keyPositions], f));
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (hasKeyframeAtFrame([...keyPositions], currentFrame)) {
          e.preventDefault();
          handleApplyFunction?.("delete_keyframe");
        }
      }

      if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        onAddKeyframe?.();
      }
    };

    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setIsPlaying, setCurrentFrame, videoStartFrame, videoEndFrame, currentFrame, onAddKeyframe, handleApplyFunction, keyPositions]);


  useEffect(() => {
    if (draggedKeyFrame == null) return;

    const onMove = (e) => {
      const nextFrame = frameFromClientX(e.clientX);
      setCurrentFrame(nextFrame);
    };

    const onUp = (e) => {
      const toFrame = frameFromClientX(e.clientX);
      if (toFrame !== draggedKeyFrame) {
        window.__spxMoveKeyFromFrame = draggedKeyFrame;
        window.__spxMoveKeyToFrame = toFrame;
        handleApplyFunction?.("move_keyframe");
      } else {
        setCurrentFrame(toFrame);
      }
      setDraggedKeyFrame(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggedKeyFrame, videoStartFrame, videoEndFrame, currentFrame, handleApplyFunction, setCurrentFrame]);

  const pct = totalFrames > 0 ? ((currentFrame - videoStartFrame) / totalFrames) * 100 : 0;

  const tickInterval = totalFrames <= 50 ? 5 : totalFrames <= 120 ? 10 : totalFrames <= 250 ? 25 : 50;
  const ticks = [];
  for (let f = videoStartFrame; f <= videoEndFrame; f += tickInterval) ticks.push(f);

  return (
    <div className="tl-root">
      <div className="tl-controls">
        <div className="tl-transport">
          <button className="tl-btn" title="Go to start" onClick={() => setCurrentFrame(videoStartFrame)}>⏮</button>
          <button className="tl-btn" title="Step back" onClick={() => setCurrentFrame(f => Math.max(videoStartFrame, f - 1))}>◂</button>
          <button className={`tl-btn tl-btn--play${isPlaying ? " tl-btn--playing" : ""}`}
            title="Play/Pause (Space)" onClick={() => setIsPlaying(v => !v)}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button className="tl-btn" title="Step forward" onClick={() => setCurrentFrame(f => Math.min(videoEndFrame, f + 1))}>▸</button>
          <button className="tl-btn" title="Go to end" onClick={() => setCurrentFrame(videoEndFrame)}>⏭</button>
        </div>

        <div className="tl-frame-display">
          <span className="tl-frame-label">Frame</span>
          <input className="tl-frame-input" type="number"
            value={currentFrame} onChange={e => setCurrentFrame(Number(e.target.value))}
            min={videoStartFrame} max={videoEndFrame} />
        </div>

        <div className="tl-range">
          <input className="tl-range-input" type="number" title="Start frame"
            value={videoStartFrame} onChange={e => setVideoStartFrame(Number(e.target.value))} />
          <span className="tl-range-sep">–</span>
          <input className="tl-range-input" type="number" title="End frame"
            value={videoEndFrame} onChange={e => setVideoEndFrame(Number(e.target.value))} />
        </div>

        <div className="tl-fps">
          <select className="tl-select" value={videoFps} onChange={e => setVideoFps(Number(e.target.value))}>
            {[12,24,25,30,60].map(f => <option key={f} value={f}>{f} fps</option>)}
          </select>
        </div>

        <button className={`tl-btn tl-btn--autokey${isAutoKey ? " tl-btn--autokey-on" : ""}`}
          title="Auto Keyframe" onClick={() => handleApplyFunction?.("auto_key")}>⬤ {typeof autoKeyMode === "string" ? getAutoKeyLabel(autoKeyMode) : "AUTO"}</button>

        <button className="tl-btn" title="Previous Frame" onClick={() => jumpToFrame((currentFrame ?? 0) - 1)}>◀</button>
        <button className="tl-btn" title="Next Frame" onClick={() => jumpToFrame((currentFrame ?? 0) + 1)}>▶</button>
        <button className="tl-btn" title="Previous Key" onClick={() => jumpToFrame(getPreviousKeyframe(keyframes, currentFrame ?? 0))}>◁◆</button>
        <button className="tl-btn" title="Next Key" onClick={() => jumpToFrame(getNextKeyframe(keyframes, currentFrame ?? 0))}>◆▷</button>
        <button className="tl-btn" title="Previous Key (,)" onClick={() => setCurrentFrame(f => getPreviousKeyframe([...keyPositions], f))}>◁◆</button>
        <button className="tl-btn" title="Next Key (.)" onClick={() => setCurrentFrame(f => getNextKeyframe([...keyPositions], f))}>◆▷</button>
        <button className="tl-btn tl-btn--addkey" title="Insert keyframe (I)" onClick={onAddKeyframe}>◆ KEY</button>
        <button className="tl-btn" title="Delete key at current frame" onClick={() => handleApplyFunction?.("delete_keyframe")}>⌫ KEY</button>
      </div>

      <div className="tl-track-area" ref={trackRef} onMouseDown={onTrackMouseDown}>
        <div className="tl-ruler">
          {ticks.map(f => (
            <div key={f} className="tl-tick" style={{ left: `${((f - videoStartFrame) / totalFrames) * 100}%` }}>
              <span className="tl-tick-label">{f}</span>
            </div>
          ))}
        </div>

        <div className="tl-keyframes" ref={tlTrackRef} onPointerDown={(e) => { setIsScrubbing(true); handleTimelinePointer(e.clientX); }}>
          {[...keyPositions].map(f => (
            <div
              key={f}
              className={`tl-keyframe-dot${Number(f) === Number(currentFrame) ? " tl-keyframe-dot--selected" : ""}${Number(f) === Number(draggedKeyFrame) ? " tl-keyframe-dot--dragging" : ""}`}
              onContextMenu={(e) => {
                e.preventDefault();
                if (onDeleteKeyframe) onDeleteKeyframe(Number(f));
              }}
              title={`Frame ${f} — right-click to delete`}
              style={{ left: `${((f - videoStartFrame) / totalFrames) * 100}%` }}
              title={`Frame ${f}`}
              onClick={(e) => { e.stopPropagation(); setCurrentFrame(Number(f)); }}
              onPointerDown={(e) => beginKeyDrag(e, f)}
            />
          ))}
        </div>

        <div className="tl-playhead" style={{ left: `${pct}%` }}>
          <div className="tl-playhead-head" />
          <div className="tl-playhead-line" />
        </div>
      </div>
    </div>
  );
}
