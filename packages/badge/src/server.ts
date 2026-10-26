import { liveKey, resolveLive, ttls, type LiveResult } from "./live.ts";
import { badgeSvg, readBadge } from "./svg.ts";

export type BadgeServerOptions = {
  /** Defaults to global fetch. Only npm and GitHub's public APIs are contacted. */
  fetch?: typeof globalThis.fetch;
  /** Useful for deterministic cache tests. Milliseconds since the epoch. */
  now?: () => number;
};

/** Creates a GET/HEAD handler with a bounded cache and shared in-flight requests. */
export function createBadgeHandler(options: BadgeServerOptions = {}) {
  const upstream = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const cache = new Map<string, { result: LiveResult; expires: number }>();
  const pending = new Map<string, Promise<LiveResult>>();
  return async function handleBadge(request: Request): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD")
      return new Response("Use GET or HEAD.", { status: 405, headers: { Allow: "GET, HEAD" } });
    const url = new URL(request.url);
    const parsed =
      url.search.length > 4096
        ? { ok: false as const, error: "Keep the badge URL under 4096 characters." }
        : readBadge(Object.fromEntries(url.searchParams));
    if (!parsed.ok)
      return new Response(request.method === "HEAD" ? null : parsed.error, {
        status: 400,
        headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    const spec = parsed.value;
    const key = liveKey(spec);
    let ttl = ttls[spec.source];
    let result: LiveResult = { value: spec.value, color: spec.color, unavailable: false };
    if (spec.source !== "static") {
      const cached = cache.get(key);
      if (cached && cached.expires > now()) {
        result = cached.result;
        ttl = Math.max(1, Math.floor((cached.expires - now()) / 1000));
      } else {
        let task = pending.get(key);
        if (!task && pending.size < 16) {
          task = resolveLive(spec, upstream)
            .then((resolved) => {
              if (cache.size >= 256) cache.delete(cache.keys().next().value!);
              cache.set(key, {
                result: resolved,
                expires: now() + (resolved.unavailable ? 30 : ttl) * 1000,
              });
              return resolved;
            })
            .finally(() => pending.delete(key));
          pending.set(key, task);
        }
        result = task ? await task : { value: "unavailable", color: "neutral", unavailable: true };
        if (result.unavailable) ttl = 30;
      }
    }
    return new Response(
      request.method === "HEAD"
        ? null
        : badgeSvg({ ...spec, ...result, color: result.color ?? spec.color }),
      {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": `public, max-age=${ttl}`,
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "X-Badge-Status",
          "X-Badge-Status": result.unavailable ? "unavailable" : "ok",
        },
      },
    );
  };
}
