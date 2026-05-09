import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import JSZip from "jszip";

const CATEGORIES = [
  { id:"all",      label:"All 20" },
  { id:"photo",    label:"Photo" },
  { id:"cartoon",  label:"Cartoon" },
  { id:"paint",    label:"Paint" },
  { id:"sketch",   label:"Sketch" },
  { id:"stylized", label:"Stylized" },
  { id:"digital",  label:"Digital" },
];


const VISIBLE_STYLES = [
  "cinematic",
  "film_noir",
  "vintage_film",

  "toon",
  "cel",
  "anime",
  "manga",
  "comic",
  "pixar",

  "oil",
  "watercolor",
  "gouache",
  "impressionist",
  "ink_wash",

  "pencil",
  "charcoal",
  "blueprint",
  "linocut",
  "risograph",

  "low_poly"
];

const STYLES = [
  // MYTHIC INK CINEMA PACK + NOIR PANEL PACK live below

  { id:"cinematic",      label:"Cinematic",        cat:"photo",    color:"#ffaa00" },
  { id:"photorealistic", label:"Photorealistic",    cat:"photo",    color:"#ffaa00" },
  { id:"hdr",            label:"HDR",               cat:"photo",    color:"#ffaa00" },
  { id:"film_noir",      label:"Film Noir",         cat:"photo",    color:"#ffaa00" },
  { id:"vintage_film",   label:"Vintage Film",      cat:"photo",    color:"#ffaa00" },
  { id:"infrared",       label:"Infrared",          cat:"photo",    color:"#ffaa00" },
  { id:"thermal",        label:"Thermal Camera",    cat:"photo",    color:"#ffaa00" },
  { id:"toon",           label:"Toon Shading",      cat:"cartoon",  color:"#00ccff" },
  { id:"cel",            label:"Cel Animation",     cat:"cartoon",  color:"#00ccff" },
  { id:"anime",          label:"Anime",             cat:"cartoon",  color:"#00ccff" },
  { id:"manga",          label:"Manga",             cat:"cartoon",  color:"#00ccff" },
  { id:"comic",          label:"Comic Book",        cat:"cartoon",  color:"#00ccff" },
  { id:"pixar",          label:"Pixar/3D Cartoon",  cat:"cartoon",  color:"#00ccff" },
  { id:"ink_wash",       label:"Ink Wash",          cat:"cartoon",  color:"#00ccff" },
  { id:"oil",            label:"Oil Painting",      cat:"paint",    color:"#ff6644" },
  { id:"watercolor",     label:"Watercolor",        cat:"paint",    color:"#ff6644" },
  { id:"gouache",        label:"Gouache",           cat:"paint",    color:"#ff6644" },
  { id:"impressionist",  label:"Impressionist",     cat:"paint",    color:"#ff6644" },
  { id:"expressionist",  label:"Expressionist",     cat:"paint",    color:"#ff6644" },
  { id:"dutch_masters",  label:"Dutch Masters",     cat:"paint",    color:"#ff6644" },
  { id:"fresco",         label:"Fresco",            cat:"paint",    color:"#ff6644" },
  { id:"pencil",         label:"Pencil Sketch",     cat:"sketch",   color:"#aaaaaa" },
  { id:"charcoal",       label:"Charcoal",          cat:"sketch",   color:"#aaaaaa" },
  { id:"blueprint",      label:"Blueprint",         cat:"sketch",   color:"#aaaaaa" },
  { id:"wireframe",      label:"Wireframe",         cat:"sketch",   color:"#aaaaaa" },
  { id:"stipple",        label:"Stipple/Pointilist", cat:"sketch",  color:"#aaaaaa" },
  { id:"linocut",        label:"Linocut Print",     cat:"sketch",   color:"#aaaaaa" },
  { id:"risograph",      label:"Risograph Print",   cat:"sketch",   color:"#aaaaaa" },
  { id:"low_poly",       label:"Low Poly",          cat:"stylized", color:"#aa44ff" },
  { id:"voxel",          label:"Voxel",             cat:"stylized", color:"#aa44ff" },
  { id:"ukiyo_e",        label:"Ukiyo-e",           cat:"stylized", color:"#aa44ff" },
  { id:"stained_glass",  label:"Stained Glass",     cat:"stylized", color:"#aa44ff" },
  { id:"mosaic",         label:"Mosaic/Tile",       cat:"stylized", color:"#aa44ff" },
  { id:"x_ray",          label:"X-Ray",             cat:"stylized", color:"#aa44ff" },
  { id:"hologram",       label:"Hologram",          cat:"digital",  color:"#00ffc8" },
  { id:"neon",           label:"Neon/Synthwave",    cat:"digital",  color:"#00ffc8" },
  { id:"glitch",         label:"Glitch Art",        cat:"digital",  color:"#00ffc8" },
  { id:"retrowave",      label:"Retrowave",         cat:"digital",  color:"#00ffc8" },
  { id:"tron",           label:"Tron/Grid",         cat:"digital",  color:"#00ffc8" },
  { id:"matrix",         label:"Matrix/Digital",    cat:"digital",  color:"#00ffc8" },
  { id:"anamorphic",     label:"Anamorphic Lens",   cat:"digital",  color:"#00ffc8" },

  { id:"mythic_ink",      label:"Mythic Ink",       cat:"stylized", color:"#88aaff" },
  { id:"celestial_glow",  label:"Celestial Glow",   cat:"stylized", color:"#b8d8ff" },
  { id:"silk_mist",       label:"Silk Mist",        cat:"stylized", color:"#d8e2ff" },
  { id:"spirit_flame",    label:"Spirit Flame",     cat:"stylized", color:"#ff9b6b" },
  { id:"moonlit_legend",  label:"Moonlit Legend",   cat:"stylized", color:"#89a7ff" },

  { id:"heavy_ink",       label:"Heavy Ink",        cat:"sketch",   color:"#111111" },
  { id:"halftone_action", label:"Halftone Action",  cat:"sketch",   color:"#111111" },
  { id:"shadow_panel",    label:"Shadow Panel",     cat:"sketch",   color:"#111111" },
  { id:"crime_neon",      label:"Crime Neon",       cat:"digital",  color:"#00d8ff" },
  { id:"motion_comic",    label:"Motion Comic",     cat:"sketch",   color:"#111111" },

];

