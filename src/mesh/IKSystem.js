import * as THREE from "three";

// ── IK Chain ──────────────────────────────────────────────────────────────────
export function createIKChain(bones, options = {}) {
  return {
    id:         crypto.randomUUID(),
    bones,
    target:     options.target     || new THREE.Vector3(0,1,0),
    poleTarget: options.poleTarget || null,
    iterations: options.iterations || 10,
    tolerance:  options.tolerance  || 0.001,
    enabled:    true,
  };
}

// ── FABRIK solver ─────────────────────────────────────────────────────────────
export function solveFABRIK(chain) {
  const { bones, target, iterations, tolerance } = chain;
  if (!bones.length) return;

  const positions = bones.map(b => { const p = new THREE.Vector3(); b.getWorldPosition(p); return p; });
  const lengths   = [];
  for (let i=0; i<positions.length-1; i++) lengths.push(positions[i].distanceTo(positions[i+1]));
  const totalLen  = lengths.reduce((s,l)=>s+l, 0);
  const root      = positions[0].clone();

  if (root.distanceTo(target) > totalLen) {
    // Target unreachable — stretch toward it
    for (let i=0; i<positions.length-1; i++) {
      const dir = target.clone().sub(positions[i]).normalize();
      positions[i+1].copy(positions[i]).addScaledVector(dir, lengths[i]);
    }
  } else {
    for (let iter=0; iter<iterations; iter++) {
      // Forward pass
      positions[positions.length-1].copy(target);
      for (let i=positions.length-2; i>=0; i--) {
        const dir = positions[i].clone().sub(positions[i+1]).normalize();
        positions[i].copy(positions[i+1]).addScaledVector(dir, lengths[i]);
      }
      // Backward pass
      positions[0].copy(root);
      for (let i=0; i<positions.length-1; i++) {
        const dir = positions[i+1].clone().sub(positions[i]).normalize();
        positions[i+1].copy(positions[i]).addScaledVector(dir, lengths[i]);
      }
      if (positions[positions.length-1].distanceTo(target) < tolerance) break;
    }
  }

  // Apply back to bones
  bones.forEach((bone, i) => {
    if (i >= positions.length-1) return;
    const worldPos = positions[i];
    const worldTarget = positions[i+1];
    const dir = worldTarget.clone().sub(worldPos).normalize();
    const up  = new THREE.Vector3(0,1,0);
    const right = dir.clone().cross(up).normalize();
    const realUp = right.clone().cross(dir).normalize();
    const mat = new THREE.Matrix4().makeBasis(right, realUp, dir);
    const q   = new THREE.Quaternion().setFromRotationMatrix(mat);
    if (bone.parent) {
      const pq = new THREE.Quaternion(); bone.parent.getWorldQuaternion(pq);
      bone.quaternion.copy(pq.invert().multiply(q));
    } else {
      bone.quaternion.copy(q);
    }
    bone.updateMatrixWorld(true);
  });
}

export function setIKTarget(chain, position) { chain.target.copy(position); }
export function setIKPoleTarget(chain, position) { chain.poleTarget = chain.poleTarget || new THREE.Vector3(); chain.poleTarget.copy(position); }
export function getChainEnd(chain) { const p = new THREE.Vector3(); chain.bones[chain.bones.length-1]?.getWorldPosition(p); return p; }

export function solveTwoBoneIK(chain) {
  if (chain.bones.length < 2) return;
  const [bone0, bone1, bone2] = chain.bones;
  const p0 = new THREE.Vector3(); bone0.getWorldPosition(p0);
  const p1 = new THREE.Vector3(); bone1.getWorldPosition(p1);
  const target = chain.target;
  const l0 = p0.distanceTo(p1);
  const p2est = p1.clone().add(p1.clone().sub(p0).normalize().multiplyScalar(l0));
  const l1 = p1.distanceTo(p2est);
  const d  = Math.min(p0.distanceTo(target), l0+l1);
  const a0 = Math.acos(Math.max(-1, Math.min(1, (l0*l0+d*d-l1*l1)/(2*l0*d))));
  const dir = target.clone().sub(p0).normalize();
  const mid = p0.clone().addScaledVector(dir, Math.cos(a0)*l0);
  const up  = new THREE.Vector3(0,1,0);
  mid.add(up.clone().multiplyScalar(Math.sin(a0)*l0));
  solveFABRIK({ ...chain, bones:[bone0, bone1], target:mid, iterations:1, tolerance:0.01 });
  if (bone2) solveFABRIK({ ...chain, bones:[bone1, bone2], target, iterations:1, tolerance:0.01 });
}
