
/**
 * SPX Mesh Editor — Half-Edge Data Structure
 * Enables topological mesh operations: loop cuts, edge slide, knife tool
 */

export class Vertex {
  constructor(id, x, y, z) {
    this.id = id;
    this.x = x; this.y = y; this.z = z;
    this.halfEdge = null; // one outgoing half-edge
  }
  clone() { return new Vertex(this.id, this.x, this.y, this.z); }
  distanceTo(v) {
    return Math.sqrt((this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2);
  }
}

export class HalfEdge {
  constructor(id) {
    this.id = id;
    this.vertex = null;   // vertex at the START of this half-edge
    this.face   = null;   // face this half-edge borders
    this.next   = null;   // next half-edge around the face
    this.prev   = null;   // prev half-edge around the face
    this.twin   = null;   // opposite half-edge
    this.selected = false;
  }
  // Walk around face
  faceLoop() {
    const edges = [this];
    let e = this.next;
    while (e && e !== this && edges.length < 100) {
      edges.push(e); e = e.next;
    }
    return edges;
  }
  // Get the edge loop this half-edge belongs to
  // Proper traversal: go twin->next->next (cross perpendicular edges)
  edgeLoop() {
    const loop = [];
    const visited = new Set();
    let e = this;
    let guard = 0;

    do {
      if (visited.has(e.id)) break;
      visited.add(e.id);
      loop.push(e);

      // To find next edge in loop:
      // 1. Go to twin (cross to adjacent face)
      // 2. Then advance next->next (skip to perpendicular edge)
      if (!e.twin) break;
      let next = e.twin;

      // Count edges in face to handle tris vs quads
      const faceEdges = next.faceLoop ? next.faceLoop() : [];
      const faceSize  = faceEdges.length;

      if (faceSize === 4) {
        // Quad: skip 2 edges to get perpendicular
        next = next.next ? next.next.next : null;
      } else if (faceSize === 3) {
        // Triangle: skip 1 edge
        next = next.next || null;
      } else {
        // N-gon: skip n/2 edges
        const skip = Math.floor(faceSize / 2);
        for (let s = 0; s < skip && next; s++) next = next.next;
      }

      if (!next || visited.has(next.id)) break;
      e = next;
      guard++;
    } while (e !== this && guard < 500);

    return loop;
  }
}

export class Face {
  constructor(id) {
    this.id = id;
    this.halfEdge = null; // one half-edge of this face
    this.selected = false;
  }
  // Get all vertices of this face
  vertices() {
    return this.halfEdge.faceLoop().map(e => e.vertex);
  }
  // Compute face normal
  normal() {
    const verts = this.vertices();
    if (verts.length < 3) return {x:0,y:1,z:0};
    const a = verts[0], b = verts[1], c = verts[2];
    const ax=b.x-a.x, ay=b.y-a.y, az=b.z-a.z;
    const bx=c.x-a.x, by=c.y-a.y, bz=c.z-a.z;
    const nx=ay*bz-az*by, ny=az*bx-ax*bz, nz=ax*by-ay*bx;
    const len=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
    return {x:nx/len, y:ny/len, z:nz/len};
  }
  // Compute face centroid
  centroid() {
    const verts = this.vertices();
    const s = verts.reduce((a,v)=>({x:a.x+v.x,y:a.y+v.y,z:a.z+v.z}),{x:0,y:0,z:0});
    return {x:s.x/verts.length, y:s.y/verts.length, z:s.z/verts.length};
  }
}

export class HalfEdgeMesh {
  constructor() {
    this.vertices  = new Map(); // id -> Vertex
    this.halfEdges = new Map(); // id -> HalfEdge
    this.faces     = new Map(); // id -> Face
    this._vid = 0; this._eid = 0; this._fid = 0;
  }

  addVertex(x, y, z) {
    const v = new Vertex(this._vid++, x, y, z);
    this.vertices.set(v.id, v);
    return v;
  }

  addHalfEdge() {
    const e = new HalfEdge(this._eid++);
    this.halfEdges.set(e.id, e);
    return e;
  }

  addFace() {
    const f = new Face(this._fid++);
    this.faces.set(f.id, f);
    return f;
  }

  // Build half-edge mesh from THREE.BufferGeometry
  static fromBufferGeometry(geo) {
    const mesh = new HalfEdgeMesh();
    const pos  = geo.attributes.position.array;
    const idx  = geo.index ? geo.index.array : null;

    // Add all vertices
    const vCount = pos.length / 3;
    for (let i = 0; i < vCount; i++) {
      mesh.addVertex(pos[i*3], pos[i*3+1], pos[i*3+2]);
    }

    // Build faces from triangles
    const triCount = idx ? idx.length/3 : vCount/3;
    const edgeMap  = new Map(); // "v0_v1" -> HalfEdge

    for (let t = 0; t < triCount; t++) {
      const vi = idx
        ? [idx[t*3], idx[t*3+1], idx[t*3+2]]
        : [t*3, t*3+1, t*3+2];

      const face = mesh.addFace();
      const edges = [];

      // Create 3 half-edges for this triangle
      for (let k = 0; k < 3; k++) {
        const e = mesh.addHalfEdge();
        e.vertex = mesh.vertices.get(vi[k]);
        e.face   = face;
        if (!e.vertex.halfEdge) e.vertex.halfEdge = e;
        edges.push(e);
      }

      // Link next/prev
      for (let k = 0; k < 3; k++) {
        edges[k].next = edges[(k+1)%3];
        edges[k].prev = edges[(k+2)%3];
      }
      face.halfEdge = edges[0];

      // Register in edge map and link twins
      for (let k = 0; k < 3; k++) {
        const e    = edges[k];
        const vA   = vi[k];
        const vB   = vi[(k+1)%3];
        const key  = `${vA}_${vB}`;
        const tkey = `${vB}_${vA}`;
        edgeMap.set(key, e);
        if (edgeMap.has(tkey)) {
          const twin = edgeMap.get(tkey);
          e.twin    = twin;
          twin.twin = e;
        }
      }
    }

    return mesh;
  }

