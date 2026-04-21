import * as THREE from "three";

export function degreesFromRadians(rad) {
  return rad * (180 / Math.PI);
}

export function radiansFromDegrees(deg) {
  return deg * (Math.PI / 180);
}

export function computeVerticalFov(sensorHeightMm = 24, focalLengthMm = 50) {
  if (!sensorHeightMm || !focalLengthMm) return 50;
  const fov = 2 * Math.atan((sensorHeightMm / 2) / focalLengthMm);
  return degreesFromRadians(fov);
}

export function computeHorizontalFov(sensorWidthMm = 36, focalLengthMm = 50) {
  if (!sensorWidthMm || !focalLengthMm) return 60;
  const fov = 2 * Math.atan((sensorWidthMm / 2) / focalLengthMm);
  return degreesFromRadians(fov);
}

export function estimateDofStrength({
  distance = 5,
  focusDistance = 5,
  focalLength = 50,
  fStop = 2.8,
  sensorWidth = 36,
}) {
  const z = Math.max(0.001, distance);
  const focus = Math.max(0.001, focusDistance);
  const lens = Math.max(1, focalLength);
  const aperture = Math.max(0.7, fStop);
  const sensor = Math.max(1, sensorWidth);
  return Math.abs(z - focus) / z * ((lens * lens) / (aperture * sensor));
}

export function lookAtTarget(camera, target) {
  if (!camera || !target) return;
  const p = target.isVector3 ? target : target.position;
  if (!p) return;
  camera.lookAt(p);
}

export function applyCameraShake(camera, timeSeconds = 0, amount = 0) {
  if (!camera || amount <= 0) return;
  const t = timeSeconds;
  camera.position.x += Math.sin(t * 7.1) * amount * 0.02;
  camera.position.y += Math.cos(t * 5.3) * amount * 0.02;
  camera.position.z += Math.sin(t * 3.9) * amount * 0.01;
  camera.rotation.z += Math.sin(t * 6.2) * amount * 0.003;
}

export function copyTransform(fromObj, toObj) {
  if (!fromObj || !toObj) return;
  toObj.position.copy(fromObj.position);
  toObj.rotation.copy(fromObj.rotation);
  toObj.scale.copy(fromObj.scale);
  toObj.updateMatrixWorld(true);
}
