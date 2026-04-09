import * as THREE from 'three';

/**
 * SPX BooleanSystem — multi-object CSG boolean operations
 * Operations: union | subtract | intersect
 * Uses per-face triangle clipping via BSP planes (pure Three.js, no external CSG lib needed)
 */

// ── Minimal BSP node ────────────────────────────────────────────────────────
class Polygon {
  constructor(vertices, shared = null) {
    this.vertices = vertices;          // array of THREE.Vector3
    this.shared = shared;
    this.plane = Polygon.planeFromVerts(vertices);
  }
  static planeFromVerts(verts) {
    const a = verts[0], b = verts[1], c = verts[2];
    const n = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(b, a),
        new THREE.Vector3().subVectors(c, a)
      ).normalize();
    return { normal: n, w: n.dot(a) };
  }
  clone() {
    return new Polygon(this.vertices.map(v => v.clone()), this.shared);
  }
  flip() {
    this.vertices.reverse();
    this.plane.normal.negate();
    this.plane.w = -this.plane.w;
  }
}

const EPSILON = 1e-5;
const COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;

class BSPNode {
  constructor(polygons = []) {
    this.plane = null;
    this.front = null;
    this.back = null;
    this.polygons = [];
    if (polygons.length) this.build(polygons);
  }

  build(polygons) {
    if (!polygons.length) return;
    if (!this.plane) this.plane = { ...polygons[0].plane };
    const front = [], back = [];
    for (const poly of polygons) this._splitPolygon(poly, this.polygons, this.polygons, front, back);
    if (front.length) { this.front = this.front || new BSPNode(); this.front.build(front); }
    if (back.length)  { this.back  = this.back  || new BSPNode(); this.back.build(back);  }
  }

  _splitPolygon(poly, coplanarFront, coplanarBack, front, back) {
    const { normal, w } = this.plane;
    let type = 0;
    const types = poly.vertices.map(v => {
      const t = normal.dot(v) - w;
      const ty = t < -EPSILON ? BACK : t > EPSILON ? FRONT : COPLANAR;
      type |= ty;
      return ty;
    });
    if (type === COPLANAR) {
      (normal.dot(poly.plane.normal) > 0 ? coplanarFront : coplanarBack).push(poly);
    } else if (type === FRONT) {
      front.push(poly);
    } else if (type === BACK) {
      back.push(poly);
    } else {
      const f = [], b = [];
      for (let i = 0; i < poly.vertices.length; i++) {
        const j = (i + 1) % poly.vertices.length;
        const ti = types[i], tj = types[j];
        const vi = poly.vertices[i], vj = poly.vertices[j];
        if (ti !== BACK) f.push(vi);
        if (ti !== FRONT) b.push(ti !== BACK ? vi.clone() : vi);
        if ((ti | tj) === SPANNING) {
          const t = (w - normal.dot(vi)) / normal.dot(new THREE.Vector3().subVectors(vj, vi));
          const v = vi.clone().lerp(vj, t);
          f.push(v);
          b.push(v.clone());
        }
      }
      if (f.length >= 3) front.push(new Polygon(f, poly.shared));
      if (b.length >= 3) back.push(new Polygon(b, poly.shared));
    }
  }

  invert() {
    for (const p of this.polygons) p.flip();
    this.plane.normal.negate(); this.plane.w = -this.plane.w;
    if (this.front) this.front.invert();
    if (this.back)  this.back.invert();
    [this.front, this.back] = [this.back, this.front];
  }

  clipPolygons(polygons) {
    if (!this.plane) return polygons.slice();
    const front = [], back = [];
    for (const p of polygons) this._splitPolygon(p, front, back, front, back);
    const result = this.front ? this.front.clipPolygons(front) : front;
    return this.back ? result.concat(this.back.clipPolygons(back)) : result;
  }

  clipTo(bsp) { this.polygons = bsp.clipPolygons(this.polygons); if (this.front) this.front.clipTo(bsp); if (this.back) this.back.clipTo(bsp); }
  allPolygons() { let p = this.polygons.slice(); if (this.front) p = p.concat(this.front.allPolygons()); if (this.back) p = p.concat(this.back.allPolygons()); return p; }
  clone() { const n = new BSPNode(); n.plane = this.plane ? { ...this.plane, normal: this.plane.normal.clone() } : null; n.front = this.front?.clone() || null; n.back = this.back?.clone() || null; n.polygons = this.polygons.map(p => p.clone()); return n; }
}

// ── Mesh ↔ Polygons ─────────────────────────────────────────────────────────
function meshToPolygons(mesh) {
  const geo = mesh.geometry.clone();
  geo.applyMatrix4(mesh.matrixWorld);
  if (!geo.index) geo.toNonIndexed ? geo.toNonIndexed() : null;
  const pos = geo.attributes.position;
  const polys = [];
  for (let i = 0; i < pos.count; i += 3) {
    const verts = [
      new THREE.Vector3().fromBufferAttribute(pos, i),
      new THREE.Vector3().fromBufferAttribute(pos, i + 1),
      new THREE.Vector3().fromBufferAttribute(pos, i + 2),
    ];
    if (verts[0].distanceToSquared(verts[1]) < 1e-10) continue;
    polys.push(new Polygon(verts));
  }
  return polys;
}

function polygonsToMesh(polygons) {
  const positions = [];
  for (const poly of polygons) {
    for (let i = 2; i < poly.vertices.length; i++) {
      positions.push(...poly.vertices[0].toArray(), ...poly.vertices[i - 1].toArray(), ...poly.vertices[i].toArray());
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

// ── Public API ───────────────────────────────────────────────────────────────
export class BooleanSystem {
  /**
   * @param {THREE.Mesh} meshA
   * @param {THREE.Mesh} meshB
   * @param {'union'|'subtract'|'intersect'} operation
   * @param {THREE.Material} [material]
   * @returns {THREE.Mesh}
   */
  static apply(meshA, meshB, operation = 'subtract', material = null) {
    meshA.updateMatrixWorld(true);
    meshB.updateMatrixWorld(true);

    const a = new BSPNode(meshToPolygons(meshA));
    const b = new BSPNode(meshToPolygons(meshB));

    let result;
    switch (operation) {
      case 'union':
        a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert();
        a.build(b.allPolygons());
        result = a;
        break;
      case 'subtract':
        a.invert(); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert();
        a.build(b.allPolygons()); a.invert();
        result = a;
        break;
      case 'intersect':
        a.invert(); b.clipTo(a); b.invert(); a.clipTo(b);
        b.clipTo(a); a.build(b.allPolygons()); a.invert();
        result = a;
        break;
      default:
        throw new Error(`Unknown boolean operation: ${operation}`);
    }

    const geo = polygonsToMesh(result.allPolygons());
    const mat = material || meshA.material.clone();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `${meshA.name}_${operation}_${meshB.name}`;
    return mesh;
  }

  /**
   * Apply boolean to N meshes sequentially
   * @param {THREE.Mesh[]} meshes
   * @param {'union'|'subtract'|'intersect'} operation
   * @returns {THREE.Mesh}
   */
  static applyMultiple(meshes, operation = 'union') {
    if (meshes.length < 2) throw new Error('Need at least 2 meshes');
    let result = meshes[0];
    for (let i = 1; i < meshes.length; i++) {
      result = BooleanSystem.apply(result, meshes[i], operation);
    }
    return result;
  }

  static OPERATIONS = ['union', 'subtract', 'intersect'];
}

export default BooleanSystem;