export function createEmptyPanel(name = "Panel 1") {
  return {
    id: `panel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    closed: false,
    mirrored: false,
    points: [],
  };
}

export function clonePanel(panel) {
  return {
    ...panel,
    points: (panel.points || []).map((p) => ({ ...p })),
  };
}

export function clonePanels(panels = []) {
  return panels.map(clonePanel);
}

export function addPanel(panels = [], name = null) {
  const next = clonePanels(panels);
  next.push(createEmptyPanel(name || `Panel ${next.length + 1}`));
  return next;
}

export function removePanel(panels = [], panelId) {
  return clonePanels(panels).filter((p) => p.id !== panelId);
}

export function addPointToPanel(panels = [], panelId, point) {
  return clonePanels(panels).map((panel) => {
    if (panel.id !== panelId) return panel;
    const next = clonePanel(panel);
    next.points.push({ x: point.x, y: point.y });
    return next;
  });
}

export function updatePointInPanel(panels = [], panelId, pointIndex, point) {
  return clonePanels(panels).map((panel) => {
    if (panel.id !== panelId) return panel;
    const next = clonePanel(panel);
    if (!next.points[pointIndex]) return next;
    next.points[pointIndex] = { x: point.x, y: point.y };
    return next;
  });
}

export function closePanel(panels = [], panelId) {
  return clonePanels(panels).map((panel) =>
    panel.id === panelId ? { ...clonePanel(panel), closed: true } : clonePanel(panel)
  );
}

export function toggleMirrorPanel(panels = [], panelId) {
  return clonePanels(panels).map((panel) =>
    panel.id === panelId ? { ...clonePanel(panel), mirrored: !panel.mirrored } : clonePanel(panel)
  );
}

export function movePanel(panels = [], panelId, dx = 0, dy = 0) {
  return clonePanels(panels).map((panel) => {
    if (panel.id !== panelId) return panel;
    const next = clonePanel(panel);
    next.points = next.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    return next;
  });
}

export function snapPoint(point, step = 10) {
  return {
    x: Math.round(point.x / step) * step,
    y: Math.round(point.y / step) * step,
  };
}

export function mirrorPanelPoints(panel, axisX = 256) {
  const next = clonePanel(panel);
  next.points = next.points.map((p) => ({
    x: axisX - (p.x - axisX),
    y: p.y,
  }));
  return next;
}

export function panelBounds(panel) {
  const pts = panel.points || [];
  if (!pts.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return {
    minX, minY, maxX, maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
