import React, { useState, useRef } from "react";

const TYPE_ICON = {
  box: "⬜", sphere: "⚪", cylinder: "🔘", torus: "⭕", plane: "▭",
  icosphere: "🔷", gear: "⚙️", pipe: "🔧", helix: "🧬", staircase: "🪜",
  arch: "🔲", lathe: "🔵", group: "📁", light: "💡", camera: "📷",
  mesh: "△", default: "◻",
};

function getIcon(type) {
  return TYPE_ICON[type?.toLowerCase()] || TYPE_ICON.default;
}

function OutlinerRow({ obj, depth, activeObjId, onSelect, onRename, onDelete, onToggleVisible, children }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(obj.name || obj.type || "Object");
  const inputRef = useRef(null);

  const isActive = obj.id === activeObjId;
  const isVisible = obj.visible !== false;

  const handleRename = () => {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const commitRename = () => {
    setEditing(false);
    onRename(obj.id, name);
  };

  return (
    <>
      <div
        className={`outliner-row${isActive ? " outliner-row--active" : ""}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => onSelect(obj.id)}
        onDoubleClick={handleRename}
      >
        <span className="outliner-arrow">{children ? "▾" : " "}</span>
        <span className="outliner-icon">{getIcon(obj.type)}</span>

        {editing ? (
          <input ref={inputRef} className="outliner-rename-input"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="outliner-name">{obj.name || obj.type || "Object"}</span>
        )}

        <div className="outliner-actions">
          <button className={`outliner-vis${isVisible ? "" : " outliner-vis--hidden"}`}
            title="Toggle visibility"
            onClick={e => { e.stopPropagation(); onToggleVisible(obj.id); }}>
            {isVisible ? "●" : "○"}
          </button>
          <button className="outliner-del"
            title="Delete"
            onClick={e => { e.stopPropagation(); onDelete(obj.id); }}>
            ✕
          </button>
        </div>
      </div>
      {children}
    </>
  );
}

export function SceneOutliner({
  sceneObjects = [],
  activeObjId,
  onSelect,
  onRename,
  onDelete,
  onToggleVisible,
  onAddPrimitive,
}) {
  const roots = sceneObjects.filter(o => !o.parentId);
  const children = (parentId) => sceneObjects.filter(o => o.parentId === parentId);

  function renderTree(obj, depth = 0) {
    const kids = children(obj.id);
    return (
      <OutlinerRow key={obj.id} obj={obj} depth={depth}
        activeObjId={activeObjId}
        onSelect={onSelect}
        onRename={onRename}
        onDelete={onDelete}
        onToggleVisible={onToggleVisible}
        children={kids.length > 0 ? kids.map(k => renderTree(k, depth + 1)) : null}
      />
    );
  }

  return (
    <div className="outliner-root">
      <div className="outliner-header">
        <span className="outliner-title">SCENE</span>
        <span className="outliner-count">{sceneObjects.length} objects</span>
      </div>
      <div className="outliner-body">
        {roots.length === 0 ? (
          <div className="outliner-empty">No objects — use Add menu</div>
        ) : (
          roots.map(o => renderTree(o, 0))
        )}
      </div>
    </div>
  );
}
