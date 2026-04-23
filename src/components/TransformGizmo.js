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
 *   g.attach(mesh);                       // shows gizmo on mesh
 *   g.detach();                           // hides gizmo
 *   g.updateScale(camera, viewportHeight); // call every frame, keeps ~75px on screen
 *   g.hitTest(raycaster) -> "x"|"y"|"z"|"xyz"|null
 *   g.startDrag(axis, worldPoint);
 *   g.drag(worldPoint);                   // during mousemove
 *   g.endDrag();                          // on mouseup
 */
import * as THREE from "three";

const AXIS_COLORS = { x: 0xff3333, y: 0x33ff33, z: 0x3366ff };
const TARGET_PX   = 150; // desired on-screen size (pixels)

export class TransformGizmo {
  constructor(scene) {
    this.scene   = scene;
    this.group   = new THREE.Group();
    this.group.renderOrder = 999;
    this.group.visible = false;

    this.mode    = "move";
    this.target  = null;
    this.dragging = null; // { axis, startPoint, startPos, startRot, startScale }
    this.handles = {};

    scene.add(this.group);
    this._build();
  }

  // ── Build visual handles for the current mode ────────────────────────────
  _build() {
    // Clear existing children
    while (this.group.children.length) {
      const c = this.group.children[0];
      this.group.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    this.handles = {};

    if (this.mode === "move") {
      this._buildMove();
    } else if (this.mode === "rotate") {
      this._buildRotate();
    } else if (this.mode === "scale") {
      this._buildScale();
    }
  }

  _buildMove() {
    ["x", "y", "z"].forEach((axis) => {
      const mat   = new THREE.MeshBasicMaterial({ color: AXIS_COLORS[axis], depthTest: false, transparent: true, opacity: 0.95 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), mat);
      const head  = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 12), mat);

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
    const center = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.9 })
    );
    center.userData.axis = "xyz";
    this.group.add(center);
    this.handles.xyz = [center];
  }

  _buildRotate() {
    ["x", "y", "z"].forEach((axis) => {
      const mat  = new THREE.MeshBasicMaterial({ color: AXIS_COLORS[axis], depthTest: false, transparent: true, opacity: 0.95 });
      const geo  = new THREE.TorusGeometry(0.9, 0.02, 8, 48);
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
      const mat   = new THREE.MeshBasicMaterial({ color: AXIS_COLORS[axis], depthTest: false, transparent: true, opacity: 0.95 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), mat);
      const cube  = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mat);

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

  // ── Mode + target management ─────────────────────────────────────────────
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
    this.target.updateMatrixWorld?.(true);
    const p = new THREE.Vector3();
    this.target.getWorldPosition(p);
    this.group.position.copy(p);
  }

  // Keep gizmo at constant screen-space size (~75 px). Call every frame from animate().
  updateScale(camera, viewportHeight) {
    if (!this.group.visible || !camera || !viewportHeight || viewportHeight < 10) return;
    this._syncPosition();

    if (camera.isPerspectiveCamera) {
      const distance = Math.max(0.1, camera.position.distanceTo(this.group.position));
      const fovRad   = camera.fov * Math.PI / 180;
      const worldPerPixel = (2 * Math.tan(fovRad / 2) * distance) / viewportHeight;
      const s = Math.max(0.05, TARGET_PX * worldPerPixel);
      this.group.scale.setScalar(s);
    } else {
      // Ortho fallback
      const worldPerPixel = (camera.top - camera.bottom) / viewportHeight / (camera.zoom || 1);
      this.group.scale.setScalar(TARGET_PX * worldPerPixel);
    }
  }

  // ── Hit test: returns "x"|"y"|"z"|"xyz"|null ─────────────────────────────
  hitTest(raycaster) {
    if (!this.group.visible) return null;
    const all = [];
    Object.values(this.handles).forEach(arr => arr.forEach(h => all.push(h)));
    const hits = raycaster.intersectObjects(all, false);
    if (!hits.length) return null;
    return hits[0].object.userData.axis || null;
  }

  // ── Drag lifecycle ───────────────────────────────────────────────────────
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
      // Angle swept around the rotation axis, measured on the plane perpendicular to that axis.
      const origin = startPos;
      const startVec = startPoint.clone().sub(origin);
      const curVec   = worldPoint.clone().sub(origin);
      let angle = 0;
      if (axis === "x") {
        // Project onto YZ plane: use (z, y)
        const a0 = Math.atan2(startVec.y, startVec.z);
        const a1 = Math.atan2(curVec.y,   curVec.z);
        angle = a1 - a0;
      } else if (axis === "y") {
        // Project onto XZ plane: use (x, z)
        const a0 = Math.atan2(startVec.x, startVec.z);
        const a1 = Math.atan2(curVec.x,   curVec.z);
        angle = a1 - a0;
      } else if (axis === "z") {
        // Project onto XY plane: use (x, y)
        const a0 = Math.atan2(startVec.y, startVec.x);
        const a1 = Math.atan2(curVec.y,   curVec.x);
        angle = a1 - a0;
      }
      // Normalize to [-π, π] to avoid jumps across the atan2 branch cut
      while (angle >  Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;

      if (axis === "x")      this.target.rotation.set(startRot.x + angle, startRot.y,         startRot.z);
      else if (axis === "y") this.target.rotation.set(startRot.x,         startRot.y + angle, startRot.z);
      else if (axis === "z") this.target.rotation.set(startRot.x,         startRot.y,         startRot.z + angle);
    } else if (this.mode === "scale") {
      const amt    = delta.x + delta.y + delta.z;
      const factor = Math.max(0.05, 1 + amt);
      if (axis === "x")      this.target.scale.set(Math.max(0.01, startScale.x * factor), startScale.y,                          startScale.z);
      else if (axis === "y") this.target.scale.set(startScale.x,                          Math.max(0.01, startScale.y * factor), startScale.z);
      else if (axis === "z") this.target.scale.set(startScale.x,                          startScale.y,                          Math.max(0.01, startScale.z * factor));
      else /* xyz */         this.target.scale.setScalar(Math.max(0.01, startScale.x * factor));
    }

    this._syncPosition();

    // Live sync React state during drag so sidebar transform fields update
    if (typeof window !== "undefined" && typeof window.updateSceneObjectTransform === "function") {
      try {
        window.updateSceneObjectTransform(
          this.target,
          this.target.position,
          this.target.rotation,
          this.target.scale
        );
      } catch (_e) {}
    }
  }

  endDrag() {
    if (this.dragging && this.target && typeof window !== "undefined" && typeof window.updateSceneObjectTransform === "function") {
      // Sync React state once, at end of drag, not every frame.
      try {
        window.updateSceneObjectTransform(
          this.target,
          this.target.position,
          this.target.rotation,
          this.target.scale
        );
      } catch (_e) { /* host can ignore */ }
    }
    this.dragging = null;
  }

  dispose() {
    this.detach();
    while (this.group.children.length) {
      const c = this.group.children[0];
      this.group.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    if (this.scene) this.scene.remove(this.group);
  }
}
