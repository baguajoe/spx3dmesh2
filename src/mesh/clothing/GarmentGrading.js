/**
 * GarmentGrading.js
 * Size grading system — scale pattern pieces across standard size ranges
 * Used by fashion designers to produce full size runs from a base pattern
 */

// ── Standard size charts ──────────────────────────────────────────────────────

export const SIZE_CHARTS = {
  women: {
    XS: { bust: 79, waist: 61, hip: 86, height: 162 },
    S:  { bust: 84, waist: 66, hip: 91, height: 165 },
    M:  { bust: 89, waist: 71, hip: 96, height: 168 },
    L:  { bust: 94, waist: 76, hip: 101, height: 170 },
    XL: { bust: 99, waist: 81, hip: 106, height: 172 },
    XXL:{ bust: 104, waist: 86, hip: 111, height: 174 },
  },
  men: {
    XS: { chest: 84, waist: 71, hip: 84, height: 170 },
    S:  { chest: 89, waist: 76, hip: 89, height: 175 },
    M:  { chest: 94, waist: 81, hip: 94, height: 178 },
    L:  { chest: 99, waist: 86, hip: 99, height: 181 },
    XL: { chest: 104, waist: 91, hip: 104, height: 183 },
    XXL:{ chest: 109, waist: 96, hip: 109, height: 185 },
  },
  kids: {
    '2T': { chest: 53, waist: 52, hip: 55, height: 89 },
    '3T': { chest: 55, waist: 53, hip: 57, height: 97 },
    '4T': { chest: 57, waist: 54, hip: 59, height: 104 },
    '5':  { chest: 59, waist: 55, hip: 61, height: 112 },
    '6':  { chest: 61, waist: 56, hip: 63, height: 119 },
    '8':  { chest: 66, waist: 59, hip: 68, height: 128 },
  },
};

export const STANDARD_SIZES = {
  women: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  men:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  kids:  ['2T', '3T', '4T', '5', '6', '8'],
};

// ── Grading rules ─────────────────────────────────────────────────────────────

/**
 * Calculate scale factor between two sizes
 * @param {string} category - 'women' | 'men' | 'kids'
 * @param {string} fromSize - base size
 * @param {string} toSize - target size
 * @param {string} measurement - 'bust'|'waist'|'hip'|'chest'
 */
export function getGradingScale(category, fromSize, toSize, measurement = 'bust') {
  const chart = SIZE_CHARTS[category];
  if (!chart) return 1;
  const from = chart[fromSize];
  const to = chart[toSize];
  if (!from || !to) return 1;
  const key = measurement in from ? measurement : Object.keys(from)[0];
  return to[key] / from[key];
}

/**
 * Grade a pattern panel's points from one size to another
 * @param {Object} panel - { points: [{x, y}] }
 * @param {string} category
 * @param {string} fromSize
 * @param {string} toSize
 * @param {Object} origin - center of scaling {x, y}
 */
export function gradePanel(panel, category, fromSize, toSize, origin = { x: 0, y: 0 }) {
  const scaleX = getGradingScale(category, fromSize, toSize, 'bust');
  const scaleY = getGradingScale(category, fromSize, toSize, 'hip');

  return {
    ...panel,
    points: panel.points.map(pt => ({
      x: origin.x + (pt.x - origin.x) * scaleX,
      y: origin.y + (pt.y - origin.y) * scaleY,
    })),
    graded: true,
    fromSize,
    toSize,
    category,
  };
}

/**
 * Generate a full size run from a base pattern
 * @param {Array} panels - base pattern panels
 * @param {string} category
 * @param {string} baseSize - e.g. 'M'
 * @param {Array} targetSizes - e.g. ['XS', 'S', 'L', 'XL']
 */
export function generateSizeRun(panels, category, baseSize, targetSizes) {
  const origin = getPanelCenter(panels);
  const run = {};
  run[baseSize] = panels;
  targetSizes.forEach(size => {
    if (size === baseSize) return;
    run[size] = panels.map(panel => gradePanel(panel, category, baseSize, size, origin));
  });
  return run;
}

/**
 * Get center point of all panels combined
 */
export function getPanelCenter(panels) {
  let sumX = 0, sumY = 0, count = 0;
  panels.forEach(panel => {
    panel.points?.forEach(pt => {
      sumX += pt.x; sumY += pt.y; count++;
    });
  });
  return count ? { x: sumX / count, y: sumY / count } : { x: 0, y: 0 };
}

/**
 * Add seam allowance to a panel
 * @param {Object} panel
 * @param {number} allowance - mm (typically 10-15mm)
 */
export function addSeamAllowance(panel, allowance = 10) {
  if (!panel.points || panel.points.length < 3) return panel;
  const center = panel.points.reduce(
    (acc, p) => ({ x: acc.x + p.x / panel.points.length, y: acc.y + p.y / panel.points.length }),
    { x: 0, y: 0 }
  );
  return {
    ...panel,
    points: panel.points.map(pt => {
      const dx = pt.x - center.x;
      const dy = pt.y - center.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      return {
        x: pt.x + (dx / len) * allowance,
        y: pt.y + (dy / len) * allowance,
      };
    }),
    seamAllowance: allowance,
  };
}

/**
 * Add dart to a panel — creates an inward fold
 * @param {Object} panel
 * @param {number} pointIndex - where to insert dart
 * @param {number} width - dart width in mm
 * @param {number} depth - dart depth in mm
 */
export function addDart(panel, pointIndex, width = 15, depth = 60) {
  if (!panel.points || pointIndex >= panel.points.length) return panel;
  const pt = panel.points[pointIndex];
  const next = panel.points[(pointIndex + 1) % panel.points.length];
  const midX = (pt.x + next.x) / 2;
  const midY = (pt.y + next.y) / 2;
  const dx = next.x - pt.x;
  const dy = next.y - pt.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const dartTip = { x: midX + perpX * depth, y: midY + perpY * depth };
  const dartL = { x: midX - (dx / len) * (width / 2), y: midY - (dy / len) * (width / 2) };
  const dartR = { x: midX + (dx / len) * (width / 2), y: midY + (dy / len) * (width / 2) };
  const newPoints = [...panel.points];
  newPoints.splice(pointIndex + 1, 0, dartL, dartTip, dartR);
  return { ...panel, points: newPoints, darts: [...(panel.darts || []), { pointIndex, width, depth }] };
}

/**
 * Add pleat to a panel
 */
export function addPleat(panel, pointIndex, width = 20, foldDir = 1) {
  if (!panel.points || pointIndex >= panel.points.length) return panel;
  const pt = panel.points[pointIndex];
  const next = panel.points[(pointIndex + 1) % panel.points.length];
  const dx = next.x - pt.x;
  const dy = next.y - pt.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const foldPt = {
    x: pt.x + (dx / len) * width * foldDir,
    y: pt.y + (dy / len) * width * foldDir,
  };
  const newPoints = [...panel.points];
  newPoints.splice(pointIndex + 1, 0, foldPt);
  return { ...panel, points: newPoints, pleats: [...(panel.pleats || []), { pointIndex, width }] };
}
