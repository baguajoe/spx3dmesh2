import React from "react";

export const PropertyInspector = ({ selectedObject, onUpdateParam }) => {
  if (!selectedObject) return (
    <div style={{ padding: '20px', color: '#666', fontSize: '11px', textAlign: 'center' }}>
      SELECT AN OBJECT TO VIEW PROPERTIES
    </div>
  );

  const params = selectedObject.userData.params || {};

  return (
    <div className="n-panel" style={{ background: '#1d1d1d', color: '#c8c8c8', height: '100vh', padding: '15px', borderLeft: '1px solid #333' }}>
      <h3 style={{ fontSize: '11px', color: '#5b9bd5', marginBottom: '15px' }}>PROPERTIES: {selectedObject.name || 'Mesh'}</h3>
      
      <div className="transform-group" style={{ marginBottom: '20px', borderBottom: '1px solid #333', pb: '10px' }}>
        <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#666' }}>TRANSFORM</p>
        {['x', 'y', 'z'].map(axis => (
          <div key={axis} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '4px 0' }}>
            <span>Pos {axis.toUpperCase()}</span>
            <input type="number" step="0.1" value={selectedObject.position[axis].toFixed(2)} readOnly style={{ width: '50px', background: '#333', border: 'none', color: 'white' }} />
          </div>
        ))}
      </div>

      <div className="procedural-group">
        <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#666' }}>PROCEDURAL PARAMETERS</p>
        {Object.keys(params).map(key => (
          <div key={key} style={{ margin: '10px 0' }}>
            <label style={{ fontSize: '11px', display: 'block' }}>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</label>
            <input 
              type="range" 
              style={{ width: '100%', accentColor: '#5b9bd5' }} 
              value={params[key]} 
              onChange={(e) => onUpdateParam(key, parseFloat(e.target.value))} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};
