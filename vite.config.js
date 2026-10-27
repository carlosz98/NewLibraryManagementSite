import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // shadcn-style imports: "@/components/ui/button" -> src/components/ui/button
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // relative paths, so the built site works from any folder:
  // XAMPP's htdocs/library, GitHub Pages, or any static host
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
