import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router")) {
            return "react";
          }
          if (id.includes("node_modules/qrcode")) return "qr";
          if (id.includes("/src/pages/Admin")) return "admin";
        },
      },
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8788",
        changeOrigin: true,
      },
    },
  },
});
