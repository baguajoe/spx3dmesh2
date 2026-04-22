import React, { useMemo } from "react";
import "../../styles/spx-tool-panels.css";

function collectObjects(scene) {
  const items = [];
  scene?.traverse?.((obj) => {
    if (obj === scene) return;
    items.push({
      id: obj.uuid,
      name: obj.name || obj.type,
      type: obj.type,
      visible: obj.visible
    });
  });
  return items;
}

export default function SceneGraphPanel({ sceneRef, meshRef, setStatus }) {
  const items = useMemo(() => collectObjects(sceneRef?.current), [sceneRef?.current]);

  const selectByUuid = (uuid) => {
    let found = null;
    sceneRef?.current?.traverse?.((obj) => {
      if (obj.uuid === uuid) found = obj;
    });
    if (found) {
      meshRef.current = found;
      setStatus?.(`Selected ${found.name || found.type}`);
    }
  };

  return (
    <div className="spx-tool-panel spx-tool-panel--compact">
      <div className="spx-tool-panel__heading">Scene Graph</div>
      {items.map((item) => (
        <button
          key={item.id}
          className="spx-tool-panel__button"
          onClick={() => selectByUuid(item.id)}
        >
          {item.name} · {item.type}
        </button>
      ))}
      {!items.length && <div className="spx-tool-panel__meta">No scene objects found.</div>}
    </div>
  );
}
