import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import JSZip from "jszip";
import { detectFaceRect } from "../../utils/faceDetection";

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
      // Cel-family pipeline: 3D pass already gave us a MeshToon-rendered frame.
      // 2D pass forces hard cel bands + ink lines on top.
      //   (1) Sobel edges on the ORIGINAL src — captures fine surface detail
      //       before the bilateral wipes it.
      //   (2) Bilateral blur — flatten residual gradient.
      //   (3) Luminance posterize — hard cel bands, original chroma preserved.
      //   (4) Multiply-composite black ink lines on top.
      //   (5) Optional greyscale (manga).
      // Output written into `id` so the post-switch putImageData pushes the
      // pipeline result to dst, where halftone overlay + applyPackFinish
      // continue to operate unchanged.
      const cfg = CEL_SHADED_STYLES[style];
      if (cfg) {
        const pass = CEL_2D_PASS[style];

        const lines   = makeLinePass(srcCanvas, pass.edgeThreshold, pass.edgeBias);
        const blurred = bilateralBlurSeparable(srcCanvas, pass.bilateralRadius, pass.bilateralSigmaR);
        // Toon Levels slider overrides the per-style default. Lets the
        // user push more or fewer cel bands without editing CEL_2D_PASS.
        posterizeLuminance(blurred, params.toonLevels ?? pass.posterizeLv);

        const bctx = blurred.getContext('2d');
        bctx.globalCompositeOperation = 'multiply';
        bctx.drawImage(lines, 0, 0);
        bctx.globalCompositeOperation = 'source-over';

        const bid = bctx.getImageData(0, 0, blurred.width, blurred.height);
        if (cfg.monochrome) {
          const bd = bid.data;
          for (let i = 0; i < bd.length; i += 4) {
            const lum = 0.299*bd[i] + 0.587*bd[i+1] + 0.114*bd[i+2];
            bd[i] = bd[i+1] = bd[i+2] = lum;
          }
        }
        id.data.set(bid.data);
        break;
      }
      // Legacy posterize path — used by cartoon-family styles that have not
      // yet been migrated to the cel-shader rig.
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
      // Sobel edge detection → color-map: edges = pale cyan, fill = saturated
      // technical-blueprint blue. Returns the line canvas directly so the
      // trailing posterize/halftone passes don't kick in.
      const lines = makeLinePass(srcCanvas, params.edgeThreshold ?? 24, params.edgeBias ?? 1.0);
      const lctx = lines.getContext('2d');
      const lid  = lctx.getImageData(0, 0, lines.width, lines.height);
      const ld   = lid.data;
      for (let i = 0; i < ld.length; i += 4) {
        const isEdge = ld[i] < 128;
        if (isEdge) { ld[i] = 200; ld[i+1] = 235; ld[i+2] = 255; }
        else        { ld[i] = 18;  ld[i+1] = 68;  ld[i+2] = 180; }
      }
      lctx.putImageData(lid, 0, 0);
      return lines;
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
      // Sobel edges layered over the binary luminance threshold so gouged-
      // edge linework reads as real linocut, not a stark posterize. Edges
      // always render as ink; non-edge pixels fall to the binary threshold
      // with jitter for that hand-cut feel.
      const lines = makeLinePass(srcCanvas, params.edgeThreshold ?? 32, 1.2);
      const lctx = lines.getContext('2d');
      const lid  = lctx.getImageData(0, 0, lines.width, lines.height);
      const ld   = lid.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum    = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        const jitter = (Math.random() - 0.5) * 24;
        const fill   = (lum + jitter) > 130 ? 245 : 18;
        const edge   = ld[i] < 128;
        const v      = edge ? 18 : fill;
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

