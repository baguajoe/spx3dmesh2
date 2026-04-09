import * as THREE from "three";

// ── Driver types ──────────────────────────────────────────────────────────────
export const DRIVER_TYPES = {
  scripted:   { label: "Scripted Expression", icon: "ƒ" },
  average:    { label: "Averaged Values",      icon: "∅" },
  min:        { label: "Minimum Value",        icon: "↓" },
  max:        { label: "Maximum Value",        icon: "↑" },
  sum:        { label: "Sum of Values",        icon: "Σ" },
};

// ── Create driver ─────────────────────────────────────────────────────────────
export function createDriver(options = {}) {
  return {
    id:          crypto.randomUUID(),
    name:        options.name || "Driver_" + Date.now(),
    type:        options.type || "scripted",
    expression:  options.expression || "var",
    variables:   [],   // [{ name, type, targets }]
    targetObjId: options.targetObjId || null,
    targetProp:  options.targetProp  || null,
    enabled:     true,
  };
}

// ── Create driver variable ─────────────────────────────────────────────────────
export function createVariable(name, sourceObjId, sourceProp) {
  return {
    id:          crypto.randomUUID(),
    name:        name || "var",
    type:        "single_prop",
    sourceObjId,
    sourceProp,
    value:       0,
  };
}

// ── Evaluate driver expression ────────────────────────────────────────────────
export function evaluateDriver(driver, variables) {
  // Build variable scope
  const scope = {};
  variables.forEach(v => { scope[v.name] = v.value || 0; });

  // Inject math helpers
  scope.sin   = Math.sin;
  scope.cos   = Math.cos;
  scope.abs   = Math.abs;
  scope.min   = Math.min;
  scope.max   = Math.max;
  scope.pow   = Math.pow;
  scope.sqrt  = Math.sqrt;
  scope.PI    = Math.PI;
  scope.frame = scope.frame || 0;

  try {
    const fn = new Function(...Object.keys(scope), `return ${driver.expression};`);
    return fn(...Object.values(scope));
  } catch(e) {
    return 0;
  }
}

// ── Resolve variable value from scene ─────────────────────────────────────────
export function resolveVariable(variable, sceneObjects, shapeKeys, animFrame) {
  const { sourceObjId, sourceProp } = variable;

  // Frame variable
  if (sourceProp === "frame") return animFrame;

  // Scene object property
  const obj = sceneObjects.find(o => o.id === sourceObjId);
  if (obj?.mesh) {
    switch (sourceProp) {
      case "pos.x":   return obj.mesh.position.x;
      case "pos.y":   return obj.mesh.position.y;
      case "pos.z":   return obj.mesh.position.z;
      case "rot.x":   return obj.mesh.rotation.x;
      case "rot.y":   return obj.mesh.rotation.y;
      case "rot.z":   return obj.mesh.rotation.z;
      case "scale.x": return obj.mesh.scale.x;
      case "scale.y": return obj.mesh.scale.y;
      case "scale.z": return obj.mesh.scale.z;
    }
  }

  // Shape key value
  const sk = shapeKeys.find(k => k.id === sourceObjId);
  if (sk && sourceProp === "value") return sk.value;

  return 0;
}

// ── Apply driver to target ─────────────────────────────────────────────────────
export function applyDriver(driver, sceneObjects, shapeKeys, animFrame) {
  if (!driver.enabled) return;

  // Resolve all variable values
  const vars = driver.variables.map(v => ({
    ...v,
    value: resolveVariable(v, sceneObjects, shapeKeys, animFrame),
  }));

  // Evaluate expression
  const result = evaluateDriver(driver, vars);

  // Apply to target
  const targetObj = sceneObjects.find(o => o.id === driver.targetObjId);
  if (targetObj?.mesh) {
    switch (driver.targetProp) {
      case "pos.x":   targetObj.mesh.position.x = result; break;
      case "pos.y":   targetObj.mesh.position.y = result; break;
      case "pos.z":   targetObj.mesh.position.z = result; break;
      case "rot.x":   targetObj.mesh.rotation.x = result; break;
      case "rot.y":   targetObj.mesh.rotation.y = result; break;
      case "rot.z":   targetObj.mesh.rotation.z = result; break;
      case "scale.x": targetObj.mesh.scale.x = result; break;
      case "scale.y": targetObj.mesh.scale.y = result; break;
      case "scale.z": targetObj.mesh.scale.z = result; break;
    }
  }

  // Apply to shape key
  const targetSK = shapeKeys.find(k => k.id === driver.targetObjId);
  if (targetSK && driver.targetProp === "value") {
    targetSK.value = Math.max(0, Math.min(1, result));
  }

  return result;
}

// ── Apply all drivers ─────────────────────────────────────────────────────────
export function applyAllDrivers(drivers, sceneObjects, shapeKeys, animFrame) {
  return drivers.map(d => ({
    id: d.id,
    result: applyDriver(d, sceneObjects, shapeKeys, animFrame),
  }));
}

// ── Common driver presets ─────────────────────────────────────────────────────
export const DRIVER_PRESETS = {
  sineWave:   { expression: "sin(frame * 0.1) * 0.5 + 0.5",     label: "Sine Wave" },
  cosWave:    { expression: "cos(frame * 0.1) * 0.5 + 0.5",     label: "Cosine Wave" },
  bounce:     { expression: "abs(sin(frame * 0.15))",            label: "Bounce" },
  ramp:       { expression: "min(frame / 60, 1)",                label: "Ramp 0→1 in 60f" },
  pingPong:   { expression: "abs((frame % 60) / 30 - 1)",       label: "Ping Pong" },
  noise:      { expression: "sin(frame*0.3)*cos(frame*0.17)*0.5+0.5", label: "Noise" },
  boneFollow: { expression: "var * 0.5",                         label: "Bone Follow (50%)" },
};
