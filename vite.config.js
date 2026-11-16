import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative base so the build works at https://keenan34.github.io/ or any sub-path.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    // The raw video renders live under assets/ and are gitignored; keep Vite away from them.
    watch: { ignored: ["**/assets/**"] },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("three") || id.includes("@react-three") || id.includes("postprocessing")) return "three";
        },
      },
    },
  },
});