// Separable bilateral approximation. Two 1D passes (X then Y) where each tap
// is weighted by spatial Gaussian × range Gaussian (luminance distance). Not a
// true 2D bilateral but visually close and ~3× cheaper. Used to flatten
// residual gradient on the MeshToon-rendered frame before posterize so the
// final cel bands are clean instead of speckled.
function bilateralBlurSeparable(srcCanvas, radius = 3, sigmaR = 30) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const sctx = srcCanvas.getContext('2d');
  const src = sctx.getImageData(0, 0, w, h).data;
  const tmp = new Uint8ClampedArray(src.length);
  const out = new Uint8ClampedArray(src.length);

  const sigmaS = Math.max(1, radius);
  const spatial = new Float32Array(radius + 1);
  for (let i = 0; i <= radius; i++) spatial[i] = Math.exp(-(i * i) / (2 * sigmaS * sigmaS));

  const range = new Float32Array(256);
  for (let i = 0; i < 256; i++) range[i] = Math.exp(-(i * i) / (2 * sigmaR * sigmaR));

  // X pass: src → tmp
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ci = (y * w + x) * 4;
      const cl = 0.299 * src[ci] + 0.587 * src[ci + 1] + 0.114 * src[ci + 2];
      let r = 0, g = 0, b = 0, wsum = 0;
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      for (let xs = x0; xs <= x1; xs++) {
        const si = (y * w + xs) * 4;
        const sl = 0.299 * src[si] + 0.587 * src[si + 1] + 0.114 * src[si + 2];
        const dl = (sl - cl) | 0;
        const wt = spatial[xs >= x ? xs - x : x - xs] * range[dl < 0 ? -dl : dl];
        r += src[si]     * wt;
        g += src[si + 1] * wt;
        b += src[si + 2] * wt;
        wsum += wt;
      }
      tmp[ci]     = r / wsum;
      tmp[ci + 1] = g / wsum;
      tmp[ci + 2] = b / wsum;
      tmp[ci + 3] = 255;
    }
  }

  // Y pass: tmp → out
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ci = (y * w + x) * 4;
      const cl = 0.299 * tmp[ci] + 0.587 * tmp[ci + 1] + 0.114 * tmp[ci + 2];
      let r = 0, g = 0, b = 0, wsum = 0;
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(h - 1, y + radius);
      for (let ys = y0; ys <= y1; ys++) {
        const si = (ys * w + x) * 4;
        const sl = 0.299 * tmp[si] + 0.587 * tmp[si + 1] + 0.114 * tmp[si + 2];
        const dl = (sl - cl) | 0;
        const wt = spatial[ys >= y ? ys - y : y - ys] * range[dl < 0 ? -dl : dl];
        r += tmp[si]     * wt;
        g += tmp[si + 1] * wt;
        b += tmp[si + 2] * wt;
        wsum += wt;
      }
      out[ci]     = r / wsum;
      out[ci + 1] = g / wsum;
      out[ci + 2] = b / wsum;
      out[ci + 3] = 255;
    }
  }

  const dst = document.createElement('canvas');
  dst.width = w; dst.height = h;
  const dctx = dst.getContext('2d');
  const idOut = dctx.createImageData(w, h);
  idOut.data.set(out);
  dctx.putImageData(idOut, 0, 0);
  return dst;
}

// Luminance-based posterize. Snaps brightness to N flat steps while keeping
// each pixel's original chroma — produces clean cel "blocks" where multiple
// hues share the same brightness band. Avoids the per-channel-quantize
// confetti edges of makeFlatColorPass. Mutates the canvas in place.
//
// Math.ceil (not round) on the band index biases every pixel UP into its
// next brighter band. Without this, mid-tone skin (lum ~110/255 with
// levels=4) rounds DOWN to band 1 of 3 (≈85/255) and the character looks
// underexposed; with ceil it snaps to band 2 (≈170/255) for a brighter,
// healthier cel result. Pure black (lum<1) still short-circuits.
function posterizeLuminance(canvas, levels) {
  const ctx = canvas.getContext('2d');
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = id.data;
  const lvSteps = Math.max(1, levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (lum < 1) continue;
    const newLum = Math.ceil(lum / 255 * lvSteps) / lvSteps * 255;
    const ratio = newLum / lum;
    d[i]     = Math.max(0, Math.min(255, d[i]     * ratio));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * ratio));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * ratio));
  }
  ctx.putImageData(id, 0, 0);
}

// ── Cel-shader rig ──────────────────────────────────────────────────────────
// Per-style configuration. Anime is the template; siblings (manga, comic,
// cel, toon, pixar) ship in subsequent commits by adding rows to this table.
const CEL_SHADED_STYLES = {
  anime: { steps: 3, outlineMul: 0.6, halftone: false, monochrome: false },
  manga: { steps: 2, outlineMul: 1.5, halftone: true,  monochrome: true  },
  comic: { steps: 3, outlineMul: 1.5, halftone: true,  monochrome: false },
  cel:   { steps: 2, outlineMul: 1.2, halftone: false, monochrome: false },
  toon:  { steps: 4, outlineMul: 1.0, halftone: false, monochrome: false },
  pixar: { steps: 5, outlineMul: 0.5, halftone: false, monochrome: false },
};

