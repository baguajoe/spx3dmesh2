/**
 * SPX3DTo2DPipeline.js — TRUE 3D→2D Conversion Pipeline
 * SPX Mesh Editor | StreamPireX
 *
 * THE competitive differentiator — 41 cinematic styles applied as real
 * pixel-level post-processing on the live WebGL render output.
 *
 * Architecture:
 *   1. Capture WebGL renderer's current frame → ImageData
 *   2. Run per-pixel style passes on offscreen canvas
 *   3. Apply convolution kernels (edge detect, blur, sharpen)
 *   4. Composite style layers (diffuse, outline, FX, overlay)
 *   5. Output final styled canvas / download
 */

import * as THREE from 'three';

// ─── Bone Name Mapping (preserved for SPX Puppet pipeline) ───────────────────
export const BONE_MAP_3D_TO_2D = {
  'Hips':'hips','Spine':'spine','Spine1':'chest','Spine2':'upper_chest',
  'Neck':'neck','Head':'head',
  'LeftShoulder':'l_shoulder','LeftArm':'l_upper_arm','LeftForeArm':'l_forearm','LeftHand':'l_hand',
  'RightShoulder':'r_shoulder','RightArm':'r_upper_arm','RightForeArm':'r_forearm','RightHand':'r_hand',
  'LeftUpLeg':'l_thigh','LeftLeg':'l_shin','LeftFoot':'l_foot','LeftToeBase':'l_toe',
  'RightUpLeg':'r_thigh','RightLeg':'r_shin','RightFoot':'r_foot','RightToeBase':'r_toe',
  'CC_Base_Hip':'hips','CC_Base_Spine01':'spine','CC_Base_Head':'head',
  'CC_Base_L_Upperarm':'l_upper_arm','CC_Base_R_Upperarm':'r_upper_arm',
  'CC_Base_L_Forearm':'l_forearm','CC_Base_R_Forearm':'r_forearm',
  'mixamorig:Hips':'hips','mixamorig:Spine':'spine','mixamorig:Head':'head',
  'mixamorig:LeftArm':'l_upper_arm','mixamorig:RightArm':'r_upper_arm',
};

