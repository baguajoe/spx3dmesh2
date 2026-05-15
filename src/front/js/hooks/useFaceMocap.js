// useFaceMocap.js — MediaPipe Tasks FaceLandmarker hook
// Provides: jawOpen, leftEyeOpen, rightEyeOpen, leftBrowRaise, rightBrowRaise, landmarks (478)
// SPX_MOCAP_TASKS_V1

import { useEffect, useRef, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_PATH = '/wasm/mediapipe-tasks';
const MODEL_PATH = '/models/mediapipe/face_landmarker.task';

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function extractFaceMetrics(lms) {
  const lipDist  = dist(lms[13], lms[14]);
  const eyeWidth = dist(lms[33], lms[133]);
  const jawOpen  = Math.min(1, lipDist / (eyeWidth * 1.5 + 0.001));

  const leftEyeH   = dist(lms[159], lms[145]);
  const rightEyeH  = dist(lms[386], lms[374]);
  const leftEyeW   = dist(lms[33],  lms[133]);
  const rightEyeW  = dist(lms[263], lms[362]);
  const leftEyeOpen  = Math.min(1, leftEyeH  / (leftEyeW  * 0.35 + 0.001));
  const rightEyeOpen = Math.min(1, rightEyeH / (rightEyeW * 0.35 + 0.001));

  const leftBrowRaise  = Math.max(0, Math.min(1, (lms[159].y - lms[66].y)  * 8));
  const rightBrowRaise = Math.max(0, Math.min(1, (lms[386].y - lms[296].y) * 8));

  return { jawOpen, leftEyeOpen, rightEyeOpen, leftBrowRaise, rightBrowRaise };
}

export default function useFaceMocap(videoRef, enabled = true) {
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const [faceFrame, setFaceFrame] = useState(null);
  const [status, setStatus] = useState('idle');

  const start = useCallback(async () => {
    if (!enabled || !videoRef?.current) return;
    setStatus('loading');
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      landmarkerRef.current = landmarker;

      const loop = () => {
        if (!landmarkerRef.current || !videoRef.current) return;
        const v = videoRef.current;
        if (v.readyState >= 2) {
          const ts = performance.now();
          try {
            const result = landmarkerRef.current.detectForVideo(v, ts);
            const lms = result?.faceLandmarks?.[0];
            if (lms) {
              const metrics = extractFaceMetrics(lms);
              setFaceFrame({ ...metrics, landmarks: lms, timestamp: ts / 1000 });
            }
          } catch (e) { /* ignore one-frame errors */ }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
      setStatus('running');
    } catch (err) {
      console.error('[useFaceMocap]', err);
      setStatus('error');
    }
  }, [enabled, videoRef]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    setFaceFrame(null);
    setStatus('idle');
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { faceFrame, status, start, stop };
}
