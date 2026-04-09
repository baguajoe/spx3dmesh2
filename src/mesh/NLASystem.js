import * as THREE from "three";

// ── Action — a named set of keyframes ────────────────────────────────────────
export function createAction(name, keys = {}) {
  return {
    id:        crypto.randomUUID(),
    name:      name || "Action_" + Date.now(),
    keys,      // { objectId: { property: { frame: value } } }
    frameStart: 0,
    frameEnd:   120,
  };
}

// ── NLA Track ────────────────────────────────────────────────────────────────
export function createTrack(name = "Track") {
  return {
    id:      crypto.randomUUID(),
    name,
    strips:  [],
    muted:   false,
    solo:    false,
  };
}

// ── NLA Strip — action placed on timeline ────────────────────────────────────
export function createStrip(action, options = {}) {
  return {
    id:          crypto.randomUUID(),
    actionId:    action.id,
    actionName:  action.name,
    frameStart:  options.frameStart  || 0,
    frameEnd:    options.frameEnd    || action.frameEnd || 120,
    scale:       options.scale       || 1.0,
    offset:      options.offset      || 0,
    blendMode:   options.blendMode   || "replace", // replace|add|multiply
    influence:   options.influence   || 1.0,
    repeat:      options.repeat      || 1,
    muted:       false,
  };
}

// ── Evaluate NLA at frame ─────────────────────────────────────────────────────
export function evaluateNLA(tracks, actions, frame) {
  const result = {}; // { objectId: { property: value } }

  tracks.forEach(track => {
    if (track.muted) return;
    track.strips.forEach(strip => {
      if (strip.muted) return;
      const action = actions.find(a => a.id === strip.actionId);
      if (!action) return;

      // Map global frame to local action frame
      const localFrame = ((frame - strip.frameStart) / strip.scale) + strip.offset;
      const actionLen  = strip.frameEnd - strip.frameStart;
      if (localFrame < 0 || localFrame > actionLen * strip.repeat) return;
      const loopedFrame = strip.repeat > 1 ? localFrame % actionLen : localFrame;

      // Extract values from action
      Object.entries(action.keys).forEach(([objId, channels]) => {
        if (!result[objId]) result[objId] = {};
        Object.entries(channels).forEach(([prop, keyframes]) => {
          const frames = Object.keys(keyframes).map(Number).sort((a,b)=>a-b);
          if (!frames.length) return;
          let value = keyframes[frames[frames.length-1]];
          for (let i = 0; i < frames.length-1; i++) {
            if (loopedFrame >= frames[i] && loopedFrame <= frames[i+1]) {
              const t = (loopedFrame-frames[i])/(frames[i+1]-frames[i]);
              value = keyframes[frames[i]] + (keyframes[frames[i+1]]-keyframes[frames[i]])*t;
              break;
            }
          }
          // Blend modes
          if (strip.blendMode === "add" && result[objId][prop] !== undefined) {
            result[objId][prop] += value * strip.influence;
          } else if (strip.blendMode === "multiply" && result[objId][prop] !== undefined) {
            result[objId][prop] *= value * strip.influence;
          } else {
            result[objId][prop] = value * strip.influence;
          }
        });
      });
    });
  });

  return result;
}

// ── Push down current keys as action ─────────────────────────────────────────
export function pushDownAction(name, currentKeys, frameEnd = 120) {
  const action = createAction(name, JSON.parse(JSON.stringify(currentKeys)));
  action.frameEnd = frameEnd;
  return action;
}

// ── Bake NLA to flat keyframes ────────────────────────────────────────────────
export function bakeNLA(tracks, actions, frameStart, frameEnd) {
  const baked = {};
  for (let f = frameStart; f <= frameEnd; f++) {
    const result = evaluateNLA(tracks, actions, f);
    Object.entries(result).forEach(([objId, channels]) => {
      if (!baked[objId]) baked[objId] = {};
      Object.entries(channels).forEach(([prop, val]) => {
        if (!baked[objId][prop]) baked[objId][prop] = {};
        baked[objId][prop][f] = val;
      });
    });
  }
  return baked;
}
