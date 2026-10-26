import type { BadgeSpec } from "./svg.ts";

export type LiveResult = { value: string; color?: string; unavailable: boolean };
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? // SAFETY: a non-null, non-array JSON object can be read by string keys; its field values remain unknown.
      (value as Record<string, unknown>)
    : {};
export const ttls = {
  static: 86400,
  "npm-version": 300,
  "npm-downloads": 3600,
  "github-actions": 60,
};

/** The upstream data a live badge shows, without its look, so badges that differ only in style share it. */
export const liveKey = (spec: BadgeSpec) =>
  JSON.stringify([
    spec.source,
    spec.package,
    spec.period,
    spec.repository,
    spec.workflow,
    spec.branch,
  ]);

async function json(url: string, request: typeof fetch) {
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
export async function resolveLive(
  spec: BadgeSpec,
  request: typeof fetch = globalThis.fetch,
): Promise<LiveResult> {
  try {
    let value: string;
    let color: string | undefined;
    if (spec.source === "npm-version") {
      const tags = await json(
        `https://registry.npmjs.org/-/package/${encodeURIComponent(spec.package)}/dist-tags`,
        request,
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
        request,
      );
      if (
        typeof data.downloads !== "number" ||
        !Number.isSafeInteger(data.downloads) ||
        data.downloads < 0
      )
        throw new Error("Missing downloads");
      value = `${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(data.downloads)}/${spec.period === "month" ? "mo" : spec.period === "week" ? "wk" : "day"}`;
    } else {
      // The latest finished run, like GitHub's own badge, so a README doesn't read "pending" after every push.
      const query = new URLSearchParams({ per_page: "1", status: "completed" });
      if (spec.branch) query.set("branch", spec.branch);
      const data = await json(
        `https://api.github.com/repos/${spec.repository}/actions/workflows/${encodeURIComponent(spec.workflow)}/runs?${query}`,
        request,
      );
      const run = record(Array.isArray(data.workflow_runs) ? data.workflow_runs[0] : undefined);
      if (!run.status) throw new Error("No workflow runs");
      if (run.status !== "completed") {
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
