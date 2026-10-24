import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import include, { type IncludeOptions } from "../src/index.ts";

const files =
  (entries: Record<string, string>): IncludeOptions["read"] =>
  (path) =>
    entries[path];
const render = (markdown: string, options: IncludeOptions) =>
  createHtmlRenderer({ plugins: [include(options)] })(markdown);
const parse = (markdown: string, options: IncludeOptions) =>
  parseMarkdown(markdown, { plugins: [include(options)] });
const issues = async (markdown: string, options: IncludeOptions) =>
  (await parse(markdown, options)).meta.issues;

describe("comark-include", () => {
  it("pastes a Markdown partial without its frontmatter, and lists the files it read", async () => {
    const read = files({ "parts/setup.md": "---\ntitle: Setup\n---\n\n## Setup\n\nRun **it**.\n" });
    const markdown = '# Guide\n\n:include{src="./parts/setup.md"}\n\nDone.';
    expect(await render(markdown, { read })).toBe(
      '<h1 id="guide">Guide</h1>\n<h2 id="setup">Setup</h2>\n<p>Run <strong>it</strong>.</p>\n<p>Done.</p>',
    );
    const document = await parse(markdown, { read });
    expect(document.meta.includes).toEqual(["parts/setup.md"]);
    expect(document.meta.issues).toEqual([]);
  });

  it("resolves nested includes from the partial's folder, and /paths from the root", async () => {
    const read = files({
      "guide/parts/a.md": 'A\n\n:include{src="./deep/b.md"}',
      "guide/parts/deep/b.md": 'B\n\n:include{src="/shared/c.md"}',
      "shared/c.md": "C",
    });
    const document = await parse(':include{src="./parts/a.md"}', { read, base: "guide" });
    expect(await render(':include{src="./parts/a.md"}', { read, base: "guide" })).toBe(
      "<p>A</p>\n<p>B</p>\n<p>C</p>",
    );
    expect(document.meta.includes).toEqual([
      "guide/parts/a.md",
      "guide/parts/deep/b.md",
      "shared/c.md",
    ]);
  });

  it("keeps heading ids unique across partials, because it's one parse", async () => {
    const read = files({ "a.md": "## Usage", "b.md": "## Usage" });
    expect(await render(':include{src="a.md"}\n\n:include{src="b.md"}', { read })).toBe(
      '<h2 id="usage">Usage</h2>\n<h2 id="usage-1">Usage</h2>',
    );
  });

  it("fences code with the language from the extension, by lines or by region", async () => {
    const source = [
      "import { x } from 'x'",
      "",
      "export function start() {",
      "  // #region setup",
      "  const a = 1",
      "  // #region inner",
      "  const b = 2",
      "  // #endregion inner",
      "  // #endregion setup",
      "}",
    ].join("\n");
    const read = files({ "src/index.ts": source });
    const lines = await parse(':include{src="src/index.ts" lines="3:5"}', { read });
    expect(lines.nodes).toEqual([
      [
        "pre",
        { language: "ts" },
        [
          "code",
          { class: "language-ts" },
          "export function start() {\n  // #region setup\n  const a = 1",
        ],
      ],
    ]);
    expect(await render(':include{src="src/index.ts" region="setup"}', { read })).toBe(
      '<pre data-language="ts"><code class="language-ts">const a = 1\nconst b = 2</code></pre>',
    );
    expect(await render(':include{src="src/index.ts" lines="1:1" lang="js"}', { read })).toBe(
      `<pre data-language="js"><code class="language-js">import { x } from 'x'</code></pre>`,
    );
  });

  it("fences a Markdown file with `code`, one backtick longer than its longest run", async () => {
    const read = files({ "example.md": "# Title\n\n````ts\nconst a = `b`\n````" });
    const document = await parse(':include{src="example.md" code}', { read });
    expect(document.nodes).toEqual([
      [
        "pre",
        { language: "md" },
        ["code", { class: "language-md" }, "# Title\n\n````ts\nconst a = `b`\n````"],
      ],
    ]);
  });

  it("leaves an include inside fenced code as it is, so docs can show the syntax", async () => {
    const read = files({ "a.md": "Pasted" });
    const html = await render('````md\n:include{src="a.md"}\n````', { read });
    expect(html).toContain('<code class="language-md">:include{src="a.md"}</code>');
    expect((await parse('```md\n:include{src="a.md"}\n```', { read })).meta.includes).toEqual([]);
  });

  it("finds fences in list items, blockquotes, and CRLF files, but not in indented code", async () => {
    const read = files({ "a.md": "Pasted" });
    for (const markdown of [
      '- ```md\n  :include{src="a.md"}\n  ```\n',
      '1. Step\n\n   - ```md\n     :include{src="a.md"}\n     ```',
      '> ```md\n> :include{src="a.md"}\n> ```',
      '```md\r\n:include{src="a.md"}\r\n```\r\n',
    ])
      expect(await render(markdown, { read }), markdown).toContain(':include{src="a.md"}</code>');
    expect(await render('    ~~~\n    text\n\n:include{src="a.md"}', { read })).toBe(
      "<pre><code>~~~\ntext</code></pre>\n<p>Pasted</p>",
    );
  });

  it("indents pasted lines like the include, so a partial stays in its list item", async () => {
    const read = files({ "step.md": "Run it:\n\n```sh\npnpm i\n```" });
    expect(await render('- One\n\n  :include{src="step.md"}\n- Two', { read })).toBe(
      '<ul>\n  <li>\n    <p>One</p>\n    <p>Run it:</p>\n    <pre data-language="sh"><code class="language-sh">pnpm i</code></pre>\n  </li>\n  <li>Two</li>\n</ul>',
    );
  });

  it("closes a block a partial leaves open at the end of the paste", async () => {
    const read = files({ "open.md": "::note\nInside" });
    const markdown = ':include{src="open.md"}\n\n## After';
    const document = await parse(markdown, { read });
    expect(document.nodes).toEqual([
      ["note", {}, "Inside"],
      ["h2", { id: "after" }, "After"],
    ]);
    expect(document.meta.issues).toEqual([
      'include "open.md": open.md leaves ::note open, so it was closed at the end of the include. Close it in the partial.',
    ]);
  });

  it("closes a `::$name` block too, since Comark allows `$` in block names", async () => {
    const document = await parse(':include{src="slot.md"}\n\nAfter', {
      read: files({ "slot.md": "::$slot\nInside" }),
    });
    expect(document.nodes).toEqual([
      ["$slot", {}, "Inside"],
      ["p", {}, "After"],
    ]);
    expect(document.meta.issues).toEqual([
      'include "slot.md": slot.md leaves ::$slot open, so it was closed at the end of the include. Close it in the partial.',
    ]);
  });

  it("counts `lines` from the top of a partial but never pastes its frontmatter", async () => {
    const read = files({ "a.md": "---\ntitle: A\n---\n# After\n\nText" });
    expect(await render(':include{src="a.md" lines="1:4"}', { read })).toBe(
      '<h1 id="after">After</h1>',
    );
    expect(await render(':include{src="a.md" lines="5:6"}', { read })).toBe("<p>Text</p>");
  });

  it("takes region markers only at the start of a line, after a comment opener", async () => {
    const source = ["# #region setup", 'end = "#endregion setup"', "# #endregion setup"].join("\n");
    expect(
      await render(':include{src="a.py" region="setup"}', { read: files({ "a.py": source }) }),
    ).toBe(
      '<pre data-language="py"><code class="language-py">end = "#endregion setup"</code></pre>',
    );
  });

  it("drops a failing include and names it with the fix", async () => {
    const read = files({
      "guide/a.md": ':include{src="./b.md"}',
      "guide/b.md": ':include{src="./a.md"}',
      "code.ts": "one\ntwo",
    });
    const options = { read, base: "guide" };
    const cases: [string, string][] = [
      [':include{lines="1:2"}', 'include: `src` is required, like :include{src="./part.md"}.'],
      [
        ':include{src="./x.md"}',
        'include "./x.md": file not found. It resolved to "guide/x.md" under the root; check the path or base.',
      ],
      [
        ':include{src="../../etc/passwd"}',
        'include "../../etc/passwd": the path leaves the root. Move the file under the root or widen `root`.',
      ],
      [
        ':include{src="https://example.com/a.md"}',
        'include "https://example.com/a.md": only local files can be included.',
      ],
      [
        ':include{src="./a.md"}',
        'include "./a.md": guide/a.md includes itself (guide/a.md -> guide/b.md -> guide/a.md). Remove one of the includes.',
      ],
      [
        ':include{src="/code.ts" lines="2-3"}',
        'include "/code.ts": lines="2-3" isn\'t a range; write lines="10:24", 1-based and inclusive.',
      ],
      [
        ':include{src="/code.ts" lines="2:3"}',
        'include "/code.ts": lines="2:3" runs past the end of code.ts, which has 2 lines. End the range at 2 or earlier.',
      ],
      [
        ':include{src="/code.ts" region="setup"}',
        'include "/code.ts": region "setup" isn\'t in code.ts. Mark it with #region setup and #endregion setup comments, or fix the name.',
      ],
      [
        ':include{src="/code.ts" lines="1:2" region="setup"}',
        'include "/code.ts": use `lines` or `region`, not both.',
      ],
      [
        'See :include{src="/code.ts"} here.',
        'include "/code.ts" isn\'t on its own line, so it was dropped. Put it on a line of its own with nothing else.',
      ],
      [
        ':include{src="/code.ts" typo="x"}',
        'include "/code.ts": `typo` isn\'t an include option; use src, lines, region, code, or lang.',
      ],
    ];
    for (const [markdown, issue] of cases) {
      expect(await issues(markdown, options), markdown).toEqual([issue]);
      expect(await render(markdown, options), markdown).not.toMatch(/include|<pre/);
    }
  });

  it("reports the depth limit, an unclosed region, a reader that throws, and `::include`", async () => {
    const chain = files({
      "1.md": ':include{src="2.md"}',
      "2.md": ':include{src="3.md"}',
      "3.md": "3",
    });
    expect(await issues(':include{src="1.md"}', { read: chain, depth: 2 })).toEqual([
      'include "3.md": includes nest more than 2 deep (1.md -> 2.md -> 3.md). Flatten them or raise `depth`.',
    ]);
    const unclosed = files({ "a.ts": "// #region setup\nconst a = 1" });
    expect(await issues(':include{src="a.ts" region="setup"}', { read: unclosed })).toEqual([
      'include "a.ts": region "setup" in a.ts never ends. Add a #endregion setup comment after it.',
    ]);
    const read = () => {
      throw new Error("EACCES: permission denied");
    };
    expect(await issues(':include{src="a.md"}', { read })).toEqual([
      'include "a.md": reading "a.md" failed: EACCES: permission denied. Check the file or the `read` option.',
    ]);
    const block = await parse('::include{src="a.md"}\n\nKept', { read: files({}) });
    expect(await render('::include{src="a.md"}\n\nKept', { read: files({}) })).toBe("Kept");
    expect(block.meta.issues).toEqual([
      'include "a.md": `::include` takes in the rest of the document. Write it with one colon, :include{src="a.md"}, alone on its own line.',
    ]);
  });

  it("names each issue's rule in meta.issueRules", async () => {
    const read = files({ "loop.md": ':include{src="loop.md"}', "deploy.sh": "pnpm build" });
    const { meta } = await parse(
      [
        ':include{path="ducks.md"}',
        ':include{src="ducks.md"}',
        ':include{src="deploy.sh" line="1:1"}',
        ':include{src="../ducks.md"}',
        ':include{src="loop.md"}',
        ':include{src="deploy.sh" region="ship"}',
      ].join("\n\n"),
      { read, base: "../.." },
    );
    expect(meta.issues.map((issue) => meta.issueRules[issue])).toEqual([
      "comark/include/path-outside-root",
      "comark/include/missing-src",
      "comark/include/file-not-found",
      "comark/include/unknown-option",
      "comark/include/path-outside-root",
      "comark/include/include-cycle",
      "comark/include/missing-region",
    ]);
  });

  it("reads from disk under `root` by default", async () => {
    const root = fileURLToPath(new URL("fixtures", import.meta.url));
    const document = await parse(':include{src="/setup.md"}', { root });
    expect(document.meta).toEqual({ includes: ["setup.md", "parts/note.md"], issues: [] });
    expect(await render(':include{src="/setup.md"}\n\n:include{src="missing.md"}', { root })).toBe(
      '<h2 id="install">Install</h2>\n<p>Run the installer.</p>\n<p>A note from <strong>disk</strong>.</p>',
    );
  });

  it("refuses a symlink under `root` that leads out of it", async (context) => {
    const folder = mkdtempSync(join(tmpdir(), "comark-include-"));
    try {
      mkdirSync(join(folder, "root/docs"), { recursive: true });
      mkdirSync(join(folder, "out"));
      writeFileSync(join(folder, "out/secret.txt"), "SECRET");
      writeFileSync(join(folder, "root/docs/inside.md"), "Inside");
      try {
        symlinkSync(join(folder, "out"), join(folder, "root/link"), "dir");
        symlinkSync(join(folder, "root/docs"), join(folder, "root/docs-link"), "dir");
      } catch {
        context.skip("this platform can't create symlinks");
      }
      const root = join(folder, "root");
      const markdown = ':include{src="/link/secret.txt"}\n\n:include{src="/docs-link/inside.md"}';
      expect(await render(markdown, { root })).toBe("<p>Inside</p>");
      expect(await issues(markdown, { root })).toEqual([
        'include "/link/secret.txt": the path leaves the root. Move the file under the root or widen `root`.',
      ]);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