function applyStyleFilter(srcCanvas, style, params) {
  const dst = document.createElement('canvas');
  dst.width  = srcCanvas.width;
  dst.height = srcCanvas.height;
  const ctx  = dst.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);
  const id = ctx.getImageData(0, 0, dst.width, dst.height);
  const d  = id.data;

  switch (style) {
    case 'pencil': return makeLinePass(srcCanvas, params.edgeThreshold ?? 24, params.edgeBias ?? 1.0);
    case 'low_poly': return makeFlatColorPass(srcCanvas, params.toonLevels ?? 4);
    case 'ink_wash': {
      const line = makeLinePass(srcCanvas, params.edgeThreshold ?? 24, params.edgeBias ?? 1.0);
      const lctx = line.getContext('2d');
      const lid = lctx.getImageData(0, 0, line.width, line.height);
      const ld = lid.data;
      for (let i = 0; i < ld.length; i += 4) {
        const g = 0.299*ld[i] + 0.587*ld[i+1] + 0.114*ld[i+2];
        ld[i] = ld[i+1] = ld[i+2] = g;
      }
      lctx.putImageData(lid, 0, 0);
      return line;
    }
    case 'charcoal': {
      const line = makeLinePass(srcCanvas, params.edgeThreshold ?? 24, params.edgeBias ?? 1.0);
      const lctx = line.getContext('2d');
      const lid = lctx.getImageData(0, 0, line.width, line.height);
      const ld = lid.data;
      for (let i = 0; i < ld.length; i += 4) {
        const g = (0.299*ld[i] + 0.587*ld[i+1] + 0.114*ld[i+2]) * 0.6;
        ld[i] = ld[i+1] = ld[i+2] = g;
      }
      lctx.putImageData(lid, 0, 0);
      return line;
    }
    case 'film_noir': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        const c = Math.max(0,Math.min(255,(g-128)*1.4+128));
        d[i]=d[i+1]=d[i+2]=c;
      }
      break;
    }
    case 'toon': case 'cel': case 'pixar': case 'anime': case 'manga': case 'comic': {
      const lv = style === 'cel' ? 4 : (params.toonLevels || 5);
      const sb = params.shadowBands || 3;
      const hc = params.highlightClamp || 0.85;
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i] / 255;
        let g = d[i+1] / 255;
        let b = d[i+2] / 255;

        r = Math.min(r, hc);
        g = Math.min(g, hc);
        b = Math.min(b, hc);

        if (style !== 'pixar') {
          r = Math.round(r * lv) / lv;
          g = Math.round(g * lv) / lv;
          b = Math.round(b * lv) / lv;
        }

        const lum = (r + g + b) / 3;
        const band = Math.round(lum * sb) / sb;
        const boost = band > 0.66 ? 1.08 : band < 0.33 ? 0.88 : 1.0;

        d[i]   = Math.max(0, Math.min(255, r * 255 * boost));
        d[i+1] = Math.max(0, Math.min(255, g * 255 * boost));
        d[i+2] = Math.max(0, Math.min(255, b * 255 * boost));
      }
      break;
    }
    case 'infrared': {
      for (let i = 0; i < d.length; i += 4) {
        const r=d[i],g=d[i+1],b=d[i+2];
        d[i]=g; d[i+1]=r; d[i+2]=255-b;
      }
      break;
    }
    case 'x_ray': {
      for (let i = 0; i < d.length; i += 4) {
        const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        d[i]=d[i+1]=d[i+2]=255-g;
      }
      break;
    }
    case 'thermal': {
      for (let i = 0; i < d.length; i += 4) {
        const g=(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])/255;
        d[i]=Math.min(255,g*2*255);
        d[i+1]=Math.min(255,Math.max(0,(g-0.5)*2*255));
        d[i+2]=Math.max(0,(1-g*2)*255);
      }
      break;
    }
    case 'vintage_film': {
      for (let i = 0; i < d.length; i += 4) {
        d[i]  =Math.min(255,d[i]  *1.1+20);
        d[i+1]=Math.min(255,d[i+1]*0.9+10);
        d[i+2]=Math.max(0,  d[i+2]*0.7);
      }
      break;
    }
    case 'neon': case 'tron': case 'matrix': {
      for (let i = 0; i < d.length; i += 4) {
        const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        if(g>180){d[i]=0;d[i+1]=255;d[i+2]=200;}
        else if(g>100){d[i]=180;d[i+1]=0;d[i+2]=255;}
        else{d[i]=0;d[i+1]=0;d[i+2]=Math.min(255,g*2);}
      }
      break;
    }
    case 'hologram': {
      for (let i = 0; i < d.length; i += 4) {
        const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        d[i]=0; d[i+1]=Math.min(255,g*1.2); d[i+2]=Math.min(255,g*1.5);
        d[i+3]=Math.min(255,g+50);
      }
      break;
    }
    case 'blueprint': {
      for (let i = 0; i < d.length; i += 4) {
        const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        d[i]=Math.max(0,30-g*0.1); d[i+1]=Math.max(0,60-g*0.1); d[i+2]=Math.min(255,100+g);
      }
      break;
    }
    case 'sepia': case 'dutch_masters': {
      for (let i = 0; i < d.length; i += 4) {
        const r=d[i],g=d[i+1],b=d[i+2];
        d[i]  =Math.min(255,r*0.393+g*0.769+b*0.189);
        d[i+1]=Math.min(255,r*0.349+g*0.686+b*0.168);
        d[i+2]=Math.min(255,r*0.272+g*0.534+b*0.131);
      }
      break;
    }
    case 'retrowave': {
      for (let i = 0; i < d.length; i += 4) {
        d[i]  =Math.min(255,d[i]  *1.3);
        d[i+1]=Math.max(0,  d[i+1]*0.4);
        d[i+2]=Math.min(255,d[i+2]*1.5);
      }
      break;
    }

    case 'mythic_ink': {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
        d[i]   = Math.min(255, r * 0.92 + 18);
        d[i+1] = Math.min(255, g * 0.96 + 14);
        d[i+2] = Math.min(255, b * 1.08 + 24);
        if (lum > 0.72) d[i+2] = Math.min(255, d[i+2] + 18);
      }
      break;
    }
    case 'celestial_glow': {
      for (let i = 0; i < d.length; i += 4) {
        const lum = (0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]) / 255;
        d[i]   = Math.min(255, d[i]   * 0.95 + 10);
        d[i+1] = Math.min(255, d[i+1] * 1.02 + 18);
        d[i+2] = Math.min(255, d[i+2] * 1.12 + 34);
        if (lum > 0.65) {
          d[i]   = Math.min(255, d[i] + 18);
          d[i+1] = Math.min(255, d[i+1] + 22);
          d[i+2] = Math.min(255, d[i+2] + 30);
        }
      }
      break;
    }
    case 'silk_mist': {
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.min(255, d[i]   * 0.96 + 20);
        d[i+1] = Math.min(255, d[i+1] * 0.98 + 24);
        d[i+2] = Math.min(255, d[i+2] * 1.04 + 28);
      }
      break;
    }
    case 'spirit_flame': {
      for (let i = 0; i < d.length; i += 4) {
        const lum = (0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]) / 255;
        d[i]   = Math.min(255, d[i]   * 1.15 + 22);
        d[i+1] = Math.min(255, d[i+1] * 0.92 + 6);
        d[i+2] = Math.max(0,   d[i+2] * 0.82);
        if (lum > 0.6) d[i] = Math.min(255, d[i] + 30);
      }
      break;
    }
    case 'moonlit_legend': {
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.max(0,   d[i]   * 0.78);
        d[i+1] = Math.min(255, d[i+1] * 0.88 + 8);
        d[i+2] = Math.min(255, d[i+2] * 1.18 + 32);
      }
      break;
    }
    case 'heavy_ink': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        const v = g > 120 ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = v;
      }
      break;
    }
    case 'halftone_action': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        const band = g > 180 ? 255 : g > 110 ? 170 : g > 55 ? 85 : 0;
        d[i] = d[i+1] = d[i+2] = band;
      }
      break;
    }
    case 'shadow_panel': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        const v = g > 150 ? 240 : g > 70 ? 90 : 0;
        d[i] = d[i+1] = d[i+2] = v;
      }
      break;
    }
    case 'crime_neon': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        if (g > 160) {
          d[i] = 0; d[i+1] = 240; d[i+2] = 255;
        } else if (g > 90) {
          d[i] = 255; d[i+1] = 40; d[i+2] = 160;
        } else {
          d[i] = 18; d[i+1] = 12; d[i+2] = 28;
        }
      }
      break;
    }
    case 'motion_comic': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        const v = g > 190 ? 255 : g > 120 ? 200 : g > 70 ? 120 : 20;
        d[i] = d[i+1] = d[i+2] = v;
      }
      break;
    }

    case 'risograph': {
      const w = dst.width;
      const h = dst.height;
      const blueR = 30, blueG = 50, blueB = 220;
      const pinkR = 245, pinkG = 60, pinkB = 160;
      const paperR = 250, paperG = 245, paperB = 235;
      const bluePlate = new Uint8ClampedArray(d.length);
      const pinkPlate = new Uint8ClampedArray(d.length);
      for (let i = 0; i < d.length; i += 4) {
        const lum = (0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]) / 255;
        const blueIntensity = lum < 0.45 ? 1 : (lum < 0.7 ? 0.5 : 0);
        const pinkIntensity = lum > 0.55 ? Math.min(1, (lum - 0.55) * 2.5) : 0;
        bluePlate[i]   = blueR; bluePlate[i+1] = blueG; bluePlate[i+2] = blueB;
        bluePlate[i+3] = blueIntensity * 255;
        pinkPlate[i]   = pinkR; pinkPlate[i+1] = pinkG; pinkPlate[i+2] = pinkB;
        pinkPlate[i+3] = pinkIntensity * 255;
      }
      for (let i = 0; i < d.length; i += 4) {
        d[i] = paperR; d[i+1] = paperG; d[i+2] = paperB;
      }
      for (let i = 0; i < d.length; i += 4) {
        const a = bluePlate[i+3] / 255;
        d[i]   = d[i]   * (1-a) + bluePlate[i]   * a;
        d[i+1] = d[i+1] * (1-a) + bluePlate[i+1] * a;
        d[i+2] = d[i+2] * (1-a) + bluePlate[i+2] * a;
      }
      const offsetX = 2;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const di = (y * w + x) * 4;
          const sx = x - offsetX;
          if (sx < 0 || sx >= w) continue;
          const si = (y * w + sx) * 4;
          const a = pinkPlate[si+3] / 255;
          d[di]   = d[di]   * (1-a) + pinkPlate[si]   * a;
          d[di+1] = d[di+1] * (1-a) + pinkPlate[si+1] * a;
          d[di+2] = d[di+2] * (1-a) + pinkPlate[si+2] * a;
        }
      }
      ctx.putImageData(id, 0, 0);
      applyPaperTextureOverlay(dst, 0.10);
      return dst;
    }

    case 'linocut': {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        const jitter = (Math.random() - 0.5) * 30;
        const threshold = 130 + jitter;
        const v = g > threshold ? 245 : 18;
        d[i] = d[i+1] = d[i+2] = v;
      }
      break;
    }

    case 'impressionist': {
      const w = dst.width;
      const h = dst.height;
      const out = new Uint8ClampedArray(d.length);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const ox = x + Math.floor((Math.random() - 0.5) * 6);
          const oy = y + Math.floor((Math.random() - 0.5) * 6);
          const sx = Math.max(0, Math.min(w - 1, ox));
          const sy = Math.max(0, Math.min(h - 1, oy));
          const si = (sy * w + sx) * 4;
          out[i]   = d[si];
          out[i+1] = d[si+1];
          out[i+2] = d[si+2];
          out[i+3] = 255;
        }
      }
      for (let i = 0; i < d.length; i += 4) {
        let r = out[i], g = out[i+1], b = out[i+2];
        const lum = 0.299*r + 0.587*g + 0.114*b;
        r = lum + (r - lum) * 1.20;
        g = lum + (g - lum) * 1.20;
        b = lum + (b - lum) * 1.20;
        r += (Math.random() - 0.5) * 18;
        g += (Math.random() - 0.5) * 18;
        b += (Math.random() - 0.5) * 18;
        d[i]   = Math.max(0, Math.min(255, r));
        d[i+1] = Math.max(0, Math.min(255, g));
        d[i+2] = Math.max(0, Math.min(255, b));
      }
      break;
    }

    case 'gouache': {
      for (let i = 0; i < d.length; i += 4) {
        const levels = 5;
        let r = Math.round(d[i]   / 255 * levels) / levels * 255;
        let g = Math.round(d[i+1] / 255 * levels) / levels * 255;
        let b = Math.round(d[i+2] / 255 * levels) / levels * 255;
        const lum = 0.299*r + 0.587*g + 0.114*b;
        r = lum + (r - lum) * 1.30;
        g = lum + (g - lum) * 1.30;
        b = lum + (b - lum) * 1.30;
        d[i]   = Math.max(0, Math.min(255, r));
        d[i+1] = Math.max(0, Math.min(255, g));
        d[i+2] = Math.max(0, Math.min(255, b));
      }
      ctx.putImageData(id, 0, 0);
      const blurCanvas = document.createElement('canvas');
      blurCanvas.width  = dst.width;
      blurCanvas.height = dst.height;
      const bctx = blurCanvas.getContext('2d');
      bctx.filter = 'blur(1.2px)';
      bctx.drawImage(dst, 0, 0);
      ctx.clearRect(0, 0, dst.width, dst.height);
      ctx.drawImage(blurCanvas, 0, 0);
      applyPaperTextureOverlay(dst, 0.06);
      return dst;
    }

    case 'watercolor': {
      const w = dst.width;
      const h = dst.height;
      const blurred = new Uint8ClampedArray(d.length);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4;
          let sr = 0, sg = 0, sb = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ni = ((y+dy) * w + (x+dx)) * 4;
              sr += d[ni]; sg += d[ni+1]; sb += d[ni+2];
            }
          }
          blurred[i]   = sr / 9;
          blurred[i+1] = sg / 9;
          blurred[i+2] = sb / 9;
          blurred[i+3] = 255;
        }
      }
      for (let i = 0; i < d.length; i += 4) {
        let r = blurred[i+3] ? blurred[i]   : d[i];
        let g = blurred[i+3] ? blurred[i+1] : d[i+1];
        let b = blurred[i+3] ? blurred[i+2] : d[i+2];
        const lum = 0.299*r + 0.587*g + 0.114*b;
        r = lum + (r - lum) * 0.65;
        g = lum + (g - lum) * 0.65;
        b = lum + (b - lum) * 0.65;
        r = r + (255 - r) * 0.18;
        g = g + (255 - g) * 0.18;
        b = b + (255 - b) * 0.18;
        d[i]   = Math.max(0, Math.min(255, r));
        d[i+1] = Math.max(0, Math.min(255, g));
        d[i+2] = Math.max(0, Math.min(255, b));
      }
      ctx.putImageData(id, 0, 0);
      applyPaperTextureOverlay(dst, 0.18);
      return dst;
    }

    case 'oil': {
      const w = dst.width;
      const h = dst.height;
      const blurred = new Uint8ClampedArray(d.length);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4;
          let sr = 0, sg = 0, sb = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ni = ((y+dy) * w + (x+dx)) * 4;
              sr += d[ni]; sg += d[ni+1]; sb += d[ni+2];
            }
          }
          blurred[i]   = sr / 9;
          blurred[i+1] = sg / 9;
          blurred[i+2] = sb / 9;
          blurred[i+3] = 255;
        }
      }
      const levels = 8;
      for (let i = 0; i < d.length; i += 4) {
        let r = blurred[i+3] ? blurred[i]   : d[i];
        let g = blurred[i+3] ? blurred[i+1] : d[i+1];
        let b = blurred[i+3] ? blurred[i+2] : d[i+2];
        r = Math.round(r / 255 * levels) / levels * 255;
        g = Math.round(g / 255 * levels) / levels * 255;
        b = Math.round(b / 255 * levels) / levels * 255;
        const lum = 0.299*r + 0.587*g + 0.114*b;
        r = lum + (r - lum) * 1.18;
        g = lum + (g - lum) * 1.18;
        b = lum + (b - lum) * 1.18;
        d[i]   = Math.max(0, Math.min(255, r));
        d[i+1] = Math.max(0, Math.min(255, g));
        d[i+2] = Math.max(0, Math.min(255, b));
      }
      ctx.putImageData(id, 0, 0);
      const lines = makeLinePass(srcCanvas, 28, 0.7);
      const lctx = lines.getContext('2d');
      const lid = lctx.getImageData(0, 0, lines.width, lines.height);
      const ld = lid.data;
      const idAfter = ctx.getImageData(0, 0, dst.width, dst.height);
      const dAfter = idAfter.data;
      for (let i = 0; i < dAfter.length; i += 4) {
        if (ld[i] < 80) {
          dAfter[i]   = Math.max(0, dAfter[i]   * 0.65);
          dAfter[i+1] = Math.max(0, dAfter[i+1] * 0.65);
          dAfter[i+2] = Math.max(0, dAfter[i+2] * 0.65);
        }
      }
      ctx.putImageData(idAfter, 0, 0);
      applyPaperTextureOverlay(dst, 0.10);
      return dst;
    }

    case 'cinematic': {
      const w = dst.width;
      const h = dst.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxDist = Math.sqrt(cx*cx + cy*cy);
      const sCurve = (v) => v < 0.5 ? 2*v*v : 1 - 2*(1-v)*(1-v);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          let r = sCurve(d[i]   / 255);
          let g = sCurve(d[i+1] / 255);
          let b = sCurve(d[i+2] / 255);
          const lum = 0.299*r + 0.587*g + 0.114*b;
          const shadowW = (1 - lum) * 0.35;
          const highW   = lum * 0.30;
          const baseW   = 1 - shadowW - highW;
          r = r * baseW + 0.20 * shadowW + 1.00 * highW;
          g = g * baseW + 0.55 * shadowW + 0.62 * highW;
          b = b * baseW + 0.65 * shadowW + 0.30 * highW;
          const dx = x - cx;
          const dy = y - cy;
          const distN = Math.sqrt(dx*dx + dy*dy) / maxDist;
          const vig = 1 - Math.pow(distN, 2.4) * 0.55;
          r *= vig; g *= vig; b *= vig;
          r += (Math.random() - 0.5) * 0.06;
          g += (Math.random() - 0.5) * 0.06;
          b += (Math.random() - 0.5) * 0.06;
          d[i]   = Math.max(0, Math.min(255, r * 255));
          d[i+1] = Math.max(0, Math.min(255, g * 255));
          d[i+2] = Math.max(0, Math.min(255, b * 255));
        }
      }
      break;
    }

    default: break;
  }
  ctx.putImageData(id, 0, 0);
  if (style === 'manga' || style === 'comic') {
    applyHalftoneOverlay(dst, 0.15, 6);
  }
  applyPackFinish(dst, style);
  return dst;
}


