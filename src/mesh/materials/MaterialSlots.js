export function createMaterialSlot(id, name, color = "#cccccc") {
  return {
    id,
    name,
    visible: true,
    assignedFaces: [],
    pbr: {
      baseColor: color,
      normalMap: null,
      roughnessMap: null,
      metallicMap: null,
      aoMap: null,
      emissiveMap: null,
      roughness: 0.7,
      metallic: 0.0,
      emissive: "#000000",
      opacity: 1.0,
    },
  };
}

export function createDefaultMaterialSlots() {
  return [
    createMaterialSlot("mat_01", "Material 1", "#bfc7d5"),
  ];
}

export function cloneMaterialSlot(slot) {
  return {
    ...slot,
    assignedFaces: [...(slot.assignedFaces || [])],
    pbr: { ...(slot.pbr || {}) },
  };
}

export function cloneMaterialSlots(slots = []) {
  return slots.map(cloneMaterialSlot);
}

export function addMaterialSlot(slots = []) {
  const next = cloneMaterialSlots(slots);
  const num = next.length + 1;
  next.push(createMaterialSlot(`mat_${String(num).padStart(2, "0")}`, `Material ${num}`));
  return next;
}

export function removeMaterialSlot(slots = [], id) {
  const next = cloneMaterialSlots(slots).filter((s) => s.id !== id);
  return next.length ? next : createDefaultMaterialSlots();
}

export function updateMaterialSlot(slots = [], id, patch = {}) {
  return cloneMaterialSlots(slots).map((slot) =>
    slot.id === id
      ? {
          ...slot,
          ...patch,
          pbr: {
            ...slot.pbr,
            ...(patch.pbr || {}),
          },
        }
      : slot
  );
}

export function assignFacesToMaterial(slots = [], materialId, faces = []) {
  return cloneMaterialSlots(slots).map((slot) => {
    const next = cloneMaterialSlot(slot);
    if (slot.id === materialId) {
      next.assignedFaces = Array.from(new Set([...(next.assignedFaces || []), ...faces]));
    } else {
      next.assignedFaces = (next.assignedFaces || []).filter((f) => !faces.includes(f));
    }
    return next;
  });
}

export function unassignFacesFromMaterial(slots = [], materialId, faces = []) {
  return cloneMaterialSlots(slots).map((slot) =>
    slot.id === materialId
      ? {
          ...cloneMaterialSlot(slot),
          assignedFaces: (slot.assignedFaces || []).filter((f) => !faces.includes(f)),
        }
      : cloneMaterialSlot(slot)
  );
}

export function getActiveMaterial(slots = [], activeId = null) {
  return slots.find((s) => s.id === activeId) || slots[0] || null;
}

export function materialStats(slots = []) {
  return {
    count: slots.length,
    assignedFaceCount: slots.reduce((acc, s) => acc + (s.assignedFaces?.length || 0), 0),
  };
}

export function applyMaterialToMeshPreview(mesh, materialSlot) {
  if (!mesh || !materialSlot) return;
  const p = materialSlot.pbr || {};
  if (!mesh.material) return;

  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => {
      if (!m) return;
      if ("color" in m && p.baseColor) m.color.set(p.baseColor);
      if ("roughness" in m && typeof p.roughness === "number") m.roughness = p.roughness;
      if ("metalness" in m && typeof p.metallic === "number") m.metalness = p.metallic;
      if ("emissive" in m && p.emissive) m.emissive.set(p.emissive);
      if ("opacity" in m && typeof p.opacity === "number") {
        m.opacity = p.opacity;
        m.transparent = p.opacity < 1;
      }
      m.needsUpdate = true;
    });
    return;
  }

  const m = mesh.material;
  if ("color" in m && p.baseColor) m.color.set(p.baseColor);
  if ("roughness" in m && typeof p.roughness === "number") m.roughness = p.roughness;
  if ("metalness" in m && typeof p.metallic === "number") m.metalness = p.metallic;
  if ("emissive" in m && p.emissive) m.emissive.set(p.emissive);
  if ("opacity" in m && typeof p.opacity === "number") {
    m.opacity = p.opacity;
    m.transparent = p.opacity < 1;
  }
  m.needsUpdate = true;
}
