import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import { env } from "vite-hub/env";
import { excludedLinks } from "./link-excludes.ts";
import { categories, railGroups } from "./sections.ts";

export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: false },
  telemetry: false,
  // vite-hub/nuxt first: @vite-hub/docs turns its Comments on.
  css: ["~/assets/landing.css"],
  modules: ["vite-hub/nuxt", "@vite-hub/docs/nuxt", "~~/modules/wrangler-output"],
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
    github: { repo: "onmax/comark-ui", dir: "docs/pages" },
    // Comark plugins are functions, so they reach the server through a file.
    parser: "./markdown.ts",
    // A playground link's fragment names a preset, not an element.
    linkChecker: { ignoreFragments: [/^\/play(\/presets)?$/] },
  },
  linkChecker: { excludeLinks: excludedLinks },
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
    // The editor is the Console's Content section: the team signs in with the site's own session (server/auth.ts).
    // console.vitehub.dev opens the same project: it signs in with OAuth against this site (consoleMcpOAuth() in
    // server/auth.ts), so the resource must be fixed. The site still serves the Console pages itself (`embed`), because
    // the editor's preview, live editing and the page pill's Content button need the site's own origin.
    console: {
      auth: "app",
      authorize: fileURLToPath(new URL("./server/console-authorize.ts", import.meta.url)),
      embed: true,
      mcp: { resource: "https://comark-ui.onmax.me/_vitehub/mcp" },
    },
  },
  // `nuxt dev` has no GitHub OAuth app: the Console runs every call as the loopback user `local`, which team.ts accepts.
  $development: { vitehub: { console: { auth: false } } },
  vite: {
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
  // The agent skill at the repository's root, under /.well-known/skills/. robots.txt keeps crawlers out of the Console,
  // its sign-in page, and the API.
  agentDiscovery: {
    siteUrl: "https://comark-ui.onmax.me",
    skills: { dir: "../skills" },
    robots: { disallow: ["/_vitehub", "/api"] },
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
});
