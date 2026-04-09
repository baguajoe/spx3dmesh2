// smoothPose.js — Pose Smoothing UPGRADE
// SPX Mesh Editor | StreamPireX
// Filters: One Euro (fast motion), Kalman (slow/precise), EMA (lightweight)

// ─── One Euro Filter (existing, enhanced) ────────────────────────────────────

class OneEuroFilter1D {
  constructor(freq = 30, minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.freq = freq; this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff;
    this.x = null; this.dx = 0; this.lastTime = null;
  }
  alpha(cutoff) { const te = 1 / this.freq; const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / te); }
  filter(x, t = null) {
    if (this.x === null) { this.x = x; this.lastTime = t; return x; }
    if (t !== null && this.lastTime !== null) this.freq = 1 / Math.max((t - this.lastTime) / 1000, 1e-6);
    this.lastTime = t;
    const dx = (x - this.x) * this.freq;
    this.dx = this.dx + this.alpha(this.dCutoff) * (dx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x = this.x + this.alpha(cutoff) * (x - this.x);
    return this.x;
  }
  reset() { this.x = null; this.dx = 0; }
}

export class OneEuroPoseSmoother {
  constructor(minCutoff = 1.0, beta = 0.007) {
    this.minCutoff = minCutoff; this.beta = beta;
    this.filters = null;
  }
  _initFilters(count) {
    this.filters = Array.from({ length: count }, () => ({
      x: new OneEuroFilter1D(30, this.minCutoff, this.beta),
      y: new OneEuroFilter1D(30, this.minCutoff, this.beta),
      z: new OneEuroFilter1D(30, this.minCutoff, this.beta),
    }));
  }
  smooth(landmarks, timestamp = null) {
    if (!this.filters || this.filters.length !== landmarks.length) this._initFilters(landmarks.length);
    return landmarks.map((lm, i) => {
      if (!lm) return lm;
      const f = this.filters[i];
      return { ...lm, x: f.x.filter(lm.x, timestamp), y: f.y.filter(lm.y, timestamp), z: f.z.filter(lm.z, timestamp) };
    });
  }
  reset() { if (this.filters) this.filters.forEach(f => { f.x.reset(); f.y.reset(); f.z.reset(); }); }
}

// ─── Kalman Filter (new) ──────────────────────────────────────────────────────

class KalmanFilter1D {
  constructor(processNoise = 0.001, measurementNoise = 0.1) {
    this.Q = processNoise;      // process noise covariance
    this.R = measurementNoise;  // measurement noise covariance
    this.x = null;              // state estimate
    this.P = 1;                 // error covariance
  }
  filter(z) {
    if (this.x === null) { this.x = z; return z; }
    // Predict
    const xPred = this.x;
    const PPred = this.P + this.Q;
    // Update
    const K = PPred / (PPred + this.R); // Kalman gain
    this.x = xPred + K * (z - xPred);
    this.P = (1 - K) * PPred;
    return this.x;
  }
  reset() { this.x = null; this.P = 1; }
}

export class KalmanPoseSmoother {
  constructor(processNoise = 0.001, measurementNoise = 0.1) {
    this.Q = processNoise; this.R = measurementNoise;
    this.filters = null;
  }
  _initFilters(count) {
    this.filters = Array.from({ length: count }, () => ({
      x: new KalmanFilter1D(this.Q, this.R),
      y: new KalmanFilter1D(this.Q, this.R),
      z: new KalmanFilter1D(this.Q, this.R),
    }));
  }
  smooth(landmarks) {
    if (!this.filters || this.filters.length !== landmarks.length) this._initFilters(landmarks.length);
    return landmarks.map((lm, i) => {
      if (!lm) return lm;
      const f = this.filters[i];
      return { ...lm, x: f.x.filter(lm.x), y: f.y.filter(lm.y), z: f.z.filter(lm.z) };
    });
  }
  reset() { if (this.filters) this.filters.forEach(f => { f.x.reset(); f.y.reset(); f.z.reset(); }); }
}

// ─── EMA Smoother (lightweight) ───────────────────────────────────────────────

export class EMAPoseSmoother {
  constructor(alpha = 0.7) { this.alpha = alpha; this.prev = null; }
  smooth(landmarks) {
    if (!this.prev) { this.prev = landmarks; return landmarks; }
    const result = landmarks.map((lm, i) => {
      const p = this.prev[i];
      if (!lm || !p) return lm;
      return {
        ...lm,
        x: p.x * (1 - this.alpha) + lm.x * this.alpha,
        y: p.y * (1 - this.alpha) + lm.y * this.alpha,
        z: p.z * (1 - this.alpha) + lm.z * this.alpha,
      };
    });
    this.prev = result;
    return result;
  }
  reset() { this.prev = null; }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createPoseSmoother(type = 'ONE_EURO', options = {}) {
  switch (type) {
    case 'KALMAN':   return new KalmanPoseSmoother(options.processNoise, options.measurementNoise);
    case 'EMA':      return new EMAPoseSmoother(options.alpha);
    case 'ONE_EURO':
    default:         return new OneEuroPoseSmoother(options.minCutoff, options.beta);
  }
}

export default { OneEuroPoseSmoother, KalmanPoseSmoother, EMAPoseSmoother, createPoseSmoother };

export function createSmoothingPipeline(type = 'ONE_EURO', options = {}) {
  return createPoseSmoother(type, options);
}
