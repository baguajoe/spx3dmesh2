
export const STYLE_PRESETS = {
  "Flat Orthographic":   { desc:"Direct 1:1 projection. Clean base.", headScale:1.0, limbScale:1.0, snapDeg:0, combinable:true },
  "Side Scroller":       { desc:"Locked side view. Platformer.", headScale:1.0, limbScale:1.2, snapDeg:0, combinable:true },
  "Isometric Pixel":     { desc:"2:1 iso angle. Classic pixel RPG.", headScale:1.0, limbScale:1.0, snapDeg:45, pixelGrid:4, combinable:true },
  "Classic Cartoon":     { desc:"Rubberhose limbs. Disney/Fleischer.", headScale:1.3, limbScale:1.1, snapDeg:0, combinable:true },
  "Chibi SD":            { desc:"2-head body ratio. Super-deformed.", headScale:1.8, limbScale:0.55, snapDeg:0, combinable:true },
  "Anime Standard":      { desc:"Long legs, narrow waist. Shonen.", headScale:0.85, limbScale:1.25, snapDeg:0, combinable:true },
  "Anime Action":        { desc:"Dynamic. Naruto/DBZ energy.", headScale:0.9, limbScale:1.3, snapDeg:0, combinable:true },
  "Anime Slice of Life": { desc:"Soft rounded. K-On casual.", headScale:0.95, limbScale:1.1, snapDeg:0, combinable:true },
  "Anime Mecha":         { desc:"Rigid angular. Gundam/Eva.", headScale:0.8, limbScale:1.0, snapDeg:15, combinable:false },
  "Marvel What If":      { desc:"Bold ink, flat fills, dramatic angles. Spider-Verse adjacent.", headScale:1.05, limbScale:1.15, snapDeg:5, inkOutline:true, flatColor:true, halftone:true, combinable:true },
  "Western Comic":       { desc:"Classic DC/Marvel print superhero.", headScale:0.9, limbScale:1.1, snapDeg:0, inkOutline:true, combinable:true },
  "Manga B&W":           { desc:"High contrast. Speed lines. Screen tone.", headScale:0.88, limbScale:1.2, snapDeg:0, grayscale:true, inkOutline:true, speedLines:true, combinable:true },
  "Manga Color":         { desc:"Shonen Jump color style. Bold flats.", headScale:0.88, limbScale:1.2, snapDeg:0, inkOutline:true, combinable:true },
  "Webtoon":             { desc:"Korean manhwa. Vertical scroll clean.", headScale:0.92, limbScale:1.15, snapDeg:0, combinable:true },
  "90s Saturday Morning":{ desc:"Thick outlines, limited palette. TMNT/Gargoyles era.", headScale:1.1, limbScale:1.05, snapDeg:0, inkOutline:true, limitedPalette:true, combinable:true },
  "90s Anime":           { desc:"Off-model frames, lens flare, film grain. Evangelion/Cowboy Bebop.", headScale:0.88, limbScale:1.2, snapDeg:0, filmGrain:true, lensFlare:true, combinable:true },
  "Studio Ghibli":       { desc:"Soft weight. Spirited Away feel.", headScale:1.05, limbScale:0.95, snapDeg:0, combinable:true },
  "Pixar Style":         { desc:"Exaggerated squash/stretch.", headScale:1.2, limbScale:1.05, snapDeg:0, combinable:true },
  "Spider-Verse":        { desc:"Halftone, offset frames, pop art.", headScale:1.0, limbScale:1.0, snapDeg:0, halftone:true, frameSkip:3, inkOutline:true, combinable:true },
  "Arcane Painterly":    { desc:"Textured paint. Arcane Netflix.", headScale:0.95, limbScale:1.05, snapDeg:0, painterly:true, combinable:true },
  "8-Bit Pixel":         { desc:"NES era. 8px snap grid.", headScale:1.0, limbScale:1.0, snapDeg:45, pixelGrid:8, combinable:false },
  "16-Bit Pixel":        { desc:"SNES era. 4px snap.", headScale:1.0, limbScale:1.0, snapDeg:22.5, pixelGrid:4, combinable:false },
  "Shadow Puppet":       { desc:"Single-axis silhouette. Wayang.", headScale:1.0, limbScale:1.0, snapDeg:0, silhouette:true, combinable:false },
  "Paper Cutout":        { desc:"Discrete segments. Terry Gilliam.", headScale:1.0, limbScale:1.0, snapDeg:0, cutout:true, combinable:true },
  "Noir Cinematic":      { desc:"High contrast shadow. 1940s noir.", headScale:1.0, limbScale:1.0, snapDeg:0, grayscale:true, highContrast:true, combinable:true },
  "Synthwave Retro":     { desc:"Neon glow outlines. 80s aesthetic.", headScale:1.0, limbScale:1.0, snapDeg:0, neonGlow:true, combinable:true },
  "Rotoscope Realism":   { desc:"Traced from live action. Heavy detail.", headScale:1.0, limbScale:1.0, snapDeg:0, combinable:true },
  "Storyboard Draft":    { desc:"Rough sketch thumbnail format.", headScale:1.0, limbScale:1.0, snapDeg:0, sketch:true, combinable:true },
  "Ukiyo-e Woodblock":   { desc:"Japanese woodblock print. Bold flat areas, texture lines.", headScale:1.0, limbScale:1.0, snapDeg:0, inkOutline:true, limitedPalette:true, combinable:true },
  "Art Deco":            { desc:"Geometric elegance. 1920s glamour.", headScale:1.0, limbScale:1.0, snapDeg:15, combinable:true },

// ── NEW STYLES v2 ──────────────────────────────────────

  "Fleischer Rubber Hose": {
    desc: "1930s pre-Disney. Rubbery limbs, no joints, bouncy everything. Steamboat Willie energy.",
    headScale: 1.4, limbScale: 1.0, snapDeg: 0, combinable: true,
    rubberLimbs: true, bouncyHead: true, inkOutline: true, limitedPalette: true,
    bgStyle: "cream", outlineWeight: 3,
    notes: "Limbs have no elbows/knees — pure curves. Head bobs on every beat.",
  },

  "UPA Flat 50s": {
    desc: "1950s limited animation. Mr. Magoo, Gerald McBoing Boing. Geometric shapes, pastel fills, minimal motion.",
    headScale: 0.9, limbScale: 0.85, snapDeg: 0, combinable: true,
    flatColor: true, limitedPalette: true, inkOutline: true, geometricShapes: true,
    bgStyle: "pastel", outlineWeight: 2,
    notes: "Hold poses longer. Only animate what must move. Color blocks over detail.",
  },

  "Soviet Soyuzmultfilm": {
    desc: "USSR animation 1950-80s. Cheburashka, Hedgehog in the Fog. Painterly, melancholic, textured backgrounds.",
    headScale: 1.05, limbScale: 0.95, snapDeg: 0, combinable: true,
    painterly: true, filmGrain: true, softEdges: true,
    bgStyle: "painterly_dark", outlineWeight: 1.5,
    notes: "Slow deliberate movement. Watercolor texture overlay. Muted palette with occasional vivid accent.",
  },

  "Moebius / Heavy Metal": {
    desc: "Jean Giraud / Heavy Metal magazine. Ultra-fine linework, epic sci-fi scale, chrome and desert palettes.",
    headScale: 0.88, limbScale: 1.1, snapDeg: 0, combinable: true,
    inkOutline: true, crosshatch: true, detailLines: true,
    bgStyle: "stark", outlineWeight: 1,
    notes: "Thin precise lines. Vast empty space. Characters small against enormous environments.",
  },

  "CalArts / Adventure Time": {
    desc: "Adventure Time, Gravity Falls, Steven Universe. Wobbly lines, thick outlines, expressive squash/stretch.",
    headScale: 1.15, limbScale: 1.0, snapDeg: 0, combinable: true,
    inkOutline: true, wobbleLines: true, squashStretch: true,
    bgStyle: "bright_flat", outlineWeight: 2.5,
    notes: "Lines slightly wobbly — not perfect circles. Bold outlines. Oversized eyes.",
  },

  "Ralph Bakshi Adult": {
    desc: "Fritz the Cat, Wizards. Rotoscoped grit, exaggerated ugly-beautiful, raw energy.",
    headScale: 1.0, limbScale: 1.05, snapDeg: 0, combinable: false,
    filmGrain: true, highContrast: true, inkOutline: true, roughLines: true,
    bgStyle: "gritty", outlineWeight: 2,
    notes: "Rotoscope over live action. Deliberately imperfect. High contrast shadows.",
  },

  "Rankin Bass Stop Motion": {
    desc: "Rudolph the Red-Nosed Reindeer, The Hobbit. Puppet-like stiff movement, felt texture, holiday warmth.",
    headScale: 1.1, limbScale: 0.9, snapDeg: 22.5, combinable: false,
    limitedPalette: true, feltTexture: true, snapMovement: true,
    bgStyle: "warm_flat", outlineWeight: 1.5,
    notes: "Movement snaps between poses — no tweening. 12fps maximum. Puppet proportions.",
  },

  "Adult Swim Surreal": {
    desc: "Tim and Eric, Rick and Morty early, Too Many Cooks. Lo-fi absurdist, VHS aesthetic, off-model.",
    headScale: 1.05, limbScale: 1.0, snapDeg: 0, combinable: true,
    filmGrain: true, vhsDistort: true, offModel: true, limitedPalette: false,
    bgStyle: "vhs_static", outlineWeight: 2,
    notes: "Deliberately wrong proportions. VHS color bleed. Random frame holds.",
  },

  "Wayang Kulit Shadow": {
    desc: "Indonesian shadow puppet. Intricate silhouette cutouts, highly stylized profile view, batik patterns.",
    headScale: 1.0, limbScale: 1.0, snapDeg: 15, combinable: false,
    silhouette: true, cutout: true, profileOnly: true, ornateDetail: true,
    bgStyle: "amber_backlit", outlineWeight: 0,
    notes: "Pure profile. Silhouette only. Intricate internal cutout patterns visible when backlit.",
  },

  "South Park Cutout": {
    desc: "Deliberately crude construction paper look. Minimal frames, static limbs, mouth-only animation.",
    headScale: 1.2, limbScale: 0.8, snapDeg: 45, combinable: false,
    cutout: true, limitedPalette: true, staticLimbs: true, snapMovement: true,
    pixelGrid: 0, frameSkip: 6,
    bgStyle: "flat_bright", outlineWeight: 1,
    notes: "Maximum 8fps. Limbs barely move. Only mouth and eyes animate. Intentionally cheap.",
  },
};

