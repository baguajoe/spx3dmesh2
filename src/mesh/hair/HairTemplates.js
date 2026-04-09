export function createHairCatalog() {
  return [

    // ---- SCALP HAIR ----
    { id: "fade", label: "Fade" },
    { id: "afro", label: "Afro" },
    { id: "waves", label: "Waves" },
    { id: "curls", label: "Curls" },
    { id: "layered_curls", label: "Layered Curls" },
    { id: "straight", label: "Straight" },
    { id: "long_straight", label: "Long Straight" },
    { id: "bob", label: "Bob" },
    { id: "ponytail", label: "Ponytail" },
    { id: "bun", label: "Bun" },
    { id: "high_bun", label: "High Bun" },
    { id: "puffs", label: "Puffs" },

    { id: "locs", label: "Locs" },
    { id: "starter_locs", label: "Starter Locs" },
    { id: "freeform_locs", label: "Freeform Locs" },

    { id: "twists", label: "Twists" },
    { id: "two_strand_twists", label: "Two Strand Twists" },

    { id: "braids", label: "Braids" },
    { id: "box_braids", label: "Box Braids" },
    { id: "cornrows", label: "Cornrows" },

    { id: "bantu_knots", label: "Bantu Knots" },
    { id: "half_up", label: "Half Up Half Down" },

    // ---- FACIAL HAIR ----
    { id: "stubble", label: "Stubble" },
    { id: "goatee", label: "Goatee" },
    { id: "full_beard", label: "Full Beard" },
    { id: "boxed_beard", label: "Boxed Beard" },
    { id: "chin_strap", label: "Chin Strap" },
    { id: "mustache", label: "Mustache" },
    { id: "handlebar", label: "Handlebar Mustache" },
    { id: "soul_patch", label: "Soul Patch" },
    { id: "sideburns", label: "Sideburns" },

    // ---- BROWS ----
    { id: "eyebrows", label: "Eyebrows" },
    { id: "arched_brows", label: "Arched Brows" },
    { id: "thick_brows", label: "Thick Brows" },
    { id: "thin_brows", label: "Thin Brows" },

  ];
}

function ringPoints(count = 8, radius = 0.5, y = 0) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    pts.push({
      x: Math.cos(t) * radius,
      y,
      z: Math.sin(t) * radius,
    });
  }
  return pts;
}

export function createHairGuides(type = "fade", {
  density = 24,
  length = 0.7,
  width = 0.12,
  clump = 0.2,
  curl = 0.15,
} = {}) {
  const guides = [];

  if (type === "fade") {
    const pts = ringPoints(Math.max(10, density), 0.42, 0.82);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      guides.push({
        root: { x: p.x, y: p.y, z: p.z },
        dir: { x: 0, y: 0.35, z: 0 },
        length: length * 0.45,
        width: width * 0.75,
        bend: 0.02,
      });
    }
  } else if (type === "afro") {
    const pts = ringPoints(Math.max(14, density), 0.48, 0.9);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      guides.push({
        root: { x: p.x, y: p.y, z: p.z },
        dir: { x: p.x * 0.15, y: 0.7, z: p.z * 0.15 },
        length: length * 1.15,
        width: width * 1.15,
        bend: curl * 1.2,
      });
    }
    guides.push({
      root: { x: 0, y: 1.02, z: 0 },
      dir: { x: 0, y: 0.9, z: 0 },
      length: length * 1.25,
      width: width * 1.2,
      bend: curl,
    });
  } else if (type === "twists" || type === "locs" || type === "braids") {
    const pts = ringPoints(Math.max(12, density), 0.44, 0.9);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const side = i % 2 === 0 ? 1 : -1;
      guides.push({
        root: { x: p.x, y: p.y, z: p.z },
        dir: { x: p.x * 0.05 + side * clump * 0.08, y: 0.9, z: p.z * 0.05 },
        length: length * (type === "braids" ? 1.45 : 1.2),
        width: width * (type === "locs" ? 0.7 : 0.52),
        bend: type === "braids" ? 0.03 : 0.07,
      });
    }
  } else if (type === "straight" || type === "curls") {
    const pts = ringPoints(Math.max(14, density), 0.47, 0.9);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      guides.push({
        root: { x: p.x, y: p.y, z: p.z },
        dir: { x: 0, y: 0.8, z: 0 },
        length: length * 1.35,
        width: width * 0.9,
        bend: type === "curls" ? curl * 1.6 : 0.02,
      });
    }
  } else if (type === "beard") {
    for (let i = 0; i < density; i++) {
      const t = i / Math.max(1, density - 1);
      guides.push({
        root: { x: (t - 0.5) * 0.55, y: 0.2 + Math.sin(t * Math.PI) * 0.05, z: 0.42 },
        dir: { x: 0, y: -0.45, z: 0.08 },
        length: length * 0.85,
        width: width * 0.7,
        bend: 0.04,
      });
    }
  } else if (type === "eyebrows") {
    for (let i = 0; i < Math.max(8, Math.floor(density / 2)); i++) {
      const t = i / Math.max(1, Math.floor(density / 2) - 1);
      guides.push({
        root: { x: -0.22 + t * 0.18, y: 0.58 + Math.sin(t * Math.PI) * 0.02, z: 0.46 },
        dir: { x: 0.08, y: 0.02, z: 0.01 },
        length: length * 0.18,
        width: width * 0.22,
        bend: 0.01,
      });
      guides.push({
        root: { x: 0.04 + t * 0.18, y: 0.58 + Math.sin((1 - t) * Math.PI) * 0.02, z: 0.46 },
        dir: { x: -0.08, y: 0.02, z: 0.01 },
        length: length * 0.18,
        width: width * 0.22,
        bend: 0.01,
      });
    }
  }

  return guides;
}