  // Convert back to THREE.BufferGeometry arrays
  toBufferGeometry() {
    const positions = [];
    const normals   = [];
    const indices   = [];
    const vertIdMap = new Map();
    let   vi = 0;

    this.vertices.forEach(v => {
      vertIdMap.set(v.id, vi++);
      positions.push(v.x, v.y, v.z);
      normals.push(0, 1, 0); // recompute after
    });

    this.faces.forEach(face => {
      const verts = face.vertices();
      if (verts.length < 3) return;
      // Fan triangulation — works for tri, quad, and any n-gon
      const ids = verts.map(v => vertIdMap.get(v.id));
      for (let i = 1; i < ids.length - 1; i++) {
        indices.push(ids[0], ids[i], ids[i+1]);
      }
    });

    return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
  }

  // ── Loop Cut ────────────────────────────────────────────────────────────────
  loopCut(halfEdge, t = 0.5) {
    const loop = halfEdge.edgeLoop();
    if (loop.length < 2) return null;

    const newVerts = [];

    // Step 1: create new vertices along each edge in the loop
    loop.forEach(e => {
      const vA = e.vertex;
      const vB = e.next ? e.next.vertex : e.vertex;
      const nv = this.addVertex(
        vA.x + (vB.x - vA.x) * t,
        vA.y + (vB.y - vA.y) * t,
        vA.z + (vB.z - vA.z) * t,
      );
      newVerts.push({ edge: e, newVert: nv });
    });

    // Step 2: split each edge at the new vertex
    newVerts.forEach(({ edge, newVert }) => {
      this._splitEdge(edge, newVert);
    });

    // Step 3: connect new verts with new edges across faces
    for (let i = 0; i < newVerts.length; i++) {
      const curr = newVerts[i];
      const next = newVerts[(i + 1) % newVerts.length];
      const nv1  = curr.newVert;
      const nv2  = next.newVert;

      // Find the face between these two new verts and split it
      // by inserting a new edge nv1 -> nv2
      const e1 = this.addHalfEdge();
      const e2 = this.addHalfEdge();
      e1.vertex = nv1; e2.vertex = nv2;
      e1.twin = e2;    e2.twin = e1;

      // Assign faces (simplified — proper face splitting handled by rebuild)
      const sharedFace = curr.edge.face;
      e1.face = sharedFace;
      e2.face = sharedFace;
    }

    return newVerts.map(nv => nv.newVert);
  }

  _splitEdge(edge, midVert) {
    // Split edge into two edges at midVert
    const twin = edge.twin;
    const e1   = this.addHalfEdge();
    e1.vertex  = midVert;
    e1.face    = edge.face;
    e1.next    = edge.next;
    e1.prev    = edge;
    edge.next.prev = e1;
    edge.next  = e1;
    midVert.halfEdge = e1;

    if (twin) {
      const e2  = this.addHalfEdge();
      e2.vertex = midVert;
      e2.face   = twin.face;
      e2.next   = twin.next;
      e2.prev   = twin;
      twin.next.prev = e2;
      twin.next = e2;
      e1.twin = twin; twin.twin = e1;
      edge.twin = e2;  e2.twin = edge;
    }
  }

  // ── Edge Slide ──────────────────────────────────────────────────────────────
  slideEdge(halfEdge, t) {
    const loop = halfEdge.edgeLoop();
    loop.forEach(e => {
      const v   = e.vertex;
      const adj = e.prev.vertex; // slide toward adjacent vertex
      v.x = v.x + (adj.x - v.x) * t * 0.1;
      v.y = v.y + (adj.y - v.y) * t * 0.1;
      v.z = v.z + (adj.z - v.z) * t * 0.1;
    });
  }

  // ── Knife Cut ───────────────────────────────────────────────────────────────
  knifeCut(planeNormal, planePoint) {
    const newVerts = [];
    this.halfEdges.forEach(e => {
      if (e.twin && e.id < e.twin.id) { // process each edge once
        const vA = e.vertex;
        const vB = e.twin.vertex;
        // Check if edge crosses the cutting plane
        const dA = (vA.x-planePoint.x)*planeNormal.x + (vA.y-planePoint.y)*planeNormal.y + (vA.z-planePoint.z)*planeNormal.z;
        const dB = (vB.x-planePoint.x)*planeNormal.x + (vB.y-planePoint.y)*planeNormal.y + (vB.z-planePoint.z)*planeNormal.z;
        if (dA * dB < 0) { // opposite sides — edge crosses plane
          const t = dA / (dA - dB);
          const nv = this.addVertex(
            vA.x + (vB.x-vA.x)*t,
            vA.y + (vB.y-vA.y)*t,
            vA.z + (vB.z-vA.z)*t,
          );
          this._splitEdge(e, nv);
          newVerts.push(nv);
        }
      }
    });
    return newVerts;
  }

  // Stats
  stats() {
    return {
      vertices:  this.vertices.size,
      halfEdges: this.halfEdges.size,
      faces:     this.faces.size,
      edges:     Math.floor(this.halfEdges.size / 2),
    };
  }


  // ── Plane Cut (reliable alternative to edge loop traversal) ──────────────
  // Cuts mesh with an axis-aligned plane — always produces clean results
  planeCut(axis='y', position=0, t=0.5) {
    const newVerts = [];
    const processed = new Set();

    this.halfEdges.forEach(e => {
      if (!e.twin) return;
      if (processed.has(e.id) || processed.has(e.twin.id)) return;
      processed.add(e.id); processed.add(e.twin.id);

      const vA = e.vertex;
      const vB = e.twin.vertex;

      const aVal = axis==='x' ? vA.x : axis==='y' ? vA.y : vA.z;
      const bVal = axis==='x' ? vB.x : axis==='y' ? vB.y : vB.z;

      // Edge crosses the cut plane
      if ((aVal < position && bVal > position) ||
          (aVal > position && bVal < position)) {
        const localT = (position - aVal) / (bVal - aVal);
        const nv = this.addVertex(
          vA.x + (vB.x - vA.x) * localT,
          vA.y + (vB.y - vA.y) * localT,
          vA.z + (vB.z - vA.z) * localT,
        );
        this._splitEdge(e, nv);
        newVerts.push(nv);
      }
    });

    return newVerts;
  }

