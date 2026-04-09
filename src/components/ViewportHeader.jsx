import React from 'react';

export const ViewportHeader = ({ onToggle }) => {
  return (
    <div className="vp-header">
      <button className="vp-header__btn" onClick={() => onToggle('wireframe')}>🌐 WIREFRAME</button>
      <button className="vp-header__btn" onClick={() => onToggle('xray')}>💀 X-RAY</button>
      <button className="vp-header__btn" onClick={() => onToggle('grid')}>📏 GRID</button>
      <button className="vp-header__btn vp-header__btn--render" onClick={() => window.takeSnapshot()}>📸 RENDER</button>
    </div>
  );
};
