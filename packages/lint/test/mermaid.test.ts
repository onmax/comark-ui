import { readFile } from "node:fs/promises";
import { createHtmlRenderer } from "@comark/html";
import html from "comark-ui/html";
import { describe, expect, it } from "vite-plus/test";
import { runProjectFixture } from "vite-doctor/testkit";
import comark from "../src/doctor.ts";
import { lint } from "../src/index.ts";

const markdown = "```mermaid\nflowchart LR\n  A --> B\n```";
const cases = [
  {
    options: { maxDiagrams: 0 },
    rule: "comark/mermaid/too-many-diagrams",
    code: "COMARK4401",
  },
  {
    options: { maxSource: 0 },
    rule: "comark/mermaid/source-too-long",
    code: "COMARK4402",
  },
] as const;

describe("Mermaid limit diagnostics", () => {
  for (const { options, rule, code } of cases) {
    it(`reports ${rule} through the limited preset and Doctor`, async () => {
      const preset = html({
        mermaid: options,
        icon: { fetch: false },
        chips: { download: false },
        badge: { download: false },
        diagrams: { draw: false },
      });
      expect(await lint(markdown, preset)).toEqual([
        expect.objectContaining({ rule, severity: "warn" }),
      ]);
      expect(await createHtmlRenderer(preset)(markdown)).toContain('class="language-mermaid"');

      const result = await runProjectFixture({
        framework: "vite",
        extensions: [comark(preset)],
        files: { "docs/page.md": markdown },
      });
      const path = rule.replace(/^comark\//, "");
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          ruleId: rule,
          code,
          diagnostic: expect.objectContaining({
            docs: `https://comark-ui.onmax.me/doctor/${path}/`,
          }),
        }),
      ]);
      const page = await readFile(
        new URL(`../../../docs/pages/doctor/${path}.md`, import.meta.url),
        "utf8",
      );
      expect(page).toContain(Object.keys(options)[0]);
      expect(page).toContain("comark-ui/html");
    });
  }
});
