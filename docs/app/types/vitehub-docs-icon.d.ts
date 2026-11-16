// @vite-hub/docs's icon-stroke plugin sets `icon.customize` in the app config, but Nuxt types the app config from its
// values, which leave `customize` out, so vue-tsc fails inside the package. Remove this when @vite-hub/docs declares it.
import type {} from "nuxt/schema";

declare module "nuxt/schema" {
  interface CustomAppConfig {
    icon?: { customize?: (content: string, name?: string, prefix?: string) => string };
  }
}
