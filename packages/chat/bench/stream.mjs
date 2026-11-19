// Streams a Markdown reply into comark-chat's React `MessageParts` with comark-ui's preset, in Chromium, built once
// from a base commit and once from the working tree, and compares the two. See README.md.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";
import { build } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");

const { values: flags } = parseArgs({
  options: {
    base: { type: "string", default: "origin/main" },
    mode: { type: "string", default: "time" },
    runs: { type: "string", default: "5" },
    interval: { type: "string", default: "40" },
    fixture: { type: "string", default: "simd" },
    out: { type: "string" },
  },
});

function resolveBase(ref) {
  try {
    return execFileSync("git", ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (cause) {
    throw new Error(`Cannot resolve benchmark baseline ${JSON.stringify(ref)} to a commit`, {
      cause,
    });
  }
}

const baseCommit = resolveBase(flags.base);

// The SIMD document from Pierre's Words benchmark: 39,898 bytes with 38 Python fences and 105 headings.
const SIMD = {
  url: "https://raw.githubusercontent.com/pierrecomputer/pierre/b049b9ee1c074351a57af3815024dfe504224bbf/packages/words/benchmark/fixtures/simd.md",
  sha256: "42a6d88215f20d9fe41148aa58d88d73063b753962a7bbbfedd6a4f4e0710f8a",
};

async function fixture(name) {
  if (name !== "simd") return readFileSync(resolve(name), "utf8");
  const file = join(tmpdir(), `comark-chat-bench-${SIMD.sha256.slice(0, 12)}.md`);
  if (!existsSync(file)) {
    const response = await fetch(SIMD.url);
    assert.ok(response.ok, `${SIMD.url} answered ${response.status}`);
    writeFileSync(file, await response.text());
  }
  const source = readFileSync(file, "utf8");
  const digest = createHash("sha256").update(source).digest("hex");
  assert.equal(digest, SIMD.sha256, `${file} isn't the pinned fixture; delete it`);
  return source;
}

// Every workspace package resolves to its source, so both builds need no `pnpm build`.
function sources() {
  const map = new Map();
  for (const dir of readdirSync(join(repo, "packages"))) {
    const file = join(repo, "packages", dir, "package.json");
    if (!existsSync(file)) continue;
    const { name, exports = {} } = JSON.parse(readFileSync(file, "utf8"));
    for (const [entry, target] of Object.entries(exports)) {
      if (typeof target !== "string" || !target.startsWith("./dist/")) continue;
      const source = join(
        repo,
        "packages",
        dir,
        target.replace("./dist/", "src/").replace(/\.mjs$/, ".ts"),
      );
      if (existsSync(source)) map.set(name + entry.slice(1), source);
    }
  }
  return map;
}

// Marks the root `@comark/react` draws with the length of the source its tree came from, recorded when the parse
// starts, so the page waits for the deferred commit of each update rather than React's first, stale one.
function observeCommit(code) {
  const memo = /const parsePromise = useMemo\(\(\) => \((.*?)\), \[content, parse, streaming\]\);/;
  const render = "_jsx(MarkdownLive, { ...rest,";
  assert.ok(memo.test(code) && code.includes(render), "@comark/react's MarkdownClient changed");
  return code
    .replace(
      "function MarkdownContent(",
      "const lengths = new WeakMap();\nconst marked = (promise, content, streaming) => (typeof content === 'string' && lengths.set(promise, String(content.length) + (streaming ? '' : '-done')), promise);\nfunction MarkdownContent(",
    )
    .replace(render, `${render} "data-bench-length": lengths.get(parsePromise),`)
    .replace(
      memo,
      "const parsePromise = useMemo(() => marked(($1), content, streaming), [content, parse, streaming]);",
    );
}

// Our own files outside the benchmark come from `ref` when it's set, so one checkout builds both sides.
function atRef(ref, id) {
  const file = id.split("?")[0];
  if (!ref || !isAbsolute(file)) return undefined;
  const path = relative(repo, file);
  if (path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path)) return undefined;
  if (path.split(sep).includes("node_modules") || file.startsWith(`${here}${sep}`))
    return undefined;
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (cause) {
    throw new Error(`Cannot read ${path} from baseline ${ref}`, { cause });
  }
}

async function bundle(ref) {
  const aliases = sources();
  const output = await build({
    configFile: false,
    logLevel: "error",
    root: here,
    base: "./",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      modulePreload: false,
      rollupOptions: { input: join(here, "index.html") },
    },
    plugins: [
      {
        name: "bench-sources",
        enforce: "pre",
        resolveId: (id) => aliases.get(id),
        load: (id) => atRef(ref, id),
        transform(code, id) {
          if (id.endsWith("/@comark/react/dist/components/MarkdownClient.js"))
            return observeCommit(code);
        },
      },
    ],
  });
  const files = new Map();
  for (const item of [output].flat().flatMap((result) => result.output))
    files.set(`/${item.fileName}`, item.type === "chunk" ? item.code : item.source);
  return files;
}

