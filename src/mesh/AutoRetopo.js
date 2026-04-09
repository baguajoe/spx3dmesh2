// AutoRetopo.js — Retopology Engine UPGRADE
// SPX Mesh Editor | StreamPireX
// Features: snap-to-surface, PolyBuild interactive retopo, auto-retopo via voxel remesh

import * as THREE from 'three';

// ─── Voxel-based Auto Retopology ──────────────────────────────────────────────

export function autoRetopo(sourceMesh, targetPolyCount = 2000) {
  const geo = sourceMesh.geometry.clone();
  geo.computeVertexNormals();

  // Build voxel grid from source mesh
  const bbox = new THREE.Box3().setFromBufferAttribute(geo.attributes.position);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const voxelSize = maxDim / Math.cbrt(targetPolyCount * 6);

  const nx = Math.ceil(size.x / voxelSize);
  const ny = Math.ceil(size.y / voxelSize);
  const nz = Math.ceil(size.z / voxelSize);

  const grid = new Uint8Array(nx * ny * nz);
  const pos = geo.attributes.position;

  // Mark occupied voxels
  for (let i = 0; i < pos.count; i++) {
    const x = Math.floor((pos.getX(i) - bbox.min.x) / voxelSize);
    const y = Math.floor((pos.getY(i) - bbox.min.y) / voxelSize);
    const z = Math.floor((pos.getZ(i) - bbox.min.z) / voxelSize);
    if (x >= 0 && x < nx && y >= 0 && y < ny && z >= 0 && z < nz) {
      grid[x + y * nx + z * nx * ny] = 1;
    }
  }

  // Extract surface quads from voxel grid (naive surface nets)
  const vertices = [];
  const indices = [];

  for (let x = 0; x < nx - 1; x++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let z = 0; z < nz - 1; z++) {
        const v = grid[x + y * nx + z * nx * ny];
        const vx = grid[(x+1) + y * nx + z * nx * ny];
        const vy = grid[x + (y+1) * nx + z * nx * ny];
        const vz = grid[x + y * nx + (z+1) * nx * ny];

        if (v !== vx) {
          const wx = bbox.min.x + (x + 0.5) * voxelSize;
          const wy = bbox.min.y + (y + 0.5) * voxelSize;
          const wz = bbox.min.z + (z + 0.5) * voxelSize;
          const vi = vertices.length / 3;
          vertices.push(wx, wy, wz, wx, wy + voxelSize, wz, wx, wy + voxelSize, wz + voxelSize, wx, wy, wz + voxelSize);
          indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
        }
      }
    }
  }

  if (vertices.length === 0) {
    console.warn('[AutoRetopo] No surface found — returning original');
    return geo;
  }

  const newGeo = new THREE.BufferGeometry();
  newGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  newGeo.setIndex(indices);
  newGeo.computeVertexNormals();

  // Project vertices back onto original surface
  projectToSurface(newGeo, sourceMesh);

  return newGeo;
}

// ─── Snap-to-Surface ─────────────────────────────────────────────────────────

export function projectToSurface(retopGeo, targetMesh) {
  const raycaster = new THREE.Raycaster();
  const pos = retopGeo.attributes.position;
  const norm = retopGeo.attributes.normal;

  if (!norm) { retopGeo.computeVertexNormals(); }

  for (let i = 0; i < pos.count; i++) {
    const origin = new THREE.Vector3().fromBufferAttribute(pos, i);
    const normal = new THREE.Vector3().fromBufferAttribute(retopGeo.attributes.normal, i).normalize();

    // Cast ray both ways along normal
    for (const dir of [normal, normal.clone().negate()]) {
      raycaster.set(origin, dir);
      const hits = raycaster.intersectObject(targetMesh, false);
      if (hits.length > 0 && hits[0].distance < 2) {
        const hp = hits[0].point;
        pos.setXYZ(i, hp.x, hp.y, hp.z);
        break;
      }
    }
  }

  pos.needsUpdate = true;
  retopGeo.computeVertexNormals();
}

// ─── PolyBuild Interactive Retopo ─────────────────────────────────────────────