function applyPaperTextureOverlay(canvas, amount = 0.08) {
  const ctx = canvas.getContext('2d');
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = id.data;

  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * amount;
    d[i]   = Math.max(0, Math.min(255, d[i]   + noise));
    d[i+1] = Math.max(0, Math.min(255, d[i+1] + noise));
    d[i+2] = Math.max(0, Math.min(255, d[i+2] + noise));
  }

  ctx.putImageData(id, 0, 0);
  return canvas;
}

function applyHalftoneOverlay(canvas, amount = 0.12, step = 6) {
  const ctx = canvas.getContext('2d');
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = id.data;

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const i = (y * canvas.width + x) * 4;
      if (i < 0 || i >= d.length) continue;
      const lum = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
      const darken = (1 - lum / 255) * amount * 255;
      d[i]   = Math.max(0, d[i]   - darken);
      d[i+1] = Math.max(0, d[i+1] - darken);
      d[i+2] = Math.max(0, d[i+2] - darken);
    }
  }

  ctx.putImageData(id, 0, 0);
  return canvas;
}

function applyRimGlowFinish(canvas, color = [180, 210, 255], amount = 0.08) {
  const ctx = canvas.getContext('2d');
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = id.data;

  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const i = (y * canvas.width + x) * 4;
      const lum = (0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]) / 255;
      if (lum > 0.72) {
        d[i]   = Math.min(255, d[i]   + color[0] * amount);
        d[i+1] = Math.min(255, d[i+1] + color[1] * amount);
        d[i+2] = Math.min(255, d[i+2] + color[2] * amount);
      }
    }
  }

  ctx.putImageData(id, 0, 0);
  return canvas;
}

