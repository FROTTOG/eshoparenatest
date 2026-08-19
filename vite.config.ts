import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts: true,
    headers: {
      "X-Frame-Options": "ALLOWALL",
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8788",
        changeOrigin: true,
      },
    },
  },
});
