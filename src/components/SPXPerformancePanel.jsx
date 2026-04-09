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

const S = {
  panel: {
    width: "100%",
    background: "#0d1117",
    color: "#c8c8c8",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 11,
    display: "flex",
    flexDirection: "column",
    gap: 0,
    height: "100%",
    overflow: "hidden",
  },
  header: {
    background: "#161b22",
    borderBottom: "1px solid #21262d",
    padding: "6px 10px",
    fontWeight: 700,
    fontSize: 12,
    color: "#00ffc8",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  section: {
    borderBottom: "1px solid #21262d",
    overflow: "hidden",
  },
  sectionHeader: {
    padding: "5px 10px",
    background: "#161b22",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 11,
    color: "#8b949e",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    userSelect: "none",
  },
  sectionBody: {
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  btn: {
    background: "#21262d",
    border: "1px solid #30363d",
    color: "#c8c8c8",
    borderRadius: 3,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "JetBrains Mono, monospace",
    textAlign: "left",
  },
  btnPrimary: {
    background: "#00ffc820",
    border: "1px solid #00ffc8",
    color: "#00ffc8",
    borderRadius: 3,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "JetBrains Mono, monospace",
  },
  btnDanger: {
    background: "#ff000015",
    border: "1px solid #f85149",
    color: "#f85149",
    borderRadius: 3,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "JetBrains Mono, monospace",
  },
  btnOrange: {
    background: "#FF660015",
    border: "1px solid #FF6600",
    color: "#FF6600",
    borderRadius: 3,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "JetBrains Mono, monospace",
  },
  input: {
    background: "#0d1117",
    border: "1px solid #30363d",
    color: "#c8c8c8",
    borderRadius: 3,
    padding: "3px 6px",
    fontSize: 11,
    fontFamily: "JetBrains Mono, monospace",
    width: "100%",
    boxSizing: "border-box",
  },
  row: {
    display: "flex",
    gap: 4,
    alignItems: "center",
  },
  label: {
    color: "#8b949e",
    fontSize: 10,
    minWidth: 60,
  },
  clipItem: {
    background: "#161b22",
    border: "1px solid #21262d",
    borderRadius: 3,
    padding: "4px 8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
  },
  clipItemActive: {
    background: "#00ffc810",
    border: "1px solid #00ffc8",
    borderRadius: 3,
    padding: "4px 8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
  },
  timeline: {
    background: "#0d1117",
    border: "1px solid #21262d",
    borderRadius: 3,
    height: 48,
    position: "relative",
    overflow: "hidden",
    cursor: "pointer",
  },
  status: {
    padding: "4px 10px",
    background: "#161b22",
    borderTop: "1px solid #21262d",
    color: "#8b949e",
    fontSize: 10,
    minHeight: 20,
  },
  analysisBox: {
    background: "#161b22",
    border: "1px solid #21262d",
    borderRadius: 3,
    padding: 6,
    fontSize: 10,
    color: "#8b949e",
    whiteSpace: "pre-wrap",
    maxHeight: 80,
    overflowY: "auto",
  },
  aiBox: {
    background: "#161b22",
    border: "1px solid #21262d",
    borderRadius: 3,
    padding: 6,
    fontSize: 10,
    color: "#c8c8c8",
    whiteSpace: "pre-wrap",
    maxHeight: 120,
    overflowY: "auto",
  },
  textarea: {
    background: "#0d1117",
    border: "1px solid #30363d",
    color: "#c8c8c8",
    borderRadius: 3,
    padding: "4px 6px",
    fontSize: 11,
    fontFamily: "JetBrains Mono, monospace",
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: 40,
  },
  slider: {
    width: "100%",
    accentColor: "#00ffc8",
  },
  score: (v) => ({
    color: v >= 80 ? "#00ffc8" : v >= 50 ? "#FF6600" : "#f85149",
    fontWeight: 700,
  }),
};

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={S.section}>
      <div style={S.sectionHeader} onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span>{open ? "▾" : "▸"}</span>
      </div>
      {open && <div style={S.sectionBody}>{children}</div>}
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
    <div style={S.panel}>
      {/* Header */}
      <div style={S.header}>
        <span>⬡ SPX Performance</span>
        <button style={{ ...S.btn, fontSize: 10, padding: "2px 6px" }} onClick={handleRenameSession}>
          {session.name}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ── Clip Library ── */}
        <Section title="▸ Clip Library" defaultOpen={true}>
          <button style={S.btnPrimary} onClick={handleImportBVH}>
            ⊕ Import BVH File
          </button>
          {session.clips.length === 0 && (
            <div style={{ color: "#484f58", fontSize: 10, fontStyle: "italic" }}>
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
                <div style={S.row}>
                  <input
                    style={{ ...S.input, width: 100 }}
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleRenameClip(clip.id)}
                    autoFocus
                  />
                  <button style={S.btnPrimary} onClick={() => handleRenameClip(clip.id)}>✓</button>
                  <button style={S.btn} onClick={() => setRenaming(null)}>✕</button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: clip.id === session.activeClipId ? "#00ffc8" : "#c8c8c8", fontSize: 11 }}>
                      {clip.name}
                      {clip.cleaned && <span style={{ color: "#00ffc8", marginLeft: 4 }}>✓</span>}
                    </div>
                    <div style={{ color: "#484f58", fontSize: 9 }}>
                      {clip.frames?.length || 0}f · {clip.duration?.toFixed(2)}s · {clip.source || "bvh"}
                    </div>
                  </div>
                  <div style={S.row}>
                    <button style={{ ...S.btn, padding: "2px 5px" }} title="Rename"
                      onClick={e => { e.stopPropagation(); setRenaming(clip.id); setRenameVal(clip.name); }}>✏</button>
                    <button style={{ ...S.btn, padding: "2px 5px" }} title="Duplicate"
                      onClick={e => { e.stopPropagation(); handleDuplicateClip(clip.id); }}>⧉</button>
                    <button style={{ ...S.btnDanger, padding: "2px 5px" }} title="Remove"
                      onClick={e => { e.stopPropagation(); handleRemoveClip(clip.id); }}>✕</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </Section>

        {/* ── Cleanup ── */}
        <Section title="▸ Cleanup & Analysis">
          <div style={{ color: "#484f58", fontSize: 10 }}>
            Active: {activeClip ? activeClip.name : "none"}
          </div>
          <div style={S.row}>
            <button style={S.btn} onClick={handleCleanClip}>
              ⟳ Smooth + Foot Lock
            </button>
            <button style={S.btn} onClick={handleAnalyzeClip}>
              ⬡ Analyze
            </button>
          </div>
          {analysisResult && (
            <div style={S.analysisBox}>
              <span style={S.score(analysisResult.score)}>Score: {analysisResult.score}/100</span>{"\n"}
              {analysisResult.summary}{"\n"}
              {analysisResult.issues.map((iss, i) => (
                `[${iss.severity}] ${iss.bone || ""} ${iss.type}: ${iss.suggestion}\n`
              ))}
            </div>
          )}
          {activeClip && (
            <>
              <div style={S.row}>
                <span style={S.label}>Trim In</span>
                <input
                  type="number"
                  style={{ ...S.input, width: 60 }}
                  defaultValue={activeClip.startFrame}
                  onBlur={e => handleTrimClip(activeClip.id, parseInt(e.target.value), activeClip.endFrame)}
                />
                <span style={S.label}>Trim Out</span>
                <input
                  type="number"
                  style={{ ...S.input, width: 60 }}
                  defaultValue={activeClip.endFrame}
                  onBlur={e => handleTrimClip(activeClip.id, activeClip.startFrame, parseInt(e.target.value))}
                />
              </div>
              <div style={S.row}>
                <span style={S.label}>Blend In</span>
                <input
                  type="number"
                  style={{ ...S.input, width: 60 }}
                  defaultValue={activeClip.blendIn}
                  onBlur={e => handleSetBlend(activeClip.id, parseInt(e.target.value), activeClip.blendOut)}
                />
                <span style={S.label}>Blend Out</span>
                <input
                  type="number"
                  style={{ ...S.input, width: 60 }}
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
          <div style={S.timeline} ref={timelineRef} onClick={handleTimelineClick}>
            {/* Clip blocks */}
            {session.clips.map(clip => {
              const left = session.totalFrames > 0
                ? (clip.trackOffset / session.totalFrames) * 100 : 0;
              const width = session.totalFrames > 0
                ? (((clip.endFrame - clip.startFrame) / session.totalFrames) * 100) : 10;
              return (
                <div key={clip.id} style={{
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
            <div style={{
              position: "absolute",
              left: `${timelineProgress}%`,
              top: 0,
              bottom: 0,
              width: 2,
              background: "#00ffc8",
              pointerEvents: "none",
            }} />
            {session.clips.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#484f58", fontSize: 10 }}>
                Timeline empty
              </div>
            )}
          </div>

          {/* Frame counter */}
          <div style={{ ...S.row, justifyContent: "space-between" }}>
            <span style={{ color: "#484f58", fontSize: 10 }}>
              Frame {Math.floor(session.currentFrame)} / {session.totalFrames}
            </span>
            <span style={{ color: "#484f58", fontSize: 10 }}>
              {(session.currentFrame / session.fps).toFixed(2)}s
            </span>
          </div>

          {/* Scrubber */}
          <input
            type="range"
            style={S.slider}
            min={0}
            max={session.totalFrames || 1}
            value={Math.floor(session.currentFrame)}
            onChange={e => { seekSession(session, parseInt(e.target.value)); refresh(); }}
          />

          {/* Transport */}
          <div style={S.row}>
            <button style={S.btnPrimary} onClick={handlePlay}>▶ Play</button>
            <button style={S.btn} onClick={handlePause}>⏸ Pause</button>
            <button style={S.btn} onClick={handleStop}>⏹ Stop</button>
            <button
              style={session.loop ? S.btnPrimary : S.btn}
              onClick={handleLoop}
            >
              ↺ Loop
            </button>
          </div>

          {/* Speed */}
          <div style={S.row}>
            <span style={S.label}>Speed</span>
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
          <button style={S.btn} onClick={handleExportBVH}>
            ↓ Export BVH
          </button>
          <button style={S.btn} onClick={handleExportSession}>
            ↓ Save Session (.spxperf)
          </button>
          <button style={S.btnOrange} onClick={handleSendToSPX}>
            ⬡ Send to StreamPireX
          </button>
        </Section>

        {/* ── AI Assistant ── */}
        <Section title="▸ AI Animation Assistant">
          <textarea
            style={S.textarea}
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
            <div style={S.aiBox}>{aiResponse}</div>
          )}
          <div style={{ color: "#484f58", fontSize: 9 }}>
            AI credits deduct from StreamPireX account on integration
          </div>
        </Section>

      </div>

      {/* Status bar */}
      <div style={S.status}>{status}</div>
    </div>
  );
}