// 2D post-pass tuning (paired 1:1 with CEL_SHADED_STYLES). Bilateral flattens
// what's left of the gradient on the MeshToon-rendered frame; luminance
// posterize forces N hard cel bands; Sobel edges (computed on the ORIGINAL
// captured frame, before bilateral wipes detail) composite as black ink lines.
// sigmaR bumped (was 25-40) to flatten dense face features that the smaller
// range was leaving as mottled noise instead of clean cel zones — higher
// sigmaR makes the bilateral treat more luminance variation as "same region."
// edgeThreshold bumped substantially (was 22-36) so the Sobel pass only
// catches strong silhouettes and major feature boundaries; the previous
// thresholds were picking up skinning topology and mesh seams as internal
// "bone-line" ink, which read as x-ray creepy on the avatar.
const CEL_2D_PASS = {
  anime: { posterizeLv: 5, bilateralRadius: 3, bilateralSigmaR: 45, edgeThreshold: 90, edgeBias: 1.0 },
  manga: { posterizeLv: 2, bilateralRadius: 5, bilateralSigmaR: 55, edgeThreshold: 55, edgeBias: 1.4 },
  comic: { posterizeLv: 3, bilateralRadius: 3, bilateralSigmaR: 45, edgeThreshold: 55, edgeBias: 1.4 },
  cel:   { posterizeLv: 2, bilateralRadius: 2, bilateralSigmaR: 35, edgeThreshold: 65, edgeBias: 1.0 },
  toon:  { posterizeLv: 4, bilateralRadius: 3, bilateralSigmaR: 45, edgeThreshold: 70, edgeBias: 1.0 },
  pixar: { posterizeLv: 5, bilateralRadius: 2, bilateralSigmaR: 35, edgeThreshold: 80, edgeBias: 0.7 },
};

