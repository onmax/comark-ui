import { defineEventHandler, getRequestURL, readRawBody } from "h3";

// Nuxt 4's Nitro runs on h3 1, where `event.req` is Node's request. ViteHub's Console RPC handler is written for h3 2 and
// reads it as a web Request, so give it one for that route.
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  if (!url.pathname.startsWith("/_vitehub/rpc/")) return;
  const body =
    event.method === "GET" || event.method === "HEAD" ? undefined : await readRawBody(event, false);
  const request = new Request(url, {
    method: event.method,
    headers: new Headers(event.headers as unknown as Record<string, string>),
    body: body ? new Uint8Array(body) : undefined,
  });
  Object.defineProperty(event, "req", { value: request, configurable: true });
});
