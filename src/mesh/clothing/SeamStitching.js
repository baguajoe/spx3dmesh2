export function createSeam(panelA, edgeA, panelB, edgeB) {
  return {
    id: `seam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    panelA,
    edgeA,
    panelB,
    edgeB,
    strength: 1,
  };
}

export function cloneSeams(seams = []) {
  return seams.map((s) => ({ ...s }));
}

export function addSeam(seams = [], seam) {
  return [...cloneSeams(seams), { ...seam }];
}

export function removeSeam(seams = [], seamId) {
  return cloneSeams(seams).filter((s) => s.id !== seamId);
}

export function panelEdges(panel) {
  const pts = panel?.points || [];
  if (pts.length < 2) return [];

  const edges = [];
  for (let i = 0; i < pts.length - 1; i++) {
    edges.push({
      index: i,
      a: pts[i],
      b: pts[i + 1],
    });
  }

  if (panel.closed && pts.length > 2) {
    edges.push({
      index: pts.length - 1,
      a: pts[pts.length - 1],
      b: pts[0],
    });
  }

  return edges;
}

export function edgeMidpoint(edge) {
  return {
    x: (edge.a.x + edge.b.x) / 2,
    y: (edge.a.y + edge.b.y) / 2,
  };
}
