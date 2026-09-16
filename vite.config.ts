import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** GitHub Pages serves 404.html for unknown paths — copy the SPA shell so deep links work. */
function spaFallback404(): Plugin {
  return {
    name: "spa-fallback-404",
    closeBundle() {
      const index = resolve("dist/index.html");
      if (existsSync(index)) {
        copyFileSync(index, resolve("dist/404.html"));
      }
    },
  };
}

export default defineConfig({
  base: "/vellum-lite/",
  plugins: [react(), tailwindcss(), spaFallback404()],
});
