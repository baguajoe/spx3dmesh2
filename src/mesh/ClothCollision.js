import * as THREE from "three";

// ── Sphere collider ───────────────────────────────────────────────────────────
export function createSphereCollider(center, radius) {
  return { type:"sphere", center:center.clone(), radius };
}

// ── Box collider ──────────────────────────────────────────────────────────────
export function createBoxCollider(min, max) {
  return { type:"box", min:min.clone(), max:max.clone() };
}

// ── Plane collider ────────────────────────────────────────────────────────────
export function createPlaneCollider(normal, constant=0) {
  return { type:"plane", normal:normal.clone().normalize(), constant };
}

// ── Resolve particle vs sphere ────────────────────────────────────────────────
export function resolveSphere(particle, collider) {
  const diff = particle.position.clone().sub(collider.center);
  const dist = diff.length();
  if (dist < collider.radius + 0.001) {
    particle.position.copy(collider.center).addScaledVector(diff.normalize(), collider.radius + 0.001);
    // Kill velocity toward collider
    const vel = particle.position.clone().sub(particle.prevPos);
    const dot  = vel.dot(diff.normalize());
    if (dot < 0) particle.prevPos.addScaledVector(diff.normalize(), -dot);
  }
}

// ── Resolve particle vs box ───────────────────────────────────────────────────
export function resolveBox(particle, collider) {
  const p = particle.position;
  if (p.x < collider.min.x || p.x > collider.max.x) return;
  if (p.y < collider.min.y || p.y > collider.max.y) return;
  if (p.z < collider.min.z || p.z > collider.max.z) return;
  // Push out on shortest axis
  const dx = Math.min(Math.abs(p.x-collider.min.x), Math.abs(p.x-collider.max.x));
  const dy = Math.min(Math.abs(p.y-collider.min.y), Math.abs(p.y-collider.max.y));
  const dz = Math.min(Math.abs(p.z-collider.min.z), Math.abs(p.z-collider.max.z));
  if (dx < dy && dx < dz) p.x = p.x < (collider.min.x+collider.max.x)/2 ? collider.min.x-0.001 : collider.max.x+0.001;
  else if (dy < dz) p.y = p.y < (collider.min.y+collider.max.y)/2 ? collider.min.y-0.001 : collider.max.y+0.001;
  else p.z = p.z < (collider.min.z+collider.max.z)/2 ? collider.min.z-0.001 : collider.max.z+0.001;
}

// ── Resolve particle vs plane ─────────────────────────────────────────────────
export function resolvePlane(particle, collider) {
  const dist = particle.position.dot(collider.normal) - collider.constant;
  if (dist < 0.001) {
    particle.position.addScaledVector(collider.normal, 0.001 - dist);
  }
}

// ── Apply all colliders to cloth ──────────────────────────────────────────────
export function applyCollisions(cloth, colliders) {
  cloth.particles.forEach(p => {
    if (p.pinned) return;
    colliders.forEach(col => {
      switch (col.type) {
        case "sphere": resolveSphere(p, col); break;
        case "box":    resolveBox(p, col); break;
        case "plane":  resolvePlane(p, col); break;
      }
    });
  });
}

// ── Self collision (simplified) ───────────────────────────────────────────────
export function applySelfCollision(cloth, minDist=0.01) {
  const particles = cloth.particles;
  for (let i=0; i<particles.length; i++) {
    for (let j=i+2; j<particles.length; j++) {
      const pa = particles[i], pb = particles[j];
      const diff = pb.position.clone().sub(pa.position);
      const dist = diff.length();
      if (dist < minDist && dist > 0) {
        const corr = diff.multiplyScalar((dist-minDist)/dist*0.5);
        if (!pa.pinned) pa.position.sub(corr);
        if (!pb.pinned) pb.position.add(corr);
      }
    }
  }
}

// ── Auto-colliders from mesh ──────────────────────────────────────────────────
export function createCollidersFromMesh(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  return [
    createSphereCollider(sphere.center, sphere.radius),
    createPlaneCollider(new THREE.Vector3(0,1,0), 0),
  ];
}

// ── Visualize colliders ───────────────────────────────────────────────────────
export function visualizeCollider(collider, scene) {
  let helper;
  if (collider.type === "sphere") {
    const geo = new THREE.SphereGeometry(collider.radius, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color:"#FF6600", wireframe:true, opacity:0.3, transparent:true });
    helper = new THREE.Mesh(geo, mat);
    helper.position.copy(collider.center);
  } else if (collider.type === "plane") {
    const geo = new THREE.PlaneGeometry(5,5);
    const mat = new THREE.MeshBasicMaterial({ color:"#4488ff", wireframe:true, opacity:0.3, transparent:true });
    helper = new THREE.Mesh(geo, mat);
    helper.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), collider.normal);
  }
  if (helper) { helper.name="ColliderHelper"; scene.add(helper); }
  return helper;
}
