/**
 * FlatSketchExport.js
 * Export garment pattern panels as technical flat sketch SVG
 * Industry-standard format for fashion design communication
 */

const SVG_SCALE = 2; // 1mm = 2px in SVG
const SVG_PADDING = 40;
const COLORS = {
  outline: '#1a1a1a',
  seamLine: '#444444',
  foldLine: '#0066cc',
  dartLine: '#cc0000',
  grainLine: '#888888',
  notch: '#ff6600',
  text: '#1a1a1a',
  background: '#ffffff',
  grid: '#eeeeee',
};

/**
 * Convert pattern panels to SVG flat sketch
 * @param {Array} panels - pattern panels with points
 * @param {Object} options
 */
export function exportFlatSketch(panels, options = {}) {
  const {
    showSeamAllowance = true,
    showGrainLine = true,
    showDarts = true,
    showMeasurements = true,
    showGrid = true,
    title = 'SPX Pattern',
    designer = '',
    size = 'M',
  } = options;

  if (!panels || panels.length === 0) {
    return generateEmptySketch(title);
  }

  // Calculate bounds
  const allPoints = panels.flatMap(p => p.points || []);
  if (allPoints.length === 0) return generateEmptySketch(title);

  const minX = Math.min(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const maxY = Math.max(...allPoints.map(p => p.y));

  const svgW = (maxX - minX) * SVG_SCALE + SVG_PADDING * 2;
  const svgH = (maxY - minY) * SVG_SCALE + SVG_PADDING * 2 + 60; // +60 for header

  const toSVG = (x, y) => ({
    x: (x - minX) * SVG_SCALE + SVG_PADDING,
    y: (y - minY) * SVG_SCALE + SVG_PADDING + 50,
  });

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <defs>
    <style>
      text { font-family: 'Helvetica Neue', Arial, sans-serif; }
      .panel-label { font-size: 10px; fill: ${COLORS.text}; }
      .measurement { font-size: 8px; fill: ${COLORS.text}; }
      .title { font-size: 14px; font-weight: bold; fill: ${COLORS.text}; }
      .meta { font-size: 9px; fill: #666; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${svgW}" height="${svgH}" fill="${COLORS.background}"/>`;

  // Grid
  if (showGrid) {
    svg += `\n  <g opacity="0.5">`;
    for (let x = 0; x < svgW; x += 10) {
      svg += `\n    <line x1="${x}" y1="0" x2="${x}" y2="${svgH}" stroke="${COLORS.grid}" stroke-width="0.5"/>`;
    }
    for (let y = 0; y < svgH; y += 10) {
      svg += `\n    <line x1="0" y1="${y}" x2="${svgW}" y2="${y}" stroke="${COLORS.grid}" stroke-width="0.5"/>`;
    }
    svg += `\n  </g>`;
  }

  // Header
  svg += `
  <text x="${SVG_PADDING}" y="20" class="title">${title}</text>
  <text x="${SVG_PADDING}" y="34" class="meta">Designer: ${designer || 'SPX Mesh Editor'} | Size: ${size} | Generated: ${new Date().toLocaleDateString()}</text>
  <line x1="${SVG_PADDING}" y1="42" x2="${svgW - SVG_PADDING}" y2="42" stroke="${COLORS.outline}" stroke-width="0.5"/>`;

  // Draw each panel
  panels.forEach((panel, idx) => {
    if (!panel.points || panel.points.length < 2) return;

    const pts = panel.points.map(p => toSVG(p.x, p.y));
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

    // Panel fill + outline
    svg += `
  <g id="panel-${idx}">
    <path d="${pathD}" fill="rgba(200,220,255,0.15)" stroke="${COLORS.outline}" stroke-width="1.5" stroke-linejoin="round"/>`;

    // Seam allowance outline
    if (showSeamAllowance && panel.seamAllowance) {
      const sa = panel.seamAllowance * SVG_SCALE;
      svg += `\n    <path d="${pathD}" fill="none" stroke="${COLORS.seamLine}" stroke-width="0.5" stroke-dasharray="4,2" transform="scale(1.02) translate(-${sa * 0.01}, -${sa * 0.01})"/>`;
    }

    // Grain line (vertical through center)
    if (showGrainLine) {
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const minPY = Math.min(...pts.map(p => p.y));
      const maxPY = Math.max(...pts.map(p => p.y));
      svg += `
    <line x1="${cx.toFixed(1)}" y1="${(minPY + 10).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(maxPY - 10).toFixed(1)}"
      stroke="${COLORS.grainLine}" stroke-width="0.75" stroke-dasharray="6,3"/>
    <polygon points="${cx.toFixed(1)},${(minPY + 10).toFixed(1)} ${(cx - 3).toFixed(1)},${(minPY + 16).toFixed(1)} ${(cx + 3).toFixed(1)},${(minPY + 16).toFixed(1)}"
      fill="${COLORS.grainLine}"/>
    <polygon points="${cx.toFixed(1)},${(maxPY - 10).toFixed(1)} ${(cx - 3).toFixed(1)},${(maxPY - 16).toFixed(1)} ${(cx + 3).toFixed(1)},${(maxPY - 16).toFixed(1)}"
      fill="${COLORS.grainLine}"/>`;
    }

    // Panel label
    const labelX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const labelY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    svg += `
    <text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" class="panel-label" text-anchor="middle">${panel.name || `Panel ${idx + 1}`}</text>`;

    // Measurements
    if (showMeasurements && panel.points.length >= 2) {
      const widthPx = (Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x)));
      const heightPx = (Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y)));
      const widthMM = (widthPx / SVG_SCALE).toFixed(0);
      const heightMM = (heightPx / SVG_SCALE).toFixed(0);
      svg += `
    <text x="${labelX.toFixed(1)}" y="${(labelY + 12).toFixed(1)}" class="measurement" text-anchor="middle">${widthMM}×${heightMM}mm</text>`;
    }

    // Dart lines
    if (showDarts && panel.darts?.length) {
      panel.darts.forEach(dart => {
        const p = pts[dart.pointIndex] || pts[0];
        svg += `\n    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="none" stroke="${COLORS.dartLine}" stroke-width="1"/>`;
      });
    }

    // Notches at seam intersections
    pts.forEach(p => {
      svg += `\n    <line x1="${(p.x - 4).toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${(p.x + 4).toFixed(1)}" y2="${p.y.toFixed(1)}"
        stroke="${COLORS.notch}" stroke-width="1.5"/>`;
    });

    svg += `\n  </g>`;
  });

  // Legend
  svg += `
  <g transform="translate(${svgW - 120}, ${svgH - 80})">
    <rect width="110" height="70" fill="white" stroke="${COLORS.outline}" stroke-width="0.5" rx="3"/>
    <text x="6" y="14" style="font-size:8px;font-weight:bold;fill:${COLORS.text}">LEGEND</text>
    <line x1="6" y1="22" x2="30" y2="22" stroke="${COLORS.outline}" stroke-width="1.5"/>
    <text x="34" y="25" style="font-size:7px;fill:${COLORS.text}">Cut line</text>
    <line x1="6" y1="34" x2="30" y2="34" stroke="${COLORS.seamLine}" stroke-width="0.5" stroke-dasharray="4,2"/>
    <text x="34" y="37" style="font-size:7px;fill:${COLORS.text}">Seam allowance</text>
    <line x1="6" y1="46" x2="30" y2="46" stroke="${COLORS.grainLine}" stroke-width="0.75" stroke-dasharray="6,3"/>
    <text x="34" y="49" style="font-size:7px;fill:${COLORS.text}">Grain line</text>
    <line x1="6" y1="58" x2="30" y2="58" stroke="${COLORS.dartLine}" stroke-width="1"/>
    <text x="34" y="61" style="font-size:7px;fill:${COLORS.text}">Dart/pleat</text>
  </g>`;

  svg += `\n</svg>`;
  return svg;
}

function generateEmptySketch(title) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="400" height="200" fill="#f9f9f9" stroke="#ccc"/>
  <text x="200" y="90" text-anchor="middle" style="font-size:14px;fill:#666">${title}</text>
  <text x="200" y="110" text-anchor="middle" style="font-size:11px;fill:#999">Add pattern panels to generate flat sketch</text>
</svg>`;
}

/**
 * Download SVG flat sketch as file
 */
export function downloadFlatSketch(panels, options = {}) {
  const svg = exportFlatSketch(panels, options);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(options.title || 'pattern').replace(/\s+/g, '_')}_flat_sketch.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Get SVG as data URL for preview
 */
export function getFlatSketchDataURL(panels, options = {}) {
  const svg = exportFlatSketch(panels, options);
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
