import * as THREE from "three";

// ── GPU Particle system using InstancedMesh ───────────────────────────────────
export function createGPUParticleSystem(options = {}) {
  const {
    maxCount    = 50000,
    geometry    = new THREE.SphereGeometry(0.02, 4, 4),
    material    = new THREE.MeshStandardMaterial({ color:"#ffffff", roughness:0.8 }),
  } = options;

  const instanced = new THREE.InstancedMesh(geometry, material, maxCount);
  instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instanced.count = 0;
  instanced.name  = "GPUParticles";

  // Per-particle data arrays
  const positions  = new Float32Array(maxCount * 3);
  const velocities = new Float32Array(maxCount * 3);
  const lifetimes  = new Float32Array(maxCount);
  const maxLife    = new Float32Array(maxCount);
  const colors     = new Float32Array(maxCount * 3);
  const sizes      = new Float32Array(maxCount).fill(1);
  const active     = new Uint8Array(maxCount);

  return {
    instanced, maxCount,
    positions, velocities, lifetimes, maxLife, colors, sizes, active,
    activeCount: 0,
    emitRate:    options.emitRate   || 100,
    elapsed:     0,
    gravity:     options.gravity    || new THREE.Vector3(0, -0.1, 0),
    lifeRange:   options.lifeRange  || [0.5, 2.0],
    speedRange:  options.speedRange || [0.05, 0.2],
    sizeRange:   options.sizeRange  || [0.5, 1.5],
    color1:      new THREE.Color(options.color1 || "#ffffff"),
    color2:      new THREE.Color(options.color2 || "#888888"),
    spread:      options.spread     || 0.2,
    forceFields: [],
    freeList:    Array.from({length: maxCount}, (_,i) => maxCount-1-i),
  };
}

// ── Emit GPU particles ────────────────────────────────────────────────────────
export function emitGPUParticles(sys, position, count=1) {
  const dummy = new THREE.Object3D();
  for (let i=0; i<count; i++) {
    if (!sys.freeList.length) break;
    const idx = sys.freeList.pop();
    sys.active[idx] = 1;
    sys.activeCount++;

    // Position
    sys.positions[idx*3]   = position.x + (Math.random()-0.5)*sys.spread;
    sys.positions[idx*3+1] = position.y + (Math.random()-0.5)*sys.spread;
    sys.positions[idx*3+2] = position.z + (Math.random()-0.5)*sys.spread;

    // Velocity
    const spd = sys.speedRange[0] + Math.random()*(sys.speedRange[1]-sys.speedRange[0]);
    sys.velocities[idx*3]   = (Math.random()-0.5)*spd;
    sys.velocities[idx*3+1] = Math.random()*spd;
    sys.velocities[idx*3+2] = (Math.random()-0.5)*spd;

    // Life
    const life = sys.lifeRange[0] + Math.random()*(sys.lifeRange[1]-sys.lifeRange[0]);
    sys.lifetimes[idx] = life;
    sys.maxLife[idx]   = life;

    // Color
    sys.colors[idx*3]   = sys.color1.r;
    sys.colors[idx*3+1] = sys.color1.g;
    sys.colors[idx*3+2] = sys.color1.b;

    // Size
    sys.sizes[idx] = sys.sizeRange[0] + Math.random()*(sys.sizeRange[1]-sys.sizeRange[0]);

    // Update instance matrix
    dummy.position.set(sys.positions[idx*3], sys.positions[idx*3+1], sys.positions[idx*3+2]);
    const s = sys.sizes[idx];
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    sys.instanced.setMatrixAt(idx, dummy.matrix);
  }
  sys.instanced.instanceMatrix.needsUpdate = true;
}

// ── Step GPU particles ────────────────────────────────────────────────────────
export function stepGPUParticles(sys, dt=1/60) {
  const dummy  = new THREE.Object3D();
  const gx=sys.gravity.x, gy=sys.gravity.y, gz=sys.gravity.z;
  let   active = 0;

  for (let i=0; i<sys.maxCount; i++) {
    if (!sys.active[i]) continue;
    sys.lifetimes[i] -= dt;

    if (sys.lifetimes[i] <= 0) {
      sys.active[i] = 0;
      sys.freeList.push(i);
      sys.activeCount--;
      // Hide particle
      dummy.scale.set(0,0,0);
      dummy.updateMatrix();
      sys.instanced.setMatrixAt(i, dummy.matrix);
      continue;
    }

    // Apply gravity
    sys.velocities[i*3]   += gx*dt;
    sys.velocities[i*3+1] += gy*dt;
    sys.velocities[i*3+2] += gz*dt;

    // Apply force fields
    sys.forceFields.forEach(ff => applyForceField(sys, i, ff, dt));

    // Integrate
    sys.positions[i*3]   += sys.velocities[i*3]  *dt*60;
    sys.positions[i*3+1] += sys.velocities[i*3+1]*dt*60;
    sys.positions[i*3+2] += sys.velocities[i*3+2]*dt*60;

    // Floor
    if (sys.positions[i*3+1] < 0) {
      sys.positions[i*3+1] = 0;
      sys.velocities[i*3+1] *= -0.3;
    }

    // Life ratio for color lerp
    const t = 1 - sys.lifetimes[i]/sys.maxLife[i];
    sys.colors[i*3]   = sys.color1.r + (sys.color2.r-sys.color1.r)*t;
    sys.colors[i*3+1] = sys.color1.g + (sys.color2.g-sys.color1.g)*t;
    sys.colors[i*3+2] = sys.color1.b + (sys.color2.b-sys.color1.b)*t;

    // Update instance
    dummy.position.set(sys.positions[i*3], sys.positions[i*3+1], sys.positions[i*3+2]);
    const s = sys.sizes[i] * (1-t*0.5);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    sys.instanced.setMatrixAt(i, dummy.matrix);
    active++;
  }

  sys.instanced.instanceMatrix.needsUpdate = true;
  return active;
}

