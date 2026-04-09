import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';

const S = {
  root: { background:'#06060f', color:'#e0e0e0', fontFamily:'JetBrains Mono,monospace', padding:16, height:'100%', overflowY:'auto' },
  h2: { color:'#00ffc8', fontSize:14, marginBottom:12, letterSpacing:1 },
  label: { fontSize:11, color:'#aaa', display:'block', marginBottom:4 },
  btn: { background:'#00ffc8', color:'#06060f', border:'none', borderRadius:4, padding:'7px 16px', fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:700, cursor:'pointer', marginRight:8, marginBottom:8 },
  btnO: { background:'#FF6600', color:'#fff', border:'none', borderRadius:4, padding:'7px 16px', fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:700, cursor:'pointer', marginRight:8, marginBottom:8 },
  btnRed: { background:'#cc2200', color:'#fff', border:'none', borderRadius:4, padding:'7px 16px', fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:700, cursor:'pointer', marginRight:8, marginBottom:8 },
  section: { background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:6, padding:12, marginBottom:12 },
  stat: { fontSize:11, color:'#00ffc8', marginBottom:4 },
  canvas: { width:'100%', borderRadius:6, border:'1px solid #1a1a2e', background:'#000' },
};

// Maps MediaPipe FaceMesh landmarks to 3D head bone names
const FACE_TO_3D_BONES = {
  'Head':          'head_rotation',
  'Jaw':           'jaw',
  'LeftEye':       'eye_l',
  'RightEye':      'eye_r',
  'LeftBrow':      'brow_l',
  'RightBrow':     'brow_r',
};

function dist(a, b) {
  if (!a || !b) return 0;
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + ((a.z||0)-(b.z||0))**2);
}

/**
 * Drive 3D skeleton bones from FaceMesh landmarks.
 * skeleton: THREE.Skeleton (or object with bones array)
 * lm: MediaPipe FaceMesh landmark array (468 points)
 */
function driveFaceBones(skeleton, lm) {
  if (!skeleton?.bones) return;
  const bones = {};
  skeleton.bones.forEach(b => { bones[b.name] = b; });

  // Head rotation: use nose tip relative to face center
  const headBone = bones['Head'] || bones['CC_Base_Head'] || bones['head'];
  if (headBone && lm[4] && lm[1]) {
    const yaw   = (lm[4].x - 0.5) * Math.PI * 0.6;
    const pitch = (lm[4].y - lm[152]?.y || 0) * Math.PI * 0.4 - 0.1;
    const roll  = ((lm[61]?.y || 0.5) - (lm[291]?.y || 0.5)) * Math.PI * 0.3;
    headBone.rotation.set(pitch, yaw, roll);
  }

  // Jaw open (lower jaw bone)
  const jawBone = bones['Jaw'] || bones['CC_Base_JawRoot'] || bones['jaw'];
  if (jawBone && lm[13] && lm[14]) {
    const open = Math.min(0.4, dist(lm[13], lm[14]) * 8);
    jawBone.rotation.x = open;
  }

  // Eye L
  const eyeLBone = bones['LeftEye'] || bones['CC_Base_L_Eye'] || bones['eye_l'];
  if (eyeLBone && lm[159] && lm[145]) {
    const open = Math.min(1, dist(lm[159], lm[145]) * 12);
    eyeLBone.scale.y = Math.max(0.05, open);
  }

  // Eye R
  const eyeRBone = bones['RightEye'] || bones['CC_Base_R_Eye'] || bones['eye_r'];
  if (eyeRBone && lm[386] && lm[374]) {
    const open = Math.min(1, dist(lm[386], lm[374]) * 12);
    eyeRBone.scale.y = Math.max(0.05, open);
  }

  // Brow L / R — move in Y (up/down)
  const browLBone = bones['LeftBrow'] || bones['brow_l'];
  if (browLBone && lm[105] && lm[159]) {
    browLBone.position.y = (0.5 - lm[105].y) * 0.3;
  }
  const browRBone = bones['RightBrow'] || bones['brow_r'];
  if (browRBone && lm[334] && lm[386]) {
    browRBone.position.y = (0.5 - lm[334].y) * 0.3;
  }
}

