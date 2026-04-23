import React, { useMemo, useState } from "react";
import "../../styles/spx-tool-panels.css";
import { listParametricAssets, buildParametricAsset } from "../../mesh/generators/ParametricAssets";
import { useSPXEditor } from "../../state/SPXEditorStore";

export default function ParametricGeneratorPanel({ sceneRef, setStatus }) {
  const { pushHistory } = useSPXEditor();
  const assets = useMemo(() => listParametricAssets(), []);
  const [assetId, setAssetId] = useState(assets[0]?.id || "stairs");
  const active = assets.find((a) => a.id === assetId);

  const generate = () => {
    const scene = sceneRef?.current;
    if (!scene || !active) {
      setStatus?.("Scene or asset unavailable");
      return;
    }

    const obj = buildParametricAsset(active.id, active.defaults);
    obj.position.x = (Math.random() - 0.5) * 4;
    obj.position.z = (Math.random() - 0.5) * 4;
    scene.add(obj);

    obj.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeVertexNormals?.();
      }
    });

    pushHistory({
      label: `Generate ${active.label}`,
      undo: () => { try { scene.remove(obj); } catch {} },
      redo: () => { try { scene.add(obj); } catch {} }
    });

    setStatus?.(`Generated parametric asset: ${active.label}`);
  };

  return (
    <div className="spx-tool-panel">
      <div className="spx-tool-panel__heading">Parametric Generator</div>
      <select className="spx-tool-panel__select" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>{a.label}</option>
        ))}
      </select>
      <div className="spx-tool-panel__meta">
        Defaults: {JSON.stringify(active?.defaults || {})}
      </div>
      <div className="spx-tool-panel__buttonrow">
        <button className="spx-tool-panel__button" onClick={generate}>Generate Asset</button>
      </div>
    </div>
  );
}