function applyBrushTaperEffect(canvas, amount = 0.08) {
  const ctx = canvas.getContext('2d');
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = id.data;

  for (let y = 0; y < canvas.height; y++) {
    const fade = 1 - Math.abs((y / canvas.height) - 0.5) * 2 * amount;
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      d[i]   = Math.max(0, Math.min(255, d[i]   * fade));
      d[i+1] = Math.max(0, Math.min(255, d[i+1] * fade));
      d[i+2] = Math.max(0, Math.min(255, d[i+2] * fade));
    }
  }

  ctx.putImageData(id, 0, 0);
  return canvas;
}

function applyPackFinish(canvas, style) {
  const mythic = ["mythic_ink","celestial_glow","silk_mist","spirit_flame","moonlit_legend"];
  const noir = ["heavy_ink","halftone_action","shadow_panel","crime_neon","motion_comic"];

  if (mythic.includes(style)) {
    applyBrushTaperEffect(canvas, 0.06);
    applyPaperTextureOverlay(canvas, 0.05);
    if (style === "celestial_glow") applyRimGlowFinish(canvas, [190,220,255], 0.09);
    if (style === "spirit_flame") applyRimGlowFinish(canvas, [255,180,110], 0.08);
    if (style === "moonlit_legend") applyRimGlowFinish(canvas, [120,160,255], 0.07);
    return canvas;
  }

  if (noir.includes(style)) {
    applyBrushTaperEffect(canvas, 0.03);
    if (style === "halftone_action") applyHalftoneOverlay(canvas, 0.18, 5);
    if (style === "motion_comic") applyHalftoneOverlay(canvas, 0.12, 7);
    if (style === "crime_neon") applyRimGlowFinish(canvas, [0,240,255], 0.06);
    return canvas;
  }

  return canvas;
}