export default function VideoFaceMocap3DPanel({ skeleton }) {
  const [mpReady, setMpReady]   = useState(false);
  const [live, setLive]         = useState(false);
  const [recording, setRecording] = useState(false);
  const [frames, setFrames]     = useState(0);
  const [fps, setFps]           = useState(30);
  const [status, setStatus]     = useState('');
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const meshRef   = useRef(null);
  const camRef    = useRef(null);
  const recorded  = useRef([]);
  const startT    = useRef(0);

  useEffect(() => {
    if (window.FaceMesh) { setMpReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
    s.crossOrigin = 'anonymous';
    s.onload = () => setMpReady(true);
    document.head.appendChild(s);
  }, []);

  function setupFaceMesh(videoEl, canvasEl) {
    if (!window.FaceMesh) { setStatus('FaceMesh not loaded'); return null; }
    const fm = new window.FaceMesh({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });
    fm.setOptions({ maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5 });
    fm.onResults(results => {
      const ctx = canvasEl.getContext('2d');
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);
      if (!results.multiFaceLandmarks?.[0]) return;
      const lm = results.multiFaceLandmarks[0];
      // Draw dots
      ctx.fillStyle = '#FF6600';
      lm.forEach(p => { ctx.beginPath(); ctx.arc(p.x*canvasEl.width, p.y*canvasEl.height, 1, 0, Math.PI*2); ctx.fill(); });
      // Drive 3D bones live
      if (skeleton) driveFaceBones(skeleton, lm);
      // Record
      if (recording) {
        const t = (performance.now() - startT.current) / 1000;
        recorded.current.push({ time: Math.round(t*1000)/1000, landmarks: lm.slice(0,50).map(p=>({x:p.x,y:p.y,z:p.z||0})) });
        setFrames(recorded.current.length);
      }
    });
    meshRef.current = fm;
    return fm;
  }

  async function startLive() {
    if (!mpReady) { setStatus('MediaPipe loading…'); return; }
    const canvas = canvasRef.current;
    canvas.width = 480; canvas.height = 360;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{width:480,height:360} });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      const fm = setupFaceMesh(videoRef.current, canvas);
      if (!fm) return;
      if (window.Camera) {
        camRef.current = new window.Camera(videoRef.current, {
          onFrame: async () => { await fm.send({ image: videoRef.current }); },
          width:480, height:360,
        });
        camRef.current.start();
        setLive(true); setStatus('✓ Face mocap driving 3D rig live');
      }
    } catch(e) { setStatus('Camera error: ' + e.message); }
  }

  function stopLive() {
    camRef.current?.stop();
    if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t=>t.stop());
    setLive(false); setStatus('Stopped');
  }

  function startRecord() { recorded.current=[]; startT.current=performance.now(); setRecording(true); setStatus('Recording face anim…'); setFrames(0); }
  function stopRecord() {
    setRecording(false);
    const count = recorded.current.length;
    if (!count) { setStatus('No frames recorded'); return; }
    // Export as .spxmotion
    const motionFrames = recorded.current.map(r => {
      const lm = r.landmarks;
      const jawOpen = lm[13] && lm[14] ? Math.min(1, Math.sqrt((lm[13].x-lm[14].x)**2+(lm[13].y-lm[14].y)**2)*8) : 0;
      const yaw = (lm[4]?.x||0.5 - 0.5) * 60;
      const pitch = ((lm[4]?.y||0) - (lm[152]?.y||0)) * 30 - 10;
      return {
        time: r.time,
        keyframes: {
          'head': { x:320+yaw*2, y:180-pitch*2, rotation: yaw, scale:1 },
          'face_jaw': { x:0, y:0, rotation: jawOpen*20, scale:1 },
        }
      };
    });
    const duration = recorded.current[count-1].time;
    const motion = {
      version:'1.0', format:'spxmotion', name:'face_3d_mocap',
      fps, duration, canvasW:640, canvasH:480,
      bones:['head','face_jaw'], frames: motionFrames,
    };
    const b = new Blob([JSON.stringify(motion,null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download='face_3d_mocap.spxmotion'; a.click();
    setStatus(`✓ face_3d_mocap.spxmotion exported (${count} frames)`);
  }

  return (
    <div style={S.root}>
      <div style={S.h2}>🎭 FACE MOCAP → 3D RIG</div>
      <div style={S.section}>
        <div style={S.stat}>{mpReady ? '✓ FaceMesh loaded' : '⏳ Loading FaceMesh…'}</div>
        {skeleton && <div style={S.stat}>✓ Skeleton connected ({skeleton.bones?.length} bones)</div>}
        <video ref={videoRef} style={{display:'none'}} playsInline muted />
        <canvas ref={canvasRef} style={S.canvas} />
      </div>
      {!live
        ? <button style={S.btn} onClick={startLive}>📷 Start + Drive 3D Rig</button>
        : <button style={S.btnRed} onClick={stopLive}>✕ Stop</button>
      }
      {live && (!recording
        ? <button style={S.btnO} onClick={startRecord}>⏺ Record</button>
        : <button style={S.btnRed} onClick={stopRecord}>⏹ Stop + Export</button>
      )}
      {recording && <div style={S.stat}>Frames: {frames}</div>}
      {status && <div style={{...S.stat,marginTop:8}}>{status}</div>}
      <div style={S.section}>
        <div style={{fontSize:10,color:'#888',lineHeight:1.7}}>
          • Drives Head, Jaw, Eyes, Brows on connected THREE.Skeleton<br/>
          • Supports Mixamo, CC3, iClone bone naming<br/>
          • Records → exports .spxmotion for SPX Puppet import<br/>
          • FPS: {fps} | Landmarks: 468-point MediaPipe FaceMesh
        </div>
      </div>
    </div>
  );
}