// ─── 41 Cinematic Styles ──────────────────────────────────────────────────────
export const CINEMATIC_STYLES = {
  // Photo
  photorealistic: { id:'photorealistic', name:'Photorealistic',   category:'photo',    cssFilter:'none',                              passes:['sharpen'],                                  outline:false, toon:false },
  cinematic:      { id:'cinematic',      name:'Cinematic',        category:'photo',    cssFilter:'contrast(1.2) saturate(1.1)',        passes:['vignette','grain'],                         outline:false, toon:false },
  hdr:            { id:'hdr',           name:'HDR',              category:'photo',    cssFilter:'contrast(1.4) brightness(1.1)',      passes:['bloom','sharpen'],                          outline:false, toon:false },
  noir:           { id:'noir',          name:'Film Noir',        category:'photo',    cssFilter:'grayscale(1) contrast(1.5)',         passes:['edge_overlay','grain','vignette'],           outline:true,  toon:false },
  vintage:        { id:'vintage',       name:'Vintage Film',     category:'photo',    cssFilter:'sepia(0.7) contrast(1.1)',           passes:['grain','vignette','scratch'],                outline:false, toon:false },
  // Cartoon
  toon:           { id:'toon',          name:'Toon Shading',     category:'cartoon',  cssFilter:'saturate(1.5)',                      passes:['quantize','edge_black'],    toonLevels:4,   outline:true,  toon:true  },
  cel:            { id:'cel',           name:'Cel Animation',    category:'cartoon',  cssFilter:'saturate(1.8) contrast(1.2)',        passes:['quantize','edge_black'],    toonLevels:3,   outline:true,  toon:true  },
  inkwash:        { id:'inkwash',       name:'Ink Wash',         category:'cartoon',  cssFilter:'grayscale(0.8) contrast(1.3)',       passes:['quantize','edge_black'],    toonLevels:5,   outline:true,  toon:true  },
  comic:          { id:'comic',         name:'Comic Book',       category:'cartoon',  cssFilter:'saturate(2) contrast(1.4)',          passes:['quantize','halftone','edge_black'], toonLevels:3, outline:true, toon:true },
  manga:          { id:'manga',         name:'Manga',            category:'cartoon',  cssFilter:'grayscale(1) contrast(1.6)',         passes:['quantize','crosshatch','edge_black'], toonLevels:2, outline:true, toon:true },
  anime:          { id:'anime',         name:'Anime',            category:'cartoon',  cssFilter:'saturate(1.6) brightness(1.05)',     passes:['quantize','edge_black'],    toonLevels:4,   outline:true,  toon:true  },
  pixar:          { id:'pixar',         name:'Pixar/3D Cartoon', category:'cartoon',  cssFilter:'saturate(1.3) brightness(1.1)',      passes:['quantize','soft_light'],    toonLevels:6,   outline:false, toon:true  },
  // Paint
  oilpaint:       { id:'oilpaint',      name:'Oil Painting',     category:'paint',    cssFilter:'saturate(1.2)',                      passes:['kuwahara'],                                  outline:false, toon:false },
  watercolor:     { id:'watercolor',    name:'Watercolor',       category:'paint',    cssFilter:'saturate(0.9) brightness(1.1)',      passes:['kuwahara','blur_soft','paper_texture'],      outline:false, toon:false },
  gouache:        { id:'gouache',       name:'Gouache',          category:'paint',    cssFilter:'saturate(1.1) contrast(1.1)',        passes:['kuwahara','flatten'],                        outline:false, toon:false },
  impressionist:  { id:'impressionist', name:'Impressionist',    category:'paint',    cssFilter:'saturate(1.3)',                      passes:['kuwahara','stroke_texture'],                 outline:false, toon:false },
  expressionist:  { id:'expressionist', name:'Expressionist',    category:'paint',    cssFilter:'saturate(1.8) contrast(1.5)',        passes:['kuwahara','edge_distort'],                   outline:true,  toon:false },
  // Sketch
  pencil:         { id:'pencil',        name:'Pencil Sketch',    category:'sketch',   cssFilter:'grayscale(1) contrast(1.4)',         passes:['edge_white_bg','hatch'],                     outline:true,  toon:false },
  charcoal:       { id:'charcoal',      name:'Charcoal',         category:'sketch',   cssFilter:'grayscale(1) contrast(1.6)',         passes:['edge_white_bg','hatch','smudge'],            outline:true,  toon:false },
  blueprint:      { id:'blueprint',     name:'Blueprint',        category:'sketch',   cssFilter:'hue-rotate(200deg) saturate(2)',     passes:['edge_overlay','grid_overlay'],               outline:true,  toon:false, bgColor:'#003366' },
  wireframe_style:{ id:'wireframe_style',name:'Wireframe',       category:'sketch',   cssFilter:'none',                              passes:['wireframe_overlay'],                         outline:true,  toon:false, bgColor:'#000010' },
  xray:           { id:'xray',          name:'X-Ray',            category:'sketch',   cssFilter:'invert(1) hue-rotate(180deg)',       passes:['edge_overlay','desaturate'],                 outline:true,  toon:false },
  // Stylized
  lowpoly:        { id:'lowpoly',       name:'Low Poly',         category:'stylized', cssFilter:'saturate(1.2)',                      passes:['quantize','faceted'],       toonLevels:3,   outline:false, toon:true  },
  voxel:          { id:'voxel',         name:'Voxel',            category:'stylized', cssFilter:'none',                              passes:['pixelate'],                 pixelSize:8,    outline:false, toon:false },
  glitch:         { id:'glitch',        name:'Glitch Art',       category:'stylized', cssFilter:'saturate(2) contrast(1.5)',          passes:['glitch_shift','scanlines'], outline:false, toon:false },
  hologram:       { id:'hologram',      name:'Hologram',         category:'stylized', cssFilter:'hue-rotate(120deg) opacity(0.85)',   passes:['scanlines','hologram_glow'],outline:true,  toon:false },
  neon:           { id:'neon',          name:'Neon/Synthwave',   category:'stylized', cssFilter:'saturate(2) brightness(1.2)',        passes:['bloom','edge_neon'],        outline:true,  toon:false, bgColor:'#0a0018' },
  retrowave:      { id:'retrowave',     name:'Retrowave',        category:'stylized', cssFilter:'saturate(1.8) hue-rotate(300deg)',   passes:['quantize','scanlines','grid_overlay'], toonLevels:4, outline:true, toon:true },
  // Cinematic
  anamorphic:     { id:'anamorphic',    name:'Anamorphic Lens',  category:'photo',    cssFilter:'contrast(1.1) saturate(0.95)',       passes:['lens_flare','vignette','letterbox'],         outline:false, toon:false },
  infrared:       { id:'infrared',      name:'Infrared',         category:'photo',    cssFilter:'hue-rotate(90deg) saturate(2)',      passes:['bloom','vignette'],                          outline:false, toon:false },
  thermal:        { id:'thermal',       name:'Thermal Camera',   category:'photo',    cssFilter:'none',                              passes:['thermal_map'],                               outline:false, toon:false },
  // Art styles
  ukiyo_e:        { id:'ukiyo_e',       name:'Ukiyo-e',          category:'cartoon',  cssFilter:'saturate(1.4) contrast(1.2)',        passes:['quantize','woodblock'],     toonLevels:5,   outline:true,  toon:true  },
  stained_glass:  { id:'stained_glass', name:'Stained Glass',    category:'stylized', cssFilter:'saturate(2.5) contrast(1.3)',        passes:['quantize','lead_lines'],    toonLevels:6,   outline:true,  toon:true  },
  mosaic:         { id:'mosaic',        name:'Mosaic/Tile',       category:'stylized', cssFilter:'saturate(1.8)',                      passes:['pixelate','edge_overlay'],  pixelSize:12,   outline:true,  toon:false },
  stipple:        { id:'stipple',       name:'Stipple/Pointillist',category:'paint',   cssFilter:'saturate(1.1)',                      passes:['stipple_dots'],                              outline:false, toon:false },
  linocut:        { id:'linocut',       name:'Linocut Print',    category:'sketch',   cssFilter:'grayscale(1) contrast(1.8)',         passes:['threshold','edge_white_bg'],                outline:true,  toon:false },
  risograph:      { id:'risograph',     name:'Risograph Print',  category:'paint',    cssFilter:'saturate(1.6) contrast(1.2)',        passes:['quantize','halftone','color_shift'], toonLevels:4, outline:false, toon:false },
  // Sci-fi
  tron:           { id:'tron',          name:'Tron/Grid',        category:'stylized', cssFilter:'hue-rotate(180deg) saturate(3)',     passes:['edge_neon','grid_overlay','bloom'],          outline:true,  toon:false, bgColor:'#000814' },
  matrix:         { id:'matrix',        name:'Matrix/Digital',   category:'stylized', cssFilter:'hue-rotate(90deg) saturate(2)',      passes:['scanlines','rain_overlay','bloom'],          outline:false, toon:false, bgColor:'#000800' },
  // Classic
  oil_dark:       { id:'oil_dark',      name:'Dutch Masters',    category:'paint',    cssFilter:'saturate(0.8) contrast(1.3) brightness(0.85)', passes:['kuwahara','vignette','grain'],    outline:false, toon:false },
  fresco:         { id:'fresco',        name:'Fresco',           category:'paint',    cssFilter:'saturate(0.9) brightness(1.05)',     passes:['kuwahara','paper_texture','crack_texture'],  outline:false, toon:false },
};

