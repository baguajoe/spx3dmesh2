import * as THREE from "three";

// ── Alpha brush — uses image as displacement stamp ────────────────────────────

// ── Load alpha from image URL or File ────────────────────────────────────────
export async function loadAlpha(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas  = document.createElement("canvas");
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx     = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data    = ctx.getImageData(0, 0, img.width, img.height);
      resolve({ data: data.data, width: img.width, height: img.height, name: source.name || "alpha" });
    };
    img.onerror = reject;
    if (source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else {
      img.src = source;
    }
  });
}

// ── Sample alpha at UV position ───────────────────────────────────────────────
export function sampleAlpha(alpha, u, v) {
  const x   = Math.floor(u * (alpha.width  - 1));
  const y   = Math.floor(v * (alpha.height - 1));
  const idx = (y * alpha.width + x) * 4;
  return alpha.data[idx] / 255; // use red channel as grayscale
}

// ── Apply alpha brush stamp to mesh ──────────────────────────────────────────
export function applyAlphaBrush(mesh, hit, alpha, {
  radius   = 0.5,
  strength = 0.05,
  tiling   = 1.0,
  rotation = 0,
  invert   = false,
} = {}) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const inv = mesh.matrixWorld.clone().invert();
  const localHit = hit.point.clone().applyMatrix4(inv);
  const tmp = new THREE.Vector3();
  const dir = invert ? -1 : 1;

  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i);
    const dx = tmp.x - localHit.x;
    const dz = tmp.z - localHit.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist >= radius) continue;

    // Project to UV within brush radius
    const angle = Math.atan2(dz, dx) + rotation;
    const r     = dist / radius;
    const u     = ((Math.cos(angle) * r * 0.5 + 0.5) * tiling) % 1;
    const v     = ((Math.sin(angle) * r * 0.5 + 0.5) * tiling) % 1;

    const alphaVal = sampleAlpha(alpha, Math.abs(u), Math.abs(v));
    const falloff  = 1 - r * r;
    const n        = new THREE.Vector3(
      geo.attributes.normal?.getX(i) || 0,
      geo.attributes.normal?.getY(i) || 1,
      geo.attributes.normal?.getZ(i) || 0,
    ).normalize();

    const f = alphaVal * falloff * strength * dir;
    pos.setXYZ(i, pos.getX(i) + n.x*f, pos.getY(i) + n.y*f, pos.getZ(i) + n.z*f);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ── Built-in procedural alphas ─────────────────────────────────────────────────
export function generateProceduralAlpha(type = "circle", size = 64) {
  const data   = new Uint8Array(size * size * 4);
  const center = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx  = (x - center) / center;
      const dy  = (y - center) / center;
      const r   = Math.sqrt(dx*dx + dy*dy);
      let   val = 0;

      switch (type) {
        case "circle":   val = Math.max(0, 1 - r); break;
        case "square":   val = Math.max(0, 1 - Math.max(Math.abs(dx), Math.abs(dy))); break;
        case "star": {
          const angle = Math.atan2(dy, dx);
          const spike = Math.abs(Math.cos(angle * 5));
          val = Math.max(0, 1 - r * (1 + spike * 0.5));
          break;
        }
        case "noise":    val = Math.random(); break;
        case "stripes":  val = Math.abs(Math.sin(x / size * Math.PI * 8)); break;
        case "diamond":  val = Math.max(0, 1 - (Math.abs(dx) + Math.abs(dy))); break;
      }

      const i    = (y * size + x) * 4;
      const byte = Math.floor(val * 255);
      data[i] = data[i+1] = data[i+2] = byte;
      data[i+3] = 255;
    }
  }

  return { data, width: size, height: size, name: type };
}
