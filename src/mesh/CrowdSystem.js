import * as THREE from 'three';

// ── Agent ─────────────────────────────────────────────────────────────────────
function createAgent(position, options = {}) {
  return {
    position: position.clone(),
    velocity: new THREE.Vector3(
      (Math.random()-0.5)*2,
      0,
      (Math.random()-0.5)*2
    ).normalize().multiplyScalar(0.5 + Math.random()*0.5),
    acceleration: new THREE.Vector3(),
    target: null,
    state: 'wander', // wander | seek | flee | idle
    idleTimer: 0,
    maxSpeed: options.maxSpeed || 2.0,
    maxForce: options.maxForce || 0.15,
    wanderAngle: Math.random() * Math.PI * 2,
    height: options.height || 0,
    id: Math.random(),
  };
}

// ── Steering behaviors ────────────────────────────────────────────────────────
function seek(agent, target, weight=1) {
  const desired = target.clone().sub(agent.position);
  const d = desired.length();
  if (d < 0.001) return new THREE.Vector3();
  // Arrive: slow down near target
  const speed = d < 2 ? agent.maxSpeed * (d/2) : agent.maxSpeed;
  desired.normalize().multiplyScalar(speed);
  return desired.sub(agent.velocity).clampLength(0, agent.maxForce).multiplyScalar(weight);
}

function flee(agent, threat, radius=5, weight=1) {
  const diff = agent.position.clone().sub(threat);
  const d = diff.length();
  if (d > radius) return new THREE.Vector3();
  diff.normalize().multiplyScalar(agent.maxSpeed);
  return diff.sub(agent.velocity).clampLength(0, agent.maxForce * 2).multiplyScalar(weight);
}

function wander(agent, dt, weight=1) {
  agent.wanderAngle += (Math.random()-0.5) * 0.4;
  const wanderR = 1.5, wanderD = 2.5;
  const circleCenter = agent.velocity.clone().normalize().multiplyScalar(wanderD);
  const displacement = new THREE.Vector3(
    Math.cos(agent.wanderAngle) * wanderR,
    0,
    Math.sin(agent.wanderAngle) * wanderR
  );
  return circleCenter.add(displacement).clampLength(0, agent.maxForce).multiplyScalar(weight);
}

function separate(agent, neighbors, desiredSep=1.2, weight=1) {
  const steer = new THREE.Vector3();
  let count = 0;
  neighbors.forEach(other => {
    const d = agent.position.distanceTo(other.position);
    if (d > 0 && d < desiredSep) {
      const diff = agent.position.clone().sub(other.position).normalize().divideScalar(d);
      steer.add(diff);
      count++;
    }
  });
  if (count > 0) {
    steer.divideScalar(count);
    steer.normalize().multiplyScalar(agent.maxSpeed).sub(agent.velocity).clampLength(0, agent.maxForce);
  }
  return steer.multiplyScalar(weight);
}

function align(agent, neighbors, weight=1) {
  const avg = new THREE.Vector3();
  let count = 0;
  neighbors.forEach(other => {
    if (agent.position.distanceTo(other.position) < 3) {
      avg.add(other.velocity);
      count++;
    }
  });
  if (!count) return new THREE.Vector3();
  avg.divideScalar(count).normalize().multiplyScalar(agent.maxSpeed);
  return avg.sub(agent.velocity).clampLength(0, agent.maxForce).multiplyScalar(weight);
}

function cohesion(agent, neighbors, weight=1) {
  const center = new THREE.Vector3();
  let count = 0;
  neighbors.forEach(other => {
    if (agent.position.distanceTo(other.position) < 5) {
      center.add(other.position);
      count++;
    }
  });
  if (!count) return new THREE.Vector3();
  center.divideScalar(count);
  return seek(agent, center, weight);
}

function boundaryRepel(agent, bounds, weight=2) {
  const steer = new THREE.Vector3();
  const margin = bounds * 0.2;
  if (agent.position.x < -bounds + margin) steer.x += agent.maxForce * 3;
  if (agent.position.x >  bounds - margin) steer.x -= agent.maxForce * 3;
  if (agent.position.z < -bounds + margin) steer.z += agent.maxForce * 3;
  if (agent.position.z >  bounds - margin) steer.z -= agent.maxForce * 3;
  return steer.multiplyScalar(weight);
}