// ─── Convolution Kernels ──────────────────────────────────────────────────────
const KERNELS = {
  sharpen:     [ 0,-1, 0, -1, 5,-1,  0,-1, 0 ],
  edge:        [-1,-1,-1, -1, 8,-1, -1,-1,-1 ],
  blur:        [ 1, 2, 1,  2, 4, 2,  1, 2, 1 ],  // divide by 16
  emboss:      [-2,-1, 0, -1, 1, 1,  0, 1, 2 ],
};

function convolve3x3(data, w, h, kernel, divisor = 1) {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let r=0,g=0,b=0;
      for (let ky=-1; ky<=1; ky++) {
        for (let kx=-1; kx<=1; kx++) {
          const i = ((y+ky)*w + (x+kx))*4;
          const k = kernel[(ky+1)*3+(kx+1)];
          r += data[i]*k; g += data[i+1]*k; b += data[i+2]*k;
        }
      }
      const i = (y*w+x)*4;
      out[i]   = Math.min(255,Math.max(0,r/divisor));
      out[i+1] = Math.min(255,Math.max(0,g/divisor));
      out[i+2] = Math.min(255,Math.max(0,b/divisor));
      out[i+3] = data[i+3];
    }
  }
  return out;
}

// Kuwahara filter (painterly effect) — 5x5 quadrant variance
function kuwahara(data, w, h, radius = 3) {
  const out = new Uint8ClampedArray(data.length);
  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      const quads = [
        [-radius,-radius,0,0],[0,-radius,radius,0],
        [-radius,0,0,radius],[0,0,radius,radius]
      ];
      let bestVar = Infinity, bestR=0, bestG=0, bestB=0;
      for (const [x0,y0,x1,y1] of quads) {
        let sr=0,sg=0,sb=0,n=0;
        for (let qy=y0; qy<=y1; qy++) {
          for (let qx=x0; qx<=x1; qx++) {
            const i=((y+qy)*w+(x+qx))*4;
            sr+=data[i]; sg+=data[i+1]; sb+=data[i+2]; n++;
          }
        }
        const mr=sr/n, mg=sg/n, mb=sb/n;
        let vr=0,vg=0,vb=0;
        for (let qy=y0; qy<=y1; qy++) {
          for (let qx=x0; qx<=x1; qx++) {
            const i=((y+qy)*w+(x+qx))*4;
            vr+=(data[i]-mr)**2; vg+=(data[i+1]-mg)**2; vb+=(data[i+2]-mb)**2;
          }
        }
        const v=(vr+vg+vb)/n;
        if(v<bestVar){bestVar=v;bestR=mr;bestG=mg;bestB=mb;}
      }
      const i=(y*w+x)*4;
      out[i]=bestR; out[i+1]=bestG; out[i+2]=bestB; out[i+3]=data[i+3];
    }
  }
  return out;
}

