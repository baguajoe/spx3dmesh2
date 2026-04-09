import * as THREE from "three";

// ── Spline IK ─────────────────────────────────────────────────────────────────
export function createSplineIK(bones, curve, options = {}) {
  return {
    bones,
    curve,
    influence:   options.influence   || 1.0,
    chainOffset: options.chainOffset || 0,
    stretchY:    options.stretchY    || true,
    xzScale:     options.xzScale     || "none",
  };
}

export function solveSplineIK(splineIK) {
  const { bones, curve, influence, chainOffset } = splineIK;
  if (!bones.length || !curve) return;

  const totalLen = bones.reduce((s,b,i) => {
    if (i===0) return s;
    const prev = new THREE.Vector3(); bones[i-1].getWorldPosition(prev);
    const curr = new THREE.Vector3(); bones[i].getWorldPosition(curr);
    return s + prev.distanceTo(curr);
  }, 0);

  bones.forEach((bone,i) => {
    const t = (i/Math.max(bones.length-1,1) + chainOffset) % 1;
    const pt   = curve.getPoint(t);
    const tan  = curve.getTangent(t).normalize();
    const up   = new THREE.Vector3(0,1,0);
    const right = tan.clone().cross(up).normalize();
    const realUp = right.clone().cross(tan).normalize();

    const mat = new THREE.Matrix4().makeBasis(right, realUp, tan.negate());
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(mat);

    const parentQuat = new THREE.Quaternion();
    if (bone.parent) bone.parent.getWorldQuaternion(parentQuat);
    const localQuat = parentQuat.clone().invert().multiply(targetQuat);

    bone.quaternion.slerp(localQuat, influence);
    if (splineIK.stretchY) bone.position.copy(pt);
    bone.updateMatrixWorld(true);
  });
}

// ── IK/FK blend ───────────────────────────────────────────────────────────────
export function createIKFKBlend(chain, options = {}) {
  return {
    chain,
    blend:      options.blend || 0.0, // 0=FK, 1=IK
    fkRotations: chain.bones?.map(b => b.quaternion.clone()) || [],
    ikRotations: chain.bones?.map(b => b.quaternion.clone()) || [],
  };
}

export function updateIKFKBlend(ikfk) {
  if (!ikfk.chain?.bones) return;
  ikfk.chain.bones.forEach((bone, i) => {
    const fk = ikfk.fkRotations[i] || new THREE.Quaternion();
    const ik = ikfk.ikRotations[i] || new THREE.Quaternion();
    bone.quaternion.slerpQuaternions(fk, ik, ikfk.blend);
    bone.updateMatrixWorld(true);
  });
}

export function captureFKPose(ikfk) {
  if (!ikfk.chain?.bones) return;
  ikfk.fkRotations = ikfk.chain.bones.map(b => b.quaternion.clone());
}

export function captureIKPose(ikfk) {
  if (!ikfk.chain?.bones) return;
  ikfk.ikRotations = ikfk.chain.bones.map(b => b.quaternion.clone());
}

// ── Improved NLA evaluator ────────────────────────────────────────────────────
export function evaluateNLAAdvanced(tracks, actions, frame, sceneObjects) {
  if (!tracks?.length || !actions?.length) return;

  // Accumulate blended values
  const blended = new Map(); // objectId -> { prop -> value, weight }

  tracks.forEach(track => {
    if (track.muted) return;
    track.strips?.forEach(strip => {
      if (strip.muted) return;
      const action = actions.find(a => a.id === strip.actionId);
      if (!action) return;

      const localFrame = ((frame - strip.frameStart) * strip.scale + strip.offset) % (action.frameEnd - action.frameStart);
      if (localFrame < 0 || localFrame > action.frameEnd) return;

      Object.entries(action.keys || {}).forEach(([objId, channels]) => {
        if (!blended.has(objId)) blended.set(objId, {});
        const bObj = blended.get(objId);

        Object.entries(channels).forEach(([prop, keyframes]) => {
          const frames = Object.keys(keyframes).map(Number).sort((a,b)=>a-b);
          if (!frames.length) return;

          let value = keyframes[frames[frames.length-1]];
          for (let i=0; i<frames.length-1; i++) {
            if (localFrame >= frames[i] && localFrame <= frames[i+1]) {
              const t = (localFrame-frames[i])/(frames[i+1]-frames[i]);
              // Ease in-out interpolation
              const eased = t<0.5 ? 2*t*t : -1+(4-2*t)*t;
              value = keyframes[frames[i]] + (keyframes[frames[i+1]]-keyframes[frames[i]])*eased;
              break;
            }
          }

          const inf = strip.influence || 1.0;
          if (!bObj[prop]) bObj[prop] = { value:0, weight:0 };

          switch (strip.blendMode) {
            case "add":
              bObj[prop].value  += value * inf;
              bObj[prop].weight += inf;
              break;
            case "multiply":
              bObj[prop].value  = (bObj[prop].value||1) * value;
              bObj[prop].weight = 1;
              break;
            default: // replace
              bObj[prop].value  = bObj[prop].value*(1-inf) + value*inf;
              bObj[prop].weight = 1;
              break;
          }
        });
      });
    });
  });

  // Apply blended values
  blended.forEach((channels, objId) => {
    const obj = sceneObjects?.find(o => o.id === objId);
    if (!obj?.mesh) return;
    Object.entries(channels).forEach(([prop, {value}]) => {
      switch (prop) {
        case "pos.x": obj.mesh.position.x = value; break;
        case "pos.y": obj.mesh.position.y = value; break;
        case "pos.z": obj.mesh.position.z = value; break;
        case "rot.x": obj.mesh.rotation.x = value; break;
        case "rot.y": obj.mesh.rotation.y = value; break;
        case "rot.z": obj.mesh.rotation.z = value; break;
        case "scale.x": obj.mesh.scale.x = value; break;
        case "scale.y": obj.mesh.scale.y = value; break;
        case "scale.z": obj.mesh.scale.z = value; break;
      }
    });
  });
}

