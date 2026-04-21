function cloneCanvas(src) {
  const dst = document.createElement("canvas");
  dst.width = src.width;
  dst.height = src.height;
  dst.getContext("2d").drawImage(src, 0, 0);
  return dst;
}

function edgeAwareDenoise(srcCanvas, { radius = 1, strength = 0.45, lumaThreshold = 18 } = {}) {
  const src = cloneCanvas(srcCanvas);
  const dst = document.createElement("canvas");
  dst.width = src.width;
  dst.height = src.height;

  const sctx = src.getContext("2d");
  const dctx = dst.getContext("2d");

  const srcImg = sctx.getImageData(0, 0, src.width, src.height);
  const outImg = dctx.createImageData(src.width, src.height);

  const s = srcImg.data;
  const o = outImg.data;
  const w = src.width;
  const h = src.height;

  const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r0 = s[idx + 0];
      const g0 = s[idx + 1];
      const b0 = s[idx + 2];
      const l0 = lum(r0, g0, b0);

      let rs = 0, gs = 0, bs = 0, weight = 0;

      for (let oy = -radius; oy <= radius; oy++) {
        for (let ox = -radius; ox <= radius; ox++) {
          const nx = Math.max(0, Math.min(w - 1, x + ox));
          const ny = Math.max(0, Math.min(h - 1, y + oy));
          const nidx = (ny * w + nx) * 4;

          const nr = s[nidx + 0];
          const ng = s[nidx + 1];
          const nb = s[nidx + 2];
          const nl = lum(nr, ng, nb);

          const ld = Math.abs(nl - l0);
          if (ld > lumaThreshold) continue;

          const spatial = 1 / (1 + ox * ox + oy * oy);
          const tonal = 1 - ld / Math.max(1, lumaThreshold);
          const wgt = spatial * tonal;

          rs += nr * wgt;
          gs += ng * wgt;
          bs += nb * wgt;
          weight += wgt;
        }
      }

      const rr = weight > 0 ? rs / weight : r0;
      const gg = weight > 0 ? gs / weight : g0;
      const bb = weight > 0 ? bs / weight : b0;

      o[idx + 0] = Math.round(r0 * (1 - strength) + rr * strength);
      o[idx + 1] = Math.round(g0 * (1 - strength) + gg * strength);
      o[idx + 2] = Math.round(b0 * (1 - strength) + bb * strength);
      o[idx + 3] = s[idx + 3];
    }
  }

  dctx.putImageData(outImg, 0, 0);
  return dst;
}

function downloadCanvas(canvas, filename) {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}

export function denoiseRendererCanvas(renderer, opts = {}) {
  const src = renderer?.domElement;
  if (!src) return null;

  const snap = document.createElement("canvas");
  snap.width = src.width;
  snap.height = src.height;
  snap.getContext("2d").drawImage(src, 0, 0);

  return edgeAwareDenoise(snap, opts);
}

export function runSPXDenoise(renderer, opts = {}) {
  const out = denoiseRendererCanvas(renderer, opts);
  if (!out) return false;
  downloadCanvas(out, "spx_denoised.png");
  return true;
}
