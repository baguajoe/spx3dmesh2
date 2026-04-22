import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const PanelStoreContext = createContext(null);

export function PanelStoreProvider({ children }) {
  const [openPanels, setOpenPanels] = useState({});

  const openPanel = useCallback((id) => {
    setOpenPanels((prev) => ({ ...prev, [id]: true }));
  }, []);

  const closePanel = useCallback((id) => {
    setOpenPanels((prev) => ({ ...prev, [id]: false }));
  }, []);

  const togglePanel = useCallback((id) => {
    setOpenPanels((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const value = useMemo(
    () => ({ openPanels, openPanel, closePanel, togglePanel }),
    [openPanels, openPanel, closePanel, togglePanel]
  );

  return <PanelStoreContext.Provider value={value}>{children}</PanelStoreContext.Provider>;
}

export function usePanelStore() {
  const ctx = useContext(PanelStoreContext);
  if (!ctx) throw new Error("usePanelStore must be used inside PanelStoreProvider");
  return ctx;
}
