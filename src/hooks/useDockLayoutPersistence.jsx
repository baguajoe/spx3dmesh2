import { useEffect } from "react";

const KEY = "spx_dock_layout_v1";

export function loadDockLayout() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDockLayout(layout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout));
  } catch {}
}

export default function useDockLayoutPersistence(layout) {
  useEffect(() => {
    if (!layout) return;
    saveDockLayout(layout);
  }, [layout]);
}
