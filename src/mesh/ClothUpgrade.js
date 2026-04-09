import * as THREE from "three";

// ── Extended constraint types ─────────────────────────────────────────────────
export const CONSTRAINT_TYPES_CLOTH = {
  stretch:  { label:"Stretch",  stiffness:0.9 },
  shear:    { label:"Shear",    stiffness:0.7 },
  bend:     { label:"Bend",     stiffness:0.3 },
  sewing:   { label:"Sewing",   stiffness:1.0 },
  pressure: { label:"Pressure", stiffness:0.5 },
};

// ── Build full constraint set from mesh ───────────────────────────────────────
export function buildFullConstraints(geo, particles, options = {}) {
  const idx    = geo.index;
  if (!idx) return [];
  const arr    = idx.array;
  const constraints = [];
  const edgeSet     = new Set();

  for (let i=0; i<arr.length; i+=3) {
    const a=arr[i], b=arr[i+1], c=arr[i+2];

    // Stretch — direct edges
    [[a,b],[b,c],[a,c]].forEach(([p,q]) => {
      const key = Math.min(p,q)+"_"+Math.max(p,q)+"_s";
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        const rest = particles[p].position.distanceTo(particles[q].position);
        constraints.push({ a:p, b:q, restLen:rest, type:"stretch", stiffness:options.stretch||0.9 });
      }
    });

    // Shear — cross edges
    [[a,b],[b,c],[a,c]].forEach(([p,q]) => {
      const key = Math.min(p,q)+"_"+Math.max(p,q)+"_sh";
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        const rest = particles[p].position.distanceTo(particles[q].position);
        constraints.push({ a:p, b:q, restLen:rest*1.414, type:"shear", stiffness:options.shear||0.7 });
      }
    });
  }

  // Bend — find edges shared by two triangles, connect opposite vertices
  const faceMap = new Map();
  for (let i=0; i<arr.length; i+=3) {
    const verts = [arr[i],arr[i+1],arr[i+2]];
    for (let k=0; k<3; k++) {
      const ea = verts[k], eb = verts[(k+1)%3];
      const key = Math.min(ea,eb)+"_"+Math.max(ea,eb);
      if (!faceMap.has(key)) faceMap.set(key, []);
      faceMap.get(key).push(verts[(k+2)%3]);
    }
  }

  faceMap.forEach((opposites, edgeKey) => {
    if (opposites.length === 2) {
      const p = opposites[0], q = opposites[1];
      const key = Math.min(p,q)+"_"+Math.max(p,q)+"_b";
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        const rest = particles[p].position.distanceTo(particles[q].position);
        constraints.push({ a:p, b:q, restLen:rest, type:"bend", stiffness:options.bend||0.3 });
      }
    }
  });

  return constraints;
}

// ── Spatial hash for self-collision ──────────────────────────────────────────
export function createSpatialHash(cellSize=0.1) {
  return {
    cellSize,
    cells: new Map(),
    clear() { this.cells.clear(); },
    hash(x,y,z) {
      const cx = Math.floor(x/this.cellSize);
      const cy = Math.floor(y/this.cellSize);
      const cz = Math.floor(z/this.cellSize);
      return cx*73856093 ^ cy*19349663 ^ cz*83492791;
    },
    insert(idx, position) {
      const key = this.hash(position.x, position.y, position.z);
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key).push(idx);
    },
    query(position) {
      const results = [];
      for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++) for (let dz=-1; dz<=1; dz++) {
        const key = this.hash(
          position.x+dx*this.cellSize,
          position.y+dy*this.cellSize,
          position.z+dz*this.cellSize
        );
        if (this.cells.has(key)) results.push(...this.cells.get(key));
      }
      return [...new Set(results)];
    },
  };
}

// ── Self-collision with spatial hash ─────────────────────────────────────────
export function applySelfCollisionHash(cloth, hash, minDist=0.02) {
  hash.clear();
  cloth.particles.forEach((p,i) => { if (!p.pinned) hash.insert(i, p.position); });

  cloth.particles.forEach((pa, i) => {
    if (pa.pinned) return;
    const nearby = hash.query(pa.position);
    nearby.forEach(j => {
      if (j <= i) return;
      const pb  = cloth.particles[j];
      const diff = pb.position.clone().sub(pa.position);
      const dist = diff.length();
      if (dist < minDist && dist > 0.0001) {
        const corr = diff.multiplyScalar((dist-minDist)/dist*0.5);
        if (!pa.pinned) pa.position.sub(corr);
        if (!pb.pinned) pb.position.add(corr);
      }
    });
  });
}

