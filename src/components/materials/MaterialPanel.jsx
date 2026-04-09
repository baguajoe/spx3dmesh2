import React, { useMemo, useState } from "react";
import {
  createDefaultMaterialSlots,
  addMaterialSlot,
  removeMaterialSlot,
  updateMaterialSlot,
  getActiveMaterial,
  materialStats,
} from "../../mesh/materials/MaterialSlots.js";

export default function MaterialPanel({ open = false, onClose, meshRef = null }) {
  const [slots, setSlots] = useState(createDefaultMaterialSlots());
  const [activeId, setActiveId] = useState("mat_01");

  const active = useMemo(() => getActiveMaterial(slots, activeId), [slots, activeId]);
  const stats = useMemo(() => materialStats(slots), [slots]);

  const patchActive = (patch) => {
    if (!active) return;
    setSlots((prev) => updateMaterialSlot(prev, active.id, patch));
  };

  const applyPreview = async () => {
    if (!meshRef?.current || !active) return;
    const mod = await import("../../mesh/materials/MaterialSlots.js");
    mod.applyMaterialToMeshPreview(meshRef.current, active);
  };

  if (!open) return null;

  return (
    <div className="material-panel-float">
      <div className="material-panel">
        <div className="material-panel-header">
          <div>
            <strong>Material Slots</strong>
            <span className="material-panel-sub"> {stats.count} materials</span>
          </div>
          <div className="material-header-actions">
            <button className="material-btn" type="button" onClick={() => setSlots((prev) => addMaterialSlot(prev))}>
              Add
            </button>
            <button className="material-btn" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="material-stats">
          <span>Slots: {stats.count}</span>
          <span>Assigned Faces: {stats.assignedFaceCount}</span>
        </div>

        <div className="material-body">
          <div className="material-slot-list">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={`material-slot-item ${activeId === slot.id ? "is-active" : ""}`}
                onClick={() => setActiveId(slot.id)}
              >
                <span
                  className="material-swatch"
                  style={{ background: slot.pbr?.baseColor || "#cccccc" }}
                />
                <span className="material-slot-name">{slot.name}</span>
              </button>
            ))}
          </div>

          {active && (
            <div className="material-editor">
              <label className="material-field">
                <span>Name</span>
                <input
                  className="material-input"
                  value={active.name}
                  onChange={(e) => patchActive({ name: e.target.value })}
                />
              </label>

              <label className="material-field">
                <span>Base Color</span>
                <input
                  className="material-input material-color"
                  type="color"
                  value={active.pbr?.baseColor || "#cccccc"}
                  onChange={(e) => patchActive({ pbr: { baseColor: e.target.value } })}
                />
              </label>

              <label className="material-field">
                <span>Roughness</span>
                <input
                  className="material-input"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={active.pbr?.roughness ?? 0.7}
                  onChange={(e) => patchActive({ pbr: { roughness: Number(e.target.value) } })}
                />
              </label>

              <label className="material-field">
                <span>Metallic</span>
                <input
                  className="material-input"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={active.pbr?.metallic ?? 0}
                  onChange={(e) => patchActive({ pbr: { metallic: Number(e.target.value) } })}
                />
              </label>

              <label className="material-field">
                <span>Emissive</span>
                <input
                  className="material-input material-color"
                  type="color"
                  value={active.pbr?.emissive || "#000000"}
                  onChange={(e) => patchActive({ pbr: { emissive: e.target.value } })}
                />
              </label>

              <label className="material-field">
                <span>Opacity</span>
                <input
                  className="material-input"
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.01"
                  value={active.pbr?.opacity ?? 1}
                  onChange={(e) => patchActive({ pbr: { opacity: Number(e.target.value) } })}
                />
              </label>

              <div className="material-btn-row">
                <button className="material-btn" type="button" onClick={applyPreview}>
                  Apply Preview
                </button>
                <button
                  className="material-btn material-btn-danger"
                  type="button"
                  onClick={() => {
                    setSlots((prev) => removeMaterialSlot(prev, active.id));
                    setActiveId("mat_01");
                  }}
                >
                  Remove
                </button>
              </div>

              <div className="material-map-grid">
                <div className="material-map-card">Base Color Map</div>
                <div className="material-map-card">Normal Map</div>
                <div className="material-map-card">Roughness Map</div>
                <div className="material-map-card">Metallic Map</div>
                <div className="material-map-card">AO Map</div>
                <div className="material-map-card">Emissive Map</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
