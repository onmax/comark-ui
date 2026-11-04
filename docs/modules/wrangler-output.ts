import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Nuxt } from "nuxt/schema";

// Nitro writes its redirect under docs/.wrangler; root commands need their own.
const redirect = fileURLToPath(new URL("../../.wrangler/deploy/config.json", import.meta.url));

export default function wranglerOutput(_: unknown, nuxt: Nuxt) {
  nuxt.hook("nitro:init", (nitro) => {
    nitro.hooks.hook("compiled", () => {
      if (nitro.options.dev) return;
      const generated = join(nitro.options.output.serverDir, "wrangler.json");
      mkdirSync(dirname(redirect), { recursive: true });
      writeFileSync(
        redirect,
        JSON.stringify({ configPath: relative(dirname(redirect), generated) }),
      );
    });
  });
}
