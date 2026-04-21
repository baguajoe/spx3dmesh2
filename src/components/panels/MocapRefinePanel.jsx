import React, { useEffect, useState, useCallback } from "react";

function Slider({ label, value, min, max, step = 0.01, onChange }) {
  return (
    <div className="spx-slider-wrap">
      <div className="spx-slider-header">
        <span>{label}</span>
        <span className="spx-slider-header__val">
          {typeof value === "number" ? value.toFixed(step < 0.1 ? 2 : 0) : value}
        </span>
      </div>
      <input
        className="spx-slider-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default function MocapRefinePanel({ open, onClose, meshRef, setStatus }) {
  const [smoothing, setSmoothing] = useState(0.55);
  const [exaggeration, setExaggeration] = useState(1.0);
  const [noiseCleanup, setNoiseCleanup] = useState(0.45);
  const [smileStrength, setSmileStrength] = useState(1.0);
  const [blinkStrength, setBlinkStrength] = useState(1.0);
  const [jawIntensity, setJawIntensity] = useState(1.0);
  const [angerStrength, setAngerStrength] = useState(0.5);

  const applyRefinement = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh) return;

    mesh.userData.mocapRefine = {
      smoothing,
      exaggeration,
      noiseCleanup,
      smileStrength,
      blinkStrength,
      jawIntensity,
      angerStrength
    };

    if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      const dict = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;

      const trySet = (names, value) => {
        for (const n of names) {
          if (dict[n] !== undefined) {
            inf[dict[n]] = value;
          }
        }
      };

      trySet(["smile", "Smile", "mouthSmile", "mouthSmileLeft", "mouthSmileRight"], 0.15 * smileStrength * exaggeration);
      trySet(["blink", "Blink", "eyeBlinkLeft", "eyeBlinkRight"], 0.08 * blinkStrength);
      trySet(["jawOpen", "JawOpen", "mouthOpen"], 0.12 * jawIntensity);
      trySet(["browDownLeft", "browDownRight", "frown", "anger"], 0.08 * angerStrength);
    }

    window.__SPX_MOCAP_REFINE__ = {
      smoothing,
      exaggeration,
      noiseCleanup,
      smileStrength,
      blinkStrength,
      jawIntensity,
      angerStrength
    };

    setStatus?.("Mocap refinement updated");
  }, [meshRef, setStatus, smoothing, exaggeration, noiseCleanup, smileStrength, blinkStrength, jawIntensity, angerStrength]);

  useEffect(() => {
    if (!open) return;
    applyRefinement();
  }, [open, applyRefinement]);

  useEffect(() => {
    if (!open) return;
    applyRefinement();
  }, [smoothing, exaggeration, noiseCleanup, smileStrength, blinkStrength, jawIntensity, angerStrength, open, applyRefinement]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 40 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">MOCAP REFINE</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <Slider label="SMOOTHING" value={smoothing} min={0} max={1} step={0.01} onChange={setSmoothing} />
        <Slider label="EXAGGERATION" value={exaggeration} min={0.25} max={2} step={0.01} onChange={setExaggeration} />
        <Slider label="NOISE CLEANUP" value={noiseCleanup} min={0} max={1} step={0.01} onChange={setNoiseCleanup} />
        <Slider label="SMILE STRENGTH" value={smileStrength} min={0} max={2} step={0.01} onChange={setSmileStrength} />
        <Slider label="BLINK STRENGTH" value={blinkStrength} min={0} max={2} step={0.01} onChange={setBlinkStrength} />
        <Slider label="JAW INTENSITY" value={jawIntensity} min={0} max={2} step={0.01} onChange={setJawIntensity} />
        <Slider label="ANGER STRENGTH" value={angerStrength} min={0} max={2} step={0.01} onChange={setAngerStrength} />

        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyRefinement}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
