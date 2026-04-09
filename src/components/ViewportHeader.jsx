
import React from 'react';

export const ViewportHeader = ({ onToggle }) => {
  const btnStyle = {
    background: '#34495e',
    border: 'none',
    color: '#ecf0f1',
    padding: '4px 12px',
    fontSize: '10px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  };

  return (
    <div style={{ 
      position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', background: 'rgba(20, 20, 20, 0.8)', padding: '5px 15px',
      borderRadius: '30px', border: '1px solid #444', zIndex: 1000, backdropFilter: 'blur(5px)'
    }}>
      <button style={btnStyle} onClick={() => onToggle('wireframe')}>🌐 WIREFRAME</button>
      <button style={btnStyle} onClick={() => onToggle('xray')}>💀 X-RAY</button>
      <button style={btnStyle} onClick={() => onToggle('grid')}>📏 GRID</button>
      <button style={{ ...btnStyle, background: '#e67e22' }} onClick={() => window.takeSnapshot()}>📸 RENDER</button>
    </div>
  );
};