  // ── Subdivision Surface (Catmull-Clark simplified) ──────────────────────
  subdivide() {
    const newMesh = new HalfEdgeMesh();
    // For each face: add face centroid
    const faceCentroids = new Map();
    this.faces.forEach(face => {
      const verts = face.vertices();
      const cx = verts.reduce((s,v)=>s+v.x,0)/verts.length;
      const cy = verts.reduce((s,v)=>s+v.y,0)/verts.length;
      const cz = verts.reduce((s,v)=>s+v.z,0)/verts.length;
      faceCentroids.set(face.id, newMesh.addVertex(cx,cy,cz));
    });

    // For each edge: add edge midpoint
    const edgeMids = new Map();
    const seen = new Set();
    this.halfEdges.forEach(e => {
      if (!e.twin || seen.has(e.id) || seen.has(e.twin.id)) return;
      seen.add(e.id);
      const a = e.vertex, b = e.twin.vertex;
      const mid = newMesh.addVertex((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
      edgeMids.set(e.id, mid); edgeMids.set(e.twin.id, mid);
    });

    // For each original vertex: add smoothed position
    const smoothVerts = new Map();
    this.vertices.forEach(v => {
      // Average of adjacent face centroids and edge midpoints
      const adjFaces = []; const adjEdgeMids = [];
      let e = v.halfEdge;
      let guard = 0;
      do {
        if (e.face) adjFaces.push(faceCentroids.get(e.face.id));
        const mid = edgeMids.get(e.id);
        if (mid) adjEdgeMids.push(mid);
        if (!e.twin) break;
        e = e.twin.next;
        guard++;
      } while (e !== v.halfEdge && guard < 100);

      const n = adjFaces.length;
      if (n === 0) { smoothVerts.set(v.id, newMesh.addVertex(v.x,v.y,v.z)); return; }
      const fx = adjFaces.reduce((s,f)=>s+(f?.x||0),0)/n;
      const fy = adjFaces.reduce((s,f)=>s+(f?.y||0),0)/n;
      const fz = adjFaces.reduce((s,f)=>s+(f?.z||0),0)/n;
      const mx = adjEdgeMids.reduce((s,m)=>s+(m?.x||0),0)/Math.max(adjEdgeMids.length,1);
      const my = adjEdgeMids.reduce((s,m)=>s+(m?.y||0),0)/Math.max(adjEdgeMids.length,1);
      const mz = adjEdgeMids.reduce((s,m)=>s+(m?.z||0),0)/Math.max(adjEdgeMids.length,1);
      const sv = newMesh.addVertex(
        (fx + 2*mx + (n-3)*v.x)/n,
        (fy + 2*my + (n-3)*v.y)/n,
        (fz + 2*mz + (n-3)*v.z)/n,
      );
      smoothVerts.set(v.id, sv);
    });

    // Build new quads: for each original face, for each original vertex in face
    // create quad: smoothVert -> edgeMid -> faceCentroid -> prevEdgeMid
    this.faces.forEach(face => {
      const fc = faceCentroids.get(face.id);
      const edges = face.halfEdge.faceLoop();
      for (let i=0; i<edges.length; i++) {
        const e    = edges[i];
        const ePrev= edges[(i+edges.length-1)%edges.length];
        const sv   = smoothVerts.get(e.vertex.id);
        const em   = edgeMids.get(e.id);
        const epm  = edgeMids.get(ePrev.id);
        if (!sv||!em||!fc||!epm) return;
        // quad: sv, em, fc, epm
        const f = newMesh.addFace();
        const he0=newMesh.addHalfEdge(); he0.vertex=sv; he0.face=f;
        const he1=newMesh.addHalfEdge(); he1.vertex=em; he1.face=f;
        const he2=newMesh.addHalfEdge(); he2.vertex=fc; he2.face=f;
        const he3=newMesh.addHalfEdge(); he3.vertex=epm;he3.face=f;
        he0.next=he1; he1.next=he2; he2.next=he3; he3.next=he0;
        he0.prev=he3; he1.prev=he0; he2.prev=he1; he3.prev=he2;
        f.halfEdge=he0;
        if (!sv.halfEdge) sv.halfEdge=he0;
        if (!em.halfEdge) em.halfEdge=he1;
        if (!fc.halfEdge) fc.halfEdge=he2;
        if (!epm.halfEdge) epm.halfEdge=he3;
      }
    });
    return newMesh;
  }

  // ── Extrude selected faces ────────────────────────────────────────────────
  extrudeFaces(faceIds, amount=0.3) {
    const newVerts = new Map(); // oldVertId -> newVertId
    faceIds.forEach(faceIdx => {
      const face = [...this.faces.values()][faceIdx];
      if (!face) return;
      const normal = face.normal();
      const verts  = face.vertices();
      verts.forEach(v => {
        if (!newVerts.has(v.id)) {
          const nv = this.addVertex(
            v.x + normal.x*amount,
            v.y + normal.y*amount,
            v.z + normal.z*amount,
          );
          newVerts.set(v.id, nv);
        }
      });
      // Replace face vertices with extruded vertices
      face.halfEdge.faceLoop().forEach(e => {
        const nv = newVerts.get(e.vertex.id);
        if (nv) e.vertex = nv;
      });
      // Create side faces connecting original to extruded
      const origVerts = verts;
      for (let i=0;i<origVerts.length;i++) {
        const a  = origVerts[i];
        const b  = origVerts[(i+1)%origVerts.length];
        const na = newVerts.get(a.id);
        const nb = newVerts.get(b.id);
        if (!na||!nb) continue;
        const sf = this.addFace();
        const e0=this.addHalfEdge(); e0.vertex=a;  e0.face=sf;
        const e1=this.addHalfEdge(); e1.vertex=b;  e1.face=sf;
        const e2=this.addHalfEdge(); e2.vertex=nb; e2.face=sf;
        const e3=this.addHalfEdge(); e3.vertex=na; e3.face=sf;
        e0.next=e1; e1.next=e2; e2.next=e3; e3.next=e0;
        e0.prev=e3; e1.prev=e0; e2.prev=e1; e3.prev=e2;
        sf.halfEdge=e0;
      }
    });
    return newVerts;
  }

  // ── Merge vertices by distance (weld) ────────────────────────────────────
  mergeByDistance(threshold=0.001) {
    let merged = 0;
    const verts = [...this.vertices.values()];
    const remap = new Map();
    for (let i=0;i<verts.length;i++) {
      for (let j=i+1;j<verts.length;j++) {
        if (verts[i].distanceTo(verts[j]) < threshold) {
          remap.set(verts[j].id, verts[i]);
          merged++;
        }
      }
    }
    this.halfEdges.forEach(e => {
      if (remap.has(e.vertex.id)) e.vertex = remap.get(e.vertex.id);
    });
    remap.forEach((_,id)=>this.vertices.delete(id));
    return merged;
  }



  // ── Mirror ────────────────────────────────────────────────────────────────
  // ── TARGET WELD ─────────────────────────────────────────────────────────────
  // Merge sourceVertex onto targetVertex — all edges from source rerouted to target
  targetWeld(sourceVertexId, targetVertexId) {
    const src = this.vertices.get(sourceVertexId);
    const tgt = this.vertices.get(targetVertexId);
    if (!src || !tgt || sourceVertexId === targetVertexId) return false;
    // Reroute all half-edges pointing to src → tgt
    for (const e of this.halfEdges.values()) {
      if (e.vertex === src) e.vertex = tgt;
    }
    this.vertices.delete(sourceVertexId);
    // Remove degenerate faces (faces where two verts are now the same)
    for (const [fid, face] of this.faces) {
      const verts = face.vertices();
      const unique = new Set(verts.map(v => v.id));
      if (unique.size < verts.length) this.faces.delete(fid);
    }
    return true;
  }

  // ── CHAMFER VERTEX ──────────────────────────────────────────────────────────
  // Split a vertex into multiple vertices (one per adjacent edge), creating a face
  chamferVertex(vertexId, amount = 0.1) {
    const v = this.vertices.get(vertexId);
    if (!v) return null;
    const neighbors = [];
    for (const e of this.halfEdges.values()) {
      if (e.vertex === v && e.twin) {
        const adj = e.twin.vertex;
        if (adj) neighbors.push(adj);
      }
    }
    const newVerts = neighbors.map(n => {
      const nx = v.x + (n.x - v.x) * amount;
      const ny = v.y + (n.y - v.y) * amount;
      const nz = v.z + (n.z - v.z) * amount;
      return this.addVertex(nx, ny, nz);
    });
    this.vertices.delete(vertexId);
    return newVerts;
  }

  // ── AVERAGE VERTEX ──────────────────────────────────────────────────────────
  // Smooth selected vertices by averaging positions with their neighbors
  averageVertices(vertexIds, strength = 0.5, iterations = 1) {
    const ids = new Set(vertexIds);
    for (let iter = 0; iter < iterations; iter++) {
      for (const vid of ids) {
        const v = this.vertices.get(vid);
        if (!v) continue;
        const neighbors = [];
        for (const e of this.halfEdges.values()) {
          if (e.vertex === v && e.twin?.vertex) neighbors.push(e.twin.vertex);
        }
        if (!neighbors.length) continue;
        const ax = neighbors.reduce((s, n) => s + n.x, 0) / neighbors.length;
        const ay = neighbors.reduce((s, n) => s + n.y, 0) / neighbors.length;
        const az = neighbors.reduce((s, n) => s + n.z, 0) / neighbors.length;
        v.x += (ax - v.x) * strength;
        v.y += (ay - v.y) * strength;
        v.z += (az - v.z) * strength;
      }
    }
  }

  // ── CIRCULARIZE ─────────────────────────────────────────────────────────────
  // Arrange selected vertices in a circle — keeps center of mass, projects onto circle
  circularize(vertexIds) {
    if (vertexIds.length < 3) return;
    const verts = vertexIds.map(id => this.vertices.get(id)).filter(Boolean);
    // Compute centroid
    const cx = verts.reduce((s, v) => s + v.x, 0) / verts.length;
    const cy = verts.reduce((s, v) => s + v.y, 0) / verts.length;
    const cz = verts.reduce((s, v) => s + v.z, 0) / verts.length;
    // Compute average radius
    const radius = verts.reduce((s, v) =>
      s + Math.sqrt((v.x-cx)**2 + (v.y-cy)**2 + (v.z-cz)**2), 0) / verts.length;
    // Project each vertex onto circle
    verts.forEach((v, i) => {
      const angle = (i / verts.length) * Math.PI * 2;
      const dx = v.x - cx, dz = v.z - cz;
      const len = Math.sqrt(dx*dx + dz*dz) || 1;
      v.x = cx + (dx / len) * radius;
      v.z = cz + (dz / len) * radius;
      v.y = cy; // flatten to plane
    });
  }

  // ── REORDER VERTICES ────────────────────────────────────────────────────────
  // Reindex vertex IDs in a deterministic order (by position sort)
  reorderVertices() {
    const sorted = [...this.vertices.values()].sort((a, b) =>
      a.x !== b.x ? a.x - b.x : a.y !== b.y ? a.y - b.y : a.z - b.z
    );
    const newMap = new Map();
    sorted.forEach((v, i) => {
      const newId = `v_${i}`;
      newMap.set(newId, v);
      // Update all half-edge references
      for (const e of this.halfEdges.values()) {
        if (e.vertex === v) { /* reference is same object, no update needed */ }
      }
      v.id = newId;
    });
    this.vertices = newMap;
    return sorted.length;
  }

  // ── MULTI-CUT ───────────────────────────────────────────────────────────────
  // Cut multiple edges at specified parametric positions along a path
  multiCut(edgeCuts) {
    // edgeCuts: [{ halfEdgeId, t }]
    const newVerts = [];
    for (const { halfEdgeId, t } of edgeCuts) {
      const e = this.halfEdges.get(halfEdgeId);
      if (!e || !e.vertex || !e.twin?.vertex) continue;
      const vA = e.twin.vertex, vB = e.vertex;
      const nv = this.addVertex(
        vA.x + (vB.x - vA.x) * t,
        vA.y + (vB.y - vA.y) * t,
        vA.z + (vB.z - vA.z) * t,
      );
      this._splitEdge(e, nv);
      newVerts.push(nv);
    }
    return newVerts;
  }

  // ── CONNECT COMPONENTS ──────────────────────────────────────────────────────
  // Create an edge between two vertices that share a face
  connectComponents(vertexIdA, vertexIdB) {
    const vA = this.vertices.get(vertexIdA);
    const vB = this.vertices.get(vertexIdB);
    if (!vA || !vB) return false;
    // Find a face that contains both vertices
    for (const face of this.faces.values()) {
      const fverts = face.vertices ? face.vertices() : [];
      const hasA = fverts.some(v => v.id === vertexIdA);
      const hasB = fverts.some(v => v.id === vertexIdB);
      if (hasA && hasB) {
        // Split the face by adding a new half-edge pair
        const e1 = this.addHalfEdge();
        const e2 = this.addHalfEdge();
        e1.vertex = vB; e2.vertex = vA;
        e1.twin = e2; e2.twin = e1;
        e1.face = face; e2.face = this.addFace();
        return true;
      }
    }
    return false;
  }

  // ── SNAP TOGETHER ──────────────────────────────────────────────────────────
  // Snap closest boundary vertices between two meshes within a threshold
  static snapTogether(hemA, hemB, threshold = 0.05) {
    const snapped = [];
    for (const vA of hemA.vertices.values()) {
      let best = null, bestDist = threshold;
      for (const vB of hemB.vertices.values()) {
        const d = Math.sqrt((vA.x-vB.x)**2 + (vA.y-vB.y)**2 + (vA.z-vB.z)**2);
        if (d < bestDist) { bestDist = d; best = vB; }
      }
      if (best) {
        vA.x = best.x; vA.y = best.y; vA.z = best.z;
        snapped.push({ from: vA.id, to: best.id, dist: bestDist });
      }
    }
    return snapped;
  }

  // ── PAINT SELECT (vertex region) ────────────────────────────────────────────
  // Select all vertices within a sphere (brush) at worldPos with given radius
  paintSelectVertices(worldPos, radius, existingSelection = new Set()) {
    const sel = new Set(existingSelection);
    for (const [id, v] of this.vertices) {
      const d = Math.sqrt((v.x-worldPos.x)**2 + (v.y-worldPos.y)**2 + (v.z-worldPos.z)**2);
      if (d <= radius) sel.add(id);
    }
    return sel;
  }

  // ── PAINT DESELECT ──────────────────────────────────────────────────────────
  paintDeselectVertices(worldPos, radius, existingSelection = new Set()) {
    const sel = new Set(existingSelection);
    for (const [id, v] of this.vertices) {
      const d = Math.sqrt((v.x-worldPos.x)**2 + (v.y-worldPos.y)**2 + (v.z-worldPos.z)**2);
      if (d <= radius) sel.delete(id);
    }
    return sel;
  }


  // ── PROPORTIONAL EDITING ────────────────────────────────────────────────────
  // Move selected vertices with falloff influence on nearby verts
  proportionalTransform(selectedVertIds, delta, radius, falloffType = 'smooth') {
    const selected = new Set(selectedVertIds);
    // Build influence map for all verts within radius
    const influenced = new Map();
    for (const [id, v] of this.vertices) {
      let minDist = Infinity;
      for (const selId of selected) {
        const sv = this.vertices.get(selId);
        if (!sv) continue;
        const d = Math.sqrt((v.x-sv.x)**2+(v.y-sv.y)**2+(v.z-sv.z)**2);
        if (d < minDist) minDist = d;
      }
      if (minDist <= radius) {
        const t = minDist / radius;
        let influence;
        switch (falloffType) {
          case 'smooth':   influence = 1 - 3*t*t + 2*t*t*t; break;
          case 'sphere':   influence = Math.sqrt(Math.max(0, 1 - t*t)); break;
          case 'linear':   influence = 1 - t; break;
          case 'sharp':    influence = (1 - t) * (1 - t); break;
          case 'constant': influence = 1.0; break;
          default:         influence = 1 - t;
        }
        influenced.set(id, selected.has(id) ? 1.0 : influence);
      }
    }
    // Apply transform
    for (const [id, influence] of influenced) {
      const v = this.vertices.get(id);
      if (!v) continue;
      v.x += delta.x * influence;
      v.y += delta.y * influence;
      v.z += delta.z * influence;
    }
    return influenced.size;
  }

  // ── SNAP TO SURFACE ─────────────────────────────────────────────────────────
  // Snap a vertex to the nearest point on another mesh's surface
  snapVertexToSurface(vertexId, targetMesh) {
    const v = this.vertices.get(vertexId);
    if (!v || !targetMesh?.geometry) return false;
    const pos = targetMesh.geometry.attributes.position;
    if (!pos) return false;
    let bestDist = Infinity, bestX = v.x, bestY = v.y, bestZ = v.z;
    for (let i = 0; i < pos.count; i++) {
      const tx = pos.getX(i), ty = pos.getY(i), tz = pos.getZ(i);
      const d = Math.sqrt((v.x-tx)**2+(v.y-ty)**2+(v.z-tz)**2);
      if (d < bestDist) { bestDist = d; bestX = tx; bestY = ty; bestZ = tz; }
    }
    v.x = bestX; v.y = bestY; v.z = bestZ;
    return true;
  }

  // Snap vertex to nearest vertex
  snapVertexToVertex(vertexId, targetHEM) {
    const v = this.vertices.get(vertexId);
    if (!v) return false;
    let bestDist = Infinity, best = null;
    for (const tv of targetHEM.vertices.values()) {
      const d = Math.sqrt((v.x-tv.x)**2+(v.y-tv.y)**2+(v.z-tv.z)**2);
      if (d < bestDist) { bestDist = d; best = tv; }
    }
    if (best) { v.x = best.x; v.y = best.y; v.z = best.z; return true; }
    return false;
  }

  // ── GRID FILL ────────────────────────────────────────────────────────────────
  // Fill a loop of boundary edges with a grid topology
  gridFill(boundaryVertIds) {
    if (boundaryVertIds.length < 4) return null;
    const verts = boundaryVertIds.map(id => this.vertices.get(id)).filter(Boolean);
    if (verts.length < 4) return null;
    // Find center
    const cx = verts.reduce((s,v)=>s+v.x,0)/verts.length;
    const cy = verts.reduce((s,v)=>s+v.y,0)/verts.length;
    const cz = verts.reduce((s,v)=>s+v.z,0)/verts.length;
    const center = this.addVertex(cx, cy, cz);
    // Create fan triangles from center to each edge
    const newFaces = [];
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i], b = verts[(i+1)%verts.length];
      const e1 = this.addHalfEdge(), e2 = this.addHalfEdge(), e3 = this.addHalfEdge();
      const f = this.addFace();
      e1.vertex = a; e2.vertex = b; e3.vertex = center;
      e1.next = e2; e2.next = e3; e3.next = e1;
      e1.prev = e3; e2.prev = e1; e3.prev = e2;
      e1.face = e2.face = e3.face = f;
      f.edge = e1;
      newFaces.push(f);
    }
    return newFaces;
  }

