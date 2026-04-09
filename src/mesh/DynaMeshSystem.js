import * as THREE from "three";

// ── DynaMesh settings ─────────────────────────────────────────────────────────
export function createDynaMeshSettings(options = {}) {
  return {
    enabled:    false,
    resolution: options.resolution || 128,
    smooth:     options.smooth     || 0,
    project:    options.project    || true,
    groups:     options.groups     || false,
  };
}

// ── Compute target edge length from resolution ────────────────────────────────
function resolutionToEdgeLength(resolution, meshSize) {
  return meshSize / resolution;
}

// ── Get mesh bounding box size ────────────────────────────────────────────────
function getMeshSize(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  return box.getSize(new THREE.Vector3()).length();
}

// ── Uniform voxel remesh (DynaMesh core) ──────────────────────────────────────
export function dynaMeshRemesh(mesh, settings) {
  const { resolution, smooth } = settings;
  const geo  = mesh.geometry;
  const pos  = geo.attributes.position;
  if (!pos) return mesh;

  const meshSize  = getMeshSize(mesh);
  const voxelSize = resolutionToEdgeLength(resolution, meshSize);

  // Build occupancy grid
  const box    = new THREE.Box3().setFromObject(mesh);
  const origin = box.min.clone();
  const size   = box.getSize(new THREE.Vector3());

  const nx = Math.ceil(size.x / voxelSize) + 2;
  const ny = Math.ceil(size.y / voxelSize) + 2;
  const nz = Math.ceil(size.z / voxelSize) + 2;
  const grid   = new Uint8Array(nx * ny * nz);
  const getIdx = (x, y, z) => x + y * nx + z * nx * ny;

  // Rasterize mesh triangles into grid
  const idx = geo.index;
  if (idx) {
    const arr = idx.array;
    for (let i = 0; i < arr.length; i += 3) {
      const va = new THREE.Vector3(pos.getX(arr[i]),   pos.getY(arr[i]),   pos.getZ(arr[i]));
      const vb = new THREE.Vector3(pos.getX(arr[i+1]), pos.getY(arr[i+1]), pos.getZ(arr[i+1]));
      const vc = new THREE.Vector3(pos.getX(arr[i+2]), pos.getY(arr[i+2]), pos.getZ(arr[i+2]));

      // Fill triangle bounding box in grid
      const minX = Math.max(0, Math.floor((Math.min(va.x,vb.x,vc.x)-origin.x)/voxelSize)-1);
      const maxX = Math.min(nx-1, Math.ceil((Math.max(va.x,vb.x,vc.x)-origin.x)/voxelSize)+1);
      const minY = Math.max(0, Math.floor((Math.min(va.y,vb.y,vc.y)-origin.y)/voxelSize)-1);
      const maxY = Math.min(ny-1, Math.ceil((Math.max(va.y,vb.y,vc.y)-origin.y)/voxelSize)+1);
      const minZ = Math.max(0, Math.floor((Math.min(va.z,vb.z,vc.z)-origin.z)/voxelSize)-1);
      const maxZ = Math.min(nz-1, Math.ceil((Math.max(va.z,vb.z,vc.z)-origin.z)/voxelSize)+1);

      for (let x=minX; x<=maxX; x++)
        for (let y=minY; y<=maxY; y++)
          for (let z=minZ; z<=maxZ; z++)
            grid[getIdx(x,y,z)] = 1;
    }
  } else {
    // No index — fill from vertices
    for (let i = 0; i < pos.count; i++) {
      const vx = Math.floor((pos.getX(i)-origin.x)/voxelSize);
      const vy = Math.floor((pos.getY(i)-origin.y)/voxelSize);
      const vz = Math.floor((pos.getZ(i)-origin.z)/voxelSize);
      if (vx>=0&&vy>=0&&vz>=0&&vx<nx&&vy<ny&&vz<nz) {
        grid[getIdx(vx,vy,vz)] = 1;
        // Fill 3x3 neighborhood
        for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++) for (let dz=-1; dz<=1; dz++) {
          const nx2=vx+dx, ny2=vy+dy, nz2=vz+dz;
          if (nx2>=0&&ny2>=0&&nz2>=0&&nx2<nx&&ny2<ny&&nz2<nz) grid[getIdx(nx2,ny2,nz2)]=1;
        }
      }
    }
  }

  // Extract surface using marching cubes-lite (dual contouring simplified)
  const positions = [], indices = [];
  let vi = 0;

  for (let x=0; x<nx-1; x++) for (let y=0; y<ny-1; y++) for (let z=0; z<nz-1; z++) {
    if (!grid[getIdx(x,y,z)]) continue;
    const wx = origin.x + x*voxelSize + voxelSize*0.5;
    const wy = origin.y + y*voxelSize + voxelSize*0.5;
    const wz = origin.z + z*voxelSize + voxelSize*0.5;
    const h  = voxelSize*0.5;

    // Check 6 faces
    const neighbors = [
      [x-1,y,z,0],[x+1,y,z,1],[x,y-1,z,2],[x,y+1,z,3],[x,y,z-1,4],[x,y,z+1,5]
    ];
    neighbors.forEach(([nx2,ny2,nz2,face]) => {
      if (nx2<0||ny2<0||nz2<0||nx2>=nx||ny2>=ny||nz2>=nz) return;
      if (grid[getIdx(nx2,ny2,nz2)]) return;
      const fv = getFaceVerts(face, wx, wy, wz, h);
      const base = vi;
      fv.forEach(v => { positions.push(...v); vi++; });
      indices.push(base,base+1,base+2, base,base+2,base+3);
    });
  }

  if (!positions.length) return mesh;

  const newGeo = new THREE.BufferGeometry();
  newGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  newGeo.setIndex(indices);
  newGeo.computeVertexNormals();

  // Apply smoothing passes
  if (smooth > 0) smoothGeometry(newGeo, smooth);

  const newMesh = new THREE.Mesh(newGeo, mesh.material.clone());
  newMesh.name  = mesh.name;
  newMesh.position.copy(mesh.position);
  newMesh.rotation.copy(mesh.rotation);
  newMesh.scale.copy(mesh.scale);
  return newMesh;
}

