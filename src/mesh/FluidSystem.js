import * as THREE from "three";

// ── SPH particle ──────────────────────────────────────────────────────────────
export function createSPHParticle(position, options = {}) {
  return {
    position: position.clone(),
    velocity: options.velocity || new THREE.Vector3(),
    force:    new THREE.Vector3(),
    density:  0,
    pressure: 0,
    mass:     options.mass || 1.0,
    color:    options.color || new THREE.Color(0.2, 0.5, 1.0),
    life:     options.life  || 3.0,
    maxLife:  options.life  || 3.0,
  };
}

// ── Fluid settings ────────────────────────────────────────────────────────────
export function createFluidSettings(options = {}) {
  return {
    type:        options.type        || "water",
    gravity:     options.gravity     || -9.8,
    viscosity:   options.viscosity   || 0.1,
    restDensity: options.restDensity || 1000,
    stiffness:   options.stiffness   || 50,
    smoothRadius:options.smoothRadius|| 0.3,
    maxParticles:options.maxParticles|| 500,
    particles:   [],
    enabled:     false,
  };
}

// ── Fluid presets ─────────────────────────────────────────────────────────────
export const FLUID_PRESETS = {
  water:  { color:"#2255ff", viscosity:0.1,  gravity:-9.8,  label:"Water",  density:1000 },
  lava:   { color:"#ff4400", viscosity:2.0,  gravity:-9.8,  label:"Lava",   density:2500 },
  honey:  { color:"#ffaa00", viscosity:5.0,  gravity:-9.8,  label:"Honey",  density:1400 },
  smoke:  { color:"#888888", viscosity:0.01, gravity:-0.5,  label:"Smoke",  density:1.2  },
  blood:  { color:"#cc0000", viscosity:0.4,  gravity:-9.8,  label:"Blood",  density:1060 },
  slime:  { color:"#44ff44", viscosity:3.0,  gravity:-9.8,  label:"Slime",  density:1200 },
};

// ── SPH kernel ────────────────────────────────────────────────────────────────
function sphKernel(r, h) {
  if (r >= h) return 0;
  const x = 1 - r*r/(h*h);
  return (315/(64*Math.PI*Math.pow(h,3))) * x * x * x;
}

function sphKernelGrad(r, h) {
  if (r >= h || r === 0) return 0;
  const x = 1 - r/h;
  return -(45/(Math.PI*Math.pow(h,4))) * x * x;
}

// ── Step SPH simulation ───────────────────────────────────────────────────────
export function stepSPH(fluid, dt=1/60) {
  if (!fluid.enabled || !fluid.particles.length) return;
  const { particles, smoothRadius:h, restDensity, stiffness, viscosity, gravity } = fluid;

  // Compute density and pressure
  particles.forEach(pi => {
    pi.density = 0;
    particles.forEach(pj => {
      const r = pi.position.distanceTo(pj.position);
      pi.density += pj.mass * sphKernel(r, h);
    });
    pi.density  = Math.max(pi.density, restDensity*0.01);
    pi.pressure = stiffness * (pi.density - restDensity);
  });

  // Compute forces
  particles.forEach(pi => {
    pi.force.set(0, gravity*pi.mass*0.001, 0);
    particles.forEach(pj => {
      if (pi === pj) return;
      const diff = pj.position.clone().sub(pi.position);
      const r    = diff.length();
      if (r >= h || r === 0) return;
      const dir  = diff.normalize();
      const grad = sphKernelGrad(r, h);

      // Pressure force
      const pressureF = -(pi.pressure + pj.pressure)/(2*pj.density) * pj.mass * grad;
      pi.force.addScaledVector(dir, pressureF);

      // Viscosity force
      const relVel = pj.velocity.clone().sub(pi.velocity);
      const viscF  = viscosity * (pj.mass/pj.density) * grad;
      pi.force.addScaledVector(relVel, viscF);
    });
  });

  // Integrate
  particles.forEach(pi => {
    const acc = pi.force.clone().multiplyScalar(1/pi.mass);
    pi.velocity.addScaledVector(acc, dt);
    pi.velocity.multiplyScalar(0.99); // damping
    pi.position.addScaledVector(pi.velocity, dt);

    // Floor collision
    if (pi.position.y < 0) { pi.position.y=0; pi.velocity.y*=-0.3; }

    // Life
    pi.life -= dt;
    pi.color.g = Math.max(0, pi.life/pi.maxLife * 0.5);
  });

  // Remove dead particles
  fluid.particles = fluid.particles.filter(p => p.life > 0);
}

