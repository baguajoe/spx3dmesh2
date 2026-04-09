import React, { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { MocapRetargeter } from '../../mesh/MocapRetarget.js';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js';
import '../../styles/mocap-retarget.css';

function Slider({ label, value, min, max, step=0.01, onChange, unit='' }) {
  return (
    <div className="spx-slider-wrap">
      <div className="spx-slider-header">
        <span>{label}</span>
        <span className="spx-slider-header__val">
          {step<0.1 ? Number(value).toFixed(2) : Math.round(value)}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        className="spx-slider-input"
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="mrt-toggle-row">
      <span className="mrt-toggle-label">{label}</span>
      <div
        className={`mrt-toggle${value ? ' mrt-toggle--on' : ''}`}
        onClick={() => onChange(!value)}
      >
        <div className={`mrt-toggle__dot${value ? ' mrt-toggle__dot--on' : ''}`} />
      </div>
    </div>
  );
}

function Section({ title, children, defaultOpen=true, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spx-section">
      <div
        className={`spx-section__hdr${accent ? ` spx-section__hdr--${accent}` : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className={`spx-section__arrow${accent ? ` spx-section__arrow--${accent}` : ''}`}>
          {open ? '▾' : '▸'}
        </span>
        <span className="spx-section__title">{title}</span>
      </div>
      {open && <div className="spx-section__body">{children}</div>}
    </div>
  );
}

export default function MocapRetargetPanel({ sceneRef, open=true, onClose }) {
  const [bvhName,       setBvhName]       = useState('');
  const [targetName,    setTargetName]    = useState('');
  const [playing,       setPlaying]       = useState(false);
  const [frame,         setFrame]         = useState(0);
  const [totalFrames,   setTotalFrames]   = useState(0);
  const [smoothing,     setSmoothing]     = useState(0.6);
  const [scaleBody,     setScaleBody]     = useState(true);
  const [status,        setStatus]        = useState('Load a BVH file');
  const [skeletonNames, setSkeletonNames] = useState([]);

  const retargeterRef = useRef(null);
  const bvhDataRef    = useRef(null);
  const rafRef        = useRef(null);

  const loadBVH = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const loader = new BVHLoader();
        const result = loader.parse(e.target.result);
        bvhDataRef.current = result;
        setBvhName(file.name);
        const frames = result.clip?.tracks?.[0]?.times?.length || 0;
        setTotalFrames(frames);
        setStatus('BVH loaded: ' + frames + ' frames');
      } catch(err) { setStatus('BVH parse error: ' + err.message); }
    };
    reader.readAsText(file);
  }, []);

  const findSkeletons = useCallback(() => {
    const scene = sceneRef?.current; if (!scene) return;
    const names = [];
    scene.traverse(obj => { if (obj.isSkinnedMesh && obj.skeleton) names.push(obj.name || obj.uuid.slice(0,8)); });
    setSkeletonNames(names);
    setStatus(names.length + ' skinned meshes found');
  }, [sceneRef]);

  const bindRetargeter = useCallback(() => {
    const scene = sceneRef?.current; if (!scene) { setStatus('No scene'); return; }
    let targetMesh = null;
    scene.traverse(obj => { if (obj.isSkinnedMesh && !targetMesh) targetMesh = obj; });
    if (!targetMesh) { setStatus('No skinned mesh in scene'); return; }
    const rt = new MocapRetargeter({ smoothing });
    rt.bindTPose(targetMesh.skeleton);
    retargeterRef.current = rt;
    setTargetName(targetMesh.name || 'Mesh');
    setStatus('Bound to: ' + targetMesh.name + ' (' + targetMesh.skeleton.bones.length + ' bones)');
  }, [sceneRef, smoothing]);

  const applyFrame = useCallback((f) => {
    const rt = retargeterRef.current; const bvh = bvhDataRef.current;
    if (!rt || !bvh || !bvh.clip) return;
    const tracks = bvh.clip.tracks;
    const fps = bvh.clip.duration / (totalFrames || 1);
    const time = f * fps;
    if (rt.targetSkeleton) {
      tracks.forEach(track => {
        const boneName = track.name.split('.')[0];
        const prop     = track.name.split('.')[1];
        const bone     = rt.targetSkeleton.bones.find(b => b.name.toLowerCase() === boneName.toLowerCase());
        if (!bone) return;
        const idx = Math.min(Math.floor(time / bvh.clip.duration * track.times.length), track.times.length - 1);
        if (prop === 'quaternion' && track.values.length >= idx*4+4) {
          const q     = new THREE.Quaternion(track.values[idx*4], track.values[idx*4+1], track.values[idx*4+2], track.values[idx*4+3]);
          const tpose = rt.tposeRotations.get(bone.name) || new THREE.Quaternion();
          bone.quaternion.slerpQuaternions(bone.quaternion, tpose.clone().multiply(q), 1 - smoothing);
        } else if (prop === 'position' && track.values.length >= idx*3+3) {
          if (bone.name.toLowerCase().includes('hip') || bone.name.toLowerCase().includes('root')) {
            bone.position.set(track.values[idx*3], track.values[idx*3+1], track.values[idx*3+2]);
          }
        }
      });
    }
  }, [totalFrames, smoothing]);

  const play = useCallback(() => {
    setPlaying(true);
    let f = frame;
    const tick = () => {
      f = (f + 1) % Math.max(1, totalFrames);
      setFrame(f); applyFrame(f);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [frame, totalFrames, applyFrame]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlaying(false);
  }, []);

  if (!open) return null;

  return (
    <div className="spx-float-panel mrt-panel">
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot mrt-dot" />
        <span className="spx-float-panel__title mrt-title">MOCAP RETARGET</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="mrt-status">{status}</div>

      <div className="spx-float-panel__body">
        <Section title="BVH SOURCE" accent="purple">
          <label className="spx-upload-zone">
            <input
              type="file" accept=".bvh"
              className="spx-file-input-hidden"
              onChange={e => e.target.files[0] && loadBVH(e.target.files[0])}
            />
            {bvhName ? '✓ ' + bvhName : '📁 Load BVH File'}
          </label>
          {totalFrames > 0 && <div className="mrt-frames">{totalFrames} frames loaded</div>}
        </Section>

        <Section title="TARGET SKELETON">
          <button className="mrt-scan-btn" onClick={findSkeletons}>SCAN SCENE FOR SKELETONS</button>
          {skeletonNames.map(n => (
            <div
              key={n}
              className={`mrt-skeleton-item${targetName===n ? ' mrt-skeleton-item--active' : ''}`}
              onClick={() => setTargetName(n)}
            >{n}</div>
          ))}
          <button className="mrt-bind-btn" onClick={bindRetargeter}>BIND T-POSE</button>
        </Section>

        <Section title="PLAYBACK" accent="orange">
          <Slider label="SMOOTHING" value={smoothing} min={0} max={0.99} step={0.01} onChange={setSmoothing} />
          <Toggle label="SCALE BODY" value={scaleBody} onChange={setScaleBody} />
          {totalFrames > 0 && (
            <>
              <input
                type="range" min={0} max={Math.max(0, totalFrames-1)} step={1} value={frame}
                className="spx-slider-input mrt-scrubber"
                onChange={e => { const f=parseInt(e.target.value); setFrame(f); applyFrame(f); }}
              />
              <div className="mrt-frame-count">Frame {frame} / {totalFrames}</div>
            </>
          )}
          <div className="mrt-playback-btns">
            {!playing
              ? <button className="mrt-play-btn" onClick={play}>▶ PLAY</button>
              : <button className="mrt-stop-btn" onClick={stop}>■ STOP</button>
            }
            <button className="mrt-reset-btn" onClick={() => { setFrame(0); applyFrame(0); }}>↺ RESET</button>
          </div>
        </Section>
      </div>
    </div>
  );
}
