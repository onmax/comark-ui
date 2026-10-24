import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import shiki from "comark/plugins/shiki";
import { describe, expect, it } from "vite-plus/test";
import diffPlugin, { components } from "../src/html.ts";

async function run(markdown: string, highlight = false) {
  const document = await parseMarkdown(markdown, {
    plugins: highlight ? [diffPlugin(), shiki()] : [diffPlugin()],
  });
  const html = await renderHtmlFromDocument(document, { components });
  return {
    issues: document.meta.issues,
    html: html.replace(/<style data-comark-diff>.*?<\/style>/s, ""),
  };
}

const fence = "```";
const diff = (before: string, after: string, props = "", lang = "ts [src/a.ts]") =>
  `::diff${props}\n${fence}${lang}\n${before}\n${fence}\n${fence}${lang.split(" ")[0]}\n${after}\n${fence}\n::\n`;
const suggestion = diff(
  "const gap = 8\n\nhistory.back()",
  "const gap = 8\n\nif (opened) history.back()",
  '{line=12 label="Suggested change"}',
);
// Each row's class, its two line numbers, and its code without tags.
const rows = (html: string) =>
  [...html.matchAll(/<tr class="cd-(\w+)"(?: data-highlight)?>(.*?)<\/tr>/g)].map(
    ([, kind, cells]) => {
      const numbers = [...cells!.matchAll(/<td class="cd-num"(?: data-line="(\d+)")?>/g)].map(
        ([, n]) => n ?? "",
      );
      const code = /<td class="cd-line">(.*)<\/td>/.exec(cells!)![1]!.replaceAll(/<[^>]+>/g, "");
      return [kind, ...numbers, code].join(" ");
    },
  );