// ── GLTF animation export ─────────────────────────────────────────────────────
export function buildGLTFAnimationClip(name, keys, fps=24) {
  const tracks = [];
  Object.entries(keys).forEach(([objId, channels]) => {
    Object.entries(channels).forEach(([prop, keyframes]) => {
      const frames = Object.keys(keyframes).map(Number).sort((a,b)=>a-b);
      if (!frames.length) return;

      const times  = new Float32Array(frames.map(f => f/fps));
      const values = new Float32Array(frames.map(f => keyframes[f]));

      let trackName = objId + ".";
      if (prop.startsWith("pos"))   trackName += "position[" + prop.slice(-1) + "]";
      else if (prop.startsWith("rot")) trackName += "rotation[" + prop.slice(-1) + "]";
      else if (prop.startsWith("scale")) trackName += "scale[" + prop.slice(-1) + "]";

      tracks.push({ name: trackName, times, values, interpolation:"LINEAR" });
    });
  });

  return { name, tracks, duration: Math.max(...Object.values(keys).flatMap(ch => Object.values(ch).flatMap(kf => Object.keys(kf).map(Number))))/fps };
}

// ── Shape key driver update ───────────────────────────────────────────────────
export function updateShapeKeyDrivers(shapeKeys, drivers, animFrame) {
  drivers.forEach(driver => {
    if (!driver.enabled || driver.targetProp !== "value") return;
    const sk = shapeKeys.find(k => k.id === driver.targetObjId);
    if (!sk) return;
    try {
      const fn = new Function("frame", `return ${driver.expression};`);
      sk.value = Math.max(0, Math.min(1, fn(animFrame)));
    } catch(e) {}
  });
}

// ── Bone envelope weight ──────────────────────────────────────────────────────
export function computeEnvelopeWeights(mesh, armature, falloff=1.0) {
  const geo    = mesh.geometry;
  const pos    = geo.attributes.position;
  const bones  = armature.userData.bones || [];
  if (!pos || !bones.length) return;

  const count   = pos.count;
  const indices = new Float32Array(count*4).fill(0);
  const weights = new Float32Array(count*4).fill(0);
  const mat     = mesh.matrixWorld;

  for (let vi=0; vi<count; vi++) {
    const vp = new THREE.Vector3(pos.getX(vi),pos.getY(vi),pos.getZ(vi)).applyMatrix4(mat);
    const boneWeights = [];

    bones.forEach((bone,bi) => {
      const bp = new THREE.Vector3(); bone.getWorldPosition(bp);
      const dist = vp.distanceTo(bp);
      const env  = bone.userData.envelopeRadius || 0.5;
      if (dist < env) {
        const w = Math.pow(1-dist/env, falloff);
        boneWeights.push({ bi, w });
      }
    });

    boneWeights.sort((a,b) => b.w-a.w);
    const top4 = boneWeights.slice(0,4);
    const total = top4.reduce((s,x)=>s+x.w,0)||1;

    top4.forEach(({bi,w},slot) => {
      indices[vi*4+slot] = bi;
      weights[vi*4+slot] = w/total;
    });
  }

  geo.setAttribute("skinIndex",  new THREE.BufferAttribute(indices,4));
  geo.setAttribute("skinWeight", new THREE.BufferAttribute(weights,4));
}
