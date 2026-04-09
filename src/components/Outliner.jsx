import React from "react";

export const Outliner = ({ objects, selectedId, onSelect, onDelete, onToggleVisibility }) => {
  return (
    <div className="outliner">
      <div className="outliner__header">
        <h3 className="outliner__title">SCENE OUTLINER</h3>
        <button className="outliner__clear-btn" onClick={() => window.SPX.clearScene()}>🗑️ CLEAR</button>
      </div>
      <div className="outliner__list">
        {objects.map(obj => (
          <div
            key={obj.uuid}
            onClick={() => onSelect(obj)}
            className={`outliner__item${selectedId === obj.uuid ? " outliner__item--selected" : ""}`}
          >
            <span>{obj.userData.type === 'gear' ? '⚙️' : '📦'} {obj.name || obj.userData.type || 'Mesh'}</span>
            <div className="outliner__item-actions">
              <span onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj); }}>{obj.visible ? '👁️' : '🌑'}</span>
              <span className="outliner__delete" onClick={(e) => { e.stopPropagation(); onDelete(obj); }}>✖</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
