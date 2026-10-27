import { defineEventHandler, getRequestURL } from "nuxt/server";
import { createBadgeHandler } from "../../../packages/badge/src/server.ts";

type Platform = {
  env: { GITHUB_TOKEN?: string };
  context?: { waitUntil(promise: Promise<unknown>): void };
};

let badge: ReturnType<typeof createBadgeHandler> | undefined;

export default defineEventHandler(async (event) => {
  const platform = event.context.cloudflare as Platform | undefined;
  badge ??= createBadgeHandler({
    token: platform?.env.GITHUB_TOKEN,
    // Node, which runs the tests and dev server, has no Cache API.
    cache: "caches" in globalThis ? await caches.open("badges") : undefined,
  });
  return badge(new Request(getRequestURL(event), { method: event.req.method }), platform?.context);
});
