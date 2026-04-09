import React, { lazy, Suspense } from "react";

const PanelFallback = () => (
  <div style={{padding:8,color:"#555",fontFamily:"JetBrains Mono,monospace",fontSize:9}}>
    Loading...
  </div>
);

export function LazyPanel({ children }) {
  return <Suspense fallback={<PanelFallback />}>{children}</Suspense>;
}