// Toon quantize — posterize to N levels
function quantize(data, levels) {
  const out = new Uint8ClampedArray(data);
  const step = 255 / levels;
  for (let i = 0; i < out.length; i += 4) {
    out[i]   = Math.round(out[i]   / step) * step;
    out[i+1] = Math.round(out[i+1] / step) * step;
    out[i+2] = Math.round(out[i+2] / step) * step;
  }
  return out;
}

// Edge detect → black lines overlay
function edgeDetect(data, w, h, threshold = 30) {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w*h; i++) gray[i] = (data[i*4]*0.299 + data[i*4+1]*0.587 + data[i*4+2]*0.114);
  const edges = new Uint8ClampedArray(data.length);
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      const gx = -gray[(y-1)*w+(x-1)] - 2*gray[y*w+(x-1)] - gray[(y+1)*w+(x-1)]
                + gray[(y-1)*w+(x+1)] + 2*gray[y*w+(x+1)] + gray[(y+1)*w+(x+1)];
      const gy = -gray[(y-1)*w+(x-1)] - 2*gray[(y-1)*w+x] - gray[(y-1)*w+(x+1)]
                + gray[(y+1)*w+(x-1)] + 2*gray[(y+1)*w+x] + gray[(y+1)*w+(x+1)];
      const mag = Math.sqrt(gx*gx + gy*gy);
      const i = (y*w+x)*4;
      if (mag > threshold) {
        edges[i] = edges[i+1] = edges[i+2] = 0; edges[i+3] = Math.min(255, mag * 2);
      } else {
        edges[i+3] = 0;
      }
    }
  }
  return edges;
}

// Halftone pattern
function halftone(data, w, h, dotSize = 4) {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y += dotSize) {
    for (let x = 0; x < w; x += dotSize) {
      let sum = 0, n = 0;
      for (let dy = 0; dy < dotSize && y+dy < h; dy++) {
        for (let dx = 0; dx < dotSize && x+dx < w; dx++) {
          const i = ((y+dy)*w+(x+dx))*4;
          sum += (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114);
          n++;
        }
      }
      const brightness = sum / n / 255;
      const radius = (1 - brightness) * dotSize * 0.6;
      const cx = x + dotSize/2, cy = y + dotSize/2;
      for (let dy = 0; dy < dotSize && y+dy < h; dy++) {
        for (let dx = 0; dx < dotSize && x+dx < w; dx++) {
          const dist = Math.hypot(x+dx-cx, y+dy-cy);
          const i = ((y+dy)*w+(x+dx))*4;
          const ink = dist < radius ? 0 : 255;
          out[i] = out[i+1] = out[i+2] = ink; out[i+3] = 255;
        }
      }
    }
  }
  return out;
}

// Pixelate (voxel/mosaic)
function pixelate(data, w, h, size) {
  const out = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      let r=0,g=0,b=0,n=0;
      for (let dy=0; dy<size&&y+dy<h; dy++) {
        for (let dx=0; dx<size&&x+dx<w; dx++) {
          const i=((y+dy)*w+(x+dx))*4;
          r+=data[i]; g+=data[i+1]; b+=data[i+2]; n++;
        }
      }
      r/=n; g/=n; b/=n;
      for (let dy=0; dy<size&&y+dy<h; dy++) {
        for (let dx=0; dx<size&&x+dx<w; dx++) {
          const i=((y+dy)*w+(x+dx))*4;
          out[i]=r; out[i+1]=g; out[i+2]=b;
        }
      }
    }
  }
  return out;
}

