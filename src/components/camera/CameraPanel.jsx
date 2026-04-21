import React from "react";
import { CAMERA_RIGS, LENS_PRESETS, SENSOR_PRESETS } from "../../camera/CameraPresets.js";

function NumberField({ label, value, onChange, min, max, step = 0.1 }) {
  return (
    <label className="spx-camera-field">
      <span>{label}</span>
      <input
        type="number"
        value={value ?? 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange?.(Number(e.target.value))}
      />
    </label>
  );
}

export default function CameraPanel({
  cameras = [],
  activeCameraId = null,
  onSetActiveCamera,
  onAddCamera,
  settings,
  onPatchSettings,
}) {
  return (
    <div className="spx-camera-panel">
      <div className="spx-camera-panel__header">
        <strong>Film Camera</strong>
        <button type="button" onClick={onAddCamera}>+ Camera</button>
      </div>

      <label className="spx-camera-field">
        <span>Active Camera</span>
        <select
          value={activeCameraId || ""}
          onChange={(e) => onSetActiveCamera?.(e.target.value)}
        >
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {!settings ? (
        <div className="spx-camera-empty">No active camera selected.</div>
      ) : (
        <>
          <label className="spx-camera-field">
            <span>Lens Preset</span>
            <select
              defaultValue=""
              onChange={(e) => {
                const preset = LENS_PRESETS.find((x) => x.id === e.target.value);
                if (preset) onPatchSettings?.({ focalLength: preset.focalLength });
              }}
            >
              <option value="">Choose lens</option>
              {LENS_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>

          <label className="spx-camera-field">
            <span>Sensor Preset</span>
            <select
              defaultValue=""
              onChange={(e) => {
                const preset = SENSOR_PRESETS.find((x) => x.id === e.target.value);
                if (preset) {
                  onPatchSettings?.({
                    sensorWidth: preset.width,
                    sensorHeight: preset.height,
                  });
                }
              }}
            >
              <option value="">Choose sensor</option>
              {SENSOR_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>

          <label className="spx-camera-field">
            <span>Rig</span>
            <select
              value={settings.rigType || "free"}
              onChange={(e) => onPatchSettings?.({ rigType: e.target.value })}
            >
              {CAMERA_RIGS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </label>

          <NumberField label="Focal Length (mm)" value={settings.focalLength} onChange={(v) => onPatchSettings?.({ focalLength: v })} min={8} max={300} step={1} />
          <NumberField label="Sensor Width (mm)" value={settings.sensorWidth} onChange={(v) => onPatchSettings?.({ sensorWidth: v })} min={1} max={70} step={0.1} />
          <NumberField label="Sensor Height (mm)" value={settings.sensorHeight} onChange={(v) => onPatchSettings?.({ sensorHeight: v })} min={1} max={70} step={0.1} />
          <NumberField label="F-Stop" value={settings.fStop} onChange={(v) => onPatchSettings?.({ fStop: v })} min={0.7} max={32} step={0.1} />
          <NumberField label="Focus Distance" value={settings.focusDistance} onChange={(v) => onPatchSettings?.({ focusDistance: v })} min={0.01} max={1000} step={0.1} />
          <NumberField label="Exposure" value={settings.exposure} onChange={(v) => onPatchSettings?.({ exposure: v })} min={0.01} max={10} step={0.01} />
          <NumberField label="ISO" value={settings.iso} onChange={(v) => onPatchSettings?.({ iso: v })} min={25} max={12800} step={25} />
          <NumberField label="White Balance (K)" value={settings.whiteBalance} onChange={(v) => onPatchSettings?.({ whiteBalance: v })} min={1000} max={12000} step={50} />
          <NumberField label="Orbit Radius" value={settings.orbitRadius} onChange={(v) => onPatchSettings?.({ orbitRadius: v })} min={0.5} max={100} step={0.1} />
          <NumberField label="Orbit Speed" value={settings.orbitSpeed} onChange={(v) => onPatchSettings?.({ orbitSpeed: v })} min={0} max={5} step={0.01} />
          <NumberField label="Shake Amount" value={settings.shakeAmount} onChange={(v) => onPatchSettings?.({ shakeAmount: v })} min={0} max={10} step={0.01} />
        </>
      )}
    </div>
  );
}
