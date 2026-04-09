// MocapWorkspace.jsx — SPX Full-body MoCap Workspace
// Tabs: Live Capture | Video MoCap | Playback
// Wired: MultiPersonMocap, DepthEstimator, MocapRetargeter, Kalman/OneEuro/EMA smoothing

import React, { useState, useRef, useCallback, useEffect } from 'react';
import AvatarRigPlayer3D from '../../front/js/component/AvatarRigPlayer3D.jsx';
import VideoMocapSystem  from '../../front/js/component/VideoMocapSystem.jsx';
import useFaceMocap      from '../../front/js/hooks/useFaceMocap.js';
import useHandMocap      from '../../front/js/hooks/useHandMocap.js';
import { createSmoothingPipeline } from '../../front/js/utils/smoothPose.js';
import { downloadBVH, MocapRetargeter } from '../../mesh/MocapRetarget.js';
import { solveFootPlanting, getFootPlantStats } from '../../mesh/FootPlantSolver.js';
import { MultiPersonMocap } from '../../mesh/MultiPersonMocap.js';
import { DepthEstimator } from '../../mesh/DepthEstimator.js';
import '../../front/styles/VideoMocap.css';
import '../../styles/mocap-workspace.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

const SMOOTHER_OPTIONS = [
  { value: 'ONE_EURO', label: 'One Euro (fast motion)' },
  { value: 'KALMAN',   label: 'Kalman (precise/slow)' },
  { value: 'EMA',      label: 'EMA (lightweight)' },
  { value: 'RAW',      label: 'Raw (no filter)' },
];

const SMOOTHER_PRESETS = {
  ONE_EURO: { minCutoff: 1.0, beta: 0.007 },
  KALMAN:   { processNoise: 0.001, measurementNoise: 0.1 },
  EMA:      { alpha: 0.7 },
  RAW:      {},
};

const loadScript = (src) =>
  new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error(`Failed: ${src}`));
    document.head.appendChild(s);
  });

const POSE_CONN = [
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [11,23],[12,24],[23,24],[23,25],[24,26],
  [25,27],[26,28],[27,29],[28,30],[29,31],[30,32],
];
const HAND_CONN = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
  [13,17],[0,17],[17,18],[18,19],[19,20],
];
const PERSON_COLORS = ['#00ffc8','#FF6600','#4fc3f7','#f06292'];

function drawSkeleton(ctx, lms, w, h, color = '#00ffc8') {
  if (!lms) return;
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  POSE_CONN.forEach(([a, b]) => {
    const A = lms[a], B = lms[b];
    if (!A || !B || (A.visibility ?? 1) < 0.3 || (B.visibility ?? 1) < 0.3) return;
    ctx.beginPath(); ctx.moveTo(A.x * w, A.y * h); ctx.lineTo(B.x * w, B.y * h); ctx.stroke();
  });
  lms.forEach(lm => {
    if ((lm.visibility ?? 1) < 0.3) return;
    ctx.beginPath(); ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6600'; ctx.fill();
  });
}

function drawHands(ctx, left, right, w, h) {
  [[left, '#a78bfa'], [right, '#f472b6']].forEach(([lms, color]) => {
    if (!lms) return;
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    HAND_CONN.forEach(([a, b]) => {
      if (!lms[a] || !lms[b]) return;
      ctx.beginPath(); ctx.moveTo(lms[a].x * w, lms[a].y * h);
      ctx.lineTo(lms[b].x * w, lms[b].y * h); ctx.stroke();
    });
    lms.forEach(lm => {
      ctx.beginPath(); ctx.arc(lm.x * w, lm.y * h, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    });
  });
}

function drawFace(ctx, lms, w, h) {
  if (!lms) return;
  ctx.fillStyle = 'rgba(0,255,200,0.35)';
  lms.forEach(lm => { ctx.beginPath(); ctx.arc(lm.x * w, lm.y * h, 1, 0, Math.PI * 2); ctx.fill(); });
}

function drawDepthMap(ctx, depthMap, w, h) {
  if (!depthMap) return;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = depthMap.width; tempCanvas.height = depthMap.height;
  const tCtx = tempCanvas.getContext('2d');
  const imgData = tCtx.createImageData(depthMap.width, depthMap.height);
  for (let i = 0; i < depthMap.data.length; i++) {
    const v = Math.floor(depthMap.data[i] * 180);
    imgData.data[i*4]   = v;
    imgData.data[i*4+1] = Math.floor(v * 0.5);
    imgData.data[i*4+2] = 255 - v;
    imgData.data[i*4+3] = 120;
  }
  tCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0, w, h);
}