async function open(files) {
  const browser = await chromium.launch({ args: ["--disable-background-networking"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    const body =
      url.hostname === "bench.localhost" &&
      files.get(url.pathname === "/" ? "/index.html" : url.pathname);
    if (typeof body !== "string" && !(body instanceof Uint8Array)) return route.abort();
    const type = url.pathname.endsWith(".js")
      ? "text/javascript"
      : url.pathname.endsWith(".css")
        ? "text/css"
        : "text/html";
    return route.fulfill({ body, contentType: type });
  });
  await page.goto("http://bench.localhost/");
  await page.waitForFunction(() => "bench" in window);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  return { browser, page, errors, cdp };
}

// Main-thread time Chromium counts, in ms, so the styles and layout a commit leaves behind are measured too.
async function metrics(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  const get = (name) => (metrics.find((metric) => metric.name === name)?.value ?? 0) * 1000;
  return {
    taskMs: get("TaskDuration"),
    scriptMs: get("ScriptDuration"),
    styleMs: get("RecalcStyleDuration"),
    layoutMs: get("LayoutDuration"),
  };
}

const round = (value) => Math.round(value * 10) / 10;
const sum = (values) => values.reduce((total, value) => total + value, 0);
const median = (values) => {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const p95 = (values) => values.toSorted((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
// The typeset styles may sit first or last, and the caret in the text or after it; `chat` reports where the caret
// is. React keeps a span the caret leaves for the next text, with an empty `style`. The rest must match.
const withoutTypeset = (html) =>
  html
    .replace(/<style data-comark-typeset="">[^<]*<\/style>/g, "")
    .replace(/<span style="[^"]*pulse;">[^<]*<\/span>/g, "")
    .replaceAll(' style=""', "");

const builds = { base: await bundle(baseCommit), head: await bundle() };
const sides = Object.keys(builds);
const source = flags.mode === "chat" ? undefined : await fixture(flags.fixture);

async function replay(side, options) {
  const { browser, page, errors, cdp } = await open(builds[side]);
  try {
    await page.evaluate((source) => window.bench.warm(source), source);
    const before = await metrics(cdp);
    const result = await page.evaluate(
      ([source, options]) => window.bench.run(source, options),
      [source, options],
    );
    const after = await metrics(cdp);
    assert.deepEqual(errors, []);
    const main = Object.fromEntries(
      Object.keys(after).map((key) => [key, round(after[key] - before[key])]),
    );
    return { ...result, ...main };
  } finally {
    await browser.close();
  }
}

const records = [];
if (flags.mode === "time") {
  const interval = Number(flags.interval);
  // Paired runs, alternating which side goes first.
  for (let run = 0; run < Number(flags.runs); run++) {
    for (const side of run % 2 ? sides.toReversed() : sides) {
      const { updates, snapshots: _snapshots, ...rest } = await replay(side, { interval });
      const tenth = updates.slice(Math.floor(updates.length * 0.9));
      const record = {
        side,
        run: run + 1,
        updates: updates.length,
        commitTotalMs: round(sum(updates)),
        commitP95Ms: p95(updates),
        lastTenthMeanMs: round(sum(tenth) / tenth.length),
        finalMs: updates.at(-1),
        ...rest,
      };
      records.push({ ...record, samples: updates });
      console.log(JSON.stringify(record));
    }
  }
  const keys = [
    "commitTotalMs",
    "commitP95Ms",
    "lastTenthMeanMs",
    "finalMs",
    "taskMs",
    "styleMs",
    "layoutMs",
    "scriptMs",
  ];
  const summary = Object.fromEntries(
    sides.map((side) => {
      const mine = records.filter((record) => record.side === side);
      return [
        side,
        Object.fromEntries(
          keys.map((key) => {
            const values = mine.map((record) => record[key]);
            return [
              key,
              { median: median(values), min: Math.min(...values), max: Math.max(...values) },
            ];
          }),
        ),
      ];
    }),
  );
  console.log(JSON.stringify(summary, null, 1));
  records.push({ summary });
} else if (flags.mode === "check") {
  // The DOM after every tenth update and at the end matches between the two sides.
  const [base, head] = await Promise.all(
    sides.map((side) => replay(side, { interval: 0, snapshotEvery: 10 })),
  );
  const differs = head.snapshots.findIndex(
    (html, index) => withoutTypeset(html) !== withoutTypeset(base.snapshots[index] ?? ""),
  );
  const record = {
    snapshots: head.snapshots.length,
    differs,
    fences: [base.fences, head.fences],
    highlightedFences: [base.highlightedFences, head.highlightedFences],
  };
  console.log(JSON.stringify(record));
  records.push(record);
  if (differs >= 0) {
    for (const [side, result] of Object.entries({ base, head }))
      writeFileSync(join(tmpdir(), `comark-chat-bench-${side}.html`), result.snapshots[differs]);
    process.exitCode = 1;
  }
} else if (flags.mode === "chat") {
  // A short reply with a stateful component and a code group: both keep their state while prose streams after them.
  const mixed = readFileSync(join(here, "mixed.md"), "utf8");
  const results = {};
  for (const side of sides) {
    const { browser, page, errors } = await open(builds[side]);
    try {
      await page.evaluate((source) => window.bench.warm(source), mixed);
      results[side] = await page.evaluate(
        ([source, marker]) => window.bench.interact(source, marker),
        [mixed, "| Step |"],
      );
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
    const { html: _html, ...rest } = results[side];
    const record = { side, ...rest };
    console.log(JSON.stringify(record));
    records.push(record);
    assert.ok(
      rest.actedAt >= 0 && rest.actedAt < rest.updates - 1,
      `${side}: no interaction before the stream ended`,
    );
    assert.equal(rest.counter, "Clicked 2", `${side}: counter did not retain its state`);
    assert.equal(
      rest.selectedTab,
      "install.ts",
      `${side}: code group did not retain its selected tab`,
    );
  }
  const same = withoutTypeset(results.base.html) === withoutTypeset(results.head.html);
  console.log(JSON.stringify({ sameFinalDom: same }));
  records.push({ sameFinalDom: same });
} else throw new Error(`no mode ${flags.mode}; try time, check, or chat`);
if (flags.out) writeFileSync(flags.out, JSON.stringify({ flags, records }, null, 1));