function getFaceVerts(face, wx, wy, wz, h) {
  const faces = [
    [[-h,-h,-h],[-h,-h, h],[-h, h, h],[-h, h,-h]],
    [[ h,-h, h],[ h,-h,-h],[ h, h,-h],[ h, h, h]],
    [[-h,-h,-h],[ h,-h,-h],[ h,-h, h],[-h,-h, h]],
    [[-h, h, h],[ h, h, h],[ h, h,-h],[-h, h,-h]],
    [[ h,-h,-h],[-h,-h,-h],[-h, h,-h],[ h, h,-h]],
    [[-h,-h, h],[ h,-h, h],[ h, h, h],[-h, h, h]],
  ];
  return faces[face].map(([x,y,z]) => [wx+x, wy+y, wz+z]);
}

function smoothGeometry(geo, iterations) {
  const pos    = geo.attributes.position;
  const idx    = geo.index;
  if (!idx) return;
  const arr    = idx.array;

  for (let iter = 0; iter < iterations; iter++) {
    const newPos  = new Float32Array(pos.array.length);
    const counts  = new Uint32Array(pos.count);

    for (let i = 0; i < arr.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const ai = arr[i+k], bi = arr[i+(k+1)%3];
        newPos[ai*3]   += pos.getX(bi); newPos[ai*3+1] += pos.getY(bi); newPos[ai*3+2] += pos.getZ(bi);
        newPos[bi*3]   += pos.getX(ai); newPos[bi*3+1] += pos.getY(ai); newPos[bi*3+2] += pos.getZ(ai);
        counts[ai]++; counts[bi]++;
      }
    }

    for (let i = 0; i < pos.count; i++) {
      if (counts[i] > 0) {
        pos.setXYZ(i,
          pos.getX(i)*0.5 + (newPos[i*3]/counts[i])*0.5,
          pos.getY(i)*0.5 + (newPos[i*3+1]/counts[i])*0.5,
          pos.getZ(i)*0.5 + (newPos[i*3+2]/counts[i])*0.5,
        );
      }
    }
    pos.needsUpdate = true;
  }
  geo.computeVertexNormals();
}

// ── Auto-remesh on transform change ──────────────────────────────────────────
export function checkDynaMeshTrigger(mesh, settings, prevMatrix) {
  if (!settings.enabled) return false;
  if (!prevMatrix) return false;
  const diff = mesh.matrix.clone().multiply(prevMatrix.clone().invert());
  const pos  = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scale = new THREE.Vector3();
  diff.decompose(pos, quat, scale);
  // Trigger if moved more than voxel size
  const meshSize  = getMeshSize(mesh);
  const threshold = meshSize / settings.resolution;
  return pos.length() > threshold * 2;
}

// ── Get DynaMesh stats ────────────────────────────────────────────────────────
export function getDynaMeshStats(mesh) {
  const geo = mesh.geometry;
  return {
    vertices:  geo.attributes.position?.count || 0,
    triangles: geo.index ? Math.floor(geo.index.count/3) : 0,
    meshSize:  getMeshSize(mesh).toFixed(3),
  };
}
