import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base "./" lets the built app run from any GitHub Pages sub-path.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  test: { include: ["src/**/*.test.ts", "src/**/*.test.tsx"] },
});
