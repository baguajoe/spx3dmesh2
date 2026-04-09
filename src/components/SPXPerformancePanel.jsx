import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  createPerformanceSession,
  importBVHClip,
  removeClip,
  renameClip,
  duplicateClip,
  trimClip,
  setClipBlend,
  moveClipOnTimeline,
  blendClips,
  addCharacter,
  removeCharacter,
  resetCharacterPose,
  autoMapBones,
  cleanClip,
  analyzeClip,
  retargetClipToCharacter,
  applyClipFrameToCharacter,
  setCharacterIKFK,
  playSession,
  pauseSession,
  stopSession,
  seekSession,
  setPlaybackSpeed,
  setLoop,
  tickPerformance,
  exportSessionAsBVH,
  downloadBVH,
  downloadSessionJSON,
  sendToStreamPireX,
  getAIAnimationAdvice,
} from "../mesh/SPXPerformance.js";

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spp-section">
      <div className="spp-section-header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span>{open ? "▾" : "▸"}</span>
      </div>
      {open && <div className="spp-section-body">{children}</div>}
    </div>
  );
}

export default function SPXPerformancePanel({ sceneObjects = [], activeObjId = null }) {
  const [session, setSession] = useState(() => createPerformanceSession("My Performance"));
  const [status, setStatus] = useState("Ready — import a BVH to begin");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [aiResponse, setAiResponse] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const rafRef = useRef(null);
  const timelineRef = useRef(null);

  // ── Playback loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      setSession(prev => {
        if (!prev.playing) return prev;
        const next = { ...prev };
        tickPerformance(next);
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const refresh = useCallback(() => setSession(s => ({ ...s })), []);

  // ── Clip library ───────────────────────────────────────────────────────────
  const handleImportBVH = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".bvh";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const clip = importBVHClip(session, ev.target.result, file.name.replace(".bvh", ""));
          setStatus(`Imported: ${clip.name} — ${clip.frames.length} frames @ ${(1 / clip.frameTime).toFixed(0)}fps`);
          refresh();
        } catch (err) {
          setStatus(`Import failed: ${err.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [session, refresh]);

  const handleRemoveClip = useCallback((clipId) => {
    removeClip(session, clipId);
    setStatus("Clip removed");
    refresh();
  }, [session, refresh]);

  const handleDuplicateClip = useCallback((clipId) => {
    const dupe = duplicateClip(session, clipId);
    setStatus(`Duplicated: ${dupe.name}`);
    refresh();
  }, [session, refresh]);

  const handleRenameClip = useCallback((clipId) => {
    if (!renameVal.trim()) return;
    renameClip(session, clipId, renameVal.trim());
    setRenaming(null);
    setRenameVal("");
    refresh();
  }, [session, renameVal, refresh]);

  const handleSetActive = useCallback((clipId) => {
    session.activeClipId = clipId;
    refresh();
  }, [session, refresh]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const handleCleanClip = useCallback(() => {
    const clip = session.clips.find(c => c.id === session.activeClipId);
    if (!clip) { setStatus("No active clip"); return; }
    cleanClip(clip, { smoothWindow: 5 });
    setStatus(`Cleaned: ${clip.name} — jitter removed, foot contacts locked`);
    refresh();
  }, [session, refresh]);

  const handleAnalyzeClip = useCallback(async () => {
    const clip = session.clips.find(c => c.id === session.activeClipId);
    if (!clip) { setStatus("No active clip"); return; }
    setStatus("Analyzing...");
    const result = await analyzeClip(clip);
    setAnalysisResult(result);
    clip.analysisResult = result;
    setStatus(`Analysis complete — score: ${result.score}/100`);
    refresh();
  }, [session, refresh]);

  // ── Trim ───────────────────────────────────────────────────────────────────
  const handleTrimClip = useCallback((clipId, startFrame, endFrame) => {
    const clip = session.clips.find(c => c.id === clipId);
    if (!clip) return;
    trimClip(clip, startFrame, endFrame);
    setStatus(`Trimmed: ${clip.name} [${startFrame}–${endFrame}]`);
    refresh();
  }, [session, refresh]);

  // ── Blend ──────────────────────────────────────────────────────────────────
  const handleSetBlend = useCallback((clipId, blendIn, blendOut) => {
    const clip = session.clips.find(c => c.id === clipId);
    if (!clip) return;
    setClipBlend(clip, blendIn, blendOut);
    setStatus(`Blend set: in=${blendIn} out=${blendOut}`);
    refresh();
  }, [session, refresh]);

  // ── Timeline click to seek ─────────────────────────────────────────────────
  const handleTimelineClick = useCallback((e) => {
    if (!timelineRef.current || session.totalFrames === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const t = (e.clientX - rect.left) / rect.width;
    const frame = Math.floor(t * session.totalFrames);
    seekSession(session, frame);
    refresh();
  }, [session, refresh]);

  // ── Playback controls ──────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    if (session.clips.length === 0) { setStatus("Import a clip first"); return; }
    playSession(session);
    setStatus("Playing...");
    refresh();
  }, [session, refresh]);

  const handlePause = useCallback(() => {
    pauseSession(session);
    setStatus("Paused");
    refresh();
  }, [session, refresh]);

  const handleStop = useCallback(() => {
    stopSession(session);
    setStatus("Stopped");
    refresh();
  }, [session, refresh]);

  const handleSpeed = useCallback((speed) => {
    setPlaybackSpeed(session, parseFloat(speed));
    refresh();
  }, [session, refresh]);

  const handleLoop = useCallback(() => {
    setLoop(session, !session.loop);
    setStatus(`Loop: ${!session.loop ? "ON" : "OFF"}`);
    refresh();
  }, [session, refresh]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExportBVH = useCallback(() => {
    const clip = session.clips.find(c => c.id === session.activeClipId);
    if (!clip || !clip.bvh) { setStatus("Active clip has no BVH data"); return; }
    try {
      const bvhText = exportSessionAsBVH(session, clip.id);
      downloadBVH(bvhText, `${clip.name}.bvh`);
      setStatus(`Exported: ${clip.name}.bvh`);
    } catch (err) {
      setStatus(`Export failed: ${err.message}`);
    }
  }, [session]);

  const handleExportSession = useCallback(() => {
    downloadSessionJSON(session);
    setStatus(`Session saved: ${session.name}.spxperf`);
  }, [session]);

  const handleSendToSPX = useCallback(async () => {
    setStatus("Sending to StreamPireX...");
    const result = await sendToStreamPireX(session, "local_user");
    setStatus(result.message || "Sent to StreamPireX");
  }, [session]);

  // ── AI assistant ───────────────────────────────────────────────────────────
  const handleAskAI = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse("Thinking...");
    try {
      const response = await getAIAnimationAdvice(session, aiPrompt, "local_user");
      setAiResponse(response);
    } catch (err) {
      setAiResponse(`Error: ${err.message}`);
    }
    setAiLoading(false);
  }, [session, aiPrompt]);

  // ── Session rename ─────────────────────────────────────────────────────────
  const handleRenameSession = useCallback(() => {
    const name = prompt("Session name:", session.name);
    if (name) { session.name = name; refresh(); }
  }, [session, refresh]);

  // ── Timeline render ────────────────────────────────────────────────────────
  const timelineProgress = session.totalFrames > 0
    ? (session.currentFrame / session.totalFrames) * 100
    : 0;

  const activeClip = session.clips.find(c => c.id === session.activeClipId);

  return (
    <div className="spp-panel">
      {/* Header */}
      <div className="spp-header">
        <span>⬡ SPX Performance</span>
        <button className="spp-btn spp-btn--sm" onClick={handleRenameSession}>
          {session.name}
        </button>
      </div>

      <div className="spp-scroll">

        {/* ── Clip Library ── */}
        <Section title="▸ Clip Library" defaultOpen={true}>
          <button className="spp-btn spp-btn--primary" onClick={handleImportBVH}>
            ⊕ Import BVH File
          </button>
          {session.clips.length === 0 && (
            <div className="spp-dim-italic">
              No clips — import a BVH to begin
            </div>
          )}
          {session.clips.map(clip => (
            <div
              key={clip.id}
              style={clip.id === session.activeClipId ? S.clipItemActive : S.clipItem}
              onClick={() => handleSetActive(clip.id)}
            >
              {renaming === clip.id ? (
                <div className="spp-row">
                  <input
                    className="spp-input spp-input--w100"
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleRenameClip(clip.id)}
                    autoFocus
                  />
                  <button className="spp-btn spp-btn--primary" onClick={() => handleRenameClip(clip.id)}>✓</button>
                  <button className="spp-btn" onClick={() => setRenaming(null)}>✕</button>
                </div>
              ) : (
                <>
                  <div className="spp-flex1">
                    <div className={`spp-clip-name${clip.id === session.activeClipId ? ' spp-clip-name--active' : ''}`}>
                      {clip.name}
                      {clip.cleaned && <span className="spp-clean-check">✓</span>}
                    </div>
                    <div className="spp-dim-sm">
                      {clip.frames?.length || 0}f · {clip.duration?.toFixed(2)}s · {clip.source || "bvh"}
                    </div>
                  </div>
                  <div className="spp-row">
                    <button className="spp-btn spp-btn--xs" title="Rename"
                      onClick={e => { e.stopPropagation(); setRenaming(clip.id); setRenameVal(clip.name); }}>✏</button>
                    <button className="spp-btn spp-btn--xs" title="Duplicate"
                      onClick={e => { e.stopPropagation(); handleDuplicateClip(clip.id); }}>⧉</button>
                    <button className="spp-btn spp-btn--danger-xs" title="Remove"
                      onClick={e => { e.stopPropagation(); handleRemoveClip(clip.id); }}>✕</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </Section>

        {/* ── Cleanup ── */}
        <Section title="▸ Cleanup & Analysis">
          <div className="spp-dim">
            Active: {activeClip ? activeClip.name : "none"}
          </div>
          <div className="spp-row">
            <button className="spp-btn" onClick={handleCleanClip}>
              ⟳ Smooth + Foot Lock
            </button>
            <button className="spp-btn" onClick={handleAnalyzeClip}>
              ⬡ Analyze
            </button>
          </div>
          {analysisResult && (
            <div className="spp-analysis-box">
              <span className="spp-score" style={{color: analysisResult.score>=80?'#00ffc8':analysisResult.score>=50?'#ffaa00':'#ff4444'}}>Score: {analysisResult.score}/100</span>{"\n"}
              {analysisResult.summary}{"\n"}
              {analysisResult.issues.map((iss, i) => (
                `[${iss.severity}] ${iss.bone || ""} ${iss.type}: ${iss.suggestion}\n`
              ))}
            </div>
          )}
          {activeClip && (
            <>
              <div className="spp-row">
                <span className="spp-label">Trim In</span>
                <input
                  type="number"
                  className="spp-input spp-input--w60"
                  defaultValue={activeClip.startFrame}
                  onBlur={e => handleTrimClip(activeClip.id, parseInt(e.target.value), activeClip.endFrame)}
                />
                <span className="spp-label">Trim Out</span>
                <input
                  type="number"
                  className="spp-input spp-input--w60"
                  defaultValue={activeClip.endFrame}
                  onBlur={e => handleTrimClip(activeClip.id, activeClip.startFrame, parseInt(e.target.value))}
                />
              </div>
              <div className="spp-row">
                <span className="spp-label">Blend In</span>
                <input
                  type="number"
                  className="spp-input spp-input--w60"
                  defaultValue={activeClip.blendIn}
                  onBlur={e => handleSetBlend(activeClip.id, parseInt(e.target.value), activeClip.blendOut)}
                />
                <span className="spp-label">Blend Out</span>
                <input
                  type="number"
                  className="spp-input spp-input--w60"
                  defaultValue={activeClip.blendOut}
                  onBlur={e => handleSetBlend(activeClip.id, activeClip.blendIn, parseInt(e.target.value))}
                />
              </div>
            </>
          )}
        </Section>

        {/* ── Playback ── */}
        <Section title="▸ Playback" defaultOpen={true}>
          {/* Timeline */}
          <div className="spp-timeline" ref={timelineRef} onClick={handleTimelineClick}>
            {/* Clip blocks */}
            {session.clips.map(clip => {
              const left = session.totalFrames > 0
                ? (clip.trackOffset / session.totalFrames) * 100 : 0;
              const width = session.totalFrames > 0
                ? (((clip.endFrame - clip.startFrame) / session.totalFrames) * 100) : 10;
              return (
                <div key={clip.id} className="spp-tl-clip" style={{
                  position: "absolute",
                  left: `${left}%`,
                  width: `${Math.max(width, 2)}%`,
                  top: 8,
                  height: 20,
                  background: clip.id === session.activeClipId ? "#00ffc830" : "#21262d",
                  border: `1px solid ${clip.id === session.activeClipId ? "#00ffc8" : "#30363d"}`,
                  borderRadius: 2,
                  overflow: "hidden",
                  fontSize: 9,
                  color: "#c8c8c8",
                  paddingLeft: 3,
                  lineHeight: "20px",
                  whiteSpace: "nowrap",
                }}>
                  {clip.name}
                </div>
              );
            })}
            {/* Playhead */}
            <div className="spp-tl-empty" style={{
              position: "absolute",
              left: `${timelineProgress}%`,
              top: 0,
              bottom: 0,
              width: 2,
              background: "#00ffc8",
              pointerEvents: "none",
            }} />
            {session.clips.length === 0 && (
              <div className="spp-tl-empty-label">
                Timeline empty
              </div>
            )}
          </div>

          {/* Frame counter */}
          <div className="spp-row spp-row--between">
            <span className="spp-dim">
              Frame {Math.floor(session.currentFrame)} / {session.totalFrames}
            </span>
            <span className="spp-dim">
              {(session.currentFrame / session.fps).toFixed(2)}s
            </span>
          </div>

          {/* Scrubber */}
          <input
            type="range"
            className="spp-slider"
            min={0}
            max={session.totalFrames || 1}
            value={Math.floor(session.currentFrame)}
            onChange={e => { seekSession(session, parseInt(e.target.value)); refresh(); }}
          />

          {/* Transport */}
          <div className="spp-row">
            <button className="spp-btn spp-btn--primary" onClick={handlePlay}>▶ Play</button>
            <button className="spp-btn" onClick={handlePause}>⏸ Pause</button>
            <button className="spp-btn" onClick={handleStop}>⏹ Stop</button>
            <button
              style={session.loop ? S.btnPrimary : S.btn}
              onClick={handleLoop}
            >
              ↺ Loop
            </button>
          </div>

          {/* Speed */}
          <div className="spp-row">
            <span className="spp-label">Speed</span>
            {[0.25, 0.5, 1, 2].map(sp => (
              <button
                key={sp}
                style={session.speed === sp ? S.btnPrimary : S.btn}
                onClick={() => handleSpeed(sp)}
              >
                {sp}x
              </button>
            ))}
          </div>
        </Section>

        {/* ── Export ── */}
        <Section title="▸ Export & Pipeline">
          <button className="spp-btn" onClick={handleExportBVH}>
            ↓ Export BVH
          </button>
          <button className="spp-btn" onClick={handleExportSession}>
            ↓ Save Session (.spxperf)
          </button>
          <button className="spp-btn spp-btn--orange" onClick={handleSendToSPX}>
            ⬡ Send to StreamPireX
          </button>
        </Section>

        {/* ── AI Assistant ── */}
        <Section title="▸ AI Animation Assistant">
          <textarea
            className="spp-textarea"
            placeholder="Ask anything... e.g. 'This walk cycle feels stiff, how do I fix it?' or 'Smooth out the arm motion'"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleAskAI(); }}
          />
          <button
            style={aiLoading ? S.btn : S.btnPrimary}
            onClick={handleAskAI}
            disabled={aiLoading}
          >
            {aiLoading ? "⟳ Thinking..." : "⬡ Ask AI (Ctrl+Enter)"}
          </button>
          {aiResponse && (
            <div className="spp-ai-box">{aiResponse}</div>
          )}
          <div className="spp-dim-sm">
            AI credits deduct from StreamPireX account on integration
          </div>
        </Section>

      </div>

      {/* Status bar */}
      <div className="spp-status">{status}</div>
    </div>
  );
}