// ── Force fields ──────────────────────────────────────────────────────────────
export const FORCE_FIELD_TYPES = {
  vortex:    { label:"Vortex",    icon:"🌀" },
  attractor: { label:"Attractor", icon:"⬤" },
  repulsor:  { label:"Repulsor",  icon:"⊙" },
  turbulence:{ label:"Turbulence",icon:"≋" },
  wind:      { label:"Wind",      icon:"💨" },
  drag:      { label:"Drag",      icon:"⬇" },
};

export function createForceField(type, position, options = {}) {
  return {
    id:       crypto.randomUUID(),
    type,
    position: position.clone(),
    strength: options.strength || 1.0,
    radius:   options.radius   || 2.0,
    direction:options.direction|| new THREE.Vector3(0,1,0),
    enabled:  true,
  };
}

function applyForceField(sys, idx, ff, dt) {
  if (!ff.enabled) return;
  const px = sys.positions[idx*3]  -ff.position.x;
  const py = sys.positions[idx*3+1]-ff.position.y;
  const pz = sys.positions[idx*3+2]-ff.position.z;
  const dist = Math.sqrt(px*px+py*py+pz*pz);
  if (dist > ff.radius || dist < 0.001) return;
  const falloff = 1 - dist/ff.radius;
  const str = ff.strength * falloff * dt;

  switch (ff.type) {
    case "attractor":
      sys.velocities[idx*3]   -= px/dist*str;
      sys.velocities[idx*3+1] -= py/dist*str;
      sys.velocities[idx*3+2] -= pz/dist*str;
      break;
    case "repulsor":
      sys.velocities[idx*3]   += px/dist*str;
      sys.velocities[idx*3+1] += py/dist*str;
      sys.velocities[idx*3+2] += pz/dist*str;
      break;
    case "vortex":
      sys.velocities[idx*3]   += -pz/dist*str;
      sys.velocities[idx*3+2] +=  px/dist*str;
      break;
    case "turbulence":
      sys.velocities[idx*3]   += (Math.random()-0.5)*str;
      sys.velocities[idx*3+1] += (Math.random()-0.5)*str;
      sys.velocities[idx*3+2] += (Math.random()-0.5)*str;
      break;
    case "wind":
      sys.velocities[idx*3]   += ff.direction.x*str;
      sys.velocities[idx*3+1] += ff.direction.y*str;
      sys.velocities[idx*3+2] += ff.direction.z*str;
      break;
    case "drag":
      sys.velocities[idx*3]   *= 1-str*0.1;
      sys.velocities[idx*3+1] *= 1-str*0.1;
      sys.velocities[idx*3+2] *= 1-str*0.1;
      break;
  }
}

// ── Sprite sheet animation ────────────────────────────────────────────────────
export function createSpriteSheet(texture, cols=4, rows=4) {
  texture.repeat.set(1/cols, 1/rows);
  return { texture, cols, rows, fps: 12, currentFrame: 0 };
}

export function updateSpriteSheet(sheet, time) {
  const totalFrames = sheet.cols * sheet.rows;
  const frame = Math.floor(time * sheet.fps) % totalFrames;
  const col   = frame % sheet.cols;
  const row   = Math.floor(frame / sheet.cols);
  sheet.texture.offset.set(col/sheet.cols, row/sheet.rows);
  sheet.currentFrame = frame;
}

// ── Burst emitter ─────────────────────────────────────────────────────────────
export function burstEmit(sys, position, count=100) {
  emitGPUParticles(sys, position, count);
}

// ── Continuous emitter ────────────────────────────────────────────────────────
export function continuousEmit(sys, position, dt=1/60) {
  const toEmit = Math.floor(sys.emitRate * dt);
  if (toEmit > 0) emitGPUParticles(sys, position, toEmit);
}

// ── Get GPU particle stats ────────────────────────────────────────────────────
export function getGPUParticleStats(sys) {
  return {
    active:   sys.activeCount,
    max:      sys.maxCount,
    fields:   sys.forceFields.length,
    usage:    Math.round(sys.activeCount/sys.maxCount*100) + "%",
  };
}