export const STYLE_NAMES = Object.keys(STYLE_PRESETS);

export const COMBINABLE_PAIRS = [
  ["Marvel What If", "Spider-Verse"],
  ["Manga B&W", "Anime Action"],
  ["Manga Color", "Anime Standard"],
  ["90s Saturday Morning", "Classic Cartoon"],
  ["90s Anime", "Anime Action"],
  ["Western Comic", "Noir Cinematic"],
  ["Synthwave Retro", "Anime Mecha"],
  ["Arcane Painterly", "Western Comic"],
  ["Webtoon", "Anime Slice of Life"],
  ["Studio Ghibli", "Anime Slice of Life"],
  ["Flat Orthographic", "Spider-Verse"],
  ["Paper Cutout", "Ukiyo-e Woodblock"],
];

export function applyStyleTransform(kf, styleName, time=0) {
  const style = STYLE_PRESETS[styleName
  ["Fleischer Rubber Hose", "Classic Cartoon"],
  ["Fleischer Rubber Hose", "90s Saturday Morning"],
  ["UPA Flat 50s", "CalArts / Adventure Time"],
  ["UPA Flat 50s", "Webtoon"],
  ["Moebius / Heavy Metal", "Western Comic"],
  ["Moebius / Heavy Metal", "Noir Cinematic"],
  ["CalArts / Adventure Time", "Studio Ghibli"],
  ["CalArts / Adventure Time", "Spider-Verse"],
  ["Soviet Soyuzmultfilm", "Studio Ghibli"],
  ["Adult Swim Surreal", "Underground Indie"],
  ["Ralph Bakshi Adult", "Rotoscope Realism"],
];
  if (!style) return kf;
  const out = {};
  const snap = (v, g) => g > 0 ? Math.round(v/g)*g : v;
  Object.entries(kf).forEach(([b, v]) => {
    let x = v.x, y = v.y, rot = v.rotation || 0, sc = v.scale || 1;
    const isHead = b==="head"||b==="neck";
    const isLeg  = b.includes("thigh")||b.includes("shin")||b.includes("foot");
    const isArm  = b.includes("arm")||b.includes("hand")||b.includes("shoulder");
    // head/limb scale
    if (isHead) sc *= style.headScale || 1;
    if (isLeg)  sc *= style.limbScale || 1;
    if (isArm)  sc *= (style.limbScale || 1) * 0.9;
    // snap
    if (style.snapDeg) rot = snap(rot, style.snapDeg);
    if (style.pixelGrid) { x = snap(x, style.pixelGrid); y = snap(y, style.pixelGrid); }
    // style specifics
    if (styleName === "Side Scroller")    { x = x*0.5+160; rot *= 1.4; }
    if (styleName === "Isometric Pixel")  { x = x*Math.cos(Math.PI/6); y = y*0.5+x*0.289; }
    if (styleName === "Classic Cartoon")  { y += b==="hips"?Math.abs(Math.sin(time*Math.PI*2))*8:0; rot*=1.1; }
    if (styleName === "Chibi SD")         { if(isLeg) y*=0.55; }
    if (styleName === "Anime Action")     { x+=Math.sin(time*30)*0.3; rot*=1.3; }
    if (styleName === "Anime Standard")   { if(isLeg) y*=1.25; rot*=0.9; }
    if (styleName === "Marvel What If")   { rot=snap(rot,5); if(isArm)sc*=1.1; }
    if (styleName === "Spider-Verse")     { if(Math.floor(time*12)%3===0){x+=2;y+=1;} }
    if (styleName === "90s Anime")        { x+=Math.sin(time*20)*1.5; }
    if (styleName === "Studio Ghibli")    { y+=b==="chest"||b==="spine"?Math.sin(time*1.5)*1.5:0; rot*=0.8; }
    if (styleName === "Pixar Style")      { const sq=1+Math.sin(time*6)*0.04; sc*=sq; }
    if (styleName === "Manga B&W" || styleName === "Manga Color") { if(isLeg)sc*=1.1; }
    if (styleName === "Shadow Puppet")    { x=320; }
    if (styleName === "90s Saturday Morning") { rot=snap(rot,3); }
    out[b] = { x, y, rotation: rot, scale: sc };
  });
  return out;
}

export function blendStyles(kfA, kfB, alpha=0.5) {
  const out = {};
  const bones = new Set([...Object.keys(kfA), ...Object.keys(kfB)]);
  bones.forEach(b => {
    const a = kfA[b] || { x:320, y:240, rotation:0, scale:1 };
    const bv = kfB[b] || { x:320, y:240, rotation:0, scale:1 };
    out[b] = {
      x:        a.x        + (bv.x        - a.x)        * alpha,
      y:        a.y        + (bv.y        - a.y)        * alpha,
      rotation: a.rotation + (bv.rotation - a.rotation) * alpha,
      scale:    a.scale    + (bv.scale    - a.scale)    * alpha,
    };
  });
  return out;
}

export default STYLE_PRESETS;