  mirror(axis='x') {
    const original = [...this.vertices.values()];
    const mirrorMap = new Map();
    original.forEach(v => {
      const nv = this.addVertex(
        axis==='x' ? -v.x : v.x,
        axis==='y' ? -v.y : v.y,
        axis==='z' ? -v.z : v.z,
      );
      mirrorMap.set(v.id, nv);
    });
    // Mirror all faces (reversed winding for correct normals)
    const origFaces = [...this.faces.values()];
    origFaces.forEach(face => {
      const verts = face.vertices().reverse();
      const mf    = this.addFace();
      const edges = verts.map(() => this.addHalfEdge());
      verts.forEach((v,i) => {
        edges[i].vertex = mirrorMap.get(v.id) || v;
        edges[i].face   = mf;
      });
      for (let i=0;i<edges.length;i++) {
        edges[i].next = edges[(i+1)%edges.length];
        edges[i].prev = edges[(i+edges.length-1)%edges.length];
      }
      mf.halfEdge = edges[0];
      edges.forEach(e => { if (!e.vertex.halfEdge) e.vertex.halfEdge = e; });
    });
    return this;
  }

  // ── Bevel edges ───────────────────────────────────────────────────────────
  // SPX_BEVEL_REAL_V2 — real edge bevel (Blender/Maya default, 1 segment).
  //   In-place adjacent-face vertex swap (extrudeFaces line 482 pattern),
  //   Case-B corner HE splice (_splitEdge line 270 pattern),
  //   n-gon corner fill for shared verts,
  //   open-boundary edges skipped,
  //   global twin restitch (fromBufferGeometry line 178 pattern).
  //   Purely additive on new geometry; NO vertex/halfEdge/face deletion
  //   (chamferVertex's deletion-without-rewire is the spike root cause).
  bevelEdges(amount = 0.1, edgeIds = null) {
    if (amount <= 0) return 0;
    const allIds = (edgeIds && edgeIds.length) ? edgeIds : [...this.halfEdges.keys()];

    // ── 1: dedupe to undirected edges; skip open boundaries ───────────────
    const undirected = new Set();
    const selectedPairs = [];
    for (const eid of allIds) {
      const e = this.halfEdges.get(eid);
      if (!e || !e.twin) continue;
      const lo = Math.min(eid, e.twin.id);
      const hi = Math.max(eid, e.twin.id);
      const key = lo + ":" + hi;
      if (undirected.has(key)) continue;
      undirected.add(key);
      if (!e.face || !e.twin.face) continue;
      selectedPairs.push(e);
    }
    if (selectedPairs.length === 0) return 0;

    // ── Inlined vector helpers ────────────────────────────────────────────
    const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
    const dot3  = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    const sub   = (a, b) => [a.x - b.x, a.y - b.y, a.z - b.z];
    const norm  = (v) => { const L = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/L, v[1]/L, v[2]/L]; };

