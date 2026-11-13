import { defineHandler } from "nitro/h3";
import { fromAssets } from "../utils/assets.ts";

// Nitro 3's Cloudflare entry puts the Worker's env on the request.
type Cloudflare = { env: { ASSETS?: Parameters<typeof fromAssets>[1] } };

// The Worker runs before the static assets (wrangler.jsonc) so an agent that asks for Markdown gets the page's copy.
// Anonymous requests still end at a prerendered file; only the paths with none reach Nitro's routes.
// Not `nuxt/server`'s defineEventHandler: it swaps the request for one that buffers its body, and the Console route,
// which reads the body of the Request itself, then finds it already read.
export default defineHandler(async (event) => {
  const { runtime } = event.req as Request & { runtime?: { cloudflare?: Cloudflare } };
  const assets = runtime?.cloudflare?.env.ASSETS;
  const pathname = new URL(event.req.url).pathname;
  if (!assets || pathname === "/badge.svg") return;
  const asset = await fromAssets(event.req, assets);
  // The playground's sandboxed preview has no origin, so its fonts need CORS. nuxt.config.ts sets the same header in dev.
  if (!asset || !pathname.startsWith("/play/fonts/")) return asset;
  const font = new Response(asset.body, asset);
  font.headers.set("access-control-allow-origin", "*");
  return font;
});
