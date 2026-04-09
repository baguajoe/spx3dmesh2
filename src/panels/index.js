// Panel lazy exports — imported by App.jsx for code splitting
// Each panel is loaded only when first opened

export const panels = {
  sculpt:     () => import("../components/MeshEditorPanel.jsx"),
  material:   () => import("../components/MaterialEditor.jsx"),
  uv:         () => import("../components/UVEditor.jsx"),
  outliner:   () => import("../components/Outliner.jsx"),
  animation:  () => import("../components/AnimationTimeline.jsx"),
  graph:      () => import("../components/GraphEditor.jsx"),
};
