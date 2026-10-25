import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";

const root = new URL("./", import.meta.url);
const generated = new URL(".generated/public/", root);

// Fonts keep the paths the old static build gave them, which old links read.
async function writeAssets() {
  await rm(generated, { recursive: true, force: true });
  await mkdir(new URL("fonts/", generated), { recursive: true });
  const fonts = new URL("../node_modules/geist/dist/fonts/", root);
  for (const font of ["geist-sans/Geist-Variable.woff2", "geist-mono/GeistMono-Variable.woff2"])
    await cp(new URL(font, fonts), new URL(`fonts/${font.split("/")[1]}`, generated));
  await cp(
    new URL(
      "../node_modules/@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2",
      root,
    ),
    new URL("fonts/Caveat-Variable.woff2", generated),
  );

  // The playground is a standalone browser app. Keep its generated HTML and
  // script under Nitro's public root so `/play/` remains available alongside
  // the Nuxt-rendered documentation pages.
  const playground = new URL("dist/play/", root);
  if (existsSync(playground))
    await cp(playground, new URL("play/", generated), { recursive: true });
  const badges = new URL("dist/badges/", root);
  if (existsSync(badges)) await cp(badges, new URL("badges/", generated), { recursive: true });
  // The playground's preview is its own document and links the site's styles, so they keep their own URL too.
  // Each page's Markdown copy and llms.txt, at the site's root.
  const markdown = new URL("dist/markdown/", root);
  if (existsSync(markdown)) await cp(markdown, generated, { recursive: true });
  for (const file of ["search.json", "style.css"]) {
    const built = new URL(`dist/${file}`, root);
    if (existsSync(built)) await cp(built, new URL(file, generated));
  }
}

// Every page, so one that nothing links to still prerenders: docs/pages, and each package's docs/ under its name.
function pageRoutes() {
  const routes = (dir: URL, base: string) =>
    readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".md") && !file.startsWith("partials/"))
      .map((file) => `${base}/${file.replace(/(^|\/)?index\.md$|\.md$/, "")}`.replace(/\/?$/, "/"));
  const packages = new URL("../packages/", root);
  return [
    ...routes(new URL("pages/", root), ""),
    ...readdirSync(packages)
      .filter((folder) => existsSync(new URL(`${folder}/docs/index.md`, packages)))
      .flatMap((folder) => routes(new URL(`${folder}/docs/`, packages), `/${folder}`)),
  ];
}

export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: false },
  telemetry: false,
  experimental: {
    componentIslands: true,
    // Nuxt 5's default: the first load reads the payload inlined in the HTML, and client navigations fetch `_payload.json`.
    payloadExtraction: "client",
    // Lets the header's npmx chip move from one package's name to the next; docs/style.css animates only that.
    viewTransition: true,
  },
  css: ["~~/style.css"],
  runtimeConfig: {
    generatedPagesDir: fileURLToPath(new URL(".generated/pages/", root)),
  },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      link: [
        { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        {
          rel: "preload",
          href: "/fonts/Geist-Variable.woff2",
          as: "font",
          type: "font/woff2",
          crossorigin: "",
        },
      ],
    },
  },
  modules: [
    "nuxt-agent-discovery",
    async (_, nuxt) => {
      await writeAssets();
      nuxt.options.nitro.publicAssets ??= [];
      nuxt.options.nitro.publicAssets.push({ dir: fileURLToPath(generated), maxAge: 0 });
    },
  ],
  // Only the agent skill at the repository's root, under /.well-known/skills/; the pages are built by docs/build.ts.
  agentDiscovery: {
    siteUrl: "https://comark-ui.onmax.me",
    source: false,
    discovery: { link: false, apiCatalog: false, sitemapXml: false },
    errors: false,
    sitemap: { markdown: false },
    robots: { aiPolicy: false },
    skills: { dir: "../skills" },
  },
  nitro: {
    output: { dir: fileURLToPath(new URL("dist/", root)) },
    // The playground is a static app copied into the output, not a Nuxt page.
    prerender: {
      crawlLinks: true,
      failOnError: true,
      routes: pageRoutes(),
      ignore: ["/play", "/badges"],
    },
  },
});
