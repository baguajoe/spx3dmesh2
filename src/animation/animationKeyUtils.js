export const AUTO_KEY_MODES = {
  OFF: "off",
  CHANGED: "changed",
  ALL: "all",
};

export const KEY_INSERT_MODES = {
  LOC_ROT_SCALE: "loc_rot_scale",
  LOC: "loc",
  ROT: "rot",
  SCALE: "scale",
};

const EPS = 1e-6;

export function getNextAutoKeyMode(mode) {
  if (mode === AUTO_KEY_MODES.OFF) return AUTO_KEY_MODES.CHANGED;
  if (mode === AUTO_KEY_MODES.CHANGED) return AUTO_KEY_MODES.ALL;
  return AUTO_KEY_MODES.OFF;
}

export function getAutoKeyLabel(mode) {
  if (mode === AUTO_KEY_MODES.CHANGED) return "Auto Key: Changed";
  if (mode === AUTO_KEY_MODES.ALL) return "Auto Key: All";
  return "Auto Key: Off";
}

export function getChannelsForInsertMode(mode) {
  switch (mode) {
    case KEY_INSERT_MODES.LOC:
      return ["position"];
    case KEY_INSERT_MODES.ROT:
      return ["rotation"];
    case KEY_INSERT_MODES.SCALE:
      return ["scale"];
    case KEY_INSERT_MODES.LOC_ROT_SCALE:
    default:
      return ["position", "rotation", "scale"];
  }
}

export function clonePropertyValue(object, property) {
  const value = object?.[property];
  if (!value) return value;

  if (typeof value.clone === "function") return value.clone();
  if (Array.isArray(value)) return [...value];
  if (typeof value === "object") return { ...value };

  return value;
}

export function snapshotTransform(target) {
  if (!target) return null;
  return {
    position: clonePropertyValue(target, "position"),
    rotation: clonePropertyValue(target, "rotation"),
    scale: clonePropertyValue(target, "scale"),
  };
}

function numChanged(a, b) {
  return Math.abs((a ?? 0) - (b ?? 0)) > EPS;
}

function vecLikeChanged(a, b) {
  if (!a || !b) return a !== b;

  if ("x" in a && "x" in b) {
    return numChanged(a.x, b.x) || numChanged(a.y, b.y) || numChanged(a.z, b.z);
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length !== b.length || a.some((v, i) => numChanged(v, b[i]));
  }

  return a !== b;
}

export function getChangedTransformChannels(beforeSnap, afterSnap) {
  if (!beforeSnap || !afterSnap) return [];

  const changed = [];
  if (vecLikeChanged(beforeSnap.position, afterSnap.position)) changed.push("position");
  if (vecLikeChanged(beforeSnap.rotation, afterSnap.rotation)) changed.push("rotation");
  if (vecLikeChanged(beforeSnap.scale, afterSnap.scale)) changed.push("scale");
  return changed;
}

export function getAutoKeyChannels({
  autoKeyMode,
  keyInsertMode,
  beforeSnap,
  afterSnap,
}) {
  const requested = getChannelsForInsertMode(keyInsertMode);

  if (autoKeyMode === AUTO_KEY_MODES.ALL) {
    return requested;
  }

  if (autoKeyMode === AUTO_KEY_MODES.CHANGED) {
    const changed = getChangedTransformChannels(beforeSnap, afterSnap);
    return requested.filter((ch) => changed.includes(ch));
  }

  return [];
}

export function recordTransformKeyset(recordKeyframe, target, frame, mode = KEY_INSERT_MODES.LOC_ROT_SCALE) {
  if (!target || !recordKeyframe) return 0;

  const channels = getChannelsForInsertMode(mode);
  let count = 0;

  for (const property of channels) {
    const value = clonePropertyValue(target, property);
    if (value === undefined) continue;

    recordKeyframe(target, property, value, frame);
    count++;
  }

  return count;
}

export function recordAutoKeyTransform({
  recordKeyframe,
  target,
  frame,
  autoKeyMode,
  keyInsertMode,
  beforeSnap,
  afterSnap,
}) {
  if (!target || !recordKeyframe || autoKeyMode === AUTO_KEY_MODES.OFF) return 0;

  const channels = getAutoKeyChannels({
    autoKeyMode,
    keyInsertMode,
    beforeSnap,
    afterSnap,
  });

  let count = 0;

  for (const property of channels) {
    const value = clonePropertyValue(target, property);
    if (value === undefined) continue;

    recordKeyframe(target, property, value, frame);
    count++;
  }

  return count;
}
