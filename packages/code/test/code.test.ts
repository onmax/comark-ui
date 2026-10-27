import { createHtmlRenderer } from "@comark/html";
import shiki from "@comark/html/plugins/shiki";
import { parseMarkdown } from "comark";
import tabs, { components as tabsComponents } from "comark-tabs/html";
import { describe, expect, it } from "vite-plus/test";
import code, { type CodeOptions, components } from "../src/html.ts";

const render = (markdown: string, options?: CodeOptions) =>
  createHtmlRenderer({ plugins: [code(options)], components })(markdown);
// Without the inline styles and script, whose source mentions classes of its own.
const markup = async (markdown: string, options?: CodeOptions) =>
  (await render(markdown, options)).replace(/<style[^>]*>.*?<\/style><script>.*?<\/script>/s, "");
const bar = (markdown: string, options?: CodeOptions) =>
  markup(markdown, options).then((html) => /<div class="ck-bar">(.*?)<\/div>/s.exec(html)?.[1]);
// A resolver that draws `test:*` icons and can't find any other.
const iconResolver = {
  resolve: async (values: Iterable<string>) =>
    new Map(
      [...values].map((value) => [
        value,
        value.startsWith("test:")
          ? { name: value, src: "data:image/svg+xml,x", ratio: 1, mask: true }
          : { problem: "missing" as const },
      ]),
    ),
};

const run = { id: "run", label: "Run", languages: ["sh", "Bash"] };
const sh = "```sh\npnpm add comark-code\n```";

