import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  build: {
    target: "es2018",
    outDir: "dist",
    sourcemap: false, // nema mapa u prod
    minify: "esbuild", // najbrže i stabilno
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react")) {
              return "react-vendor";
            }
            return "vendor";
          }
        }
      }
    }
  },

  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : []
  }
}));
