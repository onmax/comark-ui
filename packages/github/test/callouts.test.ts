import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import { callouts, components, html, references } from "../src/html.ts";

type Options = Parameters<typeof callouts>[0];
const render = (markdown: string, options?: Options, registerDefaultPlugins = true) =>
  createHtmlRenderer({ plugins: [callouts(options)], components, registerDefaultPlugins })(
    markdown,
  );
const callout = (html: string) =>
  /<div class="cgc" data-comark-frame data-type="(\w+)">.*?<p class="cgc-title">(.*?)<\/p><div class="cgc-body">([\s\S]*?)<\/div><\/div>/.exec(
    html.replaceAll("\n", " "),
  );

describe("comark-github callouts", () => {
  it("turns each GitHub alert into a callout with its icon, title, and body, and inlines the styles once", async () => {
    const types = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];
    const html = await render(types.map((type) => `> [!${type}]\n> Body of ${type}.`).join("\n\n"));
    for (const type of types) {
      const lower = type.toLowerCase();
      expect(html).toMatch(
        new RegExp(
          `<div class="cgc" data-comark-frame data-type="${lower}"><span class="cgc-icon" aria-hidden="true"><svg [^>]+>.+?</svg></span><p class="cgc-title">${lower[0]!.toUpperCase()}${lower.slice(1)}</p>`,
        ),
      );
      expect(html).toContain(`Body of ${type}.`);
    }
    expect(html.match(/<style data-comark-github>/g)).toHaveLength(1);
    expect(html).not.toContain("[!");
  });

  it("works with Comark's default plugins and without them", async () => {
    for (const defaults of [true, false]) {
      const match = callout(await render("> [!tip]\n> Use **pnpm**.", undefined, defaults));
      expect(match?.[1]).toBe("tip");
      expect(match?.[3]).toMatch(/^\s*<p>\s*Use <strong>pnpm<\/strong>.\s*<\/p>\s*$/);
    }
  });

  it("takes the rest of the marker's line as the title", async () => {
    const match = callout(await render("> [!WARNING] Breaking change in **v2**\n> The API moved."));
    expect(match?.[2]).toBe("Breaking change in v2");
    expect(match?.[3]).toContain("The API moved.");
    expect(match?.[3]).not.toContain("Breaking");
  });

  it("splits inline formatting that crosses the marker line", async () => {
    const match = callout(await render("> [!NOTE] **title\n> continued**\n> Body"));
    expect(match?.[2]).toBe("title");
    expect(match?.[3]).toContain("<strong>continued</strong>");
    expect(match?.[3]).toContain("Body");
  });

  it("keeps every block of the body, and allows a callout with no body", async () => {
    const html = await render(
      "> [!NOTE]\n> First.\n>\n> - one\n> - two\n>\n> ```ts\n> const a = 1\n> ```\n\n> [!TIP]",
    );
    const body = callout(html)?.[3];
    expect(body).toContain("First.");
    expect(body).toMatch(/<ul>\s*<li>one<\/li>/);
    expect(body).toContain("const a = 1");
    expect(html).toMatch(
      /data-type="tip">.*<p class="cgc-title">Tip<\/p><div class="cgc-body"><\/div>/s,
    );
  });

  it("leaves plain quotes and unknown types as blockquotes", async () => {
    const html = await render("> Just a quote.\n\n> [!DANGER]\n> Not a GitHub type.");
    expect(html).not.toContain('class="cgc"');
    expect(html.match(/<blockquote>/g)).toHaveLength(2);
    expect(html).not.toContain("<style");
  });

  it("reports a marker that isn't a GitHub type, and names each issue's rule", async () => {
    for (const defaults of [true, false]) {
      const { meta } = await parseMarkdown(
        "> [!INFO]\n> Ducks.\n\n> [!tip]\n> Pigeons.\n\n> [x] Done.",
        {
          plugins: [callouts(), references({ repo: "pond" })],
          registerDefaultPlugins: defaults,
        },
      );
      expect(meta.issues).toEqual([
        'The quote marked "[!INFO]" isn\'t a GitHub callout, so it renders as a plain quote with the marker as text. Use `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, or `[!CAUTION]`.',
        expect.stringMatching(/^references: `repo` must be owner\/name/),
      ]);
      expect(meta.issues.map((issue) => meta.issueRules[issue])).toEqual([
        "comark/github/unknown-callout-type",
        "comark/github/invalid-repo",
      ]);
    }
  });

  it("finds callouts nested in lists and other blocks", async () => {
    const html = await render("- Item\n\n  > [!IMPORTANT]\n  > Inside a list.");
    expect(html).toMatch(
      /<li>[\s\S]*<div class="cgc" data-comark-frame data-type="important">[\s\S]*Inside a list\./,
    );
  });

  it("translates the default titles, and escapes a custom one", async () => {
    const html = await render("> [!NOTE]\n> a\n\n> [!TIP] <b>x</b>\n> b", {
      titles: { note: "Nota" },
    });
    expect(html).toContain('<p class="cgc-title">Nota</p>');
    expect(html).not.toContain("<b>");
  });

  it("reads `::note` through `::caution` as callouts that render as the quotes do", async () => {
    for (const type of ["note", "tip", "important", "warning", "caution"]) {
      const block = await render(`::${type}\nRead **this**.\n::`);
      const quote = await render(`> [!${type.toUpperCase()}]\n> Read **this**.`);
      expect(block).toBe(quote);
    }
  });

  it("takes a block's title from `title` or the `#title` slot, and keeps every block of its body", async () => {
    const titled = callout(await render('::warning{title="Breaking change"}\nFirst.\n\n- one\n::'));
    expect(titled?.[1]).toBe("warning");
    expect(titled?.[2]).toBe("Breaking change");
    expect(titled?.[3]).toMatch(/^\s*<p>First.<\/p>\s*<ul>\s*<li>one<\/li>/);
    const slotted = callout(
      await render("::tip\n#title\nFaster **way**\n\n#default\nUse pnpm.\n::"),
    );
    expect(slotted?.[2]).toBe("Faster way");
    expect(slotted?.[3]).toMatch(/^\s*<p>Use pnpm.<\/p>\s*$/);
    const translated = await render("::note\nHi\n::", { titles: { note: "Nota" } });
    expect(translated).toContain('<p class="cgc-title">Nota</p>');
  });

  it("reads `::callout{type}`, a note without one, and reports a type GitHub doesn't have", async () => {
    const html = await render(
      '::callout{type="Tip"}\nA.\n::\n\n::callout\nB.\n::\n\n::callout{type="info"}\nC.\n::',
    );
    expect(
      [...html.matchAll(/class="cgc" data-comark-frame data-type="(\w+)"/g)].map(
        (match) => match[1],
      ),
    ).toEqual(["tip", "note", "note"]);
    const { meta } = await parseMarkdown('::callout\nA.\n::\n\n::callout{type="info"}\nB.\n::', {
      plugins: [callouts()],
    });
    expect(meta.issues).toEqual([
      '`::callout` 2 has the type "info", which isn\'t a GitHub callout, so it renders as a note. Set `type` to `note`, `tip`, `important`, `warning`, or `caution`.',
    ]);
    expect(meta.issueRules[meta.issues[0]!]).toBe("comark/github/unknown-callout-type");
  });

  it("preserves mixed block and inline bodies", async () => {
    const markdown = "::note\nIntro.\n\n#title\nTitle\n\n#default\nBody.\n::";
    const { nodes } = await parseMarkdown(markdown, { plugins: [callouts()] });
    expect(nodes).toEqual([
      ["github-callout", { type: "note", title: "Title" }, ["p", {}, "Intro."], ["p", {}, "Body."]],
    ]);
    expect(callout(await render(markdown))?.[3]).toMatch(/^\s*<p>Intro.<\/p>\s*<p>Body.<\/p>\s*$/);
    const mixed = "::note\n<span>Intro.</span>\n\n- one\n::";
    const tree = await parseMarkdown(mixed, { plugins: [callouts(), html()] });
    const [mixedCallout] = tree.nodes;
    expect(
      Array.isArray(mixedCallout)
        ? mixedCallout.slice(2).map((node) => (Array.isArray(node) ? node[0] : node))
        : [],
    ).toEqual(["p", "ul"]);
    const output = await createHtmlRenderer({ plugins: [callouts(), html()], components })(mixed);
    expect(callout(output)?.[3]).toMatch(/^\s*<p><span>Intro.<\/span><\/p>\s*<ul>/);
  });

  it("distinguishes inline and block uses of the same custom component", async () => {
    const source =
      ":::note\nThe :custom[inline] text.\n\n::custom\nBlock.\n::\n\n- item\n\n::tip\nNested.\n::\n:::";
    const tree = await parseMarkdown(source, { plugins: [callouts()] });
    const [node] = tree.nodes;
    expect(
      Array.isArray(node)
        ? node.slice(2).map((child) => (Array.isArray(child) ? child[0] : child))
        : [],
    ).toEqual(["p", "custom", "ul", "github-callout"]);
    const output = await render(source);
    expect(output).toMatch(/<p>\s*The <custom>inline<\/custom> text\.\s*<\/p>/);
    expect(output).not.toMatch(/<p>\s*<(?:ul|div|p)>/);
  });

  it("keeps raw HTML subject to filtering in either plugin order", async () => {
    for (const type of ["note", "tip", "important", "warning", "caution", "callout"]) {
      for (const plugins of [
        [callouts(), html()],
        [html(), callouts()],
      ]) {
        const markdown = `<${type} title="Native"><p>Text</p></${type}>`;
        const { nodes } = await parseMarkdown(markdown, { plugins });
        expect(JSON.stringify(nodes)).not.toContain("github-callout");
        const output = await createHtmlRenderer({ plugins, components })(markdown);
        expect(output).toContain("Text");
        expect(output).not.toContain('class="cgc"');
        expect(output).not.toContain(`<${type}`);
        expect(await createHtmlRenderer({ plugins, components })(`::${type}\nText\n::`)).toContain(
          'class="cgc"',
        );
      }
    }
  });

  it("leaves the blocks alone with `blocks: false`", async () => {
    const { nodes } = await parseMarkdown("::note\nHi\n::", {
      plugins: [callouts({ blocks: false })],
    });
    expect(nodes).toEqual([["note", {}, "Hi"]]);
  });
});