function MetricBar({ label, value = 0, color = '#00ffc8' }) {
  return (
    <div className="mw-metric">
      <span className="mw-metric-label">{label}</span>
      <div className="mw-metric-track">
        <div className="mw-metric-fill" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
      </div>
      <span className="mw-metric-val">{Math.round(value * 100)}%</span>
    </div>
  );
}

function Chip({ on, label }) {
  return (
    <span className={`mw-chip ${on ? 'mw-chip--on' : 'mw-chip--off'}`}>
      <span className="mw-chip-dot" />{label}
    </span>
  );
}

function SectionLabel({ children, style }) {
  return <div className="mw-section-label" style={style}>{children}</div>;
}

// ══════════════════════════════════════════════════════════════
// LIVE CAPTURE TAB
// ══════════════════════════════════════════════════════════════
function LiveCaptureTab({ onExportGlb }) {
  const videoRef       = useRef(null);
  const overlayRef     = useRef(null);
  const poseRef        = useRef(null);
  const cameraRef      = useRef(null);
  const pipelineRef    = useRef(null);
  const retargeterRef  = useRef(null);
  const multiMocapRef  = useRef(null);
  const depthRef       = useRef(null);
  const recordingRef   = useRef([]);
  const startTimeRef   = useRef(null);
  const fpsRef         = useRef({ frames: 0, last: performance.now() });
  const depthMapRef    = useRef(null);

  const [liveFrame,       setLiveFrame]       = useState(null);
  const [isCapturing,     setIsCapturing]     = useState(false);
  const [isRecording,     setIsRecording]     = useState(false);
  const [recordedFrames,  setRecordedFrames]  = useState(null);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [fps,             setFps]             = useState(0);
  const [landmarkCount,   setLandmarkCount]   = useState(0);
  const [smootherType,    setSmootherType]    = useState('ONE_EURO');
  const [trackFace,       setTrackFace]       = useState(true);
  const [trackHands,      setTrackHands]      = useState(true);
  const [showOverlay,     setShowOverlay]     = useState(true);
  const [avatarUrl,       setAvatarUrl]       = useState('/ybot.glb');
  const [error,           setError]           = useState(null);

  // New systems
  const [multiPerson,     setMultiPerson]     = useState(false);
  const [personCount,     setPersonCount]     = useState(1);
  const [multiSkeletons,  setMultiSkeletons]  = useState([]);
  const [depthEnabled,    setDepthEnabled]    = useState(false);
  const [depthReady,      setDepthReady]      = useState(false);
  const [showDepthMap,    setShowDepthMap]    = useState(false);
  const [retargetEnabled, setRetargetEnabled] = useState(false);
  const [retargetStats,   setRetargetStats]   = useState(null);
  const [footPlant,       setFootPlant]       = useState(true);
  const [footPlantStats,  setFootPlantStats]  = useState(null);
  const [modelComplexity, setModelComplexity] = useState(1);
  const [minDetect,       setMinDetect]       = useState(0.5);
  const [minTrack,        setMinTrack]        = useState(0.5);

  const { faceFrame, status: faceStatus, start: startFace, stop: stopFace } = useFaceMocap(videoRef, trackFace);
  const { handData,  status: handStatus, start: startHands, stop: stopHands } = useHandMocap(videoRef, trackHands);

  // Rebuild smoother when type changes
  useEffect(() => {
    const preset = SMOOTHER_PRESETS[smootherType] ?? {};
    pipelineRef.current = smootherType === 'RAW' ? null : createSmoothingPipeline(smootherType, preset);
  }, [smootherType]);

  // Init depth estimator
  useEffect(() => {
    if (!depthEnabled) return;
    if (depthRef.current) return;
    const estimator = new DepthEstimator({ onReady: () => setDepthReady(true) });
    estimator.init();
    depthRef.current = estimator;
    return () => { depthRef.current?.dispose(); depthRef.current = null; setDepthReady(false); };
  }, [depthEnabled]);

  // Canvas overlay RAF
  useEffect(() => {
    const canvas = overlayRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    let rafId;
    const loop = () => {
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      if (showOverlay && isCapturing) {
        if (showDepthMap && depthMapRef.current) drawDepthMap(ctx, depthMapRef.current, w, h);
        if (multiPerson && multiSkeletons.length > 0) {
          multiSkeletons.forEach((skel, i) => drawSkeleton(ctx, skel.landmarks, w, h, PERSON_COLORS[i % 4]));
        } else {
          drawSkeleton(ctx, liveFrame?.landmarks, w, h);
        }
        if (trackHands) drawHands(ctx, handData?.leftHand, handData?.rightHand, w, h);
        if (trackFace)  drawFace(ctx, faceFrame?.landmarks, w, h);
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [liveFrame, handData, faceFrame, showOverlay, isCapturing, trackFace, trackHands,
      multiPerson, multiSkeletons, showDepthMap]);

  const handlePoseResults = useCallback(async (results) => {
    if (!results.poseLandmarks) return;
    let lms = results.poseLandmarks;

    // Smooth
    if (pipelineRef.current?.smooth) lms = pipelineRef.current.smooth(lms);

    // Depth estimation — lift z coordinate
    if (depthEnabled && depthRef.current?.ready && videoRef.current) {
      try {
        const dm = await depthRef.current.estimateDepth(videoRef.current);
        if (dm) {
          depthMapRef.current = dm;
          lms = depthRef.current.liftPoseTo3D(lms, dm);
        }
      } catch(e) {}
    }

    const now = performance.now() / 1000;
    const frame = {
      landmarks:  lms,
      timestamp:  now,
      jawOpen:    faceFrame?.jawOpen,
      leftBlink:  faceFrame?.leftEyeOpen  != null ? 1 - faceFrame.leftEyeOpen  : undefined,
      rightBlink: faceFrame?.rightEyeOpen != null ? 1 - faceFrame.rightEyeOpen : undefined,
      browRaise:  faceFrame?.leftBrowRaise,
      handData:   handData || undefined,
    };

    setLiveFrame(frame);

    fpsRef.current.frames++;
    const elapsed = now - fpsRef.current.last;
    if (elapsed >= 1.0) {
      setFps(Math.round(fpsRef.current.frames / elapsed));
      fpsRef.current = { frames: 0, last: now };
    }
    setLandmarkCount(lms.filter(lm => (lm.visibility ?? 1) > 0.5).length);

    if (isRecording && startTimeRef.current) {
      const t = (performance.now() - startTimeRef.current) / 1000;
      recordingRef.current.push({
        time: t, landmarks: lms.map(l => ({ ...l })),
        jawOpen: frame.jawOpen, leftBlink: frame.leftBlink,
        rightBlink: frame.rightBlink, browRaise: frame.browRaise,
      });
    }
  }, [faceFrame, handData, isRecording, depthEnabled]);

  // Multi-person pose callback
  const handleMultiPoses = useCallback((skeletons) => {
    setMultiSkeletons(skeletons);
    setPersonCount(skeletons.length);
    if (skeletons.length > 0) {
      let lms = skeletons[0].landmarks;
      if (pipelineRef.current?.smooth) lms = pipelineRef.current.smooth(lms);
      const now = performance.now() / 1000;
      setLiveFrame({ landmarks: lms, timestamp: now, handData: handData || undefined });
      if (isRecording && startTimeRef.current) {
        recordingRef.current.push({
          time: (performance.now() - startTimeRef.current) / 1000,
          landmarks: lms.map(l => ({ ...l })),
          multiSkeletons: skeletons.map(s => ({ id: s.id, landmarks: s.landmarks })),
        });
      }
    }
  }, [handData, isRecording]);

  const startCapture = useCallback(async () => {
    setError(null);
    pipelineRef.current?.reset?.();
    try {
      if (multiPerson) {
        // Use MultiPersonMocap system
        const mp = new MultiPersonMocap(videoRef.current, overlayRef.current, {
          maxPersons: 4,
          onPosesUpdate: handleMultiPoses,
        });
        await mp.start();
        multiMocapRef.current = mp;

        // Still need camera stream for video element
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } else {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');

        const pose = new window.Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
        pose.setOptions({
          modelComplexity,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: minDetect,
          minTrackingConfidence: minTrack,
        });
        pose.onResults(handlePoseResults);
        poseRef.current = pose;

        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => { await poseRef.current?.send({ image: videoRef.current }); },
          width: 640, height: 480,
        });
        await camera.start();
        cameraRef.current = camera;
      }

      if (trackFace)  startFace();
      if (trackHands) startHands();
      setIsCapturing(true);
    } catch (err) { setError(`Camera error: ${err.message}`); }
  }, [handlePoseResults, handleMultiPoses, trackFace, trackHands, startFace, startHands,
      multiPerson, modelComplexity, minDetect, minTrack]);

  const stopCapture = useCallback(() => {
    cameraRef.current?.stop(); cameraRef.current = null;
    poseRef.current?.close();  poseRef.current = null;
    multiMocapRef.current?.dispose(); multiMocapRef.current = null;
    if (videoRef.current) { videoRef.current.srcObject?.getTracks?.().forEach(t => t.stop()); videoRef.current.srcObject = null; }
    stopFace(); stopHands();
    setIsCapturing(false); setLiveFrame(null); setFps(0); setLandmarkCount(0);
    setMultiSkeletons([]); setPersonCount(1); depthMapRef.current = null;
  }, [stopFace, stopHands]);

  const startRecording = useCallback(() => {
    recordingRef.current = []; startTimeRef.current = performance.now(); setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false); setRecordedFrames([...recordingRef.current]); recordingRef.current = [];
  }, []);

  const processFramesForExport = useCallback((frames) => {
    if (!footPlant) return frames;
    const fixed = solveFootPlanting(frames);
    setFootPlantStats(getFootPlantStats(fixed));
    return fixed;
  }, [footPlant]);

  const exportJSON = useCallback(() => {
    if (!recordedFrames?.length) return;
    const frames = processFramesForExport(recordedFrames);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ frames }, null, 2)], { type: 'application/json' }));
    a.download = `mocap_${Date.now()}.json`; a.click();
  }, [recordedFrames, processFramesForExport]);

  const saveToBackend = useCallback(async () => {
    if (!recordedFrames?.length) return;
    try {
      const res = await fetch(`${BACKEND}/api/save-motion-session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames: recordedFrames, session_name: `Session ${new Date().toLocaleString()}` }),
      });
      const d = await res.json();
      alert(res.ok ? `Saved — ID: ${d.id}` : `Error: ${d.error}`);
    } catch (err) { alert(err.message); }
  }, [recordedFrames]);

  useEffect(() => () => stopCapture(), [stopCapture]);

  return (
    <div className="mw-live">
      <div className="mw-left">
        {/* Camera feed */}
        <div className="mw-cam-wrap">
          <video ref={videoRef} className="mw-cam" autoPlay muted playsInline style={{ transform: 'scaleX(-1)' }} />
          <canvas ref={overlayRef} className="mw-cam-overlay" style={{ transform: 'scaleX(-1)' }} />
          {isCapturing && (
            <div className="mw-hud">
              <span className={`mw-hud-dot ${landmarkCount > 20 ? 'mw-hud-dot--good' : 'mw-hud-dot--bad'}`} />
              <span>{fps} FPS</span>
              <span>{landmarkCount}/33</span>
              {multiPerson && <span style={{color:'#00ffc8'}}>👥 {personCount}P</span>}
              {depthEnabled && depthReady && <span style={{color:'#4fc3f7'}}>📐 3D</span>}
              {faceStatus === 'running'  && <span>😊</span>}
              {handStatus === 'running'  && <span>🖐</span>}
              {isRecording && <span className="mw-hud-rec">● REC</span>}
            </div>
          )}
          {!isCapturing && <div className="mw-cam-idle">Press Start Capture to begin</div>}
        </div>

        {/* Track toggles */}
        <SectionLabel>Track</SectionLabel>
        <div className="mw-toggle-row">
          {[['🏃 Body', true, null], ['😊 Face', trackFace, setTrackFace], ['🖐 Hands', trackHands, setTrackHands]].map(([lbl, val, set]) => (
            <button key={lbl} className={`mw-track-btn ${val ? 'mw-track-btn--on' : ''}`}
              onClick={() => set && set(v => !v)} disabled={isCapturing || !set}>{lbl}</button>
          ))}
        </div>

        <label className="mw-check">
          <input type="checkbox" checked={showOverlay} onChange={e => setShowOverlay(e.target.checked)} />
          Skeleton overlay
        </label>

        {/* ── NEW: Multi-person ── */}
        <SectionLabel style={{marginTop:10}}>Multi-Person</SectionLabel>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
          <label className="mw-check" style={{margin:0}}>
            <input type="checkbox" checked={multiPerson} onChange={e => setMultiPerson(e.target.checked)} disabled={isCapturing} />
            Track multiple people
          </label>
          {multiPerson && isCapturing && (
            <span style={{fontSize:11,color:'#00ffc8'}}>👥 {personCount} detected</span>
          )}
        </div>
        {multiPerson && isCapturing && multiSkeletons.length > 1 && (
          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:6}}>
            {multiSkeletons.map((s,i) => (
              <span key={s.id} style={{fontSize:10,padding:'2px 6px',borderRadius:3,background:PERSON_COLORS[i]+'22',border:`1px solid ${PERSON_COLORS[i]}`,color:PERSON_COLORS[i]}}>
                P{i+1}
              </span>
            ))}
          </div>
        )}

        {/* ── NEW: Depth Estimation ── */}
        <SectionLabel style={{marginTop:10}}>Depth Estimation</SectionLabel>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
          <label className="mw-check" style={{margin:0}}>
            <input type="checkbox" checked={depthEnabled} onChange={e => setDepthEnabled(e.target.checked)} disabled={isCapturing} />
            MiDaS 3D depth
          </label>
          {depthEnabled && (
            <span style={{fontSize:10,color: depthReady ? '#00ffc8' : '#888'}}>
              {depthReady ? '✓ Ready' : '⟳ Loading...'}
            </span>
          )}
        </div>
        {depthEnabled && (
          <label className="mw-check">
            <input type="checkbox" checked={showDepthMap} onChange={e => setShowDepthMap(e.target.checked)} />
            Show depth overlay
          </label>
        )}

        {/* ── Smoother ── */}
        <SectionLabel style={{marginTop:10}}>Smoother</SectionLabel>
        <select className="mw-select" value={smootherType} onChange={e => setSmootherType(e.target.value)} disabled={isCapturing}>
          {SMOOTHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* ── Model Quality ── */}
        <SectionLabel style={{marginTop:10}}>Model Quality</SectionLabel>
        <div style={{display:'flex',gap:4}}>
          {[['Lite',0],['Full',1],['Heavy',2]].map(([lbl,val]) => (
            <button key={val}
              style={{flex:1,fontSize:10,padding:'3px 0',borderRadius:3,cursor:'pointer',
                background: modelComplexity===val ? '#00ffc822' : '#0a1628',
                border: `1px solid ${modelComplexity===val ? '#00ffc8' : '#1a2a3a'}`,
                color: modelComplexity===val ? '#00ffc8' : '#888'}}
              onClick={() => setModelComplexity(val)} disabled={isCapturing}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ── Retargeting ── */}
        <SectionLabel style={{marginTop:10}}>Retargeting</SectionLabel>
        <label className="mw-check">
          <input type="checkbox" checked={retargetEnabled} onChange={e => setRetargetEnabled(e.target.checked)} />
          Enable bone retargeting
        </label>
        {retargetEnabled && (
          <div style={{fontSize:10,color:'#888',marginTop:4,lineHeight:1.5}}>
            Load a GLB avatar below to auto-bind T-pose and retarget
            {retargetStats && (
              <div style={{color:'#00ffc8',marginTop:2}}>
                ✓ {retargetStats.boundBones} bones bound · smoothing {Math.round(retargetStats.smoothing*100)}%
              </div>
            )}
          </div>
        )}

        {/* ── NEW: Foot Plant ── */}
        <SectionLabel style={{marginTop:10}}>Foot Plant Fix</SectionLabel>
        <label className="mw-check">
          <input type="checkbox" checked={footPlant} onChange={e => setFootPlant(e.target.checked)} />
          Auto foot plant IK (fixes floating feet)
        </label>
        {footPlant && footPlantStats && (
          <div style={{fontSize:10,color:'#888',marginTop:4,lineHeight:1.6}}>
            Ground Y: {Number(footPlantStats.groundY).toFixed(3)}<br/>
            L planted: {footPlantStats.leftPlantedFrames} fr ({Math.round(footPlantStats.leftPlantRatio*100)}%)<br/>
            R planted: {footPlantStats.rightPlantedFrames} fr ({Math.round(footPlantStats.rightPlantRatio*100)}%)
          </div>
        )}
        {footPlant && !footPlantStats && (
          <div style={{fontSize:10,color:'#555',marginTop:2}}>Applied on export / BVH download</div>
        )}

        {/* Avatar */}
        <SectionLabel style={{marginTop:10}}>Avatar</SectionLabel>
        <div style={{display:'flex',gap:4,marginBottom:6,flexWrap:'wrap'}}>
          {[{label:'Y Bot', url:'/ybot.glb'}].map(p => (
            <button key={p.label}
              style={{fontSize:10,padding:'3px 8px',background:avatarUrl===p.url?'#00ffc822':'#0a1628',
                border:`1px solid ${avatarUrl===p.url?'#00ffc8':'#1a2a3a'}`,
                color:avatarUrl===p.url?'#00ffc8':'#888',borderRadius:3,cursor:'pointer'}}
              onClick={() => setAvatarUrl(p.url)}>{p.label}</button>
          ))}
          <label style={{fontSize:10,padding:'3px 8px',background:'#0a1628',border:'1px solid #1a2a3a',color:'#888',borderRadius:3,cursor:'pointer'}}>
            📂 Upload GLB
            <input type="file" accept=".glb,.gltf" style={{display:'none'}} onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              setAvatarUrl(URL.createObjectURL(f));
            }} />
          </label>
        </div>
        <input className="mw-input" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="GLB URL or path" />

        {/* Capture buttons */}
        <div className="mw-btn-row" style={{marginTop:8}}>
          {!isCapturing
            ? <button className="mw-btn mw-btn--primary" onClick={startCapture}>▶ Start Capture</button>
            : <button className="mw-btn mw-btn--danger"  onClick={stopCapture}>■ Stop</button>
          }
          {isCapturing && !isRecording && <button className="mw-btn mw-btn--rec" onClick={startRecording}>⏺ Record</button>}
          {isRecording                  && <button className="mw-btn mw-btn--danger" onClick={stopRecording}>⏹ Stop Rec</button>}
        </div>

        {recordedFrames?.length > 0 && (
          <div className="mw-btn-row" style={{flexWrap:'wrap'}}>
            <button className="mw-btn" onClick={() => setIsPlaying(p => !p)}>{isPlaying ? '⏹ Stop' : '▶ Play'}</button>
            <button className="mw-btn" onClick={exportJSON}>💾 JSON</button>
            <button className="mw-btn" onClick={() => downloadBVH(processFramesForExport(recordedFrames), `mocap_${Date.now()}.bvh`)}>📐 BVH</button>
            <button className="mw-btn" onClick={saveToBackend}>☁ Save</button>
            {onExportGlb && <button className="mw-btn" onClick={onExportGlb}>📦 GLB</button>}
          </div>
        )}

        {error && <div className="mw-error">{error}</div>}

        {/* Face metrics */}
        {isCapturing && faceFrame && (
          <div className="mw-metrics">
            <SectionLabel>Face Metrics</SectionLabel>
            <MetricBar label="Jaw Open"   value={faceFrame.jawOpen ?? 0}            color="#00ffc8" />
            <MetricBar label="L Blink"    value={1-(faceFrame.leftEyeOpen ?? 1)}    color="#a78bfa" />
            <MetricBar label="R Blink"    value={1-(faceFrame.rightEyeOpen ?? 1)}   color="#a78bfa" />
            <MetricBar label="Brow Raise" value={faceFrame.leftBrowRaise ?? 0}      color="#f472b6" />
          </div>
        )}
        {isCapturing && handData && (handData.leftHand || handData.rightHand) && (
          <div className="mw-metrics">
            <SectionLabel>Hand Metrics</SectionLabel>
            {handData.leftHand  && <MetricBar label="L Pinch" value={handData.pinchLeft}  color="#f472b6" />}
            {handData.rightHand && <MetricBar label="R Pinch" value={handData.pinchRight} color="#fb923c" />}
          </div>
        )}

        <div className="mw-status-row">
          <Chip on={isCapturing}            label="Body"   />
          <Chip on={faceStatus==='running'}  label="Face"   />
          <Chip on={handStatus==='running'}  label="Hands"  />
          <Chip on={multiPerson&&isCapturing} label={`${personCount}P`} />
          <Chip on={depthEnabled&&depthReady} label="3D"   />
        </div>
      </div>

      {/* Avatar viewport */}
      <div className="mw-avatar-wrap">
        <div className="mw-avatar-label">
          Live Avatar Preview
          {isPlaying && <span className="mw-avatar-sub"> — playback {recordedFrames?.length} frames</span>}
          {multiPerson && multiSkeletons.length > 1 && <span className="mw-avatar-sub"> — {personCount} people</span>}
          {depthEnabled && depthReady && <span className="mw-avatar-sub" style={{color:'#4fc3f7'}}> — depth 3D</span>}
        </div>
        <div className="mw-avatar-viewport">
          {avatarUrl ? (
            <AvatarRigPlayer3D
              avatarUrl={avatarUrl}
              liveFrame={isPlaying ? null : liveFrame}
              recordedFrames={isPlaying ? recordedFrames : null}
              smoothingEnabled={false}
            />
          ) : <div className="mw-avatar-empty">⟳ Loading avatar...</div>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PLAYBACK TAB
// ══════════════════════════════════════════════════════════════
function PlaybackTab({ onExportGlb }) {
  const [frames,    setFrames]    = useState(null);
  const [sessions,  setSessions]  = useState([]);
  const [activeId,  setActiveId]  = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIdx,   setPlayIdx]   = useState(0);
  const [speed,     setSpeed]     = useState(1);
  const [avatarUrl, setAvatarUrl] = useState('/ybot.glb');
  const intervalRef = useRef(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/motion-sessions`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setSessions(d.sessions || []))
      .catch(() => {});
  }, []);

  const loadFile = useCallback((e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { const d = JSON.parse(ev.target.result); setFrames(d.frames || d); setPlayIdx(0); setActiveId('file:' + file.name); }
      catch { alert('Invalid JSON'); }
    };
    reader.readAsText(file);
  }, []);

  const loadSession = useCallback(async (id) => {
    try {
      const d = await fetch(`${BACKEND}/api/motion-sessions/${id}`).then(r => r.json());
      setFrames(d.frames || d.session?.frames || []);
      setPlayIdx(0); setActiveId(id);
    } catch (err) { alert(err.message); }
  }, []);

  useEffect(() => {
    if (!isPlaying || !frames?.length) return;
    intervalRef.current = setInterval(() => {
      setPlayIdx(i => { const n = i + 1; if (n >= frames.length) { setIsPlaying(false); return 0; } return n; });
    }, 1000 / 30 / speed);
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, frames, speed]);

  const current = frames?.[playIdx] || null;

  return (
    <div className="mw-live">
      <div className="mw-left">
        <SectionLabel>Load Session</SectionLabel>
        <label className="mw-btn mw-btn--ghost mw-file-btn">
          📂 Import JSON
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={loadFile} />
        </label>

        {sessions.length > 0 && (
          <>
            <SectionLabel style={{ marginTop: '12px' }}>Saved Sessions</SectionLabel>
            <div className="mw-session-list">
              {sessions.map(s => (
                <button key={s.id} className={`mw-session-item ${activeId === s.id ? 'mw-session-item--active' : ''}`} onClick={() => loadSession(s.id)}>
                  <span>{s.session_name || `Session ${s.id}`}</span>
                  <span className="mw-session-meta">{s.frame_count} fr</span>
                </button>
              ))}
            </div>
          </>
        )}

        {frames && (
          <>
            <SectionLabel style={{ marginTop: '12px' }}>Playback</SectionLabel>
            <div className="mw-btn-row">
              <button className="mw-btn mw-btn--primary" onClick={() => setIsPlaying(p => !p)}>
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button className="mw-btn" onClick={() => { setIsPlaying(false); setPlayIdx(0); }}>⏮</button>
            </div>
            <div style={{ marginTop: '8px' }}>
              <div className="mw-frame-label">Frame {playIdx} / {frames.length - 1}</div>
              <input type="range" className="mw-range" min={0} max={frames.length - 1} value={playIdx}
                onChange={e => { setIsPlaying(false); setPlayIdx(Number(e.target.value)); }} />
            </div>
            <SectionLabel>Speed</SectionLabel>
            <select className="mw-select" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))}>
              <option value={0.25}>0.25×</option>
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
            </select>
            <button className="mw-btn" style={{marginTop:6,width:'100%'}}
              onClick={() => downloadBVH(frames, `session_${activeId}_${Date.now()}.bvh`)}>
              📐 Export BVH
            </button>
            {onExportGlb && <button className="mw-btn mw-btn--ghost" style={{ marginTop: '4px',width:'100%' }} onClick={onExportGlb}>📦 Export GLB</button>}
          </>
        )}

        <SectionLabel style={{ marginTop: '16px' }}>Avatar GLB</SectionLabel>
        <input className="mw-input" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
      </div>

      <div className="mw-avatar-wrap">
        <div className="mw-avatar-label">
          Playback{activeId && <span className="mw-avatar-sub"> — {activeId}</span>}
        </div>
        <div className="mw-avatar-viewport">
          {frames
            ? <AvatarRigPlayer3D avatarUrl={avatarUrl} liveFrame={current} smoothingEnabled={false} />
            : <div className="mw-avatar-empty">Load a session or import JSON to preview</div>
          }
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
export default function MocapWorkspace({ open = false, onClose = null, onExportGlb = null }) {
  const [tab, setTab] = useState('live');
  if (!open) return null;

  return (
    <div className="mw-float">
      <div className="mw-panel">
        <div className="mw-header">
          <div className="mw-header-left">
            <span className="mw-logo">SPX</span>
            <strong>MoCap Workspace</strong>
            <span className="mw-header-sub">full-body · face · hands · multi-person · depth · retarget</span>
          </div>
          <div className="mw-tabs">
            {[['live','🎥 Live'],['video','📹 Video'],['playback','▶ Playback']].map(([id, lbl]) => (
              <button key={id} className={`mw-tab ${tab === id ? 'mw-tab--active' : ''}`} onClick={() => setTab(id)}>{lbl}</button>
            ))}
          </div>
          <button className="mw-close" onClick={onClose}>✕</button>
        </div>
        <div className="mw-body">
          {tab === 'live'     && <LiveCaptureTab onExportGlb={onExportGlb} />}
          {tab === 'video'    && <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}><VideoMocapSystem /></div>}
          {tab === 'playback' && <PlaybackTab onExportGlb={onExportGlb} />}
        </div>
      </div>
    </div>
  );
}
