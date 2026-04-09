/**
 * SPX Poly Quality System
 * Provides geometry segment counts for Low / Mid / High / Ultra quality levels.
 * Import and use Q(quality) wherever you build THREE.js geometry.
 *
 * Usage:
 *   import { Q, QUALITY_LEVELS, PolyQualityBar } from './PolyQualityUtil';
 *   const segs = Q(quality);
 *   new THREE.SphereGeometry(r, segs.sphere, segs.sphereH)
 *   new THREE.CylinderGeometry(rt, rb, h, segs.cylinder)
 *   new THREE.BoxGeometry(w, h, d, segs.box, segs.box, segs.box)
 */

export const QUALITY_LEVELS = ["Low", "Mid", "High", "Ultra"];

export const QUALITY_PRESETS = {
  Low: {
    sphere:      6,  sphereH:  4,
    cylinder:    6,
    box:         1,
    cone:        5,
    torus:       12, torusTube: 4,
    capsule:     4,  capsuleH:  4,
    plane:       1,
    desc:        "Low — ~50-200 tris/part. Game-ready, fast preview.",
    triMult:     1.0,
  },
  Mid: {
    sphere:      12, sphereH:  8,
    cylinder:    10,
    box:         1,
    cone:        8,
    torus:       20, torusTube: 6,
    capsule:     6,  capsuleH:  6,
    plane:       2,
    desc:        "Mid — ~500-1500 tris/part. Balanced. Good for animation.",
    triMult:     4.0,
  },
  High: {
    sphere:      24, sphereH: 16,
    cylinder:    18,
    box:         2,
    cone:        14,
    torus:       36, torusTube: 10,
    capsule:     10, capsuleH: 10,
    plane:       4,
    desc:        "High — ~2000-6000 tris/part. Film/cinematic quality.",
    triMult:     16.0,
  },
  Ultra: {
    sphere:      48, sphereH: 32,
    cylinder:    32,
    box:         4,
    cone:        24,
    torus:       64, torusTube: 16,
    capsule:     16, capsuleH: 16,
    plane:       8,
    desc:        "Ultra — ~8000-25000 tris/part. Sculpt-level subdivision. Slow on large scenes.",
    triMult:     64.0,
  },
};

export function Q(quality) {
  return QUALITY_PRESETS[quality] || QUALITY_PRESETS.Mid;
}

// Estimated triangle count for a full character at given quality
export function estimateTris(quality, partCount=20) {
  const q = QUALITY_PRESETS[quality] || QUALITY_PRESETS.Mid;
  const baseTrisPerPart = 150;
  return Math.round(baseTrisPerPart * q.triMult * partCount);
}

export function formatTris(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (n >= 1000)    return (n/1000).toFixed(0)+"K";
  return n.toString();
}

// React component — drop-in quality selector bar
// Usage: <PolyQualityBar quality={quality} onChange={setQuality}/>
import React from "react";
export function PolyQualityBar({ quality, onChange }) {
  const T={teal:"#00ffc8",orange:"#FF6600",bg:"#06060f",panel:"#0d0d1a",border:"#1a1a2e",muted:"#aaa",font:"JetBrains Mono,monospace"};
  const colors = { Low:"#556677", Mid:"#FF6600", High:"#00ffc8", Ultra:"#ff00ff" };
  return (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:10,color:T.muted,marginBottom:5,fontFamily:T.font}}>
        Poly Quality — {QUALITY_PRESETS[quality]?.desc}
      </div>
      <div style={{display:"flex",gap:4}}>
        {QUALITY_LEVELS.map(lv=>(
          <button
            key={lv}
            onClick={()=>onChange(lv)}
            style={{
              flex:1, padding:"4px 0", fontSize:10, fontFamily:T.font, fontWeight:700,
              cursor:"pointer", borderRadius:4, border:"1px solid "+(lv===quality?colors[lv]:T.border),
              background:lv===quality?colors[lv]:T.panel, color:lv===quality?"#06060f":T.muted,
            }}
          >{lv}</button>
        ))}
      </div>
      <div style={{fontSize:9,color:T.muted,marginTop:3,fontFamily:T.font}}>
        Est. {formatTris(estimateTris(quality))} tris/character
      </div>
    </div>
  );
}

export default Q;