// Every comark-linter rule has a Doctor page, and each page's examples do what they say: the incorrect Markdown reports
// that rule alone, and the correct Markdown reports nothing.
import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { checkExample, doctorRules, examplesOf } from "../docs/doctor.ts";

const repo = new URL("../", import.meta.url);
// These pages show code instead: nothing in this repo still reports an issue without its own rule, so plugin-issue's
// shows a plugin of your own; downloads, dead URLs, and diagrams depend on the network; a label used twice is an id
// used twice, which comark/duplicate-id reports too; and a bad `repo`, a value too long for a QR code, the order of
// Shiki against comark-code and comark-code-notes, a bad critic `mode`, a bad table `base`, math's `output` without
// KaTeX, a bad properties `locale`, and a `read` that fails are plugin options, not Markdown.
const withoutExamples = new Set([
  "comark/plugin-issue",
  "comark/dead-url",
  "comark/code/listed-before-shiki",
  "comark/icon/download-failed",
  "comark/chips/missing-avatar",
  "comark/chips/rate-limited",
  "comark/github/invalid-repo",
  "comark/qr/value-too-long",
  "comark/math/katex-missing",
  "comark/critic/invalid-mode",
  "comark/diagrams/draw-failed",
  "comark/diagrams/server-unreachable",
  "comark/table/read-failed",
  "comark/table/base-outside-root",
  "comark/xref/duplicate-label",
  "comark/code-notes/shiki-order",
  "comark/tests/read-failed",
  "comark/properties/invalid-locale",
]);

describe("Doctor pages", () => {
  it("has one page per rule and no page without one", () => {
    const pages = (
      readdirSync(new URL("docs/pages/doctor/", repo), { recursive: true }) as string[]
    )
      .filter((file) => file.endsWith(".md") && file !== "index.md")
      .map((file) => `doctor/${file.replace(/\.md$/, "")}`)
      .sort();
    expect(pages).toEqual(doctorRules.map((entry) => entry.slug).sort());
  });

  it("gives every rule its own code", () => {
    const codes = doctorRules.map((entry) => entry.code);
    expect(codes.filter((code, index) => codes.indexOf(code) !== index)).toEqual([]);
  });

  for (const { rule, slug } of doctorRules) {
    if (withoutExamples.has(rule)) continue;
    it(`${rule}: the incorrect examples report it, and the correct ones nothing`, async () => {
      if (!existsSync(new URL(`docs/pages/${slug}.md`, repo))) return;
      const examples = await examplesOf(slug);
      expect(examples.map((example) => example.kind)).toEqual(
        expect.arrayContaining(["incorrect", "correct"]),
      );
      const problems = [];
      for (const { kind, source } of examples) {
        const { problem } = await checkExample(rule, kind, source);
        if (problem) problems.push(`docs/pages/${slug}.md: ${problem}`);
      }
      expect(problems).toEqual([]);
    });
  }
});
