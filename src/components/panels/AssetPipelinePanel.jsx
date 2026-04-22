import React from "react";
import "../../styles/spx-tool-panels.css";
import { downloadAssetManifest, downloadSceneManifest } from "../../mesh/pipeline/AssetPipeline";
import { getSelectedObject } from "../../utils/spxSelection";

export default function AssetPipelinePanel({ meshRef, sceneRef, setStatus }) {
  const exportAsset = () => {
    const obj = getSelectedObject(meshRef);
    if (!obj) {
      setStatus?.("Select an asset first");
      return;
    }
    const manifest = downloadAssetManifest(obj);
    setStatus?.(`Asset manifest exported: ${manifest.name}`);
  };

  const exportScene = () => {
    const scene = sceneRef?.current;
    if (!scene) {
      setStatus?.("Scene unavailable");
      return;
    }
    const manifest = downloadSceneManifest(scene);
    setStatus?.(`Scene manifest exported: ${manifest.objectCount} objects`);
  };

  return (
    <div className="spx-tool-panel spx-tool-panel--compact">
      <div className="spx-tool-panel__heading">Asset Pipeline</div>
      <div className="spx-tool-panel__meta">Exports JSON manifests for selected assets and the scene.</div>
      <div className="spx-tool-panel__buttonrow">
        <button className="spx-tool-panel__button" onClick={exportAsset}>Export Asset</button>
        <button className="spx-tool-panel__button" onClick={exportScene}>Export Scene</button>
      </div>
    </div>
  );
}
