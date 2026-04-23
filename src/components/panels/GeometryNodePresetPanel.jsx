import React, { useState } from "react";
import * as THREE from "three";
import "../../styles/spx-tool-panels.css";
import { useSPXEditor } from "../../state/SPXEditorStore";

const PRESETS = [
  { id: "scatter_rocks", label: "Scatter Rocks" },
  { id: "panel_array", label: "Panel Array" },
  { id: "city_blocks", label: "City Blocks" }
];

function makeMaterial(color = 0x808080) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.08 });
}

function applyPresetToScene(scene, presetId) {
  const root = new THREE.Group();
  root.name = `SPX_${presetId}`;

  if (presetId === "scatter_rocks") {
    for (let i = 0; i < 24; i++) {
      const s = 0.12 + Math.random() * 0.35;
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(s, 0),
        makeMaterial(0x777777)
      );
      mesh.position.set((Math.random() - 0.5) * 8, s * 0.5, (Math.random() - 0.5) * 8);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      root.add(mesh);
    }
  } else if (presetId === "panel_array") {
    for (let x = -4; x <= 4; x++) {
      for (let z = -2; z <= 2; z++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.08, 0.9),
          makeMaterial(0x5d6b7a)
        );
        mesh.position.set(x * 1.1, 0.04, z * 1.1);
        root.add(mesh);
      }
    }
  } else if (presetId === "city_blocks") {
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        const h = 0.5 + Math.random() * 3.5;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, h, 0.9),
          makeMaterial(0x6f6f76)
        );
        mesh.position.set(x * 1.3, h * 0.5, z * 1.3);
        root.add(mesh);
      }
    }
  }

  scene.add(root);
  return root;
}

export default function GeometryNodePresetPanel({ sceneRef, setStatus }) {
  const { pushHistory } = useSPXEditor();
  const [selected, setSelected] = useState("scatter_rocks");

  const applyPreset = () => {
    const scene = sceneRef?.current;
    if (!scene) {
      setStatus?.("No scene available");
      return;
    }

    const obj = applyPresetToScene(scene, selected);

    pushHistory({
      label: `Apply preset ${selected}`,
      undo: () => { try { scene.remove(obj); } catch {} },
      redo: () => { try { scene.add(obj); } catch {} }
    });

    setStatus?.(`Geometry preset applied: ${obj.name}`);
  };

  return (
    <div className="spx-tool-panel">
      <div className="spx-tool-panel__heading">Geometry Presets</div>
      <select
        className="spx-tool-panel__select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>

      <div className="spx-tool-panel__buttonrow">
        <button className="spx-tool-panel__button" onClick={applyPreset}>
          Apply Preset
        </button>
      </div>
    </div>
  );
}
