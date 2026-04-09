import * as THREE from "three";

// ── Marching Cubes edge table ─────────────────────────────────────────────────
const edgeTable = new Int32Array([
0x0,0x109,0x203,0x30a,0x406,0x50f,0x605,0x70c,
0x80c,0x905,0xa0f,0xb06,0xc0a,0xd03,0xe09,0xf00,
0x190,0x99,0x393,0x29a,0x596,0x49f,0x795,0x69c,
0x99c,0x895,0xb9f,0xa96,0xd9a,0xc93,0xf99,0xe90,
0x230,0x339,0x33,0x13a,0x636,0x73f,0x435,0x53c,
0xa3c,0xb35,0x83f,0x936,0xe3a,0xf33,0xc39,0xd30,
0x3a0,0x2a9,0x1a3,0xaa,0x7a6,0x6af,0x5a5,0x4ac,
0xbac,0xaa5,0x9af,0x8a6,0xfaa,0xea3,0xda9,0xca0,
0x460,0x569,0x663,0x76a,0x66,0x16f,0x265,0x36c,
0xc6c,0xd65,0xe6f,0xf66,0x86a,0x963,0xa69,0xb60,
0x5f0,0x4f9,0x7f3,0x6fa,0x1f6,0xff,0x3f5,0x2fc,
0xdfc,0xcf5,0xfff,0xef6,0x9fa,0x8f3,0xbf9,0xaf0,
0x650,0x759,0x453,0x55a,0x256,0x35f,0x55,0x15c,
0xe5c,0xf55,0xc5f,0xd56,0xa5a,0xb53,0x859,0x950,
0x7c0,0x6c9,0x5c3,0x4ca,0x3c6,0x2cf,0x1c5,0xcc,
0xfcc,0xec5,0xdcf,0xcc6,0xbca,0xac3,0x9c9,0x8c0,
0x8c0,0x9c9,0xac3,0xbca,0xcc6,0xdcf,0xec5,0xfcc,
0xcc,0x1c5,0x2cf,0x3c6,0x4ca,0x5c3,0x6c9,0x7c0,
0x950,0x859,0xb53,0xa5a,0xd56,0xc5f,0xf55,0xe5c,
0x15c,0x55,0x35f,0x256,0x55a,0x453,0x759,0x650,
0xaf0,0xbf9,0x8f3,0x9fa,0xef6,0xfff,0xcf5,0xdfc,
0x2fc,0x3f5,0xff,0x1f6,0x6fa,0x7f3,0x4f9,0x5f0,
0xb60,0xa69,0x963,0x86a,0xf66,0xe6f,0xd65,0xc6c,
0x36c,0x265,0x16f,0x66,0x76a,0x663,0x569,0x460,
0xca0,0xda9,0xea3,0xfaa,0x8a6,0x9af,0xaa5,0xbac,
0x4ac,0x5a5,0x6af,0x7a6,0xaa,0x1a3,0x2a9,0x3a0,
0xd30,0xc39,0xf33,0xe3a,0x936,0x83f,0xb35,0xa3c,
0x53c,0x435,0x73f,0x636,0x13a,0x33,0x339,0x230,
0xe90,0xf99,0xc93,0xd9a,0xa96,0xb9f,0x895,0x99c,
0x69c,0x795,0x49f,0x596,0x29a,0x393,0x99,0x190,
0xf00,0xe09,0xd03,0xc0a,0xb06,0xa0f,0x905,0x80c,
0x70c,0x605,0x50f,0x406,0x30a,0x203,0x109,0x0
]);

// Simplified tri table (first 16 cases for core algorithm)
const triTable = [
  [], [0,8,3], [0,1,9], [1,8,3,9,8,1], [1,2,10], [0,8,3,1,2,10],
  [9,2,10,0,2,9], [2,8,3,2,10,8,10,9,8], [3,11,2], [0,11,2,8,11,0],
  [1,9,0,2,3,11], [1,11,2,1,9,11,9,8,11], [3,10,1,11,10,3],
  [0,10,1,0,8,10,8,11,10], [3,9,0,3,11,9,11,10,9], [9,8,10,10,8,11],
  [4,7,8], [4,3,0,7,3,4], [0,1,9,8,4,7], [4,1,9,4,7,1,7,3,1],
  [1,2,10,8,4,7], [3,4,7,3,0,4,1,2,10], [9,2,10,9,0,2,8,4,7],
  [2,10,9,2,9,7,2,7,3,7,9,4], [8,4,7,3,11,2], [11,4,7,11,2,4,2,0,4],
  [9,0,1,8,4,7,2,3,11], [4,7,11,9,4,11,9,11,2,9,2,1],
  [3,10,1,3,11,10,7,8,4], [1,11,10,1,4,11,1,0,4,7,11,4],
  [4,7,8,9,0,11,9,11,10,11,0,3], [4,7,11,4,11,9,9,11,10]
];