// ── Crowd system ──────────────────────────────────────────────────────────────
export function createCrowdSystem(scene, options = {}) {
  const {
    count       = 100,
    bounds      = 20,
    agentHeight = 1.8,
    agentRadius = 0.3,
    behavior    = 'flock', // flock | scatter | march | idle | panic
  } = options;

  // Instanced mesh — capsule-like character (cylinder + sphere head)
  const bodyGeo = new THREE.CylinderGeometry(agentRadius*0.4, agentRadius*0.4, agentHeight*0.7, 8);
  const headGeo = new THREE.SphereGeometry(agentRadius*0.55, 8, 6);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x4488cc, roughness: 0.7, metalness: 0.1
  });

  const bodyMesh = new THREE.InstancedMesh(bodyGeo, mat, count);
  const headMesh = new THREE.InstancedMesh(headGeo, mat, count);
  bodyMesh.castShadow = true;
  headMesh.castShadow = true;
  bodyMesh.userData.isCrowdMesh = true;
  headMesh.userData.isCrowdMesh = true;

  scene.add(bodyMesh);
  scene.add(headMesh);

  // Create agents
  const agents = Array.from({length: count}, () => {
    const pos = new THREE.Vector3(
      (Math.random()-0.5) * bounds * 1.5,
      0,
      (Math.random()-0.5) * bounds * 1.5
    );
    return createAgent(pos, { maxSpeed: 1.5 + Math.random(), height: agentHeight });
  });

  // Random colors per agent for visual variety
  const colors = [0x4488cc, 0xcc4444, 0x44aa44, 0xaaaa44, 0xaa44aa, 0x44aaaa, 0xcc8844];
  const color = new THREE.Color();
  agents.forEach((a, i) => {
    color.setHex(colors[i % colors.length]);
    bodyMesh.setColorAt(i, color);
    headMesh.setColorAt(i, color);
  });
  if (bodyMesh.instanceColor) bodyMesh.instanceColor.needsUpdate = true;
  if (headMesh.instanceColor) headMesh.instanceColor.needsUpdate = true;

  return {
    scene, agents, bodyMesh, headMesh,
    count, bounds, agentHeight,
    behavior, enabled: true,
    targetPoint: new THREE.Vector3(0, 0, 0),
    panicPoint: null,
    separationWeight: 1.5,
    alignmentWeight: 1.0,
    cohesionWeight: 0.8,
    wanderWeight: 0.6,
    seekWeight: 2.0,
    speed: 1.0,
  };
}

const _dummy = new THREE.Object3D();

export function stepCrowd(system, dt = 1/60) {
  if (!system.enabled) return;
  const { agents, bounds } = system;

  agents.forEach((agent, i) => {
    agent.acceleration.set(0, 0, 0);

    // Get local neighbors (spatial partition would be faster but this is fine for 500)
    const neighbors = agents.filter((o, j) => j !== i && agent.position.distanceTo(o.position) < 5);

    // Apply behaviors based on mode
    switch(system.behavior) {
      case 'flock':
        agent.acceleration.add(separate(agent, neighbors, 1.2, system.separationWeight));
        agent.acceleration.add(align(agent, neighbors, system.alignmentWeight));
        agent.acceleration.add(cohesion(agent, neighbors, system.cohesionWeight));
        agent.acceleration.add(wander(agent, dt, system.wanderWeight));
        break;
      case 'scatter':
        agent.acceleration.add(separate(agent, neighbors, 2.0, 3.0));
        agent.acceleration.add(wander(agent, dt, 1.5));
        break;
      case 'march':
        agent.acceleration.add(seek(agent, system.targetPoint, system.seekWeight));
        agent.acceleration.add(separate(agent, neighbors, 1.0, 1.0));
        break;
      case 'panic':
        if (system.panicPoint) {
          agent.acceleration.add(flee(agent, system.panicPoint, 15, 4.0));
          agent.acceleration.add(separate(agent, neighbors, 0.8, 1.0));
        }
        break;
      case 'idle':
        agent.idleTimer += dt;
        if (agent.idleTimer > 2 + Math.random()*3) {
          agent.idleTimer = 0;
          agent.wanderAngle += (Math.random()-0.5)*Math.PI;
        }
        agent.acceleration.add(wander(agent, dt, 0.1));
        agent.acceleration.add(separate(agent, neighbors, 1.2, 1.0));
        break;
    }

    // Boundary
    agent.acceleration.add(boundaryRepel(agent, bounds));

    // Integrate
    const scaledDt = dt * system.speed;
    agent.velocity.add(agent.acceleration);
    agent.velocity.y = 0;
    agent.velocity.clampLength(0, agent.maxSpeed * system.speed);
    agent.position.addScaledVector(agent.velocity, scaledDt);
    agent.position.y = 0;

    // Update instanced transforms
    const bodyY = agent.agentHeight ? agent.agentHeight*0.35 : 0.63;
    const headY = agent.agentHeight ? agent.agentHeight*0.85 : 1.53;

    _dummy.position.set(agent.position.x, bodyY, agent.position.z);
    if (agent.velocity.lengthSq() > 0.001) {
      _dummy.rotation.y = Math.atan2(agent.velocity.x, agent.velocity.z);
    }
    _dummy.updateMatrix();
    system.bodyMesh.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(agent.position.x, headY, agent.position.z);
    _dummy.updateMatrix();
    system.headMesh.setMatrixAt(i, _dummy.matrix);
  });

  system.bodyMesh.instanceMatrix.needsUpdate = true;
  system.headMesh.instanceMatrix.needsUpdate = true;
}

export function setCrowdBehavior(system, behavior, target) {
  system.behavior = behavior;
  if (target) {
    if (behavior === 'panic') system.panicPoint = target.clone();
    else system.targetPoint = target.clone();
  }
}

export function disposeCrowd(system) {
  system.scene.remove(system.bodyMesh);
  system.scene.remove(system.headMesh);
  system.bodyMesh.geometry.dispose();
  system.headMesh.geometry.dispose();
  system.bodyMesh.material.dispose();
  system.headMesh.material.dispose();
}
