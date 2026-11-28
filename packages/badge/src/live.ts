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

const maxJsonBytes = 64 * 1024;

async function json(url: string, request: typeof fetch, token?: string, maxBytes = maxJsonBytes) {
  const response = await request(url, {
    signal: AbortSignal.timeout(5000),
    redirect: "manual",
    headers: {
      Accept: "application/json",
      "User-Agent": "comark-badge",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
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
      if (length > maxBytes) {
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

async function latestOnDefaultBranch(
  runsUrl: string,
  branch: string,
  repository: string,
  request: typeof fetch,
  token?: string,
) {
  const pageSize = 5;
  let hasUpstreamRun = false;
  for (let page = 1; page <= 5; page++) {
    const query = new URLSearchParams({ branch, per_page: String(pageSize), page: String(page) });
    const data = await json(`${runsUrl}?${query}`, request, token, pageSize * maxJsonBytes);
    if (!Array.isArray(data.workflow_runs)) throw new Error("Missing workflow runs");
    for (const entry of data.workflow_runs) {
      const run = record(entry);
      const headRepository = record(run.head_repository).full_name;
      if (
        run.head_branch !== branch ||
        typeof headRepository !== "string" ||
        headRepository.toLowerCase() !== repository.toLowerCase()
      )
        continue;
      hasUpstreamRun = true;
      if (run.status === "completed") return run;
    }
    if (data.workflow_runs.length < pageSize) {
      if (hasUpstreamRun) throw new Error("No completed run on the default branch");
      return undefined;
    }
  }
  throw new Error("Default branch workflow search limit reached");
}

export async function resolveLive(
  spec: BadgeSpec,
  request: typeof fetch = globalThis.fetch,
  /** A GitHub token, sent only to GitHub, so workflow badges get its rate limit instead of the IP's. */
  token?: string,
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
      const repositoryUrl = `https://api.github.com/repos/${spec.repository}`;
      const runsUrl = `${repositoryUrl}/actions/workflows/${encodeURIComponent(spec.workflow)}/runs`;
      const latest = async (branch?: string) => {
        const query = new URLSearchParams({ per_page: "1", status: "completed" });
        if (branch) query.set("branch", branch);
        const data = await json(`${runsUrl}?${query}`, request, token);
        return record(Array.isArray(data.workflow_runs) ? data.workflow_runs[0] : undefined);
      };
      let run: Record<string, unknown>;
      if (spec.branch) run = await latest(spec.branch);
      else {
        // Also like GitHub's badge: the default branch first, then any branch for a workflow that never runs there.
        // Across branches, a release workflow that also runs on closed pull requests reads "skipped" after every merge.
        const repository = await json(repositoryUrl, request, token);
        if (token && repository.private !== false)
          throw new Error("Workflow repository is not public");
        if (typeof repository.default_branch !== "string" || !repository.default_branch)
          throw new Error("Missing default branch");
        run =
          (await latestOnDefaultBranch(
            runsUrl,
            repository.default_branch,
            spec.repository,
            request,
            token,
          )) ?? (await latest());
      }
      // Check the run's repository in the same response: a broader token must never
      // turn this public endpoint into a private workflow status oracle.
      if (token && record(run.repository).private !== false)
        throw new Error("Workflow repository is not public");
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
