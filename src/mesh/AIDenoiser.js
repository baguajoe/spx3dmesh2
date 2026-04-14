/**
 * SPX AI Denoiser — Intel OIDN via WebAssembly
 * Works in both browser and Electron without native addons
 */

let oidnDevice = null;
let oidnReady = false;
let oidnLoading = false;

// Load OIDN WASM (lazy — only when first needed)
async function loadOIDN() {
  if (oidnReady) return true;
  if (oidnLoading) {
    // Wait for existing load
    while (oidnLoading) await new Promise(r => setTimeout(r, 100));
    return oidnReady;
  }
  oidnLoading = true;
  try {
    // Try to load @intel/oidn-web if installed
    const { createDevice } = await import('@intel/oidn-web');
    oidnDevice = await createDevice('cpu');
    oidnReady = true;
    console.log('[SPX Denoiser] Intel OIDN WASM loaded');
  } catch (e) {
    console.warn('[SPX Denoiser] OIDN WASM not available, using bilateral fallback:', e.message);
    oidnReady = false;
  }
  oidnLoading = false;
  return oidnReady;
}

/**
 * Bilateral filter denoiser — pure JS, always available
 * Good enough for most use cases
 */
function bilateralDenoise(imageData, width, height, sigma_s = 3, sigma_r = 0.1) {
  const src  = new Float32Array(imageData.data.length);
  const dst  = new Uint8ClampedArray(imageData.data.length);
  const d    = imageData.data;

  // Convert to float
  for (let i = 0; i < d.length; i++) src[i] = d[i] / 255.0;

  const radius = Math.ceil(sigma_s * 2);
  const ss2 = 2 * sigma_s * sigma_s;
  const sr2 = 2 * sigma_r * sigma_r;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ci = (y * width + x) * 4;
      let sumR = 0, sumG = 0, sumB = 0, sumW = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const nx = Math.max(0, Math.min(width  - 1, x + dx));
          const ni = (ny * width + nx) * 4;

          const spatialW = Math.exp(-(dx*dx + dy*dy) / ss2);
          const dr = src[ci] - src[ni];
          const dg = src[ci+1] - src[ni+1];
          const db = src[ci+2] - src[ni+2];
          const rangeW = Math.exp(-(dr*dr + dg*dg + db*db) / sr2);
          const w = spatialW * rangeW;

          sumR += src[ni]   * w;
          sumG += src[ni+1] * w;
          sumB += src[ni+2] * w;
          sumW += w;
        }
      }

      dst[ci]   = Math.round((sumR / sumW) * 255);
      dst[ci+1] = Math.round((sumG / sumW) * 255);
      dst[ci+2] = Math.round((sumB / sumW) * 255);
      dst[ci+3] = d[ci+3];
    }
  }

  return new ImageData(dst, width, height);
}

/**
 * Main denoise function — uses OIDN if available, falls back to bilateral
 * @param {HTMLCanvasElement} canvas - rendered output canvas
 * @param {Object} options - { strength: 0-1, useAI: true/false }
 * @returns {Promise<HTMLCanvasElement>} denoised canvas
 */
export async function denoiseCanvas(canvas, options = {}) {
  const { strength = 0.8, useAI = true } = options;

  const width  = canvas.width;
  const height = canvas.height;

  // Get pixel data from canvas
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, width, height);

  // Try OIDN first
  if (useAI) {
    const available = await loadOIDN();
    if (available && oidnDevice) {
      try {
        console.log('[SPX Denoiser] Running Intel OIDN AI denoiser...');
        const filter = oidnDevice.newFilter('RT');

        // Convert ImageData to Float32 HDR buffer
        const floatBuf = new Float32Array(width * height * 3);
        const d = imageData.data;
        for (let i = 0, j = 0; i < d.length; i += 4, j += 3) {
          floatBuf[j]   = (d[i]   / 255) ** 2.2; // sRGB to linear
          floatBuf[j+1] = (d[i+1] / 255) ** 2.2;
          floatBuf[j+2] = (d[i+2] / 255) ** 2.2;
        }

        const outputBuf = new Float32Array(floatBuf.length);

        filter.setImage('color',  floatBuf,  'float3', width, height);
        filter.setImage('output', outputBuf, 'float3', width, height);
        filter.set('hdr', false);
        filter.set('srgb', false);
        filter.commit();
        filter.execute();

        // Write back to canvas
        const outData = ctx.createImageData(width, height);
        for (let i = 0, j = 0; i < outData.data.length; i += 4, j += 3) {
          outData.data[i]   = Math.round((outputBuf[j]   ** (1/2.2)) * 255);
          outData.data[i+1] = Math.round((outputBuf[j+1] ** (1/2.2)) * 255);
          outData.data[i+2] = Math.round((outputBuf[j+2] ** (1/2.2)) * 255);
          outData.data[i+3] = 255;
        }
        ctx.putImageData(outData, 0, 0);
        console.log('[SPX Denoiser] OIDN complete');
        return canvas;
      } catch (e) {
        console.warn('[SPX Denoiser] OIDN failed, falling back to bilateral:', e.message);
      }
    }
  }

  // Bilateral fallback
  console.log('[SPX Denoiser] Running bilateral denoiser (strength=' + strength + ')...');
  const sigma_s = 1 + strength * 4; // 1–5
  const sigma_r = 0.05 + strength * 0.15; // 0.05–0.2
  const denoised = bilateralDenoise(imageData, width, height, sigma_s, sigma_r);
  ctx.putImageData(denoised, 0, 0);
  console.log('[SPX Denoiser] Bilateral complete');
  return canvas;
}

/**
 * Denoise a Three.js renderer output
 * @param {THREE.WebGLRenderer} renderer
 * @param {Object} options
 */
export async function denoiseRenderer(renderer, options = {}) {
  const canvas = renderer.domElement;
  return denoiseCanvas(canvas, options);
}

export const isOIDNAvailable = () => oidnReady;
export const loadOIDNAsync   = loadOIDN;
