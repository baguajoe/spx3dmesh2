import React, { useEffect, useMemo, useRef, useState } from "react";
import useDraggablePanel from "../../hooks/useDraggablePanel.js";
import {
  findLatestRiggedMesh,
  addFingerRig,
  addTwistBones,
  addFacialAutoRig,
  createExpressionLibrary,
  applyExpression,
  smoothWeights,
  mirrorWeights,
  createRetargetPresets,
  applyRetargetPreset,
  bindMocapSkeleton,
  ensureAnimationLibrary,
  runRigAnimationTest,
  createPoseLibrary,
  applyPose,
  createWeightHeatmapData,
  addMuscleHelpers,
  addCorrectiveHelpers,
  upgradeDeformation,
} from "../../mesh/rig/AdvancedRigging.js";

export default function AdvancedRigPanel({
  open = false,
  onClose,
  sceneRef = null,
  setStatus = null,
}) {
  const { beginDrag, style } = useDraggablePanel({ x: 0, y: 0 });
  const rafRef = useRef(null);

  const [expression, setExpression] = useState("smile");
  const [poseId, setPoseId] = useState("pose_a");
  const [retargetPreset, setRetargetPreset] = useState("spx");
  const [animClip, setAnimClip] = useState("idle");
  const [animRunning, setAnimRunning] = useState(false);
  const [heatmapPreview, setHeatmapPreview] = useState("");

  const expressions = useMemo(() => createExpressionLibrary(), []);
  const poses = useMemo(() => createPoseLibrary(), []);
  const retargets = useMemo(() => createRetargetPresets(), []);

  const latestRig = () => findLatestRiggedMesh(sceneRef?.current);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("spx:panel-state", {
        detail: { panel: "advanced_rig", open: !!open },
      })
    );
  }, [open]);

  useEffect(() => {
    if (!animRunning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = (t) => {
      const rig = latestRig();
      if (rig) runRigAnimationTest(rig, animClip, t);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [animRunning, animClip]);

  const needRig = () => {
    const rig = latestRig();
    if (!rig) {
      setStatus?.("No rigged mesh found");
      return null;
    }
    return rig;
  };

  const onFacialRig = () => {
    const rig = needRig();
    if (!rig) return;
    const r = addFacialAutoRig(rig, 1);
    setStatus?.(r.ok ? `Facial rig added (${r.added} bones)` : r.reason);
  };

  const onFingerRig = () => {
    const rig = needRig();
    if (!rig) return;
    const r = addFingerRig(rig, 1);
    setStatus?.(r.ok ? `Finger rig added (${r.added} bones)` : r.reason);
  };

  const onTwistBones = () => {
    const rig = needRig();
    if (!rig) return;
    const r = addTwistBones(rig, 1);
    setStatus?.(r.ok ? `Twist bones added (${r.added})` : r.reason);
  };

  const onMuscles = () => {
    const rig = needRig();
    if (!rig) return;
    const r = addMuscleHelpers(rig);
    setStatus?.(r.ok ? `Muscle helpers added (${r.added})` : r.reason);
  };

  const onCorrectives = () => {
    const rig = needRig();
    if (!rig) return;
    const r = addCorrectiveHelpers(rig);
    setStatus?.(r.ok ? `Corrective helpers added (${r.added})` : r.reason);
  };

  const onUpgradeDeformation = () => {
    const rig = needRig();
    if (!rig) return;
    const r = upgradeDeformation(rig);
    setStatus?.(
      r.ok
        ? `Deformation upgraded: twist ${r.twistAdded}, corrective ${r.correctiveAdded}, muscle ${r.muscleAdded}`
        : "Deformation upgrade failed"
    );
  };

  const onSmoothWeights = () => {
    const rig = needRig();
    if (!rig) return;
    const r = smoothWeights(rig, 2);
    setStatus?.(r.ok ? "Weights smoothed" : r.reason);
  };

  const onMirrorWeights = () => {
    const rig = needRig();
    if (!rig) return;
    const r = mirrorWeights(rig);
    setStatus?.(r.ok ? "Weights mirrored" : r.reason);
  };

  const onRetarget = () => {
    const rig = needRig();
    if (!rig) return;
    const r = applyRetargetPreset(rig, retargetPreset);
    setStatus?.(r.ok ? `Retarget preset applied: ${r.preset}` : r.reason);
  };

  const onMocapBind = () => {
    const rig = needRig();
    if (!rig) return;
    const r = bindMocapSkeleton(rig);
    setStatus?.(r.ok ? "Mocap binding enabled" : r.reason);
  };

  const onAnimLib = () => {
    const rig = needRig();
    if (!rig) return;
    const r = ensureAnimationLibrary(rig);
    setStatus?.(r.ok ? `Animation library ready (${r.count} clips)` : r.reason);
  };

  const onExpression = () => {
    const rig = needRig();
    if (!rig) return;
    const r = applyExpression(rig, expression);
    setStatus?.(r.ok ? `Expression applied: ${expression}` : r.reason);
  };

  const onPose = () => {
    const rig = needRig();
    if (!rig) return;
    const r = applyPose(rig, poseId);
    setStatus?.(r.ok ? `Pose applied: ${poseId}` : r.reason);
  };

  const onHeatmap = () => {
    const rig = needRig();
    if (!rig) return;
    const r = createWeightHeatmapData(rig);
    if (!r.ok) {
      setStatus?.(r.reason);
      return;
    }
    setHeatmapPreview(JSON.stringify(r.points.slice(0, 24), null, 2));
    setStatus?.(`Heatmap generated (${r.points.length} points)`);
  };

  if (!open) return null;

  return (
    <div className="advanced-rig-panel-float" style={{ ...style }}>
      <div className="advanced-rig-panel">
        <div className="advanced-rig-header" onMouseDown={beginDrag}>
          <div>
            <strong>Advanced Rig Tools</strong>
            <span className="advanced-rig-sub">
              {" "}facial, fingers, weights, poses, retarget, mocap, animation
            </span>
          </div>
          <button className="advanced-rig-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="advanced-rig-grid">
          <div className="advanced-rig-card">
            <div className="advanced-rig-title">Rig Extensions</div>
            <button className="advanced-rig-btn" type="button" onClick={onFacialRig}>Add Facial Auto Rig</button>
            <button className="advanced-rig-btn" type="button" onClick={onFingerRig}>Add Finger Rig</button>
            <button className="advanced-rig-btn" type="button" onClick={onTwistBones}>Add Twist Bones</button>
            <button className="advanced-rig-btn" type="button" onClick={onMuscles}>Add Muscle Helpers</button>
            <button className="advanced-rig-btn" type="button" onClick={onCorrectives}>Add Corrective Helpers</button>
            <button className="advanced-rig-btn" type="button" onClick={onUpgradeDeformation}>Upgrade Deformation</button>
          </div>

          <div className="advanced-rig-card">
            <div className="advanced-rig-title">Weights</div>
            <button className="advanced-rig-btn" type="button" onClick={onSmoothWeights}>Smooth Weights</button>
            <button className="advanced-rig-btn" type="button" onClick={onMirrorWeights}>Mirror Weights</button>
            <button className="advanced-rig-btn" type="button" onClick={onHeatmap}>Generate Weight Heatmap</button>
            <textarea
              className="advanced-rig-heatmap"
              readOnly
              value={heatmapPreview}
              placeholder="Weight heatmap preview..."
            />
          </div>

          <div className="advanced-rig-card">
            <div className="advanced-rig-title">Retarget + Mocap</div>
            <label className="advanced-rig-field">
              <span>Retarget Preset</span>
              <select
                className="advanced-rig-input"
                value={retargetPreset}
                onChange={(e) => setRetargetPreset(e.target.value)}
              >
                {retargets.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>
            <button className="advanced-rig-btn" type="button" onClick={onRetarget}>Apply Retarget Preset</button>
            <button className="advanced-rig-btn" type="button" onClick={onMocapBind}>Enable Mocap Binding</button>
            <button className="advanced-rig-btn" type="button" onClick={onAnimLib}>Build Animation Library</button>
          </div>

          <div className="advanced-rig-card">
            <div className="advanced-rig-title">Face + Pose + Animation</div>

            <label className="advanced-rig-field">
              <span>Expression</span>
              <select
                className="advanced-rig-input"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
              >
                {expressions.map((x) => (
                  <option key={x.id} value={x.id}>{x.label}</option>
                ))}
              </select>
            </label>
            <button className="advanced-rig-btn" type="button" onClick={onExpression}>Apply Expression</button>

            <label className="advanced-rig-field">
              <span>Pose</span>
              <select
                className="advanced-rig-input"
                value={poseId}
                onChange={(e) => setPoseId(e.target.value)}
              >
                {poses.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            <button className="advanced-rig-btn" type="button" onClick={onPose}>Apply Pose</button>

            <label className="advanced-rig-field">
              <span>Clip</span>
              <select
                className="advanced-rig-input"
                value={animClip}
                onChange={(e) => setAnimClip(e.target.value)}
              >
                <option value="idle">Idle</option>
                <option value="walk">Walk</option>
                <option value="run">Run</option>
                <option value="wave">Wave</option>
                <option value="jump">Jump</option>
              </select>
            </label>

            <button
              className={`advanced-rig-btn ${animRunning ? "is-active" : ""}`}
              type="button"
              onClick={() => setAnimRunning((v) => !v)}
            >
              {animRunning ? "Stop Test Animation" : "Run Test Animation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
