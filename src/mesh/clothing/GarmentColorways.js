/**
 * GarmentColorways.js
 * Fabric color and pattern variants for garments
 * Allows same garment in multiple colorways for presentation/export
 */

// ── Colorway system ───────────────────────────────────────────────────────────

export function createColorway(name, fabric, color, pattern = null) {
  return {
    id: `cw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    fabric,
    color,
    pattern,
    thumbnail: null,
  };
}

export const DEFAULT_COLORWAYS = {
  'Classic White': { fabric: 'cotton', color: '#FFFFFF', pattern: null },
  'Midnight Black': { fabric: 'cotton', color: '#111111', pattern: null },
  'Navy Denim':    { fabric: 'denim',  color: '#1a3a5c', pattern: null },
  'Washed Denim':  { fabric: 'denim',  color: '#4a6fa5', pattern: null },
  'Crimson Silk':  { fabric: 'silk',   color: '#8B0000', pattern: null },
  'Ivory Silk':    { fabric: 'silk',   color: '#FFFFF0', pattern: null },
  'Black Leather': { fabric: 'leather',color: '#1a1a1a', pattern: null },
  'Brown Leather': { fabric: 'leather',color: '#4a2c0a', pattern: null },
  'Stripe':        { fabric: 'cotton', color: '#FFFFFF', pattern: 'stripe' },
  'Plaid':         { fabric: 'cotton', color: '#8B4513', pattern: 'plaid'  },
  'Floral':        { fabric: 'silk',   color: '#FFB6C1', pattern: 'floral' },
  'Houndstooth':   { fabric: 'wool',   color: '#222222', pattern: 'houndstooth' },
};

export const PATTERN_TYPES = ['none', 'stripe', 'plaid', 'floral', 'houndstooth', 'polka_dot', 'geometric', 'abstract'];

/**
 * Apply a colorway to a Three.js mesh material
 */
export function applyColorwayToMesh(mesh, colorway, THREE) {
  if (!mesh?.material) return;
  const color = new THREE.Color(colorway.color);
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach(mat => { mat.color = color; mat.needsUpdate = true; });
  } else {
    mesh.material.color = color;
    mesh.material.needsUpdate = true;
  }
}

/**
 * Generate CSS gradient preview for a pattern type
 */
export function getPatternPreviewCSS(pattern, color) {
  const c = color || '#ffffff';
  const dark = '#00000033';
  switch (pattern) {
    case 'stripe':
      return `repeating-linear-gradient(45deg, ${c}, ${c} 4px, ${dark} 4px, ${dark} 8px)`;
    case 'plaid':
      return `repeating-linear-gradient(0deg, ${dark} 0px, ${dark} 2px, transparent 2px, transparent 10px),
              repeating-linear-gradient(90deg, ${dark} 0px, ${dark} 2px, transparent 2px, transparent 10px), ${c}`;
    case 'polka_dot':
      return `radial-gradient(circle, ${dark} 2px, transparent 2px) 0 0 / 8px 8px, ${c}`;
    case 'houndstooth':
      return `repeating-conic-gradient(${c} 0% 25%, ${dark} 0% 50%) 0 0 / 8px 8px`;
    default:
      return c;
  }
}

/**
 * Create a colorway session — manages multiple colorways for one garment
 */
export function createColorwaySession(garmentName) {
  return {
    garmentName,
    colorways: [createColorway('Default', 'cotton', '#FFFFFF')],
    activeColorwayId: null,
  };
}

export function addColorwayToSession(session, name, fabric, color, pattern) {
  const cw = createColorway(name, fabric, color, pattern);
  session.colorways.push(cw);
  session.activeColorwayId = cw.id;
  return cw;
}

export function removeColorwayFromSession(session, id) {
  session.colorways = session.colorways.filter(c => c.id !== id);
}

export function setActiveColorway(session, id) {
  session.activeColorwayId = id;
  return session.colorways.find(c => c.id === id);
}
