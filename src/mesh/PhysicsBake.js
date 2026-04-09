import * as THREE from "three";

// ── Baked physics frame ───────────────────────────────────────────────────────
export function createBakeBuffer(frameCount) {
  return {
    frameCount,
    frames:    [],  // [{ objects: [{ id, position, rotation, scale }] }]
    baked:     false,
    currentFrame: 0,
  };
}

// ── Bake current frame to buffer ──────────────────────────────────────────────
export function bakeFrame(buffer, frameIndex, sceneObjects) {
  buffer.frames[frameIndex] = {
    objects: sceneObjects.map(obj => ({
      id:       obj.id,
      position: obj.mesh ? obj.mesh.position.toArray() : [0,0,0],
      rotation: obj.mesh ? [obj.mesh.rotation.x, obj.mesh.rotation.y, obj.mesh.rotation.z] : [0,0,0],
      scale:    obj.mesh ? obj.mesh.scale.toArray() : [1,1,1],
    })),
  };
}

// ── Restore baked frame to scene ──────────────────────────────────────────────
export function restoreFrame(buffer, frameIndex, sceneObjects) {
  const frame = buffer.frames[frameIndex];
  if (!frame) return;
  frame.objects.forEach(baked => {
    const obj = sceneObjects.find(o => o.id === baked.id);
    if (!obj?.mesh) return;
    obj.mesh.position.fromArray(baked.position);
    obj.mesh.rotation.set(baked.rotation[0], baked.rotation[1], baked.rotation[2]);
    obj.mesh.scale.fromArray(baked.scale);
  });
}

// ── Rigid body simulation ─────────────────────────────────────────────────────
export function createRigidBody(mesh, options = {}) {
  return {
    mesh,
    mass:        options.mass        || 1.0,
    restitution: options.restitution || 0.3,
    friction:    options.friction    || 0.5,
    velocity:    new THREE.Vector3(0, 0, 0),
    angularVel:  new THREE.Vector3(0, 0, 0),
    isStatic:    options.isStatic    || false,
    isSleeping:  false,
  };
}

// ── Step rigid body simulation ────────────────────────────────────────────────
export function stepRigidBody(rb, dt = 1/60, gravity = -9.8) {
  if (rb.isStatic || rb.isSleeping) return;

  // Apply gravity
  rb.velocity.y += gravity * dt * rb.mass;

  // Update position
  rb.mesh.position.x += rb.velocity.x * dt;
  rb.mesh.position.y += rb.velocity.y * dt;
  rb.mesh.position.z += rb.velocity.z * dt;

  // Apply angular velocity
  rb.mesh.rotation.x += rb.angularVel.x * dt;
  rb.mesh.rotation.y += rb.angularVel.y * dt;
  rb.mesh.rotation.z += rb.angularVel.z * dt;

  // Floor collision
  if (rb.mesh.position.y < 0) {
    rb.mesh.position.y = 0;
    rb.velocity.y *= -rb.restitution;
    rb.velocity.x *= 1 - rb.friction;
    rb.velocity.z *= 1 - rb.friction;
    rb.angularVel.multiplyScalar(0.9);
    if (Math.abs(rb.velocity.y) < 0.01) {
      rb.velocity.y = 0;
      if (rb.velocity.length() < 0.01) rb.isSleeping = true;
    }
  }

  // Air drag
  rb.velocity.multiplyScalar(0.999);
  rb.angularVel.multiplyScalar(0.98);
}

// ── Bake rigid body simulation to keyframes ───────────────────────────────────
export function bakeRigidBodies(rigidBodies, frameCount = 120, fps = 24) {
  const baked = {};
  const dt    = 1 / fps;

  // Save initial state
  const initial = rigidBodies.map(rb => ({
    pos: rb.mesh.position.clone(),
    rot: rb.mesh.rotation.clone(),
  }));

  // Simulate and record
  for (let f = 0; f < frameCount; f++) {
    rigidBodies.forEach(rb => stepRigidBody(rb, dt));
    rigidBodies.forEach((rb, i) => {
      const id = rb.mesh.uuid;
      if (!baked[id]) baked[id] = { pos: {}, rot: {} };
      baked[id].pos[f] = rb.mesh.position.toArray();
      baked[id].rot[f] = [rb.mesh.rotation.x, rb.mesh.rotation.y, rb.mesh.rotation.z];
    });
  }

  // Restore initial state
  rigidBodies.forEach((rb, i) => {
    rb.mesh.position.copy(initial[i].pos);
    rb.mesh.rotation.copy(initial[i].rot);
  });

  return baked;
}

// ── Apply baked rigid body frame ──────────────────────────────────────────────
export function applyBakedFrame(bakedData, mesh, frameIndex) {
  const data = bakedData[mesh.uuid];
  if (!data) return;
  if (data.pos[frameIndex]) mesh.position.fromArray(data.pos[frameIndex]);
  if (data.rot[frameIndex]) mesh.rotation.set(...data.rot[frameIndex]);
}

// ── Mesh fracture (simple Voronoi-style) ─────────────────────────────────────
export function fractureMesh(mesh, pieces = 8) {
  const geo    = mesh.geometry;
  const pos    = geo.attributes.position;
  const box    = new THREE.Box3().setFromObject(mesh);
  const size   = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const fragments = [];

  // Generate random voronoi centers
  const seeds = Array.from({length: pieces}, () => new THREE.Vector3(
    center.x + (Math.random()-0.5) * size.x,
    center.y + (Math.random()-0.5) * size.y,
    center.z + (Math.random()-0.5) * size.z,
  ));

  // Assign each vertex to nearest seed
  const vertGroups = new Map();
  seeds.forEach((_, si) => vertGroups.set(si, []));

  for (let i = 0; i < pos.count; i++) {
    const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    let   minDist = Infinity, nearest = 0;
    seeds.forEach((s, si) => {
      const d = vp.distanceTo(s);
      if (d < minDist) { minDist = d; nearest = si; }
    });
    vertGroups.get(nearest).push(i);
  }

  // Create fragment meshes
  seeds.forEach((seed, si) => {
    const verts = vertGroups.get(si);
    if (verts.length < 3) return;

    const fragPos = new Float32Array(verts.length * 3);
    verts.forEach((vi, fi) => {
      fragPos[fi*3]   = pos.getX(vi);
      fragPos[fi*3+1] = pos.getY(vi);
      fragPos[fi*3+2] = pos.getZ(vi);
    });

    const fragGeo = new THREE.BufferGeometry();
    fragGeo.setAttribute("position", new THREE.BufferAttribute(fragPos, 3));
    fragGeo.computeVertexNormals();

    const fragMesh = new THREE.Mesh(fragGeo, mesh.material.clone());
    fragMesh.name  = mesh.name + "_frag_" + si;

    // Add rigid body component
    const rb = createRigidBody(fragMesh, {
      mass: 0.5 + Math.random() * 0.5,
      restitution: 0.2 + Math.random() * 0.3,
    });
    rb.velocity.set(
      (Math.random()-0.5) * 3,
      Math.random() * 5,
      (Math.random()-0.5) * 3,
    );
    rb.angularVel.set(
      (Math.random()-0.5) * 2,
      (Math.random()-0.5) * 2,
      (Math.random()-0.5) * 2,
    );

    fragments.push({ mesh: fragMesh, rb });
  });

  return fragments;
}