// ── Interpolate edge vertex ───────────────────────────────────────────────────
function interpVertex(isolevel, p1, p2, v1, v2) {
  if (Math.abs(isolevel - v1) < 0.00001) return p1.clone();
  if (Math.abs(isolevel - v2) < 0.00001) return p2.clone();
  if (Math.abs(v1 - v2) < 0.00001) return p1.clone();
  const mu = (isolevel - v1) / (v2 - v1);
  return new THREE.Vector3(
    p1.x + mu*(p2.x-p1.x),
    p1.y + mu*(p2.y-p1.y),
    p1.z + mu*(p2.z-p1.z),
  );
}

// ── Marching cubes on scalar field ────────────────────────────────────────────
export function marchingCubes(field, dims, spacing, isolevel = 0.5) {
  const [nx, ny, nz] = dims;
  const positions = [];
  const get = (x,y,z) => field[x + y*nx + z*nx*ny] || 0;

  for (let z=0; z<nz-1; z++) {
    for (let y=0; y<ny-1; y++) {
      for (let x=0; x<nx-1; x++) {
        // Corner positions
        const p = [
          new THREE.Vector3(x,  y,  z  ).multiplyScalar(spacing),
          new THREE.Vector3(x+1,y,  z  ).multiplyScalar(spacing),
          new THREE.Vector3(x+1,y+1,z  ).multiplyScalar(spacing),
          new THREE.Vector3(x,  y+1,z  ).multiplyScalar(spacing),
          new THREE.Vector3(x,  y,  z+1).multiplyScalar(spacing),
          new THREE.Vector3(x+1,y,  z+1).multiplyScalar(spacing),
          new THREE.Vector3(x+1,y+1,z+1).multiplyScalar(spacing),
          new THREE.Vector3(x,  y+1,z+1).multiplyScalar(spacing),
        ];
        const v = [
          get(x,y,z), get(x+1,y,z), get(x+1,y+1,z), get(x,y+1,z),
          get(x,y,z+1), get(x+1,y,z+1), get(x+1,y+1,z+1), get(x,y+1,z+1),
        ];

        let cubeIndex = 0;
        for (let i=0; i<8; i++) if (v[i] < isolevel) cubeIndex |= (1<<i);
        if (edgeTable[cubeIndex] === 0) continue;

        // Edge vertices
        const verts = new Array(12);
        if (edgeTable[cubeIndex] & 1)    verts[0]  = interpVertex(isolevel,p[0],p[1],v[0],v[1]);
        if (edgeTable[cubeIndex] & 2)    verts[1]  = interpVertex(isolevel,p[1],p[2],v[1],v[2]);
        if (edgeTable[cubeIndex] & 4)    verts[2]  = interpVertex(isolevel,p[2],p[3],v[2],v[3]);
        if (edgeTable[cubeIndex] & 8)    verts[3]  = interpVertex(isolevel,p[3],p[0],v[3],v[0]);
        if (edgeTable[cubeIndex] & 16)   verts[4]  = interpVertex(isolevel,p[4],p[5],v[4],v[5]);
        if (edgeTable[cubeIndex] & 32)   verts[5]  = interpVertex(isolevel,p[5],p[6],v[5],v[6]);
        if (edgeTable[cubeIndex] & 64)   verts[6]  = interpVertex(isolevel,p[6],p[7],v[6],v[7]);
        if (edgeTable[cubeIndex] & 128)  verts[7]  = interpVertex(isolevel,p[7],p[4],v[7],v[4]);
        if (edgeTable[cubeIndex] & 256)  verts[8]  = interpVertex(isolevel,p[0],p[4],v[0],v[4]);
        if (edgeTable[cubeIndex] & 512)  verts[9]  = interpVertex(isolevel,p[1],p[5],v[1],v[5]);
        if (edgeTable[cubeIndex] & 1024) verts[10] = interpVertex(isolevel,p[2],p[6],v[2],v[6]);
        if (edgeTable[cubeIndex] & 2048) verts[11] = interpVertex(isolevel,p[3],p[7],v[3],v[7]);

        const tris = triTable[cubeIndex % triTable.length] || [];
        for (let i=0; i<tris.length; i++) {
          if (verts[tris[i]]) positions.push(...verts[tris[i]].toArray());
        }
      }
    }
  }

  if (!positions.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.computeVertexNormals();
  return geo;
}

// ── Build scalar field from mesh ──────────────────────────────────────────────
export function meshToScalarField(mesh, resolution = 32) {
  const box    = new THREE.Box3().setFromObject(mesh);
  const size   = box.getSize(new THREE.Vector3());
  const origin = box.min.clone();
  const spacing = Math.max(size.x, size.y, size.z) / resolution;

  const nx = Math.ceil(size.x/spacing)+2;
  const ny = Math.ceil(size.y/spacing)+2;
  const nz = Math.ceil(size.z/spacing)+2;
  const field = new Float32Array(nx*ny*nz).fill(0);

  const pos = mesh.geometry.attributes.position;
  for (let i=0; i<pos.count; i++) {
    const vx = Math.floor((pos.getX(i)-origin.x)/spacing)+1;
    const vy = Math.floor((pos.getY(i)-origin.y)/spacing)+1;
    const vz = Math.floor((pos.getZ(i)-origin.z)/spacing)+1;
    if (vx>=0&&vy>=0&&vz>=0&&vx<nx&&vy<ny&&vz<nz) {
      field[vx+vy*nx+vz*nx*ny] = 1.0;
      // Fill 3x3x3 neighborhood for smooth surface
      for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++) for (let dz=-1; dz<=1; dz++) {
        const nx2=vx+dx, ny2=vy+dy, nz2=vz+dz;
        if (nx2>=0&&ny2>=0&&nz2>=0&&nx2<nx&&ny2<ny&&nz2<nz) {
          const idx = nx2+ny2*nx+nz2*nx*ny;
          const dist = Math.sqrt(dx*dx+dy*dy+dz*dz);
          field[idx] = Math.max(field[idx], 1.0-dist*0.5);
        }
      }
    }
  }
  return { field, dims:[nx,ny,nz], spacing, origin };
}

