import * as THREE from "three";
import { panelBounds } from "./PatternEditor.js";

function shapeFromPanel(panel) {
  const pts = panel.points || [];
  if (pts.length < 3) return null;

  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, -pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x, -pts[i].y);
  }
  if (panel.closed) {
    shape.lineTo(pts[0].x, -pts[0].y);
  }
  return shape;
}

export function panelToGeometry(panel, {
  scale = 0.01,
  depth = 0.03,
} = {}) {
  const shape = shapeFromPanel(panel);
  if (!shape) return null;

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
  });

  geo.scale(scale, scale, scale);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

export function panelsToGarmentMesh(panels = [], {
  color = 0xa7b7d1,
  scale = 0.01,
  depth = 0.03,
  spacing = 0.05,
} = {}) {
  const group = new THREE.Group();
  group.name = "garment_pattern_generated";

  let offsetX = 0;

  for (const panel of panels) {
    const geo = panelToGeometry(panel, { scale, depth });
    if (!geo) continue;

    const mat = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.03,
    });

    const mesh = new THREE.Mesh(geo, mat);
    const b = panelBounds(panel);
    mesh.position.set(offsetX, 1.2, 0);
    mesh.name = `garment_panel_${panel.name.replace(/\s+/g, "_").toLowerCase()}`;
    offsetX += b.width * scale + spacing;
    group.add(mesh);
  }

  return group;
}

export function addPatternGarmentToScene(scene, panels = [], opts = {}) {
  if (!scene || !panels.length) return null;
  const group = panelsToGarmentMesh(panels, opts);
  scene.add(group);
  return group;
}
