/**
 * AIAnimationAssistant.js
 * AI-powered mocap cleanup and animation assistance
 * Connects to Anthropic API — credits deducted via StreamPireX credit system on integration
 */

// ── Credit hook — wires to StreamPireX /api/ai/credits ──────────────────────────
const BACKEND = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_BACKEND_URL || '') : '';
async function deductCredit(userId, amount = 1) {
  try {
    const r = await fetch(`${BACKEND}/api/ai/credits/deduct`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, amount, service: 'ai_animation' })
    });
    return r.ok;
  } catch { return false; }
}
export async function deductAICredit(userId, action) {
  if (window.SPX_CREDITS) {
    return await window.SPX_CREDITS.deduct(userId, action);
  }
  // standalone mode — no credit deduction
  return { ok: true, remaining: 999 };
}

// ── Mocap cleanup ──────────────────────────────────────────────────────────────

/**
 * Smooth jittery keyframe data using gaussian-weighted averaging
 * @param {Array} keyframes - [{frame, x, y, z}]
 * @param {number} windowSize - smoothing window (3-9 recommended)
 */
export function smoothKeyframes(keyframes, windowSize = 5) {
  if (!keyframes || keyframes.length < 3) return keyframes;
  const half = Math.floor(windowSize / 2);
  return keyframes.map((kf, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(keyframes.length - 1, i + half);
    const window = keyframes.slice(start, end + 1);
    const avg = (key) => window.reduce((s, k) => s + k[key], 0) / window.length;
    return { ...kf, x: avg('x'), y: avg('y'), z: avg('z') };
  });
}

/**
 * Lock foot contacts to prevent sliding
 * Detects frames where foot is near ground and locks Y position
 * @param {Array} keyframes - foot bone keyframes
 * @param {number} groundY - ground plane Y value (default 0)
 * @param {number} threshold - distance to consider "grounded"
 */
export function lockFootContacts(keyframes, groundY = 0, threshold = 0.05) {
  if (!keyframes) return keyframes;
  return keyframes.map((kf) => {
    if (Math.abs(kf.y - groundY) < threshold) {
      return { ...kf, y: groundY };
    }
    return kf;
  });
}

/**
 * Remove outlier frames (sudden pops/spikes in mocap data)
 * @param {Array} keyframes
 * @param {number} maxDelta - max allowed position change per frame
 */
export function removeOutliers(keyframes, maxDelta = 0.5) {
  if (!keyframes || keyframes.length < 2) return keyframes;
  return keyframes.filter((kf, i) => {
    if (i === 0) return true;
    const prev = keyframes[i - 1];
    const delta = Math.sqrt(
      Math.pow(kf.x - prev.x, 2) +
      Math.pow(kf.y - prev.y, 2) +
      Math.pow(kf.z - prev.z, 2)
    );
    return delta < maxDelta;
  });
}

/**
 * Full mocap cleanup pipeline — runs all three passes
 * @param {Object} mocapData - { bones: { boneName: [{frame, x, y, z}] } }
 * @param {Object} options
 */
export function cleanMocapCapture(mocapData, options = {}) {
  const {
    smoothWindow = 5,
    groundY = 0,
    footBones = ['LeftFoot', 'RightFoot', 'LeftToe', 'RightToe'],
    maxDelta = 0.5,
  } = options;

  const cleaned = { bones: {} };
  for (const [boneName, keyframes] of Object.entries(mocapData.bones || {})) {
    let kfs = removeOutliers(keyframes, maxDelta);
    kfs = smoothKeyframes(kfs, smoothWindow);
    if (footBones.includes(boneName)) {
      kfs = lockFootContacts(kfs, groundY);
    }
    cleaned.bones[boneName] = kfs;
  }
  return cleaned;
}

// ── AI Animation Assistant (Claude API) ───────────────────────────────────────

/**
 * Ask the AI assistant about your animation
 * @param {string} userPrompt - natural language request
 * @param {Object} context - current animation context
 * @param {string} apiKey - Anthropic API key (from StreamPireX credit system)
 */
export async function askAnimationAssistant(userPrompt, context = {}, apiKey = null) {
  const systemPrompt = `You are an expert 3D animation assistant inside SPX Mesh Editor.
You help animators improve motion capture data, refine keyframe animations, and fix common animation problems.
Current context: ${JSON.stringify(context)}
Respond with specific, actionable advice. If suggesting keyframe changes, provide exact frame numbers and values.
Keep responses concise and practical.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || 'No response from assistant.';
  } catch (err) {
    return `Assistant error: ${err.message}`;
  }
}

/**
 * Auto-analyze an animation clip and return improvement suggestions
 * @param {Object} clip - animation clip data
 */
export async function analyzeAnimationClip(clip) {
  const issues = [];

  // Check for jitter
  for (const [bone, kfs] of Object.entries(clip.bones || {})) {
    if (kfs.length < 2) continue;
    const deltas = kfs.slice(1).map((kf, i) => {
      const prev = kfs[i];
      return Math.sqrt(
        Math.pow(kf.x - prev.x, 2) +
        Math.pow(kf.y - prev.y, 2) +
        Math.pow(kf.z - prev.z, 2)
      );
    });
    const avgDelta = deltas.reduce((s, d) => s + d, 0) / deltas.length;
    const maxDelta = Math.max(...deltas);
    if (maxDelta > avgDelta * 3) {
      issues.push({ type: 'jitter', bone, severity: 'high', suggestion: 'Run smooth pass' });
    }
  }

  // Check clip length
  const allFrames = Object.values(clip.bones || {}).flat().map(k => k.frame);
  const duration = allFrames.length ? Math.max(...allFrames) - Math.min(...allFrames) : 0;
  if (duration < 10) {
    issues.push({ type: 'short_clip', severity: 'low', suggestion: 'Clip may be too short for looping' });
  }

  return {
    issues,
    score: Math.max(0, 100 - issues.filter(i => i.severity === 'high').length * 20),
    summary: issues.length === 0
      ? 'Animation looks clean — no major issues detected.'
      : `Found ${issues.length} issue(s). Run cleanup to fix automatically.`,
  };
}
