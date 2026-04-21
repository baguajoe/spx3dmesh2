export function clampFrame(frame, minFrame = 0, maxFrame = 250) {
  return Math.max(minFrame, Math.min(maxFrame, frame));
}

export function getFrameFromClientX(clientX, rect, minFrame = 0, maxFrame = 250) {
  if (!rect || rect.width <= 0) return minFrame;
  const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return Math.round(minFrame + t * (maxFrame - minFrame));
}

export function getSortedUniqueKeyframes(keyframes = []) {
  return [...new Set((keyframes || []).map(Number).filter((n) => Number.isFinite(n)))].sort((a, b) => a - b);
}

export function getNextKeyframe(keyframes = [], currentFrame = 0) {
  const sorted = getSortedUniqueKeyframes(keyframes);
  return sorted.find((f) => f > currentFrame) ?? currentFrame;
}

export function getPreviousKeyframe(keyframes = [], currentFrame = 0) {
  const sorted = getSortedUniqueKeyframes(keyframes);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i] < currentFrame) return sorted[i];
  }
  return currentFrame;
}

export function hasKeyframeAtFrame(keyframes = [], frame = 0) {
  return getSortedUniqueKeyframes(keyframes).includes(Number(frame));
}
