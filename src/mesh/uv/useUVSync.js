import { useEffect } from "react";
import { applyCheckerToMesh } from "./UVUnwrap.js";

export default function useUVSync(mesh, checkerEnabled = false) {
  useEffect(() => {
    if (!mesh || !checkerEnabled) return;
    applyCheckerToMesh(mesh);
  }, [mesh, checkerEnabled]);
}