    // Newell's method (Face.normal() at line 93 uses only first 3 verts).
    const faceNormal = (face) => {
      let nx = 0, ny = 0, nz = 0;
      const start = face.halfEdge;
      if (!start) return [0, 1, 0];
      let he = start, guard = 0;
      do {
        const a = he.vertex, b = he.next?.vertex;
        if (!a || !b) break;
        nx += (a.y - b.y) * (a.z + b.z);
        ny += (a.z - b.z) * (a.x + b.x);
        nz += (a.x - b.x) * (a.y + b.y);
        he = he.next;
        if (++guard > 1024) break;
      } while (he && he !== start);
      return norm([nx, ny, nz]);
    };

    // perp(face, edgeDir) lying IN face, sign-checked toward face interior.
    const offsetInFace = (vert, otherEnd, face) => {
      const edgeDir = norm(sub(otherEnd, vert));
      const fn = faceNormal(face);
      let perp = norm(cross(fn, edgeDir));
      let he = face.halfEdge, start = he, third = null, guard = 0;
      do {
        if (he.vertex !== vert && he.vertex !== otherEnd) { third = he.vertex; break; }
        he = he.next;
        if (++guard > 1024) break;
      } while (he && he !== start);
      if (third) {
        const toThird = sub(third, vert);
        if (dot3(perp, toThird) < 0) perp = [-perp[0], -perp[1], -perp[2]];
      }
      return {
        x: vert.x + perp[0] * amount,
        y: vert.y + perp[1] * amount,
        z: vert.z + perp[2] * amount,
        faceNormal: fn,
      };
    };

