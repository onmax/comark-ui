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
  const asset = await fromAssets(event.req, assets);
  // The playground's preview is a sandboxed frame with no origin, so a font it loads needs CORS. nuxt.config.ts sets the
  // same header for `nuxi dev`.
  if (!asset || !url.pathname.startsWith("/play/fonts/")) return asset;
  const font = new Response(asset.body, asset);
  font.headers.set("access-control-allow-origin", "*");
  return font;
});
