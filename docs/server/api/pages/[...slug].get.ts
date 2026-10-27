import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createError,
  defineEventHandler,
  getQuery,
  getRouterParam,
  useRuntimeConfig,
} from "nuxt/server";
import type { Page } from "#shared/pages";

// docs/build.ts renders every page and writes its parts to docs/.generated/pages/, so the app and the static pages
// can't drift apart. Run it before the app: `pnpm docs:build` does.
const read = async (file: string) => {
  const path = join(useRuntimeConfig().generatedPagesDir, file);
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    return undefined;
  }
};

export default defineEventHandler(async (event): Promise<Page> => {
  const param = (getRouterParam(event, "slug") ?? "").replace(/\/$/, "");
  const slug = param === "index" ? "" : param;
  const [fragment, site] = (await Promise.all([
    read(`${slug.replaceAll("/", "~") || "index"}.json`),
    read("site.json"),
  ])) as [Pick<Page, "title" | "description" | "body"> | undefined, Pick<Page, "css"> | undefined];
  // The Worker has no docs/.generated/, so a path nothing prerendered is a 404 there, not an error.
  if (!fragment) throw createError({ status: 404, message: `No page at /${slug}.` });
  if (!site) throw new Error("docs/.generated/pages/ is missing. Run `node docs/build.ts` first.");
  // The page shell asks without the body, which the PageBody server component renders.
  return { ...fragment, ...site, slug, body: getQuery(event).body === "0" ? "" : fragment.body };
});
