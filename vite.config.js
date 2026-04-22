import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/examples")) return "three-extras";
          if (id.includes("node_modules/three")) return "three-core";
          if (id.includes("/src/mesh/cloth/")) return "cloth";
          if (id.includes("/src/mesh/materials/")) return "materials";
          if (id.includes("/src/mesh/uv/")) return "uv";
          if (id.includes("/src/mesh/generators/")) return "generators";
          if (id.includes("/src/components/panels/")) return "panels";
        }
      }
    }
  }
});