describe("comark-code", () => {
  it("wraps a code block with Wrap and Copy buttons, and leaves the block as it was", async () => {
    const html = await markup("```ts\nconst a = 1\n```");
    expect(html).toMatch(
      /^<div class="ck"><pre data-language="ts"><code class="language-ts">const a = 1<\/code><\/pre><div class="ck-bar"><span class="ck-title">ts<\/span><button/,
    );
    expect(html).toContain(
      '<button type="button" class="ck-wrap" aria-label="Wrap lines" aria-pressed="false" title="Wrap lines">',
    );
    expect(html).toContain(
      '<button type="button" class="ck-copy" aria-label="Copy code" title="Copy">',
    );
    expect(html).toContain('<span class="ck-status" role="status"></span></div></div>');
  });

  it("titles the header with the file's name, else the language, else nothing", async () => {
    expect(await bar("```ts [config.ts]\nconst a = 1\n```")).toMatch(
      /^<span class="ck-title">config.ts<\/span><button/,
    );
    expect(await bar("```\nplain\n```")).toMatch(/^<button/);
  });

  it("inlines the styles and script once per document", async () => {
    const html = await render(`${sh}\n\n${sh}`);
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html.match(/class="ck"/g)).toHaveLength(2);
    expect(await render("No code here.")).not.toContain("<script>");
  });

  it("inlines styles a site can theme with --ck-* variables, with today's look as the fallback", async () => {
    const style = /<style data-comark-code>(.*?)<\/style>/s.exec(await render(sh))?.[1];
    expect(style).toContain(
      "div.ck>pre{padding-top:calc(var(--_ck-size) + var(--_ck-inset) + .75rem)}",
    );
    expect(style).toContain("height:var(--_ck-bar)");
    expect(style).toContain(
      ".ck-title{min-width:0;margin-right:auto;overflow:hidden;color:color-mix(in srgb,var(--_comark-foreground) 72%,transparent);font:.6875rem/1.5 var(--ck-title-font,ui-monospace,SFMono-Regular,Menlo,monospace);",
    );
  });

  it("keeps Shiki's highlighting and the block's filename", async () => {
    const html = await createHtmlRenderer({ plugins: [code(), shiki()], components })(
      "```ts [config.ts]\nconst a = 1\n```",
    );
    expect(html).toMatch(
      /<div class="ck"><pre data-language="ts" data-filename="config.ts" class="shiki /,
    );
    expect(html).toContain("--shiki-dark:");
  });

  it("adds your actions to the blocks in their languages, before Wrap and Copy", async () => {
    const options = { actions: [run, { id: "explain", label: "Explain" }] };
    expect(await bar("```bash\nls\n```", options)).toMatch(
      /^<button type="button" class="ck-action" data-code-action="run">Run<\/button><button type="button" class="ck-action" data-code-action="explain">Explain<\/button><button type="button" class="ck-wrap"/,
    );
    const ts = await bar("```ts\nconst a = 1\n```", options);
    expect(ts).not.toContain(">Run<");
    expect(ts).toContain(">Explain<");
    expect(await bar("```\nplain\n```", { actions: [run] })).not.toContain("ck-action");
  });

  it("draws an action's icon before its label, or alone and named by its title", async () => {
    const html = await bar(sh, {
      iconResolver,
      actions: [
        { id: "run", label: "Run", icon: "test:play" },
        { id: "share", icon: "test:share", title: "Share snippet" },
      ],
    });
    expect(html).toContain(
      '<button type="button" class="ck-action" data-code-action="run"><span class="ci" data-mask aria-hidden="true" style="--ci:url(&quot;data:image/svg+xml,x&quot;)"></span>Run</button>',
    );
    expect(html).toContain(
      '<button type="button" class="ck-action" data-code-action="share" aria-label="Share snippet" title="Share snippet"><span class="ci" data-mask',
    );
  });

  it("shows an icon-only action's title when its icon can't be drawn, and says why", async () => {
    const options = {
      iconResolver,
      actions: [{ id: "share", icon: "lucide:nope", title: "Share" }],
    };
    expect(await bar(sh, options)).toContain('data-code-action="share">Share</button>');
    const document = await parseMarkdown(sh, { plugins: [code(options)] });
    expect(document.meta.issues).toEqual([
      expect.stringMatching(
        /^The comark-code action "share" shows "Share" as text on its code blocks, because it can't draw its icon "lucide:nope": The `lucide` set has no icon `nope`\./,
      ),
    ]);
  });

  it("names its icon issue's rule after comark-icon's", async () => {
    const options = {
      iconResolver,
      actions: [{ id: "share", icon: "lucide:nope", title: "Share" }],
    };
    const { meta } = await parseMarkdown(sh, { plugins: [code(options)] });
    expect(meta.issueRules).toEqual({ [meta.issues[0]]: "comark/icon/unknown-icon" });
  });

  it("escapes an action's id and label, and never leaks `actions` onto the block", async () => {
    const html = await markup(sh, { actions: [{ id: 'a"b', label: "<Run & go>" }] });
    expect(html).toContain('data-code-action="a&quot;b">&lt;Run &amp; go&gt;</button>');
    expect(html).not.toMatch(/actions|undefined|\[object/);
  });

  it("puts the buttons on code blocks inside a code group, whichever plugin runs first", async () => {
    const group = "::code-group\n```sh [pnpm]\npnpm add x\n```\n\n```sh [npm]\nnpm i x\n```\n::";
    for (const plugins of [
      [code({ actions: [run] }), tabs()],
      [tabs(), code({ actions: [run] })],
    ]) {
      const html = await createHtmlRenderer({
        plugins,
        components: { ...tabsComponents, ...components },
      })(group);
      expect(html).toContain('<div class="ct" data-tabs-code>');
      expect(
        html.match(/<div class="ck" data-code-frame="terminal"><pre data-language="sh">/g),
      ).toHaveLength(2);
      expect(html.match(/data-code-action="run"/g)).toHaveLength(2);
    }
  });

  it("leaves the document's issues alone", async () => {
    const document = await parseMarkdown(sh, { plugins: [code({ actions: [run] })] });
    expect(document.meta.issues ?? []).toEqual([]);
  });
});

