import React, { lazy, Suspense } from "react";

const PanelFallback = () => (
  <div className="lazy-panel">
    Loading...
  </div>
);

export function LazyPanel({ children }) {
  return <Suspense fallback={<PanelFallback />}>{children}</Suspense>;
}
