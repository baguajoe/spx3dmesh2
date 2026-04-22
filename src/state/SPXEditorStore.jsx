import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import useDockLayoutPersistence, { loadDockLayout } from "../hooks/useDockLayoutPersistence.jsx";

const SPXEditorContext = createContext(null);

export function SPXEditorProvider({ children }) {
  const [dockLayout, setDockLayout] = useState(() => loadDockLayout() || {
    left: ["scene_graph"],
    right: ["skin_depth"],
    bottom: [],
    floating: []
  });

  useDockLayoutPersistence(dockLayout);

  const [activeDockedPanels, setActiveDockedPanels] = useState({
    left: "scene_graph",
    right: "skin_depth",
    bottom: null
  });

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const sceneObjectsRef = useRef([]);

  const openDockedPanel = useCallback((panelId, zone = "right") => {
    setDockLayout((prev) => {
      const next = { ...prev };
      next[zone] = Array.from(new Set([...(next[zone] || []), panelId]));
      return next;
    });

    setActiveDockedPanels((prev) => ({
      ...prev,
      [zone]: panelId
    }));
  }, []);

  const closeDockedPanel = useCallback((panelId, zone) => {
    setDockLayout((prev) => {
      const next = { ...prev };
      next[zone] = (next[zone] || []).filter((id) => id !== panelId);
      return next;
    });

    setActiveDockedPanels((prev) => ({
      ...prev,
      [zone]: prev[zone] === panelId ? null : prev[zone]
    }));
  }, []);

  const pushHistory = useCallback((entry) => {
    setHistory((prev) => [...prev, entry]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const popped = next.pop();
      setRedoStack((r) => [...r, popped]);
      if (typeof popped?.undo === "function") popped.undo();
      return next;
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const popped = next.pop();
      if (typeof popped?.redo === "function") popped.redo();
      setHistory((h) => [...h, popped]);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    dockLayout,
    activeDockedPanels,
    openDockedPanel,
    closeDockedPanel,
    history,
    redoStack,
    pushHistory,
    undo,
    redo,
    sceneObjectsRef
  }), [
    dockLayout,
    activeDockedPanels,
    openDockedPanel,
    closeDockedPanel,
    history,
    redoStack,
    pushHistory,
    undo,
    redo
  ]);

  return (
    <SPXEditorContext.Provider value={value}>
      {children}
    </SPXEditorContext.Provider>
  );
}

export function useSPXEditor() {
  const ctx = useContext(SPXEditorContext);
  if (!ctx) throw new Error("useSPXEditor must be used inside SPXEditorProvider");
  return ctx;
}
