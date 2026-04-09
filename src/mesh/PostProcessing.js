import * as THREE from "three";

// ── Post processing stack ─────────────────────────────────────────────────────
export function createPostStack() {
  return {
    enabled:    true,
    effects:    [],
    canvas:     null,
    ctx:        null,
  };
}

// ── Effect presets ────────────────────────────────────────────────────────────
export const EFFECT_PRESETS = {
  colorGrade:    { type: "colorGrade",   brightness:0, contrast:1, saturation:1, hue:0 },
  vignette:      { type: "vignette",     intensity:0.5, radius:0.8 },
  bloom:         { type: "bloom",        threshold:0.8, intensity:0.5, radius:0.4 },
  chromaticAb:   { type: "chromaticAb",  intensity:0.005 },
  filmGrain:     { type: "filmGrain",    intensity:0.05, animated:true },
  motionBlur:    { type: "motionBlur",   intensity:0.5, samples:8 },
  lensDistort:   { type: "lensDistort",  k1:-0.1, k2:0.05 },
  sharpen:       { type: "sharpen",      intensity:0.5 },
  pixelate:      { type: "pixelate",     size:4 },
  toneMap:       { type: "toneMap",      mode:"aces", exposure:1.0 },
};

// ── LUT color grading ─────────────────────────────────────────────────────────
export const LUT_PRESETS = {
  neutral:  { label: "Neutral",  r:[0,1], g:[0,1], b:[0,1] },
  warm:     { label: "Warm",     r:[0.1,1.1], g:[0,1], b:[0,0.9] },
  cool:     { label: "Cool",     r:[0,0.9], g:[0,1], b:[0.1,1.1] },
  filmic:   { label: "Filmic",   r:[0.02,0.95], g:[0.01,0.92], b:[0.03,0.88] },
  vintage:  { label: "Vintage",  r:[0.1,0.9], g:[0.05,0.85], b:[0,0.7] },
  horror:   { label: "Horror",   r:[0.05,1.1], g:[0,0.8], b:[0,0.7] },
  cyberpunk:{ label: "Cyberpunk",r:[0,0.9], g:[0.05,1.1], b:[0.1,1.2] },
  bleach:   { label: "Bleach",   r:[0.1,1], g:[0.1,0.9], b:[0.1,0.85] },
};

// ── Apply color grade to canvas ImageData ─────────────────────────────────────
export function applyColorGrade(imageData, { brightness=0, contrast=1, saturation=1, hue=0 } = {}) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]/255, g = data[i+1]/255, b = data[i+2]/255;

    // Brightness
    r += brightness; g += brightness; b += brightness;

    // Contrast
    r = (r - 0.5) * contrast + 0.5;
    g = (g - 0.5) * contrast + 0.5;
    b = (b - 0.5) * contrast + 0.5;

    // Saturation
    const gray = 0.299*r + 0.587*g + 0.114*b;
    r = gray + (r-gray)*saturation;
    g = gray + (g-gray)*saturation;
    b = gray + (b-gray)*saturation;

    data[i]   = Math.max(0,Math.min(255, r*255));
    data[i+1] = Math.max(0,Math.min(255, g*255));
    data[i+2] = Math.max(0,Math.min(255, b*255));
  }
  return imageData;
}

// ── Apply LUT ─────────────────────────────────────────────────────────────────
export function applyLUT(imageData, lutKey) {
  const lut  = LUT_PRESETS[lutKey];
  if (!lut) return imageData;
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const tr = data[i]/255, tg = data[i+1]/255, tb = data[i+2]/255;
    data[i]   = Math.max(0,Math.min(255, (lut.r[0]+(tr*(lut.r[1]-lut.r[0])))*255));
    data[i+1] = Math.max(0,Math.min(255, (lut.g[0]+(tg*(lut.g[1]-lut.g[0])))*255));
    data[i+2] = Math.max(0,Math.min(255, (lut.b[0]+(tb*(lut.b[1]-lut.b[0])))*255));
  }
  return imageData;
}

// ── Apply vignette ────────────────────────────────────────────────────────────
export function applyVignette(imageData, width, height, { intensity=0.5, radius=0.8 } = {}) {
  const data = imageData.data;
  const cx = width/2, cy = height/2;
  const maxDist = Math.sqrt(cx*cx + cy*cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i    = (y*width+x)*4;
      const dist = Math.sqrt((x-cx)**2+(y-cy)**2) / maxDist;
      const vig  = 1 - Math.max(0, (dist-radius)/(1-radius)) * intensity;
      data[i]   = data[i]   * vig;
      data[i+1] = data[i+1] * vig;
      data[i+2] = data[i+2] * vig;
    }
  }
  return imageData;
}