describe("::diff", () => {
  it("renders a suggested change with its file, counts, and line numbers", async () => {
    for (const highlight of [false, true]) {
      const { issues, html } = await run(suggestion, highlight);
      expect(issues).toEqual([]);
      expect(html).toContain('<figure class="cd"><figcaption><svg class="cd-icon"');
      expect(html).toContain(
        '<span class="cd-label">Suggested change</span><span class="cd-file">src/a.ts</span><span class="cd-counts"><span class="cd-added">+1</span> <span class="cd-removed">−1</span></span></figcaption>',
      );
      expect(html).toContain('<div class="cd-scroll" tabindex="0"><table');
      expect(rows(html)).toEqual([
        "same 12 12 const gap = 8",
        "same 13 13 ",
        "del 14  history.back()",
        "add  14 if (opened) history.back()",
      ]);
    }
  });

  it("keeps Shiki's colors and class, and marks the changed words inside its tokens", async () => {
    const { html } = await run(suggestion, true);
    expect(html).toMatch(/<table class="cd-code shiki [^"]*">/);
    expect(html).toMatch(/<td class="cd-line"><span style="color:[^"]+"><ins>if<\/ins><\/span>/);
    expect(html).not.toContain("<del>");
    // Nothing between the tags, so `white-space: pre` shows the line as written.
    expect(html).not.toMatch(/<(?:ins|del)>\s*\n/);
  });

  it("marks the words that changed in plain code, and leaves lines that share little whole", async () => {
    const { html } = await run(
      diff("const gap = 8\nconsole.log(a)", "const gap = 12\nreturn fetch(url)"),
    );
    expect(html).toContain('<td class="cd-line">const gap = <del>8</del></td>');
    expect(html).toContain('<td class="cd-line">const gap = <ins>12</ins></td>');
    expect(html).toContain('<td class="cd-line">console.log(a)</td>');
    expect(html).toContain('<td class="cd-line">return fetch(url)</td>');
    // Removed lines come before added ones, and without `line` there are no numbers.
    expect(rows(html)).toEqual([
      "del const gap = 8",
      "del console.log(a)",
      "add const gap = 12",
      "add return fetch(url)",
    ]);
  });

  it("shows an empty block as a file added or deleted", async () => {
    for (const highlight of [false, true]) {
      const added = await run(diff("", "export const a = 1", "{line=1}"), highlight);
      expect(added.issues).toEqual([]);
      expect(rows(added.html)).toEqual(["add  1 export const a = 1"]);
      expect(added.html).toContain(
        '<span class="cd-added">+1</span> <span class="cd-removed">−0</span>',
      );
      const deleted = await run(diff("a()\nb()", "", "{line=4}"), highlight);
      expect(deleted.issues).toEqual([]);
      expect(rows(deleted.html)).toEqual(["del 4  a()", "del 5  b()"]);
    }
  });

  it("never cuts inside an emoji, an accented letter, or a character reference", async () => {
    for (const highlight of [false, true]) {
      const { html } = await run(diff("😀 a\ne\u0301 b", "😃 a\ne\u0302 b"), highlight);
      expect(html).toContain("<del>😀</del>");
      expect(html).toContain("<ins>😃</ins>");
      expect(html).toContain("<del>e\u0301</del>");
      expect(html).toContain("<ins>e\u0302</ins>");
      // No half of a surrogate pair, and no accent without its letter.
      expect(html).not.toMatch(
        /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/,
      );
      expect(html).not.toMatch(/<(?:del|ins)>\p{M}/u);
    }
    // Comark prints `&lt;` as a reference, so it changes whole.
    const { html } = await run(diff("x &lt; limit", "x &gt; limit"));
    expect(html).toContain('<td class="cd-line">x <del>&lt;</del> limit</td>');
    expect(html).toContain('<td class="cd-line">x <ins>&gt;</ins> limit</td>');
  });

  it("ignores the empty line a final newline leaves, and keeps a blank line before it", async () => {
    for (const highlight of [false, true]) {
      const same = await run(diff("a\n", "a"), highlight);
      expect(same.issues).toEqual([
        'diff "src/a.ts": before and after are the same, so there\'s no change to show. Edit the after block, or remove the diff.',
      ]);
      expect(rows(same.html)).toEqual(["same a"]);
      const { issues, html } = await run(diff("a\nb\n", "a\nc"), highlight);
      expect(issues).toEqual([]);
      expect(rows(html)).toEqual(["same a", "del b", "add c"]);
      expect(html).toContain('<span class="cd-added">+1</span> <span class="cd-removed">−1</span>');
      expect(rows((await run(diff("a\n\n", "a"), highlight)).html)).toEqual(["same a", "del "]);
    }
  });

  it("keeps the lines each block highlights", async () => {
    for (const highlight of [false, true]) {
      const { issues, html } = await run(
        `::diff\n${fence}ts [a.ts] {2}\na\nb\nc\n${fence}\n${fence}ts {3}\na\nB\nc\n${fence}\n::`,
        highlight,
      );
      expect(issues).toEqual([]);
      const kinds = [...html.matchAll(/<tr class="cd-(\w+)"( data-highlight)?>/g)].map(
        ([, kind, lit]) => `${kind}${lit ? " highlighted" : ""}`,
      );
      expect(kinds).toEqual(["same", "del highlighted", "add", "same highlighted"]);
    }
  });

  it("takes the file from the prop first, and escapes it and the code", async () => {
    const { issues, html } = await run(
      diff('const a = "<b>"', 'const a = "<i>"', ' {file="<x>.ts" label="A & B"}', "ts"),
    );
    expect(issues).toEqual([]);
    expect(html).toContain(
      '<span class="cd-label">A &amp; B</span><span class="cd-file">&lt;x&gt;.ts</span>',
    );
    expect(html).toContain('const a = "&lt;<del>b</del>&gt;"');
    expect(html).toContain('const a = "&lt;<ins>i</ins>&gt;"');
    expect(html).not.toMatch(/<[bix]>/);
  });

  it("names the diff in its messages and says how to fix them", async () => {
    const one = await run(`::diff\n${fence}ts\na\n${fence}\n::`);
    expect(one.issues).toEqual([
      "diff: needs exactly two code blocks, before and after (got 1). Add the missing one; leave it empty for a file that's added or deleted.",
      `diff: name the file in the first block (${fence}ts [src/a.ts]) or with file="src/a.ts".`,
    ]);
    const extra = await run(
      `::diff\n${fence}ts [src/a.ts]\na\n${fence}\nWhy it changed\n${fence}ts [src/b.ts]\nb\n${fence}\n${fence}js\nc\n${fence}\n::`,
    );
    expect(extra.issues).toEqual([
      'diff "src/a.ts": only two code blocks can go inside a diff (found text). Put explanations above or below it.',
      'diff "src/a.ts": needs exactly two code blocks, before and after (got 3). Put the rest in another diff.',
      'diff "src/a.ts": the before block names "src/a.ts" and the after block "src/b.ts". A diff shows one file; split the other into its own diff.',
    ]);
    const languages = await run(
      `::diff\n${fence}ts [a.ts]\na\n${fence}\n${fence}js\nb\n${fence}\n::`,
    );
    expect(languages.issues).toEqual([
      `diff "a.ts": the before block is "ts" and the after block is "js". Give both the same language, like ${fence}ts.`,
    ]);
    const none = await run(`::diff\n${fence}ts [a.ts]\na\n${fence}\n${fence}\nb\n${fence}\n::`);
    expect(none.issues).toEqual([
      `diff "a.ts": the before block is "ts" and the after block has no language. Give both the same language, like ${fence}ts.`,
    ]);
  });

  it("reports a diff with nothing to show, a bad line, and too many lines", async () => {
    const same = await run(diff("a\nb", "a\nb", "{line=0}"));
    expect(same.issues).toEqual([
      'diff "src/a.ts": `line` must be the file\'s line number for the first line, a whole number from 1 (got "0").',
      'diff "src/a.ts": before and after are the same, so there\'s no change to show. Edit the after block, or remove the diff.',
    ]);
    expect((await run(diff("a", "b", "{line=1.5}"))).issues).toEqual([
      'diff "src/a.ts": `line` must be the file\'s line number for the first line, a whole number from 1 (got "1.5").',
    ]);
    const long = Array.from({ length: 201 }, (_, i) => `line ${i}`).join("\n");
    const { issues, html } = await run(diff(long, `${long}\nmore`));
    expect(issues).toEqual([
      'diff "src/a.ts": the before block has 201 lines. Keep only the lines around the change, at most 200.',
      'diff "src/a.ts": the after block has 202 lines. Keep only the lines around the change, at most 200.',
    ]);
    // Still rendered: rendering never throws or drops the block.
    expect(rows(html).at(-1)).toBe("add more");
  });

  it("reports unknown props, and checks a diff wherever it sits", async () => {
    const { issues } = await run(
      `${diff("a", "b", ' {title="Fix" start=3}')}\n::note\n${diff("a", "a", "", "ts [b.ts]").replaceAll("::", ":::")}\n::`,
    );
    expect(issues).toEqual([
      'diff "src/a.ts": `title` isn\'t a prop of `::diff`. Did you mean `label`? Valid props: file, line, label.',
      'diff "src/a.ts": `start` isn\'t a prop of `::diff`. Did you mean `line`? Valid props: file, line, label.',
      'diff "b.ts": before and after are the same, so there\'s no change to show. Edit the after block, or remove the diff.',
    ]);
  });

  it("tells diffs of the same file apart by position", async () => {
    const { issues } = await run(
      `${diff("a", "a")}\n${diff("b", "c")}\n${diff("d", "d", "", "ts [b.ts]")}`,
    );
    expect(issues).toEqual([
      'diff 1 ("src/a.ts"): before and after are the same, so there\'s no change to show. Edit the after block, or remove the diff.',
      'diff "b.ts": before and after are the same, so there\'s no change to show. Edit the after block, or remove the diff.',
    ]);
  });

  it("names each issue's rule for the linter", async () => {
    const document = await parseMarkdown(
      `${diff("a", "b", ' {title="Fix"}')}\n::diff{file="b.ts"}\n${fence}diff\n-a\n+b\n${fence}\n::\n`,
      { plugins: [diffPlugin()] },
    );
    expect(document.meta.issues).toEqual([
      'diff "src/a.ts": `title` isn\'t a prop of `::diff`. Did you mean `label`? Valid props: file, line, label.',
      'diff "b.ts": a ```diff block is a unified diff, and `::diff` draws the diff itself. Write the old lines in the first block and the new lines in the second, each in the file\'s language, like ```ts.',
    ]);
    expect(Object.values(document.meta.issueRules)).toEqual([
      "comark/diff/unknown-prop",
      "comark/diff/unified-diff",
    ]);
  });
});
