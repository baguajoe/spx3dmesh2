export function createDefaultRigGuides() {
  return {
    head: { x: 210, y: 55 },
    neck: { x: 210, y: 95 },
    chest: { x: 210, y: 140 },
    spine: { x: 210, y: 190 },
    hips: { x: 210, y: 245 },

    shoulder_l: { x: 145, y: 120 },
    elbow_l: { x: 105, y: 175 },
    wrist_l: { x: 82, y: 235 },

    shoulder_r: { x: 275, y: 120 },
    elbow_r: { x: 315, y: 175 },
    wrist_r: { x: 338, y: 235 },

    hip_l: { x: 180, y: 255 },
    knee_l: { x: 172, y: 355 },
    ankle_l: { x: 166, y: 452 },

    hip_r: { x: 240, y: 255 },
    knee_r: { x: 248, y: 355 },
    ankle_r: { x: 254, y: 452 },
  };
}

export function mirrorGuidePoint(key, point, guides) {
  const centerX = guides?.hips?.x ?? 210;
  if (key.endsWith("_l")) {
    const rightKey = key.replace("_l", "_r");
    return { mirrorKey: rightKey, mirrorPoint: { x: centerX + (centerX - point.x), y: point.y } };
  }
  if (key.endsWith("_r")) {
    const leftKey = key.replace("_r", "_l");
    return { mirrorKey: leftKey, mirrorPoint: { x: centerX + (centerX - point.x), y: point.y } };
  }
  return null;
}

export function guidesToRigSettings(guides) {
  const spineCount = 4;
  const armSegments = 2;
  const legSegments = 2;

  const bodyHeight = Math.max(100, (guides.ankle_l?.y ?? 452) - (guides.head?.y ?? 55));
  const scale = Math.max(0.5, Math.min(2.2, bodyHeight / 390));

  return {
    spineCount,
    armSegments,
    legSegments,
    scale,
    guides,
  };
}
