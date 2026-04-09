// FootPlantSolver.js — Foot Plant Detection + IK Foot Lock
// SPX Mesh Editor | StreamPireX
// Eliminates floating feet / foot sliding in recorded mocap sessions

// MediaPipe landmark indices
const L_ANKLE = 27, R_ANKLE = 28;
const L_KNEE  = 25, R_KNEE  = 26;
const L_HIP   = 23, R_HIP   = 24;
const L_HEEL  = 29, R_HEEL  = 30;
const L_TOE   = 31, R_TOE   = 32;

// ─── Foot Plant Detection ─────────────────────────────────────────────────────

/**
 * Detect which frames have planted feet based on velocity + height thresholds
 * Returns array of { frameIdx, leftPlanted, rightPlanted, groundY }
 */
export function detectFootPlants(frames, options = {}) {
  const {
    velocityThreshold = 0.008,  // max movement per frame to be considered planted
    heightThreshold   = 0.08,   // max Y from ground to be considered planted
    minPlantFrames    = 3,       // min consecutive frames to confirm plant
  } = options;

  if (!frames?.length) return [];

  // Find ground level — lowest ankle Y across all frames
  let groundY = Infinity;
  frames.forEach(f => {
    const lAnkle = f.landmarks?.[L_ANKLE];
    const rAnkle = f.landmarks?.[R_ANKLE];
    if (lAnkle) groundY = Math.min(groundY, lAnkle.y);
    if (rAnkle) groundY = Math.min(groundY, rAnkle.y);
  });
  if (groundY === Infinity) groundY = 1.0; // fallback

  const plants = frames.map((frame, i) => {
    const lAnkle = frame.landmarks?.[L_ANKLE];
    const rAnkle = frame.landmarks?.[R_ANKLE];
    const prevLAnkle = i > 0 ? frames[i-1].landmarks?.[L_ANKLE] : null;
    const prevRAnkle = i > 0 ? frames[i-1].landmarks?.[R_ANKLE] : null;

    const lVel = prevLAnkle && lAnkle
      ? Math.hypot(lAnkle.x - prevLAnkle.x, lAnkle.y - prevLAnkle.y, (lAnkle.z||0) - (prevLAnkle.z||0))
      : velocityThreshold + 1;

    const rVel = prevRAnkle && rAnkle
      ? Math.hypot(rAnkle.x - prevRAnkle.x, rAnkle.y - prevRAnkle.y, (rAnkle.z||0) - (prevRAnkle.z||0))
      : velocityThreshold + 1;

    const lHeight = lAnkle ? Math.abs(lAnkle.y - groundY) : Infinity;
    const rHeight = rAnkle ? Math.abs(rAnkle.y - groundY) : Infinity;

    return {
      frameIdx:     i,
      leftPlanted:  lVel < velocityThreshold && lHeight < heightThreshold,
      rightPlanted: rVel < velocityThreshold && rHeight < heightThreshold,
      groundY,
    };
  });

  // Require minPlantFrames consecutive to confirm (removes false positives)
  for (let i = 0; i < plants.length; i++) {
    if (plants[i].leftPlanted) {
      let count = 0;
      for (let j = i; j < plants.length && plants[j].leftPlanted; j++) count++;
      if (count < minPlantFrames) {
        for (let j = i; j < i + count; j++) plants[j].leftPlanted = false;
      }
    }
    if (plants[i].rightPlanted) {
      let count = 0;
      for (let j = i; j < plants.length && plants[j].rightPlanted; j++) count++;
      if (count < minPlantFrames) {
        for (let j = i; j < i + count; j++) plants[j].rightPlanted = false;
      }
    }
  }

  return plants;
}

// ─── IK Foot Lock ─────────────────────────────────────────────────────────────

/**
 * For planted frames, clamp ankle to ground and propagate correction up leg via 2-bone IK
 */
