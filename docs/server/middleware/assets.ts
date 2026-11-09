import { defineEventHandler, getRequestURL } from "nuxt/server";
import { fromAssets } from "../utils/assets.ts";

// Nitro 3's Cloudflare entry puts the Worker's env on the request.
type Cloudflare = { env: { ASSETS?: Parameters<typeof fromAssets>[1] } };

// The Worker runs before the static assets (wrangler.jsonc) so an agent that asks for Markdown gets the page's copy.
// Anonymous requests still end at a prerendered file; only the paths with none reach Nitro's routes.
export default defineEventHandler(async (event) => {
  const { runtime } = event.req as Request & { runtime?: { cloudflare?: Cloudflare } };
  const assets = runtime?.cloudflare?.env.ASSETS;
  if (!assets || getRequestURL(event).pathname === "/badge.svg") return;
  const asset = await fromAssets(event.req, assets);
  // The playground's sandboxed preview has no origin, so its fonts need CORS. nuxt.config.ts sets the same header in dev.
  if (!asset || !getRequestURL(event).pathname.startsWith("/play/fonts/")) return asset;
  const font = new Response(asset.body, asset);
  font.headers.set("access-control-allow-origin", "*");
  return font;
});
