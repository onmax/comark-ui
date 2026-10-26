import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Nuxt } from "nuxt/schema";

// What the ViteHub preview build (pilot/comark-plugins, installed from pkg.pr.new) needs around it to build this site
// on Nuxt 4, where Nitro 2 runs on h3 1. Each block names what it works around, so it can go when ViteHub fixes that. With build 78c9348 the `event.url` shim,
// the dev-token fix and the Auth type declaration are gone; what stays is below.
const root = new URL("../", import.meta.url);

type Resolver = {
  resolve: (id: string, importer?: string, options?: object) => Promise<unknown>;
};
const resolver = (
  name: string,
  resolveId: (this: Resolver, id: string, importer?: string, options?: object) => unknown,
) => ({
  name,
  resolveId,
});

export default function viteHubPilot(_: unknown, nuxt: Nuxt) {
  // ViteHub registers this alias in Nitro, but Nuxt 4 also needs it to type its generated auth route.
  nuxt.options.alias["#vitehub/auth/server"] = fileURLToPath(
    import.meta.resolve("vite-hub/auth/server"),
  );

  // Auth adds a client plugin for its Vue composables (useAuth and the like), which this site never calls: sign-in is a
  // plain fetch (server/routes/sign-in.get.ts). Left in, every visitor downloads the better-auth client and hydrates later.
  nuxt.hook("app:resolve", (app) => {
    app.plugins = app.plugins.filter((plugin) => !/@vite-hub[/+]auth.*vue-nuxt/.test(plugin.src));
  });

  // The Workspace's Nitro plugin is added as `.vitehub/nitro/workspace/plugin.ts`, which Nitro reads from server/.
  nuxt.hook("nitro:config", (config) => {
    config.plugins = config.plugins?.map((plugin) =>
      plugin?.startsWith(".vitehub/") ? fileURLToPath(new URL(plugin, root)) : plugin,
    );
  });

  // `nuxt dev` leaves ViteHub's packages external. Their pnpm folders are named after the URLs they install from, and Nitro
  // mangles those paths, so Node can't load them; Auth's Nitro plugin also needs Nitro's alias for `#vitehub/env/server`.
  // Bundled, both work.
  nuxt.hook("nitro:config", (config) => {
    if (!nuxt.options.dev) return;
    const externals = (config.externals ??= {});
    externals.inline = [...(externals.inline ?? []), (id: string) => /vite-hub/.test(id)];
    // Nitro's own dev shim for `cloudflare:workers` only applies when its preset is `cloudflare-dev`, which the cloudflare
    // preset of ViteHub's module doesn't select under `nuxt dev`, and Nitro treats the scheme as external before aliases.
    const shim = fileURLToPath(new URL("./shims/cloudflare-workers.dev.ts", import.meta.url));
    const rollup = (config.rollupConfig ??= {});
    // SAFETY: a Rollup plugin; Nitro's own type for the list is a union of Rollup's and Rolldown's.
    rollup.plugins = [
      {
        // Rollup asks `external` about the raw specifier before any plugin resolves it, so the import is rewritten instead.
        name: "docs:cloudflare-workers-shim",
        transform: (code: string) =>
          code.includes("cloudflare:workers")
            ? {
                code: code.replaceAll(/(["'])cloudflare:workers\1/g, JSON.stringify(shim)),
                map: null,
              }
            : null,
      },
      ...[rollup.plugins ?? []].flat(),
    ] as never;
  });

  nuxt.hook("nitro:config", (config) => {
    const own = /vite-hub|\/\.vitehub\/|\/(h3@2|nitro@3)\./;
    const plugins = [
      // ViteHub's server code is written for h3 2, and Nuxt 4's Nitro aliases `h3` to 1. Its files get their own copy.
      resolver("docs:vite-hub-h3", function (id, importer) {
        if (!/^h3(\/|$)/.test(id) || !importer || !own.test(importer)) return null;
        const from = fileURLToPath(new URL("nuxt.config.ts", root));
        return this.resolve(id.replace(/^h3/, "h3-v2"), from, { skipSelf: true });
      }),
    ];
    const rollup = (config.rollupConfig ??= {});
    // The Console's code reaches the Agent package's optional dependencies (chat adapters, bufferutil), which aren't
    // installed and no page uses; they stay external instead of failing the bundle.
    const optional = [
      /^@chat-adapter\//,
      "advocaat",
      "bufferutil",
      "utf-8-validate",
      "@opentelemetry/api",
    ];
    rollup.external = [...optional, ...[rollup.external ?? []].flat()] as never;
    // SAFETY: the plugins are Rollup plugins; Nitro's own type for the list is a union of Rollup's and Rolldown's.
    rollup.plugins = [...plugins, ...[rollup.plugins ?? []].flat()] as never;
  });

  // Nitro's prerenderer is a Node build that can't bundle ViteHub's packages (their pnpm folders are named after the
  // URLs they install from, and bundled they hit a circular import), and no page needs them. It leaves ViteHub's handlers
  // and plugins out and adds the one thing ViteHub's comments plugin does to a page: the loader tag, so the prerendered
  // files carry it like the Worker's rendered ones would.
  nuxt.hook("nitro:init", (nitro) => {
    nitro.hooks.hook("prerender:config", (config) => {
      const viteHub = (path: unknown) =>
        typeof path === "string" && /vite-hub|(^|[/\\])\.vitehub[/\\]/.test(path);
      config.handlers = config.handlers?.filter((handler) => !viteHub(handler?.handler));
      config.devHandlers = config.devHandlers?.filter((handler) => !viteHub(handler?.handler));
      config.plugins = [
        ...(config.plugins ?? []).filter((plugin) => !viteHub(plugin)),
        fileURLToPath(new URL("./server/prerender/comments-loader.ts", root)),
      ];
      // The loader's URL carries a hash of its content, which ViteHub generated.
      const generated = new URL(".vitehub/comments/inject-overlay.mjs", root);
      const commentsLoader = /const url = "([^"]+)"/.exec(readFileSync(generated, "utf8"))?.[1];
      config.runtimeConfig = { ...config.runtimeConfig, commentsLoader };
      config.modules = config.modules?.filter(
        (module) => typeof module !== "function" || !viteHub(module.name),
      );
    });

    // `wrangler` run from the repository's root uses the config that Nitro generated with ViteHub's bindings
    // (.wrangler/deploy/config.json), without the flag that makes workerd refuse bare `path`, which the Workspace needs.
    nitro.hooks.hook("compiled", () => {
      if (nitro.options.dev) return;
      const generated = join(nitro.options.output.serverDir, "wrangler.json");
      const config = JSON.parse(readFileSync(generated, "utf8")) as {
        compatibility_flags?: string[];
      };
      config.compatibility_flags = config.compatibility_flags?.filter(
        (flag) => flag !== "no_nodejs_compat_v2",
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