    // ── 2 & 3: spawn 4 new verts per edge; per-old-vert tracking ──────────
    const offsetsByVert = new Map();
    const bridgeQuads = [];
    const pushEntry = (vId, entry) => {
      let arr = offsetsByVert.get(vId);
      if (!arr) { arr = []; offsetsByVert.set(vId, arr); }
      arr.push(entry);
    };

    for (const e of selectedPairs) {
      const a = e.vertex, b = e.twin.vertex;
      const fA = e.face, fB = e.twin.face;
      const pa_fA = offsetInFace(a, b, fA);
      const pa_fB = offsetInFace(a, b, fB);
      const pb_fA = offsetInFace(b, a, fA);
      const pb_fB = offsetInFace(b, a, fB);
      const va_fA = this.addVertex(pa_fA.x, pa_fA.y, pa_fA.z);
      const va_fB = this.addVertex(pa_fB.x, pa_fB.y, pa_fB.z);
      const vb_fA = this.addVertex(pb_fA.x, pb_fA.y, pb_fA.z);
      const vb_fB = this.addVertex(pb_fB.x, pb_fB.y, pb_fB.z);
      pushEntry(a.id, { newVert: va_fA, face: fA, otherEnd: b });
      pushEntry(a.id, { newVert: va_fB, face: fB, otherEnd: b });
      pushEntry(b.id, { newVert: vb_fA, face: fA, otherEnd: a });
      pushEntry(b.id, { newVert: vb_fB, face: fB, otherEnd: a });
      bridgeQuads.push({ va_fA, vb_fA, vb_fB, va_fB, nA: pa_fA.faceNormal, nB: pa_fB.faceNormal });
    }

