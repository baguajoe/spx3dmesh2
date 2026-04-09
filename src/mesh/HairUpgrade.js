import * as THREE from "three";

// ── Spatial hash for strand collision ────────────────────────────────────────
function hashPos(x,y,z,cs) {
  return Math.floor(x/cs)*73856093 ^ Math.floor(y/cs)*19349663 ^ Math.floor(z/cs)*83492791;
}

export function applyStrandCollision(strands, cellSize=0.05, minDist=0.03) {
  const cells = new Map();
  strands.forEach((s,si) => {
    s.points.forEach((p,pi) => {
      const key = hashPos(p.x,p.y,p.z,cellSize);
      if (!cells.has(key)) cells.set(key,[]);
      cells.get(key).push({si,pi,p});
    });
  });

  cells.forEach(pts => {
    for (let i=0; i<pts.length; i++) for (let j=i+1; j<pts.length; j++) {
      if (pts[i].si === pts[j].si) continue; // same strand
      const diff = pts[j].p.clone().sub(pts[i].p);
      const dist = diff.length();
      if (dist < minDist && dist > 0.001) {
        const corr = diff.multiplyScalar((dist-minDist)/dist*0.5);
        if (pts[i].pi > 0) strands[pts[i].si].points[pts[i].pi].sub(corr);
        if (pts[j].pi > 0) strands[pts[j].si].points[pts[j].pi].add(corr);
      }
    }
  });
}

// ── Density map from texture ──────────────────────────────────────────────────
export function createDensityMap(width=256, height=256, pattern="full") {
  const canvas = document.createElement("canvas");
  canvas.width=width; canvas.height=height;
  const ctx    = canvas.getContext("2d");

  switch (pattern) {
    case "full":
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0,0,width,height);
      break;
    case "gradient":
      const grad = ctx.createLinearGradient(0,0,width,0);
      grad.addColorStop(0,"#ffffff");
      grad.addColorStop(1,"#000000");
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,width,height);
      break;
    case "center":
      const g2 = ctx.createRadialGradient(width/2,height/2,0,width/2,height/2,width/2);
      g2.addColorStop(0,"#ffffff");
      g2.addColorStop(1,"#000000");
      ctx.fillStyle = g2;
      ctx.fillRect(0,0,width,height);
      break;
    case "parting":
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0,0,width,height);
      ctx.fillStyle = "#000000";
      ctx.fillRect(width/2-3,0,6,height);
      break;
    case "thinning":
      // Thin at tips
      for (let y=0; y<height; y++) {
        const v = 1 - y/height;
        ctx.fillStyle = `rgb(${Math.round(v*255)},${Math.round(v*255)},${Math.round(v*255)})`;
        ctx.fillRect(0,y,width,1);
      }
      break;
  }

  return { canvas, ctx, width, height };
}

export function sampleDensityMap(dm, u, v) {
  const x   = Math.floor(u*(dm.width-1));
  const y   = Math.floor(v*(dm.height-1));
  const img = dm.ctx.getImageData(x,y,1,1);
  return img.data[0]/255;
}

// ── Braid preset ──────────────────────────────────────────────────────────────
export function generateBraidPreset(rootPosition, normal, options = {}) {
  const {
    length    = 0.4,
    segments  = 16,
    strands   = 3,
    radius    = 0.03,
    twist     = 4,
  } = options;

  const braidStrands = [];
  for (let s=0; s<strands; s++) {
    const phase   = (s/strands)*Math.PI*2;
    const points  = [];
    for (let i=0; i<=segments; i++) {
      const t   = i/segments;
      const y   = t*length;
      const ang = t*twist*Math.PI*2 + phase;
      const r   = radius*(1-t*0.3);
      const x   = Math.cos(ang)*r;
      const z   = Math.sin(ang)*r;
      const pt  = rootPosition.clone().add(new THREE.Vector3(x,y,z));
      points.push(pt);
    }
    braidStrands.push({
      id: crypto.randomUUID(),
      points,
      restPoints: points.map(p=>p.clone()),
      root: rootPosition.clone(),
      normal: normal.clone(),
      length, segments,
      velocity: points.map(()=>new THREE.Vector3()),
      selected:false, groupId:"braid", clump:0.8,
    });
  }
  return braidStrands;
}