function solveTwoBoneIK(hip, knee, ankle, targetAnkle) {
  // Simple 2-bone IK: maintain bone lengths, move knee to satisfy ankle target
  const hipV    = { x: hip.x,    y: hip.y,    z: hip.z || 0 };
  const kneeV   = { x: knee.x,   y: knee.y,   z: knee.z || 0 };
  const ankleV  = { x: ankle.x,  y: ankle.y,  z: ankle.z || 0 };
  const targetV = { x: targetAnkle.x, y: targetAnkle.y, z: targetAnkle.z || 0 };

  const upperLen = dist3(hipV, kneeV);
  const lowerLen = dist3(kneeV, ankleV);
  const totalLen = upperLen + lowerLen;
  const hipToTarget = dist3(hipV, targetV);

  if (hipToTarget > totalLen * 0.99) {
    // Fully extended — stretch toward target
    const dir = normalize3(sub3(targetV, hipV));
    return {
      knee:  add3(hipV, scale3(dir, upperLen)),
      ankle: targetV,
    };
  }

  // Law of cosines to find knee angle
  const cosKnee = (upperLen * upperLen + lowerLen * lowerLen - hipToTarget * hipToTarget)
    / (2 * upperLen * lowerLen);
  const cosHip = (upperLen * upperLen + hipToTarget * hipToTarget - lowerLen * lowerLen)
    / (2 * upperLen * hipToTarget);

  const hipToTargetDir = normalize3(sub3(targetV, hipV));

  // Build perpendicular in XY plane for knee bend direction
  const bendAxis = { x: 0, y: 0, z: 1 }; // forward bend
  const perp = normalize3(cross3(hipToTargetDir, bendAxis));

  const hipAngle = Math.acos(Math.max(-1, Math.min(1, cosHip)));
  const kneePos = add3(
    hipV,
    add3(
      scale3(hipToTargetDir, upperLen * Math.cos(hipAngle)),
      scale3(perp, upperLen * Math.sin(hipAngle))
    )
  );

  return { knee: kneePos, ankle: targetV };
}

// ─── Main Fix Function ────────────────────────────────────────────────────────

/**
 * Apply foot plant correction to all frames
 * Returns new frames array with corrected landmarks
 */
export function fixFootPlanting(frames, options = {}) {
  if (!frames?.length) return frames;

  const plants = detectFootPlants(frames, options);
  const { groundY } = plants[0] ?? { groundY: 1.0 };

  // Track locked ankle positions during plant phases
  let lockedLAnkle = null;
  let lockedRAnkle = null;

  return frames.map((frame, i) => {
    if (!frame.landmarks) return frame;

    const plant = plants[i];
    if (!plant) return frame;

    const lms = frame.landmarks.map(l => ({ ...l }));

    // ── Left foot ──
    if (plant.leftPlanted) {
      const ankle = lms[L_ANKLE];
      if (ankle) {
        // Lock ankle on first planted frame, keep it locked
        if (!lockedLAnkle || (i > 0 && !plants[i-1]?.leftPlanted)) {
          lockedLAnkle = { x: ankle.x, y: groundY, z: ankle.z || 0, visibility: ankle.visibility };
        }
        const target = lockedLAnkle;
        const hip    = lms[L_HIP];
        const knee   = lms[L_KNEE];
        if (hip && knee && ankle) {
          const solved = solveTwoBoneIK(hip, knee, ankle, target);
          lms[L_KNEE]  = { ...lms[L_KNEE],  x: solved.knee.x,  y: solved.knee.y,  z: solved.knee.z };
          lms[L_ANKLE] = { ...lms[L_ANKLE], x: solved.ankle.x, y: solved.ankle.y, z: solved.ankle.z };
          // Move heel and toe proportionally
          if (lms[L_HEEL]) lms[L_HEEL] = { ...lms[L_HEEL], y: Math.max(groundY, lms[L_HEEL].y) };
          if (lms[L_TOE])  lms[L_TOE]  = { ...lms[L_TOE],  y: Math.max(groundY, lms[L_TOE].y) };
        }
      }
    } else {
      lockedLAnkle = null;
    }

    // ── Right foot ──
    if (plant.rightPlanted) {
      const ankle = lms[R_ANKLE];
      if (ankle) {
        if (!lockedRAnkle || (i > 0 && !plants[i-1]?.rightPlanted)) {
          lockedRAnkle = { x: ankle.x, y: groundY, z: ankle.z || 0, visibility: ankle.visibility };
        }
        const target = lockedRAnkle;
        const hip    = lms[R_HIP];
        const knee   = lms[R_KNEE];
        if (hip && knee && ankle) {
          const solved = solveTwoBoneIK(hip, knee, ankle, target);
          lms[R_KNEE]  = { ...lms[R_KNEE],  x: solved.knee.x,  y: solved.knee.y,  z: solved.knee.z };
          lms[R_ANKLE] = { ...lms[R_ANKLE], x: solved.ankle.x, y: solved.ankle.y, z: solved.ankle.z };
          if (lms[R_HEEL]) lms[R_HEEL] = { ...lms[R_HEEL], y: Math.max(groundY, lms[R_HEEL].y) };
          if (lms[R_TOE])  lms[R_TOE]  = { ...lms[R_TOE],  y: Math.max(groundY, lms[R_TOE].y) };
        }
      }
    } else {
      lockedRAnkle = null;
    }

    return { ...frame, landmarks: lms };
  });
}