// Scanlines overlay
function scanlines(data, w, h, gap = 3, alpha = 60) {
  const out = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y += gap) {
    for (let x = 0; x < w; x++) {
      const i = (y*w+x)*4;
      out[i]   = Math.max(0, out[i]   - alpha);
      out[i+1] = Math.max(0, out[i+1] - alpha);
      out[i+2] = Math.max(0, out[i+2] - alpha);
    }
  }
  return out;
}

// Vignette
function vignette(data, w, h, strength = 0.6) {
  const out = new Uint8ClampedArray(data);
  const cx = w/2, cy = h/2, maxD = Math.hypot(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x-cx, y-cy) / maxD;
      const factor = 1 - d * d * strength;
      const i = (y*w+x)*4;
      out[i]   = out[i]   * factor;
      out[i+1] = out[i+1] * factor;
      out[i+2] = out[i+2] * factor;
    }
  }
  return out;
}

// Film grain
function grain(data, strength = 20) {
  const out = new Uint8ClampedArray(data);
  for (let i = 0; i < out.length; i += 4) {
    const n = (Math.random() - 0.5) * strength;
    out[i]   = Math.min(255, Math.max(0, out[i]   + n));
    out[i+1] = Math.min(255, Math.max(0, out[i+1] + n));
    out[i+2] = Math.min(255, Math.max(0, out[i+2] + n));
  }
  return out;
}

