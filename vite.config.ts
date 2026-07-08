import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Group react + react-dom + scheduler into a single shared vendor chunk so
// the index bundle (chrome + i18n) doesn't duplicate them on every lazy
// viewer chunk. Cached on first paint and reused by all dynamic imports.
const VENDOR_REACT = /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/;

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 1420,
    strictPort: true,
    host: '0.0.0.0',
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (VENDOR_REACT.test(id)) return "vendor-react";
          return undefined;
        },
      },
    },
  },
});