export class PolyBuildTool {
  constructor(scene, camera, renderer, targetMesh) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.targetMesh = targetMesh;
    this.raycaster = new THREE.Raycaster();
    this.vertices = [];
    this.faces = [];
    this.previewMesh = null;
    this.snapRadius = 0.05;
    this.active = false;
    this._onPointerDown = this._onPointerDown.bind(this);
  }

  enable() {
    this.active = true;
    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
    this._initPreviewMesh();
  }

  disable() {
    this.active = false;
    this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
  }

  _initPreviewMesh() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffc8, wireframe: true, side: THREE.DoubleSide });
    this.previewMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.previewMesh);
  }

  _onPointerDown(event) {
    if (!this.active) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.targetMesh, false);
    if (!hits.length) return;

    const point = hits[0].point.clone();

    // Snap to existing vertex if close enough
    const snapped = this._snapToExisting(point);
    const vertIdx = snapped !== null ? snapped : this._addVertex(point);

    if (this.vertices.length >= 3) {
      // Auto-complete quad on 4th vertex
      if (this._pendingVerts && this._pendingVerts.length === 3) {
        this._pendingVerts.push(vertIdx);
        this._addFace(...this._pendingVerts);
        this._pendingVerts = [];
      } else {
        this._pendingVerts = [vertIdx];
      }
    } else {
      this._pendingVerts = this._pendingVerts ?? [];
      this._pendingVerts.push(vertIdx);
    }

    this._updatePreview();
  }

  _addVertex(point) {
    this.vertices.push(point.clone());
    return this.vertices.length - 1;
  }

  _snapToExisting(point) {
    for (let i = 0; i < this.vertices.length; i++) {
      if (this.vertices[i].distanceTo(point) < this.snapRadius) return i;
    }
    return null;
  }

  _addFace(a, b, c, d) {
    if (d !== undefined) {
      this.faces.push([a, b, c], [a, c, d]); // quad as 2 tris
    } else {
      this.faces.push([a, b, c]);
    }
    this._updatePreview();
  }

  _updatePreview() {
    if (!this.previewMesh) return;
    const positions = this.vertices.flatMap(v => [v.x, v.y, v.z]);
    const indices = this.faces.flat();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (indices.length) geo.setIndex(indices);
    geo.computeVertexNormals();
    this.previewMesh.geometry.dispose();
    this.previewMesh.geometry = geo;
  }

  extractGeometry() {
    const positions = this.vertices.flatMap(v => [v.x, v.y, v.z]);
    const indices = this.faces.flat();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (indices.length) geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  clear() {
    this.vertices = [];
    this.faces = [];
    this._pendingVerts = [];
    this._updatePreview();
  }

  dispose() {
    this.disable();
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh.geometry.dispose();
    }
  }
}

export default { autoRetopo, projectToSurface, PolyBuildTool };


// ─── Legacy functional exports (App.jsx compat) ───────────────────────────────

export function quadDominantRetopo(sourceMesh, targetPolyCount = 2000) {
  return autoRetopo(sourceMesh, targetPolyCount);
}

export function detectHardEdges(geometry, angleThreshold = Math.PI / 4) {
  const { SeamManager } = require('./UVUnwrap.js');
  const sm = new SeamManager();
  sm.markSharpEdgesAsSeams(geometry, angleThreshold);
  return Array.from(sm.seams);
}

export function applySymmetryRetopo(geometry, axis = 'x') {
  const geo = geometry.clone();
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (axis === 'x' && pos.getX(i) < 0) pos.setX(i, Math.abs(pos.getX(i)));
    if (axis === 'y' && pos.getY(i) < 0) pos.setY(i, Math.abs(pos.getY(i)));
    if (axis === 'z' && pos.getZ(i) < 0) pos.setZ(i, Math.abs(pos.getZ(i)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function getRetopoStats(geometry) {
  const pos = geometry?.attributes?.position;
  const idx = geometry?.index;
  return {
    vertices: pos?.count ?? 0,
    faces: idx ? idx.count / 3 : (pos?.count ?? 0) / 3,
    edges: idx ? idx.count / 2 : 0,
  };
}

export function createRetopoSettings(options = {}) {
  return { targetPolyCount: 2000, axis: 'x', snapToSurface: true, usePolyBuild: false, ...options };
}
