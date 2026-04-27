// ═══════════════════════════════════════════════════════════════
// RenderFarmPanel.jsx
// Visual front-end for RenderFarmManager — manages a queue of render jobs
// (tile-based, progressive, cancellable) for batch / overnight rendering.
// Built as part of Batch 3D-1; wraps engines in src/mesh/RenderFarm{,Manager}.js.
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from "react";
import "../../styles/panel-components.css";
import "../../styles/render-panels.css";
import "../../styles/render-farm-panel.css";
import {
  createRenderFarm,
  addRenderFarmJob,
  cancelRenderJob,
  removeRenderJob,
  runNextRenderJob,
  getRenderFarmStats,
  JOB_STATUS,
} from "../../mesh/RenderFarm.js";

// ── Helpers ────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spx-section">
      <div
        className={"spx-section__hdr" + (accent ? " spx-section__hdr--" + accent : "")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={"spx-section__arrow" + (accent ? " spx-section__arrow--" + accent : "")}>
          {open ? "▾" : "▸"}
        </span>
        <span className="spx-section__title">{title}</span>
      </div>
      {open && <div className="spx-section__body">{children}</div>}
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange, unit = "" }) {
  return (
    <div className="spx-slider-wrap">
      <div className="spx-slider-header">
        <span>{label}</span>
        <span className="spx-slider-header__val">
          {step < 0.1 ? Number(value).toFixed(2) : Math.round(value)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="spx-slider-input"
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const colorMap = {
    [JOB_STATUS.PENDING]: "#888",
    [JOB_STATUS.RUNNING]: "#00ffc8",
    [JOB_STATUS.DONE]: "#44ff88",
    [JOB_STATUS.FAILED]: "#ff4444",
    [JOB_STATUS.CANCELLED]: "#ffaa00",
  };
  const c = colorMap[status] || "#888";
  return (
    <span
      className="rfp-status-badge"
      style={{
        color: c,
        borderColor: c,
      }}
    >
      {String(status).toUpperCase()}
    </span>
  );
}

// ── Resolution presets ─────────────────────────────────────────────
const RESOLUTION_PRESETS = [
  { label: "HD 720p", w: 1280, h: 720 },
  { label: "Full HD 1080p", w: 1920, h: 1080 },
  { label: "QHD 1440p", w: 2560, h: 1440 },
  { label: "4K UHD", w: 3840, h: 2160 },
  { label: "8K UHD", w: 7680, h: 4320 },
  { label: "Square 1:1 (1080)", w: 1080, h: 1080 },
  { label: "Vertical 9:16 (1080)", w: 1080, h: 1920 },
];

// ── Main Panel ─────────────────────────────────────────────────────
export default function RenderFarmPanel({
  open = true,
  onClose,
  rendererRef,
  sceneRef,
  cameraRef,
  setStatus = () => {},
}) {
  // Farm state lives in a ref so the queue persists across renders.
  const farmRef = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, running: 0, done: 0, failed: 0 });
  const [running, setRunning] = useState(false);
  const cancelledRef = useRef(false);

  // New-job form state
  const [jobName, setJobName] = useState("Render Job 1");
  const [resolutionIdx, setResolutionIdx] = useState(1);
  const [tileSize, setTileSize] = useState(256);
  const [samples, setSamples] = useState(64);
  const [outputFormat, setOutputFormat] = useState("png");
  const [progress, setProgress] = useState(0);
  const [activeJobId, setActiveJobId] = useState(null);

  // Initialize the farm once on mount
  useEffect(() => {
    if (!farmRef.current) {
      farmRef.current = createRenderFarm();
      setStats(getRenderFarmStats(farmRef.current));
    }
  }, []);

  // Poll farm stats every 500ms while running
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (farmRef.current) {
        setStats(getRenderFarmStats(farmRef.current));
        setJobs([...(farmRef.current.jobs || [])]);
      }
    }, 500);
    return () => clearInterval(id);
  }, [running]);

  // Add a job to the queue
  const handleAddJob = useCallback(() => {
    if (!farmRef.current) {
      setStatus("Render farm not initialized");
      return;
    }
    const preset = RESOLUTION_PRESETS[resolutionIdx];
    const job = addRenderFarmJob(farmRef.current, {
      name: jobName || ("Job " + Date.now()),
      width: preset.w,
      height: preset.h,
      tileSize,
      samples,
      format: outputFormat,
    });
    setJobs([...(farmRef.current.jobs || [])]);
    setStats(getRenderFarmStats(farmRef.current));
    setStatus("Queued: " + job.name + " (" + preset.w + "×" + preset.h + ")");
    // Auto-increment job name
    const match = jobName.match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10) + 1;
      setJobName(jobName.replace(/\d+$/, String(n)));
    }
  }, [jobName, resolutionIdx, tileSize, samples, outputFormat, setStatus]);

  // Run the queue
  const handleRunQueue = useCallback(async () => {
    if (!farmRef.current) return;
    if (!rendererRef?.current || !sceneRef?.current || !cameraRef?.current) {
      setStatus("Renderer/scene/camera not ready");
      return;
    }
    setRunning(true);
    cancelledRef.current = false;

    try {
      while (!cancelledRef.current) {
        const stats = getRenderFarmStats(farmRef.current);
        if (stats.pending === 0) break;

        const result = await runNextRenderJob(
          farmRef.current,
          rendererRef.current,
          sceneRef.current,
          cameraRef.current,
          (jobId, p) => {
            setActiveJobId(jobId);
            setProgress(p);
          }
        );
        if (!result) break;

        // If the job produced an output (data URL or blob), trigger a download
        if (result.dataURL && result.name) {
          const a = document.createElement("a");
          a.href = result.dataURL;
          a.download = result.name + "." + (result.format || "png");
          a.click();
        }
      }
      const finalStats = getRenderFarmStats(farmRef.current);
      setStats(finalStats);
      setJobs([...(farmRef.current.jobs || [])]);
      setStatus(
        cancelledRef.current
          ? "Render queue cancelled"
          : "Render queue complete — " + finalStats.done + " done, " + finalStats.failed + " failed"
      );
    } catch (e) {
      setStatus("Render queue error: " + (e?.message || e));
    } finally {
      setRunning(false);
      setActiveJobId(null);
      setProgress(0);
    }
  }, [rendererRef, sceneRef, cameraRef, setStatus]);

  // Cancel an individual job
  const handleCancel = useCallback(
    (jobId) => {
      if (!farmRef.current) return;
      cancelRenderJob(farmRef.current, jobId);
      setJobs([...(farmRef.current.jobs || [])]);
      setStats(getRenderFarmStats(farmRef.current));
      setStatus("Cancelled job " + jobId);
    },
    [setStatus]
  );

  // Remove a finished/cancelled job from the list
  const handleRemove = useCallback(
    (jobId) => {
      if (!farmRef.current) return;
      removeRenderJob(farmRef.current, jobId);
      setJobs([...(farmRef.current.jobs || [])]);
      setStats(getRenderFarmStats(farmRef.current));
    },
    []
  );

  // Cancel the whole running queue
  const handleStopAll = useCallback(() => {
    cancelledRef.current = true;
    if (farmRef.current && farmRef.current.jobs) {
      farmRef.current.jobs.forEach((j) => {
        if (j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.RUNNING) {
          cancelRenderJob(farmRef.current, j.id);
        }
      });
      setJobs([...farmRef.current.jobs]);
      setStats(getRenderFarmStats(farmRef.current));
    }
    setStatus("Stopping render queue…");
  }, [setStatus]);

  if (!open) return null;

  return (
    <div className="spx-panel-host rfp-panel">
      <div className="spx-panel-host__header">
        <span className="spx-panel-host__title">RENDER FARM</span>
        <button className="spx-panel-host__close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="spx-panel-host__body">
        {/* Stats summary */}
        <Section title="Queue Status" accent="yellow">
          <div className="rfp-stats-row">
            <div className="rfp-stat">
              <span className="rfp-stat__label">Total</span>
              <span className="rfp-stat__val">{stats.total || 0}</span>
            </div>
            <div className="rfp-stat">
              <span className="rfp-stat__label">Pending</span>
              <span className="rfp-stat__val">{stats.pending || 0}</span>
            </div>
            <div className="rfp-stat">
              <span className="rfp-stat__label">Done</span>
              <span className="rfp-stat__val">{stats.done || 0}</span>
            </div>
            <div className="rfp-stat">
              <span className="rfp-stat__label">Failed</span>
              <span className="rfp-stat__val">{stats.failed || 0}</span>
            </div>
          </div>
          {running && activeJobId !== null && (
            <div className="rfp-progress-wrap">
              <div className="rfp-progress-label">
                Active job {activeJobId}: {Math.round(progress * 100)}%
              </div>
              <div className="rfp-progress-bar">
                <div
                  className="rfp-progress-bar__fill"
                  style={{ width: Math.round(progress * 100) + "%" }}
                />
              </div>
            </div>
          )}
        </Section>

        {/* New-job form */}
        <Section title="Add Render Job" defaultOpen={true}>
          <div className="rfp-form-row">
            <label className="rfp-form-label">Name</label>
            <input
              type="text"
              className="rfp-form-input"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
            />
          </div>

          <div className="rfp-form-row">
            <label className="rfp-form-label">Resolution</label>
            <select
              className="rfp-form-input"
              value={resolutionIdx}
              onChange={(e) => setResolutionIdx(parseInt(e.target.value, 10))}
            >
              {RESOLUTION_PRESETS.map((p, i) => (
                <option key={i} value={i}>
                  {p.label} ({p.w}×{p.h})
                </option>
              ))}
            </select>
          </div>

          <Slider
            label="Tile Size"
            value={tileSize}
            min={64}
            max={1024}
            step={64}
            onChange={setTileSize}
            unit="px"
          />
          <Slider
            label="Samples"
            value={samples}
            min={1}
            max={2048}
            step={1}
            onChange={setSamples}
          />

          <div className="rfp-form-row">
            <label className="rfp-form-label">Format</label>
            <select
              className="rfp-form-input"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>

          <button className="rfp-btn rfp-btn--primary" onClick={handleAddJob}>
            + Add to Queue
          </button>
        </Section>

        {/* Job list */}
        <Section title={"Jobs (" + jobs.length + ")"} defaultOpen={true}>
          {jobs.length === 0 ? (
            <div className="rfp-empty">No jobs queued. Add one above.</div>
          ) : (
            <div className="rfp-jobs-list">
              {jobs.map((job) => (
                <div key={job.id} className="rfp-job-card">
                  <div className="rfp-job-header">
                    <span className="rfp-job-name">{job.name}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="rfp-job-meta">
                    {job.width}×{job.height} • {job.samples} samples • tile {job.tileSize}
                  </div>
                  <div className="rfp-job-actions">
                    {(job.status === JOB_STATUS.PENDING || job.status === JOB_STATUS.RUNNING) && (
                      <button
                        className="rfp-btn rfp-btn--small rfp-btn--cancel"
                        onClick={() => handleCancel(job.id)}
                      >
                        Cancel
                      </button>
                    )}
                    {(job.status === JOB_STATUS.DONE ||
                      job.status === JOB_STATUS.FAILED ||
                      job.status === JOB_STATUS.CANCELLED) && (
                      <button
                        className="rfp-btn rfp-btn--small"
                        onClick={() => handleRemove(job.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Run controls */}
        <Section title="Controls" defaultOpen={true}>
          <div className="rfp-controls-row">
            {!running ? (
              <button
                className="rfp-btn rfp-btn--primary rfp-btn--large"
                onClick={handleRunQueue}
                disabled={jobs.filter((j) => j.status === JOB_STATUS.PENDING).length === 0}
              >
                ▶ Run Queue
              </button>
            ) : (
              <button
                className="rfp-btn rfp-btn--cancel rfp-btn--large"
                onClick={handleStopAll}
              >
                ■ Stop All
              </button>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
