import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Split heavy vendor libraries into named chunks so the browser can cache
// them across viewer / dialog switches. Each pattern matches its full
// node_modules subtree (not just the package root) so transitive imports
// stay together.
const VENDOR_REACT = /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/;
const VENDOR_THREE = /[\\/]node_modules[\\/]three[\\/]/;
const VENDOR_PDFJS = /[\\/]node_modules[\\/]pdfjs-dist[\\/]/;
const VENDOR_CAD = /[\\/]node_modules[\\/]@mlightcad[\\/]/;
const VENDOR_RICH_TEXT = /[\\/]node_modules[\\/](marked|papaparse|diff|js-yaml)[\\/]/;

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
          if (VENDOR_THREE.test(id)) return "vendor-three";
          if (VENDOR_PDFJS.test(id)) return "vendor-pdf";
          if (VENDOR_CAD.test(id)) return "vendor-cad";
          if (VENDOR_RICH_TEXT.test(id)) return "vendor-rich-text";
          return undefined;
        },
      },
    },
  },
});