// ── Remesh mesh using marching cubes ─────────────────────────────────────────
export function marchingCubesRemesh(mesh, resolution=32, isolevel=0.5) {
  const { field, dims, spacing, origin } = meshToScalarField(mesh, resolution);
  const geo = marchingCubes(field, dims, spacing, isolevel);
  if (!geo) return mesh;
  geo.translate(origin.x, origin.y, origin.z);
  const newMesh = new THREE.Mesh(geo, mesh.material.clone());
  newMesh.name  = mesh.name + "_mc";
  return newMesh;
}

// ── Fluid surface from SPH particles ─────────────────────────────────────────
export function fluidSurfaceMesh(particles, { resolution=24, radius=0.3, isolevel=0.5 } = {}) {
  if (!particles.length) return null;

  // Bounding box
  const min = new THREE.Vector3(Infinity,Infinity,Infinity);
  const max = new THREE.Vector3(-Infinity,-Infinity,-Infinity);
  particles.forEach(p => { min.min(p.position); max.max(p.position); });
  min.subScalar(radius*2); max.addScalar(radius*2);

  const size    = max.clone().sub(min);
  const spacing = Math.max(size.x,size.y,size.z)/resolution;
  const nx = Math.ceil(size.x/spacing)+2;
  const ny = Math.ceil(size.y/spacing)+2;
  const nz = Math.ceil(size.z/spacing)+2;
  const field = new Float32Array(nx*ny*nz).fill(0);

  // Splat particles into field
  particles.forEach(p => {
    const cx = Math.floor((p.position.x-min.x)/spacing);
    const cy = Math.floor((p.position.y-min.y)/spacing);
    const cz = Math.floor((p.position.z-min.z)/spacing);
    const r  = Math.ceil(radius/spacing);
    for (let dx=-r; dx<=r; dx++) for (let dy=-r; dy<=r; dy++) for (let dz=-r; dz<=r; dz++) {
      const nx2=cx+dx, ny2=cy+dy, nz2=cz+dz;
      if (nx2<0||ny2<0||nz2<0||nx2>=nx||ny2>=ny||nz2>=nz) continue;
      const d = Math.sqrt(dx*dx+dy*dy+dz*dz)*spacing;
      if (d < radius) {
        const idx = nx2+ny2*nx+nz2*nx*ny;
        field[idx] = Math.max(field[idx], 1.0 - d/radius);
      }
    }
  });

  const geo = marchingCubes(field, [nx,ny,nz], spacing, isolevel);
  if (!geo) return null;
  geo.translate(min.x, min.y, min.z);
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: "#2255ff", roughness:0.1, metalness:0.0,
    transparent:true, opacity:0.8,
  }));
}

export function getMarchingCubesStats(geo) {
  if (!geo) return { vertices:0, triangles:0 };
  return {
    vertices:  geo.attributes.position?.count || 0,
    triangles: geo.index ? Math.floor(geo.index.count/3) : Math.floor((geo.attributes.position?.count||0)/3),
  };
}
