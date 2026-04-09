import * as THREE from "three";

// ── Create camera ─────────────────────────────────────────────────────────────
export function createCamera(options = {}) {
  const {
    fov      = 45,
    aspect   = 16/9,
    near     = 0.1,
    far      = 1000,
    name     = "Camera_" + Date.now(),
  } = options;

  const cam  = new THREE.PerspectiveCamera(fov, aspect, near, far);
  cam.name   = name;
  cam.userData.cameraId   = crypto.randomUUID();
  cam.userData.bookmarks  = [];
  cam.userData.dofEnabled = false;
  cam.userData.dofFocus   = 5.0;
  cam.userData.dofAperture = 0.025;
  cam.userData.dofMaxBlur  = 0.01;
  return cam;
}

// ── Camera bookmark ───────────────────────────────────────────────────────────
export function saveBookmark(camera, name) {
  const bookmark = {
    id:       crypto.randomUUID(),
    name:     name || "Bookmark_" + camera.userData.bookmarks.length,
    position: camera.position.clone(),
    rotation: camera.rotation.clone(),
    fov:      camera.fov,
  };
  camera.userData.bookmarks.push(bookmark);
  return bookmark;
}

// ── Restore bookmark ──────────────────────────────────────────────────────────
export function restoreBookmark(camera, bookmarkId) {
  const bm = camera.userData.bookmarks.find(b => b.id === bookmarkId);
  if (!bm) return false;
  camera.position.copy(bm.position);
  camera.rotation.copy(bm.rotation);
  camera.fov = bm.fov;
  camera.updateProjectionMatrix();
  return true;
}

// ── Animate camera to bookmark ────────────────────────────────────────────────
export function animateCameraToBookmark(camera, bookmarkId, duration = 1.0) {
  const bm = camera.userData.bookmarks.find(b => b.id === bookmarkId);
  if (!bm) return null;

  const startPos = camera.position.clone();
  const startRot = camera.rotation.clone();
  const startFov = camera.fov;
  const startTime = performance.now();

  return new Promise(resolve => {
    const animate = () => {
      const t = Math.min((performance.now() - startTime) / (duration * 1000), 1);
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // ease in-out quad

      camera.position.lerpVectors(startPos, bm.position, ease);
      camera.rotation.x = startRot.x + (bm.rotation.x - startRot.x) * ease;
      camera.rotation.y = startRot.y + (bm.rotation.y - startRot.y) * ease;
      camera.rotation.z = startRot.z + (bm.rotation.z - startRot.z) * ease;
      camera.fov = startFov + (bm.fov - startFov) * ease;
      camera.updateProjectionMatrix();

      if (t < 1) requestAnimationFrame(animate);
      else resolve();
    };
    requestAnimationFrame(animate);
  });
}

// ── DOF settings ──────────────────────────────────────────────────────────────
export function setDOF(camera, { enabled = true, focus = 5.0, aperture = 0.025, maxBlur = 0.01 } = {}) {
  camera.userData.dofEnabled  = enabled;
  camera.userData.dofFocus    = focus;
  camera.userData.dofAperture = aperture;
  camera.userData.dofMaxBlur  = maxBlur;
}

// ── Camera orbit helper ───────────────────────────────────────────────────────
export function orbitCamera(camera, target, deltaX, deltaY, radius) {
  const spherical = new THREE.Spherical();
  spherical.setFromVector3(camera.position.clone().sub(target));
  spherical.theta -= deltaX;
  spherical.phi   -= deltaY;
  spherical.phi    = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
  spherical.radius = radius;
  camera.position.setFromSpherical(spherical).add(target);
  camera.lookAt(target);
}

// ── Multiple camera manager ───────────────────────────────────────────────────
export function createCameraManager() {
  return {
    cameras:  [],
    active:   null,
    add(cam) { this.cameras.push(cam); if (!this.active) this.active = cam; },
    setActive(id) {
      const cam = this.cameras.find(c => c.userData.cameraId === id);
      if (cam) this.active = cam;
    },
    remove(id) {
      this.cameras = this.cameras.filter(c => c.userData.cameraId !== id);
      if (this.active?.userData.cameraId === id) this.active = this.cameras[0] || null;
    },
  };
}

// ── Camera shake ──────────────────────────────────────────────────────────────
export function applyCameraShake(camera, { intensity = 0.05, duration = 0.5 } = {}) {
  const startTime = performance.now();
  const origPos = camera.position.clone();

  const shake = () => {
    const elapsed = (performance.now() - startTime) / 1000;
    if (elapsed >= duration) { camera.position.copy(origPos); return; }
    const decay = 1 - elapsed / duration;
    camera.position.set(
      origPos.x + (Math.random()-0.5) * intensity * decay,
      origPos.y + (Math.random()-0.5) * intensity * decay,
      origPos.z + (Math.random()-0.5) * intensity * decay,
    );
    requestAnimationFrame(shake);
  };
  requestAnimationFrame(shake);
}

// ── Rack focus animation ──────────────────────────────────────────────────────
export function rackFocus(camera, fromFocus, toFocus, duration = 0.5) {
  const start = performance.now();
  return new Promise(resolve => {
    const animate = () => {
      const t = Math.min((performance.now()-start)/(duration*1000), 1);
      camera.userData.dofFocus = fromFocus + (toFocus - fromFocus) * t;
      if (t < 1) requestAnimationFrame(animate);
      else resolve();
    };
    requestAnimationFrame(animate);
  });
}

// ── Dolly zoom (Vertigo effect) ───────────────────────────────────────────────
export function dollyZoom(camera, target, fromDist, toDist, duration = 1.0) {
  const dir   = camera.position.clone().sub(target).normalize();
  const start = performance.now();
  const startFov = camera.fov;
  // Maintain perceived subject size: fov * distance = constant
  const k = startFov * fromDist;

  return new Promise(resolve => {
    const animate = () => {
      const t    = Math.min((performance.now()-start)/(duration*1000), 1);
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      const dist = fromDist + (toDist - fromDist) * ease;
      camera.position.copy(target).addScaledVector(dir, dist);
      camera.fov = k / dist;
      camera.updateProjectionMatrix();
      if (t < 1) requestAnimationFrame(animate);
      else resolve();
    };
    requestAnimationFrame(animate);
  });
}

// ── Serialize camera ──────────────────────────────────────────────────────────
export function serializeCamera(camera) {
  return {
    id:        camera.userData.cameraId,
    name:      camera.name,
    fov:       camera.fov,
    position:  camera.position.toArray(),
    rotation:  [camera.rotation.x, camera.rotation.y, camera.rotation.z],
    dof:       { enabled: camera.userData.dofEnabled, focus: camera.userData.dofFocus },
    bookmarks: camera.userData.bookmarks,
  };
}
