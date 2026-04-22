import React, { useMemo, useState } from "react";
import "../../styles/spx-tool-panels.css";
import { setSelectedObject } from "../../utils/spxSelection";

function buildTree(root) {
  if (!root) return [];
  const walk = (obj) => ({
    id: obj.uuid,
    name: obj.name || obj.type,
    type: obj.type,
    children: (obj.children || []).map(walk)
  });
  return (root.children || []).map(walk);
}

function TreeNode({ node, depth = 0, onSelect }) {
  const [open, setOpen] = useState(true);
  const hasKids = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 10 }}>
      <div className="spx-tool-panel__buttonrow" style={{ marginTop: 4 }}>
        {hasKids && <button className="spx-tool-panel__button" onClick={() => setOpen(v => !v)}>{open ? "−" : "+"}</button>}
        <button className="spx-tool-panel__button" onClick={() => onSelect(node.id)}>
          {node.name} · {node.type}
        </button>
      </div>
      {open && hasKids && node.children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
      ))}
    </div>
  );
}

export default function SceneHierarchyPanel({ sceneRef, meshRef, setStatus }) {
  const tree = useMemo(() => buildTree(sceneRef?.current), [sceneRef?.current]);

  const selectByUuid = (uuid) => {
    let found = null;
    sceneRef?.current?.traverse?.((obj) => {
      if (obj.uuid === uuid) found = obj;
    });
    if (found) {
      setSelectedObject(meshRef, found);
      setStatus?.(`Hierarchy selected: ${found.name || found.type}`);
    }
  };

  return (
    <div className="spx-tool-panel spx-tool-panel--compact">
      <div className="spx-tool-panel__heading">Scene Hierarchy</div>
      {tree.length ? tree.map((node) => (
        <TreeNode key={node.id} node={node} onSelect={selectByUuid} />
      )) : <div className="spx-tool-panel__meta">No scene nodes found.</div>}
    </div>
  );
}
