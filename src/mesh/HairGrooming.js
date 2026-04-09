import * as THREE from "three";

export const GROOM_BRUSHES = {
  comb:   { label:"Comb",   icon:"⌇", description:"Push strands in direction" },
  smooth: { label:"Smooth", icon:"〰", description:"Smooth strand positions" },
  puff:   { label:"Puff",   icon:"☁", description:"Push strands outward" },
  cut:    { label:"Cut",    icon:"✂", description:"Shorten strands" },
  curl:   { label:"Curl",   icon:"🌀", description:"Add curl to strands" },
  lift:   { label:"Lift",   icon:"↑",  description:"Lift roots from surface" },
  twist:  { label:"Twist",  icon:"🌪", description:"Twist strands around axis" },
  noise:  { label:"Noise",  icon:"≋",  description:"Add random variation" },
};

function getAffected(strands, hitPoint, radius) {
  return strands.filter(s => s.root.distanceTo(hitPoint) < radius);
}

function getFalloff(dist, radius) {
  const t = dist/radius;
  return 1 - t*t; // smooth falloff
}

export function combGroom(strands, hitPoint, direction, { radius=0.3, strength=0.05 } = {}) {
  getAffected(strands, hitPoint, radius).forEach(s => {
    const f = getFalloff(s.root.distanceTo(hitPoint), radius) * strength;
    for (let i=1; i<s.points.length; i++) {
      const t = i/s.points.length;
      s.points[i].addScaledVector(direction, t*f);
    }
  });
}

export function smoothGroom(strands, hitPoint, { radius=0.3, strength=0.4 } = {}) {
  const affected = getAffected(strands, hitPoint, radius);
  affected.forEach(s => {
    for (let i=1; i<s.points.length-1; i++) {
      const prev=s.points[i-1], next=s.points[i+1];
      const mid=prev.clone().add(next).multiplyScalar(0.5);
      s.points[i].lerp(mid, strength);
    }
  });
}

export function puffGroom(strands, hitPoint, { radius=0.3, strength=0.05 } = {}) {
  getAffected(strands, hitPoint, radius).forEach(s => {
    const f = getFalloff(s.root.distanceTo(hitPoint), radius) * strength;
    for (let i=1; i<s.points.length; i++) {
      const t = i/s.points.length;
      s.points[i].addScaledVector(s.normal, t*f);
    }
  });
}

export function cutGroom(strands, hitPoint, cutLength, { radius=0.3 } = {}) {
  getAffected(strands, hitPoint, radius).forEach(s => {
    if (s.length <= cutLength) return;
    const ratio = cutLength / s.length;
    const newCount = Math.max(2, Math.round(s.points.length * ratio));
    s.points = s.points.slice(0, newCount);
    s.length = cutLength;
  });
}

export function curlGroom(strands, hitPoint, { radius=0.3, strength=0.1, frequency=2 } = {}) {
  getAffected(strands, hitPoint, radius).forEach(s => {
    const f = getFalloff(s.root.distanceTo(hitPoint), radius) * strength;
    const right = new THREE.Vector3(1,0,0);
    const up    = s.normal.clone().cross(right).normalize();
    for (let i=1; i<s.points.length; i++) {
      const t = i/s.points.length;
      const angle = t * Math.PI * 2 * frequency;
      s.points[i].addScaledVector(right, Math.cos(angle)*t*f);
      s.points[i].addScaledVector(up,    Math.sin(angle)*t*f);
    }
  });
}

export function liftGroom(strands, hitPoint, { radius=0.3, strength=0.05 } = {}) {
  getAffected(strands, hitPoint, radius).forEach(s => {
    const f = getFalloff(s.root.distanceTo(hitPoint), radius) * strength;
    s.points.forEach((p,i) => { if (i>0) p.y += f * (i/s.points.length); });
  });
}

export function twistGroom(strands, hitPoint, { radius=0.3, strength=0.1 } = {}) {
  getAffected(strands, hitPoint, radius).forEach(s => {
    const f = getFalloff(s.root.distanceTo(hitPoint), radius) * strength;
    const axis = s.normal.clone().normalize();
    for (let i=1; i<s.points.length; i++) {
      const t = i/s.points.length;
      const quat = new THREE.Quaternion().setFromAxisAngle(axis, f*t);
      const rel = s.points[i].clone().sub(s.root);
      rel.applyQuaternion(quat);
      s.points[i] = s.root.clone().add(rel);
    }
  });
}

export function noiseGroom(strands, hitPoint, { radius=0.3, strength=0.02 } = {}) {
  getAffected(strands, hitPoint, radius).forEach(s => {
    const f = getFalloff(s.root.distanceTo(hitPoint), radius) * strength;
    for (let i=1; i<s.points.length; i++) {
      s.points[i].add(new THREE.Vector3(
        (Math.random()-0.5)*f, (Math.random()-0.5)*f, (Math.random()-0.5)*f
      ));
    }
  });
}

export function applyGroomBrush(brush, strands, hitPoint, direction, options = {}) {
  switch (brush) {
    case "comb":   combGroom(strands, hitPoint, direction, options); break;
    case "smooth": smoothGroom(strands, hitPoint, options); break;
    case "puff":   puffGroom(strands, hitPoint, options); break;
    case "cut":    cutGroom(strands, hitPoint, options.cutLength||0.15, options); break;
    case "curl":   curlGroom(strands, hitPoint, options); break;
    case "lift":   liftGroom(strands, hitPoint, options); break;
    case "twist":  twistGroom(strands, hitPoint, options); break;
    case "noise":  noiseGroom(strands, hitPoint, options); break;
  }
}
