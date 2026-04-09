// ── Worker thread bridge ──────────────────────────────────────────────────────
// Offloads heavy compute (cloth, SPH, marching cubes) to Web Workers

// ── Worker code strings (inlined for single-file build) ──────────────────────
const clothWorkerCode = `
self.onmessage = function(e) {
  const { particles, constraints, gravity, damping, iterations, windForce, dt } = e.data;
  const gravY = gravity * 0.001;

  for (let iter = 0; iter < iterations; iter++) {
    for (let ci = 0; ci < constraints.length; ci++) {
      const c  = constraints[ci];
      const pa = particles[c.a];
      const pb = particles[c.b];
      if (!pa || !pb) continue;

      const dx   = pb.x - pa.x;
      const dy   = pb.y - pa.y;
      const dz   = pb.z - pa.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist === 0) continue;

      const error = (dist - c.restLen) / dist;
      const cx    = dx * error * c.stiffness;
      const cy    = dy * error * c.stiffness;
      const cz    = dz * error * c.stiffness;
      const tw    = pa.invMass + pb.invMass;
      if (tw === 0) continue;

      if (!pa.pinned) { pa.x += cx*pa.invMass/tw; pa.y += cy*pa.invMass/tw; pa.z += cz*pa.invMass/tw; }
      if (!pb.pinned) { pb.x -= cx*pb.invMass/tw; pb.y -= cy*pb.invMass/tw; pb.z -= cz*pb.invMass/tw; }
    }
  }

  // Gravity + integrate
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.pinned) continue;
    const vx = p.x - p.px + windForce.x * 0.0003;
    const vy = p.y - p.py + gravY + windForce.y * 0.0003;
    const vz = p.z - p.pz + windForce.z * 0.0003;
    p.px = p.x; p.py = p.y; p.pz = p.z;
    p.x += vx * damping; p.y += vy * damping; p.z += vz * damping;
    if (p.y < 0) { p.y = 0; p.py = p.y + vy * 0.3; }
  }

  self.postMessage({ particles });
};
`;

const sphWorkerCode = `
self.onmessage = function(e) {
  const { particles, h, restDensity, stiffness, viscosity, gravity, dt } = e.data;

  // Compute density
  for (let i = 0; i < particles.length; i++) {
    particles[i].density = 0;
    for (let j = 0; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dz = particles[i].z - particles[j].z;
      const r  = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (r < h) {
        const x = 1 - r*r/(h*h);
        particles[i].density += particles[j].mass * (315/(64*Math.PI*Math.pow(h,3))) * x*x*x;
      }
    }
    particles[i].density  = Math.max(particles[i].density, restDensity * 0.01);
    particles[i].pressure = stiffness * (particles[i].density - restDensity);
  }

  // Forces + integrate
  for (let i = 0; i < particles.length; i++) {
    let fx = 0, fy = gravity * particles[i].mass * 0.001, fz = 0;
    for (let j = 0; j < particles.length; j++) {
      if (i === j) continue;
      const dx = particles[j].x - particles[i].x;
      const dy = particles[j].y - particles[i].y;
      const dz = particles[j].z - particles[i].z;
      const r  = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (r >= h || r === 0) continue;
      const len  = Math.sqrt(dx*dx+dy*dy+dz*dz);
      const nx   = dx/len, ny = dy/len, nz = dz/len;
      const grad = -(45/(Math.PI*Math.pow(h,4))) * Math.pow(1-r/h,2);
      const pf   = -(particles[i].pressure + particles[j].pressure)/(2*particles[j].density) * particles[j].mass * grad;
      fx += nx*pf; fy += ny*pf; fz += nz*pf;
      const rvx  = particles[j].vx - particles[i].vx;
      const rvy  = particles[j].vy - particles[i].vy;
      const rvz  = particles[j].vz - particles[i].vz;
      const vf   = viscosity * (particles[j].mass/particles[j].density) * grad;
      fx += rvx*vf; fy += rvy*vf; fz += rvz*vf;
    }
    const im = 1/particles[i].mass;
    particles[i].vx = (particles[i].vx + fx*im*dt) * 0.99;
    particles[i].vy = (particles[i].vy + fy*im*dt) * 0.99;
    particles[i].vz = (particles[i].vz + fz*im*dt) * 0.99;
    particles[i].x += particles[i].vx * dt;
    particles[i].y += particles[i].vy * dt;
    particles[i].z += particles[i].vz * dt;
    if (particles[i].y < 0) { particles[i].y = 0; particles[i].vy *= -0.3; }
    particles[i].life -= dt;
  }

  self.postMessage({ particles: particles.filter(p => p.life > 0) });
};
`;

