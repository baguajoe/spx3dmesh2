import * as THREE from "three";

export function findLatestHairGroup(scene) {
  let latest = null;
  scene?.traverse((obj) => {
    if (obj?.isGroup && (obj.name || "").toLowerCase().startsWith("hair_")) {
      latest = obj;
    }
  });
  return latest;
}

export function getHairCards(group) {
  const cards = [];
  group?.traverse((obj) => {
    if (obj?.isMesh && (obj.name || "").toLowerCase().includes("hair_card")) {
      cards.push(obj);
    }
  });
  return cards;
}

function samplePolyline(points = [], t = 0) {
  if (!points.length) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  const segLens = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLens.push(len);
    total += len;
  }

  const dist = t * Math.max(total, 1e-6);
  let acc = 0;

  for (let i = 0; i < segLens.length; i++) {
    const next = acc + segLens[i];
    if (dist <= next || i === segLens.length - 1) {
      const lt = (dist - acc) / Math.max(segLens[i], 1e-6);
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * lt,
        y: points[i].y + (points[i + 1].y - points[i].y) * lt,
      };
    }
    acc = next;
  }

  return points[points.length - 1];
}

function sampleTangent(points = [], t = 0) {
  if (points.length < 2) return { x: 0, y: 1 };
  const p1 = samplePolyline(points, Math.max(0, t - 0.01));
  const p2 = samplePolyline(points, Math.min(1, t + 0.01));
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function applyBraidPathToHair(group, pathPoints = [], {
  width = 0.0025,
  depth = 0.002,
  spread = 0.03,
  yOffset = 0,
  zOffset = 0,
} = {}) {
  const cards = getHairCards(group);
  if (!group || !cards.length || pathPoints.length < 2) return false;

  cards.forEach((card, i) => {
    const t = cards.length <= 1 ? 0 : i / (cards.length - 1);
    const p = samplePolyline(pathPoints, t);
    const tangent = sampleTangent(pathPoints, t);
    const side = (i % 3) - 1;

    card.position.set(
      p.x + side * spread * width * 8,
      p.y + yOffset,
      zOffset + side * depth
    );

    const look = new THREE.Vector3(
      p.x + tangent.x,
      p.y + tangent.y,
      zOffset
    );

    card.lookAt(look);
    card.visible = true;
    card.scale.x = 0.45 + Math.abs(side) * 0.15;
    card.scale.y = 0.85;
  });

  group.userData.braidPath = pathPoints.map((p) => ({ ...p }));
  return true;
}

export function applyLineupToHair(group, {
  lineY = 1.55,
  softness = 0.04,
  invert = false,
} = {}) {
  const cards = getHairCards(group);
  if (!cards.length) return false;

  cards.forEach((card) => {
    const y = card.position.y;
    const delta = y - lineY;
    const keep = invert ? delta <= softness : delta >= -softness;
    card.visible = keep;
    if (card.material && "opacity" in card.material) {
      const falloff = Math.max(0, Math.min(1, (delta + softness) / Math.max(softness * 2, 1e-6)));
      card.material.opacity = keep ? Math.max(0.2, falloff) : 0.05;
      card.material.transparent = true;
      card.material.needsUpdate = true;
    }
  });

  group.userData.lineup = { lineY, softness, invert };
  return true;
}

export function applyFadeGradientToHair(group, {
  topY = 1.9,
  bottomY = 1.2,
  minOpacity = 0.08,
} = {}) {
  const cards = getHairCards(group);
  if (!cards.length) return false;

  const span = Math.max(1e-6, topY - bottomY);

  cards.forEach((card) => {
    const y = card.position.y;
    const t = Math.max(0, Math.min(1, (y - bottomY) / span));
    if (card.material && "opacity" in card.material) {
      card.material.opacity = minOpacity + t * (1 - minOpacity);
      card.material.transparent = true;
      card.material.needsUpdate = true;
    }
    card.visible = t > 0.02;
    card.scale.x = 0.65 + t * 0.35;
  });

  group.userData.fade = { topY, bottomY, minOpacity };
  return true;
}

export function trimBeardGroup(group, {
  trimY = 0.15,
  curve = 0,
} = {}) {
  const cards = getHairCards(group);
  if (!cards.length) return false;

  cards.forEach((card) => {
    const x = card.position.x;
    const localTrim = trimY + Math.abs(x) * curve;
    card.visible = card.position.y >= localTrim;
  });

  group.userData.beardTrim = { trimY, curve };
  return true;
}

export function createScalpMaskCanvas(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  return { canvas, ctx };
}

export function paintMaskDot(ctx, x, y, radius = 18, strength = 0.25, erase = false) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const alpha = Math.max(0, Math.min(1, strength));
  const value = erase ? 255 : Math.round(255 * (1 - alpha));
  ctx.fillStyle = `rgb(${value},${value},${value})`;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function sampleMask(canvas, u, v) {
  if (!canvas) return 1;
  const ctx = canvas.getContext("2d");
  const x = Math.max(0, Math.min(canvas.width - 1, Math.round(u * (canvas.width - 1))));
  const y = Math.max(0, Math.min(canvas.height - 1, Math.round(v * (canvas.height - 1))));
  const data = ctx.getImageData(x, y, 1, 1).data;
  return data[0] / 255;
}

export function applyDensityMaskToHair(group, canvas) {
  const cards = getHairCards(group);
  if (!cards.length || !canvas) return false;

  cards.forEach((card) => {
    const u = Math.max(0, Math.min(1, card.position.x * 0.5 + 0.5));
    const v = Math.max(0, Math.min(1, 1 - (card.position.y * 0.35 + 0.2)));
    const d = sampleMask(canvas, u, v);
    card.visible = d > 0.2;
    if (card.material && "opacity" in card.material) {
      card.material.opacity = Math.max(0.05, d);
      card.material.transparent = true;
      card.material.needsUpdate = true;
    }
  });

  return true;
}
