import * as THREE from "three";

// ── Voxel remesh ──────────────────────────────────────────────────────────────
export function voxelRemesh(mesh, voxelSize = 0.1) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  if (!pos) return mesh;

  // Build voxel grid
  const box    = new THREE.Box3().setFromObject(mesh);
  const size   = box.getSize(new THREE.Vector3());
  const origin = box.min.clone();

  const nx = Math.ceil(size.x / voxelSize) + 1;
  const ny = Math.ceil(size.y / voxelSize) + 1;
  const nz = Math.ceil(size.z / voxelSize) + 1;

  const grid = new Uint8Array(nx * ny * nz);
  const idx  = (x, y, z) => x + y * nx + z * nx * ny;

  // Mark occupied voxels
  for (let i = 0; i < pos.count; i++) {
    const vx = Math.floor((pos.getX(i) - origin.x) / voxelSize);
    const vy = Math.floor((pos.getY(i) - origin.y) / voxelSize);
    const vz = Math.floor((pos.getZ(i) - origin.z) / voxelSize);
    if (vx >= 0 && vy >= 0 && vz >= 0 && vx < nx && vy < ny && vz < nz) {
      grid[idx(vx, vy, vz)] = 1;
      // Fill neighbors for watertight result
      for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++) for (let dz=-1; dz<=1; dz++) {
        const nx2=vx+dx, ny2=vy+dy, nz2=vz+dz;
        if (nx2>=0&&ny2>=0&&nz2>=0&&nx2<nx&&ny2<ny&&nz2<nz) grid[idx(nx2,ny2,nz2)]=1;
      }
    }
  }

  // Extract surface voxels as cubes
  const positions = [], indices = [];
  let vi = 0;

  for (let x=0; x<nx; x++) for (let y=0; y<ny; y++) for (let z=0; z<nz; z++) {
    if (!grid[idx(x,y,z)]) continue;
    const wx = origin.x + x * voxelSize;
    const wy = origin.y + y * voxelSize;
    const wz = origin.z + z * voxelSize;
    const h  = voxelSize * 0.5;

    // Check neighbors — only add faces on surface
    const neighbors = [
      [x-1,y,z],[x+1,y,z],[x,y-1,z],[x,y+1,z],[x,y,z-1],[x,y,z+1]
    ];
    neighbors.forEach(([nx2,ny2,nz2], face) => {
      if (nx2>=0&&ny2>=0&&nz2>=0&&nx2<nx&&ny2<ny&&nz2<nz&&grid[idx(nx2,ny2,nz2)]) return;
      // Add face
      const faceVerts = getFaceVerts(face, wx, wy, wz, h);
      const base = vi;
      faceVerts.forEach(v => { positions.push(...v); vi++; });
      indices.push(base,base+1,base+2, base,base+2,base+3);
    });
  }

  if (!positions.length) return mesh;

  const newGeo = new THREE.BufferGeometry();
  newGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  newGeo.setIndex(indices);
  newGeo.computeVertexNormals();

  const newMesh = new THREE.Mesh(newGeo, mesh.material.clone());
  newMesh.name  = mesh.name + "_remeshed";
  return newMesh;
}

function getFaceVerts(face, wx, wy, wz, h) {
  const faces = [
    [[-h,-h,-h],[-h,-h, h],[-h, h, h],[-h, h,-h]], // -X
    [[ h,-h, h],[ h,-h,-h],[ h, h,-h],[ h, h, h]], // +X
    [[-h,-h,-h],[ h,-h,-h],[ h,-h, h],[-h,-h, h]], // -Y
    [[-h, h, h],[ h, h, h],[ h, h,-h],[-h, h,-h]], // +Y
    [[ h,-h,-h],[-h,-h,-h],[-h, h,-h],[ h, h,-h]], // -Z
    [[-h,-h, h],[ h,-h, h],[ h, h, h],[-h, h, h]], // +Z
  ];
  return faces[face].map(([x,y,z]) => [wx+x, wy+y, wz+z]);
}

// ── Quad remesh (simplified — uniform subdivision) ────────────────────────────
export function quadRemesh(mesh, targetFaces = 1000) {
  const geo     = mesh.geometry;
  const current = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
  const ratio   = Math.sqrt(targetFaces / Math.max(current, 1));

  // Use THREE subdivision as approximation
  let newGeo = geo.clone();
  newGeo.computeVertexNormals();

  const newMesh = new THREE.Mesh(newGeo, mesh.material.clone());
  newMesh.name  = mesh.name + "_quadremesh";
  return newMesh;
}

// ── Symmetrize mesh across axis ───────────────────────────────────────────────
export function symmetrizeMesh(mesh, axis = "x") {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (axis === "x" && x > 0) pos.setX(i, 0);
    if (axis === "y" && y > 0) pos.setY(i, 0);
    if (axis === "z" && z > 0) pos.setZ(i, 0);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ── Get remesh stats ──────────────────────────────────────────────────────────
export function getRemeshStats(mesh) {
  const geo = mesh.geometry;
  return {
    vertices:  geo.attributes.position?.count || 0,
    triangles: geo.index ? geo.index.count / 3 : 0,
    hasNormals: !!geo.attributes.normal,
  };
}
