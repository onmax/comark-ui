import { createHtmlRenderer } from "@comark/html";
import html from "comark-ui/html";
import { describe, expect, it } from "vite-plus/test";
import { runProjectFixture } from "vite-doctor/testkit";
import comark from "../src/doctor.ts";
import { lint } from "../src/index.ts";

const markdown = "```ts\nconst a = 1\n```";
const shiki = {
  highlighter: () => ({
    codeToTokens: (code: string) => ({ tokens: [[{ content: code, color: "#000" }]] }),
  }),
  themes: { light: "github-light" },
};
const cases = [
  { options: { maxBlocks: 0 }, rule: "comark/shiki/too-many-blocks", code: "COMARK4501" },
  { options: { maxSource: 0 }, rule: "comark/shiki/source-too-long", code: "COMARK4502" },
] as const;

describe("Shiki limit diagnostics", () => {
  for (const limits of [{ maxBlocks: 1 }, { maxSource: 11 }]) {
    it(`locates a later rejected fence with ${Object.keys(limits)[0]}`, async () => {
      const markdown = [
        "---",
        "title: Code",
        "---",
        "",
        "Intro",
        "",
        "```txt",
        "plain",
        "```",
        "",
        "```ts",
        "const a = 1",
        "```",
        "",
        "  ~~~ts",
        "const b = 2",
        "  ~~~",
      ].join("\n");
      const preset = html({
        shiki: {
          ...shiki,
          ...limits,
          highlighter: (language) => (language === "ts" ? shiki.highlighter() : undefined),
        },
        icon: { fetch: false },
        chips: { download: false },
        badge: { download: false },
        diagrams: { draw: false },
      });
      expect(await lint(markdown, preset)).toEqual([
        expect.objectContaining({
          rule:
            "maxBlocks" in limits ? "comark/shiki/too-many-blocks" : "comark/shiki/source-too-long",
          line: 15,
          column: 3,
        }),
      ]);
    });
  }

  for (const { options, rule, code } of cases) {
    it(`reports ${rule} through the limited preset and Doctor`, async () => {
      const preset = html({
        shiki: { ...shiki, ...options },
        icon: { fetch: false },
        chips: { download: false },
        badge: { download: false },
        diagrams: { draw: false },
      });
      expect(await lint(markdown, preset)).toEqual([
        expect.objectContaining({ rule, severity: "warn" }),
      ]);
      expect(await createHtmlRenderer(preset)(markdown)).not.toContain('class="shiki');

      const result = await runProjectFixture({
        framework: "vite",
        extensions: [comark(preset)],
        files: { "docs/page.md": markdown },
      });
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          ruleId: rule,
          code,
          diagnostic: expect.objectContaining({
            docs: `https://comark-ui.onmax.me/doctor/${rule.replace(/^comark\//, "")}/`,
          }),
        }),
      ]);
    });
  }
});
