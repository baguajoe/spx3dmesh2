// platform.js — runtime platform detection for SPX 3D Mesh.
// IS_DESKTOP is true when running inside Electron or Tauri (where we can
// crank up render quality, sample counts, and bundle size). False in browser.

export const IS_DESKTOP =
  (typeof window !== 'undefined') &&
  (Boolean(window.__TAURI__) || Boolean(window.electronAPI));

export const IS_BROWSER = !IS_DESKTOP;

/**
 * Return a quality tier matching the platform.
 * Use this to gate expensive features (path tracing samples, max polycount,
 * texture resolution, etc.).
 *
 *   const tier = getQualityTier();
 *   if (tier === 'film') { samples = 1024; } else { samples = 64; }
 */
export function getQualityTier() {
  if (IS_DESKTOP) return 'film';      // Desktop builds — go big
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency >= 8) return 'high';
  return 'standard';
}
