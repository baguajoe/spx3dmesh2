const registry = new Map();

export function registerPanel(id, component, meta = {}) {
  if (!id || !component) {
    throw new Error("registerPanel requires id and component");
  }
  registry.set(id, { component, meta });
}

export function getPanel(id) {
  return registry.get(id) || null;
}

export function getAllPanels() {
  return Array.from(registry.entries()).map(([id, value]) => ({
    id,
    ...value,
  }));
}