import * as THREE from "three";
import { SENSOR_PRESETS } from "./CameraPresets.js";
import { computeVerticalFov, lookAtTarget } from "./CameraMath.js";

export function createFilmCamera(name = "Camera.001", aspect = 16 / 9) {
  const sensor = SENSOR_PRESETS[0];
  const focalLength = 50;
  const camera = new THREE.PerspectiveCamera(
    computeVerticalFov(sensor.height, focalLength),
    aspect,
    0.01,
    5000
  );

  camera.name = name;
  camera.position.set(3, 2, 5);
  camera.lookAt(0, 0, 0);

  camera.userData.film = {
    type: "camera",
    focalLength,
    sensorWidth: sensor.width,
    sensorHeight: sensor.height,
    fStop: 2.8,
    focusDistance: 5,
    exposure: 1,
    iso: 100,
    shutterSpeed: 1 / 48,
    whiteBalance: 5600,
    rigType: "free",
    orbitRadius: 5,
    orbitSpeed: 0.15,
    orbitHeight: 1.5,
    shakeAmount: 0,
    followOffsetX: 0,
    followOffsetY: 1.5,
    followOffsetZ: 4,
  };

  camera.userData.type = "camera";
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

export function applyFilmCameraSettings(camera, patch = {}) {
  if (!camera) return camera;
  camera.userData.film = {
    ...(camera.userData.film || {}),
    ...patch,
  };

  const film = camera.userData.film;
  camera.fov = computeVerticalFov(film.sensorHeight, film.focalLength);
  camera.updateProjectionMatrix();
  return camera;
}

export function getFilmCameraSettings(camera) {
  return camera?.userData?.film || null;
}

export function setCameraAspect(camera, aspect = 16 / 9) {
  if (!camera) return;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

export function focusCameraOn(camera, target) {
  if (!camera) return;
  lookAtTarget(camera, target);
}

export function serializeCamera(camera) {
  return {
    uuid: camera.uuid,
    name: camera.name,
    position: camera.position.toArray(),
    rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
    film: { ...(camera.userData.film || {}) },
  };
}
