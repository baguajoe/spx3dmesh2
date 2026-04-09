import * as THREE from "three";

// ── Particle ──────────────────────────────────────────────────────────────────
export function createParticle(position, options = {}) {
  return {
    position:  position.clone(),
    velocity:  options.velocity  || new THREE.Vector3((Math.random()-0.5)*0.1, Math.random()*0.2, (Math.random()-0.5)*0.1),
    color:     options.color     || new THREE.Color(1,1,1),
    size:      options.size      || 0.05,
    life:      options.life      || 1.0,
    maxLife:   options.maxLife   || 1.0,
    opacity:   1.0,
    rotation:  Math.random()*Math.PI*2,
    rotSpeed:  (Math.random()-0.5)*2,
    frame:     0,
    active:    true,
  };
}

// ── Emitter types ─────────────────────────────────────────────────────────────
export const EMITTER_TYPES = {
  point:    { label:"Point",    icon:"·" },
  sphere:   { label:"Sphere",   icon:"○" },
  box:      { label:"Box",      icon:"□" },
  cone:     { label:"Cone",     icon:"△" },
  ring:     { label:"Ring",     icon:"◯" },
  mesh:     { label:"Mesh",     icon:"⬡" },
};

// ── VFX presets ───────────────────────────────────────────────────────────────
export const VFX_PRESETS = {
  fire:      { color1:"#ff4400", color2:"#ffaa00", size:0.08, life:0.8,  gravity:-0.3, spread:0.1,  count:200, label:"Fire" },
  smoke:     { color1:"#444444", color2:"#888888", size:0.2,  life:2.0,  gravity:-0.05,spread:0.15, count:100, label:"Smoke" },
  sparks:    { color1:"#ffff00", color2:"#ff8800", size:0.02, life:0.5,  gravity:0.3,  spread:0.3,  count:150, label:"Sparks" },
  explosion: { color1:"#ff6600", color2:"#ffff00", size:0.15, life:0.6,  gravity:0.1,  spread:0.8,  count:300, label:"Explosion" },
  magic:     { color1:"#00ffc8", color2:"#8844ff", size:0.06, life:1.2,  gravity:-0.1, spread:0.2,  count:120, label:"Magic" },
  rain:      { color1:"#aabbcc", color2:"#ddeeff", size:0.02, life:1.0,  gravity:1.5,  spread:0.05, count:500, label:"Rain" },
  snow:      { color1:"#ffffff", color2:"#ddeeff", size:0.04, life:3.0,  gravity:0.1,  spread:0.02, count:200, label:"Snow" },
  dust:      { color1:"#ccaa88", color2:"#ddbb99", size:0.05, life:2.5,  gravity:-0.02,spread:0.08, count:80,  label:"Dust" },
  portal:    { color1:"#00ffc8", color2:"#4488ff", size:0.05, life:1.5,  gravity:0.0,  spread:0.3,  count:150, label:"Portal" },
  confetti:  { color1:"#ff4488", color2:"#ffff00", size:0.06, life:3.0,  gravity:0.15, spread:0.5,  count:200, label:"Confetti" },
};

// ── Create emitter ────────────────────────────────────────────────────────────
export function createEmitter(options = {}) {
  const preset = VFX_PRESETS[options.preset] || {};
  return {
    id:           crypto.randomUUID(),
    name:         options.name      || "Emitter_" + Date.now(),
    type:         options.type      || "point",
    position:     options.position  || new THREE.Vector3(),
    rate:         options.rate      || 30,
    burst:        options.burst     || false,
    burstCount:   options.burstCount|| 50,
    maxParticles: options.maxParticles || 500,
    particles:    [],
    color1:       new THREE.Color(options.color1 || preset.color1 || "#ffffff"),
    color2:       new THREE.Color(options.color2 || preset.color2 || "#888888"),
    size:         options.size      || preset.size   || 0.05,
    life:         options.life      || preset.life   || 1.0,
    lifeVar:      options.lifeVar   || 0.3,
    gravity:      options.gravity   || preset.gravity|| 0.2,
    spread:       options.spread    || preset.spread || 0.2,
    speed:        options.speed     || 1.0,
    enabled:      true,
    elapsed:      0,
    spriteSheet:  null,
    frameCount:   1,
    trailEnabled: false,
    trailLength:  10,
    trails:       new Map(),
  };
}

// ── Emit particles ────────────────────────────────────────────────────────────
export function emitParticles(emitter, count) {
  for (let i=0; i<count; i++) {
    if (emitter.particles.length >= emitter.maxParticles) break;
    const life = emitter.life * (1 + (Math.random()-0.5)*emitter.lifeVar);
    const vel  = new THREE.Vector3(
      (Math.random()-0.5)*emitter.spread,
      Math.random()*emitter.speed,
      (Math.random()-0.5)*emitter.spread,
    );

    // Type-based spawn position
    let pos = emitter.position.clone();
    switch (emitter.type) {
      case "sphere": pos.addScaledVector(new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize(), Math.random()*0.5); break;
      case "box":    pos.add(new THREE.Vector3((Math.random()-0.5)*0.5,(Math.random()-0.5)*0.5,(Math.random()-0.5)*0.5)); break;
      case "cone":   { const a=Math.random()*Math.PI*2, r=Math.random()*0.3; pos.x+=Math.cos(a)*r; pos.z+=Math.sin(a)*r; } break;
      case "ring":   { const a=Math.random()*Math.PI*2; pos.x+=Math.cos(a)*0.5; pos.z+=Math.sin(a)*0.5; } break;
    }

    emitter.particles.push(createParticle(pos, { velocity:vel, life, maxLife:life,
      color: emitter.color1.clone(), size: emitter.size }));
  }
}

