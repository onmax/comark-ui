import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Nuxt } from "nuxt/schema";
import * as v from "valibot";

// Let Wrangler commands run from the monorepo root use the docs build output.
const root = new URL("../", import.meta.url);

export default function wranglerOutput(_: unknown, nuxt: Nuxt) {
  nuxt.hook("nitro:init", (nitro) => {
    nitro.hooks.hook("compiled", () => {
      if (nitro.options.dev) return;
      const generated = join(nitro.options.output.serverDir, "wrangler.json");
      const config = v.parse(
        v.looseObject({ compatibility_flags: v.array(v.string()) }),
        JSON.parse(readFileSync(generated, "utf8")),
      );
      // The compatibility date selects modern Node APIs; ViteHub and Nitro 2 add conflicting legacy flags.
      config.compatibility_flags = config.compatibility_flags.filter(
        (flag) => flag !== "nodejs_compat_v2" && flag !== "no_nodejs_compat_v2",
      );
      writeFileSync(generated, JSON.stringify(config, null, 2));
      const redirect = fileURLToPath(new URL("../.wrangler/deploy/config.json", root));
      mkdirSync(dirname(redirect), { recursive: true });
      writeFileSync(
        redirect,
        JSON.stringify({ configPath: relative(dirname(redirect), generated) }),
      );
    });
  });
}
