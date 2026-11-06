import { defineEventHandler, getRequestURL } from "nuxt/server";
import { fromAssets, redirectTarget } from "../utils/site.ts";

// Nitro 3's Cloudflare entry puts the Worker's env on the request.
type Cloudflare = { env: { ASSETS?: Parameters<typeof fromAssets>[1] } };

// The Worker runs before the static assets (wrangler.jsonc), as it did before Nitro, so old hosts and paths redirect
// first. Anonymous requests still end at a prerendered file; only the paths with none reach Nitro's routes.
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const target = redirectTarget(url);
  if (target) return Response.redirect(target, 301);
  const { runtime } = event.req as Request & { runtime?: { cloudflare?: Cloudflare } };
  const assets = runtime?.cloudflare?.env.ASSETS;
  if (!assets || url.pathname === "/badge.svg") return;
  return fromAssets(event.req, assets);
});