// 1×N DataTexture used by MeshToonMaterial.gradientMap. NearestFilter snaps
// the diffuse term to discrete steps → hard cel transitions instead of a
// smooth Lambertian falloff.
function makeCelGradientMap(steps) {
  const stops = steps === 2 ? [0.4, 1.0]
              : steps === 4 ? [0.3, 0.55, 0.8, 1.0]
              : steps === 5 ? [0.2, 0.4, 0.6, 0.8, 1.0]
              : [0.45, 0.7, 1.0];
              // ↑ default 3 (anime). Bottom stop lifted from 0.3 → 0.45 to
              //   prevent the 3D MeshToon + 2D posterize double-quantize
              //   from collapsing shadow-side fragments to pure black in
              //   armpits/inner-thighs/neck/visor cavity. Math: at the 2D
              //   pass's posterizeLv=5 (lvSteps=4), the bottom-band ceil
              //   threshold sits at 1/4 = 0.25 — so a 0.30 input rounds to
              //   band 1 (≈0/255), reading as plate black. 0.45 lands well
              //   above 0.25, snapping into band 2 (≈64/255 → ratio
              //   recolor with original chroma) for a readable dark-cel
              //   zone. If shadows still too dark, raise to 0.50; if
              //   washed out, drop to 0.40.
  const data = new Uint8Array(stops.length * 4);
  stops.forEach((v, i) => {
    const c = Math.round(v * 255);
    data[i*4] = c; data[i*4+1] = c; data[i*4+2] = c; data[i*4+3] = 255;
  });
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

// MeshToonMaterial inherits ONLY albedo (color, map) from the source PBR
// material — skin tone, hair color, eye whites preserved. Every other
// secondary lighting/normal/displacement contribution is explicitly stripped
// so iClone's baked PBR specular / AO / emissive / clearcoat / displacement
// can't bleed through as bright face patches or odd dark zones.
//
// Note on PBR-only properties (roughness, metalness, clearcoat, *Map
// variants): MeshToonMaterial does NOT use these in its shader, so setting
// them to 0/null is functionally a no-op. Included anyway as a defensive
// belt — Material.setValues() pass-through, copy() flows, and any future
// Three.js shader changes can't surprise us if we explicitly zero them.
function makeCelMaterial(originalMat, steps) {
  const mat = new THREE.MeshToonMaterial({
    color:       originalMat?.color || new THREE.Color(0xffffff),
    map:         originalMat?.map || null,
    gradientMap: makeCelGradientMap(steps),
    transparent: originalMat?.transparent || false,
    opacity:     originalMat?.opacity ?? 1,
    side:        originalMat?.side || THREE.FrontSide,
    // Secondary lighting/normal contributions — all valid MeshToonMaterial
    // inputs, all explicitly nulled so face highlights from baked AO,
    // emissive maps, light maps, bump, or normal can't bleed through.
    normalMap:        null,
    aoMap:            null,
    bumpMap:          null,
    lightMap:         null,
    emissiveMap:      null,
    displacementMap:  null,
    emissive:         new THREE.Color(0x000000),
  });

  // PBR-only properties — ignored by MeshToonMaterial's shader but set
  // anyway for the reasons in the header comment. iClone exports often
  // ship with non-trivial roughnessMap/metalnessMap/clearcoat baked in.
  mat.roughness               = 1;
  mat.metalness               = 0;
  mat.roughnessMap            = null;
  mat.metalnessMap            = null;
  mat.clearcoat               = 0;
  mat.clearcoatMap            = null;
  mat.clearcoatNormalMap      = null;
  mat.clearcoatRoughnessMap   = null;

  // Low (not zero) IBL fill: 0 underexposes the character because the
  // ambient + hemi alone don't compensate for the lost env contribution.
  // 0.35 restores enough fill to read at proper exposure without drowning
  // the Lambert N·L term the gradient quantizes.
  mat.envMapIntensity = 0.35;
  return mat;
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

  // Live styled preview playback (independent of main viewport timeline)
  const PREVIEW_FPS = 24;
  const [previewPlaying,    setPreviewPlaying]    = useState(false);
  const [previewFrame,      setPreviewFrame]      = useState(0);
  const [previewFrameCount, setPreviewFrameCount] = useState(48);
  const previewPlayingRef     = useRef(false);
  const previewFrameRef       = useRef(0);
  const previewStartTimeRef   = useRef(0);
  const previewStartFrameRef  = useRef(0);
  const previewFrameCountRef  = useRef(48);
  const lastTickRef           = useRef(0);

  const previewRef = useRef(null);
const prevFrameRef = useRef(null);
  const liveRef    = useRef(null);
  const animRef    = useRef(null);
  // Panel-owned camera that auto-frames the scene's subject. Used by the
  // preview rAF, SAVE, EXPORT VIDEO, 4K render, and PNG sequence. Falls
  // back to the user's main viewport camera when no subject exists.
  const previewCameraRef = useRef(null);

  // Face detection state (Step 1, Phase 1A). faceRectRef is the latest
  // {x,y,w,h,featherPx} or null, mutated on every rAF tick. Caching the
  // one-shot bone/mesh lookups in faceDetectCacheRef avoids re-traversing
  // the scene every frame. The overlay div is a debug visualizer toggled
  // by window.__SPX_DEBUG_FACE_RECT — direct DOM mutation (no React state)
  // because the rect updates per animation frame.
  const faceRectRef         = useRef(null);
  const faceDetectCacheRef  = useRef({});
  const faceRectOverlayRef  = useRef(null);
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

  // STEP 0 — Bone + mesh name discovery for the face pipeline (Phase 1A/3A).
  // One-shot dump on every panel-open so we can lock the iClone matcher
  // patterns to whatever the loaded character actually uses (CC4, ActorCore,
  // Mixamo, etc.). Remove this effect once Step 1 ships and matchers are set.
  useEffect(() => {
    if (!open) return;
    const scene = sceneRef?.current;
    if (!scene) return;

    const bones = [];
    const skinnedMeshes = [];
    const meshes = [];

    scene.traverse(obj => {
      if (obj.userData?._spxNprOutline) return;
      if (obj.userData?.isHelper === true) return;
      if (obj.userData?._spxInfrastructure === true) return;

      if (obj.isBone) {
        bones.push({ name: obj.name || '(unnamed)', parent: obj.parent?.name || '-' });
      } else if (obj.isSkinnedMesh) {
        skinnedMeshes.push({
          name:     obj.name || '(unnamed)',
          parent:   obj.parent?.name || '-',
          material: obj.material?.type || '-',
          verts:    obj.geometry?.attributes?.position?.count || 0,
        });
      } else if (obj.isMesh) {
        meshes.push({
          name:     obj.name || '(unnamed)',
          parent:   obj.parent?.name || '-',
          material: obj.material?.type || '-',
          verts:    obj.geometry?.attributes?.position?.count || 0,
        });
      }
    });

    console.groupCollapsed(`[SPX 2D-panel] Step 0 — bone/mesh discovery (${bones.length} bones, ${skinnedMeshes.length} skinned, ${meshes.length} meshes)`);
    console.log('Bones — look for head/eye/jaw/nose/mouth patterns:');
    console.table(bones);
    console.log('Skinned meshes — look for face/eye/teeth/tongue/hair sub-meshes:');
    console.table(skinnedMeshes);
    console.log('Static meshes:');
    console.table(meshes);
    console.groupEnd();
  }, [open, sceneRef]);

  // Material override dispatch. Registered BEFORE the auto-render useEffect
  // (Bug 2 commit) so materials are swapped before the captured frame is
  // taken — no stale-frame flash on style change.
  //   - cel-family styles (anime/manga/comic/cel/toon/pixar) → cel-shader
  //   - low_poly → flatShading override
  //   - everything else → restore PBR
  // Outline width is tied to the slider for live tuning of the cel path.
  useEffect(() => {
    if (!open) return;
    if (CEL_SHADED_STYLES[activeStyle])    applyCelShading(activeStyle);
    else if (activeStyle === 'low_poly')   applyFlatShading();
    else                                   restoreNPRMaterials();
  }, [open, activeStyle, outlineWidth]);

  // captureAndProcess is recreated whenever activeStyle changes (it's a
  // useCallback declared further down). The rAF closure can't depend on
  // it without tearing down every style click, so pin the latest version
  // in a ref and read through. The actual sync effect lives below the
  // useCallback declaration to avoid a temporal-dead-zone reference at
  // render time.
  const captureRef = useRef(null);

  // Mirror main renderer into live canvas + drive live styled preview.
  // Single rAF chain owns: preview frame advance, mixer seek, styled
  // capture into previewRef, raw mirror into liveRef.
  useEffect(() => {
    if (!open) return;
    const FRAME_INTERVAL = 1000 / PREVIEW_FPS;

    const mirror = (now) => {
      // 24fps cap. Heavy filters at 60Hz pin a CPU core; preview only
      // needs 24 to look fluid.
      if (typeof now === 'number' && now - lastTickRef.current < FRAME_INTERVAL) {
        animRef.current = requestAnimationFrame(mirror);
        return;
      }
      lastTickRef.current = (typeof now === 'number') ? now : performance.now();

      const renderer = rendererRef?.current;
      const scene    = sceneRef?.current;
      const camera   = cameraRef?.current;
      if (!renderer || !scene || !camera) {
        animRef.current = requestAnimationFrame(mirror);
        return;
      }

      // (1) Advance previewFrame from wall-clock when playing. Wall-clock
      // driven so a slow filter drops frames but keeps real-time speed.
      if (previewPlayingRef.current) {
        const elapsedSec = (lastTickRef.current - previewStartTimeRef.current) / 1000;
        const fc = previewFrameCountRef.current || 1;
        const f = Math.floor(previewStartFrameRef.current + elapsedSec * PREVIEW_FPS) % fc;
        if (f !== previewFrameRef.current) {
          previewFrameRef.current = f;
          setPreviewFrame(f);
        }
      }

      // (2) Seek mixer to the current preview frame. Re-runs every tick
      // so any drift from App.jsx's animate loop is overridden.
      const mixer = mixerRef?.current;
      const root  = mixer?.getRoot?.();
      const clip  = root?.animations?.[0];
      const action = (clip && mixer) ? mixer.existingAction(clip) : null;
      if (action && clip?.duration > 0) {
        // Keep frame count fresh in case a new model was loaded.
        const fcDerived = Math.max(1, Math.round(clip.duration * PREVIEW_FPS));
        if (fcDerived !== previewFrameCountRef.current) {
          previewFrameCountRef.current = fcDerived;
          setPreviewFrameCount(fcDerived);
        }
        action.time = (previewFrameRef.current / PREVIEW_FPS) % clip.duration;
        mixer.update(0);
      }

      // (3) Auto-frame and styled half-res capture → previewRef (4× perf vs
      // full). captureAndProcess internally calls renderer.render so the
      // backbuffer is up-to-date for the mirror copy below.
      reframePreviewCamera();
      const out = captureRef.current
        ? captureRef.current(0.5, previewCameraRef.current)
        : null;
      if (out && previewRef.current) {
        const c = previewRef.current;
        c.width  = c.offsetWidth  || out.width;
        c.height = c.offsetHeight || out.height;
        c.getContext('2d').drawImage(out, 0, 0, c.width, c.height);

        // (3b) Face rect detection (Step 1, Phase 1A). Computed in the
        // 2D OUTPUT canvas's pixel space — same camera (previewCameraRef)
        // and same canvas dimensions as the styled draw above, so the
        // overlay div's pixel coords line up with what the user sees.
        const rect = detectFaceRect(
          scene,
          previewCameraRef.current || camera,
          c.width,
          c.height,
          faceDetectCacheRef.current,
        );
        faceRectRef.current = rect;

        const overlay = faceRectOverlayRef.current;
        if (overlay) {
          if (window.__SPX_DEBUG_FACE_RECT && rect) {
            overlay.style.display   = 'block';
            overlay.style.left      = `${rect.x}px`;
            overlay.style.top       = `${rect.y}px`;
            overlay.style.width     = `${rect.w}px`;
            overlay.style.height    = `${rect.h}px`;
            // boxShadow inset visualizes the feather falloff zone in one
            // overlay (rect outline + feather band).
            overlay.style.boxShadow = `inset 0 0 0 ${rect.featherPx}px rgba(255,0,0,0.25)`;
          } else {
            overlay.style.display = 'none';
          }
        }
      }

      // (4) Raw mirror → liveRef. Re-render with the user's main viewport
      // camera so the left pane keeps showing their orbit-controlled view
      // rather than the panel's auto-framed shot.
      const dst = liveRef.current;
      const userCam = cameraRef?.current;
      if (dst && userCam) {
        renderer.render(scene, userCam);
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

  
function applyNPRIfNeeded(/* style, sceneRef */){
  // Disabled. The 3D toon-material override + addOutlineToMesh pre-pass
  // produced black silhouettes for animated avatars. addOutlineToMesh adds
  // a plain THREE.Mesh (not SkinnedMesh) using the SkinnedMesh's geometry
  // at scene root — so it renders at rest T-pose, ignores the auto-fit
  // scale, and explodes to ~70× the character's size as a black BackSide
  // shell that buries the animated mesh.
  //
  // The applyStyleFilter pass (toon/cel/anime/manga/comic/pixar branch)
  // already handles cel-shading via 2D banding+boost on the rendered
  // frame, which works for every mesh including animated ones. The 3D
  // pre-pass is redundant and harmful — leaving the function as a no-op
  // keeps every call site working without further edits.
  return;
}

// Auto-frame the preview camera on whatever non-helper subject is in the
// scene. Box3.setFromObject on a SkinnedMesh returns the rest-pose bbox, so
// framing is stable across animation — no jitter as bones move.
function reframePreviewCamera() {
  const renderer = rendererRef?.current;
  const scene    = sceneRef?.current;
  if (!renderer || !scene) return;

  const isInfra = (c) => (
    c.isLight || c.isCamera ||
    c.type === 'GridHelper' || c.type === 'AxesHelper' || c.type === 'LineSegments' ||
    c.userData?.isHelper === true || c.userData?._spxInfrastructure === true
  );
  const subjects = scene.children.filter(c => !isInfra(c));
  if (subjects.length === 0) return;  // leave camera null → fallback to cameraRef

  const box = new THREE.Box3();
  subjects.forEach(s => box.expandByObject(s));
  if (box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 5;
  const dist   = Math.max(maxDim * 1.8, 0.5);

  const canvas = renderer.domElement;
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);

  if (!previewCameraRef.current) {
    previewCameraRef.current = new THREE.PerspectiveCamera(35, aspect, 0.01, 1000);
  }
  const cam = previewCameraRef.current;
  if (Math.abs(cam.aspect - aspect) > 0.001) {
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
  }
  cam.position.set(center.x, center.y, center.z + dist);
  cam.lookAt(center);
}

// Restore original materials and remove outlines added during NPR.
// Cel-shaded outlines are parented under each mesh's parent (not directly
// the scene), so removeFromParent() is the correct deparent call.
function restoreNPRMaterials() {
  for (const [mesh, originalMat] of materialBackupRef.current.entries()) {
    if (mesh.material && mesh.material !== originalMat) {
      mesh.material.dispose?.();
    }
    mesh.material = originalMat;
  }
  materialBackupRef.current.clear();
  for (const outline of outlineMeshesRef.current) {
    if (outline.parent) outline.parent.remove(outline);
    outline.material?.dispose?.();
  }
  outlineMeshesRef.current = [];
}

// Faux low-poly: clone each mesh's existing material and flip flatShading.
// True low-poly needs geometry decimation (out of scope per audit). This
// "cheat" produces faceted shading without changing vertex count by
// disabling per-vertex normal interpolation.
function applyFlatShading() {
  restoreNPRMaterials();
  const scene = sceneRef?.current;
  if (!scene) return;
  scene.traverse(obj => {
    if (!obj.isMesh) return;
    if (obj.userData?._spxNprOutline) return;
    if (obj.userData?.isHelper === true) return;

    materialBackupRef.current.set(obj, obj.material);
    const flat = (obj.material && obj.material.clone) ? obj.material.clone() : obj.material;
    flat.flatShading = true;
    flat.needsUpdate = true;
    obj.material = flat;
  });
}

// Apply cel-shading for the current style. Always restores prior NPR state
// first so style transitions (anime → pencil) deterministically clean up.
function applyCelShading(style) {
  restoreNPRMaterials();
  const scene = sceneRef?.current;
  if (!scene) return;
  const cfg = CEL_SHADED_STYLES[style];
  if (!cfg) return;

  // Scale-based inverted-hull outline. A plain BackSide black mesh inflated
  // uniformly along the mesh's local axes — visible at any viewport size,
  // no shader injection, no projection-matrix math. Trade-off: thickness
  // varies slightly with camera distance (constant in world space, not
  // screen space). Acceptable for the demo.
  //
  // Slider mapping: scale factor = 1 + (outlineWidth * outlineMul * 0.02).
  // outlineWidth=1.5, outlineMul=1.0 → 1.03 (subtle, default look).
  // outlineWidth=2.5, outlineMul=1.5 → 1.075 (heavy, manga look).
  // Coefficient bumped 0.02 → 0.04 to make the slider visibly affect output
  // across its 0–5 range; the previous coefficient kept thickness sub-pixel.
  const scaleFactor = 1 + ((outlineWidth || 1.5) * cfg.outlineMul * 0.04);

  scene.traverse(obj => {
    if (!obj.isMesh) return;
    if (obj.userData?._spxNprOutline) return;          // skip outlines we added
    if (obj.userData?.isHelper === true) return;       // skip viewport helpers
    if (!obj.parent) return;

    materialBackupRef.current.set(obj, obj.material);
    obj.material = makeCelMaterial(obj.material, cfg.steps);

    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side:  THREE.BackSide,
    });

    let outline;
    if (obj.isSkinnedMesh) {
      outline = new THREE.SkinnedMesh(obj.geometry, outlineMat);
      outline.bind(obj.skeleton, obj.bindMatrix);
    } else {
      outline = new THREE.Mesh(obj.geometry, outlineMat);
    }
    outline.userData._spxNprOutline = true;
    outline.renderOrder = (obj.renderOrder || 0) - 1;
    outline.position.copy(obj.position);
    outline.rotation.copy(obj.rotation);
    outline.scale.copy(obj.scale).multiplyScalar(scaleFactor);
    obj.parent.add(outline);
    outlineMeshesRef.current.push(outline);
  });
}


const captureAndProcess = useCallback((scale = 1, cameraOverride = null) => {
    const renderer = rendererRef?.current;
    const scene    = sceneRef?.current;
    // Override is the panel's auto-framed previewCamera; fall back to the
    // user's main viewport camera if the override hasn't been set yet
    // (empty scene case).
    const camera   = cameraOverride || cameraRef?.current;
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

  // Sync ref every render — runs after the captureAndProcess const initializer
  // above. No useEffect, no dep array. A dep-array reference to
  // captureAndProcess was tripping `Cannot access 'captureAndProcess' before
  // initialization` on first mount in some build/strict-mode configurations
  // even with the source order correct; a plain property write sidesteps the
  // issue entirely. Cost: one assignment per render, negligible.
  captureRef.current = captureAndProcess;

  const handleRender = useCallback(async () => {
    if (!rendererRef?.current) { setStatus('⚠ No renderer — add a mesh first'); return; }
    setRendering(true); setStatus('Rendering...');
    try {
      
applyNPRIfNeeded(activeStyle, sceneRef);
const out = captureAndProcess(1, previewCameraRef.current);

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

  // Auto-render whenever the chosen style changes (or panel opens with one).
  // handleRender already guards on rendererRef, but checking it here too
  // prevents a "⚠ No renderer" status flash on first mount.
  useEffect(() => {
    if (!open) return;
    if (!rendererRef?.current) return;
    handleRender();
  }, [activeStyle, open, handleRender]);

  const handleExportBrowser = () => {
    if (!previewRef.current) { setStatus('Render first'); return; }
    const url = previewRef.current.toDataURL(`image/${exportFormat}`);
    const a = document.createElement('a');
    a.href = url; a.download = `spx_${activeStyle}.${exportFormat}`; a.click();
    setStatus(`✓ Exported ${exportFormat.toUpperCase()}`);
  };

  const handleClear = useCallback(() => {
    if (previewRef.current) {
      const c = previewRef.current;
      c.getContext('2d').clearRect(0, 0, c.width, c.height);
    }
    // Reset temporal blend buffer so a fresh render after Clear doesn't
    // ghost-blend the previously cleared frame at 35% alpha.
    prevFrameRef.current = null;
    // Pause preview and rewind to frame 0 so the live loop stops painting
    // over the cleared canvas with the same in-progress frame.
    previewPlayingRef.current = false;
    setPreviewPlaying(false);
    previewFrameRef.current = 0;
    setPreviewFrame(0);
    setStatus('Select a style and click Render');
  }, []);

  // ── Preview playback handlers ───────────────────────────────────────────
  const togglePreviewPlay = useCallback(() => {
    if (previewPlayingRef.current) {
      previewPlayingRef.current = false;
      setPreviewPlaying(false);
    } else {
      previewStartTimeRef.current  = performance.now();
      previewStartFrameRef.current = previewFrameRef.current;
      previewPlayingRef.current = true;
      setPreviewPlaying(true);
    }
  }, []);

  const seekPreview = useCallback((f) => {
    const fc = previewFrameCountRef.current || 1;
    const clamped = Math.max(0, Math.min(fc - 1, Math.floor(f)));
    previewFrameRef.current = clamped;
    setPreviewFrame(clamped);
    if (previewPlayingRef.current) {
      // Re-anchor wall-clock so play continues from the new frame.
      previewStartTimeRef.current  = performance.now();
      previewStartFrameRef.current = clamped;
    }
  }, []);

  // Auto-play preview when the panel opens. Matches the auto-play-on-import
  // behavior so a walking avatar shows up walking, not as a still pose.
  useEffect(() => {
    if (!open) return;
    const mixer = mixerRef?.current;
    const clip  = mixer?.getRoot?.()?.animations?.[0];
    if (!clip) return;
    const fc = Math.max(1, Math.round(clip.duration * PREVIEW_FPS));
    previewFrameCountRef.current = fc;
    setPreviewFrameCount(fc);
    previewFrameRef.current = 0;
    setPreviewFrame(0);
    previewStartTimeRef.current  = performance.now();
    previewStartFrameRef.current = 0;
    previewPlayingRef.current = true;
    setPreviewPlaying(true);
  }, [open, mixerRef]);

  const handleRender4K = useCallback(async () => {
    if (!rendererRef?.current) { setStatus('⚠ No renderer'); return; }
    setExporting(true); setStatus('Rendering 4K...');
    try {
      
applyNPRIfNeeded(activeStyle, sceneRef);
const out = captureAndProcess(renderScale, previewCameraRef.current);

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
    reframePreviewCamera();
    const probe = captureAndProcess(1, previewCameraRef.current);
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
        const out = captureAndProcess(1, previewCameraRef.current);
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
        const out = captureAndProcess(1, previewCameraRef.current);
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
          <div ref={faceRectOverlayRef} style={{
            position:      'absolute',
            display:       'none',
            border:        '2px solid red',
            pointerEvents: 'none',
            zIndex:        10,
          }} />
        </div>
        <div className="s2d-output-actions">
          <button className="s2d-btn s2d-btn--render" onClick={handleRender} disabled={rendering}>
            {rendering ? '⏳ RENDERING...' : '▶ RENDER'}
          </button>
          <button className="s2d-btn s2d-btn--clear" onClick={handleClear}>✕ CLEAR</button>
          <select className="s2d-select" value={exportFormat} onChange={e=>setExportFormat(e.target.value)}>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
          <button className="s2d-btn s2d-btn--export" onClick={handleExportBrowser}>⬇ SAVE</button>
        </div>
        <div className="s2d-playback">
          <button className="s2d-pb-btn" onClick={() => seekPreview(0)} title="Rewind">⏮</button>
          <button className="s2d-pb-btn s2d-pb-btn--play" onClick={togglePreviewPlay}
                  title={previewPlaying ? 'Pause preview' : 'Play preview'}>
            {previewPlaying ? '❚❚' : '▶'}
          </button>
          <input type="range" min={0} max={Math.max(0, previewFrameCount - 1)} step={1}
                 value={previewFrame} onChange={(e) => seekPreview(+e.target.value)}
                 className="s2d-pb-scrub" />
          <span className="s2d-pb-counter">{previewFrame} / {Math.max(0, previewFrameCount - 1)}</span>
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
          <input type="range" min={2} max={8} step={1} value={toonLevels}
            onChange={e=>setToonLevels(+e.target.value)} className="s2d-slider"/>
          <span className="s2d-param-val">{toonLevels}</span>
        </div>
        <div className="s2d-param-row">
          <span className="s2d-param-label">Export Resolution</span>
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