// ── Create worker from code string ────────────────────────────────────────────
export function createInlineWorker(code) {
  const blob = new Blob([code], { type: "application/javascript" });
  const url  = URL.createObjectURL(blob);
  const worker = new Worker(url);
  worker._url  = url;
  return worker;
}

export function destroyWorker(worker) {
  worker.terminate();
  if (worker._url) URL.revokeObjectURL(worker._url);
}

// ── Cloth worker ──────────────────────────────────────────────────────────────
export function createClothWorker() {
  return createInlineWorker(clothWorkerCode);
}

export function runClothWorker(worker, cloth, dt=1/60) {
  return new Promise((resolve) => {
    const particles = cloth.particles.map(p => ({
      x:p.position.x, y:p.position.y, z:p.position.z,
      px:p.prevPos.x, py:p.prevPos.y, pz:p.prevPos.z,
      invMass:p.invMass, pinned:p.pinned, mass:p.mass,
    }));
    const constraints = cloth.constraints.map(c => ({
      a:c.a, b:c.b, restLen:c.restLen, stiffness:c.stiffness||0.9,
    }));
    const windForce = cloth.windForce
      ? { x:cloth.windForce.x, y:cloth.windForce.y, z:cloth.windForce.z }
      : { x:0, y:0, z:0 };

    worker.onmessage = (e) => {
      const result = e.data.particles;
      cloth.particles.forEach((p,i) => {
        if (!result[i]) return;
        p.position.set(result[i].x, result[i].y, result[i].z);
        p.prevPos.set(result[i].px, result[i].py, result[i].pz);
      });
      resolve(cloth);
    };

    worker.postMessage({
      particles, constraints,
      gravity:    cloth.gravity    || -9.8,
      damping:    cloth.damping    || 0.99,
      iterations: cloth.iterations || 8,
      windForce, dt,
    });
  });
}

// ── SPH worker ────────────────────────────────────────────────────────────────
export function createSPHWorker() {
  return createInlineWorker(sphWorkerCode);
}

export function runSPHWorker(worker, fluid, dt=1/60) {
  return new Promise((resolve) => {
    const particles = fluid.particles.map(p => ({
      x:p.position.x, y:p.position.y, z:p.position.z,
      vx:p.velocity.x, vy:p.velocity.y, vz:p.velocity.z,
      mass:p.mass, density:p.density, pressure:p.pressure, life:p.life,
    }));

    worker.onmessage = (e) => {
      const result = e.data.particles;
      fluid.particles = fluid.particles.filter((_,i) => i < result.length);
      fluid.particles.forEach((p,i) => {
        if (!result[i]) return;
        p.position.set(result[i].x, result[i].y, result[i].z);
        p.velocity.set(result[i].vx, result[i].vy, result[i].vz);
        p.life = result[i].life;
      });
      resolve(fluid);
    };

    worker.postMessage({
      particles,
      h:          fluid.smoothRadius || 0.3,
      restDensity:fluid.restDensity  || 1000,
      stiffness:  fluid.stiffness    || 50,
      viscosity:  fluid.viscosity    || 0.1,
      gravity:    fluid.gravity      || -9.8,
      dt,
    });
  });
}

// ── Worker pool ───────────────────────────────────────────────────────────────
export function createWorkerPool(type="cloth", size=2) {
  const workers = Array.from({ length:size }, () =>
    type === "cloth" ? createClothWorker() : createSPHWorker()
  );
  let nextWorker = 0;
  return {
    workers,
    next() { const w = workers[nextWorker]; nextWorker = (nextWorker+1)%size; return w; },
    destroy() { workers.forEach(destroyWorker); },
  };
}

export function getWorkerSupport() {
  return {
    workers:        typeof Worker !== "undefined",
    sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
    transferable:   typeof ArrayBuffer !== "undefined",
  };
}
