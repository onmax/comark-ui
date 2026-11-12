import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import { env } from "vite-hub/env";
import { excludedLinks } from "./link-excludes.ts";
import { categories, railGroups } from "./sections.ts";

export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: false },
  telemetry: false,
  // Load the renderer's styles before the current UI styles, which the modules append below.
  css: ["@vite-hub/ui-playground/styles.css", "~/assets/landing.css"],
  // vite-hub/nuxt first: @vite-hub/docs turns its Comments on.
  modules: [
    "vite-hub/nuxt",
    "@vite-hub/docs/nuxt",
    "~~/modules/comark-styles",
    "~~/modules/docs-theme-source",
    "~~/modules/wrangler-output",
  ],
  // Every prerendered page has a payload, so prefetching each link the reader can see loaded megabytes of them: the
  // sidebar alone lists every page. A link prefetches when the reader points at it or focuses it instead.
  experimental: {
    defaults: { nuxtLink: { prefetchOn: { visibility: false, interaction: true } } },
  },
  // docs/content.ts writes content/ from docs/pages and each package's docs/.
  docs: {
    base: "/",
    site: {
      name: "comark-ui",
      url: "https://comark-ui.onmax.me",
      description: "The Component Library for Markdown.",
      logo: "/favicon.svg",
    },
    categories,
    groups: railGroups.map(({ title, icon }) => ({ title, icon })),
    // Introduction and Installation sit outside every section, so they join the Guides sidebar here, and the header's
    // Docs link opens Introduction rather than the landing page.
    start: {
      section: "guide",
      links: [
        { label: "Introduction", to: "/introduction", icon: "i-lucide-info" },
        { label: "Installation", to: "/getting-started", icon: "i-lucide-download" },
        { label: "Playground", to: "/play", icon: "i-lucide-flask-conical" },
      ],
    },
    github: { repo: "onmax/comark-ui", dir: "docs/pages" },
    // Comark plugins are functions, so they reach the server through a file.
    parser: "./markdown.ts",
    // generate runs links.ts instead. ViteHub's duplicate pass glob-matches every raw URL
    // exclusion against every link, taking longer than CI's build timeout on this site.
    linkChecker: false,
  },
  vitehub: {
    name: "comark-ui",
    preset: "cloudflare",
    // Comments, the editor's sessions in the Content cms preset (server/content.ts), and nothing else use the database.
    database: {
      driver: "d1",
      databaseId: "66cd474e-9408-4af3-bab9-75e06b76f099",
      databaseName: "comark-ui-docs",
    },
    // Files live in the repository (server/content.ts), so there is no R2 bucket.
    blob: false,
    auth: true,
    // A Durable Object holds each page's room: who else is on it and where their cursor is, for comments and the editor.
    realtime: { authority: "cloudflare" },
    // The editor is the Content section of the ViteHub Console (console.vitehub.dev). The site serves only
    // /_vitehub/rpc, which takes calls the Console signs with the key in a VITEHUB_CONSOLE_KEY_<NAME> binding, and
    // console-authorize.ts checks the person who calls.
    console: {
      authorize: fileURLToPath(new URL("./server/console-authorize.ts", import.meta.url)),
    },
    // Signatures name the origin they were made for, and the Worker checks them against this one.
    publicUrl: "https://comark-ui.onmax.me",
    env: {
      server: {
        auth: {
          // Declared as secrets so the Worker passes them through.
          github: {
            clientId: env({ secret: true, source: env.source("GITHUB_CLIENT_ID") }),
            clientSecret: env({ secret: true, source: env.source("GITHUB_CLIENT_SECRET") }),
          },
          secret: env({ secret: true, source: env.source("BETTER_AUTH_SECRET") }),
        },
      },
    },
  },
  // `nuxt dev` takes Console calls without a signature, from this machine only, as the user `local`, whom team.ts
  // accepts.
  $development: { vitehub: { console: { auth: false } } },
  // The agent skill at the repository's root, under /.well-known/skills/. robots.txt keeps crawlers out of the Console's
  // route, the sign-in, and the API.
  agentDiscovery: {
    siteUrl: "https://comark-ui.onmax.me",
    skills: { dir: "../skills" },
    robots: { disallow: ["/_vitehub", "/api", "/sign-in"] },
  },
  nitro: {
    // The root wrangler.jsonc holds what ViteHub doesn't generate (name, routes, previews). Nitro merges it with ViteHub's
    // bindings into docs/dist/server/wrangler.json, which the local Wrangler module selects for commands run from the repository's root.
    cloudflare: { deployConfig: true, nodeCompat: true },
    output: { dir: fileURLToPath(new URL("dist/", import.meta.url)) },
    // docs/tools.ts renders the playground's presets and the gallery's cells there, before Nuxt starts.
    publicAssets: [
      { dir: fileURLToPath(new URL(".generated/tools/", import.meta.url)), baseURL: "/" },
    ],
    prerender: { ignore: excludedLinks, routes: ["/play", "/play/gallery", "/badges"] },
  },
  // The playground's preview is a sandboxed frame with no origin, so a font it loads needs CORS. On the Worker,
  // docs/server/middleware/assets.ts sets it.
  routeRules: { "/play/fonts/**": { headers: { "access-control-allow-origin": "*" } } },
});
