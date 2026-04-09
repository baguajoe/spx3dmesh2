import * as THREE from "three";

export function generateHairCards(strands, options = {}) {
  const {
    width       = 0.02,
    uvTileRows  = 4,
    uvTileCols  = 4,
    atlasIndex  = 0,
  } = options;

  const cards = [];
  const tileW = 1/uvTileCols, tileH = 1/uvTileRows;
  const tileU = (atlasIndex % uvTileCols) * tileW;
  const tileV = Math.floor(atlasIndex / uvTileCols) * tileH;

  // Group strands into card clusters
  const clusterSize = 8;
  for (let c=0; c<strands.length; c+=clusterSize) {
    const cluster = strands.slice(c, c+clusterSize);
    if (!cluster.length) continue;

    // Average strand into one card
    const segCount = cluster[0].points.length;
    const avgPoints = [];
    for (let i=0; i<segCount; i++) {
      const avg = new THREE.Vector3();
      cluster.forEach(s => avg.add(s.points[Math.min(i, s.points.length-1)]));
      avg.divideScalar(cluster.length);
      avgPoints.push(avg);
    }

    // Build quad strip along averaged strand
    const positions = [], uvs = [], indices = [];
    let vi = 0;

    for (let i=0; i<avgPoints.length-1; i++) {
      const p0 = avgPoints[i], p1 = avgPoints[i+1];
      const dir = p1.clone().sub(p0).normalize();
      const up  = new THREE.Vector3(0,1,0);
      const right = dir.cross(up).normalize().multiplyScalar(width*0.5);

      const tBot = i/(avgPoints.length-1);
      const tTop = (i+1)/(avgPoints.length-1);

      positions.push(
        p0.x-right.x, p0.y-right.y, p0.z-right.z,
        p0.x+right.x, p0.y+right.y, p0.z+right.z,
        p1.x-right.x, p1.y-right.y, p1.z-right.z,
        p1.x+right.x, p1.y+right.y, p1.z+right.z,
      );
      uvs.push(
        tileU,          tileV+tBot*tileH,
        tileU+tileW,    tileV+tBot*tileH,
        tileU,          tileV+tTop*tileH,
        tileU+tileW,    tileV+tTop*tileH,
      );
      indices.push(vi,vi+1,vi+2, vi+1,vi+3,vi+2);
      vi += 4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute("uv",       new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    cards.push(geo);
  }
  return cards;
}

export function buildHairCardMesh(cards, material) {
  const group = new THREE.Group(); group.name = "HairCards";
  const mat = material || new THREE.MeshStandardMaterial({
    color: "#886644", side: THREE.DoubleSide, alphaTest: 0.5,
    roughness: 0.8, metalness: 0,
  });
  cards.forEach(geo => group.add(new THREE.Mesh(geo, mat)));
  return group;
}

export function mergeHairCards(cards) {
  if (!cards.length) return null;
  let totalVerts=0, totalIdx=0;
  cards.forEach(g => {
    totalVerts += g.attributes.position.count;
    totalIdx   += g.index.count;
  });
  const positions = new Float32Array(totalVerts*3);
  const uvs       = new Float32Array(totalVerts*2);
  const indices   = [];
  let vOff=0, iOff=0;
  cards.forEach(g => {
    const pos = g.attributes.position.array;
    const uv  = g.attributes.uv.array;
    positions.set(pos, vOff*3);
    uvs.set(uv, vOff*2);
    Array.from(g.index.array).forEach(i => indices.push(i+vOff));
    vOff += g.attributes.position.count;
  });
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("uv",       new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  merged.computeVertexNormals();
  return merged;
}

export function exportHairCardsGLB(cards) {
  const merged = mergeHairCards(cards);
  if (!merged) return null;
  return merged; // Pass to existing GLB exporter
}

export function getHairCardStats(cards) {
  const totalTris = cards.reduce((s,g)=>s+Math.floor(g.index.count/3),0);
  const totalVerts = cards.reduce((s,g)=>s+g.attributes.position.count,0);
  return { cards:cards.length, triangles:totalTris, vertices:totalVerts };
}
