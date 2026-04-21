
/**
 * SPX Mesh Editor — Transform Gizmo
 * XYZ arrow handles for move, rotation rings for rotate, scale cubes for scale
 */
import * as THREE from "three";

const AXIS_COLORS = { x: 0xff2222, y: 0x22ff22, z: 0x2222ff };
const AXIS_DIRS   = {
  x: new THREE.Vector3(1,0,0),
  y: new THREE.Vector3(0,1,0),
  z: new THREE.Vector3(0,0,1),
};

export class TransformGizmo {
  constructor(scene) {
    this.scene    = scene;
    this.group    = new THREE.Group();
    this.group.renderOrder = 999;
    this.mode     = "move"; // move|rotate|scale
    this.visible  = false;
    this.target   = null;
    this.dragging = null; // {axis, startPoint, startPos}
    this.handles  = {};
    scene.add(this.group);
    this._build();
  }

  _build() {
    // Clear old handles
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.handles = {};

    if (this.mode === "move") {
      ["x","y","z"].forEach(axis => {
        const dir  = AXIS_DIRS[axis];
        const mat  = new THREE.MeshBasicMaterial({color: AXIS_COLORS[axis], depthTest:false});
        // Shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.8,8), mat);
        // Arrowhead
        const head  = new THREE.Mesh(new THREE.ConeGeometry(0.06,0.2,8), mat);
        // Position along axis
        if (axis==="x") {
          shaft.rotation.z = -Math.PI/2;
          shaft.position.set(0.4,0,0);
          head.rotation.z  = -Math.PI/2;
          head.position.set(0.9,0,0);
        } else if (axis==="y") {
          shaft.position.set(0,0.4,0);
          head.position.set(0,0.9,0);
        } else {
          shaft.rotation.x = Math.PI/2;
          shaft.position.set(0,0,0.4);
          head.rotation.x  = Math.PI/2;
          head.position.set(0,0,0.9);
        }
        shaft.userData.axis = axis;
        head.userData.axis  = axis;
        this.group.add(shaft, head);
        this.handles[axis] = [shaft, head];
      });

      // Center cube
      const center = new THREE.Mesh(
        new THREE.BoxGeometry(0.12,0.12,0.12),
        new THREE.MeshBasicMaterial({color:0xffffff, depthTest:false})
      );
      center.userData.axis = "xyz";
      this.group.add(center);
      this.handles.xyz = [center];

    } else if (this.mode === "rotate") {
      ["x","y","z"].forEach(axis => {
        const geo  = new THREE.TorusGeometry(0.9, 0.02, 8, 48);
        const mat  = new THREE.MeshBasicMaterial({color: AXIS_COLORS[axis], depthTest:false});
        const ring = new THREE.Mesh(geo, mat);
        if (axis==="x") ring.rotation.y = Math.PI/2;
        if (axis==="z") ring.rotation.x = Math.PI/2;
        ring.userData.axis = axis;
        this.group.add(ring);
        this.handles[axis] = [ring];
      });

    } else if (this.mode === "scale") {
      ["x","y","z"].forEach(axis => {
        const mat   = new THREE.MeshBasicMaterial({color: AXIS_COLORS[axis], depthTest:false});
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.8,8), mat);
        const cube  = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.12), mat);
        if (axis==="x") {
          shaft.rotation.z = -Math.PI/2; shaft.position.set(0.4,0,0);
          cube.position.set(0.9,0,0);
        } else if (axis==="y") {
          shaft.position.set(0,0.4,0); cube.position.set(0,0.9,0);
        } else {
          shaft.rotation.x = Math.PI/2; shaft.position.set(0,0,0.4);
          cube.position.set(0,0,0.9);
        }
        shaft.userData.axis = axis;
        cube.userData.axis  = axis;
        this.group.add(shaft, cube);
        this.handles[axis] = [shaft, cube];
      });
    }
  }

  setMode(mode) {
    this.mode = mode;
    this._build();
  }

  attach(object) {
    this.target  = object;
    this.visible = true;
    this.group.visible = true;
    this.update();
  }

  detach() {
    this.target  = null;
    this.visible = false;
    this.group.visible = false;
  }

  update() {
    if (!this.target) return;
    this.group.position.set(
      this.target.position.x,
      this.target.position.y,
      this.target.position.z
    );
  }

  // Returns axis string if a handle was hit, null otherwise
  hitTest(raycaster) {
    const allHandles = Object.values(this.handles).flat();
    const hits = raycaster.intersectObjects(allHandles, false);
    if (hits.length === 0) return null;
    return hits[0].object.userData.axis || null;
  }

  startDrag(axis, worldPoint) {
    if (!this.target) return;
    this.dragging = {
      axis,
      startPoint: worldPoint.clone(),
      startPos:   this.target.position.clone(),
      startRot:   this.target.rotation.clone(),
      startScale: this.target.scale.clone(),
    };
  }

  drag(worldPoint) {
    if (!this.dragging || !this.target) return;
    const {axis, startPoint, startPos, startRot, startScale} = this.dragging;
    const delta = worldPoint.clone().sub(startPoint);

    if (this.mode === "move") {
      if (axis==="x")   this.target.position.x = startPos.x + delta.x;
      else if (axis==="y") this.target.position.y = startPos.y + delta.y;
      else if (axis==="z") this.target.position.z = startPos.z + delta.z;
      else { // xyz — move on XZ plane
        this.target.position.x = startPos.x + delta.x;
        this.target.position.z = startPos.z + delta.z;
      }
    } else if (this.mode === "rotate") {
      const angle = delta.length() * 2;
      if (axis==="x")   this.target.rotation.x = startRot.x + angle;
      else if (axis==="y") this.target.rotation.y = startRot.y + angle;
      else if (axis==="z") this.target.rotation.z = startRot.z + angle;
    } else if (this.mode === "scale") {
      const factor = 1 + delta.length() * (delta.x+delta.y+delta.z > 0 ? 1 : -1);
      if (axis==="x")   this.target.scale.x = Math.max(0.01, startScale.x * factor);
      else if (axis==="y") this.target.scale.y = Math.max(0.01, startScale.y * factor);
      else if (axis==="z") this.target.scale.z = Math.max(0.01, startScale.z * factor);
    }
    this.update();
  }

  endDrag() {
    this.dragging = null;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