// ── Sewing constraints ────────────────────────────────────────────────────────
export function addSewingConstraint(cloth, vertA, vertB, stiffness=1.0) {
  const pa = cloth.particles[vertA], pb = cloth.particles[vertB];
  if (!pa || !pb) return null;
  const constraint = { a:vertA, b:vertB, restLen:0, type:"sewing", stiffness };
  cloth.constraints.push(constraint);
  return constraint;
}

// ── Wind turbulence ───────────────────────────────────────────────────────────
export function applyWindTurbulence(cloth, baseWind, { noiseScale=0.5, time=0 } = {}) {
  cloth.particles.forEach((p,i) => {
    if (p.pinned) return;
    const noise = new THREE.Vector3(
      Math.sin(p.position.x*noiseScale+time*2.3)*0.5+0.5,
      Math.cos(p.position.y*noiseScale+time*1.7)*0.5+0.5,
      Math.sin(p.position.z*noiseScale+time*3.1)*0.5+0.5,
    );
    const wind = baseWind.clone().add(noise.multiplyScalar(0.5));
    p.position.addScaledVector(wind, 0.0003);
  });
}

// ── Pressure constraint ───────────────────────────────────────────────────────
export function applyPressure(cloth, pressure=0.1) {
  let volume = 0;
  const geo  = cloth.mesh.geometry;
  const idx  = geo.index;
  if (!idx) return;
  const arr  = idx.array;

  // Compute approximate volume
  for (let i=0; i<arr.length; i+=3) {
    const a = cloth.particles[arr[i]].position;
    const b = cloth.particles[arr[i+1]].position;
    const c = cloth.particles[arr[i+2]].position;
    volume  += a.dot(b.clone().cross(c)) / 6;
  }

  // Apply outward pressure
  const force = pressure / Math.max(Math.abs(volume), 0.001);
  for (let i=0; i<arr.length; i+=3) {
    const a = cloth.particles[arr[i]];
    const b = cloth.particles[arr[i+1]];
    const c = cloth.particles[arr[i+2]];
    const normal = b.position.clone().sub(a.position).cross(c.position.clone().sub(a.position)).normalize();
    [a,b,c].forEach(p => { if (!p.pinned) p.position.addScaledVector(normal, force*0.001); });
  }
}

// ── Upgraded cloth step ───────────────────────────────────────────────────────
export function stepClothUpgraded(cloth, hash, dt=1/60, time=0) {
  const { particles, constraints, gravity, damping, iterations, windForce } = cloth;
  const gravVec = new THREE.Vector3(0, gravity*0.001, 0);

  // Apply forces
  particles.forEach(p => {
    if (p.pinned) return;
    const acc = new THREE.Vector3().addScaledVector(gravVec, p.invMass);
    if (windForce) acc.add(windForce.clone().multiplyScalar(p.invMass*0.001));
    const temp = p.position.clone();
    p.position.addScaledVector(p.position.clone().sub(p.prevPos).multiplyScalar(damping), 1).add(acc.multiplyScalar(dt*dt*3600));
    p.prevPos.copy(temp);
  });

  // Solve constraints
  for (let iter=0; iter<iterations; iter++) {
    constraints.forEach(c => {
      const pa=particles[c.a], pb=particles[c.b];
      const diff  = pb.position.clone().sub(pa.position);
      const dist  = diff.length();
      if (dist === 0) return;
      const error = (dist-c.restLen)/dist;
      const corr  = diff.multiplyScalar(error*c.stiffness);
      const tw    = pa.invMass+pb.invMass;
      if (tw===0) return;
      if (!pa.pinned) pa.position.addScaledVector(corr,  pa.invMass/tw);
      if (!pb.pinned) pb.position.addScaledVector(corr, -pb.invMass/tw);
    });
  }

  // Self-collision
  if (hash) applySelfCollisionHash(cloth, hash);

  // Wind turbulence
  if (windForce?.length() > 0) applyWindTurbulence(cloth, windForce, { time });

  // Write back
  const pos = cloth.mesh.geometry.attributes.position;
  const inv = cloth.mesh.matrixWorld.clone().invert();
  particles.forEach((p,i) => {
    const local = p.position.clone().applyMatrix4(inv);
    pos.setXYZ(i, local.x, local.y, local.z);
  });
  pos.needsUpdate = true;
  cloth.mesh.geometry.computeVertexNormals();
}
