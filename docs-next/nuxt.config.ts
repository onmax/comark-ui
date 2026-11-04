import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: false },
  telemetry: false,
  modules: ["@vite-hub/docs/nuxt"],
  docs: {
    base: "/",
    site: {
      name: "comark-ui",
      url: "http://localhost:4391",
      description: "Comark plugins for review documents.",
    },
    categories: ["Review blocks", "Page behavior", "Data"],
    github: { repo: "onmax/comark-ui", dir: "docs-next/content" },
    // Comark plugins are functions, so they reach the server through a file. Needs the @vite-hub/docs patch.
    parser: "./markdown.ts",
  },
});
