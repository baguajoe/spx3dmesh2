/**
 * One Euro Filter — low-latency, jitter-reducing smoothing for pose landmarks
 * Based on: https://cristal.univ-lille.fr/~casiez/1euro/
 */

class LowPassFilter {
  constructor(alpha = 1) {
    this.alpha = alpha;
    this.s = null;
  }
  filter(value, alpha = this.alpha) {
    if (this.s === null) { this.s = value; return value; }
    this.s = alpha * value + (1 - alpha) * this.s;
    return this.s;
  }
  lastValue() { return this.s; }
}

export class OneEuroFilter {
  constructor({ minCutoff = 1.0, beta = 0.0, dCutoff = 1.0 } = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
    this.lastTime = null;
  }

  _alpha(cutoff, dt) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(value, timestamp = performance.now()) {
    const dt = this.lastTime !== null ? (timestamp - this.lastTime) / 1000 : 1 / 60;
    this.lastTime = timestamp;

    const prevX = this.xFilter.lastValue() ?? value;
    const dx = dt > 0 ? (value - prevX) / dt : 0;
    const edx = this.dxFilter.filter(dx, this._alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(value, this._alpha(cutoff, dt));
  }

  reset() {
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
    this.lastTime = null;
  }
}

export class LandmarkSmoother {
  constructor(preset = {}) {
    const { minCutoff = 1.0, beta = 0.0, dCutoff = 1.0 } = preset;
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.filters = {};  // landmarkIndex -> { x, y, z }
  }

  _getFilters(idx) {
    if (!this.filters[idx]) {
      const make = () => new OneEuroFilter({
        minCutoff: this.minCutoff,
        beta: this.beta,
        dCutoff: this.dCutoff,
      });
      this.filters[idx] = { x: make(), y: make(), z: make() };
    }
    return this.filters[idx];
  }

  smooth(landmarks, timestamp = performance.now()) {
    if (!landmarks) return landmarks;
    return landmarks.map((lm, i) => {
      const f = this._getFilters(i);
      return {
        ...lm,
        x: f.x.filter(lm.x, timestamp),
        y: f.y.filter(lm.y, timestamp),
        z: f.z !== undefined ? f.z.filter(lm.z ?? 0, timestamp) : lm.z,
        visibility: lm.visibility,
      };
    });
  }

  reset() {
    this.filters = {};
  }
}

export const SMOOTHING_PRESETS = {
  RAW:       { minCutoff: 10.0, beta: 0.5,  dCutoff: 1.0 },
  LIGHT:     { minCutoff: 3.0,  beta: 0.3,  dCutoff: 1.0 },
  BALANCED:  { minCutoff: 1.5,  beta: 0.1,  dCutoff: 1.0 },
  SMOOTH:    { minCutoff: 0.8,  beta: 0.05, dCutoff: 1.0 },
  VERY_SMOOTH: { minCutoff: 0.4, beta: 0.02, dCutoff: 1.0 },
};
