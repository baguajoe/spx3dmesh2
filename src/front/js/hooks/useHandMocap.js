// useHandMocap.js — MediaPipe Hands hook (CDN-loaded)
// Returns: leftHand (21 lms), rightHand (21 lms), pinchLeft, pinchRight, fistLeft, fistRight

import { useEffect, useRef, useState, useCallback } from 'react';

const loadScript = (src) =>
  new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error(`Failed: ${src}`));
    document.head.appendChild(s);
  });

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
  const handsRef  = useRef(null);
  const cameraRef = useRef(null);
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
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');

      const hands = new window.Hands({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      });
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      hands.onResults((results) => {
        let leftHand = null, rightHand = null;
        let pinchLeft = 0, pinchRight = 0, fistLeft = 0, fistRight = 0;
        (results.multiHandLandmarks || []).forEach((lms, i) => {
          const label   = results.multiHandedness?.[i]?.label;
          const metrics = extractHandMetrics(lms);
          // MediaPipe mirrors: label 'Left' = user's right hand
          if (label === 'Left')  { rightHand = metrics.landmarks; pinchRight = metrics.pinch; fistRight = metrics.fist; }
          if (label === 'Right') { leftHand  = metrics.landmarks; pinchLeft  = metrics.pinch; fistLeft  = metrics.fist; }
        });
        setHandData({ leftHand, rightHand, pinchLeft, pinchRight, fistLeft, fistRight, timestamp: performance.now() / 1000 });
      });
      handsRef.current = hands;

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => { await hands.send({ image: videoRef.current }); },
        width: 640, height: 480,
      });
      await camera.start();
      cameraRef.current = camera;
      setStatus('running');
    } catch (err) {
      console.error('[useHandMocap]', err);
      setStatus('error');
    }
  }, [enabled, videoRef]);

  const stop = useCallback(() => {
    cameraRef.current?.stop();
    cameraRef.current = null;
    handsRef.current  = null;
    setHandData({ leftHand: null, rightHand: null, pinchLeft: 0, pinchRight: 0, fistLeft: 0, fistRight: 0 });
    setStatus('idle');
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { handData, status, start, stop };
}