const isElectron = typeof window !== 'undefined' && !!window.electronAPI;


function makeLinePass(srcCanvas, threshold=24, bias=1.0){
  const dst = document.createElement('canvas');
  dst.width = srcCanvas.width;
  dst.height = srcCanvas.height;
  const ctx = dst.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);
  const id = ctx.getImageData(0, 0, dst.width, dst.height);
  const d = id.data;

  const lumAt = (x, y, w) => {
    const i = (y * w + x) * 4;
    return 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
  };

  const out = new Uint8ClampedArray(d.length);

  for (let y = 1; y < dst.height - 1; y++) {
    for (let x = 1; x < dst.width - 1; x++) {
      const i = (y * dst.width + x) * 4;

      const tl = lumAt(x-1,y-1,dst.width);
      const tc = lumAt(x,y-1,dst.width);
      const tr = lumAt(x+1,y-1,dst.width);
      const ml = lumAt(x-1,y,dst.width);
      const mr = lumAt(x+1,y,dst.width);
      const bl = lumAt(x-1,y+1,dst.width);
      const bc = lumAt(x,y+1,dst.width);
      const br = lumAt(x+1,y+1,dst.width);

      const gx = (-tl - 2*ml - bl) + (tr + 2*mr + br);
      const gy = (-tl - 2*tc - tr) + (bl + 2*bc + br);

      const edge = Math.min(255, Math.sqrt(gx*gx + gy*gy) * bias);
      const ink = edge > threshold ? 0 : 255;

      out[i] = out[i+1] = out[i+2] = ink;
      out[i+3] = 255;
    }
  }

  id.data.set(out);
  ctx.putImageData(id, 0, 0);
  return dst;
}


function temporalBlendCanvas(currentCanvas, blend=0.35, prevFrameRef){

  if(!prevFrameRef.current){
    prevFrameRef.current = currentCanvas;
    return currentCanvas;
  }

  const dst = document.createElement('canvas');
  dst.width = currentCanvas.width;
  dst.height = currentCanvas.height;

  const ctx = dst.getContext('2d');

  ctx.globalAlpha = 1-blend;
  ctx.drawImage(prevFrameRef.current,0,0);

  ctx.globalAlpha = blend;
  ctx.drawImage(currentCanvas,0,0);

  ctx.globalAlpha = 1;

  prevFrameRef.current = dst;

  return dst;
}

