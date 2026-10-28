import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Nuxt } from "nuxt/schema";

// Let Wrangler commands run from the monorepo root use the docs build output.
const root = new URL("../", import.meta.url);

export default function wranglerOutput(_: unknown, nuxt: Nuxt) {
  nuxt.hook("nitro:init", (nitro) => {
    nitro.hooks.hook("compiled", () => {
      if (nitro.options.dev) return;
      const generated = join(nitro.options.output.serverDir, "wrangler.json");
      const redirect = fileURLToPath(new URL("../.wrangler/deploy/config.json", root));
      mkdirSync(dirname(redirect), { recursive: true });
      writeFileSync(
        redirect,
        JSON.stringify({ configPath: relative(dirname(redirect), generated) }),
      );
    });
  });
}
