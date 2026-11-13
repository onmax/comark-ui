// The data-explorer skill's build fills assets/page.html, the same page an agent without Node fills by hand. This runs
// it on the example in references/blocks.md, as an agent would, and reads the page it writes.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vite-plus/test";

const skill = fileURLToPath(new URL("../skills/data-explorer/", import.meta.url));
const reference = readFileSync(join(skill, "references/blocks.md"), "utf8");
const example = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(reference)![1]!);
const dir = mkdtempSync(join(tmpdir(), "data-explorer-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function build(report: unknown) {
  const input = join(dir, "report.json");
  const output = join(dir, "report.html");
  writeFileSync(input, JSON.stringify(report));
  try {
    const log = execFileSync("node", [join(skill, "scripts/build.mjs"), input, output], {
      cwd: dir,
      encoding: "utf8",
    });
    return { ok: true, log, html: readFileSync(output, "utf8") };
  } catch (error) {
    return { ok: false, log: String((error as { stdout: string }).stdout), html: "" };
  }
}

describe("the data-explorer build", () => {
  it("fills every slot of the page with the example", () => {
    const { ok, html } = build(example);
    expect(ok).toBe(true);
    expect(html).toContain(`<title>${example.title}</title>`);
    const data = /<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/.exec(
      html,
    )![1]!;
    expect(JSON.parse(data)).toEqual(example);
    expect(html).toMatch(/<style id="rp-style">\s*[\s\S]*\.rp-top/);
    expect(html).toMatch(/<script id="rp-app" type="text\/plain">\s*[\s\S]*function render\b/);
    // Nothing but the slots changes: text between the tags would show above the page.
    expect(html.replace(/<(script|style|title)\b[\s\S]*?<\/\1>/g, "")).not.toMatch(
      />\s*[^<\s][^<]*</,
    );
  });

  it("names the field and the fix when the text runs long", () => {
    const { ok, log } = build({
      ...example,
      title: "A title much longer than the forty characters a top bar holds",
    });
    expect(ok).toBe(false);
    expect(log).toMatch(/error\s+.*title/);
  });

  it("names a list written as an object instead of crashing", () => {
    const { ok, log } = build({ ...example, views: { ...example.views[0] } });
    expect(ok).toBe(false);
    expect(log).toMatch(/error\s+report: `views` must be an array/);
  });

  it("warns when a filter has no type, since it would guess one", () => {
    const years = ["2021", "2022", "2023", "2024", "2025", "2026"];
    const { ok, log } = build({
      ...example,
      filters: [...example.filters, { field: "period", options: years }],
    });
    expect(ok).toBe(true);
    expect(log).toMatch(/warning\s+filters\[4\]: has no `type`, so it shows as a `list`/);
  });

  it("keeps a matrix's columns as a list of names", () => {
    const data = { ...example.data, grid: [{ store: "North", year: "2026", n: 1 }] };
    const matrix = {
      type: "matrix",
      title: "Store by year",
      data: "grid",
      x: "year",
      y: "store",
      value: "n",
      columns: ["2026"],
    };
    const views = [{ ...example.views[0], blocks: [...example.views[0].blocks, matrix] }];
    const { ok, log } = build({ ...example, data, views });
    expect(ok, log).toBe(true);
    const [facts, bars] = example.views[0].blocks;
    const bad = build({
      ...example,
      views: [{ ...example.views[0], blocks: [facts, { ...bars, segments: "fiction" }] }],
    });
    expect(bad.log).toMatch(/error\s+.*`segments` must be an array/);
  });
});

// A page that runs code fetched from a URL that can change fails skill scanners such as Snyk's, so the page runs only
// what it holds and fetches only Vega.
it("an unfilled page names the missing file instead of loading it", () => {
  const page = readFileSync(join(skill, "assets/page.html"), "utf8");
  const hosts = new Set([...page.matchAll(/https:\/\/([^/"'`]+)/g)].map((match) => match[1]));
  expect([...hosts].toSorted()).toEqual(["cdn.jsdelivr.net", "fonts.googleapis.com"]);
  expect(page).toMatch(/assets\/app\.js isn't in the page/);
  expect(page).toMatch(/assets\/style\.css isn't in the page/);
});