function makeFlatColorPass(srcCanvas, levels=4){
  const dst = document.createElement('canvas');
  dst.width = srcCanvas.width;
  dst.height = srcCanvas.height;
  const ctx = dst.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);
  const id = ctx.getImageData(0, 0, dst.width, dst.height);
  const d = id.data;

  for (let i = 0; i < d.length; i += 4) {
    d[i]   = Math.round(d[i]   /(255/levels))*(255/levels);
    d[i+1] = Math.round(d[i+1] /(255/levels))*(255/levels);
    d[i+2] = Math.round(d[i+2] /(255/levels))*(255/levels);
  }

  ctx.putImageData(id, 0, 0);
  return dst;
}


export default function SPX3DTo2DPanel({ open, onClose, sceneRef, rendererRef, cameraRef, mixerRef }) {
  const [activeCat,    setActiveCat]    = useState('all');
  const [activeStyle,  setActiveStyle]  = useState('cinematic');
  
const [outlineWidth, setOutlineWidth] = useState(1.5);
const [edgeStrength, setEdgeStrength] = useState(1.0);
const [edgeThreshold, setEdgeThreshold] = useState(24);
const [edgeBias, setEdgeBias] = useState(1.0);

  const [toonLevels,   setToonLevels]   = useState(4);
const [shadowBands, setShadowBands] = useState(3);
const [highlightClamp, setHighlightClamp] = useState(0.85);
  const [renderScale,  setRenderScale]  = useState(2);
  const [rendering,    setRendering]    = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [exportFormat, setExportFormat] = useState('png');
  const [exportingSequence, setExportingSequence] = useState(false);
  const [exportMode, setExportMode] = useState('final');
const [temporalBlend, setTemporalBlend] = useState(0.35);
  const [status,       setStatus]       = useState('Select a style and click Render');

  const previewRef = useRef(null);
const prevFrameRef = useRef(null);
  const liveRef    = useRef(null);
  const animRef    = useRef(null);
  // NPR side-effect tracking — applyNPRIfNeeded mutates scene materials and
  // adds outline meshes. These refs track what was changed so we can restore
  // the original look when the panel closes.
  const materialBackupRef = useRef(new Map());
  const outlineMeshesRef  = useRef([]);

  const filtered = (activeCat === 'all' ? STYLES : STYLES.filter(s => s.cat === activeCat)).filter(s => VISIBLE_STYLES.includes(s.id));
  const currentStyle = STYLES.find(s => s.id === activeStyle && VISIBLE_STYLES.includes(s.id)) || STYLES.find(s => VISIBLE_STYLES.includes(s.id)) || STYLES[0];

  // Restore scene materials when the panel closes or unmounts. Lives in its
  // own effect so it runs on `open` going false even if other effects don't.
  useEffect(() => {
    if (open) return;
    restoreNPRMaterials();
  }, [open]);
  useEffect(() => () => { restoreNPRMaterials(); }, []);

  // Mirror main renderer into live canvas
  useEffect(() => {
    if (!open) return;
    const mirror = () => {
      const renderer = rendererRef?.current;
      const scene    = sceneRef?.current;
      const camera   = cameraRef?.current;
      const dst      = liveRef.current;
      if (renderer && scene && camera && dst) {
        renderer.render(scene, camera);
        const src = renderer.domElement;
        dst.width  = dst.offsetWidth  || 600;
        dst.height = dst.offsetHeight || 400;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      animRef.current = requestAnimationFrame(mirror);
    };
    animRef.current = requestAnimationFrame(mirror);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [open, rendererRef, sceneRef, cameraRef]);

  
function applyNPRIfNeeded(style, sceneRef){
  if(!sceneRef?.current) return;

  const toonStyles = [
    "toon",
    "cel",
    "anime",
    "manga",
    "comic",
    "pixar",
    "mythic_ink",
    "celestial_glow",
    "silk_mist",
    "spirit_flame",
    "moonlit_legend",
    "heavy_ink",
    "halftone_action",
    "shadow_panel",
    "crime_neon",
    "motion_comic"
  ];

  if(!toonStyles.includes(style)) return;

  if(!window.createToonMaterial) return;

  sceneRef.current.traverse(obj=>{
    if(!obj.isMesh) return;
    // Skip outline meshes we already added on a prior pass — otherwise we
    // outline the outline and the count compounds every Render click.
    if (obj.userData?._spxNprOutline) return;

    // Snapshot original material once per mesh; later re-renders keep the
    // first snapshot so close() restores the truly original look.
    if (!materialBackupRef.current.has(obj)) {
      materialBackupRef.current.set(obj, obj.material);
    }

    const mat = window.createToonMaterial({
      levels: 4
    });

    obj.material = mat;

    if(window.addOutlineToMesh){
      const outline = window.addOutlineToMesh(obj, sceneRef.current,{ thickness:0.002 * edgeStrength,
        thickness:0.003
      });
      if (outline) {
        outline.userData._spxNprOutline = true;
        outlineMeshesRef.current.push(outline);
      }
    }

  });

}

// Restore original materials and remove outlines added during NPR.
function restoreNPRMaterials() {
  const scene = sceneRef?.current;
  for (const [mesh, originalMat] of materialBackupRef.current.entries()) {
    if (mesh.material && mesh.material !== originalMat) {
      mesh.material.dispose?.();
    }
    mesh.material = originalMat;
  }
  materialBackupRef.current.clear();
  if (scene) {
    for (const outline of outlineMeshesRef.current) {
      scene.remove(outline);
      outline.material?.dispose?.();
    }
  }
  outlineMeshesRef.current = [];
}


const captureAndProcess = useCallback((scale = 1) => {
    const renderer = rendererRef?.current;
    const scene    = sceneRef?.current;
    const camera   = cameraRef?.current;
    if (!renderer || !scene || !camera) return null;
    renderer.render(scene, camera);
    const src = renderer.domElement;
    if (!src) return null;
    const tmp = document.createElement('canvas');
    tmp.width  = src.width  * scale;
    tmp.height = src.height * scale;
    const ctx = tmp.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, tmp.width, tmp.height);
    if (exportMode === 'line') {
      return makeLinePass(tmp, edgeThreshold, edgeBias);
    }
    if (exportMode === 'flat') {
      return makeFlatColorPass(tmp, toonLevels);
    }
    const result = applyStyleFilter(tmp, activeStyle, { outlineWidth, toonLevels, shadowBands, highlightClamp });

if(exportMode === 'final'){
  return temporalBlendCanvas(result, temporalBlend, prevFrameRef);
}

return result;
  }, [activeStyle, outlineWidth, toonLevels, shadowBands, highlightClamp, exportMode, edgeThreshold, edgeBias, temporalBlend, rendererRef, sceneRef, cameraRef]);

  const handleRender = useCallback(async () => {
    if (!rendererRef?.current) { setStatus('⚠ No renderer — add a mesh first'); return; }
    setRendering(true); setStatus('Rendering...');
    try {
      
applyNPRIfNeeded(activeStyle, sceneRef);
const out = captureAndProcess(1);

      if (out && previewRef.current) {
        const c = previewRef.current;
        c.width  = c.offsetWidth  || out.width;
        c.height = c.offsetHeight || out.height;
        c.getContext('2d').drawImage(out, 0, 0, c.width, c.height);
      }
      setStatus(`✓ ${currentStyle.label} — ${out?.width}×${out?.height}`);
    } catch(e) { setStatus(`Error: ${e.message}`); }
    setRendering(false);
  }, [captureAndProcess, currentStyle, rendererRef]);

  const handleExportBrowser = () => {
    if (!previewRef.current) { setStatus('Render first'); return; }
    const url = previewRef.current.toDataURL(`image/${exportFormat}`);
    const a = document.createElement('a');
    a.href = url; a.download = `spx_${activeStyle}.${exportFormat}`; a.click();
    setStatus(`✓ Exported ${exportFormat.toUpperCase()}`);
  };

  const handleRender4K = useCallback(async () => {
    if (!rendererRef?.current) { setStatus('⚠ No renderer'); return; }
    setExporting(true); setStatus('Rendering 4K...');
    try {
      
applyNPRIfNeeded(activeStyle, sceneRef);
const out = captureAndProcess(renderScale);

      if (!out) { setStatus('Render failed'); setExporting(false); return; }
      const dataURL = out.toDataURL('image/png');
      if (isElectron && window.electronAPI?.saveFile) {
        const result = await window.electronAPI.saveFile({
          title: 'Save 4K Render',
          defaultPath: `spx_${activeStyle}_${out.width}x${out.height}.png`,
          filters: [{ name: 'PNG Image', extensions: ['png'] }, { name: 'JPEG', extensions: ['jpg'] }]
        });
        if (result?.filePath) {
          // Write via IPC
          await window.electronAPI.invoke?.('render:save-image', { dataURL, filePath: result.filePath });
          setStatus(`✓ Saved to ${result.filePath.split('/').pop()} (${out.width}×${out.height})`);
        } else {
          setStatus('Save cancelled');
        }
      } else {
        // Fallback to browser download
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `spx_${activeStyle}_${out.width}x${out.height}.png`;
        a.click();
        setStatus(`✓ ${out.width}×${out.height} exported`);
      }
    } catch(e) { setStatus(`Error: ${e.message}`); }
    setExporting(false);
  }, [captureAndProcess, activeStyle, renderScale, rendererRef]);

  const handleVideoExport = useCallback(async () => {
    if (!rendererRef?.current) { setStatus('⚠ No renderer'); return; }
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
      setStatus('⚠ Browser lacks WebCodecs — use PNG SEQUENCE instead');
      return;
    }

    setExporting(true);
    const FPS = 24;
    const FRAMES = 60;

    // Probe a frame for output dimensions. mp4-muxer + yuv420p require even W/H.
    applyNPRIfNeeded(activeStyle, sceneRef);
    const probe = captureAndProcess(1);
    if (!probe) { setStatus('⚠ Capture failed'); setExporting(false); return; }
    const W = probe.width  - (probe.width  % 2);
    const H = probe.height - (probe.height % 2);

    // Frame-driven seek: drive AnimationMixer by frame index, not wall-clock,
    // so the encoded video plays at the intended speed.
    const mixer = mixerRef?.current || null;
    const root  = mixer?.getRoot?.();
    const clip  = root?.animations?.[0] || null;
    const action = (clip && mixer) ? mixer.existingAction(clip) : null;
    const duration = clip?.duration || 0;

    try {
      const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: { codec: 'avc', width: W, height: H, frameRate: FPS },
        fastStart: 'in-memory',
      });

      let encoderError = null;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => { encoderError = e; },
      });
      encoder.configure({
        codec: 'avc1.42001f',
        width: W, height: H,
        bitrate: 8_000_000,
        framerate: FPS,
      });

      setStatus(`Encoding ${FRAMES} frames @ ${FPS}fps...`);
      for (let i = 0; i < FRAMES; i++) {
        if (encoderError) throw encoderError;

        if (action && duration > 0) {
          action.time = (i / FPS) % duration;
          mixer.update(0);
        }

        applyNPRIfNeeded(activeStyle, sceneRef);
        const out = captureAndProcess(1);
        if (!out) continue;

        let src = out;
        if (out.width !== W || out.height !== H) {
          const tmp = document.createElement('canvas');
          tmp.width = W; tmp.height = H;
          tmp.getContext('2d').drawImage(out, 0, 0, W, H);
          src = tmp;
        }

        const frame = new VideoFrame(src, {
          timestamp: Math.round((i / FPS) * 1_000_000),
          duration:  Math.round((1 / FPS) * 1_000_000),
        });
        encoder.encode(frame, { keyFrame: i % FPS === 0 });
        frame.close();

        if (i % 10 === 0) setStatus(`Encoding ${i}/${FRAMES}...`);
        await new Promise(r => setTimeout(r, 0));
      }

      await encoder.flush();
      if (encoderError) throw encoderError;
      muxer.finalize();

      const { buffer } = muxer.target;
      const blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spx_${activeStyle}_${W}x${H}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setStatus(`✓ MP4 exported (${FRAMES} frames @ ${FPS}fps, ${W}×${H})`);
    } catch (e) {
      setStatus(`Export failed: ${e?.message || e}`);
    }
    setExporting(false);
  }, [captureAndProcess, activeStyle, sceneRef, rendererRef, mixerRef]);

  const handlePngSequenceExport = useCallback(async () => {
    if (!rendererRef?.current) { setStatus('No renderer'); return; }
    setExportingSequence(true);
    const FRAMES = 60;
    const FPS = 24;
    const zip = new JSZip();
    const framesFolder = zip.folder('frames');
    const manifestFrames = [];
    let firstWidth = 0;
    let firstHeight = 0;

    setStatus('Capturing ' + FRAMES + ' PNG frames...');
    try {
      for (let i = 0; i < FRAMES; i++) {
        applyNPRIfNeeded(activeStyle, sceneRef);
        const out = captureAndProcess(1);
        if (!out) continue;
        if (i === 0) { firstWidth = out.width; firstHeight = out.height; }

        const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
        if (!blob) continue;

        const filename = 'frame_' + String(i + 1).padStart(4, '0') + '.png';
        framesFolder.file(filename, blob);
        manifestFrames.push({
          filename: 'frames/' + filename,
          frame: i,
          time_seconds: Number((i / FPS).toFixed(4)),
        });

        if (i % 10 === 0) setStatus('Captured frame ' + i + '/' + FRAMES + '...');
        await new Promise((r) => setTimeout(r, 16));
      }

      const manifest = {
        version: '1.0',
        source: 'SPX 3D Mesh — 3D->2D Style',
        fps: FPS,
        frame_count: manifestFrames.length,
        width: firstWidth,
        height: firstHeight,
        style: activeStyle,
        frames: manifestFrames,
        metadata: {
          exported_at: new Date().toISOString(),
          exporter_version: '1.0',
        },
      };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      setStatus('Building zip...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spx_' + activeStyle + '_pngseq_' + firstWidth + 'x' + firstHeight + '.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setStatus('Done: ' + manifestFrames.length + ' PNG frames + manifest exported');
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setExportingSequence(false);
  }, [captureAndProcess, activeStyle, sceneRef, rendererRef]);

  if (!open) return null;

  return (
    <div className="s2d-root">

      {/* LEFT — 3D Live Viewport */}
      <div className="s2d-viewport">
        <div className="s2d-viewport-label">3D VIEWPORT — LIVE</div>
        <div className="s2d-canvas-wrap">
          <canvas ref={liveRef} className="s2d-viewport-canvas" />
        </div>
        <div className="s2d-viewport-hint">Live mirror of your scene</div>
      </div>

      {/* CENTER — 2D Styled Output */}
      <div className="s2d-output">
        <div className="s2d-viewport-label">
          2D OUTPUT —&nbsp;
          <span style={{color: currentStyle.color}}>{currentStyle.label.toUpperCase()}</span>
        </div>
        <div className="s2d-canvas-wrap">
          <canvas ref={previewRef} className="s2d-viewport-canvas" />
        </div>
        <div className="s2d-output-actions">
          <button className="s2d-btn s2d-btn--render" onClick={handleRender} disabled={rendering}>
            {rendering ? '⏳ RENDERING...' : '▶ RENDER'}
          </button>
          <select className="s2d-select" value={exportFormat} onChange={e=>setExportFormat(e.target.value)}>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
          <button className="s2d-btn s2d-btn--export" onClick={handleExportBrowser}>⬇ SAVE</button>
        </div>
        <div className="s2d-status">{status}</div>
      </div>

      {/* RIGHT — Controls */}
      <div className="s2d-controls">
        <div className="s2d-section-title">CATEGORY</div>
        <div className="s2d-cat-row">
          {CATEGORIES.map(c => (
            <button key={c.id}
              className={"s2d-cat-btn" + (activeCat===c.id ? " s2d-cat-btn--active" : "")}
              onClick={() => setActiveCat(c.id)}>{c.label}</button>
          ))}
        </div>

        <div className="s2d-section-title">STYLE — {filtered.length} OPTIONS</div>
        <div className="s2d-style-grid">
          {filtered.map(s => (
            <button key={s.id}
              className={"s2d-style-btn" + (activeStyle===s.id ? " s2d-style-btn--active" : "")}
              style={activeStyle===s.id ? {borderColor:s.color, color:s.color} : {}}
              onClick={() => setActiveStyle(s.id)}>{s.label}</button>
          ))}
        </div>

        <div className="s2d-section-title">PARAMETERS</div>
        <div className="s2d-param-row">
          <span className="s2d-param-label">Outline Width</span>
          <input type="range" min={0} max={5} step={0.5} value={outlineWidth}
            onChange={e=>setOutlineWidth(+e.target.value)} className="s2d-slider"/>
          <span className="s2d-param-val">{outlineWidth}</span>
        </div>
        <div className="s2d-param-row">
          <span className="s2d-param-label">Toon Levels</span>
          <input type="range" min={2} max={10} step={1} value={toonLevels}
            onChange={e=>setToonLevels(+e.target.value)} className="s2d-slider"/>
          <span className="s2d-param-val">{toonLevels}</span>
        </div>
        <div className="s2d-param-row">
          <span className="s2d-param-label">4K Scale</span>
          <input type="range" min={1} max={4} step={1} value={renderScale}
            onChange={e=>setRenderScale(+e.target.value)} className="s2d-slider"/>
          <span className="s2d-param-val">{renderScale}x</span>
        </div>

        <div className="s2d-native-actions">
          <div className="s2d-section-title">
            DESKTOP EXPORT
            {isElectron && <span className="s2d-electron-badge">ELECTRON</span>}
          </div>
          <button className="s2d-native-btn s2d-native-btn--4k"
            onClick={handleRender4K} disabled={exporting}>
            <span>⚡ RENDER {renderScale}K</span>
            <span className="s2d-native-label">Native save dialog</span>
          </button>
          <button className="s2d-native-btn s2d-native-btn--video"
            onClick={handleVideoExport} disabled={exporting}>
            <span>🎬 EXPORT VIDEO</span>
            <span className="s2d-native-label">60 frames → MP4</span>
          </button>
          <button
            className="s2d-btn s2d-btn--export"
            onClick={handlePngSequenceExport}
            disabled={exportingSequence}
            title="Export 60-frame PNG sequence + manifest.json (for SPX Puppet)"
          >
            {exportingSequence ? 'EXPORTING...' : 'PNG SEQUENCE'}
          </button>
        </div>
      </div>

    </div>
  );
}
