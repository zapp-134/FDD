import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// removed lovable-tagger import (dev-only tagging plugin removed)

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // lovabled dev plugin removed; keep only react() in plugins for now
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
