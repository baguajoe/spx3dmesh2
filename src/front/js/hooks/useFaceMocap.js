// useFaceMocap.js — MediaPipe FaceMesh hook (CDN-loaded)
// Provides: jawOpen, leftEyeOpen, rightEyeOpen, leftBrowRaise, rightBrowRaise, landmarks (468)

import { useEffect, useRef, useState, useCallback } from 'react';

const loadScript = (src) =>
  new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error(`Failed: ${src}`));
    document.head.appendChild(s);
  });

const LM = {
  UPPER_LIP_TOP: 13, LOWER_LIP_BOT: 14,
  LEFT_EYE_TOP: 159, LEFT_EYE_BOT: 145,
  RIGHT_EYE_TOP: 386, RIGHT_EYE_BOT: 374,
  LEFT_EYE_OUTER: 33, LEFT_EYE_INNER: 133,
  RIGHT_EYE_OUTER: 263, RIGHT_EYE_INNER: 362,
  LEFT_BROW_CENTER: 66, RIGHT_BROW_CENTER: 296,
};

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
  const faceMeshRef = useRef(null);
  const cameraRef   = useRef(null);
  const [faceFrame, setFaceFrame] = useState(null);
  const [status, setStatus]       = useState('idle');

  const start = useCallback(async () => {
    if (!enabled || !videoRef?.current) return;
    setStatus('loading');
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');

      const faceMesh = new window.FaceMesh({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      faceMesh.onResults((results) => {
        if (!results.multiFaceLandmarks?.[0]) return;
        const lms     = results.multiFaceLandmarks[0];
        const metrics = extractFaceMetrics(lms);
        setFaceFrame({ ...metrics, landmarks: lms, timestamp: performance.now() / 1000 });
      });
      faceMeshRef.current = faceMesh;

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => { await faceMesh.send({ image: videoRef.current }); },
        width: 640, height: 480,
      });
      await camera.start();
      cameraRef.current = camera;
      setStatus('running');
    } catch (err) {
      console.error('[useFaceMocap]', err);
      setStatus('error');
    }
  }, [enabled, videoRef]);

  const stop = useCallback(() => {
    cameraRef.current?.stop();
    cameraRef.current  = null;
    faceMeshRef.current = null;
    setFaceFrame(null);
    setStatus('idle');
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { faceFrame, status, start, stop };
}
