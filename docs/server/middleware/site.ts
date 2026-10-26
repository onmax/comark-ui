import { defineEventHandler, getRequestURL } from "nuxt/server";
import { fromAssets, redirectTarget } from "../utils/site.ts";

type Platform = { request: Request; env: { ASSETS?: Parameters<typeof fromAssets>[1] } };

// The Worker runs before the static assets (wrangler.jsonc), as it did before Nitro, so old hosts and paths redirect
// first. Anonymous requests still end at a prerendered file; only the paths with none reach Nitro's routes.
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const target = redirectTarget(url);
  if (target) return Response.redirect(target, 301);
  const platform = event.context.cloudflare as Platform | undefined;
  if (!platform?.env.ASSETS || url.pathname === "/badge.svg") return;
  return fromAssets(platform.request, platform.env.ASSETS);
});
