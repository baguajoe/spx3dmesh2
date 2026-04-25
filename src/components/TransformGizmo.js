/**
 * SPX Mesh Editor — Transform Gizmo
 *
 * Blender-style object transform gizmo.
 *   mode "move"   — XYZ arrow handles
 *   mode "rotate" — XYZ rotation rings
 *   mode "scale"  — XYZ scale cubes
 *
 * Public API (called from App.jsx):
 *   const g = new TransformGizmo(scene);
 *   g.setMode("move"|"rotate"|"scale");
 *   g.attach(mesh);                        // show gizmo on mesh
 *   g.detach();                            // hide gizmo
 *   g.updateScale(camera, viewportHeight); // per-frame, keeps ~150px on screen
 *   g.hitTest(raycaster) -> "x"|"y"|"z"|"xyz"|null
 *   g.startDrag(axis, worldPoint);
 *   g.drag(worldPoint);
 *   g.endDrag();
 *   g.dispose();
 *
 * Optional host hook: if window.updateSceneObjectTransform exists, it's called
 * during drag/endDrag so React sidebar fields stay in sync with the viewport.
 */
import * as THREE from "three";

const AXIS_COLORS = { x: 0xff3333, y: 0x33ff33, z: 0x3366ff };
const TARGET_PX   = 150; // desired on-screen size (pixels)

// Safely dispose any Three resource that may or may not have a dispose() method,
// and may be an array (for multi-material meshes). Never throws.
function disposeOf(m) {
  try {
    if (!m) return;
    if (Array.isArray(m)) { m.forEach(disposeOf); return; }
    if (typeof m.dispose === "function") m.dispose();
  } catch (_e) {
    // swallow — disposing should never crash the gizmo build
  }
}

// Notify the host (React) of transform changes. Silent if host isn't wired.
function syncHost(target) {
  if (typeof window === "undefined") return;
  const fn = window.updateSceneObjectTransform;
  if (typeof fn !== "function" || !target) return;
  try {
    fn(target, target.position, target.rotation, target.scale);
  } catch (_e) {
    // host may throw — don't break drag
  }
}

export class TransformGizmo {
  constructor(scene) {
    this.scene    = scene;
    this.group    = new THREE.Group();
    this.group.renderOrder = 999;
    this.group.visible     = false;

    this.mode     = "move";
    this.target   = null;
    this.dragging = null; // { axis, startPoint, startPos, startRot, startScale }
    this.handles  = {};

    scene.add(this.group);
    this._build();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Build
  // ────────────────────────────────────────────────────────────────────────

  _clearGroup() {
    while (this.group.children.length) {
      const c = this.group.children[0];
      this.group.remove(c);
      disposeOf(c.geometry);
      disposeOf(c.material);
    }
    this.handles = {};
  }

  _build() {
    this._clearGroup();
    try {
      if (this.mode === "move")        this._buildMove();
      else if (this.mode === "rotate") this._buildRotate();
      else if (this.mode === "scale")  this._buildScale();
    } catch (e) {
      // If build crashes partway through, wipe the partial group so the next
      // _build() starts from a clean slate instead of layering junk.
      console.warn("[TransformGizmo] build failed:", e);
      this._clearGroup();
    }
  }

  _buildMove() {
    ["x", "y", "z"].forEach((axis) => {
      // Fresh material per handle so disposal never touches a shared material.
      const shaftMat = new THREE.MeshBasicMaterial({
        color: AXIS_COLORS[axis], depthTest: false, transparent: true, opacity: 0.95,
      });
      const headMat = new THREE.MeshBasicMaterial({
        color: AXIS_COLORS[axis], depthTest: false, transparent: true, opacity: 0.95,
      });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), shaftMat);
      const head  = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 12), headMat);

      if (axis === "x") {
        shaft.rotation.z = -Math.PI / 2; shaft.position.set(0.4, 0, 0);
        head.rotation.z  = -Math.PI / 2; head.position.set(0.9, 0, 0);
      } else if (axis === "y") {
        shaft.position.set(0, 0.4, 0);
        head.position.set(0, 0.9, 0);
      } else {
        shaft.rotation.x = Math.PI / 2; shaft.position.set(0, 0, 0.4);
        head.rotation.x  = Math.PI / 2; head.position.set(0, 0, 0.9);
      }