// ── Emit fluid particles ──────────────────────────────────────────────────────
export function emitFluid(fluid, position, count=10) {
  const preset = FLUID_PRESETS[fluid.type] || FLUID_PRESETS.water;
  for (let i=0; i<count; i++) {
    if (fluid.particles.length >= fluid.maxParticles) break;
    const vel = new THREE.Vector3(
      (Math.random()-0.5)*0.5, Math.random()*0.5, (Math.random()-0.5)*0.5
    );
    fluid.particles.push(createSPHParticle(
      position.clone().add(new THREE.Vector3((Math.random()-0.5)*0.1,(Math.random()-0.5)*0.1,(Math.random()-0.5)*0.1)),
      { velocity:vel, color: new THREE.Color(preset.color), life:3.0+Math.random()*2 }
    ));
  }
}

// ── Build fluid mesh ──────────────────────────────────────────────────────────
export function buildFluidMesh(fluid) {
  if (!fluid.particles.length) return null;
  const positions = new Float32Array(fluid.particles.length*3);
  const colors    = new Float32Array(fluid.particles.length*3);
  fluid.particles.forEach((p,i) => {
    positions[i*3]=p.position.x; positions[i*3+1]=p.position.y; positions[i*3+2]=p.position.z;
    colors[i*3]=p.color.r; colors[i*3+1]=p.color.g; colors[i*3+2]=p.color.b;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size:0.08, vertexColors:true, transparent:true, opacity:0.8,
    sizeAttenuation:true, depthWrite:false, blending:THREE.AdditiveBlending,
  }));
}

// ── Update fluid mesh ─────────────────────────────────────────────────────────
export function updateFluidMesh(pts, fluid) {
  if (!pts || !fluid.particles.length) return;
  const positions = new Float32Array(fluid.particles.length*3);
  const colors    = new Float32Array(fluid.particles.length*3);
  fluid.particles.forEach((p,i) => {
    positions[i*3]=p.position.x; positions[i*3+1]=p.position.y; positions[i*3+2]=p.position.z;
    colors[i*3]=p.color.r; colors[i*3+1]=p.color.g; colors[i*3+2]=p.color.b;
  });
  pts.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pts.geometry.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
  pts.geometry.attributes.position.needsUpdate = true;
}

// ── Pyro / fire simulation ────────────────────────────────────────────────────
export function createPyroEmitter(position, options = {}) {
  const emitter = createFluidSettings({ type:"smoke", maxParticles:300 });
  emitter.position = position.clone();
  emitter.temperature = options.temperature || 800;
  emitter.fuel        = options.fuel        || 1.0;
  emitter.enabled     = true;
  return emitter;
}

export function stepPyro(pyro, dt=1/60) {
  // Emit new fire particles
  if (pyro.enabled && pyro.fuel > 0 && pyro.particles.length < pyro.maxParticles) {
    const count = Math.floor(pyro.temperature/100);
    for (let i=0; i<count; i++) {
      const vel = new THREE.Vector3((Math.random()-0.5)*0.2, 0.3+Math.random()*0.5, (Math.random()-0.5)*0.2);
      const heat = pyro.temperature/1000;
      const col = new THREE.Color(heat, heat*0.3, 0);
      pyro.particles.push(createSPHParticle(
        pyro.position.clone().add(new THREE.Vector3((Math.random()-0.5)*0.1,0,(Math.random()-0.5)*0.1)),
        { velocity:vel, color:col, life:0.5+Math.random()*0.5, mass:0.1 }
      ));
    }
    pyro.fuel -= dt*0.1;
  }

  // Step particles
  pyro.particles.forEach(p => {
    p.life -= dt;
    p.velocity.y += 0.02;
    p.velocity.x += (Math.random()-0.5)*0.01;
    p.position.addScaledVector(p.velocity, dt*60);
    const t = 1 - p.life/p.maxLife;
    p.color.r = Math.max(0, 1-t*0.5);
    p.color.g = Math.max(0, 0.3-t*0.3);
    p.color.b = 0;
  });
  pyro.particles = pyro.particles.filter(p => p.life > 0);
}

export function getFluidStats(fluid) {
  return { particles: fluid.particles.length, max: fluid.maxParticles, type: fluid.type };
}
