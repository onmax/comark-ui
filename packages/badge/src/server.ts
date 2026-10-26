import { liveKey, resolveLive, ttls, type LiveResult } from "./live.ts";
import { badgeSvg, readBadge, type BadgeSpec } from "./svg.ts";

export type BadgeServerOptions = {
  /** Defaults to global fetch. Only npm and GitHub's public APIs are contacted. */
  fetch?: typeof globalThis.fetch;
  /** Useful for deterministic cache tests. Milliseconds since the epoch. */
  now?: () => number;
  /** A GitHub token for workflow badges. Without one, GitHub allows 60 requests an hour per IP, shared on hosts like Workers. */
  token?: string;
  /** A cache every instance shares, such as `await caches.open("badges")` in a Worker. */
  cache?: Pick<Cache, "match" | "put">;
};

/** Lets a Worker finish refreshing a badge after it has answered. */
export type BadgeContext = { waitUntil(promise: Promise<unknown>): void };

// `fresh` is when the data is due again; until `kept`, it's still shown while it refreshes.
type Entry = { result: LiveResult; fresh: number; kept: number };

// A day of stale data beats a badge that reads "unavailable" whenever an upstream hiccups.
const STALE = 86400;
const UNAVAILABLE = 30;
const unavailable: LiveResult = { value: "unavailable", color: "neutral", unavailable: true };

const isEntry = (value: unknown): value is Entry =>
  value instanceof Object &&
  "result" in value &&
  value.result instanceof Object &&
  "value" in value.result &&
  typeof value.result.value === "string" &&
  "fresh" in value &&
  typeof value.fresh === "number" &&
  "kept" in value &&
  typeof value.kept === "number";

/** Creates a GET/HEAD handler with a bounded cache and shared in-flight requests. */
export function createBadgeHandler(options: BadgeServerOptions = {}) {
  const upstream = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const shared = options.cache;
  const memory = new Map<string, Entry>();
  const pending = new Map<string, Promise<Entry>>();
  const remember = (key: string, entry: Entry) => {
    memory.delete(key);
    if (memory.size >= 256) memory.delete(memory.keys().next().value!);
    memory.set(key, entry);
  };
  async function lookup(key: string, address: URL) {
    const local = memory.get(key);
    if (local && local.kept > now()) return local;
    try {
      const stored: unknown = await (await shared?.match(address))?.json();
      if (isEntry(stored) && stored.kept > now()) {
        remember(key, stored);
        return stored;
      }
    } catch {
      // A shared cache that fails only costs a fetch.
    }
    return undefined;
  }
  function refresh(spec: BadgeSpec, key: string, address: URL, last?: Entry) {
    let task = pending.get(key);
    if (task || pending.size >= 16) return task;
    task = resolveLive(spec, upstream, options.token)
      .then(async (result) => {
        const time = now();
        let entry: Entry;
        if (!result.unavailable) {
          const fresh = time + ttls[spec.source] * 1000;
          entry = { result, fresh, kept: fresh + STALE * 1000 };
        } else if (last && !last.result.unavailable)
          entry = { ...last, fresh: time + UNAVAILABLE * 1000 };
        else entry = { result, fresh: time + UNAVAILABLE * 1000, kept: time + UNAVAILABLE * 1000 };
        remember(key, entry);
        await shared
          ?.put(
            address,
            new Response(JSON.stringify(entry), {
              headers: {
                "Cache-Control": `max-age=${Math.ceil((entry.kept - time) / 1000)}`,
                "Content-Type": "application/json",
              },
            }),
          )
          .catch(() => {});
        return entry;
      })
      .finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  }
  return async function handleBadge(request: Request, context?: BadgeContext): Promise<Response> {
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
    let ttl = ttls[spec.source];
    let result: LiveResult = { value: spec.value, color: spec.color, unavailable: false };
    if (spec.source !== "static") {
      const key = liveKey(spec);
      // The data is cached apart from the badge's look, so every style of one package shares it.
      // Discard entries written before authenticated results required public visibility.
      const address = new URL(`/badge-data/v2/${encodeURIComponent(key)}`, url);
      let entry = await lookup(key, address);
      if (entry && entry.fresh <= now()) {
        const task = refresh(spec, key, address, entry);
        if (task) context?.waitUntil(task);
        ttl = UNAVAILABLE;
      } else if (entry) ttl = Math.max(1, Math.floor((entry.fresh - now()) / 1000));
      else {
        entry = await refresh(spec, key, address);
        if (entry) ttl = Math.max(1, Math.floor((entry.fresh - now()) / 1000));
      }
      result = entry?.result ?? unavailable;
      if (result.unavailable) ttl = UNAVAILABLE;
    }
    return new Response(
      request.method === "HEAD"
        ? null
        : badgeSvg({ ...spec, ...result, color: result.color ?? spec.color }),
      {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": `public, max-age=${ttl}${result.unavailable ? "" : `, stale-while-revalidate=${STALE}`}`,
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "X-Badge-Status",
          "X-Badge-Status": result.unavailable ? "unavailable" : "ok",
        },
      },
    );
  };
}
