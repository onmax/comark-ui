import { defineEventHandler, getRequestURL } from "nuxt/server";
import { createBadgeHandler } from "../../../packages/badge/src/server.ts";

// Nitro 3's Cloudflare entry puts the Worker's env and context on the request.
type Cloudflare = {
  env: { GITHUB_TOKEN?: string };
  context?: { waitUntil(promise: Promise<unknown>): void };
};

let badge: ReturnType<typeof createBadgeHandler> | undefined;

export default defineEventHandler(async (event) => {
  const { runtime } = event.req as Request & { runtime?: { cloudflare?: Cloudflare } };
  const cloudflare = runtime?.cloudflare;
  badge ??= createBadgeHandler({
    token: cloudflare?.env.GITHUB_TOKEN,
    // Node, which runs the tests and dev server, has no Cache API.
    cache: "caches" in globalThis ? await caches.open("badges") : undefined,
  });
  return badge(
    new Request(getRequestURL(event), { method: event.req.method }),
    cloudflare?.context,
  );
});
