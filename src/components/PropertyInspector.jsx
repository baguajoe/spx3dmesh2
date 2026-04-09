import React from "react";

export const PropertyInspector = ({ selectedObject, onUpdateParam }) => {
  if (!selectedObject) return (
    <div className="prop-empty">SELECT AN OBJECT TO VIEW PROPERTIES</div>
  );

  const params = selectedObject.userData.params || {};

  return (
    <div className="n-panel prop-panel">
      <h3 className="prop-panel__title">PROPERTIES: {selectedObject.name || 'Mesh'}</h3>

      <div className="prop-panel__group">
        <p className="prop-panel__group-label">TRANSFORM</p>
        {['x', 'y', 'z'].map(axis => (
          <div key={axis} className="prop-panel__row">
            <span>Pos {axis.toUpperCase()}</span>
            <input className="prop-panel__input" type="number" step="0.1"
              value={selectedObject.position[axis].toFixed(2)} readOnly />
          </div>
        ))}
      </div>

      <div className="prop-panel__group">
        <p className="prop-panel__group-label">PROCEDURAL PARAMETERS</p>
        {Object.keys(params).map(key => (
          <div key={key} className="prop-panel__param">
            <label className="prop-panel__param-label">
              {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
            </label>
            <input className="prop-panel__slider" type="range"
              value={params[key]}
              onChange={(e) => onUpdateParam(key, parseFloat(e.target.value))} />
          </div>
        ))}
      </div>
    </div>
  );
};
