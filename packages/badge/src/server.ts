import { badgeSvg, readBadge, type BadgeSpec } from "./svg.ts";

export type BadgeServerOptions = {
  /** Defaults to global fetch. Only npm and GitHub's public APIs are contacted. */
  fetch?: typeof globalThis.fetch;
  /** Useful for deterministic cache tests. Milliseconds since the epoch. */
  now?: () => number;
};
type Result = { value: string; color?: string; unavailable: boolean };
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? // SAFETY: a non-null, non-array JSON object can be read by string keys; its field values remain unknown.
      (value as Record<string, unknown>)
    : {};
const ttls = { static: 86400, "npm-version": 300, "npm-downloads": 3600, "github-actions": 60 };

/** Creates a GET/HEAD handler with a bounded cache and shared in-flight requests. */
export function createBadgeHandler(options: BadgeServerOptions = {}) {
  const request = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const cache = new Map<string, { result: Result; expires: number }>();
  const pending = new Map<string, Promise<Result>>();
  async function json(url: string) {
    const response = await request(url, {
      signal: AbortSignal.timeout(5000),
      redirect: "manual",
      headers: { Accept: "application/json", "User-Agent": "comark-badge" },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Upstream unavailable");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty upstream response");
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > 65536) {
          await reader.cancel();
          throw new Error("Upstream response too large");
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return record(JSON.parse(new TextDecoder().decode(bytes)));
  }
  async function resolve(spec: BadgeSpec): Promise<Result> {
    try {
      let value: string;
      let color: string | undefined;
      if (spec.source === "npm-version") {
        const tags = await json(
          `https://registry.npmjs.org/-/package/${encodeURIComponent(spec.package)}/dist-tags`,
        );
        if (
          typeof tags.latest !== "string" ||
          !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$/.test(tags.latest) ||
          tags.latest.length > 79
        )
          throw new Error("Missing version");
        value = `v${tags.latest}`;
      } else if (spec.source === "npm-downloads") {
        const data = await json(
          `https://api.npmjs.org/downloads/point/last-${spec.period}/${encodeURIComponent(spec.package)}`,
        );
        if (
          typeof data.downloads !== "number" ||
          !Number.isSafeInteger(data.downloads) ||
          data.downloads < 0
        )
          throw new Error("Missing downloads");
        value = `${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(data.downloads)}/${spec.period === "month" ? "mo" : spec.period === "week" ? "wk" : "day"}`;
      } else {
        const query = new URLSearchParams({ per_page: "1" });
        if (spec.branch) query.set("branch", spec.branch);
        const data = await json(
          `https://api.github.com/repos/${spec.repository}/actions/workflows/${encodeURIComponent(spec.workflow)}/runs?${query}`,
        );
        const run = record(Array.isArray(data.workflow_runs) ? data.workflow_runs[0] : undefined);
        if (!run.status) throw new Error("No workflow runs");
        if (
          ["queued", "in_progress", "requested", "waiting", "pending"].some(
            (status) => status === run.status,
          )
        ) {
          value = "pending";
          color = "warning";
        } else if (run.status !== "completed") {
          throw new Error("Unknown workflow status");
        } else if (run.conclusion === "success") {
          value = "passing";
          color = "success";
        } else if (
          run.conclusion === "failure" ||
          run.conclusion === "timed_out" ||
          run.conclusion === "startup_failure"
        ) {
          value = "failing";
          color = "error";
        } else if (
          run.conclusion === "cancelled" ||
          run.conclusion === "skipped" ||
          run.conclusion === "neutral" ||
          run.conclusion === "action_required" ||
          run.conclusion === "stale"
        ) {
          value = String(run.conclusion).replaceAll("_", " ");
          color = "neutral";
        } else throw new Error("Unknown workflow conclusion");
      }
      return { value, color, unavailable: false };
    } catch {
      return { value: "unavailable", color: "neutral", unavailable: true };
    }
  }
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
    const key = JSON.stringify([
      spec.source,
      spec.package,
      spec.period,
      spec.repository,
      spec.workflow,
      spec.branch,
    ]);
    let ttl = ttls[spec.source];
    let result: Result = { value: spec.value, color: spec.color, unavailable: false };
    if (spec.source !== "static") {
      const cached = cache.get(key);
      if (cached && cached.expires > now()) {
        result = cached.result;
        ttl = Math.max(1, Math.floor((cached.expires - now()) / 1000));
      } else {
        let task = pending.get(key);
        if (!task && pending.size < 16) {
          task = resolve(spec)
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
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "X-Badge-Status",
          "X-Badge-Status": result.unavailable ? "unavailable" : "ok",
        },
      },
    );
  };
}
