// useHandMocap.js — MediaPipe Tasks HandLandmarker hook
// Returns: leftHand (21 lms), rightHand (21 lms), pinchLeft, pinchRight, fistLeft, fistRight
// SPX_MOCAP_TASKS_V1

import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_PATH = '/wasm/mediapipe-tasks';
const MODEL_PATH = '/models/mediapipe/hand_landmarker.task';

function dist3(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function extractHandMetrics(lms) {
  const palmSize = dist3(lms[0], lms[5]);
  const pinch    = 1 - Math.min(1, dist3(lms[4], lms[8]) / (palmSize * 0.6 + 0.001));
  const tucked   = [8, 12, 16, 20].map(i => dist3(lms[i], lms[0]) < palmSize * 0.9 ? 1 : 0);
  const fist     = tucked.reduce((a, b) => a + b, 0) / 4;
  return { pinch: Math.max(0, pinch), fist, landmarks: lms };
}

export default function useHandMocap(videoRef, enabled = true) {
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const [handData, setHandData] = useState({
    leftHand: null, rightHand: null,
    pinchLeft: 0, pinchRight: 0,
    fistLeft: 0,  fistRight: 0,
  });
  const [status, setStatus] = useState('idle');

  const start = useCallback(async () => {
    if (!enabled || !videoRef?.current) return;
    setStatus('loading');
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      const landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      landmarkerRef.current = landmarker;

      const loop = () => {
        if (!landmarkerRef.current || !videoRef.current) return;
        const v = videoRef.current;
        if (v.readyState >= 2) {
          const ts = performance.now();
          try {
            const result = landmarkerRef.current.detectForVideo(v, ts);
            let leftHand = null, rightHand = null;
            let pinchLeft = 0, pinchRight = 0, fistLeft = 0, fistRight = 0;
            (result?.landmarks || []).forEach((lms, i) => {
              const label = result.handedness?.[i]?.[0]?.categoryName;
              const metrics = extractHandMetrics(lms);
              // MediaPipe mirrors: label 'Left' = user's right hand
              if (label === 'Left')  { rightHand = metrics.landmarks; pinchRight = metrics.pinch; fistRight = metrics.fist; }
              if (label === 'Right') { leftHand  = metrics.landmarks; pinchLeft  = metrics.pinch; fistLeft  = metrics.fist; }
            });
            setHandData({ leftHand, rightHand, pinchLeft, pinchRight, fistLeft, fistRight, timestamp: ts / 1000 });
          } catch (e) { /* ignore one-frame errors */ }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
      setStatus('running');
    } catch (err) {
      console.error('[useHandMocap]', err);
      setStatus('error');
    }
  }, [enabled, videoRef]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    setHandData({ leftHand: null, rightHand: null, pinchLeft: 0, pinchRight: 0, fistLeft: 0, fistRight: 0 });
    setStatus('idle');
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { handData, status, start, stop };
}
