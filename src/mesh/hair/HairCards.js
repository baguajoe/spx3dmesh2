import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { createHairGuides } from "./HairTemplates.js";
import { createHairMaterial, applyHairMaterial } from "./HairMaterials.js";

function cardGeometry(width = 0.12, length = 0.8, bend = 0.08, segments = 6) {
  const geo = new THREE.PlaneGeometry(width, length, 1, segments);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + length / 2) / length;
    const z = Math.sin(t * Math.PI) * bend;
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function orientCard(mesh, guide) {
  mesh.position.set(guide.root.x, guide.root.y, guide.root.z);
  mesh.lookAt(
    guide.root.x + guide.dir.x,
    guide.root.y + guide.dir.y,
    guide.root.z + guide.dir.z
  );
}

export function generateHairCardsGroup(type = "fade", {
  density = 24,
  length = 0.7,
  width = 0.12,
  clump = 0.2,
  curl = 0.15,
  rootColor = "#1f1612",
  tipColor = "#6b4a33",
} = {}) {
  const group = new THREE.Group();
  group.name = `hair_${type}`;

  const guides = createHairGuides(type, { density, length, width, clump, curl });
  const sharedMat = createHairMaterial({ rootColor, tipColor, opacity: 1 });

  guides.forEach((guide, i) => {
    const geo = cardGeometry(guide.width || width, guide.length || length, guide.bend || curl);
    const mesh = new THREE.Mesh(geo, sharedMat);
    mesh.name = `hair_card_${i}`;
    orientCard(mesh, guide);
    group.add(mesh);
  });

  return group;
}

export function getHairCardStats(group) {
  let cards = 0;
  let verts = 0;
  group?.traverse((obj) => {
    if (obj?.isMesh) {
      cards += 1;
      verts += obj.geometry?.attributes?.position?.count || 0;
    }
  });
  return { cards, verts };
}

export function exportHairCardsGLB(group) {
  return new Promise((resolve, reject) => {
    if (!group) {
      reject(new Error("No hair group provided"));
      return;
    }
    const exporter = new GLTFExporter();
    exporter.parse(
      group,
      (result) => resolve(result),
      (error) => reject(error),
      { binary: false }
    );
  });
}

export function recolorHairGroup(group, opts = {}) {
  return applyHairMaterial(group, opts);
}