    // ── 4: in-place adjacent-face mutation (extrudeFaces + _splitEdge) ────
    const grouped = new Map();
    for (const [oldVertId, entries] of offsetsByVert) {
      for (const entry of entries) {
        const key = entry.face.id + "|" + oldVertId;
        let g = grouped.get(key);
        if (!g) { g = { face: entry.face, oldVertId, entries: [] }; grouped.set(key, g); }
        g.entries.push(entry);
      }
    }

    for (const { face, oldVertId, entries } of grouped.values()) {
      let he_at_v = null;
      {
        let he = face.halfEdge, start = he, guard = 0;
        do {
          if (he.vertex && he.vertex.id === oldVertId) { he_at_v = he; break; }
          he = he.next;
          if (++guard > 1024) break;
        } while (he && he !== start);
      }
      if (!he_at_v) continue;

      if (entries.length === 1) {
        he_at_v.vertex = entries[0].newVert;
        continue;
      }

      const nextV = he_at_v.next ? he_at_v.next.vertex : null;
      const prevV = he_at_v.prev ? he_at_v.prev.vertex : null;
      const outgoing = entries.find(en => en.otherEnd && nextV && en.otherEnd.id === nextV.id);
      const incoming = entries.find(en => en.otherEnd && prevV && en.otherEnd.id === prevV.id);
      const middle = entries.filter(en => en !== outgoing && en !== incoming);
      const ordered = [];
      if (outgoing) ordered.push(outgoing);
      ordered.push(...middle);
      if (incoming) ordered.push(incoming);
      if (ordered.length === 0) { he_at_v.vertex = entries[0].newVert; continue; }

      he_at_v.vertex = ordered[0].newVert;
      let prevHE = he_at_v;
      for (let i = 1; i < ordered.length; i++) {
        const he_corner = this.addHalfEdge();
        he_corner.vertex = ordered[i].newVert;
        he_corner.face = face;
        const nxt = prevHE.next;
        he_corner.next = nxt;
        he_corner.prev = prevHE;
        if (nxt) nxt.prev = he_corner;
        prevHE.next = he_corner;
        prevHE = he_corner;
      }
    }

    // ── 5: bridge quads (winding sign-checked against fA+fB normal) ───────
    const ringNormal = (ring) => {
      let nx = 0, ny = 0, nz = 0;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        nx += (a.y - b.y) * (a.z + b.z);
        ny += (a.z - b.z) * (a.x + b.x);
        nz += (a.x - b.x) * (a.y + b.y);
      }
      return norm([nx, ny, nz]);
    };
    for (const q of bridgeQuads) {
      const ringA = [q.va_fA, q.vb_fA, q.vb_fB, q.va_fB];
      const expected = norm([q.nA[0] + q.nB[0], q.nA[1] + q.nB[1], q.nA[2] + q.nB[2]]);
      const rn = ringNormal(ringA);
      const chosen = (dot3(rn, expected) < 0)
        ? [q.va_fB, q.vb_fB, q.vb_fA, q.va_fA]
        : ringA;
      this.addFaceFromVertices(chosen);
    }

