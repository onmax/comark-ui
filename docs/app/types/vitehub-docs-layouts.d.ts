// @vite-hub/docs's DocsPage.vue can switch to a `docs-article` layout, which the module registers only when the docs
// don't own the app. This app owns it, so Nuxt's layouts lack the name and vue-tsc fails inside the package. Remove this
// when @vite-hub/docs types only the layouts it registers.
import type {} from "nuxt/app";

declare module "nuxt/app" {
  interface NuxtLayouts {
    "docs-article": Record<string, never>;
  }
}