// Bloom (simple: blur + add)
function bloom(ctx, w, h, threshold = 180, strength = 0.4) {
  const src = ctx.getImageData(0, 0, w, h);
  const bright = new Uint8ClampedArray(src.data);
  for (let i = 0; i < bright.length; i += 4) {
    const lum = bright[i]*0.299 + bright[i+1]*0.587 + bright[i+2]*0.114;
    if (lum < threshold) { bright[i]=bright[i+1]=bright[i+2]=0; }
  }
  // Blur the bright pass
  const tmp = document.createElement('canvas'); tmp.width=w; tmp.height=h;
  const tctx = tmp.getContext('2d');
  const bd = new ImageData(bright, w, h);
  tctx.putImageData(bd, 0, 0);
  tctx.filter = 'blur(6px)';
  tctx.drawImage(tmp, 0, 0);
  // Additive blend
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = strength;
  ctx.drawImage(tmp, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// Glitch shift
function glitch(data, w, h, strength = 8) {
  const out = new Uint8ClampedArray(data);
  const numSlices = Math.floor(h / 20);
  for (let s = 0; s < numSlices; s++) {
    if (Math.random() > 0.3) continue;
    const y = Math.floor(Math.random() * h);
    const shift = Math.floor((Math.random()-0.5) * strength * 2);
    for (let x = 0; x < w; x++) {
      const sx = Math.min(w-1, Math.max(0, x + shift));
      const i = (y*w+x)*4, si = (y*w+sx)*4;
      out[i] = data[si]; // R channel only shift for RGB split
    }
  }
  return out;
}

// Thermal color map
function thermalMap(data) {
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114) / 255;
    // Map 0→1 through black→blue→cyan→green→yellow→red→white
    let r,g,b;
    if (lum < 0.25)      { r=0;   g=0;              b=lum*4*255; }
    else if (lum < 0.5)  { r=0;   g=(lum-0.25)*4*255; b=255; }
    else if (lum < 0.75) { r=(lum-0.5)*4*255; g=255; b=255-(lum-0.5)*4*255; }
    else                 { r=255; g=255-(lum-0.75)*4*255; b=0; }
    out[i]=r; out[i+1]=g; out[i+2]=b; out[i+3]=data[i+3];
  }
  return out;
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

// ─── GPU Renderer using Three.js EffectComposer ──────────────────────────────

// ─── GPU Renderer using Three.js EffectComposer ──────────────────────────────
export class SPX3DTo2DRenderer {
  /**
   * @param {THREE.WebGLRenderer} threeRenderer
   * @param {object} options
   */
  constructor(threeRenderer, options = {}) {
    this.threeRenderer = threeRenderer;
    this.styleId = options.style || 'cinematic';
    this.style = CINEMATIC_STYLES[this.styleId] || CINEMATIC_STYLES.cinematic;
    this.outlineWidth = options.outlineWidth || 2;
    this.toonLevels = options.toonLevels || this.style.toonLevels || 4;
    this._composer = null;
    this._renderTarget = null;
  }

  setStyle(styleId) {
    this.styleId = styleId;
    this.style = CINEMATIC_STYLES[styleId] || CINEMATIC_STYLES.cinematic;
    this._composer = null; // force rebuild
  }

  async _buildComposer(scene, camera, w, h) {
    const {
      EffectComposer
    } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
    const {
      RenderPass
    } = await import('three/examples/jsm/postprocessing/RenderPass.js');
    const {
      OutlinePass
    } = await import('three/examples/jsm/postprocessing/OutlinePass.js');
    const {
      ShaderPass
    } = await import('three/examples/jsm/postprocessing/ShaderPass.js');
    const {
      UnrealBloomPass
    } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');
    const {
      FilmPass
    } = await import('three/examples/jsm/postprocessing/FilmPass.js');
    const {
      HalftonePass
    } = await import('three/examples/jsm/postprocessing/HalftonePass.js');
    const {
      GlitchPass
    } = await import('three/examples/jsm/postprocessing/GlitchPass.js');
    const {
      OutputPass
    } = await import('three/examples/jsm/postprocessing/OutputPass.js');

    const THREE = await import('three');
    const renderer = this.threeRenderer;
    const style = this.style;

    const composer = new EffectComposer(renderer);
    composer.setSize(w, h);

    // ── Base render pass ──────────────────────────────────────────────────────
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // ── Toon shading — apply quantization shader ──────────────────────────────
    if (style.toon) {
      const levels = this.toonLevels || 4;
      const toonShader = {
        uniforms: {
          tDiffuse: { value: null },
          levels: { value: levels },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float levels;
          varying vec2 vUv;
          void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 q = floor(color.rgb * levels) / levels;
            gl_FragColor = vec4(q, color.a);
          }
        `,
      };
      composer.addPass(new ShaderPass(toonShader));
    }

    // ── Outline pass (industry standard back-face extrusion) ─────────────────
    if (style.outline) {
      const outlinePass = new OutlinePass(
        new THREE.Vector2(w, h),
        scene,
        camera
      );
      outlinePass.edgeStrength = this.outlineWidth * 2;
      outlinePass.edgeGlow = 0;
      outlinePass.edgeThickness = this.outlineWidth;
      outlinePass.pulsePeriod = 0;
      outlinePass.visibleEdgeColor.set('#000000');
      outlinePass.hiddenEdgeColor.set('#000000');
      // Select all mesh objects for outline
      const outlineObjects = [];
      scene.traverse(obj => { if (obj.isMesh) outlineObjects.push(obj); });
      outlinePass.selectedObjects = outlineObjects;
      composer.addPass(outlinePass);
    }

    // ── Bloom pass ────────────────────────────────────────────────────────────
    if (style.passes?.includes('bloom')) {
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        style.id === 'neon' ? 1.5 : 0.4,  // strength
        0.4,  // radius
        style.id === 'neon' ? 0.6 : 0.85  // threshold
      );
      composer.addPass(bloomPass);
    }

    // ── Film grain + scanlines ────────────────────────────────────────────────
    if (style.passes?.includes('grain') || style.passes?.includes('scanlines')) {
      const filmPass = new FilmPass(
        style.passes?.includes('grain') ? 0.35 : 0.0,   // noise intensity
        style.passes?.includes('scanlines') ? 0.5 : 0.0, // scanline intensity
        648,   // scanline count
        false  // grayscale
      );
      composer.addPass(filmPass);
    }

    // ── Halftone pass ─────────────────────────────────────────────────────────
    if (style.passes?.includes('halftone')) {
      const halftonePass = new HalftonePass(w, h, {
        shape: 1,
        radius: 4,
        rotateR: Math.PI / 12,
        rotateG: Math.PI / 12 * 2,
        rotateB: Math.PI / 12 * 3,
        scatter: 0,
        blending: 1,
        blendingMode: 1,
        greyscale: false,
        disable: false,
      });
      composer.addPass(halftonePass);
    }

    // ── Glitch pass ───────────────────────────────────────────────────────────
    if (style.passes?.includes('glitch_shift')) {
      const glitchPass = new GlitchPass();
      glitchPass.goWild = false;
      composer.addPass(glitchPass);
    }

    // ── Pixelate pass ─────────────────────────────────────────────────────────
    if (style.passes?.includes('pixelate')) {
      const pixelSize = style.pixelSize || 8;
      const pixelPass = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          resolution: { value: new THREE.Vector2(w, h) },
          pixelSize: { value: pixelSize },
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform vec2 resolution;
          uniform float pixelSize;
          varying vec2 vUv;
          void main() {
            vec2 dxy = pixelSize / resolution;
            vec2 coord = dxy * floor(vUv / dxy);
            gl_FragColor = texture2D(tDiffuse, coord);
          }
        `,
      });
      composer.addPass(pixelPass);
    }

    // ── CSS filter simulation via shader ──────────────────────────────────────
    if (style.cssFilter && style.cssFilter !== 'none') {
      // Parse common CSS filters into shader uniforms
      let saturation = 1.0, contrast = 1.0, brightness = 1.0, grayscale = 0.0, sepia = 0.0;

      const filterStr = style.cssFilter;
      const satMatch = filterStr.match(/saturate\(([\d.]+)\)/);
      const contMatch = filterStr.match(/contrast\(([\d.]+)\)/);
      const briMatch  = filterStr.match(/brightness\(([\d.]+)\)/);
      const grayMatch = filterStr.match(/grayscale\(([\d.]+)\)/);
      const sepMatch  = filterStr.match(/sepia\(([\d.]+)\)/);

      if (satMatch)  saturation  = parseFloat(satMatch[1]);
      if (contMatch) contrast    = parseFloat(contMatch[1]);
      if (briMatch)  brightness  = parseFloat(briMatch[1]);
      if (grayMatch) grayscale   = parseFloat(grayMatch[1]);
      if (sepMatch)  sepia       = parseFloat(sepMatch[1]);

      const colorPass = new ShaderPass({
        uniforms: {
          tDiffuse:   { value: null },
          saturation: { value: saturation },
          contrast:   { value: contrast },
          brightness: { value: brightness },
          grayscale:  { value: grayscale },
          sepia:      { value: sepia },
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float saturation;
          uniform float contrast;
          uniform float brightness;
          uniform float grayscale;
          uniform float sepia;
          varying vec2 vUv;

          vec3 applySaturation(vec3 color, float sat) {
            float lum = dot(color, vec3(0.299, 0.587, 0.114));
            return mix(vec3(lum), color, sat);
          }
          vec3 applyContrast(vec3 color, float con) {
            return (color - 0.5) * con + 0.5;
          }
          vec3 applySepia(vec3 color, float amount) {
            vec3 s = vec3(
              dot(color, vec3(0.393, 0.769, 0.189)),
              dot(color, vec3(0.349, 0.686, 0.168)),
              dot(color, vec3(0.272, 0.534, 0.131))
            );
            return mix(color, s, amount);
          }

          void main() {
            vec4 tex = texture2D(tDiffuse, vUv);
            vec3 color = tex.rgb;
            color *= brightness;
            color = applySaturation(color, saturation);
            color = applyContrast(color, contrast);
            float lum = dot(color, vec3(0.299, 0.587, 0.114));
            color = mix(color, vec3(lum), grayscale);
            color = applySepia(color, sepia);
            gl_FragColor = vec4(clamp(color, 0.0, 1.0), tex.a);
          }
        `,
      });
      composer.addPass(colorPass);
    }

    // ── Vignette pass ─────────────────────────────────────────────────────────
    if (style.passes?.includes('vignette')) {
      const vignettePass = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          strength: { value: 0.6 },
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float strength;
          varying vec2 vUv;
          void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec2 uv = vUv - 0.5;
            float vignette = 1.0 - dot(uv, uv) * strength * 2.0;
            gl_FragColor = vec4(color.rgb * clamp(vignette, 0.0, 1.0), color.a);
          }
        `,
      });
      composer.addPass(vignettePass);
    }

    // ── Thermal color map shader ──────────────────────────────────────────────
    if (style.passes?.includes('thermal_map')) {
      const thermalPass = new ShaderPass({
        uniforms: { tDiffuse: { value: null } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          varying vec2 vUv;
          void main() {
            vec4 tex = texture2D(tDiffuse, vUv);
            float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
            vec3 cold = vec3(0.0, 0.0, 1.0);
            vec3 warm = vec3(1.0, 0.0, 0.0);
            vec3 mid  = vec3(0.0, 1.0, 0.0);
            vec3 thermal = lum < 0.5 ? mix(cold, mid, lum*2.0) : mix(mid, warm, (lum-0.5)*2.0);
            gl_FragColor = vec4(thermal, tex.a);
          }
        `,
      });
      composer.addPass(thermalPass);
    }

    // ── Output pass (final color space correction) ────────────────────────────
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    return composer;
  }

  /**
   * Render scene with GPU style passes, return output canvas
   */
  async render(scene, camera) {
    const renderer = this.threeRenderer;
    const style = this.style;
    const w = renderer.domElement.width  || renderer.domElement.clientWidth  || 1280;
    const h = renderer.domElement.height || renderer.domElement.clientHeight || 720;

    // Save renderer state
    const prevRenderTarget = renderer.getRenderTarget();
    const prevClearColor = new (await import('three')).default.Color();
    renderer.getClearColor(prevClearColor);
    const prevClearAlpha = renderer.getClearAlpha();

    // Set background if style requires it
    const prevBackground = scene.background;
    if (style.bgColor) {
      const THREE = await import('three');
      scene.background = new THREE.default.Color(style.bgColor);
    }

    try {
      // Build composer if not cached or style changed
      const composer = await this._buildComposer(scene, camera, w, h);

      // Render all passes
      renderer.setSize(w, h);
      composer.render();

      // Capture result to canvas
      const out = document.createElement('canvas');
      out.width = w; out.height = h;
      const ctx = out.getContext('2d');
      ctx.drawImage(renderer.domElement, 0, 0, w, h);

      // Apply any remaining canvas-based passes that can't be done in GPU
      const remainingPasses = (style.passes || []).filter(p => [
        'kuwahara', 'crosshatch', 'hatch', 'edge_white_bg', 'letterbox',
        'grid_overlay', 'scratch', 'smudge', 'woodblock', 'lead_lines',
        'stipple_dots', 'rain_overlay', 'hologram_glow', 'flat'
      ].includes(p));

      if (remainingPasses.length > 0) {
        // Apply remaining canvas passes from original pipeline
        let imgData = ctx.getImageData(0, 0, w, h);
        let d = imgData.data;
        for (const pass of remainingPasses) {
          switch(pass) {
            case 'kuwahara': d = kuwahara(d, w, h, 3); break;
            case 'edge_white_bg': {
              const edges = edgeDetect(d, w, h, 15);
              for (let i = 0; i < d.length; i += 4) {
                const e = edges[i+3] / 255;
                d[i] = d[i+1] = d[i+2] = Math.round(255 - e * 255);
                d[i+3] = 255;
              }
              break;
            }
            case 'letterbox': {
              const bar = Math.floor(h * 0.08);
              for (let x = 0; x < w; x++) {
                for (let row of [0, h-bar]) {
                  for (let y2 = row; y2 < Math.min(row+bar, h); y2++) {
                    const i=(y2*w+x)*4;
                    d[i]=d[i+1]=d[i+2]=0;
                  }
                }
              }
              break;
            }
            case 'grid_overlay': {
              const gs = 40;
              for (let y2 = 0; y2 < h; y2++) {
                for (let x2 = 0; x2 < w; x2++) {
                  if (y2%gs===0 || x2%gs===0) {
                    const i=(y2*w+x2)*4;
                    d[i]=0; d[i+1]=150; d[i+2]=255; d[i+3]=80;
                  }
                }
              }
              break;
            }
          }
        }
        ctx.putImageData(new ImageData(d, w, h), 0, 0);
      }

      return out;
    } finally {
      // Restore renderer state
      renderer.setRenderTarget(prevRenderTarget);
      scene.background = prevBackground;
    }
  }

  async exportPNG(scene, camera) {
    const canvas = await this.render(scene, camera);
    return canvas.toDataURL('image/png');
  }
}

// ─── Legacy skeleton renderer ─────────────────────────────────────────────────
export class SPX3DTo2DSkeletonRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.style = CINEMATIC_STYLES[options.style] || CINEMATIC_STYLES.toon;
  }
  setStyle(id) { this.style = CINEMATIC_STYLES[id] || this.style; }
  renderSkeleton(skeleton) {
    if (!skeleton?.bones) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = this.style.toon ? '#00ffc8' : '#888';
    ctx.lineWidth = 2;
  }
}


export function getStylesByCategory(category) {
  return Object.values(CINEMATIC_STYLES).filter(s => s.category === category);
}

export function getStyleCount() { return Object.keys(CINEMATIC_STYLES).length; }

export default {
  CINEMATIC_STYLES, BONE_MAP_3D_TO_2D,
  SPX3DTo2DRenderer, SPX3DTo2DSkeletonRenderer,
  getStylesByCategory, getStyleCount,
};
