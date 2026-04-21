import * as THREE from "three";
import { lookAtTarget, applyCameraShake } from "./CameraMath.js";

export function updateCameraRig(camera, settings = {}, dt = 0, elapsed = 0) {
  if (!camera) return;

  const rig = settings.rigType || "free";
  const target = settings.followTarget || null;

  if (rig === "orbit" && target?.position) {
    const radius = settings.orbitRadius ?? 5;
    const speed = settings.orbitSpeed ?? 0.15;
    const height = settings.orbitHeight ?? 1.5;
    const a = elapsed * speed;
    camera.position.x = target.position.x + Math.cos(a) * radius;
    camera.position.z = target.position.z + Math.sin(a) * radius;
    camera.position.y = target.position.y + height;
    lookAtTarget(camera, target);
  } else if (rig === "follow" && target?.position) {
    const offset = new THREE.Vector3(
      settings.followOffsetX ?? 0,
      settings.followOffsetY ?? 1.5,
      settings.followOffsetZ ?? 4
    );
    camera.position.copy(target.position).add(offset);
    lookAtTarget(camera, target);
  } else if (rig === "tripod" && target?.position) {
    lookAtTarget(camera, target);
  }

  if ((settings.shakeAmount ?? 0) > 0) {
    applyCameraShake(camera, elapsed, settings.shakeAmount ?? 0);
  }

  camera.updateMatrixWorld(true);
}