// ── Apply film grain ──────────────────────────────────────────────────────────
export function applyFilmGrain(imageData, { intensity=0.05 } = {}) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random()-0.5) * intensity * 255;
    data[i]   = Math.max(0,Math.min(255, data[i]+grain));
    data[i+1] = Math.max(0,Math.min(255, data[i+1]+grain));
    data[i+2] = Math.max(0,Math.min(255, data[i+2]+grain));
  }
  return imageData;
}

// ── Tone mapping ──────────────────────────────────────────────────────────────
export function applyToneMap(imageData, { mode="aces", exposure=1.0 } = {}) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]/255*exposure, g = data[i+1]/255*exposure, b = data[i+2]/255*exposure;
    if (mode === "aces") {
      const a=2.51, b2=0.03, c=2.43, d=0.59, e=0.14;
      r = Math.max(0,Math.min(1,(r*(a*r+b2))/(r*(c*r+d)+e)));
      g = Math.max(0,Math.min(1,(g*(a*g+b2))/(g*(c*g+d)+e)));
      b = Math.max(0,Math.min(1,(b*(a*b+b2))/(b*(c*b+d)+e)));
    } else if (mode === "filmic") {
      r = r/(r+1); g = g/(g+1); b = b/(b+1);
    } else if (mode === "reinhard") {
      r = r/(1+r); g = g/(1+g); b = b/(1+b);
    }
    data[i]=r*255; data[i+1]=g*255; data[i+2]=b*255;
  }
  return imageData;
}

// ── Chromatic aberration ──────────────────────────────────────────────────────
export function applyChromaticAberration(imageData, width, height, { intensity=0.005 } = {}) {
  const src  = new Uint8ClampedArray(imageData.data);
  const data = imageData.data;
  const cx = width/2, cy = height/2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i   = (y*width+x)*4;
      const dx  = (x-cx)/cx * intensity * width;
      const dy  = (y-cy)/cy * intensity * height;
      const ri  = (Math.max(0,Math.min(height-1,Math.round(y+dy)))*width + Math.max(0,Math.min(width-1,Math.round(x+dx))))*4;
      const bi  = (Math.max(0,Math.min(height-1,Math.round(y-dy)))*width + Math.max(0,Math.min(width-1,Math.round(x-dx))))*4;
      data[i]   = src[ri];
      data[i+2] = src[bi+2];
    }
  }
  return imageData;
}

// ── Sharpen ───────────────────────────────────────────────────────────────────
export function applySharpen(imageData, width, height, { intensity=0.5 } = {}) {
  const src  = new Uint8ClampedArray(imageData.data);
  const data = imageData.data;
  const kernel = [0,-1,0,-1,4+1/intensity,-1,0,-1,0];
  for (let y=1; y<height-1; y++) {
    for (let x=1; x<width-1; x++) {
      let r=0,g=0,b=0;
      for (let ky=-1; ky<=1; ky++) {
        for (let kx=-1; kx<=1; kx++) {
          const ki = (ky+1)*3+(kx+1);
          const si = ((y+ky)*width+(x+kx))*4;
          r += src[si]*kernel[ki]; g += src[si+1]*kernel[ki]; b += src[si+2]*kernel[ki];
        }
      }
      const i = (y*width+x)*4;
      data[i]=Math.max(0,Math.min(255,r));
      data[i+1]=Math.max(0,Math.min(255,g));
      data[i+2]=Math.max(0,Math.min(255,b));
    }
  }
  return imageData;
}

// ── Apply full post stack to canvas ───────────────────────────────────────────
export function applyPostStack(canvas, effects = []) {
  const ctx = canvas.getContext("2d");
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const w = canvas.width, h = canvas.height;

  effects.forEach(effect => {
    if (!effect.enabled) return;
    switch (effect.type) {
      case "colorGrade":  imageData = applyColorGrade(imageData, effect); break;
      case "vignette":    imageData = applyVignette(imageData, w, h, effect); break;
      case "filmGrain":   imageData = applyFilmGrain(imageData, effect); break;
      case "toneMap":     imageData = applyToneMap(imageData, effect); break;
      case "chromaticAb": imageData = applyChromaticAberration(imageData, w, h, effect); break;
      case "sharpen":     imageData = applySharpen(imageData, w, h, effect); break;
      case "lut":         imageData = applyLUT(imageData, effect.preset); break;
    }
  });

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
export function createPassStack() {
    return [
        { id: 'bloom', name: 'Bloom', enabled: true, intensity: 1.5 },
        { id: 'ssao', name: 'AO', enabled: true, radius: 0.1 },
        { id: 'tonemap', name: 'ACES', enabled: true, exposure: 1.0 }
    ];
}
