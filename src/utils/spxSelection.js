export function setSelectedObject(meshRef, obj) {
  if (!meshRef || !obj) return;
  meshRef.current = obj;
  window.__SPX_SELECTED_OBJECT__ = obj;
}

export function getSelectedObject(meshRef) {
  return meshRef?.current || window.__SPX_SELECTED_OBJECT__ || null;
}