// ── Bun preset ───────────────────────────────────────────────────────────────
export function generateBunPreset(rootPosition, normal, options = {}) {
  const { radius=0.1, strands=20, length=0.15 } = options;
  const bunStrands = [];
  for (let s=0; s<strands; s++) {
    const ang  = (s/strands)*Math.PI*2;
    const r    = radius*(0.3+Math.random()*0.7);
    const tip  = rootPosition.clone().add(new THREE.Vector3(
      Math.cos(ang)*r, length*0.3, Math.sin(ang)*r
    ));
    const pts  = [rootPosition.clone(), tip];
    bunStrands.push({
      id: crypto.randomUUID(),
      points: pts,
      restPoints: pts.map(p=>p.clone()),
      root: rootPosition.clone(),
      normal: normal.clone(),
      length, segments: 1,
      velocity: pts.map(()=>new THREE.Vector3()),
      selected:false, groupId:"bun", clump:0.9,
    });
  }
  return bunStrands;
}

// ── Ponytail preset ───────────────────────────────────────────────────────────
export function generatePonytailPreset(rootPosition, normal, options = {}) {
  const { length=0.4, strands=30, spread=0.04, segments=8 } = options;
  const dir = normal.clone().negate();
  return Array.from({length:strands}, (_,s) => {
    const pts = [rootPosition.clone()];
    const off = new THREE.Vector3((Math.random()-0.5)*spread,(Math.random()-0.5)*spread,(Math.random()-0.5)*spread);
    const d   = dir.clone().add(off).normalize();
    const segLen = length/segments;
    for (let i=1; i<=segments; i++) {
      const prev = pts[i-1].clone();
      pts.push(prev.addScaledVector(d, segLen).add(new THREE.Vector3(0,-i*0.004,0)));
    }
    return {
      id: crypto.randomUUID(), points:pts, restPoints:pts.map(p=>p.clone()),
      root:rootPosition.clone(), normal:normal.clone(), length, segments,
      velocity:pts.map(()=>new THREE.Vector3()), selected:false, groupId:"ponytail", clump:0.7,
    };
  });
}

// ── Scalp UV root placement ───────────────────────────────────────────────────
export function emitHairFromUV(mesh, densityMap, options = {}) {
  const { length=0.3, segments=8, stiffness=0.8 } = options;
  const geo  = mesh.geometry;
  const pos  = geo.attributes.position;
  const nor  = geo.attributes.normal;
  const uv   = geo.attributes.uv;
  const idx  = geo.index;
  if (!pos || !nor || !uv || !idx) return [];

  const strands = [];
  const arr = idx.array;
  const mat = mesh.matrixWorld;
  const nm  = new THREE.Matrix3().getNormalMatrix(mat);

  for (let i=0; i<arr.length; i+=3) {
    const [a,b,c] = [arr[i],arr[i+1],arr[i+2]];
    let u = Math.random(), v = Math.random();
    if (u+v>1) { u=1-u; v=1-v; }
    const w = 1-u-v;

    const su = uv.getX(a)*u+uv.getX(b)*v+uv.getX(c)*w;
    const sv = uv.getY(a)*u+uv.getY(b)*v+uv.getY(c)*w;
    const density = densityMap ? sampleDensityMap(densityMap, su, sv) : 1;
    if (Math.random() > density) continue;

    const rp = new THREE.Vector3(
      pos.getX(a)*u+pos.getX(b)*v+pos.getX(c)*w,
      pos.getY(a)*u+pos.getY(b)*v+pos.getY(c)*w,
      pos.getZ(a)*u+pos.getZ(b)*v+pos.getZ(c)*w,
    ).applyMatrix4(mat);

    const rn = new THREE.Vector3(
      nor.getX(a)*u+nor.getX(b)*v+nor.getX(c)*w,
      nor.getY(a)*u+nor.getY(b)*v+nor.getY(c)*w,
      nor.getZ(a)*u+nor.getZ(b)*v+nor.getZ(c)*w,
    ).applyMatrix3(nm).normalize();

    const strandLen = length*(0.8+Math.random()*0.4);
    const pts = [rp.clone()];
    const dir = rn.clone(); dir.y-=0.1; dir.normalize();
    const segLen = strandLen/segments;
    for (let s=1; s<=segments; s++) {
      pts.push(pts[s-1].clone().addScaledVector(dir,segLen).add(new THREE.Vector3(
        (Math.random()-0.5)*0.005,(Math.random()-0.5)*0.003,(Math.random()-0.5)*0.005
      )));
    }
    strands.push({
      id:crypto.randomUUID(), points:pts, restPoints:pts.map(p=>p.clone()),
      root:rp, normal:rn, length:strandLen, segments, stiffness,
      velocity:pts.map(()=>new THREE.Vector3()), selected:false, groupId:null, clump:0,
      uv:{u:su,v:sv},
    });
  }
  return strands;
}

export function getHairUpgradeStats(strands) {
  const groups = {};
  strands.forEach(s => { const g=s.groupId||"free"; groups[g]=(groups[g]||0)+1; });
  return { total:strands.length, groups };
}