describe("comark-code lines", () => {
  const highlighted = (markdown: string, plugins = [shiki(), code()]) =>
    createHtmlRenderer({ plugins, components })(markdown).then((html) =>
      html.replace(/<style[^>]*>.*?<\/style><script>.*?<\/script>/s, ""),
    );
  const issues = async (markdown: string, plugins = [shiki(), code()]) =>
    (await parseMarkdown(markdown, { plugins })).meta.issues ?? [];
  const block = "const a = 1\nconst b = 2\nconst c = 3\nconst d = 4\n```";

  it("marks lines added, deleted, and to look at, after Shiki draws them", async () => {
    const html = await highlighted(`\`\`\`ts {4} ins={1} del={2} mark={3}\n${block}`);
    expect(html).toMatch(
      /^<div class="ck" data-code-lines><pre data-language="ts" data-highlights="\[4\]" class="shiki /,
    );
    expect(html).toContain('<span class="line ck-ins"><span style="');
    expect(html).toContain('<span class="line ck-del">');
    expect(html).toContain('<span class="line ck-mark">');
    expect(html).toContain('<span class="line highlight">');
    // Each line carries its own newline, and no inline `display` that would beat the stylesheet.
    expect(html).toMatch(/<span style="[^"]*"> 1<\/span>\n<\/span><span class="line ck-del">/);
    expect(html).not.toMatch(/display: inline|data-meta/);
  });

  it("splits the lines itself when nothing highlights them", async () => {
    expect(await highlighted(`\`\`\`ts del={2}\n${block}`, [code()])).toContain(
      '<code class="language-ts"><span class="line">const a = 1\n</span><span class="line ck-del">const b = 2\n</span><span class="line">const c = 3\n</span><span class="line">const d = 4</span></code>',
    );
  });

  it("numbers the lines, from 1 or from startLineNumber", async () => {
    const html = await highlighted(`\`\`\`ts showLineNumbers\n${block}`, [code()]);
    expect(html).toContain('<div class="ck" data-code-lines data-code-numbers="1">');
    expect(html).toContain('<span class="line" data-line="1">const a = 1');
    const from = await highlighted(`\`\`\`ts startLineNumber=98\n${block}`, [code()]);
    expect(from).toContain('data-code-numbers="3"');
    expect(from).toContain('<span class="line" data-line="101">const d = 4</span>');
  });

  it("folds collapsed ranges into a details element that counts their lines", async () => {
    const html = await highlighted(`\`\`\`ts collapse={2-3}\n${block}`, [code()]);
    expect(html).toContain(
      '<span class="line">const a = 1\n</span><details class="ck-fold"><summary>2 collapsed lines</summary><span class="line">const b = 2\n</span><span class="line">const c = 3\n</span></details><span class="line">const d = 4</span>',
    );
  });

  it("turns a diff with a language into that language, its signs into markers", async () => {
    const diff = [
      '```diff lang="ts"',
      "diff --git a/a.ts b/a.ts",
      "index 1234567..89abcde 100644",
      "--- a/a.ts",
      "+++ b/a.ts",
      "@@ -1,3 +1,3 @@",
      " function close() {",
      "-  history.back();",
      "+  if (opened) history.back();",
      " }",
      "```",
    ].join("\n");
    const html = await highlighted(diff, [code()]);
    expect(html).toContain(
      '<pre data-language="ts"><code class="language-ts"><span class="line">function close() {\n</span><span class="line ck-del">  history.back();\n</span><span class="line ck-ins">  if (opened) history.back();\n</span><span class="line">}</span></code></pre>',
    );
    expect(await highlighted(diff)).toContain('<pre data-language="ts" class="shiki ');
    // Without a language, a diff stays a diff.
    expect(await highlighted("```diff\n-a\n+b\n```", [code()])).toContain(
      '<code class="language-diff">-a\n+b</code>',
    );
  });

  it("titles a block with title, and starts it wrapped with wrap", async () => {
    const html = await highlighted('```ts title="src/a.ts" wrap\nconst a = 1\n```', [code()]);
    expect(html).toMatch(
      /^<div class="ck" data-code-wrap><pre data-language="ts" data-filename="src\/a.ts">/,
    );
    expect(html).toContain('<span class="ck-title">src/a.ts</span>');
    expect(html).toContain('class="ck-wrap" aria-label="Wrap lines" aria-pressed="true"');
  });

  it("frames shell sessions as a terminal, unless they're named like a file or turned off", async () => {
    const html = await highlighted("```bash\nls\n```", [code()]);
    expect(html).toMatch(/^<div class="ck" data-code-frame="terminal"><pre data-language="bash">/);
    expect(html).not.toContain("ck-title");
    expect(await highlighted('```sh title="Install"\nls\n```', [code()])).toContain(
      '<span class="ck-title">Install</span>',
    );
    for (const markdown of ["```sh [install.sh]\nls\n```", '```sh frame="none"\nls\n```'])
      expect(await highlighted(markdown, [code()])).not.toContain("data-code-frame");
    expect(await highlighted('```ts frame="terminal"\nls\n```', [code()])).toContain(
      'data-code-frame="terminal"',
    );
  });

  it("styles the lines Shiki's transformers mark, with their classes as strings", async () => {
    type Transformer = NonNullable<
      NonNullable<Parameters<typeof shiki>[0]>["transformers"]
    >[number];
    const transformer: Transformer = {
      line(node, line) {
        if (line === 2) this.addClassToHast(node, ["diff", "add"]);
      },
    };
    const html = await highlighted("```ts\nconst a = 1\nconst b = 2\n```", [
      shiki({ transformers: [transformer] }),
      code(),
    ]);
    expect(html).toContain('<div class="ck" data-code-lines>');
    expect(html).toContain('<span class="line diff add">');
    expect(html).not.toContain("&quot;");
  });

  it("names the block and the fix for each range it can't read, and never throws", async () => {
    expect(
      await issues(
        `\`\`\`ts [a.ts] ins={9} del=2 mark={3-1} startLineNumber=x frame="window"\n${block}`,
      ),
    ).toEqual([
      'The ts code block "a.ts" has frame="window", which comark-code doesn\'t draw. Write frame="terminal", frame="code", or frame="none".',
      'The ts code block "a.ts" has ins={9}, but it has 4 lines, so line 9 doesn\'t exist. Mark lines from 1 to 4.',
      'The ts code block "a.ts" has del=2, which isn\'t a line range, so no line is marked. Write the line numbers in braces, such as del={2-4}.',
      'The ts code block "a.ts" has mark={3-1}, and "3-1" isn\'t a line or a range from a lower line to a higher one. Write it like mark={2-4}.',
      'The ts code block "a.ts" has startLineNumber=x, which isn\'t a whole number, so its lines are numbered from 1. Write one such as startLineNumber=120.',
    ]);
    expect(await issues("```\nplain\n```\n\n```js collapse={4}\nlet a\n```")).toEqual([
      expect.stringMatching(
        /^The js code block that starts "let a" has collapse=\{4\}, but it has 1 line/,
      ),
    ]);
  });

  it("names each issue's rule", async () => {
    const markdown = `\`\`\`ts [a.ts] ins={9} del=2 startLineNumber=x frame="window"\n${block}`;
    const { meta } = await parseMarkdown(markdown, { plugins: [shiki(), code()] });
    expect(meta.issues.map((issue: string) => meta.issueRules[issue])).toEqual([
      "comark/code/unknown-frame",
      "comark/code/line-out-of-range",
      "comark/code/invalid-range",
      "comark/code/invalid-start-line",
    ]);
    const before = await parseMarkdown(markdown, { plugins: [code(), shiki()] });
    expect(Object.values(before.meta.issueRules)).toEqual([
      "comark/code/unknown-frame",
      "comark/code/listed-before-shiki",
    ]);
  });

  it("says when it's listed before Shiki, and leaves Shiki's highlighting alone", async () => {
    const markdown = `\`\`\`ts [a.ts] ins={1}\n${block}\n\n\`\`\`sh\nls\n\`\`\``;
    expect(await issues(markdown, [code(), shiki()])).toEqual([
      'The ts code block "a.ts" can\'t have line markers, numbers, or collapsed ranges, because comark-code is listed before shiki in plugins, and Shiki redraws every block it highlights. List shiki() before comark-code.',
    ]);
    const html = await highlighted(markdown, [code(), shiki()]);
    expect(html).toContain(
      '<pre data-language="ts" data-filename="a.ts" data-meta="ins={1}" class="shiki ',
    );
    expect(html).toContain('<div class="ck" data-code-frame="terminal">');
    expect(await issues(markdown)).toEqual([]);
  });
});
