import React, { useEffect, useMemo, useRef, useState } from "react";
import useDraggablePanel from "../../hooks/useDraggablePanel.js";
import { createGarmentCatalog, createGarmentMesh } from "../../mesh/clothing/GarmentTemplates.js";
import {
  fitNearestGarmentInScene,
  offsetGarment,
  relaxGarment,
} from "../../mesh/clothing/GarmentFitting.js";
import {
  createClothState,
  syncClothStateToMesh,
  stepClothSimulation,
  pinTopRow,
  unpinAll,
  resetClothState,
  offsetClothState,
  getPinnedCount,
} from "../../mesh/clothing/ClothSimulation.js";
import {
  resolveBodyBoxCollision,
  findLatestGarment,
  findNearestBody,
} from "../../mesh/clothing/CollisionPinning.js";

export default function ClothingPanel({ open = false, onClose, sceneRef = null, setStatus = null }) {
  const { beginDrag, style } = useDraggablePanel({ x: 0, y: 0 });

  const catalog = useMemo(() => createGarmentCatalog(), []);
  const [garmentType, setGarmentType] = useState("shirt");
  const [width, setWidth] = useState(1.4);
  const [height, setHeight] = useState(1.8);
  const [accentColor, setAccentColor] = useState("#8fa8c9");
  const [fitOffset, setFitOffset] = useState(0.03);
  const [fitStrength, setFitStrength] = useState(0.85);
  const [relaxIterations, setRelaxIterations] = useState(2);
  const [simRunning, setSimRunning] = useState(false);
  const [simGravity, setSimGravity] = useState(9.8);
  const [simDamping, setSimDamping] = useState(0.992);
  const [simIterations, setSimIterations] = useState(5);
  const [collisionOffset, setCollisionOffset] = useState(0.01);
  const clothStateRef = useRef(null);
  const rafRef = useRef(null);

  const fitLatestGarment = () => {
    const result = fitNearestGarmentInScene(sceneRef?.current, {
      offset: fitOffset,
      strength: fitStrength,
      relaxIterations,
    });

    if (result.ok) {
      setStatus?.(`Fitted ${result.garmentName} to ${result.bodyName}`);
    } else {
      setStatus?.(result.reason || "Garment fitting failed");
    }
  };

  const offsetLatestGarment = () => {
    if (!sceneRef?.current) return;
    let garment = null;
    sceneRef.current.traverse((obj) => {
      if (obj?.isMesh && (obj.name || "").toLowerCase().startsWith("garment_")) {
        garment = obj;
      }
    });
    if (!garment) return;
    offsetGarment(garment, fitOffset);
    setStatus?.("Garment offset applied");
  };

  const relaxLatestGarment = () => {
    if (!sceneRef?.current) return;
    let garment = null;
    sceneRef.current.traverse((obj) => {
      if (obj?.isMesh && (obj.name || "").toLowerCase().startsWith("garment_")) {
        garment = obj;
      }
    });
    if (!garment) return;
    relaxGarment(garment, relaxIterations, 0.2);
    setStatus?.("Garment relax applied");
  };

  const initSimulation = () => {
    const garment = findLatestGarment(sceneRef?.current);
    if (!garment) {
      setStatus?.("No garment found");
      return;
    }

    clothStateRef.current = createClothState(garment);
    pinTopRow(clothStateRef.current, 0.06);
    syncClothStateToMesh(clothStateRef.current, garment);
    setStatus?.("Cloth simulation initialized");
  };

  const stepSimulationOnce = () => {
    const garment = findLatestGarment(sceneRef?.current);
    if (!garment) {
      setStatus?.("No garment found");
      return;
    }

    if (!clothStateRef.current) {
      clothStateRef.current = createClothState(garment);
      pinTopRow(clothStateRef.current, 0.06);
    }

    clothStateRef.current.gravity.set(0, -simGravity, 0);
    clothStateRef.current.damping = simDamping;
    clothStateRef.current.constraintIterations = simIterations;

    stepClothSimulation(clothStateRef.current, {});
    const body = findNearestBody(sceneRef?.current, garment);
    if (body) {
      resolveBodyBoxCollision(clothStateRef.current, garment, body, collisionOffset);
    }
    syncClothStateToMesh(clothStateRef.current, garment);
  };

  const pinGarment = () => {
    if (!clothStateRef.current) return;
    pinTopRow(clothStateRef.current, 0.06);
    setStatus?.(`Pinned ${getPinnedCount(clothStateRef.current)} cloth vertices`);
  };

  const clearPins = () => {
    if (!clothStateRef.current) return;
    unpinAll(clothStateRef.current);
    setStatus?.("Cleared cloth pins");
  };

  const resetSim = () => {
    const garment = findLatestGarment(sceneRef?.current);
    if (!clothStateRef.current || !garment) return;
    resetClothState(clothStateRef.current);
    syncClothStateToMesh(clothStateRef.current, garment);
    setStatus?.("Cloth reset");
  };

  const offsetSim = () => {
    const garment = findLatestGarment(sceneRef?.current);
    if (!clothStateRef.current || !garment) return;
    offsetClothState(clothStateRef.current, collisionOffset);
    syncClothStateToMesh(clothStateRef.current, garment);
    setStatus?.("Cloth offset applied");
  };

  useEffect(() => {
    if (!simRunning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = () => {
      stepSimulationOnce();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [simRunning, simGravity, simDamping, simIterations, collisionOffset]);

  const addGarmentToScene = () => {
    const mesh = createGarmentMesh(garmentType, { width, height });

    if (mesh.material?.color) {
      mesh.material.color.set(accentColor);
    }

    mesh.position.set(0, 1.1, 0);

    if (sceneRef?.current) {
      sceneRef.current.add(mesh);
      setStatus?.(`${garmentType} garment added`);
    }
  };

  if (!open) return null;

  return (
    <div className="clothing-panel-float" style={{ ...style }}>
      <div className="clothing-panel">
        <div className="clothing-panel-header" onMouseDown={beginDrag}>
          <div>
            <strong>Garment Templates</strong>
            <span className="clothing-panel-sub"> procedural clothing generator</span>
          </div>
          <button className="clothing-btn" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="clothing-toolbar">
          <label className="clothing-field">
            <span>Template</span>
            <select
              className="clothing-input"
              value={garmentType}
              onChange={(e) => setGarmentType(e.target.value)}
            >
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="clothing-field">
            <span>Width</span>
            <input
              className="clothing-input"
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>

          <label className="clothing-field">
            <span>Height</span>
            <input
              className="clothing-input"
              type="range"
              min="0.5"
              max="4"
              step="0.05"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </label>

          <label className="clothing-field">
            <span>Color</span>
            <input
              className="clothing-input clothing-color"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
            />
          </label>

          <button className="clothing-btn" type="button" onClick={addGarmentToScene}>
            Add Garment
          </button>
        </div>

        <div className="clothing-toolbar">
          <label className="clothing-field">
            <span>Fit Offset</span>
            <input
              className="clothing-input"
              type="range"
              min="0"
              max="0.15"
              step="0.005"
              value={fitOffset}
              onChange={(e) => setFitOffset(Number(e.target.value))}
            />
          </label>

          <label className="clothing-field">
            <span>Fit Strength</span>
            <input
              className="clothing-input"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={fitStrength}
              onChange={(e) => setFitStrength(Number(e.target.value))}
            />
          </label>

          <label className="clothing-field">
            <span>Relax</span>
            <input
              className="clothing-input"
              type="range"
              min="1"
              max="8"
              step="1"
              value={relaxIterations}
              onChange={(e) => setRelaxIterations(Number(e.target.value))}
            />
          </label>

          <button className="clothing-btn" type="button" onClick={fitLatestGarment}>
            Fit Garment
          </button>
          <button className="clothing-btn" type="button" onClick={offsetLatestGarment}>
            Offset
          </button>
          <button className="clothing-btn" type="button" onClick={relaxLatestGarment}>
            Relax
          </button>
        </div>

        <div className="clothing-template-grid">
          {catalog.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`clothing-card ${garmentType === item.id ? "is-active" : ""}`}
              onClick={() => setGarmentType(item.id)}
            >
              <div className="clothing-card-thumb">{item.label}</div>
              <div className="clothing-card-label">{item.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}