/**
 * Smooth transitions into/out of foot plant (blend over N frames)
 */
export function blendFootTransitions(frames, blendFrames = 4) {
  if (!frames?.length) return frames;
  const result = frames.map(f => ({ ...f, landmarks: f.landmarks ? [...f.landmarks] : f.landmarks }));

  for (let i = 1; i < result.length - 1; i++) {
    for (const ankleIdx of [L_ANKLE, R_ANKLE]) {
      const curr = result[i].landmarks?.[ankleIdx];
      const prev = result[i-1].landmarks?.[ankleIdx];
      const next = result[i+1].landmarks?.[ankleIdx];
      if (!curr || !prev || !next) continue;

      // Detect sudden Y jump (floating artifact)
      const jumpUp   = curr.y - prev.y;
      const jumpDown = next.y - curr.y;
      if (Math.abs(jumpUp) > 0.02) {
        // Blend over blendFrames
        for (let b = 0; b < blendFrames && i + b < result.length; b++) {
          const t = b / blendFrames;
          const lm = result[i + b].landmarks?.[ankleIdx];
          if (lm) {
            result[i + b].landmarks[ankleIdx] = {
              ...lm,
              y: prev.y * (1 - t) + lm.y * t,
            };
          }
        }
      }
    }
  }
  return result;
}

/**
 * Full pipeline: detect plants → fix IK → blend transitions
 */
export function solveFootPlanting(frames, options = {}) {
  let fixed = fixFootPlanting(frames, options);
  fixed = blendFootTransitions(fixed, options.blendFrames ?? 4);
  return fixed;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getFootPlantStats(frames) {
  const plants = detectFootPlants(frames);
  const leftPlanted  = plants.filter(p => p.leftPlanted).length;
  const rightPlanted = plants.filter(p => p.rightPlanted).length;
  return {
    totalFrames: frames.length,
    leftPlantedFrames: leftPlanted,
    rightPlantedFrames: rightPlanted,
    leftPlantRatio:  (leftPlanted  / frames.length).toFixed(2),
    rightPlantRatio: (rightPlanted / frames.length).toFixed(2),
    groundY: plants[0]?.groundY ?? 0,
  };
}

// ─── Vec3 helpers ─────────────────────────────────────────────────────────────

function dist3(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2); }
function sub3(a, b)  { return { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z }; }
function add3(a, b)  { return { x: a.x+b.x, y: a.y+b.y, z: a.z+b.z }; }
function scale3(a,s) { return { x: a.x*s,   y: a.y*s,   z: a.z*s   }; }
function dot3(a, b)  { return a.x*b.x + a.y*b.y + a.z*b.z; }
function cross3(a,b) { return { x: a.y*b.z-a.z*b.y, y: a.z*b.x-a.x*b.z, z: a.x*b.y-a.y*b.x }; }
function normalize3(a) { const l = Math.sqrt(dot3(a,a)) || 1; return scale3(a, 1/l); }

export default solveFootPlanting;
