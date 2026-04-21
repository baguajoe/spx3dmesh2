import React, { useEffect, useState, useCallback } from "react";

export default function RenderQueuePanel({ open, onClose, setStatus }) {
  const [jobs, setJobs] = useState([]);
  const [jobName, setJobName] = useState("");
  const [cameraName, setCameraName] = useState("main");
  const [format, setFormat] = useState("png");

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("__SPX_RENDER_QUEUE__");
      if (raw) setJobs(JSON.parse(raw));
    } catch {}
  }, [open]);

  const persist = useCallback((next) => {
    setJobs(next);
    localStorage.setItem("__SPX_RENDER_QUEUE__", JSON.stringify(next));
  }, []);

  const addJob = useCallback(() => {
    if (!jobName.trim()) return;
    const next = [...jobs, {
      id: Date.now(),
      name: jobName.trim(),
      camera: cameraName,
      format,
      status: "queued"
    }];
    persist(next);
    setJobName("");
    setStatus?.("Render job added");
  }, [jobs, jobName, cameraName, format, persist, setStatus]);

  const removeJob = useCallback((id) => {
    persist(jobs.filter(j => j.id !== id));
  }, [jobs, persist]);

  const runQueue = useCallback(() => {
    const next = jobs.map((j, i) => ({ ...j, status: i === 0 ? "rendered" : "queued" }));
    persist(next);
    window.__SPX_RENDER_QUEUE_RUN__ = next;
    setStatus?.("Render queue simulated");
  }, [jobs, persist, setStatus]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 51 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">RENDER QUEUE</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>
      <div className="spx-float-panel__body">
        <input className="spx-slider-input" placeholder="job name" value={jobName} onChange={(e)=>setJobName(e.target.value)} />
        <select className="spx-slider-input" value={cameraName} onChange={(e)=>setCameraName(e.target.value)} style={{ marginTop: 8 }}>
          <option value="main">main</option>
          <option value="shotA">shotA</option>
          <option value="shotB">shotB</option>
        </select>
        <select className="spx-slider-input" value={format} onChange={(e)=>setFormat(e.target.value)} style={{ marginTop: 8 }}>
          <option value="png">png</option>
          <option value="jpg">jpg</option>
          <option value="exr">exr</option>
        </select>

        <div className="fcam-focal-chips" style={{ marginTop: 10, marginBottom: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={addJob}>ADD JOB</button>
          <button className="fcam-chip" onClick={runQueue}>RUN</button>
        </div>

        <div style={{ display: "grid", gap: 8, maxHeight: 320, overflow: "auto" }}>
          {jobs.map(job => (
            <div key={job.id} className="spx-slider-wrap" style={{ padding: 8 }}>
              <div className="spx-slider-header">
                <span>{job.name}</span>
                <span className="spx-slider-header__val">{job.status}</span>
              </div>
              <div className="fcam-focal-chips" style={{ marginTop: 6 }}>
                <button className="fcam-chip">{job.camera}</button>
                <button className="fcam-chip">{job.format}</button>
                <button className="fcam-chip" onClick={()=>removeJob(job.id)}>REMOVE</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
