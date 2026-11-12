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
});