      shaft.userData.axis = axis;
      head.userData.axis  = axis;
      this.group.add(shaft, head);
      this.handles[axis] = [shaft, head];
    });

    // Center cube: free-move on camera-facing plane (XZ).
    const centerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, depthTest: false, transparent: true, opacity: 0.9,
    });
    const center = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), centerMat);
    center.userData.axis = "xyz";
    this.group.add(center);
    this.handles.xyz = [center];
  }

  _buildRotate() {
    ["x", "y", "z"].forEach((axis) => {
      const mat = new THREE.MeshBasicMaterial({
        color: AXIS_COLORS[axis], depthTest: false, transparent: true, opacity: 0.95,
      });
      const geo = new THREE.TorusGeometry(0.9, 0.02, 8, 48);
      const ring = new THREE.Mesh(geo, mat);
      if (axis === "x") ring.rotation.y = Math.PI / 2;
      if (axis === "z") ring.rotation.x = Math.PI / 2;
      ring.userData.axis = axis;
      this.group.add(ring);
      this.handles[axis] = [ring];
    });
  }

  _buildScale() {
    ["x", "y", "z"].forEach((axis) => {
      const shaftMat = new THREE.MeshBasicMaterial({
        color: AXIS_COLORS[axis], depthTest: false, transparent: true, opacity: 0.95,
      });
      const cubeMat = new THREE.MeshBasicMaterial({
        color: AXIS_COLORS[axis], depthTest: false, transparent: true, opacity: 0.95,
      });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), shaftMat);
      const cube  = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), cubeMat);

      if (axis === "x") {
        shaft.rotation.z = -Math.PI / 2; shaft.position.set(0.4, 0, 0);
        cube.position.set(0.9, 0, 0);
      } else if (axis === "y") {
        shaft.position.set(0, 0.4, 0);
        cube.position.set(0, 0.9, 0);
      } else {
        shaft.rotation.x = Math.PI / 2; shaft.position.set(0, 0, 0.4);
        cube.position.set(0, 0, 0.9);
      }

      shaft.userData.axis = axis;
      cube.userData.axis  = axis;
      this.group.add(shaft, cube);
      this.handles[axis] = [shaft, cube];
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // Mode + target
  // ────────────────────────────────────────────────────────────────────────

  setMode(mode) {
    if (mode !== "move" && mode !== "rotate" && mode !== "scale") return;
    if (this.mode === mode) return;
    this.mode = mode;
    this._build();
  }

  attach(object) {
    if (!object) return;
    this.target = object;
    this.group.visible = true;
    this._syncPosition();
  }

  detach() {
    this.target = null;
    this.group.visible = false;
    this.dragging = null;
  }

  _syncPosition() {
    if (!this.target) return;
    if (typeof this.target.updateMatrixWorld === "function") this.target.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    this.target.getWorldPosition(p);
    this.group.position.copy(p);
  }

  // Called every frame from the render loop so the gizmo stays ~150px on screen.
  updateScale(camera, viewportHeight) {
    if (!this.group.visible || !camera || !viewportHeight || viewportHeight < 10) return;
    this._syncPosition();

    if (camera.isPerspectiveCamera) {
      const distance      = Math.max(0.1, camera.position.distanceTo(this.group.position));
      const fovRad        = camera.fov * Math.PI / 180;
      const worldPerPixel = (2 * Math.tan(fovRad / 2) * distance) / viewportHeight;
      const s             = Math.max(0.05, TARGET_PX * worldPerPixel);
      this.group.scale.setScalar(s);
    } else {
      // Ortho fallback
      const worldPerPixel = (camera.top - camera.bottom) / viewportHeight / (camera.zoom || 1);
      this.group.scale.setScalar(Math.max(0.05, TARGET_PX * worldPerPixel));
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Picking
  // ────────────────────────────────────────────────────────────────────────

  hitTest(raycaster) {
    if (!this.group.visible) return null;
    const all = [];
    Object.values(this.handles).forEach((arr) => arr.forEach((h) => all.push(h)));
    if (!all.length) return null;
    const hits = raycaster.intersectObjects(all, false);
    if (!hits.length) return null;
    return hits[0].object.userData.axis || null;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Drag lifecycle
  // ────────────────────────────────────────────────────────────────────────

  startDrag(axis, worldPoint) {
    if (!this.target || !axis || !worldPoint) return;
    this.dragging = {
      axis,
      startPoint: worldPoint.clone(),
      startPos:   this.target.position.clone(),
      startRot:   this.target.rotation.clone(),
      startScale: this.target.scale.clone(),
    };
  }

  drag(worldPoint) {
    if (!this.dragging || !this.target || !worldPoint) return;
    const { axis, startPoint, startPos, startRot, startScale } = this.dragging;
    const delta = worldPoint.clone().sub(startPoint);

    if (this.mode === "move") {
      if (axis === "x")      this.target.position.set(startPos.x + delta.x, startPos.y,           startPos.z);
      else if (axis === "y") this.target.position.set(startPos.x,           startPos.y + delta.y, startPos.z);
      else if (axis === "z") this.target.position.set(startPos.x,           startPos.y,           startPos.z + delta.z);
      else /* xyz */         this.target.position.set(startPos.x + delta.x, startPos.y,           startPos.z + delta.z);
    } else if (this.mode === "rotate") {
      // Ring-plane projection: project startPoint and worldPoint onto the
      // plane perpendicular to the rotation axis (passing through origin),
      // then compute signed angle between them using the axis as reference.
      // Camera-independent — no sign flips when orbiting past an axis.
      const origin = startPos;
      const startVec = startPoint.clone().sub(origin);
      const curVec   = worldPoint.clone().sub(origin);

      let nx = 0, ny = 0, nz = 0;
      if (axis === "x") nx = 1;
      else if (axis === "y") ny = 1;
      else if (axis === "z") nz = 1;

      const projDot0 = startVec.x * nx + startVec.y * ny + startVec.z * nz;
      const v0x = startVec.x - projDot0 * nx;
      const v0y = startVec.y - projDot0 * ny;
      const v0z = startVec.z - projDot0 * nz;

      const projDot1 = curVec.x * nx + curVec.y * ny + curVec.z * nz;
      const v1x = curVec.x - projDot1 * nx;
      const v1y = curVec.y - projDot1 * ny;
      const v1z = curVec.z - projDot1 * nz;

      const len0 = Math.hypot(v0x, v0y, v0z);
      const len1 = Math.hypot(v1x, v1y, v1z);

      let angle = 0;
      if (len0 > 1e-4 && len1 > 1e-4) {
        const cosA = (v0x * v1x + v0y * v1y + v0z * v1z) / (len0 * len1);
        const cx = v0y * v1z - v0z * v1y;
        const cy = v0z * v1x - v0x * v1z;
        const cz = v0x * v1y - v0y * v1x;
        const sinA = (cx * nx + cy * ny + cz * nz) / (len0 * len1);
        angle = Math.atan2(sinA, Math.max(-1, Math.min(1, cosA)));
      }

      // Slight damping so rings feel less twitchy at small distances
      const ROTATE_SENSITIVITY = 0.85;
      angle *= ROTATE_SENSITIVITY;

      if (axis === "x")      this.target.rotation.set(startRot.x + angle, startRot.y,         startRot.z);
      else if (axis === "y") this.target.rotation.set(startRot.x,         startRot.y + angle, startRot.z);
      else if (axis === "z") this.target.rotation.set(startRot.x,         startRot.y,         startRot.z + angle);
    } else if (this.mode === "scale") {
      // Project delta onto the axis direction and damp it.
      // Previous code summed delta components which gave wildly different
      // magnitudes depending on camera angle. This gives a consistent feel.
      const SCALE_SENSITIVITY = 0.5;
      let amt = 0;
      if (axis === "x")      amt = delta.x * SCALE_SENSITIVITY;
      else if (axis === "y") amt = delta.y * SCALE_SENSITIVITY;
      else if (axis === "z") amt = delta.z * SCALE_SENSITIVITY;
      else /* xyz */         amt = (delta.x + delta.y + delta.z) * SCALE_SENSITIVITY / 3;
      const factor = Math.max(0.05, 1 + amt);
      if (axis === "x")      this.target.scale.set(Math.max(0.01, startScale.x * factor), startScale.y,                          startScale.z);
      else if (axis === "y") this.target.scale.set(startScale.x,                          Math.max(0.01, startScale.y * factor), startScale.z);
      else if (axis === "z") this.target.scale.set(startScale.x,                          startScale.y,                          Math.max(0.01, startScale.z * factor));
      else /* xyz */         this.target.scale.setScalar(Math.max(0.01, startScale.x * factor));
    }

    this._syncPosition();
    syncHost(this.target); // live sidebar update
  }

  endDrag() {
    if (this.dragging && this.target) syncHost(this.target);
    this.dragging = null;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Teardown
  // ────────────────────────────────────────────────────────────────────────

  dispose() {
    this.detach();
    this._clearGroup();
    if (this.scene) this.scene.remove(this.group);
  }
}