// ── Step emitter ──────────────────────────────────────────────────────────────
export function stepEmitter(emitter, dt=1/60) {
  if (!emitter.enabled) return;
  emitter.elapsed += dt;

  // Emit new particles
  const toEmit = emitter.burst ? emitter.burstCount : Math.floor(emitter.rate*dt);
  if (toEmit > 0) emitParticles(emitter, toEmit);
  if (emitter.burst) emitter.enabled = false;

  // Update particles
  const grav = new THREE.Vector3(0, -emitter.gravity*dt, 0);
  emitter.particles = emitter.particles.filter(p => {
    if (!p.active) return false;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; return false; }
    p.velocity.add(grav);
    p.position.addScaledVector(p.velocity, dt*60);
    p.opacity = p.life / p.maxLife;
    p.rotation += p.rotSpeed * dt;
    const t = 1 - p.life/p.maxLife;
    p.color.lerpColors(emitter.color1, emitter.color2, t);
    return true;
  });
}

// ── Build particle geometry ───────────────────────────────────────────────────
export function buildParticleGeometry(emitter) {
  const count     = emitter.particles.length;
  const positions = new Float32Array(count*3);
  const colors    = new Float32Array(count*3);
  const sizes     = new Float32Array(count);
  const opacities = new Float32Array(count);

  emitter.particles.forEach((p,i) => {
    positions[i*3]   = p.position.x;
    positions[i*3+1] = p.position.y;
    positions[i*3+2] = p.position.z;
    colors[i*3]   = p.color.r; colors[i*3+1] = p.color.g; colors[i*3+2] = p.color.b;
    sizes[i]     = p.size;
    opacities[i] = p.opacity;
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("size",     new THREE.BufferAttribute(sizes, 1));
  return geo;
}

// ── Build particle system mesh ────────────────────────────────────────────────
export function buildParticleSystem(emitter) {
  const geo = buildParticleGeometry(emitter);
  const mat = new THREE.PointsMaterial({
    size:         emitter.size,
    vertexColors: true,
    transparent:  true,
    opacity:      0.9,
    sizeAttenuation: true,
    depthWrite:   false,
    blending:     THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name  = emitter.name;
  return pts;
}

// ── Update particle system mesh ───────────────────────────────────────────────
export function updateParticleSystem(pts, emitter) {
  const geo = pts.geometry;
  const count = emitter.particles.length;
  if (count === 0) return;

  const positions = new Float32Array(count*3);
  const colors    = new Float32Array(count*3);
  const sizes     = new Float32Array(count);

  emitter.particles.forEach((p,i) => {
    positions[i*3]=p.position.x; positions[i*3+1]=p.position.y; positions[i*3+2]=p.position.z;
    colors[i*3]=p.color.r; colors[i*3+1]=p.color.g; colors[i*3+2]=p.color.b;
    sizes[i]=p.size*p.opacity;
  });

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("size",     new THREE.BufferAttribute(sizes, 1));
  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate    = true;
}

// ── Trail system ──────────────────────────────────────────────────────────────
export function updateTrails(emitter) {
  if (!emitter.trailEnabled) return null;
  const points = [];
  emitter.particles.slice(0, 20).forEach(p => {
    if (!emitter.trails.has(p)) emitter.trails.set(p, []);
    const trail = emitter.trails.get(p);
    trail.push(p.position.clone());
    if (trail.length > emitter.trailLength) trail.shift();
    trail.forEach(pt => points.push(pt.x, pt.y, pt.z));
  });
  if (!points.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(points), 3));
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: emitter.color1, transparent:true, opacity:0.5 }));
}

// ── Rigid body destruction ────────────────────────────────────────────────────
export function createDestructionEffect(mesh, scene, { pieces=16, force=2.0 } = {}) {
  const box    = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  const frags  = [];

  for (let i=0; i<pieces; i++) {
    const s = size.clone().multiplyScalar(0.3+Math.random()*0.4);
    const geo = new THREE.BoxGeometry(s.x, s.y, s.z);
    const mat = mesh.material.clone();
    const frag = new THREE.Mesh(geo, mat);
    frag.position.copy(center).add(new THREE.Vector3(
      (Math.random()-0.5)*size.x, (Math.random()-0.5)*size.y, (Math.random()-0.5)*size.z
    ));
    const vel = frag.position.clone().sub(center).normalize().multiplyScalar(force*(0.5+Math.random()));
    frag.userData.velocity  = vel;
    frag.userData.angVel    = new THREE.Vector3((Math.random()-0.5)*5,(Math.random()-0.5)*5,(Math.random()-0.5)*5);
    frag.userData.life      = 2.0;
    scene.add(frag);
    frags.push(frag);
  }
  scene.remove(mesh);
  return frags;
}

export function stepDestructionFrags(frags, dt=1/60) {
  return frags.filter(f => {
    f.userData.life -= dt;
    if (f.userData.life <= 0) return false;
    f.userData.velocity.y -= 9.8*dt*0.1;
    f.position.addScaledVector(f.userData.velocity, dt);
    f.rotation.x += f.userData.angVel.x*dt;
    f.rotation.y += f.userData.angVel.y*dt;
    f.rotation.z += f.userData.angVel.z*dt;
    if (f.position.y < 0) { f.position.y=0; f.userData.velocity.y*=-0.3; }
    f.material.opacity = Math.max(0, f.userData.life/2);
    f.material.transparent = true;
    return true;
  });
}

export function getEmitterStats(emitter) {
  return {
    particles: emitter.particles.length,
    max:       emitter.maxParticles,
    elapsed:   emitter.elapsed.toFixed(2),
    enabled:   emitter.enabled,
  };
}
