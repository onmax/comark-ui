import { dirname, resolve } from "node:path";

export type UrlOptions = {
  /** Milliseconds to wait for a response's headers. Default 10 000. */
  timeout?: number;
  /** Requests at once, at most 2 to one host. Default 8. */
  concurrency?: number;
  /** Retries after a 5xx or a dropped connection. Default 1. */
  retries?: number;
  /** The cache file, from `root`, or `false` for none. Default `node_modules/.cache/comark-linter/urls.json`. */
  cache?: string | false;
  /** Milliseconds a cached answer stays fresh. Default one day. */
  maxAge?: number;
};

/** An HTTP status, or the code of the error that stopped the request. */
export type Answer = { status: number } | { code: string };

const defaults: Required<UrlOptions> = {
  timeout: 10_000,
  concurrency: 8,
  retries: 1,
  cache: "node_modules/.cache/comark-linter/urls.json",
  maxAge: 86_400_000,
};

const PER_HOST = 2;
const TLS = /^(?:CERT_|ERR_TLS_|ERR_SSL_|UNABLE_TO_(?:VERIFY|GET)|DEPTH_ZERO_|SELF_SIGNED_)/;
const PROBE = "https://example.com/";

export const isTls = (code: string) => TLS.test(code);

type Cache = Record<string, { status: number; checked: number }>;

/**
 * Requests every URL once and returns what each answered, or undefined when the network is down. Only answers worth
 * repeating are cached: a 404 is checked again next run, so a page that comes back stops being reported.
 */
export async function checkUrls(
  urls: readonly string[],
  options: true | UrlOptions,
  root: string,
): Promise<Map<string, Answer> | undefined> {
  const settings = options === true ? defaults : { ...defaults, ...options };
  const file = settings.cache ? resolve(root, settings.cache) : undefined;
  const cache = file ? await readCache(file) : {};
  const now = Date.now();
  const answers = new Map<string, Answer>();
  const fresh = new Map<string, Answer>();
  const limit = limiter(settings.concurrency, PER_HOST);
  await Promise.all(
    urls.map(async (url) => {
      const hit = cache[url];
      if (hit && now - hit.checked < settings.maxAge) {
        answers.set(url, { status: hit.status });
        return;
      }
      const answer = await limit(new URL(url).host, () => request(url, settings));
      answers.set(url, answer);
      fresh.set(url, answer);
    }),
  );
  // A TLS error needs a connection, so it proves the network is up as well as a status does.
  const reached = [...fresh.values()].some((answer) => "status" in answer || isTls(answer.code));
  if (fresh.size && !reached) {
    const probe = await once(PROBE, settings.timeout, "HEAD");
    if (!("status" in probe || isTls(probe.code))) {
      console.warn("comark-lint: the network is unreachable, so comark/dead-url checked no URLs.");
      return undefined;
    }
  }
  if (file) {
    for (const [url, answer] of fresh)
      if ("status" in answer && worthKeeping(answer.status))
        cache[url] = { status: answer.status, checked: now };
    for (const [url, { checked }] of Object.entries(cache))
      if (now - checked >= settings.maxAge) delete cache[url];
    await writeCache(file, cache);
  }
  return answers;
}

const worthKeeping = (status: number) =>
  status !== 404 && status !== 410 && status !== 429 && status < 500;

async function request(url: string, settings: Required<UrlOptions>): Promise<Answer> {
  for (let attempt = 0; ; attempt++) {
    const answer = await once(url, settings.timeout, "GET");
    const transient =
      "status" in answer
        ? answer.status >= 500
        : answer.code !== "ENOTFOUND" && answer.code !== "TIMEOUT" && !isTls(answer.code);
    if (!transient || attempt >= settings.retries) return answer;
    await new Promise((done) => setTimeout(done, 250 * (attempt + 1)));
  }
}

async function once(url: string, timeout: number, method: string): Promise<Answer> {
  const headers = new Headers({
    accept: "text/html,application/xhtml+xml,*/*;q=0.8",
    "user-agent": "Mozilla/5.0 (compatible; comark-linter; +https://comark-ui.onmax.me/lint/)",
  });
  const { hostname } = new URL(url);
  const token = process.env.GITHUB_TOKEN;
  if (token && (hostname === "github.com" || hostname === "api.github.com"))
    headers.set("authorization", `Bearer ${token}`);
  try {
    const response = await fetch(url, {
      method,
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(timeout),
    });
    // The status is all that's needed, so the body is never downloaded.
    await response.body?.cancel().catch(() => undefined);
    return { status: response.status };
  } catch (error) {
    return { code: errorCode(error) };
  }
}

// fetch wraps the system error, such as ENOTFOUND or CERT_HAS_EXPIRED, in its `cause`.
function errorCode(error: unknown): string {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"))
    return "TIMEOUT";
  for (let at = error, depth = 0; at instanceof Object && depth < 4; depth++) {
    if ("code" in at && at.code) {
      // SAFETY: Node's system and TLS errors carry their code as a string, such as `ENOTFOUND`.
      return at.code as string;
    }
    at = "cause" in at ? at.cause : undefined;
  }
  return "NETWORK";
}

function limiter(total: number, perHost: number) {
  let running = 0;
  const hosts = new Map<string, number>();
  const waiting: (() => void)[] = [];
  return async <T>(host: string, task: () => Promise<T>): Promise<T> => {
    while (running >= total || (hosts.get(host) ?? 0) >= perHost)
      await new Promise<void>((wake) => waiting.push(wake));
    running++;
    hosts.set(host, (hosts.get(host) ?? 0) + 1);
    try {
      return await task();
    } finally {
      running--;
      hosts.set(host, hosts.get(host)! - 1);
      for (const wake of waiting.splice(0)) wake();
    }
  };
}

async function readCache(file: string): Promise<Cache> {
  try {
    const { readFile } = await import("node:fs/promises");
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    // SAFETY: only this module writes the file, and a hand-edited one at worst re-checks or skips a URL.
    return parsed instanceof Object && !Array.isArray(parsed) ? (parsed as Cache) : {};
  } catch {
    return {};
  }
}

async function writeCache(file: string, cache: Cache): Promise<void> {
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(cache));
  } catch {
    // A read-only checkout just checks again next time.
  }
}