    // ── 6: corner n-gons for shared verts (3+ new verts at v) ─────────────
    for (const [oldVertId, entries] of offsetsByVert) {
      if (entries.length < 3) continue;
      const oldVert = this.vertices.get(oldVertId);
      if (!oldVert) continue;
      const avgN = [0, 0, 0];
      for (const en of entries) {
        const fn = faceNormal(en.face);
        avgN[0] += fn[0]; avgN[1] += fn[1]; avgN[2] += fn[2];
      }
      const N = norm(avgN);
      const refV = Math.abs(N[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const T = norm(cross(N, refV));
      const B = cross(N, T);
      const angleOf = (v) => {
        const dx = v.x - oldVert.x, dy = v.y - oldVert.y, dz = v.z - oldVert.z;
        return Math.atan2(dx*B[0] + dy*B[1] + dz*B[2], dx*T[0] + dy*T[1] + dz*T[2]);
      };
      const sorted = entries.slice().sort((a, b) => angleOf(a.newVert) - angleOf(b.newVert));
      const seen = new Set();
      const ring = [];
      for (const en of sorted) {
        if (seen.has(en.newVert.id)) continue;
        seen.add(en.newVert.id);
        ring.push(en.newVert);
      }
      if (ring.length < 3) continue;
      const rn = ringNormal(ring);
      const chosen = (dot3(rn, N) < 0) ? ring.slice().reverse() : ring;
      this.addFaceFromVertices(chosen);
    }

    // ── 7: global twin restitch (fromBufferGeometry line 178 idiom) ───────
    const edgeKey = (aId, bId) => aId + "_" + bId;
    const dirMap = new Map();
    for (const he of this.halfEdges.values()) {
      if (!he.vertex || !he.next || !he.next.vertex) continue;
      dirMap.set(edgeKey(he.vertex.id, he.next.vertex.id), he);
    }
    for (const he of this.halfEdges.values()) {
      if (!he.vertex || !he.next || !he.next.vertex) continue;
      const twin = dirMap.get(edgeKey(he.next.vertex.id, he.vertex.id));
      if (twin && twin !== he) { he.twin = twin; twin.twin = he; }
    }

    // ── 8: reset vertex.halfEdge to a live HE (clears stale refs) ─────────
    for (const v of this.vertices.values()) v.halfEdge = null;
    for (const he of this.halfEdges.values()) {
      if (he.vertex && !he.vertex.halfEdge) he.vertex.halfEdge = he;
    }

    // ── 9: old verts intentionally kept in this.vertices (no delete).

    return selectedPairs.length;
  }

  // ── Inset faces ───────────────────────────────────────────────────────────
  insetFaces(faceIds, amount=0.1) {
    const newVerts = new Map();
    faceIds.forEach(faceIdx => {
      const face = [...this.faces.values()][faceIdx];
      if (!face) return;
      const verts    = face.vertices();
      const centroid = face.centroid();
      // Move each vertex toward centroid by amount
      const insetVs = verts.map(v => {
        const nx = v.x + (centroid.x - v.x) * amount;
        const ny = v.y + (centroid.y - v.y) * amount;
        const nz = v.z + (centroid.z - v.z) * amount;
        const nv = this.addVertex(nx, ny, nz);
        newVerts.set(v.id + '_' + faceIdx, nv);
        return nv;
      });
      // Create inner face
      const innerFace = this.addFace();
      const innerEdges = insetVs.map(() => this.addHalfEdge());
      insetVs.forEach((v,i) => {
        innerEdges[i].vertex = v;
        innerEdges[i].face   = innerFace;
      });
      for (let i=0;i<innerEdges.length;i++) {
        innerEdges[i].next = innerEdges[(i+1)%innerEdges.length];
        innerEdges[i].prev = innerEdges[(i+innerEdges.length-1)%innerEdges.length];
      }
      innerFace.halfEdge = innerEdges[0];
      innerEdges.forEach(e => { if (!e.vertex.halfEdge) e.vertex.halfEdge = e; });

      // Create side faces connecting original to inset
      for (let i=0;i<verts.length;i++) {
        const a  = verts[i];
        const b  = verts[(i+1)%verts.length];
        const ia = insetVs[i];
        const ib = insetVs[(i+1)%insetVs.length];
        const sf = this.addFace();
        const e0=this.addHalfEdge(); e0.vertex=a;  e0.face=sf;
        const e1=this.addHalfEdge(); e1.vertex=b;  e1.face=sf;
        const e2=this.addHalfEdge(); e2.vertex=ib; e2.face=sf;
        const e3=this.addHalfEdge(); e3.vertex=ia; e3.face=sf;
        e0.next=e1; e1.next=e2; e2.next=e3; e3.next=e0;
        e0.prev=e3; e1.prev=e0; e2.prev=e1; e3.prev=e2;
        sf.halfEdge=e0;
      }
    });
    return [...newVerts.values()];
  }


  // ── Session 6: Add face from vertex array (n-gon support) ─────────────────
  addFaceFromVertices(verts) {
    if (verts.length < 3) return null;
    const face  = this.addFace();
    const edges = verts.map(() => this.addHalfEdge());
    verts.forEach((v, i) => {
      edges[i].vertex = v;
      edges[i].face   = face;
      if (!v.halfEdge) v.halfEdge = edges[i];
    });
    for (let i = 0; i < edges.length; i++) {
      edges[i].next = edges[(i+1) % edges.length];
      edges[i].prev = edges[(i+edges.length-1) % edges.length];
    }
    face.halfEdge = edges[0];
    return face;
  }

  // ── Session 7: Triangulate all faces (for export) ─────────────────────────
  triangulateAll() {
    const tris = new HalfEdgeMesh();
    const vmap = new Map();
    this.vertices.forEach(v => {
      const nv = tris.addVertex(v.x, v.y, v.z);
      vmap.set(v.id, nv);
    });
    this.faces.forEach(face => {
      const verts = face.vertices();
      if (verts.length < 3) return;
      const mapped = verts.map(v => vmap.get(v.id));
      for (let i = 1; i < mapped.length - 1; i++) {
        tris.addFaceFromVertices([mapped[0], mapped[i], mapped[i+1]]);
      }
    });
    return tris;
  }

  // ── Session 7: Export as triangulated BufferGeometry arrays ──────────────
  toTriangulatedBufferGeometry() {
    return this.triangulateAll().toBufferGeometry();
  }


}
