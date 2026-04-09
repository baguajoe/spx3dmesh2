import * as THREE from "three";

// ── Grease Pencil stroke data ─────────────────────────────────────────────────
export function createStroke(points = [], color = "#ffffff", thickness = 2) {
  return {
    id:        crypto.randomUUID(),
    points,    // [{x,y,z,pressure}]
    color,
    thickness,
    frame:     0,
    opacity:   1.0,
  };
}

// ── Create Grease Pencil layer ────────────────────────────────────────────────
export function createLayer(name = "GP_Layer") {
  return {
    id:      crypto.randomUUID(),
    name,
    frames:  {}, // { frameNumber: [strokes] }
    visible: true,
    locked:  false,
    color:   "#00ffc8",
    opacity: 1.0,
  };
}

// ── Add stroke to layer frame ─────────────────────────────────────────────────
export function addStrokeToFrame(layer, frameNumber, stroke) {
  if (!layer.frames[frameNumber]) layer.frames[frameNumber] = [];
  layer.frames[frameNumber].push(stroke);
}

// ── Build THREE.js line from stroke ──────────────────────────────────────────
export function buildStrokeMesh(stroke) {
  if (stroke.points.length < 2) return null;
  const points = stroke.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const geo    = new THREE.BufferGeometry().setFromPoints(points);
  const mat    = new THREE.LineBasicMaterial({
    color:       stroke.color,
    linewidth:   stroke.thickness,
    transparent: stroke.opacity < 1,
    opacity:     stroke.opacity,
  });
  const line   = new THREE.Line(geo, mat);
  line.userData.strokeId = stroke.id;
  return line;
}

// ── Build all strokes for a frame ─────────────────────────────────────────────
export function buildFrameMeshes(layer, frameNumber) {
  const strokes = layer.frames[frameNumber] || [];
  return strokes.map(buildStrokeMesh).filter(Boolean);
}

// ── Convert stroke to mesh (tube geometry) ────────────────────────────────────
export function strokeToMesh(stroke, radius = 0.02) {
  if (stroke.points.length < 2) return null;
  const points = stroke.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const curve  = new THREE.CatmullRomCurve3(points);
  const geo    = new THREE.TubeGeometry(curve, points.length * 4, radius, 8, false);
  const mat    = new THREE.MeshStandardMaterial({ color: stroke.color });
  return new THREE.Mesh(geo, mat);
}

// ── Onion skin — show adjacent frames ────────────────────────────────────────
export function buildOnionSkin(layer, currentFrame, before = 2, after = 1) {
  const group = new THREE.Group();
  group.name  = "OnionSkin";

  for (let f = currentFrame - before; f <= currentFrame + after; f++) {
    if (f === currentFrame) continue;
    const strokes = layer.frames[f] || [];
    const alpha   = 1 - Math.abs(f - currentFrame) / (before + after + 1);
    strokes.forEach(stroke => {
      const mesh = buildStrokeMesh({
        ...stroke,
        color:   f < currentFrame ? "#4444ff" : "#ff4444",
        opacity: alpha * 0.5,
      });
      if (mesh) group.add(mesh);
    });
  }

  return group;
}

// ── Interpolate stroke between two frames ─────────────────────────────────────
export function interpolateStrokes(strokeA, strokeB, t) {
  if (!strokeA || !strokeB) return strokeA || strokeB;
  const len    = Math.min(strokeA.points.length, strokeB.points.length);
  const points = [];
  for (let i = 0; i < len; i++) {
    const a = strokeA.points[i], b = strokeB.points[i];
    points.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      pressure: a.pressure + (b.pressure - a.pressure) * t,
    });
  }
  return createStroke(points, strokeA.color, strokeA.thickness);
}

// ── Animate grease pencil — get strokes at frame ──────────────────────────────
export function getStrokesAtFrame(layer, frame) {
  if (layer.frames[frame]) return layer.frames[frame];
  // Find nearest frames for interpolation
  const frames = Object.keys(layer.frames).map(Number).sort((a,b)=>a-b);
  if (!frames.length) return [];
  if (frame < frames[0])  return layer.frames[frames[0]];
  if (frame > frames[frames.length-1]) return layer.frames[frames[frames.length-1]];
  for (let i = 0; i < frames.length-1; i++) {
    if (frame >= frames[i] && frame <= frames[i+1]) {
      const t = (frame - frames[i]) / (frames[i+1] - frames[i]);
      const strokesA = layer.frames[frames[i]];
      const strokesB = layer.frames[frames[i+1]];
      return strokesA.map((s, idx) => interpolateStrokes(s, strokesB[idx], t));
    }
  }
  return [];
}

// ── Clear frame ───────────────────────────────────────────────────────────────
export function clearFrame(layer, frame) {
  delete layer.frames[frame];
}

// ── Duplicate frame ───────────────────────────────────────────────────────────
export function duplicateFrame(layer, fromFrame, toFrame) {
  const strokes = layer.frames[fromFrame];
  if (!strokes) return;
  layer.frames[toFrame] = strokes.map(s => ({
    ...s, id: crypto.randomUUID(), points: [...s.points],
  }));
}
